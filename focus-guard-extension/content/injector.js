/**
 * FocusGuard UI Injection Engine
 * 
 * Handles injecting/removing UI elements into the host page.
 * Uses Shadow DOM to prevent CSS collisions.
 */

(function() {
  const STYLES = `
    .fg-container { font-family: 'Inter', system-ui, -apple-system, sans-serif; position: fixed; z-index: 2147483647; color: #1f2937; }
    .fg-nudge-card { bottom: 20px; right: 20px; width: 320px; background: white; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1); border: 1px solid #e5e7eb; padding: 16px; animation: slideIn 0.3s ease-out; }
    .fg-severity-badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
    .fg-severity-medium { background: #fef3c7; color: #92400e; }
    .fg-severity-high { background: #fee2e2; color: #991b1b; }
    .fg-insight { font-size: 14px; margin-bottom: 12px; line-height: 1.5; color: #374151; }
    .fg-actions { display: flex; gap: 8px; }
    .fg-btn { flex: 1; padding: 8px; border: none; border-radius: 6px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background 0.2s; }
    .fg-btn-primary { background: #1f2937; color: white; }
    .fg-btn-primary:hover { background: #111827; }
    .fg-btn-secondary { background: #f3f4f6; color: #4b5563; }
    .fg-btn-secondary:hover { background: #e5e7eb; }
    
    .fg-reflection-overlay { inset: 0; background: rgba(0, 0, 0, 0.85); display: flex; flex-direction: column; align-items: center; justify-content: center; backdrop-filter: blur(8px); text-align: center; padding: 40px; }
    .fg-reflection-box { background: white; padding: 40px; border-radius: 24px; max-width: 500px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5); }
    .fg-debt-score { font-size: 64px; font-weight: 800; color: #111827; margin: 20px 0; }
    .fg-warning-title { font-size: 24px; font-weight: 700; margin-bottom: 16px; color: #991b1b; }
    .fg-warning-text { font-size: 16px; color: #4b5563; margin-bottom: 32px; }

    .fg-break-banner { top: 0; left: 0; right: 0; height: 48px; background: #dcfce7; border-bottom: 1px solid #bbf7d0; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 500; color: #166534; animation: slideDown 0.3s ease-out; }
    .fg-close-banner { position: absolute; right: 16px; cursor: pointer; opacity: 0.6; }

    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
    @keyframes slideDown { from { transform: translateY(-100%); } to { transform: translateY(0); } }
  `;

  let fgContainer = null;
  let fgShadow = null;

  const getContainer = () => {
    if (fgContainer) return fgShadow;
    
    fgContainer = document.createElement('div');
    fgContainer.id = 'fg-root-container';
    fgContainer.classList.add('fg-container');
    document.body.appendChild(fgContainer);
    
    fgShadow = fgContainer.attachShadow({ mode: 'open' });
    const styleSheet = document.createElement('style');
    styleSheet.textContent = STYLES;
    fgShadow.appendChild(styleSheet);
    
    return fgShadow;
  };

  const INJECTOR = {
    showNudgeCard(insight, severity) {
      const shadow = getContainer();
      this.removeAll(); // Clear existing card if any

      const card = document.createElement('div');
      card.className = 'fg-nudge-card';
      const severityClass = severity === 'high' ? 'fg-severity-high' : 'fg-severity-medium';
      
      card.innerHTML = `
        <div class="fg-severity-badge ${severityClass}">${severity} Risk</div>
        <div class="fg-insight">${insight}</div>
        <div class="fg-actions">
          <button class="fg-btn fg-btn-secondary" id="fg-dismiss-nudge">Got it</button>
          <button class="fg-btn fg-btn-primary" id="fg-more-info">Tell me more</button>
        </div>
      `;
      
      shadow.appendChild(card);

      const dismissBtn = card.querySelector('#fg-dismiss-nudge');
      dismissBtn.onclick = () => card.remove();

      const moreInfoBtn = card.querySelector('#fg-more-info');
      moreInfoBtn.onclick = () => {
        chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        card.remove();
      };

      setTimeout(() => {
        if (card.parentNode) card.remove();
      }, 30000);
    },

    showReflectionOverlay(debtScore, actionText) {
      const shadow = getContainer();
      this.removeAll();

      const overlay = document.createElement('div');
      overlay.className = 'fg-reflection-overlay';
      
      overlay.innerHTML = `
        <div class="fg-reflection-box">
          <div class="fg-warning-title">High Cognitive Debt</div>
          <div class="fg-warning-text">You are attempting a high-stakes action: <strong>"${actionText}"</strong>. Your current cognitive load is critical.</div>
          <div class="fg-debt-score">${Math.round(debtScore)}%</div>
          <div class="fg-actions">
            <button class="fg-btn fg-btn-secondary" id="fg-cancel-action" style="padding: 16px;">Wait, let me think</button>
            <button class="fg-btn fg-btn-primary" id="fg-proceed-action" style="padding: 16px;">Proceed anyway</button>
          </div>
        </div>
      `;
      
      shadow.appendChild(overlay);

      overlay.querySelector('#fg-cancel-action').onclick = () => {
        overlay.remove();
        // Prevent action logic? In this MVP, we just remove overlay.
      };
      
      overlay.querySelector('#fg-proceed-action').onclick = () => {
        overlay.remove();
      };
    },

    showBreakBanner() {
      const shadow = getContainer();
      this.removeAll();

      const banner = document.createElement('div');
      banner.className = 'fg-break-banner';
      banner.innerHTML = `
        <span>It's time to recharge. You've been working intensely for over 20 minutes — a 5min break is recommended.</span>
        <span class="fg-close-banner" id="fg-close-break">✕</span>
      `;
      
      shadow.appendChild(banner);
      banner.querySelector('#fg-close-break').onclick = () => banner.remove();

      setTimeout(() => {
        if (banner.parentNode) banner.remove();
      }, 60000);
    },

    removeAll() {
      if (!fgShadow) return;
      const elements = fgShadow.querySelectorAll('.fg-nudge-card, .fg-reflection-overlay, .fg-break-banner');
      elements.forEach(el => el.remove());
    }
  };

  window.FG_INJECTOR = INJECTOR;
})();
