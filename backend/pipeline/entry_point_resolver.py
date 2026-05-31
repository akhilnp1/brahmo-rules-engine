"""
Entry Point Resolver
====================
Maps a user's department to their starting node in the DAG.
The entry point is the LEAF node (deepest level) associated with
the user's department. BFS walks UPWARD from here.

Logic:
  - Find hierarchy levels matching user's department
  - Pick the one with the HIGHEST level_number (deepest in hierarchy)
  - That level's ID is the BFS entry point

Examples:
  Nurse Priya (ortho) → HL-10-ORTHO-W (Level 10, Ortho Ward)
  Dr. Vikram (ortho, HOD ceiling L4) → HL-05-ORTHO (Level 5, Ortho Dept)
  Admin Suresh (admin, L1) → HL-01 (Level 1, Hospital root)
"""

from models.node import get_hierarchy_levels


def resolve_entry_point(user: dict) -> str | None:
    """
    Find the DAG entry point (hierarchy level ID) for this user.
    Returns the hierarchy level ID that is the BFS starting node.
    """
    org_id = user["org_id"]
    department = user["department"]
    ceiling_level = user["ceiling_level"]
    role = user["role"]

    levels = get_hierarchy_levels(org_id)

    # For ADMIN and AUDITOR roles: start from the root (Level 1)
    if role in ("ADMIN", "AUDITOR"):
        root = next((l for l in levels if l["level_number"] == 1 and l["department"] is None), None)
        return root["id"] if root else None

    # For HOD: enter at the department level matching their ceiling
    if role == "HOD":
        dept_levels = [
            l for l in levels
            if l["department"] == department
            and l["level_number"] == ceiling_level
        ]
        if dept_levels:
            return dept_levels[0]["id"]
        # Fallback: deepest dept level at or below ceiling
        dept_levels = [
            l for l in levels
            if l["department"] == department
            and l["level_number"] >= ceiling_level
        ]
        if dept_levels:
            return sorted(dept_levels, key=lambda x: x["level_number"], reverse=True)[0]["id"]

# For QUALITY: cross-department role, start from ceiling level at Clinical Division
    if role == "QUALITY":
        # Try to find any level matching the ceiling level
        quality_levels = [
            l for l in levels
            if l["level_number"] == ceiling_level
        ]
        if quality_levels:
            return quality_levels[0]["id"]
        # Fallback: start from Clinical Division (Level 3)
        fallback = [
            l for l in levels
            if l["level_number"] == 3 and l["department"] is None
        ]
        if fallback:
            return fallback[0]["id"]

    # Default: find the deepest hierarchy level in user's department
    # that is at or below (>=) the user's ceiling level
    dept_levels = [
        l for l in levels
        if l["department"] == department
        and l["level_number"] >= ceiling_level
    ]

    if not dept_levels:
        # Fallback: any level matching department
        dept_levels = [l for l in levels if l["department"] == department]

    if not dept_levels:
        # Last resort: find by ceiling level with no department constraint
        dept_levels = [l for l in levels if l["level_number"] == ceiling_level]

    if not dept_levels:
        return None

    # Return the deepest (highest level number) matching level
    deepest = sorted(dept_levels, key=lambda x: x["level_number"], reverse=True)[0]
    return deepest["id"]
