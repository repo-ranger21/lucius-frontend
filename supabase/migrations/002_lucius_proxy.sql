-- ============================================================
-- LUCIUS PROXY - DATABASE MIGRATION
-- Run after 001_initial_schema.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS proxy_blocklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  list_type TEXT NOT NULL DEFAULT 'block' CHECK (list_type IN ('block', 'allow')),
  reason TEXT,
  added_by UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, domain, list_type)
);

CREATE INDEX IF NOT EXISTS idx_blocklist_active
  ON proxy_blocklist (is_active, list_type);

CREATE INDEX IF NOT EXISTS idx_blocklist_org
  ON proxy_blocklist (org_id, is_active);


CREATE TABLE IF NOT EXISTS proxy_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  domain TEXT NOT NULL,
  reason TEXT NOT NULL,
  client_ip INET,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_proxy_events_org_time
  ON proxy_events (org_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proxy_events_domain
  ON proxy_events (domain, created_at DESC);


CREATE TABLE IF NOT EXISTS proxy_daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_queries INTEGER NOT NULL DEFAULT 0,
  blocked_queries INTEGER NOT NULL DEFAULT 0,
  unique_domains INTEGER NOT NULL DEFAULT 0,
  top_blocked JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (org_id, date)
);


CREATE TABLE IF NOT EXISTS proxy_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  dns_server_ip TEXT NOT NULL DEFAULT '167.172.130.167',
  block_suspicious_tlds BOOLEAN NOT NULL DEFAULT TRUE,
  block_dga BOOLEAN NOT NULL DEFAULT TRUE,
  log_all_queries BOOLEAN NOT NULL DEFAULT FALSE,
  notify_on_block BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


ALTER TABLE proxy_blocklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE proxy_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proxy_blocklist_isolation ON proxy_blocklist;
CREATE POLICY proxy_blocklist_isolation ON proxy_blocklist
  FOR ALL TO authenticated
  USING (
    org_id = (SELECT org_id FROM users WHERE users.id = auth.uid())
    OR org_id IS NULL
  )
  WITH CHECK (
    org_id = (SELECT org_id FROM users WHERE users.id = auth.uid())
  );

DROP POLICY IF EXISTS proxy_events_isolation ON proxy_events;
CREATE POLICY proxy_events_isolation ON proxy_events
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS proxy_stats_isolation ON proxy_daily_stats;
CREATE POLICY proxy_stats_isolation ON proxy_daily_stats
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()));

DROP POLICY IF EXISTS proxy_config_isolation ON proxy_config;
CREATE POLICY proxy_config_isolation ON proxy_config
  FOR ALL TO authenticated
  USING (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()))
  WITH CHECK (org_id = (SELECT org_id FROM users WHERE users.id = auth.uid()));


CREATE OR REPLACE VIEW proxy_event_feed WITH (security_invoker = true) AS
SELECT
  pe.id,
  pe.org_id,
  pe.domain,
  pe.reason,
  CASE
    WHEN pe.reason = 'custom_blocklist' THEN 'Blocked - on your custom blocklist'
    WHEN pe.reason = 'parent_blocklist' THEN 'Blocked - parent domain is blacklisted'
    WHEN pe.reason LIKE 'suspicious_tld:%' THEN 'Blocked - known malicious domain extension'
    WHEN pe.reason = 'dga_heuristic' THEN 'Blocked - algorithmically generated domain (malware pattern)'
    ELSE 'Blocked - threat detected'
  END AS plain_english,
  pe.client_ip,
  pe.resolved,
  pe.created_at
FROM proxy_events pe
ORDER BY pe.created_at DESC;


CREATE OR REPLACE VIEW proxy_summary WITH (security_invoker = true) AS
SELECT
  org_id,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS blocked_24h,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS blocked_7d,
  COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') AS blocked_30d,
  COUNT(DISTINCT domain) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') AS unique_domains_7d
FROM proxy_events
WHERE NOT resolved
GROUP BY org_id;


INSERT INTO proxy_blocklist (org_id, domain, list_type, reason) VALUES
  (NULL, 'malware-c2.example.com', 'block', 'Known C2 server'),
  (NULL, 'phishing-bank.tk', 'block', 'Phishing site'),
  (NULL, 'ransomware-payload.xyz', 'block', 'Ransomware distribution'),
  (NULL, 'cryptominer.top', 'block', 'Cryptomining malware'),
  (NULL, 'exfil-staging.ml', 'block', 'Data exfiltration endpoint')
ON CONFLICT DO NOTHING;


CREATE OR REPLACE FUNCTION create_default_proxy_config()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO proxy_config (org_id)
  VALUES (NEW.id)
  ON CONFLICT (org_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_org_default_proxy_config ON organizations;
CREATE TRIGGER trg_org_default_proxy_config
  AFTER INSERT ON organizations
  FOR EACH ROW EXECUTE FUNCTION create_default_proxy_config();