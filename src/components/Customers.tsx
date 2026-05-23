/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, FormEvent } from "react";
import { Users, Plus, Clipboard, Gift, Heart, ShieldAlert, RefreshCw, X } from "lucide-react";
import { Customer } from "../types";
import { formatSafeDateOnly } from "../utils";

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [insuranceProvider, setInsuranceProvider] = useState("");
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [copayPercent, setCopayPercent] = useState("20");

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/customers");
      const list = await res.json();
      setCustomers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const payload = {
      name, email, phone,
      insuranceProvider, insurancePolicyNumber,
      copayPercent: insuranceProvider ? Number(copayPercent) : 100
    };

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setShowModal(false);
        setName("");
        setEmail("");
        setPhone("");
        setInsuranceProvider("");
        setInsurancePolicyNumber("");
        loadCustomers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight">Customer Database</h1>
          <p className="text-xs text-slate-400 font-medium mt-1">Oversee patient records, health insurance coverages, loyalty programs, and purchase histories.</p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center space-x-1 bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-md cursor-pointer transition-all duration-200"
        >
          <Plus className="w-4 h-4" />
          <span>Register customer Profile</span>
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-3">
          <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {customers.map(cust => {
            const hasInsurance = !!cust.insuranceProvider;
            
            return (
              <div key={cust.id} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition duration-200 flex flex-col justify-between">
                
                <div className="space-y-4">
                  {/* profile head */}
                  <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-700 font-black flex items-center justify-center text-xs">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 leading-none">{cust.name}</h3>
                      <p className="text-[10px] text-slate-400 leading-normal mt-1">{cust.phone}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate max-w-[170px]">{cust.email}</p>
                    </div>
                  </div>

                  {/* Loyalty Points metric */}
                  <div className="flex items-center justify-between text-xs font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-105">
                    <div className="flex items-center space-x-1.5 text-[11px]">
                      <Gift className="w-4 h-4 text-amber-500" />
                      <span>Loyalty Reward Points:</span>
                    </div>
                    <span className="font-mono text-amber-700 font-extrabold">{cust.loyaltyPoints} pts</span>
                  </div>

                  {/* Insurance Details banner */}
                  {hasInsurance ? (
                    <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl space-y-1 text-[11px] font-semibold text-indigo-850">
                      <p className="text-[9px] uppercase font-bold text-indigo-400 tracking-wider">Insurance Carrier</p>
                      <p className="font-bold flex justify-between">
                        <span>{cust.insuranceProvider}</span>
                        <span className="font-mono">Pol: {cust.insurancePolicyNumber}</span>
                      </p>
                      <p className="text-[10px] text-indigo-650 pt-1 border-t border-indigo-100/60 mt-1">
                        Co-Payment liability: <strong className="font-bold">{cust.copayPercent}% Price</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="p-2 text-center text-[10px] text-slate-400 font-bold bg-slate-50/50 rounded-xl border border-slate-200 border-dashed">
                      No Insurance linked
                    </div>
                  )}

                  {/* Prescription histories checklist */}
                  <div>
                    <h4 className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider mb-2 font-mono flex items-center">
                      <Heart className="w-3.5 h-3.5 mr-1 text-rose-500" />
                      <span>Prescription Histories ({cust.prescriptionHistory.length})</span>
                    </h4>

                    {cust.prescriptionHistory.length === 0 ? (
                      <p className="text-[10.5px] text-slate-400 font-bold italic pl-1">No historical dispatches found.</p>
                    ) : (
                      <div className="space-y-1.5 max-h-24 overflow-y-auto bg-slate-50/30 p-2 border border-slate-100 rounded-xl">
                        {cust.prescriptionHistory.map((item, id) => (
                          <div key={id} className="text-[10.5px] text-slate-650 flex justify-between font-semibold">
                            <span>{item.medicineName} (x{item.quantity})</span>
                            <span className="text-slate-400 font-mono text-[9px]">{formatSafeDateOnly(item.date)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-1 flex justify-end">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-300 font-mono">
                    ID: {cust.id}
                  </span>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-sans font-bold text-slate-800">Register Patient Profile</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                  Legal Full Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Susan Williams"
                  className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +254 711..."
                    className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
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
                    placeholder="e.g. susan@mail.com"
                    className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <p className="text-[10px] font-bold tracking-wider text-slate-450 uppercase block mb-1 px-0.5">Insurance Cover policy linkage</p>
                
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                    Insurance Provider
                  </label>
                  <input
                    type="text"
                    value={insuranceProvider}
                    onChange={(e) => setInsuranceProvider(e.target.value)}
                    placeholder="e.g. Jubilee Insurance or AAR"
                    className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:outline-none"
                  />
                </div>

                {insuranceProvider && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                        Policy Number
                      </label>
                      <input
                        type="text"
                        required
                        value={insurancePolicyNumber}
                        onChange={(e) => setInsurancePolicyNumber(e.target.value)}
                        placeholder="POL-JUB-09921"
                        className="w-full text-xs font-semibold text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1 px-0.5">
                        Patient Copay Percentage
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={copayPercent}
                        onChange={(e) => setCopayPercent(e.target.value)}
                        placeholder="20"
                        className="w-full text-xs font-bold font-mono text-slate-705 bg-slate-50 border border-slate-200 p-2.5 rounded-xl"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md block mt-4 border-none cursor-pointer"
              >
                Register Customer Portfolio
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
