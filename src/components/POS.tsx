/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { 
  ShoppingCart, Search, Tag, Users, Minus, Plus, Trash2, 
  CreditCard, Check, Sparkles, FileText, Printer, RefreshCw, X, Camera,
  Minimize2, Maximize2, Smartphone, ShieldCheck, HelpCircle, Loader2
} from "lucide-react";
import { Medicine, Customer, Sale, SystemSettings, UserRole } from "../types";
import { formatSafeDateTime, formatCurrency, getDaysToExpiry, getExpiryStatus, formatSafeDateOnly } from "../utils";
import BarcodeScannerModal, { playScanBeep } from "./BarcodeScannerModal";
import { useHardwareBarcodeScanner } from "../hooks/useHardwareBarcodeScanner";
import { Input, CurrencyInput, Select } from "./FormInputs";

interface POSProps {
  settings?: SystemSettings | null;
  onNavigate?: (tab: string) => void;
  user?: any;
}

export default function POS({ settings, onNavigate, user }: POSProps) {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<Array<{ medicine: Medicine; quantity: number }>>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(true);

  const currencySymbol = settings?.general?.currency || "Ksh.";
  
  // Selection / checkout inputs
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "M-Pesa" | "Card" | "Split">("Cash");
  const [discountAmount, setDiscountAmount] = useState(0);

  // Custom M-Pesa / Split state variables
  const [cashSplitPaid, setCashSplitPaid] = useState<number>(0);
  const [mpesaSplitPaid, setMpesaSplitPaid] = useState<number>(0);
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState<string>("");
  const [showMpesaModal, setShowMpesaModal] = useState<boolean>(false);
  const [isMpesaMinimized, setIsMpesaMinimized] = useState<boolean>(false);
  const [mpesaProcessStatus, setMpesaProcessStatus] = useState<"Pending" | "Processing" | "Success" | "Failed" | "Timeout" | "Cancelled">("Pending");
  const [mpesaTxCode, setMpesaTxCode] = useState<string>("");
  const [mpesaCustomerName, setMpesaCustomerName] = useState<string>("");
  const [mpesaPollingActive, setMpesaPollingActive] = useState<boolean>(false);
  const [mpesaManualInputCode, setMpesaManualInputCode] = useState<string>("");
  const [mpesaAccountRef, setMpesaAccountRef] = useState<string>("");
  const [unclaimedMpesaTxns, setUnclaimedMpesaTxns] = useState<any[]>([]);
  const [showDevSimulator, setShowDevSimulator] = useState<boolean>(false);
  
  const [loading, setLoading] = useState(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"catalog" | "cart">("catalog");
  const [checkoutResult, setCheckoutResult] = useState<{ invoiceNumber: string; sale: Sale } | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPOSScannerOpen, setIsPOSScannerOpen] = useState(false);

  // Process barcode input from either Webcam scan or physical USB/Wedge scanner
  const handleBarcodeScanInPOS = (barcodeVal: string) => {
    const clean = barcodeVal.trim();
    if (!clean) return;

    const matched = medicines.find(
      m => m.barcode === clean || m.id === clean || (m.SKU || "").toLowerCase() === clean.toLowerCase()
    );

    if (matched) {
      if (matched.quantity <= 0) {
        playScanBeep(false);
        alert(`Out of Stock: "${matched.name}" has 0 units in inventory.`);
        return;
      }
      // Play high-frequency scanner beep sound!
      playScanBeep(true);
      addToCart(matched);
      setSuccessToast(`Added to cart: ${matched.name}`);
      setTimeout(() => setSuccessToast(null), 3000);
    } else {
      playScanBeep(false);
      setSuccessToast(`Product code "${clean}" not found.`);
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  // Listen globally for background rapid hardware barcodes
  useHardwareBarcodeScanner((scannedValue) => {
    handleBarcodeScanInPOS(scannedValue);
  }, !showReceiptModal && hasActiveSession);

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
      if (mRes.ok && mRes.headers.get("Content-Type")?.includes("json")) {
        const mData = await mRes.json();
        setMedicines(mData.filter((m: Medicine) => m.quantity > 0)); // only load instock drugs for POS
      } else {
        setMedicines([]);
      }

      const cRes = await fetch("/api/customers");
      if (cRes.ok && cRes.headers.get("Content-Type")?.includes("json")) {
        const cData = await cRes.json();
        setCustomers(cData);
      } else {
        setCustomers([]);
      }
    } catch (e) {
      console.error("Failed to load POS details:", e);
    }
  };

  useEffect(() => {
    loadPOSData();
  }, []);

  const addToCart = (med: Medicine) => {
    const daysLeft = getDaysToExpiry(med.expiryDate);
    const isExpired = daysLeft <= 0;
    const preventSale = settings?.inventory?.preventSaleOfExpiredGoods !== false;

    if (isExpired) {
      if (preventSale) {
        const canOverride = user?.role === "admin" || user?.role === "pharmacist";
        if (!canOverride) {
          alert(`Expired Product: "${med.name}" has EXPIRED! Current settings prohibit selling expired medicines. Please consult an Administrator.`);
          return;
        }

        const confirmOverride = window.confirm(
          `Security Warning:\n\n"${med.name}" expired on ${formatSafeDateOnly(med.expiryDate)}!\n\nDo you want to authorize adding this expired item to the transaction?`
        );
        if (!confirmOverride) {
          return;
        }
      }
    }

    const existing = cart.find(item => item.medicine.id === med.id);
    if (existing) {
      const targetQty = existing.quantity + 1;
      if (targetQty > med.quantity) {
        alert(`Cannot add more. Safe stock maximum reached (${med.quantity} boxes remaining).`);
        return;
      }
      setCart(cart.map(item => item.medicine.id === med.id ? { ...item, quantity: targetQty } : item));
    } else {
      setCart([...cart, { medicine: med, quantity: 1, isExpiryOverridden: isExpired } as any]);
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
  const vatRate = settings?.financial?.vatPercentage !== undefined ? settings.financial.vatPercentage : 16;
  const subtotal = cart.reduce((sum, item) => sum + (item.medicine.sellingPrice * item.quantity), 0);
  const tax = cart.reduce((sum, item) => sum + (item.medicine.sellingPrice * item.quantity * ((item.medicine.taxVat !== undefined ? item.medicine.taxVat : vatRate) / 100)), 0);
  
  // Custom Insurance Copay Modifier calculations
  const activeCustomer = customers.find(c => c.id === selectedCustomerId);
  const copayPercent = activeCustomer?.copayPercent !== undefined ? activeCustomer.copayPercent : 100; // default 100% user copay, no insurance
  const insurancePays = subtotal + tax - ((subtotal + tax) * (copayPercent / 100));
  const userOwesBeforeDiscount = (subtotal + tax) * (copayPercent / 100);
  const finalTotal = Math.max(0, userOwesBeforeDiscount - discountAmount);

  const executeFinalCheckout = async (confirmedCode?: string, confirmedPhone?: string) => {
    setLoading(true);

    const expiredInCart = cart.filter(item => getDaysToExpiry(item.medicine.expiryDate) <= 0);
    const overriddenExpiredIds = expiredInCart.map(item => item.medicine.id);

    const checkoutPayload = {
      customerId: selectedCustomerId,
      items: cart.map(item => ({
        medicineId: item.medicine.id,
        quantity: item.quantity
      })),
      paymentMethod,
      discountAmount,
      userEmail: user?.email,
      overriddenExpiredIds,
      cashPaid: paymentMethod === "Split" ? cashSplitPaid : (paymentMethod === "Cash" ? finalTotal : 0),
      mpesaPaid: paymentMethod === "Split" ? mpesaSplitPaid : (paymentMethod === "M-Pesa" ? finalTotal : 0),
      mpesaTransactionCode: confirmedCode || mpesaTxCode || undefined,
      mpesaPhoneNumber: confirmedPhone || mpesaPhoneNumber || undefined
    };

    try {
      const response = await fetch("/api/sales/checkout", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "X-User-Email": user?.email || "",
          "x-user-email": user?.email || ""
        },
        body: JSON.stringify(checkoutPayload)
      });
      let data: any = {};
      if (response.headers.get("Content-Type")?.includes("json")) {
        data = await response.json();
      }

      if (response.ok) {
        setCheckoutResult(data);
        setCart([]);
        setSuccessToast(`Checkout recorded! Invoice ${data.invoiceNumber} disbursed.`);
        setShowReceiptModal(true);
        setShowMpesaModal(false);
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

  const handlePrintReceipt = () => {
    // Show 'Printing...' loader toast instantly to guide user
    setSuccessToast("Printing...");
    setTimeout(() => setSuccessToast(null), 3500);

    try {
      const receiptPaper = document.getElementById("printable-receipt-paper");
      if (!receiptPaper) {
        window.print();
        return;
      }

      // Guard if an old printing iframe is lingering
      const existingIframe = document.getElementById("receipt_temporary_iframe");
      if (existingIframe) {
        existingIframe.remove();
      }

      // Create a temporary hidden iframe for printing
      const iframe = document.createElement("iframe");
      iframe.id = "receipt_temporary_iframe";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        window.print();
        return;
      }

      // Write the receipt HTML with clean inline thermal styles
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <head>
            <title>Receipt_${checkoutResult?.sale?.invoiceNumber || "Print"}</title>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Inter:wght@400;500;600;700;800&display=swap');
              * {
                box-sizing: border-box;
              }
              body {
                font-family: 'JetBrains Mono', monospace, sans-serif;
                color: #1e293b;
                background-color: #fff;
                margin: 0;
                padding: 0;
                width: 100%;
                font-size: 11px;
                line-height: 1.4;
              }
              #printable-receipt-paper {
                width: 76mm;
                margin: 0 auto;
                padding: 10px;
                background: white;
              }
              .text-center { text-align: center; }
              .text-right { text-align: right; }
              .flex { display: flex; }
              .justify-between { justify-content: space-between; }
              .items-center { align-items: center; }
              .space-y-1-5 > * + * { margin-top: 6px; }
              .space-y-2 > * + * { margin-top: 8px; }
              .space-y-5 > * + * { margin-top: 20px; }
              .bg-slate-50 { background-color: #f8fafc; }
              .p-3 { padding: 12px; }
              .p-3-5 { padding: 14px; }
              .p-2.5 { padding: 10px; }
              .p-2 { padding: 8px; }
              .rounded-xl { border-radius: 12px; }
              .rounded-2xl { border-radius: 16px; }
              .border { border: 1px solid #cbd5e1; }
              .border-b { border-bottom: 1px dashed #cbd5e1; }
              .border-t { border-top: 1px dashed #cbd5e1; }
              .border-dashed { border-style: dashed; }
              .border-slate-300 { border-color: #cbd5e1; }
              .border-slate-200 { border-color: #cbd5e1; }
              .border-slate-150 { border-color: #cbd5e1; }
              .pb-4 { padding-bottom: 16px; }
              .pt-4 { padding-top: 16px; }
              .pt-1 { padding-top: 4px; }
              .mt-1 { margin-top: 4px; }
              .mt-2 { margin-top: 8px; }
              .mt-3 { margin-top: 12px; }
              .mb-1-5 { margin-bottom: 6px; }
              .mb-1 { margin-bottom: 4px; }
              .font-bold { font-weight: 700; }
              .font-black { font-weight: 800; }
              .font-extrabold { font-weight: 800; }
              .tracking-widest { letter-spacing: 0.1em; }
              .tracking-wider { letter-spacing: 0.05em; }
              .text-sm { font-size: 12px; }
              .text-xs { font-size: 11px; }
              .text-base { font-size: 14px; }
              .text-[10px] { font-size: 10px; }
              .text-[9px] { font-size: 9px; }
              .text-[9.5px] { font-size: 9.5px; }
              .text-slate-400 { color: #94a3b8; }
              .text-slate-500 { color: #64748b; }
              .text-slate-600 { color: #475569; }
              .text-slate-800 { color: #1e293b; }
              .text-[#093530] { color: #093530; }
              .text-teal-850 { color: #115e59; }
              .text-teal-800 { color: #115e59; }
              .bg-teal-50 { background-color: #ecfdf5; }
              .border-teal-200 { border-color: #a7f3d0; }
              .bg-emerald-50 { background-color: #ecfdf5; }
              .border-emerald-150 { border-color: #a7f3d0; }
              .text-emerald-600 { color: #059669; }
              .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
              .pr-2 { padding-right: 8px; }
              .w-1\/2 { width: 50%; }
              .w-1\/4 { width: 25%; }
              .w-48 { width: 192px; }
              .h-8 { height: 32px; }
              .whitespace-nowrap { white-space: nowrap; }
              .shrink-0 { flex-shrink: 0; }
              .italic { font-style: italic; }
              .uppercase { text-transform: uppercase; }
            </style>
          </head>
          <body>
            <div id="printable-receipt-paper">
              ${receiptPaper.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.focus();
                  window.print();
                  setTimeout(function() {
                    window.parent.document.body.removeChild(window.frameElement);
                  }, 600);
                }, 150);
              };
            </script>
          </body>
        </html>
      `);
      iframeDoc.close();
    } catch (err) {
      console.warn("Direct iframe print transfer yielded unexpected boundaries, falling back to window.print():", err);
      window.print();
    }
  };

  const fetchUnclaimedMpesaTxns = async () => {
    try {
      const res = await fetch("/api/mpesa/unclaimed");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setUnclaimedMpesaTxns(data.transactions || []);
        }
      }
    } catch (e) {
      console.error("Failed fetching unclaimed mpesa:", e);
    }
  };

  const handleCheckout = async () => {
    if (!cart.length) {
      alert("Shopping cart is empty.");
      return;
    }

    if (paymentMethod === "M-Pesa" || paymentMethod === "Split") {
      // For M-Pesa or Cash+M-Pesa Split payments, process through validation hub first
      const defaultMpesaAmount = paymentMethod === "M-Pesa" ? finalTotal : Math.max(0, finalTotal - cashSplitPaid);
      if (paymentMethod === "M-Pesa") {
        setMpesaSplitPaid(finalTotal);
        setCashSplitPaid(0);
      } else {
        setMpesaSplitPaid(defaultMpesaAmount);
      }

      // Generate a clean professional bill account reference for this C2B payment
      const uniqueRef = "PH-" + Math.floor(100000 + Math.random() * 900000);
      setMpesaAccountRef(uniqueRef);

      setMpesaProcessStatus("Pending");
      setMpesaTxCode("");
      setMpesaCustomerName("");
      setShowMpesaModal(true);
      setIsMpesaMinimized(false);
      fetchUnclaimedMpesaTxns();
      return;
    }

    await executeFinalCheckout();
  };

  const checkIncomingMpesaPayment = async (checkMethodType: "amount" | "code", customCode?: string) => {
    try {
      if (checkMethodType === "amount") {
        setMpesaProcessStatus("Processing");
        setMpesaPollingActive(true);
      }

      const reqPayload = {
        phone: mpesaPhoneNumber,
        mpesaPaid: mpesaSplitPaid,
        mpesaTransactionCode: checkMethodType === "code" ? (customCode || mpesaManualInputCode) : "",
        checkMethod: checkMethodType,
        billRef: mpesaAccountRef
      };

      const res = await fetch("/api/mpesa/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqPayload)
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setMpesaTxCode(data.transaction.code);
          setMpesaCustomerName(data.transaction.fullName);
          setMpesaProcessStatus("Success");
          setMpesaPollingActive(false);
          
          // Complete the actual sales checkout record on match, marking as paid and updating DB!
          await executeFinalCheckout(data.transaction.code, data.transaction.phone);
          return true;
        } else if (checkMethodType === "code") {
          alert(data.message || "Manual Transaction code not found in the M-Pesa C2B Ledger.");
        }
      }
    } catch (e) {
      console.error("Checking M-Pesa error:", e);
    }
    return false;
  };

  const triggerSimulateC2B = async () => {
    try {
      setMpesaProcessStatus("Processing");
      setMpesaPollingActive(true);
      
      const res = await fetch("/api/mpesa/simulate-c2b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: mpesaSplitPaid,
          phone: mpesaPhoneNumber || "254712345678",
          code: mpesaManualInputCode || undefined,
          firstName: "Melis",
          lastName: "Wion",
          billRef: mpesaAccountRef
        })
      });
      if (res.ok) {
        // Immediately double check payment so it is resolved instantly
        setTimeout(() => {
          checkIncomingMpesaPayment("amount");
        }, 1200);
      }
    } catch (e) {
      console.error("C2B Simulator failed:", e);
    }
  };

  useEffect(() => {
    let intervalId: any;
    if (showMpesaModal) {
      intervalId = setInterval(() => {
        if (mpesaPollingActive && mpesaProcessStatus === "Processing") {
          checkIncomingMpesaPayment("amount");
        }
        fetchUnclaimedMpesaTxns();
      }, 3000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [showMpesaModal, mpesaPollingActive, mpesaProcessStatus, mpesaSplitPaid, mpesaPhoneNumber]);

  // Synchronize cashSplitPaid and mpesaSplitPaid safely with any finalTotal or paymentMethod changes
  useEffect(() => {
    if (paymentMethod === "Split") {
      const remainingVal = Math.max(0, Number((finalTotal - cashSplitPaid).toFixed(2)));
      setMpesaSplitPaid(remainingVal);
    } else if (paymentMethod === "M-Pesa") {
      setMpesaSplitPaid(finalTotal);
      setCashSplitPaid(0);
    } else {
      setMpesaSplitPaid(0);
      setCashSplitPaid(finalTotal);
    }
  }, [finalTotal, paymentMethod]);

  const filteredMedicines = medicines.filter(m => 
    (m.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.genericName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.SKU || "").toLowerCase().includes(searchQuery.toLowerCase())
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
          {successToast.toLowerCase().includes("printing") ? (
            <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" />
          ) : (
            <Check className="w-4 h-4 text-teal-400" />
          )}
          <span className="text-xs font-semibold">{successToast}</span>
        </div>
      )}

      {/* Mobile/Tablet Tab Switcher */}
      <div className="col-span-12 lg:hidden flex p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setActiveMobileTab("catalog")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeMobileTab === "catalog"
              ? "bg-white text-[#093530] shadow-sm font-extrabold text-teal-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>💊 Browse Drugs</span>
        </button>
        <button
          type="button"
          id="btn-pos-mobile-cart-tab"
          onClick={() => setActiveMobileTab("cart")}
          className={`flex-1 flex items-center justify-center space-x-2 py-2.5 px-4 text-xs font-bold rounded-xl transition-all relative cursor-pointer ${
            activeMobileTab === "cart"
              ? "bg-white text-[#093530] shadow-sm font-extrabold text-teal-900"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <span>🛒 Cart & Settlement</span>
          {cart.length > 0 && (
            <span className="ml-1 w-5 h-5 rounded-full bg-teal-600 text-white text-[9px] font-black flex items-center justify-center">
              {cart.length}
            </span>
          )}
        </button>
      </div>

      {/* LEFT COLUMN: Drug formulation indexing (7 Cols Grid) */}
      <div className={`lg:col-span-7 space-y-6 ${activeMobileTab === "catalog" ? "block" : "hidden lg:block"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Pharmacy Checkout</h1>
            <p className="text-xs text-slate-400 font-medium mt-1">Process medicine sales quickly, search barcodes, and manage stock automatically.</p>
          </div>
          <button onClick={loadPOSData} className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search bar */}
        <div className="relative flex space-x-2 items-center">
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search EAN, brand tablet, generic capsule composition..."
            icon={<Search className="w-4 h-4 text-slate-400" />}
            containerClassName="flex-1"
          />
          <button
            type="button"
            onClick={() => setIsPOSScannerOpen(true)}
            className="px-3 md:px-4 py-2 bg-[#093530] hover:bg-[#0c4a43] text-teal-300 rounded-xl transition flex items-center space-x-1.5 border border-teal-800 cursor-pointer shadow-md shrink-0"
            title="Scan item barcode directly to add to cart"
          >
            <Camera className="w-4 h-4 text-teal-300" />
            <span className="text-xs font-black uppercase tracking-wider">Scan Product</span>
          </button>
        </div>

        {/* Drug formulation Matrix Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredMedicines.map(med => {
            const isNearLow = med.quantity <= med.minStockLevel || med.quantity < 15;
            const daysLeft = getDaysToExpiry(med.expiryDate);
            const isExpired = daysLeft <= 0;
            const isNearExpiry = daysLeft > 0 && daysLeft <= (settings?.inventory?.expiryWarningPeriodDays || 45);
            
            return (
              <div 
                key={med.id} 
                className={`bg-white border ${
                  isExpired 
                    ? "border-rose-300 bg-rose-50/5" 
                    : isNearExpiry 
                    ? "border-amber-300 bg-amber-50/5" 
                    : "border-slate-200"
                } rounded-2xl p-4.5 flex flex-col justify-between hover:shadow-md transition duration-200 relative overflow-hidden group`}
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
                      
                      {isExpired ? (
                        <p className="text-[9px] text-rose-600 font-bold uppercase mt-1">⚠️ EXPIRED {-daysLeft} days ago</p>
                      ) : isNearExpiry ? (
                        <p className="text-[9px] text-amber-600 font-bold uppercase mt-1">⏳ EXPIRES in {daysLeft} days</p>
                      ) : (
                        <p className="text-[9px] text-slate-400 font-mono mt-1">SKU: {med.SKU}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-4">
                    <span className="text-xs font-black text-slate-800 font-mono">
                      {formatCurrency(med.sellingPrice, currencySymbol)}
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
                    className={`w-full flex items-center justify-center space-x-1.5 py-1.5 font-bold text-[11px] rounded-xl transition-all duration-200 cursor-pointer ${
                      isExpired && settings?.inventory?.preventSaleOfExpiredGoods !== false && !(user?.role === "admin" || user?.role === "pharmacist")
                        ? "bg-rose-55 border border-dashed border-rose-220 text-rose-500 bg-rose-50 border-rose-200"
                        : "bg-slate-50 hover:bg-[#093530] hover:text-teal-300 text-slate-600"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {isExpired && settings?.inventory?.preventSaleOfExpiredGoods !== false && !(user?.role === "admin" || user?.role === "pharmacist")
                        ? "Sale Blocked (Expired)"
                        : isExpired
                        ? "Force Add (Override)"
                        : "Add to checkout"
                      }
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: active receipt cart & financial validation (5 Cols) */}
      <div className={`lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-6 h-fit space-y-6 shadow-sm ${activeMobileTab === "cart" ? "block" : "hidden lg:block"}`}>
        <h2 className="text-sm font-bold text-slate-800 flex items-center">
          <ShoppingCart className="w-4 h-4 mr-2 text-teal-600" />
          <span>Shopping Basket</span>
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
                    {getDaysToExpiry(item.medicine.expiryDate) <= 0 ? (
                      <p className="text-[8.5px] text-rose-700 font-extrabold uppercase bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mt-0.5 inline-block shrink-0 leading-none">
                        Expired - Override
                      </p>
                    ) : getDaysToExpiry(item.medicine.expiryDate) <= (settings?.inventory?.expiryWarningPeriodDays || 45) ? (
                      <p className="text-[8.5px] text-amber-700 font-extrabold uppercase bg-amber-50 border border-amber-100 rounded px-1.5 py-0.5 mt-0.5 inline-block shrink-0 leading-none">
                        Near Expiry
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-mono truncate">SKU: {item.medicine.SKU}</p>
                    )}
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
                    {formatCurrency(item.medicine.sellingPrice * item.quantity, currencySymbol)}
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
              <div className="grid grid-cols-4 gap-1.5">
                {(["Cash", "M-Pesa", "Card", "Split"] as const).map(method => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => {
                      setPaymentMethod(method);
                      if (method === "Split") {
                        const firstCashPortion = Math.round(finalTotal * 0.4); // default 40% cash
                        setCashSplitPaid(firstCashPortion);
                        setMpesaSplitPaid(Math.max(0, finalTotal - firstCashPortion));
                      }
                    }}
                    className={`py-2 px-1 text-[10px] cursor-pointer font-bold rounded-xl border transition-all text-center flex flex-col items-center justify-center space-y-1 ${
                      paymentMethod === method
                        ? "bg-[#093530] text-teal-300 border-transparent shadow shadow-teal-900/40 font-extrabold"
                        : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    {method === "M-Pesa" ? "📲" : method === "Card" ? "💳" : method === "Split" ? "⚖️" : "💵"}
                    <span>{method === "Split" ? "Split Pay" : method}</span>
                  </button>
                ))}
              </div>

              {/* Real-time split configurator */}
              {paymentMethod === "Split" && (
                <div className="mt-3.5 bg-[#093530]/5 p-3.5 rounded-2xl border border-[#093530]/10 space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black tracking-wider text-[#093530] uppercase">
                    <span>⚖️ Configure Split Division</span>
                    <span className="font-mono text-slate-500 font-bold">{formatCurrency(finalTotal, currencySymbol)} total</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <CurrencyInput
                      label="Cash Paid (💵)"
                      currency={currencySymbol}
                      min="0"
                      max={finalTotal}
                      value={cashSplitPaid || ""}
                      onChange={(e) => {
                        const val = Math.min(finalTotal, Number(e.target.value) || 0);
                        setCashSplitPaid(val);
                        setMpesaSplitPaid(Math.max(0, Number((finalTotal - val).toFixed(2))));
                      }}
                    />
                    <div>
                      <label className="text-[9px] font-black uppercase tracking-wider text-[#093530] block mb-1">M-Pesa Portion (📲)</label>
                      <div className="w-full text-xs font-black font-mono text-teal-800 bg-teal-50 border border-teal-100/60 rounded-xl p-2 select-none" style={{ height: "38px", display: "flex", alignItems: "center" }}>
                        {formatCurrency(mpesaSplitPaid, currencySymbol)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Discount field */}
            <CurrencyInput
              label="Discount Code / Rebate Amount"
              currency={currencySymbol}
              min="0"
              value={discountAmount || ""}
              onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              placeholder="0.00"
            />

            {/* Financial Calculations list */}
            <div className="space-y-2 border-t border-slate-100 pt-4.5 text-slate-500 font-semibold text-xs leading-none">
              <div className="flex justify-between">
                <span>Subtotal Price:</span>
                <span className="font-mono text-slate-700">{formatCurrency(subtotal, currencySymbol)}</span>
              </div>
              <div className="flex justify-between">
                <span>VAT Tax Liability ({vatRate}% dynamic):</span>
                <span className="font-mono text-slate-700">{formatCurrency(tax, currencySymbol)}</span>
              </div>
              {selectedCustomerId && activeCustomer?.insuranceProvider && (
                <>
                  <div className="flex justify-between text-indigo-600">
                    <span>Insurance Coverage ({100 - copayPercent}%):</span>
                    <span className="font-mono">-{formatCurrency(insurancePays, currencySymbol)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-700 select-none pb-1.5 border-b border-dashed border-slate-100">
                    <span>Patient Copay Portion ({copayPercent}%):</span>
                    <span className="font-mono">{formatCurrency(userOwesBeforeDiscount, currencySymbol)}</span>
                  </div>
                </>
              )}
              {discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Rebate Discount:</span>
                  <span className="font-mono">-{formatCurrency(discountAmount, currencySymbol)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-extrabold text-slate-800 pt-2">
                <span>Final Settlement Total:</span>
                <span className="font-mono text-teal-700">{formatCurrency(finalTotal, currencySymbol)}</span>
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
              <span>Complete Sale & Print Receipt</span>
            </button>
          </div>
        )}
      </div>

      {/* Receipts Invoice visual representation modal */}
      {showReceiptModal && checkoutResult && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all"
          id="printable-receipt-backdrop"
        >
          <div 
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col"
            id="printable-receipt-modal"
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 shrink-0 no-print">
              <h3 className="font-sans font-bold text-slate-800 flex items-center">
                <FileText className="w-4.5 h-4.5 text-teal-600 mr-2" />
                <span className="text-xs font-extrabold uppercase tracking-wider">Receipt Generated</span>
              </h3>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Printable Prescription Bill Receipt style layout */}
            <div 
              className="flex-1 overflow-y-auto p-6 space-y-5 font-mono text-slate-800 text-xs text-left"
              id="printable-receipt-paper"
            >
              {/* Receipt Header Banner */}
              <div className="text-center pb-4 border-b border-dashed border-slate-300">
                <div className="flex items-center justify-center space-x-1.5 mb-1.5 text-[#093530]">
                  <span className="text-lg">✚</span>
                  <p className="text-sm font-black tracking-widest uppercase">
                    {settings?.general?.pharmacyName || "NAIROBI PHARMACY"}
                  </p>
                </div>
                <p className="text-[10px] text-slate-500 font-bold leading-normal">
                  {settings?.general?.address || "Industrial Area, Sec 4, Nairobi"}
                </p>
                <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                  {settings?.general?.phone ? `Tel: ${settings.general.phone}` : "Tel: +254 711 222333"}
                </p>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest font-black mt-1">
                  *** OFFICIAL RECEIPTS / CASH BILL ***
                </p>
              </div>

              {/* invoice metadata list */}
              <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-150 uppercase font-bold text-[10px] text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-400">Receipt No:</span> 
                  <span className="font-mono text-slate-800">{checkoutResult.sale.invoiceNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date/Time:</span> 
                  <span>{formatSafeDateTime(checkoutResult.sale.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Sales Operator:</span> 
                  <span className="text-slate-850 truncate max-w-[160px]">
                    {user?.name || user?.email ? `${user.name || user.email.split("@")[0]}` : "SYSTEM OPERATOR #A"}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between">
                  <span className="text-slate-400">Customer Client:</span> 
                  <span className="text-slate-800 truncate max-w-[160px]">{checkoutResult.sale.customerName}</span>
                </div>
                <div className="flex justify-between items-center text-[9.5px]">
                  <span className="text-slate-400">Payment Settle:</span> 
                  <span className="bg-teal-50 text-teal-850 px-1.5 py-0.5 rounded border border-teal-200">
                    {checkoutResult.sale.paymentMethod}
                  </span>
                </div>

                {checkoutResult.sale.paymentMethod === "Split" && (
                  <div className="bg-white border border-slate-200 rounded-xl p-2 text-[9px] font-bold text-slate-500 space-y-1 mt-1 font-mono uppercase">
                    <div className="flex justify-between">
                      <span>Cash Portion:</span>
                      <span className="text-slate-800">{formatCurrency(checkoutResult.sale.cashPaid || 0, currencySymbol)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>M-Pesa Portion:</span>
                      <span className="text-[#093530]">{formatCurrency(checkoutResult.sale.mpesaPaid || 0, currencySymbol)}</span>
                    </div>
                  </div>
                )}

                {checkoutResult.sale.mpesaTransactionCode && (
                  <div className="bg-emerald-50 text-[#093530] border border-emerald-150 p-2.5 rounded-xl font-mono mt-1 space-y-0.5 text-left">
                    <div className="flex justify-between">
                      <span>M-Pesa Tx Code:</span>
                      <span className="font-black tracking-wider uppercase">{checkoutResult.sale.mpesaTransactionCode}</span>
                    </div>
                    {checkoutResult.sale.mpesaPhoneNumber && (
                      <div className="flex justify-between text-[9px] text-teal-800">
                        <span>Payer Mobile:</span>
                        <span>{checkoutResult.sale.mpesaPhoneNumber}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Items Table ledger */}
              <div className="border-t border-b border-dashed border-slate-300 py-3 space-y-2">
                <div className="flex justify-between font-black text-[9.5px] text-slate-400 uppercase tracking-wider">
                  <span className="w-1/2">Product Description</span>
                  <span className="w-1/4 text-center">Qty * Rate</span>
                  <span className="w-1/4 text-right">Value ({currencySymbol})</span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                {checkoutResult.sale.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between font-bold text-slate-800 text-[10.5px] leading-tight">
                    <span className="w-1/2 truncate pr-2">{item.medicineName}</span>
                    <span className="w-1/4 text-center font-mono whitespace-nowrap">{item.quantity} × {item.price}</span>
                    <span className="w-1/4 text-right font-mono">{formatCurrency(item.price * item.quantity, currencySymbol)}</span>
                  </div>
                ))}
              </div>

              {/* Calculation list */}
              <div className="space-y-1.5 text-right font-bold text-[10.5px]">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono">{formatCurrency(checkoutResult.sale.items.reduce((sum, item) => sum + (item.price * item.quantity), 0), currencySymbol)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>VAT Assessed (16%):</span>
                  <span className="font-mono">{formatCurrency(checkoutResult.sale.taxAmount, currencySymbol)}</span>
                </div>
                {checkoutResult.sale.discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-extrabold pr-0">
                    <span>Rebate / discount:</span>
                    <span className="font-mono">-{formatCurrency(checkoutResult.sale.discount, currencySymbol)}</span>
                  </div>
                )}
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between text-base font-black text-[#093530] pt-1 leading-none">
                  <span>Total Settled:</span>
                  <span className="font-mono text-teal-800">{formatCurrency(checkoutResult.sale.totalPrice, currencySymbol)}</span>
                </div>
              </div>

              {/* Barcode/QR footprint representation */}
              <div className="text-center pt-4 flex flex-col items-center border-t border-dashed border-slate-300">
                {/* Simulated barcode */}
                <div className="w-48 h-8 flex items-center justify-around border-t-2 border-b-2 border-slate-800 py-3.5 select-none opacity-60 mb-1 leading-none">
                  <div className="w-0.5 h-full bg-black shrink-0" />
                  <div className="w-1 h-full bg-black shrink-0" />
                  <div className="w-0.5 h-full bg-black shrink-0" />
                  <div className="w-2.5 h-full bg-black shrink-0" />
                  <div className="w-0.5 h-full bg-black shrink-0" />
                  <div className="w-1 h-full bg-black shrink-0" />
                  <div className="w-0.5 h-full bg-black shrink-0" />
                  <div className="w-1.5 h-full bg-black shrink-0" />
                  <div className="w-2 h-full bg-black shrink-0" />
                  <div className="w-0.5 h-full bg-black shrink-0" />
                  <div className="w-1 h-full bg-black shrink-0" />
                </div>
                <span className="text-[9px] font-black tracking-widest text-slate-500">* {checkoutResult.sale.invoiceNumber} *</span>
                
                <p className="text-[9.5px] text-slate-500 text-center mt-3 max-w-[280px] font-extrabold leading-normal italic block break-words border-t border-slate-150 pt-2.5">
                  {settings?.receipts?.receiptFooterText || "Clinical prescription complete. Thank you for choosing Nairobi Health Care Services!"}
                </p>
                <div className="mt-2 text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                  Powered by Nairobi Pharmacy ERP Enterprise
                </div>
              </div>
            </div>

            {/* footer with printing triggers */}
            <div className="p-4 border-t border-slate-100 flex space-x-3 shrink-0 bg-slate-50 no-print">
              <button 
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 border border-slate-200 hover:bg-slate-100 font-black text-xs rounded-xl flex items-center justify-center space-x-1.5 text-slate-700 transition cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span>Print Receipt</span>
              </button>
              <button 
                onClick={() => setShowReceiptModal(false)}
                className="flex-1 py-2.5 bg-[#093530] hover:bg-[#0c443e] text-white font-black text-xs rounded-xl flex items-center justify-center cursor-pointer shadow shadow-[#093530]/10 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Safaricom M-Pesa Payment Processing & Verification Hub (Pure C2B Flow) */}
      {showMpesaModal && (
        !isMpesaMinimized ? (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" id="mpesa-modal-overlay">
            <div className="bg-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-150 flex flex-col my-auto max-h-[95vh] md:max-h-[580px]" id="mpesa-modal-content">
              {/* Header bar */}
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-150 flex justify-between items-center shrink-0">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider font-sans leading-none">M-Pesa Real-Time Instant Verification Portal</h3>
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">Safaricom Customer-to-Business (C2B) Automated Cash Register Ledger Sync</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    type="button"
                    onClick={() => setIsMpesaMinimized(true)}
                    className="p-1 px-2.5 hover:bg-slate-100 rounded-lg transition text-slate-500 hover:text-slate-800 cursor-pointer flex items-center gap-1 text-xs font-bold"
                    title="Minimize to Dock"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Minimize</span>
                  </button>
                  <button 
                    onClick={() => {
                      setMpesaPollingActive(false);
                      setShowMpesaModal(false);
                    }}
                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                    title="Close Portal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body - Horizontal 3-Column layout grid */}
              <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                {/* COLUMN 1: PAYMENT DETAILS */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-[#093530]/10 text-[#093530] text-[10px] font-black flex items-center justify-center font-mono">1</div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">Required Deposit</span>
                  </div>

                  {paymentMethod === "Split" ? (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider block leading-none">Split Settlement Portion</span>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs text-slate-500">
                          <span>Paid Cash:</span>
                          <span className="font-mono font-bold text-slate-800">{formatCurrency(cashSplitPaid, currencySymbol)}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-150">
                          <span className="text-[#093530] font-bold">M-Pesa to pay:</span>
                          <span className="font-mono font-black text-sm text-[#093530]">{formatCurrency(mpesaSplitPaid, currencySymbol)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex flex-col">
                      <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest mb-1.5 block leading-none">Net Amount to Pay</span>
                      <span className="text-2xl font-black text-[#093530] font-mono leading-none">{formatCurrency(finalTotal, currencySymbol)}</span>
                    </div>
                  )}

                  {/* Business Credentials */}
                  <div className="space-y-2">
                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Paybill / Shortcode</span>
                        <span className="text-sm font-black text-slate-800 font-mono tracking-wider">600990</span>
                      </div>
                      <span className="text-[8px] bg-slate-200 text-slate-600 font-bold px-1.5 py-0.5 rounded leading-none uppercase">Paybill</span>
                    </div>

                    <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block">Account Reference ID</span>
                        <span className="text-sm font-black text-[#093530] font-mono tracking-wide">{mpesaAccountRef}</span>
                      </div>
                      <span className="text-[8.5px] bg-teal-100 text-teal-800 font-bold px-1.5 py-0.5 rounded leading-none uppercase">Ref ID</span>
                    </div>
                  </div>

                  {/* Operational Checklist */}
                  <div className="bg-slate-50 border border-dashed border-slate-200 p-3 rounded-xl text-[10px] text-slate-500 leading-normal font-sans">
                    <span className="font-extrabold text-slate-700 block mb-1 uppercase text-[8.5px] tracking-wider">Customer Guide:</span>
                    Instruct customer to dial <strong className="font-semibold text-slate-700">*334#</strong> or open M-Pesa App, choose <strong className="font-semibold text-slate-700">Lipa na M-Pesa Paybill</strong>, use shortcode <strong className="font-mono font-bold text-slate-800">600990</strong>, reference <strong className="font-mono font-bold text-[#093530]">{mpesaAccountRef}</strong>, then verify below.
                  </div>
                </div>

                {/* COLUMN 2: REAL-TIME LEDGER MONITOR */}
                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                      <div className="w-5 h-5 rounded-full bg-[#093530]/10 text-[#093530] text-[10px] font-black flex items-center justify-center font-mono">2</div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">Ledger Monitor</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-2xl border border-dashed flex-1 flex flex-col items-center justify-center text-center space-y-4 min-h-[180px] border-slate-200">
                    {mpesaProcessStatus === "Pending" && (
                      <>
                        <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 border border-amber-100 relative">
                          <span className="text-xl animate-pulse">⏳</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">Listening</span>
                          <h4 className="text-xs font-bold text-slate-800 mt-2 font-sans">Awaiting Customer Deposit</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-normal">
                            System is actively checking the Safaricom broadcast registers.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => checkIncomingMpesaPayment("amount")}
                          className="w-full py-2 bg-[#093530] hover:bg-[#0c443e] text-white text-[10px] font-black rounded-lg transition tracking-wider uppercase cursor-pointer text-center font-sans shadow shadow-[#093530]/10"
                        >
                          Fetch M-Pesa Payment 📡
                        </button>
                      </>
                    )}

                    {mpesaProcessStatus === "Processing" && (
                      <>
                        <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center text-[#093530] border border-teal-100">
                          <Loader2 className="w-5 h-5 animate-spin text-[#093530]" />
                        </div>
                        <div>
                          <span className="text-[8.5px] font-bold bg-teal-100 text-[#093530] px-2 py-0.5 rounded-full uppercase tracking-wider font-sans animate-pulse">Query Triggered</span>
                          <h4 className="text-xs font-bold text-slate-805 mt-2 font-sans">Scanning Safaricom ledger...</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[190px] mx-auto leading-normal">
                            Comparing deposits reference logs with bill key <span className="font-mono text-slate-650 font-bold">{mpesaAccountRef}</span>.
                          </p>
                        </div>
                      </>
                    )}

                    {mpesaProcessStatus === "Success" && (
                      <>
                        <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100">
                          <ShieldCheck className="w-6 h-6" />
                        </div>
                        <div className="w-full">
                          <span className="text-[8.5px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-sans">Verified</span>
                          <h4 className="text-xs font-bold text-emerald-800 mt-2 font-sans">Deposit Cleared & Settled</h4>
                          
                          <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/50 font-mono text-[9px] space-y-1 mt-3 text-left w-full max-w-[200px] mx-auto">
                            <div className="flex justify-between text-slate-500">
                              <span>Ref Code:</span>
                              <strong className="text-slate-800 font-bold">{mpesaTxCode}</strong>
                            </div>
                            <div className="flex justify-between text-slate-400">
                              <span>Customer:</span>
                              <strong className="text-slate-800 font-bold truncate max-w-[110px]">{mpesaCustomerName || "Subscriber"}</strong>
                            </div>
                            <div className="flex justify-between text-slate-400 pt-0.5 border-t border-emerald-100/60 font-sans">
                              <span>Settled:</span>
                              <strong className="text-emerald-700 font-black">Ksh. {paymentMethod === "Split" ? mpesaSplitPaid : finalTotal}</strong>
                            </div>
                          </div>
                        </div>
                      </>
                    )}

                    {mpesaProcessStatus === "Failed" && (
                      <>
                        <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center text-rose-500 border border-rose-100">
                          <span className="text-lg">❌</span>
                        </div>
                        <div>
                          <span className="text-[8.5px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full uppercase tracking-wider font-sans">Not Found</span>
                          <h4 className="text-xs font-bold text-rose-800 mt-2 font-sans">No matching entry matched</h4>
                          <p className="text-[10px] text-slate-400 mt-1 max-w-[180px] mx-auto leading-normal font-sans">
                            Safaricom records do not list an unpaid matching deposit yet.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => checkIncomingMpesaPayment("amount")}
                          className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black rounded-lg transition tracking-wide uppercase cursor-pointer font-sans"
                        >
                          Retry Ledger Check 📡
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* COLUMN 3: MANUAL DEPOSIT OVERRIDE & RECONCILIATION */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-1 border-b border-slate-100">
                    <div className="w-5 h-5 rounded-full bg-[#093530]/10 text-[#093530] text-[10px] font-black flex items-center justify-center font-mono">3</div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-700 font-sans">Audit Override</span>
                  </div>

                  {/* Manual input */}
                  {mpesaProcessStatus !== "Success" && (
                    <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-2">
                      <span className="text-[8.5px] font-extrabold uppercase tracking-widest text-slate-400 block font-sans">
                        Verify Using Receipt ID
                      </span>
                      <div className="flex gap-1.5">
                        <input 
                          type="text"
                          placeholder="M-Pesa Reference"
                          value={mpesaManualInputCode}
                          onChange={(e) => setMpesaManualInputCode(e.target.value.toUpperCase())}
                          className="flex-1 text-xs font-bold font-mono tracking-wider text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-2 uppercase placeholder-slate-300 focus:outline-[#093530]"
                        />
                        <button
                          type="button"
                          onClick={() => checkIncomingMpesaPayment("code")}
                          className="py-2 px-3 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-black rounded-lg border border-slate-300 transition shrink-0 uppercase font-sans tracking-wide cursor-pointer"
                        >
                          Pair
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Unclaimed deposits list */}
                  {unclaimedMpesaTxns.length > 0 && mpesaProcessStatus !== "Success" ? (
                    <div className="bg-amber-50/20 p-4 rounded-2xl border border-amber-100/40 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[8.5px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded uppercase tracking-wider">Unclaimed Webhook Feed ({unclaimedMpesaTxns.length})</span>
                        <button 
                          type="button" 
                          onClick={fetchUnclaimedMpesaTxns}
                          className="text-[8.5px] text-[#093530] font-black hover:underline font-sans"
                        >
                          Refresh
                        </button>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                        {unclaimedMpesaTxns.map((tx: any) => (
                          <button
                            key={tx.TransID}
                            type="button"
                            onClick={() => checkIncomingMpesaPayment("code", tx.TransID)}
                            className="w-full text-left p-2.5 bg-white hover:bg-amber-55/40 border border-slate-150 rounded-xl transition flex items-center justify-between font-mono text-[9px] cursor-pointer"
                          >
                            <div className="truncate">
                              <span className="font-extrabold text-slate-700 block">{tx.TransID}</span>
                              <span className="text-slate-400 font-sans block text-[8px] mt-0.5">Ksh. {tx.TransAmount}</span>
                            </div>
                            <span className="text-[8.5px] bg-[#093530] text-teal-200 font-extrabold px-2 py-1 rounded-lg uppercase leading-none hover:bg-emerald-800 transition">
                              Match & Settle
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    mpesaProcessStatus !== "Success" && (
                      <div className="bg-slate-50 border border-dashed border-slate-150 rounded-2xl p-4.5 text-center flex flex-col items-center justify-center min-h-[140px] text-slate-450">
                        <HelpCircle className="w-5 h-5 text-slate-300 mb-1 animate-pulse" />
                        <span className="text-[8.5px] font-black uppercase tracking-wider text-slate-500">Digital Ledger Search</span>
                        <p className="text-[9.5px] leading-normal font-sans text-slate-400 mt-1.5 max-w-[160px]">Ready to process manual pairing. No delayed transactions currently stored in Nairobi Webhook.</p>
                      </div>
                    )
                  )}

                  {/* Show successful matched ledger indicator */}
                  {mpesaProcessStatus === "Success" && (
                    <div className="bg-emerald-50 border border-emerald-150 p-4.5 rounded-2xl flex flex-col items-center justify-center text-center space-y-2 min-h-[190px] animate-in fade-in duration-200">
                      <span className="text-xl">🙌</span>
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-emerald-900 font-sans">Order Fully Funded</h4>
                      <p className="text-[10px] text-slate-500 leading-relaxed font-sans mt-0.5">
                        Cashier authorization complete. Safe to click "Complete Sale" inside the footer to finalize checkout record.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer controls */}
              <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-end gap-3 shrink-0 text-xs font-sans">
                <button
                  type="button"
                  onClick={() => {
                    setMpesaPollingActive(false);
                    setShowMpesaModal(false);
                  }}
                  className="py-2.5 px-4 font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 rounded-xl transition cursor-pointer"
                >
                  Close Portal
                </button>
                {mpesaProcessStatus === "Success" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMpesaModal(false);
                    }}
                    className="py-2.5 px-5 font-black bg-[#093530] hover:bg-[#0c443e] text-white rounded-xl shadow transition tracking-wider uppercase text-[10px] cursor-pointer"
                  >
                    Complete Sale 🛒
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Minimized Floating Panel - Horizontal Centered Layout for phones, tablets and desktop */
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-auto sm:min-w-[450px] max-w-lg bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 z-55 flex flex-row items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-5 duration-200 shadow-teal-900/10 border-teal-500/20">
            {/* Left section: status light, M-Pesa account & session status info */}
            <div className="flex items-center space-x-2 shrink-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                mpesaProcessStatus === 'Success' ? 'bg-emerald-500 animate-pulse' : 
                mpesaProcessStatus === 'Processing' ? 'bg-teal-500 animate-pulse' : 
                mpesaProcessStatus === 'Failed' ? 'bg-rose-500' : 'bg-amber-500 animate-pulse'
              }`}></span>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-extrabold text-slate-800 uppercase tracking-wider leading-none">M-Pesa ({mpesaAccountRef})</span>
                <span className={`text-[9px] font-black uppercase tracking-wider mt-0.5 leading-none ${
                  mpesaProcessStatus === 'Success' ? 'text-emerald-600 animate-pulse' : 
                  mpesaProcessStatus === 'Processing' ? 'text-teal-600' : 
                  mpesaProcessStatus === 'Failed' ? 'text-rose-600' : 'text-amber-500 font-bold'
                }`}>
                  {mpesaProcessStatus === 'Pending' ? 'Waiting...' : mpesaProcessStatus}
                </span>
              </div>
            </div>

            {/* Middle section: simple horizontal info/amount container */}
            <div className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1 text-center shrink-0">
              <span className="text-[8px] font-extrabold text-slate-400 block uppercase tracking-wider leading-none mb-0.5">Amount Code</span>
              <span className="font-mono text-xs font-black text-[#093530] leading-none block">
                {formatCurrency(paymentMethod === "Split" ? mpesaSplitPaid : finalTotal, currencySymbol)}
              </span>
            </div>

            {/* Right section: action buttons & quick controls */}
            <div className="flex items-center space-x-2 shrink-0">
              {/* Process action buttons inside the horizontal container */}
              <div className="w-24 sm:w-28 shrink-0">
                {(mpesaProcessStatus === "Pending" || mpesaProcessStatus === "Failed") && (
                  <button
                    type="button"
                    onClick={() => checkIncomingMpesaPayment("amount")}
                    className="w-full py-1.5 px-3 bg-[#093530] hover:bg-[#0c443e] text-white text-[9px] font-black rounded-lg transition tracking-wide uppercase cursor-pointer text-center font-sans"
                  >
                    Fetch 📡
                  </button>
                )}
                {mpesaProcessStatus === "Processing" && (
                  <div className="w-full py-1.5 px-3 bg-slate-100 text-slate-500 text-[9px] font-semibold rounded-lg flex items-center justify-center space-x-1">
                    <div className="w-2.5 h-2.5 border border-slate-500 border-t-transparent rounded-full animate-spin" />
                    <span className="font-sans">Listening</span>
                  </div>
                )}
                {mpesaProcessStatus === "Success" && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMpesaModal(false);
                    }}
                    className="w-full py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black rounded-lg transition tracking-wide uppercase cursor-pointer text-center font-sans animate-pulse"
                  >
                    Complete Sale 🛒
                  </button>
                )}
              </div>

              {/* Vertical elegant dividing line */}
              <div className="h-4.5 w-px bg-slate-200" />

              {/* Quick controls: maximize and exit */}
              <div className="flex items-center space-x-0.5">
                <button 
                  type="button"
                  onClick={() => setIsMpesaMinimized(false)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-slate-800 transition cursor-pointer"
                  title="Maximize"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setMpesaPollingActive(false);
                    setShowMpesaModal(false);
                  }}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                  title="Close Portal"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )
      )}

      {/* Dynamic POS Webcam Checkout Scanner Modal */}
      <BarcodeScannerModal
        isOpen={isPOSScannerOpen}
        onClose={() => setIsPOSScannerOpen(false)}
        onScanSuccess={(val) => {
          handleBarcodeScanInPOS(val);
        }}
        title="POS checkout Scanning Station"
        description="Scan any product SKU or EAN barcode to instantly identify details and insert into checkout queue."
        customMedicines={medicines}
      />

      {/* Floating Bottom Bar for mobile/tablet in catalog view */}
      {cart.length > 0 && activeMobileTab === "catalog" && (
        <div className="lg:hidden fixed bottom-4 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <button
            type="button"
            onClick={() => setActiveMobileTab("cart")}
            className="w-full py-3.5 px-5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-2xl shadow-xl flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2">
              <ShoppingCart className="w-4.5 h-4.5" />
              <span>{cart.length} item{cart.length > 1 ? 's' : ''} in cart</span>
            </div>
            <span className="font-mono text-[10px] bg-[#093530]/35 px-2.5 py-1 rounded-lg border border-teal-400/25 uppercase font-black tracking-wider">
              Check out →
            </span>
          </button>
        </div>
      )}

    </div>
  );
}
