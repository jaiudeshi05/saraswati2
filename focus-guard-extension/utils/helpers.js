/**
 * FocusGuard Pure Utility Functions
 * 
 * Functions here have no side effects and do not import from the extension.
 */

const HELPERS = {
  /**
   * Standard throttle returning a throttled wrapper
   */
  throttle: (fn, ms) => {
    let lastTime = 0;
    return (...args) => {
      const now = Date.now();
      if (now - lastTime >= ms) {
        lastTime = now;
        return fn(...args);
      }
    };
  },

  /**
   * Standard debounce returning a debounced wrapper
   */
  debounce: (fn, ms) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), ms);
    };
  },

  /**
   * Returns current Date.now() as unix ms
   */
  getTimestamp: () => Date.now(),

  /**
   * Extracts base domain from a full URL string
   */
  getDomainFromUrl: (url) => {
    try {
      const parsed = new URL(url);
      return parsed.hostname;
    } catch (e) {
      return '';
    }
  },

  /**
   * Returns boolean comparing base domains of two URLs
   */
  isSameDomain: (url1, url2) => {
    const d1 = HELPERS.getDomainFromUrl(url1);
    const d2 = HELPERS.getDomainFromUrl(url2);
    return d1 === d2 && d1 !== '';
  },

  /**
   * Clamps a number between min and max
   */
  clamp: (val, min, max) => Math.min(Math.max(val, min), max),

  /**
   * Computes average of last N items in array
   */
  rollingAverage: (arr, windowSize) => {
    if (!arr.length) return 0;
    const items = arr.slice(-windowSize);
    return items.reduce((a, b) => a + b, 0) / items.length;
  },

  /**
   * Returns seconds elapsed since a past unix ms timestamp
   */
  secondsSince: (timestamp) => {
    if (!timestamp) return 0;
    return (Date.now() - timestamp) / 1000;
  },

  /**
   * Returns a UUID v4 string
   */
  generateSessionId: () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  },

  /**
   * Returns a human-readable string like '4m 32s'
   */
  formatDuration: (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HELPERS;
} else {
  const root = (typeof self !== 'undefined') ? self : (typeof window !== 'undefined' ? window : {});
  root.FG_HELPERS = HELPERS;
}
