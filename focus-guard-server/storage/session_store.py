import numpy as np

class SessionStore:
    """In-memory session buffer per tabId (singleton)."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionStore, cls).__new__(cls)
            cls._instance.sessions = {} # tabId -> list[dict]
        return cls._instance

    def add_snapshot(self, tab_id: str, snapshot: dict) -> None:
        """Appends to buffer, pops oldest if > 100."""
        if tab_id not in self.sessions:
            self.sessions[tab_id] = []
        
        self.sessions[tab_id].append(snapshot)
        if len(self.sessions[tab_id]) > 100:
            self.sessions[tab_id].pop(0)

    def get_buffer(self, tab_id: str) -> list[dict]:
        return self.sessions.get(tab_id, [])

    def get_all_tab_ids(self) -> list[str]:
        return list(self.sessions.keys())

    def clear_tab(self, tab_id: str) -> None:
        if tab_id in self.sessions:
            del self.sessions[tab_id]

    def get_session_summary(self) -> dict:
        """Aggregates across all tabs and returns summary statistics."""
        all_snapshots = [s for tab in self.sessions.values() for s in tab]
        
        if not all_snapshots:
            return {
                'total_snapshots': 0,
                'active_tabs': 0,
                'avg_wpm': 0.0,
                'avg_backspace_ratio': 0.0,
                'total_undo_loops': 0,
                'total_task_switches': 0,
                'fixation_episodes': 0
            }

        wpms = [s['keyboard']['wpm'] for s in all_snapshots if 'keyboard' in s]
        backspace_ratios = [s['keyboard']['backspace_ratio'] for s in all_snapshots if 'keyboard' in s]
        undu_loops = [s['keyboard']['undo_redo_loops'] for s in all_snapshots if 'keyboard' in s]
        
        # Count episodes of low exploration + high undo loops (simplified fixation proxy)
        fixations = 0
        for tab_id in self.sessions:
            tab_snaps = self.sessions[tab_id]
            if len(tab_snaps) > 0:
                last_snap = tab_snaps[-1]
                if last_snap['keyboard'].get('undo_redo_loops', 0) > 4:
                    fixations += 1

        return {
            'total_snapshots': len(all_snapshots),
            'active_tabs': len(self.sessions),
            'avg_wpm': float(np.mean(wpms)) if wpms else 0.0,
            'avg_backspace_ratio': float(np.mean(backspace_ratios)) if backspace_ratios else 0.0,
            'total_undo_loops': int(sum(undu_loops)) if undu_loops else 0,
            'total_task_switches': len(self.sessions) - 1, # Proxy: more tabs open = more potential switches
            'fixation_episodes': fixations
        }

# Module-level singleton
session_store = SessionStore()
