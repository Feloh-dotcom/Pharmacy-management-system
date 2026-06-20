/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Auth from "./components/Auth";
import Dashboard from "./components/Dashboard";
import Medicines from "./components/Medicines";
import Categories from "./components/Categories";
import Orders from "./components/Orders";
import POS from "./components/POS";
import Customers from "./components/Customers";
import Suppliers from "./components/Suppliers";
import Finance from "./components/Finance";
import Reports from "./components/Reports";
import Settings from "./components/Settings";
import AICopilot from "./components/AICopilot";
import CashRegister from "./components/CashRegister";
import Profile from "./components/Profile";
import ResetPassword from "./components/ResetPassword";
import { UserRole, Medicine, SystemSettings, RolePermissions } from "./types";
import { calculateProfileCompletion } from "./utils";
import { useLanguage } from "./LanguageContext";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
  phone?: string;
  bio?: string;
  nationalId?: string;
  address?: string;
  verificationStatus?: "Pending" | "Verified" | "Rejected" | "Under Review";
  verificationSubmittedAt?: string;
  verificationDetails?: any;
  passwordSetupCompleted?: boolean;
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);

  const setSessionUser = (u: SessionUser | null) => {
    if (u) {
      const roleStr = String((u as any).role || "");
      const lower = roleStr.toLowerCase().trim();
      if (lower === "admin" || lower === "super admin") u.role = UserRole.ADMIN;
      else if (lower === "pharmacist") u.role = UserRole.PHARMACIST;
      else if (lower === "cashier") u.role = UserRole.CASHIER;
      else if (lower === "inventory manager" || lower === "inventory_manager") u.role = UserRole.INVENTORY_MANAGER;
      else if (lower === "supplier") u.role = UserRole.SUPPLIER;
      else if (lower === "customer") u.role = UserRole.CUSTOMER;
      else if (lower === "accountant") u.role = UserRole.ACCOUNTANT;
      else if (lower === "user") u.role = UserRole.USER;
    }
    setUser(u);
  };
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [editFocusMed, setEditFocusMed] = useState<Medicine | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const { language, setLanguage } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Dynamic system branding & customization synchronization
  useEffect(() => {
    if (!settings) return;

    // 1. System Name and Branding as window Title
    if (settings.general?.pharmacyName) {
      document.title = settings.general.pharmacyName;
    }

    // 2. Dynamic favicon mapping
    if (settings.general?.logoUrl) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "shortcut icon";
        document.getElementsByTagName("head")[0].appendChild(link);
      }
      link.href = settings.general.logoUrl;
    }

    // 3. Dynamic language locale trigger
    if (settings.general?.language) {
      const parsedLang = settings.general.language.toUpperCase();
      if (parsedLang && language !== parsedLang) {
        setLanguage(parsedLang);
      }
    }

    // 4. Cached Date Format for formatSafeDateOnly and formatSafeDateTime
    if (settings.general?.dateFormat) {
      localStorage.setItem("halomedical_date_format", settings.general.dateFormat);
    }

    // 5. Dynamic CSS variables overrides (mapping UI layout configs)
    if (settings.appearance) {
      const { themeColors, borderRadius, sidebarStyle, animationSpeed } = settings.appearance;
      const root = document.documentElement;

      // Card rounding radius overrides
      root.style.setProperty("--app-radius", `${borderRadius || 16}px`);

      // Frame animation durations overrides
      if (animationSpeed === "instant") {
        root.style.setProperty("--anim-speed", "0s");
      } else if (animationSpeed === "slow") {
        root.style.setProperty("--anim-speed", "0.6s");
      } else {
        root.style.setProperty("--anim-speed", "0.3s");
      }

      // Base theme color schemes
      let primaryColor = "#0d9488"; // standard teal-600
      let primaryHover = "#0f766e"; // teal-700
      let primaryLight = "#f0fdfa"; // teal-50
      let primaryDark = "#115e59"; // teal-805
      let primaryBorder = "#99f6e4"; // teal-202
      let primaryDarker = "#0d4d44"; // high density solid darker
      let primaryDarkerHover = "#06302a";

      let appBg = "#f8fafc"; // slate-50
      let cardBg = "#ffffff";
      let textPrimary = "#1e293b"; // slate-800
      let textSecondary = "#475569"; // slate-600

      let sidebarBg = "#f8fafc";
      let sidebarBorder = "#e2e8f0";

      if (themeColors === "Slate-Minimalist") {
        primaryColor = "#475569"; // slate-600
        primaryHover = "#334155"; // slate-700
        primaryLight = "#f1f5f9"; // slate-50
        primaryDark = "#1e293b"; // slate-800
        primaryBorder = "#cbd5e1"; // slate-200
        primaryDarker = "#334155";
        primaryDarkerHover = "#1e293b";
      } else if (themeColors === "Warm-Sand") {
        primaryColor = "#b45309"; // amber-700
        primaryHover = "#92400e"; // amber-800
        primaryLight = "#fffbeb"; // amber-50
        primaryDark = "#78350f"; // amber-900
        primaryBorder = "#fde68a"; // amber-200
        primaryDarker = "#78350f";
        primaryDarkerHover = "#451a03";
        appBg = "#fafaf9"; // stone-50
      } else if (themeColors === "Cosmic-Midnight") {
        primaryColor = "#6366f1"; // indigo-500
        primaryHover = "#4f46e5"; // indigo-600
        primaryLight = "rgba(99, 102, 241, 0.15)";
        primaryDark = "#818cf8"; // indigo-400
        primaryBorder = "rgba(99, 102, 241, 0.35)";
        primaryDarker = "#1e1b4b"; // indigo-950
        primaryDarkerHover = "#0f0e26";
        appBg = "#0b0f19"; // dark space
        cardBg = "#111827"; // grey-900
        textPrimary = "#f9fafb"; // grey-50
        textSecondary = "#9ca3af"; // grey-400
        sidebarBg = "#111827";
        sidebarBorder = "rgba(255, 255, 255, 0.15)";
      }

      if (sidebarStyle === "classic-navy") {
        sidebarBg = "#0b1329"; // classic dark navy
        sidebarBorder = "rgba(255, 255, 255, 0.12)";
      } else if (sidebarStyle === "collapsed") {
        // can adjust sidebar classes
      }

      root.style.setProperty("--app-primary", primaryColor);
      root.style.setProperty("--app-primary-hover", primaryHover);
      root.style.setProperty("--app-primary-light", primaryLight);
      root.style.setProperty("--app-primary-dark", primaryDark);
      root.style.setProperty("--app-primary-border", primaryBorder);
      root.style.setProperty("--app-primary-darker", primaryDarker);
      root.style.setProperty("--app-primary-darker-hover", primaryDarkerHover);
      root.style.setProperty("--app-bg", appBg);
      root.style.setProperty("--card-bg", cardBg);
      root.style.setProperty("--text-primary", textPrimary);
      root.style.setProperty("--text-secondary", textSecondary);
      root.style.setProperty("--sidebar-bg", sidebarBg);
      root.style.setProperty("--sidebar-border", sidebarBorder);
    }
  }, [settings, language, setLanguage]);

  // Load settings globally upon system load
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        if (data.rolePermissions) {
          setRolePermissions(data.rolePermissions);
        }
      }
    } catch (e) {
      console.error("Failed to load settings globally in App.tsx:", e);
    }
  };

  // Load full profile live from database
  const fetchLiveProfile = async (email: string) => {
    setProfileLoading(true);
    setProfileError(null);
    try {
      const res = await fetch(`/api/auth/me?email=${encodeURIComponent(email)}`);
      if (res.ok && res.headers.get("Content-Type")?.includes("json")) {
        const data = await res.json();
        if (data.user) {
          setSessionUser(data.user);
          localStorage.setItem("halomedical_session_user", JSON.stringify(data.user));
          
          // Keep currentTab unless they explicitly click to change it
          return data.user;
        }
      } else if (res.status === 404 || res.status === 401) {
        // Task 8: Invalidate/sign out deleted user session automatically
        handleLogout();
        return null;
      } else {
        let errorMsg = "Failed to load live profile.";
        try {
          if (res.headers.get("Content-Type")?.includes("json")) {
            const errData = await res.json();
            errorMsg = errData.error || errorMsg;
          }
        } catch {
          // not JSON or body already parsed
        }
        setProfileError(errorMsg);
      }
    } catch (err) {
      console.error("[Live Profile Sync Exception]", err);
      setProfileError("Could not connect to database profiles.");
    } finally {
      setProfileLoading(false);
    }
    return null;
  };

  // Read session upon startup
  useEffect(() => {
    fetchSettings();
    const storedUser = localStorage.getItem("halomedical_session_user");
    if (storedUser) {
      try {
        const parsed = JSON.parse(storedUser);
        if (parsed && parsed.email && parsed.role) {
          // Fallback option: load from local cache instantly to maintain smooth UI load
          setSessionUser(parsed);
          // Simultaneously pull live, complete data from Supabase DB
          fetchLiveProfile(parsed.email);
        }
      } catch (err) {
        console.error("Invalid session format:", err);
        localStorage.removeItem("halomedical_session_user");
      }
    }
  }, []);

  const handleLoginSuccess = async (sessionUser: SessionUser) => {
    setSessionUser(sessionUser);
    localStorage.setItem("halomedical_session_user", JSON.stringify(sessionUser));
    setCurrentTab("dashboard");
    // Pull full database values with all onboarding attributes in background
    if (sessionUser && sessionUser.email) {
      await fetchLiveProfile(sessionUser.email);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (user) {
      const updatedUser = { ...user, role: newRole };
      setSessionUser(updatedUser);
      localStorage.setItem("halomedical_session_user", JSON.stringify(updatedUser));
    }
  };

  const handleLogout = () => {
    setSessionUser(null);
    localStorage.removeItem("halomedical_session_user");
    setCurrentTab("dashboard");
  };

  const ROLE_ALLOWED_TABS: Record<UserRole, string[]> = {
    [UserRole.SUPER_ADMIN]: [
      "dashboard", "products", "categories", "cash-register", "orders", 
      "sales", "customers", "suppliers", "payments", "reports", "settings", "ai-forecast"
    ],
    [UserRole.ADMIN]: [
      "dashboard", "products", "categories", "cash-register", "orders", 
      "sales", "customers", "suppliers", "payments", "reports", "settings", "ai-forecast"
    ],
    [UserRole.PHARMACIST]: [
      "dashboard", "products", "categories", "orders", "sales", 
      "customers", "reports", "ai-forecast"
    ],
    [UserRole.CASHIER]: [
      "dashboard", "products", "categories", "cash-register", "sales", "customers"
    ],
    [UserRole.CUSTOMER]: [
      "dashboard", "customers"
    ],
    [UserRole.SUPPLIER]: [
      "dashboard", "orders", "suppliers"
    ],
    [UserRole.ACCOUNTANT]: [
      "dashboard", "payments", "reports"
    ],
    [UserRole.INVENTORY_MANAGER]: [
      "dashboard", "products", "categories", "orders", "suppliers", "ai-forecast"
    ],
    [UserRole.USER]: [
      "dashboard", "products", "categories", "cash-register", "orders", 
      "sales", "customers", "suppliers", "payments", "reports", "settings", "ai-forecast"
    ],
  };

  const renderActiveTab = () => {
    const completion = calculateProfileCompletion(user);
    const isVerified = user?.role === "Admin" || user?.role === "Super Admin" || user?.role === "User" || user?.verificationStatus === "Verified" || completion.percent === 100;
    const sensitiveTabs = ["products", "categories", "cash-register", "orders", "sales", "payments", "reports", "settings"];
    const isTabLocked = user && currentTab !== "profile" && sensitiveTabs.includes(currentTab) && !isVerified;

    if (user && !isTabLocked && currentTab !== "profile" && !ROLE_ALLOWED_TABS[user.role]?.includes(currentTab)) {
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden max-w-xl mx-auto my-12 animate-in fade-in duration-300">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-red-100 opacity-20 rounded-full translate-x-8 translate-y-8" />
          <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-sm shadow-rose-200/50 mb-4 font-bold text-2xl">
            🛡️
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
            Operational Boundaries Blocked
          </h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold mt-2 mb-6">
            Your active operational role node <span className="text-rose-600 font-mono">[{user.role}]</span> does not possess the requisite authority tokens to view the <span className="text-slate-700 font-mono">[{currentTab.toUpperCase()}]</span> segment module at this workstation.
          </p>
          <button
            onClick={() => setCurrentTab("dashboard")}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
          >
            Return to Dashboard Hub
          </button>
        </div>
      );
    }

    if (user && isTabLocked) {
      const completion = calculateProfileCompletion(user);
      return (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col items-center justify-center text-center shadow-lg relative overflow-hidden max-w-xl mx-auto my-12 animate-in fade-in duration-300">
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-amber-100 opacity-20 rounded-full translate-x-8 translate-y-8" />
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm shadow-amber-200/50 mb-4 font-bold text-2xl">
            🔒
          </div>
          <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
            Workstation Module Secured
          </h2>
          <p className="text-xs text-slate-500 max-w-sm leading-relaxed font-semibold mt-2 mb-4">
            The <span className="text-slate-750 font-mono font-bold">[{currentTab.toUpperCase()}]</span> segment contains protected pharmaceutical bookkeeping and transactional functions. Access requires completing your Operator Profile and obtaining Identity Verification.
          </p>
          
          <div className="w-full bg-slate-50 rounded-2xl p-4 mb-6 border border-slate-100 text-left">
            <div className="flex justify-between text-xs font-bold text-slate-700 mb-2">
              <span>Profile Onboarding Progress:</span>
              <span className="text-teal-600 font-mono">{completion.percent}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mb-3">
              <div className="bg-teal-600 h-full transition-all duration-500" style={{ width: `${completion.percent}%` }} />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Verification Status: <span className="font-bold text-slate-600 capitalize">{user.verificationStatus || "Pending Submission"}</span>
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setCurrentTab("profile")}
              className="px-5 py-2.5 bg-[#093530] hover:bg-teal-900 text-teal-350 font-extrabold text-xs rounded-xl shadow-md transition"
            >
              Go to Profile Onboarding
            </button>
            {currentTab !== "dashboard" && (
              <button
                onClick={() => setCurrentTab("dashboard")}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition"
              >
                Return to Dashboard
              </button>
            )}
          </div>
        </div>
      );
    }

    switch (currentTab) {
      case "dashboard":
        return (
          <Dashboard 
            onNavigate={setCurrentTab} 
            onEditMedicine={(med) => {
              setEditFocusMed(med);
              setCurrentTab("products");
            }} 
            settings={settings}
            user={user}
          />
        );
      case "products":
        return (
          <Medicines 
            editFocusMedicine={editFocusMed} 
            clearEditFocus={() => setEditFocusMed(null)} 
            settings={settings}
            user={user}
            rolePermissions={rolePermissions}
          />
        );
      case "categories":
        return <Categories user={user} rolePermissions={rolePermissions} />;
      case "cash-register":
        return <CashRegister user={user} settings={settings} onNavigate={setCurrentTab} />;
      case "orders":
        return <Orders settings={settings} />;
      case "sales":
        return <POS settings={settings} user={user} />;
      case "customers":
        return <Customers />;
      case "suppliers":
        return <Suppliers />;
      case "payments":
        return <Finance settings={settings} />;
      case "reports":
        return <Reports settings={settings} />;
      case "settings":
        return <Settings onSettingsSaved={fetchSettings} user={user} />;
      case "ai-forecast":
        return <AICopilot settings={settings} />;
      case "profile":
        return (
          <Profile 
            user={user} 
            onProfileUpdated={(updatedUser) => {
              setSessionUser(updatedUser);
              localStorage.setItem("halomedical_session_user", JSON.stringify(updatedUser));
            }} 
          />
        );
      default:
        return (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">
            Module under secure deployment checklist. Select active menu triggers instead.
          </div>
        );
    }
  };

  const isResetPath = typeof window !== "undefined" && (
    window.location.pathname === "/reset-password" || 
    window.location.hash.includes("/reset-password") || 
    window.location.hash.includes("type=recovery") ||
    window.location.search.includes("type=recovery")
  );

  if (isResetPath) {
    return <ResetPassword />;
  }

  if (!user) {
    return <Auth onLoginSuccess={handleLoginSuccess} settings={settings} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-hidden">
      {/* Absolute left sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
        settings={settings}
        isMobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Backdrop overlay for mobile */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-40 lg:hidden transition-opacity duration-300"
        />
      )}

      {/* Main panel scroll container (Shifted 256px to the right for Sidebar buffer on desktop) */}
      <div className="flex-1 flex flex-col pl-0 lg:pl-64 min-w-0 max-w-full">
        <Header 
          user={user} 
          onRoleChange={handleRoleChange} 
          onLogout={handleLogout} 
          onNavigate={setCurrentTab}
          settings={settings}
          onSelectMedicine={(med) => {
            setEditFocusMed(med);
            setCurrentTab("products");
          }}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Content body offset below the h-16 Top Header */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pt-6 sm:pt-8 text-slate-600">
          <div className="max-w-7xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
