"""
Candidate Set Assembler
=======================
Takes the filtered nodes and annotates each with metadata for the
downstream Composition Agent (not built in this assessment).

Annotations added:
  - distance_from_entry: from BFS distance map (0 = entry, 1 = parent, etc.)
  - compression_hint: how much to compress this node in the final prompt
      FULL           → distance 0-1 (close to user's position, full content)
      COMPRESSED     → distance 2 (relevant but further, summarize)
      CONSTRAINT_ONLY → distance 3+ or Zone 2 (far away, just the constraint text)
  - zone_label: human-readable zone name
"""

from pipeline.zone2_injector import ZONE2_DISTANCE_MARKER


ZONE_LABELS = {1: "ADDRESSED", 2: "GLOBAL", 3: "FLOATING"}


def get_compression_hint(distance: int, zone: int) -> str:
    """
    Determine how much of the node content to send to the AI.
    Closer nodes get full content; distant nodes get summarized.
    """
    # Zone 2 global nodes are always shown in compressed form (they're context)
    if zone == 2 or distance == ZONE2_DISTANCE_MARKER:
        return "CONSTRAINT_ONLY"

    if distance <= 1:
        return "FULL"
    elif distance == 2:
        return "COMPRESSED"
    else:
        return "CONSTRAINT_ONLY"


def assemble_candidate_set(nodes: list, distances: dict, entry_point_id: str) -> list:
    """
    Annotate each surviving node with metadata.
    Returns sorted candidate set (by importance DESC, then distance ASC).
    """
    candidate_set = []

    for node in nodes:
        node_id = node["id"]
        distance = distances.get(node_id, 0)
        zone = node.get("zone", 1)

        hl = node.get("hierarchy_levels") or {}
        level_number = hl.get("level_number", 0)
        level_name = hl.get("level_name", "")

        candidate = {
            "id": node_id,
            "type": node.get("type", "FACT"),
            "title": node.get("title", ""),
            "content": node.get("content", ""),
            "importance": float(node.get("importance", 0.5)),
            "zone": zone,
            "zone_label": ZONE_LABELS.get(zone, "ADDRESSED"),
            "hierarchy_level_number": level_number,
            "hierarchy_level_name": level_name,
            "department": node.get("department"),
            "status": node.get("status", "ACTIVE"),
            "compliance_tags": node.get("compliance_tags") or [],
            "derivability_score": float(node.get("derivability_score", 0.0)),
            "distance_from_entry": distance if distance != ZONE2_DISTANCE_MARKER else 0,
            "is_zone2_injected": distance == ZONE2_DISTANCE_MARKER,
            "compression_hint": get_compression_hint(distance, zone),
        }

        candidate_set.append(candidate)

    # Sort: importance descending, then distance ascending (closer = more relevant)
    candidate_set.sort(
        key=lambda x: (-x["importance"], x["distance_from_entry"])
    )

    return candidate_set
