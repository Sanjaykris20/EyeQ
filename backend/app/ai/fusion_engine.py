import json
from typing import Dict, Any, List

# Disease list matching analyzer
DISEASES = ["DR", "Glaucoma", "AMD", "Cataract", "Myopia", "HR", "DME", "Papilledema", "CSR", "RVO"]

# Recommended test mapping based on final clinical risk
RECOMMENDED_TESTS_MAP = {
    "DR": ["HbA1c", "Fasting Blood Glucose", "Dilated Fundus Examination", "OCT"],
    "Glaucoma": ["Tonometry", "OCT", "Visual Field Test"],
    "AMD": ["OCT", "Amsler Grid Test", "Fluorescein Angiography"],
    "Cataract": ["Slit Lamp Examination", "Visual Acuity Test"],
    "Myopia": ["Refraction Test", "Axial Length Measurement"],
    "HR": ["Blood Pressure Monitoring", "Cardiovascular Evaluation"],
    "DME": ["OCT", "Fluorescein Angiography"],
    "Papilledema": ["MRI Brain", "CT Scan", "Lumbar Puncture", "Neurological Evaluation"],
    "CSR": ["OCT", "Fluorescein Angiography"],
    "RVO": ["CBC", "Lipid Profile", "OCT", "Fluorescein Angiography"]
}

def parse_int_safe(val, default=0):
    try:
        if val == "" or val is None:
            return default
        return int(val)
    except:
        return default

def parse_float_safe(val, default=0.0):
    try:
        if val == "" or val is None:
            return default
        return float(val)
    except:
        return default

