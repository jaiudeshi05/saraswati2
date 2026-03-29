/**
 * webcam_capture.js
 * =================
 * Browser extension content script addition.
 * Handles webcam access, frame capture every 5 seconds,
 * and sending frames to the backend via the existing WebSocket.
 *
 * HOW TO USE:
 * ────────────
 * This is NOT a standalone file. It's a section of JS to add to your
 * existing content script (the same file that does keydown/mousemove/etc).
 *
 * 1. Add the following to your extension's manifest.json:
 *    "permissions": ["tabs", "activeTab", "storage"]
 *    "host_permissions": ["<all_urls>"]
 *    Note: Camera access is requested at runtime via getUserMedia(),
 *    NOT in the manifest — this is how Manifest V3 handles it.
 *
 * 2. Call initWebcamCapture(ws) AFTER your WebSocket is connected,
 *    passing the same ws object used for UX event streaming.
 *    The webcam capture will share the same connection.
 *
 * 3. Call stopWebcamCapture() when the session ends or the user
 *    revokes premium access.
 *
 * WHAT IT DOES:
 * ─────────────
 * - Asks user for webcam permission (browser native prompt — one time)
 * - Captures one 320×240 JPEG frame every 5 seconds
 * - Encodes it as base64
 * - Sends { type: "cv_frame", frame: "<base64>" } over the WebSocket
 * - The backend cv_routes.py handles it and sends back a state_update
 * - Never records or stores video — purely stateless frame capture
 */

'use strict';

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const CV_CAPTURE_INTERVAL_MS = 5000;   // capture one frame every 5 seconds
const CV_FRAME_WIDTH         = 320;    // smaller = faster base64 encode/decode
const CV_FRAME_HEIGHT        = 240;    // backend MediaPipe works fine at this resolution
const CV_JPEG_QUALITY        = 0.80;   // JPEG quality (0-1)

// ─────────────────────────────────────────────
// STATE (module-level, not exported)
// ─────────────────────────────────────────────

let _webcamStream    = null;   // MediaStream
let _videoEl         = null;   // hidden <video> element
let _canvasEl        = null;   // offscreen <canvas> for JPEG encoding
let _captureInterval = null;   // setInterval handle
let _ws              = null;   // reference to the main WebSocket
let _isRunning       = false;

// ─────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────

/**
 * Start webcam capture and attach to the provided WebSocket.
 *
 * @param {WebSocket} ws - The existing WebSocket connection (from your content script)
 * @param {function} onStateUpdate - Optional callback called when the backend
 *                                   returns a cv-updated state_update message.
 *                                   The full result dict is passed as argument.
 * @returns {Promise<boolean>} true if webcam started successfully, false if denied
 */
async function initWebcamCapture(ws, onStateUpdate = null) {
    if (_isRunning) {
        console.warn('[CV] Webcam capture already running.');
        return true;
    }

    _ws = ws;

    // Request camera permission
    try {
        _webcamStream = await navigator.mediaDevices.getUserMedia({
            video: {
                width:  { ideal: CV_FRAME_WIDTH },
                height: { ideal: CV_FRAME_HEIGHT },
                facingMode: 'user',       // front-facing camera
                frameRate: { ideal: 1 },  // we only need very low frame rate
            },
            audio: false,
        });
    } catch (err) {
        if (err.name === 'NotAllowedError') {
            console.warn('[CV] Camera permission denied by user. CV features disabled.');
        } else {
            console.error('[CV] Camera access failed:', err.message);
        }
        return false;
    }

    // Create a hidden <video> element to receive the stream
    _videoEl = document.createElement('video');
    _videoEl.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
    _videoEl.srcObject = _webcamStream;
    _videoEl.autoplay  = true;
    _videoEl.playsInline = true;
    _videoEl.muted     = true;
    document.body.appendChild(_videoEl);

    // Create an offscreen canvas for JPEG encoding
    _canvasEl = document.createElement('canvas');
    _canvasEl.width  = CV_FRAME_WIDTH;
    _canvasEl.height = CV_FRAME_HEIGHT;

    // Wait for the video stream to be ready
    await new Promise((resolve) => {
        _videoEl.onloadedmetadata = () => {
            _videoEl.play().then(resolve).catch(resolve);
        };
        // Fallback in case onloadedmetadata fires before listener attached
        if (_videoEl.readyState >= 2) resolve();
    });

    // Give the stream 1 second to stabilize before first capture
    await new Promise(r => setTimeout(r, 1000));

    _isRunning = true;
    console.log('[CV] Webcam capture started. Sending frame every', CV_CAPTURE_INTERVAL_MS / 1000, 's');

    // Start periodic capture
    _captureInterval = setInterval(() => {
        _captureAndSend(onStateUpdate);
    }, CV_CAPTURE_INTERVAL_MS);

    // Send first frame immediately (don't wait 5 seconds)
    _captureAndSend(onStateUpdate);

    return true;
}

/**
 * Stop webcam capture, release the camera, and clean up DOM elements.
 * Call this when the user ends the session or revokes premium.
 */
