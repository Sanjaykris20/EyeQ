"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UploadCloud, CheckCircle2, AlertCircle, Activity, 
  Sparkles, RefreshCw, ArrowLeft, ChevronRight, ChevronLeft, User, Eye, Camera,
  Stethoscope
} from "lucide-react";
import Link from "next/link";

function WizardContent() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [stage, setStage] = useState(1);
  const totalStages = 3;
  const [error, setError] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisText, setAnalysisText] = useState("");

  const [screeningId, setScreeningId] = useState<string | null>(null);
  const [targetedData, setTargetedData] = useState<{symptoms_to_ask: string[], measurements_to_ask: string[]} | null>(null);

  // -- Form States --
  
  // Stage 1: Demographics & Image
  const [demographics, setDemographics] = useState({
    name: "", age: "", gender: "Male", height: "", weight: "", 
    occupation: "", location: "", phone: "", email: ""
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stage 2: Symptoms
  const [symptoms, setSymptoms] = useState<Record<string, string>>({});

  // Stage 3: Measurements
  const [measurements, setMeasurements] = useState<Record<string, string>>({});
  const [skipMeasurements, setSkipMeasurements] = useState(false);
  const [patientNotes, setPatientNotes] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const updateNestedState = (setter: React.Dispatch<React.SetStateAction<any>>, field: string, value: any) => {
    setter((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      const ext = selectedFile.name.split(".").pop()?.toLowerCase();
      if (!ext || !["jpg", "jpeg", "png"].includes(ext)) {
        setError("Supported file formats are JPG, JPEG, and PNG only.");
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError("File exceeds 5MB size limit.");
        return;
      }
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(selectedFile);
    }
  };

  const handlePreScreen = async () => {
    if (!demographics.name || !demographics.age) {
      setError("Name and Age are required fields.");
      return;
    }
    if (!file) {
      setError("Please upload a fundus photograph scan.");
      return;
    }

    setError("");
    setAnalyzing(true);
    setAnalysisText("Running deep learning model on fundus image...");

    try {
      const token = getToken();
      
      // 1. Create Patient
      setAnalysisText("Registering patient demographics...");
      const patientRes = await fetch(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          name: demographics.name, age: parseInt(demographics.age), gender: demographics.gender,
          height: demographics.height ? parseFloat(demographics.height) : null,
          weight: demographics.weight ? parseFloat(demographics.weight) : null,
          occupation: demographics.occupation || null, location: demographics.location || null,
          phone: demographics.phone || null, email: demographics.email || null
        })
      });

      if (!patientRes.ok) throw new Error("Failed to register patient demographics.");
      const patientData = await patientRes.json();

      // 2. Pre-Screen Image
      setAnalysisText("Analyzing retinal biomarkers...");
      const formData = new FormData();
      formData.append("patient_id", patientData.id);
      formData.append("file", file);

      const res = await fetch(`${API_BASE_URL}/screenings/pre-screen`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "AI screening process failed.");
      }

      const data = await res.json();
      setScreeningId(data.screening_id);
      setTargetedData(data.targeted_data);
      
      // Initialize states based on targeted data
      const initSymptoms: Record<string, string> = {};
      data.targeted_data.symptoms_to_ask.forEach((s: string) => { initSymptoms[s] = "No"; });
      setSymptoms(initSymptoms);

      const initMeasurements: Record<string, string> = {};
      data.targeted_data.measurements_to_ask.forEach((m: string) => { initMeasurements[m] = ""; });
      setMeasurements(initMeasurements);

      setAnalyzing(false);
      setStage(2);
    } catch (err: any) {
      setError(err.message || "Connection timed out. Try again.");
      setAnalyzing(false);
    }
  };

  const handleFinalize = async () => {
    if (!screeningId) return;
    setError("");
    setAnalyzing(true);
    setAnalysisText("Fusing clinical data and generating Smart Report...");

    try {
      const token = getToken();
      const formData = new FormData();
      
      // Note: We're omitting full medical/family/lifestyle histories here to streamline the MVP as requested,
      // but we could still pass them if we collect them. For now, we pass the targeted symptoms and measurements.
      formData.append("symptoms", JSON.stringify(symptoms));
      
      if (!skipMeasurements) {
        formData.append("measurements", JSON.stringify(measurements));
      }
      if (patientNotes) {
        formData.append("notes", patientNotes);
      }

      const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}/finalize`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/analysis/${data.screening.id}`);
      } else {
        const errData = await res.json();
        throw new Error(errData.detail || "Finalization failed.");
      }
    } catch (err: any) {
      setError(err.message || "Connection timed out. Try again.");
      setAnalyzing(false);
    }
  };

  const SYMPTOM_LABELS: Record<string, string> = {
    blurred_vision: "Blurred Vision", sudden_vision_loss: "Sudden Vision Loss", floaters: "Floaters",
    distorted_vision: "Distorted/Wavy Vision", difficulty_distant: "Difficulty seeing distant", 
    loss_side_vision: "Loss of side vision", double_vision: "Double Vision", eye_pain: "Eye Pain", 
    light_sensitivity: "Light Sensitivity", night_vision_difficulty: "Night Vision Difficulty",
    severe_headache: "Severe Headache", vision_blackouts: "Temporary Vision Blackouts",
    halos_around_lights: "Halos Around Lights", color_vision_faded: "Faded Color Vision",
    central_vision_loss: "Central Vision Loss", photopsia_flashes: "Flashes of Light",
    pulsatile_tinnitus: "Pulsatile Tinnitus"
  };

  const SYMPTOM_CATEGORIES: Record<string, string[]> = {
    "👁️ Vision Quality": ["blurred_vision", "distorted_vision", "difficulty_distant", "central_vision_loss", "loss_side_vision", "color_vision_faded", "sudden_vision_loss", "night_vision_difficulty"],
    "✨ Visual Artifacts": ["floaters", "photopsia_flashes", "halos_around_lights", "vision_blackouts", "double_vision"],
    "🧠 Physical & Neurological": ["severe_headache", "eye_pain", "light_sensitivity", "pulsatile_tinnitus"]
  };

  const MEASUREMENT_LABELS: Record<string, string> = {
    hba1c: "HbA1c Level (%)", fasting_blood_sugar: "Fasting Blood Sugar (mg/dL)",
    systolic_bp: "Systolic Blood Pressure", diastolic_bp: "Diastolic Blood Pressure",
    iop_left: "IOP Left Eye (mmHg)", iop_right: "IOP Right Eye (mmHg)",
    visual_acuity: "Visual Acuity"
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />
      <main className="flex-1 p-8 overflow-y-auto max-w-5xl mx-auto">
        {analyzing ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center text-center p-8">
            <div className="w-24 h-24 rounded-full border-4 border-primary border-t-secondary animate-spin mb-8 shadow-lg glow-cyan" />
            <h2 className="text-2xl font-bold text-white tracking-wide uppercase font-mono flex items-center gap-3">
              <Activity className="text-secondary animate-pulse" size={24} /> 
              {analysisText}
            </h2>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Link href="/dashboard" className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-white tracking-tight">Dynamic Clinical Workflow</h1>
                <p className="text-sm text-muted-foreground mt-1">Pre-screen image → Targeted Symptoms → Verification Reports.</p>
              </div>
            </div>

            {/* Stepper Progress */}
            <div className="flex items-center justify-center mb-8 pb-4">
              {[
                { num: 1, title: "Image Upload", icon: Camera },
                { num: 2, title: "Targeted Symptoms", icon: Eye },
                { num: 3, title: "Lab Reports", icon: Stethoscope }
              ].map((s, i, arr) => {
                const Icon = s.icon;
                const isActive = stage === s.num;
                const isPassed = stage > s.num;
                return (
                  <div key={s.num} className="flex items-center">
                    <div className={`flex flex-col items-center gap-2 ${isActive ? 'text-primary' : isPassed ? 'text-secondary' : 'text-slate-600'}`}>
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive ? 'bg-primary/20 border-primary shadow-[0_0_15px_rgba(56,189,248,0.4)]' : 
                        isPassed ? 'bg-secondary/20 border-secondary' : 'bg-slate-900 border-slate-700'
                      }`}>
                        {isPassed ? <CheckCircle2 size={24} /> : <Icon size={24} />}
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider">{s.title}</span>
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`w-16 sm:w-32 h-1 mx-4 rounded ${isPassed ? 'bg-secondary' : 'bg-slate-800'}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm flex items-start gap-2 animate-fade-in">
                <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
                <span className="font-bold">{error}</span>
              </div>
            )}

            {/* Wizard Forms */}
            <div className="bg-card border border-border rounded-2xl p-8 shadow-xl min-h-[400px] relative overflow-hidden">
              <AnimatePresence mode="wait">
                
                {stage === 1 && (
                  <motion.div key="stage1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                    <div>
                      <h3 className="text-xl font-bold text-white border-b border-border pb-3 mb-6">Patient Demographics</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Full Name *</label>
                          <input type="text" value={demographics.name} onChange={e => updateNestedState(setDemographics, 'name', e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-border text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all" placeholder="Patient Name" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Age *</label>
                            <input type="number" value={demographics.age} onChange={e => updateNestedState(setDemographics, 'age', e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-border text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none" placeholder="Years" />
                          </div>
                          <div>
                            <label className="block text-xs font-mono text-slate-400 mb-2 uppercase">Gender</label>
                            <select value={demographics.gender} onChange={e => updateNestedState(setDemographics, 'gender', e.target.value)} className="w-full px-4 py-2.5 rounded-lg bg-slate-950 border border-border text-white focus:border-primary outline-none">
                              <option>Male</option><option>Female</option><option>Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-white border-b border-border pb-3 mb-6">Fundus Pre-Screening</h3>
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                          preview 
                            ? "bg-slate-900/40 border-primary/50 shadow-[0_0_30px_rgba(56,189,248,0.1)]" 
                            : "bg-slate-900/20 border-slate-700 hover:border-primary/60 hover:bg-slate-900/50"
                        }`}
                      >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".jpg,.jpeg,.png" className="hidden" />
                        {preview ? (
                          <div className="relative w-full max-w-sm aspect-square rounded-xl overflow-hidden border border-border bg-black/60 group">
                            <img src={preview} alt="Fundus" className="w-full h-full object-contain" />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="text-white font-medium bg-black/50 px-4 py-2 rounded-lg backdrop-blur-sm">Click to change</span>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center py-10">
                            <UploadCloud size={48} className="text-primary mb-4" />
                            <h4 className="font-bold text-white text-lg">Upload Fundus Photograph</h4>
                            <p className="text-sm text-slate-400 mt-2">Required for initial AI hypothesis.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button onClick={handlePreScreen} disabled={!file || !demographics.name || !demographics.age} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 transition-all disabled:opacity-50">
                        Run Image Pre-Screening <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 2 && targetedData && (
                  <motion.div key="stage2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-border pb-3 flex items-center gap-2">
                      <Sparkles className="text-secondary" /> Stage 2: Targeted Symptoms
                    </h3>
                    
                    {targetedData.symptoms_to_ask.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p>The AI detected low immediate risk markers. No targeted symptom screening is required.</p>
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-slate-400 mb-6 border-l-2 border-primary pl-3">
                          Based on the fundus scan, the AI has flagged potential anomalies. Please confirm if the patient has experienced any of these specific symptoms:
                        </p>
                        <div className="space-y-8">
                          {Object.entries(SYMPTOM_CATEGORIES).map(([categoryName, categorySymptoms]) => {
                            const activeSymptoms = targetedData.symptoms_to_ask.filter((s: string) => categorySymptoms.includes(s));
                            if (activeSymptoms.length === 0) return null;

                            return (
                              <div key={categoryName}>
                                <h4 className="text-sm font-bold text-slate-400 mb-4 uppercase tracking-wider">{categoryName}</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {activeSymptoms.map((symp: string) => {
                                    const isYes = symptoms[symp] === 'Yes';
                                    return (
                                      <div 
                                        key={symp}
                                        onClick={() => updateNestedState(setSymptoms, symp, isYes ? 'No' : 'Yes')}
                                        className={`p-5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isYes ? 'bg-primary/20 border-primary text-white shadow-[0_0_15px_rgba(56,189,248,0.2)]' : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                                      >
                                        <span className="font-medium text-lg">{SYMPTOM_LABELS[symp] || symp}</span>
                                        <div className={`w-6 h-6 rounded flex items-center justify-center border ${isYes ? 'bg-primary border-primary' : 'border-slate-600'}`}>
                                          {isYes && <CheckCircle2 size={16} className="text-black" />}
                                        </div>
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="mt-8 p-6 bg-slate-900/50 border border-slate-800 rounded-xl">
                          <label className="block text-sm font-bold text-white mb-2">Message / Notes for Doctor</label>
                          <p className="text-xs text-slate-400 mb-4">Are there any other symptoms or context the patient wants to add?</p>
                          <textarea 
                            value={patientNotes}
                            onChange={(e) => setPatientNotes(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-border text-white focus:border-primary outline-none resize-none transition-all"
                            placeholder="Type additional notes here..."
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end mt-8 pt-4 border-t border-border">
                      <button onClick={() => setStage(3)} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold transition-all">
                        Proceed to Lab Verification <ChevronRight size={18} />
                      </button>
                    </div>
                  </motion.div>
                )}

                {stage === 3 && targetedData && (
                  <motion.div key="stage3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                    <h3 className="text-xl font-bold text-white border-b border-border pb-3 flex items-center gap-2">
                      <Stethoscope className="text-secondary" /> Stage 3: Lab Reports
                    </h3>

                    {targetedData.measurements_to_ask.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
                        <p>No specific lab measurements are required for this diagnosis.</p>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-800 mb-6 gap-4">
                          <p className="text-sm text-slate-400">
                            To reach 100% diagnostic certainty, the AI requires the following lab values.
                          </p>
                          <label className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-slate-800 px-4 py-2 rounded-xl text-xs text-slate-300 hover:bg-slate-800 transition-all shrink-0">
                            <input
                              type="checkbox"
                              checked={skipMeasurements}
                              onChange={(e) => setSkipMeasurements(e.target.checked)}
                              className="accent-primary w-4 h-4 cursor-pointer"
                            />
                            <span>Patient does not have lab reports</span>
                          </label>
                        </div>

                        {!skipMeasurements && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {targetedData.measurements_to_ask.map(meas => (
                              <div key={meas} className="p-5 rounded-xl bg-slate-900/50 border border-slate-800">
                                <label className="block text-sm font-bold text-white mb-2 uppercase">{MEASUREMENT_LABELS[meas] || meas}</label>
                                {meas === 'visual_acuity' ? (
                                  <select value={measurements[meas] || ""} onChange={e => updateNestedState(setMeasurements, meas, e.target.value)} className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-border text-white focus:border-primary outline-none">
                                    <option value="">Select Acuity</option>
                                    <option>20/20</option><option>20/40</option><option>20/60</option><option>20/100</option>
                                  </select>
                                ) : (
                                  <input type="number" step="0.1" value={measurements[meas] || ""} onChange={e => updateNestedState(setMeasurements, meas, e.target.value)} className="w-full px-4 py-3 rounded-lg bg-slate-950 border border-border text-white focus:border-primary outline-none" placeholder="Enter value..." />
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    <div className="flex justify-between items-center mt-8 pt-4 border-t border-border">
                      <button onClick={() => setStage(2)} className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium transition-all">
                        <ChevronLeft size={18} /> Back
                      </button>
                      <button onClick={handleFinalize} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-secondary hover:bg-secondary/90 text-white font-bold shadow-lg shadow-secondary/30 transition-all">
                        <Sparkles size={18} className="animate-pulse" /> Complete Diagnosis
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function NewScreeningPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    }>
      <WizardContent />
    </Suspense>
  );
}
