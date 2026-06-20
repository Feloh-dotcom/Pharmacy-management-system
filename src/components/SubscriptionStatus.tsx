import React, { useState, useEffect } from "react";
import { 
  CreditCard, CheckCircle, AlertTriangle, Clock, Calendar, 
  ArrowRight, Lock, Smartphone, History, Sparkles, RefreshCw, FileText
} from "lucide-react";

interface Subscription {
  id: string;
  userId: string;
  clientEmail: string;
  planName: string;
  status: string;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentRecord {
  id: string;
  userId: string;
  clientEmail: string;
  amount: number;
  currency: string;
  planName: string;
  paymentMethod: string;
  transactionReference: string;
  paymentDate: string;
  status: string;
}

interface LicenseLog {
  id: string;
  userId: string;
  clientEmail: string;
  action: string;
  performedBy: string;
  details: string;
  createdAt: string;
}

interface SubscriptionStatusProps {
  user: any;
  onRefreshProfile?: () => void;
  isBlockPage?: boolean;
}

export default function SubscriptionStatus({ user, onRefreshProfile, isBlockPage = false }: SubscriptionStatusProps) {
  const [subData, setSubData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  
  // Checkout flow state
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<"mpesa" | "card">("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [checkoutStep, setCheckoutStep] = useState<"plans" | "checkout" | "waiting" | "success">("plans");
  const [countdown, setCountdown] = useState(15);
  const [txRef, setTxRef] = useState("");
  const [processingError, setProcessingError] = useState("");

  const [paymentHistory, setPaymentHistory] = useState<PaymentRecord[]>([]);
  const [licenseLogs, setLicenseLogs] = useState<LicenseLog[]>([]);

  const plans = [
    {
      id: "Monthly",
      name: "Standard Monthly",
      price: 1500,
      period: "month",
      billing: "billed monthly",
      description: "Perfect for single pharmacist workstations looking for monthly flexibility.",
      features: ["All clinical pos routines", "Full inventory & order logs", "Automated cash drawer tallies", "General database backups"]
    },
    {
      id: "Quarterly",
      name: "Professional Quarterly",
      price: 4000,
      period: "3 months",
      saving: "Save 11%",
      billing: "billed every 3 months",
      isPopular: true,
      description: "Optimized for active clinics requiring consistent billing intervals with key savings.",
      features: ["Everything in Monthly plan", "Duo operator concurrent sessions", "Automated weekly cycle roll-over", "Custom settings workspace control", "Priority system settings backups"]
    },
    {
      id: "Annual",
      name: "Enterprise Annual",
      price: 12000,
      period: "year",
      saving: "Save 33% - Best Value",
      billing: "billed annually",
      description: "Formulated for reliable healthcare clinics dedicated to multi-year operations.",
      features: ["Everything in Quarterly plan", "Unlimited cashier/pharmacist logins", "SaaS client license audit logs", "Super Admin direct priority support", "Automated cloud disaster recovery checks"]
    }
  ];

  const fetchSubscriptionData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/subscriptions/status?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const data = await res.json();
        setSubData(data);
      } else {
        setErrorCode("Unable to retrieve SaaS client registry status.");
      }
    } catch (e) {
      console.error(e);
      setErrorCode("Could not establish a connection to billing servers.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminLogs = async () => {
    try {
      // Fetch user's relative logs directly
      const res = await fetch(`/api/subscriptions/super-admin/data?adminEmail=${encodeURIComponent("meliswion1@gmail.com")}`);
      if (res.ok) {
        const data = await res.json();
        // Filter elements for this user only
        const userPayments = data.paymentHistory?.filter((p: any) => p.clientEmail?.toLowerCase() === user.email.toLowerCase()) || [];
        const userLicLogs = data.licenseAuditLogs?.filter((l: any) => l.clientEmail?.toLowerCase() === user.email.toLowerCase()) || [];
        setPaymentHistory(userPayments);
        setLicenseLogs(userLicLogs);
      }
    } catch {
      // Non-fatal, admin logs fetch bypassed
    }
  };

  useEffect(() => {
    if (user && user.email) {
      fetchSubscriptionData();
      fetchAdminLogs();
    }
  }, [user]);

  // Handle count-down logic in dynamic M-pesa STK prompt
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (checkoutStep === "waiting") {
      if (countdown > 0) {
        timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
      } else {
        // Complete the mock transaction after a delay
        handlePaymentCompletion();
      }
    }
    return () => clearTimeout(timer);
  }, [checkoutStep, countdown]);

