import { Activity, Lock, MonitorPlay, Radio, Unlock, Unplug } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { streamApi } from '../../api/streamApi';
import ConfirmModal from '../common/ConfirmModal';
import HlsPlayer from '../video/HlsPlayer';

function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

function formatBitrate(bps) {
  if (!bps || bps <= 0) return '0 kbps';
  if (bps >= 1_000_000) return `${(bps / 1_000_000).toFixed(2)} Mbps`;
  return `${Math.round(bps / 1000)} kbps`;
}

function formatSourceType(type) {
  if (!type) return 'None';
  if (type === 'webRTCSession') return 'Browser (WebRTC)';
  if (type === 'rtmpConn') return 'OBS / RTMP';
  return type;
}

export default function StreamControlPanel({ stream }) {
  const [health, setHealth] = useState(null);
  const [bitrateBps, setBitrateBps] = useState(0);
  const [showMonitor, setShowMonitor] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const prevSample = useRef(null);

  const loadHealth = useCallback(async () => {
    try {
      const data = await streamApi.getStreamHealth(stream.streamId);
      setHealth(data);
      const now = Date.now();
      const bytes = data.mainFeed?.bytesReceived ?? 0;
      if (data.mainFeed?.ready && prevSample.current && bytes >= prevSample.current.bytes) {
        const dt = (now - prevSample.current.time) / 1000;
        if (dt > 0.2) {
          setBitrateBps(((bytes - prevSample.current.bytes) * 8) / dt);
        }
      } else if (!data.mainFeed?.ready) {
        setBitrateBps(0);
      }
      prevSample.current = data.mainFeed?.ready ? { bytes, time: now } : null;
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to load stream health');
    }
  }, [stream.streamId]);

  useEffect(() => {
    loadHealth();
    const timer = setInterval(loadHealth, 3000);
    return () => clearInterval(timer);
  }, [loadHealth]);

  const handleToggleLock = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const nextLocked = !health?.locked;
      await streamApi.setStreamLock(stream.streamId, nextLocked);
      await loadHealth();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update publish lock');
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnect = async () => {
    setBusy(true);
    setError('');
    try {
      await streamApi.disconnectPublisher(stream.streamId, health?.mainFeed?.sourceId);
      setConfirmDisconnect(false);
      await loadHealth();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disconnect publisher');
      setConfirmDisconnect(false);
    } finally {
      setBusy(false);
    }
  };

  const mainFeed = health?.mainFeed;
  const isLive = stream.status === 'LIVE' || Boolean(mainFeed?.ready);

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-white">Operator Controls & Stream Health</h2>
          <p className="text-sm text-slate-400">Monitor ingest telemetry, lock publishing, or disconnect an active feed.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !health}
            onClick={handleToggleLock}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition disabled:opacity-50 ${
              health?.locked
                ? 'border-amber-500/40 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                : 'border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700'
            }`}
          >
            {health?.locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {health?.locked ? 'Unlock Publishing' : 'Lock Publishing'}
          </button>

          <button
            type="button"
            disabled={busy || !mainFeed?.ready}
            onClick={() => setConfirmDisconnect(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 hover:bg-red-500/20 disabled:opacity-40"
          >
            <Unplug className="h-3.5 w-3.5" />
            Force Disconnect
          </button>

          <button
            type="button"
            onClick={() => setShowMonitor((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-500/30 bg-indigo-500/15 px-3 py-2 text-xs font-medium text-indigo-300 hover:bg-indigo-500/25"
          >
            <MonitorPlay className="h-3.5 w-3.5" />
            {showMonitor ? 'Hide Live Monitor' : 'Show Live Monitor'}
          </button>
        </div>
      </div>

      {health?.locked && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-300">
          Publishing is locked. New OBS or browser connections will be rejected until unlocked.
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-red-300">{error}</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ingest Source</span>
            <Radio className={`h-3.5 w-3.5 ${mainFeed?.ready ? 'text-emerald-400' : 'text-slate-500'}`} />
          </div>
          <p className="mt-1.5 text-sm font-semibold text-white">
            {mainFeed?.ready ? formatSourceType(mainFeed.sourceType) : 'Offline'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Ingest Bitrate</span>
            <Activity className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-white">
            {mainFeed?.ready ? formatBitrate(bitrateBps) : '0 kbps'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
          <div className="text-xs text-slate-400">Active Codecs</div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-white">
            {mainFeed?.tracks?.length ? mainFeed.tracks.join(' + ') : '—'}
          </p>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3.5">
          <div className="text-xs text-slate-400">Data Received / Readers</div>
          <p className="mt-1.5 font-mono text-sm font-semibold text-white">
            {mainFeed ? `${formatBytes(mainFeed.bytesReceived)} · ${mainFeed.readerCount}` : '0 B · 0'}
          </p>
        </div>
      </div>

      {showMonitor && (
        <div className="pt-2">
          {isLive ? (
            <div className="max-w-2xl">
              <HlsPlayer src={stream.hlsUrl} title={`${stream.title} (Admin Monitor)`} />
            </div>
          ) : (
            <p className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm text-slate-400">
              Stream is currently offline. The live monitor will play automatically once a feed starts.
            </p>
          )}
        </div>
      )}

      <ConfirmModal
        open={confirmDisconnect}
        title="Force Disconnect Publisher"
        message="This will immediately terminate the active main feed connection (OBS or browser). Continue?"
        confirmLabel="Disconnect"
        danger
        loading={busy}
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </section>
  );
}
