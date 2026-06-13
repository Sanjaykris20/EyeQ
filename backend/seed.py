import os
import uuid
import datetime
import cv2
import numpy as np
from sqlmodel import Session, SQLModel, create_engine
from app.config import settings
from app.models import User, Patient, Screening, Result, Report

def generate_mock_retina_scan(base_path, prefix, seed_id, draw_heatmap=False, draw_enhanced=False):
    """
    Programmatically draws a realistic mock fundus photograph (orange disc, vascular vessels)
    or its corresponding GradCAM activation heatmap.
    """
    os.makedirs(base_path, exist_ok=True)
    filename = f"{prefix}_{seed_id}.png"
    filepath = os.path.join(base_path, filename)

    # Base image dimensions (square)
    img = np.zeros((400, 400, 3), dtype=np.uint8)

    # 1. Draw central fundus circle (dark orange/red sphere)
    center = (200, 200)
    radius = 160
    cv2.circle(img, center, radius, (15, 75, 220), -1) # BGR (Orange-red)
    
    # Add subtle texture shading
    cv2.circle(img, center, radius - 15, (20, 85, 235), -1)

    # 2. Draw Optic Disc (yellowish circle at the side)
    disc_center = (120, 200)
    cv2.circle(img, disc_center, 30, (100, 220, 250), -1) # BGR (Light yellow)

    # 3. Draw Retinal Vasculature (red branching lines)
    np.random.seed(42) # Ensure deterministic drawings
    for angle in np.linspace(0, 2 * np.pi, 12):
        start_pt = (disc_center[0] + int(30 * np.cos(angle)), disc_center[1] + int(30 * np.sin(angle)))
        
        # Draw branching line outwards
        pt = start_pt
        for step in range(5):
            next_pt = (
                pt[0] + int(35 * np.cos(angle + np.random.uniform(-0.3, 0.3))),
                pt[1] + int(35 * np.sin(angle + np.random.uniform(-0.3, 0.3)))
            )
            # Clip inside the fundus bounds
            dist = np.sqrt((next_pt[0]-200)**2 + (next_pt[1]-200)**2)
            if dist < radius - 5:
                cv2.line(img, pt, next_pt, (10, 10, 140), 2) # Dark red vessel
                pt = next_pt

    # Apply enhancement filter if requested
    if draw_enhanced:
        # Increase saturation and sharpen details to simulate ESRGAN+CLAHE
        img = cv2.convertScaleAbs(img, alpha=1.25, beta=10)
        img_lab = cv2.cvtColor(img, cv2.COLOR_BGR2LAB)
        l, a, b = cv2.split(img_lab)
        clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(8, 8))
        l_enhanced = clahe.apply(l)
        img_lab_enhanced = cv2.merge((l_enhanced, a, b))
        img = cv2.cvtColor(img_lab_enhanced, cv2.COLOR_LAB2BGR)
        # Apply slight sharpening
        gaussian_blur = cv2.GaussianBlur(img, (5, 5), 5.0)
        img = cv2.addWeighted(img, 1.5, gaussian_blur, -0.5, 0)

    # Overlay GradCAM heatmap if requested
    if draw_heatmap:
        overlay = img.copy()
        # Create a glowing radial hotspot near the center (macula risk zone)
        heatmap = np.zeros((400, 400), dtype=np.uint8)
        cv2.circle(heatmap, (230, 180), 65, 255, -1)
        # Blur the hotspot to make it a gradient glow
        heatmap_blurred = cv2.GaussianBlur(heatmap, (85, 85), 0)
        heatmap_color = cv2.applyColorMap(heatmap_blurred, cv2.COLORMAP_JET)
        
        # Blend
        img = cv2.addWeighted(overlay, 0.65, heatmap_color, 0.35, 0)

    cv2.imwrite(filepath, img)
    return f"/static/uploads/{filename}"

