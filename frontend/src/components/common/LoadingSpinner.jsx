import { Loader2 } from 'lucide-react';

export default function LoadingSpinner({ label = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Loader2 className="h-7 w-7 animate-spin text-indigo-400" />
      {label && <p className="mt-3 text-sm">{label}</p>}
    </div>
  );
}
