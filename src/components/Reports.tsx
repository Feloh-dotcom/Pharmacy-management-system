/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { FileSpreadsheet, Download, FileText, CheckCircle, RefreshCw, BarChart3 } from "lucide-react";

export default function Reports() {
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Download simulation generating dynamic CSV spreadsheets
  const handleDownload = async (reportType: string) => {
    setLoadingReport(reportType);
    setSuccessMsg(null);

    // Fetch live entries dynamically
    let filename = "";
    let csvContent = "data:text/csv;charset=utf-8,";

    try {
      if (reportType === "expiry") {
        filename = "Expiry_Audit_Report.csv";
        const res = await fetch("/api/medicines");
        const list = await res.json();
        
        csvContent += "SKU,Product Name,Generic,Batch,Shelf_Life_Expiry,Quantity_In_Warehouse\n";
        list.forEach((m: any) => {
          csvContent += `"${m.SKU}","${m.name}","${m.genericName}","${m.batchNumber}","${m.expiryDate}",${m.quantity}\n`;
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

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div>
        <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Analytical Reports Suite</h1>
        <p className="text-xs text-slate-400 font-medium mt-1">Compile real-time operational inventories, extract spreadsheet audits, and review regulatory compliances.</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold p-4 rounded-2xl flex items-center space-x-2.5 shadow-sm">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Reports Directory cards list */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1: Expiry Audit Report */}
        <div className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Warehouse Expiry & Markdown Audit</h3>
            <p className="text-[10.5px] text-slate-405 leading-normal">
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
        <div className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
              <BarChart3 className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">POS Sales Disbursement Log</h3>
            <p className="text-[10.5px] text-slate-405 leading-normal">
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
        <div className="bg-white border border-slate-200 hover:border-slate-350 rounded-2xl p-6 space-y-4 flex flex-col justify-between hover:shadow-sm transition">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="text-xs font-bold text-slate-800">Profit & Loss operating Sheet</h3>
            <p className="text-[10.5px] text-slate-405 leading-normal">
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

    </div>
  );
}
