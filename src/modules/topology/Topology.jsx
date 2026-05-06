import { C } from '../../styles/theme.js';

export default function Topology() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 20 }}>
      <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, letterSpacing: '0.22em', textTransform: 'uppercase', marginBottom: 4 }}>
        Module — Topology
      </div>
      <svg viewBox="0 0 200 200" style={{ width: 120, height: 120, opacity: 0.2 }}>
        <circle cx="100" cy="100" r="6" fill={C.blue} />
        <circle cx="50"  cy="55"  r="5" fill={C.green} />
        <circle cx="155" cy="55"  r="5" fill={C.orange} />
        <circle cx="40"  cy="145" r="5" fill={C.muted} />
        <circle cx="160" cy="145" r="5" fill={C.muted} />
        <circle cx="100" cy="165" r="5" fill={C.muted} />
        <line x1="100" y1="100" x2="50"  y2="55"  stroke={C.blue} strokeWidth="1" strokeOpacity="0.5" />
        <line x1="100" y1="100" x2="155" y2="55"  stroke={C.blue} strokeWidth="1" strokeOpacity="0.5" />
        <line x1="100" y1="100" x2="40"  y2="145" stroke={C.blue} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="100" y1="100" x2="160" y2="145" stroke={C.blue} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="100" y1="100" x2="100" y2="165" stroke={C.blue} strokeWidth="1" strokeOpacity="0.3" />
        <line x1="50"  y1="55"  x2="155" y2="55"  stroke={C.green} strokeWidth="0.7" strokeOpacity="0.3" />
      </svg>
      <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 18, letterSpacing: '0.1em', color: C.muted }}>
        TOPOLOGY MAP
      </div>
      <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 11, color: C.dim, textAlign: 'center', maxWidth: 260, lineHeight: 1.7 }}>
        D3 force-directed asset graph<br />
        Coming in Sprint 3
      </div>
    </div>
  );
}
