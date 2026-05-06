import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import * as theme from '../../styles/theme';

const { C } = theme;
const FONTS = theme.FONTS ?? {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
  body: "'Nunito',sans-serif",
};

const DIGEST_FALLBACK = 'Your weekly digest is being generated. Check back in a few minutes.';
const THREAT_ORDER = { critical: 0, high: 1, medium: 2, low: 3 };

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function severityColor(severity) {
  return severity === 'critical'
    ? C.red
    : severity === 'high'
      ? C.orange
      : severity === 'medium'
        ? C.blue
        : C.dim;
}

function ThreatSkeleton() {
  return (
    <div className="alert-row" style={{ padding: '14px 20px', opacity: 0.8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, background: 'rgba(79,142,247,0.25)' }} />
        <div style={{ flex: 1 }}>
          <div className="pulse" style={{ width: 120, height: 11, borderRadius: 6, background: 'rgba(79,142,247,0.12)', marginBottom: 8 }} />
          <div className="pulse" style={{ width: '52%', height: 12, borderRadius: 6, background: 'rgba(79,142,247,0.10)', marginBottom: 8 }} />
          <div className="pulse" style={{ width: '94%', height: 10, borderRadius: 6, background: 'rgba(79,142,247,0.08)', marginBottom: 6 }} />
          <div className="pulse" style={{ width: '72%', height: 10, borderRadius: 6, background: 'rgba(79,142,247,0.08)', marginBottom: 8 }} />
          <div className="pulse" style={{ width: 88, height: 9, borderRadius: 6, background: 'rgba(79,142,247,0.06)' }} />
        </div>
      </div>
    </div>
  );
}

function DigestSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div className="pulse" style={{ height: 16, borderRadius: 8, background: 'rgba(79,142,247,0.10)' }} />
      <div className="pulse" style={{ height: 16, borderRadius: 8, background: 'rgba(79,142,247,0.08)' }} />
      <div className="pulse" style={{ height: 16, borderRadius: 8, background: 'rgba(79,142,247,0.08)' }} />
    </div>
  );
}

function ThreatItem({ threat }) {
  const color = severityColor(threat.severity);

  return (
    <div className="alert-row fade-in" style={{ padding: '14px 20px' }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ marginTop: 3, flexShrink: 0 }}>
          <div
            className={threat.severity === 'critical' ? 'pulse' : ''}
            style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: threat.severity === 'low' ? 'none' : `0 0 6px ${color}` }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: color, fontWeight: 600 }}>{threat.cve_id}</span>
            {threat.affected ? (
              <span className="badge" style={{ color: C.red, background: 'rgba(255,68,101,0.12)', border: '1px solid rgba(255,68,101,0.3)' }}>AFFECTED</span>
            ) : null}
          </div>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginBottom: 5 }}>{threat.plugin}</div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 6 }}>{threat.plain_english}</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>{formatDate(threat.published)}</div>
        </div>
      </div>
    </div>
  );
}

export default function ThreatIntel() {
  const isMobile = theme.useIsMobile();
  const [threats, setThreats] = useState([]);
  const [threatsLoading, setThreatsLoading] = useState(true);
  const [threatsError, setThreatsError] = useState(null);
  const [threatBannerDismissed, setThreatBannerDismissed] = useState(false);

  const [digest, setDigest] = useState(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [digestError, setDigestError] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadThreats() {
      setThreatsLoading(true);
      setThreatsError(null);
      setThreatBannerDismissed(false);

      try {
        const response = await api.getThreats();
        if (!active) return;

        setThreats(Array.isArray(response?.data?.threats) ? response.data.threats : []);
      } catch (err) {
        if (!active) return;
        setThreats([]);
        setThreatsError(err.message ?? 'Threat feed unavailable');
      } finally {
        if (active) {
          setThreatsLoading(false);
        }
      }
    }

    async function loadDigest() {
      setDigestLoading(true);
      setDigestError(false);

      try {
        const response = await api.getWeeklyDigest();
        if (!active) return;

        setDigest(response?.data ?? null);
      } catch {
        if (!active) return;
        setDigest(null);
        setDigestError(true);
      } finally {
        if (active) {
          setDigestLoading(false);
        }
      }
    }

    loadThreats();
    loadDigest();

    return () => {
      active = false;
    };
  }, []);

  const sortedThreats = useMemo(() => {
    return [...threats].sort((left, right) => {
      return (THREAT_ORDER[left.severity] ?? 99) - (THREAT_ORDER[right.severity] ?? 99);
    });
  }, [threats]);

  const digestParagraphs = useMemo(() => {
    return (digest?.content ?? '')
      .split('\n')
      .map((paragraph) => paragraph.trim())
      .filter(Boolean);
  }, [digest]);

  const digestIsGenerating = digest?.content === DIGEST_FALLBACK;

  return (
    <div className="page-padding" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowX: 'hidden' }}>
      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>THREAT INTELLIGENCE</div>
        <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>Live CVE feed · Weekly executive brief</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: isMobile ? 10 : 18, flex: 1, minHeight: 0 }}>
        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile ? 300 : 0 }}>
          <div style={{ padding: '15px 20px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: '0.1em' }}>CVE THREAT FEED</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>{threatsLoading ? '—' : `${sortedThreats.length} vulnerabilities`}</span>
          </div>

          {threatsError && !threatBannerDismissed ? (
            <div style={{ margin: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.orange}66`, background: 'rgba(255,155,67,0.08)', color: C.orange, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.02em', flexShrink: 0 }}>
              <span>{threatsError}</span>
              <button onClick={() => setThreatBannerDismissed(true)} style={{ background: 'transparent', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 12, lineHeight: 1 }}>×</button>
            </div>
          ) : null}

          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {threatsLoading ? (
              Array.from({ length: 4 }, (_, index) => <ThreatSkeleton key={index} />)
            ) : sortedThreats.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>
                No active threats in your feed.
              </div>
            ) : (
              sortedThreats.map((threat) => <ThreatItem key={threat.cve_id} threat={threat} />)
            )}
          </div>
        </div>

        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column', minHeight: isMobile ? 300 : 0 }}>
          <div style={{ padding: '15px 18px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0 }}>
            <div style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: '0.1em', marginBottom: 4 }}>WEEKLY BRIEF</div>
            <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>
              {digest?.week_of ? `Week of ${formatDate(digest.week_of)}` : 'Week of —'}
            </div>
          </div>

          <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {digestLoading ? (
              <DigestSkeleton />
            ) : digestError ? (
              <div style={{ color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>Digest unavailable this week.</div>
            ) : digestIsGenerating ? (
              <div style={{ color: C.dim, fontFamily: FONTS.body, fontSize: 13, fontStyle: 'italic', lineHeight: 1.7, textAlign: 'center', margin: 'auto 0' }}>
                {digest?.content}
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {digestParagraphs.map((paragraph, index) => (
                    <p key={index} style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, fontFamily: FONTS.body }}>
                      {paragraph}
                    </p>
                  ))}
                </div>

                <div style={{ marginTop: 'auto', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge" style={{ color: C.blue, background: C.blueD, border: `1px solid ${C.blue}33`, fontFamily: FONTS.mono, fontSize: 9 }}>
                    RISK {digest?.risk_score ?? 0}
                  </span>
                  <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.muted }}>
                    {digest?.threats_blocked ?? 0} threats blocked
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
