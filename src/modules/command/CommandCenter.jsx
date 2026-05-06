import { useState, useEffect } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import { C, sevColor, healthColor } from '../../styles/theme.js';
import RiskGauge from '../../components/RiskGauge.jsx';
import { getRiskScore, getAlerts, getAssets, getScanStatus, resolveAlert } from '../../api/client.js';

// Placeholder until Sprint 3 adds historical threat count storage
const TREND = [{ d: 'M', v: 12 }, { d: 'T', v: 8 }, { d: 'W', v: 24 }, { d: 'T', v: 6 }, { d: 'F', v: 19 }, { d: 'S', v: 4 }, { d: 'S', v: 3 }];

const TAG_COLORS = {
  AUTH:      [C.red,    'rgba(255,68,101,0.1)'],
  WORDPRESS: [C.orange, 'rgba(255,155,67,0.1)'],
  BEHAVIOR:  [C.orange, 'rgba(255,155,67,0.1)'],
  SSL:       [C.blue,   'rgba(79,142,247,0.12)'],
  DNS:       [C.blue,   'rgba(79,142,247,0.12)'],
  CVE:       [C.red,    'rgba(255,68,101,0.1)'],
  ACCESS:    [C.blue,   'rgba(79,142,247,0.12)'],
};

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function StatCard({ label, value, sub, color, icon }) {
  return (
    <div className="card card-topline fade-in" style={{ padding: '20px 22px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 18, opacity: 0.22 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 42, lineHeight: 1, color, textShadow: `0 0 18px ${color}44`, marginBottom: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{sub}</div>
    </div>
  );
}

function AlertRow({ a, onResolve }) {
  const [resolving, setResolving] = useState(false);
  const c = sevColor(a.severity);
  const [tagColor, tagBg] = TAG_COLORS[a.tag] ?? [C.blue, 'rgba(79,142,247,0.12)'];

  async function handleResolve() {
    setResolving(true);
    try { await onResolve(a.id); } catch (_) { setResolving(false); }
  }

  return (
    <div className="alert-row fade-in" style={{ opacity: a.resolved ? 0.38 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <div style={{ marginTop: 4, flexShrink: 0 }}>
          <div className={!a.resolved && a.severity === 'critical' ? 'pulse' : ''}
            style={{ width: 8, height: 8, borderRadius: '50%', background: c, boxShadow: a.resolved ? 'none' : `0 0 7px ${c}` }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: a.resolved ? C.muted : C.text }}>{a.title}</span>
            <span className="badge" style={{ color: tagColor, background: tagBg, border: `1px solid ${tagColor}33` }}>{a.tag}</span>
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 7 }}>{a.detail}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim }}>{timeAgo(a.created_at)}</span>
            {!a.resolved
              ? <button className="resolve-btn" disabled={resolving} onClick={handleResolve}>
                  {resolving ? 'RESOLVING...' : 'RESOLVE →'}
                </button>
              : <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.green }}>✓ RESOLVED</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetRow({ a, idx }) {
  const score = a.health_score ?? 0;
  const sc = healthColor(score);
  const sevMap = { crit: C.red, warn: C.orange, good: C.green };
  const sevCol = sevMap[a.severity] ?? C.green;
  return (
    <div className="fade-in" style={{ padding: '9px 0', borderBottom: '1px solid rgba(79,142,247,0.06)', animationDelay: `${idx * 40}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: sevCol, flexShrink: 0,
          boxShadow: a.severity !== 'good' ? `0 0 5px ${sevCol}` : 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>{a.name}</span>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 11, color: sc, fontWeight: 600 }}>{score}</span>
          </div>
          <div className="health-track">
            <div className="health-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg,${sc}77,${sc})` }} />
          </div>
        </div>
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, letterSpacing: '0.08em', flexShrink: 0, width: 38, textAlign: 'right' }}>{a.type}</span>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const [risk, setRisk]     = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [scan, setScan]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError(null);
    const [riskRes, alertsRes, assetsRes, scanRes] = await Promise.allSettled([
      getRiskScore(),
      getAlerts(1, 'all'),
      getAssets(),
      getScanStatus(),
    ]);
    if (riskRes.status   === 'fulfilled') setRisk(riskRes.value);
    if (alertsRes.status === 'fulfilled') setAlerts(alertsRes.value.alerts ?? []);
    if (assetsRes.status === 'fulfilled') setAssets(assetsRes.value.assets ?? []);
    if (scanRes.status   === 'fulfilled') setScan(scanRes.value);
    const allFailed = [riskRes, alertsRes, assetsRes, scanRes].every(r => r.status === 'rejected');
    if (allFailed) setError('Could not reach the API. Is it running?');
    setLoading(false);
  }

  async function handleResolve(alertId) {
    await resolveAlert(alertId);
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, resolved: true } : a));
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.muted, fontFamily: "'Fira Code',monospace", fontSize: 12, letterSpacing: '0.1em' }}>
      LOADING...
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
      <div style={{ color: C.red, fontFamily: "'Fira Code',monospace", fontSize: 12 }}>{error}</div>
      <button onClick={load} className="resolve-btn">RETRY</button>
    </div>
  );

  const activeAlerts = alerts.filter(a => !a.resolved);
  const critCount    = activeAlerts.filter(a => a.severity === 'critical').length;
  const riskScore    = risk?.score ?? 0;

  const scanAgo = (() => {
    if (!scan?.completed_at) return scan ? scan.status : 'No scan yet';
    const hrs = Math.floor((Date.now() - new Date(scan.completed_at).getTime()) / 3600000);
    return hrs < 1 ? 'Just now' : `${hrs}h ago`;
  })();

  return (
    <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%' }}>

      {/* Row 1: Gauge + stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '256px 1fr 1fr 1fr', gap: 16, flexShrink: 0 }}>
        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 0' }}>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Overall Risk</span>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.green, background: C.greenD, padding: '2px 9px', borderRadius: 5, border: `1px solid ${C.green}33` }}>LIVE</span>
          </div>
          <RiskGauge score={riskScore} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
            {[
              { l: 'Open Issues', v: String(activeAlerts.length), c: critCount > 0 ? C.orange : C.green },
              { l: 'Assets',      v: String(assets.length),       c: C.blue },
            ].map(s => (
              <div key={s.l} style={{ background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 9, padding: '9px 12px' }}>
                <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 8, color: C.dim, letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{s.l}</div>
                <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 22, color: s.c, textShadow: `0 0 14px ${s.c}44` }}>{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <StatCard label="Critical Alerts" value={String(critCount)} sub={critCount > 0 ? 'Immediate action needed' : 'All clear'} color={critCount > 0 ? C.red : C.green} icon="⚠" />
        <StatCard label="Assets Protected" value={String(assets.length)} sub="All responding normally" color={C.blue} icon="◎" />
        <StatCard label="Last Scan" value={scanAgo} sub={scan ? `Status: ${scan.status}` : 'Trigger a scan'} color={C.orange} icon="⟳" />
      </div>

      {/* Row 2: Alert feed + right panel */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, flex: 1, minHeight: 0 }}>

        {/* Alert feed */}
        <div className="card card-topline" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
          <div className="scan-beam" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '15px 20px 13px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: "'Russo One',sans-serif", fontSize: 13, letterSpacing: '0.1em' }}>ALERT FEED</span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim }}>AI-translated · plain English</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.muted }}>{activeAlerts.length} unresolved</span>
              <div className={critCount > 0 ? 'pulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%',
                background: critCount > 0 ? C.red : C.green,
                boxShadow: critCount > 0 ? `0 0 7px ${C.red}` : `0 0 5px ${C.green}` }} />
            </div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '4px 20px' }}>
            {alerts.length === 0
              ? <div style={{ padding: '32px 0', textAlign: 'center', color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11 }}>No alerts · All clear</div>
              : alerts.map(a => <AlertRow key={a.id} a={a} onResolve={handleResolve} />)}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, minHeight: 0 }}>

          {/* Asset health */}
          <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '15px 18px 11px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontFamily: "'Russo One',sans-serif", fontSize: 12, letterSpacing: '0.1em' }}>ASSET HEALTH</span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim }}>{assets.length} MONITORED</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px' }}>
              {assets.length === 0
                ? <div style={{ padding: '20px 0', textAlign: 'center', color: C.dim, fontFamily: "'Fira Code',monospace", fontSize: 11 }}>No assets registered</div>
                : assets.map((a, i) => <AssetRow key={a.id ?? a.name} a={a} idx={i} />)}
            </div>
          </div>

          {/* Weekly trend sparkline */}
          <div className="card card-topline" style={{ padding: '15px 18px', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontFamily: "'Russo One',sans-serif", fontSize: 11, letterSpacing: '0.1em' }}>WEEKLY THREATS</span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.muted }}>7-day trend</span>
            </div>
            <div style={{ height: 56 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={TREND}>
                  <defs>
                    <linearGradient id="blueGrad" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor={C.blue} stopOpacity={0.6} />
                      <stop offset="100%" stopColor={C.blue} stopOpacity={1} />
                    </linearGradient>
                  </defs>
                  <Line type="monotone" dataKey="v" stroke="url(#blueGrad)" strokeWidth={2}
                    dot={{ r: 2, fill: C.blue, strokeWidth: 0 }}
                    activeDot={{ r: 4, fill: C.blue }} />
                  <Tooltip contentStyle={{ background: '#0C1422', border: '1px solid rgba(79,142,247,0.25)',
                    borderRadius: 7, fontFamily: 'Fira Code', fontSize: 11, padding: '6px 10px' }}
                    itemStyle={{ color: C.blue }} labelStyle={{ color: C.muted }}
                    cursor={{ stroke: 'rgba(79,142,247,0.2)' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {TREND.map(t => (
                <span key={t.d} style={{ fontFamily: "'Fira Code',monospace", fontSize: 8, color: C.dim }}>{t.d}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
