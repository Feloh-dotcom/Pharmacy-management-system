/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { ShoppingBag, Plus, Clipboard, CheckCircle2, ChevronRight, RefreshCw, X } from "lucide-react";
import { PurchaseOrder, Supplier } from "../types";

export default function Orders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [showPOModal, setShowPOModal] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [buyingPrice, setBuyingPrice] = useState("");

  const loadPOData = async () => {
    try {
      const oRes = await fetch("/api/purchase-orders");
      const oList = await oRes.json();
      setOrders(oList);

      const sRes = await fetch("/api/suppliers");
      const sList = await sRes.json();
      setSuppliers(sList);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadPOData();
  }, []);

  const handleCreatePO = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !medicineName || !quantity || !buyingPrice) {
      alert("Please fill in all procurement list details.");
      return;
    }

    const payload = {
      supplierId: selectedSupplierId,
      items: [
        {
          medicineName,
          quantity: Number(quantity),
          buyingPrice: Number(buyingPrice)
        }
      ]
    };

    try {
      const res = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowPOModal(false);
        setMedicineName("");
        setQuantity("");
        setBuyingPrice("");
        loadPOData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateStatus = async (poId: string, status: "Approved" | "Received") => {
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        loadPOData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Procurements & Orders</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Issue Purchase Orders directly, coordinate with contract wholesalers, and inspect logistics shipments.</p>
        </div>

        <button
          onClick={() => {
            setSelectedSupplierId(suppliers[0]?.id || "");
            setShowPOModal(true);
          }}
          className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>New Purchase Order (PO)</span>
        </button>
      </div>

      {/* PO Lists */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">Issued Purchase Orders (PO) Logs</h2>
          <button onClick={loadPOData} className="p-1 rounded text-slate-400 hover:text-slate-600 transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {orders.map(order => {
            const isPending = order.status === "Pending";
            const isApproved = order.status === "Approved";
            const isReceived = order.status === "Received";

            return (
              <div key={order.id} className="p-4 border border-slate-200/80 rounded-2xl bg-slate-50/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 font-mono">PO: {order.id}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      isPending 
                        ? "bg-amber-50 border-amber-200 text-amber-700" 
                        : isApproved 
                          ? "bg-indigo-50 border-indigo-200 text-indigo-700 font-bold" 
                          : "bg-emerald-50 border-emerald-200 text-emerald-800"
                    }`}>
                      {order.status}
                    </span>
                  </div>

                  <p className="text-xs font-bold text-slate-800">Supplier: {order.supplierName}</p>
                  
                  {/* lists */}
                  <div className="space-y-1 block mt-2 text-[11px] text-slate-500 font-semibold leading-relaxed">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex space-x-2 font-mono">
                        <span>• {item.medicineName}</span>
                        <span>-</span>
                        <span className="text-slate-450 font-bold">Qty: {item.quantity}</span>
                        <span>-</span>
                        <span>Price: ${item.buyingPrice.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-right flex flex-col justify-between items-end gap-3 shrink-0">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Total Cost</span>
                    <span className="text-base font-black text-slate-800 font-mono">${order.totalAmount.toLocaleString()}</span>
                  </div>

                  <div className="flex space-x-2">
                    {isPending && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "Approved")}
                        className="py-1.5 px-3 bg-[#093530] text-teal-300 text-[10px] font-bold rounded-lg hover:bg-black transition cursor-pointer"
                      >
                        Approve PO
                      </button>
                    )}
                    {isApproved && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, "Received")}
                        className="py-1.5 px-3 bg-teal-650 hover:bg-teal-700 text-white text-[10px] font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Declare Goods Received
                      </button>
                    )}
                    {isReceived && (
                      <div className="text-[10.5px] text-emerald-700 font-bold flex items-center space-x-1 select-none">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Inventory Restocked</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Issuing Form Modal */}
      {showPOModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-sans font-bold text-slate-800">Issue Purchase Order</h3>
              <button onClick={() => setShowPOModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  Target Wholesaler
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl cursor-pointer"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  drug formulation Name
                </label>
                <input
                  type="text"
                  required
                  value={medicineName}
                  onChange={(e) => setMedicineName(e.target.value)}
                  placeholder="e.g. Paracetamol Tablets 500mg"
                  className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Order Quantity (Boxes)
                  </label>
                  <input
                    type="number"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="w-full text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Unit Buying Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={buyingPrice}
                    onChange={(e) => setBuyingPrice(e.target.value)}
                    placeholder="5.50"
                    className="w-full text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md block mt-4 border-none cursor-pointer"
              >
                Dispatch Purchase Order
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
