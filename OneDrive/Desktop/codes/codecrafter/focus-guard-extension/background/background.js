/**
 * FocusGuard Service Worker
 * 
 * Central brain of the extension. Manages state, alarms, and API orchestration.
 */

// Import shared utilities using absolute extension paths
importScripts('/content/timers.js', '/utils/constants.js', '/utils/helpers.js', '/storage/store.js', '/models/fallback_classifier.js');

const { API, ALARMS, INTERVALS, THRESHOLDS, STATES, STORAGE_KEYS, ALERT_TYPES } = self.FG_CONSTANTS;
const { getTimestamp, generateSessionId, secondsSince } = self.FG_HELPERS;
const store = self.FG_STORE;
const fallback = self.FG_FALLBACK;

// State management
const tabStates = new Map();
let serverOnline = false;

/**
 * 1. Initialisation
 */
chrome.runtime.onInstalled.addListener(async () => {
  // Create alarms
  chrome.alarms.create(ALARMS.INFERENCE, { periodInMinutes: INTERVALS.inference });
  chrome.alarms.create(ALARMS.DEBT, { periodInMinutes: INTERVALS.debt });
  chrome.alarms.create(ALARMS.GEMINI, { periodInMinutes: INTERVALS.gemini });
  chrome.alarms.create(ALARMS.SESSION_CHECK, { periodInMinutes: INTERVALS.sessionCheck });

  // Initial session check
  const currentSession = await store.getCurrentSession();
  if (!currentSession) {
    await store.setCurrentSession({
      id: generateSessionId(),
      startTime: Date.now(),
      status: 'active'
    });
  }

  checkServerHealth();
});

async function checkServerHealth() {
  try {
    const res = await fetch(`${API.BASE_URL}/health`);
    serverOnline = (res.status === 200);
  } catch (e) {
    serverOnline = false;
  }
}

/**
 * 2. Message Handling
 */
chrome.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab ? sender.tab.id : null;
  if (!tabId && message.type !== 'OPEN_POPUP') return;

  switch (message.type) {
    case 'SIGNAL_UPDATE':
      await handleSignalUpdate(tabId, message.data);
      break;
    
    case 'HIGH_STAKES_ACTION':
      await handleHighStakesAction(tabId, message.text, message.url);
      break;

    case 'TAB_UNLOADING':
      handleTabUnloading(tabId, message.data);
      break;

    case 'OPEN_POPUP':
      if (chrome.action && chrome.action.openPopup) {
        chrome.action.openPopup();
      } else {
        chrome.tabs.create({ url: 'popup/popup.html' });
      }
      break;

    case 'REQUEST_INSIGHT':
      triggerGeminiInsight(tabId, true);
      break;
  }
});

async function handleSignalUpdate(tabId, snapshot) {
  if (!tabStates.has(tabId)) {
    tabStates.set(tabId, {
      buffer: [],
      currentState: STATES.FOCUSED,
      stateStartTime: Date.now(),
      consecutiveStateSeconds: 0,
      lastPredictCallTime: 0,
      lastGeminiCallTime: 0,
      url: snapshot.url
    });
  }
  
  const state = tabStates.get(tabId);
  state.buffer.push(snapshot);
  if (state.buffer.length > 30) state.buffer.shift();
  state.url = snapshot.url;
}

async function handleHighStakesAction(tabId, text, url) {
  // Check debt
  let debt = 0;
  try {
    const res = await fetch(`${API.BASE_URL}/debt`, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_summary: { active_tabs: tabStates.size } }) 
    });
    const info = await res.json();
    debt = info.current_debt;
  } catch (e) {
    const history = await store.getDebtHistory();
    debt = history.length ? history[history.length-1].debt : 0;
  }

  await store.appendHighStakesLog({ timestamp: Date.now(), tabId, text, url, debt });

  if (debt > THRESHOLDS.debtCritical) {
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_REFLECTION', debt, actionText: text });
  }
}

function handleTabUnloading(tabId, finalSnapshot) {
  if (tabStates.has(tabId)) {
    tabStates.delete(tabId);
  }
  
  // If no tabs left active, could trigger session end flow but usually handled by sessionCheck alarm
}

/**
 * 3. Alarm Handling
 */
chrome.alarms.onAlarm.addListener(async (alarm) => {
  switch (alarm.name) {
    case ALARMS.INFERENCE:
      await runInference();
      break;
    case ALARMS.DEBT:
      await updateDebt();
      break;
    case ALARMS.GEMINI:
      await runGeminiTick();
      break;
    case ALARMS.SESSION_CHECK:
      await checkSessionTimeout();
      break;
  }
});

