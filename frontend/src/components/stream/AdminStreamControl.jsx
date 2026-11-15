import { useEffect, useState } from 'react';
import api from '../../api/axios';
import HlsPlayer from '../video/HlsPlayer';
import ConfirmModal from '../common/ConfirmModal';
import { incomingBitrate } from './streamHealth';

export default function AdminStreamControl({ streamId }) {
  const [health, setHealth] = useState(null);
  const [views, setViews] = useState(null);
  const [error, setError] = useState('');
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer;
    let previous;
    const refresh = async () => {
      try {
        const [healthResult, viewsResult] = await Promise.all([
          api.get(`/streams/${encodeURIComponent(streamId)}/control/health`),
          api.get(`/streams/${encodeURIComponent(streamId)}/views`),
        ]);
        if (cancelled) return;
        const current = { ...healthResult.data.data, sampledAt: performance.now() };
        current.feeds = current.feeds.map((feed) => ({ ...feed,
          bitrate: incomingBitrate(previous?.feeds.find((old) => old.path === feed.path), feed, current.sampledAt - (previous?.sampledAt ?? current.sampledAt)),
        }));
        previous = current;
        setHealth(current);
        setViews(viewsResult.data.data);
        setError('');
      } catch {
        if (!cancelled) { setError('Stream health unavailable. Controls are disabled until the next successful update.'); setHealth(null); previous = null; }
      } finally {
        if (!cancelled) timer = setTimeout(refresh, 3000);
      }
    };
    refresh();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [streamId]);

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.post(`/streams/${encodeURIComponent(streamId)}/control/disconnect`, { cameraId: target.cameraId, sourceId: target.sourceId });
      setTarget(null);
      setHealth(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not disconnect publisher. Refresh and try again.');
      setTarget(null);
    } finally { setBusy(false); }
  };
  const feeds = views ? [views.program, ...views.cameras] : [];
  const director = views?.cameras.find((camera) => camera.id === views.directorCameraId && camera.live)
    || (views?.program.live ? views.program : views?.cameras.find((camera) => camera.live));
  const label = (feed) => feeds.find((item) => item.id === feed.cameraId)?.label || (feed.cameraId ?? 'Main feed');

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-base font-semibold text-white">Live preview & stream health</h2>
      <button type="button" onClick={() => setPreview((value) => !value)} className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-white">
        {preview ? 'Hide admin preview' : 'Show admin preview'}
      </button>
      {preview && (director?.live ? <HlsPlayer key={director.hlsUrl} src={director.hlsUrl} title="Director preview" defaultMuted /> : <p className="text-sm text-slate-400">No active feed to preview.</p>)}
      <p className="text-xs text-slate-400">Preview follows the director’s view and starts muted. HLS playback has a short delay. Bitrate is estimated from received bytes; FPS and resolution are not supplied by this server API.</p>
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      {health && health.feeds.length === 0 && <p className="text-sm text-slate-400">No publishers connected.</p>}
      {health?.feeds.map((feed) => (
        <div key={feed.path} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-700 p-3">
          <div className="space-y-1 text-sm text-slate-300">
            <p className="font-semibold text-white">{label(feed)} · {feed.ready ? 'Live' : 'Offline'}</p>
            <p>{feed.tracks.join(' / ') || 'Codecs unavailable'} · {feed.sourceType || 'No publisher'}</p>
            <p>Incoming: {feed.bitrate == null ? 'Sampling…' : `${feed.bitrate.toFixed(2)} Mbps`} · Received: {(feed.bytesReceived / 1_000_000).toFixed(1)} MB · Media connections: {feed.readerCount}</p>
            {feed.readyTime && <p>Started: {new Date(feed.readyTime).toLocaleString()}</p>}
          </div>
          <button type="button" disabled={!feed.ready || !feed.sourceId || busy} onClick={() => setTarget(feed)} className="rounded-lg border border-red-500/40 px-3 py-2 text-sm text-red-300 disabled:opacity-50">Disconnect publisher</button>
        </div>
      ))}
      <p className="text-xs text-slate-400">Disconnect ends the selected connection. OBS may reconnect automatically; it does not revoke the publishing key.</p>
      <ConfirmModal open={Boolean(target)} title="Disconnect publisher?" message={`Stop ${target ? label(target) : 'this feed'} now? Viewers may switch to another live feed. The publisher can reconnect.`}
        confirmLabel="Disconnect" danger loading={busy} onConfirm={disconnect} onCancel={() => { if (!busy) setTarget(null); }} />
    </section>
  );
}
