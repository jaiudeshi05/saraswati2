from pathlib import Path

# Classifier labels
STATE_LABELS: list[str] = ['focused', 'distracted', 'fatigued', 'stuck', 'fixating', 'wrong_problem']

# Debt formula constants
DEBT_DECAY_FACTOR: float = 0.85
DEBT_ACCUMULATION_WEIGHTS: dict[str, float] = {
    'distraction_ratio': 0.4,
    'undo_redo_loops': 0.1,
    'fixation_episodes': 0.25,
    'task_switches': 0.25
}

# Gemini API configuration
GEMINI_MODEL: str = 'gemini-1.5-flash'
GEMINI_MAX_TOKENS: int = 512
GEMINI_TEMPERATURE: float = 0.7

# Session monitoring
SESSION_IDLE_TIMEOUT_MIN: int = 15

# Directory paths relative to focus-guard-server/ (this script)
SERVER_ROOT = Path(__file__).parent.parent
DATA_DIR = SERVER_ROOT / 'data'
SESSIONS_DIR = DATA_DIR / 'sessions'
DEBT_HISTORY_FILE = DATA_DIR / 'debt_history.json'
DATABASE_FILE = DATA_DIR / 'focusguard.db'
