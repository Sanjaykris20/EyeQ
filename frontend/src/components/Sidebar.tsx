"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { 
  LayoutDashboard, 
  Users, 
  UploadCloud, 
  History, 
  BarChart3, 
  MessageSquareCode, 
  Activity, 
  ShieldAlert, 
  LogOut,
  Eye,
  FileText
} from "lucide-react";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, role: ["doctor", "admin", "viewer"] },
    { name: "Patients", href: "/patients", icon: Users, role: ["doctor", "admin", "viewer"] },
    { name: "New Screening", href: "/screening/new", icon: UploadCloud, role: ["doctor", "admin"] },
    { name: "Screening History", href: "/history", icon: History, role: ["doctor", "admin", "viewer"] },
    { name: "Clinical Analytics", href: "/analytics", icon: BarChart3, role: ["doctor", "admin"] },
    { name: "AI Assistant", href: "/assistant", icon: MessageSquareCode, role: ["doctor", "admin", "viewer"] },
    { name: "Report Analyzer", href: "/report-analyzer", icon: FileText, role: ["doctor", "admin", "viewer"] },
    { name: "Doctor Portal", href: "/doctor", icon: Activity, role: ["doctor", "admin"] },
    { name: "Admin Portal", href: "/admin", icon: ShieldAlert, role: ["admin"] }
  ];

  const filteredNavItems = navItems.filter(item => user && item.role.includes(user.role));

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-screen sticky top-0 shrink-0">
      {/* Platform Title */}
      <div className="h-16 flex items-center px-6 gap-3 border-b border-border">
        <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-white">
          <Eye size={18} className="text-secondary animate-pulse" />
        </div>
        <div>
          <h1 className="font-bold text-sm tracking-wide text-white leading-tight">EYEQ INNOVATE</h1>
          <span className="text-[10px] text-secondary font-mono tracking-widest uppercase">Retinal AI</span>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive 
                  ? "bg-primary text-white shadow-sm glow-blue" 
                  : "text-muted-foreground hover:bg-muted hover:text-white"
              }`}
            >
              <Icon size={18} className={isActive ? "text-secondary" : ""} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Profile Info & Logout */}
      <div className="p-4 border-t border-border bg-slate-900/40">
        {user && (
          <div className="mb-4 px-2">
            <p className="text-xs text-muted-foreground font-mono">AUTHORIZED AS</p>
            <h4 className="text-sm font-bold text-white truncate">{user.name}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className={`w-2 h-2 rounded-full ${user.role === 'admin' ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-[10px] uppercase font-mono tracking-wider text-muted-foreground">{user.role}</span>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
