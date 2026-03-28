import time
from fastapi import APIRouter

router = APIRouter()

@router.get('/health')
async def health_check():
    """Server and model availability check."""
    
    missing_modules = []
    
    try:
        from ...inference import state_classifier
    except ImportError:
        missing_modules.append('inference.state_classifier')
        
    try:
        from ...inference import debt_engine
    except ImportError:
        missing_modules.append('inference.debt_engine')

    try:
        from ...inference import cv_engine
    except ImportError:
        missing_modules.append('inference.cv_engine')

    return {
        'status': 'ok',
        'models_loaded': len(missing_modules) == 0,
        'missing_modules': missing_modules,
        'version': '1.0.0',
        'timestamp': int(time.time() * 1000)
    }
