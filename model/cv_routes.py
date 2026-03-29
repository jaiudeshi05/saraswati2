"""
cv_routes.py
============
FastAPI router that handles:
  1. POST /cv/analyze  — one-shot REST endpoint for a single frame (testing)
  2. WebSocket handler — cv frame messages are processed inline in the main WS

HOW TO INTEGRATE INTO YOUR EXISTING main.py:
─────────────────────────────────────────────
1. Copy this file to backend/cv_routes.py
2. In main.py, add at the top:
       from cv_routes import router as cv_router, get_cv_analyzer
       from cv_routes import handle_cv_frame
3. In main.py, after creating the FastAPI app:
       app.include_router(cv_router)
4. In main.py websocket_endpoint, add the CV frame handler inside the while loop
   (see WEBSOCKET INTEGRATION section at the bottom of this file).

Dependencies:
    pip install fastapi uvicorn mediapipe torch torchvision Pillow opencv-python-headless

Place in: backend/cv_routes.py
"""

import logging
import os
from functools import lru_cache
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from cv_analyzer import CVAnalyzer
from fusion import build_final_output

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────
# CONFIGURATION
# ─────────────────────────────────────────────

MODEL_PATH = os.environ.get("EMOTION_MODEL_PATH", "models/emotion_model.pt")
DEVICE     = os.environ.get("EMOTION_MODEL_DEVICE", "cpu")  # "cuda" if GPU available

# ─────────────────────────────────────────────
# SINGLETON ANALYZER
# ─────────────────────────────────────────────

_analyzer: Optional[CVAnalyzer] = None


def get_cv_analyzer() -> Optional[CVAnalyzer]:
    """
    Return the global CVAnalyzer singleton.
    Returns None if the model file doesn't exist (free tier / model not trained yet).
    """
    global _analyzer
    if _analyzer is not None:
        return _analyzer

    if not os.path.exists(MODEL_PATH):
        logger.warning(
            f"CV model not found at {MODEL_PATH}. "
            "CV features will be disabled. Train the model using train_cv_colab.py."
        )
        return None

    try:
        _analyzer = CVAnalyzer(model_path=MODEL_PATH, device=DEVICE)
        logger.info(f"CVAnalyzer initialized from {MODEL_PATH} on {DEVICE}")
        return _analyzer
    except Exception as e:
        logger.error(f"Failed to initialize CVAnalyzer: {e}")
        return None


# ─────────────────────────────────────────────
# ROUTER + ENDPOINTS
# ─────────────────────────────────────────────

router = APIRouter(prefix="/cv", tags=["computer-vision"])


class FrameRequest(BaseModel):
    session_id: str
    b64_frame:  str    # base64-encoded JPEG (with or without data URL prefix)


class CVStatusResponse(BaseModel):
    cv_available: bool
    model_path:   str
    device:       str
    stats:        Optional[dict] = None


@router.get("/status", response_model=CVStatusResponse)
async def cv_status():
    """Check if the CV model is loaded and available."""
    analyzer = get_cv_analyzer()
    return CVStatusResponse(
        cv_available = analyzer is not None,
        model_path   = MODEL_PATH,
        device       = DEVICE,
        stats        = analyzer.get_stats() if analyzer else None,
    )


@router.post("/analyze")
async def analyze_frame(req: FrameRequest):
    """
    One-shot REST endpoint for a single webcam frame.
    Primarily for testing — in production the WebSocket handler is used.

    Returns the raw CV analysis result (emotion probs + face detected flag).
    Does NOT perform fusion — that happens in the WebSocket handler where
    RF output is also available.
    """
    analyzer = get_cv_analyzer()
    if analyzer is None:
        raise HTTPException(
            status_code=503,
            detail="CV model not available. This is a premium feature. "
                   "Ensure emotion_model.pt is present in models/."
        )

    result = analyzer.analyze_frame(req.b64_frame)
    return result


