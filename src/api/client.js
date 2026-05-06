const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'lucius_token';

function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

async function parseBody(response) {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  if (response.status === 401) {
    sessionStorage.clear();
    window.location.reload();
    throw new Error('HTTP 401');
  }

  const body = await parseBody(response);

  if (!response.ok) {
    throw new Error(body?.error || `HTTP ${response.status}`);
  }

  return body;
}

export const api = {
  login(email, password) {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  logout() {
    return request('/api/v1/auth/logout', {
      method: 'POST',
    });
  },

  getRiskScore() {
    return request('/api/v1/risk-score');
  },

  getAlerts(page = 1, sev = 'all') {
    return request(`/api/v1/alerts?page=${page}&severity=${encodeURIComponent(sev)}`);
  },

  resolveAlert(id) {
    return request(`/api/v1/alerts/${id}/resolve`, {
      method: 'POST',
    });
  },

  getAssets() {
    return request('/api/v1/assets');
  },

  triggerScan() {
    return request('/api/v1/scan/trigger', {
      method: 'POST',
    });
  },

  getScanStatus() {
    return request('/api/v1/scan/status');
  },

  getThreats() {
    return request('/api/v1/threats/feed');
  },

  getWeeklyDigest() {
    return request('/api/v1/digest/weekly');
  },
};
