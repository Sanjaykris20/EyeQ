from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship
from sqlalchemy import Column, JSON

# --- DATABASE MODELS ---

class User(SQLModel, table=True):
    __tablename__ = "users"
    id: str = Field(primary_key=True, index=True) # Firebase UID
    name: str
    email: str = Field(unique=True, index=True)
    role: str = Field(default="doctor") # doctor | admin | viewer

    screenings: List["Screening"] = Relationship(back_populates="creator")


class Patient(SQLModel, table=True):
    __tablename__ = "patients"
    id: str = Field(primary_key=True, index=True)
    name: str
    age: int
    gender: str
    height: Optional[float] = None # cm
    weight: Optional[float] = None # kg
    occupation: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

    screenings: List["Screening"] = Relationship(back_populates="patient", cascade_delete=True)


class Screening(SQLModel, table=True):
    __tablename__ = "screenings"
    id: str = Field(primary_key=True, index=True)
    patient_id: str = Field(foreign_key="patients.id", index=True, ondelete="CASCADE")
    
    # AI Analysis
    image_url: str
    enhanced_image_url: Optional[str] = None
    heatmap_image_url: Optional[str] = None
    severity_dr: str = Field(default="No DR") # No DR | Mild | Moderate | Severe | Proliferative
    
    # Clinical Assessment Data
    medical_history: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    family_history: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    lifestyle: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    symptoms: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    measurements: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    confirmation_tests: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))

    status: str = Field(default="pending") # pending | approved | rejected
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[str] = Field(default=None, foreign_key="users.id")

    patient: Patient = Relationship(back_populates="screenings")
    creator: Optional[User] = Relationship(back_populates="screenings")
    results: List["Result"] = Relationship(back_populates="screening", cascade_delete=True)
    reports: List["Report"] = Relationship(back_populates="screening", cascade_delete=True)


class Result(SQLModel, table=True):
    __tablename__ = "results"
    id: str = Field(primary_key=True, index=True)
    screening_id: str = Field(foreign_key="screenings.id", index=True, ondelete="CASCADE")
    
    # AI Image Probabilities (0-100)
    dr: float = Field(default=0.0)
    csr: float = Field(default=0.0)
    amd: float = Field(default=0.0)
    m: float = Field(default=0.0)
    hr: float = Field(default=0.0)
    ravo: float = Field(default=0.0)
    p: float = Field(default=0.0)
    rd: float = Field(default=0.0)

    # Final Fused Clinical Risks (0-100)
    clinical_dr: float = Field(default=0.0)
    clinical_csr: float = Field(default=0.0)
    clinical_amd: float = Field(default=0.0)
    clinical_m: float = Field(default=0.0)
    clinical_hr: float = Field(default=0.0)
    clinical_ravo: float = Field(default=0.0)
    clinical_p: float = Field(default=0.0)
    clinical_rd: float = Field(default=0.0)
    
    recommended_tests: List[str] = Field(default_factory=list, sa_column=Column(JSON))
    
    rhi: int = Field(default=100) # Retinal Health Index (0-100)

    screening: Screening = Relationship(back_populates="results")


class Report(SQLModel, table=True):
    __tablename__ = "reports"
    id: str = Field(primary_key=True, index=True)
    screening_id: str = Field(foreign_key="screenings.id", index=True, ondelete="CASCADE")
    pdf_url: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

    screening: Screening = Relationship(back_populates="reports")


# --- PYDANTIC DTO LAYERS ---

class UserCreate(SQLModel):
    id: str
    name: str
    email: str
    role: Optional[str] = "doctor"

class PatientCreate(SQLModel):
    name: str
    age: int
    gender: str
    height: Optional[float] = None
    weight: Optional[float] = None
    occupation: Optional[str] = None
    location: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

class ScreeningCreate(SQLModel):
    patient_id: str
    notes: Optional[str] = None

class ScreeningReviewUpdate(SQLModel):
    status: str # approved | rejected
    notes: Optional[str] = None

class UserUpdate(SQLModel):
    role: str
