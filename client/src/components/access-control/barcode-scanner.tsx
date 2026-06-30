import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, ImageIcon, ScanLine, Settings, X } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import {
  isSmartIdPipePayload,
  pickBestBarcodePayload,
} from "@/lib/pick-best-barcode";
import { looksLikeSadlEncryptedString } from "@shared/sa-drivers-licence";
import { decodeDriversLicenceFromImageViaApi, decodeDriversLicenceViaApi } from "@/lib/decode-drivers-licence-api";
import type { AccessIdentityScanResult } from "@/lib/parse-sa-barcodes";
import {
  captureVideoFrameAsJpeg,
  createHtml5FileScanner,
  decodeBarcodesFromFile,
} from "@/lib/decode-barcode-image";
import { openOmtAppDetailsSettings } from "@/lib/omt-app-settings";
import {
  NativeSettings,
  AndroidSettings,
  IOSSettings,
} from "capacitor-native-settings";
import type { Html5Qrcode } from "html5-qrcode";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string; format?: string }>>;
};

type BarcodeDetectorCtor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorCtor;
  }
}

type BarcodeScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  scanKind?: "id" | "disc";
  /** smart_id = live scan; drivers_licence = photo-only (binary PDF417 crashes live decode on Android). */
  identityDocType?: "smart_id" | "drivers_licence";
  onScan: (result: string | AccessIdentityScanResult) => void;
};

type ScanSample = { rawValue: string; format?: string; at: number };

const HIDDEN_SCANNER_ID = "ac-barcode-file-scanner";

const SMART_ID_DETECTOR_FORMATS = ["pdf417", "qr_code", "code_128", "code_39"];
const DISC_DETECTOR_FORMATS = ["pdf417", "code_128", "code_39", "qr_code"];

const FILE_INPUT_CLASS =
  "absolute left-0 top-0 h-px w-px overflow-hidden opacity-0 [clip:rect(0,0,0,0)]";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

/** Binary driver's-licence payloads crash Android WebView when passed through live BarcodeDetector. */
function isSafeLiveTextBarcode(raw: string): boolean {
  if (raw.includes("|")) return true;
  if (raw.length <= 32) return true;
  return false;
}

async function openCameraPermissionSettings(): Promise<void> {
  if (await openOmtAppDetailsSettings()) return;
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    await NativeSettings.openAndroid({ option: AndroidSettings.ApplicationDetails });
    return;
  }
  if (platform === "ios") {
    await NativeSettings.openIOS({ option: IOSSettings.App });
  }
}

