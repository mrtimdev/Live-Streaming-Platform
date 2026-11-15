import { useEffect, useRef, useState } from 'react';
import { AI_MODES, POSE_SKELETON } from '../utils/cocoClasses';

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ec4899',
  '#06b6d4', '#8b5cf6', '#f97316', '#22c55e',
];

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function iou(a, b) {
  const x1 = Math.max(a.x1, b.x1);
  const y1 = Math.max(a.y1, b.y1);
  const x2 = Math.min(a.x2, b.x2);
  const y2 = Math.min(a.y2, b.y2);
  const inter = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
  if (inter === 0) return 0;
  return inter / ((a.x2 - a.x1) * (a.y2 - a.y1) + (b.x2 - b.x1) * (b.y2 - b.y1) - inter);
}

function updateTracks(tracker, detections) {
  const matched = new Set();
  const nextTracks = [];

  for (const det of detections) {
    let bestIdx = -1;
    let bestIou = 0.25;
    for (let i = 0; i < tracker.tracks.length; i += 1) {
      if (matched.has(i)) continue;
      const tr = tracker.tracks[i];
      if (tr.classId !== det.classId) continue;
      const score = iou(tr, det);
      if (score > bestIou) {
        bestIou = score;
        bestIdx = i;
      }
    }
    const cx = (det.x1 + det.x2) / 2;
    const cy = (det.y1 + det.y2) / 2;
    if (bestIdx >= 0) {
      matched.add(bestIdx);
      const prev = tracker.tracks[bestIdx];
      const trail = [...prev.trail, { x: cx, y: cy }].slice(-18);
      nextTracks.push({ ...det, trackId: prev.trackId, trail, missed: 0 });
    } else {
      const trackId = tracker.nextId++;
      nextTracks.push({ ...det, trackId, trail: [{ x: cx, y: cy }], missed: 0 });
    }
  }

  for (let i = 0; i < tracker.tracks.length; i += 1) {
    if (!matched.has(i) && tracker.tracks[i].missed < 4) {
      nextTracks.push({ ...tracker.tracks[i], missed: tracker.tracks[i].missed + 1 });
    }
  }

  tracker.tracks = nextTracks;
  return nextTracks.filter((t) => t.missed === 0);
}

function drawLabel(ctx, text, x, y, color, dpr, minY) {
  const fontSize = Math.max(12, Math.round(13 * dpr));
  ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
  const padX = 6 * dpr;
  const padY = 3 * dpr;
  const textW = ctx.measureText(text).width;
  const labelH = fontSize + padY * 2;
  const labelY = y - labelH >= minY ? y - labelH : y;

  ctx.fillStyle = color;
  ctx.fillRect(x, labelY, textW + padX * 2, labelH);
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'top';
  ctx.fillText(text, x + padX, labelY + padY);
}

