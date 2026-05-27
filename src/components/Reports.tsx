/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  FileSpreadsheet, Download, RefreshCw, BarChart3, AlertTriangle, ShieldCheck, 
  Search, Pill, TrendingDown, DollarSign, Calendar
} from "lucide-react";
import { Medicine, Category, SystemSettings } from "../types";
import { getDaysToExpiry, getExpiryStatus, formatSafeDateOnly, formatCurrency } from "../utils";

interface ReportsProps {
  settings?: SystemSettings | null;
}

export default function Reports({ settings }: ReportsProps) {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Data State
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // Expiry Report List interactive states
  const [searchTerm, setSearchTerm] = useState("");
  const [expiryTab, setExpiryTab] = useState<"all" | "expired" | "near">("all");

  const currencySymbol = settings?.general?.currency || "Ksh.";
  const warningDays = settings?.inventory?.expiryWarningPeriodDays || 45;

  const loadData = async () => {
    try {
      setDataLoading(true);
      const [medsRes, catsRes, supsRes] = await Promise.all([
        fetch("/api/medicines"),
        fetch("/api/categories"),
        fetch("/api/suppliers").catch(() => null)
      ]);

      if (medsRes && medsRes.ok) {
        setMedicines(await medsRes.json());
      }
      if (catsRes && catsRes.ok) {
        setCategories(await catsRes.json());
      }
      if (supsRes && supsRes.ok) {
        setSuppliers(await supsRes.json());
      }
    } catch (e) {
      console.error("Failed to load records in Reports page:", e);
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Expiry download generating expanded CSV with loss estimations
  const handleDownload = async (reportType: string) => {
    setLoadingReport(reportType);
    setSuccessMsg(null);

    let filename = "";
    let csvContent = "data:text/csv;charset=utf-8,";

    try {
      if (reportType === "expiry") {
        filename = "Expiry_Audit_Report.csv";
        csvContent += "SKU,Product Name,Generic,Batch,Category,Expiry_Date,Remaining_Days,Stock_Qty,Buying_Price,Selling_Price,Financial_Loss_Risk,Supplier\n";
        
        medicines.forEach((m: any) => {
          const daysLeft = getDaysToExpiry(m.expiryDate);
          const cat = categories.find(c => c.id === m.categoryId)?.name || "N/A";
          const sup = suppliers.find(s => s.id === m.supplierId)?.name || "N/A";
          const singleLoss = m.buyingPrice * m.quantity;
          const statusDesc = daysLeft <= 0 ? "EXPIRED" : `Expires in ${daysLeft} days`;

          csvContent += `"${m.SKU}","${m.name}","${m.genericName}","${m.batchNumber || "N/A"}","${cat}","${m.expiryDate}",${daysLeft},${m.quantity},${m.buyingPrice},${m.sellingPrice},${singleLoss},"${sup}"\n`;
        });
      } else if (reportType === "sales") {
        filename = "POS_Sales_Disbursement_Report.csv";
        const res = await fetch("/api/sales");
        const list = await res.json();

        csvContent += "Invoice_No,Customer_Name,Payment_Channel,Tax_VAT,Total_Settlement,Date\n";
        list.forEach((s: any) => {
          csvContent += `"${s.invoiceNumber}","${s.customerName}","${s.paymentMethod}",${s.taxAmount},${s.totalPrice},"${s.date}"\n`;
        });
      } else {
        filename = "Profit_And_Loss_Statement.csv";
        const res = await fetch("/api/finance/records");
        const list = await res.json();

        csvContent += "Cashflow_ID,Record_Type,Category_Group,Summary_Notes,Settle_Amount,Disburse_Date\n";
        list.forEach((f: any) => {
          csvContent += `"${f.id}","${f.type}","${f.category}","${f.description}",${f.amount},"${f.date}"\n`;
        });
      }

      setTimeout(() => {
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setSuccessMsg(`${filename} compiled and downloaded successfully!`);
        setLoadingReport(null);
        setTimeout(() => setSuccessMsg(null), 4000);
      }, 1000);

    } catch (e) {
      console.error(e);
      setLoadingReport(null);
    }
  };

  // Live Metric Allocations
  const expiredMedsList = medicines.filter(m => getDaysToExpiry(m.expiryDate) <= 0);
  const nearExpiryMedsList = medicines.filter(m => {
    const days = getDaysToExpiry(m.expiryDate);
    return days > 0 && days <= warningDays;
  });

  const totalExpiredLoss = expiredMedsList.reduce((sum, item) => sum + ((item.buyingPrice || item.sellingPrice * 0.7) * item.quantity), 0);
  const totalNearExpiryRisk = nearExpiryMedsList.reduce((sum, item) => sum + ((item.buyingPrice || item.sellingPrice * 0.7) * item.quantity), 0);

  // Filter medicines for interactive display
  const targetExpiryList = medicines.filter(m => {
    const days = getDaysToExpiry(m.expiryDate);
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.batchNumber && m.batchNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.SKU.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (expiryTab === "expired") return days <= 0;
    if (expiryTab === "near") return days > 0 && days <= warningDays;
    
    // For 'all' tab, we focus on expired or nearing expiry warning
    return days <= warningDays;
  });

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      <div>
        <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Analytical Reports Suite</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Compile real-time operational inventories, extract spreadsheet audits, and review regulatory compliances.</p>
      </div>

      {successMsg && (
        <div id="reports-toast-success" className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold p-4 rounded-2xl flex items-center space-x-2.5 shadow-sm">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reports Directory cards list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Expiry Audit Report */}
        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Warehouse Expiry & Markdown Audit</h3>
            <p className="text-[10.5px] text-slate-400 leading-normal">
              Extracts the list of drug formulations near clinical expiration windows, enabling markdown and replacement logistics planning.
            </p>
          </div>

          <button
            onClick={() => handleDownload("expiry")}
            disabled={loadingReport !== null}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
          >
            {loadingReport === "expiry" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download Expiry Spreadsheet</span>
          </button>
        </div>

        {/* Card 2: Sales Ledger Report */}
        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">POS Sales Disbursement Log</h3>
            <p className="text-[10.5px] text-slate-400 leading-normal">
              Lists daily cashier records, payment channels (M-Pesa, card, cash), customer accounts references, and cumulative VAT tax assessments.
            </p>
          </div>

          <button
            onClick={() => handleDownload("sales")}
            disabled={loadingReport !== null}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
          >
            {loadingReport === "sales" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download Sales Spreadsheet</span>
          </button>
        </div>

        {/* Card 3: Cashflow ledger Report */}
        <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Profit & Loss operating Sheet</h3>
            <p className="text-[10.5px] text-slate-400 leading-normal">
              Audits general ledger records including customer sales incomes against supplier buying expenses and warehouse operational utilities overhead.
            </p>
          </div>

          <button
            onClick={() => handleDownload("finance")}
            disabled={loadingReport !== null}
            className="w-full py-2 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 text-slate-600 font-bold text-[11px] rounded-xl flex items-center justify-center space-x-1 border border-slate-200 cursor-pointer"
          >
            {loadingReport === "finance" ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>Download Finance Spreadsheet</span>
          </button>
        </div>

      </div>

      {/* DRUG EXPIRY & FINANCIAL LOSS RISK MANAGEMENT */}
      <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-rose-500" />
              <span>Drug Expiry Risk & Loss Analytics</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">Estimations of procurement financial loss from expired warehouse inventory and soon-expiring clinical formulas.</p>
          </div>
          <div className="text-xs font-bold text-slate-500 flex items-center space-x-2">
            <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200">
              Active Warning Window: <strong className="text-teal-700 font-mono">{warningDays} Days</strong>
            </span>
          </div>
        </div>

        {/* Grid summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-rose-50/60 border border-rose-100 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-3 bg-rose-100/80 rounded-lg text-rose-600 shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Expired Financial Loss</p>
              <p className="text-lg font-black text-rose-800 font-mono mt-0.5">{formatCurrency(totalExpiredLoss, currencySymbol)}</p>
              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">{expiredMedsList.length} items cataloged expired</p>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-3 bg-amber-100/80 rounded-lg text-amber-600 shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Near-Expiry Financial Risk</p>
              <p className="text-lg font-black text-amber-800 font-mono mt-0.5">{formatCurrency(totalNearExpiryRisk, currencySymbol)}</p>
              <p className="text-[9.5px] text-slate-400 font-bold mt-0.5">{nearExpiryMedsList.length} items retiring in {warningDays} days</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-3 bg-slate-150 rounded-lg text-slate-600 shrink-0">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-smaller">Pass-Expired Batches</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{expiredMedsList.length} Flagged</p>
              <p className="text-[9.5px] text-rose-500 font-mono font-bold mt-0.5">Sale Disabled Automatically</p>
            </div>
          </div>

          <div className="bg-[#093530]/5 border border-teal-100 p-4 rounded-xl flex items-center space-x-3">
            <div className="p-3 bg-[#093530]/10 rounded-lg text-teal-700 shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Total Warehouse Inventory</p>
              <p className="text-base font-bold text-slate-800 mt-0.5">{medicines.length} Cataloged</p>
              <p className="text-[9.5px] text-teal-600 font-bold mt-0.5">All monitored in real time</p>
            </div>
          </div>
        </div>

        {/* Filter controls and Search */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-slate-100 pt-5">
          <div className="flex bg-slate-100 p-1 rounded-xl space-x-1 shrink-0">
            <button
              onClick={() => setExpiryTab("all")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${expiryTab === "all" ? "bg-white text-slate-800 shadow-sm" : "text-slate-405 text-slate-500 hover:text-slate-800"}`}
            >
              All Warnings ({medicines.filter(m => getDaysToExpiry(m.expiryDate) <= warningDays).length})
            </button>
            <button
              onClick={() => setExpiryTab("expired")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${expiryTab === "expired" ? "bg-rose-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Expired ({expiredMedsList.length})
            </button>
            <button
              onClick={() => setExpiryTab("near")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg cursor-pointer ${expiryTab === "near" ? "bg-amber-500 text-white shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Nearing Expiry ({nearExpiryMedsList.length})
            </button>
          </div>

          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by SKU, name, or batch..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full text-xs font-bold pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-xl focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Table of monitored drugs */}
        {dataLoading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw className="w-6 h-6 animate-spin text-teal-600" />
            <span className="text-xs font-bold text-slate-500 ml-2">Assembling clinical safety database...</span>
          </div>
        ) : targetExpiryList.length === 0 ? (
          <div className="text-center py-8 border border-dashed border-slate-250 rounded-2xl bg-slate-50/50">
            <p className="text-xs font-bold text-slate-400">No active products match selected filter</p>
            <p className="text-[10px] text-slate-400 mt-1">Excellent! No matching medicine inventory violates safety dates or falls in warning ranges of the system.</p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-150 rounded-2xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-150 select-none">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Drug / Formulation Product</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch & SKU</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expiry Date</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Remaining Days</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Stock (Cost Value)</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Supplier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {targetExpiryList.map((med) => {
                  const daysLeft = getDaysToExpiry(med.expiryDate);
                  const isExpired = daysLeft <= 0;
                  const catName = categories.find(c => c.id === med.categoryId)?.name || "Clinical Group";
                  const supObj = suppliers.find(s => s.id === med.supplierId);
                  const supplierName = supObj ? supObj.name : "N/A Corporation";
                  
                  return (
                    <tr key={med.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-extrabold text-slate-800 leading-none">{med.name}</p>
                        <p className="text-[10px] text-slate-400 mt-1 leading-none italic font-medium">{med.genericName}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-[10.5px] font-bold font-mono text-slate-600 block leading-none">{med.batchNumber || "NO-BATCH"}</span>
                        <span className="text-[9px] text-slate-400 font-mono mt-1 block leading-none">{med.SKU}</span>
                      </td>
                      <td className="px-4 py-3.5 select-none">
                        <span className="text-[9px] font-bold bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md text-slate-600">
                          {catName}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className={`text-[10.5px] font-bold font-mono ${isExpired ? "text-rose-600 line-through" : "text-slate-700"}`}>
                          {formatSafeDateOnly(med.expiryDate)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 select-none">
                        {isExpired ? (
                          <span className="inline-flex items-center text-[9px] font-black text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                            Expired {-daysLeft} days ago
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[9px] font-black text-amber-705 text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                            Expires in {daysLeft} days
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-bold text-slate-700 font-mono block leading-none">{med.quantity} boxes</span>
                        <span className="text-[9.5px] text-slate-400 mt-1 block leading-none font-semibold">
                          ({formatCurrency(med.buyingPrice * med.quantity, currencySymbol)})
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-slate-550 text-xs font-medium">
                        {supplierName}
                        {supObj?.email && (
                          <span className="block text-[9.5px] font-mono text-slate-400 font-normal mt-0.5">{supObj.email}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