  const initiatePayment = (plan: any) => {
    setSelectedPlan(plan);
    setMpesaPhone(user.phone || "");
    setProcessingError("");
    setCheckoutStep("checkout");
  };

  const handleSimulatedPaymentTrigger = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessingError("");

    if (paymentMethod === "mpesa") {
      const phoneRegex = /^(?:254|\+254|0)?(7|1)\d{8}$/;
      if (!phoneRegex.test(mpesaPhone.trim())) {
        setProcessingError("Please specify a valid Kenyan Safaricom phone number (e.g. 0712345678 or 254712345678).");
        return;
      }
      setCountdown(10 + Math.floor(Math.random() * 5));
      setTxRef(`MPESA-STK-${Math.floor(100000 + Math.random() * 900000)}`);
    } else {
      if (!cardName.trim() || !cardNumber.trim() || !cardExpiry.trim() || !cardCvv.trim()) {
        setProcessingError("Please supply all required card billing details.");
        return;
      }
      if (cardNumber.replace(/\s/g, "").length < 13) {
        setProcessingError("Invalid card digit count. Specify a valid Visa or MasterCard.");
        return;
      }
      setCountdown(3);
      setTxRef(`CARD-AUTH-${Math.floor(100000 + Math.random() * 900000)}`);
    }

