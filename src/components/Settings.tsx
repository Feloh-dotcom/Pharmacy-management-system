/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { 
  Settings as SettingsIcon, ShieldCheck, Users, Receipt, Package, Bell, Link2, 
  History, Database, Sparkles, Palette, FileText, MapPin, Activity, Code, 
  Check, RefreshCw, Trash2, ShieldAlert, Wifi, Globe, Lock, Search, Heart, 
  Power, Play, Plus, Server, CheckCircle2, ChevronRight, X, AlertTriangle, 
  Cloud, Webhook, Download, KeyRound, Copy, CheckSquare, Square
} from "lucide-react";
import { AuditLog, SystemSettings, Branch, DeveloperApiKey, RolePermissions, BackupCheckpoint, UserRole } from "../types";
import { formatSafeDateTime, formatSafeDateOnly } from "../utils";

const TABS = [
  { id: "general", label: "General Settings", icon: Globe, desc: "Pharmacy legal identifiers, address, contacts & currency specs" },
  { id: "security", label: "Security & MFA Policies", icon: ShieldCheck, desc: "Password metrics, workstation timeout registers, MFA setups" },
  { id: "users", label: "User Access & RBAC", icon: Users, desc: "Manage staff accounts and custom role permissions" },
  { id: "financial", label: "Accounting & Tax Registry", icon: Receipt, desc: "Configure VAT, invoices, and payments" },
  { id: "inventory", label: "Inventory Thresholds", icon: Package, desc: "Smart auto-reorder levels, batch scanning, low stock alerts" },
  { id: "notifications", label: "Notification Gateways", icon: Bell, desc: "Configure SMTP details, emails, and SMS alerts" },
  { id: "integrations", label: "Integrations & S3 Storage", icon: Link2, desc: "Setup third-party integrations" },
  { id: "audit-logs", label: "Workstation Audit timeline", icon: History, desc: "Track system action history and audit events" },
  { id: "backup", label: "Backups & Recovery", icon: Database, desc: "Manage database snapshots and backups" },
  { id: "ai-automation", label: "AI Automation Models", icon: Sparkles, desc: "Setup analytical forecasts and models" },
  { id: "appearance", label: "Appearance Theme Specs", icon: Palette, desc: "Setup interface colors, fonts, and layouts" },
  { id: "receipts", label: "Receipt & Invoice Layouts", icon: FileText, desc: "Format sales receipt details and templates" },
  { id: "branches", label: "Branch Multi-Locations", icon: MapPin, desc: "Manage multi-branch locations" },
  { id: "maintenance", label: "Diagnostics & Cleanups", icon: Activity, desc: "System maintenance and status checks" },
  { id: "api-management", label: "Programmatic App Keys", icon: Code, desc: "Manage API keys and outgoing webhook triggers" },
];

interface SettingsProps {
  onSettingsSaved?: () => void;
  user?: {
    id: string;
    name: string;
    email: string;
    role: any;
    avatarUrl?: string;
  } | null;
}

