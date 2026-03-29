import os
import sys
import logging
from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel
from pathlib import Path

logger = logging.getLogger(__name__)
router = APIRouter(tags=['cv'])

# Import cv_analyzer_v2 directly from model/ directory!
model_dir = str((Path(__file__).parent.parent.parent.parent / "model").resolve())
if model_dir not in sys.path:
    sys.path.append(model_dir)

try:
    from cv_analyzer_v2 import CVAnalyzer
    _cv_analyzer_available = True
except Exception as e:
    logger.warning(f"cv_analyzer_v2 not available: {e} — /cv endpoint will return mock responses.")
    CVAnalyzer = None  # type: ignore
    _cv_analyzer_available = False

MODEL_PATH = os.path.join(model_dir, "emotion_model.pt")
_analyzer: Optional[object] = None

def get_analyzer():
    global _analyzer
    if _analyzer is None:
        try:
            _analyzer = CVAnalyzer(model_path=MODEL_PATH)
            logger.info(f"Loaded CVAnalyzer from {MODEL_PATH}")
        except Exception as e:
            logger.error(f"CVAnalyzer loading failed: {e}")
    return _analyzer

class FrameRequest(BaseModel):
    tab_id: str
    frame: str
    timestamp: int

@router.post("/cv")
async def analyze_cv(req: FrameRequest):
    analyzer = get_analyzer()
    if analyzer is None:
        return {"mock": True, "error": "Model not loaded"}

    b64 = req.frame
    if b64.startswith("data:"):
        b64 = b64.split(",", 1)[1]

    # Pass the base64 JPEG
    res = analyzer.analyze_frame(b64)
    
    # Store the cv_windowed_probs in session_store
    from ...storage.session_store import session_store
    if not hasattr(session_store, "cv_results"):
        session_store.cv_results = {}
        
    # 'offscreen' is the designated tab id for webcam frame submission
    session_store.cv_results['offscreen'] = res
    
    return res
