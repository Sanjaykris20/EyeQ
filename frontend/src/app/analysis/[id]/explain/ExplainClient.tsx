"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Sidebar from "@/components/Sidebar";
import { ArrowLeft, Activity, Info, Eye, Layers, Compass } from "lucide-react";
import Link from "next/link";

interface ScreeningData {
  id: string;
  image_url: string;
  heatmap_image_url: string;
  severity_dr: string;
  patient: {
    name: string;
  };
  results: {
    rhi: number;
  };
}

export default function ExplainClient() {
  const params = useParams();
  const router = useRouter();
  const { user, loading, getToken } = useAuth();
  
  const [data, setData] = useState<ScreeningData | null>(null);
  const [fetching, setFetching] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);
  const sliderRef = useRef<HTMLDivElement>(null);

  let screeningId = params.id as string;
  if (screeningId === "baseline" && typeof window !== "undefined") {
    const pathParts = window.location.pathname.split("/");
    const analysisIdx = pathParts.indexOf("analysis");
    if (analysisIdx !== -1 && pathParts[analysisIdx + 1]) {
      screeningId = pathParts[analysisIdx + 1];
    }
  }
  const BACKEND_URL = process.env.NEXT_PUBLIC_API_ROOT || (process.env.NEXT_PUBLIC_API_URL ? process.env.NEXT_PUBLIC_API_URL.replace("/api/v1", "") : "http://localhost:8000");
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || `${BACKEND_URL}/api/v1`;

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user || !screeningId) return;

    const fetchScreening = async () => {
      try {
        const token = getToken();
        const res = await fetch(`${API_BASE_URL}/screenings/${screeningId}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          const detail = await res.json();
          setData(detail);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setFetching(false);
      }
    };

    fetchScreening();
  }, [user, screeningId]);

  const handleSliderMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sliderRef.current) return;
    
    const rect = sliderRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const offset = clientX - rect.left;
    const percentage = Math.min(Math.max((offset / rect.width) * 100, 0), 100);
    setSliderPosition(percentage);
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
      <main className="flex-1 p-8 overflow-y-auto max-w-6xl mx-auto">
        {fetching ? (
          <div className="flex justify-center items-center h-[70vh]">
            <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : !data ? (
          <div className="p-8 rounded-xl bg-card border border-border text-center text-red-300">
            Failed to locate screening file.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Link href={`/analysis/${data.id}`} className="w-8 h-8 rounded border border-border flex items-center justify-center text-muted-foreground hover:text-white transition-colors">
                <ArrowLeft size={16} />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Explainable AI Sandbox</h1>
                <p className="text-xs text-muted-foreground mt-1">
                  Active Patient: <span className="font-bold text-white">{data.patient.name}</span> • RHI score: {data.results.rhi}
                </p>
              </div>
            </div>

            {/* Slider Comparison Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              
              {/* Left 2 Columns: Image Slider */}
              <div className="md:col-span-2 space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-sm uppercase font-mono tracking-wider flex items-center gap-2 mb-4">
                    <Layers size={16} className="text-secondary animate-pulse" /> Interactive GradCAM Heatmap Slider
                  </h3>

                  {/* Interactive Split Slider */}
                  <div 
                    ref={sliderRef}
                    onMouseMove={handleSliderMove}
                    onTouchMove={handleSliderMove}
                    className="relative w-full aspect-square rounded-lg border border-border overflow-hidden bg-black select-none cursor-ew-resize"
                  >
                    {/* Underlying Heatmap Image (GradCAM) */}
                    <img 
                      src={`${BACKEND_URL}${data.heatmap_image_url}`} 
                      alt="GradCAM Heatmap Overlay" 
                      className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                    />

                    {/* Clipping Overlayer (Original Image) */}
                    <div 
                      className="absolute inset-y-0 left-0 right-0 overflow-hidden pointer-events-none"
                      style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
                    >
                      <img 
                        src={`${BACKEND_URL}${data.image_url}`} 
                        alt="Original Fundus Scan" 
                        className="absolute inset-0 w-full h-full object-contain"
                        style={{ width: sliderRef.current?.getBoundingClientRect().width }}
                      />
                    </div>

                    {/* Draggable Divider Bar */}
                    <div 
                      className="absolute inset-y-0 w-1 bg-secondary pointer-events-none shadow-[0_0_10px_rgba(6,182,212,0.8)]"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-secondary text-slate-900 font-extrabold flex items-center justify-center text-xs shadow-md shadow-black/80">
                        ↔
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground font-mono">
                    <span>← DRAG LEFT: Raw Scan</span>
                    <span>DRAG RIGHT: AI Heatmap →</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Guidance */}
              <div className="space-y-6 md:col-span-1">
                {/* Clinical Interpretation Guide */}
                <div className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="font-bold text-white text-xs uppercase font-mono tracking-widest flex items-center gap-1.5 mb-4">
                    <Compass size={16} className="text-secondary" /> Heatmap Guidance
                  </h3>

                  <div className="space-y-4 text-xs text-muted-foreground leading-relaxed">
                    <div className="p-3 rounded bg-slate-900 border border-border">
                      <h4 className="font-bold text-white mb-1">What is GradCAM?</h4>
                      <p>Gradient-weighted Class Activation Mapping computes localized gradients on the final convolution layer of the neural net. This highlights the exact pixels that drove the model's classifications.</p>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-border">
                      <h4 className="font-bold text-white mb-1">Red Hotspots</h4>
                      <p>Represent regions of extreme model activation. In diabetic patients, these usually overlay microaneurysms, hemorrhages, or exudates. In glaucoma screenings, they focus on the optic cup.</p>
                    </div>

                    <div className="p-3 rounded bg-slate-900 border border-border">
                      <h4 className="font-bold text-white mb-1">Blue & Green Contours</h4>
                      <p>Highlight marginal features or background vasculature which the convolutional kernels marked as low-risk landmarks.</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-border flex gap-3 text-xs text-muted-foreground leading-relaxed">
                  <Info size={18} className="text-secondary shrink-0" />
                  <p>
                    Ensure your browser is scaled to 100% for precise pixel matching on the interactive slider.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
