import { useEffect, useRef, useState } from 'react';
import { api } from '../../api/client';
import * as theme from '../../styles/theme';

const { C } = theme;
const FONTS = theme.FONTS ?? {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
};

const TYPE_ICON = { WEB: '🌐', CLOUD: '☁', APP: '📱', EMAIL: '✉', EDGE: '⚡', API: '◈' };

function healthColor(score) {
  return score >= 80 ? C.green : score >= 55 ? C.orange : C.red;
}

function severityColor(severity) {
  return severity === 'crit' || severity === 'critical'
    ? C.red
    : severity === 'warn' || severity === 'warning'
      ? C.orange
      : C.green;
}

function severityLabel(severity) {
  return severity === 'crit' || severity === 'critical'
    ? 'CRITICAL'
    : severity === 'warn' || severity === 'warning'
      ? 'WARNING'
      : 'HEALTHY';
}

function lastScannedLabel(value) {
  if (!value) {
    return 'Never scanned';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const hours = Math.max(0, Math.floor(diffMs / 3600000));
  return `Scanned ${hours}h ago`;
}

function truncateName(name) {
  if (!name) return '';
  return name.length > 28 ? `${name.slice(0, 28)}...` : name;
}

function SkeletonCard() {
  return (
    <div className="card card-topline" style={{ minHeight: 160, padding: '18px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="pulse" style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(79,142,247,0.15)' }} />
          <div>
            <div className="pulse" style={{ width: 120, height: 12, borderRadius: 6, background: 'rgba(79,142,247,0.12)', marginBottom: 6 }} />
            <div className="pulse" style={{ width: 42, height: 9, borderRadius: 6, background: 'rgba(79,142,247,0.08)' }} />
          </div>
        </div>
        <div className="pulse" style={{ width: 48, height: 18, borderRadius: 8, background: 'rgba(79,142,247,0.1)' }} />
      </div>
      <div className="pulse" style={{ width: 64, height: 36, borderRadius: 8, background: 'rgba(79,142,247,0.12)', marginBottom: 14 }} />
      <div className="health-track" style={{ marginBottom: 14 }}>
        <div className="pulse" style={{ width: '62%', height: '100%', background: 'linear-gradient(90deg, rgba(79,142,247,0.16), rgba(79,142,247,0.08))' }} />
      </div>
      <div className="pulse" style={{ width: '56%', height: 10, borderRadius: 6, background: 'rgba(79,142,247,0.08)', marginBottom: 8 }} />
      <div className="pulse" style={{ width: '38%', height: 9, borderRadius: 6, background: 'rgba(79,142,247,0.06)' }} />
    </div>
  );
}

function AssetCard({ asset, expanded, onToggle, assetAlerts }) {
  const score = asset.health_score ?? 0;
  const scoreColor = healthColor(score);
  const sevColor = severityColor(asset.severity);

  return (
    <div
      className="card card-topline fade-in"
      onClick={onToggle}
      style={{
        padding: '18px 20px',
        cursor: 'pointer',
        borderColor: expanded ? sevColor : 'rgba(79,142,247,0.13)',
        boxShadow: expanded ? `0 0 18px ${sevColor}22` : 'none',
        transition: 'border-color 0.18s, box-shadow 0.18s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>{TYPE_ICON[asset.type] ?? '◈'}</span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{truncateName(asset.name)}</div>
          </div>
        </div>
        <span className="badge" style={{ color: C.blue, background: C.blueD, border: `1px solid ${C.blue}33`, flexShrink: 0, fontFamily: FONTS.mono, fontSize: 9 }}>{asset.type}</span>
      </div>

      <div className="asset-score" style={{ fontFamily: FONTS.display, lineHeight: 1, color: scoreColor, textShadow: `0 0 18px ${scoreColor}44`, marginBottom: 12 }}>
        {score}
      </div>

      <div className="health-track" style={{ marginBottom: 12 }}>
        <div className="health-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg,${scoreColor}77,${scoreColor})` }} />
      </div>

      {expanded ? (
        <div style={{ marginBottom: 12, padding: '12px 12px 10px', borderRadius: 10, border: `1px solid ${sevColor}33`, background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Open alerts for this asset</div>
          {assetAlerts && assetAlerts.length === 0 ? (
            <div style={{ fontSize: 12, color: C.green }}>✓ No open alerts for this asset — all clear</div>
          ) : assetAlerts && assetAlerts.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {assetAlerts.map(alert => (
                <div key={alert.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: severityColor(alert.severity), marginTop: 3, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>{alert.title}</span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: C.dim }}>Loading alerts...</div>
          )}
        </div>
      ) : null}

      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevColor, boxShadow: `0 0 5px ${sevColor}` }} />
        <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: sevColor, letterSpacing: '0.08em' }}>{severityLabel(asset.severity)}</span>
      </div>

      <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim, letterSpacing: '0.04em' }}>
        {lastScannedLabel(asset.last_scanned ?? asset.updated_at)}
      </div>
    </div>
  );
}

