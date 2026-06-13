"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { 
  ShieldAlert, 
  Users, 
  UserCog, 
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  FileCheck
} from "lucide-react";

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function AdminPortalPage() {
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (user.role !== "admin") {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const loadUsers = async () => {
    if (!user || user.role !== "admin") return;
    setFetching(true);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/auth/users`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsersList(data);
      }
    } catch (e) {
      console.error("Failed to load users:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [user]);

  const handleRoleChange = async (userId: string, newRole: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setUpdatingId(userId);
    try {
      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/auth/users/${userId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (res.ok) {
        setSuccessMsg("User permissions updated successfully!");
        setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      } else {
        const data = await res.json();
        setErrorMsg(data.detail || "Failed to update role.");
      }
    } catch (err) {
      setErrorMsg("Network error updating role.");
    } finally {
      setUpdatingId("");
    }
  };

  if (loading || !user || user.role !== "admin") {
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
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <ShieldAlert className="text-red-500" /> Admin Command Portal
            </h1>
            <p className="text-xs text-muted-foreground mt-1">Control system user clearances, roles, and review security logs.</p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300 text-xs flex items-center gap-2">
            <CheckCircle size={16} className="text-green-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-8">
          {/* User management block */}
          <div className="p-6 rounded-xl bg-card border border-border">
            <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
              <Users size={16} className="text-secondary" /> Clinical Staff Database
            </h3>

            {fetching ? (
              <div className="flex justify-center py-12">
                <RefreshCw size={24} className="animate-spin text-primary" />
              </div>
            ) : usersList.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No users found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/60 border-b border-border text-[10px] uppercase font-mono tracking-wider text-muted-foreground">
                      <th className="p-4">Staff Name</th>
                      <th className="p-4">Hospital Email</th>
                      <th className="p-4 font-mono">Firebase UID</th>
                      <th className="p-4">Access Clearance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border text-xs">
                    {usersList.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                        <td className="p-4 font-bold text-white">{u.name}</td>
                        <td className="p-4 text-muted-foreground">{u.email}</td>
                        <td className="p-4 font-mono text-[10px] text-slate-500">{u.id}</td>
                        <td className="p-4">
                          {updatingId === u.id ? (
                            <RefreshCw size={14} className="animate-spin text-primary" />
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleRoleChange(u.id, e.target.value)}
                              className="px-2 py-1 rounded bg-slate-950 border border-border text-xs text-white focus:outline-none focus:border-primary"
                            >
                              <option value="viewer">Viewer (Read-only)</option>
                              <option value="doctor">Doctor (Inference & Sign)</option>
                              <option value="admin">Administrator (Full Access)</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
