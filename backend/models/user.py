from db import get_supabase
from typing import Optional


def get_user(user_id: str) -> Optional[dict]:
    """Fetch a single user by ID."""
    sb = get_supabase()
    result = sb.table("users").select("*").eq("id", user_id).single().execute()
    return result.data if result.data else None


def get_all_users() -> list:
    """Fetch all users for the dropdown selector."""
    sb = get_supabase()
    result = sb.table("users").select("*").order("name").execute()
    return result.data or []
