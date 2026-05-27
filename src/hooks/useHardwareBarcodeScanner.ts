import { useEffect, useRef } from "react";

/**
 * Custom Hook that listens for hardware keyboard wedge barcode scanner inputs.
 * Hardware scanners send keyboard events very rapidly (under 40ms interval)
 * and typically conclude with an "Enter" keystroke.
 */
export function useHardwareBarcodeScanner(
  onScan: (barcode: string) => void,
  enabled: boolean = true
) {
  const bufferRef = useRef<string>("");
  const lastKeyTimeRef = useRef<number>(0);
  const lastScanTimeRef = useRef<number>(0);
  const lastScannedCodeRef = useRef<string>("");
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid intercepting regular key presses inside input or textarea elements
      // unless it's an Enter key (confirming the accumulated barcode buffer)
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      
      const currentTime = Date.now();
      const diff = currentTime - lastKeyTimeRef.current;
      lastKeyTimeRef.current = currentTime;

      // When the "Enter" key is hit
      if (e.key === "Enter") {
        const finalBuffer = bufferRef.current.trim();
        if (finalBuffer.length >= 3) {
          // If rapid keyboard emulation or we're listening globally
          e.preventDefault();

          const now = Date.now();
          // Throttler: check if scanner fired the same code in under 450ms (typical bounce)
          if (finalBuffer === lastScannedCodeRef.current && now - lastScanTimeRef.current < 450) {
            console.info("Duplicate hardware barcode scan filtered out safely:", finalBuffer);
          } else {
            lastScannedCodeRef.current = finalBuffer;
            lastScanTimeRef.current = now;
            onScanRef.current(finalBuffer);
          }
          bufferRef.current = "";
        } else {
          bufferRef.current = "";
        }
        return;
      }

      // Capture single alphanumeric/symbol characters
      if (e.key.length === 1) {
        // Typical hardware scanners emit events with very low delta (< 45ms)
        // If it was a human typing slowly or starting fresh, we reset the buffer
        if (bufferRef.current === "" || diff < 60) {
          bufferRef.current += e.key;
        } else {
          // Reset buffer to this single character if too much time has elapsed since last key
          if (!isInput) {
            bufferRef.current = e.key;
          } else {
            // If the user was typing in an input, don't hijack slow human keystrokes
            bufferRef.current = "";
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled]);
}
