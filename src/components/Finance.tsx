/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { DollarSign, ArrowUpRight, ArrowDownRight, TrendingUp, Plus, Clipboard, RefreshCw } from "lucide-react";
import { FinanceRecord, SystemSettings } from "../types";
import { formatSafeDateTime, formatCurrency } from "../utils";
import { Input, CurrencyInput, Textarea } from "./FormInputs";

interface FinanceProps {
  settings?: SystemSettings | null;
}

export default function Finance({ settings }: FinanceProps) {
  const [records, setRecords] = useState<FinanceRecord[]>([]);
  const currencySymbol = settings?.general?.currency || "Ksh.";
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [type, setType] = useState<"Income" | "Expense">("Expense");
  const [category, setCategory] = useState("Warehouse Utility");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const loadFinanceData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/finance/records");
      const list = await res.json();
      setRecords(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinanceData();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!amount || !category) return;

    const payload = {
      type, amount: Number(amount), category, description,
      date: new Date().toISOString()
    };

    try {
      const res = await fetch("/api/finance/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setAmount("");
        setDescription("");
        loadFinanceData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculations
  const totalIncome = records.filter(r => r.type === "Income").reduce((sum, r) => sum + r.amount, 0);
  const totalExpense = records.filter(r => r.type === "Expense").reduce((sum, r) => sum + r.amount, 0);
  const netEarnings = totalIncome - totalExpense;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Enterprise Ledger & Finance</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Audit cashflows logs, examine operating variables, and file corporate disbursements reports.</p>
        </div>

        <button
          onClick={() => {
            setType("Expense");
            setCategory("Operational Expense");
            setShowModal(true);
          }}
          className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Record Custom Entry</span>
        </button>
      </div>

      {/* KPI Cards summary strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Income Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Gross Income Sales</span>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-1">{currencySymbol}{totalIncome.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>

        {/* Expense Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Operating Expenditures</span>
            <h4 className="text-xl font-black text-slate-800 font-mono mt-1">{currencySymbol}{totalExpense.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
            <ArrowDownRight className="w-5 h-5" />
          </div>
        </div>

        {/* Net Profit Card */}
        <div className="bg-[#093530] rounded-2xl p-5 flex items-center justify-between text-teal-300">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-teal-400/80 font-mono">Secured Net Profits</span>
            <h4 className="text-xl font-black text-white font-mono mt-1">{currencySymbol}{netEarnings.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-900/50 text-teal-300 flex items-center justify-center">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Cashflow records list table */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Consolidated Financial Cashflow Rows</h2>
          <button onClick={loadFinanceData} className="p-1 rounded text-slate-400 hover:text-slate-600 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <p className="text-center py-6 text-xs text-slate-400 font-semibold animate-pulse">Loading cash ledger values...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-semibold text-slate-600">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-400 font-black text-[10.5px] uppercase tracking-wider">
                  <th className="py-2.5 px-4">Transaction ID</th>
                  <th className="py-2.5 px-4">Ledger Type</th>
                  <th className="py-2.5 px-4">Classification group</th>
                  <th className="py-2.5 px-4">Description Ledger</th>
                  <th className="py-2.5 px-4 text-right">Settled Amount</th>
                  <th className="py-2.5 px-4 text-right pr-6">Disbursed Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(rec => {
                  const isInc = rec.type === "Income";
                  return (
                    <tr key={rec.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-bold text-slate-450">{rec.id}</td>
                      <td className="py-3 px-4">
                        <span className={`text-[9.5px] uppercase font-black px-2 py-0.5 rounded-lg border ${
                          isInc ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}>
                          {rec.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{rec.category}</td>
                      <td className="py-3 px-4 italic text-slate-450">{rec.description || "N/A"}</td>
                      <td className={`py-3 px-4 text-right font-mono font-bold ${isInc ? "text-emerald-700" : "text-rose-700"}`}>
                        {isInc ? "+" : "-"}{currencySymbol}{rec.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400 pr-6 font-mono font-medium">
                        {formatSafeDateTime(rec.date)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-sans font-bold text-slate-800">Record Ledger Entry</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full text-slate-400 hover:text-slate-600 transition">
                <span className="text-xl font-bold">×</span>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">Entry Type</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["Income", "Expense"] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`py-2 text-xs font-bold rounded-xl border transition ${
                        type === t 
                          ? "bg-[#093530] text-teal-300 border-transparent" 
                          : "bg-slate-50 text-slate-650 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Input
                label="Classification group"
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Laboratory rent or Copay sales"
              />

              <CurrencyInput
                label="Entry Cost"
                currency={currencySymbol}
                type="number"
                step="0.01"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />

              <Textarea
                label="Summary Notes"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add context..."
                rows={2}
              />

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-610 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer block mt-4 border-none"
              >
                Insert Ledger Entry
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
