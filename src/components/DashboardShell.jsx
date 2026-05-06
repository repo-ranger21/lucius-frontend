import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { CSS, C } from '../styles/theme.js';

const NAVS = [
  { id: 'command',  icon: '◈', label: 'Command',  path: '/command' },
  { id: 'alerts',   icon: '⚡', label: 'Alerts',   path: '/alerts' },
  { id: 'assets',   icon: '◎', label: 'Assets',   path: '/assets' },
  { id: 'topology', icon: '⬡', label: 'Topology', path: '/topology' },
  { id: 'intel',    icon: '◉', label: 'Intel',    path: '/intel' },
  { id: 'proxy',    icon: '⬢', label: 'Proxy',    path: '/proxy' },
];

export default function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  const token = sessionStorage.getItem('lucius_token');

  useEffect(() => {
    if (!token) navigate('/login', { replace: true });
  }, [token, navigate]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  if (!token) return null;

  const activeId = NAVS.find(n => location.pathname.startsWith(n.path))?.id ?? 'command';
  const activeLabel = NAVS.find(n => n.id === activeId)?.label ?? 'Command';

  const tStr = time.toLocaleTimeString('en-US', { hour12: false });
  const dStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  function handleSignOut() {
    sessionStorage.removeItem('lucius_token');
    navigate('/login', { replace: true });
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="l-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden', color: C.text, fontFamily: "'Nunito',sans-serif", position: 'relative' }}>
        <div className="bg-grid" />

        {/* ── Sidebar ── */}
        <div style={{ width: 216, flexShrink: 0, display: 'flex', flexDirection: 'column',
          background: 'rgba(5,7,12,0.92)', backdropFilter: 'blur(16px)',
          borderRight: '1px solid rgba(79,142,247,0.09)', zIndex: 10, padding: '22px 12px', position: 'relative' }}>

          <div style={{ padding: '0 8px 28px' }}>
            <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 24, letterSpacing: '0.04em' }}>
              <span style={{ color: C.blue }}>LUCI</span><span style={{ color: C.text }}>US</span>
            </div>
            <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, letterSpacing: '0.14em', marginTop: 3 }}>
              SECOPS ENGINE v2.4
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {NAVS.map(item => (
              <div key={item.id} className={`nav-link ${activeId === item.id ? 'on' : ''}`}
                onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid rgba(79,142,247,0.09)', paddingTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
              <div className="pulse" style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 7px ${C.green}` }} />
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.green, letterSpacing: '0.08em', fontWeight: 600 }}>
                SYSTEMS NOMINAL
              </span>
            </div>
            <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, lineHeight: 1.9, letterSpacing: '0.04em' }}>
              <div>ENTERPRISE PROTECTION</div>
              <button onClick={handleSignOut} style={{
                fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim,
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                letterSpacing: '0.04em', marginTop: 4,
              }}>
                SIGN OUT
              </button>
            </div>
          </div>
        </div>

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1, position: 'relative' }}>

          {/* Top bar */}
          <div style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 28px', borderBottom: '1px solid rgba(79,142,247,0.07)',
            background: 'rgba(4,6,8,0.75)', backdropFilter: 'blur(12px)', flexShrink: 0 }}>
            <div>
              <div style={{ fontFamily: "'Russo One',sans-serif", fontSize: 14, letterSpacing: '0.1em' }}>
                {activeLabel.toUpperCase()} CENTER
              </div>
              <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 10, color: C.dim, letterSpacing: '0.04em', marginTop: 1 }}>
                Protecting Your Organization · Lucius SecOps
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 15, color: C.blue, letterSpacing: '0.04em', lineHeight: 1 }}>{tStr}</div>
                <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, marginTop: 2, letterSpacing: '0.04em' }}>{dStr}</div>
              </div>
            </div>
          </div>

          {/* Routed page content */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
            <Outlet />
          </div>
        </div>
      </div>
    </>
  );
}
