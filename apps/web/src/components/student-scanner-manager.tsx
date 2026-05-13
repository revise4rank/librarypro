"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { DashboardCard } from "./dashboard-shell";

type ScannerAction = "CHECKED_IN" | "CHECKED_OUT" | "JOIN_REQUEST_CREATED";

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

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
    };
  }
}

function resultText(data: ScannerResponse["data"]) {
  if (data.action === "CHECKED_IN") {
    return `Check-in done at ${new Date(data.checkedInAt ?? new Date().toISOString()).toLocaleString()}.`;
  }

  if (data.action === "CHECKED_OUT") {
    return `Check-out done at ${new Date(data.checkedOutAt ?? new Date().toISOString()).toLocaleString()}.`;
  }

  return `Join request sent to ${data.libraryName ?? "library"}. The library desk will review and activate access.`;
}

export function StudentScannerManager() {
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Camera off");
  const [manualQrPayload, setManualQrPayload] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ScannerResponse["data"] | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } | null>(null);
  const lastScanRef = useRef("");
  const scanLoopRef = useRef<number | null>(null);

  const cameraSupported = useMemo(() => {
    return typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  function stopCamera() {
    if (scanLoopRef.current) {
      window.clearInterval(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
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
      setError(scanError instanceof Error ? scanError.message : "Unable to process this QR.");
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
      const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setScannerStatus("Camera live. Scan the library QR.");

      scanLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          const match = results.find((item) => item.rawValue);
          if (match?.rawValue) {
            await handleDetectedPayload(match.rawValue);
          }
        } catch {
          // Ignore transient detector errors while video frames are changing.
        }
      }, 850);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError instanceof Error ? cameraError.message : "Unable to start camera scanner.");
    }
  }

  useEffect(() => {
    void startCamera();
    return () => stopCamera();
  }, []);

  return (
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <DashboardCard title="Student QR scanner" subtitle="Scan the library QR for join request, check-in, or check-out.">
        <div className="grid gap-4">
          <div className="overflow-hidden rounded-xl border border-[var(--lp-border)] bg-[linear-gradient(180deg,#eef7f3,#dceee9)] p-3 shadow-sm">
            <div className="relative overflow-hidden rounded-lg bg-[#19332d]">
              <video ref={videoRef} className="h-[min(70vh,28rem)] min-h-72 w-full object-cover" playsInline muted />
              {!cameraActive ? (
                <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.88))] px-5 text-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">Library Scanner</p>
                    <p className="mt-3 text-2xl font-black text-white">Scan the QR at reception</p>
                    <p className="mt-2 text-sm leading-6 text-slate-200">
                      The app will join, check in, or check out automatically.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-[15%] rounded-xl border-2 border-white/80 shadow-sm" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={cameraActive}
              className="rounded-xl border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-3 text-sm font-bold text-[var(--lp-accent-strong)] disabled:opacity-60"
            >
              Start scanner
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={!cameraActive}
              className="rounded-xl border border-[var(--lp-border)] bg-white px-5 py-3 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60"
            >
              Stop
            </button>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">{scannerStatus}</div>

          <button
            type="button"
            onClick={() => setShowManualFallback((current) => !current)}
            className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
          >
            {showManualFallback ? "Hide manual fallback" : "Use manual fallback"}
          </button>

          {showManualFallback ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <textarea
                value={manualQrPayload}
                onChange={(event) => setManualQrPayload(event.target.value)}
                placeholder="Paste QR payload here if camera access is unavailable."
                className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void runScan(manualQrPayload)}
                disabled={!manualQrPayload.trim() || submitting}
                className="mt-3 rounded-xl border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60"
              >
                Process QR
              </button>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Scan result" subtitle="One scanner handles library joining and attendance.">
        <div className="grid gap-4">
          {message ? <div className="rounded-xl bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-xl bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600">{error}</div> : null}

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Last action</p>
            <p className="mt-3 text-2xl font-black text-slate-950">{lastResult?.action.replace(/_/g, " ") ?? "Ready"}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {lastResult?.libraryName
                ? lastResult.libraryName
                : "Scan the QR displayed by the library desk or entry gate."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
            If you already have active access, the same QR toggles attendance. If you are new to that library, the scan creates a join request.
          </div>
        </div>
      </DashboardCard>
    </div>
  );
}
