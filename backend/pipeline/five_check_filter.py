"""
Five-Check Sequential Filter
=============================
CORE of the Rules Engine. Five checks run in strict sequential order.
Output of check N is the input to check N+1.

CRITICAL RULES:
  1. Sequential, NOT parallel — each check's output is next check's input
  2. SILENT exclusion — excluded nodes disappear silently (no "access denied")
  3. NO LLM — all checks are deterministic binary logic
  4. Permission check BEFORE data is used — GAP 5 compliance

Check Order & Rationale:
  1. ISOLATION    — Multi-tenant safety first. Different orgs cannot mix.
  2. COMPLIANCE   — Legal/regulatory tags (MNPI, PHI) second.
                    Compliance-excluded data should never reach permission check.
  3. PERMISSION   — Hierarchy ceiling check. Uses O(1) compiled permission map.
  4. TEMPORAL     — Expired/superseded nodes excluded. Live data only.
  5. DERIVABILITY — AI already knows this? Exclude. Saves token budget.
"""

from datetime import datetime, timezone
from pipeline.permission_compiler import can_read_level

DERIVABILITY_THRESHOLD = 0.7  # Configurable per org; nodes scoring >= this are excluded


def run_five_checks(nodes: list, user: dict, permission_map: dict) -> tuple[list, dict]:
    """
    Run all 5 checks sequentially.
    Returns (filtered_nodes, check_count_dict).
    """
    check_counts = {}

    # ─────────────────────────────────────────────────────────
    # CHECK 1: ISOLATION — org_id must match user's org
    # ─────────────────────────────────────────────────────────
    nodes = _check_isolation(nodes, user["org_id"])
    check_counts["after_check1"] = len(nodes)

    # ─────────────────────────────────────────────────────────
    # CHECK 2: COMPLIANCE — exclude nodes with tags user lacks clearance for
    # ─────────────────────────────────────────────────────────
    nodes = _check_compliance(nodes, user.get("compliance_clearance") or [])
    check_counts["after_check2"] = len(nodes)

    # ─────────────────────────────────────────────────────────
    # CHECK 3: PERMISSION — exclude nodes above user's hierarchy ceiling
    # Uses O(1) compiled permission map — never queries DB here
    # ─────────────────────────────────────────────────────────
    nodes = _check_permission(nodes, permission_map)
    check_counts["after_check3"] = len(nodes)

    # ─────────────────────────────────────────────────────────
    # CHECK 4: TEMPORAL — exclude expired and superseded nodes
    # ─────────────────────────────────────────────────────────
    nodes = _check_temporal(nodes)
    check_counts["after_check4"] = len(nodes)

    # ─────────────────────────────────────────────────────────
    # CHECK 5: DERIVABILITY — exclude what the AI already knows
    # Pre-computed scores, NOT runtime LLM calls
    # ─────────────────────────────────────────────────────────
    nodes = _check_derivability(nodes)
    check_counts["after_check5"] = len(nodes)

    return nodes, check_counts


# ─────────────────────────────────────────────────────────────
# Individual check implementations
# ─────────────────────────────────────────────────────────────

def _check_isolation(nodes: list, org_id: str) -> list:
    """
    Check 1: Multi-tenant isolation.
    Only nodes belonging to the user's organization pass.
    In single-org demo (supra), all nodes pass.
    """
    return [n for n in nodes if n.get("org_id") == org_id]


def _check_compliance(nodes: list, user_clearance: list) -> list:
    """
    Check 2: Compliance tag filtering.
    Exclude nodes with compliance tags the user does NOT have clearance for.

    Example:
      Node tags: ["MNPI", "CONFIDENTIAL"]
      User clearance: ["MNPI"]
      → Node EXCLUDED (user lacks CONFIDENTIAL clearance)

      Node tags: ["MNPI"]
      User clearance: ["MNPI"]
      → Node INCLUDED (user has MNPI clearance)

      Node tags: []
      User clearance: anything
      → Node INCLUDED (no tags = no restrictions)
    """
    clearance_set = set(user_clearance)

    passing = []
    for node in nodes:
        compliance_tags = node.get("compliance_tags") or []
        # Node passes if user has clearance for ALL tags on the node
        if all(tag in clearance_set for tag in compliance_tags):
            passing.append(node)
    return passing


def _check_permission(nodes: list, permission_map: dict) -> list:
    """
    Check 3: Hierarchy permission ceiling.
    Uses O(1) compiled permission_map — no DB queries here.

    A node passes if the user can_read its hierarchy level.
    """
    passing = []
    for node in nodes:
        hl = node.get("hierarchy_levels")
        if hl:
            level_number = hl.get("level_number")
        else:
            # Fallback: try direct field
            level_number = node.get("hierarchy_level_number")

        if level_number is None:
            # No level info — skip safely (security: deny if uncertain)
            continue

        if can_read_level(permission_map, level_number):
            passing.append(node)

    return passing


def _check_temporal(nodes: list) -> list:
    """
    Check 4: Temporal validity.
    Excludes:
      - status = 'SUPERSEDED' (replaced by a newer node)
      - status = 'EXPIRED'
      - valid_until IS NOT NULL AND valid_until < NOW()

    Keeps LEGAL_HOLD nodes (they must remain visible for compliance).
    """
    now = datetime.now(timezone.utc)

    passing = []
    for node in nodes:
        status = node.get("status", "ACTIVE")

        # Exclude superseded and expired nodes
        if status in ("SUPERSEDED", "EXPIRED"):
            continue

        # Check time-based expiry
        valid_until = node.get("valid_until")
        if valid_until:
            # Parse ISO string if needed
            if isinstance(valid_until, str):
                try:
                    # Handle both with and without timezone
                    if valid_until.endswith("Z"):
                        valid_until = valid_until[:-1] + "+00:00"
                    expiry_dt = datetime.fromisoformat(valid_until)
                    if expiry_dt.tzinfo is None:
                        expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                    if expiry_dt < now:
                        continue  # Expired
                except ValueError:
                    pass  # Unparseable — include it (safe default)

        passing.append(node)

    return passing


def _check_derivability(nodes: list, threshold: float = DERIVABILITY_THRESHOLD) -> list:
    """
    Check 5: Derivability filtering.
    Excludes nodes with derivability_score >= threshold (default 0.7).

    Derivability score logic (pre-computed, stored in DB):
      0.0 = 100% organization-specific (always include)
      0.5 = 50% org-specific, 50% general knowledge
      0.7+ = Mostly general knowledge the AI already knows → EXCLUDE

    Examples of high-derivability nodes (excluded):
      "What is a Total Knee Replacement" → 0.92 → EXCLUDED
      "Normal adult vital signs: HR 60-100..." → 0.98 → EXCLUDED
      "Paracetamol mechanism of action" → 0.95 → EXCLUDED

    Examples of low-derivability nodes (included):
      "Supra uses Paracetamol 650mg QDS post-TKR" → 0.08 → INCLUDED
      "Patient Rajan: absolute NSAID contraindication" → 0.01 → INCLUDED
    """
    return [
        n for n in nodes
        if float(n.get("derivability_score", 0.0)) < threshold
    ]
