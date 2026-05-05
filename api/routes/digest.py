import asyncio
import os
from datetime import date, datetime, timedelta, timezone

import anthropic
import bleach
from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from api.db.client import db
from api.main import limiter
from api.models.schemas import DigestData, Response
from api.routes.auth import get_current_org_id

router = APIRouter(tags=["digest"])

_503 = {"success": False, "data": None, "error": "Service temporarily unavailable"}
_FALLBACK = "Your weekly digest is being generated. Check back in a few minutes."

_anthropic = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

_SYSTEM_PROMPT = (
    "You write weekly security briefs for small business owners. "
    "Plain English only. No CVE IDs, no technical jargon. Max 250 words. "
    "3 paragraphs: what happened this week, what needs attention now, "
    "what Lucius is handling automatically."
)


def _current_week_monday() -> date:
    today = date.today()
    return today - timedelta(days=today.weekday())


def _call_claude(user_prompt: str) -> str:
    """Sync Claude call — called via asyncio.to_thread to avoid blocking the event loop."""
    message = _anthropic.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=1000,
        system=_SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_prompt}],
    )
    return message.content[0].text


@router.get("/digest/weekly")
@limiter.limit("10/minute")
async def get_weekly_digest(
    request: Request,
    org_id: str = Depends(get_current_org_id),
):
    week_of = _current_week_monday()
    week_of_str = week_of.isoformat()

    # Return existing digest for this week if already generated
    try:
        existing = (
            db.table("digests")
            .select("*")
            .eq("org_id", org_id)
            .eq("week_of", week_of_str)
            .limit(1)
            .execute()
        )
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    if existing.data:
        row = existing.data[0]
        return Response(
            success=True,
            data=DigestData(
                week_of=str(row["week_of"]),
                content=row["content"],
                risk_score=row.get("risk_score") or 0,
                threats_blocked=row.get("threats_blocked") or 0,
            ),
            error=None,
        )

    # No digest for this week — gather live data to build the prompt
    try:
        alerts_result = (
            db.table("alerts")
            .select("severity, title, resolved")
            .eq("org_id", org_id)
            .execute()
        )
        all_alerts = alerts_result.data or []
    except Exception:
        return JSONResponse(status_code=503, content=_503)

    unresolved = [a for a in all_alerts if not a["resolved"]]
    resolved_count = len(all_alerts) - len(unresolved)
    crit = sum(1 for a in unresolved if a["severity"] == "critical")
    warn = sum(1 for a in unresolved if a["severity"] == "warning")
    top_titles = [bleach.clean(a["title"]) for a in unresolved[:3]]

    vuln = min(crit / 10, 1.0)
    exposure = min(warn / 20, 1.0)
    risk_score = max(0, min(100, round(((vuln * 0.35) + (exposure * 0.30)) * 100)))

    user_prompt = (
        f"Weekly security data:\n"
        f"- Risk score: {risk_score}/100\n"
        f"- Threats handled automatically this week: {resolved_count}\n"
        f"- Critical issues still open: {crit}\n"
        f"- Warnings still open: {warn}\n"
        f"- Top open issues: {', '.join(top_titles) if top_titles else 'None'}\n\n"
        f"Write the 3-paragraph weekly brief."
    )

    try:
        content = await asyncio.to_thread(_call_claude, user_prompt)
    except Exception:
        content = _FALLBACK

    # Only persist when we have real content — leaves no orphan row on AI failure
    if content != _FALLBACK:
        try:
            db.table("digests").insert({
                "org_id": org_id,
                "week_of": week_of_str,
                "content": content,
                "risk_score": risk_score,
                "threats_blocked": resolved_count,
            }).execute()
        except Exception:
            pass

    return Response(
        success=True,
        data=DigestData(
            week_of=week_of_str,
            content=content,
            risk_score=risk_score,
            threats_blocked=resolved_count,
        ),
        error=None,
    )
