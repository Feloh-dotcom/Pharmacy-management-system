/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { Layers, Plus, Database, RefreshCw, CheckCircle } from "lucide-react";
import { Category } from "../types";

interface CategoriesProps {
  user?: any;
  rolePermissions?: any[];
}

export default function Categories({ user, rolePermissions }: CategoriesProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

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

  const canAddCategory = !!userPermissions.addCategories;

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories");
      const list = await res.json();
      setCategories(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setLoading(true);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": user?.email || ""
        },
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
        setSuccess(true);
        setName("");
        setDescription("");
        fetchCategories();
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-12 animate-in fade-in duration-300">
      
      {/* Category Creation Form */}
      {canAddCategory && (
        <div className="lg:col-span-1 bg-white border border-slate-200 rounded-3xl p-6 h-fit space-y-6 shadow-sm">
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
            <Database className="w-4.5 h-4.5 mr-2 text-teal-600" />
            <span>New Drug Category Mapping</span>
          </h2>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Category registered successfully!</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                Therapeutic Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Antiviral Capsular"
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                Composition Description Summary
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Fights systemic clinical viruses and blocks viral duplication indexes."
                rows={3}
                className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-teal-650 hover:bg-teal-700 text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Register Category</span>
            </button>
          </form>
        </div>
      )}

      {/* Category List Grid */}
      <div className={`${canAddCategory ? "lg:col-span-2" : "lg:col-span-3"} bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4`}>
        <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span>Active Drug Categories</span>
          <button onClick={fetchCategories} className="p-1 rounded text-slate-400 hover:text-slate-600 transition">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {categories.map(cat => (
            <div key={cat.id} className="p-4 bg-slate-50 border border-slate-250/50 rounded-2xl flex items-start space-x-3">
              <Layers className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">{cat.name}</h4>
                {cat.description && (
                  <p className="text-[10.5px] text-slate-400 leading-normal mt-1 block">
                    {cat.description}
                  </p>
                )}
                <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 block mt-2">
                  ID: {cat.id}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
