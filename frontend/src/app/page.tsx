"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { 
  Eye, 
  CheckCircle, 
  BrainCircuit, 
  Activity, 
  FileText, 
  TrendingUp, 
  Sparkles, 
  ArrowRight,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export default function LandingPage() {
  const { loginAsDemo, user } = useAuth();
  const router = useRouter();

  const handleLaunchDemo = async (role: "doctor" | "admin") => {
    await loginAsDemo(role);
    router.push("/dashboard");
  };

  const diseases = [
    { code: "DR", name: "Diabetic Retinopathy", desc: "Leaking or damaged microvasculature due to prolonged hyperglycemia." },
    { code: "Glaucoma", name: "Glaucoma", desc: "Optic neuropathy showing cupping of the optic disc, linked to ocular pressure." },
    { code: "AMD", name: "Macular Degeneration", desc: "Macular thinning or yellow drusen deposits affecting center-field acuity." },
    { code: "Cataract", name: "Cataract", desc: "Haze and clouding of the crystalline lens causing systemic scattering." },
    { code: "Myopia", name: "Pathological Myopia", desc: "Elongation of the globe showing structural temporal crescents." },
    { code: "HR", name: "Hypertensive Retinopathy", desc: "Narrowed retinal arterioles and AV nicking from systemic blood pressure." },
    { code: "DME", name: "Diabetic Macular Edema", desc: "Macular thickening and localized fluid leakage near focal points." },
    { code: "Papilledema", name: "Papilledema", desc: "Optic nerve swelling triggered by intracranial pressure variations." },
    { code: "CSR", name: "Central Serous Chorioretinopathy", desc: "Localized subretinal fluid accumulation under center macular boundaries." },
    { code: "RVO", name: "Retinal Vein Occlusion", desc: "Blocked venous return creating massive hemorrhage patterns." }
  ];

  const features = [
    { title: "Disease Detection", desc: "Screens for 10 distinct retinal pathologies simultaneously from a single fundus photograph.", icon: BrainCircuit },
    { title: "Retinal Health Index", desc: "Computes an overall eye safety rating out of 100 based on aggregated risk matrices.", icon: Activity },
    { title: "AI Explainability", desc: "Generates interactive GradCAM overlays showing exactly where pathological triggers reside.", icon: Eye },
    { title: "Doctor Dashboard", desc: "Enables case management, status tracking (approve/reject), and custom clinical logs.", icon: ShieldCheck },
    { title: "PDF Reports", desc: "Compiles formatted patient screening records ready for signature, sharing, and archiving.", icon: FileText },
    { title: "Patient Monitoring", desc: "Tracks patient screening runs over time to compare historical scans side-by-side.", icon: TrendingUp }
  ];

  const symptoms = [
    { name: "Blurred or Cloudy Vision", desc: "General loss of sharpness, haze, or focus issues. (Common in Cataract, Diabetic Retinopathy, DME)" },
    { name: "Floaters & Flashes", desc: "Spots, cobwebs, or sudden flashes of light in your field of vision. (Common in Pathological Myopia, DR)" },
    { name: "Distorted or Wavy Vision", desc: "Straight lines appear wavy, bent, or distorted. (Common in Macular Degeneration, DME, CSR)" },
    { name: "Loss of Peripheral Vision", desc: "Narrowing of the visual field or 'tunnel vision' from the sides. (Common in Glaucoma)" },
    { name: "Central Vision Loss", desc: "Dark or blurry spots appearing directly in the center of your vision. (Common in AMD, CSR)" },
    { name: "Severe Headaches", desc: "Throbbing pain sometimes accompanied by nausea or ringing ears. (Common in Papilledema, HR)" },
    { name: "Poor Night Vision", desc: "Difficulty seeing in low light or driving at night. (Common in Cataract, Myopia)" },
    { name: "Halos Around Lights", desc: "Bright circles or rings appearing around light sources. (Common in Glaucoma, Cataract)" },
    { name: "Sudden Vision Loss", desc: "Rapid, often painless decline or loss of vision in one or both eyes. (Common in Retinal Vein Occlusion, DR)" },
    { name: "Faded Colors", desc: "Colors appearing washed out or less vibrant than usual. (Common in Cataract, DME)" },
    { name: "Temporary Vision Blackouts", desc: "Brief episodes of vision loss or graying out lasting a few seconds. (Common in Papilledema)" },
    { name: "Difficulty with Distant Objects", desc: "Struggling to focus on objects far away. (Common in Pathological Myopia)" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <header className="h-20 border-b border-border flex items-center justify-between px-8 bg-background/50 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-primary flex items-center justify-center text-white">
            <Eye size={20} className="text-secondary animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-base tracking-wide text-white">EYEQ INNOVATE</h1>
            <span className="text-[10px] text-secondary font-mono tracking-widest uppercase block leading-none">Hospital-Grade Screening</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Link href="/dashboard" className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/95 text-white text-sm font-medium transition-all shadow-md glow-blue">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
                Sign In
              </Link>
              <button 
                onClick={() => handleLaunchDemo("doctor")}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-medium transition-all shadow-md glow-blue"
              >
                Launch Demo <Sparkles size={16} className="text-cyan-300" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-24 overflow-hidden border-b border-border bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-background to-background">
          <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-medium bg-primary/20 text-secondary border border-primary/30 mb-6 uppercase tracking-wider">
              <Sparkles size={12} /> CLINICAL RETINAL DIAGNOSIS PLATFORM
            </span>

            <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight max-w-4xl mx-auto">
              AI-Powered <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300">Retinal Disease</span> Detection
            </h1>
            
            <p className="mt-6 text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
              Hospital-grade computer vision platform screening for 10 major retinal pathologies in under 2 seconds. Providing clinical RHI metrics and explainable CAM activation maps.
            </p>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-4 max-w-xl mx-auto mt-10 p-4 rounded-xl bg-card/60 border border-border">
              <div className="text-center">
                <span className="block text-2xl md:text-3xl font-extrabold text-white">10</span>
                <span className="text-xs text-muted-foreground">Pathologies Detected</span>
              </div>
              <div className="text-center border-x border-border">
                <span className="block text-2xl md:text-3xl font-extrabold text-secondary">95%</span>
                <span className="text-xs text-muted-foreground">Clinical Accuracy</span>
              </div>
              <div className="text-center">
                <span className="block text-2xl md:text-3xl font-extrabold text-accent">Instant</span>
                <span className="text-xs text-muted-foreground">Retinal Screening</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/login" className="flex items-center gap-2 px-6 py-3 rounded-lg bg-primary hover:bg-primary/95 text-white font-medium shadow-lg glow-blue transition-all">
                Start Screening <ArrowRight size={18} />
              </Link>
              <button 
                onClick={() => handleLaunchDemo("doctor")}
                className="px-6 py-3 rounded-lg bg-card border border-border hover:bg-slate-900 text-white font-medium transition-colors"
              >
                View Doctor Demo
              </button>
              <button 
                onClick={() => handleLaunchDemo("admin")}
                className="px-6 py-3 rounded-lg bg-slate-950/80 border border-red-900/30 hover:bg-red-950/20 text-red-300 font-medium transition-colors"
              >
                View Admin Demo
              </button>
            </div>
          </div>
        </section>

        {/* Symptoms Section */}
        <section className="py-20 bg-slate-900/30 border-b border-border">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white">Common Warning Symptoms</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                If you experience any of these symptoms, we highly recommend proceeding to the screening immediately.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {symptoms.map((s, idx) => (
                <div key={idx} className="p-6 rounded-xl bg-card border border-border hover:border-primary/40 transition-all flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <AlertCircle size={20} className="text-secondary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white mb-2">{s.name}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-12 text-center">
              <Link href="/login" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary hover:bg-primary/95 text-white font-bold shadow-lg glow-blue transition-all">
                Proceed to Screening <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>

        {/* Disease Showcase Section */}
        <section className="py-20 max-w-6xl mx-auto px-6 border-b border-border">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white">10-Class Multi-Disease Screening</h2>
            <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
              Simultaneous feature localization and scoring for ten of the most prevalent vision-impairing conditions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {diseases.map((d) => (
              <div key={d.code} className="p-5 rounded-xl bg-card border border-border hover:border-primary/40 hover:-translate-y-1 transition-all flex flex-col">
                <div className="w-10 h-10 rounded bg-slate-800 flex items-center justify-center font-mono font-bold text-secondary mb-3 text-sm">
                  {d.code}
                </div>
                <h3 className="font-bold text-white text-sm">{d.name}</h3>
                <p className="text-xs text-muted-foreground mt-2 flex-1 leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-slate-950/40">
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-white">Full-Suite Retinal Care Platform</h2>
              <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
                Built from the ground up for ophthalmology departments and clinical screening teams.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {features.map((f, idx) => {
                const Icon = f.icon;
                return (
                  <div key={idx} className="p-6 rounded-xl bg-card border border-border flex gap-4 hover:border-slate-700 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <Icon size={20} className="text-secondary" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white mb-2">{f.title}</h3>
                      <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground bg-slate-950">
        <p>© 2026 EyeQ Innovate. Team Neural Nexus. Under clinical screening evaluation.</p>
        <p className="mt-2 text-[10px] text-slate-600 font-mono uppercase tracking-widest">Designed for St. Joseph's College of Engineering</p>
      </footer>
    </div>
  );
}
