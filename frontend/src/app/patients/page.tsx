"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  Users, 
  Search, 
  UserPlus, 
  FileCheck, 
  Phone, 
  Mail, 
  PlusCircle, 
  Calendar,
  X,
  RefreshCw,
  User,
  Heart,
  AlertCircle,
  Activity
} from "lucide-react";
import Link from "next/link";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  phone: string;
  email: string;
  created_at: string;
  last_scan_date?: string;
}

export default function PatientsPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState("");
  const [fetching, setFetching] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  const fetchPatients = async () => {
    if (!user) return;
    setFetching(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/patients?search=${encodeURIComponent(search)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPatients(data);
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [user, search]);

  const handleCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          age: parseInt(age),
          gender,
          phone: phone || null,
          email: email || null
        })
      });

      if (res.ok) {
        // Reset and close
        setName("");
        setAge("");
        setGender("Male");
        setPhone("");
        setEmail("");
        setShowModal(false);
        fetchPatients(); // Refresh registry
      } else {
        const errData = await res.json();
        setError(errData.detail || "Failed to create patient profile.");
      }
    } catch (err: any) {
      setError("Server connectivity issues. Try again.");
    } finally {
      setCreating(false);
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

      {/* Main Body */}
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {/* Header Block */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Patient Directory</h1>
            <p className="text-xs text-muted-foreground mt-1 font-sans">Manage clinical files and coordinate retinal screening runs.</p>
          </div>
          {user.role !== "viewer" && (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-colors shadow-md glow-blue"
            >
              <UserPlus size={16} /> Register Patient
            </button>
          )}
        </div>

        {/* Search Panel */}
        <div className="mb-6 relative max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient by name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-card border border-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {fetching ? (
          <div className="flex justify-center items-center h-64">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="p-16 rounded-xl border border-dashed border-border text-center text-muted-foreground text-sm">
            <Users className="mx-auto text-muted-foreground/30 mb-3" size={40} />
            No patients found in directory. Select "Register Patient" to add one.
          </div>
        ) : (
          /* Patients Table Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {patients.map((pat) => (
              <div key={pat.id} className="p-6 rounded-xl bg-card border border-border flex flex-col justify-between hover:border-slate-700 transition-colors">
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-white text-lg">{pat.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                          {pat.gender}
                        </span>
                        <span className="text-xs text-muted-foreground">{pat.age} Years Old</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">ID: {pat.id}</span>
                  </div>

                  <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Phone size={14} className="text-slate-500" />
                      <span>{pat.phone || "No phone listed"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail size={14} className="text-slate-500" />
                      <span>{pat.email || "No email listed"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span>Registered {new Date(pat.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Activity size={14} className={pat.last_scan_date ? "text-secondary" : "text-slate-500"} />
                      {pat.last_scan_date ? (
                        <span className="text-xs text-muted-foreground">
                          Last Scan: <span className="text-white font-semibold">{new Date(pat.last_scan_date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">No scans recorded yet</span>
                      )}
                    </div>
                  </div>
                </div>

                {user.role !== "viewer" && (
                  <div className="mt-6 pt-4 border-t border-border flex justify-end gap-2">
                    <Link
                      href={`/screening/new?patient_id=${pat.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs text-secondary font-medium transition-colors"
                    >
                      <PlusCircle size={14} /> Screen Retina
                    </Link>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Register Modal */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-fade-in">
            <div className="w-full max-w-md p-6 rounded-xl bg-card border border-border glow-blue shadow-2xl relative">
              <button 
                onClick={() => setShowModal(false)}
                className="absolute right-4 top-4 text-muted-foreground hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <h3 className="text-lg font-bold text-white flex items-center gap-2 mb-1">
                <User size={20} className="text-secondary" /> Register Patient File
              </h3>
              <p className="text-xs text-muted-foreground mb-4">Initialize clinical screening telemetry file.</p>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle size={16} className="text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleCreatePatient} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Marcus Sterling"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">Age</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      placeholder="45"
                      className="w-full px-3 py-2 rounded bg-slate-950 border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded bg-slate-950 border border-border text-sm text-white focus:outline-none focus:border-primary"
                    >
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono font-medium text-slate-400 mb-1.5 uppercase">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="marcus.s@mail.com"
                    className="w-full px-3 py-2 rounded bg-slate-950 border border-border text-sm text-white placeholder-slate-600 focus:outline-none focus:border-primary"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creating}
                  className="w-full py-2.5 rounded bg-primary hover:bg-primary/95 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md"
                >
                  {creating ? <RefreshCw size={16} className="animate-spin" /> : "Register File"}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
