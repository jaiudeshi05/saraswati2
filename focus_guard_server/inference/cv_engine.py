import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from collections import deque
import os
from pathlib import Path

# -----------------------------
# 1. Setup paths
# -----------------------------
BASE_DIR = Path(__file__).resolve().parent
MODEL_PATH = BASE_DIR / "models" / "drowsy_resnet.pth"

# -----------------------------
# 2. Load Model
# -----------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Initialize global model
model = None

def get_model():
    global model
    if model is None:
        model = models.resnet18(weights=None)
        num_features = model.fc.in_features
        model.fc = nn.Linear(num_features, 2)
        
        if os.path.exists(MODEL_PATH):
            model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
            print(f"✅ Loaded drowsiness model from {MODEL_PATH}")
        else:
            print(f"⚠️ Model weight not found at {MODEL_PATH}")
            
        model.to(device)
        model.eval()
    return model

classes = ['drowsy', 'non_drowsy']

# -----------------------------
# 3. Transform
# -----------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# -----------------------------
# 4. Face Detector
# -----------------------------
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

# -----------------------------
# 5. Buffer Storage (per tab)
# -----------------------------
tab_buffers = {}

def get_buffer(tab_id: str):
    if tab_id not in tab_buffers:
        tab_buffers[tab_id] = deque(maxlen=20)
    return tab_buffers[tab_id]

# -----------------------------
# 6. Inference Function
# -----------------------------
def analyze_frame(frame, tab_id: str = "default") -> dict:
    """Analyze a single frame for drowsiness."""
    m = get_model()
    
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)
    
    final_label = "NOT_DETECTED"
    confidence_val = 0.0
    
    # Use only the first face detected for simplicity
    if len(faces) > 0:
        (x, y, w, h) = faces[0]
        
        if w >= 100 and h >= 100:
            face = frame[y:y+h, x:x+w]
            
            # Preprocess
            img = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(img)
            img = transform(img).unsqueeze(0).to(device)
            
            # Inference
            with torch.no_grad():
                outputs = m(img)
                probs = torch.softmax(outputs, dim=1)
                confidence, pred = torch.max(probs, 1)
            
            label = classes[pred.item()]
            confidence_val = confidence.item()
            
            # Decision Logic from model/cv.py
            drowsy_prob = probs[0][0].item()
            awake_prob = probs[0][1].item()
            
            buffer = get_buffer(tab_id)
            
            if drowsy_prob > 0.9 and (drowsy_prob - awake_prob) > 0.4:
                final_label = "DROWSY"
                buffer.clear()
            else:
                if confidence_val > 0.75:
                    buffer.append(label)
                
                if len(buffer) > 0:
                    drowsy_count = buffer.count("drowsy")
                    if drowsy_count > 12:
                        final_label = "DROWSY"
                    else:
                        final_label = "AWAKE"
                else:
                    final_label = "AWAKE"
    
    return {
        'status': 'success',
        'drowsiness_level': 1.0 if final_label == "DROWSY" else 0.0,
        'label': final_label,
        'confidence': confidence_val,
        # Following the existing schema from api/routes/cv.py if possible
        'eye_openness': 0.0 if final_label == "DROWSY" else 1.0, 
        'fatigue_level': 0.9 if final_label == "DROWSY" else 0.4,
        'mock': False
    }
