import React, { useEffect, useState, useRef } from "react";
import { X, Camera, Keyboard, Sparkles, Loader2, AlertCircle, Volume2, Search } from "lucide-react";
import { Medicine } from "../types";

let cachedHtml5QrcodeClass: any = null;

async function getHtml5Qrcode(): Promise<any> {
  if (cachedHtml5QrcodeClass) {
    return cachedHtml5QrcodeClass;
  }

  // 1. Try checking global window object first
  if (typeof window !== "undefined" && (window as any).Html5Qrcode) {
    cachedHtml5QrcodeClass = (window as any).Html5Qrcode;
    return cachedHtml5QrcodeClass;
  }

  // 2. Try to dynamically import the package from bundler
  try {
    const mod = await import("html5-qrcode");
    if (mod && mod.Html5Qrcode) {
      cachedHtml5QrcodeClass = mod.Html5Qrcode;
      return cachedHtml5QrcodeClass;
    }
  } catch (err) {
    console.warn("Failed to import html5-qrcode dynamically from node_modules. Attempting CDN failover...", err);
  }

  // 3. Fallback: Dynamically inject script from CDN
  if (typeof window !== "undefined") {
    return new Promise((resolve, reject) => {
      const scriptId = "html5-qrcode-cdn-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
        script.async = true;
        
        script.onload = () => {
          if ((window as any).Html5Qrcode) {
            cachedHtml5QrcodeClass = (window as any).Html5Qrcode;
            resolve(cachedHtml5QrcodeClass);
          } else {
            reject(new Error("html5-qrcode loaded from CDN but failed to bind to global scope."));
          }
        };

        script.onerror = () => {
          reject(new Error("Unable to load the html5-qrcode engine from local files or CDN. Please verify internet connectivity."));
        };

        document.head.appendChild(script);
      } else {
        // Script tag exists but is loading
        const interval = setInterval(() => {
          if ((window as any).Html5Qrcode) {
            clearInterval(interval);
            cachedHtml5QrcodeClass = (window as any).Html5Qrcode;
            resolve(cachedHtml5QrcodeClass);
          }
        }, 100);
        // Timeout after 10s
        setTimeout(() => {
          clearInterval(interval);
          if (!(window as any).Html5Qrcode) {
            reject(new Error("html5-qrcode script loaded but timed out waiting for initialization."));
          }
        }, 10000);
      }
    });
  }

  throw new Error("html5-qrcode scanner is not available in non-browser environments.");
}

// Dynamic check for audio beep support
export function playScanBeep(success = true) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    if (success) {
      // High pitch double-tone check beep
      osc.type = "sine";
      osc.frequency.setValueAtTime(1300, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } else {
      // Error buzzer
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.35);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    }
  } catch (error) {
    console.debug("Synthesized audio scan sound disabled by browser safety policies.", error);
  }
}

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (barcode: string) => void;
  title?: string;
  description?: string;
  customMedicines?: Medicine[]; // Optional list to help resolve scanned products
}

