import React, { useState, useEffect, useRef } from "react";
import { Modal } from "./Modal";
import {
  IoQrCodeOutline,
  IoBarcodeOutline,
  IoCameraOutline,
  IoFlashOutline,
  IoCheckmarkCircle,
  IoAlertCircleOutline
} from "react-icons/io5";

export const BarcodeScannerModal = ({ isOpen, onClose, onScan }) => {
  const [manualCode, setManualCode] = useState("");
  const [activeTab, setActiveTab] = useState("camera"); // 'camera' | 'manual'
  const [cameraError, setCameraError] = useState(null);
  const [isScanningCamera, setIsScanningCamera] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const manualInputRef = useRef(null);

  // Auto-focus manual input if on manual tab
  useEffect(() => {
    if (isOpen && activeTab === "manual") {
      setTimeout(() => {
        manualInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, activeTab]);

  // Start / stop camera stream
  useEffect(() => {
    if (!isOpen || activeTab !== "camera") {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab]);

  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsScanningCamera(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser or environment.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsScanningCamera(true);
        initBarcodeDetector();
      }
    } catch (err) {
      console.warn("Camera init error:", err.message);
      setCameraError("Unable to access camera. Please check permissions or use manual entry.");
    }
  };

  const initBarcodeDetector = () => {
    // Check if BarcodeDetector is available natively (Chromium/Electron)
    if ("BarcodeDetector" in window) {
      const barcodeDetector = new window.BarcodeDetector({
        formats: ["qr_code", "ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "data_matrix"]
      });

      const detectFrame = async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
          return;
        }

        try {
          const barcodes = await barcodeDetector.detect(videoRef.current);
          if (barcodes && barcodes.length > 0) {
            const rawValue = barcodes[0].rawValue;
            if (rawValue) {
              stopCamera();
              onScan(rawValue.trim());
              onClose();
              return;
            }
          }
        } catch {
          // Frame decode skip
        }

        animationFrameRef.current = requestAnimationFrame(detectFrame);
      };

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    } else {
      // BarcodeDetector not supported in this runtime
      setCameraError("Native Barcode Detector is not available. Please use a USB scanner or enter code manually below.");
    }
  };

  const handleManualSubmit = (e) => {
    e?.preventDefault();
    const code = manualCode.trim();
    if (code) {
      onScan(code);
      setManualCode("");
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title="Scan Medicine QR / Barcode"
      size="md"
    >
      <div className="space-y-4">
        {/* Tab Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
          <button
            type="button"
            onClick={() => setActiveTab("camera")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "camera"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <IoCameraOutline className="w-4 h-4" />
            <span>Camera Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === "manual"
                ? "bg-white text-slate-800 shadow-xs"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <IoBarcodeOutline className="w-4 h-4" />
            <span>USB / Manual Entry</span>
          </button>
        </div>

        {/* Camera Viewfinder */}
        {activeTab === "camera" && (
          <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
            />

            {/* Viewfinder Target Graphic */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-emerald-400/80 rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                {/* Laser scanline animation */}
                <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] top-1/2 -translate-y-1/2"></div>
                <span className="absolute -bottom-7 left-0 right-0 text-center text-[10px] font-bold text-emerald-300 tracking-wider uppercase">
                  Align QR / Barcode
                </span>
              </div>
            </div>

            {/* Camera Error Message */}
            {cameraError && (
              <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center p-6 text-center text-slate-200">
                <IoAlertCircleOutline className="w-10 h-10 text-amber-400 mb-2" />
                <p className="text-xs font-medium text-slate-300 max-w-xs">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => setActiveTab("manual")}
                  className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Switch to Manual / USB Scanner
                </button>
              </div>
            )}
          </div>
        )}

        {/* Manual / USB Scanner Input */}
        {activeTab === "manual" && (
          <form onSubmit={handleManualSubmit} className="space-y-4 py-2">
            <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-emerald-900 text-xs flex items-start gap-3">
              <IoFlashOutline className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-emerald-950">Hardware USB / Wireless Scanner Ready</p>
                <p className="text-emerald-700 mt-0.5">
                  Scan any medicine box using your barcode reader, or type the barcode / QR string below and press Enter.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Barcode or QR Code String
              </label>
              <div className="relative">
                <IoQrCodeOutline className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  ref={manualInputRef}
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="e.g. 896400012345 or QR-MED-998"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!manualCode.trim()}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <IoCheckmarkCircle className="w-4 h-4" />
              <span>Submit Scanned Code</span>
            </button>
          </form>
        )}

        {/* Hardware Scanner Hint */}
        <div className="text-center pt-2 border-t border-slate-100">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Hardware USB scanner is actively listening globally across the entire app</span>
          </p>
        </div>
      </div>
    </Modal>
  );
};
