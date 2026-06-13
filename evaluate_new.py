import cv2
import numpy as np
import pandas as pd
import os
import sys

sys.path.append('c:/Users/HP/OneDrive/Documents/EyeQ/backend')
from app.ai.analyzer import run_retinal_analysis
from app.ai.fusion_engine import calculate_clinical_risk

output_dir = 'c:/Users/HP/OneDrive/Documents/EyeQ/data/crops_new'
csv_path = 'c:/Users/HP/OneDrive/Documents/EyeQ/EyeQ_20_Patients_Full.csv'
df = pd.read_csv(csv_path)

results = []

for index, row in df.iterrows():
    patient_id = row['PatientID']
    age = row['Age']
    gender = row['Gender']
    
    # Parse Symptoms
    symptoms_str = str(row['Symptoms']) if pd.notna(row['Symptoms']) else ""
    symptoms_list = [s.strip().lower() for s in symptoms_str.split(';') if s.strip()]
    
    symptoms_map = {
        "blurred vision": "blurred_vision",
        "floaters": "floaters",
        "wavy vision": "distorted_vision",
        "reading difficulty": "distorted_vision",
        "central blur": "distorted_vision",
        "central distortion": "distorted_vision",
        "side vision loss": "loss_side_vision",
        "peripheral vision loss": "loss_side_vision",
        "distance vision difficulty": "difficulty_distant",
        "distance blur": "difficulty_distant",
        "sudden vision loss": "sudden_vision_loss",
        "sudden blind spot": "sudden_vision_loss",
        "vision loss": "sudden_vision_loss",
        "headache": "severe_headache",
        "nausea": "severe_headache", 
        "vomiting": "severe_headache",
        "flashes": "vision_blackouts",
        "curtain shadow": "vision_blackouts"
    }
    
    symptom_payload = {}
    for s in symptoms_list:
        mapped = symptoms_map.get(s)
        if mapped:
            symptom_payload[mapped] = "Yes"

    # Measurements & Tests
    tests_str = str(row['ClinicalData']) if pd.notna(row['ClinicalData']) else ""
    tests_list = [t.strip() for t in tests_str.split(';') if t.strip()]
    
    measurement_payload = {}
    for t in tests_list:
        if "HbA1c" in t:
            try: measurement_payload["hba1c"] = float(t.replace("HbA1c", "").replace("%", "").strip())
            except: pass
        if "FBS" in t:
            try: measurement_payload["fasting_blood_sugar"] = float(t.replace("FBS", "").strip())
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
        if "htn" in h or "hypertension" in h: history_payload["hypertension"] = "Yes"
        
    lifestyle_payload = {}
    for h in history_list:
        if "smoker" in h or "smoking" in h: lifestyle_payload["smoking"] = "Yes"
        if "stress" in h: lifestyle_payload["stress"] = "Yes"
        
    patient_data = {"age": age, "gender": gender}
    clinical_payload = {
        "medical_history": history_payload,
        "lifestyle": lifestyle_payload,
        "symptoms": symptom_payload,
        "measurements": measurement_payload
    }
    
    img_crop_path = os.path.join(output_dir, f"{patient_id}.png")
    if not os.path.exists(img_crop_path):
        print(f"Skipping {patient_id}, image not found.")
        continue
        
    try:
        analysis = run_retinal_analysis(img_crop_path, output_dir)
        ai_scores = analysis["disease_scores"]
        fusion_result = calculate_clinical_risk(ai_scores, patient_data, clinical_payload)
        fused = fusion_result["fused_scores"]
        
        top_fused_disease = max(fused, key=fused.get)
        results.append(f"| **{patient_id}** | {top_fused_disease} |")
        print(f"Processed {patient_id}: Fused = {top_fused_disease}")
    except Exception as e:
        print(f"Error processing {patient_id}: {e}")

print("\n\n--- FINAL RESULTS TABLE ---")
print("| Patient ID | EyeQ System Prediction |")
print("| :--- | :--- |")
for r in results:
    print(r)
