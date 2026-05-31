"""
Permission Compiler
===================
Compiles a user's permissions into an O(1) lookup dictionary ONCE per session.
This is critical for performance — avoids N+1 permission queries during 5-check filter.

Structure:
  {
    level_number (int): {
      "can_read": bool,
      "can_write": bool
    }
  }

Role Rules:
  VIEWER  → can_read levels >= ceiling_level, can_write NOTHING
  EDITOR  → can_read levels >= ceiling_level, can_write levels >= write_ceiling
  HOD     → can_read ALL levels, can_write levels >= ceiling_level
  ADMIN   → can_read ALL levels, can_write ALL levels
  QUALITY → can_read levels >= ceiling_level, can_write levels >= write_ceiling
  AUDITOR → can_read ALL levels (with compliance clearance), can_write NOTHING
"""

MAX_LEVELS = 15


def compile_permissions(user: dict) -> dict:
    """
    Build O(1) permission lookup for all 15 levels.
    Called ONCE at session start. Used for every node in Check 3.
    """
    role = user["role"]
    ceiling = user["ceiling_level"]
    write_ceiling = user.get("write_ceiling")

    permission_map = {}

    for level in range(1, MAX_LEVELS + 1):
        can_read = False
        can_write = False

        if role == "ADMIN":
            # Admin sees and writes everything
            can_read = True
            can_write = True

        elif role == "HOD":
            # HOD reads everything in their domain, writes from their ceiling down
            can_read = True
            can_write = (write_ceiling is not None and level >= write_ceiling)

        elif role == "AUDITOR":
            # Auditor reads everything (has compliance clearance), no writes
            can_read = True
            can_write = False

        elif role == "QUALITY":
            # Quality reads from ceiling down, can write based on write_ceiling
            can_read = (level >= ceiling)
            can_write = (write_ceiling is not None and level >= write_ceiling)

        elif role == "EDITOR":
            # Editor reads from ceiling down, writes from write_ceiling down
            can_read = (level >= ceiling)
            can_write = (write_ceiling is not None and level >= write_ceiling)

        elif role == "VIEWER":
            # Viewer reads from ceiling down, no writes
            can_read = (level >= ceiling)
            can_write = False

        else:
            # Unknown role — deny everything (secure by default)
            can_read = False
            can_write = False

        permission_map[level] = {"can_read": can_read, "can_write": can_write}

    return permission_map


def can_read_level(permission_map: dict, level_number: int) -> bool:
    """O(1) read permission check for a given hierarchy level."""
    entry = permission_map.get(level_number)
    return entry["can_read"] if entry else False


def can_write_level(permission_map: dict, level_number: int) -> bool:
    """O(1) write permission check for a given hierarchy level."""
    entry = permission_map.get(level_number)
    return entry["can_write"] if entry else False
