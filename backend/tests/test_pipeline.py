"""
Tests for BFS traversal and pipeline components.
Run with: pytest tests/ -v
"""

import pytest
from pipeline.permission_compiler import compile_permissions, can_read_level
from pipeline.five_check_filter import (
    _check_isolation,
    _check_compliance,
    _check_permission,
    _check_temporal,
    _check_derivability,
)


# ─── Permission Compiler Tests ───────────────────────────────────

def test_viewer_permission_map():
    user = {"role": "VIEWER", "ceiling_level": 10, "write_ceiling": None}
    pmap = compile_permissions(user)

    # Viewer can read from ceiling (10) downward (10-15)
    assert pmap[10]["can_read"] is True
    assert pmap[12]["can_read"] is True
    assert pmap[15]["can_read"] is True

    # Viewer cannot read above ceiling
    assert pmap[1]["can_read"] is False
    assert pmap[5]["can_read"] is False
    assert pmap[9]["can_read"] is False

    # Viewer cannot write anything
    assert pmap[10]["can_write"] is False
    assert pmap[15]["can_write"] is False


def test_admin_permission_map():
    user = {"role": "ADMIN", "ceiling_level": 1, "write_ceiling": 1}
    pmap = compile_permissions(user)

    # Admin reads and writes everything
    for level in range(1, 16):
        assert pmap[level]["can_read"] is True
        assert pmap[level]["can_write"] is True


def test_hod_permission_map():
    user = {"role": "HOD", "ceiling_level": 4, "write_ceiling": 4}
    pmap = compile_permissions(user)

    # HOD reads all levels
    for level in range(1, 16):
        assert pmap[level]["can_read"] is True

    # HOD writes from ceiling (4) downward
    assert pmap[4]["can_write"] is True
    assert pmap[10]["can_write"] is True
    assert pmap[3]["can_write"] is False
    assert pmap[1]["can_write"] is False


def test_o1_lookup():
    user = {"role": "VIEWER", "ceiling_level": 10, "write_ceiling": None}
    pmap = compile_permissions(user)

    # O(1) lookup helper
    assert can_read_level(pmap, 10) is True
    assert can_read_level(pmap, 5) is False


# ─── Five Check Tests ────────────────────────────────────────────

def make_node(id, org="supra", zone=1, tags=None, level=10, status="ACTIVE", derivability=0.1):
    return {
        "id": id,
        "org_id": org,
        "zone": zone,
        "compliance_tags": tags or [],
        "hierarchy_levels": {"level_number": level},
        "status": status,
        "derivability_score": derivability,
        "valid_until": None,
    }


def test_check1_isolation():
    nodes = [
        make_node("n1", org="supra"),
        make_node("n2", org="other_hospital"),
        make_node("n3", org="supra"),
    ]
    result = _check_isolation(nodes, "supra")
    assert len(result) == 2
    assert all(n["org_id"] == "supra" for n in result)


def test_check2_compliance_no_clearance():
    nodes = [
        make_node("n1", tags=[]),
        make_node("n2", tags=["MNPI"]),
        make_node("n3", tags=["MNPI", "CONFIDENTIAL"]),
        make_node("n4", tags=["PHI"]),
    ]
    result = _check_compliance(nodes, user_clearance=[])
    assert len(result) == 1
    assert result[0]["id"] == "n1"


def test_check2_compliance_with_mnpi_clearance():
    nodes = [
        make_node("n1", tags=[]),
        make_node("n2", tags=["MNPI"]),
        make_node("n3", tags=["MNPI", "CONFIDENTIAL"]),
    ]
    result = _check_compliance(nodes, user_clearance=["MNPI"])
    # n1 and n2 pass; n3 needs CONFIDENTIAL which user lacks
    assert len(result) == 2
    assert "n3" not in [n["id"] for n in result]


