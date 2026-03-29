"""
fusion.py  (v2 — compatible with cv_analyzer_v2.py / 5-class direct CV output)
================================================================================
Drop-in replacement for the original fusion.py.

KEY CHANGE from v1:
  The CV model now directly outputs 5-class cognitive state probabilities
  (Focused, Confused, Fatigued, Distracted=0.0, WrongApproach).

  The EMOTION_TO_STATE_MATRIX from v1 is no longer needed.
  fuse_rf_cv() now accepts the CV windowed_probs directly as a 5-class dict
  matching the same key names as RF all_probs.

Everything else (severity computation, build_final_output, IsolationForest
integration, z-score integration) is identical to v1.

Place in: backend/fusion.py   (replace the original)
"""

import numpy as np
from typing import Optional

# ─────────────────────────────────────────────
# CONSTANTS
# ─────────────────────────────────────────────

STATE_NAMES = {
    0: "Focused",
    1: "Confused",
    2: "Fatigued",
    3: "Distracted",
    4: "WrongApproach",
}
STATE_ORDER = [0, 1, 2, 3, 4]

# RF is the primary signal — 13 UX features trained on your own data
# CV is supplemental — visual cross-validation
# Distracted is CV-silent (CV always outputs 0.0 there), so RF carries it fully
RF_WEIGHT = 0.70
CV_WEIGHT = 0.30

# Severity thresholds
SEVERITY_ALERT_ISO  = -0.10
SEVERITY_WATCH_ISO  = -0.05
SEVERITY_ALERT_NDEV = 3
SEVERITY_WATCH_NDEV = 1


# ─────────────────────────────────────────────
# FUSION
# ─────────────────────────────────────────────

def fuse_rf_cv(
    rf_all_probs: dict,
    cv_windowed_probs: Optional[dict],
) -> dict:
    """
    Weighted fusion of RF and CV probability vectors.

    Args:
        rf_all_probs:      {"Focused": 0.6, "Confused": 0.2, ...}
                           5-class dict from RF predict_proba
        cv_windowed_probs: {"Focused": 0.5, "Confused": 0.3, ..., "Distracted": 0.0}
                           5-class dict directly from cv_analyzer_v2.py
                           OR None if CV unavailable (free tier / no face detected)

    Returns:
        {
          "fused_probs"      : {"Focused": ..., ...},
          "fused_state"      : "Focused",
          "fused_confidence" : 0.55,
          "cv_contributed"   : bool,
        }
    """
    rf_vec = np.array(
        [rf_all_probs.get(STATE_NAMES[i], 0.0) for i in STATE_ORDER],
        dtype=np.float32
    )
    rf_total = rf_vec.sum()
    if rf_total > 0:
        rf_vec /= rf_total

    if cv_windowed_probs is not None:
        cv_vec = np.array(
            [cv_windowed_probs.get(STATE_NAMES[i], 0.0) for i in STATE_ORDER],
            dtype=np.float32
        )
        cv_total = cv_vec.sum()
        if cv_total > 0:
            cv_vec /= cv_total

        fused = RF_WEIGHT * rf_vec + CV_WEIGHT * cv_vec
        fused /= fused.sum()
        cv_contributed = True
    else:
        fused = rf_vec
        cv_contributed = False

    state_idx      = int(np.argmax(fused))
    fused_state    = STATE_NAMES[state_idx]
    fused_conf     = float(fused[state_idx])

    fused_probs = {
        STATE_NAMES[i]: round(float(fused[i]), 4)
        for i in STATE_ORDER
    }

    return {
        "fused_probs":      fused_probs,
        "fused_state":      fused_state,
        "fused_confidence": round(fused_conf, 4),
        "cv_contributed":   cv_contributed,
    }


# ─────────────────────────────────────────────
# SEVERITY
# ─────────────────────────────────────────────

def compute_severity(iso_score: float, zscore_analysis: dict) -> str:
    n_deviant   = zscore_analysis.get("n_deviant", 0)
    spike_alert = zscore_analysis.get("spike_alert", False)

    if spike_alert or iso_score < SEVERITY_ALERT_ISO:
        return "alert"
    elif n_deviant >= SEVERITY_WATCH_NDEV or iso_score < SEVERITY_WATCH_ISO:
        return "watch"
    return "normal"


