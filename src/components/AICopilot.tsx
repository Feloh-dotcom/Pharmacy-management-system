/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  Sparkles, ShieldAlert, CheckCircle2, TrendingUp, HelpCircle, 
  RefreshCw, Info, Calendar, Box, Database, ArrowUpRight
} from "lucide-react";
import { AISmartForecast } from "../types";
import { formatCurrency } from "../utils";

interface AICopilotProps {
  settings?: any;
}

export default function AICopilot({ settings }: AICopilotProps) {
  const currencySymbol = settings?.general?.currency || "Ksh.";
  const [data, setData] = useState<AISmartForecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoMode, setDemoMode] = useState(true);

  const fetchForecast = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/ai/forecast", { method: "POST" });
      const parsed = await res.json();
      setData(parsed);
      setDemoMode(parsed.demoMode);
    } catch (e) {
      console.error("AI Forecasting retrieval failed:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight flex items-center">
            <Sparkles className="w-5 h-5 text-teal-600 mr-2 animate-pulse" />
            <span>AI Demand & Forecasting Insights</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Leverage smart forecasts to predict stock lifespans, demand thresholds, and optimize purchase restocks.
          </p>
        </div>

        <button
          onClick={fetchForecast}
          disabled={loading}
          className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Regenerate Forecasts</span>
        </button>
      </div>

      {/* Demo vs Live secret key setup alert cue */}
      {demoMode && (
        <div className="bg-teal-50 border border-teal-100 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
          <Sparkles className="w-5 h-5 text-teal-600 shrink-0 mt-0.5 animate-bounce" />
          <div>
            <h4 className="text-xs font-bold text-teal-900">Co-Pilot Demo Mode Active</h4>
            <p className="text-[11px] text-teal-800 leading-normal mt-0.5">
              Currently presenting local dynamic metrics. To unlock fully organic, smart, live generative AI forecasts parsing custom warehouse listings, provide your <strong className="font-semibold">GEMINI_API_KEY</strong> inside the **Settings &gt; Secrets** panel in the AI Studio editor.
            </p>
          </div>
        </div>
      )}

      {loading || !data ? (
        <div className="flex flex-col items-center justify-center p-24 space-y-4">
          <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 animate-pulse">
            Analyzing batch expiration trends and sales velocities...
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Top predictive KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Near Expiry Risk status Card */}
            <div className="p-5 bg-rose-50 border border-rose-100 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-rose-800 font-mono">Near Expiry Risk</span>
                <ShieldAlert className="w-4 h-4 text-rose-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black font-sans text-rose-950">
                  {data.expiryPredictions.filter(p => p.riskStatus === "Critical").length} Batches
                </p>
                <p className="text-[10.5px] font-bold text-rose-700 leading-normal mt-1">
                  Urgent markdown or swap-out recommended before expiration.
                </p>
              </div>
            </div>

            {/* Procurement recommendations Count Card */}
            <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 font-mono">Restock Pipelines</span>
                <Box className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black font-sans text-amber-950">
                  {data.stockReorderSuggestions.length} Products
                </p>
                <p className="text-[10.5px] font-bold text-amber-700 leading-normal mt-1">
                  Threshold limit breached. Automatic purchase restock orders prepared.
                </p>
              </div>
            </div>

            {/* Smart Sales Forecast projection Card */}
            <div className="p-5 bg-teal-50 border border-teal-100 rounded-2xl flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-teal-800 font-mono">Revenue Projection</span>
                <TrendingUp className="w-4 h-4 text-teal-500" />
              </div>
              <div className="mt-4">
                <p className="text-2xl font-black font-sans text-teal-950">
                  {formatCurrency((data.salesPredictions[0]?.predictedRevenue || 15400), currencySymbol)}
                </p>
                <p className="text-[10.5px] font-bold text-teal-700 leading-normal mt-1">
                  Predicted growth cycle: {data.salesPredictions[0]?.growthTrend.split(" ")[0]} next calendar month.
                </p>
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Shelf-Life predictions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Shelf Life & Expiry Projections</h3>
                <span className="text-[10px] font-bold text-slate-400">Shelf Life Planner</span>
              </div>

              <div className="space-y-3.5 max-h-96 overflow-y-auto">
                {data.expiryPredictions.map((pred, idx) => {
                  const isCritical = pred.riskStatus === "Critical";
                  const isWarn = pred.riskStatus === "Warning";
                  
                  return (
                    <div 
                      key={idx} 
                      className={`p-3.5 border rounded-2xl flex items-start space-x-3.5 transition ${
                        isCritical 
                          ? "bg-rose-50/50 border-rose-100" 
                          : isWarn 
                            ? "bg-amber-50/50 border-amber-100" 
                            : "bg-slate-50/30 border-slate-200"
                      }`}
                    >
                      <ShieldAlert className={`w-4 h-4 shrink-0 mt-0.5 ${isCritical ? "text-rose-500 animate-pulse" : isWarn ? "text-amber-500" : "text-emerald-500"}`} />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-bold text-slate-800 truncate">{pred.medicineName}</h4>
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md shrink-0 border ${
                            isCritical 
                              ? "bg-rose-100 border-rose-200 text-rose-800" 
                              : isWarn 
                                ? "bg-amber-100 border-amber-200 text-amber-800" 
                                : "bg-emerald-150 border-emerald-250 text-emerald-800"
                          }`}>
                            {pred.riskStatus}
                          </span>
                        </div>
                        <div className="flex space-x-3 mt-1.5 text-[10px] text-slate-400 font-medium leading-none">
                          <span className="font-mono font-bold">SKU: {pred.SKU}</span>
                          <span>|</span>
                          <span>{pred.expiryDate}</span>
                          <span>|</span>
                          <span className={isCritical ? "text-rose-600 font-bold" : "text-slate-500"}>{pred.daysToExpiry} days left</span>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-normal mt-2 bg-white p-2 rounded-xl border border-slate-100/60 font-semibold">
                          Recommendation: {pred.actionRecommended}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart Restock Suggestions */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Restock suggestions</h3>
                <span className="text-[10px] font-bold text-slate-400">Stock Planner</span>
              </div>

              <div className="space-y-3.5 max-h-96 overflow-y-auto">
                {data.stockReorderSuggestions.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs">
                    All stock level records secure. Safety margins verified.
                  </div>
                ) : (
                  data.stockReorderSuggestions.map((sug, idx) => (
                    <div key={idx} className="p-4 border border-slate-100 rounded-2xl bg-slate-50/50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-xs font-bold text-slate-800 leading-none">{sug.medicineName}</h4>
                          <span className="text-[9.5px] text-slate-400 block mt-1.5">Supplier: {sug.supplierName}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-teal-750 bg-teal-50 border border-teal-100 px-2 py-1 rounded-lg">
                            Forecast Match: {sug.confidenceLevel}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-white border border-slate-100 p-2.5 rounded-xl text-center text-[10px] font-semibold text-slate-500">
                        <div>
                          <p className="text-slate-400 text-[9px] uppercase">Current Stock</p>
                          <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{sug.currentStock}</p>
                        </div>
                        <div className="border-l border-r border-slate-100">
                          <p className="text-slate-400 text-[9px] uppercase">Safety limit</p>
                          <p className="text-sm font-black text-slate-700 font-mono mt-0.5">{sug.minStock}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 text-[9px] uppercase">suggested PO</p>
                          <p className="text-sm font-black text-teal-600 font-mono mt-0.5">+{sug.reorderQuantity}</p>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500 leading-normal leading-relaxed bg-white/40 p-2 border border-slate-100 rounded-xl">
                        <strong className="text-slate-700 font-bold uppercase text-[9px] font-mono mr-1">Rationale:</strong> 
                        {sug.rationale}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

          {/* Monthly Revenue Trend Projection List */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono mb-4">
              Predictive Sales and Growth projections
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {data.salesPredictions.map((pred, idx) => (
                <div key={idx} className="p-4 border border-teal-500/10 hover:border-teal-500/35 bg-teal-50/20 rounded-2xl relative overflow-hidden flex flex-col justify-between h-32 transition">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-teal-500/5 blur-xl rounded-full translate-x-4 -translate-y-4" />
                  <div className="flex items-center justify-between z-10">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-full uppercase">
                      {pred.month}
                    </span>
                    <ArrowUpRight className="w-4 h-4 text-teal-600" />
                  </div>
                  <div className="z-10 mt-3">
                    <p className="text-xs text-slate-450 font-semibold uppercase">Projected Revenue</p>
                    <p className="text-lg font-black font-sans text-slate-700 mt-0.5">
                      {formatCurrency(pred.predictedRevenue, currencySymbol)}
                    </p>
                    <p className="text-[9.5px] font-bold text-teal-600 truncate mt-1">
                      {pred.growthTrend}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
