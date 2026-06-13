"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid,
  Legend
} from "recharts";
import { BarChart3, TrendingUp, Users, ShieldAlert, Activity } from "lucide-react";

interface AnalyticsData {
  disease_distribution: Array<{ disease: string; avg_probability: number }>;
  monthly_trends: Array<{ month: string; screenings: number }>;
  rhi_distribution: Array<{ range: string; count: number }>;
  age_group_analysis: Array<{ group: string; patient_count: number; average_rhi: number }>;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [mounted, setMounted] = useState(false);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  // Prevent hydration errors by only rendering charts client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    const fetchAnalytics = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/analytics/charts`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const chartData = await res.json();
          setData(chartData);
        }
      } catch (err) {
        console.error("Failed to load clinical analytics:", err);
      } finally {
        setFetching(false);
      }
    };

    fetchAnalytics();
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Color constants for charts
  const COLORS = ["#10B981", "#06B6D4", "#F59E0B", "#F97316", "#EF4444"];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      {/* Main Container */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Clinical Analytics</h1>
            <p className="text-xs text-muted-foreground mt-1">Aggregated statistics, pathological trends, and diagnostic telemetry.</p>
          </div>
        </div>

        {fetching || !mounted ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !data ? (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-red-300">
            No analytics data compiled. Upload scans to populate reports.
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top row: Line trend & RHI distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Line chart: Intake volume */}
              <div className="p-6 rounded-xl bg-card border border-border flex flex-col">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-secondary" /> Screening Volume Trends
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.monthly_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="month" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#121b2e", borderColor: "#1e293b", color: "#fff" }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Line type="monotone" dataKey="screenings" stroke="#2563eb" strokeWidth={3} dot={{ fill: "#06b6d4", r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Pie chart: RHI brackets */}
              <div className="p-6 rounded-xl bg-card border border-border flex flex-col">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                  <Activity size={16} className="text-secondary" /> RHI Index Distribution
                </h3>
                <div className="h-64 w-full flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.rhi_distribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="range"
                      >
                        {data.rhi_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: "#121b2e", borderColor: "#1e293b", color: "#fff" }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: 9 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Bottom Row: Disease distribution & Age brackets */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Bar Chart: 10 Diseases */}
              <div className="p-6 rounded-xl bg-card border border-border flex flex-col">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-secondary" /> Average Pathology Probability
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.disease_distribution}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="disease" stroke="#64748b" fontSize={9} interval={0} />
                      <YAxis stroke="#64748b" fontSize={10} unit="%" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#121b2e", borderColor: "#1e293b", color: "#fff" }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Bar dataKey="avg_probability" fill="#06b6d4">
                        {data.disease_distribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.avg_probability >= 50 ? "#ef4444" : entry.avg_probability >= 25 ? "#f59e0b" : "#2563eb"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Bar Chart: Age group average RHI */}
              <div className="p-6 rounded-xl bg-card border border-border flex flex-col">
                <h3 className="font-bold text-white text-xs uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                  <Users size={16} className="text-secondary" /> Demographics: Average RHI by Age Group
                </h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.age_group_analysis}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="group" stroke="#64748b" fontSize={10} />
                      <YAxis stroke="#64748b" fontSize={10} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: "#121b2e", borderColor: "#1e293b", color: "#fff" }}
                        labelStyle={{ fontWeight: "bold" }}
                      />
                      <Bar dataKey="average_rhi" fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
