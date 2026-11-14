import { useCallback, useEffect, useState } from 'react';
import { streamApi } from '../api/streamApi';

export function useStreamStatus(streamId, pollIntervalMs = 5000) {
  const [stream, setStream] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState(null);

  const fetchStatus = useCallback(async () => {
    if (!streamId) return;
    try {
      const data = await streamApi.getPublicStream(streamId);
      setStream(data);
      setNotFound(false);
      setError(null);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(err.response?.data?.message || 'Failed to load stream');
      }
    } finally {
      setLoading(false);
    }
  }, [streamId]);

  useEffect(() => {
    fetchStatus();
    if (pollIntervalMs > 0) {
      const timer = setInterval(fetchStatus, pollIntervalMs);
      return () => clearInterval(timer);
    }
  }, [fetchStatus, pollIntervalMs]);

  return { stream, setStream, loading, notFound, error, refresh: fetchStatus };
}
