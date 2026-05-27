/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Wallet, Calendar, Clock, ArrowUpRight, ArrowDownRight, 
  RefreshCw, ShieldCheck, CheckCircle2, History, CreditCard, 
  PlusCircle, AlertCircle, FileText, X, Check, Settings, ListFilter,
  Users
} from "lucide-react";
import { CashSession, CashTransaction, SystemSettings, UserRole } from "../types";
import { formatCurrency } from "../utils";

interface CashRegisterProps {
  user: { id: string; name: string; email: string; role: string; avatarUrl?: string } | null;
  settings?: SystemSettings | null;
  onNavigate: (tab: string) => void;
}

export default function CashRegister({ user, settings, onNavigate }: CashRegisterProps) {
  const [activeSession, setActiveSession] = useState<CashSession | null>(null);
  const [historySessions, setHistorySessions] = useState<CashSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Notification states
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Opening form states
  const [openingBalance, setOpeningBalance] = useState<number>(100);

  // Closing form states
  const [actualBalance, setActualBalance] = useState<number>(0);
  const [closureNote, setClosureNote] = useState<string>("");
  const [isClosingModalOpen, setIsClosingModalOpen] = useState(false);

  // Manual transaction states
  const [isManualTxnModalOpen, setIsManualTxnModalOpen] = useState(false);
  const [manualTxnType, setManualTxnType] = useState<"Cash-In" | "Cash-Out">("Cash-In");
  const [manualTxnAmount, setManualTxnAmount] = useState<number>(0);
  const [manualTxnDesc, setManualTxnDesc] = useState<string>("");

  // Detailed modal for historical sessions
  const [selectedSession, setSelectedSession] = useState<CashSession | null>(null);

  const currencySymbol = settings?.general?.currency || "Ksh.";

  // Helper roles validation
  const canOpenCloseSession = user ? [
    UserRole.ADMIN, 
    UserRole.PHARMACIST, 
    UserRole.CASHIER, 
    UserRole.ACCOUNTANT
  ].includes(user.role as any) : false;

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadRegisterState = async (isRef = false) => {
    if (isRef) setRefreshing(true);
    else setLoading(true);

    try {
      const activeRes = await fetch("/api/cash-register/active");
      if (activeRes.ok) {
        const activeData = await activeRes.json();
        setActiveSession(activeData);
        // Pre-fill actual cash closing value with the expected closing total for seamless reconciliation
        if (activeData) {
          setActualBalance(activeData.expectedClosingBalance);
        }
      }

      const historyRes = await fetch("/api/cash-register/sessions");
      if (historyRes.ok) {
        const historyData = await historyRes.json();
        setHistorySessions(historyData);
      }
    } catch (e: any) {
      console.error(e);
      showNotification("error", "Failed to synchronize cash registers with ERP storage.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRegisterState();
  }, []);

  const handleOpenSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOpenCloseSession) {
      showNotification("error", "Access Denied: Your staff role is restricted from opening business day sessions.");
      return;
    }

    if (openingBalance < 0) {
      showNotification("error", "Opening Cash float cannot be negative.");
      return;
    }

    try {
      const res = await fetch("/api/cash-register/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openingBalance,
          openedBy: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            role: user?.role
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to start business Day session");
      }

      showNotification("success", `Registered open cash drawer with starting float of ${currencySymbol}${openingBalance}`);
      loadRegisterState();
    } catch (e: any) {
      showNotification("error", e.message || "Failed to initialize cash drawer.");
    }
  };

  const handleCloseSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canOpenCloseSession) {
      showNotification("error", "Access Denied: Restricted role permissions for closing work day reconciliations.");
      return;
    }

    if (actualBalance < 0) {
      showNotification("error", "Calculated counted cash drawer cannot be less than 0.");
      return;
    }

    try {
      const res = await fetch("/api/cash-register/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualClosingBalance: actualBalance,
          note: closureNote,
          closedBy: {
            id: user?.id,
            name: user?.name,
            email: user?.email,
            role: user?.role
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to close business Day session");
      }

      const varText = data.variance > 0 ? `Overage: +${currencySymbol}${data.variance}` : data.variance < 0 ? `Shortage: ${currencySymbol}${data.variance}` : "Perfect Match!";
      showNotification("success", `Business day cash register session finalized. Variance: ${varText}`);
      setIsClosingModalOpen(false);
      setClosureNote("");
      loadRegisterState();
    } catch (e: any) {
      showNotification("error", e.message || "Failed to complete transaction balance validation.");
    }
  };

  const handleAddManualTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTxnAmount <= 0) {
      showNotification("error", "Transaction amount must be greater than zero.");
      return;
    }
    if (!manualTxnDesc.trim()) {
      showNotification("error", "Description reason is required.");
      return;
    }

    try {
      // Manual inflows/outflows are recorded as custom elements in static transactions list and posted to Finance Ledger for accounting integrity
      const recordType = manualTxnType === "Cash-In" ? "income" : "expense";
      const recordCategory = manualTxnType === "Cash-In" ? "Cash Drawer Float Refill" : "Cash Drawer Expense Payout";
      
      const payload = {
        type: recordType,
        category: recordCategory,
        amount: manualTxnAmount,
        description: `[Manual Cash Session ${manualTxnType === "Cash-In" ? "Inflow" : "Outflow"}] ${manualTxnDesc}`,
        paymentMethod: "Cash"
      };

      const res = await fetch("/api/finance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Failed to write adjustment to accounting ledger.");
      }

      showNotification("success", `Injected physical ${manualTxnType} of ${currencySymbol}${manualTxnAmount} successfully!`);
      setIsManualTxnModalOpen(false);
      setManualTxnDesc("");
      setManualTxnAmount(0);
      loadRegisterState();
    } catch (e: any) {
      showNotification("error", e.message || "Failed to perform physical float adjustments.");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 py-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Synchronizing physical cash register states...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Toast Alert Feedback */}
      {notification && (
        <div className={`fixed bottom-6 right-6 ${notification.type === "success" ? "bg-[#093530] border-teal-800 text-teal-300" : "bg-rose-950 border-rose-800 text-rose-300"} border px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce`}>
          {notification.type === "success" ? <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />}
          <span className="text-xs font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            Cash Register Ledger
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Perform opening floats, daily reconciliations, manage cash drawer shortages, and query multi-cashier audit timelines.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button 
            onClick={() => loadRegisterState(true)} 
            disabled={refreshing}
            className="flex items-center space-x-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Live Sales</span>
          </button>

          {activeSession && (
            <button 
              onClick={() => onNavigate("sales")} 
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all"
            >
              <span>POS Store Room</span>
            </button>
          )}
        </div>
      </div>

      {/* ACTIVE REGISTER VIEW OR OPEN INITIAL SESSION SCREEN */}
      {activeSession ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Dashboard Panel - Left 8 Units */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Live Session Details Header Indicator Area */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-teal-100 text-teal-800 text-[10px] font-black tracking-wider uppercase px-4 py-1.5 rounded-bl-xl border-l border-b border-teal-200 flex items-center space-x-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-teal-500 block"></span>
                <span>Active Workday</span>
              </div>

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">Active Register Session ID</p>
                  <h3 className="font-mono text-xs font-bold text-slate-800 uppercase">{activeSession.id}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-[11px] text-slate-500 font-medium">
                    <span className="inline-flex items-center"><Users className="w-3.5 h-3.5 mr-1 text-slate-400" /> Cashier: <strong className="font-semibold text-slate-700 ml-1">{activeSession.openedBy.name} ({activeSession.openedBy.role})</strong></span>
                    <span className="inline-flex items-center"><Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" /> Opened at: <strong className="font-semibold text-slate-700 ml-1">{new Date(activeSession.openedAt).toLocaleString()}</strong></span>
                  </div>
                </div>
              </div>

              {/* Core Reconcile Float Metrics Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Opening balance</span>
                  <div className="text-lg font-black font-sans text-slate-800 mt-1 font-mono">{currencySymbol}{activeSession.openingBalance.toFixed(2)}</div>
                  <span className="text-[9px] text-slate-400 italic font-medium">Starting register float</span>
                </div>

                <div className="p-4 bg-teal-50/50 border border-teal-100/40 rounded-2xl">
                  <span className="text-[10px] font-bold text-teal-800 tracking-wide uppercase">Estimated closing</span>
                  <div className="text-lg font-black font-sans text-teal-950 mt-1 font-mono">{currencySymbol}{activeSession.expectedClosingBalance.toFixed(2)}</div>
                  <span className="text-[9px] text-teal-700 italic font-semibold">Expected drawer cash</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Invoiced sales val</span>
                  <div className="text-lg font-black font-sans text-slate-800 mt-1 font-mono">{currencySymbol}{activeSession.totalSalesAmount.toFixed(2)}</div>
                  <span className="text-[9px] text-slate-400 italic font-medium">{activeSession.totalInvoicesCount} invoices registered</span>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 tracking-wide uppercase">Expenses payload</span>
                  <div className="text-lg font-black font-sans text-amber-700 mt-1 font-mono">-{currencySymbol}{activeSession.expenses.toFixed(2)}</div>
                  <span className="text-[9px] text-slate-400 italic font-medium">Total session payouts</span>
                </div>
              </div>
            </div>

            {/* Structured Financial Breakdown Dashboard Table */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase mb-5 flex items-center justify-between">
                <span>Receipts & Payments Validation</span>
                <span className="text-[10px] text-slate-400 font-mono">Dynamic reconciler</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-xs font-medium text-slate-600">
                
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 block mr-2" /> Cash Receipts:</span>
                    <strong className="font-mono text-slate-800">{currencySymbol}{activeSession.cashPayments.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-pink-500 block mr-2" /> M-Pesa Receipts:</span>
                    <strong className="font-mono text-slate-800">{currencySymbol}{activeSession.mobileMoneyPayments.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-sky-500 block mr-2" /> Card / Bank Receipts:</span>
                    <strong className="font-mono text-slate-800">{currencySymbol}{activeSession.cardPayments.toFixed(2)}</strong>
                  </div>
                </div>

                <div className="space-y-3.5">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-purple-500 block mr-2" /> Invoice Discounts Allowed:</span>
                    <strong className="font-mono text-slate-800">-{currencySymbol}{activeSession.discounts.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-red-400 block mr-2" /> Reversals / Refunds:</span>
                    <strong className="font-mono text-slate-800">-{currencySymbol}{activeSession.refunds.toFixed(2)}</strong>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-indigo-500 block mr-2" /> Expenses & Payouts:</span>
                    <strong className="font-mono text-slate-800">-{currencySymbol}{activeSession.expenses.toFixed(2)}</strong>
                  </div>
                </div>

              </div>

              {/* Dynamic expected formula indicator */}
              <div className="mt-5 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-500 leading-relaxed font-mono">
                Formula: [Expected Cash Float] = Opening ({currencySymbol}{activeSession.openingBalance.toFixed(2)}) + Cash Receipts ({currencySymbol}{activeSession.cashPayments.toFixed(2)}) - Refunds ({currencySymbol}{activeSession.refunds.toFixed(2)}) - Expenses ({currencySymbol}{activeSession.expenses.toFixed(2)}) = <strong className="text-teal-700">{currencySymbol}{activeSession.expectedClosingBalance.toFixed(2)}</strong>
              </div>
            </div>

            {/* Unified Transaction Timeline */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase flex items-center">
                  <History className="w-4 h-4 mr-2 text-teal-600" />
                  <span>Session Audit Timeline</span>
                </h3>
                <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                  {activeSession.transactions.length} matches
                </span>
              </div>

              {activeSession.transactions.length === 0 ? (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-3xl text-center text-slate-400 font-bold text-xs select-none">
                  No sales, refunds, or expenses registered in this work session so far.
                </div>
              ) : (
                <div className="space-y-4.5 max-h-[350px] overflow-y-auto pr-1">
                  {activeSession.transactions.map((txn, idx) => {
                    const isExpense = txn.type === "Expense" || txn.type === "Refund" || txn.type === "Cash-Out";
                    const isSale = txn.type === "Sale" || txn.type === "Cash-In";
                    
                    return (
                      <div key={txn.id || idx} className="flex items-start justify-between p-3 border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 rounded-2xl transition duration-150">
                        <div className="flex items-start space-x-3">
                          <div className={`mt-0.5 w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${isExpense ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"}`}>
                            {isExpense ? <ArrowDownRight className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                          </div>
                          <div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${isExpense ? "bg-rose-50 text-rose-700" : "bg-emerald-50 text-emerald-700"}`}>
                              {txn.type}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 mt-1">{txn.description}</h4>
                            <p className="text-[10px] text-slate-400 font-medium font-sans mt-0.5">
                              {new Date(txn.timestamp).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              <span className="mx-2">•</span>{txn.userEmail}
                              {txn.paymentMethod && <><span className="mx-2">•</span>Paid via {txn.paymentMethod}</>}
                            </p>
                          </div>
                        </div>

                        <span className={`text-xs font-bold font-mono ${isExpense ? "text-rose-600" : "text-emerald-600"}`}>
                          {isExpense ? "-" : "+"}{currencySymbol}{txn.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Quick Actions Panel - Right 4 Units */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Quick reconciliation Action Drawer Cards */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase block">
                Drawer Operations
              </h3>

              {/* Adjust float button */}
              <button
                onClick={() => setIsManualTxnModalOpen(true)}
                className="w-full flex items-center justify-center space-x-2 py-2.5 bg-slate-50 hover:bg-[#093530] hover:text-teal-300 text-slate-600 font-bold text-xs rounded-xl border border-slate-200 hover:border-transparent transition-all duration-200 cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Adjust Cash Float</span>
              </button>

              <div className="border-t border-dashed border-slate-100 pt-5">
                <p className="text-[11px] font-semibold text-slate-400 leading-normal mb-3">
                  Ready to reconcile active cash totals and conclude your shift operations?
                </p>
                
                <button
                  onClick={() => {
                    setActualBalance(activeSession.expectedClosingBalance);
                    setIsClosingModalOpen(true);
                  }}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 font-bold text-xs text-white rounded-xl shadow-md cursor-pointer transition-all flex items-center justify-center space-x-2"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Close Register Session</span>
                </button>
              </div>
            </div>

            {/* Quick Security Badge */}
            <div className="bg-[#093530] border border-teal-800 text-teal-300 rounded-3xl p-6 relative overflow-hidden">
              <ShieldCheck className="w-12 h-12 text-teal-500 opacity-20 absolute -right-2 -bottom-2" />
              <h4 className="text-xs font-bold text-teal-400 flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1.5" />
                <span>Security Shield Active</span>
              </h4>
              <p className="text-[11px] leading-normal font-semibold text-teal-200 mt-2">
                All daily checkouts, payment channel collections, invoice voids, and drawer float reconciliations are digitally signed under your active cashier certificate.
              </p>
            </div>

          </div>

        </div>
      ) : (
        /* LOCK SCREEN (NO ACTIVE CASHIER SESSION OPENED) */
        <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-500 text-2xl mx-auto shadow-inner animate-pulse">
            🔒
          </div>
          
          <div className="space-y-2">
            <h3 className="font-sans font-bold text-lg text-slate-800">
              Cash Drawer Register is Locked
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              No active register work session is currently running for this workstation. You must initialize an opening physical cash float to disburse invoices or start processing POS checks.
            </p>
          </div>

          <form onSubmit={handleOpenSession} className="border-t border-slate-100 pt-6 text-left max-w-sm mx-auto space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-1">
                Enter Register Opening Float ({currencySymbol})
              </label>
              <div className="relative">
                <span className="font-mono text-slate-400 text-xs font-bold absolute left-3 top-1/2 -translate-y-1/2 select-none">
                  {currencySymbol}
                </span>
                <input
                  type="number"
                  min="0"
                  value={openingBalance}
                  onChange={(e) => setOpeningBalance(Number(e.target.value))}
                  placeholder="100.00"
                  className="w-full pl-8 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-700 tracking-wider focus:outline-none focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
              <p className="text-[10px] text-slate-400 italic mt-1.5 px-0.5 font-medium leading-normal">
                Standard opening float configuration includes drawer float cash coins for client change.
              </p>
            </div>

            <button
              id="btn-open-session"
              type="submit"
              className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-1 cursor-pointer"
            >
              <span>Initialize & Start Shift</span>
            </button>
          </form>
        </div>
      )}

      {/* COMPREHENSIVE HISTORICAL TIMELINE TABLE (AUDIT REPORT) */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xs font-bold text-slate-800 tracking-wider uppercase">
              Historical Register Audits
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">shift transactions log, expected vs counted, and variances auditor.</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-bold text-slate-400 inline-flex items-center px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-lg">
              <History className="w-3.5 h-3.5 mr-1" /> Total Records: {historySessions.length}
            </span>
          </div>
        </div>

        {historySessions.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            No concluded cash sessions detected in archived registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-3 px-4">Opened By</th>
                  <th className="py-3 px-4">Status & Schedule</th>
                  <th className="py-3 px-4 text-right">Opening Float</th>
                  <th className="py-3 px-4 text-right">Expected Drawer</th>
                  <th className="py-3 px-4 text-right">Counted Cash</th>
                  <th className="py-3 px-4 text-center">Variance</th>
                  <th className="py-3 px-4">Concluded Notes</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historySessions.map((session) => {
                  const hasVariance = session.status === "Closed" && session.variance !== undefined;
                  const isOverage = hasVariance && session.variance! > 0;
                  const isShortage = hasVariance && session.variance! < 0;
                  
                  return (
                    <tr key={session.id} className="hover:bg-slate-50/50 text-slate-600 font-medium text-xs transition duration-150">
                      <td className="py-4 px-4 font-bold text-slate-800">
                        <div className="flex items-center space-x-2">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black ${session.status === "Open" ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-600"}`}>
                            {session.openedBy.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div>{session.openedBy.name}</div>
                            <div className="text-[9.5px] font-semibold text-slate-400 uppercase tracking-wide">{session.openedBy.role}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex items-center space-x-1.5 mb-1">
                          <span className={`w-2 h-2 rounded-full block ${session.status === "Open" ? "bg-teal-500 animate-pulse" : "bg-slate-400"}`} />
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${session.status === "Open" ? "bg-teal-50 text-teal-700" : "bg-slate-100 font-medium text-slate-600"}`}>
                            {session.status}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          <p>Start: {new Date(session.openedAt).toLocaleString()}</p>
                          {session.closedAt && <p>End: {new Date(session.closedAt).toLocaleString()}</p>}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-700 font-mono">
                        {currencySymbol}{session.openingBalance.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-bold text-slate-700 font-mono">
                        {currencySymbol}{session.expectedClosingBalance.toFixed(2)}
                      </td>

                      <td className="py-4 px-4 text-right font-black text-slate-700 font-mono">
                        {session.status === "Closed" && session.actualClosingBalance !== undefined ? (
                          `${currencySymbol}${session.actualClosingBalance.toFixed(2)}`
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400 italic">Unconcluded</span>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {session.status === "Open" ? (
                            <span className="text-[10px] font-bold text-teal-600 italic">Streaming...</span>
                          ) : (
                            <span className={`text-[10.5px] font-bold px-2 py-0.5 rounded-full ${isOverage ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : isShortage ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-slate-100 text-slate-600"}`}>
                              {session.variance === 0 ? "Matched" : session.variance! > 0 ? `+${currencySymbol}${session.variance}` : `${currencySymbol}${session.variance}`}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-sm">
                        <p className="truncate text-[11px] font-medium text-slate-500" title={session.note}>
                          {session.note || <span className="text-slate-300 italic">No notes</span>}
                        </p>
                        {session.closedBy && (
                          <p className="text-[9.5px] font-semibold text-slate-400 tracking-normal mt-0.5 block">
                            Reconciler: {session.closedBy.name}
                          </p>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <button 
                          onClick={() => setSelectedSession(session)}
                          className="px-2.5 py-1 text-[11px] font-bold text-teal-600 hover:text-white bg-teal-50 hover:bg-[#093530] rounded-lg border border-teal-200 hover:border-transparent transition-all"
                        >
                          Audit Report
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: REGISTER CLOSING RECONCILIATION */}
      {isClosingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-sans font-bold text-slate-800 flex items-center">
                <ShieldCheck className="w-5 h-5 text-teal-600 mr-2" />
                <span>Reconcile & Close Cash Shift</span>
              </h3>
              <button 
                onClick={() => setIsClosingModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCloseSession} className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Dynamic expected review */}
              <div className="p-4 bg-teal-50/50 border border-teal-100/40 rounded-2xl flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold uppercase text-teal-800 tracking-wide">Expected cash sum</p>
                  <p className="text-[9.5px] font-medium text-teal-700 leading-normal mt-0.5">Calculated by formula float + checkouts</p>
                </div>
                <div className="font-sans font-black text-xl text-teal-900 font-mono">
                  {currencySymbol}{activeSession?.expectedClosingBalance.toFixed(2)}
                </div>
              </div>

              {/* Enter actual counted value */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                  Enter counted cash in Drawer ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-xs font-black text-slate-400 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actualBalance}
                    onChange={(e) => setActualBalance(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-800 tracking-wider focus:outline-none focus:ring-1 focus:ring-teal-500"
                    required
                  />
                </div>
              </div>

              {/* Variance calculator inline */}
              {activeSession && (
                <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between text-xs font-bold font-sans">
                  <span className="text-slate-500">Calculated Variance portion:</span>
                  {(() => {
                    const variance = Number((actualBalance - activeSession.expectedClosingBalance).toFixed(2));
                    const isMatched = variance === 0;
                    const isOverage = variance > 0;
                    return (
                      <span className={`font-mono ${isMatched ? "text-slate-600" : isOverage ? "text-emerald-600" : "text-rose-600"}`}>
                        {isMatched ? "DRAWER MATCHED" : isOverage ? `+$${variance.toFixed(2)} (OVERAGE)` : `-$${Math.abs(variance).toFixed(2)} (SHORTAGE)`}
                      </span>
                    );
                  })()}
                </div>
              )}

              {/* Note input */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                  Audit reconciliation note & explanation
                </label>
                <textarea
                  value={closureNote}
                  onChange={(e) => setClosureNote(e.target.value)}
                  rows={2}
                  maxLength={250}
                  placeholder="e.g. shift concluded. Counted drawer matches perfect. $1.50 change payout adjust logged..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClosingModalOpen(false)}
                  className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Audit Reconciliation & Close
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL CASH ADJUSTMENT */}
      {isManualTxnModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-sans font-bold text-slate-800 flex items-center">
                <PlusCircle className="w-5 h-5 text-teal-600 mr-2" />
                <span>Adjust Drawer Float</span>
              </h3>
              <button 
                onClick={() => setIsManualTxnModalOpen(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddManualTransaction} className="p-6 space-y-5">
              
              {/* Type toggle check-in or payroll */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Adjustment category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setManualTxnType("Cash-In")}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center flex items-center justify-center space-x-1.5 ${
                      manualTxnType === "Cash-In"
                        ? "bg-[#093530] text-teal-300 border-transparent shadow shadow-teal-900/40"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Cash-In (Inflow)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setManualTxnType("Cash-Out")}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center flex items-center justify-center space-x-1.5 ${
                      manualTxnType === "Cash-Out"
                        ? "bg-rose-950 text-rose-300 border-transparent shadow shadow-rose-900/45"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                    <span>Cash-Out (Outflow)</span>
                  </button>
                </div>
              </div>

              {/* Amount field */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                  Enter transfer amount ({currencySymbol})
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs font-bold text-slate-400 select-none">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={manualTxnAmount}
                    onChange={(e) => setManualTxnAmount(Number(e.target.value))}
                    className="w-full pl-7 pr-4 py-2 bg-slate-50 rounded-xl border border-slate-200 text-xs font-bold font-mono text-slate-700 tracking-wider focus:outline-none"
                    required
                  />
                </div>
              </div>

              {/* Description explanation */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block px-0.5">
                  Adjustment reason and details
                </label>
                <input
                  type="text"
                  maxLength={100}
                  value={manualTxnDesc}
                  onChange={(e) => setManualTxnDesc(e.target.value)}
                  placeholder="e.g. Added minor coin rolls cache, paid coffee change payout..."
                  className="w-full px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  required
                />
              </div>

              {/* Actions */}
              <div className="flex space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsManualTxnModalOpen(false)}
                  className="flex-1 py-1.5 border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-1.5 bg-[#093530] text-teal-300 hover:bg-teal-950 font-bold text-xs rounded-xl shadow-md"
                >
                  Adjust drawer float
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* DETAILED AUDIT DIALOG: HISTORICAL REPORT POPUP */}
      {selectedSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-250 max-h-[85vh] flex flex-col">
            
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-sans font-bold text-slate-800 flex items-center">
                <FileText className="w-5 h-5 text-teal-600 mr-2" />
                <span>Session Concluded Report Snapshot</span>
              </h3>
              <button 
                onClick={() => setSelectedSession(null)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs font-medium text-slate-600 leading-normal">
              
              {/* Cashier profile block */}
              <div className="grid grid-cols-2 gap-4 uppercase font-bold text-[10px] text-slate-400 border-b border-slate-100 pb-4">
                <div>
                  <p>Register Shift ID: <span className="font-mono text-slate-800">{selectedSession.id}</span></p>
                  <p className="mt-1">Scheduled status: <span className="text-teal-700 font-extrabold">{selectedSession.status}</span></p>
                </div>
                <div className="text-right">
                  <p>Opened by cashier: <span className="text-slate-800">{selectedSession.openedBy.name}</span></p>
                  {selectedSession.closedBy && <p className="mt-1">Final reconciler: <span className="text-slate-800">{selectedSession.closedBy.name}</span></p>}
                </div>
              </div>

              {/* Core numbers widget */}
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Opening Floats</p>
                  <div className="text-lg font-black font-mono text-slate-800 mt-1">{currencySymbol}{selectedSession.openingBalance.toFixed(2)}</div>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                  <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Expected total drawer</p>
                  <div className="text-lg font-black font-mono text-slate-800 mt-1">{currencySymbol}{selectedSession.expectedClosingBalance.toFixed(2)}</div>
                </div>
                <div className="p-3.5 bg-teal-50/50 border border-teal-100/35 rounded-2xl">
                  <p className="text-[10px] font-bold text-teal-800 tracking-wider uppercase">Counted physical cash</p>
                  <div className="text-lg font-black font-mono text-teal-950 mt-1">
                    {selectedSession.actualClosingBalance !== undefined ? `${currencySymbol}${selectedSession.actualClosingBalance.toFixed(2)}` : "Streaming..."}
                  </div>
                </div>
              </div>

              {/* Cash ledger specs breakdown list */}
              <div className="space-y-2 border-t border-b border-slate-100 py-4 font-mono text-[11px]">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Sales Invoiced:</span>
                  <span className="text-slate-800 font-bold">{currencySymbol}{selectedSession.totalSalesAmount.toFixed(2)} ({selectedSession.totalInvoicesCount} records)</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Reconciled Cash Collections:</span>
                  <span className="text-slate-800 font-bold">+{currencySymbol}{selectedSession.cashPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Reconciled Mobile Money payments:</span>
                  <span className="text-slate-800 font-semibold">{currencySymbol}{selectedSession.mobileMoneyPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Reconciled Bank/Card payments:</span>
                  <span className="text-slate-800 font-semibold">{currencySymbol}{selectedSession.cardPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Rebate Discounts Allowed:</span>
                  <span className="text-slate-800">-{currencySymbol}{selectedSession.discounts.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Voids / Cash Reversals:</span>
                  <span className="text-rose-600">-{currencySymbol}{selectedSession.refunds.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Concluded Expense Outflows:</span>
                  <span className="text-rose-600">-{currencySymbol}{selectedSession.expenses.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#093530] border-t border-dashed border-slate-200 pt-2.5 mt-2">
                  <span>Reconciled variance outcome:</span>
                  <span className={`${selectedSession.variance === 0 ? "text-slate-700" : selectedSession.variance! > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                    {selectedSession.variance === 0 ? "Drawer Matched PERFECT" : selectedSession.variance! > 0 ? `+${currencySymbol}${selectedSession.variance} (Overage)` : `${currencySymbol}${selectedSession.variance} (Shortage)`}
                  </span>
                </div>
              </div>

              {/* Session timeline log inside historical view */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">Session Journals timeline ({selectedSession.transactions.length} entries)</h4>
                
                {selectedSession.transactions.length === 0 ? (
                  <p className="text-slate-400 italic font-medium">No recorded journal logs inside this shift.</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto border border-slate-100 rounded-2xl bg-slate-50/50 p-2 text-[10.5px]">
                    {selectedSession.transactions.map((txn, idx) => (
                      <div key={txn.id || idx} className="flex justify-between p-2 border-b border-slate-100 last:border-b-0 font-sans">
                        <div>
                          <strong className="text-slate-700">[{txn.type}]</strong> {txn.description}
                          <p className="text-[9px] text-slate-400 pt-0.5">{new Date(txn.timestamp).toLocaleString()}</p>
                        </div>
                        <span className="font-mono font-bold text-slate-700">{currencySymbol}{txn.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Conclude note snapshot */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wide">Shift closure notes & auditing trail declarations</span>
                <p className="text-slate-600 text-[11px] italic mt-1.5 leading-relaxed">
                  {selectedSession.note || "No custom closure notes logged with this reconciliation."}
                </p>
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end shrink-0 bg-slate-50">
              <button 
                onClick={() => setSelectedSession(null)}
                className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-xl"
              >
                Close Report
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
