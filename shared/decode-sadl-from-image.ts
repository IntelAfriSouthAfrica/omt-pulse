import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import {
  prepareZXingModule,
  readBarcodes,
  type ReaderOptions,
} from "zxing-wasm/reader";
import { isSadlEncryptedPayload } from "./sa-drivers-licence";

type CropRegion = { x: number; y: number; w: number; h: number };

/**
 * PDF417 on the SA driver's licence sits in the upper portion of the card.
 * We try progressively wider crops so an off-centre photo still decodes.
 */
const CROP_REGIONS: CropRegion[] = [
  { x: 0.02, y: 0.0, w: 0.96, h: 0.4 },
  { x: 0.04, y: 0.02, w: 0.92, h: 0.46 },
  { x: 0.0, y: 0.0, w: 1.0, h: 0.55 },
  { x: 0.0, y: 0.0, w: 1.0, h: 1.0 },
];

type PreprocessMode = "default" | "grayscale" | "high_contrast" | "threshold";

const PREPROCESS_MODES: PreprocessMode[] = [
  "default",
  "grayscale",
  "high_contrast",
  "threshold",
];

const READER_OPTIONS: ReaderOptions = {
  formats: ["PDF417"],
  tryHarder: true,
  tryRotate: true,
  tryInvert: true,
  tryDownscale: true,
  maxNumberOfSymbols: 1,
};

let wasmConfigured = false;

/** Load the WASM binary from the installed package (works in bundled CJS server). */
function ensureZxingWasm(): void {
  if (wasmConfigured) return;
  wasmConfigured = true;

  const candidates = [
    path.join(
      process.cwd(),
      "node_modules/zxing-wasm/dist/reader/zxing_reader.wasm",
    ),
    path.join(
      process.cwd(),
      "node_modules/.pnpm/node_modules/zxing-wasm/dist/reader/zxing_reader.wasm",
    ),
  ];

  let wasmPath: string | undefined;
  for (const candidate of candidates) {
    try {
      if (existsSync(candidate)) {
        wasmPath = candidate;
        break;
      }
    } catch {
      /* try next */
    }
  }

  if (!wasmPath) return;

  const wasmBinary = readFileSync(wasmPath);
  prepareZXingModule({
    overrides: {
      instantiateWasm(imports, successCallback) {
        void WebAssembly.instantiate(wasmBinary, imports).then(({ instance }) =>
          successCallback(instance),
        );
        return {};
      },
    },
  });
}

function sadlBytesFromText(text: string): Uint8Array | null {
  if (text.length !== 720) return null;
  const bytes = new Uint8Array(720);
  for (let i = 0; i < 720; i++) {
    bytes[i] = text.charCodeAt(i) & 0xff;
  }
  return isSadlEncryptedPayload(bytes) ? bytes : null;
}

function sadlBytesFromResultBytes(raw: Uint8Array | undefined): Uint8Array | null {
  if (!raw) return null;
  // zxing-cpp returns the raw codeword bytes; SADL is exactly 720.
  if (raw.length === 720 && isSadlEncryptedPayload(raw)) {
    return new Uint8Array(raw);
  }
  // Some readers append trailing padding — trim to 720 and re-check.
  if (raw.length > 720) {
    const trimmed = raw.subarray(0, 720);
    if (isSadlEncryptedPayload(trimmed)) return new Uint8Array(trimmed);
  }
  return null;
}

async function rgbaForCrop(
  imageBuffer: Buffer,
  crop: CropRegion,
  mode: PreprocessMode,
): Promise<{ data: Uint8ClampedArray; width: number; height: number } | null> {
  const meta = await sharp(imageBuffer).rotate().metadata();
  const fullW = meta.width ?? 0;
  const fullH = meta.height ?? 0;
  if (fullW < 4 || fullH < 4) return null;

  const left = Math.min(fullW - 1, Math.max(0, Math.floor(fullW * crop.x)));
  const top = Math.min(fullH - 1, Math.max(0, Math.floor(fullH * crop.y)));
  const width = Math.max(1, Math.min(fullW - left, Math.floor(fullW * crop.w)));
  const height = Math.max(1, Math.min(fullH - top, Math.floor(fullH * crop.h)));

  let pipeline = sharp(imageBuffer).rotate().extract({ left, top, width, height });

  // Upscale small crops so the dense PDF417 has enough pixels per module.
  if (width < 1400) {
    pipeline = pipeline.resize({
      width: Math.min(2200, Math.round(width * (2200 / Math.max(width, 1)))),
      withoutEnlargement: false,
    });
  }

  if (mode === "grayscale") {
    pipeline = pipeline.grayscale().normalize();
  } else if (mode === "high_contrast") {
    pipeline = pipeline.grayscale().normalize().sharpen().linear(1.4, -45);
  } else if (mode === "threshold") {
    pipeline = pipeline.grayscale().normalize().median(1).threshold(140);
  } else {
    pipeline = pipeline.normalize().sharpen();
  }

  const { data, info } = await pipeline
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  return {
    data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength),
    width: info.width,
    height: info.height,
  };
}

async function decodeCrop(
  imageBuffer: Buffer,
  crop: CropRegion,
): Promise<Uint8Array | null> {
  for (const mode of PREPROCESS_MODES) {
    try {
      const rgba = await rgbaForCrop(imageBuffer, crop, mode);
      if (!rgba) continue;

      const results = await readBarcodes(
        { data: rgba.data, width: rgba.width, height: rgba.height },
        READER_OPTIONS,
      );

      for (const result of results) {
        const fromBytes = sadlBytesFromResultBytes(result.bytes);
        if (fromBytes) return fromBytes;
        const fromText = sadlBytesFromText(result.text ?? "");
        if (fromText) return fromText;
      }
    } catch {
      /* try next mode */
    }
  }
  return null;
}

/** Extract the 720-byte encrypted SADL payload from a JPEG/PNG/WebP image buffer. */
export async function decodeSadlBytesFromImageBuffer(
  imageBuffer: Buffer,
): Promise<Uint8Array | null> {
  ensureZxingWasm();

  for (const crop of CROP_REGIONS) {
    try {
      const bytes = await decodeCrop(imageBuffer, crop);
      if (bytes) return bytes;
    } catch {
      /* try next crop */
    }
  }
  return null;
}
