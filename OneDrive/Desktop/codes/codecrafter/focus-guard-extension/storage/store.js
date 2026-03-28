/**
 * FocusGuard Storage Wrapper
 * 
 * Provides async Promise-based methods for chrome.storage.local.
 * All functions return Promises.
 */

const STORE_KEYS_INTERNAL = {
  TAB_STATE: (tabId) => `tab_state_${tabId}`,
  HEATMAP: (tabId) => `heatmap_${tabId}`,
  DEBT_HISTORY: 'debt_history',
  SESSION_GOAL: 'session_goal',
  CURRENT_SESSION: 'current_session',
  ALL_SESSIONS: 'all_sessions',
  FIXATION_LOG: 'fixation_log',
  HIGH_STAKES_LOG: 'high_stakes_log',
  SETTINGS: 'settings'
};

const STORE = {
  // --- Tab State ---
  async getTabState(tabId) {
    const key = STORE_KEYS_INTERNAL.TAB_STATE(tabId);
    const result = await chrome.storage.local.get([key]);
    return result[key] || null;
  },

  async setTabState(tabId, stateObj) {
    const key = STORE_KEYS_INTERNAL.TAB_STATE(tabId);
    await chrome.storage.local.set({ [key]: stateObj });
  },

  // --- Heatmap ---
  async appendHeatmapBucket(tabId, bucket) {
    const key = STORE_KEYS_INTERNAL.HEATMAP(tabId);
    const result = await chrome.storage.local.get([key]);
    let history = result[key] || [];
    history.push(bucket);
    // Keep last 360 buckets (60 min at 10s intervals)
    if (history.length > 360) {
      history = history.slice(-360);
    }
    await chrome.storage.local.set({ [key]: history });
  },

  async getHeatmapData(tabId) {
    const key = STORE_KEYS_INTERNAL.HEATMAP(tabId);
    const result = await chrome.storage.local.get([key]);
    return result[key] || [];
  },

  // --- Cognitive Debt ---
  async getDebtHistory() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.DEBT_HISTORY]);
    return result[STORE_KEYS_INTERNAL.DEBT_HISTORY] || [];
  },

  async appendDebtEntry(entry) {
    let history = await STORE.getDebtHistory();
    history.push(entry);
    // Trim entries older than 30 days
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    history = history.filter(item => item.timestamp > thirtyDaysAgo);
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.DEBT_HISTORY]: history });
  },

  // --- Session ---
  async getSessionGoal() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.SESSION_GOAL]);
    return result[STORE_KEYS_INTERNAL.SESSION_GOAL] || '';
  },

  async setSessionGoal(goalString) {
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.SESSION_GOAL]: goalString });
  },

  async getCurrentSession() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.CURRENT_SESSION]);
    return result[STORE_KEYS_INTERNAL.CURRENT_SESSION] || null;
  },

  async setCurrentSession(sessionObj) {
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.CURRENT_SESSION]: sessionObj });
  },

  async getAllSessions() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.ALL_SESSIONS]);
    return result[STORE_KEYS_INTERNAL.ALL_SESSIONS] || [];
  },

  async saveCompletedSession(sessionObj) {
    let all = await STORE.getAllSessions();
    all.push(sessionObj);
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.ALL_SESSIONS]: all });
  },

  // --- Logs ---
  async appendFixationLog(entry) {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.FIXATION_LOG]);
    let logs = result[STORE_KEYS_INTERNAL.FIXATION_LOG] || [];
    logs.push(entry);
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.FIXATION_LOG]: logs });
  },

  async getFixationLog() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.FIXATION_LOG]);
    return result[STORE_KEYS_INTERNAL.FIXATION_LOG] || [];
  },

  async appendHighStakesLog(entry) {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.HIGH_STAKES_LOG]);
    let logs = result[STORE_KEYS_INTERNAL.HIGH_STAKES_LOG] || [];
    logs.push(entry);
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.HIGH_STAKES_LOG]: logs });
  },

  async getHighStakesLog() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.HIGH_STAKES_LOG]);
    return result[STORE_KEYS_INTERNAL.HIGH_STAKES_LOG] || [];
  },

  // --- Settings ---
  async getSettings() {
    const result = await chrome.storage.local.get([STORE_KEYS_INTERNAL.SETTINGS]);
    const defaultSettings = { 
        stuckThresholdMin: 8, 
        alertSensitivity: 0.5, 
        cvEnabled: true 
    };
    const settings = result[STORE_KEYS_INTERNAL.SETTINGS] || defaultSettings;
    // serverUrl is managed via constants if not explicitly set
    if (!settings.serverUrl) {
      settings.serverUrl = (typeof self.FG_CONSTANTS !== 'undefined') ? self.FG_CONSTANTS.API.BASE_URL : 'http://localhost:5000';
    }
    return settings;
  },

  async saveSettings(settingsObj) {
    await chrome.storage.local.set({ [STORE_KEYS_INTERNAL.SETTINGS]: settingsObj });
  },

  // --- Debug ---
  async clearAll() {
    await chrome.storage.local.clear();
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = STORE;
} else {
  const root = (typeof self !== 'undefined') ? self : (typeof window !== 'undefined' ? window : {});
  root.FG_STORE = STORE;
}
