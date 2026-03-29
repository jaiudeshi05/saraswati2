import os
import time
import google.generativeai as genai
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict, Any, Optional
from ...storage.session_store import session_store
from ...utils.helpers import build_gemini_prompt
from ...utils.constants import GEMINI_MODEL, GEMINI_MAX_TOKENS, GEMINI_TEMPERATURE
from dotenv import load_dotenv

load_dotenv()

router = APIRouter()

# In-memory cooldown dict: tab_id -> last_call_timestamp
gemini_cooldown = {}

class GeminiRequest(BaseModel):
    trigger: str
    context: Dict[str, Any]
    tab_id: Optional[str] = None

def parse_metadata(text: str):
    """Parses nudge type and severity from Gemini response body."""
    # Nudge Type: rethink_approach | micro_break | focus_deepening | path_correction
    nudge_type = 'focus_deepening'
    if 'rethink_approach' in text: nudge_type = 'rethink_approach'
    elif 'micro_break' in text: nudge_type = 'micro_break'
    elif 'path_correction' in text: nudge_type = 'path_correction'
    
    # Severity: low | medium | high
    severity = 'medium'
    if 'high' in text.lower(): severity = 'high'
    elif 'low' in text.lower(): severity = 'low'
    
    return nudge_type, severity

async def call_gemini(trigger: str, context: dict) -> dict:
    apiKey = os.getenv('GEMINI_API_KEY')
    if not apiKey:
        return {
            'insight': 'Keep going — I could not generate an insight right now.',
            'nudge_type': 'general',
            'severity': 'low'
        }

    try:
        genai.configure(api_key=apiKey)
        model = genai.GenerativeModel(GEMINI_MODEL)
        prompt = build_gemini_prompt(trigger, context)
        
        response = await model.generate_content_async(
            prompt,
            generation_config=genai.GenerationConfig(
                max_output_tokens=GEMINI_MAX_TOKENS,
                temperature=GEMINI_TEMPERATURE
            )
        )
        
        text = response.text
        nudge_type, severity = parse_metadata(text)
        
        # Strip potential metadata lines for final UI display
        lines = text.split('\n')
        clean_lines = [l for l in lines if 'Nudge Type:' not in l and 'Severity:' not in l and 'INSTRUCTIONS:' not in l]
        insight = " ".join(clean_lines).strip()
        
        return {
            'insight': insight,
            'nudge_type': nudge_type,
            'severity': severity
        }
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return {
            'insight': 'Keep going — I could not generate an insight right now.',
            'nudge_type': 'general',
            'severity': 'low'
        }

@router.post('/gemini/insights')
async def get_insights(request: GeminiRequest):
    tab_id = request.tab_id
    trigger = request.trigger
    context = request.context
    
    now = int(time.time())
    if tab_id and tab_id in gemini_cooldown:
        if now - gemini_cooldown[tab_id] < 600: # 10 min
            # Don't fail the request, just return placeholder or return actual call result?
            # Instruct says "Enforce per-tab 10-minute cooldown"
            # Return same as error/API missing to be safe
            return {
                'insight': 'Keep going — I could not generate an insight right now.',
                'nudge_type': 'general',
                'severity': 'low'
            }
            
    if tab_id:
        gemini_cooldown[tab_id] = now
        
    result = await call_gemini(trigger, context)
    
    # Record in history for dashboard
    session_store.add_nudge({
        "timestamp": int(time.time() * 1000),
        "trigger": trigger,
        **result
    })
    
    return result

@router.get('/gemini/history')
async def get_gemini_history(limit: int = 5):
    """Returns the last N Gemini insights for the dashboard feed."""
    return session_store.get_nudges(limit)
