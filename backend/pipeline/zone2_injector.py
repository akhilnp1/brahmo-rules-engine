"""
Zone 2 Injector
===============
After BFS, injects all Zone 2 (GLOBAL) nodes into the candidate pool.
Zone 2 nodes are hospital-wide safety constraints that apply to EVERY user,
regardless of their DAG traversal path.

Examples of Zone 2 nodes:
  - Warfarin + NSAID interaction warning
  - Blood transfusion two-person verification
  - Hand hygiene 5-moment compliance
  - Antibiotic stewardship 72-hour review

CRITICAL: Zone 2 nodes bypass BFS but still go through all 5 checks.
They may be MNPI-tagged, expired, or above a user's permission ceiling.
Injection BEFORE the 5 checks — not after.

Distance assignment for Zone 2 nodes:
  - Uses a large distance value (99) to mark them as "global injection"
  - Frontend can display them separately in the DAG visualization
"""

from models.node import get_zone2_nodes


ZONE2_DISTANCE_MARKER = 99  # Indicates this node came from global injection, not BFS


def inject_zone2(bfs_nodes: list, distances: dict, org_id: str) -> tuple[list, dict]:
    """
    Inject Zone 2 (GLOBAL) nodes into the reachable set.
    Returns the combined node list + updated distance map.
    """
    zone2_nodes = get_zone2_nodes(org_id)

    # Build set of existing node IDs to prevent duplicates
    existing_ids = {node["id"] for node in bfs_nodes}

    injected = []
    for node in zone2_nodes:
        if node["id"] not in existing_ids:
            injected.append(node)
            distances[node["id"]] = ZONE2_DISTANCE_MARKER
            existing_ids.add(node["id"])

    combined = bfs_nodes + injected

    return combined, distances