def test_check2_admin_full_clearance():
    nodes = [
        make_node("n1", tags=["MNPI"]),
        make_node("n2", tags=["CONFIDENTIAL"]),
        make_node("n3", tags=["MNPI", "CONFIDENTIAL", "PHI"]),
    ]
    result = _check_compliance(nodes, user_clearance=["MNPI", "PHI", "CONFIDENTIAL"])
    assert len(result) == 3


def test_check3_permission_viewer_l10():
    user = {"role": "VIEWER", "ceiling_level": 10, "write_ceiling": None}
    pmap = compile_permissions(user)

    nodes = [
        make_node("n1", level=10),   # at ceiling — pass
        make_node("n2", level=12),   # below ceiling — pass
        make_node("n3", level=5),    # above ceiling — EXCLUDE
        make_node("n4", level=1),    # far above — EXCLUDE
        make_node("n5", level=15),   # deepest level — pass
    ]
    result = _check_permission(nodes, pmap)
    passing_ids = [n["id"] for n in result]
    assert "n1" in passing_ids
    assert "n2" in passing_ids
    assert "n5" in passing_ids
    assert "n3" not in passing_ids
    assert "n4" not in passing_ids


def test_check4_temporal_superseded():
    nodes = [
        make_node("n1", status="ACTIVE"),
        make_node("n2", status="SUPERSEDED"),
        make_node("n3", status="EXPIRED"),
        make_node("n4", status="LEGAL_HOLD"),
        make_node("n5", status="REVIEW_REQUIRED"),
    ]
    result = _check_temporal(nodes)
    ids = [n["id"] for n in result]
    assert "n1" in ids
    assert "n4" in ids  # Legal hold stays visible
    assert "n5" in ids  # Review required — still active
    assert "n2" not in ids
    assert "n3" not in ids


def test_check4_temporal_expired_by_date():
    nodes = [
        {**make_node("n1"), "valid_until": "2020-01-01T00:00:00+00:00"},  # expired
        {**make_node("n2"), "valid_until": "2099-01-01T00:00:00+00:00"},  # future
        {**make_node("n3"), "valid_until": None},                          # no expiry
    ]
    result = _check_temporal(nodes)
    ids = [n["id"] for n in result]
    assert "n1" not in ids
    assert "n2" in ids
    assert "n3" in ids


def test_check5_derivability():
    nodes = [
        make_node("n1", derivability=0.05),   # org-specific — INCLUDE
        make_node("n2", derivability=0.68),   # just below threshold — INCLUDE
        make_node("n3", derivability=0.70),   # AT threshold — EXCLUDE
        make_node("n4", derivability=0.92),   # high derivability — EXCLUDE
        make_node("n5", derivability=0.99),   # AI already knows — EXCLUDE
    ]
    result = _check_derivability(nodes)
    ids = [n["id"] for n in result]
    assert "n1" in ids
    assert "n2" in ids
    assert "n3" not in ids
    assert "n4" not in ids
    assert "n5" not in ids


def test_sequential_pipeline_order():
    """
    Ensures checks are actually sequential:
    a MNPI-tagged node must be excluded by check 2
    even if it would pass check 3.
    """
    from pipeline.five_check_filter import run_five_checks

    mnpi_node = {
        "id": "mnpi-node",
        "org_id": "supra",
        "zone": 1,
        "compliance_tags": ["MNPI"],
        "hierarchy_levels": {"level_number": 12},  # Below L10 viewer ceiling
        "status": "ACTIVE",
        "derivability_score": 0.05,
        "valid_until": None,
    }

    user = {
        "org_id": "supra",
        "role": "VIEWER",
        "ceiling_level": 10,
        "write_ceiling": None,
        "compliance_clearance": [],
    }
    pmap = compile_permissions(user)

    filtered, counts = run_five_checks([mnpi_node], user, pmap)

    # Node passes check 1 (same org), fails check 2 (MNPI, no clearance)
    assert counts["after_check1"] == 1  # passes isolation
    assert counts["after_check2"] == 0  # excluded by compliance
    assert len(filtered) == 0
