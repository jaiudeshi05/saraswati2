import time
import json
import os
from pathlib import Path
from tempfile import NamedTemporaryFile

def get_timestamp() -> int:
    """Current unix ms."""
    return int(time.time() * 1000)

def load_json_file(path: Path) -> list | dict:
    """Loads JSON, returns empty list/dict if file not found."""
    if not path.exists():
        return [] if 'history' in path.name.lower() else {}
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return [] if 'history' in path.name.lower() else {}

def save_json_file(path: Path, data: list | dict) -> None:
    """Writes JSON atomically."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with NamedTemporaryFile('w', delete=False, dir=path.parent, suffix='.tmp') as tf:
        json.dump(data, tf, indent=2)
        tempname = tf.name
    os.replace(tempname, path)

def clamp(val: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(val, max_val))

def rolling_decay(history: list[dict], decay: float) -> list[dict]:
    """Applies exponential decay to debt values if needed."""
    # This is a placeholder for more complex logic if required by ML team
    return history

def build_gemini_prompt(trigger: str, context: dict) -> str:
    """Constructs the full Gemini prompt string based on trigger type."""
    
    goal = context.get('goal', 'Unknown Goal')
    url = context.get('current_url', 'Unknown URL')
    state = context.get('state', 'Unknown State')
    signals = ", ".join(context.get('dominant_signals', ['No signals']))
    mood = context.get('mood', 'neutral')
    debt = context.get('debt_score', 0)
    time_on_url = context.get('time_on_url_minutes', 0)

    # Base templates
    templates = {
        'wrong_problem': (
            f"Student Goal: {goal}\n"
            f"Current URL: {url}\n"
            f"Time on this file/page: {time_on_url}m\n"
            f"Detected State: {state}\n"
            f"Dominant Signals: {signals}\n"
            f"Mood: {mood}\n"
            "The student is fixating or showing signs of 'wrong problem' risk. "
            "They are rewriting the same lines or stuck in undo loops without exploring alternatives. "
            "Give them a nudge that helps them see the bigger picture, suggesting where they might be misaligning efforts."
        ),
        'stuck': (
             f"Student Goal: {goal}\n"
             f"Current URL: {url}\n"
             f"Detected State: {state}\n"
             "The student has been idle with low progress. "
             "Break the block with a concrete next step or a small question to get them moving."
        ),
        'fatigue': (
             f"Student Goal: {goal}\n"
             f"Current URL: {url}\n"
             "The student's behavioral signal quality is degrading, suggesting fatigue. "
             "Recommend a short specific break activity related to leur goal."
        ),
        'debt_warning': (
             f"Current Cognitive Debt: {debt}%\n"
             "The student is attempting a high-stakes action with high multi-day cognitive debt. "
             "Warn them clearly about the risk of burnout or error."
        ),
        'on_demand': (
             f"Student Goal: {goal}\n"
             f"Current Session Status: {state} with {debt}% debt.\n"
             "Summarize their current cognitive trajectory and offer one strategic adjustment."
        )
    }

    prompt = templates.get(trigger, templates['on_demand'])
    
    # Generic wrapper for instruction
    instruction = (
        "\n\nINSTRUCTIONS:\n"
        "1. Be supportive but direct (concise, max 120 words).\n"
        "2. Parseable Nudge Type: rethink_approach | micro_break | focus_deepening | path_correction.\n"
        "3. Parseable Severity: low | medium | high.\n"
        "4. Include one line of 'Insight' followed by types at the end."
    )
    
    return prompt + instruction
