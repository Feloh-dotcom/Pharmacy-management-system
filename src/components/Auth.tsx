/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from "react";
import { 
  LogIn, Key, Mail, UserPlus, ShieldAlert, CheckCircle, 
  RefreshCw, Globe, X, Heart, Shield, Landmark, Sparkles,
  Eye, EyeOff
} from "lucide-react";
import { UserRole, SystemSettings } from "../types";

const bgImage = "/src/assets/images/pharmacy_background_1779486266310.png";

interface AuthProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: UserRole; avatarUrl?: string }) => void;
  settings: SystemSettings | null;
}

export default function Auth({ onLoginSuccess, settings }: AuthProps) {
  const [lang, setLang] = useState<"en" | "sw">("en");
  const [showFormModal, setShowFormModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  // Form values
  const [email, setEmail] = useState("budionosiregar@gmail.com");
  const [password, setPassword] = useState("password123");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [role, setRole] = useState<UserRole>(UserRole.ADMIN);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions
    setError(null);
    setInfo(null);
    setLoading(true);

    if (isForgot) {
      setTimeout(() => {
        setInfo(
          lang === "en" 
            ? "OTP recovery code transmitted to your email! (Simulator)" 
            : "Nambari ya kuokoa OTP imetumwa kwenye barua pepe yako! (Kielelezo)"
        );
        setLoading(false);
        setIsForgot(false);
      }, 1000);
      return;
    }

    if (isRegister) {
      if (!name || !email || !password || !confirmPassword) {
        setError(
          lang === "en" 
            ? "All fields are required to register" 
            : "Mapelelezo yote yanahitajika ili kujiandikisha"
        );
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError(
          lang === "en"
            ? "Validation Refused: Password and Confirm Password do not match."
            : "Sera ya Usalama: Nenosiri na Thibitisho la nenosiri hailingani na hili."
        );
        setLoading(false);
        return;
      }

      // Dynamic Security & Access Control settings
      const minLength = settings?.security?.passwordMinLength || 8;
      const requireSpecial = settings?.security?.requireSpecialChar !== undefined ? settings?.security?.requireSpecialChar : true;

      if (password.length < minLength) {
        setError(
          lang === "en"
            ? `Security Policy Refused: Password must be at least ${minLength} characters.`
            : `Sera ya Usalama: Nenosiri lazima liwe na angalau herufi ${minLength} kujiandikisha.`
        );
        setLoading(false);
        return;
      }

      if (requireSpecial) {
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(password)) {
          setError(
            lang === "en"
              ? "Security Policy Refused: Password must contain at least one special character."
              : "Sera ya Usalama: Nenosiri lazima liwe na angalau herufi moja maalum (k.m. @, #, $, Pesa)."
          );
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password })
        });
        let data: any = {};
        if (response.headers.get("Content-Type")?.includes("json")) {
          data = await response.json();
        }
        
        if (!response.ok) {
          setError(data.error || (lang === "en" ? "Registration failed. Try again." : "Usajili umeshindwa. Jaribu tena."));
        } else {
          setInfo(
            lang === "en"
              ? "Registration successful! You have been auto-assigned a secure User role. Log in now."
              : "Usajili umefaulu! Umepewa jukumu la usalama la User. Ingia sasa."
          );
          setIsRegister(false);
          setConfirmPassword("");
        }
      } catch (err) {
        setError(lang === "en" ? "Unable to connect to register server." : "Imeshindwa kuunganisha kwenye seva ya usajili.");
      } finally {
        setLoading(false);
      }
      return;
    }

    // Live Login using server API
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      let data: any = {};
      if (response.headers.get("Content-Type")?.includes("json")) {
        data = await response.json();
      }
      
      if (!response.ok) {
        setError(
          data.error || 
          (lang === "en" 
            ? "Authentication failed. Validate your credentials" 
            : "Uthibitishaji umeshindwa. Thibitisha sifa zako")
        );
      } else {
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(
        lang === "en" 
          ? "Unable to connect to login server. Retrying..." 
          : "Imeshindwa kuunganisha kwenye seva ya kuingia. Inajaribu tena..."
      );
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    en: {
      logo: "PHARMACY SYSTEM",
      title: "Pharmacy Management System",
      welcome: "Welcome to the Pharmacy Management Platform!",
      desc: "Manage medicines, customers, suppliers, payments, and reports with ease and security.",
      register: "Register",
      login: "Login",
      aboutTitle: "About the System Platform",
      aboutDesc: "Designed with state-of-the-art diagnostic compliance, full audit logging mechanisms, barcode integration pathways, and end-to-end stock optimization schemas.",
      back: "Go Back",
      credentialsHeader: "Pharmacy Access Control",
      emailLabel: "Enter Your Email",
      passLabel: "Enter Password",
      nameLabel: "Full Name",
      roleLabel: "Authorized Access Level",
      forgotPass: "Forgot Password?",
      rememberPass: "Remember Pass?",
      alreadyReg: "Already Registered?",
      regAcct: "Register Account",
      authBtn: "Log in",
      sendOtp: "Send OTP Recovery Link",
      completeOnb: "Complete Security Onboarding",
      confirmPassLabel: "Confirm Password",
      passwordMismatch: "Passwords do not match",
      passwordMatch: "Passwords matched successfully"
    },
    sw: {
      logo: "MFUMO WA FAMASI",
      title: "Mfumo wa Usimamizi wa Famasi",
      welcome: "Karibu kwenye Jukwaa la Usimamizi wa Famasi!",
      desc: "Dhibiti dawa, wateja, wasambazaji, malipo, na ripoti kwa urahisi na usalama.",
      register: "Jisajili",
      login: "Ingia",
      aboutTitle: "Kuhusu Mfumo wa Famasi",
      aboutDesc: "Iliyoundwa na utii wa kisasa wa utambuzi, njia za usajili kamili wa ukaguzi, mifumo ya ujumuishaji wa barcode, na miradi ya uboreshaji wa hesabu ya dawa.",
      back: "Rudi Nyuma",
      credentialsHeader: "Udhibiti wa Kituo cha Kazi",
      emailLabel: "Barua Pepe ya Kazi",
      passLabel: "Nenosiri la Usalama",
      nameLabel: "Majina Kamili ya Kisheria",
      roleLabel: "Kiwango cha Ufikiaji Kilichoidhinishwa",
      forgotPass: "Umesahau Nenosiri?",
      rememberPass: "Unakumbuka Nenosiri?",
      alreadyReg: "Tayari Umerasajiliwa?",
      regAcct: "Sajili Akaunti",
      authBtn: "Ingia",
      sendOtp: "Tuma Kiungo cha OTP",
      completeOnb: "Kamilisha Usajili wa Usalama",
      confirmPassLabel: "Thibitisha Nenosiri",
      passwordMismatch: "Nenosiri hailingani",
      passwordMatch: "Nenosiri linalingana kikamilifu"
    }
  };

  const activeTrans = translations[lang];

  return (
    <div 
      id="auth-root" 
      className="min-h-screen relative overflow-x-hidden select-none font-sans flex flex-col justify-between"
      style={{
        backgroundImage: `linear-gradient(rgba(15, 23, 42, 0.45), rgba(15, 23, 42, 0.75)), url(${bgImage})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      {/* 1. Header Navigation Bar inside landing layout */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between z-20 relative">
        <div className="flex items-center space-x-2">
          {settings?.general?.logoUrl ? (
            <img 
              src={settings.general.logoUrl} 
              alt="Brand Logo" 
              className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm border border-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-red-600/95 flex items-center justify-center text-white font-extrabold shadow-sm">
              ✚
            </div>
          )}
          <span className="text-white font-bold tracking-widest text-sm font-sans">
            {settings?.general?.pharmacyName || activeTrans.logo}
          </span>
        </div>

        {/* Language selector badge capsules exactly as image */}
        <div className="flex bg-black/35 backdrop-blur-md border border-white/10 rounded-full px-1.5 py-1 items-center space-x-1">
          <button
            onClick={() => setLang("sw")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
              lang === "sw" 
                ? "bg-red-600 text-white shadow-lg shadow-red-500/25" 
                : "text-white/80 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>Swahili</span>
          </button>
          
          <button
            onClick={() => setLang("en")}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 cursor-pointer ${
              lang === "en" 
                ? "bg-red-600 text-white shadow-lg shadow-red-500/25" 
                : "text-white/80 hover:text-white"
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>English</span>
          </button>
        </div>
      </header>

      {/* 2. Central Promo Messaging */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center z-15 relative py-12">
        <h1 className="text-white font-sans font-black text-4xl sm:text-5xl md:text-6xl tracking-tight max-w-4xl leading-tight drop-shadow-lg">
          {settings?.general?.pharmacyName || activeTrans.title}
        </h1>
        
        <p className="text-base sm:text-lg md:text-xl font-bold text-white mt-5 max-w-2xl drop-shadow">
          {settings?.general?.pharmacyName ? `Welcome to the ${settings.general.pharmacyName} Hub` : activeTrans.welcome}
        </p>

        <p className="text-xs sm:text-sm text-slate-200 font-medium max-w-xl leading-relaxed mt-2.5 drop-shadow-sm">
          {settings?.general?.address ? `Authorized clinical personnel gateway for location at ${settings.general.address}` : activeTrans.desc}
        </p>

        {/* Double customized orange-red pill action buttons as screenshot */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <button
            onClick={() => {
              setIsRegister(true);
              setIsForgot(false);
              setShowFormModal(true);
            }}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 hover:scale-103 font-sans font-bold text-white text-xs sm:text-sm py-3 px-7 rounded-full transition-all duration-200 shadow-xl shadow-red-500/10 cursor-pointer border-none"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ {activeTrans.register}</span>
          </button>

          <button
            onClick={() => {
              setIsRegister(false);
              setIsForgot(false);
              setShowFormModal(true);
            }}
            className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 hover:scale-103 font-sans font-bold text-white text-xs sm:text-sm py-3 px-7 rounded-full transition-all duration-200 shadow-xl shadow-red-500/10 cursor-pointer border-none"
          >
            <LogIn className="w-4 h-4" />
            <span>➡ {activeTrans.login}</span>
          </button>
        </div>
      </main>

      {/* 3. Sliding "About the System" container coming up from the bottom */}
      <section className="w-full bg-slate-50/95 backdrop-blur-md rounded-t-[40px] border-t border-white/20 px-6 sm:px-12 py-10 z-10 shrink-0 relative shadow-2xl">
        <div className="max-w-6xl mx-auto text-center space-y-8">
          <div className="space-y-2">
            <h2 className="text-red-600 font-sans font-black uppercase text-[11px] tracking-widest">
              {activeTrans.aboutTitle}
            </h2>
            <p className="text-xs sm:text-[13px] text-slate-500 font-semibold max-w-3xl mx-auto leading-relaxed">
              {activeTrans.aboutDesc}
            </p>
          </div>

          {/* Quick value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-4 text-left">
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">RBAC Security</h4>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-normal">Fully auditable permission roles ensuring legal compliance & security logs.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Patient Welfare</h4>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-normal">Smart tracking of prescription limits, customer profiles, and loyalty tiers.</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex items-start space-x-4">
              <div className="p-3 bg-red-50 rounded-xl text-red-600 border border-red-100">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Ledger Accuracy</h4>
                <p className="text-[11px] text-slate-400 mt-1 font-semibold leading-normal">Comprehensive sales point checkout channels and real-time ledger accounting.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Credentials form Modal Overlay when Login/Register is triggered */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all animate-in fade-in duration-250">
          <div className="w-full max-w-md bg-slate-950 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-2xl shadow-2xl relative z-50 animate-in zoom-in-95 duration-200 flex flex-col">
            
            {/* Modal Exit */}
            <button
              onClick={() => setShowFormModal(false)}
              className="absolute top-5 right-5 p-1.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-white transition duration-150 cursor-pointer"
              title={activeTrans.back}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Emblem Form Header */}
            <div className="flex flex-col items-center mb-6">
              <div className="w-11 h-11 rounded-2xl bg-red-600/15 border border-red-500/25 flex items-center justify-center text-xl shadow-inner mb-3">
                💊
              </div>
              <h1 className="font-sans font-extrabold text-base text-white tracking-tight">
                {activeTrans.credentialsHeader}
              </h1>
              <p className="text-[10px] text-slate-405 font-mono mt-0.5 uppercase tracking-wider">
                Authorized Access Node
              </p>
            </div>

            {error && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 flex items-start space-x-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-rose-300 font-semibold leading-normal">{error}</p>
              </div>
            )}

            {info && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start space-x-2 mb-4">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-emerald-300 font-semibold leading-normal">{info}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Legal Name - Register status */}
              {isRegister && !isForgot && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-1">
                    {activeTrans.nameLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Dr. Budiono Siregar"
                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-1">
                  {activeTrans.emailLabel}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 select-none pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="budionosiregar@gmail.com"
                    className="w-full pl-10.5 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                  />
                </div>
              </div>

              {/* Password */}
              {!isForgot && (
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-1">
                    {activeTrans.passLabel}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 select-none pointer-events-none" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10.5 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-all duration-150 p-1 rounded-md focus:outline-none cursor-pointer select-none"
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Confirm Password */}
              {isRegister && !isForgot && (
                <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-1">
                    {activeTrans.confirmPassLabel}
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 select-none pointer-events-none" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10.5 pr-10 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500/50 transition-all duration-200"
                    />
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-all duration-150 p-1 rounded-md focus:outline-none cursor-pointer select-none"
                      title={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  
                  {confirmPassword.length > 0 && (
                    <div className="mt-2 flex items-center space-x-1.5 px-1 animate-in fade-in duration-205">
                      <div className={`w-1.5 h-1.5 rounded-full ${password === confirmPassword ? "bg-emerald-500" : "bg-rose-500"}`} />
                      <span className={`text-[10px] font-bold tracking-wide ${password === confirmPassword ? "text-emerald-400" : "text-rose-400"}`}>
                        {password === confirmPassword ? activeTrans.passwordMatch : activeTrans.passwordMismatch}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Options & Forgot links */}
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 px-1 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsForgot(!isForgot);
                    setIsRegister(false);
                    setError(null);
                    setInfo(null);
                    setConfirmPassword("");
                  }}
                  className="hover:text-red-400 hover:underline cursor-pointer disabled:opacity-40"
                >
                  {isForgot ? activeTrans.rememberPass : activeTrans.forgotPass}
                </button>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsRegister(!isRegister);
                    setIsForgot(false);
                    setError(null);
                    setInfo(null);
                    setConfirmPassword("");
                  }}
                  className="text-red-400 hover:text-red-300 hover:underline inline-flex items-center cursor-pointer disabled:opacity-40"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  <span>{isRegister ? activeTrans.alreadyReg : activeTrans.regAcct}</span>
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-500/20 transition-all duration-200 mt-6 flex items-center justify-center space-x-2 disabled:opacity-40 border-none cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <LogIn className="w-4 h-4" />
                )}
                <span>
                  {isForgot 
                    ? activeTrans.sendOtp 
                    : isRegister 
                      ? activeTrans.completeOnb 
                      : activeTrans.authBtn}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
