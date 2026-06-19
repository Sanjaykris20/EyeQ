"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import { UploadCloud, FileText, AlertCircle, CheckCircle2, ChevronRight, Activity, Zap } from "lucide-react";

import { useAuth } from "@/context/AuthContext";

export default function ReportAnalyzerPage() {
  const { getToken } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError("");
      setResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }

    setLoading(true);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
      const response = await fetch(`${API_BASE_URL}/reports/analyze`, {
        method: "POST",
        // Do not set Content-Type header, let the browser set it with the boundary for FormData
        headers: {
          "Authorization": `Bearer ${getToken()}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to analyze report");
      }

      const data = await response.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred during analysis.");
    } finally {
      setLoading(false);
    }
  };

  // Helper to get color based on probability
  const getProbabilityColor = (prob: number) => {
    if (prob >= 70) return "bg-red-500 shadow-red-500/50";
    if (prob >= 40) return "bg-orange-500 shadow-orange-500/50";
    return "bg-green-500 shadow-green-500/50";
  };

  const getTextColor = (prob: number) => {
    if (prob >= 70) return "text-red-400";
    if (prob >= 40) return "text-orange-400";
    return "text-green-400";
  };

  // Sort probabilities to show highest first
  const sortedProbabilities = result 
    ? Object.entries(result.probabilities).sort((a: any, b: any) => b[1] - a[1])
    : [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none -z-10" />

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <FileText className="text-primary" />
                Medical Report Analyzer
              </h1>
              <p className="text-muted-foreground mt-2 text-sm max-w-2xl">
                Upload PDF or Text medical reports (e.g., blood work, OCT narratives, clinical notes). 
                Our specialized clinical NLP engine instantly extracts indicators and maps them to 10 retinal diseases.
              </p>
            </div>
            {result && (
              <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 px-4 py-2 rounded-full">
                <Zap size={16} className="text-secondary animate-pulse" />
                <span className="text-sm font-medium text-white tracking-wide">Analysis Complete</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Upload Section */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden group">
                {loading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
                     <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                     <p className="text-primary font-medium mt-4 tracking-widest text-sm uppercase">Processing Text...</p>
                  </div>
                )}
                
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <UploadCloud size={20} className="text-muted-foreground" />
                  Upload Document
                </h2>
                
                <label className="border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/20 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer text-center relative overflow-hidden">
                  <input 
                    type="file" 
                    accept=".pdf,.txt" 
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  <div className="w-16 h-16 bg-card border border-border rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg">
                    <FileText size={28} className={file ? "text-primary" : "text-muted-foreground"} />
                  </div>
                  <span className="text-sm font-medium text-white mb-1">
                    {file ? file.name : "Select PDF or TXT File"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {file ? `${(file.size / 1024).toFixed(2)} KB` : "Max file size: 10MB"}
                  </span>
                </label>

                {error && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-300 leading-relaxed">{error}</p>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className="w-full mt-6 bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 rounded-lg transition-all glow-blue flex items-center justify-center gap-2"
                >
                  {loading ? "Analyzing..." : "Analyze Report"}
                  {!loading && <ChevronRight size={18} />}
                </button>
              </div>

              {/* Instructions Box */}
              <div className="bg-slate-900/50 border border-border rounded-xl p-5">
                <h3 className="text-sm font-medium text-white mb-3">How it works</h3>
                <ul className="space-y-3">
                  <li className="text-xs text-muted-foreground flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-primary font-bold">1</span>
                    </div>
                    Upload a clinical document containing patient history, symptoms, or lab results.
                  </li>
                  <li className="text-xs text-muted-foreground flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-primary font-bold">2</span>
                    </div>
                    NLP engine extracts text and searches for over 50 specific clinical biomarkers and keywords.
                  </li>
                  <li className="text-xs text-muted-foreground flex items-start gap-2">
                    <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-[10px] text-primary font-bold">3</span>
                    </div>
                    The engine correlates findings directly with our 10 retinal disease profiles.
                  </li>
                </ul>
              </div>
            </div>

            {/* Results Section */}
            <div className="lg:col-span-2 space-y-6">
              {result ? (
                <>
                  <div className="bg-card border border-border rounded-xl p-6 shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                      <Activity size={120} />
                    </div>
                    
                    <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                      <CheckCircle2 size={20} className="text-secondary" />
                      Disease Indication Analysis
                    </h2>
                    
                    <div className="space-y-5 relative z-10">
                      {sortedProbabilities.map(([disease, prob]: any) => (
                        <div key={disease} className="space-y-2">
                          <div className="flex justify-between items-end">
                            <span className="text-sm font-medium text-slate-200">
                              {disease}
                              {result.found.includes(disease) && (
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-secondary/20 text-secondary border border-secondary/30">
                                  Markers Found
                                </span>
                              )}
                            </span>
                            <span className={`text-xs font-bold font-mono ${getTextColor(prob)}`}>
                              {prob.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-border/50">
                            <div 
                              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-lg ${getProbabilityColor(prob)}`}
                              style={{ width: `${prob}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-card border border-border rounded-xl p-6 shadow-xl">
                     <h2 className="text-sm font-semibold text-white mb-4 uppercase tracking-wider text-muted-foreground">Extracted Text Preview</h2>
                     <div className="bg-slate-950/50 rounded-lg p-4 border border-border overflow-y-auto max-h-[300px]">
                        <pre className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                          {result.extracted_text || "No readable text found in document."}
                        </pre>
                     </div>
                  </div>
                </>
              ) : (
                <div className="h-full min-h-[400px] border-2 border-dashed border-border rounded-xl flex flex-col items-center justify-center bg-muted/5">
                  <Activity size={48} className="text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground text-sm font-medium">Upload a report to see analysis results.</p>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
