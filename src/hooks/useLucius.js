import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

function toInteger(value) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatFailure(label, reason) {
  const message = reason instanceof Error ? reason.message : String(reason);
  return `${label} failed: ${message}`;
}

export function useLucius() {
  const [riskScore, setRiskScore] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      api.getRiskScore(),
      api.getAlerts(),
      api.getAssets(),
    ]);

    const [riskResult, alertsResult, assetsResult] = results;
    const failures = [];

    if (riskResult.status === 'fulfilled') {
      setRiskScore(toInteger(riskResult.value?.data?.score));
    } else {
      setRiskScore(0);
      failures.push(formatFailure('getRiskScore', riskResult.reason));
    }

    if (alertsResult.status === 'fulfilled') {
      setAlerts(Array.isArray(alertsResult.value?.data?.alerts) ? alertsResult.value.data.alerts : []);
    } else {
      setAlerts([]);
      failures.push(formatFailure('getAlerts', alertsResult.reason));
    }

    if (assetsResult.status === 'fulfilled') {
      setAssets(Array.isArray(assetsResult.value?.data?.assets) ? assetsResult.value.data.assets : []);
    } else {
      setAssets([]);
      failures.push(formatFailure('getAssets', assetsResult.reason));
    }

    setError(failures.length > 0 ? failures.join(' | ') : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const resolveAlert = useCallback(async (id) => {
    await api.resolveAlert(id);
    setAlerts((currentAlerts) => currentAlerts.map((alert) => (
      alert.id === id ? { ...alert, resolved: true } : alert
    )));
  }, []);

  return {
    riskScore,
    alerts,
    assets,
    loading,
    error,
    resolveAlert,
    refresh,
  };
}