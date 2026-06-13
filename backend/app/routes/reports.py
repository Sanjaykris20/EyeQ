import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlmodel import Session, select
from app.database import get_session
from app.models import Screening, Report, Result, User
from app.config import settings
from app.auth import get_current_user

# ReportLab imports
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, KeepTogether
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
import PyPDF2

router = APIRouter(prefix="/reports", tags=["PDF Reports"])

def generate_pdf_report(screening: Screening, result: Result, output_path: str):
    """
    Builds a beautifully styled hospital-grade PDF report using ReportLab.
    """
    doc = SimpleDocTemplate(
        output_path,
        pagesize=letter,
        leftMargin=40,
        rightMargin=40,
        topMargin=40,
        bottomMargin=40
    )

    styles = getSampleStyleSheet()
    
    # Custom Styles for clinical aesthetics
    title_style = ParagraphStyle(
        'ReportTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=22,
        leading=26,
        textColor=colors.HexColor('#0B1220'),
        spaceAfter=15
    )
    
    section_heading = ParagraphStyle(
        'SectionHeading',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=16,
        textColor=colors.HexColor('#2563EB'),
        spaceBefore=10,
        spaceAfter=8,
        borderColor=colors.HexColor('#E2E8F0'),
        borderWidth=1,
        borderRadius=2,
        borderPadding=4
    )

    body_style = ParagraphStyle(
        'ReportBody',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155')
    )
    
    body_bold = ParagraphStyle(
        'ReportBodyBold',
        parent=body_style,
        fontName='Helvetica-Bold'
    )

    table_header = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=11,
        textColor=colors.white
    )

    story = []

    # 1. Header Band
    header_data = [
        [
            Paragraph("<b>EYEQ INNOVATE</b><br/><font size=8 color='#64748B'>Retinal Screening Platform</font>", ParagraphStyle('H1', fontName='Helvetica-Bold', fontSize=16, leading=20, textColor=colors.HexColor('#0B1220'))),
            Paragraph("<b>CLINICAL DIAGNOSTIC REPORT</b><br/><font size=8>Report ID: " + str(uuid.uuid4().hex[:12]).upper() + "</font>", ParagraphStyle('H2', alignment=2, fontName='Helvetica-Bold', fontSize=11, leading=15, textColor=colors.HexColor('#2563EB')))
        ]
    ]
    header_table = Table(header_data, colWidths=[270, 270])
    header_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LINEBELOW', (0, 0), (-1, -1), 1, colors.HexColor('#E2E8F0'))
    ]))
    story.append(header_table)
    story.append(Spacer(1, 15))

    # 2. Patient & Screening Information
    patient = screening.patient
    info_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_style), Paragraph(patient.name, body_bold),
            Paragraph("<b>Screening Date:</b>", body_style), Paragraph(screening.created_at.strftime("%B %d, %Y %I:%M %p"), body_bold)
        ],
        [
            Paragraph("<b>Age / Gender:</b>", body_style), Paragraph(f"{patient.age} Y / {patient.gender}", body_bold),
            Paragraph("<b>Screening ID:</b>", body_style), Paragraph(screening.id, body_bold)
        ],
        [
            Paragraph("<b>Contact No:</b>", body_style), Paragraph(patient.phone or "N/A", body_bold),
            Paragraph("<b>Referring Clinician:</b>", body_style), Paragraph(screening.creator.name if screening.creator else "System", body_bold)
        ],
        [
            Paragraph("<b>Email:</b>", body_style), Paragraph(patient.email or "N/A", body_bold),
            Paragraph("<b>DR Severity:</b>", body_style), Paragraph(f"<font color='red'><b>{screening.severity_dr}</b></font>" if screening.severity_dr != "No DR" else screening.severity_dr, body_bold)
        ]
    ]
    info_table = Table(info_data, colWidths=[80, 190, 100, 170])
    info_table.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 15))

    # 3. Retinal Health Index Banner
    rhi = result.rhi
    if rhi >= 90:
        rhi_status = "EXCELLENT"
        bg_color = "#D1FAE5"
        text_color = "#065F46"
    elif rhi >= 75:
        rhi_status = "HEALTHY"
        bg_color = "#CCFBF1"
        text_color = "#0F766E"
    elif rhi >= 50:
        rhi_status = "MODERATE RISK"
        bg_color = "#FEF3C7"
        text_color = "#92400E"
    elif rhi >= 25:
        rhi_status = "HIGH RISK"
        bg_color = "#FFEDD5"
        text_color = "#9A3412"
    else:
        rhi_status = "CRITICAL / URGENT ACTION"
        bg_color = "#FEE2E2"
        text_color = "#991B1B"

    rhi_data = [[
        Paragraph(f"<font size=11><b>RETINAL HEALTH INDEX (RHI):</b></font>", ParagraphStyle('RHI1', fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor('#1E293B'))),
        Paragraph(f"<font size=16><b>{rhi} / 100</b></font>", ParagraphStyle('RHI2', fontName='Helvetica-Bold', fontSize=14, textColor=colors.HexColor(text_color))),
        Paragraph(f"<b>STATUS: {rhi_status}</b>", ParagraphStyle('RHI3', alignment=2, fontName='Helvetica-Bold', fontSize=10, textColor=colors.HexColor(text_color)))
    ]]
    rhi_table = Table(rhi_data, colWidths=[200, 140, 200])
    rhi_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor(bg_color)),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 15),
        ('RIGHTPADDING', (0, 0), (-1, -1), 15),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor(text_color))
    ]))
    story.append(rhi_table)
    story.append(Spacer(1, 15))

    # 4. Retina Images Side-by-Side (Original and Heatmap)
    # Convert URLs back to local paths
    raw_filename = os.path.basename(screening.image_url)
    heatmap_filename = os.path.basename(screening.heatmap_image_url)
    
    raw_img_path = os.path.join(settings.UPLOAD_DIR, raw_filename)
    heatmap_img_path = os.path.join(settings.UPLOAD_DIR, heatmap_filename)

    image_elements = []
    if os.path.exists(raw_img_path) and os.path.exists(heatmap_img_path):
        try:
            # We scale the images to fit cleanly side by side in the PDF
            pdf_raw_img = Image(raw_img_path, width=250, height=250)
            pdf_heatmap_img = Image(heatmap_img_path, width=250, height=250)
            
            img_table_data = [
                [Paragraph("<b>Original Fundus Scan</b>", ParagraphStyle('Cap1', fontName='Helvetica-Bold', fontSize=9, leading=12, alignment=1)),
                 Paragraph("<b>Explainable AI (GradCAM) Overlay</b>", ParagraphStyle('Cap2', fontName='Helvetica-Bold', fontSize=9, leading=12, alignment=1))],
                [pdf_raw_img, pdf_heatmap_img]
            ]
            img_table = Table(img_table_data, colWidths=[270, 270])
            img_table.setStyle(TableStyle([
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('VALIGN', (0, 0), (-1, -1), 'TOP'),
                ('BOTTOMPADDING', (0, 0), (-1, 0), 4),
            ]))
            image_elements.append(img_table)
        except Exception as e:
            image_elements.append(Paragraph(f"Image loading error: {e}", body_style))
    else:
        image_elements.append(Paragraph("Image files missing from disk.", body_style))

    story.append(KeepTogether(image_elements))
    story.append(Spacer(1, 15))

    # 5. Disease Analysis Table
    story.append(Paragraph("AI PATHOLOGY CLASSIFICATION BREAKDOWN", section_heading))
    
    # We sort diseases by highest probability
    all_scores = [
        ("Diabetic Retinopathy (DR)", result.dr),
        ("Glaucoma", result.g),
        ("Age-related Macular Degeneration (AMD)", result.amd),
        ("Cataract", result.c),
        ("Pathological Myopia", result.m),
        ("Hypertensive Retinopathy (HR)", result.hr),
        ("Diabetic Macular Edema (DME)", result.dme),
        ("Papilledema", result.p),
        ("Central Serous Chorioretinopathy (CSR)", result.csr),
        ("Retinal Vein Occlusion (RVO)", result.rvo),
    ]
    all_scores.sort(key=lambda x: x[1], reverse=True)

    table_data = [[
        Paragraph("Retinal Disease Marker", table_header),
        Paragraph("Confidence Score", table_header),
        Paragraph("Risk Threshold", table_header)
    ]]

    for name, score in all_scores:
        if score >= 70:
            risk_label = "<font color='red'><b>CRITICAL RISK</b></font>"
        elif score >= 30:
            risk_label = "<font color='orange'><b>MODERATE RISK</b></font>"
        else:
            risk_label = "<font color='green'>LOW RISK</font>"

        table_data.append([
            Paragraph(name, body_style),
            Paragraph(f"{score}%", body_bold),
            Paragraph(risk_label, body_style)
        ])

    disease_table = Table(table_data, colWidths=[280, 110, 150])
    disease_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0B1220')),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#CBD5E1')),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8FAFC')])
    ]))
    
    story.append(disease_table)
    story.append(Spacer(1, 15))

    # 6. Recommendation & Signatures
    bottom_block = []
    bottom_block.append(Paragraph("CLINICAL RECOMMENDATION & DIAGNOSTIC NOTES", section_heading))
    
    rec_text = screening.notes or (
        "No explicit clinical notes entered. Based on the RHI score of " + str(rhi) + ", "
        "the patient requires " + ("urgent referral and diagnostic confirmation via Optical Coherence Tomography (OCT) and visual field mappings." if rhi < 50 else "standard monitoring and rescreening in 12 months.")
    )
    bottom_block.append(Paragraph(rec_text, body_style))
    bottom_block.append(Spacer(1, 30))

    # Signature fields
    sig_data = [
        [
            Paragraph("_____________________________<br/><b>Ophthalmologist Signature</b>", body_style),
            Paragraph("_____________________________<br/><b>Reviewing Clinician</b>", body_style)
        ]
    ]
    sig_table = Table(sig_data, colWidths=[270, 270])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
    ]))
    bottom_block.append(sig_table)
    
    story.append(KeepTogether(bottom_block))

    # Build the document
    doc.build(story)

