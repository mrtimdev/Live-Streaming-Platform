import * as ort from 'onnxruntime-web';
import { AI_MODES, COCO_CLASSES, DOTA_CLASSES } from '../utils/cocoClasses';
import IMAGENET_CLASSES from '../utils/imagenetClasses.json';

const IOU_THRESHOLD = 0.45;
const sessions = new Map();

async function getSession(modelPath) {
  if (!sessions.has(modelPath)) {
    ort.env.wasm.wasmPaths = new URL('/ort/', self.location.origin).href;
    ort.env.wasm.numThreads = 1;
    const promise = ort.InferenceSession.create(modelPath, {
      executionProviders: ['webgpu', 'wasm'],
      graphOptimizationLevel: 'all',
    }).catch((err) => {
      sessions.delete(modelPath);
      throw err;
    });
    sessions.set(modelPath, promise);
  }
  return sessions.get(modelPath);
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

function nms(boxes, classAware = true) {
  boxes.sort((a, b) => b.score - a.score);
  const kept = [];
  for (const box of boxes) {
    let suppress = false;
    for (const prev of kept) {
      if ((!classAware || prev.classId === box.classId) && iou(prev, box) > IOU_THRESHOLD) {
        suppress = true;
        break;
      }
    }
    if (!suppress) kept.push(box);
  }
  return kept;
}

function rgbaToNchw(rgba, size) {
  const area = size * size;
  const floatData = new Float32Array(3 * area);
  for (let i = 0; i < area; i += 1) {
    const base = i * 4;
    floatData[i] = rgba[base] / 255;
    floatData[area + i] = rgba[base + 1] / 255;
    floatData[2 * area + i] = rgba[base + 2] / 255;
  }
  return floatData;
}

function decodeDetect(data, channels, numAnchors, scale, padX, padY, vw, vh, confThreshold) {
  const numClasses = channels - 4;
  const candidates = [];
  for (let i = 0; i < numAnchors; i += 1) {
    let bestScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c += 1) {
      const score = data[(4 + c) * numAnchors + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestScore < confThreshold || bestClass < 0) continue;

    const cx = data[i];
    const cy = data[numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];

    candidates.push({
      classId: bestClass,
      label: COCO_CLASSES[bestClass] || `class_${bestClass}`,
      score: bestScore,
      x1: Math.max(0, Math.min(1, (cx - w / 2 - padX) / scale / vw)),
      y1: Math.max(0, Math.min(1, (cy - h / 2 - padY) / scale / vh)),
      x2: Math.max(0, Math.min(1, (cx + w / 2 - padX) / scale / vw)),
      y2: Math.max(0, Math.min(1, (cy + h / 2 - padY) / scale / vh)),
    });
  }
  return nms(candidates);
}

function decodeSegment(out0, out1, scale, padX, padY, vw, vh, inputSize, confThreshold) {
  const data = out0.data;
  const [, channels, numAnchors] = out0.dims;
  const numMasks = 32;
  const numClasses = channels - 4 - numMasks;
  const candidates = [];

  for (let i = 0; i < numAnchors; i += 1) {
    let bestScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c += 1) {
      const score = data[(4 + c) * numAnchors + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestScore < confThreshold || bestClass < 0) continue;

    const cx = data[i];
    const cy = data[numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];
    const bx1 = Math.max(0, cx - w / 2);
    const by1 = Math.max(0, cy - h / 2);
    const bx2 = Math.min(inputSize, cx + w / 2);
    const by2 = Math.min(inputSize, cy + h / 2);

    candidates.push({
      anchorIdx: i,
      classId: bestClass,
      label: COCO_CLASSES[bestClass] || `class_${bestClass}`,
      score: bestScore,
      bx1, by1, bx2, by2,
      x1: Math.max(0, Math.min(1, (bx1 - padX) / scale / vw)),
      y1: Math.max(0, Math.min(1, (by1 - padY) / scale / vh)),
      x2: Math.max(0, Math.min(1, (bx2 - padX) / scale / vw)),
      y2: Math.max(0, Math.min(1, (by2 - padY) / scale / vh)),
    });
  }

  const kept = nms(candidates).slice(0, 20);
  const protoData = out1.data;
  const protoH = out1.dims[2];
  const protoW = out1.dims[3];
  const protoArea = protoH * protoW;
  const ratio = protoW / inputSize;

  return kept.map((det) => {
    const coeffs = new Float32Array(numMasks);
    for (let m = 0; m < numMasks; m += 1) {
      coeffs[m] = data[(4 + numClasses + m) * numAnchors + det.anchorIdx];
    }
    const mx1 = Math.max(0, Math.floor(det.bx1 * ratio));
    const my1 = Math.max(0, Math.floor(det.by1 * ratio));
    const mx2 = Math.min(protoW, Math.ceil(det.bx2 * ratio));
    const my2 = Math.min(protoH, Math.ceil(det.by2 * ratio));
    const mw = Math.max(0, mx2 - mx1);
    const mh = Math.max(0, my2 - my1);
    const bits = new Uint8Array(mw * mh);

    for (let y = 0; y < mh; y += 1) {
      const py = my1 + y;
      for (let x = 0; x < mw; x += 1) {
        const px = mx1 + x;
        const pIdx = py * protoW + px;
        let sum = 0;
        for (let m = 0; m < numMasks; m += 1) {
          sum += coeffs[m] * protoData[m * protoArea + pIdx];
        }
        if (sum > 0) bits[y * mw + x] = 1;
      }
    }

    return {
      classId: det.classId,
      label: det.label,
      score: det.score,
      x1: det.x1,
      y1: det.y1,
      x2: det.x2,
      y2: det.y2,
      mask: { x: mx1, y: my1, w: mw, h: mh, bits, protoW, protoH },
    };
  });
}

function decodeClassify(output) {
  const data = output.data;
  const top = [];
  for (let i = 0; i < data.length; i += 1) {
    const score = data[i];
    if (top.length < 3 || score > top[top.length - 1].score) {
      top.push({ classId: i, label: IMAGENET_CLASSES[i] || `class_${i}`, score });
      top.sort((a, b) => b.score - a.score);
      if (top.length > 3) top.length = 3;
    }
  }
  return top;
}

function decodePose(data, numAnchors, scale, padX, padY, vw, vh, confThreshold) {
  const candidates = [];
  for (let i = 0; i < numAnchors; i += 1) {
    const score = data[4 * numAnchors + i];
    if (score < confThreshold) continue;

    const cx = data[i];
    const cy = data[numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];
    const keypoints = [];
    for (let k = 0; k < 17; k += 1) {
      const kx = (data[(5 + k * 3) * numAnchors + i] - padX) / scale / vw;
      const ky = (data[(5 + k * 3 + 1) * numAnchors + i] - padY) / scale / vh;
      const kc = data[(5 + k * 3 + 2) * numAnchors + i];
      keypoints.push({ x: kx, y: ky, conf: kc });
    }

    candidates.push({
      classId: 0,
      label: 'person',
      score,
      x1: Math.max(0, Math.min(1, (cx - w / 2 - padX) / scale / vw)),
      y1: Math.max(0, Math.min(1, (cy - h / 2 - padY) / scale / vh)),
      x2: Math.max(0, Math.min(1, (cx + w / 2 - padX) / scale / vw)),
      y2: Math.max(0, Math.min(1, (cy + h / 2 - padY) / scale / vh)),
      keypoints,
    });
  }
  return nms(candidates);
}

function decodeObb(data, channels, numAnchors, scale, padX, padY, vw, vh, confThreshold) {
  const numClasses = channels - 5;
  const candidates = [];
  for (let i = 0; i < numAnchors; i += 1) {
    let bestScore = 0;
    let bestClass = -1;
    for (let c = 0; c < numClasses; c += 1) {
      const score = data[(4 + c) * numAnchors + i];
      if (score > bestScore) {
        bestScore = score;
        bestClass = c;
      }
    }
    if (bestScore < confThreshold || bestClass < 0) continue;

    const cx = data[i];
    const cy = data[numAnchors + i];
    const w = data[2 * numAnchors + i];
    const h = data[3 * numAnchors + i];
    const angle = data[(4 + numClasses) * numAnchors + i];
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const hw = w / 2;
    const hh = h / 2;

    const corners = [
      [-hw, -hh],
      [hw, -hh],
      [hw, hh],
      [-hw, hh],
    ].map(([dx, dy]) => ({
      x: (cx + dx * cos - dy * sin - padX) / scale / vw,
      y: (cy + dx * sin + dy * cos - padY) / scale / vh,
    }));

    const xs = corners.map((p) => p.x);
    const ys = corners.map((p) => p.y);
    candidates.push({
      classId: bestClass,
      label: DOTA_CLASSES[bestClass] || `class_${bestClass}`,
      score: bestScore,
      x1: Math.min(...xs),
      y1: Math.min(...ys),
      x2: Math.max(...xs),
      y2: Math.max(...ys),
      corners,
    });
  }
  return nms(candidates);
}

self.onmessage = async (event) => {
  const { type, mode = 'detect', buffer, inputSize = 640, scale, padX, padY, videoWidth, videoHeight, confThreshold = 0.4 } = event.data;
  const modeCfg = AI_MODES.find((m) => m.id === mode);
  if (!modeCfg?.model) return;

  if (type === 'init') {
    try {
      await getSession(modeCfg.model);
      self.postMessage({ type: 'ready', mode });
    } catch (err) {
      self.postMessage({ type: 'error', mode, message: err?.message || `Failed to load ${modeCfg.label} model` });
    }
    return;
  }

  if (type !== 'detect' || !buffer) return;

  try {
    const start = performance.now();
    const session = await getSession(modeCfg.model);
    const rgba = new Uint8ClampedArray(buffer);
    const input = new ort.Tensor('float32', rgbaToNchw(rgba, inputSize), [1, 3, inputSize, inputSize]);
    const outputs = await session.run({ [session.inputNames[0]]: input });
    const out0 = outputs[session.outputNames[0]];

    let detections = [];
    if (mode === 'detect' || mode === 'track') {
      detections = decodeDetect(out0.data, out0.dims[1], out0.dims[2], scale, padX, padY, videoWidth, videoHeight, confThreshold);
    } else if (mode === 'segment' || mode === 'semantic') {
      const out1 = outputs[session.outputNames[1]];
      detections = decodeSegment(out0, out1, scale, padX, padY, videoWidth, videoHeight, inputSize, confThreshold);
    } else if (mode === 'classify') {
      detections = decodeClassify(out0);
    } else if (mode === 'pose') {
      detections = decodePose(out0.data, out0.dims[2], scale, padX, padY, videoWidth, videoHeight, confThreshold);
    } else if (mode === 'obb') {
      detections = decodeObb(out0.data, out0.dims[1], out0.dims[2], scale, padX, padY, videoWidth, videoHeight, confThreshold);
    }

    const inferenceMs = Math.round(performance.now() - start);
    self.postMessage({ type: 'detections', mode, detections, inferenceMs });
  } catch (err) {
    self.postMessage({ type: 'error', mode, message: err?.message || 'AI inference failed' });
  }
};
