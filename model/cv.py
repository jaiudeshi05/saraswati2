import cv2
import torch
import torch.nn as nn
from torchvision import transforms, models
from PIL import Image
from collections import deque
import time

# -----------------------------
# 1. Load Model
# -----------------------------
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

model = models.resnet18(pretrained=False)
num_features = model.fc.in_features
model.fc = nn.Linear(num_features, 2)

model.load_state_dict(torch.load("drowsy_resnet.pth", map_location=device))
model.to(device)
model.eval()

classes = ['drowsy', 'non_drowsy']  # adjust if needed

# -----------------------------
# 2. Transform
# -----------------------------
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize([0.485, 0.456, 0.406],
                         [0.229, 0.224, 0.225])
])

# -----------------------------
# 3. Face Detector
# -----------------------------
face_cascade = cv2.CascadeClassifier(
    cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
)

# -----------------------------
# 4. Buffer
# -----------------------------
prediction_buffer = deque(maxlen=20)

# -----------------------------
# 5. FPS CONTROL (🔥 NEW)
# -----------------------------
TARGET_FPS = 5
FRAME_INTERVAL = 1 / TARGET_FPS

last_inference_time = 0

# -----------------------------
# 6. Webcam
# -----------------------------
cap = cv2.VideoCapture(0)

final_label = "Detecting..."

while True:
    loop_start = time.time()  # for FPS calculation

    ret, frame = cap.read()
    if not ret:
        break

    frame = cv2.resize(frame, (640, 480))
    current_time = time.time()

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:

        if w < 100 or h < 100:
            continue

        face = frame[y:y+h, x:x+w]

        # -----------------------------
        # 🔥 CONTROLLED INFERENCE FPS
        # -----------------------------
        if current_time - last_inference_time >= FRAME_INTERVAL:
            last_inference_time = current_time

            # Preprocess
            img = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(img)
            img = transform(img).unsqueeze(0).to(device)

            # Inference
            with torch.no_grad():
                outputs = model(img)
                probs = torch.softmax(outputs, dim=1)
                confidence, pred = torch.max(probs, 1)

            label = classes[pred.item()]
            confidence = confidence.item()

            print(f"Raw Prediction: {label}, Confidence: {confidence:.2f}")

            # -----------------------------
            # Decision Logic
            # -----------------------------
            drowsy_prob = probs[0][0].item()
            awake_prob = probs[0][1].item()

            # 🔥 Strong override
            if drowsy_prob > 0.9 and (drowsy_prob - awake_prob) > 0.4:
                final_label = "DROWSY"
                prediction_buffer.clear()

            else:
                # Normal smoothing
                if confidence > 0.75:
                    prediction_buffer.append(label)

                if len(prediction_buffer) > 0:
                    drowsy_count = prediction_buffer.count("drowsy")

                    if drowsy_count > 12:
                        final_label = "DROWSY"
                    else:
                        final_label = "AWAKE"
                else:
                    final_label = "AWAKE"

        # -----------------------------
        # Draw UI
        # -----------------------------
        color = (0, 0, 255) if final_label == "DROWSY" else (0, 255, 0)

        cv2.rectangle(frame, (x, y), (x+w, y+h), color, 2)
        cv2.putText(frame, final_label,
                    (x, y-10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.9, color, 2)

        # -----------------------------
        # ALERT
        # -----------------------------
        if final_label == "DROWSY":
            print("⚠️ ALERT: USER IS DROWSY!")

    # -----------------------------
    # 🔥 Display FPS (optional)
    # -----------------------------
    fps = 1 / (time.time() - loop_start)
    cv2.putText(frame, f"FPS: {int(fps)}", (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)

    cv2.imshow("Drowsiness Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()