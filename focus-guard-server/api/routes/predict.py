from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Dict, Any, Optional
from ...storage.session_store import session_store

router = APIRouter()

class SignalGroup(BaseModel):
    velocity: float = 0.0
    reversals: int = 0
    variance: float = 0.0
    dwellMap: Optional[Dict[str, int]] = None
    clickFrequency: Optional[float] = 0.0
    clickTargetTypes: Optional[Dict[str, int]] = None
    doubleClickBursts: Optional[int] = 0
    cursorVelocity: Optional[float] = 0.0
    cursorIdleTime: Optional[float] = 0.0
    fixatedQuadrant: Optional[str] = 'none'
    wpm: float = 0.0
    backspaceRatio: float = 0.0
    undoRedoLoops: int = 0
    pasteRepeat: int = 0
    saveEditCycles: int = 0
    burstPauseRatio: float = 0.0
    timeOnUrl: float = 0.0
    explorationSignal: bool = False

class PredictRequest(BaseModel):
    tab_id: str
    url: str
    timestamp: int
    scroll: Optional[Dict[str, Any]] = None
    mouse: Optional[Dict[str, Any]] = None
    keyboard: Optional[Dict[str, Any]] = None
    navigation: Optional[Dict[str, Any]] = None

def fallback_classify(snapshot: dict) -> dict:
    """Python mirror of extension's fallback_classifier logic."""
    k = snapshot.get('keyboard', {})
    s = snapshot.get('scroll', {})
    m = snapshot.get('mouse', {})
    n = snapshot.get('navigation', {})
    
    # Defaults
    res = {
        'state': 'distracted',
        'confidence': 0.5,
        'dominant_signal': 'default',
        'wrong_problem_risk': 0.1
    }

    # FIXATING
    if k.get('undoRedoLoops', 0) > 4 and s.get('variance', 1.0) < 0.05 and not n.get('explorationSignal', False):
        res.update({'state': 'fixating', 'confidence': 0.8, 'dominant_signal': 'undo_redo_loops', 'wrong_problem_risk': 0.7})
    # STUCK
    elif m.get('cursorIdleTime', 0) > 120 and k.get('wpm', 10) < 5:
        res.update({'state': 'stuck', 'confidence': 0.9, 'dominant_signal': 'cursor_idle_time'})
    # FOCUSED (simple)
    elif k.get('wpm', 0) > 40:
        res.update({'state': 'focused', 'confidence': 0.9, 'dominant_signal': 'high_wpm'})
        
    return res

@router.post('/predict')
async def predict_state(request: PredictRequest):
    snapshot_dict = request.model_dump()
    session_store.add_snapshot(request.tab_id, snapshot_dict)
    
    # ⚠️ DROP-IN MODULE — provided separately by ML team
    # Expected: classify_state(snapshot_dict: dict) -> dict
    # Returns: { state, confidence, dominant_signal, wrong_problem_risk }
    try:
        from ...inference.state_classifier import classify_state
        result = classify_state(snapshot_dict)
    except ImportError:
        result = fallback_classify(snapshot_dict)

    # Threshold alerts
    alert = False
    alert_type = None
    if result.get('wrong_problem_risk', 0) > 0.65:
        alert = True
        alert_type = 'wrong_problem'
    elif result['state'] == 'stuck':
        alert = True
        alert_type = 'stuck'

    # Build gemini context hint
    hint = f"User on URL {request.url[:30]}... state is {result['state'].upper()}. Dominant: {result['dominant_signal']}"

    return {
        'state': result['state'],
        'confidence': result['confidence'],
        'dominant_signal': result['dominant_signal'],
        'wrong_problem_risk': result.get('wrong_problem_risk', 0.0),
        'alert': alert,
        'alert_type': alert_type,
        'gemini_context_hint': hint
    }
