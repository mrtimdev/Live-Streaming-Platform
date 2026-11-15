import StreamCountdown from '../../components/stream/StreamCountdown';
import { ArrowLeft, Clock, Eye, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import CopyButton from '../../components/common/CopyButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StreamStatusBadge from '../../components/stream/StreamStatusBadge';
import HlsPlayer from '../../components/video/HlsPlayer';
import { useStreamStatus } from '../../hooks/useStreamStatus';
import { useViewerHeartbeat } from '../../hooks/useViewerHeartbeat';
import { formatDateTime, formatDuration, getLiveDurationSeconds } from '../../utils/formatters';
import StreamNotFound from './StreamNotFound';

export default function WatchStream() {
  const { streamId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { stream, loading, notFound, error } = useStreamStatus(streamId, 5000);
  const isLive = stream?.status === 'LIVE';
  const heartbeatViewers = useViewerHeartbeat(stream?.streamId, isLive);
  const [liveDuration, setLiveDuration] = useState(0);

  useEffect(() => {
    if (!isLive || !stream?.startedAt) {
      setLiveDuration(0);
      return undefined;
    }
    setLiveDuration(getLiveDurationSeconds(stream.startedAt));
    const timer = setInterval(() => {
      setLiveDuration(getLiveDurationSeconds(stream.startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [isLive, stream?.startedAt]);

  if (loading) {
    return <LoadingSpinner label="Loading stream..." />;
  }

  if (notFound) {
    return <StreamNotFound />;
  }

  if (error || !stream) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">
        {error || 'Unable to load stream'}
      </div>
    );
  }

  const viewerCount = heartbeatViewers ?? stream.viewerCount ?? 0;
  const cameraId = searchParams.get('camera');
  const cameras = stream.views?.cameras ?? [];
  const selectedCamera = cameras.find((camera) => camera.id === cameraId);
  const hlsUrl = selectedCamera?.live ? selectedCamera.hlsUrl : stream.hlsUrl;

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 transition hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Live Broadcasts
      </Link>

      {cameras.length > 0 && (
        <div role="group" aria-label="Choose a camera" className="flex flex-wrap gap-2">
          {[{ id: null, label: 'Director’s view', live: isLive }, ...cameras].map((camera) => {
            const selected = (selectedCamera?.id ?? null) === camera.id;
            return (
              <button key={camera.id ?? 'director'} type="button" aria-pressed={selected}
                onClick={() => setSearchParams((current) => {
                  const next = new URLSearchParams(current);
                  if (camera.id) next.set('camera', camera.id);
                  else next.delete('camera');
                  return next;
                }, { replace: true })}
                className={`rounded-lg border px-3 py-2 text-sm ${selected
                  ? 'border-indigo-500 bg-indigo-600 text-white'
                  : 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800'}`}>
                {camera.label}{camera.id && !camera.live ? ' (offline)' : ''}
              </button>
            );
          })}
        </div>
      )}

      {isLive && selectedCamera && !selectedCamera.live && (
        <p role="status" className="text-sm text-slate-300">
          {selectedCamera.label} is offline. Playing the director’s view until it returns.
        </p>
      )}

      <StreamCountdown scheduledStartAt={stream.scheduledStartAt} isLive={isLive} />

      {isLive ? (
        <HlsPlayer key={hlsUrl} src={hlsUrl} title={selectedCamera?.live ? selectedCamera.label : stream.title} />
      ) : (
        <div className="flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900 p-8 text-center">
          <div className="rounded-full bg-slate-800 p-4 text-slate-400">
            <Radio className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-semibold text-white">This stream is currently offline</h2>
          <p className="mt-1.5 max-w-md text-sm text-slate-400">
            Waiting for the broadcaster to start streaming. This page will automatically start playback when the broadcast goes live.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <StreamStatusBadge status={stream.status} />
              <span className="font-mono text-xs text-slate-500">{stream.streamId}</span>
            </div>
            <h1 className="mt-2.5 text-2xl font-bold text-white">{stream.title}</h1>
            <div className="mt-3"><CopyButton value={window.location.href} label="Copy watch link" /></div>
            {stream.description && (
              <p className="mt-2 whitespace-pre-line text-sm text-slate-300">
                {stream.description}
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm">
              <Eye className="h-4 w-4 text-indigo-400" />
              <span className="font-semibold text-white">{viewerCount}</span>
              <span className="text-slate-400">watching</span>
            </div>

            {isLive && (
              <>
                {stream.startedAt && (
                  <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm">
                    <span className="text-slate-400">Live started</span>
                    <span className="text-slate-200">{formatDateTime(stream.startedAt)}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2 text-sm">
                  <Clock className="h-4 w-4 text-emerald-400" />
                  <span className="font-mono text-slate-200">{formatDuration(liveDuration)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
