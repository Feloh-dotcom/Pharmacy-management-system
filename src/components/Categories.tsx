/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { Layers, Plus, Database, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";
import { Category } from "../types";
import { Input } from "./FormInputs";

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
  const [error, setError] = useState<string | null>(null);

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
      if (!res.ok) throw new Error("Failed to fetch categories");
      const list = await res.json();
      setCategories(list);
      setError(null);
    } catch (e) {
      console.error(e);
      setError("Failed to load categories");
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Category name is required");
      return;
    }
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": user?.email || ""
        },
        body: JSON.stringify({ name: name.trim(), description: description.trim() })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to register category");
      }
      
      setSuccess(true);
      setName("");
      setDescription("");
      await fetchCategories();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to register category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-300">
      
      {/* Category Creation Form - Always Visible */}
      {canAddCategory && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-6">
          <h2 className="text-sm font-bold text-slate-800 flex items-center">
            <Database className="w-4.5 h-4.5 mr-2 text-teal-600" />
            <span>Register New Drug Category</span>
          </h2>

          {success && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 text-xs font-semibold p-3.5 rounded-xl flex items-center space-x-2 animate-in fade-in">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span>Category registered successfully!</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-800 text-xs font-semibold p-3.5 rounded-xl flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Therapeutic Name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Antiviral Capsular"
              />

              <Input
                label="Description"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2.5 bg-teal-650 hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-xl shadow-md flex items-center justify-center space-x-1 transition"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Register Category</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={fetchCategories}
                disabled={loading}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-300 disabled:cursor-not-allowed text-slate-700 font-semibold text-xs rounded-xl shadow-sm transition"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Category List Grid */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 flex items-center justify-between">
          <span>Active Drug Categories ({categories.length})</span>
        </h2>

        {categories.length === 0 ? (
          <div className="text-center py-12">
            <Layers className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-xs text-slate-500">No categories registered yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => (
              <div key={cat.id} className="p-4 bg-gradient-to-br from-slate-50 to-slate-100/50 border border-slate-200/50 rounded-2xl flex flex-col space-y-3">
                <div className="flex items-start space-x-3">
                  <Layers className="w-4 h-4 text-teal-600 mt-1 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-800">{cat.name}</h4>
                    {cat.description && (
                      <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                        {cat.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="pt-2 border-t border-slate-200/50">
                  <span className="text-[8px] uppercase tracking-wider font-bold text-slate-400">
                    {cat.id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
