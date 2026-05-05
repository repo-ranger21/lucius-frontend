const BASE = import.meta.env.VITE_API_URL ?? '';
const API_KEY = import.meta.env.VITE_INTERNAL_API_KEY ?? '';

function getToken() {
  return localStorage.getItem('lucius_token');
}

function headers(authenticated = true) {
  const h = {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  };
  if (authenticated) {
    const token = getToken();
    if (token) h['Authorization'] = `Bearer ${token}`;
  }
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { ...headers(options.authenticated !== false), ...options.headers },
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? 'Request failed');
  return json.data;
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await request('/api/v1/auth/login', {
    method: 'POST',
    authenticated: false,
    body: JSON.stringify({ email, password }),
  });
  localStorage.setItem('lucius_token', data.access_token);
  return data;
}

export async function logout() {
  await request('/api/v1/auth/logout', { method: 'POST' });
  localStorage.removeItem('lucius_token');
}

// ── Risk ──────────────────────────────────────────────────────────────────────

export async function getRiskScore() {
  return request('/api/v1/risk-score');
}

// ── Alerts ────────────────────────────────────────────────────────────────────

export async function getAlerts(page = 1, severity = 'all') {
  return request(`/api/v1/alerts?page=${page}&severity=${severity}`);
}

export async function resolveAlert(alertId) {
  return request(`/api/v1/alerts/${alertId}/resolve`, { method: 'POST' });
}

// ── Assets ────────────────────────────────────────────────────────────────────

export async function getAssets() {
  return request('/api/v1/assets');
}

// ── Scan ──────────────────────────────────────────────────────────────────────

export async function triggerScan(assetIds = null) {
  return request('/api/v1/scan/trigger', {
    method: 'POST',
    body: JSON.stringify({ asset_ids: assetIds }),
  });
}

export async function getScanStatus() {
  return request('/api/v1/scan/status');
}

// ── Threats ───────────────────────────────────────────────────────────────────

export async function getThreatsFeed() {
  return request('/api/v1/threats/feed');
}

// ── Digest ────────────────────────────────────────────────────────────────────

export async function getWeeklyDigest() {
  return request('/api/v1/digest/weekly');
}
