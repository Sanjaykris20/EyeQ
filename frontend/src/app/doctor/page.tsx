"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  Activity, 
  CheckCircle, 
  XCircle, 
  FileText, 
  MessageSquare,
  AlertCircle,
  ChevronRight,
  Eye,
  RefreshCw,
  FolderSync
} from "lucide-react";
import Link from "next/link";

interface ScreeningItem {
  id: string;
  patient_id: string;
  patient_name: string;
  image_url: string;
  severity_dr: string;
  status: string;
  created_at: string;
  rhi: number;
}

interface SelectedCaseDetail {
  id: string;
  patient: {
    id: string;
    name: string;
    age: number;
    gender: string;
  };
  image_url: string;
  enhanced_image_url: string;
  heatmap_image_url: string;
  notes: string;
  severity_dr: string;
  results: {
    rhi: number;
  };
}

interface HistoricalScan {
  id: string;
  image_url: string;
  enhanced_image_url: string;
  created_at: string;
  rhi: number;
}

export default function DoctorPortalPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();

  const [pendingQueue, setPendingQueue] = useState<ScreeningItem[]>([]);
  const [selectedCase, setSelectedCase] = useState<SelectedCaseDetail | null>(null);
  const [historicalScans, setHistoricalScans] = useState<HistoricalScan[]>([]);
  const [activeCompareScan, setActiveCompareScan] = useState<HistoricalScan | null>(null);

  const [fetchingQueue, setFetchingQueue] = useState(true);
  const [fetchingDetail, setFetchingDetail] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_ROOT || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const loadPendingQueue = async () => {
    if (!user) return;
    setFetchingQueue(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/screenings?status=pending`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const queue = await res.json();
        setPendingQueue(queue);
        // Automatically select the first case if nothing is selected yet
        if (queue.length > 0 && !selectedCase) {
          loadCaseDetail(queue[0].id);
        } else if (queue.length === 0) {
          setSelectedCase(null);
        }
      }
    } catch (err) {
      console.error("Queue loading failure:", err);
    } finally {
      setFetchingQueue(false);
    }
  };

  useEffect(() => {
    loadPendingQueue();
  }, [user]);

  const loadCaseDetail = async (screeningId: string) => {
    setFetchingDetail(true);
    setActiveCompareScan(null);
    setHistoricalScans([]);
    setSuccessMsg("");
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const detail = await res.json();
        setSelectedCase(detail);
        setReviewNotes(detail.notes || "");

        // Load patient history to retrieve previous scans to compare
        const patientRes = await fetch(`${API_BASE_URL}/patients/${detail.patient.id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (patientRes.ok) {
          const patData = await patientRes.json();
          // Exclude the current screening scan itself from comparison candidates
          const previous = patData.screenings.filter((s: any) => s.id !== screeningId);
          setHistoricalScans(previous);
          if (previous.length > 0) {
            setActiveCompareScan(previous[0]); // Default to comparing against the most recent previous scan
          }
        }
      }
    } catch (e) {
      console.error("Failed to load case details:", e);
    } finally {
      setFetchingDetail(false);
    }
  };

  const handleSubmitReview = async (reviewStatus: "approved" | "rejected") => {
    if (!selectedCase) return;
    setSubmitting(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/screenings/${selectedCase.id}/review`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          status: reviewStatus,
          notes: reviewNotes
        })
      });

      if (res.ok) {
        setSuccessMsg(`Case successfully marked as ${reviewStatus}!`);
        // Remove from pending locally
        setPendingQueue(prev => prev.filter(c => c.id !== selectedCase.id));
        
        // Trigger report generation in background so it's ready
        fetch(`${API_BASE_URL}/reports/${selectedCase.id}`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(() => {});

        // Load next case in queue after short delay
        setTimeout(() => {
          setSelectedCase(null);
          loadPendingQueue();
        }, 1000);
      }
    } catch (err) {
      console.error("Review submit error:", err);
    } finally {
      setSubmitting(false);
    }
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

      {/* Main Panel */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto flex flex-col md:flex-row gap-8">
        
        {/* Left Side: Queue list */}
        <div className="w-full md:w-80 shrink-0 space-y-4">
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Activity className="text-secondary" size={20} /> Review Queue
          </h2>
          <p className="text-xs text-muted-foreground">Clinical scans awaiting ophthalmologist signature verification.</p>
          
          {fetchingQueue ? (
            <div className="flex justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-primary" />
            </div>
          ) : pendingQueue.length === 0 ? (
            <div className="p-8 rounded-xl bg-card border border-border text-center text-xs text-muted-foreground">
              Review queue is clear. All scans validated!
            </div>
          ) : (
            <div className="space-y-3">
              {pendingQueue.map((c) => (
                <button
                  key={c.id}
                  onClick={() => loadCaseDetail(c.id)}
                  className={`w-full p-4 rounded-xl border text-left transition-all ${
                    selectedCase?.id === c.id 
                      ? "bg-primary/20 border-primary shadow-md glow-blue" 
                      : "bg-card border-border hover:bg-slate-900"
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <h4 className="font-bold text-white text-sm">{c.patient_name}</h4>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">RHI: {c.rhi}</span>
                  </div>
                  <div className="flex justify-between items-center mt-3 text-[10px] text-muted-foreground font-mono">
                    <span>DR Stage: {c.severity_dr}</span>
                    <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Active Case Review & Image Comparer */}
        <div className="flex-1 space-y-6">
          {fetchingDetail ? (
            <div className="flex justify-center items-center h-[50vh]">
              <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : successMsg ? (
            <div className="p-8 rounded-xl bg-green-500/10 border border-green-500/20 text-center text-green-300">
              <CheckCircle size={36} className="mx-auto text-green-400 mb-2 animate-bounce" />
              <span>{successMsg}</span>
            </div>
          ) : !selectedCase ? (
            <div className="h-[50vh] rounded-xl border border-dashed border-border flex items-center justify-center text-center text-muted-foreground text-sm p-6">
              Select a screening from the Review Queue left-panel to begin clinical validation.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Patient Badge */}
              <div className="p-5 rounded-xl bg-card border border-border flex flex-wrap justify-between items-center">
                <div>
                  <h3 className="font-bold text-white text-base">{selectedCase.patient.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedCase.patient.age} Y / {selectedCase.patient.gender} • Screening ID: {selectedCase.id}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-slate-900 border border-border text-xs font-mono text-white">
                  <span>RHI:</span> <span className="font-bold text-teal-400">{selectedCase.results.rhi}</span>
                </div>
              </div>

              {/* Compare Panel: Current vs Previous */}
              <div className="p-6 rounded-xl bg-card border border-border">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                  <FolderSync size={16} className="text-secondary" /> Retinal Scan Comparison Viewport
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Left Frame: Current Active Scan */}
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider mb-2 block text-center">Active Screening Scan</span>
                    <div className="aspect-square rounded border border-border bg-black overflow-hidden flex items-center justify-center">
                      <img 
                        src={`${BACKEND_URL}${selectedCase.image_url}`} 
                        alt="Current Scan" 
                        className="w-full h-full object-contain"
                      />
                    </div>
                  </div>

                  {/* Right Frame: Historical Comparison Scan */}
                  <div>
                    <div className="flex justify-between items-center mb-2 px-1">
                      <span className="text-[10px] text-cyan-400 uppercase font-mono tracking-wider block">Comparison History</span>
                      {historicalScans.length > 0 && (
                        <select
                          value={activeCompareScan?.id || ""}
                          onChange={(e) => {
                            const scan = historicalScans.find(h => h.id === e.target.value);
                            if (scan) setActiveCompareScan(scan);
                          }}
                          className="px-1.5 py-0.5 rounded bg-slate-950 border border-border text-[10px] text-slate-300 focus:outline-none"
                        >
                          {historicalScans.map((h) => (
                            <option key={h.id} value={h.id}>
                              {new Date(h.created_at).toLocaleDateString()} (RHI: {h.rhi})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <div className="aspect-square rounded border border-border bg-black overflow-hidden flex items-center justify-center relative">
                      {activeCompareScan ? (
                        <img 
                          src={`${BACKEND_URL}${activeCompareScan.image_url}`} 
                          alt="Previous Scan" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-center p-4 text-xs text-muted-foreground">
                          No previous scan data recorded for this patient. Comparison mode deactivated.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Input Box */}
              <div className="p-6 rounded-xl bg-card border border-border space-y-4">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2">
                  <MessageSquare size={16} className="text-secondary" /> Doctor Certification & Clinical Notes
                </h3>
                
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Record your diagnostic observations here. Notes will be appended to the final printable PDF report..."
                  rows={4}
                  className="w-full px-3 py-2.5 rounded bg-slate-950 border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary resize-none"
                />

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    onClick={() => handleSubmitReview("rejected")}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-semibold text-red-400 transition-colors"
                  >
                    <XCircle size={14} /> Request Re-scan / Reject
                  </button>
                  <button
                    onClick={() => handleSubmitReview("approved")}
                    disabled={submitting}
                    className="flex items-center gap-1.5 px-5 py-2 rounded bg-primary hover:bg-primary/95 text-xs font-bold text-white transition-all shadow-md glow-blue"
                  >
                    <CheckCircle size={14} /> Approve & Sign Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
