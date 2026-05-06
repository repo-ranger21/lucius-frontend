import { useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';
import RiskGauge from '../../components/RiskGauge';
import { useLucius } from '../../hooks/useLucius';
import { api } from '../../api/client';
import * as theme from '../../styles/theme';

const { C } = theme;
const FONTS = theme.FONTS ?? {
  display: "'Russo One',sans-serif",
  mono: "'Fira Code',monospace",
};

const TREND = [
  { d: 'M', v: 12 },
  { d: 'T', v: 8 },
  { d: 'W', v: 24 },
  { d: 'T', v: 6 },
  { d: 'F', v: 19 },
  { d: 'S', v: 4 },
  { d: 'S', v: 3 },
];

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

function healthColor(score) {
  return score >= 80 ? C.green : score >= 55 ? C.orange : C.red;
}

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
        <div style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>{label}</div>
        <div style={{ fontSize: 18, opacity: 0.22 }}>{icon}</div>
      </div>
      <div style={{ fontFamily: FONTS.display, fontSize: 42, lineHeight: 1, color, textShadow: `0 0 18px ${color}44`, marginBottom: 10 }}>
        {value}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.muted }}>{sub}</div>
    </div>
  );
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

function AssetSkeletonBar() {
  return (
    <div style={{ padding: '9px 0', borderBottom: '1px solid rgba(79,142,247,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="pulse" style={{ width: 6, height: 6, borderRadius: '50%', background: 'rgba(79,142,247,0.25)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <div className="pulse" style={{ height: 11, width: '46%', borderRadius: 6, background: 'rgba(79,142,247,0.12)' }} />
            <div className="pulse" style={{ height: 11, width: 28, borderRadius: 6, background: 'rgba(79,142,247,0.08)' }} />
          </div>
          <div className="health-track">
            <div className="pulse" style={{ height: '100%', width: '58%', background: 'linear-gradient(90deg, rgba(79,142,247,0.16), rgba(79,142,247,0.08))' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertRow({ alert, onResolve }) {
  const color = severityColor(alert.severity);
  const [tagColor, tagBg] = TAG_COLORS[alert.tag] ?? [C.blue, 'rgba(79,142,247,0.12)'];

  return (
    <div className="alert-row fade-in" style={{ opacity: alert.resolved ? 0.38 : 1 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
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
          </div>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.55, marginBottom: 7 }}>{alert.detail}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.dim }}>{timeAgo(alert.created_at)}</span>
            {!alert.resolved ? (
              <button className="resolve-btn" onClick={() => onResolve(alert.id)}>RESOLVE →</button>
            ) : (
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.green }}>✓ RESOLVED</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetRow({ asset, idx }) {
  const score = asset.health_score ?? 0;
  const scoreColor = healthColor(score);
  const severity = asset.severity === 'crit' ? C.red : asset.severity === 'warn' ? C.orange : C.green;

  return (
    <div className="fade-in" style={{ padding: '9px 0', borderBottom: '1px solid rgba(79,142,247,0.06)', animationDelay: `${idx * 40}ms` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: severity, flexShrink: 0, boxShadow: asset.severity !== 'good' ? `0 0 5px ${severity}` : 'none' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 155 }}>{asset.name}</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: scoreColor, fontWeight: 600 }}>{score}</span>
          </div>
          <div className="health-track">
            <div className="health-fill" style={{ width: `${score}%`, background: `linear-gradient(90deg,${scoreColor}77,${scoreColor})` }} />
          </div>
        </div>
        <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim, letterSpacing: '0.08em', flexShrink: 0, width: 38, textAlign: 'right' }}>{asset.type}</span>
      </div>
    </div>
  );
}

export default function CommandCenter() {
  const { riskScore, alerts, assets, loading, error, resolveAlert, refresh } = useLucius();
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const nextScheduledScan = typeof api.triggerScan === 'function' ? '18h' : '18h';

  const sortedAlerts = useMemo(() => {
    return [...alerts].sort((left, right) => {
      if (left.resolved !== right.resolved) {
        return Number(left.resolved) - Number(right.resolved);
      }

      return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
    });
  }, [alerts]);

  const unresolvedAlerts = alerts.filter((alert) => !alert.resolved);
  const threatsBlocked = alerts.filter((alert) => alert.resolved).length;
  const assetsProtected = assets.length;
  const visibleRiskScore = loading ? 0 : riskScore;
  const statValue = (value) => (loading ? '—' : value);

  const rightPanel = (
    <div className="command-side">
      <div className="card card-topline" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ padding: '15px 18px 11px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: FONTS.display, fontSize: 12, letterSpacing: '0.1em' }}>ASSET HEALTH</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.dim }}>{loading ? '—' : `${assetsProtected} MONITORED`}</span>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 18px' }}>
          {loading ? (
            Array.from({ length: 3 }, (_, index) => <AssetSkeletonBar key={index} />)
          ) : assets.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>No assets registered</div>
          ) : (
            assets.map((asset, index) => <AssetRow key={asset.id ?? asset.name} asset={asset} idx={index} />)
          )}
        </div>
      </div>

      <div className="card card-topline" style={{ padding: '15px 18px', flexShrink: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontFamily: FONTS.display, fontSize: 11, letterSpacing: '0.1em' }}>WEEKLY THREATS</span>
          <span style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.muted }}>7-day trend</span>
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
              <Line type="monotone" dataKey="v" stroke="url(#blueGrad)" strokeWidth={2} dot={{ r: 2, fill: C.blue, strokeWidth: 0 }} activeDot={{ r: 4, fill: C.blue }} />
              <Tooltip
                contentStyle={{ background: '#0C1422', border: '1px solid rgba(79,142,247,0.25)', borderRadius: 7, fontFamily: 'Fira Code', fontSize: 11, padding: '6px 10px' }}
                itemStyle={{ color: C.blue }}
                labelStyle={{ color: C.muted }}
                cursor={{ stroke: 'rgba(79,142,247,0.2)' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
          {TREND.map((point) => (
            <span key={point.d} style={{ fontFamily: FONTS.mono, fontSize: 11, color: C.dim }}>{point.d}</span>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-padding" style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: 18, height: '100%', overflowX: 'hidden' }}>
      <div className="stat-grid" style={{ display: 'grid', gap: 16, flexShrink: 0 }}>
        <div className="card card-topline gauge-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px 0' }}>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.muted, letterSpacing: '0.14em', textTransform: 'uppercase' }}>Overall Risk</span>
            <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.green, background: C.greenD, padding: '2px 9px', borderRadius: 5, border: `1px solid ${C.green}33` }}>LIVE</span>
          </div>
          <div className="gauge-wrap">
            <RiskGauge score={visibleRiskScore} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, padding: '0 12px 12px' }}>
            {[
              { label: 'Open Issues', value: statValue(String(unresolvedAlerts.length)), color: unresolvedAlerts.length > 0 ? C.orange : C.green },
              { label: 'Assets', value: statValue(String(assetsProtected)), color: C.blue },
            ].map((item) => (
              <div key={item.label} style={{ background: 'rgba(79,142,247,0.04)', border: '1px solid rgba(79,142,247,0.1)', borderRadius: 9, padding: '9px 12px' }}>
                <div style={{ fontFamily: FONTS.mono, fontSize: 8, color: C.dim, letterSpacing: '0.08em', marginBottom: 4, textTransform: 'uppercase' }}>{item.label}</div>
                <div style={{ fontFamily: FONTS.display, fontSize: 22, color: item.color, textShadow: `0 0 14px ${item.color}44` }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <StatCard label="Threats Blocked" value={statValue(String(threatsBlocked))} sub="Resolved from live alert feed" color={threatsBlocked > 0 ? C.green : C.blue} icon="✓" />
        <StatCard label="Assets Protected" value={statValue(String(assetsProtected))} sub="Active inventory coverage" color={C.blue} icon="◎" />
        <StatCard label="Next Scheduled Scan" value={statValue(nextScheduledScan)} sub="Scanner automation arrives in Sprint 3" color={C.orange} icon="⟳" />
      </div>

      <div className="content-grid" style={{ display: 'grid', gap: 16, flex: 1, minHeight: 0 }}>
        <div className="card card-topline command-main" style={{ display: 'flex', flexDirection: 'column', position: 'relative', minHeight: 0 }}>
          <div className="scan-beam" />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px 13px', borderBottom: '1px solid rgba(79,142,247,0.07)', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontFamily: FONTS.display, fontSize: 13, letterSpacing: '0.1em' }}>ALERT FEED</span>
              <span style={{ fontFamily: FONTS.mono, fontSize: 9, color: C.dim }}>AI-translated · plain English</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontFamily: FONTS.mono, fontSize: 10, color: C.muted }}>{loading ? '—' : `${unresolvedAlerts.length} unresolved`}</span>
              <div className={unresolvedAlerts.length > 0 ? 'pulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: unresolvedAlerts.length > 0 ? C.red : C.green, boxShadow: unresolvedAlerts.length > 0 ? `0 0 7px ${C.red}` : `0 0 5px ${C.green}` }} />
            </div>
          </div>

          {error && !bannerDismissed ? (
            <div style={{ margin: '12px 20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.orange}66`, background: 'rgba(255,155,67,0.08)', color: C.orange, fontFamily: FONTS.mono, fontSize: 10, letterSpacing: '0.02em', flexShrink: 0 }}>
              <span>Live data unavailable — showing last known state</span>
              <button onClick={() => setBannerDismissed(true)} style={{ background: 'transparent', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: FONTS.mono, fontSize: 12, lineHeight: 1 }}>×</button>
            </div>
          ) : null}

          <div className="command-alert-list">
            {loading ? (
              Array.from({ length: 3 }, (_, index) => <SkeletonRow key={index} />)
            ) : sortedAlerts.length === 0 ? (
              <div style={{ padding: '32px 0', textAlign: 'center', color: C.dim, fontFamily: FONTS.mono, fontSize: 11 }}>No alerts · All clear</div>
            ) : (
              sortedAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} onResolve={resolveAlert} />)
            )}
          </div>
        </div>
        {rightPanel}
      </div>
    </div>
  );
}
