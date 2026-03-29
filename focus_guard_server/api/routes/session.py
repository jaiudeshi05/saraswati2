from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any
from ...storage.db import save_session, get_sessions
from ...storage.session_store import session_store

router = APIRouter()

class SessionStart(BaseModel):
    session_id: str
    goal: str
    timestamp: int

class SessionEnd(BaseModel):
    session_id: str
    duration_minutes: float
    tab_count: int
    final_state_distribution: Dict[str, float]

@router.post('/session/start')
async def start_session(request: SessionStart):
    session_store.current_goal = request.goal
    session_store.current_session_id = request.session_id
    session_store.start_ts = request.timestamp

    await save_session({
        'id': request.session_id,
        'goal': request.goal,
        'start_ts': request.timestamp,
        'status': 'active'
    })
    return { 'acknowledged': True }

@router.post('/session/end')
async def end_session(request: SessionEnd):
    """Closes session, computes quality score, updates debt."""
    
    # Compute session quality score
    # focused=1.0, distracted=0.3, fixating=0.4, fatigued=0.5, wrong_problem=0.2, stuck=0.35
    weights = {'focused': 1.0, 'distracted': 0.3, 'fixating': 0.4, 'fatigued': 0.5, 'wrong_problem': 0.2, 'stuck': 0.35}
    quality_score = 0.0
    for state, pct in request.final_state_distribution.items():
        quality_score += weights.get(state, 0.5) * pct
        
    # Aggregate summary from store before clearing
    summary = session_store.get_session_summary()
    debt_added = (100.0 - (quality_score * 100.0)) * 0.1 # Placeholder formula
    
    # Persistence
    await save_session({
        'id': request.session_id,
        'end_ts': 0, # Should calculate or get from request
        'quality_score': float(quality_score),
        'debt_added': float(debt_added),
        'data': { 'summary': summary, 'states': request.final_state_distribution }
    })
    
    # Clear per-tab buffers
    for tab_id in session_store.get_all_tab_ids():
        session_store.clear_tab(tab_id)
        
    return { 
        'session_quality_score': float(quality_score), 
        'debt_added': float(debt_added)
    }

@router.get('/session/history')
async def list_sessions(limit: int = 30):
    return await get_sessions(limit)

@router.get('/session/current')
async def get_current_session():
    """Returns the currently active session metadata."""
    return {
        "session_id": session_store.current_session_id,
        "goal": session_store.current_goal,
        "start_ts": session_store.start_ts,
        "active": session_store.current_session_id is not None
    }

@router.get('/stats/summary')
async def get_stats_summary():
    """Aggregates across all active tabs and returns live summary statistics."""
    try:
        return session_store.get_session_summary()
    except Exception as e:
        return {
            'total_snapshots': 0, 'active_tabs': 0,
            'avg_wpm': 0.0, 'avg_backspace_ratio': 0.0,
            'total_undo_loops': 0, 'total_task_switches': 0,
            'fixation_episodes': 0, 'error': str(e)
        }

@router.get('/stats/heatmap')
async def get_stats_heatmap():
    """Returns time-series heatmap data for the dashboard."""
    try:
        return {"heatmap": session_store.get_heatmap_data()}
    except Exception as e:
        return {"heatmap": [], "error": str(e)}