# ─────────────────────────────────────────────
# FINAL OUTPUT BUILDER
# ─────────────────────────────────────────────

def build_final_output(
    rf_result: dict,
    iso_score: float,
    zscore_analysis: dict,
    cv_result: Optional[dict] = None,
) -> dict:
    """
    Assemble the complete per-window output sent to the frontend and
    accumulated for the periodic LLM report.

    Args:
        rf_result: {
            "state": str, "state_id": int, "confidence": float,
            "all_probs": {"Focused": ..., ...}
          }
        iso_score:       float from IsolationForest.decision_function()
        zscore_analysis: dict from zscore_deviation()
        cv_result:       output of CVAnalyzer.analyze_frame(), or None
    """
    rf_all_probs = rf_result["all_probs"]

    cv_windowed      = None
    cv_face_detected = False
    cv_dominant      = None
    cv_latency       = None

    if cv_result is not None and cv_result.get("face_detected"):
        cv_windowed      = cv_result.get("windowed_probs")
        cv_face_detected = True
        cv_dominant      = cv_result.get("dominant_emotion")
        cv_latency       = cv_result.get("latency_ms")

    fusion   = fuse_rf_cv(rf_all_probs, cv_windowed)
    severity = compute_severity(iso_score, zscore_analysis)

    return {
        # ── Fused classification (what the dashboard shows) ────────────────
        "state":           fusion["fused_state"],
        "state_id":        list(STATE_NAMES.values()).index(fusion["fused_state"]),
        "confidence":      fusion["fused_confidence"],
        "all_probs":       fusion["fused_probs"],

        # ── RF layer (transparency) ────────────────────────────────────────
        "rf_state":        rf_result["state"],
        "rf_confidence":   rf_result["confidence"],
        "rf_all_probs":    rf_all_probs,

        # ── CV layer ──────────────────────────────────────────────────────
        "cv_enabled":        cv_result is not None,
        "cv_face_detected":  cv_face_detected,
        "cv_dominant_state": cv_dominant,   # now a cognitive state, not AffectNet emotion
        "cv_windowed_probs": cv_windowed,
        "cv_latency_ms":     cv_latency,
        "cv_contributed":    fusion["cv_contributed"],

        # ── Anomaly layer ──────────────────────────────────────────────────
        "severity":        severity,
        "anomaly_score":   round(iso_score, 4),
        "zscore_analysis": zscore_analysis,
    }


# ─────────────────────────────────────────────
# SELF-TEST
# ─────────────────────────────────────────────

if __name__ == "__main__":
    import json

    mock_rf = {
        "state": "WrongApproach", "state_id": 4, "confidence": 0.58,
        "all_probs": {
            "Focused": 0.08, "Confused": 0.18, "Fatigued": 0.10,
            "Distracted": 0.06, "WrongApproach": 0.58,
        },
    }

    # CV now outputs cognitive states directly, not AffectNet emotions
    mock_cv = {
        "face_detected": True,
        "windowed_probs": {
            "Focused":       0.08,
            "Confused":      0.12,
            "Fatigued":      0.05,
            "Distracted":    0.00,   # always 0 from CV model
            "WrongApproach": 0.75,
        },
        "dominant_emotion": "WrongApproach",
        "latency_ms": 112.4,
    }

    mock_iso    = -0.13
    mock_zscore = {
        "deviant_features": [
            {"feature": "undo_redo_rate", "z": 4.2, "direction": "high"},
            {"feature": "click_rate_per_min", "z": 3.8, "direction": "high"},
            {"feature": "direction_reversals_per_min", "z": 3.1, "direction": "high"},
        ],
        "n_deviant": 3,
        "spike_alert": True,
        "composite_z": 2.8,
    }

    result = build_final_output(mock_rf, mock_iso, mock_zscore, mock_cv)
    print("Full output (with CV):")
    print(json.dumps(result, indent=2))

    print("\nFree tier output (no CV):")
    free = build_final_output(mock_rf, mock_iso, mock_zscore, cv_result=None)
    print(json.dumps({k: v for k, v in free.items() if "cv" not in k}, indent=2))
