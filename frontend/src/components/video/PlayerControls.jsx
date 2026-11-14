import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react';

export default function PlayerControls({
  playing,
  muted,
  volume,
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

      <button
        type="button"
        onClick={onFullscreen}
        className="rounded-lg p-1.5 transition hover:bg-white/15"
        aria-label="Fullscreen"
      >
        <Maximize className="h-5 w-5" />
      </button>
    </div>
  );
}
