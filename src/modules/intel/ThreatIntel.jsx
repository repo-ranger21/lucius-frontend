import { useState, useEffect } from 'react';
import { C, sevColor } from '../../styles/theme.js';
import { getThreatsFeed, getWeeklyDigest } from '../../api/client.js';

function formatDate(iso) {
  try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
  catch (_) { return iso; }
}

export default function ThreatIntel() {
  const [threats, setThreats] = useState([]);
  const [digest, setDigest]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const [threatsRes, digestRes] = await Promise.allSettled([getThreatsFeed(), getWeeklyDigest()]);
    if (threatsRes.status === 'fulfilled') setThreats(threatsRes.value.threats ?? []);
    if (digestRes.status  === 'fulfilled') setDigest(digestRes.value);
    const allFailed = threatsRes.status === 'rejected' && digestRes.status === 'rejected';
    if (allFailed) setError('Failed to load threat intelligence');
    setLoading(false);
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontFamily: "'Fira Code',monospace", fontSize: 12, letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  );

  return (
    <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>

      <div style={{ flexShrink: 0 }}>
        <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>THREAT INTELLIGENCE</div>
        <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim }}>Live CVE feed · WordPress plugin vulnerabilities</div>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(255,68,101,0.08)', border: '1px solid rgba(255,68,101,0.22)', borderRadius: 8, fontSize: 12, color: C.red, fontFamily: "'Fira Code',monospace", flexShrink: 0 }}>
          {error} ·{' '}
          <button onClick={load} style={{ background: 'none', border: 'none', color: C.blue, fontFamily: "'Fira Code',monospace", cursor: 'pointer', fontSize: 12 }}>RETRY</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, flex: 1, minHeight: 0 }}>

        {/* CVE feed */}
        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '15px 20px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Russo One',sans-serif", fontSize: 12, letterSpacing: '0.1em' }}>CVE FEED</span>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim }}>{threats.length} vulnerabilities</span>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 0' }}>
            {threats.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11 }}>
                No threats loaded
              </div>
            ) : threats.map((t, i) => {
              const c = sevColor(t.severity);
              return (
                <div key={t.cve_id ?? i} className="alert-row fade-in" style={{ padding: '14px 20px', animationDelay: `${i * 40}ms` }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: 3, flexShrink: 0 }}>
                      <div className={t.severity === 'critical' ? 'pulse' : ''}
                        style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: `0 0 6px ${c}` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 11, color: C.blue, fontWeight: 600 }}>{t.cve_id}</span>
                        <span className="badge" style={{ color: c, background: `${c}18`, border: `1px solid ${c}33` }}>{t.severity}</span>
                        {t.affected && (
                          <span className="badge" style={{ color: C.red, background: 'rgba(255,68,101,0.12)', border: '1px solid rgba(255,68,101,0.3)' }}>AFFECTED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.text, marginBottom: 4 }}>{t.plugin}</div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, marginBottom: 5 }}>{t.plain_english}</div>
                      <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim }}>{formatDate(t.published)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Weekly digest */}
        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ padding: '15px 18px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0 }}>
            <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 12, letterSpacing: '0.1em', marginBottom: 4 }}>WEEKLY DIGEST</div>
            {digest?.week_start && (
              <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim }}>
                Week of {formatDate(digest.week_start)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 18px' }}>
            {!digest ? (
              <div style={{ color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11, lineHeight: 1.7 }}>
                No digest available · Will generate automatically
              </div>
            ) : (
              <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, fontFamily: "'Nunito',sans-serif" }}>
                {digest.content}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
