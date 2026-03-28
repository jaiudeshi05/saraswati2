import json
import time
from pathlib import Path
from ..utils.constants import DEBT_HISTORY_FILE, DEBT_DECAY_FACTOR, DEBT_ACCUMULATION_WEIGHTS
from ..utils.helpers import load_json_file, save_json_file, clamp

class DebtStore:
    """Persistent 30-day debt history singleton."""
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(DebtStore, cls).__new__(cls)
            cls._instance._load()
        return cls._instance

    def _load(self):
        self.history = load_json_file(DEBT_HISTORY_FILE)
        # Ensure it's a list
        if not isinstance(self.history, list):
            self.history = []

    def get_history(self) -> list[dict]:
        """Returns last 30 entries."""
        return self.history[-30:]

    def get_latest(self) -> dict | None:
        return self.history[-1] if self.history else None

    def append_entry(self, entry: dict) -> None:
        """Appends, trims to 30, and saves atomically."""
        self.history.append(entry)
        if len(self.history) > 30:
            self.history = self.history[-30:]
        save_json_file(DEBT_HISTORY_FILE, self.history)

    def compute_current_debt(self, session_summary: dict) -> dict:
        """Implements the cognitive debt formula for the current session state."""
        
        latest = self.get_latest()
        yesterday_debt = latest.get('current_debt', 20.0) if latest else 20.0
        
        # 1. Start with yesterday's debt applying decay
        base_debt = yesterday_debt * DEBT_DECAY_FACTOR
        
        # 2. Add today's accumulation from signals
        # Weight current distractions and fixations
        distraction_factor = session_summary.get('active_tabs', 1) * DEBT_ACCUMULATION_WEIGHTS.get('distraction_ratio', 0.4)
        fixation_factor = session_summary.get('fixation_episodes', 0) * DEBT_ACCUMULATION_WEIGHTS.get('fixation_episodes', 0.25)
        undo_factor = (session_summary.get('total_undo_loops', 0) / 10.0) * DEBT_ACCUMULATION_WEIGHTS.get('undo_redo_loops', 0.1)
        
        accumulation = distraction_factor + fixation_factor + undo_factor
        current_debt = clamp(base_debt + accumulation, 0, 100)
        
        # 3. Forecast EOD (simple rate projection)
        # Assume 8-hour day (480 mins). 
        # For simplicity, forecast = current_debt + (accumulation * multiplier)
        forecast_eod = clamp(current_debt + (accumulation * 5), 0, 100)
        
        delta = current_debt - yesterday_debt
        
        return {
            'current_debt': float(round(current_debt, 2)),
            'debt_delta': float(round(delta, 2)),
            'forecast_eod': float(round(forecast_eod, 2)),
            'high_stakes_warning': current_debt > 80.0
        }

# Module-level singleton
debt_store = DebtStore()