function stopWebcamCapture() {
    if (!_isRunning) return;

    _isRunning = false;

    if (_captureInterval) {
        clearInterval(_captureInterval);
        _captureInterval = null;
    }

    if (_webcamStream) {
        _webcamStream.getTracks().forEach(track => track.stop());
        _webcamStream = null;
    }

    if (_videoEl && _videoEl.parentNode) {
        _videoEl.parentNode.removeChild(_videoEl);
        _videoEl = null;
    }

    _canvasEl = null;
    _ws       = null;

    console.log('[CV] Webcam capture stopped and camera released.');
}

/**
 * Check if webcam capture is currently active.
 * @returns {boolean}
 */
function isWebcamActive() {
    return _isRunning;
}

// ─────────────────────────────────────────────
// PRIVATE HELPERS
// ─────────────────────────────────────────────

/**
 * Capture one frame, encode as base64 JPEG, send over WebSocket.
 */
function _captureAndSend(onStateUpdate) {
    if (!_isRunning || !_videoEl || !_canvasEl || !_ws) return;
    if (_ws.readyState !== WebSocket.OPEN) {
        console.warn('[CV] WebSocket not open, skipping frame.');
        return;
    }

    // Check video is actually playing
    if (_videoEl.readyState < 2 || _videoEl.paused) return;

    try {
        const ctx = _canvasEl.getContext('2d');

        // Mirror the frame horizontally (front camera is mirrored by default on some laptops)
        ctx.save();
        ctx.scale(-1, 1);
        ctx.drawImage(_videoEl, -CV_FRAME_WIDTH, 0, CV_FRAME_WIDTH, CV_FRAME_HEIGHT);
        ctx.restore();

        // Get base64 JPEG (this is synchronous and fast for 320×240)
        const dataURL = _canvasEl.toDataURL('image/jpeg', CV_JPEG_QUALITY);

        // Strip the "data:image/jpeg;base64," prefix — backend strips it anyway,
        // but sending raw base64 is slightly smaller
        const b64 = dataURL.split(',')[1];

        if (!b64 || b64.length < 100) {
            // Empty or corrupt frame — skip
            return;
        }

        const message = JSON.stringify({
            type:  'cv_frame',
            frame: b64,
            ts:    Date.now(),
        });

        _ws.send(message);
        // console.debug('[CV] Frame sent, size:', Math.round(b64.length / 1024), 'KB');

    } catch (err) {
        console.error('[CV] Frame capture error:', err.message);
    }
}

// ─────────────────────────────────────────────
// INTEGRATION EXAMPLE
// This shows how to wire this into your existing content script.
// Replace the WebSocket setup in your content script with this pattern.
// ─────────────────────────────────────────────

/*
// ── In your existing content_script.js ───────────────────────────────────

const SESSION_ID  = generateSessionId();   // your existing function
const WS_URL      = `ws://localhost:8000/ws/${SESSION_ID}`;
const IS_PREMIUM  = true;   // set based on user's tier from storage

let ws = new WebSocket(WS_URL);

ws.onopen = async () => {
    console.log('[WS] Connected to backend.');

    // Start UX event streaming (your existing code)
    startUXEventCapture(ws);

    // Start CV webcam capture (premium only)
    if (IS_PREMIUM) {
        const started = await initWebcamCapture(ws, (result) => {
            // Called each time the backend sends a CV-updated state
            updateDashboardUI(result);
        });
        if (!started) {
            console.log('[CV] Running without webcam — free tier mode.');
        }
    }
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);

    if (data.type === 'state_update') {
        updateDashboardUI(data);
    } else if (data.type === 'cv_update') {
        // CV-only update (arrives before first UX window completes)
        updateCVIndicator(data);
    } else if (data.type === 'waiting') {
        // Not enough data yet
        showLoadingState(data.n_events);
    }
};

ws.onclose = () => {
    console.log('[WS] Connection closed.');
    stopWebcamCapture();
};

ws.onerror = (err) => {
    console.error('[WS] Error:', err);
    stopWebcamCapture();
};

// Stop everything when tab is unloaded
window.addEventListener('beforeunload', () => {
    stopWebcamCapture();
    ws.close();
});

// ─────────────────────────────────────────────────────────────────────────

// ── updateDashboardUI — call your existing React/frontend bridge ──────────

function updateDashboardUI(result) {
    // Post to your React frontend via a custom event, chrome.runtime.sendMessage,
    // or directly update DOM elements.
    // result contains:
    //   result.state           — "Focused" | "Confused" | "Fatigued" | "Distracted" | "WrongApproach"
    //   result.confidence      — 0.0 to 1.0
    //   result.all_probs       — {Focused: x, Confused: y, ...}
    //   result.severity        — "normal" | "watch" | "alert"
    //   result.cv_face_detected  — bool (premium)
    //   result.dominant_emotion  — "neutral" | "fear" | ... (premium)
    //   result.cv_latency_ms   — inference time in ms (premium)
    //   result.zscore_analysis — deviant features list

    window.postMessage({
        source: 'cognitive_monitor',
        type:   'state_update',
        data:   result,
    }, '*');
}
*/

// ─────────────────────────────────────────────
// EXPORT (for module environments)
// ─────────────────────────────────────────────

// If using ES modules in your extension:
// export { initWebcamCapture, stopWebcamCapture, isWebcamActive };

// If using classic scripts (no module), the functions are available globally.
