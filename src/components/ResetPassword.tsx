import { useState, useEffect, FormEvent } from "react";
import { Key } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    // Prefill the cached temp password if available
    const pendingPass = localStorage.getItem("halomedical_pending_reset_pass");
    if (pendingPass) {
      setPassword(pendingPass);
      setConfirmPassword(pendingPass);
    }

    // Check if there is an access code or token in the URL to exchange for user session
    const handleUrlParams = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      if (code) {
        setLoading(true);
        try {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeErr) {
            console.warn("[ResetPassword] Could not exchange code for session:", exchangeErr.message);
          } else {
            console.log("[ResetPassword] Successfully exchanged code for session!");
          }
        } catch (err) {
          console.error("[ResetPassword] Error exchanging code:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    handleUrlParams();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    if (password.length < 8) {
      setError("Security Policy Blocked: Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Validation Rejected: The passwords provided do not match.");
      setLoading(false);
      return;
    }

    try {
      // Direct password update inside the current Supabase session
      const { data, error: updateErr } = await supabase.auth.updateUser({
        password: password
      });

      if (updateErr) {
        console.error("[Supabase updateUser Error]", updateErr);
        setError(`Unable to update password: ${updateErr.message}`);
        setLoading(false);
        return;
      }

      // Cleanup caches on reset success
      localStorage.removeItem("halomedical_pending_reset_pass");
      localStorage.removeItem("halomedical_session_user");

      setSuccess(true);
    } catch (err: any) {
      console.error("[ResetPassword Exception]", err);
      setError(`Unable to update password: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-lg relative overflow-hidden animate-in fade-in duration-300">
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shadow-sm mx-auto mb-4 font-bold text-2xl">
            ✓
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Password Update Completed</h2>
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Your workstation master cryptographic credentials have been rewritten successfully. Please open the main portal to proceed with your new login details.
          </p>
          <button
            onClick={() => {
              window.location.href = "/";
            }}
            className="w-full h-11 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-sm rounded-xl shadow-md transition-all duration-150 cursor-pointer border-none"
          >
            Go to Login Portal
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 shadow-lg relative overflow-hidden animate-in fade-in duration-300">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full bg-teal-50 border border-teal-200 flex items-center justify-center mx-auto mb-3">
            <Key className="w-5 h-5 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Configure New Password</h2>
          <p className="text-xs text-slate-500 mt-1">Configure your new workstation access credentials below</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-150 text-rose-600 rounded-xl text-xs font-bold flex items-start gap-2 animate-in slide-in-from-top-1 duration-200">
            <span className="mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
              New password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold tracking-wide text-[#0F172A] block px-0.5">
              Confirm password
            </label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••••••"
              className="block w-full h-12 px-4 bg-white border border-[#E2E8F0] rounded-xl text-sm font-semibold text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/10 shadow-sm transition duration-150"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-[#2563EB] hover:bg-[#1D4ED8] focus:ring-4 focus:ring-[#2563EB]/15 text-white font-bold text-sm rounded-xl shadow-md transition-all duration-150 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed border-none cursor-pointer mt-2"
          >
            {loading ? "Rewriting Credentials..." : "Submit"}
          </button>
        </form>

        <div className="flex items-center justify-center text-xs pt-4 border-t border-slate-100 mt-6">
          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            className="text-[#2563EB] hover:text-[#1D4ED8] font-bold hover:underline transition cursor-pointer flex items-center gap-1 bg-none border-none"
          >
            &larr; Back to Login Portal
          </button>
        </div>
      </div>
    </div>
  );
}
