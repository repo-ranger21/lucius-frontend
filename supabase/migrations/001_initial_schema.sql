-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 — Initial Schema
-- Run in: Supabase dashboard → SQL Editor (or supabase db push)
-- PostgreSQL 15+ — gen_random_uuid() is built-in, no extension required
-- ─────────────────────────────────────────────────────────────────────────────


-- ── organizations ─────────────────────────────────────────────────────────────

CREATE TABLE organizations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT NOT NULL,
    domain      TEXT NOT NULL,
    plan        TEXT NOT NULL DEFAULT 'starter'
                    CHECK (plan IN ('starter', 'pro', 'enterprise')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── users ─────────────────────────────────────────────────────────────────────
-- password_hash: bcrypt hash stored by the API auth layer (never raw plaintext)

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    role            TEXT NOT NULL DEFAULT 'admin'
                        CHECK (role IN ('admin', 'viewer')),
    last_login      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── assets ────────────────────────────────────────────────────────────────────

CREATE TABLE assets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    type            TEXT NOT NULL
                        CHECK (type IN ('WEB', 'CLOUD', 'EMAIL', 'API', 'EDGE', 'APP')),
    url             TEXT,
    health_score    INT NOT NULL DEFAULT 100
                        CHECK (health_score BETWEEN 0 AND 100),
    severity        TEXT NOT NULL DEFAULT 'good'
                        CHECK (severity IN ('good', 'warn', 'crit')),
    last_scanned    TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── alerts ────────────────────────────────────────────────────────────────────
-- resolved_at: populated by POST /alerts/{id}/resolve
-- asset_id: nullable — alerts may not map to a single asset (e.g. org-wide CVE)

CREATE TABLE alerts (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id      UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    asset_id    UUID REFERENCES assets(id) ON DELETE SET NULL,
    severity    TEXT NOT NULL
                    CHECK (severity IN ('critical', 'warning', 'info')),
    title       TEXT NOT NULL
                    CHECK (char_length(title) <= 80),
    detail      TEXT NOT NULL
                    CHECK (char_length(detail) <= 280),
    tag         TEXT NOT NULL
                    CHECK (tag IN ('AUTH', 'WORDPRESS', 'SSL', 'DNS', 'BEHAVIOR', 'ACCESS', 'CVE')),
    resolved    BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ── scans ─────────────────────────────────────────────────────────────────────

CREATE TABLE scans (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id          UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'running', 'complete', 'failed')),
    findings_count  INT NOT NULL DEFAULT 0,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at    TIMESTAMPTZ
);


-- ── digests ───────────────────────────────────────────────────────────────────

CREATE TABLE digests (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    week_of          DATE NOT NULL,
    content          TEXT NOT NULL,
    risk_score       INT,
    threats_blocked  INT,
    sent_at          TIMESTAMPTZ,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ─────────────────────────────────────────────────────────────────────────────
-- Indexes
-- ─────────────────────────────────────────────────────────────────────────────

-- Alerts: primary query pattern — org + unresolved + recency
CREATE INDEX idx_alerts_org_unresolved ON alerts(org_id, resolved, created_at DESC);

-- Assets: ordered by health score ascending (worst first)
CREATE INDEX idx_assets_org_score ON assets(org_id, health_score ASC);

-- Scans: most recent scan per org
CREATE INDEX idx_scans_org_recent ON scans(org_id, started_at DESC);


-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- Policies are intentionally omitted here — added in 002_rls_policies.sql
-- Until policies are defined, only SERVICE_ROLE_KEY bypasses RLS.
-- The API backend exclusively uses SERVICE_ROLE_KEY (see api/db/client.py).
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE users           ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans           ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests         ENABLE ROW LEVEL SECURITY;


-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 001 complete
-- Run in Supabase SQL Editor before starting the API
-- Next: 002_rls_policies.sql (Sprint 2)
-- ─────────────────────────────────────────────────────────────────────────────
