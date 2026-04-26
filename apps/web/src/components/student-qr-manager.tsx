"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { apiFetch } from "../lib/api";
import { enqueueQrAction, flushQueuedQrActions, listQueuedQrActions } from "../lib/offline-queue";
import { DashboardCard } from "./dashboard-shell";

type EntryQrResponse = {
  success: boolean;
  data: {
    assignmentId: string;
    seatId: string | null;
    seatNumber: string | null;
    validFrom: string;
    validUntil: string;
    qrKeyId: string;
    qrPayload: string;
  };
};

type CheckinActionResponse = {
  success: boolean;
  data: {
    id: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    assignmentId: string;
    seatId: string | null;
    qrKeyId: string;
    mode: string;
  };
};

type ScanMode = "checkin" | "checkout";

declare global {
  interface Window {
    BarcodeDetector?: new (options?: { formats?: string[] }) => {
      detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
    };
  }
}

function buildQrImageUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(payload)}`;
}

export function StudentQrManager() {
  const [data, setData] = useState<EntryQrResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<ScanMode | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const [scanMode, setScanMode] = useState<ScanMode>("checkin");
  const [cameraActive, setCameraActive] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("Camera off");
  const [manualQrPayload, setManualQrPayload] = useState("");
  const [showManualFallback, setShowManualFallback] = useState(false);
  const [showPassDetails, setShowPassDetails] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<{ detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>> } | null>(null);
  const lastScanRef = useRef<string>("");
  const scanLoopRef = useRef<number | null>(null);

  const cameraSupported = useMemo(() => {
    return typeof window !== "undefined" && !!window.BarcodeDetector && !!navigator.mediaDevices?.getUserMedia;
  }, []);

  async function loadQueueCount() {
    try {
      const queued = await listQueuedQrActions();
      setQueuedCount(queued.length);
    } catch {
      setQueuedCount(0);
    }
  }

  async function loadQr() {
    setLoading(true);
    try {
      const response = await apiFetch<EntryQrResponse>("/student/entry-qr");
      setData(response.data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load QR pass.");
    } finally {
      setLoading(false);
    }
  }

  async function runAction(action: ScanMode, qrPayload: string) {
    setSubmitting(action);
    setMessage(null);

    try {
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueQrAction({
          action,
          qrPayload,
          createdAt: new Date().toISOString(),
        });
        await loadQueueCount();
        setIsOffline(true);
        setMessage(
          action === "checkin"
            ? "Offline mode: check-in queued and will sync automatically when internet returns."
            : "Offline mode: check-out queued and will sync automatically when internet returns.",
        );
        setError(null);
        return;
      }

      const response = await apiFetch<CheckinActionResponse>(
        action === "checkin" ? "/checkins/scan" : "/checkins/checkout",
        {
          method: "POST",
          body: JSON.stringify({
            qrPayload,
            scannedAtDevice: new Date().toISOString(),
          }),
        },
      );

      setMessage(
        action === "checkin"
          ? `Check-in done at ${new Date(response.data.checkedInAt ?? new Date().toISOString()).toLocaleString()}`
          : `Check-out done at ${new Date(response.data.checkedOutAt ?? new Date().toISOString()).toLocaleString()}`,
      );
      setError(null);
      await loadQr();
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : "Unable to process QR action.");
    } finally {
      setSubmitting(null);
    }
  }

  async function handleDetectedPayload(payload: string) {
    if (!payload || payload === lastScanRef.current || submitting) return;
    lastScanRef.current = payload;
    await runAction(scanMode, payload);
    window.setTimeout(() => {
      if (lastScanRef.current === payload) {
        lastScanRef.current = "";
      }
    }, 1800);
  }

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

  async function startCamera() {
    if (!cameraSupported) {
      setError("Camera QR scanning is not available in this browser. Use the pasted payload fallback instead.");
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
      setScannerStatus("Camera live. Scan the library QR now.");

      scanLoopRef.current = window.setInterval(async () => {
        if (!videoRef.current || !detectorRef.current) return;
        try {
          const results = await detectorRef.current.detect(videoRef.current);
          const match = results.find((item) => item.rawValue);
          if (match?.rawValue) {
            await handleDetectedPayload(match.rawValue);
          }
        } catch {
          // Ignore transient detector errors during camera scan.
        }
      }, 900);
    } catch (cameraError) {
      stopCamera();
      setError(cameraError instanceof Error ? cameraError.message : "Unable to start the camera scanner.");
    }
  }

  useEffect(() => {
    void loadQr();
    setIsOffline(typeof navigator !== "undefined" ? !navigator.onLine : false);
    void loadQueueCount();

    return () => stopCamera();
  }, []);

  useEffect(() => {
    const online = async () => {
      setIsOffline(false);
      try {
        const synced = await flushQueuedQrActions();
        if (synced > 0) {
          setMessage(`${synced} offline QR action(s) synced successfully.`);
          await loadQr();
        }
      } catch (syncError) {
        setError(syncError instanceof Error ? syncError.message : "Unable to sync offline QR actions.");
      } finally {
        await loadQueueCount();
      }
    };

    const offline = async () => {
      setIsOffline(true);
      await loadQueueCount();
    };

    window.addEventListener("online", online);
    window.addEventListener("offline", offline);

    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("offline", offline);
    };
  }, []);

  if (loading && !data) {
    return <p className="text-sm text-slate-500">{error ?? "Loading QR scanner..."}</p>;
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.02fr_0.98fr]">
      <DashboardCard title="Scan library QR" subtitle="Use the student camera to scan the QR displayed by the library.">
        <div className="grid gap-5">
          <div className="flex flex-wrap gap-2">
            {(["checkin", "checkout"] as ScanMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setScanMode(mode)}
                className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.18em] ${
                  scanMode === mode ? "border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] text-[var(--lp-accent-strong)]" : "border border-[var(--lp-border)] bg-white text-[var(--lp-text)]"
                }`}
              >
                {mode === "checkin" ? "Check-in scan" : "Check-out scan"}
              </button>
            ))}
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-[var(--lp-border)] bg-[linear-gradient(180deg,#eef7f3,#dceee9)] p-4 shadow-[0_16px_30px_rgba(15,23,42,0.08)]">
            <div className="relative overflow-hidden rounded-[1.5rem] bg-[#19332d]">
              <video ref={videoRef} className="h-[22rem] w-full object-cover" playsInline muted />
              {!cameraActive ? (
                <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.88))] px-6 text-center">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-200">Library Scanner</p>
                    <p className="mt-3 text-2xl font-black text-white">Scan the library QR from the student camera</p>
                    <p className="mt-3 text-sm leading-7 text-slate-200">
                      Only a student with an active assignment in the scanned library can complete check-in or check-out.
                    </p>
                  </div>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-[16%] rounded-[1.5rem] border-2 border-white/80 shadow-[0_0_0_999px_rgba(15,23,42,0.18)]" />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void startCamera()}
              disabled={cameraActive}
              className="rounded-[1.25rem] border border-[var(--lp-accent-soft)] bg-[var(--lp-accent-soft)] px-5 py-4 text-sm font-bold text-[var(--lp-accent-strong)] disabled:opacity-60"
            >
              Start camera scanner
            </button>
            <button
              type="button"
              onClick={stopCamera}
              disabled={!cameraActive}
              className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-5 py-4 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60"
            >
              Stop camera
            </button>
          </div>

          <div className="rounded-[1.4rem] bg-slate-100 px-4 py-4 text-sm font-semibold text-slate-700">
            {scannerStatus}
          </div>

          <button
            type="button"
            onClick={() => setShowManualFallback((current) => !current)}
            className="rounded-[1.2rem] border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-700"
          >
            {showManualFallback ? "Hide manual fallback" : "Use manual fallback scanner"}
          </button>
          {showManualFallback ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Fallback scanner</p>
              <textarea
                value={manualQrPayload}
                onChange={(event) => setManualQrPayload(event.target.value)}
                placeholder="Paste the scanned QR payload here if camera access is unavailable."
                className="mt-3 min-h-28 w-full rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void runAction(scanMode, manualQrPayload.trim())}
                disabled={!manualQrPayload.trim() || submitting !== null}
                className="mt-3 rounded-[1rem] border border-[var(--lp-border)] bg-white px-4 py-3 text-sm font-bold text-[var(--lp-text)] disabled:opacity-60"
              >
                Run {scanMode === "checkin" ? "check-in" : "check-out"} from pasted QR
              </button>
            </div>
          ) : null}
        </div>
      </DashboardCard>

      <DashboardCard title="Library access status" subtitle="Current active assignment and scan state">
        <div className="grid gap-4">
          <div className={`rounded-[1.4rem] px-4 py-4 text-sm font-semibold ${isOffline ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
            {isOffline ? `Offline mode active. Queued QR actions: ${queuedCount}` : `Online and ready. Queued QR actions: ${queuedCount}`}
          </div>
          {message ? <div className="rounded-[1.4rem] bg-emerald-50 px-4 py-4 text-sm font-semibold text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-[1.4rem] bg-rose-50 px-4 py-4 text-sm font-semibold text-rose-600">{error}</div> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Current seat</p>
              <p className="mt-3 text-2xl font-black text-slate-950">{data?.seatNumber ?? "-"}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowPassDetails((current) => !current)}
              className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-left"
            >
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Pass details</p>
              <p className="mt-3 text-base font-black text-slate-950">{showPassDetails ? "Hide technical pass info" : "Show technical pass info"}</p>
            </button>
          </div>

          {showPassDetails ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">QR key</p>
                <p className="mt-3 text-sm font-black text-slate-950">{data?.qrKeyId ?? "-"}</p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Valid from</p>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {data?.validFrom ? new Date(data.validFrom).toLocaleString() : "-"}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 md:col-span-2">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Valid until</p>
                <p className="mt-3 text-sm font-semibold text-slate-800">
                  {data?.validUntil ? new Date(data.validUntil).toLocaleString() : "-"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-700">
            Students no longer need to show their own QR. The library displays its QR and the student app scans it directly for check-in and check-out.
          </div>

          {data?.qrPayload ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Reference preview</p>
              <div className="mt-3 flex items-center gap-4">
                <img
                  src={buildQrImageUrl(data.qrPayload)}
                  alt="Reference QR preview"
                  className="h-24 w-24 rounded-[1rem] border border-slate-200 bg-white"
                />
                <p className="text-xs leading-6 text-slate-500">
                  This is only a reference preview. In the real flow, the student scans the QR displayed by the library.
                </p>
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void loadQr()}
            className="rounded-[1.25rem] border border-[var(--lp-border)] bg-white px-4 py-4 text-sm font-bold text-[var(--lp-text)]"
          >
            Refresh access status
          </button>
        </div>
      </DashboardCard>
    </div>
  );
}
