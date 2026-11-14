import { Eye, Play, Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import StreamStatusBadge from './StreamStatusBadge';

export default function StreamCard({ stream }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-800 bg-slate-900 transition hover:border-slate-700">
      <div className="relative aspect-video bg-slate-950">
        {stream.thumbnailUrl ? (
          <img
            src={stream.thumbnailUrl}
            alt={stream.title}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-900 text-slate-700">
            <Radio className="h-12 w-12" />
          </div>
        )}
        <div className="absolute left-3 top-3">
          <StreamStatusBadge status={stream.status} />
        </div>
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-md bg-black/75 px-2.5 py-1 text-xs font-medium text-slate-100 backdrop-blur-sm">
          <Eye className="h-3.5 w-3.5 text-slate-300" />
          <span>{stream.viewerCount ?? 0}</span>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="line-clamp-1 text-base font-semibold text-white">
            {stream.title}
          </h3>
          {stream.description && (
            <p className="mt-1 line-clamp-2 text-sm text-slate-400">
              {stream.description}
            </p>
          )}
        </div>

        <div className="mt-4">
          <Link
            to={`/watch/${encodeURIComponent(stream.streamId)}`}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            <Play className="h-4 w-4 fill-current" />
            Watch Live
          </Link>
        </div>
      </div>
    </div>
  );
}
