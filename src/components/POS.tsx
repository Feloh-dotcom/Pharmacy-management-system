/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ShoppingCart, Search, Tag, Users, Minus, Plus, Trash2, 
  CreditCard, Check, Sparkles, FileText, Printer, RefreshCw, X
} from "lucide-react";
import { Medicine, Customer, Sale, SystemSettings } from "../types";
import { formatSafeDateTime } from "../utils";

interface POSProps {
  settings?: SystemSettings | null;
  onNavigate?: (tab: string) => void;
}

export default function POS({ settings, onNavigate }: POSProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<Array<{ medicine: Medicine; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);

  const currencySymbol = settings?.general?.currency || "$";
  
  // Selection / checkout inputs
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa" | "Card">("Cash");
  const [discountAmount, setDiscountAmount] = useState(0);
  
  const [loading, setLoading] = useState(false);
  const [checkoutResult, setCheckoutResult] = useState<{ invoiceNumber: string; sale: Sale } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadPOSData = async () => {
    try {
      // Check active Cash Register session first
      const sessRes = await fetch("/api/cash-register/active");
      if (sessRes.ok) {
        const sessData = await sessRes.json();
        setHasActiveSession(!!sessData);
      } else {
        setHasActiveSession(false);
      }

      const mRes = await fetch("/api/medicines");
      const mData = await mRes.json();
      setMedicines(mData.filter((m: Medicine) => m.quantity > 0)); // only load instock drugs for POS

      const cRes = await fetch("/api/customers");
      const cData = await cRes.json();
      setCustomers(cData);
    } catch (e) {
      console.error("Failed to load POS details:", e);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  const addToCart = (med: Medicine) => {
    const existing = cart.find(item => item.medicine.id === med.id);
    if (existing) {
      const targetQty = existing.quantity + 1;
      if (targetQty > med.quantity) {
        alert(`Cannot add more. Safe stock maximum reached (${med.quantity} boxes remaining).`);
        return;
      }
      setCart(cart.map(item => item.medicine.id === med.id ? { ...item, quantity: targetQty } : item));
    } else {
      setCart([...cart, { medicine: med, quantity: 1 }]);
    }
  };

  const updateCartQty = (medId: string, quantity: number) => {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;
    if (quantity > med.quantity) {
      alert(`Safe stock threshold exceeded. Only ${med.quantity} matching boxes left.`);
      return;
    }
    if (quantity <= 0) {
      setCart(cart.filter(item => item.medicine.id !== medId));
    } else {
      setCart(cart.map(item => item.medicine.id === medId ? { ...item, quantity } : item));
    }
  };

  const deleteFromCart = (medId: string) => {
    setCart(cart.filter(item => item.medicine.id !== medId));
  };

  // Pricing relational calculations
  const subtotal = cart.reduce((sum, item) => sum + (item.medicine.sellingPrice * item.quantity), 0);
  const tax = cart.reduce((sum, item) => sum + (item.medicine.sellingPrice * item.quantity * (item.medicine.taxVat / 100)), 0);
  
  // Custom Insurance Copay Modifier calculations
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const copayPercent = activeCustomer?.copayPercent !== undefined ? activeCustomer.copayPercent : 100; // default 100% user copay, no insurance
  const insurancePays = subtotal + tax - ((subtotal + tax) * (copayPercent / 100));
  const userOwesBeforeDiscount = (subtotal + tax) * (copayPercent / 100);
  const finalTotal = Math.max(0, userOwesBeforeDiscount - discountAmount);

  const handleCheckout = async () => {
    if (!cart.length) {
      alert("Shopping cart is empty.");
      return;
    }

    setLoading(true);
    const checkoutPayload = {
      customerId: selectedCustomerId,
      items: cart.map(item => ({
        medicineId: item.medicine.id,
        quantity: item.quantity
      })),
      paymentMethod,
      discountAmount
    };

    try {
      const response = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload)
      });
      const data = await response.json();

      if (response.ok) {
        setCheckoutResult(data);
        setCart([]);
        setSuccessToast(`Checkout recorded! Invoice ${data.invoiceNumber} disbursed.`);
        setShowReceiptModal(true);
        loadPOSData(); // Reload available stock levels
        setTimeout(() => setSuccessToast(null), 3000);
      } else {
        alert(data.error || "Checkout failed. Review stock reserves");
      }
    } catch (e) {
      console.error(e);
      alert("Internal error submitting sales transaction");
    } finally {
      setLoading(false);
    }
  };

  const filteredMedicines = medicines.filter(m => 
    m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.genericName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.SKU.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pb-12 animate-in fade-in duration-300">
      
      {!hasActiveSession && (
        <div className="col-span-12 p-5 bg-amber-50 border border-amber-200 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <span className="text-xl leading-none">⚠️</span>
            <div>
              <h4 className="text-xs font-bold text-slate-800">No Active Cash Register Session Found</h4>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-relaxed">
                An administrator or cashier must launch and Open a Cash Register Session with an initial float balance before dispensing medicines or recording POS sales transactions.
              </p>
            </div>
          </div>
          {onNavigate && (
            <button
              onClick={() => onNavigate("cash-register")}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-teal-300 font-bold text-xs rounded-xl shrink-0 cursor-pointer shadow-sm transition"
            >
              Open Cash Register
            </button>
          )}
        </div>
      )}
      
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-teal-950 border border-teal-800 text-teal-300 px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center space-x-2 animate-bounce">
          <Check className="w-4 h-4 text-teal-400" />
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* LEFT COLUMN: Drug formulation indexing (7 Cols Grid) */}
      <div className="lg:col-span-7 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">POS Cashier Dispenser</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Dispense medicines instantly, search EAN barcodes, and automatically deduct warehouse stocks.</p>
          </div>
          <button onClick={loadPOSData} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search EAN, brand tablet, generic capsule composition..."
            className="w-full pl-9 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Drug formulation Matrix Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedicines.map(med => {
            const isNearLow = med.quantity <= med.minStockLevel || med.quantity < 15;
            
            return (
              <div 
                key={med.id} 
                className="bg-white border border-slate-200 rounded-2xl p-4.5 flex flex-col justify-between hover:shadow-md transition duration-200 relative overflow-hidden group"
              >
                {/* Micro Rx logo identifier inside cards */}
                {med.prescriptionRequired && (
                  <span className="absolute top-0 right-0 bg-rose-50 text-rose-700 text-[9px] font-black tracking-wide uppercase px-2.5 py-1 rounded-bl-xl border-l border-b border-rose-100">
                    Rx
                  </span>
                )}

                <div>
                  <div className="flex items-start space-x-3">
                    <img
                      src={med.imageUrl || "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=80&h=80&fit=crop"}
                      alt={med.name}
                      className="w-12 h-12 rounded-xl object-cover border border-slate-100"
                    />
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 leading-none">{med.name}</h3>
                      <p className="text-[10px] text-slate-400 italic mt-0.5">{med.genericName}</p>
                      <p className="text-[9px] text-slate-400 font-mono mt-1">SKU: {med.SKU}</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {currencySymbol}{med.sellingPrice.toFixed(2)}
                    </span>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-lg ${isNearLow ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-teal-50 text-teal-600"}`}>
                      In-Stock: {med.quantity}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-3">
                  <button
                    id={`btn-pos-add-to-cart-${med.id}`}
                    onClick={() => addToCart(med)}
                    className="w-full flex items-center justify-center space-x-1.5 py-1.5 bg-slate-50 hover:bg-[#093530] hover:text-teal-300 text-slate-600 font-bold text-[11px] rounded-xl transition-all duration-200 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to checkout</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: active receipt cart & financial validation (5 Cols) */}
      <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 h-fit space-y-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-800 flex items-center">
          <ShoppingCart className="w-4 h-4 mr-2 text-teal-600" />
          <span>Dispensing Cart</span>
          {cart.length > 0 && (
            <span className="ml-2 w-5 h-5 rounded-full bg-teal-100 text-teal-800 text-[10px] font-bold flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </h2>

        {/* Empty State Cart */}
        {cart.length === 0 ? (
          <div className="py-12 text-center text-slate-400 font-bold text-xs">
            Cart is empty. Add medicine formulations from the catalog panel.
          </div>
        ) : (
          <div className="space-y-4">
            {/* items List scroll block */}
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {cart.map(item => (
                <div key={item.medicine.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="max-w-[150px]">
                    <h4 className="text-[11.5px] font-bold text-slate-800 truncate">{item.medicine.name}</h4>
                    <p className="text-[9px] text-slate-400 font-mono truncate">SKU: {item.medicine.SKU}</p>
                  </div>
                  
                  {/* Inline qty selectors */}
                  <div className="flex items-center space-x-1 bg-slate-50 border border-slate-200 p-0.5 rounded-lg shrink-0">
                    <button 
                      onClick={() => updateCartQty(item.medicine.id, item.quantity - 1)}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded shrink-0 font-bold"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-5 text-center font-black font-sans text-xs text-slate-800 select-none">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateCartQty(item.medicine.id, item.quantity + 1)}
                      className="p-1 text-slate-500 hover:bg-slate-200 rounded shrink-0 font-bold"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  <span className="text-[11.5px] font-bold text-slate-700 font-mono shrink-0">
                    {currencySymbol}{(item.medicine.sellingPrice * item.quantity).toFixed(2)}
                  </span>

                  <button 
                    onClick={() => deleteFromCart(item.medicine.id)}
                    className="p-1 text-rose-500 hover:bg-rose-50 rounded transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Customer Mapping Linkage selection */}
            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">
                Client / health Insurance Profile
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full pl-8.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  <option value="">Anonymous Walk-in Customer [Cash Only]</option>
                  {customers.map(c => {
                    const isInsured = !!c.insuranceProvider;
                    return (
                      <option key={c.id} value={c.id}>
                        {c.name} {isInsured ? `(${c.insuranceProvider} - ${c.copayPercent}% Copay)` : "[No Insurance]"}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* Payment avenues channels toggles */}
            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1.5 px-0.5">
                Settlement Channel
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(["Cash", "M-Pesa", "Card"] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setPaymentMethod(method)}
                    className={`py-2 text-[11px] font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                      paymentMethod === method
                        ? "bg-[#093530] text-teal-300 border-transparent shadow shadow-teal-900/40 font-extrabold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {method === "M-Pesa" ? "📲" : method === "Card" ? "💳" : "💵"}
                    <span>{method}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Discount field */}
            <div>
              <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                Discount Code / Rebate Amount ({currencySymbol})
              </label>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                placeholder="0.00"
                className="w-full text-xs font-bold font-mono text-slate-700 bg-slate-50 border border-slate-200 p-2 rounded-xl"
              />
            </div>

            {/* Financial Calculations list */}
            <div className="space-y-2 border-t border-slate-100 pt-4.5 text-slate-500 font-semibold text-xs leading-none">
              <div className="flex justify-between">
                <span>Subtotal Price:</span>
                <span className="font-mono text-slate-700">{currencySymbol}{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Tax Liability (16% implicit):</span>
                <span className="font-mono text-slate-700">{currencySymbol}{tax.toFixed(2)}</span>
              </div>
              {selectedCustomerId && activeCustomer?.insuranceProvider && (
                <>
                  <div className="flex justify-between text-indigo-600">
                    <span>Insurance Coverage ({100 - copayPercent}%):</span>
                    <span className="font-mono">-{currencySymbol}{insurancePays.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700 select-none pb-1.5 border-b border-dashed border-slate-100">
                    <span>Patient Copay Portion ({copayPercent}%):</span>
                    <span className="font-mono">{currencySymbol}{userOwesBeforeDiscount.toFixed(2)}</span>
                  </div>
                </>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Rebate Discount:</span>
                  <span className="font-mono">-{currencySymbol}{discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-800 pt-2">
                <span>Final Settlement Total:</span>
                <span className="font-mono text-teal-700">{currencySymbol}{finalTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Launch Checkout button */}
            <button
              id="btn-pos-dispatch-checkout"
              onClick={handleCheckout}
              disabled={loading}
              className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all duration-200 flex items-center justify-center space-x-2 disabled:opacity-40"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span>Dispense & Disburse Invoice</span>
            </button>
          </div>
        )}
      </div>

      {/* Receipts Invoice visual representation modal */}
      {showReceiptModal && checkoutResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0">
              <h3 className="font-sans font-bold text-slate-800 flex items-center">
                <FileText className="w-4.5 h-4.5 text-teal-600 mr-2" />
                <span>Invoice Generated</span>
              </h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="p-1 text-slate-400 hover:bg-slate-100 rounded-full transition"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Printable Prescription Bill Receipt style layout */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-slate-700 text-xs text-left">
              <div className="text-center border-b border-dashed border-slate-200 pb-4">
                <p className="text-sm font-black tracking-widest text-[#093530] uppercase">
                  {settings?.general?.pharmacyName || "PHARMACY GROUP ERP"}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  {settings?.general?.address || "Industrial Area, Sec 4, Nairobi"}
                </p>
                <p className="text-[10px] text-slate-400 font-bold">
                  {settings?.general?.phone ? `Tel: ${settings.general.phone}` : "Tel: +254 711 222333"}
                </p>
              </div>

              {/* metadata ledger */}
              <div className="space-y-1 bg-slate-50 p-3 rounded-xl border border-slate-100 uppercase font-semibold text-[10px] text-slate-500">
                <p><span className="text-slate-400">Invoice:</span> {checkoutResult.sale.invoiceNumber}</p>
                <p><span className="text-slate-400">Client:</span> {checkoutResult.sale.customerName}</p>
                <p><span className="text-slate-400">Settled:</span> {checkoutResult.sale.paymentMethod}</p>
                <p><span className="text-slate-400">Date:</span> {formatSafeDateTime(checkoutResult.sale.date)}</p>
                <p><span className="text-slate-400">Terminal:</span> Secure Register #A</p>
              </div>

              {/* Items Table ledger */}
              <div className="border-t border-b border-slate-200 py-3 space-y-2">
                <div className="flex justify-between font-extrabold text-[10px] text-slate-400">
                  <span>Product formulary</span>
                  <span>Qty * price</span>
                  <span>value</span>
                </div>
                {checkoutResult.sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between font-bold text-slate-700 text-[11px]">
                    <span className="truncate max-w-[170px]">{item.medicineName}</span>
                    <span>{item.quantity} * {currencySymbol}{item.price.toFixed(2)}</span>
                    <span>{currencySymbol}{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Calculation list */}
              <div className="space-y-1.5 text-right font-bold text-[11px]">
                <p>SUBTOTAL: {currencySymbol}{subtotal.toFixed(2)}</p>
                <p>VAT ASSESSED: {currencySymbol}{checkoutResult.sale.taxAmount.toFixed(2)}</p>
                {checkoutResult.sale.discount > 0 && (
                  <p className="text-emerald-600 font-extrabold font-mono">REBATE: -{currencySymbol}{checkoutResult.sale.discount.toFixed(2)}</p>
                )}
                <p className="text-base font-black text-teal-800 border-t border-dashed border-slate-200 pt-2 mt-1">
                  SETTLED: {currencySymbol}{checkoutResult.sale.totalPrice.toFixed(2)}
                </p>
              </div>

              {/* Barcode/QR footprint representation */}
              <div className="text-center pt-3 flex flex-col items-center">
                <div className="w-48 h-8 flex items-center justify-around border-t-2 border-b-2 border-slate-700 py-4 select-none opacity-40 mb-1">
                  <div className="w-0.5 h-full bg-black" />
                  <div className="w-1.5 h-full bg-black" />
                  <div className="w-0.5 h-full bg-black" />
                  <div className="w-2.5 h-full bg-black" />
                  <div className="w-1 h-full bg-black" />
                  <div className="w-0.5 h-full bg-black" />
                  <div className="w-1.5 h-full bg-black" />
                  <div className="w-2 h-full bg-black" />
                </div>
                <span className="text-[10px] font-bold text-slate-400">* {checkoutResult.sale.invoiceNumber} *</span>
                <p className="text-[9px] text-slate-400 text-center mt-3 max-w-[320px] font-black leading-relaxed italic block break-words">
                  {settings?.receipts?.receiptFooterText || "Clinical prescription complete. Thank you for choosing Nairobi Health Care Services!"}
                </p>
              </div>
            </div>

            {/* footer with printing triggers */}
            <div className="p-4 border-t border-slate-100 flex space-x-3 shrink-0">
              <button 
                onClick={() => window.print()}
                className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold text-xs rounded-xl flex items-center justify-center space-x-1"
              >
                <Printer className="w-4 h-4" />
                <span>Print receipt</span>
              </button>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl flex items-center justify-center"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
