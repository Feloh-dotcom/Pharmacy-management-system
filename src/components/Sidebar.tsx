/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BarChart3, Box, Layers, ShoppingBag, 
  Users, CreditCard, FileText, Settings, ShieldAlert,
  PlusSquare, ArrowRight, CheckCircle2, Truck, Wallet,
  Lock, AlertCircle, Pill
} from "lucide-react";
import { SystemSettings } from "../types";
import { useLanguage } from "../LanguageContext";
import { calculateProfileCompletion } from "../utils";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: any;
  onLogout: () => void;
  settings?: SystemSettings | null;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export default function Sidebar({ 
  currentTab, onTabChange, user, onLogout, settings, isMobileOpen, onCloseMobile 
}: SidebarProps) {
  const { t } = useLanguage();

  const handleTabClick = (tabId: string) => {
    onTabChange(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  const getTranslatedLabel = (id: string, defaultLabel: string) => {
    const normalized = id.replace("-", "_") as any;
    try {
      return t(normalized) || defaultLabel;
    } catch {
      return defaultLabel;
    }
  };

  const mainNavigation = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
    { id: "products", label: "Products", icon: Box },
    { id: "categories", label: "Categories", icon: Layers },
  ];

  const leadsNavigation = [
    { id: "cash-register", label: "Cash Register", icon: Wallet },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "sales", label: "Sales & POS", icon: CreditCard },
    { id: "customers", label: "Customers", icon: Users },
    { id: "suppliers", label: "Suppliers", icon: Truck },
  ];

  const commsNavigation = [
    { id: "payments", label: "Payments & Finance", icon: CreditCard },
    { id: "reports", label: "Reports", icon: FileText },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  const ROLE_ALLOWED_TABS: Record<string, string[]> = {
    "Admin": [
      "dashboard", "products", "categories", "cash-register", "orders", 
      "sales", "customers", "suppliers", "payments", "reports", "settings"
    ],
    "Pharmacist": [
      "dashboard", "products", "categories", "orders", "sales", 
      "customers", "reports"
    ],
    "Cashier": [
      "dashboard", "products", "categories", "cash-register", "sales", "customers"
    ],
    "Customer": [
      "dashboard", "customers"
    ],
    "Supplier": [
      "dashboard", "orders", "suppliers"
    ],
    "Accountant": [
      "dashboard", "payments", "reports"
    ],
    "Inventory Manager": [
      "dashboard", "products", "categories", "orders", "suppliers"
    ],
    "User": [
      "dashboard"
    ],
  };

  const completion = calculateProfileCompletion(user);
  const percent = completion.percent;
  const isVerified = user?.role === "Admin" || user?.verificationStatus === "Verified" || percent === 100;
  const sensitiveTabs = ["dashboard", "products", "categories", "cash-register", "orders", "sales", "payments", "reports", "settings"];

  const isTabLocked = (tabId: string) => {
    if (user?.role === "Admin") return false;
    return sensitiveTabs.includes(tabId) && !isVerified;
  };

  const allowed = user ? ROLE_ALLOWED_TABS[user.role] || ["dashboard"] : ["dashboard"];
  const filteredMain = mainNavigation.filter(item => allowed.includes(item.id));
  const filteredLeads = leadsNavigation.filter(item => allowed.includes(item.id));
  const filteredComms = commsNavigation.filter(item => allowed.includes(item.id));

  const renderNavGroup = (items: typeof mainNavigation, title: string) => (
    <div className="mb-6">
      <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const locked = isTabLocked(item.id);
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => handleTabClick(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#093530] text-teal-300 shadow-md shadow-teal-900/10"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              } ${locked ? "opacity-75 hover:opacity-100" : ""}`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-teal-300" : "text-slate-400"}`} />
              <span className="truncate">{getTranslatedLabel(item.id, item.label)}</span>
              {locked ? (
                <Lock className="w-3.5 h-3.5 ml-auto text-amber-500 shrink-0" />
              ) : isActive ? (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );

  const strokeDashoffset = 2 * Math.PI * 16 * (1 - percent / 100);

  // Verification helper variables
  const status = (percent === 100) ? "Verified" : (user?.verificationStatus || "Pending");
  let onboardingBg = "bg-teal-50 border-teal-100";
  let onboardingTitle = t("complete_profile") || "Complete Profile";
  let onboardingDesc = "Access all system modules.";
  let buttonLabel = t("verify_identity") || "Verify Identity";
  let buttonBg = "bg-[#093530] text-teal-350 hover:bg-teal-950";
  let statusBadge = null;

  if (status === "Verified") {
    onboardingBg = "bg-emerald-50 border-emerald-100";
    onboardingTitle = "Profile Verified";
    onboardingDesc = "All modules unlocked.";
    buttonLabel = "View Profile";
    buttonBg = "bg-emerald-800 text-emerald-100 hover:bg-emerald-900";
    statusBadge = (
      <span className="absolute right-3 top-3 text-[8px] font-black uppercase text-emerald-700 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded-md">
        Verified
      </span>
    );
  } else if (status === "Under Review") {
    onboardingBg = "bg-amber-50 border-amber-150";
    onboardingTitle = "Verification Pending";
    onboardingDesc = "Documents under review.";
    buttonLabel = "Check Status";
    buttonBg = "bg-amber-700 text-amber-50 hover:bg-amber-800";
    statusBadge = (
      <span className="absolute right-3 top-3 text-[8px] font-black uppercase text-amber-700 bg-amber-100 border border-amber-200 px-1.5 py-0.5 rounded-md animate-pulse font-sans">
        Review
      </span>
    );
  } else if (status === "Rejected") {
    onboardingBg = "bg-rose-50 border-rose-150";
    onboardingTitle = "Verification Rejected";
    onboardingDesc = "Profile mismatch. Please re-verify.";
    buttonLabel = "Update Profile Info";
    buttonBg = "bg-rose-800 text-rose-100 hover:bg-rose-900";
    statusBadge = (
      <span className="absolute right-3 top-3 text-[8px] font-black uppercase text-rose-700 bg-rose-100 border border-rose-200 px-1.5 py-0.5 rounded-md">
        Rejected
      </span>
    );
  }

  return (
    <aside 
      id="app-sidebar" 
      className={`w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-screen fixed top-0 transition-all duration-300 z-50 lg:z-20 ${
        isMobileOpen ? "left-0" : "-left-64 lg:left-0"
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          {settings?.general?.logoUrl ? (
            <img 
              src={settings?.general?.logoUrl} 
              alt="Brand Logo" 
              className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm border border-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-[#093530] flex items-center justify-center text-white shadow-sm">
              <Pill className="w-4 h-4 text-teal-300" />
            </div>
          )}
          <span className="font-sans font-bold text-sm text-slate-800 tracking-tight truncate max-w-[150px]">
            {settings?.general?.pharmacyName || "Pharmacy"}
          </span>
        </div>

        {/* Mobile close button */}
        {onCloseMobile && (
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer font-bold text-sm"
            aria-label="Close menu"
          >
            ✕
          </button>
        )}
      </div>

      {/* Navigation Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {filteredMain.length > 0 && renderNavGroup(filteredMain, "Main Menu")}
        {filteredLeads.length > 0 && renderNavGroup(filteredLeads, "Leads / Operations")}
        {filteredComms.length > 0 && renderNavGroup(filteredComms, "Comms & Tools")}
      </div>

      {/* Sidebar Footer - Verify Profile / Setup Status */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className={`p-4 ${onboardingBg} border rounded-2xl relative overflow-hidden transition-all duration-300`}>
          {statusBadge}
          {/* Accent decoration */}
          <div className="absolute right-0 bottom-0 w-24 h-24 bg-teal-100 opacity-20 rounded-full translate-x-8 translate-y-8" />
          
          <div className="flex items-center space-x-3 mb-2">
            <div className="relative flex items-center justify-center">
              {/* Modern SVG Circle progress bar matching screenshot */}
              <svg className="w-10 h-10 transform -rotate-90">
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-slate-200 fill-none"
                  strokeWidth="3.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-teal-600 fill-none transition-all duration-500"
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={strokeDashoffset}
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-teal-800">{percent}%</span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-teal-900 leading-tight">
                {onboardingTitle}
              </h4>
              <p className="text-[10px] text-teal-700 leading-normal">
                {onboardingDesc}
              </p>
            </div>
          </div>

          <button
            id="btn-verify-identity"
            onClick={() => handleTabClick("profile")}
            className={`w-full py-1.5 px-3 ${buttonBg} text-[11px] font-semibold rounded-lg transition-all duration-200 flex items-center justify-center space-x-1 shadow-sm`}
          >
            <span>{buttonLabel}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* User Account brief */}
        {user && (
          <div className="mt-4 pt-1.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img
                src={user.avatarUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop"}
                alt="user avatar"
                className="w-8 h-8 rounded-full ring-2 ring-teal-500/20"
              />
              <div className="truncate max-w-[120px]">
                <p className="text-xs font-semibold text-slate-800 leading-none truncate">{user.name}</p>
                <p className="text-[10px] text-slate-400 capitalize truncate">{user.role}</p>
              </div>
            </div>
            <button 
              id="btn-logout"
              onClick={onLogout} 
              className="text-[10px] font-medium text-red-500 hover:text-red-700 hover:underline px-2 py-1 rounded"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
