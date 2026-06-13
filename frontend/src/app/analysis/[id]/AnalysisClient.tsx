"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  ArrowLeft, FileDown, MessageSquareCode, Sparkles, Activity, AlertCircle,
  Eye, CheckCircle2, Layers, ShieldAlert, FileText, Stethoscope, ChevronDown
} from "lucide-react";
import Link from "next/link";

interface ScreeningDetails {
  id: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
    phone: string;
    email: string;
  };
  image_url: string;
  enhanced_image_url: string;
  heatmap_image_url: string;
  severity_dr: string;
  status: string;
  notes: string;
  created_at: string;
  creator_name: string;
  medical_history: any;
  family_history: any;
  lifestyle: any;
  symptoms: any;
  measurements: any;
  results: {
    dr: number; g: number; amd: number; c: number; m: number;
    hr: number; dme: number; p: number; csr: number; rvo: number;
    clinical_dr: number; clinical_g: number; clinical_amd: number;
    clinical_c: number; clinical_m: number; clinical_hr: number;
    clinical_dme: number; clinical_p: number; clinical_csr: number;
    clinical_rvo: number;
    recommended_tests: string[];
    rhi: number;
  };
}

const confirmationTestsMapping: Record<string, string[]> = {
  dr: ["OCT Scan", "HbA1c Test", "Dilated Fundus Examination"],
  g: ["Tonometry", "OCT Scan", "Visual Field Test"],
  amd: ["OCT Scan", "Fluorescein Angiography", "Lipid Profile"],
  c: ["Slit-Lamp Examination", "Visual Acuity Test"],
  m: ["Refraction Test", "Axial Length Measurement"],
  hr: ["Blood Pressure Measurement", "Fundus Examination"],
  dme: ["OCT Scan"],
  p: ["MRI Brain", "Lumbar Puncture", "Neurological Evaluation"],
  csr: ["OCT Scan"],
  rvo: ["OCT Scan", "Fluorescein Angiography", "Blood Pressure", "CBC", "Lipid Profile"]
};

const getConfidenceLabel = (key: string, clinScore: number) => {
  if (clinScore >= 60) {
    if (key === 'p') return "Urgent Evaluation Required";
    return "High";
  } else if (clinScore >= 30) {
    return "Moderate / Clinical Correlation Needed";
  }
  return "Low";
};

