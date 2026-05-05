import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

_url: str = os.environ["SUPABASE_URL"]
_key: str = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

# Module-level singleton — Python imports are cached after first execution.
# Every `from api.db.client import db` receives this same object.
db: Client = create_client(_url, _key)


def ping() -> bool:
    """Return True if the database is reachable, False otherwise."""
    try:
        db.table("organizations").select("id").limit(1).execute()
        return True
    except Exception:
        return False
