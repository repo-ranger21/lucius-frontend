from datetime import datetime, timezone

from fastapi import APIRouter, Request

from api.db.client import ping
from api.main import limiter
from api.models.schemas import Response

router = APIRouter(tags=["health"])


@router.get("/health")
@limiter.limit("30/minute")
async def health_check(request: Request):
    db_ok = ping()
    return Response(
        success=True,
        data={
            "status": "operational" if db_ok else "degraded",
            "db": db_ok,
            "timestamp": datetime.now(timezone.utc),
        },
        error=None,
    )
