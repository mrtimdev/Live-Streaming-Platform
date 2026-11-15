import { useEffect, useState } from 'react';
import { countdown } from './schedule';

export default function StreamCountdown({ scheduledStartAt, isLive = false }) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!scheduledStartAt || isLive) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [scheduledStartAt, isLive]);
  const remaining = countdown(scheduledStartAt, now);
  if (!remaining) return null;
  return (
    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4 text-center">
      <p className="text-sm text-slate-300">Scheduled start</p>
      <time dateTime={scheduledStartAt} className="mt-1 block text-base font-semibold text-white">
        {new Date(scheduledStartAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'long' })}
      </time>
      {!isLive && (remaining.seconds > 0 ? <p className="mt-2 font-mono text-2xl font-bold text-indigo-300" aria-label={`Starts in ${remaining.text}`}>{remaining.text}</p>
        : <p className="mt-2 text-sm text-indigo-200">Scheduled time reached. Waiting for the broadcaster to go live.</p>)}
    </div>
  );
}
