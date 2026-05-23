/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  BarChart3, Box, Layers, ShoppingBag, 
  Users, CreditCard, FileText, Settings, ShieldAlert,
  PlusSquare, ArrowRight, CheckCircle2, Truck, Wallet
} from "lucide-react";
import { SystemSettings } from "../types";

interface SidebarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  user: { name: string; email: string; role: string; avatarUrl?: string } | null;
  onLogout: () => void;
  settings?: SystemSettings | null;
}

export default function Sidebar({ currentTab, onTabChange, user, onLogout, settings }: SidebarProps) {
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

  const renderNavGroup = (items: typeof mainNavigation, title: string) => (
    <div className="mb-6">
      <p className="px-3 text-[10px] font-bold tracking-wider text-slate-400 uppercase mb-2">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-${item.id}`}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-[#093530] text-teal-300 shadow-md shadow-teal-900/10"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className={`w-4 h-4 mr-3 ${isActive ? "text-teal-300" : "text-slate-400"}`} />
              <span className="truncate">{item.label}</span>
              {isActive && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-teal-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside id="app-sidebar" className="w-64 bg-slate-50 border-r border-slate-200 flex flex-col h-screen fixed top-0 left-0 z-20">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200">
        <div className="flex items-center space-x-2.5">
          {settings?.general?.logoUrl ? (
            <img 
              src={settings?.general?.logoUrl} 
              alt="Brand Logo" 
              className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm border border-slate-100"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-lg shadow-sm shadow-teal-600/30">
              ➕
            </div>
          )}
          <span className="font-sans font-bold text-sm text-slate-800 tracking-tight truncate max-w-[150px]">
            {settings?.general?.pharmacyName || "Pharmacy"}
          </span>
        </div>
      </div>

      {/* Navigation Scroll Container */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {renderNavGroup(mainNavigation, "Main Menu")}
        {renderNavGroup(leadsNavigation, "Leads / Operations")}
        {renderNavGroup(commsNavigation, "Comms & Tools")}
      </div>

      {/* Sidebar Footer - Verify Profile / Setup Status */}
      <div className="p-4 border-t border-slate-200 bg-slate-50">
        <div className="p-4 bg-teal-50 border border-teal-100 rounded-2xl relative overflow-hidden">
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
                  className="stroke-teal-100 fill-none"
                  strokeWidth="3.5"
                />
                <circle
                  cx="20"
                  cy="20"
                  r="16"
                  className="stroke-teal-600 fill-none"
                  strokeWidth="3.5"
                  strokeDasharray={`${2 * Math.PI * 16}`}
                  strokeDashoffset={`${2 * Math.PI * 16 * 0.5}`} // 50% matching screenshot
                />
              </svg>
              <span className="absolute text-[10px] font-bold text-teal-800">50%</span>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-teal-900 leading-tight">
                Complete Profile
              </h4>
              <p className="text-[10px] text-teal-700 leading-normal">
                Unlock all ERP modules.
              </p>
            </div>
          </div>

          <button
            id="btn-verify-identity"
            onClick={() => onTabChange("settings")}
            className="w-full py-1.5 px-3 bg-[#093530] text-teal-300 text-[11px] font-semibold rounded-lg hover:bg-teal-950 transition-all duration-200 flex items-center justify-center space-x-1 shadow-sm"
          >
            <span>Verify Identity</span>
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
