/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from "react";
import { 
  Search, Mic, Globe, ChevronDown, Sparkles, LogOut, Loader2, 
  MapPin, Pill, FileText, Users, ArrowRight, User as UserIcon,
  Settings, Sliders, Shield, AlertTriangle, Menu
} from "lucide-react";
import { UserRole, SystemSettings } from "../types";
import { useLanguage } from "../LanguageContext";
import { getAvatarUrl } from "../utils";

interface HeaderProps {
  user: { name: string; email: string; role: UserRole; avatarUrl?: string } | null;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  settings?: SystemSettings | null;
  onSelectMedicine?: (med: any) => void;
  onToggleMobileMenu?: () => void;
}

export default function Header({ 
  user, onRoleChange, onLogout, onNavigate, settings, onSelectMedicine, onToggleMobileMenu 
}: HeaderProps) {
  const { t, language, setLanguage } = useLanguage();
  
  // Search state
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Language dropdown open state
  const [langOpen, setLangOpen] = useState(false);

  // User menu dropdown open state
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Logout confirmation modal or inline state
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  // References to handle clicks outside
  const searchRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debouncing or fetching results
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setOpen(false);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        setOpen(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data);
        } else {
          setError("Failed to fetch search suggestions.");
        }
      } catch (e) {
        setError("Network error fetching query.");
      } finally {
        setLoading(false);
      }
    }, 250); // fast and intelligent debounced responsiveness

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Handle outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
      if (langRef.current && !langRef.current.contains(event.target as Node)) {
        setLangOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle clicking search item
  const handleItemSelect = (item: any) => {
    setOpen(false);
    setQuery("");

    // Special behavior for Medicines
    if (item.tab === "products" && onSelectMedicine) {
      onSelectMedicine(item.payload);
    } else {
      onNavigate(item.tab);
    }
  };

  const currentLangLabel = language === "FR" ? "FR" : language === "ES" ? "ES" : language === "KISW" ? "KISW" : "EN";

  return (
    <header className="h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 px-3 sm:px-6 md:px-8 flex items-center justify-between sticky top-0 w-full z-30 transition-all duration-300">
      
      {/* 3-line hamburger menu for mobile/tablet devices */}
      <button 
        onClick={onToggleMobileMenu}
        className="lg:hidden mr-1.5 p-2 hover:bg-slate-100 rounded-xl text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition shrink-0 cursor-pointer"
        aria-label="Toggle Navigation Menu"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      {/* Left side intelligent live search */}
      <div ref={searchRef} className="flex items-center w-full max-w-[140px] sm:max-w-xs md:w-96 relative">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => { if (query) setOpen(true); }}
            placeholder={t("search_placeholder")}
            className="w-full pl-10 pr-10 py-2 rounded-full bg-slate-100 text-xs text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:bg-white border border-transparent focus:border-slate-200 transition placeholder-slate-400"
          />
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-3 animate-spin" />
          ) : query ? (
            <button 
              onClick={() => { setQuery(""); setResults([]); }}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 font-bold text-xs"
            >
              ✕
            </button>
          ) : (
            <button className="absolute right-3 top-2 rounded-full p-1 text-slate-400 hover:text-slate-600 transition">
              <Mic className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Real-time Search suggestions autocomplete dropdown */}
        {open && (
          <div className="absolute top-12 left-0 w-[280px] sm:w-full bg-white border border-slate-200 rounded-2xl shadow-2xl py-3 z-50 max-h-96 overflow-y-auto animate-in fade-in slide-in-from-top-1.5 duration-200">
            {error && (
              <p className="text-[11px] text-red-500 font-bold px-4 py-2">{error}</p>
            )}

            {!loading && results.length === 0 ? (
              <div className="px-4 py-3 text-center">
                <p className="text-xs font-bold text-slate-400">No results found</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Try searching with other generic terms or product codes.</p>
              </div>
            ) : (
              <div>
                <div className="px-4 pb-1 mb-1.5 border-b border-slate-100 flex justify-between items-center select-none">
                  <span className="text-[9.5px] font-extrabold tracking-wider text-slate-400 uppercase">Intelligent Autocomplete Registry</span>
                  <span className="text-[9.5.px] text-teal-600 font-mono font-bold text-[9px]">{results.length} hits</span>
                </div>
                
                {results.map((item) => {
                  let CatIcon = Pill;
                  let badgeColors = "bg-teal-50 text-teal-700 border-teal-200";

                  if (item.category === "Customers") {
                    CatIcon = Users;
                    badgeColors = "bg-blue-50 text-blue-700 border-blue-200";
                  } else if (item.category === "Suppliers") {
                    CatIcon = MapPin;
                    badgeColors = "bg-purple-50 text-purple-700 border-purple-200";
                  } else if (item.category === "Transactions") {
                    CatIcon = FileText;
                    badgeColors = "bg-amber-50 text-amber-700 border-amber-200";
                  } else if (item.category === "Prescriptions") {
                    badgeColors = "bg-rose-50 text-rose-700 border-rose-200";
                  }

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between group transition cursor-pointer"
                    >
                      <div className="flex items-center space-x-3 truncate">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 shrink-0 group-hover:bg-teal-50 group-hover:text-teal-600 transition">
                          <CatIcon className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-extrabold text-slate-800 leading-none group-hover:text-teal-900 truncate">
                            {item.title}
                          </p>
                          <p className="text-[10.5px] text-slate-400 font-semibold font-mono mt-1 leading-none truncate">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0 ml-3">
                        <span className={`text-[8.5px] font-black border uppercase tracking-wider px-2 py-0.5 rounded-full ${badgeColors}`}>
                          {item.category}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100 transform translate-x-[-4px] group-hover:translate-x-0 transition shrink-0" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right control utilities */}
      <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4">
        
        {/* Localization language dropdown widget with dynamic selections */}
        <div ref={langRef} className="relative">
          <button 
            id="btn-lang-dropdown"
            onClick={() => setLangOpen(!langOpen)}
            className="flex items-center space-x-1 bg-slate-100/80 border border-slate-150 hover:bg-slate-200/50 px-2.5 py-1.5 rounded-full text-xs font-extrabold text-slate-700 focus:outline-none transition cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="hidden sm:inline uppercase text-[11px]">{currentLangLabel}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${langOpen ? "transform rotate-180" : ""}`} />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-40 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-1.5 duration-200">
              <div className="px-3 pb-1 mb-1 border-b border-slate-100 text-left select-none">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">
                  Select Language
                </span>
              </div>
              {[
                { label: "English (EN)", key: "EN" },
                { label: "Español (ES)", key: "ES" },
                { label: "Français (FR)", key: "FR" },
                { label: "Kiswahili (Kisw)", key: "KISW" }
              ].map((lang) => (
                <button
                  key={lang.key}
                  onClick={() => {
                    setLanguage(lang.key);
                    setLangOpen(false);
                  }}
                  className={`w-full text-left px-4 py-1.5 text-xs font-extrabold flex items-center justify-between ${
                    language === lang.key 
                      ? "bg-teal-50 text-teal-700" 
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span>{lang.label}</span>
                  {language === lang.key && <span className="w-1.5 h-1.5 rounded-full bg-teal-600 shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Co-pilot system status indicator */}
        <button 
          id="btn-header-ai-badge"
          onClick={() => onNavigate("ai-forecast")}
          className="relative flex items-center justify-center w-8 h-8 sm:w-[60px] sm:h-[60px] rounded-full border border-teal-100 bg-teal-50/20 cursor-pointer hover:bg-teal-100/50 hover:scale-105 transition-all duration-300 select-none shrink-0"
          title="AI Smart Forecast"
        >
          <Sparkles className="w-3.5 h-3.5 sm:w-2.5 sm:h-2.5 text-teal-500 sm:absolute sm:left-2 sm:top-[44%] sm:-translate-y-1/2 animate-pulse" />
          <span className="hidden sm:inline text-[7.5px] font-bold text-teal-800 tracking-wider leading-[10px] text-center ml-4 pl-0.5 select-none uppercase font-sans">
            AI<br />Smart<br />Forecast
          </span>
        </button>

        {/* Vertical line separator */}
        <div className="h-8 w-[1px] bg-slate-200 self-center shrink-0"></div>

        {/* User Account block */}
        {user ? (
          <div ref={userMenuRef} className="flex items-center space-x-1.5 sm:space-x-2 relative select-none">
            <button 
              id="header-user-menu"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-1.5 sm:space-x-2.5 text-right select-none shrink-0 group focus:outline-none cursor-pointer"
            >
              <div className="hidden md:block text-right">
                <h3 className="text-xs font-extrabold text-slate-800 leading-none group-hover:text-teal-700 transition">
                  {user.name}
                </h3>
                <p className="text-[9.5px] text-slate-400 font-mono mt-1 font-semibold leading-none">
                  {user.email}
                </p>
              </div>
              
              <div className="relative shrink-0">
                <img
                  src={getAvatarUrl(user.avatarUrl)}
                  alt="user avatar"
                  className="w-8 h-8 object-cover rounded-full ring-2 ring-teal-500/20 shadow-sm group-hover:ring-teal-500 transition-all"
                  referrerPolicy="no-referrer"
                />
                <ChevronDown className="w-3 h-3 text-slate-400 absolute -bottom-1 -right-1 bg-white rounded-full border border-slate-200 p-0.5 group-hover:text-slate-600 transition" />
              </div>
            </button>
            
            {/* Action drop downs with fast user profile links */}
            {userMenuOpen && (
              <div className="absolute right-0 top-12 w-60 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200 text-left">
                
                {/* Header status overview */}
                <div className="px-4 py-2 border-b border-slate-100 bg-slate-50/50 rounded-t-2xl">
                  <p className="text-xs font-extrabold text-slate-800 truncate">{user.name}</p>
                  <p className="text-[9.5px] text-slate-400 font-mono font-semibold truncate mt-0.5">{user.email}</p>
                  <div className="mt-1.5 inline-flex items-center text-[8.5px] font-bold tracking-wider text-[#0e5c54] bg-teal-50 border border-teal-200/50 px-2 py-0.5 rounded-md uppercase">
                    <Shield className="w-2.5 h-2.5 mr-1" /> {user.role} Account
                  </div>
                </div>

                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setUserMenuOpen(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("profile-tab-navigate", { detail: "info" }));
                        const target = document.getElementById("profile-header-sec");
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-xl flex items-center space-x-2.5 text-slate-705 text-slate-700 hover:text-slate-900 transition"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <div className="flex-1">
                      <p className="leading-tight">My Profile</p>
                      <p className="text-[9px] text-slate-400 font-semibold font-sans">View profile & account status</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setUserMenuOpen(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("profile-tab-navigate", { detail: "info" }));
                        const target = document.getElementById("profile-settings-sec");
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-xl flex items-center space-x-2.5 text-slate-705 text-slate-700 hover:text-slate-900 transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <div className="flex-1">
                      <p className="leading-tight">Profile Settings</p>
                      <p className="text-[9px] text-slate-400 font-semibold font-sans">Update name, avatar, bio</p>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      onNavigate("profile");
                      setUserMenuOpen(false);
                      setTimeout(() => {
                        window.dispatchEvent(new CustomEvent("profile-tab-navigate", { detail: "preferences" }));
                        const target = document.getElementById("profile-preferences-sec");
                        if (target) target.scrollIntoView({ behavior: "smooth" });
                      }, 100);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-bold hover:bg-slate-50 rounded-xl flex items-center space-x-2.5 text-slate-705 text-slate-700 hover:text-slate-900 transition"
                  >
                    <Sliders className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                    <div className="flex-1">
                      <p className="leading-tight">Account Preferences</p>
                      <p className="text-[9px] text-slate-400 font-semibold font-sans">System look & layout</p>
                    </div>
                  </button>
                </div>

                <div className="border-t border-slate-100 mt-1.5 pt-1.5 px-2">
                  <button
                    onClick={() => {
                      setIsLogoutConfirmOpen(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2.5 shrink-0" />
                    <span>{t("secure_sign_out")}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Quick action button for role dropdown label */}
            <div className="hidden sm:flex flex-col justify-center items-center bg-[#072421] text-[#7bf1db] text-[8px] font-black px-3.5 rounded-xl border border-[#0d443e] shadow-sm leading-2.5 h-10 uppercase tracking-widest text-center select-none shrink-0 min-w-[65px]">
              {user.role.replace("_", " ").split(" ").map((word, wIdx) => (
                <span key={wIdx}>{word}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-400">Not Logged In</div>
        )}
      </div>

      {/* Secure Logout Confirmation Overlay */}
      {isLogoutConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="absolute right-0 top-0 w-24 h-24 bg-rose-50 opacity-30 rounded-full translate-x-8 translate-y-[-8px]" />
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              {t("secure_sign_out") || "Secure Sign Out"}
            </h3>
            <p className="text-xs text-slate-500 font-medium leading-relaxed mt-2.5 mb-5">
              Are you sure you want to sign out? This will end your active session on this device.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => {
                  setIsLogoutConfirmOpen(false);
                  onLogout();
                }}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition text-center"
              >
                Sign Out Securely
              </button>
              <button
                onClick={() => setIsLogoutConfirmOpen(false)}
                className="flex-1 py-1.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs rounded-xl cursor-pointer transition text-center"
              >
                Keep Logged In
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
