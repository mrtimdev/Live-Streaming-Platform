export default function StreamStatusBadge({ status }) {
  const isLive = status === 'LIVE';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-wide ${
        isLive
          ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/30'
          : 'bg-slate-800 text-slate-400 ring-1 ring-slate-700'
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isLive ? 'animate-pulse bg-red-500' : 'bg-slate-500'
        }`}
      />
      {isLive ? 'LIVE' : 'OFFLINE'}
    </span>
  );
}