def calculate_clinical_risk(ai_scores: Dict[str, float], patient_data: Dict[str, Any], clinical_payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Fuses AI Fundus Image Scores (70% weight) with Clinical Data (30% weight)
    to output final clinical risk scores and recommended diagnostic tests.
    """
    med_hist = clinical_payload.get("medical_history", {})
    fam_hist = clinical_payload.get("family_history", {})
    lifestyle = clinical_payload.get("lifestyle", {})
    symptoms = clinical_payload.get("symptoms", {})
    measurements = clinical_payload.get("measurements", {})
    
    age = parse_int_safe(patient_data.get("age"), 0)

    # Base risk accumulator per disease (max 30 points possible from clinical)
    # We will score clinical risk from 0 to 100, then weight it at 0.3.
    c_scores = {d: 0.0 for d in DISEASES}

    # --- 1. Medical History & Demographics (Max ~40 points of clinical) ---
    has_diabetes = med_hist.get("diabetes") == "Yes"
    has_htn = med_hist.get("hypertension") == "Yes"
    has_cholesterol = med_hist.get("high_cholesterol") == "Yes"
    
    if age > 50:
        c_scores["AMD"] += 15
        c_scores["Cataract"] += 15
        c_scores["Glaucoma"] += 10
    if age < 30:
        c_scores["Myopia"] += 20

    if has_diabetes:
        c_scores["DR"] += 25
        c_scores["DME"] += 20
        c_scores["RVO"] += 10
        c_scores["Cataract"] += 5
        
    if has_htn:
        c_scores["HR"] += 25
        c_scores["RVO"] += 15
        c_scores["Glaucoma"] += 5

    if has_cholesterol:
        c_scores["RVO"] += 15
        c_scores["AMD"] += 5
        
    if med_hist.get("steroid_use") == "Yes":
        c_scores["CSR"] += 15
        c_scores["Glaucoma"] += 10

    # --- 2. Family History (Max ~15 points) ---
    if fam_hist.get("glaucoma") == "Yes":
        c_scores["Glaucoma"] += 20
    if fam_hist.get("amd") == "Yes":
        c_scores["AMD"] += 15
    if fam_hist.get("diabetes") == "Yes":
        c_scores["DR"] += 10

    # --- 3. Lifestyle Factors (Max ~15 points) ---
    smoking = lifestyle.get("smoking", "Never Smoked")
    if smoking in ["Current Smoker", "Yes"]:
        c_scores["AMD"] += 15
        c_scores["RVO"] += 10
        c_scores["CSR"] += 5
        
    stress = lifestyle.get("stress_level", "Low")
    if stress == "High":
        c_scores["CSR"] += 20
        
    screen_time = parse_int_safe(lifestyle.get("screen_time"), 0)
    if screen_time > 6:
        c_scores["Myopia"] += 15

    # --- 4. Symptoms (Max ~30 points) ---
    if symptoms.get("blurred_vision") == "Yes":
        c_scores["DR"] += 10
        c_scores["AMD"] += 5
        c_scores["DME"] += 10
        c_scores["Cataract"] += 10
        c_scores["CSR"] += 5
        
    if symptoms.get("sudden_vision_loss") == "Yes":
        c_scores["RVO"] += 25
        c_scores["Papilledema"] += 15
        
    if symptoms.get("floaters") == "Yes":
        c_scores["DR"] += 15
        c_scores["RVO"] += 10
        
    if symptoms.get("distorted_vision") == "Yes":
        c_scores["AMD"] += 20
        c_scores["CSR"] += 20
        
    if symptoms.get("difficulty_distant") == "Yes":
        c_scores["Myopia"] += 25
        
    if symptoms.get("loss_side_vision") == "Yes":
        c_scores["Glaucoma"] += 25
        
    if symptoms.get("double_vision") == "Yes":
        c_scores["Papilledema"] += 15
        
    if symptoms.get("eye_pain") == "Yes":
        c_scores["Glaucoma"] += 15
        
    if symptoms.get("light_sensitivity") == "Yes":
        c_scores["Cataract"] += 15
        
    if symptoms.get("night_vision_difficulty") == "Yes":
        c_scores["Cataract"] += 15
        c_scores["AMD"] += 10
        
    if symptoms.get("halos_around_lights") == "Yes":
        c_scores["Glaucoma"] += 15
        c_scores["Cataract"] += 10
        
    if symptoms.get("color_vision_faded") == "Yes":
        c_scores["AMD"] += 15
        c_scores["Cataract"] += 10
        
    if symptoms.get("central_vision_loss") == "Yes":
        c_scores["AMD"] += 25
        c_scores["DME"] += 15
        c_scores["CSR"] += 15
        
    if symptoms.get("photopsia_flashes") == "Yes":
        c_scores["RVO"] += 15
        c_scores["DR"] += 10
        
    # Neurological symptoms for Papilledema
    neuro_count = 0
    for symp in ["severe_headache", "nausea", "vomiting", "dizziness", "vision_blackouts"]:
        if symptoms.get(symp) == "Yes":
            neuro_count += 1
    if neuro_count > 0:
        c_scores["Papilledema"] += neuro_count * 10
        if symptoms.get("vision_blackouts") == "Yes":
            c_scores["Papilledema"] += 15
            
    if symptoms.get("pulsatile_tinnitus") == "Yes":
        c_scores["Papilledema"] += 30

    # --- 5. Clinical Measurements (Max ~30 points) ---
    sys_bp = parse_int_safe(measurements.get("systolic_bp"), 120)
    dia_bp = parse_int_safe(measurements.get("diastolic_bp"), 80)
    if sys_bp >= 140 or dia_bp >= 90:
        c_scores["HR"] += 20
        c_scores["RVO"] += 10
    if sys_bp >= 160 or dia_bp >= 100:
        c_scores["HR"] += 15
        
    hba1c = parse_float_safe(measurements.get("hba1c"), 5.0)
    if hba1c >= 6.5:
        c_scores["DR"] += 20
        c_scores["DME"] += 15
    if hba1c >= 8.0:
        c_scores["DR"] += 15
        
    fbs = parse_float_safe(measurements.get("fasting_blood_sugar"), 90.0)
    if fbs >= 126:
        c_scores["DR"] += 15
        c_scores["DME"] += 10
        
    iop_l = parse_float_safe(measurements.get("iop_left"), 15.0)
    iop_r = parse_float_safe(measurements.get("iop_right"), 15.0)
    if max(iop_l, iop_r) > 21:
        c_scores["Glaucoma"] += 30

    # Cap raw clinical scores at 100
    for d in DISEASES:
        c_scores[d] = min(c_scores[d], 100.0)

    # --- FUSION: 70% AI, 30% Clinical Risk ---
    fused_scores = {}
    recommended_tests = []
    tests_set = set()
    
    for d in DISEASES:
        ai_s = ai_scores.get(d, 0.0)
        clin_s = c_scores[d]
        
        # Calculate Final Fused Score
        final_s = (ai_s * 0.70) + (clin_s * 0.30)
        
        # --- 100% SURETY OVERRIDE ---
        # If symptoms and measurements strongly indicate a disease, 
        # override the AI model and push confidence to 100%.
        if clin_s >= 40:
            final_s = max(final_s, 95.0 + (clin_s - 40.0) * 0.2)
        elif clin_s >= 20:
            final_s = max(final_s, 70.0 + (clin_s - 20.0) * 1.25)
            
        final_s = min(final_s, 100.0) # Cap at 100%
        fused_scores[d] = round(final_s, 1)
        
        # If final risk is above a threshold, recommend tests
        if final_s >= 40.0: # Moderate to High risk threshold
            for t in RECOMMENDED_TESTS_MAP[d]:
                if t not in tests_set:
                    tests_set.add(t)
                    recommended_tests.append(t)
                    
    # Also adjust RHI based on fused scores instead of pure AI scores
    max_risk = max(fused_scores.values()) / 100.0
    avg_risk = sum(fused_scores.values()) / len(fused_scores) / 100.0
    rhi_raw = 100.0 - (max_risk * 65.0 + avg_risk * 35.0)
    rhi_score = int(min(max(rhi_raw, 5), 98))

    return {
        "fused_scores": fused_scores,
        "clinical_scores": c_scores, # For reference/debugging
        "recommended_tests": recommended_tests,
        "fused_rhi": rhi_score
    }


def verify_diagnosis(disease: str, risk_score: float, confirmation_tests: Dict[str, Any]) -> Dict[str, Any]:
    """
    Checks if a disease risk is confirmed by its gold-standard clinical tests.
    Returns: {
        "status": "Verified" | "Pending" | "Low Risk",
        "message": str,
        "missing_tests": List[str]
    }
    """
    if risk_score < 40.0:
        return {
            "status": "Low Risk",
            "message": "Low Risk Profile",
            "missing_tests": []
        }

    # Helper to check if a test is completed in confirmation_tests
    def is_done(test_name: str) -> bool:
        test_val = confirmation_tests.get(test_name)
        if isinstance(test_val, dict):
            return test_val.get("completed") is True or test_val.get("completed") == "Yes"
        return test_val == "Yes" or test_val is True

    # Mapping of diseases to their required test groups
    # Each list represents a group of tests that must ALL be completed.
    # We can also support OR within a group (represented as tuples)
    requirements = {
        "DR": ["dilated_fundus_exam", ("hba1c_test", "fasting_blood_sugar_test")],
        "DME": ["oct_scan"],
        "CSR": ["oct_scan", "fluorescein_angiography"],
        "AMD": ["oct_scan", "amsler_grid_test"],
        "Glaucoma": ["tonometry", "oct_rnfl_scan", "visual_field_test"],
        "Papilledema": ["brain_mri_ct_scan", "lumbar_puncture"],
        "HR": ["blood_pressure_monitoring", ("carotid_doppler_ultrasound", "coagulation_profile")], # Hypertensive / Retinal Artery
        "RVO": ["fluorescein_angiography", "oct_scan"],
        "Myopia": ["axial_length_measurement", "refraction_test"],
        "Cataract": ["slit_lamp_exam", "visual_acuity_test"]
    }

    # Human readable names of tests for UI messages
    test_names_map = {
        "dilated_fundus_exam": "Dilated Fundus Exam",
        "hba1c_test": "HbA1c Lab Test",
        "fasting_blood_sugar_test": "Fasting Blood Sugar Test",
        "oct_scan": "OCT Scan",
        "fluorescein_angiography": "Fluorescein Angiography",
        "amsler_grid_test": "Amsler Grid Test",
        "tonometry": "Tonometry (IOP)",
        "oct_rnfl_scan": "OCT RNFL Scan",
        "visual_field_test": "Visual Field Test",
        "brain_mri_ct_scan": "Brain MRI/CT Scan",
        "lumbar_puncture": "Lumbar Puncture (Spinal Tap)",
        "blood_pressure_monitoring": "Blood Pressure Monitor",
        "carotid_doppler_ultrasound": "Carotid Doppler Ultrasound",
        "coagulation_profile": "Coagulation Profile",
        "axial_length_measurement": "Axial Length Measurement",
        "refraction_test": "Refraction Test",
        "slit_lamp_exam": "Slit Lamp Exam",
        "visual_acuity_test": "Visual Acuity Test"
    }

    req_tests = requirements.get(disease, [])
    missing = []
    
    for req in req_tests:
        if isinstance(req, tuple):
            # At least one of the tests in the tuple must be done
            if not any(is_done(t) for t in req):
                missing.append(" / ".join(test_names_map[t] for t in req))
        else:
            if not is_done(req):
                missing.append(test_names_map[req])

    if len(missing) == 0:
        return {
            "status": "Verified",
            "message": "100% Confirmed Clinical Diagnosis",
            "missing_tests": []
        }
    else:
        pending_str = ", ".join(missing)
        return {
            "status": "Pending",
            "message": f"AI Suggestion Only: Pending {pending_str} Confirmation",
            "missing_tests": missing
        }

def get_all_verifications(fused_scores: Dict[str, float], confirmation_tests: Dict[str, Any]) -> Dict[str, Any]:
    """
    Computes validation status for all 10 retinal diseases.
    """
    statuses = {}
    for d in DISEASES:
        risk = fused_scores.get(d, 0.0)
        statuses[d] = verify_diagnosis(d, risk, confirmation_tests)
    return statuses

def get_targeted_questions_and_tests(ai_scores: Dict[str, float]) -> Dict[str, Any]:
    """
    Dynamically selects which symptom questions and clinical measurement inputs
    to ask the patient based on the initial pure AI risk scores.
    """
    sorted_diseases = sorted(ai_scores.items(), key=lambda x: x[1], reverse=True)
    top_suspects = [d[0] for d in sorted_diseases if d[1] >= 10.0][:3]
    
    if not top_suspects:
        return {
            "symptoms_to_ask": ["blurred_vision", "eye_pain"],
            "measurements_to_ask": ["visual_acuity"]
        }
        
    symptoms_to_ask = set()
    measurements_to_ask = set()
    
    disease_symptom_map = {
        "DR": ["blurred_vision", "floaters", "photopsia_flashes"],
        "Glaucoma": ["loss_side_vision", "eye_pain", "halos_around_lights"],
        "AMD": ["distorted_vision", "night_vision_difficulty", "blurred_vision", "color_vision_faded", "central_vision_loss"],
        "Cataract": ["light_sensitivity", "night_vision_difficulty", "blurred_vision", "color_vision_faded", "halos_around_lights"],
        "Myopia": ["difficulty_distant"],
        "HR": [],
        "DME": ["blurred_vision", "distorted_vision", "central_vision_loss"],
        "Papilledema": ["sudden_vision_loss", "double_vision", "severe_headache", "vision_blackouts", "pulsatile_tinnitus"],
        "CSR": ["distorted_vision", "blurred_vision", "central_vision_loss"],
        "RVO": ["sudden_vision_loss", "floaters", "photopsia_flashes"]
    }
    
    disease_measurement_map = {
        "DR": ["hba1c", "fasting_blood_sugar"],
        "Glaucoma": ["iop_left", "iop_right"],
        "AMD": ["visual_acuity"],
        "Cataract": ["visual_acuity"],
        "Myopia": ["visual_acuity"],
        "HR": ["systolic_bp", "diastolic_bp"],
        "DME": ["hba1c", "fasting_blood_sugar"],
        "Papilledema": ["systolic_bp", "diastolic_bp"],
        "CSR": [],
        "RVO": ["systolic_bp", "diastolic_bp"]
    }
    
    for d in top_suspects:
        symptoms_to_ask.update(disease_symptom_map.get(d, []))
        measurements_to_ask.update(disease_measurement_map.get(d, []))
        
    return {
        "symptoms_to_ask": list(symptoms_to_ask),
        "measurements_to_ask": list(measurements_to_ask)
    }
