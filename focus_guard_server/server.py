import os
import uvicorn
from fastapi import FastAPI
from .api.middleware.cors import setup_cors
from .api.routes import health, predict, debt, session, gemini, cv
from .storage.db import init_db
from pathlib import Path

# Main application
app = FastAPI(
    title='FocusGuard API',
    description='Attention & Cognitive State Monitor',
    version='1.0.0'
)

# CORS configuration
setup_cors(app)

# Include endpoint routers
app.include_router(health.router)
app.include_router(predict.router)
app.include_router(debt.router)
app.include_router(cv.router)
app.include_router(session.router)
app.include_router(gemini.router)

@app.on_event('startup')
async def startup_event():
    # 1. Initialize DB
    await init_db()
    
    # 2. Ensure data directories exist
    data_dir = Path('data')
    sessions_dir = data_dir / 'sessions'
    data_dir.mkdir(parents=True, exist_ok=True)
    sessions_dir.mkdir(parents=True, exist_ok=True)
    
    # 3. Attempt to load drop-in ML modules (for logging purposes)
    try:
        from .inference import state_classifier
        print("✅ Drop-in ML: state_classifier loaded.")
    except ImportError:
        print("⚠️ Drop-in ML: state_classifier missing — fallback logic activated.")
        
    try:
        from .inference import debt_engine
        print("✅ Drop-in ML: debt_engine loaded.")
    except ImportError:
        print("⚠️ Drop-in ML: debt_engine missing — rule-based debt calculation activated.")
        
    print("🚀 FocusGuard server ready on http://0.0.0.0:5000")

@app.on_event('shutdown')
def shutdown_event():
    print("🔌 FocusGuard server shutting down...")

if __name__ == '__main__':
    uvicorn.run("focus_guard_server.server:app", host='0.0.0.0', port=5000, reload=True)
