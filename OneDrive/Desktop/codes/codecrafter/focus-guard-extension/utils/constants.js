/**
 * FocusGuard Constants & Configuration
 * 
 * All magic numbers and shared enums for the extension.
 * Frozen to prevent runtime modifications.
 */

const CONSTANTS = Object.freeze({
  API: {
    BASE_URL: 'http://localhost:5000'
  },
  
  ALARMS: {
    INFERENCE: 'inference-tick',
    DEBT: 'debt-tick',
    GEMINI: 'gemini-tick',
    SESSION_CHECK: 'session-end-check'
  },
  
  // Intervals and Thresholds derived from timers.js if available
  // Fallback to defaults to remain robust
  INTERVALS: (typeof self.FG_TIMERS !== 'undefined') ? self.FG_TIMERS.INTERVALS : {
    inference: 5 / 60, // 5 seconds
    debt: 10,
    gemini: 5,
    sessionCheck: 15
  },
  
  THRESHOLDS: (typeof self.FG_TIMERS !== 'undefined') ? self.FG_TIMERS.THRESHOLDS : {
    softAlertMin: 3,
    hardAlertMin: 7,
    stuckMin: 8,
    debtHigh: 70,
    debtCritical: 85,
    geminiCooldownMin: 10
  },
  
  STATES: {
    FOCUSED: 'FOCUSED',
    DISTRACTED: 'DISTRACTED',
    FATIGUED: 'FATIGUED',
    CONFUSED: 'CONFUSED',
    WRONG_PROBLEM: 'WRONG_PROBLEM',
    STUCK: 'STUCK',
    FIXATING: 'FIXATING'
  },
  
  ALERT_TYPES: {
    BADGE: 'BADGE',
    NOTIFICATION: 'NOTIFICATION',
    NUDGE_CARD: 'NUDGE_CARD',
    REFLECTION_OVERLAY: 'REFLECTION_OVERLAY',
    BREAK_BANNER: 'BREAK_BANNER'
  },
  
  STORAGE_KEYS: {
    TAB_STATE: (tabId) => `tab_state_${tabId}`,
    HEATMAP: (tabId) => `heatmap_${tabId}`,
    DEBT_HISTORY: 'debt_history',
    SESSION_GOAL: 'session_goal',
    CURRENT_SESSION: 'current_session',
    ALL_SESSIONS: 'all_sessions',
    FIXATION_LOG: 'fixation_log',
    HIGH_STAKES_LOG: 'high_stakes_log',
    SETTINGS: 'settings'
  },
  
  HIGH_STAKES_KEYWORDS: [
    'Deploy', 'Submit', 'Publish', 'Send', 'Delete', 'Confirm', 
    'Reset', 'Remove', 'Overwrite', 'Terminate', 'Revoke'
  ]
});

// Since this is for standard browser JS (no ES modules in content scripts in MV3 reliably without bundling)
// but used in service worker and potentially content scripts via background, 
// for simplicity in this hackathon MV3 project, we'll export it for Node-like or ES module where supported, 
// or define on global if necessary, but here we'll use export for background and tracker/content logic.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONSTANTS;
} else if (typeof esModuleExport !== 'undefined') {
  // ES module syntax
  // Note: we avoid using the 'export' keyword directly as a variable name here
  esModuleExport.default = CONSTANTS;
} else {
  // Global scope - fallback to 'self' if 'window' is undefined (MV3 background)
  const root = (typeof self !== 'undefined') ? self : (typeof window !== 'undefined' ? window : {});
  root.FG_CONSTANTS = CONSTANTS;
}
