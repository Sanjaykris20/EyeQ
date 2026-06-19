import sys
sys.path.append('c:/Users/HP/OneDrive/Documents/EyeQ/backend')
from app.ai.fusion_engine import calculate_clinical_risk, DISEASES

def test_disease(target_disease, mock_ai_score, clinical_payload):
    ai_scores = {d: 10.0 for d in DISEASES}
    ai_scores[target_disease] = mock_ai_score
    
    patient_data = {"age": 60, "gender": "Male"}
    
    res = calculate_clinical_risk(ai_scores, patient_data, clinical_payload)
    fused = res["fused_scores"]
    top_disease = max(fused, key=fused.get)
    
    print(f"Target: {target_disease:<12} | Predicted: {top_disease:<12} | Score: {fused[top_disease]:.1f}% | Pass: {target_disease == top_disease}")

print("--- Testing all 8 diseases ---")

# 1. DR
test_disease("DR", 85.0, {
    "medical_history": {"diabetes": "Yes"},
    "symptoms": {"blurred_vision": "Yes"},
    "measurements": {"hba1c": 9.5}
})

# 2. CSR
test_disease("CSR", 76.0, {
    "medical_history": {"steroid_use": "Yes"},
    "symptoms": {"distorted_vision": "Yes", "central_vision_loss": "Yes"},
    "lifestyle": {"stress_level": "High"}
})

# 3. AMD
test_disease("AMD", 82.0, {
    "symptoms": {"distorted_vision": "Yes", "central_vision_loss": "Yes"},
    "lifestyle": {"smoking": "Yes"}
})

# 4. Myopia
test_disease("Myopia", 88.0, {
    "symptoms": {"difficulty_distant": "Yes"},
    "lifestyle": {"screen_time": 8}
})

# 5. HR
test_disease("HR", 78.0, {
    "medical_history": {"hypertension": "Yes"},
    "measurements": {"systolic_bp": 170, "diastolic_bp": 105}
})

# 6. RAVO
test_disease("RAVO", 84.0, {
    "medical_history": {"hypertension": "Yes", "high_cholesterol": "Yes"},
    "symptoms": {"sudden_vision_loss": "Yes"}
})

# 7. Papilledema
test_disease("Papilledema", 81.0, {
    "symptoms": {"severe_headache": "Yes", "vision_blackouts": "Yes", "pulsatile_tinnitus": "Yes"}
})

# 8. RD
test_disease("RD", 85.0, {
    "symptoms": {"loss_side_vision": "Yes", "floaters": "Yes", "photopsia_flashes": "Yes"}
})
