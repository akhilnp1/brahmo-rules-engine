# Architecture: BRAHMO Rules Engine Pipeline

## Overview

The Rules Engine is Layer 2 (L2) of the BRAHMO stack. It sits between the knowledge graph database and the AI composition layer. Its single responsibility: **given a user, return the exact set of nodes that user should see — no more, no less.**

Zero LLM. Zero configuration per user. Zero manual tagging. Fully deterministic.

---

## Pipeline Stages

```
User Session Start
    │
    ▼
[1] Permission Compiler          ~5ms
    Build O(1) lookup: {level → can_read, can_write}
    Called ONCE per session. Dictionary lookup in Check 3.
    │
    ▼
[2] Entry Point Resolver         ~5ms
    Map user.department → deepest hierarchy_level node
    This is the BFS start position.
    │
    ▼
[3] BFS Traversal (upward)       ~40ms
    Start at leaf node (e.g. Ortho Ward, L10)
    Walk UP via parent_ids edges
    Visited set: prevents multi-parent re-processing + cycle safety
    Output: set of reachable level IDs + distance map
    │
    ▼
[4] Zone 2 Injection             ~8ms
    Fetch all zone=2 (GLOBAL) nodes
    Add to reachable set BEFORE the 5 checks
    These bypass BFS but still get filtered
    │
    ▼
[5] Five-Check Sequential Filter ~120ms
    Each check: output of N → input to N+1
    │
    ├── Check 1: ISOLATION     — org_id match
    ├── Check 2: COMPLIANCE    — tag intersection with clearance
    ├── Check 3: PERMISSION    — O(1) lookup from compiled map
    ├── Check 4: TEMPORAL      — status != SUPERSEDED/EXPIRED, valid_until
    └── Check 5: DERIVABILITY  — score < 0.7 threshold
    │
    ▼
[6] Candidate Set Assembler      ~5ms
    Annotate: type, importance, distance, zone, compression_hint
    Sort: importance DESC, distance ASC
```

---

## Key Design Decisions

### Why sequential, not parallel?

Check 2 (compliance) must run before Check 3 (permission). A node that's MNPI-tagged should be excluded even if the user theoretically has the hierarchy level to see it. Parallel execution would require post-merge logic and risks security gaps. Sequential is the only safe model.

### Why O(1) permission lookup?

500+ nodes after BFS+Zone2 injection. If each node queries `WHERE level = X AND role = Y`, that's 500 DB queries. Compiling `{level: can_read}` once at session start means Check 3 is a dictionary lookup — microseconds per node, not milliseconds.

### Why BFS instead of a query?

A direct SQL query like `WHERE department = 'ortho' AND level >= 10` would miss multi-parent nodes. The Post-TKR Protocol node has `parent_ids = ["HL-05-ORTHO", "HL-05-SURG"]` — it's reachable from both Ortho AND Surgery. BFS traversal correctly captures this without duplication (visited set).

### Why inject Zone 2 AFTER BFS?

Zone 2 nodes are global — they don't belong to any BFS path. Injecting before BFS would require special-casing the traversal. Injecting after BFS and before the 5 checks is clean: Zone 2 nodes enter the pipeline as equals, still subject to all 5 filters (a MNPI-tagged global node is still blocked for a non-cleared user).

### Why pre-computed derivability scores?

The pipeline is ZERO LLM. Running an embedding similarity check at query time would:
1. Add 200-400ms latency
2. Introduce a model dependency
3. Violate the determinism guarantee

Pre-computed scores (stored as `derivability_score DECIMAL(3,2)` on each node) are computed in a separate batch job. The distinction between org-specific knowledge (score ~0.05) and general medical knowledge (score ~0.95) is stable enough that pre-computation is valid.

### Silent exclusion

Excluded nodes are absent — not "access denied", not "3 nodes were hidden". This is intentional:
- Security: if the API says "2 MNPI nodes were excluded", an attacker knows they exist
- UX: partial responses feel complete because they are complete for this user

---

## Permission Model

```
Role      | Read              | Write
VIEWER    | level >= ceiling  | nothing
EDITOR    | level >= ceiling  | level >= write_ceiling
HOD       | all levels        | level >= ceiling
ADMIN     | all levels        | all levels
QUALITY   | level >= ceiling  | level >= write_ceiling
AUDITOR   | all levels        | nothing
```

`ceiling_level` is the highest (most abstract) level a user can access. Level 1 = hospital root (most abstract). Level 15 = most specific. Higher ceiling number = more restricted.

---

## Scalability Analysis

**Current demo:** 50 nodes, single org

**Production scale:** 15,000 nodes, 12 hospitals

What changes:
- BFS is bounded by the user's reachable subgraph. Nurse Priya traverses ~315 nodes regardless of whether the graph has 842 or 15,000. BFS time is `O(reachable_subgraph)`, not `O(total_graph)`.
- Checks 1-4 run as SQL WHERE clauses. With proper indexes (GIN on compliance_tags, B-tree on hierarchy_level_id and status), these scale with index lookups, not full scans.
- Check 5 (derivability) is a pre-computed score — no computation at query time regardless of graph size.
- Zone 2 injection fetches `WHERE zone = 2` — bounded by the number of global nodes, not total graph size.
- Permission compilation is always 15 iterations (MAX_LEVELS constant) — O(1) in relation to graph size.

Target: **<500ms at 15,000 nodes with proper indexing.**

---

## Multi-Parent Node Handling

Example: `HL-08-POST-TKR` has `parent_ids = ["HL-05-ORTHO", "HL-05-SURG"]`

During BFS from Ortho Ward:
1. Queue: [HL-10-ORTHO-W (dist 0)]
2. Visit HL-10-ORTHO-W → enqueue parents: HL-08-ORTHO-GEN
3. Visit HL-08-ORTHO-GEN → enqueue parents: HL-05-ORTHO
4. Visit HL-05-ORTHO → enqueue parents: **HL-08-POST-TKR** + HL-03-CLIN
5. Visit HL-08-POST-TKR → `visited.add(HL-08-POST-TKR)`, enqueue parents: HL-05-SURG
6. When HL-05-SURG is visited → it tries to enqueue HL-08-POST-TKR again → **blocked by visited set**

Result: HL-08-POST-TKR processed exactly once, at minimum distance.

---

## Compression Hints

The candidate set annotates each node with a `compression_hint` for the downstream Composition Agent:

| Distance | Hint | Meaning |
|---|---|---|
| 0-1 | FULL | Very close to user's position — include all content |
| 2 | COMPRESSED | Relevant but further — summarize to key points |
| 3+ | CONSTRAINT_ONLY | Far away — include only the constraint/rule text |
| Zone 2 | CONSTRAINT_ONLY | Global safety — brief constraint form |

This allows the Composition Agent to fit the candidate set within a token budget by prioritizing proximity.

---

## GAP 5 Compliance

GAP 5 (from BRAHMO architecture spec): "Permission check must happen before data retrieval."

This pipeline is compliant:
- BFS operates on hierarchy level IDs only — **not node content**
- Node content is fetched only for **reachable** levels
- The 5-check filter runs on the fetched set before any data leaves the pipeline
- If `org_id` mismatch is detected in Check 1, the node is never processed further

Anti-pattern (what this pipeline avoids): `SELECT * FROM knowledge_nodes WHERE org_id = 'supra'` — fetches all 842 nodes to Python, then filters. Even if filtered correctly, restricted data traveled over the network.