export function BarcodeScanner({
  open,
  onOpenChange,
  title,
  scanKind = "id",
  identityDocType = "smart_id",
  onScan,
}: BarcodeScannerProps) {
  const isLicencePhotoMode = scanKind === "id" && identityDocType === "drivers_licence";

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);
  const fileScannerRef = useRef<Html5Qrcode | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const samplesRef = useRef<ScanSample[]>([]);
  const startedAtRef = useRef(0);
  const settledRef = useRef(false);
  const pickerActiveRef = useRef(false);
  const decodeBusyRef = useRef(false);
  const openRef = useRef(open);
  const startLiveCameraRef = useRef<(() => Promise<void>) | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [scanning, setScanning] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [photoScanning, setPhotoScanning] = useState(false);

  openRef.current = open;

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const ensureFileScanner = useCallback(() => {
    if (fileScannerRef.current) return fileScannerRef.current;
    const el = document.getElementById(HIDDEN_SCANNER_ID);
    if (!el) return null;
    fileScannerRef.current = createHtml5FileScanner(HIDDEN_SCANNER_ID);
    return fileScannerRef.current;
  }, []);

  const finishDriversLicenceFromImage = useCallback(
    async (image: Blob) => {
      if (decodeBusyRef.current || settledRef.current) return;
      decodeBusyRef.current = true;
      settledRef.current = true;
      stopCamera();
      setStatus("Reading driver's licence…");
      setError(null);
      try {
        const parsed = await decodeDriversLicenceFromImageViaApi(image);
        if (!parsed?.personIdNumber && !parsed?.personFullName) {
          settledRef.current = false;
          setStatus(null);
          setError("Could not read driver's licence — centre the PDF417 in the frame and capture again.");
          if (isLicencePhotoMode) void startLiveCameraRef.current?.();
          return;
        }
        onScan({ kind: "parsed", parsed });
        onOpenChange(false);
      } catch {
        settledRef.current = false;
        setStatus(null);
        setError("Could not read driver's licence — check your connection and try again.");
        if (isLicencePhotoMode) void startLiveCameraRef.current?.();
      } finally {
        decodeBusyRef.current = false;
      }
    },
    [isLicencePhotoMode, onOpenChange, onScan, stopCamera],
  );

  const finishDriversLicence = useCallback(
    async (rawLatin1: string) => {
      if (decodeBusyRef.current || settledRef.current) return;
      decodeBusyRef.current = true;
      settledRef.current = true;
      stopCamera();
      setStatus("Reading driver's licence…");
      setError(null);
      try {
        const parsed = await decodeDriversLicenceViaApi(rawLatin1);
        if (!parsed?.personIdNumber && !parsed?.personFullName) {
          settledRef.current = false;
          setStatus(null);
          setError("Could not read driver's licence — try a sharper photo of the PDF417.");
          if (!isLicencePhotoMode) void startLiveCameraRef.current?.();
          return;
        }
        onScan({ kind: "parsed", parsed });
        onOpenChange(false);
      } catch {
        settledRef.current = false;
        setStatus(null);
        setError("Could not read driver's licence — check your connection and try again.");
        if (!isLicencePhotoMode) void startLiveCameraRef.current?.();
      } finally {
        decodeBusyRef.current = false;
      }
    },
    [isLicencePhotoMode, onOpenChange, onScan, stopCamera],
  );

  const tryAcceptSmartIdScan = useCallback(() => {
    if (settledRef.current || decodeBusyRef.current || isLicencePhotoMode) return;

    const best = pickBestBarcodePayload(
      samplesRef.current.map((s) => ({ rawValue: s.rawValue, format: s.format })),
    );
    if (!best) return;

    const elapsed = Date.now() - startedAtRef.current;
    const smartId = isSmartIdPipePayload(best);

    if (smartId) {
      settledRef.current = true;
      stopCamera();
      onScan({ kind: "raw", value: best });
      onOpenChange(false);
      return;
    }

    const digitsOnly = best.replace(/\D/g, "");
    if (elapsed >= 4_000 && digitsOnly.length === 13 && best.length <= 14) {
      settledRef.current = true;
      stopCamera();
      onScan({ kind: "raw", value: best });
      onOpenChange(false);
      return;
    }
    if (elapsed >= 2_000 && digitsOnly.length === 13) {
      setStatus("Only the small barcode was read — centre the large square PDF417 on a Smart ID.");
    }
  }, [isLicencePhotoMode, onOpenChange, onScan, stopCamera]);

  const tryAcceptDiscScan = useCallback(() => {
    if (settledRef.current) return;
    const best = pickBestBarcodePayload(
      samplesRef.current.map((s) => ({ rawValue: s.rawValue, format: s.format })),
    );
    if (!best) return;
    settledRef.current = true;
    stopCamera();
    onScan(best);
    onOpenChange(false);
  }, [onOpenChange, onScan, stopCamera]);

  const recordSmartIdHits = useCallback(
    (hits: Array<{ rawValue: string; format?: string }>) => {
      if (settledRef.current || isLicencePhotoMode) return;
      const now = Date.now();
      for (const hit of hits) {
        const raw = hit.rawValue?.trim();
        if (!raw || !isSafeLiveTextBarcode(raw)) continue;
        samplesRef.current.push({ rawValue: raw, format: hit.format, at: now });
      }
      samplesRef.current = samplesRef.current
        .filter((s) => now - s.at < 4_000)
        .slice(-12);
      tryAcceptSmartIdScan();
    },
    [isLicencePhotoMode, tryAcceptSmartIdScan],
  );

  const recordDiscHits = useCallback(
    (hits: Array<{ rawValue: string; format?: string }>) => {
      if (settledRef.current) return;
      const now = Date.now();
      for (const hit of hits) {
        const raw = hit.rawValue?.trim();
        if (!raw) continue;
        samplesRef.current.push({ rawValue: raw, format: hit.format, at: now });
      }
      samplesRef.current = samplesRef.current
        .filter((s) => now - s.at < 4_000)
        .slice(-12);
      tryAcceptDiscScan();
    },
    [tryAcceptDiscScan],
  );

  const decodeLicenceFromImage = useCallback(
    async (image: Blob) => {
      await finishDriversLicenceFromImage(image);
    },
    [finishDriversLicenceFromImage],
  );

  const captureLicenceFromPreview = useCallback(async () => {
    if (photoScanning || settledRef.current) return;
    const video = videoRef.current;
    if (!video || video.readyState < 2) {
      setError("Camera not ready — wait a moment and try again.");
      return;
    }
    setPhotoScanning(true);
    setError(null);
    setStatus("Capturing licence barcode…");
    try {
      const frame = await captureVideoFrameAsJpeg(video);
      if (!frame) {
        setError("Could not capture image — try Gallery instead.");
        setStatus(null);
        return;
      }
      await decodeLicenceFromImage(frame);
    } finally {
      if (!settledRef.current) setPhotoScanning(false);
    }
  }, [decodeLicenceFromImage, photoScanning]);

  const pauseForPicker = useCallback(() => {
    pickerActiveRef.current = true;
    stopCamera();
  }, [stopCamera]);

  const scheduleResumeIfPickerCancelled = useCallback(() => {
    if (isLicencePhotoMode) return;
    window.setTimeout(() => {
      if (!pickerActiveRef.current || settledRef.current || !openRef.current) return;
      pickerActiveRef.current = false;
      void startLiveCameraRef.current?.();
    }, 12_000);
  }, [isLicencePhotoMode]);

  const openCameraPicker = useCallback(() => {
    pauseForPicker();
    cameraInputRef.current?.click();
    scheduleResumeIfPickerCancelled();
  }, [pauseForPicker, scheduleResumeIfPickerCancelled]);

  const openGalleryPicker = useCallback(() => {
    pauseForPicker();
    galleryInputRef.current?.click();
    scheduleResumeIfPickerCancelled();
  }, [pauseForPicker, scheduleResumeIfPickerCancelled]);

  const handlePhotoSelected = useCallback(
    async (file: File | undefined) => {
      pickerActiveRef.current = false;
      if (!file || settledRef.current) {
        if (!isLicencePhotoMode && openRef.current && !settledRef.current) {
          void startLiveCameraRef.current?.();
        }
        return;
      }
      setPhotoScanning(true);
      setError(null);
      setStatus(
        isLicencePhotoMode
          ? "Reading driver's licence from photo…"
          : "Reading barcode from photo…",
      );
      try {
        const ok = isLicencePhotoMode
          ? await (async () => {
              const before = settledRef.current;
              await decodeLicenceFromImage(file);
              return settledRef.current && !before;
            })()
          : await (async () => {
              const scanner = ensureFileScanner();
              const hits = await decodeBarcodesFromFile(file, scanner);
              for (const hit of hits) {
                const raw = hit.rawValue?.trim();
                if (!raw) continue;
                if (looksLikeSadlEncryptedString(raw)) {
                  await finishDriversLicence(raw);
                  return true;
                }
              }
              if (scanKind === "id") {
                recordSmartIdHits(hits);
                return hits.length > 0;
              }
              recordDiscHits(hits);
              return hits.length > 0;
            })();
        if (!ok && !settledRef.current) {
          setError(
            isLicencePhotoMode
              ? "No driver's licence barcode found — fill the frame with the large PDF417 and keep it sharp."
              : "No barcode found — fill the frame with the PDF417 and keep the card sharp.",
          );
          setStatus(null);
          if (!isLicencePhotoMode) void startLiveCameraRef.current?.();
        }
      } finally {
        setPhotoScanning(false);
      }
    },
    [
      decodeLicenceFromImage,
      ensureFileScanner,
      finishDriversLicence,
      isLicencePhotoMode,
      recordDiscHits,
      recordSmartIdHits,
      scanKind,
    ],
  );

  useEffect(() => {
    if (!open) {
      stopCamera();
      setError(null);
      setManual("");
      setHint(null);
      setStatus(null);
      setPermissionBlocked(false);
      setPhotoScanning(false);
      pickerActiveRef.current = false;
      samplesRef.current = [];
      settledRef.current = false;
      return;
    }

    let cancelled = false;
    settledRef.current = false;
    samplesRef.current = [];
    startedAtRef.current = Date.now();

    if (isLicencePhotoMode) {
      setHint(
        "Line up the large PDF417 on the back of the driver's licence inside the green frame, then tap Capture.",
      );
      setStatus("Hold steady, then tap Capture when the PDF417 fills the frame.");
    } else if (scanKind === "id") {
      setHint(
        "For Smart ID: fill the green frame with the large square PDF417 on the back. For driver's licence, use Scan licence instead.",
      );
      setStatus("Hold the Smart ID steady for 2–3 seconds.");
    } else {
      setHint("Centre the licence disc barcode in the frame.");
      setStatus("Hold steady for 2–3 seconds.");
    }

    const detectorFormats = scanKind === "disc" ? DISC_DETECTOR_FORMATS : SMART_ID_DETECTOR_FORMATS;
    const detector =
      !isLicencePhotoMode && typeof window.BarcodeDetector !== "undefined"
        ? new window.BarcodeDetector({ formats: detectorFormats })
        : null;

    const startLiveCamera = async () => {
      await delay(300);
      if (cancelled || pickerActiveRef.current) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: isLicencePhotoMode ? 1280 : 1920 },
            height: { ideal: isLicencePhotoMode ? 720 : 1080 },
          },
          audio: false,
        });
        if (cancelled || pickerActiveRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (!video) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();
        if (!cancelled) setScanning(true);

        if (isLicencePhotoMode || !detector) {
          return;
        }

        const tick = () => {
          if (cancelled || settledRef.current || pickerActiveRef.current) return;
          const activeVideo = videoRef.current;
          if (!activeVideo || activeVideo.readyState < 2) {
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          void detector.detect(activeVideo).then((codes) => {
            if (scanKind === "disc") recordDiscHits(codes);
            else recordSmartIdHits(codes);
          }).catch(() => { /* frame skip */ });

          if (!cancelled && !settledRef.current) {
            rafRef.current = requestAnimationFrame(tick);
          }
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (name === "NotAllowedError" || name === "PermissionDeniedError") {
          setPermissionBlocked(true);
          setError("Camera blocked — allow Camera in app settings, or use Take photo / Gallery.");
        } else {
          setError("Camera unavailable — use Take photo or Gallery below.");
        }
        setStatus(null);
      }
    };

    startLiveCameraRef.current = startLiveCamera;
    void startLiveCamera();

    const poll = window.setInterval(() => {
      if (cancelled || settledRef.current || isLicencePhotoMode) return;
      if (scanKind === "disc") tryAcceptDiscScan();
      else tryAcceptSmartIdScan();
    }, 400);

    return () => {
      cancelled = true;
      startLiveCameraRef.current = null;
      window.clearInterval(poll);
      stopCamera();
    };
  }, [
    isLicencePhotoMode,
    open,
    recordDiscHits,
    recordSmartIdHits,
    scanKind,
    stopCamera,
    tryAcceptDiscScan,
    tryAcceptSmartIdScan,
  ]);

  useEffect(() => {
    return () => {
      const scanner = fileScannerRef.current;
      fileScannerRef.current = null;
      if (scanner) {
        try {
          scanner.clear();
        } catch { /* ignore */ }
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" hideDefaultClose>
        <div id={HIDDEN_SCANNER_ID} aria-hidden className="fixed -left-[9999px] h-1 w-1" />
        <input
          ref={cameraInputRef}
          id="ac-scan-camera-input"
          type="file"
          accept="image/*"
          capture="environment"
          className={FILE_INPUT_CLASS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            void handlePhotoSelected(file);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          id="ac-scan-gallery-input"
          type="file"
          accept="image/*"
          className={FILE_INPUT_CLASS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            void handlePhotoSelected(file);
            e.target.value = "";
          }}
        />

        <DialogHeader className="p-4 pb-2 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5" />
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] bg-black overflow-hidden">
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            playsInline
            muted
            autoPlay
          />
          {!scanning && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white text-sm px-6 text-center">
              Starting camera…
            </div>
          )}
          <div className="pointer-events-none absolute inset-6 border-2 border-primary rounded-lg" />
        </div>
        <div className="p-4 space-y-3">
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          {status && !error && (
            <p className="text-xs text-primary font-medium">{status}</p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={isLicencePhotoMode ? "default" : "outline"}
              className="flex-1"
              disabled={photoScanning}
              onClick={() => {
                if (isLicencePhotoMode) void captureLicenceFromPreview();
                else openCameraPicker();
              }}
            >
              <Camera className="h-4 w-4 mr-1" />
              {photoScanning ? "Reading…" : isLicencePhotoMode ? "Capture" : "Take photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={photoScanning}
              onClick={openGalleryPicker}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Gallery
            </Button>
            {permissionBlocked && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => void openCameraPermissionSettings()}
                title="Open camera settings"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
          </div>
          {!isLicencePhotoMode && (
            <input
              type="text"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={scanKind === "id" ? "Or paste Smart ID barcode text" : "Type licence disc code"}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              autoComplete="off"
            />
          )}
          <div className="flex gap-2">
            {!isLicencePhotoMode && (
              <Button
                type="button"
                className="flex-1"
                disabled={!manual.trim()}
                onClick={() => {
                  const value = manual.trim();
                  onScan(scanKind === "id" ? { kind: "raw", value } : value);
                  onOpenChange(false);
                }}
              >
                Use code
              </Button>
            )}
            <Button
              type="button"
              variant={isLicencePhotoMode ? "default" : "outline"}
              className={isLicencePhotoMode ? "flex-1" : ""}
              size={isLicencePhotoMode ? "default" : "icon"}
              onClick={() => onOpenChange(false)}
            >
              {isLicencePhotoMode ? "Cancel" : <X className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
