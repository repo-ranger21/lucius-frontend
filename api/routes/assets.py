from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.db.client import db
from api.limiter import limiter
from api.models.schemas import AssetItem, AssetListData, Response
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["assets"])

_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}


@router.get("/assets")
@limiter.limit("30/minute")
async def get_assets(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        result = (
            db.table("assets")
            .select("*")
            .eq("org_id", org_id)
            .order("health_score", desc=False)  # worst assets first — most actionable at top
            .execute()
        )
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    items = [AssetItem.model_validate(row) for row in (result.data or [])]

    return Response(
        success=True,
        data=AssetListData(assets=items),
        error=None,
    )
