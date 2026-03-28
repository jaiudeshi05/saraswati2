/**
 * FocusGuard Offscreen Document
 * Handles webcam frame capture and sends it to background for server processing.
 */

const TARGET_FPS = 1; // 1 frame per second to avoid overworking the server/system
const WIDTH = 320; // Smaller resolution for better performance
const HEIGHT = 240;

const video = document.getElementById('webcam');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

canvas.width = WIDTH;
canvas.height = HEIGHT;

// Start webcam
async function startWebcam() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 } 
        } 
    });
    video.srcObject = stream;
    
    // Once video is ready, start periodic captures
    video.onloadedmetadata = () => {
        console.log("Webcam stream started.");
        setInterval(captureAndSend, 1000 / TARGET_FPS);
    };
  } catch (err) {
    console.error("Camera access failed:", err);
    // Send error message to background if failed
    chrome.runtime.sendMessage({ 
        type: 'CV_ERROR', 
        error: "Camera access denied or unavailable." 
    });
  }
}

function captureAndSend() {
  if (video.readyState < video.HAVE_CURRENT_DATA) return;

  // Draw current video frame to canvas
  ctx.drawImage(video, 0, 0, WIDTH, HEIGHT);
  
  // Get base64 JPEG
  const frame = canvas.toDataURL('image/jpeg', 0.8);
  
  // Send to background
  chrome.runtime.sendMessage({
    type: 'CV_FRAME',
    data: {
      frame: frame,
      timestamp: Date.now()
    }
  });
}

// Kick off
startWebcam();
