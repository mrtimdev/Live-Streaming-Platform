import { useEffect, useState } from 'react';
import { viewerApi } from '../api/viewerApi';
import { getOrCreateViewerSessionId } from '../utils/formatters';

export function useViewerHeartbeat(streamId, isLive) {
  const [activeViewers, setActiveViewers] = useState(null);

  useEffect(() => {
    if (!streamId || !isLive) {
      return undefined;
    }

    const sessionId = getOrCreateViewerSessionId();
    let cancelled = false;

    const send = async () => {
      try {
        const res = await viewerApi.sendHeartbeat(streamId, sessionId);
        if (!cancelled && res?.activeViewers != null) {
          setActiveViewers(res.activeViewers);
        }
      } catch {
        // ignore transient network errors
      }
    };

    send();
    const interval = setInterval(send, 15000);

    const handleUnload = () => {
      if (navigator.sendBeacon) {
        const url = `/api/public/streams/${encodeURIComponent(streamId)}/heartbeat?sessionId=${encodeURIComponent(sessionId)}`;
        // sendBeacon sends POST, so we also rely on 45s Redis TTL if page closes abruptly
        navigator.sendBeacon(url);
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('beforeunload', handleUnload);
      viewerApi.disconnect(streamId, sessionId).catch(() => {});
    };
  }, [streamId, isLive]);

  return activeViewers;
}