@router.post("/reset/{session_id}")
async def reset_cv_window(session_id: str):
    """Reset the rolling window for a new session."""
    analyzer = get_cv_analyzer()
    if analyzer:
        analyzer.reset_window()
    return {"status": "ok", "session_id": session_id}


# ─────────────────────────────────────────────
# WEBSOCKET FRAME HANDLER
# ─────────────────────────────────────────────

async def handle_cv_frame(
    b64_frame: str,
    rf_result: Optional[dict],
    iso_score: float,
    zscore_analysis: dict,
) -> Optional[dict]:
    """
    Process a CV frame that arrived over the WebSocket.
    Called from the main WebSocket handler in main.py when a message
    of type "cv_frame" is received.

    Args:
        b64_frame:      base64 JPEG from the browser extension
        rf_result:      latest RF classification result (may be None if
                        no UX events processed yet this window)
        iso_score:      latest IsolationForest score
        zscore_analysis: latest z-score deviation dict

    Returns:
        Complete fused output dict, or None if CV unavailable.
    """
    analyzer = get_cv_analyzer()
    if analyzer is None:
        return None

    cv_result = analyzer.analyze_frame(b64_frame)

    # If we have RF output available, return a fused result
    if rf_result is not None:
        fused = build_final_output(
            rf_result      = rf_result,
            iso_score      = iso_score,
            zscore_analysis= zscore_analysis,
            cv_result      = cv_result,
        )
        return {"type": "state_update", **fused}

    # If RF hasn't produced output yet, return just the raw CV result
    return {"type": "cv_update", **cv_result}


# ─────────────────────────────────────────────
# COMPLETE UPDATED main.py
# Copy this entire block and use it as your main.py
# ─────────────────────────────────────────────

