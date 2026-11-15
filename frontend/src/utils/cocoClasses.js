export const COCO_CLASSES = [
  'person', 'bicycle', 'car', 'motorcycle', 'airplane', 'bus', 'train', 'truck', 'boat', 'traffic light',
  'fire hydrant', 'stop sign', 'parking meter', 'bench', 'bird', 'cat', 'dog', 'horse', 'sheep', 'cow',
  'elephant', 'bear', 'zebra', 'giraffe', 'backpack', 'umbrella', 'handbag', 'tie', 'suitcase', 'frisbee',
  'skis', 'snowboard', 'sports ball', 'kite', 'baseball bat', 'baseball glove', 'skateboard', 'surfboard',
  'tennis racket', 'bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl', 'banana', 'apple',
  'sandwich', 'orange', 'broccoli', 'carrot', 'hot dog', 'pizza', 'donut', 'cake', 'chair', 'couch',
  'potted plant', 'bed', 'dining table', 'toilet', 'tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone',
  'microwave', 'oven', 'toaster', 'sink', 'refrigerator', 'book', 'clock', 'vase', 'scissors', 'teddy bear',
  'hair drier', 'toothbrush',
];

export const DOTA_CLASSES = [
  'plane', 'ship', 'storage tank', 'baseball diamond', 'tennis court',
  'basketball court', 'ground track field', 'harbor', 'bridge', 'large vehicle',
  'small vehicle', 'helicopter', 'roundabout', 'soccer ball field', 'swimming pool',
];

// 17 COCO keypoints skeleton pairs
export const POSE_SKELETON = [
  [0, 1], [0, 2], [1, 3], [2, 4],
  [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],
  [5, 11], [6, 12], [11, 12],
  [11, 13], [13, 15], [12, 14], [14, 16],
];

export const AI_MODES = [
  { id: 'off', label: 'AI: Off', model: null, inputSize: 640 },
  { id: 'detect', label: 'Detect', model: '/models/yolo11n.onnx', inputSize: 640 },
  { id: 'segment', label: 'Segment', model: '/models/yolo11n-seg.onnx', inputSize: 640 },
  { id: 'semantic', label: 'Semantic', model: '/models/yolo11n-seg.onnx', inputSize: 640 },
  { id: 'classify', label: 'Classify', model: '/models/yolo11n-cls.onnx', inputSize: 224 },
  { id: 'pose', label: 'Pose', model: '/models/yolo11n-pose.onnx', inputSize: 640 },
  { id: 'obb', label: 'OBB', model: '/models/yolo11n-obb.onnx', inputSize: 1024 },
  { id: 'track', label: 'Track', model: '/models/yolo11n.onnx', inputSize: 640 },
];
