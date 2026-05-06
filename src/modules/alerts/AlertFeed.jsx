import { useEffect, useMemo, useState } from 'react';
import { api } from '../../api/client';
import { useLucius } from '../../hooks/useLucius';
import * as theme from '../../styles/theme';

const { C } = theme;
const FONTS = theme.FONTS ?? {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
};

const SEVERITIES = ['all', 'critical', 'warning', 'info'];

const TAG_COLORS = {
  AUTH: [C.red, 'rgba(255,68,101,0.1)'],
  WORDPRESS: [C.orange, 'rgba(255,155,67,0.1)'],
  BEHAVIOR: [C.orange, 'rgba(255,155,67,0.1)'],
  SSL: [C.blue, 'rgba(79,142,247,0.12)'],
  DNS: [C.blue, 'rgba(79,142,247,0.12)'],
  CVE: [C.red, 'rgba(255,68,101,0.1)'],
  ACCESS: [C.blue, 'rgba(79,142,247,0.12)'],
};

function severityColor(severity) {
  return severity === 'critical' || severity === 'crit'
    ? C.red
    : severity === 'warning' || severity === 'warn'
      ? C.orange
      : C.blue;
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);

  if (mins < 60) return `${mins}m ago`;

  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;

  return `${Math.floor(hrs / 24)}d ago`;
}

function formatEmptyMessage(activeSeverity) {
  return `No ${activeSeverity === 'all' ? '' : `${activeSeverity} `}alerts. Your organization is clean.`;
}