def seed_database():
    print("Connecting to database and initializing mock schemas...")
    # SQLite connection setup
    connect_args = {}
    if settings.DATABASE_URL.startswith("sqlite"):
        connect_args = {"check_same_thread": False}
    engine = create_engine(settings.DATABASE_URL, echo=False, connect_args=connect_args)
    
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # 1. Create Default Users (Firebase sync simulation)
        doctor = User(
            id="demo_doctor_id",
            name="Dr. Alex Carter",
            email="alex.carter@eyeq.innovate",
            role="doctor"
        )
        admin = User(
            id="demo_admin_id",
            name="Dr. Evelyn Ross (Admin)",
            email="evelyn.ross@eyeq.innovate",
            role="admin"
        )
        session.add(doctor)
        session.add(admin)
        print("Demo staff profiles seeded.")

        # 2. Create Patient Registry Profiles
        p1 = Patient(
            id="pat_sterling",
            name="Marcus Sterling",
            age=56,
            gender="Male",
            phone="+1 (555) 019-2834",
            email="marcus.s@mail.org",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=120)
        )
        p2 = Patient(
            id="pat_jenkins",
            name="Sarah Jenkins",
            age=68,
            gender="Female",
            phone="+1 (555) 041-9876",
            email="s.jenkins@clinical.net",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=90)
        )
        p3 = Patient(
            id="pat_rostova",
            name="Elena Rostova",
            age=29,
            gender="Female",
            phone="+1 (555) 084-2391",
            email="elena.r@agency.com",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=30)
        )
        session.add(p1)
        session.add(p2)
        session.add(p3)
        print("Demo patient registries seeded.")

        # 3. Seed Retinal Screenings and Scans
        uploads_dir = settings.UPLOAD_DIR
        
        # Case A0: Marcus Sterling Older Screening (for historical comparison demonstration)
        scr_id0 = "scr_demo_sterling_old"
        raw_url0 = generate_mock_retina_scan(uploads_dir, "raw", scr_id0)
        enh_url0 = generate_mock_retina_scan(uploads_dir, "enhanced", scr_id0, draw_enhanced=True)
        hmp_url0 = generate_mock_retina_scan(uploads_dir, "heatmap", scr_id0, draw_heatmap=True)

        scr0 = Screening(
            id=scr_id0,
            patient_id=p1.id,
            image_url=raw_url0,
            enhanced_image_url=enh_url0,
            heatmap_image_url=hmp_url0,
            severity_dr="Moderate",
            status="approved",
            notes="Baseline retinal screening for Marcus Sterling. Moderate diabetic retinopathy signs noticed.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=45),
            created_by=doctor.id
        )

        res0 = Result(
            id="res_sterling_old",
            screening_id=scr_id0,
            dr=48.2,
            g=10.5,
            amd=3.8,
            c=12.0,
            m=2.0,
            hr=55.0,
            dme=51.2,
            p=5.0,
            csr=12.0,
            rvo=18.0,
            rhi=62 # Moderate Risk Gauge
        )
        session.add(scr0)
        session.add(res0)

        # Case A: Marcus Sterling (High Risk Case - Diabetic Retinopathy)
        scr_id1 = "scr_demo_sterling"
        raw_url1 = generate_mock_retina_scan(uploads_dir, "raw", scr_id1)
        enh_url1 = generate_mock_retina_scan(uploads_dir, "enhanced", scr_id1, draw_enhanced=True)
        hmp_url1 = generate_mock_retina_scan(uploads_dir, "heatmap", scr_id1, draw_heatmap=True)

        scr1 = Screening(
            id=scr_id1,
            patient_id=p1.id,
            image_url=raw_url1,
            enhanced_image_url=enh_url1,
            heatmap_image_url=hmp_url1,
            severity_dr="Severe",
            status="pending",
            notes="Patient reports blurred central field vision. Uncontrolled blood glucose levels (HbA1c: 8.9%).",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=2),
            created_by=doctor.id
        )

        res1 = Result(
            id="res_sterling",
            screening_id=scr_id1,
            dr=86.5,
            g=12.1,
            amd=4.2,
            c=15.0,
            m=2.3,
            hr=78.2,
            dme=82.4,
            p=6.8,
            csr=14.5,
            rvo=22.1,
            rhi=38 # High Risk Gauge
        )
        session.add(scr1)
        session.add(res1)

        # Case B: Sarah Jenkins (Moderate Case - Glaucoma indicators)
        scr_id2 = "scr_demo_jenkins"
        raw_url2 = generate_mock_retina_scan(uploads_dir, "raw", scr_id2)
        enh_url2 = generate_mock_retina_scan(uploads_dir, "enhanced", scr_id2, draw_enhanced=True)
        hmp_url2 = generate_mock_retina_scan(uploads_dir, "heatmap", scr_id2, draw_heatmap=True)

        scr2 = Screening(
            id=scr_id2,
            patient_id=p2.id,
            image_url=raw_url2,
            enhanced_image_url=enh_url2,
            heatmap_image_url=hmp_url2,
            severity_dr="No DR",
            status="approved",
            notes="Routine ophthalmology tracking. Elevated intraocular pressures (IOP: 22 mmHg). Optic disc cup margin cupping observed.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=15),
            created_by=doctor.id
        )

        res2 = Result(
            id="res_jenkins",
            screening_id=scr_id2,
            dr=8.2,
            g=69.4,
            amd=25.8,
            c=38.1,
            m=10.5,
            hr=15.0,
            dme=4.1,
            p=11.2,
            csr=6.4,
            rvo=7.9,
            rhi=64 # Moderate Risk Gauge
        )
        session.add(scr2)
        session.add(res2)

        # Case C: Elena Rostova (Excellent Healthy Case)
        scr_id3 = "scr_demo_rostova"
        raw_url3 = generate_mock_retina_scan(uploads_dir, "raw", scr_id3)
        enh_url3 = generate_mock_retina_scan(uploads_dir, "enhanced", scr_id3, draw_enhanced=True)
        hmp_url3 = generate_mock_retina_scan(uploads_dir, "heatmap", scr_id3, draw_heatmap=True)

        scr3 = Screening(
            id=scr_id3,
            patient_id=p3.id,
            image_url=raw_url3,
            enhanced_image_url=enh_url3,
            heatmap_image_url=hmp_url3,
            severity_dr="No DR",
            status="approved",
            notes="Pre-employment clinical screening check. Zero visual acuity complaints. Healthy eye structural contours.",
            created_at=datetime.datetime.utcnow() - datetime.timedelta(days=5),
            created_by=admin.id
        )

        res3 = Result(
            id="res_rostova",
            screening_id=scr_id3,
            dr=2.4,
            g=3.8,
            amd=1.1,
            c=4.5,
            m=3.0,
            hr=2.1,
            dme=1.0,
            p=1.8,
            csr=1.5,
            rvo=0.9,
            rhi=96 # Excellent Health Gauge
        )
        session.add(scr3)
        session.add(res3)

        session.commit()
        print("Database populated and local mockup retina PNG scans saved on disk successfully.")

if __name__ == "__main__":
    seed_database()
