"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Eye, Mail, Lock, Sparkles, AlertCircle, RefreshCw } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithEmail, loginWithGoogle, loginAsDemo } = useAuth();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Invalid credentials or authentication failed.");
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Google sign-in cancelled.");
      setLoading(false);
    }
  };

  const handleDemoBypass = (role: "doctor" | "admin") => {
    loginAsDemo(role);
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-background to-background flex items-center justify-center p-6">
      <div className="w-full max-w-md p-8 rounded-2xl glass-panel glow-blue">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded bg-primary mx-auto flex items-center justify-center text-white mb-3 shadow-md glow-blue">
            <Eye size={24} className="text-secondary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Access EyeQ Portal</h2>
          <p className="text-xs text-muted-foreground mt-1.5 uppercase font-mono tracking-wider">Hospital-Grade Retinal Screening</p>
        </div>

        {error && (
          <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">Clinical Email</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="doctor@hospital.org"
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
            className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium text-sm transition-all flex items-center justify-center gap-2 shadow-md glow-blue disabled:opacity-50"
          >
            {loading ? <RefreshCw size={16} className="animate-spin" /> : "Sign In"}
          </button>
        </form>

        <div className="my-6 flex items-center justify-between text-xs text-muted-foreground">
          <div className="h-px bg-border flex-1"></div>
          <span className="px-3 font-mono">OR USE SECURE SINGLE SIGN-ON</span>
          <div className="h-px bg-border flex-1"></div>
        </div>

        {/* Google SSO */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full py-2.5 rounded-lg bg-slate-900 border border-border hover:bg-slate-800 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2 mb-6"
        >
          <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          SSO Google Sign In
        </button>

        {/* Demo Bypass Panel */}
        <div className="p-4 rounded-xl bg-slate-950 border border-border">
          <h4 className="text-xs font-mono font-medium text-secondary flex items-center gap-1.5 uppercase mb-3">
            <Sparkles size={12} className="text-secondary animate-pulse" /> Developer & Reviewer Sandbox
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handleDemoBypass("doctor")}
              className="py-2 rounded bg-primary/10 hover:bg-primary/20 border border-primary/20 text-xs font-medium text-white transition-colors"
            >
              Demo Doctor
            </button>
            <button
              onClick={() => handleDemoBypass("admin")}
              className="py-2 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-xs font-medium text-red-300 transition-colors"
            >
              Demo Admin
            </button>
          </div>
        </div>

        {/* Register Redirect */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Authorized staff registration request?{" "}
          <Link href="/register" className="text-secondary hover:text-white transition-colors font-medium">
            Request Registry
          </Link>
        </p>
      </div>
    </div>
  );
}
