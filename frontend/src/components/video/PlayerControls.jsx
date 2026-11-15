import { Maximize, Pause, Play, Scan, Volume2, VolumeX } from 'lucide-react';
import { AI_MODES } from '../../utils/cocoClasses';

export default function PlayerControls({
  playing,
  muted,
  volume,
  aiMode,
  onChangeAiMode,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onFullscreen,
}) {
  return (
    <div className="flex items-center justify-between gap-4 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-4 py-3 text-white">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onTogglePlay}
          className="rounded-lg p-1.5 transition hover:bg-white/15"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current" />}
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleMute}
            className="rounded-lg p-1.5 transition hover:bg-white/15"
            aria-label={muted ? 'Unmute' : 'Mute'}
          >
            {muted || volume === 0 ? (
              <VolumeX className="h-5 w-5" />
            ) : (
              <Volume2 className="h-5 w-5" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            className="h-1 w-20 cursor-pointer accent-indigo-500"
            aria-label="Volume"
          />
        </div>

        <span className="inline-flex items-center gap-1.5 rounded bg-red-600/90 px-2 py-0.5 text-[11px] font-bold tracking-wider">
          <span className="h-1.5 w-1.5 rounded-full bg-white" />
          LIVE
        </span>
      </div>

      <div className="flex items-center gap-2">
        {onChangeAiMode && (
          <label className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium transition ${
            aiMode && aiMode !== 'off'
              ? 'bg-indigo-600 text-white'
              : 'bg-white/10 text-slate-200 hover:bg-white/20'
          }`}>
            <Scan className="h-3.5 w-3.5 shrink-0" />
            <select
              value={aiMode || 'off'}
              onChange={(e) => onChangeAiMode(e.target.value)}
              aria-label="YOLO11 AI mode"
              className="cursor-pointer bg-transparent text-xs font-medium text-white focus:outline-none"
            >
              {AI_MODES.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        )}

        <button
          type="button"
          onClick={onFullscreen}
          className="rounded-lg p-1.5 transition hover:bg-white/15"
          aria-label="Fullscreen"
        >
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
