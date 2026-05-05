import os
from datetime import datetime, timedelta, timezone

import httpx
from fastapi import APIRouter, Depends, Request

from api.main import limiter
from api.models.schemas import Response, ThreatFeedData, ThreatItem
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["threats"])

_WORDFENCE_URL = "https://www.wordfence.com/api/1.0/vulnerabilities/production/"
_CACHE_TTL = timedelta(hours=1)
_CACHE: dict = {"data": None, "expires": datetime(2000, 1, 1, tzinfo=timezone.utc)}


def _severity_from_cvss(score: float) -> str:
    if score >= 9:
        return "critical"
    if score >= 7:
        return "high"
    if score >= 4:
        return "medium"
    return "low"


def _map_vulnerability(vuln: dict) -> ThreatItem | None:
    try:
        software_list = vuln.get("software") or []
        software = software_list[0] if software_list else {}

        plugin = software.get("name") or "Unknown plugin"
        slug = software.get("slug") or ""
        cve_id = vuln.get("cve") or f"{slug}-{vuln.get('id', 'unknown')}"

        cvss_score = float((vuln.get("cvss") or {}).get("score", 0))

        dates = vuln.get("dates") or {}
        added = dates.get("added") or datetime.now(timezone.utc).isoformat()
        published = datetime.fromisoformat(added.replace("Z", "+00:00"))

        plain_english = f"A security flaw was found in {plugin}. Update immediately."

        return ThreatItem(
            cve_id=str(cve_id)[:80],
            plugin=plugin,
            severity=_severity_from_cvss(cvss_score),
            plain_english=plain_english[:280],
            published=published,
            affected=False,
        )
    except Exception:
        return None


@router.get("/threats/feed")
@limiter.limit("20/minute")
async def get_threats_feed(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    now = datetime.now(timezone.utc)

    if _CACHE["data"] is not None and now < _CACHE["expires"]:
        return Response(
            success=True,
            data=ThreatFeedData(threats=_CACHE["data"]),
            error=None,
        )

    api_key = os.getenv("WORDFENCE_API_KEY", "")

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                _WORDFENCE_URL,
                params={"api_key": api_key, "limit": 20},
            )
            resp.raise_for_status()
            raw = resp.json()
    except Exception:
        # Return stale cache if available, empty list if not
        cached = _CACHE["data"] or []
        return Response(success=True, data=ThreatFeedData(threats=cached), error=None)

    # Wordfence may return a bare list or {"data": [...]}
    vulns = raw if isinstance(raw, list) else (raw.get("data") or [])

    threats = [t for t in (_map_vulnerability(v) for v in vulns) if t is not None]

    _CACHE["data"] = threats
    _CACHE["expires"] = now + _CACHE_TTL

    return Response(success=True, data=ThreatFeedData(threats=threats), error=None)