export default function AssetMap() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const pollingRef = useRef(null);

  async function fetchAssets({ initial = false } = {}) {
    if (initial) {
      setLoading(true);
    }

    try {
      const response = await api.getAssets();
      setAssets(Array.isArray(response?.data?.assets) ? response.data.assets : []);
      setError(null);
    } catch (err) {
      setError(err.message ?? 'Failed to load assets');
      setBannerDismissed(false);
    } finally {
      if (initial) {
        setLoading(false);
      }
    }
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }

  useEffect(() => {
    fetchAssets({ initial: true });
    api.getAlerts().then(res => {
      setAlerts(Array.isArray(res?.data?.alerts) ? res.data.alerts : []);
    }).catch(() => {});

    return () => {
      stopPolling();
    };
  }, []);

  async function pollScanStatus() {
    try {
      const response = await api.getScanStatus();
      const status = response?.data?.status ?? null;

      if (status === 'complete' || status === 'failed') {
        stopPolling();
        setScanning(false);
        setScanStatus(status === 'complete' ? 'Scan complete' : 'Scan failed');
        await fetchAssets();
      } else {
        setScanStatus('SCANNING...');
      }
    } catch (err) {
      stopPolling();
      setScanning(false);
      setError(err.message ?? 'Failed to check scan status');
      setBannerDismissed(false);
    }
  }

  async function handleTriggerScan() {
    setError(null);
    setBannerDismissed(false);
    setScanStatus('SCANNING...');

    try {
      await api.triggerScan();
      setScanning(true);
      stopPolling();
      pollingRef.current = setInterval(() => {
        pollScanStatus();
      }, 3000);
      await pollScanStatus();
    } catch (err) {
      setScanning(false);
      setScanStatus(null);
      setError(err.message ?? 'Failed to trigger scan');
      setBannerDismissed(false);
    }
  }

  const assetCards = assets;

  return (
    <div className="page-padding" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowX: 'hidden' }}>
      <div className="scan-header">
        <div>
          <div style={{ fontFamily: FONTS.display, fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>ASSET MAP</div>
          <div style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>
            {loading ? '—' : `${assets.length} assets monitored`}{scanStatus ? ` · ${scanStatus}` : ''}
          </div>
        </div>
        <button className={`resolve-btn scan-button${scanning ? ' pulse' : ''}`} disabled={scanning} onClick={handleTriggerScan} style={{ opacity: scanning ? 0.7 : 1 }}>
          {scanning ? 'SCANNING...' : 'TRIGGER SCAN'}
        </button>
      </div>

      {error && !bannerDismissed ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.orange}66`, background: 'rgba(255,155,67,0.08)', color: C.orange, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.02em', flexShrink: 0 }}>
          <span>{error}</span>
          <button onClick={() => setBannerDismissed(true)} style={{ background: 'transparent', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 12, lineHeight: 1 }}>×</button>
        </div>
      ) : null}

      <div className="asset-grid" style={{ display: 'grid', gap: 16, overflowY: 'auto', overflowX: 'hidden', flex: 1, alignContent: 'start' }}>
        {loading ? (
          Array.from({ length: 6 }, (_, index) => <SkeletonCard key={index} />)
        ) : assetCards.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', minHeight: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: C.dim, fontFamily: FONTS.mono, fontSize: 11, padding: '24px 0' }}>
            No assets registered. Add your first asset to begin monitoring.
          </div>
        ) : (
          assetCards.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              expanded={expandedId === asset.id}
              onToggle={() => setExpandedId(expandedId === asset.id ? null : asset.id)}
              assetAlerts={alerts.filter(a => a.asset_id === asset.id && !a.resolved)}
            />
          ))
        )}
      </div>
    </div>
  );
}