@router.post("/{screening_id}", response_model=Report)
def generate_and_save_report(
    screening_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Creates the clinical PDF report for a screening, registers it in DB, and returns the record.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")

    if not screening.results:
        raise HTTPException(status_code=400, detail="Cannot generate report: Screening has no AI result yet")

    result = screening.results[0]
    
    # Check if a report already exists for this screening
    existing_report = session.exec(select(Report).where(Report.screening_id == screening_id)).first()
    if existing_report:
        # Re-generate the PDF file on disk to incorporate any changes, then return existing entry
        pdf_filename = os.path.basename(existing_report.pdf_url)
        pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)
        try:
            generate_pdf_report(screening, result, pdf_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to rebuild report PDF: {e}")
        return existing_report

    # Generate new PDF report file
    report_id = f"rep_{uuid.uuid4().hex[:8]}"
    pdf_filename = f"report_{screening_id}.pdf"
    pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)

    try:
        generate_pdf_report(screening, result, pdf_path)
    except Exception as e:
         raise HTTPException(status_code=500, detail=f"PDF generation engine failed: {e}")

    pdf_url = f"/static/reports/{pdf_filename}"
    report = Report(
        id=report_id,
        screening_id=screening_id,
        pdf_url=pdf_url
    )

    session.add(report)
    session.commit()
    session.refresh(report)
    return report

