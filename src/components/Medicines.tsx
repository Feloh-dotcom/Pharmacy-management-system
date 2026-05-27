/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { 
  Plus, Search, Edit2, Trash2, Tag, 
  Layers, Package, ShieldAlert, Sparkles, Check, 
  Database, RefreshCw, X, Camera, Barcode
} from "lucide-react";
import { Medicine, Category, Supplier } from "../types";
import { formatSafeDateOnly, isDateExpired, formatCurrency, getDaysToExpiry } from "../utils";
import BarcodeScannerModal from "./BarcodeScannerModal";
import BarcodeRenderer from "./BarcodeRenderer";
import { useHardwareBarcodeScanner } from "../hooks/useHardwareBarcodeScanner";

interface MedicinesProps {
  editFocusMedicine: Medicine | null;
  clearEditFocus: () => void;
  settings?: any;
  user?: any;
  rolePermissions?: any[];
}

export default function Medicines({ editFocusMedicine, clearEditFocus, settings, user, rolePermissions }: MedicinesProps) {
  const currencySymbol = settings?.general?.currency || "Ksh.";
  const [medicines, setMedicines] = useState<Medicine[]>([]);

  // RBAC Permission Resolution
  const userPermissions = (rolePermissions || []).find(rp => rp.role === user?.role)?.permissions || {
    manageMedicines: user?.role === "Admin" || user?.role === "Pharmacist",
    manageInventory: user?.role === "Admin" || user?.role === "Pharmacist",
    addProducts: user?.role === "Admin" || user?.role === "Pharmacist",
    editProducts: user?.role === "Admin" || user?.role === "Pharmacist",
    addCategories: user?.role === "Admin" || user?.role === "Pharmacist",
    editCategories: user?.role === "Admin" || user?.role === "Pharmacist",
    adjustStock: user?.role === "Admin" || user?.role === "Pharmacist"
  };

  const canAddProduct = !!userPermissions.addProducts;
  const canEditProduct = !!userPermissions.editProducts;
  const canAdjustStock = !!userPermissions.adjustStock;
  const canDeleteProduct = user?.role === "Admin" || user?.role === "Pharmacist";
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Form fields State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [genericName, setGenericName] = useState("");
  const [SKU, setSKU] = useState("");
  const [batchNumber, setBatchNumber] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");
  const [sellingPrice, setSellingPrice] = useState("");
  const [quantity, setQuantity] = useState("");
  const [minStockLevel, setMinStockLevel] = useState("10");
  const [manufacturer, setManufacturer] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [prescriptionRequired, setPrescriptionRequired] = useState(false);
  const [barcode, setBarcode] = useState("");
  const [taxVat, setTaxVat] = useState("16");

  const [isFormScannerOpen, setIsFormScannerOpen] = useState(false);
  const [isGeneralScannerOpen, setIsGeneralScannerOpen] = useState(false);

  // Auto-intercept background hardware physical wedge scans
  useHardwareBarcodeScanner((scannedValue) => {
    if (showFormModal) {
      setBarcode(scannedValue);
      setToastMessage(`Hardware Wedge: Captured "${scannedValue}" into product Form!`);
    } else {
      setSearchTerm(scannedValue);
      setToastMessage(`Hardware Wedge: Lookup barcode "${scannedValue}"!`);
    }
    setTimeout(() => setToastMessage(null), 3000);
  }, true);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all"); // all, low, expired, regular
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const mRes = await fetch("/api/medicines");
      const medicinesList = await mRes.json();
      setMedicines(medicinesList);

      const cRes = await fetch("/api/categories");
      const categoriesList = await cRes.json();
      setCategories(categoriesList);

      const sRes = await fetch("/api/suppliers");
      const suppliersList = await sRes.json();
      setSuppliers(suppliersList);
    } catch (err) {
      console.error("Failed to load drug products database:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (settings?.financial?.vatPercentage !== undefined && !editingId) {
      setTaxVat(String(settings.financial.vatPercentage));
    }
  }, [settings?.financial?.vatPercentage, editingId]);

  // Handle outside focus request to edit medicine (from Dashboard link clicks)
  useEffect(() => {
    if (editFocusMedicine) {
      fillFormForEdit(editFocusMedicine);
      clearEditFocus();
    }
  }, [editFocusMedicine]);

  const fillFormForEdit = (med: Medicine) => {
    setEditingId(med.id);
    setName(med.name);
    setGenericName(med.genericName);
    setSKU(med.SKU);
    setBatchNumber(med.batchNumber);
    setExpiryDate(med.expiryDate);
    setBuyingPrice(med.buyingPrice.toString());
    setSellingPrice(med.sellingPrice.toString());
    setQuantity(med.quantity.toString());
    setMinStockLevel(med.minStockLevel.toString());
    setManufacturer(med.manufacturer);
    setCategoryId(med.categoryId);
    setSupplierId(med.supplierId);
    setPrescriptionRequired(med.prescriptionRequired);
    setBarcode(med.barcode);
    setTaxVat(med.taxVat.toString());
    
    setShowFormModal(true);
  };

  const handleOpenCreate = () => {
    setEditingId(null);
    setName("");
    setGenericName("");
    setSKU(`MED-${Math.random().toString(36).substr(2, 4).toUpperCase()}`);
    setBatchNumber(`BCH-${Math.floor(10000 + Math.random() * 90000)}`);
    setExpiryDate("");
    setBuyingPrice("");
    setSellingPrice("");
    setQuantity("");
    setMinStockLevel("10");
    setManufacturer("");
    setCategoryId(categories[0]?.id || "");
    setSupplierId(suppliers[0]?.id || "");
    setPrescriptionRequired(false);
    setBarcode(`890${Math.floor(1000000000 + Math.random() * 9000000000)}`);
    setTaxVat("16");

    setShowFormModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const payload = {
      name, genericName, SKU, batchNumber, expiryDate,
      buyingPrice: Number(buyingPrice),
      sellingPrice: Number(sellingPrice),
      quantity: Number(quantity),
      minStockLevel: Number(minStockLevel),
      manufacturer, categoryId, supplierId,
      prescriptionRequired, barcode,
      taxVat: Number(taxVat)
    };

    const url = editingId ? `/api/medicines/${editingId}` : "/api/medicines";
    const method = editingId ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": user?.email || ""
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setToastMessage(`Product records ${editingId ? 'saved' : 'created'} successfully!`);
        setShowFormModal(false);
        loadData();
        setTimeout(() => setToastMessage(null), 3000);
      } else {
        const err = await res.json();
        alert(`Failed: ${err.error}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (medId: string) => {
    if (!confirm("Are you sure you want to retire this medicine profile?")) return;
    try {
      const res = await fetch(`/api/medicines/${medId}`, { 
        method: "DELETE",
        headers: {
          "X-User-Email": user?.email || ""
        }
      });
      if (res.ok) {
        setToastMessage("Medicine securely flagged and removed from active list.");
        loadData();
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Filter computations
  const now = new Date();
  const filteredMedicines = medicines.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.SKU.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === "all" || m.categoryId === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === "low") {
      matchesStock = m.quantity <= m.minStockLevel;
    } else if (stockFilter === "expired") {
      matchesStock = isDateExpired(m.expiryDate);
    }

    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-teal-950 border border-teal-800 text-teal-300 px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-2 z-50 animate-bounce">
          <Check className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">
            Product Inventory
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Browse corporate formulation profiles, barcode SKUs, drug categories, and expiry matrices.
          </p>
        </div>

        {canAddProduct && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4.5 py-2.5 rounded-xl shadow-md cursor-pointer transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add New formulation</span>
          </button>
        )}
      </div>

      {/* Statistics and alerts strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-4">
        <div className="flex items-center space-x-3.5">
          <Package className="w-5 h-5 text-teal-600" />
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total SKUs</p>
            <p className="text-base font-extrabold text-slate-700">{medicines.length}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 border-l border-slate-200 pl-4">
          <ShieldAlert className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Low Stock Alerts</p>
            <p className="text-base font-extrabold text-slate-700">
              {medicines.filter(m => m.quantity <= m.minStockLevel).length} item packs
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 border-l border-slate-200 pl-4">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Expired Batches</p>
            <p className="text-base font-extrabold text-slate-700">
              {medicines.filter(m => isDateExpired(m.expiryDate)).length} items
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3.5 border-l border-slate-200 pl-4">
          <Tag className="w-5 h-5 text-indigo-500" />
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Active Categories</p>
            <p className="text-base font-extrabold text-slate-700">{categories.length}</p>
          </div>
        </div>
      </div>

      {/* Filter and query controls */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col md:flex-row flex-wrap items-center gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] w-full flex space-x-2 items-center">
          <div className="relative flex-1 font-sans">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, barcode or generic formulation..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsGeneralScannerOpen(true)}
            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-[#093530] rounded-xl transition flex items-center space-x-1 border border-slate-200 cursor-pointer shadow-sm shrink-0"
            title="Scan code to search database"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black px-0.5 uppercase">Scan Search</span>
          </button>
        </div>

        {/* Category filter dropdown selection */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl cursor-pointer"
          >
            <option value="all">All Drug Groups</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Stock alerts Filter switcher */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">Stock Level:</span>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl cursor-pointer"
          >
            <option value="all">All Stocks</option>
            <option value="low">Low stock</option>
            <option value="expired">Near / Expired</option>
          </select>
        </div>

        {/* Manual DB reload button */}
        <button
          onClick={loadData}
          className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-400 hover:text-slate-600 rounded-xl transition"
        >
          <RefreshCw className="w-3.5 h-3.5 font-bold" />
        </button>
      </div>

      {/* Medicines Inventory List Grid Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 space-y-3">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
            <p className="text-xs font-semibold text-slate-400">Loading catalog matrix ledger...</p>
          </div>
        ) : filteredMedicines.length === 0 ? (
          <div className="text-center p-12 text-slate-400 font-bold text-xs">
            No medicine records found matches the criteria filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-5">formulation Detail</th>
                  <th className="py-3.5 px-5">SKU / Batch</th>
                  <th className="py-3.5 px-5">Category</th>
                  <th className="py-3.5 px-5">Prices (Buy / Sell)</th>
                  <th className="py-3.5 px-5">Stock Level</th>
                  <th className="py-3.5 px-5">Expiry Date</th>
                  <th className="py-3.5 px-5 text-center">prescription</th>
                  <th className="py-3.5 px-5 text-right pr-6">Retire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredMedicines.map((med) => {
                  const isLow = med.quantity <= med.minStockLevel;
                  const isExpired = isDateExpired(med.expiryDate);
                  const catName = categories.find(c => c.id === med.categoryId)?.name || "Unassigned";

                  return (
                    <tr key={med.id} className="hover:bg-slate-50/60 text-slate-600 font-semibold text-xs leading-none">
                      <td className="py-4.5 px-5">
                        <div className="flex items-center space-x-3.5">
                          <img
                            src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&h=80&fit=crop"}
                            alt={med.name}
                            className="w-10 h-10 rounded-xl object-cover shrink-0 bg-slate-50 border border-slate-200"
                          />
                          <div>
                            <p className="text-xs font-bold text-slate-800 tracking-tight leading-none mb-1">{med.name}</p>
                            <p className="text-[10px] text-slate-400 italic">Generic: {med.genericName || "NoneSpecified"}</p>
                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-wider font-mono bg-slate-100 px-1.5 py-0.5 rounded-md inline-block">
                              {med.manufacturer}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-5">
                        <div className="space-y-0.5 font-mono">
                          <p className="text-[10.5px] font-bold text-slate-700">{med.SKU}</p>
                          <p className="text-[9px] text-slate-400 font-semibold">Bch: {med.batchNumber}</p>
                        </div>
                      </td>
                      <td className="py-4.5 px-5">
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                          {catName}
                        </span>
                      </td>
                      <td className="py-4.5 px-5">
                        <div className="space-y-0.5 font-mono">
                          <p className="text-[10.5px] text-slate-400">Buy: {formatCurrency(med.buyingPrice, currencySymbol)}</p>
                          <p className="text-[11.5px] font-bold text-teal-700">Sell: {formatCurrency(med.sellingPrice, currencySymbol)}</p>
                        </div>
                      </td>
                      <td className="py-4.5 px-5">
                        <div className="flex items-center space-x-1.5">
                          <span 
                            className={`w-2 h-2 rounded-full ${
                              med.quantity === 0 
                                ? "bg-rose-600 animate-ping" 
                                : isLow 
                                  ? "bg-amber-500 animate-pulse" 
                                  : "bg-emerald-500"
                            }`} 
                          />
                          <div>
                            <span className="font-bold text-slate-700 font-mono">{med.quantity}</span>
                            <p className="text-[9px] text-slate-400 mt-0.5">Min: {med.minStockLevel}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4.5 px-5">
                        {(() => {
                          const daysLeft = getDaysToExpiry(med.expiryDate);
                          const isExp = daysLeft <= 0;
                          const bufferDays = settings?.inventory?.expiryWarningPeriodDays || 45;
                          const isNearExp = daysLeft > 0 && daysLeft <= bufferDays;

                          if (isExp) {
                            return (
                              <div className="space-y-1">
                                <span className="font-extrabold font-mono text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-md text-[10px] uppercase inline-block">
                                  EXPIRED
                                </span>
                                <p className="text-[9.5px] font-semibold text-rose-500 font-mono italic">
                                  Passed by {-daysLeft}d
                                </p>
                                <p className="text-[8.5px] text-slate-400 font-mono font-medium">
                                  {formatSafeDateOnly(med.expiryDate)}
                                </p>
                              </div>
                            );
                          } else if (isNearExp) {
                            return (
                              <div className="space-y-1">
                                <span className="font-extrabold font-mono text-amber-805 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-md text-[10px] uppercase inline-block">
                                  NEAR EXPIRY
                                </span>
                                <p className="text-[9.5px] font-semibold text-amber-600 font-mono italic">
                                  Expires in {daysLeft}d
                                </p>
                                <p className="text-[8.5px] text-slate-400 font-mono font-medium">
                                  {formatSafeDateOnly(med.expiryDate)}
                                </p>
                              </div>
                            );
                          } else {
                            return (
                              <div className="space-y-0.5">
                                <span className="text-slate-600 font-extrabold font-mono text-[10.5px]">
                                  {formatSafeDateOnly(med.expiryDate)}
                                </span>
                                <p className="text-[9px] text-teal-605 font-bold font-sans uppercase">
                                  Safe ({daysLeft} days)
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </td>
                      <td className="py-4.5 px-5 text-center">
                        {med.prescriptionRequired ? (
                          <span className="text-[10px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-1 rounded-full">
                            Rx Required
                          </span>
                        ) : (
                          <span className="text-[10px] font-extrabold text-slate-400 bg-slate-50 px-2 py-1 rounded-full">
                            OTC
                          </span>
                        )}
                      </td>
                      <td className="py-4.5 px-5 text-right pr-6">
                        <div className="flex items-center justify-end space-x-1.5">
                          {canEditProduct && (
                            <button
                              id={`btn-med-edit-${med.id}`}
                              onClick={() => fillFormForEdit(med)}
                              className="p-1 px-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDeleteProduct && (
                            <button
                              id={`btn-med-delete-${med.id}`}
                              onClick={() => handleDelete(med.id)}
                              className="p-1 px-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!canEditProduct && !canDeleteProduct && (
                            <span className="text-[10px] text-slate-400 font-medium italic">Read-only</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Dynamic Creation / Modification Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center space-x-1.5">
                <Database className="w-5 h-5 text-teal-600" />
                <h3 className="font-sans font-bold text-slate-800">
                  {editingId ? "Update Medical formulation" : "Initialize New Drug formulation"}
                </h3>
              </div>
              <button 
                onClick={() => setShowFormModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Medicine Trademark Name */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Formulation Trademark Name (Brand)
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Amoxil-500"
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-1 focus:ring-teal-500"
                  />
                </div>

                {/* Generic ingredient Name */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Generic Composition Name
                  </label>
                  <input
                    type="text"
                    required
                    value={genericName}
                    onChange={(e) => setGenericName(e.target.value)}
                    placeholder="Amoxicillin Trihydrate"
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {/* SKU Code */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    required
                    value={SKU}
                    onChange={(e) => setSKU(e.target.value)}
                    placeholder="MED-AMX-001"
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                {/* Batch Identification Number */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Batch Number (Manufacturer)
                  </label>
                  <input
                    type="text"
                    required
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="BCH-99210"
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                {/* Barcode representation */}
                <div className="flex flex-col space-y-1">
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Barcode ID / EAN Range
                  </label>
                  <div className="flex space-x-1.5 items-center">
                    <input
                      type="text"
                      required
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      placeholder="e.g. 8901234567890"
                      className="flex-1 text-xs font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                    
                    {/* Active Form scan camera trigger */}
                    <button
                      type="button"
                      onClick={() => setIsFormScannerOpen(true)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-teal-900 rounded-xl transition cursor-pointer shrink-0"
                      title="Scan using webcam"
                    >
                      <Camera className="w-4 h-4" />
                    </button>

                    {/* Auto code creator */}
                    <button
                      type="button"
                      onClick={() => {
                        const randomSuffix = Math.floor(1000000000 + Math.random() * 9000000000);
                        setBarcode(`890${randomSuffix}`);
                        setToastMessage("Created unique EAN barcode profile.");
                        setTimeout(() => setToastMessage(null), 3000);
                      }}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-teal-800 rounded-xl transition cursor-pointer shrink-0 flex items-center space-x-1 font-bold text-[10px]"
                      title="Auto generate barcode"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Gen</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Live interactive label printing block */}
              {barcode.trim() && (
                <div className="border border-teal-100 bg-teal-50/10 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                  <div className="shrink-0 flex justify-center w-full md:w-auto">
                    <BarcodeRenderer
                      value={barcode}
                      productName={name || "New Product Profile"}
                      price={Number(sellingPrice) || 0}
                      showPrint={true}
                    />
                  </div>
                  <div className="space-y-1 text-left flex-1">
                    <h4 className="text-[11px] font-extrabold text-[#093530] uppercase">Product Label Dispatch Sticker</h4>
                    <p className="text-[10px] text-slate-500 leading-normal">
                      The dynamically generated vector pattern updates in real-time as you modify pricing or description details. Click **Print** to send a 50mm x 30mm standard label payload to your thermal printers.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                {/* Category ID mapping */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Therapeutic Category Group
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl cursor-pointer"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Primary Supplier Map */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Contract supplier Linkage
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl cursor-pointer"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Manufacturer Branding */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Branded Manufacturer Corp.
                  </label>
                  <input
                    type="text"
                    required
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    placeholder="Pfizer Ltd"
                    className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                {/* Pack Buying Price cost */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Buying Price Cost ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    placeholder="90.00"
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                {/* Pack Retail Selling Price */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Selling Retail price ({currencySymbol})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    placeholder="150.00"
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                {/* Available Quantity */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Current Box Quantity
                  </label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    disabled={!canAdjustStock}
                    className="w-full text-[12px] font-mono font-black text-slate-700 bg-slate-50 border border-slate-200 p-1.5 rounded-xl disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>

                {/* Minimum stock thresholds level */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Safety Margin Min
                  </label>
                  <input
                    type="number"
                    required
                    value={minStockLevel}
                    onChange={(e) => setMinStockLevel(e.target.value)}
                    disabled={!canAdjustStock}
                    className="w-full text-[12px] font-mono font-black text-slate-700 bg-slate-50 border border-slate-200 p-1.5 rounded-xl disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-1.5">
                {/* Expiry Date picker */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Clinical shelf Expiry Date
                  </label>
                  <input
                    type="date"
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full text-xs font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl cursor-pointer"
                  />
                </div>

                {/* Tax / VAT representation */}
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    VAT Tax Index (%)
                  </label>
                  <input
                    type="number"
                    required
                    value={taxVat}
                    onChange={(e) => setTaxVat(e.target.value)}
                    placeholder="16"
                    className="w-full text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                {/* Prescription regulations required check */}
                <div className="flex flex-col justify-end pb-1.5 px-1.5">
                  <label className="flex items-center space-x-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={prescriptionRequired}
                      onChange={(e) => setPrescriptionRequired(e.target.checked)}
                      className="rounded text-teal-600 focus:ring-teal-500 w-4.5 h-4.5"
                    />
                    <span className="text-[11.5px] font-extrabold text-slate-700">
                      prescription Required (Rx)
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5 mt-6 flex justify-end space-x-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition"
                >
                  Discard Changes
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center space-x-1"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? "Save Medical formulation" : "Initialize Formulation"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Form Barcode Scanning Station */}
      <BarcodeScannerModal
        isOpen={isFormScannerOpen}
        onClose={() => setIsFormScannerOpen(false)}
        onScanSuccess={(val) => {
          setBarcode(val);
          setToastMessage(`Form: Populated barcode sequence "${val}"`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
        title="Form Barcode Acquisition"
        description="Scan any product container to automatically extract and register its barcode sequence."
        customMedicines={medicines}
      />

      {/* General Catalog Search Scan Portal */}
      <BarcodeScannerModal
        isOpen={isGeneralScannerOpen}
        onClose={() => setIsGeneralScannerOpen(false)}
        onScanSuccess={(val) => {
          setSearchTerm(val);
          setToastMessage(`Searched product matching barcode sequence "${val}"`);
          setTimeout(() => setToastMessage(null), 3500);
        }}
        title="Inventory Search Scan Station"
        description="Scan any item packaging to instantly search and isolate matching inventory profiles."
        customMedicines={medicines}
      />

    </div>
  );
}
