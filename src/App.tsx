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
import { UserRole, Medicine, SystemSettings } from "./types";

interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string;
}

export default function App() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [currentTab, setCurrentTab] = useState<string>("dashboard");
  const [editFocusMed, setEditFocusMed] = useState<Medicine | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Load settings globally upon system load
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
      }
    } catch (e) {
      console.error("Failed to load settings globally in App.tsx:", e);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Auto-log in default administrative profile for rapid user exploration
  useEffect(() => {
    const defaultUser: SessionUser = {
      id: "usr-01",
      name: "Dr. Budiono Siregar",
      email: "budionosiregar@gmail.com",
      role: UserRole.SUPER_ADMIN,
      avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop"
    };
    setUser(defaultUser);
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    if (user) {
      setUser({ ...user, role: newRole });
    }
  };

  const handleLogout = () => {
    setUser(null);
  };

  const renderActiveTab = () => {
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
          />
        );
      case "products":
        return (
          <Medicines 
            editFocusMedicine={editFocusMed} 
            clearEditFocus={() => setEditFocusMed(null)} 
          />
        );
      case "categories":
        return <Categories />;
      case "cash-register":
        return <CashRegister user={user} settings={settings} onNavigate={setCurrentTab} />;
      case "orders":
        return <Orders />;
      case "sales":
        return <POS settings={settings} />;
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
        return <AICopilot />;
      default:
        return (
          <div className="p-8 text-center text-slate-400 font-bold text-xs">
            Module under secure deployment checklist. Select active menu triggers instead.
          </div>
        );
    }
  };

  if (!user) {
    return <Auth onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Absolute left sidebar */}
      <Sidebar 
        currentTab={currentTab} 
        onTabChange={setCurrentTab} 
        user={user} 
        onLogout={handleLogout} 
        settings={settings}
      />

      {/* Main panel scroll container (Shifted 256px to the right for Sidebar buffer) */}
      <div className="flex-1 flex flex-col pl-64">
        <Header 
          user={user} 
          onRoleChange={handleRoleChange} 
          onLogout={handleLogout} 
          onNavigate={setCurrentTab}
          settings={settings}
        />

        {/* Content body offset below the h-16 Top Header */}
        <main className="p-8 pt-24 min-h-screen text-slate-600">
          <div className="max-w-7xl mx-auto">
            {renderActiveTab()}
          </div>
        </main>
      </div>
    </div>
  );
}
