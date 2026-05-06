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
