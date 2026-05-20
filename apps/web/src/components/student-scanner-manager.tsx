"use client";

import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser";
import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";

type ScannerAction = "CHECKED_IN" | "CHECKED_OUT" | "JOIN_REQUEST_CREATED" | "JOIN_REQUEST_PENDING";

type ScannerResponse = {
  success: boolean;
  data: {
    action: ScannerAction;
    id: string;
    libraryId?: string;
    libraryName?: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    assignmentId?: string;
    seatId?: string | null;
    qrKeyId?: string;
  };
};

function resultText(data: ScannerResponse["data"]) {
  if (data.action === "CHECKED_IN") {
    return `Check-in done at ${new Date(data.checkedInAt ?? new Date().toISOString()).toLocaleString()}.`;
  }

  if (data.action === "CHECKED_OUT") {
    return `Check-out done at ${new Date(data.checkedOutAt ?? new Date().toISOString()).toLocaleString()}.`;
  }

  if (data.action === "JOIN_REQUEST_PENDING") {
    return `Join request is already pending for ${data.libraryName ?? "this library"}. The library desk will review it.`;
  }

  return `Join request sent to ${data.libraryName ?? "library"}. The library desk will review and activate access.`;
}

function scannerErrorText(error: unknown) {
  const message = error instanceof Error ? error.message : "Unable to process this QR.";
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("column") || lowerMessage.includes("subdomain") || lowerMessage.includes("relation") || lowerMessage.includes("syntax")) {
    return "Scanner setup needs a quick server refresh. Please try again after a moment.";
  }

  if (lowerMessage.includes("invalid") || lowerMessage.includes("qr")) {
    return "This QR is not a valid BookLib library QR. Please scan the QR shown by the library desk.";
  }

  if (lowerMessage.includes("camera") || lowerMessage.includes("permission") || lowerMessage.includes("notallowed")) {
    return "Camera permission is blocked. Allow camera access or use manual fallback.";
  }

  return message;
}

export function StudentScannerManager({ compact = false }: { compact?: boolean }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Camera off");
  const [manualQrPayload, setManualQrPayload] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScannerResponse["data"] | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const lastScanRef = useRef("");

  const cameraSupported = useMemo(() => {
    return typeof window !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  function stopCamera() {
    controlsRef.current?.stop();
    controlsRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setScannerStatus("Camera off");
  }

  async function runScan(qrPayload: string) {
    const normalized = qrPayload.trim();
    if (!normalized || submitting) return;

    setSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const response = await apiFetch<ScannerResponse>("/student/scanner/scan", {
        method: "POST",
        body: JSON.stringify({
          qrPayload: normalized,
          scannedAtDevice: new Date().toISOString(),
        }),
      });
      setLastResult(response.data);
      setMessage(resultText(response.data));
      setManualQrPayload("");
    } catch (scanError) {
      setError(scannerErrorText(scanError));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDetectedPayload(payload: string) {
    if (!payload || payload === lastScanRef.current || submitting) return;
    lastScanRef.current = payload;
    await runScan(payload);
    window.setTimeout(() => {
      if (lastScanRef.current === payload) {
        lastScanRef.current = "";
      }
    }, 2200);
  }

  async function startCamera() {
    if (!cameraSupported) {
      setError("Camera QR scanning is not available in this browser. Use manual fallback instead.");
      setShowManualFallback(true);
      return;
    }

    setError(null);
    setMessage(null);

    try {
      if (!videoRef.current) return;

      setCameraActive(true);
      setScannerStatus("Camera live. Scan the library QR.");
      const reader = new BrowserQRCodeReader();
      controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (result) => {
        const payload = result?.getText();
        if (payload) {
          void handleDetectedPayload(payload);
        }
      });
    } catch (cameraError) {
      stopCamera();
      setError(scannerErrorText(cameraError));
    }
  }

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, []);

  const scanStateLabel = submitting ? "Processing QR..." : cameraActive ? "Camera live" : "Camera off";
  const scanStateTone = error
    ? "bg-rose-50 text-rose-700"
    : message
      ? "bg-emerald-50 text-emerald-700"
      : "bg-slate-100 text-slate-700";

  return (
    <section className={compact ? "grid gap-3" : "mx-auto grid max-w-3xl gap-4"}>
      <div className="overflow-hidden rounded-2xl border border-[var(--lp-border)] bg-white p-3 shadow-sm sm:p-4">
        <div className="relative overflow-hidden rounded-xl bg-[#111827]">
          <video ref={videoRef} className={compact ? "h-[min(58vh,32rem)] min-h-[20rem] w-full object-cover" : "h-[min(68vh,34rem)] min-h-[22rem] w-full object-cover"} playsInline muted />
          {!cameraActive ? (
            <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(180deg,rgba(15,23,42,0.7),rgba(15,23,42,0.92))] px-5 text-center">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Library Scanner</p>
                <p className="mt-3 text-2xl font-black text-white">Camera ready</p>
                <p className="mt-2 text-sm leading-6 text-slate-200">Allow camera permission and point at the library QR.</p>
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-[14%] rounded-2xl border-2 border-white shadow-[0_0_0_999px_rgba(15,23,42,0.22)]" />
          <div className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-white backdrop-blur">
            {scanStateLabel}
          </div>
        </div>

        <div className="mt-3 grid gap-3">
          <div className={`rounded-xl px-4 py-3 text-sm font-bold ${scanStateTone}`}>
            {error ?? message ?? scannerStatus}
          </div>

          {lastResult ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Last action</p>
              <p className="mt-1 font-black text-slate-950">{lastResult.action.replace(/_/g, " ")}</p>
            </div>
          ) : null}

          <div className="grid grid-cols-[1fr_1fr] gap-2">
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={cameraActive}
              className="rounded-xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-4 py-3 text-sm font-black text-[var(--lp-accent-strong)] disabled:opacity-55"
            >
              Start
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={!cameraActive}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-black text-[var(--lp-text)] disabled:opacity-55"
            >
              Stop
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white">
            <button
              type="button"
              onClick={() => setShowManualFallback((current) => !current)}
              className="w-full px-4 py-3 text-left text-sm font-black text-slate-700"
            >
              {showManualFallback ? "Hide manual fallback" : "Use manual fallback"}
            </button>

            {showManualFallback ? (
              <div className="border-t border-slate-200 p-3">
                <textarea
                  value={manualQrPayload}
                  onChange={(event) => setManualQrPayload(event.target.value)}
                  placeholder="Paste QR payload here if camera access is unavailable."
                  className="min-h-24 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
                />
              <button
                type="button"
                onClick={() => void runScan(manualQrPayload)}
                disabled={!manualQrPayload.trim() || submitting}
                className="mt-3 w-full rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-black text-[var(--lp-text)] disabled:opacity-60"
              >
                Process QR
              </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
