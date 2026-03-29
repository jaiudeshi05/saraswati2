import numpy as np

class SessionStore:
    """In-memory session buffer per tabId (singleton)."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(SessionStore, cls).__new__(cls)
            cls._instance.sessions = {} # tabId -> list[dict]
            cls._instance.current_goal = "Default Goal"
            cls._instance.current_session_id = None
            cls._instance.start_ts = None
            cls._instance.nudge_history = []
        return cls._instance

    def add_nudge(self, nudge: dict) -> None:
        self.nudge_history.append(nudge)
        if len(self.nudge_history) > 100:
            self.nudge_history.pop(0)

    def get_nudges(self, limit: int = 5) -> list[dict]:
        return self.nudge_history[-limit:][::-1]

    def add_snapshot(self, tab_id: str, snapshot: dict) -> None:
        """Appends to buffer, pops oldest if > 100."""
        if tab_id not in self.sessions:
            self.sessions[tab_id] = []
        
        self.sessions[tab_id].append(snapshot)
        if len(self.sessions[tab_id]) > 100:
            self.sessions[tab_id].pop(0)

    def get_state_distribution(self) -> dict[str, float]:
        """Calculates percentage of time spent in each state across all snapshots."""
        all_snapshots = [s for tab in self.sessions.values() for s in tab]
        if not all_snapshots:
            return {label: 0.0 for label in ['focused', 'distracted', 'fatigued', 'stuck', 'fixating', 'wrong_problem']}
        
        counts = {}
        for s in all_snapshots:
            state = s.get('state', 'distracted')
            counts[state] = counts.get(state, 0) + 1
            
        total = len(all_snapshots)
        return {state: (count / total) for state, count in counts.items()}

    def get_heatmap_data(self) -> list[dict]:
        """Returns a simplified time-series of dominant states."""
        # This is a mock/placeholder for the actual time-series logic
        # In a real app we would aggregate by minute
        return [{"timestamp": s['timestamp'], "state": s.get('state', 'focused')} 
                for tab in self.sessions.values() for s in tab][-60:]

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

        def kb_get(kb: dict, snake: str, camel: str, default=0):
            """Try snake_case first, then camelCase, then default."""
            return kb.get(snake, kb.get(camel, default))

        wpms, backspace_ratios, undu_loops = [], [], []
        for s in all_snapshots:
            kb = s.get('keyboard') or {}
            wpms.append(kb_get(kb, 'wpm', 'wpm', 0.0))
            backspace_ratios.append(kb_get(kb, 'backspace_ratio', 'backspaceRatio', 0.0))
            undu_loops.append(kb_get(kb, 'undo_redo_loops', 'undoRedoLoops', 0))

        # Count fixation episodes
        fixations = 0
        for tab_id in self.sessions:
            tab_snaps = self.sessions[tab_id]
            if len(tab_snaps) > 0:
                kb = tab_snaps[-1].get('keyboard') or {}
                if kb_get(kb, 'undo_redo_loops', 'undoRedoLoops', 0) > 4:
                    fixations += 1

        return {
            'total_snapshots': len(all_snapshots),
            'active_tabs': len(self.sessions),
            'avg_wpm': float(np.mean(wpms)) if wpms else 0.0,
            'avg_backspace_ratio': float(np.mean(backspace_ratios)) if backspace_ratios else 0.0,
            'total_undo_loops': int(sum(undu_loops)) if undu_loops else 0,
            'total_task_switches': max(0, len(self.sessions) - 1),
            'fixation_episodes': fixations,
            'state_distribution': self.get_state_distribution()
        }

# Module-level singleton
session_store = SessionStore()
