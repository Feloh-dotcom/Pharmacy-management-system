/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ArrowUpRight, TrendingUp, Calendar, RefreshCw, 
  Search, Filter, ChevronLeft, ChevronRight, Edit2, 
  Trash2, ShieldAlert, CheckCircle, Info, Sparkles,
  AlertTriangle, X, MapPin, Award, Pill, Receipt,
  Shield, Package, Hourglass, Wallet, Users, Layout,
  Activity, TrendingDown
} from "lucide-react";
import { Category, DashboardMetrics, Sale, Medicine, SystemSettings, UserRole } from "../types";
import { parseSafeDate, formatCurrency, getDaysToExpiry, getExpiryStatus, formatSafeDateOnly } from "../utils";

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onEditMedicine: (med: Medicine) => void;
  settings?: SystemSettings | null;
  user: { name: string; email: string; role: UserRole; avatarUrl?: string } | null;
}

export default function Dashboard({ onNavigate, onEditMedicine, settings, user }: DashboardProps) {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Weekly selection state
  const [selectedWeekId, setSelectedWeekId] = useState<string | null>(null);

  // Search and pagination states for Recent Sales List table
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(3);
  const [showNotification, setShowNotification] = useState<string | null>(null);

  // Expiry monitoring and data join states
  const [showExpiryTrackingDialog, setShowExpiryTrackingDialog] = useState(false);
  const [isExpiryTrayOpen, setIsExpiryTrayOpen] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<any[]>([]);

  const currencySymbol = settings?.general?.currency || "Ksh.";

  const fetchDashboardData = async (weekId?: string | null) => {
    try {
      setLoading(true);
      const targetWeek = weekId !== undefined ? weekId : selectedWeekId;
      const metricsRes = await fetch(`/api/dashboard/metrics?weekId=${targetWeek || ""}`);
      if (metricsRes.ok && metricsRes.headers.get("Content-Type")?.includes("json")) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData);
        if (metricsData.selectedWeekId && !weekId && !selectedWeekId) {
          setSelectedWeekId(metricsData.selectedWeekId);
        }
      }

      const salesRes = await fetch("/api/sales");
      if (salesRes.ok && salesRes.headers.get("Content-Type")?.includes("json")) {
        const salesData = await salesRes.json();
        setSales(Array.isArray(salesData) ? salesData : []);
      } else {
        setSales([]);
      }

      const medsRes = await fetch("/api/medicines");
      if (medsRes.ok && medsRes.headers.get("Content-Type")?.includes("json")) {
        const medsData = await medsRes.json();
        setMedicines(Array.isArray(medsData) ? medsData : []);
      } else {
        setMedicines([]);
      }

      const catsRes = await fetch("/api/categories");
      if (catsRes.ok && catsRes.headers.get("Content-Type")?.includes("json")) {
        const catsData = await catsRes.json();
        setCategories(Array.isArray(catsData) ? catsData : []);
      } else {
        setCategories([]);
      }

      const supsRes = await fetch("/api/suppliers").catch(() => null);
      if (supsRes && supsRes.ok && supsRes.headers.get("Content-Type")?.includes("json")) {
        const supsData = await supsRes.json();
        setSuppliers(Array.isArray(supsData) ? supsData : []);
      } else {
        setSuppliers([]);
      }

      const custsRes = await fetch("/api/customers").catch(() => null);
      if (custsRes && custsRes.ok && custsRes.headers.get("Content-Type")?.includes("json")) {
        const custsData = await custsRes.json();
        setCustomers(Array.isArray(custsData) ? custsData : []);
      } else {
        setCustomers([]);
      }

      const posRes = await fetch("/api/purchase-orders").catch(() => null);
      if (posRes && posRes.ok && posRes.headers.get("Content-Type")?.includes("json")) {
        const posData = await posRes.json();
        setPurchaseOrders(Array.isArray(posData) ? posData : []);
      } else {
        setPurchaseOrders([]);
      }

      const invRes = await fetch("/api/inventory/logs").catch(() => null);
      if (invRes && invRes.ok && invRes.headers.get("Content-Type")?.includes("json")) {
        const invData = await invRes.json();
        setInventoryLogs(Array.isArray(invData) ? invData : []);
      } else {
        setInventoryLogs([]);
      }
    } catch (e) {
      console.error("Failed to load dashboard payload:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedWeekId);
  }, [selectedWeekId]);

  // Increase or decrease quantity directly in recent sales database mock log
  const handleQuantityChange = async (saleId: string, itemIdx: number, step: number) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale || !sale.items[itemIdx]) return;

    const item = sale.items[itemIdx];
    const newQty = item.quantity + step;
    if (newQty < 1) return;

    try {
      const updatedItems = sale.items.map((it, idx) => {
        if (idx === itemIdx) {
          return { medicineId: it.medicineId, quantity: newQty };
        }
        return { medicineId: it.medicineId, quantity: it.quantity };
      });

      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: updatedItems })
      });

      let data: any = {};
      if (res.headers.get("Content-Type")?.includes("json")) {
        data = await res.json();
      }

      if (!res.ok) {
        throw new Error(data.error || "Failed to update quantity");
      }

      await fetchDashboardData();
      setShowNotification(`Modified sale checkout quantity securely - Subtotal updated to ${currencySymbol}${data.totalPrice}`);
      setTimeout(() => setShowNotification(null), 3500);
    } catch (e: any) {
      console.error(e);
      setShowNotification(e.message || "Failed to adjust quantities due to stock reserves.");
      setTimeout(() => setShowNotification(null), 3500);
    }
  };

  const handleDeleteSale = async (saleId: string, invoiceNumber: string) => {
    if (!window.confirm(`Are you sure you want to reverse sale receipt ${invoiceNumber}? This will automatically restore medicine quantities in stock.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "DELETE"
      });
      let data: any = {};
      if (res.headers.get("Content-Type")?.includes("json")) {
        data = await res.json();
      }
      if (!res.ok) {
        throw new Error(data.error || "Delete call failed");
      }

      await fetchDashboardData();
      setShowNotification(`Securely reversed sales logs for invoice ${invoiceNumber}`);
      setTimeout(() => setShowNotification(null), 3000);
    } catch (e: any) {
      console.error(e);
      setShowNotification(e.message || "Failed to reverse sale transaction.");
      setTimeout(() => setShowNotification(null), 3500);
    }
  };

  if (loading || !metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-96 py-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">
          Loading dashboard analytics...
        </p>
      </div>
    );
  }

  // Calculate dynamic circular/donut ratios from the loaded database metrics!
  const grNoSales = metrics?.graphReport?.noSales ?? 0;
  const grPurchases = metrics?.graphReport?.purchases ?? 0;
  const grSuppliers = metrics?.graphReport?.suppliers ?? 0;
  const grSalesVal = metrics?.graphReport?.sales ?? 0;
  const grTotal = grNoSales + grPurchases + grSuppliers + grSalesVal;

  const pctNoSales = grTotal > 0 ? Math.round((grNoSales / grTotal) * 100) : 0;
  const pctPurchases = grTotal > 0 ? Math.round((grPurchases / grTotal) * 100) : 0;
  const pctSuppliers = grTotal > 0 ? Math.round((grSuppliers / grTotal) * 100) : 0;
  const pctSales = grTotal > 0 ? Math.round((grSalesVal / grTotal) * 100) : 0;

  const circ = 238.76;
  const totalRevenue = metrics?.weeklyRevenue ?? 0;

  // Filter Sales list based on dynamic search term and role email bounds
  const filteredSales = sales.filter(s => {
    // Role filter
    if (user?.role === UserRole.CUSTOMER) {
      if (!s.customerEmail || s.customerEmail.toLowerCase() !== user.email.toLowerCase()) {
        return false;
      }
    }
    // Search term matching
    return (
      (s.customerName || s.customer_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.items.some(item => (item.medicineName || "").toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.customerEmail && s.customerEmail.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  // Pagination bounds
  const totalEntries = filteredSales.length;
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredSales.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(totalEntries / entriesPerPage);

  const lowStockMedicines = medicines.filter(m => m.quantity <= m.minStockLevel);

  const renderRoleCards = () => {
    if (!metrics) return null;

    if (user?.role === UserRole.CUSTOMER) {
      const currentCustomer = customers.find(c => 
        c.email?.toLowerCase() === user?.email?.toLowerCase() || 
        c.name?.toLowerCase() === user?.name?.toLowerCase()
      );
      const loyaltyPoints = currentCustomer?.loyaltyPoints || 0;
      const prescriptionCount = currentCustomer?.prescriptionHistory?.length || 0;
      const customerSales = sales.filter(s => s.customerEmail?.toLowerCase() === user?.email?.toLowerCase());
      const transactionCount = customerSales.length;
      const insuranceProvider = currentCustomer?.insuranceProvider || "Self Pay / Cash";
      const copayPercent = currentCustomer?.copayPercent !== undefined ? `${currentCustomer.copayPercent}%` : "0%";
      const couponMessage = loyaltyPoints >= 300 ? "Consolidated 15% discount coupon unlocked" : `${300 - loyaltyPoints} more points for next coupon`;

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => onNavigate("profile")}
            className="bg-[#093530]/5 rounded-2xl border border-teal-200/50 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Award className="w-5 h-5 text-teal-600" />
              <span className="text-[10px] font-extrabold text-[#093530] bg-[#093530]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Loyalty Points Balance</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{loyaltyPoints} Points</p>
              <p className="text-[9px] text-teal-600 mt-1 font-medium">{couponMessage}</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("profile")}
            className="bg-sky-50 rounded-2xl border border-sky-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Pill className="w-5 h-5 text-sky-600" />
              <span className="text-[10px] font-extrabold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Refills</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Registered Prescriptions</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{prescriptionCount} Active</p>
              <p className="text-[9px] text-sky-600 mt-1 font-medium">Synced & authorized clinical entries</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("sales")}
            className="bg-violet-50 rounded-2xl border border-violet-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Receipt className="w-5 h-5 text-violet-600" />
              <span className="text-[10px] font-extrabold text-violet-800 bg-violet-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Invoices</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Purchase Logs</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{transactionCount} Transactions</p>
              <p className="text-[9px] text-violet-600 mt-1 font-medium">Browse financial records and invoices</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("profile")}
            className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Shield className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Approved</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Patient Profile Status</p>
              <p className="font-bold text-xl text-slate-800 mt-1">{insuranceProvider !== "Self Pay / Cash" ? "Insured Member" : "Verified Member"}</p>
              <p className="text-[9px] text-amber-600 mt-1 font-medium">Copay of {copayPercent} with {insuranceProvider}</p>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === UserRole.SUPPLIER) {
      const currentSupplier = suppliers.find(s => 
        s.email?.toLowerCase() === user?.email?.toLowerCase() || 
        s.name?.toLowerCase() === user?.name?.toLowerCase()
      );
      const suppliedMeds = medicines.filter(m => m.supplierId === currentSupplier?.id || (m.supplierName && currentSupplier?.name && m.supplierName.toLowerCase() === currentSupplier.name.toLowerCase()));
      const suppliedCount = suppliedMeds.length;
      const supplierCategories = Array.from(new Set(suppliedMeds.map(m => categories.find(c => c.id === m.categoryId)?.name))).filter(Boolean).slice(0, 2).join(" & ");
      const categoriesLabel = supplierCategories ? `Distributed across ${supplierCategories}` : "Supply lines active";

      const supplierPOList = purchaseOrders.filter(po => po.supplierId === currentSupplier?.id || po.supplierName === currentSupplier?.name);
      const pendingPO = supplierPOList.filter(po => po.status === "Pending" || po.status === "Approved" || po.status === "Sent");
      const pendingPOCount = pendingPO.length;

      const settledPOAmount = supplierPOList
        .filter(po => po.status === "Received")
        .reduce((sum, po) => sum + (po.totalAmount || 0), 0);
      const supplierTier = settledPOAmount > 50000 ? "Elite Partner" : settledPOAmount > 10000 ? "Primary Supplier" : "Registered Vendor";

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => onNavigate("products")}
            className="bg-[#093530]/5 rounded-2xl border border-teal-200/50 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Package className="w-5 h-5 text-teal-600" />
              <span className="text-[10px] font-extrabold text-[#093530] bg-[#093530]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Supplied</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Supplied Products</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{suppliedCount} Products</p>
              <p className="text-[9px] text-teal-600 mt-1 font-medium">{categoriesLabel}</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("orders")}
            className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Hourglass className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Active</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pending Orders</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{pendingPOCount} Active POs</p>
              <p className="text-[9px] text-amber-600 mt-1 font-medium">Awaiting procurement logistics processing</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("orders")}
            className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Wallet className="w-5 h-5 text-emerald-600" />
              <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Received</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Settled Orders Value</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{currencySymbol}{settledPOAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              <p className="text-[9px] text-emerald-600 mt-1 font-medium">Funds disbursed to matching registry bank</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("orders")}
            className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Users className="w-5 h-5 text-indigo-600" />
              <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Certified</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Procurement Level</p>
              <p className="font-bold text-xl text-slate-800 mt-1">{supplierTier}</p>
              <p className="text-[9px] text-indigo-600 mt-1 font-medium">Supply lines verified with automatic replenishment</p>
            </div>
          </div>
        </div>
      );
    }

    if (user?.role === UserRole.INVENTORY_MANAGER) {
      const activeLogsCount = inventoryLogs.length;
      const lastLog = inventoryLogs[0];
      const traceLabel = lastLog ? `${lastLog.type.toUpperCase()}: ${lastLog.medicineName}` : "Every stock adjustment is logged";

      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div 
            onClick={() => onNavigate("products")}
            className="bg-[#093530]/5 rounded-2xl border border-teal-200/50 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Pill className="w-5 h-5 text-teal-600" />
              <span className="text-[10px] font-extrabold text-[#093530] bg-[#093530]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">Database</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Products Registered</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{medicines.length} Products</p>
              <p className="text-[9px] text-teal-600 mt-1 font-medium">Cataloged across active categories</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("products")}
            className="bg-amber-50 rounded-2xl border border-amber-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <TrendingDown className="w-5 h-5 text-amber-600" />
              <span className="text-[10px] font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Below Target</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Low Stock Alert Count</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{lowStockMedicines.length} Warnings</p>
              <p className="text-[9px] text-amber-600 mt-1 font-medium">Awaiting procurement orders processing</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("reports")}
            className="bg-rose-50 rounded-2xl border border-rose-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
              <span className="text-[10px] font-extrabold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Expired</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Expired Batches</p>
              <p className="font-bold text-2xl text-slate-800 mt-1">{metrics ? metrics.expiredMedicines.count : 0} Warns</p>
              <p className="text-[9px] text-rose-600 mt-1 font-medium">To be disposed of or returned to supplier</p>
            </div>
          </div>
          <div 
            onClick={() => onNavigate("reports")}
            className="bg-indigo-50 rounded-2xl border border-indigo-100 p-6 flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
          >
            <div className="flex items-center justify-between text-lg">
              <Activity className="w-5 h-5 text-indigo-600" />
              <span className="text-[10px] font-extrabold text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-full uppercase tracking-wider">Live Trace</span>
            </div>
            <div className="mt-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Active Inventory logs</p>
              <p className="font-bold text-xl text-slate-800 mt-1">{activeLogsCount} Logs</p>
              <p className="text-[9px] text-indigo-600 mt-1 font-medium">{traceLabel}</p>
            </div>
          </div>
        </div>
      );
    }

    // Default layout (Admin, Pharmacist, Cashier, Accountant, User)
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Todays Sales */}
        <div 
          onClick={() => onNavigate("sales")}
          className="p-6 bg-emerald-100/60 rounded-2xl border border-emerald-200/50 relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-200 opacity-20 rounded-full translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between z-10">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Wallet className="w-5 h-5 text-emerald-600" />
            </div>
            <button className="text-slate-500 hover:text-slate-700 font-extrabold text-xs">···</button>
          </div>
          <div className="mt-4 z-10">
            <p className="text-[11px] font-semibold text-emerald-800 tracking-wide uppercase">
              Todays Sales
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="font-sans font-bold text-2xl text-emerald-950">
                {currencySymbol}{metrics.todaysSales.value.toFixed(2)}
              </span>
              <span className="text-[10px] font-extrabold text-emerald-700 bg-white/60 px-1.5 py-0.5 rounded-md">
                {metrics.todaysSales.changePercent >= 0 ? "+" : ""}{metrics.todaysSales.changePercent.toFixed(1)}%
              </span>
            </div>
            <p className="text-[10px] text-emerald-700 font-semibold mt-1">
              {metrics.todaysSales.changePercent >= 0 ? "+" : ""}{metrics.todaysSales.changePercent.toFixed(1)}% growth rate today
            </p>
          </div>
        </div>

        {/* Card 2: Available Categories */}
        <div 
          onClick={() => onNavigate("categories")}
          className="p-6 bg-teal-100/60 rounded-2xl border border-teal-200/50 relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-teal-200 opacity-20 rounded-full translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between z-10">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Layout className="w-5 h-5 text-teal-600" />
            </div>
            <button className="text-slate-500 hover:text-slate-700 font-extrabold text-xs">···</button>
          </div>
          <div className="mt-4 z-10">
            <p className="text-[11px] font-semibold text-teal-800 tracking-wide uppercase">
              Available Categories
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="font-sans font-bold text-2xl text-teal-950">
                {metrics.availableCategories.value}
              </span>
              <span className="text-[10px] font-extrabold text-teal-700 bg-white/60 px-1.5 py-0.5 rounded-md">
                {metrics.availableCategories.changePercent.toFixed(1)}% Active
              </span>
            </div>
            <p className="text-[10px] text-teal-700 font-semibold mt-1">
              {metrics.availableCategories.value} product categories active
            </p>
          </div>
        </div>

        {/* Card 3: Expired Medicines */}
        <div 
          onClick={() => onNavigate("reports")}
          className="p-6 bg-rose-100/60 rounded-2xl border border-rose-200/50 relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-rose-200 opacity-20 rounded-full translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between z-10">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
            <button className="text-slate-500 hover:text-slate-700 font-extrabold text-xs">···</button>
          </div>
          <div className="mt-4 z-10">
            <p className="text-[11px] font-semibold text-rose-800 tracking-wide uppercase">
              Expired Medicines
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="font-sans font-bold text-2xl text-rose-950">
                {metrics.expiredMedicines.count} List
              </span>
              <span className="text-[10px] font-extrabold text-rose-700 bg-white/60 px-1.5 py-0.5 rounded-md">
                {metrics.expiredMedicines.changePercent.toFixed(1)}% Pct
              </span>
            </div>
            <p className="text-[10px] text-rose-700 font-semibold mt-1">
              {metrics.expiredMedicines.count} active product batches flagged expired
            </p>
          </div>
        </div>

        {/* Card 4: System Users */}
        <div 
          onClick={() => onNavigate("settings")}
          className="p-6 bg-indigo-100/60 rounded-2xl border border-indigo-200/50 relative overflow-hidden flex flex-col justify-between h-40 cursor-pointer hover:shadow-md hover:scale-[1.02] transition duration-200"
        >
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-200 opacity-20 rounded-full translate-x-8 -translate-y-8" />
          <div className="flex items-center justify-between z-10">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-sm">
              <Users className="w-5 h-5 text-indigo-600" />
            </div>
            <button className="text-slate-500 hover:text-slate-700 font-extrabold text-xs">···</button>
          </div>
          <div className="mt-4 z-10">
            <p className="text-[11px] font-semibold text-indigo-800 tracking-wide uppercase">
              System/Staff Users
            </p>
            <div className="flex items-baseline space-x-2 mt-1">
              <span className="font-sans font-bold text-2xl text-indigo-950">
                {metrics.systemUsers.count}
              </span>
              <span className="text-[10px] font-extrabold text-indigo-700 bg-white/60 px-1.5 py-0.5 rounded-md">
                {metrics.systemUsers.changePercent.toFixed(1)}% Active
              </span>
            </div>
            <p className="text-[10px] text-indigo-700 font-semibold mt-1">
              {metrics.systemUsers.count} staff members registered
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      {/* Toast Alert feedback popup */}
      {showNotification && (
        <div className="fixed bottom-6 right-6 bg-[#093530] border border-teal-800 text-teal-300 px-5 py-3 rounded-2xl shadow-2xl flex items-center space-x-3 z-50 animate-bounce">
          <CheckCircle className="w-5 h-5 text-teal-400" />
          <span className="text-xs font-semibold">{showNotification}</span>
        </div>
      )}

      {/* Header welcome badge matching UI design blueprint */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-2xl text-slate-900 tracking-tight">
            {user?.role === UserRole.CUSTOMER ? `Hello, ${user?.name}` : "Welcome to Smarteq Pharmacy"}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {user?.role === UserRole.CUSTOMER 
              ? "Your personalized customer self-service billing and prescription hub." 
              : user?.role === UserRole.SUPPLIER 
              ? "Supplier and procurement management console." 
              : "Ready to oversee operations and dispensing cycles today."}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {metrics?.weeklyCycles && metrics.weeklyCycles.length > 0 && [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.ACCOUNTANT, UserRole.USER].includes(user?.role as any) && (
            <div className="flex items-center space-x-2 bg-white border border-slate-150 rounded-xl px-3 py-2 shadow-sm">
              <Calendar className="w-4 h-4 text-teal-600" />
              <select
                id="week-cycle-selector"
                value={selectedWeekId || ""}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                className="text-xs font-bold text-slate-700 bg-transparent border-none focus:outline-none focus:ring-0 cursor-pointer pr-4"
              >
                {metrics.weeklyCycles.map((cycle: any) => (
                  <option key={cycle.id} value={cycle.id}>
                    Week {cycle.id} [{cycle.status}]
                  </option>
                ))}
              </select>
            </div>
          )}

          {[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.USER].includes(user?.role as any) && (
            <button 
              id="btn-pos-navigation"
              onClick={() => onNavigate("sales")}
              className="flex items-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl shadow-md shadow-teal-700/20 transition-all duration-200"
            >
              <Sparkles className="w-4 h-4" />
              <span>Launch POS Register</span>
            </button>
          )}
        </div>
      </div>

      {/* Expiry Alarm Collapsible Warning Banner panel */}
      {medicines.length > 0 && [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.CASHIER, UserRole.USER].includes(user?.role as any) && (() => {
        const expiredCount = medicines.filter(m => getDaysToExpiry(m.expiryDate) <= 0).length;
        const nearCount = medicines.filter(m => {
          const d = getDaysToExpiry(m.expiryDate);
          return d > 0 && d <= (settings?.inventory?.expiryWarningPeriodDays || 45);
        }).length;

        if (expiredCount === 0 && nearCount === 0) return null;

        const totalAlerts = expiredCount + nearCount;
        const severity = settings?.inventory?.expiryAlertSeverity || "high";

        let severityBg = "bg-amber-50 border-amber-200 text-amber-950";
        let severityLabel = "System Date Expiry warning buffer";
        if (expiredCount > 0 || severity === "critical") {
          severityBg = "bg-rose-50 border-rose-200 text-rose-950";
          severityLabel = "Clinical Safety Expiry Alerts Triggered";
        }

        return (
          <div className={`p-4 rounded-3xl border ${severityBg} shadow-sm space-y-3`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0 animate-bounce" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">{severityLabel}</h3>
                  <p className="text-[10.5px] opacity-85 mt-0.5">
                    The active monitor flagged <strong className="font-bold border-b border-current">{expiredCount} expired items</strong> and <strong className="font-bold border-b border-current">{nearCount} nearing clinical shelf-life limits</strong>.
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                <button
                  onClick={() => setShowExpiryTrackingDialog(true)}
                  className="px-3 py-1.5 bg-white/80 hover:bg-white text-slate-800 text-[10px] font-bold border border-slate-200 shadow-sm rounded-xl cursor-pointer transition select-none"
                >
                  View Details
                </button>
                <button
                  onClick={() => setIsExpiryTrayOpen(!isExpiryTrayOpen)}
                  className="px-3 py-1.5 bg-black/5 hover:bg-black/10 text-[10px] font-bold rounded-xl cursor-pointer transition select-none"
                >
                  {isExpiryTrayOpen ? "Collapse Warnings" : `Show ${totalAlerts} Warnings`}
                </button>
              </div>
            </div>

            {isExpiryTrayOpen && (
              <div className="mt-2 text-[10.5px] max-h-36 overflow-y-auto space-y-1.5 border-t border-black/5 pt-3 divide-y divide-slate-100 divide-black/5">
                {medicines
                  .map(m => {
                    const days = getDaysToExpiry(m.expiryDate);
                    return { m, days };
                  })
                  .filter(({ days }) => days <= (settings?.inventory?.expiryWarningPeriodDays || 45))
                  .sort((a, b) => a.days - b.days)
                  .map(({ m, days }) => {
                    const isExp = days <= 0;
                    return (
                      <div key={m.id} className="pt-2 flex items-center justify-between hover:translate-x-0.5 transition duration-150">
                        <div className="flex items-center space-x-2">
                          <span className={isExp ? "text-rose-650" : "text-amber-600 font-bold"}>●</span>
                          <span>
                            <strong>{m.name}</strong> (Batch: {m.batchNumber || "N/A"}) — Clinical stock is compromised.
                          </span>
                        </div>
                        <span className={`font-mono font-black shrink-0 ml-3 ${isExp ? "text-rose-700" : "text-amber-800"}`}>
                          {isExp ? `Expired ${-days} days ago` : `Expires in ${days} days`}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Low Stock Alerts Banner Panel */}
      {lowStockMedicines.length > 0 && [UserRole.ADMIN, UserRole.PHARMACIST, UserRole.INVENTORY_MANAGER, UserRole.USER].includes(user?.role as any) && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start space-x-3.5 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-amber-900">Critical Low Stock Warning</h4>
            <p className="text-[11.5px] text-amber-800 leading-normal mt-0.5">
              There are <strong className="font-semibold">{lowStockMedicines.length} products</strong> running extremely close to safe margin levels. Click below to view restock recommendations.
            </p>
            <div className="flex space-x-4 mt-2.5">
              {lowStockMedicines.slice(0, 3).map(med => (
                <span key={med.id} className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200">
                  {med.name} ({med.quantity} remaining)
                </span>
              ))}
              <button 
                onClick={() => onNavigate("orders")}
                className="text-[10px] uppercase tracking-wider font-extrabold text-amber-950 hover:underline inline-flex items-center"
              >
                Procure now &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4 Cards Section - Pharmacy Sales Results */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase">
            Pharmacy Sales Results
          </h2>
          <div className="flex items-center space-x-2">
            <div className="text-[10px] font-semibold text-slate-500 inline-flex items-center bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>This Month</span>
            </div>
            <button 
              id="btn-refresh-metrics"
              onClick={fetchDashboardData} 
              className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {renderRoleCards()}
      </div>

      {/* Charts Section: Graph Report & Total Sales Overview */}
      {[UserRole.ADMIN, UserRole.PHARMACIST, UserRole.CASHIER, UserRole.ACCOUNTANT, UserRole.USER].includes(user?.role as any) && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        
        {/* Graph Report: Donut charts */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800">Graph Report</h3>
            <button className="text-slate-400 hover:text-slate-600 font-bold text-xs">···</button>
          </div>

          {/* Fully standard interactive custom vector Donut chart to match mockup design perfectly */}
          <div className="flex justify-center items-center py-6">
            <div className="relative w-56 h-56 flex items-center justify-center">
              <svg className="w-full h-full" viewBox="0 0 100 100">
                {/* Pie slices calculations with matching responsive layouts */}
                
                {/* No Sales: (Starts stroke-dashoffset 0) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#e2e8f0"
                  strokeWidth="11"
                  strokeDasharray={`${pctNoSales * circ / 100} ${circ}`}
                  strokeDashoffset="0"
                  className="origin-center -rotate-90"
                />
                {/* Pattern Overlay on No Sales for striped representation! */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#b2f5ea" /* secondary color matching screenshot styling */
                  strokeWidth="7"
                  strokeDasharray="1.5 3"
                  strokeDashoffset="0"
                  className="origin-center -rotate-90 opacity-45"
                />

                {/* Purchases: (yellow-green color) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#bef264" /* light green lime */
                  strokeWidth="11"
                  strokeDasharray={`${pctPurchases * circ / 100} ${circ}`}
                  strokeDashoffset={`${- (pctNoSales * circ / 100)}`}
                  className="origin-center -rotate-90"
                />

                {/* Suppliers: (vibrant teal) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#2dd4bf" /* vibrant teal */
                  strokeWidth="11"
                  strokeDasharray={`${pctSuppliers * circ / 100} ${circ}`}
                  strokeDashoffset={`${- ((pctNoSales + pctPurchases) * circ / 100)}`}
                  className="origin-center -rotate-90"
                />

                {/* Sales: (rose red) */}
                <circle
                  cx="50" cy="50" r="38"
                  fill="transparent"
                  stroke="#fda4af" /* rose pastel */
                  strokeWidth="11"
                  strokeDasharray={`${pctSales * circ / 100} ${circ}`}
                  strokeDashoffset={`${- ((pctNoSales + pctPurchases + pctSuppliers) * circ / 100)}`}
                  className="origin-center -rotate-90"
                />
              </svg>

              {/* Inner Dashboard Summary Label */}
              <div className="absolute text-center">
                <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
                  Revenue
                </span>
                <span className="text-sm font-black font-sans text-slate-800 tracking-tight block">
                  {currencySymbol}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {/* Dynamic visual badges on vectors - hidden on empty states */}
              {grTotal > 0 ? (
                <>
                  <div className="absolute top-1/4 right-[22%] bg-rose-200 text-rose-800 text-[9px] px-1 rounded font-bold shadow-sm">{pctSales}%</div>
                  <div className="absolute bottom-[22%] right-[28%] bg-teal-200 text-teal-800 text-[9px] px-1 rounded font-bold shadow-sm">{pctSuppliers}%</div>
                  <div className="absolute top-[30%] left-[22%] bg-slate-100 text-slate-600 text-[9px] px-1 rounded font-bold shadow-sm font-mono">{pctPurchases}%</div>
                  <div className="absolute bottom-1/4 left-[22%] bg-lime-200 text-lime-800 text-[9px] px-1 rounded font-bold shadow-sm">{pctNoSales}%</div>
                </>
              ) : (
                <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col justify-center items-center z-20 p-4 text-center">
                  <Info className="w-8 h-8 text-slate-300 mb-2" />
                  <p className="text-[11px] font-bold text-slate-500">No activity recorded for this period</p>
                  <p className="text-[9px] text-slate-400 mt-0.5">Metrics will build as you add items & logs</p>
                </div>
              )}
            </div>
          </div>

          {/* Grid legends breakdown */}
          <div className="grid grid-cols-2 gap-x-2 gap-y-2.5 border-t border-slate-100 pt-4 mt-2">
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-lime-350 block shrink-0" />
              <span>Purchases ({pctPurchases}%)</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-400 block shrink-0" />
              <span>Suppliers ({pctSuppliers}%)</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-300 block shrink-0" />
              <span>Sales ({pctSales}%)</span>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-semibold text-slate-500">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-200 block shrink-0" />
              <span>No Sales ({pctNoSales}%)</span>
            </div>
          </div>
        </div>

        {/* Total Sales Overview: cylindrical stripe line graph matching mockup */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between relative">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-slate-800">Total Sales Overview</h3>
            <button className="text-slate-400 hover:text-slate-600 font-bold text-xs">···</button>
          </div>

          {/* Cylinder bars grid */}
          <div className="flex justify-between items-end h-56 pt-2 pb-2 px-4 relative border-b border-slate-100">
            {/* Grid dotted alignment lines */}
            <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-slate-100" />
            <div className="absolute left-0 right-0 top-2/4 border-t border-dashed border-slate-100" />
            <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-slate-100" />

            {/* Custom Cylinder Bars */}
            {(() => {
              const maxWeeklyVal = Math.max(...metrics.totalSalesOverview.map(b => b.value), 50);
              const maxBar = metrics.totalSalesOverview.reduce((prev, current) => (prev.value > current.value) ? prev : current, metrics.totalSalesOverview[0]);
              const isAllZero = metrics.totalSalesOverview.every(b => b.value === 0);
              
              return metrics.totalSalesOverview.map((bar, i) => {
                // Highlight the true maximum sales day dynamically instead of hardcoded Wednesday
                const isHighlight = maxBar && bar.day === maxBar.day && bar.value > 0;
                const fillPercent = isAllZero ? 5 : (bar.value / maxWeeklyVal) * 85 + 15; // ensure nice default pill scale
                
                return (
                  <div key={bar.day} className="flex flex-col items-center flex-1 relative group cursor-pointer">
                    {/* Cylinder container */}
                    <div className="w-7 sm:w-10 bg-slate-50 rounded-full h-44 relative overflow-hidden flex items-end border border-slate-100 shadow-inner">
                      
                      {/* SVG stripe fill cylinder depending on value */}
                      <div 
                        style={{ height: `${fillPercent}%` }}
                        className="w-full rounded-full transition-all duration-700 ease-out flex flex-col justify-end"
                      >
                        {/* Interactive Diagonal Stripes Background patterns! */}
                        <svg className="w-full h-full rounded-full" preserveAspectRatio="none">
                          <defs>
                            <pattern id={`stripes-${bar.day}`} width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                              <line x1="0" y1="0" x2="0" y2="10" stroke={bar.color} strokeWidth="4.5" className="opacity-75" />
                            </pattern>
                          </defs>
                          <rect width="100%" height="100%" fill={`url(#stripes-${bar.day})`} />
                          
                          {/* Shading overlay for cylindrical/3D pill appearance */}
                          <rect width="100%" height="100%" fill="black" className="opacity-[0.06]" />
                        </svg>
                      </div>
  
                      {/* Capsule circle dot indicator inside cylinder */}
                      <div 
                        style={{ bottom: `calc(${fillPercent}% - 14px)` }}
                        className="absolute left-1/2 -translate-x-1/2 w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white shadow-md flex items-center justify-center transition-all duration-700 pointer-events-none"
                      >
                        <div className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 rounded-full" style={{ backgroundColor: bar.color }} />
                      </div>
                    </div>
  
                    {/* Dynamic tooltip floating above highest sales day */}
                    {isHighlight && (
                      <div className="absolute top-1 bg-[#093530] text-teal-300 rounded-xl px-3 py-1.5 shadow-xl text-center border border-teal-800 z-10 -translate-y-12 animate-bounce">
                        <p className="text-[9px] font-bold text-teal-400 capitalize">Sales Peak</p>
                        <p className="text-xs font-black font-sans leading-none mt-0.5">{currencySymbol}{bar.value.toFixed(2)}</p>
                        {/* Arrow clip */}
                        <div className="w-2.5 h-2.5 bg-[#093530] border-r border-b border-teal-800 rotate-45 absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1.5" />
                      </div>
                    )}
  
                    {/* Standard Chart hover tooltip for other days */}
                    <div className="absolute bottom-full mb-2 bg-slate-800 text-white rounded-lg px-2.5 py-1 text-[10px] font-bold hidden group-hover:block whitespace-nowrap z-10 transition-all shadow-md">
                      Value: {currencySymbol}{bar.value.toFixed(2)}
                    </div>
  
                    <span className="text-[10px] font-bold text-slate-500 mt-2.5 block">
                      {bar.day}
                    </span>
                  </div>
                );
              });
            })()}

            {/* Empty state visual cover overlay directly over cylinder space */}
            {metrics.totalSalesOverview.every(b => b.value === 0) && (
              <div className="absolute inset-0 bg-white/95 rounded-2xl flex flex-col justify-center items-center z-20 p-4 text-center">
                <Info className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-[11px] font-bold text-slate-500">No sales transactions compiled for this week cycle</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Place new order sales to see beautiful diagnostic cylinders populate live</p>
              </div>
            )}
          </div>
  
          {/* Legend and performance indicators */}
          {(() => {
            const maxVal = Math.max(...metrics.totalSalesOverview.map(b => b.value), 50);
            return (
              <div className="flex items-center justify-between text-slate-400 text-[11px] font-bold pt-2.5">
                <span>0</span>
                <span>{currencySymbol}{Math.round(maxVal * 0.25)}</span>
                <span>{currencySymbol}{Math.round(maxVal * 0.5)}</span>
                <span>{currencySymbol}{Math.round(maxVal * 0.75)}</span>
                <span>{currencySymbol}{Math.round(maxVal)}</span>
              </div>
            );
          })()}
        </div>
      </div>
      )}

      {/* Recent Sales List Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-xs font-bold text-slate-800 whitespace-nowrap">
            Recent Sales List
          </h3>
          
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            {/* Search Input filter bar */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search Client or Medicine..."
                className="w-full pl-8.5 pr-3 py-1.5 text-xs text-slate-600 bg-slate-50 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100">
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            
            <button className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100">
              <span>Shot By</span>
            </button>
          </div>
        </div>

        {/* Responsive Table Grid */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12">
                  <input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" />
                </th>
                <th className="py-3 px-4 whitespace-nowrap">Name</th>
                <th className="py-3 px-4 whitespace-nowrap">Medicine</th>
                <th className="py-3 px-4 whitespace-nowrap">User Email</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Quantity</th>
                <th className="py-3 px-4 whitespace-nowrap">Total Price</th>
                <th className="py-3 px-4 whitespace-nowrap">Date</th>
                <th className="py-3 px-4 whitespace-nowrap text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentEntries.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 text-slate-600 font-medium text-xs transition-colors duration-150">
                  <td className="py-4.5 px-4">
                    <input type="checkbox" className="rounded text-teal-600 focus:ring-teal-500" />
                  </td>
                  <td className="py-4.5 px-4 font-bold text-slate-800">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-[10px] font-black">
                        {sale.customerName?.slice(0, 2).toUpperCase()}
                      </div>
                      <span>{sale.customerName}</span>
                    </div>
                  </td>
                  <td className="py-4.5 px-4">
                    <div className="space-y-0.5">
                      {sale.items.map((item, idx) => (
                        <div key={idx} className="font-semibold text-slate-700">
                          {item.medicineName}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4.5 px-4 text-slate-500 font-mono text-[11px]">
                    {sale.customerEmail}
                  </td>
                  <td className="py-4.5 px-4">
                    <div className="flex items-center justify-center">
                      <div className="flex items-center bg-slate-100 rounded-xl border border-slate-200/60 p-0.5">
                        <button
                          id={`btn-qty-dec-${sale.id}`}
                          disabled={user?.role !== UserRole.ADMIN && user?.role !== UserRole.USER}
                          onClick={() => handleQuantityChange(sale.id, 0, -1)}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all font-bold ${user?.role !== UserRole.ADMIN && user?.role !== UserRole.USER ? "opacity-35 cursor-not-allowed" : ""}`}
                        >
                          -
                        </button>
                        <span className="w-7 text-center font-bold text-slate-800 text-[11px] font-mono">
                          {sale.items[0]?.quantity || 1}
                        </span>
                        <button
                          id={`btn-qty-inc-${sale.id}`}
                          disabled={user?.role !== UserRole.ADMIN && user?.role !== UserRole.USER}
                          onClick={() => handleQuantityChange(sale.id, 0, 1)}
                          className={`w-5 h-5 rounded-lg flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-all font-bold ${user?.role !== UserRole.ADMIN && user?.role !== UserRole.USER ? "opacity-35 cursor-not-allowed" : ""}`}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="py-4.5 px-4 font-bold text-slate-800 font-mono text-[12px]">
                    {currencySymbol}{sale.totalPrice.toFixed(2)}
                  </td>
                  <td className="py-4.5 px-4 text-slate-400 font-bold">
                    {(() => {
                      const d = parseSafeDate(sale.date);
                      return d ? d.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      }) : "N/A";
                    })()} 12:00 AM
                  </td>
                  <td className="py-4.5 px-4">
                    <div className="flex justify-center items-center space-x-2">
                      <button 
                        id={`btn-sale-info-${sale.id}`}
                        onClick={() => {
                          const medRecord = medicines.find(m => m.name === sale.items[0]?.medicineName);
                          if (medRecord) onEditMedicine(medRecord);
                          else onNavigate("products");
                        }}
                        className="p-1 px-2 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {(user?.role === UserRole.ADMIN || user?.role === UserRole.USER) && (
                        <button 
                          id={`btn-sale-delete-${sale.id}`}
                          onClick={() => handleDeleteSale(sale.id, sale.invoiceNumber)}
                          className="p-1 px-2 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination bar matches the mockup alignment */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6 pt-6 border-t border-slate-100">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
            >
              Prev
            </button>
            {[...Array(totalPages)].map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${
                  currentPage === i + 1
                    ? "bg-[#093530] text-teal-300"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <span className="text-xs text-slate-400 font-bold">...</span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 disabled:opacity-40"
            >
              Next
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 font-semibold font-sans">
              Showing {indexOfFirstEntry + 1} to {Math.min(indexOfLastEntry, totalEntries)} of {totalEntries} Entries
            </span>
            
            <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Show</span>
              <select
                value={entriesPerPage}
                onChange={(e) => {
                  setEntriesPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-transparent text-xs font-bold text-slate-700 outline-none border-none cursor-pointer"
              >
                <option value={3}>3</option>
                <option value={5}>5</option>
                <option value={10}>10</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Expiry Monitoring Dialog */}
      {showExpiryTrackingDialog && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-650">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-rose-950 uppercase tracking-wide">Integrated Expiry Risk Registry</h3>
                  <p className="text-xs text-rose-700 font-medium">Auto-tracking expired and expiring clinical formulations in real time.</p>
                </div>
              </div>
              <button
                onClick={() => setShowExpiryTrackingDialog(false)}
                className="p-1.5 hover:bg-rose-100 rounded-xl text-rose-800 transition cursor-pointer select-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              <div className="flex items-center justify-between bg-slate-50 border border-slate-150 p-4 rounded-2xl select-none">
                <div className="text-xs">
                  <span className="font-extrabold text-slate-700">Warning Days Buffer Threshold: </span>
                  <span className="font-mono font-bold text-teal-700">{settings?.inventory?.expiryWarningPeriodDays || 45} Days</span>
                </div>
                <div className="text-xs">
                  <span className="font-extrabold text-slate-700">Total Flagged Batches: </span>
                  <span className="font-mono font-bold text-rose-700">
                    {medicines.filter(m => getDaysToExpiry(m.expiryDate) <= (settings?.inventory?.expiryWarningPeriodDays || 45)).length} Products
                  </span>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-4">
                {medicines.filter(m => getDaysToExpiry(m.expiryDate) <= (settings?.inventory?.expiryWarningPeriodDays || 45)).length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/60 rounded-2xl border border-dashed border-slate-205">
                    <p className="text-xs font-bold text-slate-400">No active products match system expiration warning conditions.</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Every medicine stored in warehouse has valid and safe shelf durations.</p>
                  </div>
                ) : (
                  <div className="overflow-hidden border border-slate-150 rounded-2xl divide-y divide-slate-100">
                    {medicines
                      .map(m => {
                        const days = getDaysToExpiry(m.expiryDate);
                        return { m, days };
                      })
                      .filter(({ days }) => days <= (settings?.inventory?.expiryWarningPeriodDays || 45))
                      .sort((a, b) => a.days - b.days)
                      .map(({ m, days }) => {
                        const isExpired = days <= 0;
                        const cat = categories.find(c => c.id === m.categoryId)?.name || "N/A Category";
                        const supplierName = suppliers.find(s => s.id === m.supplierId)?.name || "N/A Supplier";
                        const supplierEmail = suppliers.find(s => s.id === m.supplierId)?.email || "N/A Email";
                        
                        return (
                          <div key={m.id} className={`p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition ${isExpired ? "bg-rose-50/20 hover:bg-rose-50/40" : "hover:bg-slate-50/50"}`}>
                            <div className="space-y-1 md:max-w-md">
                              <div className="flex items-center space-x-2">
                                <span className={`text-[9.5px] font-black uppercase px-2 py-0.5 rounded-md border ${isExpired ? "bg-rose-105 border-rose-200 text-rose-800" : "bg-amber-100 border-amber-205 text-amber-800"}`}>
                                  {isExpired ? "EXPIRED" : "NEAR EXPIRY"}
                                </span>
                                <h4 className="text-xs font-black text-slate-800">{m.name}</h4>
                              </div>
                              <p className="text-[10.5px] text-slate-400 italic font-mono font-medium leading-tight">Generic Name: {m.genericName}</p>
                              
                              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-505 text-slate-500 font-semibold pt-1">
                                <div>SKU: <span className="font-mono text-slate-700">{m.SKU}</span></div>
                                <div>Batch: <span className="font-mono text-slate-700">{m.batchNumber || "N/A"}</span></div>
                                <div>Category: <span className="text-slate-700">{cat}</span></div>
                                <div>Cost Price: <span className="font-mono text-slate-705 text-slate-700">{formatCurrency(m.buyingPrice || m.sellingPrice * 0.7, currencySymbol)}</span></div>
                              </div>
                            </div>

                            <div className="flex flex-row md:flex-col md:items-end justify-between items-center text-right shrink-0">
                              <div className="text-left md:text-right space-y-0.5">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Status Alarm</div>
                                {isExpired ? (
                                  <div className="text-[10px] font-mono font-black text-rose-750 animate-pulse uppercase leading-none mt-1">
                                    Passed by {-days} days
                                  </div>
                                ) : (
                                  <div className="text-[10px] font-mono font-black text-amber-705 uppercase leading-none mt-1">
                                    Retires in {days} days
                                  </div>
                                )}
                              </div>

                              <div className="mt-2 text-left md:text-right">
                                <p className="text-[9.5px] text-slate-405 font-bold uppercase tracking-wide">Stock & Supplier</p>
                                <p className="text-xs font-extrabold text-slate-700 mt-1 leading-none">{m.quantity} Boxes remaining</p>
                                <p className="text-[9px] text-slate-400 mt-1 leading-tight">{supplierName} ({supplierEmail})</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-end">
              <button
                onClick={() => setShowExpiryTrackingDialog(false)}
                className="px-5 py-2 bg-[#093530] hover:bg-[#0c4a43] text-teal-300 font-bold text-xs rounded-xl shadow-md transition cursor-pointer select-none"
              >
                Acknowledge Warnings & Alarms
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
