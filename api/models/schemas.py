from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ── Envelope ──────────────────────────────────────────────────────────────────

class Response(BaseModel):
    success: bool
    data: Any
    error: str | None = None


# ── Auth ──────────────────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Risk ──────────────────────────────────────────────────────────────────────

class RiskScoreData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    score: int = Field(..., ge=0, le=100)
    label: str
    computed_at: datetime


# ── Alerts ────────────────────────────────────────────────────────────────────

class AlertItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    severity: Literal["critical", "warning", "info"]
    title: str = Field(..., max_length=80)
    detail: str = Field(..., max_length=280)
    tag: Literal["AUTH", "WORDPRESS", "SSL", "DNS", "BEHAVIOR", "ACCESS", "CVE"]
    resolved: bool
    created_at: datetime
    asset_id: str | None = None


class AlertListData(BaseModel):
    alerts: list[AlertItem]
    total: int
    page: int


# ── Assets ────────────────────────────────────────────────────────────────────

class AssetItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    type: Literal["WEB", "CLOUD", "EMAIL", "API", "EDGE", "APP"]
    health_score: int = Field(..., ge=0, le=100)
    severity: Literal["good", "warn", "crit"]
    last_scanned: datetime | None = None


class AssetListData(BaseModel):
    assets: list[AssetItem]


# ── Scan ──────────────────────────────────────────────────────────────────────

class ScanTriggerRequest(BaseModel):
    asset_ids: list[str] | None = None


class ScanTriggerData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scan_id: str
    status: str
    started_at: datetime


class ScanStatusData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    scan_id: str
    status: Literal["pending", "running", "complete", "failed"]
    findings_count: int
    started_at: datetime
    completed_at: datetime | None = None


# ── Threats ───────────────────────────────────────────────────────────────────

class ThreatItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cve_id: str
    plugin: str
    severity: Literal["critical", "high", "medium", "low"]
    plain_english: str = Field(..., max_length=280)
    published: datetime
    affected: bool


class ThreatFeedData(BaseModel):
    threats: list[ThreatItem]


# ── Digest ────────────────────────────────────────────────────────────────────

class DigestData(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    week_of: str
    content: str
    risk_score: int
    threats_blocked: int
