import requests
from app.config import settings

# Structured clinical knowledge base for prompt system injection and fallback responses
CLINICAL_KNOWLEDGE = {
    "dr": "Diabetic Retinopathy (DR) is caused by damage to the blood vessels of the light-sensitive tissue at the back of the eye (retina). It is a complication of diabetes. Early stages (Mild/Moderate) are characterized by microaneurysms and hemorrhages. Advanced stages (Severe/Proliferative) feature neovascularization (new blood vessel growth) which can bleed and cause visual loss.",
    "glaucoma": "Glaucoma is a group of eye conditions that damage the optic nerve, often caused by abnormally high pressure in the eye. It is the leading cause of blindness for people over 60. Optic disc cupping is a primary feature seen on fundus photos.",
    "amd": "Age-related Macular Degeneration (AMD) causes damage to the macula, the small spot near the center of the retina. It blurs sharp central vision. Drusen (yellow deposits) are the hallmark sign of Dry AMD, whereas abnormal blood vessels characterize Wet AMD.",
    "cataract": "Cataracts involve a clouding of the eye's natural lens. On fundus photography, cataracts present as a haze or loss of structural detail due to light scattering, rather than direct retinal tissue damage.",
    "myopia": "Pathological Myopia is extreme nearsightedness that causes structural changes to the retina, such as a temporal crescent around the optic disc, macular thinning, or posterior staphyloma.",
    "hr": "Hypertensive Retinopathy (HR) is damage to the retina due to high blood pressure. Visual signs include arteriolar narrowing, arteriovenous (AV) nicking, cotton-wool spots, and macular stars.",
    "dme": "Diabetic Macular Edema (DME) is an accumulation of fluid in the macula due to leaking capillaries in patients with Diabetic Retinopathy. It is a major cause of vision loss in working-age adults.",
    "papilledema": "Papilledema is optic disc swelling caused by increased intracranial pressure. Fundus scans reveal blurred optic disc margins, hemorrhage around the disc, and vessel obscuration.",
    "csr": "Central Serous Chorioretinopathy (CSR) occurs when fluid builds up under the retina, causing temporary or permanent visual distortion. It typically affects young to middle-aged adults, often linked to stress or steroid use.",
    "rvo": "Retinal Vein Occlusion (RVO) is a blockage of the veins carrying blood away from the retina. It leads to severe retinal hemorrhage and edema, often described as a 'blood and thunder' appearance."
}

SYSTEM_INSTRUCTION = """You are 'EyeQ Assist', a specialized medical AI assistant embedded within the EyeQ Innovate clinical screening platform.
Your role is to help doctors, clinicians, and medical students interpret Retinal Health Index (RHI) scores, understand the 10 retinal diseases screened by this platform, and write clinical notes.

Rules:
1. Always maintain a professional, clinical, yet accessible tone.
2. Clarify that EyeQ Innovate is a clinical screening helper and not a definitive standalone diagnostic tool; results should be reviewed by an ophthalmologist.
3. Be structured. Use bullet points and paragraphs.
4. Reference RHI ranges when asked (90-100: Excellent, 75-89: Healthy, 50-74: Moderate, 25-49: High Risk, 0-24: Critical).
"""

def generate_medical_response(question: str, context: str = "") -> str:
    """
    Sends the user question to Llama 3 (via Groq/OpenRouter) or uses local medical engine fallback.
    """
    cleaned_q = question.lower().strip()
    
    # Check if API key is configured
    if not settings.LLAMA_API_KEY:
        # Fallback to local rule-based medical expert system
        return get_local_fallback(cleaned_q, context)

    headers = {
        "Authorization": f"Bearer {settings.LLAMA_API_KEY}",
        "Content-Type": "application/json"
    }

    # Setup chat format for API
    messages = [
        {"role": "system", "content": SYSTEM_INSTRUCTION},
    ]
    if context:
        messages.append({"role": "system", "content": f"Context of active patient screening: {context}"})
    messages.append({"role": "user", "content": question})

    payload = {
        "model": "llama3-8b-8192",
        "messages": messages,
        "temperature": 0.3,
        "max_tokens": 800
    }

    try:
        response = requests.post(settings.LLAMA_API_URL, json=payload, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            return data["choices"][0]["message"]["content"]
        else:
            print(f"Llama 3 API Error: {response.text}. Using fallback.")
            return get_local_fallback(cleaned_q, context)
    except Exception as e:
        print(f"Exception during LLM call: {e}. Using fallback.")
        return get_local_fallback(cleaned_q, context)

def get_local_fallback(question: str, context: str = "") -> str:
    """
    Rule-based local diagnostic expert agent fallback.
    """
    if "dr" in question or "diabetic retinopathy" in question:
        return f"### Diabetic Retinopathy (DR) Clinical Insight\n\n{CLINICAL_KNOWLEDGE['dr']}\n\n**Key Screen Indicators:** Microaneurysms, hemorrhages, cotton wool spots.\n\n*Disclaimer: Screen result should be clinically verified against patient HbA1c and visual acuity examinations.*"
    
    if "glaucoma" in question or "optic nerve" in question:
        return f"### Glaucoma Clinical Insight\n\n{CLINICAL_KNOWLEDGE['glaucoma']}\n\n**Key Screen Indicators:** Increased cup-to-disc ratio, nerve fiber layer thinning.\n\n*Disclaimer: Confirm diagnosis using intraocular pressure measurements (tonometry) and visual field testing.*"

    if "rhi" in question or "retinal health index" in question:
        return """### Retinal Health Index (RHI) Breakdown

The RHI is a proprietary aggregate score representing the overall health of the retina on a scale of 0 to 100. It is calculated by analyzing the presence and severity of all 10 screened pathologies:

*   **90 - 100: Excellent** — No signs of retinal pathology. Recommended annual screening.
*   **75 - 89: Healthy** — Minor irregularities detected or very low risk thresholds. Routine checkups.
*   **50 - 74: Moderate** — Mild risk indicators. Review of systemic health (blood pressure, diabetes status) is recommended.
*   **25 - 49: High Risk** — Substantial disease probability. Referral to an ophthalmologist for comprehensive examination.
*   **0 - 24: Critical** — Severe abnormalities. Urgent medical intervention is required to prevent vision loss."""

    if "what should i do next" in question or "next step" in question:
        return """### Recommended Clinical Next Steps:

1. **Verify Patient History**: Cross-reference the AI screening report with patient history, specifically checking for diabetes, hypertension, or age-related vision changes.
2. **Review GradCAM Overlay**: Examine the activation heatmap to pinpoint areas of interest (e.g. optic disc margins, macular thickening, or hemorrhages).
3. **Review Preprocessing**: Check the CLAHE-enhanced image to observe structural variations in low-contrast zones.
4. **Confirm Referral**: For any scans with an **RHI score under 75** or a disease probability above **40%**, arrange an in-person diagnostic evaluation with an eye specialist.
5. **PDF Report Generation**: Download and sign the PDF screening report to save in the patient's medical file."""

    # Default general greeting/response
    return """### EyeQ Innovate Clinical Assistant

I am here to help you navigate the Retinal Screening Platform. You can ask me questions such as:
- *What is DR / Glaucoma / AMD?*
- *Why is my patient's RHI score low?*
- *What should I do next?*
- *Write a diagnostic summary template.*

Please let me know how I can assist you with this patient screening!"""
