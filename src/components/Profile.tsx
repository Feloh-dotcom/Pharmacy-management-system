/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { 
  User as UserIcon, Shield, Mail, Phone, Lock, Eye, EyeOff, Save, CheckCircle, 
  AlertTriangle, Settings, Bell, Clock, History, FileText, Sparkles, Upload, 
  Sparkle, MapPin, CreditCard, X, Trash2, RefreshCw, Loader2, Image as ImageIcon
} from "lucide-react";
import { useLanguage } from "../LanguageContext";
import { UserRole } from "../types";

import { calculateProfileCompletion, getAvatarUrl } from "../utils";

interface ProfileProps {
  user: any;
  onProfileUpdated: (updatedUser: any) => void;
}

const DEFAULT_AVATARS = [
  "/public/images/default-avatar.png", // Male Doctor
  "/public/images/default-avatar.png", // Female Doctor
  "/public/images/default-avatar.png", // Male Scientist
  "/public/images/default-avatar.png", // Young Female Surgeon
  "/public/images/default-avatar.png", // Male Clinician
  "/public/images/default-avatar.png"  // Female Biochemist
];

export default function Profile({ user, onProfileUpdated }: ProfileProps) {
  const { t } = useLanguage();
  
  // Tab within profile
  const [activeTab, setActiveTab] = useState<"info" | "security" | "preferences" | "history">("info");

  useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setActiveTab(customEvent.detail as any);
      }
    };
    window.addEventListener("profile-tab-navigate", handleNav);
    return () => window.removeEventListener("profile-tab-navigate", handleNav);
  }, []);

  // State flags
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form states
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [avatarUrl, setAvatarUrl] = useState(getAvatarUrl(user?.avatarUrl));

  // Extended form states
  const [nationalId, setNationalId] = useState(user?.nationalId || "");
  const [address, setAddress] = useState(user?.address || "");

  // Verification dialog/modal states
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [docType, setDocType] = useState("National ID");
  const [vNationalId, setVNationalId] = useState(user?.nationalId || "");
  const [vAddress, setVAddress] = useState(user?.address || "");
  const [selfieFile, setSelfieFile] = useState<string | null>(user?.verificationDetails?.selfieUrl || null);
  const [docFile, setDocFile] = useState<string | null>(user?.verificationDetails?.submittedDocumentUrl || null);
  const [reviewerComment, setReviewerComment] = useState("");

  // Passwords
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Preferences
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [favModule, setFavModule] = useState("Dashboard");
  const [themeColor, setThemeColor] = useState("teal");

  // Notifications
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [lowStockDigests, setLowStockDigests] = useState(true);
  const [expiryWarnings, setExpiryWarnings] = useState(true);
  const [financialSummaries, setFinancialSummaries] = useState(false);

  // Activity History
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // File drag state
  const [isDragging, setIsDragging] = useState(false);

  // Enhanced Profile Picture States
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<{ name: string; size: number; mime: string } | null>(null);
  const [uploadStep, setUploadStep] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
      setPhone(user.phone || "");
      setBio(user.bio || "");
      setAvatarUrl(getAvatarUrl(user.avatarUrl) || "");
      setNationalId(user.nationalId || "");
      setAddress(user.address || "");
      setVNationalId(user.nationalId || "");
      setVAddress(user.address || "");
      if (user.verificationDetails) {
        setSelfieFile(user.verificationDetails.selfieUrl || null);
        setDocFile(user.verificationDetails.submittedDocumentUrl || null);
      }
    }
  }, [user]);

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vNationalId.trim() || !vAddress.trim()) {
      showToast("error", "All fields are required for identity verification.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        email: user?.email,
        docType,
        nationalId: vNationalId,
        address: vAddress,
        submittedDocumentUrl: docFile || "/public/images/default-avatar.png",
        selfieUrl: selfieFile || "/public/images/default-avatar.png"
      };

      const res = await fetch("/api/users/profile/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onProfileUpdated(data.user);
        setIsVerifyModalOpen(false);
        const completion = calculateProfileCompletion(data.user);
        if (completion.percent === 100) {
          showToast("success", "Congratulations! Identity documents approved and verified. Full Admin permissions unlocked.");
        } else {
          showToast("success", "Identity documents submitted safely into onboarding queue.");
        }
      } else {
        const err = await res.json();
        showToast("error", err.error || "Onboarding submission error.");
      }
    } catch {
      showToast("error", "Failed to connect to verification server.");
    } finally {
      setLoading(false);
    }
  };

  const handleReviewAction = async (status: "Verified" | "Rejected") => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/profile/verify-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          status,
          reviewerComment: reviewerComment || `Workstation identity approved manually by Admin.`
        })
      });

      if (res.ok) {
        const data = await res.json();
        onProfileUpdated(data.user);
        showToast("success", `Verification status successfully updated to ${status}.`);
        setReviewerComment("");
      } else {
        const err = await res.json();
        showToast("error", err.error || "Review error.");
      }
    } catch {
      showToast("error", "Failed to submit review action.");
    } finally {
      setLoading(false);
    }
  };

  // Load audit trail
  const fetchAuditLogs = async () => {
    if (!user) return;
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/users/profile/history?email=${encodeURIComponent(user.email)}`);
      if (res.ok) {
        const logs = await res.json();
        setAuditLogs(logs);
      }
    } catch (e) {
      console.error("Audit log retrieval error:", e);
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "history") {
      fetchAuditLogs();
    }
  }, [activeTab, user]);

  const showToast = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Secure validation for personal particulars
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast("error", "Name cannot be left empty.");
      return;
    }
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      showToast("error", "Please provide a valid corporate email structure.");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        email: user?.email,
        name,
        phone,
        bio,
        nationalId,
        address,
        preferences: { sidebarCollapsed, favModule, themeColor },
        notificationPreferences: { emailAlerts, lowStockDigests, expiryWarnings, financialSummaries }
      };

      const res = await fetch("/api/users/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        onProfileUpdated(data.user);
        const completion = calculateProfileCompletion(data.user);
        if (completion.percent === 100) {
          showToast("success", "Congratulations! Profile is 100% complete. Admin privilege tokens generated.");
        } else {
          showToast("success", "Profile specifications updated and securely stored.");
        }
      } else {
        const err = await res.json();
        showToast("error", err.error || "Update failure. Please retry.");
      }
    } catch (e) {
      showToast("error", "Network synchronization error. Check workstation telemetry.");
    } finally {
      setLoading(false);
    }
  };

  // Credentials verification & security lockout
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword) {
      showToast("error", "New password cannot be empty.");
      return;
    }
    if (newPassword.length < 6) {
      showToast("error", "Security standard: New password must contain at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("error", "Credentials mismatch: Confirmation password does not align.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/users/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: user?.email,
          currentPassword,
          newPassword
        })
      });

      if (res.ok) {
        showToast("success", "Master password altered successfully. Security event archived.");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        const err = await res.json();
        showToast("error", err.error || "Credential validation failed. old password incorrect.");
      }
    } catch (e) {
      showToast("error", "Error connecting to security gateway.");
    } finally {
      setLoading(false);
    }
  };

  const optimizeProfileImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      setUploadProgress(15);
      setUploadStep("Decoding image and setting up workspace...");
      
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadProgress(45);
        setUploadStep("Slicing dimensions & optimizing resolution...");
        
        const img = new Image();
        img.onload = () => {
          try {
            setUploadProgress(75);
            setUploadStep("Performing sub-pixel interpolation (512x512 JPEG)...");
            
            const canvas = document.createElement("canvas");
            const targetSize = 512;
            canvas.width = targetSize;
            canvas.height = targetSize;
            
            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Unable to create canvas workspace context"));
              return;
            }
            
            // Aspect ratio preserving center crop layout
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
            
            setUploadProgress(95);
            setUploadStep("Assembling secure profile picture preview...");
            
            const optimizedBase64 = canvas.toDataURL("image/jpeg", 0.85);
            setUploadProgress(100);
            
            setTimeout(() => {
              setUploadProgress(null);
              setUploadStep(null);
            }, 400);
            
            resolve(optimizedBase64);
          } catch (err) {
            reject(err);
          }
        };
        img.onerror = () => reject(new Error("Invalid image format or corrupt file structure."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Error loading selected image bytes."));
      reader.readAsDataURL(file);
    });
  };

  const syncAvatarOnServer = async (url: string) => {
    try {
      setLoading(true);
      const res = await fetch("/api/users/profile/upload-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user?.email, avatarUrl: url })
      });
      if (res.ok) {
        const data = await res.json();
        setAvatarUrl(url);
        onProfileUpdated(data.user || { ...user, avatarUrl: url });
        showToast("success", "Clinical avatar referenced and refreshed permanently.");
        setPreviewUrl(null);
        setOriginalFile(null);
      } else {
        const err = await res.json();
        showToast("error", err.error || "Failed to synchronise avatar.");
      }
    } catch (err) {
      showToast("error", "Failed to sync avatar with system registry.");
    } finally {
      setLoading(false);
    }
  };

  // Secure validation and optimization workflow
  const handleUploadedFile = async (file: File) => {
    // 1. Format validation (accepting: JPG/JPEG, PNG, WEBP)
    const approvedMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!approvedMimes.includes(file.type.toLowerCase())) {
      showToast("error", "Security restriction: Only standard image formats (JPEG, PNG, WEBP) are approved.");
      return;
    }

    // 2. Size validation (max size: 3MB)
    const maxBytes = 3 * 1024 * 1024;
    if (file.size > maxBytes) {
      showToast("error", `Security restriction: File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) surpasses the 3MB high-performance storage threshold.`);
      return;
    }

    // Retain original file specs for informative info panels
    setOriginalFile({
      name: file.name,
      size: file.size,
      mime: file.type
    });

    try {
      const optimized = await optimizeProfileImage(file);
      setPreviewUrl(optimized);
      showToast("success", "Workstation preview generated and optimized. Review changes below to save.");
    } catch (err: any) {
      showToast("error", err.message || "Failed to decode/optimize image.");
      setOriginalFile(null);
      setPreviewUrl(null);
      setUploadProgress(null);
      setUploadStep(null);
    }
  };

  const handleDiscardPreview = () => {
    setPreviewUrl(null);
    setOriginalFile(null);
    showToast("success", "Preview discarded. Workstation configuration unchanged.");
  };

  const handleResetToDefault = async () => {
    // Standard system default image
    const defaultUrl = "/public/images/default-avatar.png";
    await syncAvatarOnServer(defaultUrl);
  };

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-300">
      
      {/* Toast Alert feedback popup */}
      {message && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center space-x-2.5 p-4 rounded-2xl shadow-xl border animate-in slide-in-from-bottom-6 duration-300 ${
          message.type === "success" 
            ? "bg-[#093530]/95 text-teal-300 border-teal-500/35" 
            : "bg-red-500/95 text-white border-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle className="w-5 h-5 text-teal-400 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-xs font-semibold leading-normal">{message.text}</span>
        </div>
      )}

      {/* Header section */}
      <div id="profile-header-sec">
        <h1 className="font-sans font-bold text-xl text-slate-800 tracking-tight flex items-center">
          <UserIcon className="w-5 h-5 text-teal-600 mr-2" />
          <span>{t("profile")}</span>
        </h1>
        <p className="text-xs text-slate-400 font-medium mt-1">
          Review operational scopes, configure notification targets, and verify cryptographic security credentials.
        </p>
      </div>

      {/* Bento Grid layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Card: Avatar selection, status identifiers */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm relative overflow-hidden flex flex-col items-center text-center">
            
            {/* Status indicators and badges */}
            <div className="absolute right-4 top-4 flex flex-col space-y-1.5 items-end">
              <span className="text-[9px] font-extrabold text-[#093530] bg-[#093530]/10 border border-teal-200 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {user?.role}
              </span>
              <span className="text-[9px] font-extrabold text-teal-700 bg-teal-50 border border-teal-200/50 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center">
                <span className="w-1.5 h-1.5 bg-teal-500 rounded-full mr-1 animate-pulse" />
                <span>{t("active")}</span>
              </span>
            </div>

            {/* Avatar display */}
            <div className="relative mt-4">
              <img
                src={previewUrl || avatarUrl}
                alt={user?.name}
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "/public/images/default-avatar.png";
                }}
                className={`w-24 h-24 object-cover rounded-full ring-4 shadow-md bg-slate-50 transition duration-300 ${
                  previewUrl 
                    ? "ring-teal-500 animate-pulse border-2 border-teal-400" 
                    : "ring-teal-500/10"
                }`}
              />

              {previewUrl && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-md animate-bounce tracking-wider shadow">
                  Preview Mode
                </span>
              )}

              <label 
                className="absolute shrink-0 bottom-0 right-0 w-8 h-8 rounded-full bg-[#093530] border-2 border-white flex items-center justify-center text-teal-300 hover:scale-105 cursor-pointer shadow-md transition-all"
                title="Upload Profile Picture"
              >
                <Upload className="w-3.5 h-3.5" />
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleUploadedFile(e.target.files[0]);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mt-4">
              <h3 className="font-sans font-extrabold text-sm text-slate-800 leading-tight">{user?.name}</h3>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">{user?.email}</p>
              <p className="text-[9px] text-teal-600 bg-teal-50 px-2.5 py-1 rounded-full font-sans font-bold inline-block mt-2">
                📸 Profile Picture Optional
              </p>
            </div>

            {/* Realtime progress tracker for heavy uploads / compression */}
            {uploadProgress !== null && (
              <div className="w-full mt-4 p-3.5 bg-slate-50 border border-slate-100 rounded-2xl animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between text-[10px] font-black text-slate-600 mb-1.5 uppercase tracking-wider">
                  <span className="flex items-center gap-1 shrink-0">
                    <Loader2 className="w-3 h-3 text-teal-600 animate-spin" />
                    <span className="truncate max-w-[130px]">{uploadStep || "Optimizing profile asset..."}</span>
                  </span>
                  <span className="text-teal-600 ml-1 shrink-0">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-teal-600 h-1.5 rounded-full transition-all duration-300 shadow-sm"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Verification & Preview control deck */}
            {previewUrl && (
              <div className="w-full mt-4 p-3 bg-teal-50/50 border border-teal-100/80 rounded-2xl space-y-2 text-left animate-in slide-in-from-top-4 duration-300">
                <div className="flex items-center space-x-2 text-[10px] font-bold text-[#093530]">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
                  <span>PREVIEW QUALITY REPORT</span>
                </div>
                <p className="text-[9.5px] text-slate-500 leading-relaxed font-semibold">
                  Original image compressed securely to <strong className="text-teal-900 font-bold">512x512 JPEG</strong> to reduce server transmission footprint.
                </p>
                {originalFile && (
                  <div className="p-2 border border-slate-100 bg-white rounded-xl text-[9px] font-mono text-slate-400 space-y-0.5 leading-snug">
                    <div className="truncate"><span className="font-extrabold text-[#093530]">FILE:</span> {originalFile.name}</div>
                    <div><span className="font-extrabold text-[#093530]">TYPE:</span> {originalFile.mime}</div>
                    <div><span className="font-extrabold text-[#093530]">SIZE:</span> {(originalFile.size / (1024 * 1024)).toFixed(2)}MB</div>
                  </div>
                )}
                
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => syncAvatarOnServer(previewUrl)}
                    disabled={loading}
                    className="flex-1 py-1.5 bg-[#093530] hover:bg-teal-950 text-teal-300 font-extrabold text-[10px] rounded-lg tracking-wider uppercase shadow-sm cursor-pointer transition flex items-center justify-center space-x-1"
                  >
                    {loading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-teal-300" />
                    ) : (
                      <CheckCircle className="w-3 h-3" />
                    )}
                    <span>Save Photo</span>
                  </button>
                  <button
                    onClick={handleDiscardPreview}
                    disabled={loading}
                    className="py-1.5 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] rounded-lg cursor-pointer transition flex items-center justify-center"
                    title="Discard Photo Preview"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Standard Options Deck: Reset photo */}
            {!previewUrl && avatarUrl && !avatarUrl.includes("default-avatar.png") && (
              <div className="w-full mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleResetToDefault}
                  disabled={loading}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[9px] font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-xl transition duration-150 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Custom Avatar</span>
                </button>
              </div>
            )}

            {/* Drag and Drop Cover widget */}
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleUploadedFile(e.dataTransfer.files[0]);
                }
              }}
              className={`mt-6 w-full p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center transition ${
                isDragging 
                  ? "bg-teal-50 border-teal-500" 
                  : "bg-slate-50/55 border-slate-200 hover:border-slate-350"
              }`}
            >
              <Upload className="w-5 h-5 text-slate-400 animate-bounce" />
              <p className="text-[10px] font-bold text-slate-500 mt-2">Drag &amp; drop profile picture here</p>
              <p className="text-[9px] text-slate-400 mt-0.5 font-medium">JPEG, PNG, WEBP — Max 3MB secure limit</p>
            </div>

            {/* Predefined clinical avatars */}
            <div className="mt-6 w-full text-left">
              <h4 className="text-[10px] font-extrabold tracking-wider text-slate-400 uppercase mb-3">
                Preselected Clinical Illustrators
              </h4>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
                {DEFAULT_AVATARS.map((avUrl, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setPreviewUrl(null);
                      setOriginalFile(null);
                      syncAvatarOnServer(avUrl);
                    }}
                    className={`w-10 h-10 rounded-xl overflow-hidden border-2 bg-slate-50 transition hover:scale-105 ${
                      avatarUrl === avUrl ? "border-teal-500 scale-103 shadow-sm shadow-teal-500/20" : "border-transparent"
                    }`}
                  >
                    <img
                      src={avUrl}
                      alt={`avatar-${index}`}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = "/public/images/default-avatar.png";
                      }}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Onboarding checklist & Verification Status Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5 text-left">
            <div>
              <h3 className="font-sans font-bold text-sm text-slate-800 flex items-center gap-2">
                📋 Profile Onboarding Status
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-normal mt-1">
                Operators must complete mandatory benchmarks to authenticate workstations. Profile picture is completely optional.
              </p>
            </div>

            {/* Calculations dynamically based on benchmarks */}
            {(() => {
              const completion = calculateProfileCompletion(user);
              return (
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center text-xs font-bold text-slate-705 mb-1.5">
                      <span className="text-slate-700">Verification Progress:</span>
                      <span className="text-teal-600 font-mono font-bold text-sm">{completion.percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden border border-slate-200/40">
                      <div 
                        className="bg-teal-600 h-full transition-all duration-500 rounded-full" 
                        style={{ width: `${completion.percent}%` }} 
                      />
                    </div>
                  </div>

                  {/* Benchmark criteria listing */}
                  <div className="space-y-2 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                      Node Benchmarks Checklist
                    </p>
                    <div className="space-y-1.5">
                      {[
                        { key: "avatar", label: "Unique Avatar Aspect (Optional)", val: completion.criteria.avatar, isOptional: true },
                        { key: "name", label: "Full Corporate Name", val: completion.criteria.name },
                        { key: "email", label: "Corporate Email Address", val: completion.criteria.email },
                        { key: "phone", label: "Telephone Coordinates", val: completion.criteria.phone },
                        { key: "nationalId", label: "National ID (No.)", val: completion.criteria.nationalId },
                        { key: "address", label: "Operational Address", val: completion.criteria.address },
                        { key: "password", label: "Master Password", val: completion.criteria.password },
                        { key: "role", label: "Assigned Work Role", val: completion.criteria.role }
                      ].map((item) => (
                        <div key={item.key} className="flex items-center justify-between text-xs font-semibold text-slate-600">
                          <span className="flex items-center space-x-1.5">
                            <span className="text-[9px] select-none">
                              {item.val ? "🟢" : item.isOptional ? "🔹" : "⚪"}
                            </span>
                            <span className={item.val ? "text-slate-800 font-extrabold" : "text-slate-400 font-semibold"}>
                              {item.label}
                            </span>
                          </span>
                          <span className={`text-[9.5px] font-bold font-mono ${item.val ? "text-teal-600 font-black" : "text-slate-400"}`}>
                            {item.val ? "REACHED" : item.isOptional ? "OPTIONAL" : "LACKING"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Identity Verification details */}
                  <hr className="border-slate-100" />
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">Verification Ticket:</span>
                      <span className={`text-[9px] font-black border uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        completion.percent === 100 || user?.verificationStatus === "Verified" 
                          ? "bg-emerald-55 bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : user?.verificationStatus === "Pending" 
                          ? "bg-amber-50 text-amber-500 border-amber-200 animate-pulse" 
                          : user?.verificationStatus === "Rejected"
                          ? "bg-red-50 text-red-700 border-red-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {completion.percent === 100 ? "Verified (Auto-Unlocked 100%)" : (user?.verificationStatus || "NOT SUBMITTED")}
                      </span>
                    </div>

                    {user?.verificationDetails?.reviewerComment && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-[10px] text-slate-500 italic leading-relaxed">
                        <strong className="text-slate-700 block not-italic font-bold mb-0.5">Reviewer Feedback:</strong>
                        "{user.verificationDetails.reviewerComment}"
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setIsVerifyModalOpen(true)}
                      className="w-full py-2.5 bg-[#093530] hover:bg-teal-950 text-teal-350 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition text-center"
                    >
                      {completion.percent === 100 || user?.verificationStatus === "Verified" ? "Review Documents" : "Verify Workstation Identity Check"}
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Admin Verification Control Board */}
          {user?.role === "Admin" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4 text-left">
              <div className="flex items-center space-x-2">
                <span className="text-sm">🛡️</span>
                <div>
                  <h3 className="font-sans font-bold text-sm text-slate-800">
                    Admin Verification Suite
                  </h3>
                  <p className="text-[10px] text-slate-400 font-medium">
                    You are logged in as Administrator. Review profile onboarding submissions.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
                <p className="text-[9.5px] font-black text-slate-400 tracking-wider uppercase">
                  Verify Node Operations
                </p>

                <div className="space-y-1.5">
                  <label className="text-[9.5px] font-extrabold text-slate-500 block">Reviewer Decision Notes:</label>
                  <textarea
                    rows={2}
                    value={reviewerComment}
                    onChange={(e) => setReviewerComment(e.target.value)}
                    placeholder="Provide details of credentials validation status..."
                    className="w-full p-2.5 bg-white border border-slate-200 focus:border-teal-400 focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                  />
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => handleReviewAction("Verified")}
                    className="flex-1 py-1.5 bg-teal-650 bg-teal-620 bg-teal-600 hover:bg-teal-700 text-white font-extrabold text-[10px] rounded-lg transition text-center cursor-pointer"
                  >
                    ✅ Validate Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleReviewAction("Rejected")}
                    className="flex-1 py-1.5 bg-red-650 bg-red-620 bg-red-650 bg-red-600 hover:bg-red-750 text-white font-extrabold text-[10px] rounded-lg transition text-center cursor-pointer"
                  >
                    ❌ Flag Reject
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right Card: Multi-Tab profile edit operations */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            
            {/* Inner navigation Tabs */}
            <div className="flex space-x-2 border-b border-slate-100 pb-3 mb-6 overflow-x-auto">
              {[
                { id: "info", label: t("personal_info"), icon: UserIcon },
                { id: "security", label: "Credentials Management", icon: Lock },
                { id: "preferences", label: t("settings"), icon: Settings },
                { id: "history", label: "Security Activity Feed", icon: History }
              ].map((tb) => {
                const TabIcon = tb.icon;
                const isSelected = activeTab === tb.id;
                return (
                  <button
                    key={tb.id}
                    onClick={() => setActiveTab(tb.id as any)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition cursor-pointer ${
                      isSelected 
                        ? "bg-[#093530] text-teal-300" 
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <TabIcon className="w-3.5 h-3.5" />
                    <span>{tb.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab 1: Personal Info */}
            {activeTab === "info" && (
              <form id="profile-settings-sec" onSubmit={handleUpdateProfile} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Workstation Full Name</label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Account Corporate Email</label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        disabled
                        value={email}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-mono font-semibold text-slate-400 select-none cursor-not-allowed"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t("phone_number")}</label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+33 600 000 000"
                        className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Workstation Operational Role</label>
                    <div className="relative">
                      <Shield className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        disabled
                        value={user?.role || ""}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-400 cursor-not-allowed uppercase"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">National ID or Passport No.</label>
                    <div className="relative">
                      <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={nationalId}
                        onChange={(e) => setNationalId(e.target.value)}
                        placeholder="e.g. ID-887162541"
                        className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Operational/Residence Address</label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="e.g. 104 Parklane Avenue, Nairobi"
                        className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{t("med_specialty")}</label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Provide short credentials details e.g. Chief Pharmacist at Clinical Dispatch Hub, focusing on Allergy Countermeasures..."
                    className="w-full p-3.5 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-2xl text-xs font-semibold text-slate-800 transition leading-snug"
                  />
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-1.5 bg-[#093530] text-teal-300 hover:bg-teal-950 font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
                  >
                    <Save className="w-4 h-4" />
                    <span>{t("save_changes")}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 2: Security Password Changing */}
            {activeTab === "security" && (
              <form onSubmit={handleChangePassword} className="space-y-5">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start space-x-3 mb-2">
                  <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-amber-900 leading-tight">Password Security Specifications</h4>
                    <p className="text-[10px] text-amber-800 leading-relaxed mt-1 font-medium">
                      Modifying your password forces validation logs. Any password updates automatically records a security verification event inside the centralized state audit trace.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Current Workstation Password</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showPass ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-10 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">New Secure Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Min 6 characters"
                          className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">Confirm New Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type={showPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-type password"
                          className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800 transition"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center space-x-1.5 bg-[#093530] text-teal-300 hover:bg-teal-950 font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer shadow-md transition-all"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Change Secure Password</span>
                  </button>
                </div>
              </form>
            )}

            {/* Tab 3: Detailed Preferences / Notification Panel */}
            {activeTab === "preferences" && (
              <div id="profile-preferences-sec" className="space-y-6">
                
                {/* Profile UI config parameters */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-3 flex items-center">
                    <Settings className="w-4 h-4 text-slate-400 mr-1.5" />
                    <span>User Interface Configuration</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Default Sidebar</p>
                      <div className="flex justify-center space-x-2.5">
                        <button 
                          onClick={() => setSidebarCollapsed(false)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black ${!sidebarCollapsed ? "bg-[#093530] text-teal-300" : "bg-white text-slate-600 border border-slate-200"}`}
                        >
                          Expanded
                        </button>
                        <button 
                          onClick={() => setSidebarCollapsed(true)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-black ${sidebarCollapsed ? "bg-[#093530] text-teal-300" : "bg-white text-slate-600 border border-slate-200"}`}
                        >
                          Compact
                        </button>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Workstation Tab</p>
                      <select 
                        value={favModule} 
                        onChange={(e) => { setFavModule(e.target.value); showToast("success", "Preferences cached."); }}
                        className="w-full bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 py-1 px-1.5 focus:outline-none"
                      >
                        <option>Dashboard</option>
                        <option>Products</option>
                        <option>POS Counter</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-150 rounded-2xl text-center space-y-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Interface Color Theme</p>
                      <div className="flex justify-center space-x-1.5 mt-1">
                        {["teal", "blue", "indigo", "rose"].map((c) => (
                          <button
                            key={c}
                            onClick={() => { setThemeColor(c); showToast("success", `Accent updated to ${c}.`); }}
                            className={`w-4 h-4 rounded-full bg-${c}-600 ${themeColor === c ? "ring-2 ring-offset-2 ring-slate-800" : ""}`}
                            style={{ backgroundColor: c === "teal" ? "#0d9488" : c === "blue" ? "#2563eb" : c === "indigo" ? "#4f46e5" : "#e11d48" }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Secure Target dispatch Preferences */}
                <div>
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide mb-3 flex items-center">
                    <Bell className="w-4 h-4 text-slate-400 mr-1.5" />
                    <span>{t("notification_preferences")}</span>
                  </h3>
                  <div className="space-y-3">
                    {[
                      { state: emailAlerts, set: setEmailAlerts, title: "Critical Expiration Email Warnings", desc: "Dispatch warning bulletins when pharmacy products enter <30 days shelf lifespans." },
                      { state: lowStockDigests, set: setLowStockDigests, title: "Daily Low Stock Alerts", desc: "Push warnings to dashboard notifications when medicines fall behind safety limits." },
                      { state: expiryWarnings, set: setExpiryWarnings, title: "Automatic Supplier Reorder Advisories", desc: "Approve AI-Copilot suggesting purchase orders automatically for depleted drugs." },
                      { state: financialSummaries, set: setFinancialSummaries, title: "Weekly Consolidated Financial Digest", desc: "Deliver weekly revenue analytics and sales forecasts directly to administration emails." }
                    ].map((n, index) => (
                      <div key={index} className="flex items-start justify-between p-3.5 bg-slate-50/70 border border-slate-100 rounded-2xl">
                        <div className="flex-1 min-w-0 pr-4">
                          <h4 className="text-[11.5px] font-extrabold text-slate-800 leading-none">{n.title}</h4>
                          <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-1">{n.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => { n.set(!n.state); showToast("success", "Bulletins synced."); }}
                          className={`w-9 h-5 rounded-full p-0.5 transition ${n.state ? "bg-teal-600" : "bg-slate-350"}`}
                          style={{ backgroundColor: n.state ? "#0d9488" : "#cbd5e1" }}
                        >
                          <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition transform ${n.state ? "translate-x-4" : "translate-x-0"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* Tab 4: Security login history / activity trail */}
            {activeTab === "history" && (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wide flex items-center">
                    <Clock className="w-4 h-4 text-slate-400 mr-1.5" />
                    <span>Archived Audit Actions</span>
                  </h3>
                  <button 
                    onClick={fetchAuditLogs}
                    className="text-[9.5px] font-extrabold text-teal-600 hover:text-teal-800 uppercase tracking-wider"
                  >
                    Refresh Logs
                  </button>
                </div>

                {logsLoading ? (
                  <div className="flex justify-center py-10">
                    <Clock className="w-6 h-6 text-teal-600 animate-spin" />
                  </div>
                ) : auditLogs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl border border-slate-100">
                    No matching activity logs recorded for this operator node.
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 pl-4 space-y-6 mt-4 ml-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="relative group">
                        {/* Dot marker */}
                        <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-teal-500 ring-4 ring-white" />
                        
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-slate-800">{log.action}</h4>
                            <span className="text-[9.5px] text-slate-400 font-mono font-medium">{new Date(log.date).toLocaleDateString()} {new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wide font-bold">{log.module}</p>
                          <p className="text-[10px] text-slate-500 leading-normal max-w-xl font-medium">{log.details}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Verify Identity Modal */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 animate-in fade-in duration-200 p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-xl shadow-2xl relative overflow-hidden max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
            <button 
              type="button"
              onClick={() => setIsVerifyModalOpen(false)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-650 hover:bg-slate-50 transition rounded-lg p-1.5 cursor-pointer text-sm font-bold"
            >
              ✕
            </button>

            <div className="flex items-center space-x-3 mb-5 border-b border-slate-100 pb-4">
              <div className="w-10 h-10 rounded-full bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600">
                <Shield className="w-5 h-5 animate-pulse" />
              </div>
              <div className="text-left">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">
                  Workstation Identity Onboarding
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">
                  Secure cryptographic submission for pharmacist licensing & verification.
                </p>
              </div>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-5 text-left">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Verification Document Type</label>
                  <select 
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full bg-slate-100/70 border border-slate-100 rounded-xl text-xs font-bold text-slate-700 py-2.5 px-3 focus:outline-none focus:bg-white focus:border-teal-400 transition"
                  >
                    <option value="National ID">National ID Card (NID)</option>
                    <option value="Passport">International Passport</option>
                    <option value="driving_license">Government Driving License</option>
                    <option value="pharmacist_license">Clinical Pharmacist Practice License</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Official Document ID No.</label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={vNationalId}
                      onChange={(e) => setVNationalId(e.target.value)}
                      placeholder="e.g. ID-887162541"
                      className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Physical Operational/Residence Address</label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={vAddress}
                      onChange={(e) => setVAddress(e.target.value)}
                      placeholder="e.g. 104 Parklane Avenue, Nairobi"
                      className="w-full pl-9 pr-4 py-2 bg-slate-100/70 border border-slate-100 focus:border-teal-400 focus:bg-white focus:outline-none rounded-xl text-xs font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Upload Selfie & Document layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">Facial Selfie Identification</label>
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative h-36">
                    {selfieFile ? (
                      <div className="relative w-full h-full">
                        <img
                          src={selfieFile}
                          alt="selfie"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/public/images/default-avatar.png";
                          }}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button 
                          type="button" 
                          onClick={() => setSelfieFile(null)}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-750 text-white rounded-full p-1 text-[10px] w-5 h-5 flex items-center justify-center font-bold shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-450 text-slate-400 animate-bounce mb-2" />
                        <span className="text-[9.5px] font-extrabold text-slate-750 text-slate-700">Selfie Headshot Photo</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const r = new FileReader();
                              r.onload = (ev) => setSelfieFile(ev.target?.result as string);
                              r.readAsDataURL(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="text-[8px] text-slate-400 mt-1 font-medium">Click to select selfie graphic</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide block">ID Scan/Licensed Document</label>
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center relative h-36">
                    {docFile ? (
                      <div className="relative w-full h-full text-left">
                        <img
                          src={docFile}
                          alt="document scan"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "/public/images/default-avatar.png";
                          }}
                          className="w-full h-full object-cover rounded-xl"
                        />
                        <button 
                          type="button" 
                          onClick={() => setDocFile(null)}
                          className="absolute top-1.5 right-1.5 bg-red-600 hover:bg-red-750 text-white rounded-full p-1 text-[10px] w-5 h-5 flex items-center justify-center font-bold shadow"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <>
                        <FileText className="w-5 h-5 text-slate-450 text-slate-400 animate-pulse mb-2" />
                        <span className="text-[9.5px] font-extrabold text-slate-750 text-slate-700">Credential Document Scan</span>
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              const r = new FileReader();
                              r.onload = (ev) => setDocFile(ev.target?.result as string);
                              r.readAsDataURL(e.target.files[0]);
                            }
                          }}
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        />
                        <span className="text-[8px] text-slate-400 mt-1 font-medium">Click to select credential document</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Demo auto-populate tool block to facilitate rapid verification audits */}
              <div className="p-3.5 bg-teal-50 border border-teal-100 rounded-2xl">
                <span className="text-[9px] font-extrabold text-teal-800 uppercase tracking-wider block mb-1">
                  🧪 Administrative Simulation Auto-Fill targets:
                </span>
                <p className="text-[8.5px] text-teal-600 leading-normal mb-2">
                  Instantly mock full credential records to bypass manual camera uploads and verify clinical state flows:
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVNationalId("ID-9964525");
                      setVAddress("742 Clinic Plaza Avenue, Central City");
                      setSelfieFile("/public/images/default-avatar.png");
                      setDocFile("/public/images/default-avatar.png");
                      showToast("success", "Prereserved clinical credential pack loaded successfully!");
                    }}
                    className="px-3 py-1 bg-white hover:bg-teal-50 border border-teal-200 text-[#093530] font-extrabold text-[9px] rounded-lg cursor-pointer transition shadow-xs"
                  >
                    Quick Load Valid Pharmacist Package
                  </button>
                </div>
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-[#093530] hover:bg-teal-950 text-teal-300 font-extrabold text-xs rounded-xl shadow-md cursor-pointer transition text-center"
                >
                  {loading ? "Transmitting verification package..." : "Submit Verification Packet"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsVerifyModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl cursor-pointer transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
