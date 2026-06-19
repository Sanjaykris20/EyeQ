import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import init_db, engine
from sqlmodel import Session
from app.firebase_db import pull_all_from_firebase
from app.routes import auth, patients, screenings, analytics, reports

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Hospital-Grade Retinal Disease Screening and Explainable AI platform"
)

# CORS configurations for frontend Next.js communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Fix CORS error with allow_credentials
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount local uploads and reports folders for image/file serving
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
os.makedirs(settings.REPORTS_DIR, exist_ok=True)
app.mount("/static/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/static/reports", StaticFiles(directory=settings.REPORTS_DIR), name="reports")

# Initialize database schemas on backend startup
@app.on_event("startup")
def on_startup():
    init_db()
    with Session(engine) as session:
        pull_all_from_firebase(session)

# Incorporate sub-routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(patients.router, prefix=settings.API_V1_STR)
app.include_router(screenings.router, prefix=settings.API_V1_STR)
app.include_router(analytics.router, prefix=settings.API_V1_STR)
app.include_router(reports.router, prefix=settings.API_V1_STR)

@app.get("/", tags=["System"])
def system_root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs"
    }

# Reload trigger