export default function BarcodeScannerModal({
  isOpen,
  onClose,
  onScanSuccess,
  title = "Omnichannel Barcode Scanning Station",
  description = "Awaiting active barcode input via physical scanner, text console, or camera feed.",
  customMedicines = []
}: BarcodeScannerModalProps) {
  const [activeTab, setActiveTab] = useState<"webrtc" | "keyboard">("keyboard");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "invalid">("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [cameraList, setCameraList] = useState<string[]>([]);
  
  // Simulated Scanner product helpers
  const [mockQuery, setMockQuery] = useState("");

  const scannerRef = useRef<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>("");

  // Auto focus field
  useEffect(() => {
    if (isOpen && activeTab === "keyboard") {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
    }
  }, [isOpen, activeTab]);

  // Clean camera scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera when modal is closed
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
    }
  }, [isOpen]);

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.warn("Failed stopping camera stream cleanly:", e);
      }
      scannerRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    
    // Slight delay to allow DOM render of container element
    setTimeout(async () => {
      try {
        const Html5QrcodeClass = await getHtml5Qrcode();
        if (!Html5QrcodeClass) {
          throw new Error("The barcode scanning engine (html5-qrcode) could not be loaded. Please ensure internet access is active, or use the Keyboard/Virtual Simulator tab to proceed.");
        }
        const scanner = new Html5QrcodeClass("camera-stream-box");
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 15,
            qrbox: (width, height) => {
              // Custom optimal rectangular box for barcodes rather than standard square QR boxes
              const minSize = Math.min(width, height);
              return {
                width: Math.floor(width * 0.8),
                height: Math.floor(height * 0.45)
              };
            }
          },
          (decodedText) => {
            // Success handler
            handleScannedCode(decodedText);
          },
          () => {
            // Error parser - ignored to avoid console clutter. html5-qrcode scans frames continuously.
          }
        );
      } catch (err: any) {
        setCameraActive(false);
        setCameraError(
          err?.message || "Camera access requested but denied or unavailable (Verify browser permission)."
        );
        console.error("Camera scan startup issue:", err);
      }
    }, 450);
  };

  const handleScannedCode = (code: string) => {
    if (!code || code.trim() === "") return;
    
    // Throttler check for duplicate rapid scans (hardware bouncers or double frame scans)
    const now = Date.now();
    if (code === lastScannedCodeRef.current && now - lastScanTimeRef.current < 450) {
      console.info("Webcam / Simulator rapid duplicate scan throttled:", code);
      return;
    }
    lastScannedCodeRef.current = code;
    lastScanTimeRef.current = now;

    // Play check match Sound
    playScanBeep(true);

    // Visual animation feedbacks
    setScanStatus("success");
    setStatusMessage(`Parsed code successfully: "${code}"`);
    setBarcodeInput(code);

    // Call success dispatcher
    onScanSuccess(code);

    // Highlight briefly before closing
    setTimeout(() => {
      setScanStatus("idle");
      stopCamera();
      onClose();
    }, 700);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = barcodeInput.trim();
    if (!clean) return;
    
    // Run generic check if product exists in scope
    if (customMedicines.length > 0) {
      const match = customMedicines.find(m => m.barcode === clean || m.SKU === clean);
      if (!match) {
        playScanBeep(false);
        setScanStatus("invalid");
        setStatusMessage(`Item '${clean}' not recognized in current catalog Registry.`);
        setTimeout(() => setScanStatus("idle"), 2500);
        return;
      }
    }

    handleScannedCode(clean);
  };

  // Filter products for simulator lists
  const filteredMockMeds = customMedicines.filter(m => {
    const q = mockQuery.toLowerCase();
    return m.name.toLowerCase().includes(q) || m.barcode.includes(q) || m.SKU.toLowerCase().includes(q);
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-150 shadow-2xl max-w-xl w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Module Header */}
        <div className="px-6 py-5 bg-[#093530] border-b border-slate-150 flex items-center justify-between text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-400/10 border border-teal-400/25 flex items-center justify-center text-teal-300">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">{title}</h3>
              <p className="text-[10.5px] text-teal-200 font-medium">{description}</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-1.5 hover:bg-white/10 rounded-xl text-teal-100 transition cursor-pointer select-none"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Area tabs */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-2">
          <button
            onClick={() => {
              stopCamera();
              setActiveTab("keyboard");
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-xl transition ${
              activeTab === "keyboard"
                ? "bg-white text-teal-900 shadow-sm border border-slate-150"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Keyboard className="w-4 h-4" />
            <span>Manual Keyboard & Virtual Simulator</span>
          </button>
          
          <button
            onClick={() => {
              setActiveTab("webrtc");
              startCamera();
            }}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 px-3 text-xs font-bold rounded-xl transition ${
              activeTab === "webrtc"
                ? "bg-white text-teal-900 shadow-sm border border-slate-150"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Webcam Device Camera</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 max-h-[60vh]">
          
          {/* Status Indicators */}
          {scanStatus === "success" && (
            <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-2xl flex items-center space-x-3 text-emerald-850 animate-bounce">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <Volume2 className="w-4 h-4" />
              </div>
              <p className="text-[11px] font-bold">{statusMessage || "Scan acknowledged check logged!"}</p>
            </div>
          )}

          {scanStatus === "invalid" && (
            <div className="bg-rose-50 border border-rose-150 p-4 rounded-2xl flex items-center space-x-3 text-rose-850">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
              <p className="text-[11px] font-bold">{statusMessage}</p>
            </div>
          )}

          {/* Keyboard tab panel view */}
          {activeTab === "keyboard" && (
            <div className="space-y-4">
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 uppercase block mb-1">
                    Enter Barcode Sequence (Or scan with physical hand scanner)
                  </label>
                  <div className="relative">
                    <input
                      ref={inputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder="e.g. 8901234567890"
                      className="w-full text-sm font-mono font-bold text-slate-700 bg-slate-50 border border-slate-200 p-3 pr-24 rounded-2xl focus:outline-teal-600 focus:bg-white transition"
                    />
                    <button
                      type="submit"
                      className="absolute right-2 top-2 px-4 py-1.5 bg-[#093530] hover:bg-[#0c4a43] text-teal-300 font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                    >
                      Process Input
                    </button>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mt-1.5 leading-normal">
                    💡 **Physical Hardware Scanners** are fully supported! Keep this input modal open and pull your wireless scanner trigger. It will automatically populate, sound a clinical beep, and commit the transaction.
                  </p>
                </div>
              </form>

              {/* Advanced Interactive Virtual Product Simulator */}
              {customMedicines.length > 0 && (
                <div className="mt-4 border border-slate-150 rounded-2xl p-4 bg-slate-50/60">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-[10.5px] font-extrabold text-slate-600 uppercase tracking-wider">
                      Interactive Product Hardware Simulator
                    </h4>
                    <span className="text-[8.5px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 uppercase py-0.5 animate-pulse">
                      Simulate Scanner Device
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-400 mb-3 leading-tight">
                    Don't have a barcode sheet or camera handy? Click any product below to trigger a flawless simulated physical barcode swipe event!
                  </p>

                  <div className="relative mb-2.5">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={mockQuery}
                      onChange={(e) => setMockQuery(e.target.value)}
                      placeholder="Filter interactive product database..."
                      className="w-full text-xs bg-white border border-slate-200 pl-8.5 py-1.5 pr-3 rounded-xl focus:outline-none"
                    />
                  </div>

                  <div className="max-h-[140px] overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white">
                    {filteredMockMeds.length === 0 ? (
                      <p className="p-3 text-center text-[10px] text-slate-400 font-mono">No simulator records found</p>
                    ) : (
                      filteredMockMeds.map(m => (
                        <button
                          key={m.id}
                          onClick={() => {
                            setBarcodeInput(m.barcode);
                            handleScannedCode(m.barcode);
                          }}
                          className="w-full p-2.5 text-left text-xs hover:bg-slate-50 flex items-center justify-between transition group cursor-pointer"
                        >
                          <div>
                            <p className="font-bold text-slate-700 group-hover:text-teal-900">{m.name}</p>
                            <p className="text-[9.5px] text-slate-400 italic font-mono font-medium">{m.genericName}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-mono font-black text-slate-800 bg-slate-100 hover:bg-teal-50 px-2 py-0.5 rounded-md border border-slate-200 uppercase">
                              🧬 Scan: {m.barcode}
                            </span>
                            <p className="text-[8.5px] text-slate-400 font-mono mt-0.5">Quantity: {m.quantity}</p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* WebRTC Camera view panel */}
          {activeTab === "webrtc" && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="bg-rose-50 border border-rose-150 p-4 rounded-2xl flex flex-col items-center text-center space-y-2">
                  <AlertCircle className="w-8 h-8 text-rose-500" />
                  <p className="text-xs font-bold text-rose-850 uppercase">Video Device Connection Problem</p>
                  <p className="text-[10.5px] text-rose-700 font-medium leading-normal max-w-sm">{cameraError}</p>
                  <button
                    onClick={() => {
                      stopCamera();
                      startCamera();
                    }}
                    className="mt-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
                  >
                    Retry Connection
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {cameraActive ? (
                    <div className="w-full relative rounded-2xl overflow-hidden border-2 border-slate-150 bg-black aspect-video max-w-sm">
                      {/* html5-qrcode video container */}
                      <div id="camera-stream-box" className="w-full h-full [&>div]:h-full [&>video]:object-cover [&>video]:h-full" />
                      
                      {/* High-tech UI elements */}
                      <div className="absolute inset-0 pointer-events-none border-[16px] border-slate-900/40 flex flex-col items-center justify-center">
                        <div className="w-[85%] h-[40%] border-2 border-teal-400 rounded-lg relative flex items-center justify-center">
                          {/* Pulsing red laser tracker line */}
                          <div className="absolute left-0 right-0 h-0.5 bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" style={{ top: "50%" }} />
                          
                          {/* Brackets indicator */}
                          <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-teal-300" />
                          <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-teal-300" />
                          <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-teal-300" />
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-teal-300" />
                        </div>
                        <p className="text-[8.5px] font-black text-teal-300 bg-slate-950/80 px-2 py-0.5 rounded uppercase tracking-widest mt-3">
                          ALIGN BARCODE WITH RED RADAR
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="w-full py-12 bg-slate-50 border border-dashed border-slate-205 rounded-2xl flex flex-col items-center">
                      <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                      <p className="text-[11px] font-bold text-slate-500 mt-2">Requesting active camera permissions...</p>
                    </div>
                  )}
                  
                  <div className="w-full max-w-sm flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2.5">
                    <span>STATUS: {cameraActive ? "MUTUAL LINK ACTIVE" : "AWAITING ENGINE"}</span>
                    <span>TYPE: GENERIC CAMWEDGE</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-150 flex justify-between select-none items-center text-xs">
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
            Auto-Linked to central DB
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="px-5 py-2 bg-[#093530] hover:bg-[#0c4a43] text-teal-300 font-bold rounded-xl shadow-md transition cursor-pointer"
          >
            Close Scanner Panel
          </button>
        </div>
      </div>
    </div>
  );
}
