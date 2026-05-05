from datetime import datetime, timezone

import bleach
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from api.db.client import db
from api.main import limiter
from api.models.schemas import AlertItem, AlertListData, Response
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["alerts"])

PAGE_SIZE = 20
_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}

_VALID_SEVERITIES = {"all", "critical", "warning", "info"}


@router.get("/alerts")
@limiter.limit("30/minute")
async def get_alerts(
    request: Request,
    page: int = 1,
    severity: str = "all",
    org_id: str = Depends(get_current_org_id),
):
    severity = bleach.clean(severity.strip().lower())
    if severity not in _VALID_SEVERITIES:
        severity = "all"

    page = max(1, page)
    offset = (page - 1) * PAGE_SIZE

    try:
        query = (
            db.table("alerts")
            .select("*", count="exact")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
        )
        if severity != "all":
            query = query.eq("severity", severity)

        result = query.range(offset, offset + PAGE_SIZE - 1).execute()
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    items = [AlertItem.model_validate(row) for row in (result.data or [])]
    total = result.count or 0

    return Response(
        success=True,
        data=AlertListData(alerts=items, total=total, page=page),
        error=None,
    )


@router.post("/alerts/{alert_id}/resolve")
@limiter.limit("30/minute")
async def resolve_alert(
    request: Request,
    alert_id: str,
    org_id: str = Depends(get_current_org_id),
):
    alert_id = bleach.clean(alert_id.strip())

    try:
        # Verify the alert belongs to this org before mutating
        check = (
            db.table("alerts")
            .select("id")
            .eq("id", alert_id)
            .eq("org_id", org_id)
            .single()
            .execute()
        )
    except Exception:
        raise HTTPException(status_code=404, detail="Alert not found")

    if not check.data:
        raise HTTPException(status_code=404, detail="Alert not found")

    try:
        db.table("alerts").update(
            {"resolved": True, "resolved_at": datetime.now(timezone.utc).isoformat()}
        ).eq("id", alert_id).execute()
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    return Response(
        success=True,
        data={"resolved": True, "alert_id": alert_id},
        error=None,
    )
