"""
api/routes/proxy.py - LuciusProxy API endpoints
Handles proxy config, blocklist management, and event feed.
"""
from __future__ import annotations

from datetime import datetime
from typing import Literal

import bleach
from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel, ConfigDict, field_validator

from api.db.client import db
from api.limiter import limiter
from api.models.schemas import Response
from api.routes.auth import get_current_org_id

router = APIRouter(prefix="/proxy", tags=["proxy"])

_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}


class ProxyConfigData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    enabled: bool
    dns_server_ip: str
    block_suspicious_tlds: bool
    block_dga: bool
    log_all_queries: bool
    notify_on_block: bool


class BlocklistItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    org_id: str | None = None
    domain: str
    list_type: Literal["block", "allow"]
    reason: str | None = None
    is_active: bool
    created_at: datetime


class ProxyEventItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    domain: str
    reason: str
    plain_english: str
    client_ip: str | None = None
    resolved: bool
    created_at: datetime


class ProxySummaryData(BaseModel):
    blocked_24h: int
    blocked_7d: int
    blocked_30d: int
    unique_domains_7d: int
    enabled: bool
    dns_server_ip: str


class AddBlocklistRequest(BaseModel):
    domain: str
    list_type: Literal["block", "allow"] = "block"
    reason: str | None = None

    @field_validator("domain")
    @classmethod
    def clean_domain(cls, value: str) -> str:
        cleaned = bleach.clean(value.strip().lower().rstrip("."))
        if not cleaned or len(cleaned) > 253:
            raise ValueError("Invalid domain")
        return cleaned


class UpdateProxyConfigRequest(BaseModel):
    enabled: bool | None = None
    block_suspicious_tlds: bool | None = None
    block_dga: bool | None = None
    log_all_queries: bool | None = None
    notify_on_block: bool | None = None


@router.get("/summary")
@limiter.limit("30/minute")
async def get_proxy_summary(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        summary_res = (
            db.table("proxy_summary")
            .select("*")
            .eq("org_id", org_id)
            .execute()
        )
        rows = summary_res.data or []
        stats = rows[0] if rows else {
            "blocked_24h": 0,
            "blocked_7d": 0,
            "blocked_30d": 0,
            "unique_domains_7d": 0,
        }

        config_res = (
            db.table("proxy_config")
            .select("enabled,dns_server_ip")
            .eq("org_id", org_id)
            .execute()
        )
        config_rows = config_res.data or []
        config = config_rows[0] if config_rows else {
            "enabled": False,
            "dns_server_ip": "167.172.130.167",
        }

        data = ProxySummaryData(
            blocked_24h=int(stats.get("blocked_24h", 0)),
            blocked_7d=int(stats.get("blocked_7d", 0)),
            blocked_30d=int(stats.get("blocked_30d", 0)),
            unique_domains_7d=int(stats.get("unique_domains_7d", 0)),
            enabled=bool(config.get("enabled", False)),
            dns_server_ip=config.get("dns_server_ip", "167.172.130.167"),
        )
        return Response(success=True, data=data.model_dump(), error=None)
    except Exception:
        return Response(**_503)


@router.get("/events")
@limiter.limit("30/minute")
async def get_proxy_events(
    request: Request,
    page: int = 1,
    org_id: str = Depends(get_current_org_id),
):
    page_size = 25
    offset = (page - 1) * page_size
    try:
        res = (
            db.table("proxy_event_feed")
            .select("*", count="exact")
            .eq("org_id", org_id)
            .order("created_at", desc=True)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        events = [
            ProxyEventItem(
                id=row["id"],
                domain=row["domain"],
                reason=row["reason"],
                plain_english=row.get("plain_english", row["reason"]),
                client_ip=str(row["client_ip"]) if row.get("client_ip") else None,
                resolved=bool(row.get("resolved", False)),
                created_at=row["created_at"],
            ).model_dump()
            for row in (res.data or [])
        ]
        return Response(
            success=True,
            data={"events": events, "total": res.count or 0, "page": page},
            error=None,
        )
    except Exception:
        return Response(**_503)


@router.get("/blocklist")
@limiter.limit("30/minute")
async def get_blocklist(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        res = (
            db.table("proxy_blocklist")
            .select("*")
            .or_(f"org_id.eq.{org_id},org_id.is.null")
            .eq("is_active", True)
            .order("created_at", desc=True)
            .execute()
        )
        items = [
            BlocklistItem(
                id=row["id"],
                org_id=row.get("org_id"),
                domain=row["domain"],
                list_type=row["list_type"],
                reason=row.get("reason"),
                is_active=row["is_active"],
                created_at=row["created_at"],
            ).model_dump()
            for row in (res.data or [])
        ]
        return Response(success=True, data={"items": items, "total": len(items)}, error=None)
    except Exception:
        return Response(**_503)


@router.post("/blocklist")
@limiter.limit("20/minute")
async def add_to_blocklist(
    request: Request,
    body: AddBlocklistRequest,
    org_id: str = Depends(get_current_org_id),
):
    try:
        db.table("proxy_blocklist").insert(
            {
                "org_id": org_id,
                "domain": body.domain,
                "list_type": body.list_type,
                "reason": bleach.clean(body.reason or ""),
                "is_active": True,
            }
        ).execute()
        return Response(
            success=True,
            data={"domain": body.domain, "list_type": body.list_type},
            error=None,
        )
    except Exception as exc:
        if "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Domain already in list")
        return Response(**_503)


@router.post("/blocklist/{item_id}/remove")
@limiter.limit("20/minute")
async def remove_from_blocklist(
    request: Request,
    item_id: str,
    org_id: str = Depends(get_current_org_id),
):
    try:
        item_id_clean = bleach.clean(item_id)
        (
            db.table("proxy_blocklist")
            .update({"is_active": False})
            .eq("id", item_id_clean)
            .eq("org_id", org_id)
            .execute()
        )
        return Response(success=True, data={"removed": item_id_clean}, error=None)
    except Exception:
        return Response(**_503)


@router.get("/config")
@limiter.limit("30/minute")
async def get_proxy_config(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    try:
        res = (
            db.table("proxy_config")
            .select("*")
            .eq("org_id", org_id)
            .execute()
        )
        rows = res.data or []
        if not rows:
            db.table("proxy_config").insert({"org_id": org_id}).execute()
            res = db.table("proxy_config").select("*").eq("org_id", org_id).execute()
            rows = res.data or []

        config = ProxyConfigData(**rows[0])
        return Response(success=True, data=config.model_dump(), error=None)
    except Exception:
        return Response(**_503)


@router.post("/config")
@limiter.limit("10/minute")
async def update_proxy_config(
    request: Request,
    body: UpdateProxyConfigRequest,
    org_id: str = Depends(get_current_org_id),
):
    updates = {key: value for key, value in body.model_dump().items() if value is not None}
    if not updates:
        raise HTTPException(status_code=422, detail="No fields to update")

    try:
        (
            db.table("proxy_config")
            .update(updates)
            .eq("org_id", org_id)
            .execute()
        )
        return Response(success=True, data=updates, error=None)
    except Exception:
        return Response(**_503)