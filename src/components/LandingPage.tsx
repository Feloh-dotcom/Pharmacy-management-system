import { ArrowRight, Lock, HeartPulse } from "lucide-react";
import { SystemSettings } from "../types";
// @ts-ignore
import pharmacyBackground from "../assets/images/pharmacy_background_1779486266310.png";

interface LandingPageProps {
  onLoginClick: () => void;
  settings: SystemSettings | null;
}

export default function LandingPage({ onLoginClick, settings }: LandingPageProps) {
  const pharmacyName = settings?.general?.pharmacyName || "Halomedical";

  return (
    <div className="relative min-h-screen bg-slate-100 text-slate-800 font-sans flex flex-col justify-between overflow-hidden select-none">
      {/* Cinematic Background Image Layer with a soft blur built-in */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-102 pointer-events-none blur-[4px]"
        style={{ 
          backgroundImage: `url(${pharmacyBackground})`,
        }}
      />
      
      {/* Dual frosted-glass light gloss overlays to achieve the "somehow white then blur image" design with supreme contrast */}
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[6px] pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-t from-white/95 via-white/40 to-white/90 pointer-events-none" />

      {/* 1. Header */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900/5 border border-slate-900/10 flex items-center justify-center text-slate-800 shadow-sm">
            <HeartPulse className="w-5 h-5 text-slate-800" />
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-slate-900 uppercase">{pharmacyName}</span>
            <span className="block text-[8px] text-slate-500 font-mono tracking-widest font-bold uppercase font-semibold">Workstation ERP</span>
          </div>
        </div>

        <button
          onClick={onLoginClick}
          id="btn_landing_header_login"
          className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all duration-200 flex items-center gap-2 cursor-pointer shadow-sm active:scale-95"
        >
          <Lock className="w-3 h-3 text-slate-200" />
          <span>Workstation Partner Login</span>
        </button>
      </header>

      {/* 2. Focused Centerpiece Hero - Clean, light glass, minimal & highly responsive */}
      <main className="relative z-10 flex-grow flex items-center justify-center px-4 sm:px-6 py-12">
        <div className="w-full max-w-xl text-center space-y-8 bg-white/60 backdrop-blur-xl rounded-3xl p-8 sm:p-12 border border-white/40 shadow-xl shadow-slate-250/20">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950/5 border border-slate-950/10 text-slate-600 text-[10px] font-bold tracking-wider uppercase mx-auto">
              <span>Gateway Node Fully Secured</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Clinical Supply & <br />
              <span className="text-slate-700">
                Dispensing Ecosystem
              </span>
            </h1>

            <p className="text-xs text-slate-600 max-w-sm mx-auto font-medium leading-relaxed">
              Unified digital control with real-time analytics, secure prescription validation, and intuitive point-of-sale bookkeeping.
            </p>
          </div>

          <div className="pt-2">
            <button
              onClick={onLoginClick}
              id="btn_landing_hero_login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition duration-200 shadow-md hover:scale-[1.01] active:scale-95 cursor-pointer"
            >
              <span>Enter Workstation Control</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </main>

      {/* 3. Responsive Footer */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 sm:px-8 border-t border-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <p className="text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
            &copy; {new Date().getFullYear()} {pharmacyName}. High Security ERP Workspace.
          </p>
        </div>
        
        <div className="flex items-center gap-4 text-[9px] text-slate-500 font-semibold tracking-wider uppercase">
          <a href="#privacy" className="hover:text-slate-800 transition">Security Protocol</a>
          <span className="text-slate-350">&bull;</span>
          <a href="#terms" className="hover:text-slate-800 transition">User Policy</a>
        </div>
      </footer>
    </div>
  );
}

