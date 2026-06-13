import cv2
import numpy as np
import pandas as pd
import os
import sys

# Ensure backend path is in sys.path
sys.path.append('c:/Users/HP/OneDrive/Documents/EyeQ/backend')
from app.ai.analyzer import run_retinal_analysis
from app.ai.fusion_engine import calculate_clinical_risk

output_dir = 'c:/Users/HP/OneDrive/Documents/EyeQ/data/crops'
os.makedirs(output_dir, exist_ok=True)

# 1. Image Slicing using OpenCV
img_path = 'c:/Users/HP/OneDrive/Documents/EyeQ/EyeQ_Retinal_Images_Only.png'
img = cv2.imread(img_path)
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

# Threshold to find the black background vs bright retinas
_, thresh = cv2.threshold(gray, 30, 255, cv2.THRESH_BINARY)
contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

# Filter contours by size (assume retinas are large circular regions)
retinas = []
for c in contours:
    x, y, w, h = cv2.boundingRect(c)
    if w > 100 and h > 100 and w < 300 and h < 300: # Approximate size of a retina in this grid
        retinas.append((x, y, w, h))

# Sort by rows (y) and then columns (x)
# We group them into 4 rows of 5
retinas = sorted(retinas, key=lambda b: b[1]) # sort by Y
sorted_retinas = []
for i in range(4): # 4 rows
    row = retinas[i*5:(i+1)*5]
    row = sorted(row, key=lambda b: b[0]) # sort by X
    sorted_retinas.extend(row)

if len(sorted_retinas) != 20:
    print(f"Warning: Found {len(sorted_retinas)} retinas instead of 20!")
    # Fallback to simple grid slicing if contour detection is messy
    img_h, img_w = img.shape[:2]
    # The eyes start around x=50, y=0 based on the image (ignoring the left column)
    # We can just use the provided bounding boxes from the manual grid estimation if needed.

# Let's save the crops
cropped_paths = {}
for i, (x, y, w, h) in enumerate(sorted_retinas):
    patient_id = f"EYEQ{i+1:03d}"
    crop = img[y:y+h, x:x+w]
    crop_path = os.path.join(output_dir, f"{patient_id}.png")
    cv2.imwrite(crop_path, crop)
    cropped_paths[patient_id] = crop_path

# 2. Read CSV and Evaluate
csv_path = 'c:/Users/HP/OneDrive/Documents/EyeQ/EyeQ_20_Patient_Dataset.csv'
df = pd.read_csv(csv_path)

results = []

for index, row in df.iterrows():
    patient_id = row['PatientID']
    age = row['Age']
    gender = row['Gender']
    
    # Parse Symptoms
    symptoms_str = str(row['Symptoms']) if pd.notna(row['Symptoms']) else ""
    symptoms_list = [s.strip().lower() for s in symptoms_str.split(';') if s.strip()]
    
    # Standardize symptom names to match our engine
    symptoms_map = {
        "blurred vision": "blurred_vision",
        "floaters": "floaters",
        "wavy vision": "distorted_vision",
        "reading difficulty": "distorted_vision",
        "central vision distortion": "distorted_vision",
        "peripheral vision loss": "loss_side_vision",
        "distance vision difficulty": "difficulty_distant",
        "sudden vision loss": "sudden_vision_loss",
        "headache": "severe_headache",
        "nausea": "severe_headache", # mapping nausea to severe headache context
        "double vision": "double_vision",
        "curtain shadow": "vision_blackouts",
        "flashes": "vision_blackouts",
        "distorted vision": "distorted_vision",
        "side vision loss": "loss_side_vision",
        "vision loss": "sudden_vision_loss",
        "vomiting": "severe_headache"
    }
    
    symptom_payload = {}
    for s in symptoms_list:
        mapped = symptoms_map.get(s)
        if mapped:
            symptom_payload[mapped] = "Yes"

    # Measurements & Tests
    tests_str = str(row['Tests']) if pd.notna(row['Tests']) else ""
    tests_list = [t.strip() for t in tests_str.split(';') if t.strip()]
    
    measurement_payload = {}
    for t in tests_list:
        if "HbA1c" in t:
            try:
                val = float(t.replace("HbA1c", "").replace("%", "").strip())
                measurement_payload["hba1c"] = val
            except: pass
        if "FBS" in t:
            try:
                val = float(t.replace("FBS", "").strip())
                measurement_payload["fasting_blood_sugar"] = val
            except: pass
        if "BP" in t:
            try:
                bp = t.replace("BP", "").strip()
                sys_bp, dia_bp = map(float, bp.split('/'))
                measurement_payload["systolic_bp"] = sys_bp
                measurement_payload["diastolic_bp"] = dia_bp
            except: pass
        if "IOP" in t:
            try:
                val = float(t.replace("IOP", "").replace("mmHg", "").strip())
                measurement_payload["iop_left"] = val
                measurement_payload["iop_right"] = val
            except: pass
            
    # History
    history_str = str(row['History']) if pd.notna(row['History']) else ""
    history_list = [h.strip().lower() for h in history_str.split(';') if h.strip()]
    history_payload = {}
    for h in history_list:
        if "diabetes" in h: history_payload["diabetes"] = "Yes"
        if "hypertension" in h: history_payload["hypertension"] = "Yes"
        
    lifestyle_payload = {}
    for h in history_list:
        if "smoking" in h: lifestyle_payload["smoking"] = "Yes"
        if "stress" in h: lifestyle_payload["stress"] = "Yes"
        
    patient_data = {
        "age": age,
        "gender": gender
    }
    
    clinical_payload = {
        "medical_history": history_payload,
        "lifestyle": lifestyle_payload,
        "symptoms": symptom_payload,
        "measurements": measurement_payload
    }
    
    # 3. Run AI
    img_crop_path = cropped_paths.get(patient_id)
    if not img_crop_path or not os.path.exists(img_crop_path):
        print(f"Skipping {patient_id}, image not found.")
        continue
        
    try:
        analysis = run_retinal_analysis(img_crop_path, output_dir)
        ai_scores = analysis["disease_scores"]
        
        # 4. Fusion
        fusion_result = calculate_clinical_risk(ai_scores, patient_data, clinical_payload)
        fused = fusion_result["fused_scores"]
        
        # Top AI Disease
        top_ai_disease = max(ai_scores, key=ai_scores.get)
        top_ai_score = ai_scores[top_ai_disease]
        
        # Top Fused Disease
        top_fused_disease = max(fused, key=fused.get)
        top_fused_score = fused[top_fused_disease]
        
        results.append({
            "PatientID": patient_id,
            "Top AI": f"{top_ai_disease} ({top_ai_score:.1f}%)",
            "Top Fused": f"{top_fused_disease} ({top_fused_score:.1f}%)"
        })
        print(f"Processed {patient_id}: Fused = {top_fused_disease}")
    except Exception as e:
        print(f"Error processing {patient_id}: {e}")

# Save results
pd.DataFrame(results).to_csv('c:/Users/HP/OneDrive/Documents/EyeQ/data/evaluation_results.csv', index=False)
print("Finished evaluating all patients!")
