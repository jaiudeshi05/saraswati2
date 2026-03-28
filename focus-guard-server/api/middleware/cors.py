from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI

def setup_cors(app: FastAPI):
    """
    CORS configuration for FocusGuard.
    Note: allow_origins=['*'] is for hackathon speed but should be restricted in production.
    """
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
