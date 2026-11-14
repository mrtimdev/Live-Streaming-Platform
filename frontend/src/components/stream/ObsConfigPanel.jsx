import { Eye, EyeOff, ShieldAlert } from 'lucide-react';
import { useState } from 'react';
import CopyButton from '../common/CopyButton';

export default function ObsConfigPanel({ credentials }) {
  const [revealKey, setRevealKey] = useState(false);

  if (!credentials) return null;

  const { stream, publishingPath, obsServerUrl, obsStreamKey } = credentials;
  const streamId = publishingPath ?? stream.streamId;
  const maskedKey = obsStreamKey ? `${streamId}?user=publisher&pass=••••••••••••••••` : '';

  return (
    <div className="rounded-xl border border-amber-500/30 bg-slate-900 p-6">
      <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3.5 text-sm text-amber-200">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="font-semibold">Save your OBS Stream Key now</p>
          <p className="mt-0.5 text-xs text-amber-200/80">
            For security, the publishing secret is only displayed once. If you lose it, you can regenerate a new key from the stream details page.
          </p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Stream ID
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="font-mono text-sm text-slate-200">{streamId}</code>
            <CopyButton value={streamId} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            OBS Server URL
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="truncate font-mono text-sm text-slate-200">{obsServerUrl}</code>
            <CopyButton value={obsServerUrl} />
          </div>
        </div>

        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            OBS Stream Key
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="truncate font-mono text-sm text-emerald-300">
              {revealKey ? obsStreamKey : maskedKey}
            </code>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={() => setRevealKey((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                {revealKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {revealKey ? 'Hide' : 'Reveal'}
              </button>
              <CopyButton value={obsStreamKey} />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-slate-800 pt-5">
        <h4 className="text-sm font-semibold text-white">OBS Studio Setup Instructions</h4>
        <ol className="mt-2.5 list-inside list-decimal space-y-1.5 text-sm text-slate-300">
          <li>Open OBS Studio and go to <strong>Settings → Stream</strong>.</li>
          <li>Select <strong>Custom...</strong> as the Service.</li>
          <li>Paste the <strong>OBS Server URL</strong> into the Server field.</li>
          <li>Paste the <strong>OBS Stream Key</strong> into the Stream Key field.</li>
          <li>Click <strong>Apply / OK</strong>, then click <strong>Start Streaming</strong>.</li>
        </ol>
      </div>
    </div>
  );
}
