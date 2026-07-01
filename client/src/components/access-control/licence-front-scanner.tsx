import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Camera, ImageIcon, ScanLine, X } from "lucide-react";
import type { AccessIdentityScanResult, ParsedSaId } from "@/lib/parse-sa-barcodes";
import { readLicenceFrontFromPhoto } from "@/lib/licence-front-ocr";
import { decodeDriversLicenceFromImageViaApi } from "@/lib/decode-drivers-licence-api";
import { APP_CACHE_VERSION } from "@shared/cache-version";

type LicenceFrontScannerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (result: AccessIdentityScanResult) => void;
};

const FILE_INPUT_CLASS =
  "absolute left-0 top-0 h-px w-px overflow-hidden opacity-0 [clip:rect(0,0,0,0)]";

export function LicenceFrontScanner({
  open,
  onOpenChange,
  onScan,
}: LicenceFrontScannerProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const backBarcodeInputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showBackBarcode, setShowBackBarcode] = useState(false);

  const reset = useCallback(() => {
    setBusy(false);
    setStatus(null);
    setError(null);
    setShowBackBarcode(false);
  }, []);

  const settle = useCallback(
    (parsed: ParsedSaId) => {
      onScan({ kind: "parsed", parsed });
      onOpenChange(false);
      reset();
    },
    [onOpenChange, onScan, reset],
  );

  const readFrontPhoto = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setStatus("Reading text from photo…");

      const result = await readLicenceFrontFromPhoto(file);
      if (result.ok) {
        setStatus("Details captured");
        settle(result.parsed);
        return;
      }

      setError(result.message);
      setStatus(null);
      setBusy(false);
    },
    [settle],
  );

  const readBackBarcodePhoto = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      setStatus("Reading barcode on back of card…");

      try {
        const parsed = await decodeDriversLicenceFromImageViaApi(file);
        if (parsed?.personIdNumber || parsed?.personFullName) {
          setStatus("Licence barcode read");
          settle(parsed);
          return;
        }
      } catch {
        /* fall through */
      }

      setError(
        "Could not read the back barcode. Photograph the front of the licence instead, or type details on the form.",
      );
      setStatus(null);
      setBusy(false);
    },
    [settle],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) reset();
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden" hideDefaultClose>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={FILE_INPUT_CLASS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFrontPhoto(file);
            e.target.value = "";
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className={FILE_INPUT_CLASS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readFrontPhoto(file);
            e.target.value = "";
          }}
        />
        <input
          ref={backBarcodeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className={FILE_INPUT_CLASS}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void readBackBarcodePhoto(file);
            e.target.value = "";
          }}
        />

        <DialogHeader className="p-4 pb-2 pr-12">
          <DialogTitle className="flex items-center gap-2 text-base">
            <ScanLine className="h-5 w-5" />
            Photograph driver&apos;s licence
          </DialogTitle>
        </DialogHeader>

        <div className="mx-4 mb-2 flex aspect-[4/3] items-center justify-center rounded-lg border-2 border-dashed border-primary/40 bg-muted/30 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Photograph the <strong>front</strong> of the card — name and ID number visible through the plastic sleeve.
          </p>
        </div>

        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Good light, hold steady, fill the frame ({APP_CACHE_VERSION}). Works with plastic covers.
          </p>

          {status && !error && (
            <p className="text-xs text-primary font-medium">{status}</p>
          )}
          {error && (
            <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="default"
              className="flex-1"
              disabled={busy}
              onClick={() => cameraInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-1" />
              {busy ? "Reading…" : "Take photo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy}
              onClick={() => galleryInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              Gallery
            </Button>
          </div>

          {!showBackBarcode ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-xs"
              disabled={busy}
              onClick={() => setShowBackBarcode(true)}
            >
              Try back barcode instead
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="w-full text-xs"
              disabled={busy}
              onClick={() => backBarcodeInputRef.current?.click()}
            >
              <Camera className="h-4 w-4 mr-1" />
              Photo of back barcode
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Close — type on form
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handleOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
