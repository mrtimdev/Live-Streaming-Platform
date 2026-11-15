import { useEffect, useState } from 'react';

export default function AudioMeter({ stream, muted }) {
  const [level, setLevel] = useState(0);
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!stream?.getAudioTracks().length) return undefined;
    let context;
    let source;
    let timer;
    let cancelled = false;
    setUnavailable(false);
    try {
      context = new AudioContext();
      const analyser = context.createAnalyser();
      analyser.fftSize = 512;
      source = context.createMediaStreamSource(stream);
      source.connect(analyser); // Never connect the microphone to speakers.
      const samples = new Float32Array(analyser.fftSize);
      context.resume().catch(() => { if (!cancelled) setUnavailable(true); });
      timer = setInterval(() => {
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(samples.reduce((sum, n) => sum + n * n, 0) / samples.length);
        setLevel(Math.min(100, Math.max(0, (20 * Math.log10(Math.max(rms, 0.001)) + 60) / 60 * 100)));
      }, 100);
    } catch {
      setUnavailable(true);
    }
    return () => {
      cancelled = true;
      clearInterval(timer);
      source?.disconnect();
      context?.close().catch(() => {});
    };
  }, [stream]);
  return (
    <div className="space-y-1 text-sm text-slate-300">
      <label htmlFor="mic-level">Microphone level {muted ? '(muted)' : ''}</label>
      {unavailable ? <p>Audio meter unavailable. Microphone capture may still work.</p> : (
        <meter id="mic-level" aria-label="Microphone level" min="0" max="100" value={muted ? 0 : level} className="block h-4 w-full max-w-lg" />
      )}
    </div>
  );
}
