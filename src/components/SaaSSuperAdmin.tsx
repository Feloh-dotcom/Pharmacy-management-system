import React, { useState, useEffect } from "react";
import { 
  Users, Shield, ShieldAlert, BadgeAlert, Coins, History, FileText, 
  Search, ArrowUpRight, Slash, RefreshCw, AlertCircle, Plus, Calendar, ShieldCheck
} from "lucide-react";

interface ClientRecord {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    createdAt: string;
  };
  subscription: {
    id: string;
    userId: string;
    clientEmail: string;
    planName: string;
    status: string;
    startDate: string;
    endDate: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

interface PaymentRecord {
  id: string;
  userId: string;
  clientEmail: string;
  amount: number;
  currency: string;
  planName: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  status: string;
}

interface LicenseLog {
  id: string;
  userId: string;
  clientEmail: string;
  action: string;
  performedBy: string;
  details: string;
  createdAt: string;
}

interface SaaSSuperAdminProps {
  user: any;
}

export default function SaaSSuperAdmin({ user }: SaaSSuperAdminProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    clients: ClientRecord[];
    paymentHistory: PaymentRecord[];
    licenseAuditLogs: LicenseLog[];
  } | null>(null);

  const [activeTab, setActiveTab] = useState<"clients" | "payments" | "license-logs">("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Administrative action forms
  const [selectedClientEmail, setSelectedClientEmail] = useState("");
  const [adminActionType, setAdminActionType] = useState<"activate_client" | "extend_subscription" | "suspend_client" | "">("");
  const [extendDays, setExtendDays] = useState(30);
  const [planSelection, setPlanSelection] = useState("Monthly");
  const [actionSuccess, setActionSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchSuperAdminData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/super-admin/data?adminEmail=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const payload = await res.json();
        setData(payload);
      }
    } catch (e) {
      console.error("[SuperAdmin Data Fetch Error]", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSuperAdminData();
    }
  }, [user]);

  const handleActionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionSuccess("");
    setActionError("");
    setActionLoading(true);

    if (!selectedClientEmail || !adminActionType) {
      setActionError("Please select a target workspace client email and administrative action.");
      setActionLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/subscriptions/super-admin/action", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email
        },
        body: JSON.stringify({
          action: adminActionType,
          clientEmail: selectedClientEmail,
          extendDays: Number(extendDays),
          planName: planSelection,
          adminEmail: user.email
        })
      });

      if (res.ok) {
        setActionSuccess(`SaaS License rule [${adminActionType.toUpperCase()}] ran successfully on ${selectedClientEmail}!`);
        // Reset form
        setSelectedClientEmail("");
        setAdminActionType("");
        // Reload data silently
        fetchSuperAdminData(true);
      } else {
        const errorData = await res.json();
        setActionError(errorData.error || "Workspace parameter reject error occurred.");
      }
    } catch {
      setActionError("Failed to issue master console license command.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-2" />
        <p className="text-xs text-slate-500 font-bold font-mono">Opening Super Admin Dashboard console...</p>
      </div>
    );
  }

  const clients = data?.clients || [];
  const paymentHistory = data?.paymentHistory || [];
  const licenseAuditLogs = data?.licenseAuditLogs || [];

  // Platform Metrics calculations
  const totalClinics = clients.length;
  const activeSubs = clients.filter(c => c.subscription && c.subscription.status === "active" && new Date(c.subscription.endDate) > new Date()).length;
  const trialingSubs = clients.filter(c => c.subscription && c.subscription.status === "trial" && new Date(c.subscription.endDate) > new Date()).length;
  const suspendedCount = clients.filter(c => c.subscription && c.subscription.status === "suspended").length;
  const cumulativeRevenue = paymentHistory.reduce((sum, current) => sum + current.amount, 0);

  // Filters searchQuery
  const filteredClients = clients.filter(c => 
    c.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.subscription?.planName || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPayments = paymentHistory.filter(p => 
    p.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.transactionReference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.planName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLogs = licenseAuditLogs.filter(l => 
    l.clientEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.performedBy.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto animate-in fade-in duration-300">
      
      {/* 1. Header with metadata info */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Shield className="w-6 h-6 text-indigo-600" />
            SaaS Super Administrator Console
          </h1>
          <p className="text-xs text-slate-500 font-bold mt-1">
            License master control module: monitoring workstation nodes, extending trials, and enforcing clinical subscriptions.
          </p>
        </div>
        
        <button
          onClick={() => { setRefreshing(true); fetchSuperAdminData(true); }}
          className="self-start px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition flex items-center gap-1 font-mono uppercase"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${refreshing ? "animate-spin" : ""}`} />
          Reload Data
        </button>
      </div>

      {/* 2. Platform aggregates metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-orange-600">
            <Users className="w-6 h-6 text-orange-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Trialing Nodes</span>
            <span className="text-lg font-black text-slate-800">{trialingSubs}</span>
            <span className="text-[9px] text-slate-400 font-medium block">Out of {totalClinics} total nodes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <ShieldCheck className="w-6 h-6 text-emerald-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Paying Subscribers</span>
            <span className="text-lg font-black text-[#031d1a]">{activeSubs}</span>
            <span className="text-[9px] text-emerald-600 font-bold block">Active Billing Nodes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center text-red-600">
            <ShieldAlert className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Suspended accounts</span>
            <span className="text-lg font-black text-slate-800">{suspendedCount}</span>
            <span className="text-[9px] text-red-500 font-bold block">Access Revoked Nodes</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Coins className="w-6 h-6 text-indigo-500" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Cumulative Income (SaaS)</span>
            <span className="text-lg font-black text-indigo-700">KES {cumulativeRevenue.toLocaleString()}</span>
            <span className="text-[9px] text-indigo-500 font-bold block">Supabase Payment Logs</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 3. Main Data Tabs & Table column */}
        <div className="lg:col-span-2 space-y-4">
          
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-2">
            {/* Tab switchers */}
            <div className="flex space-x-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => { setActiveTab("clients"); setSearchQuery(""); }}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === "clients" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Clinics ({totalClinics})
              </button>
              <button
                onClick={() => { setActiveTab("payments"); setSearchQuery(""); }}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === "payments" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Invoices ({paymentHistory.length})
              </button>
              <button
                onClick={() => { setActiveTab("license-logs"); setSearchQuery(""); }}
                className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all ${
                  activeTab === "license-logs" ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Audit Feed ({licenseAuditLogs.length})
              </button>
            </div>

            {/* Quick search input */}
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3 w-4 h-4 text-slate-400 my-auto pointer-events-none" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          {activeTab === "clients" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Client Node</th>
                      <th className="py-3 px-4 font-bold">Billing Status</th>
                      <th className="py-3 px-4 font-bold font-mono">Plan / Period</th>
                      <th className="py-3 px-4 font-bold text-right">Actions Link</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 font-mono font-bold">
                          No matching clinic accounts discovered.
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => {
                        const sub = client.subscription;
                        const isExp = sub ? new Date(sub.endDate) < new Date() || sub.status === "expired" : true;
                        return (
                          <tr key={client.user.id} className="hover:bg-slate-50/50 transition duration-150">
                            <td className="py-3 px-4">
                              <span className="font-extrabold text-slate-800 block">{client.user.name || "Clinic Operator"}</span>
                              <span className="text-[10px] text-slate-400 font-mono italic block">{client.user.email}</span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full border ${
                                sub?.status === "suspended" ? "bg-red-50 border-red-200 text-red-600" :
                                isExp ? "bg-rose-50 border-rose-200 text-rose-600" :
                                sub?.status === "trial" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                "bg-emerald-50 border-emerald-250 text-emerald-700"
                              }`}>
                                {sub?.status === "suspended" ? "suspended" :
                                 isExp ? "EXPIRED" :
                                 sub?.status === "trial" ? "trial" :
                                 "active"}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-slate-700 block">{sub?.planName || "Trial"}</span>
                              <span className="text-[10px] text-slate-400 font-mono block">
                                Expiry: {sub ? new Date(sub.endDate).toLocaleDateString() : "No record"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={() => {
                                  setSelectedClientEmail(client.user.email);
                                  setAdminActionType("extend_subscription");
                                }}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-[10px] rounded-lg transition uppercase tracking-wide"
                              >
                                Modify License
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "payments" && (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4 font-bold">Client Email</th>
                      <th className="py-3 px-4 font-bold">Amount Paid</th>
                      <th className="py-3 px-4 font-bold">Gateway method</th>
                      <th className="py-3 px-4 font-bold">Ref / Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center text-slate-400 font-mono font-bold">
                          No KES platform invoice records found.
                        </td>
                      </tr>
                    ) : (
                      filteredPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 text-slate-600">
                          <td className="py-3 px-4 font-bold text-slate-700">{pay.clientEmail}</td>
                          <td className="py-3 px-4 font-black font-mono text-emerald-700">KES {pay.amount.toLocaleString()}</td>
                          <td className="py-3 px-4 font-semibold">{pay.planName} via {pay.paymentMethod}</td>
                          <td className="py-3 px-4 font-mono text-[10px]">
                            <span className="font-bold text-slate-800 block">{pay.transactionReference}</span>
                            <span className="text-[9px] text-slate-450 block">{new Date(pay.paymentDate).toLocaleDateString()}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === "license-logs" && (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredLogs.length === 0 ? (
                <div className="bg-white border border-slate-200 p-8 rounded-2xl text-center text-slate-400 font-bold text-xs">
                  License audit timeline is empty.
                </div>
              ) : (
                filteredLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-white border border-slate-200 rounded-xl flex gap-3 items-start text-xs shadow-xs">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                      <FileText className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wide">{log.action}</span>
                        <span className="text-[10px] text-indigo-600 font-mono font-bold">Target: {log.clientEmail}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-semibold">{log.details}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Command By: {log.performedBy} • {new Date(log.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

        </div>

        {/* 4. License Command Station Side Grid */}
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
              <Shield className="w-4 h-4 text-indigo-600" />
              License Action Terminal
            </h3>

            <form onSubmit={handleActionSubmit} className="space-y-4">
              {actionSuccess && (
                <div className="bg-emerald-50 border border-emerald-150 p-3 rounded-xl text-xs text-emerald-800 font-semibold">
                  {actionSuccess}
                </div>
              )}
              {actionError && (
                <div className="bg-red-50 border border-red-150 p-3 rounded-xl text-xs text-red-800 font-semibold flex gap-1 items-start">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{actionError}</span>
                </div>
              )}

              {/* Email Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Target Node Email</label>
                <select
                  required
                  value={selectedClientEmail}
                  onChange={(e) => setSelectedClientEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Choose Clinic Account --</option>
                  {clients.map(c => (
                    <option key={c.user.id} value={c.user.email}>
                      {c.user.name || "Unknown"} ({c.user.email})
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Selector */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">Administrative command</label>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdminActionType("extend_subscription")}
                    className={`py-2 px-3 border rounded-xl text-xs font-black uppercase text-left transition ${
                      adminActionType === "extend_subscription" 
                        ? "border-amber-500 bg-amber-50/20 text-amber-800" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-650"
                    }`}
                  >
                    Extend License (+Days)
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminActionType("activate_client")}
                    className={`py-2 px-3 border rounded-xl text-xs font-black uppercase text-left transition ${
                      adminActionType === "activate_client" 
                        ? "border-emerald-500 bg-emerald-50/20 text-emerald-800" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-650"
                    }`}
                  >
                    Activate / Set Plan Standard
                  </button>

                  <button
                    type="button"
                    onClick={() => setAdminActionType("suspend_client")}
                    className={`py-2 px-3 border rounded-xl text-xs font-black uppercase text-left transition ${
                      adminActionType === "suspend_client" 
                        ? "border-rose-500 bg-red-50/20 text-rose-800" 
                        : "border-slate-200 hover:bg-slate-50 text-slate-650"
                    }`}
                  >
                    Block / Suspend account
                  </button>
                </div>
              </div>

              {/* Context Action Elements */}
              {adminActionType === "extend_subscription" && (
                <div className="space-y-1.5 p-3 bg-amber-50/35 border border-amber-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-black text-amber-800 uppercase tracking-wider block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    Custom Extension Length (Days)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    required
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  />
                  <p className="text-[9px] text-amber-700/80 font-medium">Adds specific number of days onto user's current end limits or sets from today.</p>
                </div>
              )}

              {adminActionType === "activate_client" && (
                <div className="space-y-1.5 p-3 bg-emerald-50/35 border border-emerald-100 rounded-xl animate-in slide-in-from-top-2 duration-200">
                  <label className="text-[10px] font-black text-emerald-800 uppercase tracking-wider block">Target Service Plan</label>
                  <select
                    value={planSelection}
                    onChange={(e) => setPlanSelection(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    <option value="Monthly">SaaS Standard Monthly (KES 1,500)</option>
                    <option value="Quarterly">SaaS Professional Quarterly (KES 4,000)</option>
                    <option value="Annual">SaaS Enterprise Annual (KES 12,000)</option>
                  </select>
                  <p className="text-[9px] text-emerald-700/80 font-medium font-semibold">Instantly updates target status to active and sets end limits to +30 days standard.</p>
                </div>
              )}

              {adminActionType === "suspend_client" && (
                <div className="p-3 bg-red-50/50 border border-red-150 rounded-xl animate-in slide-in-from-top-2 duration-200 text-[10px] text-red-800 font-semibold space-y-1">
                  <span className="font-black uppercase tracking-wider block block-important text-red-700">🔒 Warning Alert Block</span>
                  <p>Suspending this clinic workstation node locks them out with status: suspended. Access is rejected instantly. Manual supervisor action required to restore syncing pipelines.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full py-2.5 bg-slate-900 hover:bg-slate-950 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {actionLoading ? "Executing master rule..." : "Transmit Console Command"}
              </button>
            </form>
          </div>
        </div>

      </div>

    </div>
  );
}
