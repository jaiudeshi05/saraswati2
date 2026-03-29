document.getElementById('request-btn').addEventListener('click', async () => {
    const statusEl = document.getElementById('status');
    const btn = document.getElementById('request-btn');
    
    try {
        // Request actual stream to trigger browser prompt
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        // Success! Stop the tracks immediately since we just wanted permission
        stream.getTracks().forEach(track => track.stop());
        
        statusEl.innerText = "✅ Permission granted! You're all set. You can close this tab.";
        statusEl.style.color = "green";
        btn.style.display = 'none';
        
        // Tell background script it can now safely start the offscreen document
        chrome.runtime.sendMessage({ type: 'CAMERA_GRANTED' });
        
        // Auto close after 3s
        setTimeout(() => window.close(), 3000);
    } catch (err) {
        console.error('Camera error:', err);
        statusEl.innerText = "❌ Permission denied. Please click the camera icon in the address bar to allow tracking.";
        statusEl.style.color = "red";
    }
});