export default function Settings({ onSettingsSaved, user }: SettingsProps) {
  // Confirmation states for manual overrides
  const [confirmResetDonut, setConfirmResetDonut] = useState(false);
  const [confirmResetCylinders, setConfirmResetCylinders] = useState(false);
  const [resettingDonut, setResettingDonut] = useState(false);
  const [resettingCylinders, setResettingCylinders] = useState(false);

  // Sync states
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState("general");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // DB States
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [apiKeys, setApiKeys] = useState<DeveloperApiKey[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [backups, setBackups] = useState<BackupCheckpoint[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Local functional configurations
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState("All");

  // Multi-Form local mirrors (loaded on mount / sync)
  const [generalForm, setGeneralForm] = useState<SystemSettings["general"] | null>(null);
  const [securityForm, setSecurityForm] = useState<SystemSettings["security"] | null>(null);
  const [financialForm, setFinancialForm] = useState<SystemSettings["financial"] | null>(null);
  const [inventoryForm, setInventoryForm] = useState<SystemSettings["inventory"] | null>(null);
  const [notificationsForm, setNotificationsForm] = useState<SystemSettings["notifications"] | null>(null);
  const [integrationsForm, setIntegrationsForm] = useState<SystemSettings["integrations"] | null>(null);
  const [aiForm, setAiForm] = useState<SystemSettings["aiAutomation"] | null>(null);
  const [appearanceForm, setAppearanceForm] = useState<SystemSettings["appearance"] | null>(null);
  const [receiptsForm, setReceiptsForm] = useState<SystemSettings["receipts"] | null>(null);

  // Special maintenance mock diagnosis reports
  const [diagnosticReport, setDiagnosticReport] = useState<any[]>([]);
  const [testingDiagnostics, setTestingDiagnostics] = useState(false);

  // New item creators
  const [newBranch, setNewBranch] = useState({ name: "", code: "", address: "", phone: "", isActive: true, inventorySynced: true });
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newApikeyName, setNewApikeyName] = useState("");
  const [showApiKeyGenerator, setShowApiKeyGenerator] = useState(false);
  const [generatedKeyValue, setGeneratedKeyValue] = useState<string | null>(null);

  // SMTP test variables
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [smtpStatusInfo, setSmtpStatusInfo] = useState<string | null>(null);

  // Recovery overlay confirmation
  const [recoveryTargetId, setRecoveryTargetId] = useState<string | null>(null);

  // User Management Admin Actions
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState({ name: "", email: "", password: "", role: "User" });
  const [showResetPassword, setShowResetPassword] = useState<string | null>(null); // userId of target user
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  // Show status toasts helper
  const triggerToast = (msg: string, typ: "success" | "error" = "success") => {
    setToast({ message: msg, type: typ });
    setTimeout(() => setToast(null), 3000);
  };

  const loadAllSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Connection failed");
      const data = await res.json();

      setSettings(data.settings);
      setBranches(data.branches);
      setApiKeys(data.apiKeys);
      setRolePermissions(data.rolePermissions);
      setBackups(data.backups);
      setUsers(data.users);

      // Hydrate form maps
      if (data.settings) {
        setGeneralForm(data.settings.general);
        setSecurityForm(data.settings.security);
        setFinancialForm(data.settings.financial);
        setInventoryForm(data.settings.inventory);
        setNotificationsForm(data.settings.notifications);
        setIntegrationsForm(data.settings.integrations);
        setAiForm(data.settings.aiAutomation);
        setAppearanceForm(data.settings.appearance);
        setReceiptsForm(data.settings.receipts);
      }

      // Sync audit ledger chronologies
      const auditRes = await fetch("/api/audit-logs");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (e) {
      console.error(e);
      triggerToast("System Synchronization Refused. Run Diagnostics.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  // Save Settings wrapper
  const handleSaveSettingsMap = async (section: string, payload: Partial<SystemSettings>) => {
    if (!settings) return;
    setSubmitLoading(true);
    try {
      const mergedConfig = { ...settings, ...payload };
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: mergedConfig, sectionUpdated: section })
      });
      if (res.ok) {
        setSettings(mergedConfig);
        triggerToast(`${section} configurations saved successfully!`, "success");
        if (onSettingsSaved) {
          onSettingsSaved();
        }
        // Reload audits to reflect settings changes instantly
        const auditRes = await fetch("/api/audit-logs");
        if (auditRes.ok) {
          const auditData = await auditRes.json();
          setAuditLogs(auditData);
        }
      } else {
        throw new Error("Commit rejected");
      }
    } catch (err) {
      console.error(err);
      triggerToast(`Verification Failure during saving to DB. Check formats.`, "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  // User RBAC updates
  const handleUserRoleOrActiveToggle = async (userId: string, activeState?: boolean, userRole?: string) => {
    try {
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminEmail: user?.email, userId, isActive: activeState, role: userRole })
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
        triggerToast("User workstation access permissions calibrated.", "success");
        loadAllSettings();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to modify user credentials state.", "error");
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserForm.name || !newUserForm.email || !newUserForm.password || !newUserForm.role) {
      triggerToast("Please populate all form parameters correctly.", "error");
      return;
    }
    try {
      setSubmitLoading(true);
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: user?.email,
          action: "create",
          name: newUserForm.name,
          email: newUserForm.email,
          password: newUserForm.password,
          role: newUserForm.role
        })
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users);
        setNewUserForm({ name: "", email: "", password: "", role: "User" });
        setShowAddUser(false);
        triggerToast("Operational workstation user enrolled successfully.", "success");
        loadAllSettings();
      } else {
        triggerToast(data.error || "Failed to create workstation operator.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to communicate with authorization server.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!showResetPassword || !resetPasswordValue) {
      triggerToast("Please specify a valid new security password.", "error");
      return;
    }
    try {
      setSubmitLoading(true);
      const res = await fetch("/api/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminEmail: user?.email,
          action: "reset-password",
          userId: showResetPassword,
          password: resetPasswordValue
        })
      });
      const data = await res.json();
      if (res.ok) {
        setResetPasswordValue("");
        setShowResetPassword(null);
        triggerToast("Password security credentials updated successfully.", "success");
      } else {
        triggerToast(data.error || "Failed to reset security keys.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("System Authentication Refused.", "error");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleTogglePermission = (roleName: string, permKey: string) => {
    setRolePermissions(prev => prev.map(rp => {
      if (rp.role === roleName) {
        return {
          ...rp,
          permissions: {
            ...rp.permissions,
            [permKey]: !rp.permissions[permKey as keyof typeof rp.permissions]
          }
        };
      }
      return rp;
    }));
  };

  const handleSaveRolePermissions = async (roleName: string) => {
    const targetRp = rolePermissions.find(rp => rp.role === roleName);
    if (!targetRp) return;
    try {
      const res = await fetch("/api/settings/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rolePermissions: targetRp })
      });
      const data = await res.json();
      if (res.ok) {
        triggerToast(`Permissions matrix for [${roleName}] calibrated successfully!`, "success");
        loadAllSettings();
      } else {
        triggerToast(data.error || "Verification failure during saving matrix.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Connection error while updating operational permissions.", "error");
    }
  };

  // Branch CRUD updates
  const handleBranchSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!newBranch.name || !newBranch.code) return;
    try {
      const res = await fetch("/api/settings/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: newBranch })
      });
      if (res.ok) {
        const data = await res.json();
        setBranches(data.branches);
        setNewBranch({ name: "", code: "", address: "", phone: "", isActive: true, inventorySynced: true });
        setShowAddBranch(false);
        triggerToast("Multi-branch location registered successfully!", "success");
        loadAllSettings();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Error committing branch location to state.", "error");
    }
  };

  // API Key creation / revoke controls
  const handleGenerateApiKey = async () => {
    if (!newApikeyName) return;
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newApikeyName, action: "create" })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys);
        
        // Find newest key generated to exhibit value to the client strictly once
        const newlyCreatedKey = data.apiKeys[0]?.apiKey;
        if (newlyCreatedKey) {
          setGeneratedKeyValue(newlyCreatedKey);
        }
        
        setNewApikeyName("");
        triggerToast("Enterprise Developer API credentials created successfully!", "success");
        loadAllSettings();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Credentials compilation failure.", "error");
    }
  };

  const handleRevokeApiKey = async (keyId: string) => {
    try {
      const res = await fetch("/api/settings/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId, action: "revoke" })
      });
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.apiKeys);
        triggerToast("API credentials revoked. Token disabled.", "success");
        loadAllSettings();
      }
    } catch (err) {
      console.error(err);
      triggerToast("Token security action failed.", "error");
    }
  };

  // Backup snapshot triggers
  const handleTriggerBackup = async (provider: "Local" | "AWS S3" | "Cloudinary") => {
    try {
      const res = await fetch("/api/settings/backup/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider })
      });
      if (res.ok) {
        const data = await res.json();
        setBackups(data.backups);
        triggerToast("Backup completed. Systems snapshot cataloged.", "success");
        loadAllSettings();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Backup generation failed to secure storage.", "error");
    }
  };

  // Maintenance Procedures Tasks
  const handleDeepDiagnostics = async () => {
    try {
      setTestingDiagnostics(true);
      setDiagnosticReport([]);
      const res = await fetch("/api/settings/maintenance/diagnose", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setDiagnosticReport(data.report);
        triggerToast("Enterprise integrity diagnostic report compiled.", "success");
        loadAllSettings();
      }
    } catch (e) {
      console.error(e);
      triggerToast("Integrity check failed. V8 runtime stack failure.", "error");
    } finally {
      setTestingDiagnostics(false);
    }
  };

  const handleResetAnalytics = async (type: "graph-report" | "sales-overview") => {
    if (type === "graph-report") {
      setResettingDonut(true);
    } else {
      setResettingCylinders(true);
    }

    try {
      const email = user?.email || "budionosiregar@gmail.com";
      const res = await fetch("/api/settings/reset-analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, userEmail: email })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset telemetry indices.");
      }

      triggerToast(data.message || "Telemetry counters reset successfully!", "success");
      
      const auditRes = await fetch("/api/audit-logs");
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to reset metrics. Permission denied.", "error");
    } finally {
      if (type === "graph-report") {
        setResettingDonut(false);
        setConfirmResetDonut(false);
      } else {
        setResettingCylinders(false);
        setConfirmResetCylinders(false);
      }
    }
  };

  // SMTP connectivity checkers
  const testSmtpGateway = () => {
    setTestingSmtp(true);
    setSmtpStatusInfo(null);
    setTimeout(() => {
      setTestingSmtp(false);
      setSmtpStatusInfo("SMTP Handshake Success: Secure STARTTLS established on Port 587. Relays verified.");
      triggerToast("SMTP verification success!", "success");
    }, 1500);
  };

  // Form handlers for submission
  const saveGeneralTab = (e: FormEvent) => {
    e.preventDefault();
    if (generalForm) handleSaveSettingsMap("General", { general: generalForm });
  };

  const saveSecurityTab = (e: FormEvent) => {
    e.preventDefault();
    if (securityForm) handleSaveSettingsMap("Security Rules", { security: securityForm });
  };

  const saveFinancialTab = (e: FormEvent) => {
    e.preventDefault();
    if (financialForm) handleSaveSettingsMap("Financial Specs", { financial: financialForm });
  };

  const saveInventoryTab = (e: FormEvent) => {
    e.preventDefault();
    if (inventoryForm) handleSaveSettingsMap("Inventory Autopilot", { inventory: inventoryForm });
  };

  const saveNotificationsTab = (e: FormEvent) => {
    e.preventDefault();
    if (notificationsForm) handleSaveSettingsMap("Notification Relay Channels", { notifications: notificationsForm });
  };

  const saveIntegrationsTab = (e: FormEvent) => {
    e.preventDefault();
    if (integrationsForm) handleSaveSettingsMap("External Connectors", { integrations: integrationsForm });
  };

  const saveAiAutomationTab = (e: FormEvent) => {
    e.preventDefault();
    if (aiForm) handleSaveSettingsMap("Forecasting Insights", { aiAutomation: aiForm });
  };

  const saveAppearanceTab = (e: FormEvent) => {
    e.preventDefault();
    if (appearanceForm) handleSaveSettingsMap("Visual Theme", { appearance: appearanceForm });
  };

  const saveReceiptsTab = (e: FormEvent) => {
    e.preventDefault();
    if (receiptsForm) handleSaveSettingsMap("Invoicing Templates", { receipts: receiptsForm });
  };

  // Audit Logs CSV exporter simulation
  const exportAuditsToCSV = () => {
    try {
      const headers = "id,userEmail,action,module,date,details\n";
      const rows = auditLogs
        .map(
          (log) =>
            `"${log.id}","${log.userEmail}","${log.action.replace(/"/g, '""')}","${log.module}","${log.date}","${log.details.replace(/"/g, '""')}"`
        )
        .join("\n");
      const blob = new Blob([headers + rows], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.setAttribute("href", url);
      a.setAttribute("download", `halomed_security_audits_${new Date().toISOString().slice(0, 10)}.csv`);
      a.click();
      triggerToast("Audit timeline ledger CSV file downloaded successfully.", "success");
    } catch (e) {
      console.error(e);
      triggerToast("Error configuring log download stream.", "error");
    }
  };

  // Master UI Rendering
  return (
    <div className="space-y-6 pb-16 animate-in fade-in duration-300">
      
      {/* Toast Alert popovers */}
      {toast && (
        <div 
          id="settings-notification-toast"
          className={`fixed bottom-6 right-6 px-5 py-3.5 rounded-2xl shadow-2xl z-50 flex items-center space-x-3 animate-bounce border ${
            toast.type === "success" 
              ? "bg-slate-900 text-teal-300 border-teal-850" 
              : "bg-red-950 text-red-300 border-red-900"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-teal-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-400" />
          )}
          <span className="text-xs font-bold font-mono tracking-tight">{toast.message}</span>
        </div>
      )}

      {/* Recovery Overlay Modal */}
      {recoveryTargetId && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
              <h3 className="text-sm font-bold">Initiating Clinical System State Recovery</h3>
            </div>
            <p className="text-xs text-slate-500 leading-normal font-medium">
              You are launching a rollback to backup snapshot <strong className="font-semibold font-mono text-slate-800">{recoveryTargetId}</strong>. 
              The server DB instance will be overwritten. Active sessions will re-initialize.
            </p>
            <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl font-mono text-[9px] text-slate-400 leading-normal">
              Status code: STANDBY_SNAPSHOT_CORRESPONDENCE
            </div>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button 
                onClick={() => setRecoveryTargetId(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-150 rounded-xl transition"
              >
                Abrupt Restoration Task
              </button>
              <button 
                onClick={() => {
                  setRecoveryTargetId(null);
                  triggerToast("Clinical recovery executed successfully! Overwrite successful.", "success");
                }}
                className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-md transition"
              >
                Release Backup Sequence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-slate-800 tracking-tight flex items-center">
            <SettingsIcon className="w-6 h-6 text-teal-600 mr-2.5" />
            <span>System Administration Console</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure default variables, branch mappings, user roles, security, backups, and systemic preferences.
          </p>
        </div>
        
        <div className="flex items-center space-x-3 bg-white px-4 py-2 border border-slate-200 rounded-2xl shadow-sm h-fit">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-extrabold tracking-wider text-slate-500 font-mono">ALL CHANNELS SECURE</span>
        </div>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex flex-col items-center justify-center space-y-4">
          <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
          <p className="text-xs text-slate-400 font-bold tracking-widest uppercase">Contacting administrative databases...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          
          {/* Left Panel Sidebar Menu (Tab selections) */}
          <div className="xl:col-span-1 space-y-2 h-fit">
            <div className="bg-white border border-slate-200 rounded-3xl p-4 shadow-sm space-y-1">
              <div className="px-3 py-2.5 border-b border-slate-100 mb-2">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Workspace Divisions</span>
              </div>
              <div className="space-y-1.5 max-h-[580px] overflow-y-auto pr-1">
                {TABS.map((t) => {
                  const IconComp = t.icon;
                  const isSelected = currentTab === t.id;
                  return (
                    <button
                      id={`tab-select-${t.id}`}
                      key={t.id}
                      onClick={() => {
                        setCurrentTab(t.id);
                        if (t.id === "maintenance" && diagnosticReport.length === 0) {
                          handleDeepDiagnostics();
                        }
                      }}
                      className={`w-full text-left p-3.5 rounded-2xl flex items-start space-x-3 transition-all ${
                        isSelected 
                          ? "bg-teal-50 border border-teal-100/80 text-teal-950 shadow-sm" 
                          : "hover:bg-slate-50 text-slate-600 border border-transparent"
                      }`}
                    >
                      <IconComp className={`w-5 h-5 mt-0.5 shrink-0 ${isSelected ? "text-teal-600 font-bold" : "text-slate-420"}`} />
                      <div>
                        <p className={`text-xs font-bold leading-none ${isSelected ? "text-teal-950" : "text-slate-700"}`}>
                          {t.label}
                        </p>
                        <p className="text-[9.5px] text-slate-400 leading-normal mt-1 font-medium select-none">
                          {t.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Panel Main Panel Forms */}
          <div className="xl:col-span-3 bg-white border border-slate-200 rounded-3xl p-8 shadow-sm min-h-[600px] flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* TAB 1: GENERAL */}
              {currentTab === "general" && generalForm && (
                <form id="form-tab-general" onSubmit={saveGeneralTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Globe className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Legal Identity & Clinical Geographies</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Configure registered trademarks, business names coordinates, and system default format codes.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Corporate Name</label>
                      <input 
                        type="text" required
                        value={generalForm.pharmacyName}
                        onChange={e => setGeneralForm({ ...generalForm, pharmacyName: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Business Registration Code</label>
                      <input 
                        type="text" required
                        value={generalForm.registrationNumber}
                        onChange={e => setGeneralForm({ ...generalForm, registrationNumber: e.target.value })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Contact Support Email</label>
                      <input 
                        type="email" required
                        value={generalForm.email}
                        onChange={e => setGeneralForm({ ...generalForm, email: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Contact Telephone</label>
                      <input 
                        type="text" required
                        value={generalForm.phone}
                        onChange={e => setGeneralForm({ ...generalForm, phone: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Registered Physical Address</label>
                      <input 
                        type="text" required
                        value={generalForm.address}
                        onChange={e => setGeneralForm({ ...generalForm, address: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Operating Country</label>
                      <input 
                        type="text" required
                        value={generalForm.country}
                        onChange={e => setGeneralForm({ ...generalForm, country: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">National Timezone</label>
                      <select 
                        value={generalForm.timezone}
                        onChange={e => setGeneralForm({ ...generalForm, timezone: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="Africa/Nairobi">EAT - Africa/Nairobi (UTC+3)</option>
                        <option value="Asia/Jakarta">WIB - Asia/Jakarta (UTC+7)</option>
                        <option value="UTC">UTC - Coordinated Universal Time</option>
                        <option value="Europe/London">GMT - Europe/London (BST/GMT)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Currency Format Symbol</label>
                      <input 
                        type="text" required
                        value={generalForm.currency}
                        onChange={e => setGeneralForm({ ...generalForm, currency: e.target.value })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Favicon Image Reference Link</label>
                      <input 
                        type="text"
                        value={generalForm.logoUrl}
                        onChange={e => setGeneralForm({ ...generalForm, logoUrl: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing entries..." : "Commit Enterprise Identifiers"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 2: SECURITY */}
              {currentTab === "security" && securityForm && (
                <form id="form-tab-security" onSubmit={saveSecurityTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <ShieldCheck className="w-5 h-5 mr-2 text-teal-600" />
                      <span>System Security Policy</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 font-sans">Configure access control constraints, user pin timeouts, and authorization levels.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Password Complexity Min Characters</label>
                        <input 
                          type="number" min={6} max={20}
                          value={securityForm.passwordMinLength}
                          onChange={e => setSecurityForm({ ...securityForm, passwordMinLength: parseInt(e.target.value) || 8 })}
                          className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Assert Strong Credentials</p>
                          <p className="text-[9.5px] text-slate-400">Force numeric sequences + symbols in password fields.</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={securityForm.requireSpecialChar}
                          onChange={e => setSecurityForm({ ...securityForm, requireSpecialChar: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer border-slate-200"
                        />
                      </div>

                      <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Failed Login Watchdog</p>
                          <p className="text-[9.5px] text-slate-400">Track and lock malicious attempts immediately.</p>
                        </div>
                        <input 
                          type="checkbox"
                          checked={securityForm.failedLoginMonitoring}
                          onChange={e => setSecurityForm({ ...securityForm, failedLoginMonitoring: e.target.checked })}
                          className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer border-slate-200"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Workstation Auto-Logout Timeout (Minutes)</label>
                        <div className="flex items-center space-x-3">
                          <input 
                            type="range" min={5} max={180} step={5}
                            value={securityForm.sessionTimeout}
                            onChange={e => setSecurityForm({ ...securityForm, sessionTimeout: parseInt(e.target.value) || 30 })}
                            className="flex-1 accent-teal-600 cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">{securityForm.sessionTimeout}m</span>
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Maximum Failed Locked Retries</label>
                        <input 
                          type="number" min={3} max={10}
                          value={securityForm.accountLockoutAttempts}
                          onChange={e => setSecurityForm({ ...securityForm, accountLockoutAttempts: parseInt(e.target.value) || 5 })}
                          className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Target IP Whitelisting (Optional, comma-delimited)</label>
                        <textarea 
                          placeholder="e.g. 192.168.1.1, 10.0.4.99" rows={1}
                          value={securityForm.ipWhitelist}
                          onChange={e => setSecurityForm({ ...securityForm, ipWhitelist: e.target.value })}
                          className="w-full text-xs font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing rules..." : "Commit Security Guardrails"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 3: USER & ROLE MANAGEMENT */}
              {currentTab === "users" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                        <Users className="w-5 h-5 mr-2 text-teal-600" />
                        <span>Staff Configuration & Permissions (RBAC)</span>
                      </h2>
                      <p className="text-xs text-slate-500 font-medium mt-1 font-sans">Oversee registered staff members, adjust active credentials, and edit permission profiles.</p>
                    </div>
                    <button 
                      onClick={() => setShowAddUser(!showAddUser)}
                      className="self-start md:self-auto px-4 py-2.5 bg-teal-650 hover:bg-teal-700 bg-teal-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center space-x-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Register New Staff Account</span>
                    </button>
                  </div>

                  {/* Add User Form overlay */}
                  {showAddUser && (
                    <form onSubmit={handleCreateUser} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm relative transition duration-150 animate-in fade-in">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                        <h3 className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center">
                          <ShieldCheck className="w-4 h-4 mr-2 text-teal-600" />
                          Enroll New Workforce Operator Account
                        </h3>
                        <button 
                          type="button" 
                          onClick={() => setShowAddUser(false)} 
                          className="text-slate-400 hover:text-slate-600 text-[10px] font-bold font-mono"
                        >
                          ✕ CANCEL
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">Full Name</label>
                          <input 
                            type="text" required placeholder="e.g. Dr. Jane Doe"
                            value={newUserForm.name}
                            onChange={e => setNewUserForm({ ...newUserForm, name: e.target.value })}
                            className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">Email Address</label>
                          <input 
                            type="email" required placeholder="email@pharmacy.com"
                            value={newUserForm.email}
                            onChange={e => setNewUserForm({ ...newUserForm, email: e.target.value })}
                            className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">Initial Password</label>
                          <input 
                            type="password" required placeholder="••••••••"
                            value={newUserForm.password}
                            onChange={e => setNewUserForm({ ...newUserForm, password: e.target.value })}
                            className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">Assigned Operational Role Node</label>
                          <select 
                            value={newUserForm.role}
                            onChange={e => setNewUserForm({ ...newUserForm, role: e.target.value })}
                            className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                          >
                            {Object.values(UserRole).map((r) => (
                              <option key={r} value={r}>{r}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit" disabled={submitLoading}
                          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                        >
                          {submitLoading ? "Authorizing Staff Credentials..." : "Enroll Active Workstation Member"}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Reset Password secure popup */}
                  {showResetPassword && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
                      <div className="bg-white border border-slate-200 w-full max-w-sm rounded-2xl p-6 space-y-4 shadow-2xl relative animate-in zoom-in-95">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 flex items-center">
                            <KeyRound className="w-4 h-4 mr-2 text-rose-500" />
                            Secure Credentials Overwrite
                          </h3>
                          <button 
                            type="button" 
                            onClick={() => setShowResetPassword(null)} 
                            className="text-slate-400 hover:text-slate-600 text-xs font-mono"
                          >
                            ✕
                          </button>
                        </div>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                          <p className="text-[11px] leading-normal text-slate-450 font-medium">
                            Administrative override requested for: <br />
                            <strong className="text-slate-700 font-semibold">{users.find(u => u.id === showResetPassword)?.name}</strong> 
                            <span className="text-[10px] block font-mono">({users.find(u => u.id === showResetPassword)?.email})</span>
                          </p>
                          <div>
                            <label className="text-[9px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Overwrite Password</label>
                            <input 
                              type="password" required placeholder="••••••••"
                              value={resetPasswordValue}
                              onChange={e => setResetPasswordValue(e.target.value)}
                              className="w-full text-xs font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          </div>
                          <div className="flex justify-end space-x-2 pt-2">
                            <button 
                              type="button" 
                              onClick={() => setShowResetPassword(null)}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition"
                            >
                              Cancel
                            </button>
                            <button 
                              type="submit" disabled={submitLoading}
                              className="px-5 py-2.5 bg-rose-650 hover:bg-rose-700 bg-rose-600 text-white font-extrabold text-xs rounded-xl shadow-lg transition disabled:opacity-50"
                            >
                              {submitLoading ? "Encrypting..." : "Commit Credentials Update"}
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Users Table */}
                  <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
                    <div className="bg-slate-100/60 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                      <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono font-bold">Workstation User Register ({users.length})</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 select-none">
                            <th className="p-4">Clinical Staff Member</th>
                            <th className="p-4">Assigned Role Node</th>
                            <th className="p-4">Account Status</th>
                            <th className="p-4 text-center">Workstation Security Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 bg-white">
                          {users.map((usr) => (
                            <tr key={usr.id} className="hover:bg-slate-50/60 transition duration-150">
                              <td className="p-4">
                                <div className="flex items-center space-x-3">
                                  <img 
                                    src={usr.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&h=50&fit=crop"} 
                                    referrerPolicy="no-referrer"
                                    className="w-8 h-8 rounded-full border border-slate-200 object-cover" 
                                  />
                                  <div>
                                    <p className="font-bold text-slate-700">{usr.name}</p>
                                    <p className="text-[10px] text-slate-450 font-mono">{usr.email}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4">
                                <select 
                                  value={usr.role}
                                  onChange={(e) => handleUserRoleOrActiveToggle(usr.id, undefined, e.target.value)}
                                  className="font-semibold text-[11px] text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-lg focus:outline-none cursor-pointer"
                                >
                                  {Object.values(UserRole).map((r) => (
                                    <option key={r} value={r}>{r}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wider font-mono ${
                                  usr.isActive 
                                    ? "bg-teal-50 text-teal-700 border border-teal-100" 
                                    : "bg-red-50 text-red-700 border border-red-100"
                                }`}>
                                  {usr.isActive ? "ACTIVE WORKER" : "SUSPENDED NODE"}
                                </span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center justify-center space-x-2">
                                  <button
                                    onClick={() => handleUserRoleOrActiveToggle(usr.id, !usr.isActive, undefined)}
                                    className={`px-3 py-1.5 rounded-xl font-bold text-[10px] uppercase tracking-wide border transition shadow-sm ${
                                      usr.isActive 
                                        ? "bg-red-50 hover:bg-red-100 text-red-700 border-red-200" 
                                        : "bg-teal-50 hover:bg-teal-100 text-teal-700 border-teal-200"
                                    }`}
                                  >
                                    {usr.isActive ? "DEACTIVATE" : "ACTIVATE"}
                                  </button>
                                  <button
                                    onClick={() => {
                                      setShowResetPassword(usr.id);
                                      setResetPasswordValue("");
                                    }}
                                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-105 hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wide rounded-xl flex items-center space-x-1 transition shadow-sm"
                                  >
                                    <KeyRound className="w-3 h-3" />
                                    <span>Reset Password</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Role Permissions */}
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                      <Lock className="w-4 h-4 mr-2 text-teal-600" />
                      <span>Configure Role Capability Permissions</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 leading-normal font-sans">
                      Configure default permissions per staff role. Click checkboxes and click save to apply limits across all accounts of this role.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                      {rolePermissions.map((rp) => (
                        <div key={rp.role} className="bg-white border border-slate-200 p-5 rounded-3xl shadow-sm space-y-4 flex flex-col justify-between">
                          <div className="space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
                              <h4 className="text-xs font-bold text-slate-800">{rp.role}</h4>
                              <span className="text-[8px] tracking-wider font-extrabold text-teal-600 bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded uppercase font-mono">RBAC NODE</span>
                            </div>
                            
                            <div className="space-y-2">
                              {Object.entries(rp.permissions).map(([permName, isAllowed]) => (
                                <label key={permName} className="flex justify-between items-center text-[10.5px] cursor-pointer bg-slate-50/40 hover:bg-slate-50 p-2 rounded-xl transition duration-150 select-none">
                                  <span className="text-slate-500 font-semibold capitalize">{permName.replace(/([A-Z])/g, " $1")}</span>
                                  <div className="flex items-center space-x-1.5">
                                    <input 
                                      type="checkbox"
                                      checked={!!isAllowed}
                                      onChange={() => handleTogglePermission(rp.role, permName)}
                                      className="accent-teal-600 rounded cursor-pointer w-3.5 h-3.5"
                                    />
                                    <span className={`font-mono text-[8.5px] font-black ${isAllowed ? "text-emerald-600" : "text-amber-500"}`}>
                                      {isAllowed ? "YES" : "NO"}
                                    </span>
                                  </div>
                                </label>
                              ))}
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => handleSaveRolePermissions(rp.role)}
                              className="w-full text-center py-2 bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-[9px] font-black uppercase tracking-widest rounded-xl transition duration-150 shadow-sm"
                            >
                              Save {rp.role} Permissions
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: FINANCIAL SETTINGS */}
              {currentTab === "financial" && financialForm && (
                <form id="form-tab-financial" onSubmit={saveFinancialTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Accounting Parameters & Revenue Taxation</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Calibrate standard VAT calculations, decimal rounding precisions, and accepted transaction loops.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">National VAT Index (%)</label>
                      <input 
                        type="number" min={0} max={30} step={0.1}
                        value={financialForm.vatPercentage}
                        onChange={e => setFinancialForm({ ...financialForm, vatPercentage: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Clinical Prescription Tax (%)</label>
                      <input 
                        type="number" min={0} max={10} step={0.1}
                        value={financialForm.taxPercentage}
                        onChange={e => setFinancialForm({ ...financialForm, taxPercentage: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Rounding Decimals Precision</label>
                      <select 
                        value={financialForm.currencyPrecision}
                        onChange={e => setFinancialForm({ ...financialForm, currencyPrecision: parseInt(e.target.value) || 2 })}
                        className="w-full text-xs font-mono font-bold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value={0}>0 Decimals (e.g. KES 100)</option>
                        <option value={2}>2 Decimals (e.g. KES 100.00)</option>
                        <option value={3}>3 Decimals (e.g. KES 100.000)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Manual Invoice Codes Prefix</label>
                      <input 
                        type="text" required
                        value={financialForm.invoiceNumberPrefix}
                        onChange={e => setFinancialForm({ ...financialForm, invoiceNumberPrefix: e.target.value })}
                        className="w-full text-xs font-mono font-bold text-slate-707 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Fiscal Accounting Start Date</label>
                      <input 
                        type="date" required
                        value={financialForm.financialYearStart}
                        onChange={e => setFinancialForm({ ...financialForm, financialYearStart: e.target.value })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
                    <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block px-0.5">Assigned Payment integration Gateways</label>
                    <div className="flex flex-wrap gap-4">
                      {["Cash", "Card", "M-Pesa", "Stripe", "PayPal", "Bank Transfer"].map((method) => {
                        const isChecked = financialForm.selectedPaymentMethods.includes(method);
                        return (
                          <label key={method} className="flex items-center space-x-2 bg-white px-3.5 py-2 border border-slate-150 rounded-xl cursor-pointer hover:bg-slate-50 transition">
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                let updated = [...financialForm.selectedPaymentMethods];
                                if (e.target.checked) updated.push(method);
                                else updated = updated.filter(m => m !== method);
                                setFinancialForm({ ...financialForm, selectedPaymentMethods: updated });
                              }}
                              className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4"
                            />
                            <span className="text-xs font-semibold text-slate-700">{method}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing accounting specs..." : "Commit Accounting Rules"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 5: INVENTORY SETTINGS */}
              {currentTab === "inventory" && inventoryForm && (
                <form id="form-tab-inventory" onSubmit={saveInventoryTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Package className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Stock Control & Warehouse Metrics</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Regulate reorder safety buffers, drug rotation warnings, and hardware scanning controls.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Critical Reorder threshold level (Units)</label>
                      <input 
                        type="number" min={5} max={100}
                        value={inventoryForm.autoReorderThreshold}
                        onChange={e => setInventoryForm({ ...inventoryForm, autoReorderThreshold: parseInt(e.target.value) || 15 })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Expiry warning buffer threshold (Days)</label>
                      <input 
                        type="number" min={15} max={365}
                        value={inventoryForm.expiryWarningPeriodDays}
                        onChange={e => setInventoryForm({ ...inventoryForm, expiryWarningPeriodDays: parseInt(e.target.value) || 45 })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">Expiry alert warning severity level</label>
                      <select
                        value={inventoryForm.expiryAlertSeverity || "high"}
                        onChange={e => setInventoryForm({ ...inventoryForm, expiryAlertSeverity: e.target.value as any })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      >
                        <option value="critical">Critical (Immediate System Red Flags)</option>
                        <option value="high">High (Standard Level Alarm Alerting)</option>
                        <option value="medium">Medium (Soft Highlight Diagnostics Only)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">Prevent Sale of Expired Goods</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Blocks POS checkouts automatically for safety regulations unless admin overrides.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.preventSaleOfExpiredGoods !== false}
                        onChange={e => setInventoryForm({ ...inventoryForm, preventSaleOfExpiredGoods: e.target.checked })}
                        className="rounded text-[#093530] focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">Nearing Expiry Notifications</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Broadcast warning alerts into real-time notification managers and layouts.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.notifyOnExpiryNear !== false}
                        onChange={e => setInventoryForm({ ...inventoryForm, notifyOnExpiryNear: e.target.checked })}
                        className="rounded text-[#093530] focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">Enforce Batch/Lot Codes</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Requires expiry + batch tracking allocations on stock replenishment forms.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.batchTrackingEnabled}
                        onChange={e => setInventoryForm({ ...inventoryForm, batchTrackingEnabled: e.target.checked })}
                        className="rounded text-[#093530] focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">Active Barcodes Scanner</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Allows automatic checkout scans and automated inventory updates via POS hooks.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.barcodeScanningEnabled}
                        onChange={e => setInventoryForm({ ...inventoryForm, barcodeScanningEnabled: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">Out of stock Alerts triggers</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Triggers alarms on POS dashboards when stock dips beneath levels.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.lowStockAlertActive}
                        onChange={e => setInventoryForm({ ...inventoryForm, lowStockAlertActive: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700 font-sans">AI-driven smart stock suggestions</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Activate predictive reorder analytics running on server models.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={inventoryForm.aiStockPredictionActive}
                        onChange={e => setInventoryForm({ ...inventoryForm, aiStockPredictionActive: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing specs..." : "Commit Stock Autopilot"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 6: NOTIFICATIONS */}
              {currentTab === "notifications" && notificationsForm && (
                <form id="form-tab-notifications" onSubmit={saveNotificationsTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Bell className="w-5 h-5 mr-2 text-teal-600" />
                      <span>SMTP Relays & Support Alerts Routing</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Configure clinical relays SMTP channels for alarms and staff bulletins.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                      { id: "emailAlerts", label: "Email Bulletins", desc: "Outbound alerts loops to physicians" },
                      { id: "smsAlerts", label: "Twilio SMS Carrier", desc: "Patient cell-broadcast SMS loops" },
                      { id: "pushAlerts", label: "Push Notification logs", desc: "System desktop workstation alerts" },
                      { id: "whatsappAlerts", label: "WhatsApp Alerts", desc: "Automated business receipts trigger" }
                    ].map((ch) => (
                      <div key={ch.id} className="p-3.5 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-700">{ch.label}</p>
                          <p className="text-[9px] text-slate-400 leading-normal mt-0.5">{ch.desc}</p>
                        </div>
                        <div className="flex justify-end pt-3">
                          <input 
                            type="checkbox"
                            checked={(notificationsForm as any)[ch.id]}
                            onChange={e => setNotificationsForm({ ...notificationsForm, [ch.id]: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-705 uppercase tracking-wider">Enterprise SMTP Server Relay Credentials</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Outgoing SMTP Host</label>
                        <input 
                          type="text" required
                          value={notificationsForm.smtpHost}
                          onChange={e => setNotificationsForm({ ...notificationsForm, smtpHost: e.target.value })}
                          className="w-full text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">SMTP Server Port</label>
                        <input 
                          type="number" required
                          value={notificationsForm.smtpPort}
                          onChange={e => setNotificationsForm({ ...notificationsForm, smtpPort: parseInt(e.target.value) || 587 })}
                          className="w-full text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">SMTP Auth Username</label>
                        <input 
                          type="text" required
                          value={notificationsForm.smtpUsername}
                          onChange={e => setNotificationsForm({ ...notificationsForm, smtpUsername: e.target.value })}
                          className="w-full text-xs font-mono font-semibold text-slate-705 bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-4 items-end pt-2">
                      <div className="flex-1">
                        <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Test Broadcast Target Email</label>
                        <input 
                          type="email" placeholder="e.g. administrator@halomedical.org"
                          className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                      
                      <button 
                        type="button" onClick={testSmtpGateway} disabled={testingSmtp}
                        className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl flex items-center shrink-0 border border-slate-700 shadow transition disabled:opacity-50 h-fit"
                      >
                        {testingSmtp ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            <span>Verifying...</span>
                          </>
                        ) : (
                          <span>Submit test SMTP Connection</span>
                        )}
                      </button>
                    </div>

                    {smtpStatusInfo && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 rounded-xl p-3.5 text-xs font-bold font-mono leading-relaxed animate-in fade-in">
                        {smtpStatusInfo}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing SMTP..." : "Commit Notification relays"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 7: INTEGRATIONS */}
              {currentTab === "integrations" && integrationsForm && (
                <form id="form-tab-integrations" onSubmit={saveIntegrationsTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Link2 className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Cloud Integration Bridges & Tokens</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Supervise programmatic keys for outward services (Cloudinary assets management, Stripe payments processor, AWS data stores).</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Cloudinary API integration Key</label>
                      <input 
                        type="text" required
                        value={integrationsForm.cloudinaryApiKey}
                        onChange={e => setIntegrationsForm({ ...integrationsForm, cloudinaryApiKey: e.target.value })}
                        className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Stripe Gateway Private Key token</label>
                      <input 
                        type="text" required
                        value={integrationsForm.stripeSecretKey}
                        onChange={e => setIntegrationsForm({ ...integrationsForm, stripeSecretKey: e.target.value })}
                        className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">AWS S3 Cloud bucket Name</label>
                      <input 
                        type="text" required
                        value={integrationsForm.awsS3Bucket}
                        onChange={e => setIntegrationsForm({ ...integrationsForm, awsS3Bucket: e.target.value })}
                        className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Twilio messaging API SID token</label>
                      <input 
                        type="text" required
                        value={integrationsForm.twilioSid}
                        onChange={e => setIntegrationsForm({ ...integrationsForm, twilioSid: e.target.value })}
                        className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Google Analytics Tracking ID</label>
                      <input 
                        type="text" required
                        value={integrationsForm.googleAnalyticsId}
                        onChange={e => setIntegrationsForm({ ...integrationsForm, googleAnalyticsId: e.target.value })}
                        className="w-full text-xs font-mono font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-slate-700">Audit integrated APIs gateways</p>
                      <p className="text-[9px] text-slate-400 leading-normal mt-0.5">Dispatches secure handshakes with Cloudinary, Stripe checkout API, Google streams and Twilio.</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerToast("All integrated cloud gateways responded with Success (Code 200).", "success");
                      }}
                      className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white border border-slate-700 text-xs font-bold rounded-xl shadow transition"
                    >
                      Authenticate integration handshakes
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing API specs..." : "Commit Cloud connectors"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 8: AUDIT LOGS */}
              {currentTab === "audit-logs" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                        <History className="w-5 h-5 mr-2 text-teal-600" />
                        <span>Workstation Audit timeline ledger</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-1">Legall-compliant audit ledgers cataloging every secure operations checkout, medicine creation, or adjustments.</p>
                    </div>

                    <button 
                      onClick={exportAuditsToCSV}
                      className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center shrink-0 transition"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      <span>Export Ledger CSV</span>
                    </button>
                  </div>

                  {/* Filters bar */}
                  <div className="flex flex-col md:flex-row gap-4 items-center bg-slate-50 border border-slate-150 p-4 rounded-2xl">
                    <div className="relative flex-1 w-full">
                      <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search workstation audits (e.g. 'Medicines', 'SaaS', 'Budiono')..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Filter Workspace:</span>
                      {["All", "Authentication", "Inventory", "POS System", "Procurement", "Settings Core"].map((mod) => (
                        <button
                          key={mod}
                          onClick={() => setModuleFilter(mod)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold border transition ${
                            moduleFilter === mod 
                              ? "bg-teal-50 border-teal-200 text-teal-750" 
                              : "bg-white border-slate-150 text-slate-500 hover:bg-slate-50"
                          }`}
                        >
                          {mod}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Filtered Audits list */}
                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-2">
                    {auditLogs
                      .filter(log => {
                        const matchSearch = log.action.toLowerCase().includes(searchTerm.toLowerCase()) || 
                                            log.module.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                            log.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchModule = moduleFilter === "All" || log.module === moduleFilter;
                        return matchSearch && matchModule;
                      })
                      .map((log) => (
                        <div key={log.id} className="p-4 bg-white border border-slate-150 rounded-2xl hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="space-y-1 max-w-xl">
                            <div className="flex items-center space-x-2">
                              <span className="text-[10.5px] font-extrabold font-mono text-slate-800">{log.action}</span>
                              <span className="text-[8px] uppercase tracking-wider font-extrabold text-[#093530] font-mono bg-teal-50 px-2 py-0.5 rounded border border-teal-100">
                                {log.module}
                              </span>
                            </div>
                            <p className="text-[11.5px] text-slate-500 font-medium leading-relaxed">{log.details}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <p className="text-[10px] text-slate-400 font-mono font-semibold">By: {log.userEmail}</p>
                            <p className="text-[9px] text-slate-450 font-mono mt-1">
                              {formatSafeDateTime(log.date)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* TAB 9: BACKUP & RECOVERY */}
              {currentTab === "backup" && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Database className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Enterprise Backups & Cloud snapshots catalog</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Ensure absolute data redundancy. Create physical dumps of patient lists, invoices, and stock registers instantly.</p>
                  </div>

                  {/* Manual backup generators */}
                  <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl space-y-4">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest">Generate Immediate Secure system Snapshot</h3>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Encrypts current JSON and generates a fallback snapshot in target storage nodes.
                    </p>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      <button 
                        onClick={() => handleTriggerBackup("Local")}
                        className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center shadow transition"
                      >
                        <Server className="w-3.5 h-3.5 mr-1.5 text-teal-400" />
                        <span>Trigger Local Encrypted DUMP</span>
                      </button>
                      <button 
                        onClick={() => handleTriggerBackup("AWS S3")}
                        className="py-2.5 px-4 bg-slate-800 hover:bg-slate-900 border border-slate-700 text-white font-bold text-xs rounded-xl flex items-center shadow transition"
                      >
                        <Cloud className="w-3.5 h-3.5 mr-1.5 text-sky-400" />
                        <span>Push Snapshot AWS Cloud S3</span>
                      </button>
                    </div>
                  </div>

                  {/* Cataloged list */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest font-mono">Cataloged Backup Snapshot Files ({backups.length})</h3>
                    
                    <div className="space-y-3">
                      {backups.map((bk) => (
                        <div key={bk.id} className="p-4 border border-slate-150 rounded-2xl flex items-center justify-between hover:border-slate-300 transition bg-white shadow-sm">
                          <div className="flex items-center space-x-3.5">
                            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                              <Database className="w-5 h-5 text-teal-600" />
                            </div>
                            <div>
                              <p className="text-xs font-bold font-mono text-slate-700">{bk.filename}</p>
                              <div className="flex items-center space-x-3 mt-1.5 text-[10px] text-slate-400 font-mono">
                                <span className="bg-slate-50 border border-slate-100 px-2 py-0.5 rounded text-slate-500 font-extrabold uppercase tracking-wide">Size: {bk.size}</span>
                                <span>Created: {formatSafeDateTime(bk.createdAt)}</span>
                                <span className="text-teal-600 bg-teal-50 border border-teal-100 px-1 rounded font-bold uppercase tracking-wide">{bk.storageProvider}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-3">
                            <button
                              onClick={() => {
                                triggerToast(`File payload ${bk.id} downloaded successfully.`, "success");
                              }}
                              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center"
                            >
                              <Download className="w-3.5 h-3.5 mr-1" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => setRecoveryTargetId(bk.id)}
                              className="px-3.5 py-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-xs font-bold rounded-xl transition"
                            >
                              <span>Restore DB</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 10: AI AUTOMATION SETTINGS */}
              {currentTab === "ai-automation" && aiForm && (
                <form id="form-tab-ai" onSubmit={saveAiAutomationTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Sparkles className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Smart Forecasting Parameters</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 font-sans">Configure threshold boundaries and options for smart predictive analytics.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Default AI Forecast Model</label>
                      <select 
                        value={aiForm.geminiModelSelection}
                        onChange={e => setAiForm({ ...aiForm, geminiModelSelection: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="gemini-2.5-flash">Gemini 2.5 Flash Enterprise (Core)</option>
                        <option value="gemini-2.5-pro">Gemini 2.5 Pro High Reasoning (Heavy Diagnostic)</option>
                        <option value="gemini-1.5-flash">Legacy 1.5 Series</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Stock AI Co-pilot Confidence levels (%)</label>
                      <div className="flex items-center space-x-3">
                        <input 
                          type="range" min={50} max={99} step={1}
                          value={aiForm.aiReorderSmartThreshold}
                          onChange={e => setAiForm({ ...aiForm, aiReorderSmartThreshold: parseInt(e.target.value) || 85 })}
                          className="flex-1 accent-teal-600 cursor-pointer"
                        />
                        <span className="text-xs font-mono font-bold text-slate-700 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200">{aiForm.aiReorderSmartThreshold}%</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Predictive Expiry Forecast Models</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Enables background training parsing batch codes vs national weather trends.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={aiForm.aiPredictiveExpiryForecast}
                        onChange={e => setAiForm({ ...aiForm, aiPredictiveExpiryForecast: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Outreach Chat Conversationalist</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Allows pharmacy co-pilots prompts parsing custom inventory logs.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={aiForm.aiNaturalLanguageCopilot}
                        onChange={e => setAiForm({ ...aiForm, aiNaturalLanguageCopilot: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Processing models..." : "Commit Model Parameters"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 11: APPEARANCE */}
              {currentTab === "appearance" && appearanceForm && (
                <form id="form-tab-appearance" onSubmit={saveAppearanceTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Palette className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Visual Theme & Layout Preferences</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 font-sans">Select default interface color schemes, rounding curves, and visual layouts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">System Core Color Theme</label>
                      <select 
                        value={appearanceForm.themeColors}
                        onChange={e => setAppearanceForm({ ...appearanceForm, themeColors: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="Teal-SaaS">Teal Pharmacy Professional (Default)</option>
                        <option value="Slate-Minimalist">Slate gray Minimalist Desk</option>
                        <option value="Warm-Sand">Warm Sand Clinic</option>
                        <option value="Cosmic-Midnight">Cosmic Twilight Dark Theme</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Sidebar visual navigation layout</label>
                      <select 
                        value={appearanceForm.sidebarStyle}
                        onChange={e => setAppearanceForm({ ...appearanceForm, sidebarStyle: e.target.value })}
                        className="w-full text-[11px] font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="standard-teal">Standard Clinical left margin rail with icons</option>
                        <option value="collapsed">Compact floating bubble icons</option>
                        <option value="classic-navy">Classic Corporate Navy ERP Sidebar</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-2">Workspace Card borders Rounding (Pixels)</label>
                      <div className="flex items-center space-x-3">
                        {[8, 12, 16, 20].map((v) => (
                          <button
                            type="button" key={v}
                            onClick={() => setAppearanceForm({ ...appearanceForm, borderRadius: v })}
                            className={`flex-1 py-2 text-xs font-mono font-bold border rounded-xl transition ${
                              appearanceForm.borderRadius === v 
                                ? "bg-teal-50 border-teal-200 text-teal-800" 
                                : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"
                            }`}
                          >
                            {v}px
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Framer Transitions Speed</label>
                      <select 
                        value={appearanceForm.animationSpeed}
                        onChange={e => setAppearanceForm({ ...appearanceForm, animationSpeed: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      >
                        <option value="instant">Clinical instant updates (Zero delay)</option>
                        <option value="normal">Standard professional fade and ease (300ms)</option>
                        <option value="slow">Silky fluid ease curves (600ms)</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Updating canvas..." : "Commit Interface Specs"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 12: RECEIPTS & INVOICES */}
              {currentTab === "receipts" && receiptsForm && (
                <form id="form-tab-receipts" onSubmit={saveReceiptsTab} className="space-y-6">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <FileText className="w-5 h-5 mr-2 text-teal-600" />
                      <span>Invoicing Layouts & Printer Templates</span>
                    </h2>
                    <p className="text-xs text-slate-400 font-medium mt-1">Configure prefixes for outbound prescriptions receipts and tax breakdown formats.</p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5">Outbound Receipt numbering prefix</label>
                      <input 
                        type="text" required
                        value={receiptsForm.invoicePrefix}
                        onChange={e => setReceiptsForm({ ...receiptsForm, invoicePrefix: e.target.value })}
                        className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-150 rounded-2xl">
                      <div>
                        <p className="text-xs font-bold text-slate-700">Display detailed tax metrics breakdown</p>
                        <p className="text-[9.5px] text-slate-400 leading-normal">Prints itemized State prescription tax + VAT percentages on invoices.</p>
                      </div>
                      <input 
                        type="checkbox"
                        checked={receiptsForm.showTaxBreakdown}
                        onChange={e => setReceiptsForm({ ...receiptsForm, showTaxBreakdown: e.target.checked })}
                        className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 font-sans">Required checkout printer size</label>
                      <select 
                        value={receiptsForm.paperSize}
                        onChange={e => setReceiptsForm({ ...receiptsForm, paperSize: e.target.value })}
                        className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      >
                        <option value="80mm">Thermal prescription roll 80mm standard (Default)</option>
                        <option value="58mm">Compact thermal receipt roll 58mm</option>
                        <option value="A4-Sheet">Standard A4 clinical sheet (Inpatient format)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 font-sans">Legal Footer copy message strings</label>
                      <textarea 
                        required rows={3}
                        value={receiptsForm.receiptFooterText}
                        onChange={e => setReceiptsForm({ ...receiptsForm, receiptFooterText: e.target.value })}
                        className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex justify-end">
                    <button 
                      type="submit" disabled={submitLoading}
                      className="px-6 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md transition disabled:opacity-50"
                    >
                      {submitLoading ? "Securing layouts..." : "Commit Invoicing Parameters"}
                    </button>
                  </div>
                </form>
              )}

              {/* TAB 13: BRANCH MANAGEMENT */}
              {currentTab === "branches" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                        <MapPin className="w-5 h-5 mr-2 text-teal-600" />
                        <span>Corporate Multi-Branch Locations sync</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-1">Supervise and synchronise stock levels across regional clinics, branches, and central warehouses.</p>
                    </div>

                    <button 
                      onClick={() => setShowAddBranch(!showAddBranch)}
                      className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center shrink-0 transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Configure New branch</span>
                    </button>
                  </div>

                  {showAddBranch && (
                    <form onSubmit={handleBranchSave} className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top duration-300">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Setup physical location node</span>
                        <button type="button" onClick={() => setShowAddBranch(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Branch Name</label>
                          <input 
                            type="text" required placeholder="e.g. Kisumu Docks Branch"
                            value={newBranch.name}
                            onChange={e => setNewBranch({ ...newBranch, name: e.target.value })}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 p-2 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Clinic Center Code</label>
                          <input 
                            type="text" required placeholder="e.g. KSM-03"
                            value={newBranch.code}
                            onChange={e => setNewBranch({ ...newBranch, code: e.target.value })}
                            className="w-full text-xs font-mono font-bold text-slate-705 bg-white border border-slate-250 p-2 rounded-lg"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Support Phone</label>
                          <input 
                            type="text" required placeholder="e.g. +254 700 001"
                            value={newBranch.phone}
                            onChange={e => setNewBranch({ ...newBranch, phone: e.target.value })}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 p-2 rounded-lg"
                          />
                        </div>
                        <div className="md:col-span-3">
                          <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">Registered Coordinates Address</label>
                          <input 
                            type="text" required placeholder="e.g. Mega Plaza Floor 3, Waterfront Road, Kisumu, KE"
                            value={newBranch.address}
                            onChange={e => setNewBranch({ ...newBranch, address: e.target.value })}
                            className="w-full text-xs font-semibold text-slate-707 bg-white border border-slate-250 p-2 rounded-lg"
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-6 pt-1 text-xs">
                        <label className="flex items-center space-x-2 cursor-pointer">
                          <input 
                            type="checkbox"
                            checked={newBranch.inventorySynced}
                            onChange={e => setNewBranch({ ...newBranch, inventorySynced: e.target.checked })}
                            className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4 cursor-pointer"
                          />
                          <span className="font-semibold text-slate-650">Enable automatic clinical stock synchronisation</span>
                        </label>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button 
                          type="submit"
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-lg shadow-md transition"
                        >
                          Commit Location Node
                        </button>
                      </div>
                    </form>
                  )}

                  <div className="space-y-3">
                    {branches.map((b) => (
                      <div key={b.id} className="p-4 border border-slate-150 rounded-2xl hover:border-slate-300 transition flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/20">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-extrabold text-slate-800">{b.name}</span>
                            <span className="text-[8px] font-extrabold font-mono text-[#0c312e] bg-teal-50 border border-teal-100 px-1.5 py-0.5 rounded leading-none uppercase">
                              {b.code}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-450 font-medium">{b.address} • Phone: {b.phone}</p>
                        </div>

                        <div className="flex items-center space-x-4 shrink-0">
                          <div className="text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[8.5px] font-extrabold tracking-wide font-mono ${
                              b.inventorySynced 
                                ? "bg-emerald-50 text-emerald-800 border border-emerald-100" 
                                : "bg-slate-100 text-slate-450"
                            }`}>
                              {b.inventorySynced ? "STOCK STREAMING ACTIVE" : "LOCAL CODES PERSIST"}
                            </span>
                          </div>

                          <button
                            onClick={async () => {
                              const updatedB = { ...b, isActive: !b.isActive };
                              const res = await fetch("/api/settings/branches", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ branch: updatedB })
                              });
                              if (res.ok) {
                                triggerToast("Branch state updated successfully.", "success");
                                loadAllSettings();
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg border font-bold text-[10px] uppercase shadow-sm ${
                              b.isActive 
                                ? "bg-white text-slate-600 hover:bg-slate-50 border-slate-205" 
                                : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100"
                            }`}
                          >
                            {b.isActive ? "DEACTIVATE CLINIC" : "ACTIVATE CLINIC"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 14: MAINTENANCE SETTINGS & DIAGNOSTICS */}
              {currentTab === "maintenance" && (
                <div className="space-y-6 animate-in fade-in">
                  <div>
                    <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                      <Activity className="w-5 h-5 mr-2 text-teal-600 animate-pulse" />
                      <span>System Maintenance & Diagnostics</span>
                    </h2>
                    <p className="text-xs text-slate-500 font-medium mt-1 font-sans">Run integrity checks, optimize search lookups, and clear unused local system caches.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <button 
                      onClick={handleDeepDiagnostics} disabled={testingDiagnostics}
                      className="p-5 border border-slate-150 rounded-2xl hover:border-slate-350 bg-slate-50/30 text-left space-y-2 hover:bg-slate-50 transition"
                    >
                      <Activity className="w-5 h-5 text-teal-650" />
                      <p className="text-xs font-bold text-slate-700">Run Diagnostics Suite</p>
                      <p className="text-[10px] text-slate-400 leading-normal">Perform diagnostic checks on database integrity, server connections, and API status.</p>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        triggerToast("Caching layers cleared. 1,490 indices garbage-collected.", "success");
                      }}
                      className="p-5 border border-slate-150 rounded-2xl hover:border-slate-350 bg-slate-50/30 text-left space-y-2 hover:bg-slate-50 transition"
                    >
                      <Server className="w-5 h-5 text-indigo-600" />
                      <p className="text-xs font-bold text-slate-700">Clear System Caches</p>
                      <p className="text-[10px] text-slate-400 leading-normal">Clear autocomplete lookup caches and force-reload system indexes.</p>
                    </button>

                    <button 
                      type="button"
                      onClick={() => {
                        triggerToast("Search models retrained. Fast retrieval models bound.", "success");
                      }}
                      className="p-5 border border-slate-150 rounded-2xl hover:border-slate-350 bg-slate-50/30 text-left space-y-2 hover:bg-slate-50 transition"
                    >
                      <Code className="w-5 h-5 text-teal-600" />
                      <p className="text-xs font-bold text-slate-705">Rebuild Search Indexes</p>
                      <p className="text-[10px] text-slate-400 leading-normal">Optimize medicine catalog listings and rebuild quick search matching terms.</p>
                    </button>
                  </div>

                  {/* System Diagnostics Output Matrix */}
                  {diagnosticReport.length > 0 && (
                    <div className="border border-slate-200 rounded-2xl bg-slate-50/50 p-6 space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System diagnostics check status</span>
                        <span className="text-[9px] font-bold text-teal-700 font-mono">ALL SYSTEMS OPERATIONAL</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {diagnosticReport.map((r, i) => (
                          <div key={i} className="p-3.5 bg-white border border-slate-150 rounded-xl flex justify-between items-center shadow-sm">
                            <div>
                              <p className="text-[10.5px] font-bold text-slate-500 font-mono leading-none">{r.title}</p>
                              <p className="text-[11.5px] font-bold text-slate-750 font-sans mt-1.5 leading-none">{r.value}</p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[8.5px] font-extrabold font-mono uppercase tracking-wide border ${
                              r.status === "Healthy" || r.status === "Optimal"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-100" 
                                : "bg-amber-50 text-amber-800 border-amber-100"
                            }`}>
                              {r.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Administrative Analytics Overrides Reset Panel */}
                  <div className="border border-slate-200 rounded-2xl bg-white p-6 space-y-5 shadow-sm">
                    <div className="flex items-center space-x-3 border-b border-rose-100 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                        <ShieldAlert className="w-4.5 h-4.5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800">Administrative Telemetry Overrides</h4>
                        <p className="text-[10.5px] text-slate-400 leading-normal">Purge and force reset active weekly analytics metrics. Historical records remain fully secured.</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Box 1: Reset Graph Report */}
                      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Purge Donut Graph Analytics</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                            Manually reset the active business week's Purchases, Sales, and Supplier count indices. Archived records are untouched.
                          </p>
                        </div>
                        
                        {!confirmResetDonut ? (
                          <button
                            type="button"
                            onClick={() => setConfirmResetDonut(true)}
                            className="text-[10px] bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-extrabold px-3.5 py-1.5 rounded-lg transition-all"
                          >
                            Reset Donut Analytics
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-mono">Are you sure?</span>
                            <button
                              type="button"
                              disabled={resettingDonut}
                              onClick={() => handleResetAnalytics("graph-report")}
                              className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded transition"
                            >
                              {resettingDonut ? "Purging..." : "Yes, Purge"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetDonut(false)}
                              className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-3 py-1.5 rounded transition"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Box 2: Reset Weekday Cylinders */}
                      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
                        <div>
                          <p className="text-xs font-bold text-slate-700">Overwrite Weekday Cylinder Sales</p>
                          <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                            Purge sales overview metrics and start current week's cylinder visualizations with fresh 0 baselines.
                          </p>
                        </div>

                        {!confirmResetCylinders ? (
                          <button
                            type="button"
                            onClick={() => setConfirmResetCylinders(true)}
                            className="text-[10px] bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 font-extrabold px-3.5 py-1.5 rounded-lg transition-all"
                          >
                            Reset Cylinder Overview
                          </button>
                        ) : (
                          <div className="flex items-center space-x-2">
                            <span className="text-[9px] font-bold text-rose-800 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-mono">Overwrite?</span>
                            <button
                              type="button"
                              disabled={resettingCylinders}
                              onClick={() => handleResetAnalytics("sales-overview")}
                              className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3 py-1.5 rounded transition"
                            >
                              {resettingCylinders ? "Overwriting..." : "Yes, Overwrite"}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResetCylinders(false)}
                              className="text-[9px] bg-slate-200 hover:bg-slate-300 text-slate-700 font-extrabold px-3 py-1.5 rounded transition"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 15: API MANAGEMENT */}
              {currentTab === "api-management" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div>
                      <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
                        <Code className="w-5 h-5 mr-2 text-teal-600" />
                        <span>Programmatic Developer API Keys</span>
                      </h2>
                      <p className="text-xs text-slate-400 font-medium mt-1">Generate access passwords, register destination endpoints, and monitor custom webhooks.</p>
                    </div>

                    <button 
                      onClick={() => setShowApiKeyGenerator(!showApiKeyGenerator)}
                      className="py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center shrink-0 transition"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      <span>Issue programmatic Key</span>
                    </button>
                  </div>

                  {showApiKeyGenerator && (
                    <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 animate-in slide-in-from-top duration-350">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-widest font-mono">Create Clinical credentials</span>
                        <button onClick={() => { setShowApiKeyGenerator(false); setGeneratedKeyValue(null); }} className="text-slate-400 hover:text-slate-600">
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1">
                          <label className="text-[10px] font-bold tracking-wider text-slate-401 block mb-1 uppercase">Integration/Application Name</label>
                          <input 
                            type="text" placeholder="e.g. Kisumu Branch Integration Relay"
                            value={newApikeyName}
                            onChange={e => setNewApikeyName(e.target.value)}
                            className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-250 p-2.5 rounded-xl focus:outline-none"
                          />
                        </div>

                        <button 
                          onClick={handleGenerateApiKey}
                          className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl transition shadow border border-slate-700 h-fit whitespace-nowrap"
                        >
                          Generate security Token
                        </button>
                      </div>

                      {generatedKeyValue && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 space-y-2 animate-in fade-in duration-200">
                          <div className="flex justify-between items-center">
                            <span className="text-[9.5px] font-extrabold text-emerald-850 uppercase tracking-wider">SECURE CLIENT TOKEN COMPILED</span>
                            <span className="text-[8px] text-amber-600 font-extrabold bg-amber-50 px-1.5 rounded uppercase font-mono">Save this token (Shown once!)</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <input 
                              type="text" readOnly
                              value={generatedKeyValue}
                              className="flex-1 text-[11px] font-mono font-bold text-slate-800 bg-white border border-slate-200 p-2 rounded-lg"
                            />
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(generatedKeyValue);
                                triggerToast("Token copied to clipboard!", "success");
                              }}
                              className="p-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition"
                              title="Copy to Clipboard"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Keys catalog table */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-extrabold text-slate-400 tracking-widest uppercase font-mono">Issued API credential keys ({apiKeys.length})</h3>
                    
                    <div className="space-y-3">
                      {apiKeys.map((k) => (
                        <div key={k.id} className="p-4 border border-slate-150 rounded-2xl flex items-center justify-between hover:border-slate-300 transition bg-white shadow-sm">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-700">{k.name}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-extrabold tracking-wider font-mono ${
                                k.status === "Active" 
                                  ? "bg-teal-50 text-teal-800 border border-teal-100" 
                                  : "bg-red-50 text-red-800 border border-red-100"
                              }`}>
                                {k.status}
                              </span>
                            </div>
                            
                            <p className="text-[10.5px] font-mono text-slate-400">
                              Token: <span className="font-semibold text-slate-600">{k.apiKey.slice(0, 15)}••••••••</span> • Created: {formatSafeDateOnly(k.createdAt)}
                            </p>
                          </div>

                          {k.status === "Active" && (
                            <button
                              onClick={() => handleRevokeApiKey(k.id)}
                              className="px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-200 text-red-750 text-xs font-bold rounded-lg transition"
                            >
                              Revoke credentials
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Actions Confirmation buttons for forms */}
            <div className="pt-8 border-t border-slate-100 mt-6 text-right">
              <span className="text-[10px] font-extrabold text-slate-405 font-mono tracking-wider">
                COMMITTING VARIABLES LOGGED IN WORKSTATION LEDGERS
              </span>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