async function runInference() {
  await checkServerHealth();

  for (const [tabId, state] of tabStates.entries()) {
    if (state.buffer.length < 10) continue;

    const latestSnapshot = state.buffer[state.buffer.length - 1];
    let result;

    if (serverOnline) {
      try {
        const res = await fetch(`${API.BASE_URL}/predict`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tab_id: tabId, ...latestSnapshot })
        });
        result = await res.json();
      } catch (e) {
        result = fallback.classify(latestSnapshot);
      }
    } else {
      result = fallback.classify(latestSnapshot);
    }

    // Update state
    if (state.currentState !== result.state) {
      state.currentState = result.state;
      state.stateStartTime = Date.now();
    }
    state.consecutiveStateSeconds = (Date.now() - state.stateStartTime) / 1000;
    state.lastPredictCallTime = Date.now();

    // Store buckets
    await store.appendHeatmapBucket(tabId, {
      timestamp: Date.now(),
      state: result.state,
      dominantSignal: result.dominantSignal
    });

    evaluateAlerts(tabId, state, result);
  }
}

async function evaluateAlerts(tabId, state, result) {
  // Alert logic
  if (state.currentState === STATES.DISTRACTED) {
    if (state.consecutiveStateSeconds > 420) { // 7 min
        chrome.notifications.create({
            type: 'basic',
            iconUrl: '/icons/icon128.png',
            title: 'FocusGuard Warning',
            message: 'You have been distracted for 7+ minutes. Time to refocus?'
        });
        chrome.action.setBadgeText({ text: '!!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#EF4444', tabId });
    } else if (state.consecutiveStateSeconds > 180) { // 3 min
        chrome.action.setBadgeText({ text: '!', tabId });
        chrome.action.setBadgeBackgroundColor({ color: '#F59E0B', tabId });
    }
  } else {
    chrome.action.setBadgeText({ text: '', tabId });
  }

  // Break banner for fatigue
  if (state.currentState === STATES.FATIGUED && state.consecutiveStateSeconds > 1200) { // 20 min
    chrome.tabs.sendMessage(tabId, { type: 'SHOW_BREAK' });
  }

  // Fixating or Wrong Problem?
  if (state.currentState === STATES.FIXATING || result.wrong_problem_risk > 0.65) {
     triggerGeminiInsight(tabId);
  }
}

async function triggerGeminiInsight(tabId, force = false) {
    const state = tabStates.get(tabId);
    if (!state) return;

    const cooldown = THRESHOLDS.geminiCooldownMin * 60 * 1000;
    if (!force && (Date.now() - state.lastGeminiCallTime < cooldown)) return;

    state.lastGeminiCallTime = Date.now();

    try {
        const goal = await store.getSessionGoal();
        const res = await fetch(`${API.BASE_URL}/gemini/insights`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                trigger: state.currentState.toLowerCase(),
                context: {
                    goal: goal,
                    current_url: state.url,
                    state: state.currentState
                }
            })
        });
        const info = await res.json();
        chrome.tabs.sendMessage(tabId, { type: 'SHOW_NUDGE', insight: info.insight, severity: info.severity });
    } catch (e) {
        console.error('Failed to get Gemini insight:', e);
    }
}

async function updateDebt() {
    // Session summary
    const summary = {
        active_tabs: tabStates.size,
        total_undo_loops: 0 // In a real app we'd aggregate this
    };

    try {
        const res = await fetch(`${API.BASE_URL}/debt`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_summary: summary })
        });
        const info = await res.json();
        await store.appendDebtEntry({ timestamp: Date.now(), debt: info.current_debt });
    } catch (e) {}
}

async function runGeminiTick() {
    // Automatically called every 5 mins. Evaluates all tabs.
    for (const [tabId, state] of tabStates.entries()) {
        if (state.currentState === STATES.WRONG_PROBLEM) {
            triggerGeminiInsight(tabId);
        }
    }
}

async function checkSessionTimeout() {
    // If all tabs idle, end session
    if (tabStates.size === 0) {
        const currentSession = await store.getCurrentSession();
        if (currentSession && currentSession.status === 'active') {
           // Post end session
           try {
               await fetch(`${API.BASE_URL}/session/end`, { 
                   method: 'POST',
                   headers: { 'Content-Type': 'application/json' },
                   body: JSON.stringify({ session_id: currentSession.id })
               });
           } catch(e) {}
           await store.setCurrentSession(null);
        }
    }
}