@router.get("/{screening_id}/download")
def download_report_pdf(
    screening_id: str,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Directly returns the PDF file for download. Generates it on-the-fly if it doesn't exist yet.
    """
    screening = session.get(Screening, screening_id)
    if not screening:
        raise HTTPException(status_code=404, detail="Screening record not found")

    report = session.exec(select(Report).where(Report.screening_id == screening_id)).first()
    
    if not report:
        # Generate report dynamically
        if not screening.results:
            raise HTTPException(status_code=400, detail="Cannot generate report: Screening has no AI result yet")
            
        report_id = f"rep_{uuid.uuid4().hex[:8]}"
        pdf_filename = f"report_{screening_id}.pdf"
        pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)

        try:
            generate_pdf_report(screening, screening.results[0], pdf_path)
        except Exception as e:
             raise HTTPException(status_code=500, detail=f"PDF generation failed: {e}")

        pdf_url = f"/static/reports/{pdf_filename}"
        report = Report(
            id=report_id,
            screening_id=screening_id,
            pdf_url=pdf_url
        )
        session.add(report)
        session.commit()
        session.refresh(report)

    pdf_filename = os.path.basename(report.pdf_url)
    pdf_path = os.path.join(settings.REPORTS_DIR, pdf_filename)

    if not os.path.exists(pdf_path):
        # Recreate if missing on disk
        try:
            generate_pdf_report(screening, screening.results[0], pdf_path)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Could not recreate report PDF: {e}")

    return FileResponse(
        pdf_path,
        media_type="application/pdf",
        filename=f"EyeQ_Report_{screening.patient.name.replace(' ', '_')}_{screening_id}.pdf"
    )

@router.post("/analyze")
async def analyze_test_report(
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Parses a PDF or TXT test report and heuristically identifies retinal diseases 
    by keyword matching. Returns extracted text and simulated disease probabilities.
    """
    ext = os.path.splitext(file.filename)[1].lower()
    text = ""
    
    try:
        if ext == ".txt":
            content = await file.read()
            text = content.decode("utf-8", errors="ignore")
        elif ext == ".pdf":
            reader = PyPDF2.PdfReader(file.file)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
        else:
            raise HTTPException(status_code=400, detail="Only .txt and .pdf files are supported for report analysis.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {e}")
        
    text_lower = text.lower()
    
    disease_keywords = {
        "DR": ["diabetic retinopathy", "microaneurysm", "cotton wool spots", "neovascularization", "hard exudates"],
        "Glaucoma": ["glaucoma", "cup-to-disc ratio", "optic nerve cupping", "elevated iop", "intraocular pressure"],
        "AMD": ["macular degeneration", "drusen", "choroidal neovascularization", "amd"],
        "Cataract": ["cataract", "lens opacity", "cloudy lens", "phacoemulsification"],
        "Myopia": ["myopia", "pathological myopia", "high myopia", "axial length elongation"],
        "HR": ["hypertensive retinopathy", "av nicking", "arteriovenous nicking", "silver wiring"],
        "DME": ["macular edema", "dme", "macular thickening"],
        "Papilledema": ["papilledema", "optic disc swelling", "blurred margins", "intracranial pressure"],
        "CSR": ["central serous chorioretinopathy", "subretinal fluid", "csr"],
        "RVO": ["retinal vein occlusion", "rvo", "blood and thunder", "flame hemorrhages"]
    }
    
    probabilities = {}
    found_diseases = []
    
    for disease, keywords in disease_keywords.items():
        found = False
        for kw in keywords:
            if kw in text_lower:
                found = True
                break
        
        if found:
            # Assign a high simulated probability if keyword is found
            probabilities[disease] = 85.0 + (len([kw for kw in keywords if kw in text_lower]) * 2.0)
            probabilities[disease] = min(probabilities[disease], 99.0)
            found_diseases.append(disease)
        else:
            probabilities[disease] = 5.0
            
    return {
        "filename": file.filename,
        "extracted_text": text.strip()[:2000],  # Return up to 2000 chars of text for preview
        "probabilities": probabilities,
        "found": found_diseases
    }
