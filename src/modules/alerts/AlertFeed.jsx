import { useState, useEffect, useCallback } from 'react';
import { C, sevColor } from '../../styles/theme.js';
import { getAlerts, resolveAlert } from '../../api/client.js';

const SEVERITIES = ['all', 'critical', 'warning', 'info'];

const TAG_COLORS = {
  AUTH:      ['#FF4465', 'rgba(255,68,101,0.1)'],
  WORDPRESS: ['#FF9B43', 'rgba(255,155,67,0.1)'],
  BEHAVIOR:  ['#FF9B43', 'rgba(255,155,67,0.1)'],
  SSL:       ['#4F8EF7', 'rgba(79,142,247,0.12)'],
  DNS:       ['#4F8EF7', 'rgba(79,142,247,0.12)'],
  CVE:       ['#FF4465', 'rgba(255,68,101,0.1)'],
  ACCESS:    ['#4F8EF7', 'rgba(79,142,247,0.12)'],
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AlertFeed() {
  const [alerts, setAlerts]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [severity, setSev]    = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [resolving, setResolving] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlerts(page, severity);
      setAlerts(data.alerts ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      setError(err.message ?? 'Failed to load alerts');
    } finally {
      setLoading(false);
    }
  }, [page, severity]);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(id) {
    setResolving(prev => new Set(prev).add(id));
    try {
      await resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
    } catch (_) {
      // keep resolve button on failure — user can retry
    } finally {
      setResolving(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  const PAGE_SIZE   = 20;
  const totalPages  = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function filterBtn(s) {
    const active = severity === s;
    const accentColor = s === 'critical' ? C.red : s === 'warning' ? C.orange : C.blue;
    return {
      fontFamily: "'Fira Code',monospace", fontSize: 10, fontWeight: 600,
      padding: '5px 13px', borderRadius: 6, cursor: 'pointer',
      letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.15s',
      background: active ? `${accentColor}22` : 'transparent',
      border: `1px solid ${active ? accentColor : 'rgba(79,142,247,0.15)'}`,
      color: active ? accentColor : C.muted,
    };
  }

  return (
    <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>ALERT FEED</div>
          <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim }}>{total} total alerts</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SEVERITIES.map(s => (
            <button key={s} style={filterBtn(s)} onClick={() => { setSev(s); setPage(1); }}>{s}</button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div className="scan-beam" />
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.muted, fontFamily: "'Fira Code',monospace", fontSize: 12, letterSpacing: '0.1em' }}>
            LOADING...
          </div>
        ) : error ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 12 }}>
            <div style={{ color: C.red, fontFamily: "'Fira Code',monospace", fontSize: 12 }}>{error}</div>
            <button onClick={load} className="resolve-btn">RETRY</button>
          </div>
        ) : alerts.length === 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11 }}>
            No alerts · All clear
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 24px' }}>
            {alerts.map(a => {
              const c = sevColor(a.severity);
              const [tagColor, tagBg] = TAG_COLORS[a.tag] ?? [C.blue, C.blueD];
              return (
                <div key={a.id} className="alert-row fade-in" style={{ opacity: a.resolved ? 0.38 : 1 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ marginTop: 4, flexShrink: 0 }}>
                      <div className={!a.resolved && a.severity === 'critical' ? 'pulse' : ''}
                        style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: a.resolved ? 'none' : `0 0 7px ${c}` }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
                        <span style={{ fontSize: 13, fontWeight: 800, color: a.resolved ? C.muted : C.text }}>{a.title}</span>
                        <span className="badge" style={{ color: tagColor, background: tagBg, border: `1px solid ${tagColor}33` }}>{a.tag}</span>
                        <span className="badge" style={{ color: c, background: `${c}18`, border: `1px solid ${c}33` }}>{a.severity}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 7 }}>{a.detail}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim }}>{timeAgo(a.created_at)}</span>
                        {!a.resolved
                          ? <button className="resolve-btn" disabled={resolving.has(a.id)} onClick={() => handleResolve(a.id)}>
                              {resolving.has(a.id) ? 'RESOLVING...' : 'RESOLVE →'}
                            </button>
                          : <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.green }}>✓ RESOLVED</span>}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, flexShrink: 0 }}>
          <button className="resolve-btn" style={{ opacity: page === 1 ? 0.4 : 1 }}
            disabled={page === 1} onClick={() => setPage(p => p - 1)}>← PREV</button>
          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.muted }}>{page} / {totalPages}</span>
          <button className="resolve-btn" style={{ opacity: page === totalPages ? 0.4 : 1 }}
            disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>NEXT →</button>
        </div>
      )}
    </div>
  );
}
