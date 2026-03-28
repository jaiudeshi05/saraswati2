import aiosqlite
import json
from pathlib import Path
from ..utils.constants import DATABASE_FILE

async def init_db():
    """Creates tables if not exists on startup."""
    DATABASE_FILE.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(DATABASE_FILE) as db:
        # Sessions table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS sessions (
                id TEXT PRIMARY KEY,
                goal TEXT,
                start_ts INTEGER,
                end_ts INTEGER,
                quality_score REAL,
                debt_added REAL,
                data JSON
            )
        ''')
        
        # Fixation log table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS fixation_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tab_id TEXT,
                ts INTEGER,
                duration_sec INTEGER,
                resolved BOOLEAN,
                context JSON
            )
        ''')
        
        # High-stakes log table
        await db.execute('''
            CREATE TABLE IF NOT EXISTS high_stakes_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tab_id TEXT,
                ts INTEGER,
                action_text TEXT,
                debt_at_time REAL,
                proceeded BOOLEAN
            )
        ''')
        await db.commit()

async def save_session(session: dict) -> None:
    """Inserts a completed or updated session record."""
    async with aiosqlite.connect(DATABASE_FILE) as db:
        await db.execute('''
            INSERT OR REPLACE INTO sessions (id, goal, start_ts, end_ts, quality_score, debt_added, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            session.get('id'),
            session.get('goal'),
            session.get('start_ts'),
            session.get('end_ts'),
            session.get('quality_score'),
            session.get('debt_added'),
            json.dumps(session.get('data', {}))
        ))
        await db.commit()

async def get_sessions(limit: int = 30) -> list[dict]:
    """Returns recent sessions."""
    async with aiosqlite.connect(DATABASE_FILE) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute('SELECT * FROM sessions ORDER BY start_ts DESC LIMIT ?', (limit,)) as cursor:
            rows = await cursor.fetchall()
            return [dict(row) for row in rows]

async def save_fixation(entry: dict) -> None:
    """Inserts fixation log entry."""
    async with aiosqlite.connect(DATABASE_FILE) as db:
        await db.execute('''
            INSERT INTO fixation_log (tab_id, ts, duration_sec, resolved, context)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            entry.get('tab_id'),
            entry.get('ts'),
            entry.get('duration_sec'),
            entry.get('resolved'),
            json.dumps(entry.get('context', {}))
        ))
        await db.commit()

async def save_high_stakes(entry: dict) -> None:
    """Inserts high-stakes log entry."""
    async with aiosqlite.connect(DATABASE_FILE) as db:
        await db.execute('''
            INSERT INTO high_stakes_log (tab_id, ts, action_text, debt_at_time, proceeded)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            entry.get('tab_id'),
            entry.get('ts'),
            entry.get('action_text'),
            entry.get('debt_at_time'),
            entry.get('proceeded')
        ))
        await db.commit()
