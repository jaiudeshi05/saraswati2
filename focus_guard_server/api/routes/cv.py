import base64
import numpy as np
import cv2
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any

router = APIRouter()

class CVRequest(BaseModel):
    tab_id: str
    frame: str # base64 JPEG
    timestamp: int

def mock_cv_result() -> dict:
    """Mock CV values when driver is missing."""
    return {
        'eye_openness': 0.61,
        'blink_rate': 18,
        'head_pose': { 'yaw': 12, 'pitch': -5 },
        'fatigue_level': 0.44,
        'mood': 'neutral',
        'mood_confidence': 0.71,
        'mock': True
    }

@router.post('/cv')
async def analyze_camera_frame(request: CVRequest):
    """Webcam frame analysis — mood, fatigue, eye tracking."""
    
    # Base64 to image
    try:
        header, encoded = request.frame.split(',', 1) if ',' in request.frame else ('', request.frame)
        data = base64.b64decode(encoded)
        nparr = np.frombuffer(data, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    except Exception as e:
        return {'status': 'error', 'message': 'Invalid base64 frame payload'}
        
    # ⚠️ DROP-IN MODULE — provided separately by ML team
    # Expected: analyze_frame(frame: np.ndarray) -> dict
    # Returns: { eye_openness, blink_rate, head_pose, fatigue_level, mood, mood_confidence }
    try:
        from ...inference.cv_engine import analyze_frame
        result = analyze_frame(frame)
    except ImportError:
        result = mock_cv_result()
        
    return result
