/**
 * FocusGuard Alarm Timers & Thresholds
 * 
 * This file contains all timing-related constants for alarms and alerts.
 * Editable by the hackathon user.
 */

const FG_TIMERS = {
  INTERVALS: {
    inference: 5 / 60, // 5 seconds (in minutes)
    debt: 10,
    gemini: 5,
    sessionCheck: 15
  },
  
  THRESHOLDS: {
    softAlertMin: 3,
    hardAlertMin: 7,
    stuckMin: 8,
    debtHigh: 70,
    debtCritical: 85,
    geminiCooldownMin: 10,
    distractionWarningMin: 7,
    fatigueBreakMin: 20
  }
};

// Export for background script or global usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FG_TIMERS;
} else {
  const root = (typeof self !== 'undefined') ? self : (typeof window !== 'undefined' ? window : {});
  root.FG_TIMERS = FG_TIMERS;
}
