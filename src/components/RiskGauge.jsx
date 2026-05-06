import { C, riskColor, riskLabel } from '../styles/theme.js';

export default function RiskGauge({ score, size = 200 }) {
  const R = 72, circ = 2 * Math.PI * R;
  const filled = (score / 100) * circ;
  const col = riskColor(score);
  const ticks = Array.from({ length: 40 }, (_, i) => {
    const angle = (i / 40) * 360;
    const rad = (angle * Math.PI) / 180;
    const r1 = 90, r2 = 94;
    return {
      x1: 100 + r1 * Math.cos(rad - Math.PI / 2), y1: 100 + r1 * Math.sin(rad - Math.PI / 2),
      x2: 100 + r2 * Math.cos(rad - Math.PI / 2), y2: 100 + r2 * Math.sin(rad - Math.PI / 2),
      major: i % 5 === 0,
    };
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px 12px 8px' }}>
      <div style={{ position: 'relative', width: size, height: size, maxWidth: '100%' }}>

        <svg className="spin" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(79,142,247,0.1)" strokeWidth="1" strokeDasharray="4 8" />
        </svg>

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 200 200">
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
              stroke={t.major ? 'rgba(79,142,247,0.4)' : 'rgba(79,142,247,0.14)'}
              strokeWidth={t.major ? 1.5 : 0.8} />
          ))}
        </svg>

        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }} viewBox="0 0 200 200">
          <circle cx="100" cy="100" r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="9" />
          <circle cx="100" cy="100" r={R} fill="none" stroke={col} strokeWidth="9"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${circ}`}
            style={{ filter: `drop-shadow(0 0 8px ${col})`, transition: 'stroke-dasharray 1.2s cubic-bezier(0.23,1,0.32,1)' }}
          />
          <circle cx="100" cy="100" r="56" fill="none" stroke="rgba(79,142,247,0.07)" strokeWidth="1" />
          <circle cx="100" cy="100" r="62" fill="none" stroke="rgba(79,142,247,0.04)" strokeWidth="1" />
          <circle cx="100" cy="100" r="78" fill="none"
            stroke={`${col}30`} strokeWidth="2"
            style={{ animation: 'ringPop 3s ease-in-out infinite' }} />
        </svg>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: size <= 160 ? 42 : 54, lineHeight: 1, color: col,
            textShadow: `0 0 28px ${col}55`, animation: 'countIn 0.9s cubic-bezier(0.23,1,0.32,1) both' }}>
            {score}
          </div>
          <div style={{ fontFamily: "'Fira Code',monospace", fontSize: size <= 160 ? 11 : 9, color: C.muted, letterSpacing: '0.16em', textTransform: 'uppercase', marginTop: 3 }}>
            Risk Score
          </div>
          <div style={{ fontFamily: "'Fira Code',monospace", fontSize: size <= 160 ? 11 : 8, color: col, letterSpacing: '0.08em', marginTop: 2 }}>
            ● {riskLabel(score)}
          </div>
        </div>
      </div>
    </div>
  );
}
