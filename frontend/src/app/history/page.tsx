"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  History, 
  Search, 
  Filter, 
  SlidersHorizontal,
  ChevronRight,
  Activity,
  AlertCircle
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

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [history, setHistory] = useState<ScreeningItem[]>([]);
  const [fetching, setFetching] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [searchFilter, setSearchFilter] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      setFetching(true);
      try {
        const token = getToken();
        // Construct API query
        let url = `${API_BASE_URL}/screenings`;
        const params = [];
        if (statusFilter !== "all") params.push(`status=${statusFilter}`);
        if (riskFilter !== "all") params.push(`risk=${riskFilter}`);
        if (params.length > 0) {
          url += `?${params.join("&")}`;
        }

        const res = await fetch(url, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error("Failed to load screening history:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchHistory();
  }, [user, statusFilter, riskFilter]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Client-side text filter by patient name
  const filteredHistory = history.filter(item => 
    item.patient_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    item.id.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      {/* Main Panel */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Screening Archive</h1>
            <p className="text-xs text-muted-foreground mt-1">Review historical clinical screenings and diagnostic statuses.</p>
          </div>
        </div>

        {/* Toolbar: Filters & Searches */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-wrap gap-4 items-center mb-6">
          {/* Text Search */}
          <div className="relative flex-1 min-w-[240px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search by patient name or screening ID..."
              className="w-full pl-9 pr-4 py-2 rounded bg-slate-950 border border-border text-xs text-white placeholder-slate-600 focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Risk filter */}
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={14} className="text-muted-foreground" />
              <span className="text-xs text-slate-400">Risk Threshold:</span>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="px-2 py-1.5 rounded bg-slate-950 border border-border text-xs text-white focus:outline-none"
              >
                <option value="all">All Levels</option>
                <option value="low">Low Risk (RHI &gt;= 75)</option>
                <option value="moderate">Moderate Risk (50 &lt;= RHI &lt; 75)</option>
                <option value="high">High Risk (RHI &lt; 50)</option>
              </select>
            </div>

            {/* Status filter */}
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-muted-foreground" />
              <span className="text-xs text-slate-400">Review Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2 py-1.5 rounded bg-slate-950 border border-border text-xs text-white focus:outline-none"
              >
                <option value="all">All Cases</option>
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {fetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-16 rounded-xl border border-dashed border-border text-center text-muted-foreground text-sm">
            <History className="mx-auto text-muted-foreground/30 mb-3" size={40} />
            No historical screenings match these criteria.
          </div>
        ) : (
          /* Archive Table */
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-border text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                    <th className="p-4">Screening ID</th>
                    <th className="p-4">Date & Time</th>
                    <th className="p-4">Patient Name</th>
                    <th className="p-4">DR Stage</th>
                    <th className="p-4 text-center">RHI Score</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  {filteredHistory.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="p-4 font-mono font-semibold text-white">{s.id}</td>
                      <td className="p-4 text-muted-foreground">
                        {new Date(s.created_at).toLocaleString()}
                      </td>
                      <td className="p-4 font-bold text-white">{s.patient_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          s.severity_dr === "No DR" ? "bg-slate-800 text-slate-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {s.severity_dr}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-block w-8 py-0.5 rounded font-bold ${
                          s.rhi >= 90 ? "bg-green-500/10 text-green-400" :
                          s.rhi >= 75 ? "bg-teal-500/10 text-teal-400" :
                          s.rhi >= 50 ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"
                        }`}>
                          {s.rhi || "?"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase tracking-wider font-mono border ${
                          s.status === "approved" ? "bg-green-500/10 text-green-400 border-green-500/20" :
                          s.status === "rejected" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <Link 
                          href={`/analysis/${s.id}`}
                          className="inline-flex items-center gap-1 text-secondary hover:text-white font-medium transition-colors"
                        >
                          Details <ChevronRight size={14} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
