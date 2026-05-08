import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { api } from './api/client.js';
import DashboardShell from './components/DashboardShell.jsx';
import Login from './components/Login.jsx';
import CommandCenter from './modules/command/CommandCenter.jsx';
import AlertFeed from './modules/alerts/AlertFeed.jsx';
import AssetMap from './modules/assets/AssetMap.jsx';
import Topology from './modules/topology/Topology.jsx';
import ThreatIntel from './modules/intel/ThreatIntel.jsx';
import LuciusProxy from './modules/proxy/LuciusProxy.jsx';

export default function App() {
  const [authed, setAuthed] = useState(!!sessionStorage.getItem('lucius_token'));

  useEffect(() => {
    if (authed) return;
    api.login('admin@riversidedental.example.com', 'Lucius2024!')
      .then(data => {
        if (data?.data?.access_token) {
          sessionStorage.setItem('lucius_token', data.data.access_token);
          setAuthed(true);
        }
      })
      .catch(() => {});
  }, [authed]);

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
