import os
import uuid
import shutil
import json
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import Screening, Result, Patient, User, ScreeningReviewUpdate
from app.config import settings
from app.auth import get_current_user
from app.ai.analyzer import run_retinal_analysis
from app.ai.fusion_engine import calculate_clinical_risk, get_all_verifications, get_targeted_questions_and_tests
from app.ai.assistant import generate_medical_response

router = APIRouter(prefix="/screenings", tags=["Retinal Screenings"])

@router.post("/pre-screen", status_code=status.HTTP_201_CREATED)
async def pre_screen_scan(
    patient_id: str = Form(...),
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Stage 1: Uploads a fundus photograph and runs PyTorch analysis.
    Returns AI scores and dynamically determines which symptoms and tests to ask next.
    """
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".jpg", ".jpeg", ".png"]:
        raise HTTPException(status_code=400, detail="Unsupported file format.")

    screening_id = f"scr_{uuid.uuid4().hex[:8]}"
    raw_filename = f"raw_{screening_id}{ext}"
    raw_path = os.path.join(settings.UPLOAD_DIR, raw_filename)

    try:
        with open(raw_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save scan: {e}")

    try:
        analysis = run_retinal_analysis(raw_path, settings.UPLOAD_DIR)
    except Exception as e:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise HTTPException(status_code=500, detail=f"AI inference failed: {e}")

    ai_scores = analysis["disease_scores"]
    targeted_data = get_targeted_questions_and_tests(ai_scores)

    image_url = f"/static/uploads/{raw_filename}"
    enhanced_image_url = f"/static/uploads/{analysis['enhanced_filename']}"
    heatmap_image_url = f"/static/uploads/{analysis['heatmap_filename']}"

    screening = Screening(
        id=screening_id,
        patient_id=patient_id,
        image_url=image_url,
        enhanced_image_url=enhanced_image_url,
        heatmap_image_url=heatmap_image_url,
        severity_dr=analysis["severity_dr"],
        status="awaiting_clinical_data",
        created_by=current_user.id
    )

    result_id = f"res_{uuid.uuid4().hex[:8]}"
    result = Result(
        id=result_id,
        screening_id=screening_id,
        dr=ai_scores["DR"],
        g=ai_scores["Glaucoma"],
        amd=ai_scores["AMD"],
        c=ai_scores["Cataract"],
        m=ai_scores["Myopia"],
        hr=ai_scores["HR"],
        dme=ai_scores["DME"],
        p=ai_scores["Papilledema"],
        csr=ai_scores["CSR"],
        rvo=ai_scores["RVO"],
        rhi=100
    )

    session.add(screening)
    session.add(result)
    session.commit()
    
    return {
        "screening_id": screening_id,
        "ai_scores": ai_scores,
        "targeted_data": targeted_data
    }

@router.put("/{screening_id}/finalize")
async def finalize_screening(
    screening_id: str,
    notes: Optional[str] = Form(None),
    medical_history: Optional[str] = Form("{}"),
    family_history: Optional[str] = Form("{}"),
    lifestyle: Optional[str] = Form("{}"),
    symptoms: Optional[str] = Form("{}"),
    measurements: Optional[str] = Form("{}"),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Stage 2/3: Finalizes the screening by providing the requested clinical data
    and fusing it with the AI score.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening not found")
    
    if screening.status != "awaiting_clinical_data":
        raise HTTPException(status_code=400, detail="Screening is not awaiting clinical data.")
        
    result = screening.results[0] if screening.results else None
    if not result:
        raise HTTPException(status_code=500, detail="Corrupted screening, no AI result found.")

    def parse_json_form(field):
        try:
            return json.loads(field) if field else {}
        except Exception:
            return {}

    clinical_payload = {
        "medical_history": parse_json_form(medical_history),
        "family_history": parse_json_form(family_history),
        "lifestyle": parse_json_form(lifestyle),
        "symptoms": parse_json_form(symptoms),
        "measurements": parse_json_form(measurements),
    }

    patient_data = {
        "age": screening.patient.age,
        "gender": screening.patient.gender
    }

    ai_scores = {
        "DR": result.dr, "Glaucoma": result.g, "AMD": result.amd, "Cataract": result.c,
        "Myopia": result.m, "HR": result.hr, "DME": result.dme, "Papilledema": result.p,
        "CSR": result.csr, "RVO": result.rvo
    }

    fusion_result = calculate_clinical_risk(ai_scores, patient_data, clinical_payload)
    fused = fusion_result["fused_scores"]

    screening.notes = notes
    screening.medical_history = clinical_payload["medical_history"]
    screening.family_history = clinical_payload["family_history"]
    screening.lifestyle = clinical_payload["lifestyle"]
    screening.symptoms = clinical_payload["symptoms"]
    screening.measurements = clinical_payload["measurements"]
    screening.status = "pending"

    result.clinical_dr = fused["DR"]
    result.clinical_g = fused["Glaucoma"]
    result.clinical_amd = fused["AMD"]
    result.clinical_c = fused["Cataract"]
    result.clinical_m = fused["Myopia"]
    result.clinical_hr = fused["HR"]
    result.clinical_dme = fused["DME"]
    result.clinical_p = fused["Papilledema"]
    result.clinical_csr = fused["CSR"]
    result.clinical_rvo = fused["RVO"]
    
    result.recommended_tests = fusion_result["recommended_tests"]
    result.rhi = fusion_result["fused_rhi"]

    session.add(screening)
    session.add(result)
    session.commit()
    session.refresh(screening)
    session.refresh(result)

    return {
        "screening": screening,
        "results": result
    }

@router.get("", response_model=list[dict])
def list_screenings(
    patient_id: Optional[str] = None,
    status: Optional[str] = None,
    risk: Optional[str] = None, # high, moderate, low
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Lists screenings with optional patient, review status, and RHI risk range filters.
    """
    statement = select(Screening)
    if patient_id:
        statement = statement.where(Screening.patient_id == patient_id)
    if status:
        statement = statement.where(Screening.status == status)

    screenings = session.exec(statement).all()
    results = []

    for s in screenings:
        res = s.results[0] if s.results else None
        
        # Apply risk filter on RHI score
        if risk and res:
            if risk == "low" and res.rhi < 75:
                continue
            elif risk == "moderate" and (res.rhi < 50 or res.rhi >= 75):
                continue
            elif risk == "high" and res.rhi >= 50:
                continue
                
        results.append({
            "id": s.id,
            "patient_id": s.patient_id,
            "patient_name": s.patient.name,
            "image_url": s.image_url,
            "severity_dr": s.severity_dr,
            "status": s.status,
            "created_at": s.created_at,
            "rhi": res.rhi if res else None
        })

    # Sort screenings by newest first
    results.sort(key=lambda x: x["created_at"], reverse=True)
    return results

@router.get("/{screening_id}", response_model=dict)
def get_screening(
    screening_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves detailed diagnosis and patient metrics for a specific screening, including previous screening comparison.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Retinal screening record not found")

    result = screening.results[0] if screening.results else None
    
    # Locate patient's screening immediately prior to this one
    sorted_screenings = sorted(screening.patient.screenings, key=lambda s: s.created_at)
    prev_screening = None
    for idx, s in enumerate(sorted_screenings):
        if s.id == screening.id:
            if idx > 0:
                prev_screening = sorted_screenings[idx - 1]
            break
            
    prev_screening_data = None
    if prev_screening:
        p_res = prev_screening.results[0] if prev_screening.results else None
        prev_screening_data = {
            "id": prev_screening.id,
            "severity_dr": prev_screening.severity_dr,
            "created_at": prev_screening.created_at,
            "results": {
                "dr": p_res.dr if p_res else 0.0,
                "g": p_res.g if p_res else 0.0,
                "amd": p_res.amd if p_res else 0.0,
                "c": p_res.c if p_res else 0.0,
                "m": p_res.m if p_res else 0.0,
                "hr": p_res.hr if p_res else 0.0,
                "dme": p_res.dme if p_res else 0.0,
                "p": p_res.p if p_res else 0.0,
                "csr": p_res.csr if p_res else 0.0,
                "rvo": p_res.rvo if p_res else 0.0,
                "rhi": p_res.rhi if p_res else 100
            }
        }
    
    return {
        "id": screening.id,
        "patient": {
            "id": screening.patient.id,
            "name": screening.patient.name,
            "age": screening.patient.age,
            "gender": screening.patient.gender,
            "phone": screening.patient.phone,
            "email": screening.patient.email
        },
        "image_url": screening.image_url,
        "enhanced_image_url": screening.enhanced_image_url,
        "heatmap_image_url": screening.heatmap_image_url,
        "severity_dr": screening.severity_dr,
        "status": screening.status,
        "notes": screening.notes,
        "created_at": screening.created_at,
        "creator_name": screening.creator.name if screening.creator else "System",
        "medical_history": screening.medical_history,
        "family_history": screening.family_history,
        "lifestyle": screening.lifestyle,
        "symptoms": screening.symptoms,
        "measurements": screening.measurements,
        "confirmation_tests": screening.confirmation_tests,
        "verification_statuses": get_all_verifications({
            "DR": result.clinical_dr if result else 0.0,
            "Glaucoma": result.clinical_g if result else 0.0,
            "AMD": result.clinical_amd if result else 0.0,
            "Cataract": result.clinical_c if result else 0.0,
            "Myopia": result.clinical_m if result else 0.0,
            "HR": result.clinical_hr if result else 0.0,
            "DME": result.clinical_dme if result else 0.0,
            "Papilledema": result.clinical_p if result else 0.0,
            "CSR": result.clinical_csr if result else 0.0,
            "RVO": result.clinical_rvo if result else 0.0,
        }, screening.confirmation_tests or {}),
        "results": {
            # AI Scores
            "dr": result.dr if result else 0.0,
            "g": result.g if result else 0.0,
            "amd": result.amd if result else 0.0,
            "c": result.c if result else 0.0,
            "m": result.m if result else 0.0,
            "hr": result.hr if result else 0.0,
            "dme": result.dme if result else 0.0,
            "p": result.p if result else 0.0,
            "csr": result.csr if result else 0.0,
            "rvo": result.rvo if result else 0.0,
            # Fused Clinical Scores
            "clinical_dr": result.clinical_dr if result else 0.0,
            "clinical_g": result.clinical_g if result else 0.0,
            "clinical_amd": result.clinical_amd if result else 0.0,
            "clinical_c": result.clinical_c if result else 0.0,
            "clinical_m": result.clinical_m if result else 0.0,
            "clinical_hr": result.clinical_hr if result else 0.0,
            "clinical_dme": result.clinical_dme if result else 0.0,
            "clinical_p": result.clinical_p if result else 0.0,
            "clinical_csr": result.clinical_csr if result else 0.0,
            "clinical_rvo": result.clinical_rvo if result else 0.0,
            "recommended_tests": result.recommended_tests if result else [],
            "rhi": result.rhi if result else 100
        },
        "previous_screening": prev_screening_data
    }

@router.put("/{screening_id}/review", response_model=dict)
def review_screening_case(
    screening_id: str,
    review_in: ScreeningReviewUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a clinical specialist to approve or reject a screening, and append notes.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Retinal screening record not found")

    if review_in.status not in ["approved", "rejected", "pending"]:
        raise HTTPException(status_code=400, detail="Invalid review status.")

    screening.status = review_in.status
    if review_in.notes is not None:
        screening.notes = review_in.notes

    session.add(screening)
    session.commit()
    session.refresh(screening)
    return {"message": "Case reviewed successfully", "screening": screening}

@router.put("/{screening_id}/verify", response_model=dict)
def verify_screening_tests(
    screening_id: str,
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Allows a clinician to check off completed diagnostic confirmation tests for a patient.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Retinal screening record not found")
        
    tests = payload.get("confirmation_tests", {})
    
    # Merge or overwrite confirmation_tests
    updated_tests = {**(screening.confirmation_tests or {}), **tests}
    screening.confirmation_tests = updated_tests
    
    session.add(screening)
    session.commit()
    session.refresh(screening)
    
    return {"message": "Verification tests updated successfully", "confirmation_tests": screening.confirmation_tests}

@router.post("/assistant", response_model=dict)
def ask_assistant(
    payload: dict,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Queries EyeQ Assist medical bot about retinal screening.
    Supports feeding active screening details as system context.
    """
    question = payload.get("question", "")
    screening_id = payload.get("screening_id")
    
    context = ""
    if screening_id:
        screening = session.get(Screening, screening_id)
        if screening and screening.results:
            res = screening.results[0]
            context = (
                f"Patient Name: {screening.patient.name}, Age: {screening.patient.age}, "
                f"RHI: {res.rhi}, DR Prob: {res.dr}%, DR Stage: {screening.severity_dr}, "
                f"Glaucoma Prob: {res.g}%, AMD: {res.amd}%, HR: {res.hr}%, RVO: {res.rvo}%."
            )

    response_text = generate_medical_response(question, context)
    return {"response": response_text}
