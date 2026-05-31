from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import time

from pipeline.permission_compiler import compile_permissions
from pipeline.entry_point_resolver import resolve_entry_point
from pipeline.bfs_traversal import bfs_traversal
from pipeline.zone2_injector import inject_zone2
from pipeline.five_check_filter import run_five_checks
from pipeline.candidate_assembler import assemble_candidate_set
from models.user import get_user, get_all_users
from models.node import get_all_nodes, get_hierarchy_levels, get_zone2_nodes

app = FastAPI(title="BRAHMO Rules Engine", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# CACHE — load everything ONCE at startup
# Avoids multiple slow DB calls during pipeline
# ─────────────────────────────────────────────
_cache = {
    "nodes": [],
    "levels": [],
    "zone2": [],
    "users": [],
    "loaded": False
}

def load_cache():
    """Load all data from Supabase once at startup."""
    if _cache["loaded"]:
        return
    print("Loading data from Supabase into cache...")
    _cache["nodes"] = get_all_nodes("supra")
    _cache["levels"] = get_hierarchy_levels("supra")
    _cache["zone2"] = get_zone2_nodes("supra")
    _cache["users"] = get_all_users()
    _cache["loaded"] = True
    print(f"Cache ready: {len(_cache['nodes'])} nodes, {len(_cache['levels'])} levels, {len(_cache['users'])} users")

@app.on_event("startup")
def startup():
    load_cache()


class PipelineRequest(BaseModel):
    user_id: str
    org_id: Optional[str] = "supra"


@app.get("/")
def root():
    return {"status": "BRAHMO Rules Engine running", "version": "1.0.0"}


@app.get("/users")
def list_users():
    """Return all user profiles for the dropdown."""
    if not _cache["loaded"]:
        load_cache()
    return {"users": _cache["users"]}


@app.post("/pipeline/run")
def run_pipeline(request: PipelineRequest):
    """
    Full pipeline: BFS → Zone2 Injection → 5-Check Filter → Candidate Set.
    ZERO LLM. All deterministic.
    """
    if not _cache["loaded"]:
        load_cache()

    total_start = time.time()

    # --- Fetch user from cache ---
    user = next((u for u in _cache["users"] if u["id"] == request.user_id), None)
    if not user:
        raise HTTPException(status_code=404, detail=f"User {request.user_id} not found")

    timing = {}

    # Stage 1: Permission Compiler
    t = time.time()
    permission_map = compile_permissions(user)
    timing["permission_compile_ms"] = round((time.time() - t) * 1000, 2)

    # Stage 2: Entry Point Resolver
    t = time.time()
    entry_point = resolve_entry_point(user, _cache["levels"])
    timing["entry_point_ms"] = round((time.time() - t) * 1000, 2)

    if not entry_point:
        raise HTTPException(status_code=400, detail=f"No entry point found for department: {user['department']}")

    # Stage 3: BFS Traversal — uses cached levels and nodes
    t = time.time()
    reachable_nodes, distances, bfs_visited_levels = bfs_traversal_cached(
        entry_point, user, _cache["levels"], _cache["nodes"]
    )
    timing["bfs_ms"] = round((time.time() - t) * 1000, 2)

    after_bfs_count = len(reachable_nodes)

    # Stage 4: Zone 2 Injection — uses cached zone2 nodes
    t = time.time()
    combined_nodes, distances = inject_zone2_cached(reachable_nodes, distances, _cache["zone2"])
    timing["zone2_inject_ms"] = round((time.time() - t) * 1000, 2)

    after_zone2_count = len(combined_nodes)

    # Stage 5: Five-Check Sequential Filter
    t = time.time()
    filtered_nodes, check_counts = run_five_checks(combined_nodes, user, permission_map)
    timing["five_checks_ms"] = round((time.time() - t) * 1000, 2)

    # Stage 6: Candidate Set Assembler
    t = time.time()
    candidate_set = assemble_candidate_set(filtered_nodes, distances, entry_point)
    timing["assemble_ms"] = round((time.time() - t) * 1000, 2)

    timing["total_ms"] = round((time.time() - total_start) * 1000, 2)

    return {
        "user": user["id"],
        "user_name": user["name"],
        "role": user["role"],
        "ceiling_level": user["ceiling_level"],
        "department": user["department"],
        "entry_point": entry_point,
        "pipeline_timing": timing,
        "funnel": {
            "total_nodes": len(_cache["nodes"]),
            "after_bfs": after_bfs_count,
            "after_zone2": after_zone2_count,
            "after_check1_isolation": check_counts["after_check1"],
            "after_check2_compliance": check_counts["after_check2"],
            "after_check3_permission": check_counts["after_check3"],
            "after_check4_temporal": check_counts["after_check4"],
            "after_check5_derivability": check_counts["after_check5"],
        },
        "candidate_set": candidate_set,
        "bfs_visited_levels": bfs_visited_levels,
    }


@app.get("/pipeline/compare")
def compare_users(user_ids: str):
    """Run pipeline for multiple users and return comparison."""
    ids = [uid.strip() for uid in user_ids.split(",")]
    results = []
    for uid in ids:
        try:
            result = run_pipeline(PipelineRequest(user_id=uid))
            results.append(result)
        except Exception as e:
            results.append({"user": uid, "error": str(e)})
    return {"comparison": results}


@app.get("/nodes")
def list_nodes(org_id: str = "supra"):
    """Return all nodes (for DAG visualization)."""
    return {"nodes": _cache["nodes"]}


# ─────────────────────────────────────────────
# Cached versions of BFS and Zone2
# These use in-memory data instead of DB calls
# ─────────────────────────────────────────────

def bfs_traversal_cached(entry_point_id, user, all_levels, all_nodes):
    """BFS using cached levels and nodes — zero DB calls."""
    from collections import deque

    level_map = {l["id"]: l for l in all_levels}

    queue = deque([(entry_point_id, 0)])
    visited_levels = set()
    level_distances = {}

    while queue:
        current_id, distance = queue.popleft()
        if current_id in visited_levels:
            continue
        visited_levels.add(current_id)
        level_distances[current_id] = distance

        current_level = level_map.get(current_id)
        if not current_level:
            continue

        parent_ids = current_level.get("parent_ids") or []
        for parent_id in parent_ids:
            if parent_id not in visited_levels:
                queue.append((parent_id, distance + 1))

    reachable_nodes = []
    node_distances = {}

    for node in all_nodes:
        if node.get("zone") == 2:
            continue
        level_id = node.get("hierarchy_level_id")
        if level_id in visited_levels:
            reachable_nodes.append(node)
            node_distances[node["id"]] = level_distances.get(level_id, 0)

    return reachable_nodes, node_distances, list(visited_levels)


def inject_zone2_cached(bfs_nodes, distances, zone2_nodes):
    """Zone2 injection using cached nodes — zero DB calls."""
    existing_ids = {node["id"] for node in bfs_nodes}
    injected = []
    for node in zone2_nodes:
        if node["id"] not in existing_ids:
            injected.append(node)
            distances[node["id"]] = 99
            existing_ids.add(node["id"])
    return bfs_nodes + injected, distances


def resolve_entry_point(user, all_levels):
    """Entry point resolver using cached levels — zero DB calls."""
    department = user["department"]
    ceiling_level = user["ceiling_level"]
    role = user["role"]

    if role in ("ADMIN", "AUDITOR"):
        root = next((l for l in all_levels if l["level_number"] == 1 and l["department"] is None), None)
        return root["id"] if root else None

    if role == "HOD":
        dept_levels = [l for l in all_levels if l["department"] == department and l["level_number"] == ceiling_level]
        if dept_levels:
            return dept_levels[0]["id"]
        dept_levels = [l for l in all_levels if l["department"] == department and l["level_number"] >= ceiling_level]
        if dept_levels:
            return sorted(dept_levels, key=lambda x: x["level_number"], reverse=True)[0]["id"]

    if role == "QUALITY":
        quality_levels = [l for l in all_levels if l["level_number"] == ceiling_level]
        if quality_levels:
            return quality_levels[0]["id"]
        fallback = [l for l in all_levels if l["level_number"] == 3 and l["department"] is None]
        if fallback:
            return fallback[0]["id"]

    dept_levels = [l for l in all_levels if l["department"] == department and l["level_number"] >= ceiling_level]
    if not dept_levels:
        dept_levels = [l for l in all_levels if l["department"] == department]
    if not dept_levels:
        dept_levels = [l for l in all_levels if l["level_number"] == ceiling_level]
    if not dept_levels:
        return None

    return sorted(dept_levels, key=lambda x: x["level_number"], reverse=True)[0]["id"]