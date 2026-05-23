/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { 
  Truck, Building, Plus, Mail, Phone, MapPin, 
  Search, Trash2, Edit2, RefreshCw, X, ShieldAlert, Check, Landmark
} from "lucide-react";
import { Supplier } from "../types";

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Create & Edit form states
  const [showModal, setShowModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");

  // Error/Success message states
  const [formError, setFormError] = useState("");

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const list = await res.json();
        setSuppliers(list);
      }
    } catch (e) {
      console.error("Error loading suppliers:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setName("");
    setEmail("");
    setPhone("");
    setCompanyName("");
    setAddress("");
    setFormError("");
    setShowModal(true);
  };

  const handleOpenEditModal = (sup: Supplier) => {
    setEditingSupplier(sup);
    setName(sup.name);
    setEmail(sup.email);
    setPhone(sup.phone);
    setCompanyName(sup.companyName);
    setAddress(sup.address);
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!name.trim()) {
      setFormError("Supplier Contact Person Name is required");
      return;
    }
    if (!companyName.trim()) {
      setFormError("Company/Manufacturer Name is required");
      return;
    }

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      companyName: companyName.trim(),
      address: address.trim(),
    };

    try {
      const url = editingSupplier 
        ? `/api/suppliers/${editingSupplier.id}` 
        : "/api/suppliers";
      
      const method = editingSupplier ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setShowModal(false);
        loadSuppliers();
      } else {
        const errData = await res.json();
        setFormError(errData.error || "Failed to process supplier request");
      }
    } catch (err) {
      console.error("Error submitting supplier:", err);
      setFormError("An unexpected error occurred. Please try again.");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Are you absolutely sure you want to delete supplier "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/suppliers/${id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        loadSuppliers();
      } else {
        alert("Failed to delete supplier. It might be linked to existing products or purchase orders.");
      }
    } catch (err) {
      console.error("Error deleting supplier:", err);
    }
  };

  const filteredSuppliers = suppliers.filter(sup => {
    const query = searchQuery.toLowerCase();
    return (
      sup.name.toLowerCase().includes(query) ||
      sup.companyName.toLowerCase().includes(query) ||
      sup.email.toLowerCase().includes(query) ||
      sup.phone.toLowerCase().includes(query) ||
      sup.address.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Suppliers Directory</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Manage pharmaceutical vendors, medical manufacturers, contact details, and procurement networks.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center space-x-1.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard New Supplier</span>
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-teal-50 border border-teal-100 rounded-xl text-teal-600">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Total Suppliers</p>
            <p className="text-lg font-black text-slate-700">{suppliers.length}</p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Manufacturers</p>
            <p className="text-lg font-black text-slate-700">
              {suppliers.filter(s => s.companyName.toLowerCase().includes("pharma") || s.companyName.toLowerCase().includes("labs") || s.companyName.toLowerCase().includes("lab")).length} active labs
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center space-x-4">
          <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-600">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono">Contract Status</p>
            <p className="text-lg font-black text-slate-700">100% Verified</p>
          </div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search suppliers by contact, company name, address or email..."
            className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 pl-10 pr-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
          />
        </div>
        <div className="shrink-0 flex items-center space-x-2 text-xs text-slate-400 font-semibold font-mono">
          <span>Displaying {filteredSuppliers.length} of {suppliers.length} records</span>
          <button 
            onClick={loadSuppliers} 
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition"
            title="Reload register"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Suppliers Grid Layout */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 font-mono">Loading suppliers record ledger...</p>
        </div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-450 mx-auto">
            <Truck className="w-6 h-6" />
          </div>
          <h3 className="font-sans font-extrabold text-slate-800 text-sm">No Suppliers Found</h3>
          <p className="text-xs text-slate-405 font-medium">
            No supplier profiles match your search criteria. Try a different query or register a new contract supplier.
          </p>
          <button
            onClick={handleOpenAddModal}
            className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow border-none cursor-pointer mt-2"
          >
            Add Supplier Record
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSuppliers.map(sup => {
            return (
              <div 
                key={sup.id} 
                className="bg-white border border-slate-200 rounded-3xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Supplier Header */}
                  <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-2xl bg-teal-50 border border-teal-100 text-teal-750 font-black flex items-center justify-center text-xs">
                        {sup.companyName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xs font-bold text-slate-800 leading-tight">{sup.companyName}</h3>
                        <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">ID: {sup.id}</p>
                      </div>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(sup)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-slate-50 transition"
                        title="Edit Supplier"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sup.id, sup.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-50 transition"
                        title="Delete Supplier"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Representative details */}
                  <div className="space-y-2 text-[11px] font-semibold text-slate-650">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-400 w-4 font-normal text-[10px] uppercase font-mono">Rep</span>
                      <span className="text-slate-800 font-extrabold">{sup.name}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {sup.email ? (
                        <a href={`mailto:${sup.email}`} className="hover:underline font-mono text-[10px] text-teal-700">
                          {sup.email}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No email documented</span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {sup.phone ? (
                        <a href={`tel:${sup.phone}`} className="hover:underline font-mono text-[10px] text-slate-700">
                          {sup.phone}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No contact registered</span>
                      )}
                    </div>

                    <div className="flex items-start space-x-2 pt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5" />
                      <span className="text-slate-500 font-medium leading-normal">
                        {sup.address || <span className="italic text-slate-405">No physical address documented</span>}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-50 flex items-center justify-between text-[10px]">
                  <span className="bg-teal-50 border border-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded-md flex items-center space-x-1">
                    <Check className="w-3 h-3 text-teal-600" />
                    <span>Active Vendor</span>
                  </span>
                  <span className="text-slate-350 font-mono font-medium">Compliance: Safe</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Creation & Amendment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-sans font-bold text-slate-800">
                {editingSupplier ? "Amend Supplier Contract Profile" : "Register Supplier Profile"}
              </h3>
              <button 
                onClick={() => setShowModal(false)} 
                className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl flex items-start space-x-2 text-[11px] font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  Company / Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Novartis Pharmaceuticals or Astra Labs"
                  className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  Contact Representative Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Susan Williams"
                  className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254 711 000000"
                    className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. licensing@company.com"
                    className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  Physical Address / Warehouse Location
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Plot 12, Industrial Area, Nairobi, Kenya"
                  className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/10 focus:border-teal-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md block mt-4 border-none cursor-pointer hover:shadow-lg transition-all"
              >
                {editingSupplier ? "Apply Changes" : "Onboard Supplier & Verify Profile"}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
