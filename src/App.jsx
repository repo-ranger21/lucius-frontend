import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login.jsx';
import DashboardShell from './components/DashboardShell.jsx';
import CommandCenter from './modules/command/CommandCenter.jsx';
import AlertFeed from './modules/alerts/AlertFeed.jsx';
import AssetMap from './modules/assets/AssetMap.jsx';
import Topology from './modules/topology/Topology.jsx';
import ThreatIntel from './modules/intel/ThreatIntel.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<DashboardShell />}>
          <Route index element={<Navigate to="/command" replace />} />
          <Route path="command"  element={<CommandCenter />} />
          <Route path="alerts"   element={<AlertFeed />} />
          <Route path="assets"   element={<AssetMap />} />
          <Route path="topology" element={<Topology />} />
          <Route path="intel"    element={<ThreatIntel />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
