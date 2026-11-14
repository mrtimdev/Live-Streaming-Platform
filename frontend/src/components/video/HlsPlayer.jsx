import Hls from 'hls.js';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import PlayerControls from './PlayerControls';

export default function HlsPlayer({ src, title }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return undefined;

    setLoading(true);
    setError(null);

    let hls = null;
    let networkRetries = 0;

    const handleCanPlay = () => {
      setLoading(false);
      setError(null);
    };
    const handlePlaying = () => {
      setPlaying(true);
      setLoading(false);
    };
    const handlePause = () => setPlaying(false);
    const handleWaiting = () => setLoading(true);

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);

    const attemptAutoPlay = () => {
      video.play().catch(() => {
        // Browser blocked unmuted autoplay; fall back to muted autoplay
        video.muted = true;
        setMuted(true);
        video.play().catch(() => {});
      });
    };

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      const onNativeError = () => {
        setLoading(false);
        setError('Unable to load the live video stream.');
      };
      video.addEventListener('error', onNativeError);
      attemptAutoPlay();

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        video.removeEventListener('error', onNativeError);
        video.removeAttribute('src');
        video.load();
      };
    }

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
      });
      hlsRef.current = hls;

      hls.loadSource(src);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        attemptAutoPlay();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < 3) {
          networkRetries += 1;
          setLoading(true);
          hls.startLoad();
          return;
        }

        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
          return;
        }

        setLoading(false);
        setError('Stream playback is currently unavailable. Please retry.');
        hls.destroy();
      });

      return () => {
        video.removeEventListener('canplay', handleCanPlay);
        video.removeEventListener('playing', handlePlaying);
        video.removeEventListener('pause', handlePause);
        video.removeEventListener('waiting', handleWaiting);
        hls.destroy();
        hlsRef.current = null;
      };
    }

    setLoading(false);
    setError('Your browser does not support HLS video playback.');
    return undefined;
  }, [src, retryToken]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
  };

  const handleVolumeChange = (val) => {
    const video = videoRef.current;
    if (!video) return;
    video.volume = val;
    video.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  };

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else if (el.requestFullscreen) {
      el.requestFullscreen().catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative aspect-video w-full overflow-hidden rounded-xl border border-slate-800 bg-black"
    >
      <video
        ref={videoRef}
        className="h-full w-full object-contain"
        playsInline
        aria-label={title || 'Live stream player'}
        onClick={togglePlay}
      />

      {loading && !error && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-slate-200">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
          <p className="mt-2 text-xs font-medium">Connecting to live stream...</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-6 text-center">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="mt-3 text-sm font-medium text-slate-200">{error}</p>
          <button
            type="button"
            onClick={() => setRetryToken((t) => t + 1)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500"
          >
            <RefreshCw className="h-4 w-4" />
            Retry Playback
          </button>
        </div>
      )}

      {!error && (
        <div className="absolute inset-x-0 bottom-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
          <PlayerControls
            playing={playing}
            muted={muted}
            volume={volume}
            onTogglePlay={togglePlay}
            onToggleMute={toggleMute}
            onVolumeChange={handleVolumeChange}
            onFullscreen={handleFullscreen}
          />
        </div>
      )}
    </div>
  );
}
