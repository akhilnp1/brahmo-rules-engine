from db import get_supabase
from typing import Optional


def get_all_nodes(org_id: str) -> list:
    """Fetch ALL nodes for an org (used for total count in funnel)."""
    sb = get_supabase()
    result = (
        sb.table("knowledge_nodes")
        .select("*, hierarchy_levels(level_number, level_name, department, parent_ids, zone)")
        .eq("org_id", org_id)
        .execute()
    )
    return result.data or []


def get_nodes_by_ids(node_ids: list) -> list:
    """Fetch specific nodes by their IDs."""
    if not node_ids:
        return []
    sb = get_supabase()
    result = (
        sb.table("knowledge_nodes")
        .select("*, hierarchy_levels(level_number, level_name, department, parent_ids, zone)")
        .in_("id", node_ids)
        .execute()
    )
    return result.data or []


def get_hierarchy_levels(org_id: str) -> list:
    """Fetch all hierarchy levels for DAG traversal."""
    sb = get_supabase()
    result = (
        sb.table("hierarchy_levels")
        .select("*")
        .eq("org_id", org_id)
        .execute()
    )
    return result.data or []


def get_zone2_nodes(org_id: str) -> list:
    """Fetch all Zone 2 (GLOBAL) nodes — injected after BFS."""
    sb = get_supabase()
    result = (
        sb.table("knowledge_nodes")
        .select("*, hierarchy_levels(level_number, level_name, department, parent_ids, zone)")
        .eq("org_id", org_id)
        .eq("zone", 2)
        .execute()
    )
    return result.data or []
