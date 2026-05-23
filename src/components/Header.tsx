/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, Mic, Bell, Globe, ChevronDown, Sparkles, LogOut } from "lucide-react";
import { UserRole, SystemSettings } from "../types";

interface HeaderProps {
  user: { name: string; email: string; role: UserRole; avatarUrl?: string } | null;
  onRoleChange: (role: UserRole) => void;
  onLogout: () => void;
  onNavigate: (tab: string) => void;
  settings?: SystemSettings | null;
}

export default function Header({ user, onRoleChange, onLogout, onNavigate, settings }: HeaderProps) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between fixed top-0 right-0 left-64 z-10">
      {/* Left side search input matching mockup */}
      <div className="flex items-center w-96 relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search drugs, generic names, SKU, invoice..."
          className="w-full pl-10 pr-10 py-1.5 rounded-full bg-slate-100 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-teal-500/20 border-none placeholder-slate-400"
        />
        <button className="absolute right-3 p-1 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
          <Mic className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Right control utilities */}
      <div className="flex items-center space-x-4">
        {/* Localization language dropdown widget */}
        <div className="flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-xs font-semibold text-slate-700">
          <Globe className="w-3.5 h-3.5 text-slate-500" />
          <span>EN</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>

        {/* AI Co-pilot system status indicator */}
        <button 
          id="btn-header-ai-badge"
          onClick={() => onNavigate("ai-forecast")}
          className="relative flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full border border-teal-100 bg-teal-50/20 cursor-pointer hover:bg-teal-100/50 hover:scale-103 transition-all duration-300 select-none shrink-0"
        >
          {/* Sparkle badge inside on the left segment */}
          <Sparkles className="w-2.5 h-2.5 text-teal-500 absolute left-2 top-[44%] -translate-y-1/2 animate-pulse" />
          <span className="text-[7.5px] font-bold text-teal-800 tracking-wider leading-[10px] text-center ml-4 pl-0.5 select-none uppercase font-sans">
            AI<br />Forecast<br />Engine<br />Live
          </span>
        </button>

        {/* Vertical line separator exactly as screenshot */}
        <div className="h-8 w-[1px] bg-slate-200 self-center shrink-0"></div>

        {/* User Account block */}
        {user ? (
          <div className="flex items-center space-x-3.5 pl-1.5">
            <div className="text-right select-none shrink-0">
              <h3 className="text-xs font-extrabold text-slate-800 leading-none">
                {user.name}
              </h3>
              <p className="text-[9.5px] text-slate-400 font-mono mt-1 font-semibold leading-none">
                {user.email}
              </p>
            </div>
            
            <div className="relative group shrink-0">
              <button 
                id="header-user-menu"
                className="flex items-center focus:outline-none"
              >
                <img
                  src={user.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"}
                  alt="user profil"
                  className="w-7.5 h-10 object-cover rounded-full ring-2 ring-teal-500/20 shadow-sm"
                />
              </button>

              {/* Action drop downs for fast mock user role swaps */}
              <div className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 hidden group-focus-within:block group-hover:block transition-all animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-2 border-b border-slate-100 mb-1">
                  <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                    Switch Access Role
                  </span>
                </div>
                {Object.values(UserRole).map((role) => (
                  <button
                    key={role}
                    onClick={() => onRoleChange(role)}
                    className={`w-full text-left px-4 py-1.5 text-xs font-semibold flex items-center justify-between ${
                      user.role === role 
                        ? "bg-teal-50 text-teal-700" 
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <span>{role}</span>
                    {user.role === role && (
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-600" />
                    )}
                  </button>
                ))}
                
                <div className="border-t border-slate-100 mt-2 pt-1.5 px-2">
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center px-3 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 hover:text-red-700 rounded-xl"
                  >
                    <LogOut className="w-3.5 h-3.5 mr-2" />
                    <span>Secure Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Quick action button for role dropdown label configured as stacked words */}
            <div className="flex flex-col justify-center items-center bg-[#072421] text-[#7bf1db] text-[8px] font-black px-3.5 rounded-xl border border-[#0d443e] shadow-sm leading-2.5 h-10 uppercase tracking-widest text-center select-none shrink-0 min-w-[65px]">
              {user.role.replace("_", " ").split(" ").map((word, wIdx) => (
                <span key={wIdx}>{word}</span>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs font-semibold text-slate-400">Not Logged In</div>
        )}
      </div>
    </header>
  );
}
