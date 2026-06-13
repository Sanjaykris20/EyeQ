"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, User, Mail, Lock, AlertCircle, RefreshCw } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const { registerWithEmail } = useAuth();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await registerWithEmail(email, password, name);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Ensure email is unique.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel glow-cyan">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded bg-primary mx-auto flex items-center justify-center text-white mb-3 shadow-md glow-cyan">
            <Eye size={24} className="text-secondary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Staff Registry</h2>
          <p className="text-xs text-muted-foreground mt-1.5 uppercase font-mono tracking-wider">EyeQ Innovate Retinal Platform</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Full Professional Name</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Dr. Jordan Blake"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Hospital Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jordan.blake@hospital.org"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Security Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-slate-950 border border-border text-sm text-white placeholder-slate-500 focus:outline-none focus:border-primary transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md glow-cyan disabled:opacity-50"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : "Request Registry"}
          </button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Already registered?{" "}
          <Link href="/login" className="text-secondary hover:text-white transition-colors font-medium">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