export default function AnalysisClient() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [details, setDetails] = useState<ScreeningDetails | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  let screeningId = params.id as string;
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_ROOT || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`;

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !screeningId || screeningId === "baseline") return;

    const fetchScreeningDetails = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        } else {
          setError("Failed to locate retinal screening file.");
        }
      } catch (err) {
        setError("Network error fetching diagnostic metrics.");
      } finally {
        setFetching(false);
      }
    };

    fetchScreeningDetails();
  }, [user, screeningId]);

  const handleDownloadPDF = async () => {
    if (!details) return;
    setPdfGenerating(true);
    try {
      const token = getToken();
      await fetch(`${API_BASE_URL}/reports/${screeningId}`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      window.open(`${API_BASE_URL}/reports/${screeningId}/download?token=${token}`, "_blank");
    } catch (e) {
      console.error("PDF generation skipped/failed:", e);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  const getRhiMeta = (rhi: number) => {
    if (rhi >= 90) return { label: "Excellent", desc: "Optimal structural integrity.", color: "#10B981" };
    if (rhi >= 75) return { label: "Healthy", desc: "No critical markers.", color: "#06B6D4" };
    if (rhi >= 50) return { label: "Moderate Risk", desc: "Potential structural fluctuations.", color: "#F59E0B" };
    if (rhi >= 25) return { label: "High Risk", desc: "Substantial disease markers.", color: "#EF4444" };
    return { label: "Critical", desc: "Urgent ocular danger.", color: "#EF4444" };
  };

  const rhiMeta = details ? getRhiMeta(details.results.rhi) : { label: "N/A", desc: "", color: "#94A3B8" };

  const diseaseMap = [
    { key: 'dr', name: "Diabetic Retinopathy" },
    { key: 'g', name: "Glaucoma" },
    { key: 'amd', name: "Macular Degeneration (AMD)" },
    { key: 'c', name: "Cataract" },
    { key: 'm', name: "Pathological Myopia" },
    { key: 'hr', name: "Hypertensive Retinopathy" },
    { key: 'dme', name: "Diabetic Macular Edema" },
    { key: 'p', name: "Papilledema" },
    { key: 'csr', name: "Serous Chorioretinopathy" },
    { key: 'rvo', name: "Retinal Vein Occlusion" }
  ];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {fetching ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : error || !details ? (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-red-300">
            <AlertCircle className="mx-auto text-red-400 mb-2 animate-bounce" size={36} />
            <span>{error || "Diagnostic file unavailable"}</span>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <Link href="/dashboard" className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                  <ArrowLeft size={16} />
                </Link>
                <div>
                  <h1 className="text-3xl font-bold text-white tracking-tight">Final Smart Report</h1>
                  <p className="text-sm text-muted-foreground mt-1">Screening ID: {details.id} • Registered {new Date(details.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href={`/assistant?screening_id=${details.id}`}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-card hover:bg-slate-900 border border-border text-sm font-semibold text-white transition-all shadow-sm"
                >
                  <MessageSquareCode size={16} className="text-secondary" /> AI Assistant
                </Link>
                <button
                  onClick={handleDownloadPDF}
                  disabled={pdfGenerating}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-white text-sm font-bold transition-all shadow-md glow-blue disabled:opacity-50 hover:scale-[1.02]"
                >
                  <FileDown size={16} /> {pdfGenerating ? "Generating..." : "Download Report"}
                </button>
              </div>
            </div>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="p-6 rounded-xl bg-card border border-border flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center">
                  <span className="text-xl font-bold text-white">{details.patient.name.charAt(0)}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Patient</span>
                  <h4 className="font-bold text-white text-base">{details.patient.name}</h4>
                  <p className="text-xs text-slate-400">{details.patient.age} Y / {details.patient.gender}</p>
                </div>
              </div>

              {details.measurements?.hba1c && (
                <div className="p-6 rounded-xl bg-card border border-border flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">HbA1c Level</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="font-bold text-white text-2xl">{details.measurements.hba1c}</h4>
                    <span className="text-xs text-slate-400">%</span>
                  </div>
                </div>
              )}

              {details.measurements?.systolic_bp && (
                <div className="p-6 rounded-xl bg-card border border-border flex flex-col justify-center">
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Blood Pressure</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <h4 className="font-bold text-white text-2xl">{details.measurements.systolic_bp}/{details.measurements.diastolic_bp}</h4>
                    <span className="text-xs text-slate-400">mmHg</span>
                  </div>
                </div>
              )}

              <div className="p-6 rounded-xl bg-card border border-border flex flex-col items-center justify-center relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-20`} style={{ backgroundColor: rhiMeta.color }} />
                <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider mb-2">Retinal Health Index</span>
                <div className="flex items-center gap-3">
                  <span className="text-4xl font-extrabold text-white">{details.results.rhi}</span>
                  <span className="text-xs font-bold px-2 py-1 rounded" style={{ backgroundColor: `${rhiMeta.color}20`, color: rhiMeta.color }}>
                    {rhiMeta.label}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              
              {/* Left Column: Risk Table */}
              <div className="md:col-span-2 space-y-8">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-base uppercase font-mono tracking-wider flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <ShieldAlert size={18} className="text-secondary" /> Final Disease Risk Assessment
                  </h3>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-border/50 text-xs font-mono uppercase tracking-wider text-slate-400">
                          <th className="py-3 px-4 font-medium">Disease</th>
                          <th className="py-3 px-4 font-medium text-center">AI Image Score</th>
                          <th className="py-3 px-4 font-medium text-center text-secondary">Final Clinical Risk</th>
                          <th className="py-3 px-4 font-medium text-center">Severity/Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diseaseMap.map(({ key, name }) => {
                          const aiScore = details.results[key as keyof typeof details.results] as number;
                          const clinScore = details.results[`clinical_${key}` as keyof typeof details.results] as number;
                          
                          if (aiScore < 5 && clinScore < 5) return null; // Hide extremely low risk items to save space
                          
                          let statusColor = "text-slate-400 bg-slate-900";
                          let statusLabel = "Low Risk";
                          if (clinScore >= 60) {
                            statusColor = "text-red-400 bg-red-500/10";
                            statusLabel = "High Risk";
                          } else if (clinScore >= 30) {
                            statusColor = "text-amber-400 bg-amber-500/10";
                            statusLabel = "Moderate";
                          }

                          const isExpanded = expandedRow === key;
                          const tests = confirmationTestsMapping[key] || [];
                          const confidence = getConfidenceLabel(key, clinScore);

                          return (
                            <React.Fragment key={key}>
                              <tr 
                                className="border-b border-border/30 hover:bg-slate-900/50 transition-colors cursor-pointer"
                                onClick={() => setExpandedRow(isExpanded ? null : key)}
                              >
                                <td className="py-3 px-4 text-sm font-bold text-white flex items-center gap-2">
                                  <ChevronDown size={14} className={`transform transition-transform text-muted-foreground ${isExpanded ? 'rotate-180' : ''}`} />
                                  {name}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className="text-slate-300 font-mono text-sm">{aiScore}%</span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`font-mono text-base font-bold ${clinScore >= 60 ? 'text-red-400' : clinScore >= 30 ? 'text-amber-400' : 'text-green-400'}`}>
                                    {clinScore}%
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${statusColor}`}>
                                    {statusLabel}
                                  </span>
                                </td>
                              </tr>
                              {isExpanded && (
                                <tr className="bg-slate-950/40 border-b border-border/20">
                                  <td colSpan={4} className="py-4 px-6">
                                    <div className="space-y-4">
                                      <div>
                                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                                          Recommended Confirmation Tests:
                                        </span>
                                        <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 pl-2">
                                          {tests.map((test, idx) => (
                                            <li key={idx} className="text-xs text-slate-300 flex items-center gap-2">
                                              <span className="text-primary font-bold">✓</span> {test}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                      
                                      <div className="pt-3 border-t border-border/10 flex items-center gap-2 text-xs">
                                        <span className="font-bold text-slate-400 uppercase tracking-wider">Clinical Confidence:</span>
                                        <span className={`font-bold ${clinScore >= 60 ? 'text-red-400' : clinScore >= 30 ? 'text-amber-400' : 'text-slate-400'}`}>
                                          {confidence}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-base uppercase font-mono tracking-wider flex items-center gap-2 mb-6 border-b border-border pb-4">
                    <Stethoscope size={18} className="text-secondary" /> Recommended Confirmation Tests
                  </h3>
                  {details.results.recommended_tests && details.results.recommended_tests.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {details.results.recommended_tests.map((test, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-4 rounded-lg bg-slate-900 border border-slate-800">
                          <CheckCircle2 size={16} className="text-secondary shrink-0" />
                          <span className="text-sm font-medium text-slate-300">{test}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-lg bg-slate-900/50 border border-dashed border-border text-center text-sm text-muted-foreground">
                      No advanced diagnostic tests recommended based on the current clinical risk profile. Maintain regular annual checkups.
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Imagery & Details */}
              <div className="space-y-8">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                    <Eye size={16} className="text-secondary" /> Fundus Image Analysis
                  </h3>
                  
                  <div className="space-y-4">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-mono mb-2 block">Original Retina Scan</span>
                      <div className="aspect-video rounded-lg border border-border overflow-hidden bg-black flex items-center justify-center">
                        <img 
                          src={`${BACKEND_URL}${details.image_url}`} 
                          alt="Original Fundus scan" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-secondary uppercase font-mono mb-2 block flex items-center gap-1">
                        <Sparkles size={11} className="text-secondary animate-pulse" /> GradCAM Heatmap Explainer
                      </span>
                      <div className="aspect-video rounded-lg border border-border overflow-hidden bg-black flex items-center justify-center">
                        <img 
                          src={`${BACKEND_URL}${details.heatmap_image_url}`} 
                          alt="Heatmap" 
                          className="w-full h-full object-contain"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                    <FileText size={16} className="text-secondary" /> Clinical Highlights
                  </h3>
                  <div className="space-y-4 text-sm text-slate-300">
                    {details.symptoms && details.symptoms.blurred_vision === "Yes" && (
                      <div className="flex gap-2 items-start"><AlertCircle size={16} className="text-amber-400 mt-0.5 shrink-0"/> Patient reported <strong>Blurred Vision</strong>.</div>
                    )}
                    {details.symptoms && details.symptoms.sudden_vision_loss === "Yes" && (
                      <div className="flex gap-2 items-start"><AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0"/> Patient reported <strong>Sudden Vision Loss</strong>.</div>
                    )}
                    {details.medical_history && details.medical_history.diabetes === "Yes" && (
                      <div className="flex gap-2 items-start"><Activity size={16} className="text-cyan-400 mt-0.5 shrink-0"/> Documented History of <strong>Diabetes ({details.medical_history.diabetes_type})</strong>.</div>
                    )}
                    {details.lifestyle && details.lifestyle.smoking === "Current Smoker" && (
                      <div className="flex gap-2 items-start"><Activity size={16} className="text-slate-400 mt-0.5 shrink-0"/> Active <strong>Smoker</strong>.</div>
                    )}
                    {!details.symptoms?.blurred_vision && !details.symptoms?.sudden_vision_loss && !details.medical_history?.diabetes && (
                      <div className="text-xs text-muted-foreground italic">Review full profile in the dashboard for complete symptom history.</div>
                    )}
                  </div>
                </div>

                {details.notes && (
                  <div className="p-6 rounded-xl bg-slate-900 border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                    <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 mb-3">
                      <MessageSquareCode size={16} className="text-primary" /> Note for Doctor
                    </h3>
                    <p className="text-sm text-slate-300 italic whitespace-pre-wrap leading-relaxed">
                      "{details.notes}"
                    </p>
                  </div>
                )}
              </div>
            </div>
            
          </>
        )}
      </main>
    </div>
  );
}
