import {
  parseSaLicenceFrontOcr,
  type ParsedLicenceFrontOcr,
} from "@shared/parse-sa-licence-front";
import type { ParsedSaId } from "@/lib/parse-sa-barcodes";

export type LicenceFrontOcrResult =
  | { ok: true; parsed: ParsedSaId }
  | { ok: false; message: string };

function toParsedSaId(ocr: ParsedLicenceFrontOcr): ParsedSaId | null {
  if (!ocr.personIdNumber && !ocr.personFullName) return null;
  return {
    documentType: "drivers_licence",
    personIdNumber: ocr.personIdNumber,
    personFullName: ocr.personFullName,
    driversLicenceNumber: ocr.driversLicenceNumber,
    hint: ocr.hint,
  };
}

/** Run OCR on a photo of the front of a SA driver's licence. */
export async function readLicenceFrontFromPhoto(file: File): Promise<LicenceFrontOcrResult> {
  try {
    const { createWorker } = await import("tesseract.js");
    const worker = await createWorker("eng", 1, {
      logger: () => {
        /* quiet */
      },
    });

    try {
      await worker.setParameters({
        tessedit_pageseg_mode: "6" as unknown as string,
      });
      const { data } = await worker.recognize(file);
      const ocr = parseSaLicenceFrontOcr(data.text ?? "");
      const parsed = toParsedSaId(ocr);
      if (parsed?.personIdNumber || parsed?.personFullName) {
        return { ok: true, parsed };
      }
      return {
        ok: false,
        message:
          ocr.hint ??
          "Could not read the front of the licence. Try brighter light, less glare on the plastic, and fill the frame with the text side.",
      };
    } finally {
      await worker.terminate();
    }
  } catch {
    return {
      ok: false,
      message: "Could not read text from this photo. Try again or type details on the form.",
    };
  }
}
