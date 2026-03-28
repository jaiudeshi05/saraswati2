/**
 * FocusGuard Content Script Entry Point
 * 
 * Initialises signal tracking and handles incoming UI messages.
 */

(function() {
  const tracker = window.FG_TRACKER;
  const injector = window.FG_INJECTOR;

  if (!tracker || !injector) {
    console.warn('FocusGuard tracker or injector not found. Extension may not function correctly.');
    return;
  }

  // Polling loop to send updates to background
  setInterval(() => {
    const snapshot = tracker.getSnapshot();
    chrome.runtime.sendMessage({
      type: 'SIGNAL_UPDATE',
      data: snapshot
    });
  }, 2000);

  // Message listener for UI commands from background
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    switch (message.type) {
      case 'SHOW_NUDGE':
        injector.showNudgeCard(message.insight, message.severity);
        break;
      case 'SHOW_REFLECTION':
        injector.showReflectionOverlay(message.debt, message.actionText);
        break;
      case 'SHOW_BREAK':
        injector.showBreakBanner();
        break;
      case 'REMOVE_OVERLAYS':
        injector.removeAll();
        break;
    }
  });

  // Handle final state on unload
  window.addEventListener('beforeunload', () => {
    const finalSnapshot = tracker.getSnapshot();
    chrome.runtime.sendMessage({
      type: 'TAB_UNLOADING',
      data: finalSnapshot
    });
  });

  console.log('FocusGuard content script active.');
})();
