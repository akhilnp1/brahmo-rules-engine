"""
BFS Traversal
=============
Performs Breadth-First Search UPWARD through the DAG from the user's entry point.
Returns all reachable nodes and their distance from the entry point.

Key design decisions:
  - Walks UP (child → parent) via parent_ids
  - Visited SET prevents multi-parent nodes from being processed twice
  - Also prevents infinite loops if a cycle is accidentally introduced
  - Returns: (list of nodes, distance_map {node_id: int})
  - Does NOT fetch node content yet — just IDs and distances (performance!)

Multi-parent handling:
  Post-TKR Protocol node has parent_ids = ["HL-05-ORTHO", "HL-05-SURG"]
  → Reachable from BOTH Ortho and Surgery paths
  → Visited set ensures it's processed exactly ONCE
  → Distance = min distance from entry (whichever path reached it first)
"""

from collections import deque
from models.node import get_hierarchy_levels, get_all_nodes


def bfs_traversal(entry_point_id: str, user: dict) -> tuple[list, dict, list]:
    """
    BFS upward through the hierarchy DAG.

    Returns:
      - reachable_nodes: list of node dicts reachable from entry point
      - distances: {node_id: int} distance from entry
      - visited_levels: list of visited level IDs (for DAG visualization)
    """
    org_id = user["org_id"]

    # Fetch all hierarchy levels to build the upward traversal map
    all_levels = get_hierarchy_levels(org_id)
    # Build: level_id → level data (for O(1) lookup during BFS)
    level_map = {l["id"]: l for l in all_levels}

    # BFS queue: (level_id, distance_from_entry)
    queue = deque([(entry_point_id, 0)])
    visited_levels = set()  # Visited SET — prevents re-processing multi-parent nodes
    level_distances = {}    # level_id → distance

    while queue:
        current_id, distance = queue.popleft()

        if current_id in visited_levels:
            continue  # Already processed — skip (handles multi-parent + cycle safety)

        visited_levels.add(current_id)
        level_distances[current_id] = distance

        current_level = level_map.get(current_id)
        if not current_level:
            continue

        # Walk UP: enqueue all parent levels
        parent_ids = current_level.get("parent_ids") or []
        for parent_id in parent_ids:
            if parent_id not in visited_levels:
                queue.append((parent_id, distance + 1))

    # Now fetch all Zone 1 nodes that belong to reachable levels
    # CRITICAL: we only fetch nodes from reachable levels — never fetch all nodes first
    all_nodes = get_all_nodes(org_id)

    reachable_nodes = []
    node_distances = {}

    for node in all_nodes:
        # Skip Zone 2 nodes here — they are injected separately
        if node.get("zone") == 2:
            continue

        hl = node.get("hierarchy_levels")
        if not hl:
            continue

        level_id = node.get("hierarchy_level_id")
        if level_id in visited_levels:
            # This node's level is reachable — include it
            reachable_nodes.append(node)
            # Distance for this node = distance of its level from entry
            node_distances[node["id"]] = level_distances.get(level_id, 0)

    return reachable_nodes, node_distances, list(visited_levels)