COMPLETE_MAIN_PY = '''
"""
main.py — Complete FastAPI backend with UX signals, CV, and fusion.
Run with: uvicorn main:app --reload --port 8000
"""

import json
import os
import logging
import numpy as np
import joblib
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# ── Your existing imports ──────────────────────────────────────────────────
from extractor import FeatureExtractor
from session import SessionManager
from generate_dataset import zscore_deviation, FEATURES, STATE_NAMES

# ── CV imports ─────────────────────────────────────────────────────────────
from cv_routes import router as cv_router, get_cv_analyzer, handle_cv_frame
from fusion import build_final_output

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Cognitive State Monitor API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include CV router
app.include_router(cv_router)

# ── Load models ────────────────────────────────────────────────────────────
RF_MODEL_PATH  = os.environ.get("RF_MODEL_PATH",  "cognitive_rf_model.pkl")
ISO_MODEL_PATH = os.environ.get("ISO_MODEL_PATH", "anomaly_iso_model.pkl")
ISO_SCALER_PATH= os.environ.get("ISO_SCALER_PATH","anomaly_scaler.pkl")
PROFILES_PATH  = os.environ.get("PROFILES_PATH",  "user_baseline_profiles.json")

rf     = joblib.load(RF_MODEL_PATH)
iso    = joblib.load(ISO_MODEL_PATH)
scaler = joblib.load(ISO_SCALER_PATH)

with open(PROFILES_PATH) as f:
    user_profiles = json.load(f)

logger.info("RF, IsoForest, and user profiles loaded.")

# ── Singletons ─────────────────────────────────────────────────────────────
extractor = FeatureExtractor()
sessions  = SessionManager()

# Pre-warm CV model at startup (avoids first-request latency)
@app.on_event("startup")
async def warmup():
    analyzer = get_cv_analyzer()
    if analyzer:
        logger.info("CV model warmed up at startup.")
    else:
        logger.info("CV model not available — running in free tier mode.")


# ── REST endpoints ─────────────────────────────────────────────────────────

@app.post("/session/start")
async def start_session():
    session_id = sessions.create()
    return {"session_id": session_id}

@app.get("/session/{session_id}/history")
async def get_history(session_id: str):
    return sessions.get_history(session_id)

@app.get("/session/{session_id}/state")
async def get_state(session_id: str):
    return sessions.get_latest(session_id)

@app.get("/health")
async def health():
    return {"status": "ok", "cv_available": get_cv_analyzer() is not None}


# ── WebSocket ──────────────────────────────────────────────────────────────

@app.websocket("/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket accepts two message types from the browser extension:

    1. UX events batch:
       { "type": "events", "events": [...], "user_id": "user_003" }

    2. CV frame (premium):
       { "type": "cv_frame", "frame": "<base64 JPEG>" }

    Responds with:
       { "type": "state_update", "state": "...", "confidence": ..., ... }
    """
    await websocket.accept()

    event_buffer = []
    latest_rf_result   = None
    latest_iso_score   = 0.0
    latest_zscore      = {"deviant_features": [], "n_deviant": 0,
                          "spike_alert": False, "composite_z": 0.0}
    user_id            = None

    try:
        while True:
            raw  = await websocket.receive_text()
            data = json.loads(raw)
            msg_type = data.get("type")

            # ── UX event batch ─────────────────────────────────────────────
            if msg_type == "events":
                user_id = data.get("user_id", "user_000")
                new_events = data.get("events", [])
                event_buffer.extend(new_events)

                # Keep only the last 30 seconds of events
                if new_events:
                    t_latest = new_events[-1]["t"]
                    event_buffer = [
                        e for e in event_buffer
                        if t_latest - e["t"] <= 30_000
                    ]

                if len(event_buffer) < 10:
                    # Not enough data yet
                    await websocket.send_text(json.dumps(
                        {"type": "waiting", "n_events": len(event_buffer)}
                    ))
                    continue

                # Feature extraction
                features = extractor.extract(event_buffer)
                feat_vec = [features[f] for f in FEATURES]

                # RF classification
                probs     = rf.predict_proba([feat_vec])[0]
                state_idx = int(np.argmax(probs))
                rf_result = {
                    "state":      STATE_NAMES[state_idx],
                    "state_id":   state_idx,
                    "confidence": round(float(probs[state_idx]), 4),
                    "all_probs":  {
                        STATE_NAMES[i]: round(float(p), 4)
                        for i, p in enumerate(probs)
                    },
                }
                latest_rf_result = rf_result

                # IsolationForest
                feat_scaled     = scaler.transform([feat_vec])
                iso_score       = float(iso.decision_function(feat_scaled)[0])
                latest_iso_score = iso_score

                # Z-score deviation
                user_profile = user_profiles.get(user_id, user_profiles["user_000"])
                baseline     = user_profile["feature_baseline"]
                zscore       = zscore_deviation(features, baseline)
                latest_zscore = zscore

                # Build output (CV=None unless cv_frame arrives separately)
                output = build_final_output(
                    rf_result       = rf_result,
                    iso_score       = iso_score,
                    zscore_analysis = zscore,
                    cv_result       = None,
                )
                output["type"]     = "state_update"
                output["features"] = features

                sessions.record(session_id, output, features)
                await websocket.send_text(json.dumps(output))

            # ── CV frame (premium) ─────────────────────────────────────────
            elif msg_type == "cv_frame":
                b64_frame = data.get("frame", "")
                if not b64_frame:
                    continue

                cv_output = await handle_cv_frame(
                    b64_frame       = b64_frame,
                    rf_result       = latest_rf_result,
                    iso_score       = latest_iso_score,
                    zscore_analysis = latest_zscore,
                )
                if cv_output:
                    await websocket.send_text(json.dumps(cv_output))

            # ── Ping ───────────────────────────────────────────────────────
            elif msg_type == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))

    except WebSocketDisconnect:
        logger.info(f"Session {session_id} disconnected.")
        sessions.close(session_id)
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
        sessions.close(session_id)
'''

if __name__ == "__main__":
    print("This file is a module — import it into main.py.")
    print("The COMPLETE_MAIN_PY string above contains the full updated main.py.")
    print("Copy it and save as backend/main.py.")
