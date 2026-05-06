import { useEffect, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api/client.js';
import { CSS, C } from '../styles/theme.js';

const NAVS = [
  { id: 'command',  icon: '◈', label: 'Command',  path: '/command' },
  { id: 'alerts',   icon: '⚡', label: 'Alerts',   path: '/alerts' },
  { id: 'assets',   icon: '◎', label: 'Assets',   path: '/assets' },
  { id: 'topology', icon: '⬡', label: 'Topology', path: '/topology' },
  { id: 'intel',    icon: '◉', label: 'Intel',    path: '/intel' },
  { id: 'proxy',    icon: '⬢', label: 'Proxy',    path: '/proxy' },
];

function ShellClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tStr = time.toLocaleTimeString('en-US', { hour12: false });
  const dStr = time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 15, color: C.blue, letterSpacing: '0.04em', lineHeight: 1 }}>{tStr}</div>
      <div style={{ fontFamily: "'Fira Code',monospace", fontSize: 9, color: C.dim, marginTop: 2, letterSpacing: '0.04em' }}>{dStr}</div>
    </div>
  );
}

export default function DashboardShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [alertCount, setAlertCount] = useState(0);
  const [critCount, setCritCount] = useState(0);

  useEffect(() => {
    let active = true;

    async function loadAlertBadge() {
      try {
        const response = await api.getAlerts();
        if (!active) return;

        const alerts = Array.isArray(response?.data?.alerts) ? response.data.alerts : [];
        const unresolved = alerts.filter((alert) => !alert.resolved);
        setAlertCount(unresolved.length);
        setCritCount(unresolved.filter((alert) => alert.severity === 'critical' || alert.severity === 'crit').length);
      } catch {
        if (!active) return;
        setAlertCount(0);
        setCritCount(0);
      }
    }

    loadAlertBadge();

    return () => {
      active = false;
    };
  }, [location.pathname]);

  const activeId = NAVS.find(n => location.pathname.startsWith(n.path))?.id ?? 'command';
  const active = activeId;
  const activeLabel = NAVS.find(n => n.id === activeId)?.label ?? 'Command';

  function onNav(id) {
    const navItem = NAVS.find((item) => item.id === id);
    if (navItem) {
      navigate(navItem.path);
    }
  }

  function handleSignOut() {
    navigate('/', { replace: true });
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="l-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden', color: C.text, fontFamily: "'Nunito',sans-serif", position: 'relative' }}>
        <div className="bg-grid" />

        {/* ── Sidebar ── */}
        <div className="desktop-sidebar" style={{ width: 216, flexShrink: 0, display: 'flex', flexDirection: 'column',
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
        <div className="mobile-content" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', zIndex: 1, position: 'relative', minWidth: 0 }}>

          {/* Top bar */}
          <div className="desktop-topbar" style={{ height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
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
              <ShellClock />
            </div>
          </div>

          {/* Routed page content */}
          <div style={{ flex: 1, overflow: 'auto', position: 'relative', minWidth: 0 }}>
            <Outlet />
          </div>
        </div>

        <nav className="mobile-nav">
          {NAVS.map(item => (
            <button
              key={item.id}
              className={`mobile-nav-item${active === item.id ? ' active' : ''}`}
              onClick={() => onNav(item.id)}
            >
              <span className="mobile-nav-icon">{item.icon}</span>
              <span className="mobile-nav-label">{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <div style={{
                  position: 'absolute', top: 6, right: 'calc(50% - 16px)',
                  width: 14, height: 14, borderRadius: '50%',
                  background: critCount ? '#FF4465' : '#FF9B43',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, fontWeight: 800, color: '#fff',
                }}>{alertCount}</div>
              )}
            </button>
          ))}
        </nav>
      </div>
    </>
  );
}