    setCheckoutStep("waiting");
  };

  const handlePaymentCompletion = async () => {
    try {
      const res = await fetch("/api/subscriptions/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Email": user.email
        },
        body: JSON.stringify({
          email: user.email,
          planName: selectedPlan.id,
          amount: selectedPlan.price,
          currency: "KES",
          paymentMethod: paymentMethod === "mpesa" ? "M-Pesa" : "Card",
          transactionReference: txRef
        })
      });

      if (res.ok) {
        setCheckoutStep("success");
        fetchSubscriptionData();
        fetchAdminLogs();
        if (onRefreshProfile) {
          onRefreshProfile();
        }
      } else {
        const errorData = await res.json();
        setProcessingError(errorData.error || "A secure handshake transfer error occurred.");
        setCheckoutStep("checkout");
      }
    } catch {
      setProcessingError("Lost connection to database. Retrying secure check.");
      setCheckoutStep("checkout");
    }
  };

  const parseDate = (str: string) => {
    try {
      return new Date(str).toLocaleDateString("en-US", {
        year: "numeric", module: "2-digit", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      } as any);
    } catch {
      return str;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-2" />
        <p className="text-xs text-slate-500 font-bold font-mono">Consulting Halomedical SaaS billing servers...</p>
      </div>
    );
  }

  const subscription = subData?.subscription || null;
  const daysLeft = subData?.daysLeft ?? 0;
  const isTrial = subscription?.planName === "Trial";
  const isExpired = subscription ? (new Date(subscription.endDate) < new Date() || subscription.status === "expired") : true;
  const isSuspended = subscription?.status === "suspended";

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      
      {/* 1. Header Hero Status Card */}
      <div className={`p-6 sm:p-8 rounded-3xl border text-white relative overflow-hidden shadow-lg ${
        isSuspended ? "bg-gradient-to-r from-red-950 to-rose-900 border-red-900" :
        isExpired ? "bg-gradient-to-r from-slate-900 to-red-950 border-red-900/50" :
        isTrial ? "bg-gradient-to-r from-[#031d1a] to-[#0d3f30] border-teal-900" :
        "bg-gradient-to-r from-slate-900 to-[#0c312e] border-teal-950"
      }`}>
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <CreditCard className="w-48 h-48" />
        </div>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest rounded-full border ${
                isSuspended ? "bg-red-900/50 border-red-200 text-red-200" :
                isExpired ? "bg-rose-900/50 border-rose-200 text-rose-200" :
                isTrial ? "bg-amber-900/50 border-amber-200 text-amber-200" :
                "bg-emerald-950/70 border-emerald-300 text-emerald-300"
              }`}>
                {subscription?.status || "PENDING"}
              </span>
              <span className="text-xs text-slate-300 font-bold flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
                Plan Name: {subscription?.planName || "Demo Workspace"}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-1">
              {isSuspended ? "SaaS Workspace Locked" :
               isExpired ? "Your Subscription Has Expired" :
               isTrial ? `Trial Node Active: ${daysLeft} Days Remaining` :
               "Your Clinical SaaS Workspace is Full Access"}
            </h1>
            <p className="text-xs text-slate-300 font-semibold max-w-xl mt-2 leading-relaxed">
              {isSuspended ? "This account has been administratively suspended. To restore database replication pipelines, please check workspace policies with your regional supervisor." :
               isExpired ? "Access to clinical operations (POS sales, stock management, cash registers, reports) is temporarily restricted. Choose any formulated plan below to unlock instantly." :
               isTrial ? "Halomedical supports a full 14-day free trial on registered nodes. Elevate or transition to Standard, Professional, or Annual subscription cards anytime." :
               `Licensed and active subscriber. Securely syncing to Supabase as the single database source of truth.`}
            </p>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mt-6 border-t border-white/10 pt-6">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Registered Clinic Node</span>
                <span className="text-xs font-bold font-mono text-slate-200">{user.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Valid License Expiry</span>
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {subscription ? new Date(subscription.endDate).toLocaleDateString() : "Pending"}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-end items-start md:items-end gap-3">
            {!isSuspended && (isExpired || isTrial) && (
              <button
                onClick={() => {
                  setSelectedPlan(plans[1]);
                  setCheckoutStep("plans");
                  document.getElementById("pricing-plans")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="px-6 py-3 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs rounded-xl shadow-lg hover:shadow-teal-400/20 shadow-black/30 transition duration-200 flex items-center gap-1.5 uppercase tracking-wide"
              >
                Renew / Upgrade License
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {isSuspended && (
              <a
                href="mailto:support@halomedical.com"
                className="px-6 py-3 bg-red-800 hover:bg-red-700 text-red-100 font-bold text-xs rounded-xl transition duration-200 flex items-center gap-1 flex-row uppercase"
              >
                Appeal System Suspension
              </a>
            )}
          </div>
        </div>
      </div>

      {checkoutStep === "plans" && !isSuspended && (
        <div id="pricing-plans" className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">
              SaaS Formulated Pricing Solutions
            </h2>
            <p className="text-xs text-slate-500 font-bold">
              All plans include secure Supabase real-time sync, transaction security, and local offline backups fallback.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const isCurrent = subscription?.planName === plan.id && !isExpired;
              return (
                <div 
                  key={plan.id}
                  className={`bg-white border rounded-3xl p-6 relative overflow-hidden transition-all duration-350 flex flex-col justify-between ${
                    plan.isPopular ? "border-teal-500 shadow-xl shadow-teal-500/5 ring-1 ring-teal-500" : "border-slate-200 shadow-md hover:shadow-lg"
                  }`}
                >
                  {plan.saving && (
                    <div className="absolute top-0 right-0 mt-4 mr-4 bg-teal-100 border border-teal-200 text-teal-800 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-full">
                      {plan.saving}
                    </div>
                  )}

                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">{plan.name}</h3>
                    <p className="text-[11px] text-slate-400 font-bold mt-1 min-h-[36px]">{plan.description}</p>
                    
                    <div className="my-6 border-b border-slate-100 pb-6">
                      <div className="flex items-baseline text-slate-800">
                        <span className="text-xs font-black mr-0.5">KES</span>
                        <span className="text-3xl font-black tracking-tight">{plan.price.toLocaleString()}</span>
                        <span className="text-xs text-slate-400 font-bold ml-1.5">/ {plan.period}</span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono italic block mt-1">{plan.billing}</span>
                    </div>

                    <ul className="space-y-3">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-xs text-slate-600 font-semibold gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8 pt-4">
                    {isCurrent ? (
                      <div className="w-full py-2.5 px-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs text-emerald-700 font-black flex items-center justify-center gap-1.5 uppercase">
                        Active License
                      </div>
                    ) : (
                      <button
                        onClick={() => initiatePayment(plan)}
                        className={`w-full py-2.5 px-4 rounded-xl text-xs font-black transition-all duration-200 uppercase tracking-wider text-center ${
                          plan.isPopular 
                            ? "bg-teal-600 hover:bg-teal-700 text-white shadow-md shadow-teal-600/10" 
                            : "bg-slate-800 hover:bg-slate-900 text-white"
                        }`}
                      >
                        Select Plan
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {checkoutStep === "checkout" && selectedPlan && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-lg max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              💳 Secure Subscription Checkout
            </h2>
            <button
              onClick={() => setCheckoutStep("plans")}
              className="text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              Cancel
            </button>
          </div>

          <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl flex justify-between items-center text-slate-800">
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Selected Plan Configuration</span>
              <span className="text-xs font-black uppercase text-slate-700">{selectedPlan.name} ({selectedPlan.billing})</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Total Amount Due</span>
              <span className="text-sm font-black text-teal-700">KES {selectedPlan.price.toLocaleString()}</span>
            </div>
          </div>

          {/* Payment Method Switcher */}
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">Select Preferred Billing Route</span>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => { setPaymentMethod("mpesa"); setProcessingError(""); }}
                className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                  paymentMethod === "mpesa" 
                    ? "border-teal-500 bg-teal-50/20 shadow-sm" 
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center font-bold text-emerald-600">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Safaricom M-Pesa</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">Instant STK Push</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => { setPaymentMethod("card"); setProcessingError(""); }}
                className={`p-4 rounded-2xl border text-left transition flex items-center gap-3 ${
                  paymentMethod === "card" 
                    ? "border-teal-500 bg-teal-50/20 shadow-sm" 
                    : "border-slate-200 hover:bg-slate-50"
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-sky-50 border border-sky-100 flex items-center justify-center font-bold text-sky-600">
                  <CreditCard className="w-5 h-5 text-sky-500" />
                </div>
                <div>
                  <span className="text-xs font-black text-slate-800 block">Credit or Debit Card</span>
                  <span className="text-[10px] text-slate-400 font-semibold block">Visa & Mastercard</span>
                </div>
              </button>
            </div>
          </div>

          <form onSubmit={handleSimulatedPaymentTrigger} className="space-y-4">
            {processingError && (
              <div className="bg-red-50 border border-red-150 p-4 rounded-2xl flex items-start gap-2 text-xs text-red-700 font-semibold">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{processingError}</span>
              </div>
            )}

            {paymentMethod === "mpesa" ? (
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Safaricom Mobile Phone (for STK Prompt)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-400 font-bold">
                    +254
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 712345678"
                    value={mpesaPhone}
                    onChange={(e) => setMpesaPhone(e.target.value)}
                    className="w-full pl-14 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-medium">
                  We will initiate an STK checkout prompt to your phone. Simply enter your M-Pesa PIN once received to complete standard licensing.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arthur Hale"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Card digits (16-Digit Number)</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    placeholder="e.g. 4000 1234 5678 9010"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value.replace(/\s?/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                    className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">Expiry date</label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      placeholder="MM/YY"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">CVV Code</label>
                    <input
                      type="password"
                      required
                      maxLength={3}
                      placeholder="e.g. 123"
                      value={cardCvv}
                      onChange={(e) => setCardCvv(e.target.value)}
                      className="w-full px-4 py-2.5 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-[#093530] hover:bg-teal-900 text-teal-350 font-extrabold text-xs rounded-xl shadow-md uppercase tracking-wider transition flex items-center justify-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-teal-400" />
              Process Payment KES {selectedPlan.price.toLocaleString()}
            </button>
          </form>
        </div>
      )}

      {checkoutStep === "waiting" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-150 flex items-center justify-center text-emerald-600 animate-pulse mx-auto">
            {paymentMethod === "mpesa" ? <Smartphone className="w-8 h-8" /> : <CreditCard className="w-8 h-8" />}
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
              {paymentMethod === "mpesa" ? "Awaiting M-Pesa Authorization" : "Securing Card Handshake"}
            </h3>
            <p className="text-xs text-slate-500 font-bold leading-relaxed">
              {paymentMethod === "mpesa" 
                ? `An M-Pesa secure checkout prompt has been transmitted to +254 ${mpesaPhone}. Awaiting billing confirmation from network gateways.` 
                : "Checking financial route tokens with secure network servers."}
            </p>
          </div>

          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-emerald-500 h-full transition-all duration-300"
              style={{ width: `${((15 - countdown) / 15) * 100}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-400 font-mono italic">
            Transaction Code: {txRef} • Simulated Callback in {countdown}s
          </p>

          <button
            onClick={handlePaymentCompletion}
            className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] font-black uppercase"
          >
            Bypass Delay
          </button>
        </div>
      )}

      {checkoutStep === "success" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-lg max-w-md mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-250 flex items-center justify-center text-emerald-600 mx-auto text-3xl shadow-sm">
            ✓
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
              Replication License Unlocked
            </h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              We have processed your transaction successfully. All database syncing logs and workspace operations have been restored to Full Access status.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 text-left font-mono text-[10px] text-slate-500 space-y-1">
            <p><span className="font-bold text-slate-400">Plan Activated:</span> {selectedPlan?.name}</p>
            <p><span className="font-bold text-slate-400">Transaction ID:</span> {txRef}</p>
            <p><span className="font-bold text-slate-400">Payment Channel:</span> {paymentMethod === "mpesa" ? "M-Pesa STK" : "Visa/Mastercard"}</p>
          </div>

          <button
            onClick={() => {
              setCheckoutStep("plans");
              setSelectedPlan(null);
            }}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition shadow-md shadow-teal-600/10"
          >
            Return to Billing Portal
          </button>
        </div>
      )}

      {/* 2. Billing details tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Payment History Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <History className="w-4 h-4 text-teal-600" />
            Workspace Payment History
          </h3>

          {paymentHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold font-mono">
              No subscription invoices registered.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-black uppercase tracking-wider text-[10px]">
                    <th className="pb-3 font-extrabold">Plan</th>
                    <th className="pb-3 font-extrabold">Amount</th>
                    <th className="pb-3 font-extrabold">Gateway</th>
                    <th className="pb-3 font-extrabold">Ref Code / Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {paymentHistory.map((pay) => (
                    <tr key={pay.id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 font-bold">{pay.planName}</td>
                      <td className="py-2.5 font-bold font-mono text-teal-700">KES {pay.amount.toLocaleString()}</td>
                      <td className="py-2.5 text-slate-500 font-semibold">{pay.paymentMethod}</td>
                      <td className="py-2.5">
                        <span className="font-mono text-[10px] block text-slate-700 font-bold">{pay.transactionReference}</span>
                        <span className="text-[9px] text-slate-400 block">{new Date(pay.paymentDate).toLocaleDateString()}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* License Audit Logs Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 border-b border-slate-100 pb-3">
            <FileText className="w-4 h-4 text-teal-600" />
            License Deployment Audits
          </h3>

          {licenseLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-bold font-mono">
              Logs stream empty. Startup checkups logged automatically.
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {licenseLogs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-2xl flex gap-2 items-start text-xs hover:border-slate-200 transition">
                  <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                    log.action.includes("SUSPEND") ? "bg-red-50 text-red-600" :
                    log.action.includes("RENEW") || log.action.includes("ACTIVATE") ? "bg-emerald-50 text-emerald-600" :
                    "bg-blue-50 text-blue-600"
                  }`}>
                    <Clock className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-1">
                    <p className="font-bold text-slate-700 block text-xs">{log.action}</p>
                    <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">{log.details}</p>
                    <p className="text-[10px] text-slate-400 font-mono">
                      By: {log.performedBy} • {parseDate(log.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
