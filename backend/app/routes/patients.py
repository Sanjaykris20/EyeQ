import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import Patient, PatientCreate, User
from app.auth import get_current_user

router = APIRouter(prefix="/patients", tags=["Patients"])

@router.post("", response_model=Patient, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_in: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Registers a new patient in the hospital screening database.
    """
    patient_id = f"pat_{uuid.uuid4().hex[:8]}"
    patient = Patient(
        id=patient_id,
        name=patient_in.name,
        age=patient_in.age,
        gender=patient_in.gender,
        phone=patient_in.phone,
        email=patient_in.email
    )
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient

@router.get("", response_model=list[dict])
def list_patients(
    search: str = "",
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Lists all patients, with optional search filter by name, returning their details and last scan date.
    """
    statement = select(Patient)
    if search:
        statement = statement.where(Patient.name.like(f"%{search}%"))
    
    patients = session.exec(statement).all()
    
    results = []
    for pat in patients:
        last_scan_date = None
        if pat.screenings:
            latest_s = max(pat.screenings, key=lambda s: s.created_at)
            last_scan_date = latest_s.created_at.isoformat()
            
        results.append({
            "id": pat.id,
            "name": pat.name,
            "age": pat.age,
            "gender": pat.gender,
            "phone": pat.phone,
            "email": pat.email,
            "created_at": pat.created_at,
            "last_scan_date": last_scan_date
        })
    return results

@router.get("/{patient_id}", response_model=dict)
def get_patient(
    patient_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieves full profile and retinal history of a specific patient.
    """
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    # Get screenings sorted by date
    screenings = sorted(patient.screenings, key=lambda s: s.created_at, reverse=True)
    
    screenings_list = []
    for s in screenings:
        # Get results
        result = s.results[0] if s.results else None
        screenings_list.append({
            "id": s.id,
            "image_url": s.image_url,
            "enhanced_image_url": s.enhanced_image_url,
            "heatmap_image_url": s.heatmap_image_url,
            "severity_dr": s.severity_dr,
            "status": s.status,
            "notes": s.notes,
            "created_at": s.created_at,
            "rhi": result.rhi if result else None
        })

    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "phone": patient.phone,
        "email": patient.email,
        "created_at": patient.created_at,
        "screenings": screenings_list
    }

@router.put("/{patient_id}", response_model=Patient)
def update_patient(
    patient_id: str,
    patient_in: PatientCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Modifies an existing patient profile.
    """
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    patient.name = patient_in.name
    patient.age = patient_in.age
    patient.gender = patient_in.gender
    patient.phone = patient_in.phone
    patient.email = patient_in.email
    
    session.add(patient)
    session.commit()
    session.refresh(patient)
    return patient

@router.delete("/{patient_id}")
def delete_patient(
    patient_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a patient record (Admin/Doctor privilege).
    """
    patient = session.get(Patient, patient_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient profile not found")
        
    session.delete(patient)
    session.commit()
    return {"message": "Patient profile and all associated diagnostic screenings deleted successfully"}
