from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from app.database import get_session
from app.models import Patient, Screening, Result, User
from app.auth import get_current_user
from collections import Counter
import numpy as np

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/summary")
def get_analytics_summary(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Computes key performance metrics for the main clinical dashboard.
    """
    patients = session.exec(select(Patient)).all()
    screenings = session.exec(select(Screening)).all()
    results = session.exec(select(Result)).all()
    
    total_patients = len(patients)
    total_screenings = len(screenings)
    
    # Calculate high risk cases (RHI < 50) and Average RHI
    high_risk_cases = 0
    avg_rhi = 0
    if results:
        rhi_scores = [r.rhi for r in results]
        high_risk_cases = sum(1 for rhi in rhi_scores if rhi < 50)
        avg_rhi = int(np.mean(rhi_scores))
    else:
        avg_rhi = 100

    # Calculate pending reviews
    pending_reviews = sum(1 for s in screenings if s.status == "pending")
    approved_reports = sum(1 for s in screenings if s.status == "approved")

    # Screenings done today (mock filter or filter by today's date)
    # Since it's a demo, we can count screenings from the current calendar day
    import datetime
    today = datetime.date.today()
    screenings_today = sum(1 for s in screenings if s.created_at.date() == today)

    return {
        "total_patients": total_patients,
        "total_screenings": total_screenings,
        "high_risk_cases": high_risk_cases,
        "average_rhi": avg_rhi,
        "screenings_today": screenings_today,
        "pending_reviews": pending_reviews,
        "reports_generated": approved_reports
    }

@router.get("/charts")
def get_chart_data(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Aggregates statistical chart data for Recharts/Chart.js frontends.
    """
    screenings = session.exec(select(Screening)).all()
    results = session.exec(select(Result)).all()
    patients = session.exec(select(Patient)).all()

    # 1. Disease Distribution (averages of disease scores)
    diseases = ["DR", "Glaucoma", "AMD", "Cataract", "Myopia", "HR", "DME", "Papilledema", "CSR", "RVO"]
    disease_avgs = {d: 0.0 for d in diseases}
    
    if results:
        for r in results:
            disease_avgs["DR"] += r.dr
            disease_avgs["Glaucoma"] += r.g
            disease_avgs["AMD"] += r.amd
            disease_avgs["Cataract"] += r.c
            disease_avgs["Myopia"] += r.m
            disease_avgs["HR"] += r.hr
            disease_avgs["DME"] += r.dme
            disease_avgs["Papilledema"] += r.p
            disease_avgs["CSR"] += r.csr
            disease_avgs["RVO"] += r.rvo
        
        # Divide by total
        n = len(results)
        disease_avgs = {k: round(v / n, 1) for k, v in disease_avgs.items()}

    disease_dist_list = [{"disease": k, "avg_probability": v} for k, v in disease_avgs.items()]

    # 2. Monthly Trends (screenings in the last 6 months)
    # In production, group by postgres date_trunc. Here we group by string month formatting.
    monthly_counts = {}
    for s in screenings:
        month_str = s.created_at.strftime("%b %Y")
        monthly_counts[month_str] = monthly_counts.get(month_str, 0) + 1
    
    # Sort them or format as list
    # For simulation, if list is empty, pre-populate last few months
    if not monthly_counts:
        monthly_counts = {"Jan 2026": 5, "Feb 2026": 8, "Mar 2026": 12, "Apr 2026": 19, "May 2026": 27, "Jun 2026": 1}
    
    monthly_trends_list = [{"month": k, "screenings": v} for k, v in monthly_counts.items()]

    # 3. RHI Distribution (Excellent, Healthy, Moderate, High Risk, Critical)
    rhi_brackets = {
        "Excellent (90-100)": 0,
        "Healthy (75-89)": 0,
        "Moderate (50-74)": 0,
        "High Risk (25-49)": 0,
        "Critical (0-24)": 0
    }
    for r in results:
        if r.rhi >= 90:
            rhi_brackets["Excellent (90-100)"] += 1
        elif r.rhi >= 75:
            rhi_brackets["Healthy (75-89)"] += 1
        elif r.rhi >= 50:
            rhi_brackets["Moderate (50-74)"] += 1
        elif r.rhi >= 25:
            rhi_brackets["High Risk (25-49)"] += 1
        else:
            rhi_brackets["Critical (0-24)"] += 1
            
    rhi_dist_list = [{"range": k, "count": v} for k, v in rhi_brackets.items()]

    # 4. Age Group Analysis (<30, 30-45, 46-60, >60)
    age_groups = {
        "Under 30": {"count": 0, "avg_rhi": 0.0},
        "30 - 45": {"count": 0, "avg_rhi": 0.0},
        "46 - 60": {"count": 0, "avg_rhi": 0.0},
        "Over 60": {"count": 0, "avg_rhi": 0.0}
    }
    
    patient_map = {p.id: p for p in patients}
    for r in results:
        scr = session.get(Screening, r.screening_id)
        if not scr:
            continue
        pat = patient_map.get(scr.patient_id)
        if not pat:
            continue
            
        age = pat.age
        if age < 30:
            grp = "Under 30"
        elif age <= 45:
            grp = "30 - 45"
        elif age <= 60:
            grp = "46 - 60"
        else:
            grp = "Over 60"
            
        age_groups[grp]["count"] += 1
        age_groups[grp]["avg_rhi"] += r.rhi

    age_group_list = []
    for grp, vals in age_groups.items():
        cnt = vals["count"]
        mean_rhi = round(vals["avg_rhi"] / cnt, 1) if cnt > 0 else 0.0
        age_group_list.append({
            "group": grp,
            "patient_count": cnt,
            "average_rhi": mean_rhi
        })

    return {
        "disease_distribution": disease_dist_list,
        "monthly_trends": monthly_trends_list,
        "rhi_distribution": rhi_dist_list,
        "age_group_analysis": age_group_list
    }
