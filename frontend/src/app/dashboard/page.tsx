"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  Users, 
  Activity, 
  ShieldAlert, 
  PlusCircle, 
  ChevronRight, 
  Clock, 
  FileCheck,
  TrendingUp
} from "lucide-react";
import Link from "next/link";

interface DashboardStats {
  total_patients: number;
  total_screenings: number;
  high_risk_cases: number;
  average_rhi: number;
  screenings_today: number;
  pending_reviews: number;
  reports_generated: number;
}

interface RecentActivity {
  id: string;
  patient_name: string;
  severity_dr: string;
  status: string;
  created_at: string;
  rhi: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recent, setRecent] = useState<RecentActivity[]>([]);
  const [fetching, setFetching] = useState(true);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        const token = getToken();
        // Fetch stats summary
        const statsRes = await fetch(`${API_BASE_URL}/analytics/summary`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        // Fetch recent screenings
        const screeningsRes = await fetch(`${API_BASE_URL}/screenings`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (screeningsRes.ok) {
          const screeningsData = await screeningsRes.json();
          setRecent(screeningsData.slice(0, 5)); // Show only top 5 recent screenings
        }
      } catch (err) {
        console.error("Dashboard fetching failure:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchDashboardData();
  }, [user]);

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

      {/* Main Content Pane */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {/* Page Title & Actions */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Overview</h1>
            <p className="text-xs text-muted-foreground mt-1">Real-time retinal health telemetry & diagnostics queue.</p>
          </div>
          {user.role !== "viewer" && (
            <Link 
              href="/screening/new" 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors shadow-md glow-blue"
            >
              <PlusCircle size={16} /> New Retinal Screening
            </Link>
          )}
        </div>

        {fetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="p-6 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Total Patients</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.total_patients || 0}</h3>
                </div>
                <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                  <Users size={22} />
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Total Screenings</span>
                  <h3 className="text-3xl font-extrabold text-white mt-1">{stats?.total_screenings || 0}</h3>
                </div>
                <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                  <Activity size={22} />
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">High Risk Cases</span>
                  <h3 className={`text-3xl font-extrabold mt-1 ${stats?.high_risk_cases && stats.high_risk_cases > 0 ? "text-red-400 animate-pulse" : "text-white"}`}>
                    {stats?.high_risk_cases || 0}
                  </h3>
                </div>
                <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <ShieldAlert size={22} />
                </div>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border flex items-center justify-between">
                <div>
                  <span className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Avg Retinal Health Index</span>
                  <h3 className="text-3xl font-extrabold text-teal-400 mt-1">{stats?.average_rhi || 100}</h3>
                </div>
                <div className="w-12 h-12 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                  <TrendingUp size={22} />
                </div>
              </div>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="p-5 rounded-xl bg-card/60 border border-border flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Clock size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Screenings Today</h4>
                  <p className="text-2xl font-extrabold text-white mt-1">{stats?.screenings_today || 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Scans compiled in current clinic shift.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card/60 border border-border flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Pending Reviews</h4>
                  <p className="text-2xl font-extrabold text-white mt-1">{stats?.pending_reviews || 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Uploaded retina scans awaiting validation.</p>
                </div>
              </div>

              <div className="p-5 rounded-xl bg-card/60 border border-border flex gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center text-green-400 shrink-0">
                  <FileCheck size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Reports Generated</h4>
                  <p className="text-2xl font-extrabold text-white mt-1">{stats?.reports_generated || 0}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Approved clinic PDF reports archived.</p>
                </div>
              </div>
            </div>

            {/* Recent Screenings Queue */}
            <div className="rounded-xl bg-card border border-border overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <h3 className="font-bold text-white text-base">Recent Retinal Screenings</h3>
                <Link href="/history" className="text-xs text-secondary hover:text-white transition-colors flex items-center gap-1">
                  View All History <ChevronRight size={14} />
                </Link>
              </div>

              {recent.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground text-sm">
                  No screening scans recorded yet. Click "New Retinal Screening" to begin.
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {recent.map((s) => (
                    <div key={s.id} className="p-5 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                          s.rhi >= 90 ? "bg-green-500/10 text-green-400" :
                          s.rhi >= 75 ? "bg-teal-500/10 text-teal-400" :
                          s.rhi >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {s.rhi || "?"}
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white">{s.patient_name}</h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">ID: {s.id}</span>
                            <span className="text-xs text-slate-600">•</span>
                            <span className={`text-xs ${s.severity_dr === "No DR" ? "text-muted-foreground" : "text-red-400 font-medium"}`}>
                              DR: {s.severity_dr}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-mono tracking-wider uppercase border ${
                          s.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          s.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {s.status}
                        </span>
                        
                        <span className="text-xs text-muted-foreground hidden md:inline">
                          {new Date(s.created_at).toLocaleDateString(undefined, {month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit'})}
                        </span>

                        <Link 
                          href={`/analysis/${s.id}`} 
                          className="flex items-center gap-1 text-xs text-secondary hover:text-white font-medium transition-colors"
                        >
                          View Report <ChevronRight size={14} />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
