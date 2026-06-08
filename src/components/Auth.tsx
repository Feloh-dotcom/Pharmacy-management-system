/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { 
  LogIn, Key, Mail, UserPlus, ShieldAlert, CheckCircle, 
  RefreshCw, Globe, Heart, Sparkles, Eye, EyeOff, Phone, Fingerprint 
} from "lucide-react";
import { UserRole, SystemSettings } from "../types";

interface AuthProps {
  onLoginSuccess: (user: { id: string; name: string; email: string; role: UserRole; avatarUrl?: string }) => void;
  settings: SystemSettings | null;
}

export default function Auth({ onLoginSuccess, settings }: AuthProps) {
  const [lang, setLang] = useState<"en" | "sw">("en");
  const [isRegister, setIsRegister] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  
  // Form values
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [nationalId, setNationalId] = useState("");
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem("pharmacy_remember_me") === "true";
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Prefill email if rememberMe was activated previously
  useEffect(() => {
    const savedEmail = localStorage.getItem("pharmacy_remember_email");
    if (savedEmail && rememberMe) {
      setEmail(savedEmail);
    }
  }, [rememberMe]);

  // Handle password strength scoring
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "None", colorText: "text-slate-400", colorBg: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[a-z]/.test(pass) && /[A-Z]/.test(pass)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(pass)) score++;

    if (score <= 1) {
      return { score, label: lang === "en" ? "Weak" : "Dhaifu", colorText: "text-rose-500", colorBg: "bg-rose-500" };
    }
    if (score === 2) {
      return { score, label: lang === "en" ? "Medium" : "Wastani", colorText: "text-amber-500", colorBg: "bg-amber-500" };
    }
    if (score === 3) {
      return { score, label: lang === "en" ? "Strong" : "Imara", colorText: "text-blue-500", colorBg: "bg-[#2563EB]" };
    }
    return { score, label: lang === "en" ? "Excellent" : "Bora Zaidi", colorText: "text-[#10B981]", colorBg: "bg-[#10B981]" };
  };

  const strengthInfo = getPasswordStrength(password);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setInfo(null);
    setLoading(true);

    if (isForgot) {
      if (!email) {
        setError(lang === "en" ? "Please enter your email address." : "Tafadhali weka barua pepe yako.");
        setLoading(false);
        return;
      }
      if (password !== confirmPassword) {
        setError(
          lang === "en"
            ? "Validation Rejected: The passwords provided do not match."
            : "Sera ya Usalama: Nenosiri na uthibitisho wa nenosiri hazilingani."
        );
        setLoading(false);
        return;
      }

      // Store the requested password temporarily in localStorage so that when they click the reset link, 
      // they don't have to re-type it on /reset-password, though they can if they want.
      if (password) {
        localStorage.setItem("halomedical_pending_reset_pass", password);
      }

      try {
        const response = await fetch("/api/auth/forgot-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email })
        });
        
        let data: any = {};
        try {
          data = await response.json();
        } catch (_) {}
        
        if (response.ok) {
          setInfo(
            lang === "en" 
              ? "Password reset link sent to your email" 
              : "Kiungo cha kuweka upya nenosiri kimetumwa kwenye barua pepe yako"
          );
        } else {
          setError(data.error || (lang === "en" ? "Unable to send reset email" : "Imeshindikana kutuma barua pepe ya kuweka upya"));
        }
      } catch (err: any) {
        console.error("[Forgot password request error]", err);
        setError(lang === "en" ? "Unable to send reset email" : "Imeshindikana kutuma barua pepe ya kuweka upya");
      } finally {
        setLoading(false);
      }
      return;
    }

    if (isRegister) {
      if (!name || !email || !password || !confirmPassword || !phone || !nationalId) {
        setError(
          lang === "en" 
            ? "Please supply all required clinical registration fields." 
            : "Tafadhali jaza sifa zote zinazohitajika kusajili."
        );
        setLoading(false);
        return;
      }

      if (password !== confirmPassword) {
        setError(
          lang === "en"
            ? "Validation Rejected: The passwords provided do not match."
            : "Sera ya Usalama: Nenosiri na uthibitisho wa nenosiri hazilingani."
        );
        setLoading(false);
        return;
      }

      // Dynamic Security settings from configuration parameters
      const minLength = settings?.security?.passwordMinLength || 8;
      const requireSpecial = settings?.security?.requireSpecialChar !== undefined ? settings?.security?.requireSpecialChar : true;

      if (password.length < minLength) {
        setError(
          lang === "en"
            ? `Security Policy Blocked: Password must be at least ${minLength} characters.`
            : `Sera ya Usalama: Nenosiri lazima liwe na angalau herufi ${minLength}.`
        );
        setLoading(false);
        return;
      }

      if (requireSpecial) {
        const specialCharRegex = /[!@#$%^&*(),.?":{}|<>]/;
        if (!specialCharRegex.test(password)) {
          setError(
            lang === "en"
              ? "Security Policy Blocked: Password must contain at least one special character structural sign."
              : "Sera ya Usalama: Nenosiri lazima liwe na herufi maalum (k.m., @, #, $, !)."
          );
          setLoading(false);
          return;
        }
      }

      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, phone, nationalId })
        });
        let data: any = {};
        if (response.headers.get("Content-Type")?.includes("json")) {
          data = await response.json();
        }
        
        if (!response.ok) {
          setError(data.error || (lang === "en" ? "Registration failed. Please consult your administrator." : "Usajili umeshindwa. Tafadhali wasiliana na msimamizi."));
        } else {
          setInfo(
            lang === "en"
              ? "Credentials successfully generated! A standard User security role has been assigned. Please sign in below."
              : "Akaunti imehifadhiwa kikamilifu! Jukumu thabiti la User limepewa. Tafadhali ingia sasa."
          );
          setIsRegister(false);
          setConfirmPassword("");
          setPhone("");
          setNationalId("");
        }
      } catch (err: any) {
        setError(err.message || (lang === "en" ? "Failed to establish a network connection with the authentication node." : "Imeshindwa kuunganisha mtawanyo wa uthibitishaji."));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Active Login
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
            ? "Authentication Rejected: Invalid clinical passcode or security email value specified." 
            : "Uthibitishaji Umekataliwa: Barua pepe au nenosiri lisilo sahihi.")
        );
      } else {
        // Save state preferences for future logins
        if (rememberMe) {
          localStorage.setItem("pharmacy_remember_email", email);
          localStorage.setItem("pharmacy_remember_me", "true");
        } else {
          localStorage.removeItem("pharmacy_remember_email");
          localStorage.setItem("pharmacy_remember_me", "false");
        }
        onLoginSuccess(data.user);
      }
    } catch (err) {
      setError(
        lang === "en" 
          ? "Workspace network timeout. Unable to communicate with the central database server." 
          : "Muda wa mtandao umeisha. Imeshindwa kuungana na seva kuu ya mfumo."
      );
    } finally {
      setLoading(false);
    }
  };

  const translations = {
    en: {
      logo: "PharmacySync",
      securityGateIndicator: "Authorized Clinical Access",
      signInPrompt: "Access your clinical workspace and secure workflow tools",
      registerPrompt: "Generate a new secure login token for active pharmacy staff",
      forgotPrompt: "Enter your email address and new password below to reset your password",
      emailLabel: "Email Address",
      phoneLabel: "Phone Number",
      nationalIdLabel: "National ID / Employee No",
      passLabel: "Password",
      nameLabel: "Your Professional Name",
      confirmPassLabel: "Confirm Password",
      rememberMe: "Remember me",
      forgotPass: "Forgot password?",
      backToLogin: "Back to portal sign-in",
      noAccount: "Don't have an account?",
      haveAccount: "Already possess active credentials?",
      registerNow: "Sign up here",
      loginNow: "Log in here",
      signInBtn: "Sign In",
      registerBtn: "Create Account",
      sendOtpBtn: "Send Password Reset Link",
      passwordMismatch: "The passwords entered do not align",
      passwordMatch: "System Passwords aligned successfully"
    },
    sw: {
      logo: "PharmacySync",
      securityGateIndicator: "Udhibiti wa Kituo Cha Kazi",
      signInPrompt: "Ingiza sifa zako zilizoidhinishwa ili kufungua mfumo",
      registerPrompt: "Tengeneza kitambulisho kipya cha usalama kwa mfanyakazi",
      forgotPrompt: "Andika barua pepe yako ili kurudisha nenosiri lililosahaulika",
      emailLabel: "Barua Pepe ya Kazi",
      phoneLabel: "Nambari ya Simu",
      nationalIdLabel: "Nambari ya Kitambulisho",
      passLabel: "Nenosiri la Usalama",
      nameLabel: "Jina Lako Kamili la Kazi",
      confirmPassLabel: "Thibitisha Nenosiri",
      rememberMe: "Nikumbuke kwenye kifaa hiki",
      forgotPass: "Umesahau nenosiri?",
      backToLogin: "Rudi kwenye ukurasa wa kuingia",
      noAccount: "Unataka kusajili akaunti mpya?",
      haveAccount: "Tayari umeandikisha akaunti yako?",
      registerNow: "Jisajili hapa sasa",
      loginNow: "Ingia hapa sasa",
      signInBtn: "Ingia kwenye Mfumo",
      registerBtn: "Kamilisha Usajili wa Usalama",
      sendOtpBtn: "Tuma Maelekezo ya Kuokoa",
      passwordMismatch: "Mihuri ya nenosiri hailingani",
      passwordMatch: "Nenosiri linalingana kikamilifu"
    }
  };

  const activeTrans = translations[lang];

  return (
    <div 
      id="auth-root" 
      className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none font-sans"
    >
      {/* Soft visual healthcare gradients */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#2563EB]/5 rounded-full blur-3xl pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none translate-x-1/3 translate-y-1/3" />

      {/* Floating high-contrast language selector */}
      <div className="absolute top-6 right-6 z-10">
        <div className="flex bg-white shadow-sm border border-[#E2E8F0] rounded-full p-1 items-center space-x-1">
          <button
            type="button"
            onClick={() => {
              setLang("en");
              setError(null);
              setInfo(null);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              lang === "en" 
                ? "bg-[#2563EB] text-white shadow-sm" 
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => {
              setLang("sw");
              setError(null);
              setInfo(null);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer ${
              lang === "sw" 
                ? "bg-[#2563EB] text-white shadow-sm" 
                : "text-[#64748B] hover:text-[#0F172A]"
            }`}
          >
            SW
          </button>
        </div>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Healthcare Inspired Authentication Card */}
        <div className="bg-white rounded-3xl border border-[#E2E8F0] shadow-xl shadow-slate-100/70 p-8 sm:p-10 flex flex-col space-y-6">
          
          {/* Main header block */}
          <div className="flex flex-col items-center text-center">
            {/* PharmacySync Icon Emblem */}
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-sm mb-4">
              <Heart className="w-7 h-7 text-[#2563EB]" fill="#2563EB" fillOpacity={0.15} />
            </div>

            <h1 className="text-2xl font-extrabold tracking-tight text-[#0F172A] flex items-center gap-1">
              {settings?.general?.pharmacyName || activeTrans.logo}
            </h1>

            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 px-3 py-0.5 bg-slate-50 border border-slate-100 rounded-full">
              {activeTrans.securityGateIndicator}
            </span>

            <p className="text-xs text-[#64748B] mt-3 font-semibold leading-relaxed max-w-[280px]">
              {isForgot 
                ? activeTrans.forgotPrompt 
                : isRegister 
                  ? activeTrans.registerPrompt 
                  : activeTrans.signInPrompt}
            </p>
          </div>

          {/* Feedback banners */}
          {error && (
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-start space-x-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <ShieldAlert className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <p className="text-xs text-rose-800 font-semibold leading-relaxed">{error}</p>
            </div>
          )}

          {info && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-start space-x-3 animate-in fade-in slide-in-from-top-1 duration-200">
              <CheckCircle className="w-5 h-5 text-[#10B981] shrink-0 mt-0.5" />
              <p className="text-xs text-[#065F46] font-bold leading-relaxed">{info}</p>
            </div>
          )}

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Professional Name (Registration state) */}
            {isRegister && !isForgot && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                  {activeTrans.nameLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Sparkles className="h-4.5 w-4.5 text-[#64748B]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={lang === "en" ? "e.g. Dr. Sarah Jenkins" : "k.m. Dr. Sarah Jenkins"}
                    className="block w-full h-12 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                {activeTrans.emailLabel} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4.5 w-4.5 text-[#64748B]" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. healthcare@workspace.com"
                  className="block w-full h-12 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                />
              </div>
            </div>

            {/* Phone Number (Registration state) */}
            {isRegister && !isForgot && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                  {activeTrans.phoneLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Phone className="h-4.5 w-4.5 text-[#64748B]" />
                  </div>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254712345678"
                    className="block w-full h-12 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                  />
                </div>
              </div>
            )}

            {/* National ID / Employee No (Registration state) */}
            {isRegister && !isForgot && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                  {activeTrans.nationalIdLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Fingerprint className="h-4.5 w-4.5 text-[#64748B]" />
                  </div>
                  <input
                    type="text"
                    required
                    value={nationalId}
                    onChange={(e) => setNationalId(e.target.value)}
                    placeholder="e.g. ID-8890211"
                    className="block w-full h-12 pl-10 pr-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                  />
                </div>
              </div>
            )}

            {/* Password input */}
            {(true) && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                  {isForgot ? (lang === "en" ? "New Password" : "Nenosiri Jipya") : activeTrans.passLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="h-4.5 w-4.5 text-[#64748B]" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full h-12 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#0F172A] focus:outline-none cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength progress indicators during registration/forgot */}
                {(isRegister || isForgot) && password.length > 0 && (
                  <div className="mt-2 space-y-1 pb-1 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="text-slate-400 uppercase tracking-wider">Passcode Security Strength</span>
                      <span className={strengthInfo.colorText}>{strengthInfo.label}</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1.5 h-1">
                      <div className={`rounded-full transition-all duration-300 ${strengthInfo.score >= 1 ? strengthInfo.colorBg : "bg-slate-200"}`} />
                      <div className={`rounded-full transition-all duration-300 ${strengthInfo.score >= 2 ? strengthInfo.colorBg : "bg-slate-200"}`} />
                      <div className={`rounded-full transition-all duration-300 ${strengthInfo.score >= 3 ? strengthInfo.colorBg : "bg-slate-200"}`} />
                      <div className={`rounded-full transition-all duration-300 ${strengthInfo.score >= 4 ? strengthInfo.colorBg : "bg-slate-200"}`} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Password confirmation for registering / forgot */}
            {(isRegister || isForgot) && (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
                  {isForgot ? (lang === "en" ? "Confirm Password" : "Thibitisha Nenosiri") : activeTrans.confirmPassLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Key className="h-4.5 w-4.5 text-[#64748B]" />
                  </div>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="block w-full h-12 pl-10 pr-10 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] placeholder-[#64748B]/50 focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
                  />
                  <button
                    type="button"
                    disabled={loading}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#64748B] hover:text-[#0F172A] focus:outline-none cursor-pointer"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                
                {confirmPassword.length > 0 && (
                  <div className="mt-1.5 flex items-center space-x-1.5 px-0.5 animate-in fade-in duration-150">
                    <div className={`w-1.5 h-1.5 rounded-full ${password === confirmPassword ? "bg-[#10B981]" : "bg-rose-500"}`} />
                    <span className={`text-[11px] font-bold tracking-wide ${password === confirmPassword ? "text-[#10B981]" : "text-rose-500"}`}>
                      {password === confirmPassword ? activeTrans.passwordMatch : activeTrans.passwordMismatch}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Remember me & Forgot Password block */}
            {!isForgot && !isRegister && (
              <div className="flex items-center justify-between text-xs px-0.5 py-1">
                <label className="flex items-center space-x-2 text-[#64748B] font-semibold cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]/20 cursor-pointer"
                  />
                  <span>{activeTrans.rememberMe}</span>
                </label>
                
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsForgot(true);
                    setIsRegister(false);
                    setError(null);
                    setInfo(null);
                    setConfirmPassword("");
                  }}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline transition cursor-pointer"
                >
                  {activeTrans.forgotPass}
                </button>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading || (isRegister && password !== confirmPassword)}
                className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] focus:ring-4 focus:ring-[#2563EB]/15 text-white font-bold text-sm rounded-xl shadow-md transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer"
              >
                {loading ? (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                ) : isRegister ? (
                  <UserPlus className="w-5 h-5" />
                ) : (
                  <LogIn className="w-5 h-5" />
                )}
                <span>
                  {loading 
                    ? (lang === "en" ? "Processing..." : "Inachakata...") 
                    : isForgot 
                      ? (lang === "en" ? "Submit" : "Tuma") 
                      : isRegister 
                        ? activeTrans.registerBtn 
                        : activeTrans.signInBtn}
                </span>
              </button>
            </div>

            {/* Forgot password switch back */}
            {isForgot && (
              <div className="flex items-center justify-center text-xs pt-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setIsForgot(false);
                    setIsRegister(false);
                    setError(null);
                    setInfo(null);
                    setConfirmPassword("");
                  }}
                  className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline transition cursor-pointer flex items-center gap-1 bg-none border-none"
                >
                  <span>&larr;</span> {activeTrans.backToLogin}
                </button>
              </div>
            )}

            {/* Toggle Switch between login/register */}
            {!isForgot && (
              <div className="text-center text-xs text-[#64748B] font-medium pt-3 px-1 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-1 select-none">
                {isRegister ? (
                  <>
                    <span>{activeTrans.haveAccount}</span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setIsRegister(false);
                        setError(null);
                        setInfo(null);
                        setConfirmPassword("");
                      }}
                      className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline transition cursor-pointer bg-none border-none"
                    >
                      {activeTrans.loginNow}
                    </button>
                  </>
                ) : (
                  <>
                    <span>{activeTrans.noAccount}</span>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => {
                        setIsRegister(true);
                        setError(null);
                        setInfo(null);
                        setConfirmPassword("");
                      }}
                      className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline transition cursor-pointer bg-none border-none"
                    >
                      {activeTrans.registerNow}
                    </button>
                  </>
                )}
              </div>
            )}

          </form>
        </div>
      </div>
    </div>
  );
}
