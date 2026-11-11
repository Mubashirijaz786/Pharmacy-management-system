import { useEffect, useRef, useCallback } from "react";

/**
 * useBarcodeScanner Hook
 * Captures hardware barcode / QR code scanner events (keyboard wedge)
 * @param {Function} onScan - Callback when a valid barcode is scanned
 * @param {Object} options - Configuration options
 */
export const useBarcodeScanner = (onScan, options = {}) => {
  const {
    minChars = 3,
    maxIntervalMs = 60, // Scanners type characters with 10-40ms intervals
    enabled = true
  } = options;

  const bufferRef = useRef("");
  const lastKeyTimeRef = useRef(0);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // Handle Enter (Scanner EOT / Suffix)
      if (e.key === "Enter") {
        const scannedCode = bufferRef.current.trim();
        bufferRef.current = "";

        if (scannedCode.length >= minChars) {
          // Prevent form submit if inside a form
          e.preventDefault();
          e.stopPropagation();

          if (onScanRef.current) {
            onScanRef.current(scannedCode);
          }
        }
        return;
      }

      // Ignore special navigation keys (Shift, Control, Alt, F-keys, etc.)
      if (e.key.length > 1) {
        return;
      }

      // If interval between keystrokes is too large, reset buffer (human typing)
      // UNLESS buffer is still empty
      if (bufferRef.current.length > 0 && timeDiff > maxIntervalMs) {
        bufferRef.current = "";
      }

      bufferRef.current += e.key;
    },
    [enabled, minChars, maxIntervalMs]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown, true);
    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [handleKeyDown]);
};
