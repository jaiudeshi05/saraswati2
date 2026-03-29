"""
cv_analyzer.py  (v2 — EfficientNet-B2, 4-class output → 5-class padding)
=========================================================================
Drop-in replacement for the original cv_analyzer.py.
Compatible with emotion_model.pt trained using replacement_cells_5_to_9.py.

Key changes from v1:
  - EfficientNet-B2 backbone (not B0)
  - Deeper classifier head (Dropout → Linear → SiLU → Dropout → Linear)
  - Input size 260×260 (not 224×224)
  - 4 training classes output → padded to 5 cognitive classes
    by inserting 0.0 at index 3 (Distracted has no CV signal)
  - Output format exactly matches what fusion.py expects

Place in: backend/cv_analyzer.py   (replace the original)
"""

import base64
import io
import time
import logging
from collections import deque
from pathlib import Path
from typing import Optional

import cv2
import mediapipe as mp
import numpy as np
import torch
import torch.nn as nn
from PIL import Image
from torchvision import models, transforms

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# CLASS DEFINITIONS
# Must match what was used in replacement_cells_5_to_9.py
# ─────────────────────────────────────────────

# These are the classes the model was trained to predict (indices 0-3)
TRAIN_CLASS_NAMES = ["Focused", "Confused", "Fatigued", "WrongApproach"]

# Full 5-class cognitive state output (Distracted = index 3, no CV signal)
COGNITIVE_NAMES = {
    0: "Focused",
    1: "Confused",
    2: "Fatigued",
    3: "Distracted",    # <-- inserted as 0.0, no CV training class
    4: "WrongApproach",
}

# Rolling window: 6 frames × 5 seconds = 30-second smoothed reading
WINDOW_SIZE = 6

# MediaPipe face detection confidence threshold
MIN_FACE_CONFIDENCE = 0.50

# Latency warning threshold (ms)
LATENCY_WARN_MS = 600


# ─────────────────────────────────────────────
# MODEL BUILDER
# Must exactly match the architecture in replacement_cells_5_to_9.py
# ─────────────────────────────────────────────

def _build_efficientnet_b2(num_classes: int = 4) -> nn.Module:
    """
    Build EfficientNet-B2 with the same classifier head used during training.
    """
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features   # 1408 for B2

    model.classifier = nn.Sequential(
        nn.Dropout(p=0.40, inplace=True),
        nn.Linear(in_features, 512),
        nn.SiLU(),
        nn.Dropout(p=0.30),
        nn.Linear(512, num_classes),
    )
    return model


# ─────────────────────────────────────────────
# MAIN CLASS
# ─────────────────────────────────────────────