function drawOverlay(canvas, video, mode, detections, letterbox, maskCanvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const targetW = Math.round(rect.width * dpr);
  const targetH = Math.round(rect.height * dpr);
  if (canvas.width !== targetW || canvas.height !== targetH) {
    canvas.width = targetW;
    canvas.height = targetH;
  }

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!detections?.length || !video?.videoWidth || !video?.videoHeight) return;

  const videoRatio = video.videoWidth / video.videoHeight;
  const boxRatio = canvas.width / canvas.height;
  let drawW = canvas.width;
  let drawH = canvas.height;
  let offsetX = 0;
  let offsetY = 0;
  if (videoRatio > boxRatio) {
    drawH = canvas.width / videoRatio;
    offsetY = (canvas.height - drawH) / 2;
  } else {
    drawW = canvas.height * videoRatio;
    offsetX = (canvas.width - drawW) / 2;
  }

  ctx.lineWidth = Math.max(2, Math.round(2 * dpr));

  if (mode === 'classify') {
    const fontSize = Math.max(13, Math.round(14 * dpr));
    ctx.font = `600 ${fontSize}px ui-sans-serif, system-ui, sans-serif`;
    let px = offsetX + 12 * dpr;
    const py = offsetY + drawH - 44 * dpr;
    detections.forEach((det, idx) => {
      const color = PALETTE[idx % PALETTE.length];
      const text = `${det.label} ${Math.round(det.score * 100)}%`;
      const padX = 10 * dpr;
      const padY = 5 * dpr;
      const textW = ctx.measureText(text).width;
      const pillH = fontSize + padY * 2;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(px, py, textW + padX * 2, pillH, 999);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.textBaseline = 'top';
      ctx.fillText(text, px + padX, py + padY);
      px += textW + padX * 2 + 8 * dpr;
    });
    return;
  }

  if ((mode === 'segment' || mode === 'semantic') && letterbox) {
    const protoW = detections[0]?.mask?.protoW || 160;
    const protoH = detections[0]?.mask?.protoH || 160;
    if (maskCanvas.width !== protoW || maskCanvas.height !== protoH) {
      maskCanvas.width = protoW;
      maskCanvas.height = protoH;
    }
    const mCtx = maskCanvas.getContext('2d');
    const img = mCtx.createImageData(protoW, protoH);
    for (const det of detections) {
      if (!det.mask?.bits) continue;
      const [r, g, b] = hexToRgb(PALETTE[det.classId % PALETTE.length]);
      const { x: mx, y: my, w: mw, h: mh, bits } = det.mask;
      for (let y = 0; y < mh; y += 1) {
        for (let x = 0; x < mw; x += 1) {
          if (bits[y * mw + x]) {
            const idx = ((my + y) * protoW + (mx + x)) * 4;
            img.data[idx] = r;
            img.data[idx + 1] = g;
            img.data[idx + 2] = b;
            img.data[idx + 3] = mode === 'semantic' ? 140 : 105;
          }
        }
      }
    }
    mCtx.putImageData(img, 0, 0);
    const sx = (letterbox.padX / letterbox.inputSize) * protoW;
    const sy = (letterbox.padY / letterbox.inputSize) * protoH;
    const sw = ((letterbox.vw * letterbox.scale) / letterbox.inputSize) * protoW;
    const sh = ((letterbox.vh * letterbox.scale) / letterbox.inputSize) * protoH;
    ctx.drawImage(maskCanvas, sx, sy, sw, sh, offsetX, offsetY, drawW, drawH);

    if (mode === 'semantic') {
      const seen = new Set();
      let px = offsetX + 12 * dpr;
      const py = offsetY + 12 * dpr;
      for (const det of detections) {
        if (seen.has(det.classId)) continue;
        seen.add(det.classId);
        const color = PALETTE[det.classId % PALETTE.length];
        drawLabel(ctx, det.label, px, py, color, dpr, offsetY);
        px += ctx.measureText(det.label).width + 20 * dpr;
      }
      return;
    }
  }

  for (const det of detections) {
    const color = PALETTE[(det.trackId ?? det.classId) % PALETTE.length];

    if (mode === 'obb' && det.corners?.length === 4) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      det.corners.forEach((p, idx) => {
        const px = offsetX + p.x * drawW;
        const py = offsetY + p.y * drawH;
        if (idx === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.stroke();
      const top = det.corners.reduce((a, b) => (b.y < a.y ? b : a), det.corners[0]);
      drawLabel(ctx, `${det.label} ${Math.round(det.score * 100)}%`, offsetX + top.x * drawW, offsetY + top.y * drawH, color, dpr, offsetY);
      continue;
    }

    const x = offsetX + det.x1 * drawW;
    const y = offsetY + det.y1 * drawH;
    const w = (det.x2 - det.x1) * drawW;
    const h = (det.y2 - det.y1) * drawH;

    if (mode === 'track' && det.trail?.length > 1) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      det.trail.forEach((pt, idx) => {
        const tx = offsetX + pt.x * drawW;
        const ty = offsetY + pt.y * drawH;
        if (idx === 0) ctx.moveTo(tx, ty);
        else ctx.lineTo(tx, ty);
      });
      ctx.stroke();
    }

    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);

    const tag = det.trackId != null ? `#${det.trackId} ${det.label}` : det.label;
    drawLabel(ctx, `${tag} ${Math.round(det.score * 100)}%`, x, y, color, dpr, offsetY);

    if (mode === 'pose' && det.keypoints?.length === 17) {
      ctx.strokeStyle = '#facc15';
      for (const [i, j] of POSE_SKELETON) {
        const a = det.keypoints[i];
        const b = det.keypoints[j];
        if (a.conf < 0.35 || b.conf < 0.35) continue;
        ctx.beginPath();
        ctx.moveTo(offsetX + a.x * drawW, offsetY + a.y * drawH);
        ctx.lineTo(offsetX + b.x * drawW, offsetY + b.y * drawH);
        ctx.stroke();
      }
      for (const kp of det.keypoints) {
        if (kp.conf < 0.35) continue;
        ctx.fillStyle = '#ec4899';
        ctx.beginPath();
        ctx.arc(offsetX + kp.x * drawW, offsetY + kp.y * drawH, 3.5 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

export function useYoloDetection(videoRef, canvasRef, mode, playing) {
  const workerRef = useRef(null);
  const busyRef = useRef(false);
  const letterboxRef = useRef(null);
  const trackerRef = useRef({ nextId: 1, tracks: [] });
  const maskCanvasRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [summary, setSummary] = useState({ count: 0, inferenceMs: 0, topLabel: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    trackerRef.current = { nextId: 1, tracks: [] };
    if (!mode || mode === 'off') {
      workerRef.current?.terminate();
      workerRef.current = null;
      busyRef.current = false;
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
      setStatus('idle');
      setSummary({ count: 0, inferenceMs: 0, topLabel: '' });
      setError('');
      return undefined;
    }

    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement('canvas');
    setStatus('loading');
    setError('');
    if (!workerRef.current) {
      workerRef.current = new Worker(new URL('../workers/yolo11Worker.js', import.meta.url), { type: 'module' });
    }
    const worker = workerRef.current;

    worker.onmessage = (event) => {
      const msg = event.data;
      if (msg.mode && msg.mode !== mode) return;
      if (msg.type === 'ready') {
        setStatus('active');
      } else if (msg.type === 'detections') {
        busyRef.current = false;
        const items = mode === 'track' ? updateTracks(trackerRef.current, msg.detections) : msg.detections;
        setStatus('active');
        setSummary({
          count: items.length,
          inferenceMs: msg.inferenceMs,
          topLabel: items[0] ? `${items[0].label} ${Math.round(items[0].score * 100)}%` : '',
        });
        if (canvasRef.current && videoRef.current) {
          drawOverlay(canvasRef.current, videoRef.current, mode, items, letterboxRef.current, maskCanvasRef.current);
        }
      } else if (msg.type === 'error') {
        busyRef.current = false;
        setStatus('error');
        setError(msg.message || 'AI inference failed');
      }
    };

    worker.postMessage({ type: 'init', mode });

    return () => {
      busyRef.current = false;
    };
  }, [mode, videoRef, canvasRef]);

  useEffect(() => () => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => {
    if (!mode || mode === 'off' || !playing) return undefined;
    const modeCfg = AI_MODES.find((m) => m.id === mode);
    if (!modeCfg) return undefined;
    const inputSize = modeCfg.inputSize;

    const offscreen = document.createElement('canvas');
    offscreen.width = inputSize;
    offscreen.height = inputSize;
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

    const timer = setInterval(() => {
      const video = videoRef.current;
      const worker = workerRef.current;
      if (!video || !worker || busyRef.current || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        return;
      }

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = Math.min(inputSize / vw, inputSize / vh);
      const nw = Math.round(vw * scale);
      const nh = Math.round(vh * scale);
      const padX = Math.floor((inputSize - nw) / 2);
      const padY = Math.floor((inputSize - nh) / 2);
      letterboxRef.current = { inputSize, scale, padX, padY, vw, vh };

      offCtx.fillStyle = '#727272';
      offCtx.fillRect(0, 0, inputSize, inputSize);
      offCtx.drawImage(video, padX, padY, nw, nh);

      const imageData = offCtx.getImageData(0, 0, inputSize, inputSize);
      busyRef.current = true;
      worker.postMessage(
        {
          type: 'detect',
          mode,
          inputSize,
          buffer: imageData.data.buffer,
          scale,
          padX,
          padY,
          videoWidth: vw,
          videoHeight: vh,
          confThreshold: mode === 'obb' ? 0.35 : 0.4,
        },
        [imageData.data.buffer]
      );
    }, mode === 'obb' ? 220 : 120);

    return () => clearInterval(timer);
  }, [mode, playing, videoRef]);

  return { status, summary, error };
}
