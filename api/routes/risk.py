from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.db.client import db
from api.limiter import limiter
from api.models.schemas import Response, RiskScoreData
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["risk"])

_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}


@router.get("/risk-score")
@limiter.limit("30/minute")
async def get_risk_score(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        result = (
            db.table("alerts")
            .select("severity")
            .eq("org_id", org_id)
            .eq("resolved", False)
            .execute()
        )
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    rows = result.data or []
    crit_count = sum(1 for r in rows if r["severity"] == "critical")
    warn_count = sum(1 for r in rows if r["severity"] == "warning")

    vuln     = min(crit_count / 10, 1.0)
    exposure = min(warn_count / 20, 1.0)
    behavior = 0.0  # populated by behavioral scanner in Sprint 3
    config   = 0.0  # populated by config scanner in Sprint 3

    raw   = (vuln * 0.35) + (exposure * 0.30) + (behavior * 0.20) + (config * 0.15)
    score = max(0, min(100, round(raw * 100)))
    label = "LOW RISK" if score <= 30 else "MODERATE" if score <= 60 else "HIGH RISK"

    return Response(
        success=True,
        data=RiskScoreData(
            score=score,
            label=label,
            computed_at=datetime.now(timezone.utc),
        ),
        error=None,
    )