function SkeletonRow() {
  return (
    <div className="alert-row" style={{ opacity: 0.8 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div className="pulse" style={{ width: 8, height: 8, borderRadius: '50%', marginTop: 4, background: 'rgba(79,142,247,0.25)' }} />
        <div style={{ flex: 1 }}>
          <div className="pulse" style={{ height: 13, width: '44%', borderRadius: 6, background: 'rgba(79,142,247,0.12)', marginBottom: 10 }} />
          <div className="pulse" style={{ height: 11, width: '92%', borderRadius: 6, background: 'rgba(79,142,247,0.08)', marginBottom: 7 }} />
          <div className="pulse" style={{ height: 11, width: '64%', borderRadius: 6, background: 'rgba(79,142,247,0.08)', marginBottom: 8 }} />
          <div className="pulse" style={{ height: 20, width: 88, borderRadius: 5, background: 'rgba(79,142,247,0.1)' }} />
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert, checked, onToggle, onResolve, resolving }) {
  const color = severityColor(alert.severity);
  const [tagColor, tagBg] = TAG_COLORS[alert.tag] ?? [C.blue, 'rgba(79,142,247,0.12)'];

  return (
    <div className="alert-row fade-in" style={{ opacity: alert.resolved ? 0.38 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {!alert.resolved ? (
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onToggle(alert.id)}
            style={{ marginTop: 2, accentColor: color, cursor: 'pointer' }}
          />
        ) : (
          <div style={{ width: 14, flexShrink: 0 }} />
        )}
        <div style={{ marginTop: 4, flexShrink: 0 }}>
          <div
            className={!alert.resolved && alert.severity === 'critical' ? 'pulse' : ''}
            style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: alert.resolved ? 'none' : `0 0 7px ${color}` }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: alert.resolved ? C.muted : C.text }}>{alert.title}</span>
            <span className="badge" style={{ color: tagColor, background: tagBg, border: `1px solid ${tagColor}33` }}>{alert.tag}</span>
            <span className="badge" style={{ color: color, background: `${color}18`, border: `1px solid ${color}33` }}>{alert.severity}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 7 }}>{alert.detail}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>{timeAgo(alert.created_at)}</span>
            {!alert.resolved ? (
              <button className="resolve-btn" disabled={resolving} onClick={() => onResolve(alert.id)}>
                {resolving ? 'RESOLVING...' : 'RESOLVE →'}
              </button>
            ) : (
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.green }}>✓ RESOLVED</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertFeed() {
  useLucius();

  const [activeSeverity, setActiveSeverity] = useState('all');
  const [page, setPage] = useState(1);
  const [allAlerts, setAllAlerts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [resolvingIds, setResolvingIds] = useState(new Set());

  useEffect(() => {
    let active = true;

    async function loadFirstPage() {
      setLoading(true);
      setError(null);
      setBannerDismissed(false);
      setPage(1);
      setAllAlerts([]);
      setSelectedIds([]);

      try {
        const response = await api.getAlerts(1, activeSeverity);
        if (!active) return;

        setAllAlerts(Array.isArray(response?.data?.alerts) ? response.data.alerts : []);
        setTotal(Number(response?.data?.total ?? 0));
      } catch (err) {
        if (!active) return;

        setError(err.message ?? 'Failed to load alerts');
        setTotal(0);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadFirstPage();

    return () => {
      active = false;
    };
  }, [activeSeverity]);

  const sortedAlerts = useMemo(() => {
    return [...allAlerts].sort((left, right) => {
      if (left.resolved !== right.resolved) {
        return Number(left.resolved) - Number(right.resolved);
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [allAlerts]);

  const selectedCount = selectedIds.length;

  function filterButtonStyle(severity) {
    const active = activeSeverity === severity;
    const accent = severity === 'critical' ? C.red : severity === 'warning' ? C.orange : C.blue;

    return {
      fontFamily: FONTS.mono,
      fontSize: 10,
      fontWeight: 600,
      padding: '6px 14px',
      borderRadius: 6,
      cursor: 'pointer',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      transition: 'all 0.15s',
      background: active ? `${accent}22` : 'transparent',
      border: `1px solid ${active ? accent : 'rgba(79,142,247,0.15)'}`,
      color: active ? accent : C.muted,
    };
  }

  function markResolved(ids) {
    const idSet = new Set(ids);
    setAllAlerts((currentAlerts) => currentAlerts.map((alert) => (
      idSet.has(alert.id) ? { ...alert, resolved: true } : alert
    )));
    setSelectedIds((currentIds) => currentIds.filter((id) => !idSet.has(id)));
  }

  function toggleSelected(id) {
    setSelectedIds((currentIds) => (
      currentIds.includes(id)
        ? currentIds.filter((currentId) => currentId !== id)
        : [...currentIds, id]
    ));
  }

  async function handleResolve(id) {
    setResolvingIds((current) => new Set(current).add(id));

    try {
      await api.resolveAlert(id);
      markResolved([id]);
    } catch (err) {
      setError(err.message ?? 'Failed to resolve alert');
      setBannerDismissed(false);
    } finally {
      setResolvingIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleBulkResolve() {
    const idsToResolve = [...selectedIds];

    for (const id of idsToResolve) {
      try {
        await api.resolveAlert(id);
      } catch (err) {
        setError(err.message ?? 'Failed to resolve selected alerts');
        setBannerDismissed(false);
        return;
      }
    }

    markResolved(idsToResolve);
  }

  async function handleLoadMore() {
    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const response = await api.getAlerts(nextPage, activeSeverity);
      const nextAlerts = Array.isArray(response?.data?.alerts) ? response.data.alerts : [];

      setAllAlerts((currentAlerts) => [...currentAlerts, ...nextAlerts]);
      setTotal(Number(response?.data?.total ?? total));
      setPage(nextPage);
    } catch (err) {
      setError(err.message ?? 'Failed to load more alerts');
      setBannerDismissed(false);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 16, height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>ALERT FEED</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>{loading ? '—' : total} total alerts</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {SEVERITIES.map((severity) => (
            <button key={severity} style={filterButtonStyle(severity)} onClick={() => setActiveSeverity(severity)}>
              {severity}
            </button>
          ))}
        </div>
      </div>

      <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, position: 'relative' }}>
        <div className="scan-beam" />

        {error && !bannerDismissed ? (
          <div style={{ margin: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.orange}66`, background: 'rgba(255,155,67,0.08)', color: C.orange, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.02em', flexShrink: 0 }}>
            <span>{error}</span>
            <button onClick={() => setBannerDismissed(true)} style={{ background: 'transparent', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 12, lineHeight: 1 }}>×</button>
          </div>
        ) : null}

        <div style={{ padding: '14px 20px 12px', borderBottom: '1px solid rgba(79,142,247,0.07)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontFamily: FONTS.display, fontSize: 13, letterSpacing: '0.1em' }}>PAGINATED FEED</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>{loading ? '—' : `${sortedAlerts.filter((alert) => !alert.resolved).length} unresolved`}</span>
          </div>
          {selectedCount > 0 ? (
            <button className="resolve-btn" onClick={handleBulkResolve}>Resolve Selected ({selectedCount})</button>
          ) : null}
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '4px 24px' }}>
          {loading ? (
            Array.from({ length: 3 }, (_, index) => <SkeletonRow key={index} />)
          ) : sortedAlerts.length === 0 ? (
            <div style={{ minHeight: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: C.green, textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 22 }}>✓</div>
              <div style={{ fontFamily: FONTS.mono, fontSize: 11 }}>{formatEmptyMessage(activeSeverity)}</div>
            </div>
          ) : (
            sortedAlerts.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                checked={selectedIds.includes(alert.id)}
                onToggle={toggleSelected}
                onResolve={handleResolve}
                resolving={resolvingIds.has(alert.id)}
              />
            ))
          )}
        </div>
      </div>

      {allAlerts.length < total ? (
        <div style={{ display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <button className="resolve-btn" disabled={loadingMore} onClick={handleLoadMore} style={{ minWidth: 130, opacity: loadingMore ? 0.6 : 1 }}>
            {loadingMore ? 'LOADING...' : 'LOAD MORE'}
          </button>
        </div>
      ) : null}
    </div>
  );
}
