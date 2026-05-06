import { useState, useEffect } from 'react';
import { C, healthColor } from '../../styles/theme.js';
import { getAssets, triggerScan, getScanStatus } from '../../api/client.js';

const TYPE_ICON = { WEB: '🌐', CLOUD: '☁', APP: '📱', EMAIL: '✉', EDGE: '⚡', API: '◈' };

const SEV_BORDER = s =>
  s === 'crit' ? 'rgba(255,68,101,0.35)' :
  s === 'warn' ? 'rgba(255,155,67,0.28)' :
  'rgba(79,142,247,0.13)';

function HealthBar({ score }) {
  const c = healthColor(score);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted, letterSpacing: '0.06em' }}>HEALTH</span>
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 11, fontWeight: 600, color: c }}>{score}</span>
      </div>
      <div className="health-track">
        <div className="health-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg,${c}77,${c})` }} />
      </div>
    </div>
  );
}

export default function AssetMap() {
  const [assets, setAssets]     = useState([]);
  const [scan, setScan]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [scanLoading, setScanLoading] = useState(false);
  const [error, setError]       = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const [assetsRes, scanRes] = await Promise.allSettled([getAssets(), getScanStatus()]);
    if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value.assets ?? []);
    if (scanRes.status   === 'fulfilled') setScan(scanRes.value);
    setLoading(false);
  }

  async function handleScanTrigger() {
    setScanLoading(true);
    setError(null);
    try {
      const result = await triggerScan(null);
      setScan(result);
    } catch (err) {
      setError(err.message ?? 'Scan trigger failed');
    } finally {
      setScanLoading(false);
    }
  }

  const scanBusy = scan?.status === 'running' || scan?.status === 'pending';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontFamily: "'Fira Code',monospace", fontSize: 12, letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  );

  return (
    <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
        <div>
          <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 14, letterSpacing: '0.1em', marginBottom: 4 }}>ASSET MAP</div>
          <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim }}>
            {assets.length} assets monitored{scan ? ` · Last scan: ${scan.status}` : ''}
          </div>
        </div>
        <button onClick={handleScanTrigger} disabled={scanLoading || scanBusy} style={{
          fontFamily: "'Fira Code',monospace", fontSize: 11, fontWeight: 600,
          padding: '8px 20px', borderRadius: 8, cursor: scanLoading || scanBusy ? 'not-allowed' : 'pointer',
          letterSpacing: '0.08em', transition: 'all 0.15s',
          background: 'rgba(79,142,247,0.12)', border: '1px solid rgba(79,142,247,0.4)',
          color: C.blue, opacity: scanLoading || scanBusy ? 0.55 : 1,
        }}>
          {scanLoading ? 'TRIGGERING...' : scanBusy ? '⟳ SCANNING...' : '⟳ TRIGGER SCAN'}
        </button>
      </div>

      {error && (
        <div style={{ padding: '10px 16px', background: 'rgba(255,68,101,0.08)', border: '1px solid rgba(255,68,101,0.22)', borderRadius: 8, fontSize: 12, color: C.red, fontFamily: "'Fira Code',monospace", flexShrink: 0 }}>
          {error}
        </div>
      )}

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, overflow: 'auto', flex: 1, alignContent: 'start' }}>
        {assets.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '48px 0', color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11 }}>
            No assets registered · Add assets to start monitoring
          </div>
        ) : assets.map(a => {
          const score  = a.health_score ?? 0;
          const sevMap = { crit: C.red, warn: C.orange, good: C.green };
          const sevCol = sevMap[a.severity] ?? C.green;
          return (
            <div key={a.id} className="card fade-in" style={{ padding: '18px 20px', borderColor: SEV_BORDER(a.severity) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>{TYPE_ICON[a.type] ?? '◈'}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: C.text, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                    <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, letterSpacing: '0.08em', marginTop: 2 }}>{a.type}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 9px', background: `${sevCol}18`, borderRadius: 6, border: `1px solid ${sevCol}33` }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: sevCol, boxShadow: a.severity !== 'good' ? `0 0 5px ${sevCol}` : 'none' }} />
                  <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: sevCol, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{a.severity}</span>
                </div>
              </div>
              <HealthBar score={score} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
