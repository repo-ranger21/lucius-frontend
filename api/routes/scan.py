import asyncio
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import JSONResponse

from api.db.client import db
from api.main import limiter
from api.models.schemas import Response, ScanStatusData, ScanTriggerData, ScanTriggerRequest
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["scan"])

_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}


async def _run_scan(scan_id: str, org_id: str, asset_ids: list[str] | None) -> None:
    """
    Placeholder scan state machine — Sprint 3 replaces the sleep with real sentinel calls.
    DB transitions: pending → running → complete (or failed on exception).
    """
    try:
        db.table("scans").update({"status": "running"}).eq("id", scan_id).execute()
        await asyncio.sleep(5)
        db.table("scans").update({
            "status": "complete",
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", scan_id).execute()
    except Exception:
        try:
            db.table("scans").update({"status": "failed"}).eq("id", scan_id).execute()
        except Exception:
            pass


@router.post("/scan/trigger")
@limiter.limit("5/minute")
async def trigger_scan(
    request: Request,
    body: ScanTriggerRequest,
    background_tasks: BackgroundTasks,
    org_id: str = Depends(get_current_org_id),
):
    now = datetime.now(timezone.utc)

    try:
        result = db.table("scans").insert({
            "org_id": org_id,
            "status": "pending",
            "started_at": now.isoformat(),
        }).execute()
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    scan_id: str = result.data[0]["id"]
    background_tasks.add_task(_run_scan, scan_id, org_id, body.asset_ids)

    return Response(
        success=True,
        data=ScanTriggerData(scan_id=scan_id, status="pending", started_at=now),
        error=None,
    )


@router.get("/scan/status")
@limiter.limit("30/minute")
async def scan_status(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        result = (
            db.table("scans")
            .select("*")
            .eq("org_id", org_id)
            .order("started_at", desc=True)
            .limit(1)
            .execute()
        )
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    if not result.data:
        raise HTTPException(status_code=404, detail="No scans found for this organization")

    row = result.data[0]
    return Response(
        success=True,
        data=ScanStatusData(
            scan_id=row["id"],
            status=row["status"],
            findings_count=row.get("findings_count", 0),
            started_at=row["started_at"],
            completed_at=row.get("completed_at"),
        ),
        error=None,
    )
