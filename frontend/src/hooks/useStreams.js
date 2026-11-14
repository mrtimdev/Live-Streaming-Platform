import { useCallback, useEffect, useState } from 'react';
import { streamApi } from '../api/streamApi';

export function usePublicStreams(pollIntervalMs = 5000) {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStreams = useCallback(async () => {
    try {
      const data = await streamApi.listPublicLive();
      setStreams(data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load live streams');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
    if (pollIntervalMs > 0) {
      const timer = setInterval(fetchStreams, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchStreams, pollIntervalMs]);

  return { streams, loading, error, refresh: fetchStreams };
}
