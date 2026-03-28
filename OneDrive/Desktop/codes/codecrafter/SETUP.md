# FocusGuard Setup Guide

Follow these steps to initialize the FocusGuard MVP for the hackathon.

## 1. Python Backend
- Navigate to the server directory: `cd focus-guard-server`
- Install dependencies: `pip install -r requirements.txt`
- Create a `.env` file in `focus-guard-server/` with:
  ```env
  GEMINI_API_KEY=your_key_here
  ```
- Start the server: `python server.py` — server starts on http://localhost:5000
- Verify: `curl http://localhost:5000/health` — should return `status: ok`

## 2. Drop-in ML Modules
- When ready, place the ML team's files into:
  - `focus-guard-server/inference/`
  - `focus-guard-server/models/`
  - `focus-guard-server/features/`
- Restart the server — `/health` will now show `models_loaded: true`

## 3. Chrome Extension
- Open Chrome and navigate to `chrome://extensions`
- Enable **Developer mode** (top-right toggle)
- Click **'Load unpacked'** and select the `focus-guard-extension/` directory
- The FocusGuard icon will appear in the toolbar

## 4. Verify
- Open any website — the extension begins collecting signals immediately
- Check the service worker logs: `chrome://extensions` → FocusGuard → **'Service Worker'** → Inspect
- Confirm `POST /predict` requests appearing in the Python server terminal every 5s

---
**FocusGuard — Hackathon MVP Build Prompt**
Drop-in modules: `inference/` · `models/` · `features/` · `popup/` | All excluded by design



PYTHON SERVER:
cd focus-guard-server
pip install -r requirements.txt

AFTER THIS MAKE ENV FILE IN: /focus-guard-server

python server.py
Verify: `curl http://localhost:5000/health` — should return `status: ok`

CHROME EXTENSION:
Open Chrome and navigate to `chrome://extensions`
Enable **Developer mode** (top-right toggle)
Click **'Load unpacked'** and select the `focus-guard-extension/` directory