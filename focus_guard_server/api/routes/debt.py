from fastapi import APIRouter
from pydantic import BaseModel
from ...storage.debt_store import debt_store

router = APIRouter()

class DebtRequest(BaseModel):
    session_summary: dict

@router.post('/debt')
async def update_debt(request: DebtRequest):
    summary = request.session_summary
    
    # Base calculation via singleton store
    result = debt_store.compute_current_debt(summary)
    
    # ⚠️ DROP-IN MODULE — provided separately by ML team
    # Expected: score_debt(session_summary: dict, history: list) -> float
    # Returns: float 0-100 representing refined debt score
    try:
        from ...inference.debt_engine import score_debt
        refined_score = score_debt(summary, debt_store.get_history())
        result['current_debt'] = refined_score
    except ImportError:
        pass # use the base result computed from debt_store
    
    # Persist the latest entry
    import time
    debt_store.append_entry({
        'timestamp': int(time.time() * 1000),
        'current_debt': result['current_debt'],
        'delta': result['debt_delta']
    })
    
    return result