class CVAnalyzer:
    """
    Real-time facial emotion analyzer — 4-class output padded to 5-class.

    Usage:
        analyzer = CVAnalyzer("models/emotion_model.pt")
        result   = analyzer.analyze_frame(b64_jpeg_string)

    result["windowed_probs"] is a dict with keys:
        "Focused", "Confused", "Fatigued", "Distracted", "WrongApproach"
    where "Distracted" is always 0.0 (no CV signal for this state).

    This is directly compatible with fusion.py's fuse_rf_cv() function.
    """

    def __init__(self, model_path: str, device: str = "cpu"):
        self.device = torch.device(device)
        self._model_path = Path(model_path)

        if not self._model_path.exists():
            raise FileNotFoundError(
                f"Emotion model not found at {model_path}. "
                "Train it using replacement_cells_5_to_9.py in Colab "
                "and place emotion_model.pt in backend/models/."
            )

        # Load model
        logger.info(f"Loading emotion model from {model_path}...")
        self._model = _build_efficientnet_b2(num_classes=len(TRAIN_CLASS_NAMES))
        state = torch.load(model_path, map_location=self.device)
        self._model.load_state_dict(state)
        self._model.to(self.device)
        self._model.eval()
        logger.info("Emotion model loaded (EfficientNet-B2, 4-class).")

        # Preprocessing transform — must exactly match val_tf in training
        self._transform = transforms.Compose([
            transforms.Resize(288),
            transforms.CenterCrop(260),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=[0.485, 0.456, 0.406],
                std =[0.229, 0.224, 0.225],
            ),
        ])

        # MediaPipe face detector
        self._mp_face_detection = mp.solutions.face_detection
        self._face_detector = self._mp_face_detection.FaceDetection(
            model_selection=0,
            min_detection_confidence=MIN_FACE_CONFIDENCE,
        )

        # Rolling window of 5-class probability dicts
        self._window: deque = deque(maxlen=WINDOW_SIZE)

        # Performance stats
        self.frames_processed = 0
        self.frames_no_face   = 0
        self.avg_latency_ms   = 0.0

        logger.info("CVAnalyzer ready.")

    # ── Public API ────────────────────────────────────────────────────────

    def analyze_frame(self, b64_jpeg: str) -> dict:
        """
        Full pipeline: decode → detect face → classify → update window.

        Returns:
        {
          "face_detected"   : bool,
          "latency_ms"      : float,
          "frame_probs"     : dict | None,   # 5-class probs, this frame only
          "windowed_probs"  : dict | None,   # 30-second rolling average
          "dominant_emotion": str | None,    # highest prob cognitive state
          "frames_in_window": int,
        }

        NOTE: "dominant_emotion" here is a cognitive state name, not an
        AffectNet emotion name, because the model directly predicts cognitive states.
        fusion.py uses windowed_probs directly without any further mapping.
        """
        t0 = time.perf_counter()
        self.frames_processed += 1

        frame_bgr = self._decode_b64_jpeg(b64_jpeg)
        if frame_bgr is None:
            return self._empty_result(0.0, "decode_failed")

        face_crop = self._detect_face(frame_bgr)
        if face_crop is None:
            self.frames_no_face += 1
            return self._empty_result((time.perf_counter() - t0) * 1000, "no_face")

        frame_probs_5class = self._classify(face_crop)
        self._window.append(frame_probs_5class)

        latency = (time.perf_counter() - t0) * 1000
        self.avg_latency_ms = 0.9 * self.avg_latency_ms + 0.1 * latency

        if latency > LATENCY_WARN_MS:
            logger.warning(f"CV inference latency: {latency:.1f}ms")

        windowed = self._compute_window_average()
        dominant = max(windowed, key=windowed.get) if windowed else None

        return {
            "face_detected":     True,
            "latency_ms":        round(latency, 1),
            "frame_probs":       frame_probs_5class,
            "windowed_probs":    windowed,
            "dominant_emotion":  dominant,
            "frames_in_window":  len(self._window),
        }

    def get_stats(self) -> dict:
        return {
            "frames_processed": self.frames_processed,
            "frames_no_face":   self.frames_no_face,
            "face_detect_rate": round(
                1 - (self.frames_no_face / max(self.frames_processed, 1)), 3
            ),
            "avg_latency_ms":   round(self.avg_latency_ms, 1),
            "window_fill":      f"{len(self._window)}/{WINDOW_SIZE}",
        }

    def reset_window(self):
        self._window.clear()
        logger.info("CVAnalyzer window reset.")

    # ── Private helpers ───────────────────────────────────────────────────

    def _decode_b64_jpeg(self, b64_jpeg: str) -> Optional[np.ndarray]:
        try:
            if "base64," in b64_jpeg:
                b64_jpeg = b64_jpeg.split("base64,", 1)[1]
            raw = base64.b64decode(b64_jpeg)
            arr = np.frombuffer(raw, dtype=np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
            return img
        except Exception as e:
            logger.warning(f"Frame decode failed: {e}")
            return None

    def _detect_face(self, bgr_frame: np.ndarray) -> Optional[np.ndarray]:
        h, w = bgr_frame.shape[:2]
        rgb   = cv2.cvtColor(bgr_frame, cv2.COLOR_BGR2RGB)

        try:
            results = self._face_detector.process(rgb)
        except Exception as e:
            logger.warning(f"MediaPipe error: {e}")
            return None

        if not results.detections:
            return None

        best = max(results.detections, key=lambda d: d.score[0])
        bb   = best.location_data.relative_bounding_box

        margin = 0.15
        x1 = max(0.0, bb.xmin - bb.width  * margin)
        y1 = max(0.0, bb.ymin - bb.height * margin)
        x2 = min(1.0, bb.xmin + bb.width  * (1 + margin))
        y2 = min(1.0, bb.ymin + bb.height * (1 + margin))

        px1, py1 = int(x1 * w), int(y1 * h)
        px2, py2 = int(x2 * w), int(y2 * h)

        face = bgr_frame[py1:py2, px1:px2]
        if face.size == 0 or face.shape[0] < 20 or face.shape[1] < 20:
            return None
        return face

    def _classify(self, face_bgr: np.ndarray) -> dict:
        """
        Run EfficientNet-B2 on face crop.
        Returns 5-class probability dict (Distracted always 0.0).
        """
        rgb    = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
        pil    = Image.fromarray(rgb)
        tensor = self._transform(pil).unsqueeze(0).to(self.device)

        with torch.no_grad():
            logits = self._model(tensor)
            probs4 = torch.softmax(logits, dim=1).squeeze().cpu().numpy()

        # probs4 has 4 values: [Focused, Confused, Fatigued, WrongApproach]
        # Insert 0.0 at index 3 for Distracted to get 5-class output
        probs5 = np.insert(probs4, 3, 0.0)

        # Normalize (sum is still 1.0 since we inserted 0, but guard against drift)
        total = probs5.sum()
        if total > 0:
            probs5 /= total

        return {
            COGNITIVE_NAMES[i]: round(float(probs5[i]), 4)
            for i in range(5)
        }

    def _compute_window_average(self) -> Optional[dict]:
        if not self._window:
            return None

        avg = {COGNITIVE_NAMES[i]: 0.0 for i in range(5)}
        for frame_probs in self._window:
            for state_name in avg:
                avg[state_name] += frame_probs.get(state_name, 0.0)

        n = len(self._window)
        total = sum(v / n for v in avg.values())
        return {
            k: round((v / n) / max(total, 1e-9), 4)
            for k, v in avg.items()
        }

    def _empty_result(self, latency_ms: float, reason: str = "") -> dict:
        return {
            "face_detected":    False,
            "latency_ms":       round(latency_ms, 1),
            "frame_probs":      None,
            "windowed_probs":   self._compute_window_average(),
            "dominant_emotion": None,
            "frames_in_window": len(self._window),
            "reason":           reason,
        }
