/**
 * server/archon-2fa.ts
 * TOTP, encryption, and backup-code helpers for the Archon 2FA feature.
 * No database access here — purely stateless utilities.
 */
import crypto from "crypto";
import { generateSecret, generateURI, verifySync } from "otplib";
import QRCode from "qrcode";
import bcrypt from "bcrypt";

const ALGORITHM = "aes-256-gcm" as const;
const IV_BYTES = 12;
const BCRYPT_ROUNDS = 10;

// ── Encryption ──────────────────────────────────────────────────────────────

function getEncryptionKey(): Buffer {
  const hex = process.env.ARCHON_TOTP_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      "ARCHON_TOTP_KEY must be a 64-character hex string (32 bytes). " +
      "Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\""
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * AES-256-GCM encrypt.
 * Returns a single string: "ivHex:authTagHex:ciphertextHex"
 */
export function encryptTotpSecret(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("hex"), tag.toString("hex"), enc.toString("hex")].join(":");
}

/**
 * Decrypt a value produced by encryptTotpSecret.
 * Throws if the key is wrong or the ciphertext is tampered.
 */
export function decryptTotpSecret(stored: string): string {
  const key = getEncryptionKey();
  const parts = stored.split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted TOTP secret format");
  const [ivHex, tagHex, ctHex] = parts;
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  return Buffer.concat([
    decipher.update(Buffer.from(ctHex, "hex")),
    decipher.final(),
  ]).toString("utf8");
}

// ── TOTP ────────────────────────────────────────────────────────────────────

/** Generate a fresh base32 TOTP secret (20 bytes / 160-bit). */
export function generateTotpSecret(): string {
  return generateSecret({ length: 20 });
}

/** Build the otpauth:// URI that authenticator apps scan. */
export function getTotpUri(secret: string): string {
  return generateURI({
    issuer: "OMT Pulse",
    label: "IntelAfri Archon",
    secret,
  });
}

/** Render the otpauth URI as a PNG data URL for display in an <img>. */
export async function getTotpQrDataUrl(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" },
  });
}

/**
 * Verify a 6-digit TOTP token against a plaintext secret.
 * Accepts ±1 time step (30 s window each side) to tolerate minor clock skew.
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  try {
    const result = verifySync({
      secret,
      token: token.replace(/\s/g, ""),
      epochTolerance: 30, // ±30 s — tolerates minor clock skew
    });
    return result.valid;
  } catch {
    return false;
  }
}

// ── Backup codes ─────────────────────────────────────────────────────────────

/**
 * Generate n single-use backup codes.
 * Display format: "XXXXX-XXXXX" (10 hex chars with a separating dash).
 */
export function generateBackupCodes(n = 8): string[] {
  return Array.from({ length: n }, () => {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase();
    return `${raw.slice(0, 5)}-${raw.slice(5)}`;
  });
}

/**
 * Hash all backup codes with bcrypt.
 * We strip the dash before hashing so verification is dash-insensitive.
 */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(
    codes.map((c) => bcrypt.hash(c.replace(/-/g, ""), BCRYPT_ROUNDS))
  );
}

/**
 * Check a user-supplied code against stored bcrypt hashes.
 * Input may be typed with or without the separating dash.
 * Returns the matching index if found, -1 otherwise.
 * The caller must remove the consumed code from storage.
 */
export async function verifyBackupCode(
  rawInput: string,
  hashes: string[]
): Promise<number> {
  const normalised = rawInput.toUpperCase().replace(/[\s-]/g, "");
  for (let i = 0; i < hashes.length; i++) {
    if (await bcrypt.compare(normalised, hashes[i])) return i;
  }
  return -1;
}
