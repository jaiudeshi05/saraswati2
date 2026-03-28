/**
 * FocusGuard Fallback Classifier
 * 
 * Activated when the Python server is offline.
 * Implements rule-based heuristics to determine cognitive state.
 */

const FALLBACK_CLASSIFIER = {
  classify(snapshot) {
    const { scroll, mouse, keyboard, navigation } = snapshot;
    
    // Default return shape
    const result = {
      state: 'DISTRACTED',
      confidence: 0.5,
      dominantSignal: 'default',
      wrongProblemRisk: 0.1,
      alert: false,
      alertType: null
    };

    // Rule 1: FIXATING
    if (keyboard.undoRedoLoops > 4 && scroll.variance < 0.05 && navigation.explorationSignal === false) {
      result.state = 'FIXATING';
      result.confidence = 0.8;
      result.dominantSignal = 'undo_redo_loops';
      result.wrongProblemRisk = 0.7;
      result.alert = true;
      result.alertType = 'FIXATING';
      return result;
    }

    // Rule 2: STUCK
    if (mouse.cursorIdleTime > 120 && keyboard.wpm < 5) {
      result.state = 'STUCK';
      result.confidence = 0.9;
      result.dominantSignal = 'cursor_idle_time';
      result.alert = true;
      result.alertType = 'STUCK';
      return result;
    }

    // Rule 3: DISTRACTED
    if ((mouse.clickTargetTypes.empty || 0) > 5 && mouse.doubleClickBursts > 2) {
      result.state = 'DISTRACTED';
      result.confidence = 0.7;
      result.dominantSignal = 'double_click_bursts';
      return result;
    }

    // Rule 4: FATIGUED
    if (keyboard.wpm < 10 && mouse.cursorVelocity < 50 && scroll.velocity < 5) {
      result.state = 'FATIGUED';
      result.confidence = 0.6;
      result.dominantSignal = 'low_activity';
      return result;
    }

    // Rule 5: FOCUSED
    if (keyboard.wpm > 40 && scroll.variance > 0.2 && keyboard.undoRedoLoops < 2) {
      result.state = 'FOCUSED';
      result.confidence = 0.9;
      result.dominantSignal = 'steady_work';
      return result;
    }

    return result;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = FALLBACK_CLASSIFIER;
} else {
  const root = (typeof self !== 'undefined') ? self : (typeof window !== 'undefined' ? window : {});
  root.FG_FALLBACK = FALLBACK_CLASSIFIER;
}
