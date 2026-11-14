import { Radio, RefreshCw } from 'lucide-react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StreamCard from '../../components/stream/StreamCard';
import { usePublicStreams } from '../../hooks/useStreams';

export default function LiveHome() {
  const { streams, loading, error, refresh } = usePublicStreams(5000);

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Live Broadcasts
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Watch active public live streams in real time.
          </p>
        </div>
        <button
          type="button"
          onClick={refresh}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-slate-800 bg-slate-900 px-3.5 py-2 text-xs font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Checking active broadcasts..." />
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">
          {error}
        </div>
      ) : streams.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-16 text-center">
          <div className="rounded-full bg-slate-800 p-4 text-slate-400">
            <Radio className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-white">No streams are live right now</h2>
          <p className="mt-1 max-w-md text-sm text-slate-400">
            Live broadcasts will appear here automatically as soon as a broadcaster starts streaming.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {streams.map((stream) => (
            <StreamCard key={stream.id} stream={stream} />
          ))}
        </div>
      )}
    </div>
  );
}
