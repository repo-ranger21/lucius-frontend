import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardShell from './components/DashboardShell.jsx';
import Login from './components/Login.jsx';
import CommandCenter from './modules/command/CommandCenter.jsx';
import AlertFeed from './modules/alerts/AlertFeed.jsx';
import AssetMap from './modules/assets/AssetMap.jsx';
import Topology from './modules/topology/Topology.jsx';
import ThreatIntel from './modules/intel/ThreatIntel.jsx';
import LuciusProxy from './modules/proxy/LuciusProxy.jsx';

export default function App() {
  useEffect(() => {
    async function autoLogin() {
      const existing = sessionStorage.getItem('lucius_token');
      if (existing) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/v1/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@riversidedental.example.com',
            password: 'Lucius2024!'
          })
        });
        const data = await res.json();
        if (data?.data?.access_token) {
          sessionStorage.setItem('lucius_token', data.data.access_token);
          window.location.reload();
        }
      } catch {}
    }
    autoLogin();
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardShell />}>
          <Route index element={<CommandCenter />} />
          <Route path="command"  element={<CommandCenter />} />
          <Route path="alerts"   element={<AlertFeed />} />
          <Route path="assets"   element={<AssetMap />} />
          <Route path="topology" element={<Topology />} />
          <Route path="intel"    element={<ThreatIntel />} />
          <Route path="proxy"    element={<LuciusProxy />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
