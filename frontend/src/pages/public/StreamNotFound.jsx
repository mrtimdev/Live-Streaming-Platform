import { ArrowLeft, Tv } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StreamNotFound() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-slate-800 bg-slate-900/50 px-6 py-20 text-center">
      <div className="rounded-full bg-slate-800 p-4 text-slate-400">
        <Tv className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-white">Stream Not Found</h1>
      <p className="mt-2 max-w-md text-sm text-slate-400">
        The stream you are looking for does not exist or has been removed.
      </p>
      <Link
        to="/"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Browse Live Streams
      </Link>
    </div>
  );
}
