/**
 * FocusGuard Signal Collection
 * 
 * Attaches event listeners and exposes getSnapshot().
 * Throttled for performance. No network or storage inside.
 */

(function() {
  const HIGH_STAKES_KEYWORDS = [
    'Deploy', 'Submit', 'Publish', 'Send', 'Delete', 'Confirm', 
    'Reset', 'Remove', 'Overwrite', 'Terminate', 'Revoke'
  ];

  // Internal state
  let scrollData = {
    positions: [],
    lastTime: Date.now(),
    velocity: 0,
    reversals: 0,
    variance: 0,
    lastDir: 0, // 1 for down, -1 for up
    dwellMap: { topLeft: 0, topRight: 0, bottomLeft: 0, bottomRight: 0 },
    lastUpdate: Date.now()
  };

  let mouseData = {
    clicks: [],
    clickTargetTypes: { link: 0, button: 0, input: 0, empty: 0, text: 0 },
    doubleClicks: 0,
    cursorVelocity: 0,
    cursorIdleTime: 0,
    lastPos: { x: 0, y: 0 },
    lastMoveTime: Date.now(),
    quadrantSamples: [] // Stores quadrant index every 1s
  };

  let keyboardData = {
    keypresses: [], // Array of { timestamp, key }
    lastSaveTime: 0,
    saveEditCycles: 0,
    undoRedoLoops: 0,
    pasteHistory: [], // Array of strings seen on paste
    lastPasteTime: 0
  };

  let navigationData = {
    startTime: Date.now(),
    explorationSignal: false
  };

  // Helper: Get quadrant of a point
  const getQuadrant = (x, y) => {
    const halfW = window.innerWidth / 2;
    const halfH = window.innerHeight / 2;
    if (x < halfW) {
      return y < halfH ? 'topLeft' : 'bottomLeft';
    } else {
      return y < halfH ? 'topRight' : 'bottomRight';
    }
  };

  // Scroll tracking
  window.addEventListener('scroll', () => {
    const now = Date.now();
    const currPos = window.scrollY;
    const deltaPos = Math.abs(currPos - (scrollData.positions[scrollData.positions.length - 1] || 0));
    const deltaTime = (now - scrollData.lastTime) / 1000;

    if (deltaTime > 0) {
      scrollData.velocity = deltaPos / deltaTime;
    }

    const currDir = currPos > (scrollData.positions[scrollData.positions.length - 1] || 0) ? 1 : -1;
    if (currDir !== scrollData.lastDir && scrollData.lastDir !== 0) {
      scrollData.reversals++;
    }
    scrollData.lastDir = currDir;

    scrollData.positions.push(currPos);
    if (scrollData.positions.length > 30) scrollData.positions.shift();

    // Dwell map update
    const quad = getQuadrant(mouseData.lastPos.x, mouseData.lastPos.y);
    scrollData.dwellMap[quad]++;
    
    scrollData.lastTime = now;
  }, { passive: true });

  // Mouse tracking
  window.addEventListener('mousemove', (e) => {
    const now = Date.now();
    const distant = Math.sqrt(Math.pow(e.clientX - mouseData.lastPos.x, 2) + Math.pow(e.clientY - mouseData.lastPos.y, 2));
    const deltaTime = (now - mouseData.lastMoveTime) / 1000;

    if (deltaTime > 0.1) {
      mouseData.cursorVelocity = distant / deltaTime;
      mouseData.lastPos = { x: e.clientX, y: e.clientY };
      mouseData.lastMoveTime = now;
      mouseData.cursorIdleTime = 0;
    }
  }, { passive: true });

  window.addEventListener('click', (e) => {
    const now = Date.now();
    mouseData.clicks.push(now);
    
    let targetType = 'empty';
    if (e.target.tagName === 'A') targetType = 'link';
    else if (e.target.tagName === 'BUTTON') targetType = 'button';
    else if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) targetType = 'input';
    else if (e.target.innerText && e.target.innerText.trim().length > 0) targetType = 'text';
    
    mouseData.clickTargetTypes[targetType]++;

    // High stakes click?
    if (e.target.innerText) {
      const text = e.target.innerText;
      if (HIGH_STAKES_KEYWORDS.some(k => text.includes(k))) {
        chrome.runtime.sendMessage({
          type: 'HIGH_STAKES_ACTION',
          text: text,
          url: window.location.href
        });
      }
    }

    // Link exploration
    if (targetType === 'link') {
      try {
        const url = new URL(e.target.href);
        if (url.hostname !== window.location.hostname) {
          navigationData.explorationSignal = true;
          // Reset exploration after 10 mins? handled by logic in snapshots over time.
        }
      } catch(e) {}
    }
  });

  window.addEventListener('dblclick', () => {
    mouseData.doubleClicks++;
  });

  // Keyboard tracking
  window.addEventListener('keydown', (e) => {
    keyboardData.keypresses.push({ timestamp: Date.now(), key: e.key });
    
    // Undo/Redo loops
    if (e.ctrlKey && e.key.toLowerCase() === 'z') keyboardData.undoRedoLoops++;
    if (e.ctrlKey && e.key.toLowerCase() === 'y') keyboardData.undoRedoLoops++;

    // Save cycles
    if (e.ctrlKey && e.key.toLowerCase() === 's') {
      keyboardData.lastSaveTime = Date.now();
    } else if (keyboardData.lastSaveTime && (Date.now() - keyboardData.lastSaveTime < 30000)) {
        keyboardData.saveEditCycles++;
        keyboardData.lastSaveTime = 0;
    }
  });

  window.addEventListener('paste', (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    if (keyboardData.pasteHistory.includes(text)) {
      keyboardData.pasteRepeatCount = (keyboardData.pasteRepeatCount || 0) + 1;
    }
    keyboardData.pasteHistory.push(text);
    if (keyboardData.pasteHistory.length > 5) keyboardData.pasteHistory.shift();
  });

  // Background sampling for idle and quadrant
  setInterval(() => {
    mouseData.cursorIdleTime = (Date.now() - mouseData.lastMoveTime) / 1000;
    mouseData.quadrantSamples.push(getQuadrant(mouseData.lastPos.x, mouseData.lastPos.y));
    if (mouseData.quadrantSamples.length > 30) mouseData.quadrantSamples.shift();
  }, 1000);

  // MutationObserver for high-stakes - wait for body to exist
  const startObserver = () => {
    if (!document.body) return setTimeout(startObserver, 100);
    const observer = new MutationObserver((mutations) => {
      // We could pre-cache high-stakes elements here if we wanted to be more proactive
    });
    observer.observe(document.body, { childList: true, subtree: true });
  };
  startObserver();

  const tracker = {
    getSnapshot() {
      const now = Date.now();
      
      // Compute statistics
      // Variance
      const avgPos = scrollData.positions.reduce((a,b)=>a+b, 0) / (scrollData.positions.length || 1);
      const variance = scrollData.positions.reduce((a,b)=> a + Math.pow(b-avgPos, 2), 0) / (scrollData.positions.length || 1);

      // Mouse quadrant fixation
      const counts = {};
      mouseData.quadrantSamples.forEach(q => counts[q] = (counts[q] || 0) + 1);
      let fixatedQuad = 'none';
      for (const q in counts) {
        if (counts[q] > mouseData.quadrantSamples.length * 0.6) fixatedQuad = q;
      }

      // WPM
      const recentKeys = keyboardData.keypresses.filter(k => (now - k.timestamp) < 60000);
      const wpm = (recentKeys.length / 5); // 5 chars per word

      // Backspace ratio
      const backspaces = recentKeys.filter(k => k.key === 'Backspace').length;
      const backspaceRatio = backspaces / (recentKeys.length || 1);

      return {
        timestamp: now,
        url: window.location.href,
        scroll: {
          velocity: scrollData.velocity,
          reversals: scrollData.reversals,
          variance: variance,
          dwellMap: scrollData.dwellMap
        },
        mouse: {
          clickFrequency: mouseData.clicks.filter(c => (now - c) < 60000).length,
          clickTargetTypes: mouseData.clickTargetTypes,
          doubleClickBursts: mouseData.doubleClicks,
          cursorVelocity: mouseData.cursorVelocity,
          cursorIdleTime: mouseData.cursorIdleTime,
          fixatedQuadrant: fixatedQuad
        },
        keyboard: {
          wpm: wpm,
          backspaceRatio: backspaceRatio,
          undoRedoLoops: keyboardData.undoRedoLoops,
          pasteRepeat: keyboardData.pasteRepeatCount || 0,
          saveEditCycles: keyboardData.saveEditCycles,
          burstPauseRatio: 0.5 // Simplified for now - usually requires inter-key-timing analysis
        },
        navigation: {
          timeOnUrl: (now - navigationData.startTime) / 1000,
          explorationSignal: navigationData.explorationSignal
        }
      };
    }
  };

  // Export to global scope for content.js
  window.FG_TRACKER = tracker;
})();
