import fs from "fs";
import path from "path";
import crypto from "crypto";

interface PendingRegistration {
  email: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  code: string;
  expiresAt: number;
  createdAt: number;
  attempts: number;
  resendCount: number;
  lastSentAt: number;
}

// ─── Disk persistence ──────────────────────────────────────────────────────

function getWritableDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join("/tmp", "streamix_data");
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return "/tmp";
    }
  }

  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    return localDir;
  } catch {
    const tmpDir = path.join("/tmp", "streamix_data");
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return "/tmp";
    }
  }
}

function getPendingFilePath(): string {
  return path.join(getWritableDataDir(), "pending_verifications.json");
}

function getPendingBackupPath(): string {
  return path.join(getWritableDataDir(), "pending_verifications.json.bak");
}

function ensureDir() {
  try {
    const dir = getWritableDataDir();
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  } catch {}
}

function loadFromDisk(): Map<string, PendingRegistration> {
  const map = new Map<string, PendingRegistration>();
  const pendingFile = getPendingFilePath();
  const pendingBackup = getPendingBackupPath();

  try {
    if (!fs.existsSync(pendingFile)) {
      if (fs.existsSync(pendingBackup)) {
        try {
          const bakRaw = fs.readFileSync(pendingBackup, "utf-8").replace(/^\uFEFF/, "").trim();
          const list: PendingRegistration[] = JSON.parse(bakRaw);
          if (Array.isArray(list)) {
            const now = Date.now();
            for (const entry of list) {
              if (entry?.email && entry.expiresAt > now) map.set(entry.email, entry);
            }
          }
        } catch {}
      }
      return map;
    }

    const raw = fs.readFileSync(pendingFile, "utf-8");
    // Strip BOM (Windows PowerShell/echo can write UTF-16 BOM)
    const content = raw.replace(/^\uFEFF/, "").trim();

    if (!content || content === "null" || content === "[]") return map;

    let list: PendingRegistration[];
    try {
      list = JSON.parse(content);
    } catch {
      console.warn("[verificationStore] JSON parse warning on pending_verifications.json, trying backup...");
      if (fs.existsSync(pendingBackup)) {
        try {
          const bakRaw = fs.readFileSync(pendingBackup, "utf-8").replace(/^\uFEFF/, "").trim();
          list = JSON.parse(bakRaw);
        } catch {
          return map;
        }
      } else {
        return map;
      }
    }

    if (Array.isArray(list)) {
      const now = Date.now();
      for (const entry of list) {
        // Only load non-expired entries
        if (entry?.email && entry.expiresAt > now) {
          map.set(entry.email, entry);
        }
      }
    }
  } catch (err) {
    console.error("[verificationStore] Failed to load from disk:", err);
  }
  return map;
}

function saveToDisk(map: Map<string, PendingRegistration>) {
  try {
    ensureDir();
    const dataDir = getWritableDataDir();
    const pendingFile = getPendingFilePath();
    const pendingBackup = getPendingBackupPath();
    const list = Array.from(map.values());
    const json = JSON.stringify(list, null, 2);

    // Keep active backup
    try {
      if (fs.existsSync(pendingFile)) {
        fs.copyFileSync(pendingFile, pendingBackup);
      }
    } catch {}

    // Atomic write
    const tmpFile = path.join(dataDir, `.pending_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`);
    fs.writeFileSync(tmpFile, json, { encoding: "utf-8" });
    try {
      fs.renameSync(tmpFile, pendingFile);
    } catch {
      fs.writeFileSync(pendingFile, json, { encoding: "utf-8" });
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  } catch (err) {
    console.warn("[verificationStore] Non-fatal: failed to save pending verifications to disk:", err);
  }
}

// ─── In-memory store (backed by disk) ─────────────────────────────────────

declare global {
  var __streamixPendingVerifications: Map<string, PendingRegistration> | undefined;
}

// On first load, populate from disk so server restarts don't lose pending OTPs
const pendingVerifications: Map<string, PendingRegistration> =
  globalThis.__streamixPendingVerifications ?? loadFromDisk();

globalThis.__streamixPendingVerifications = pendingVerifications;

// ─── Constants ────────────────────────────────────────────────────────────

const OTP_TTL_MS = 10 * 60 * 1000;       // 10 minutes
const RESEND_COOLDOWN_MS = 45 * 1000;     // 45 seconds
const MAX_ATTEMPTS = 5;

// ─── API ──────────────────────────────────────────────────────────────────

export function storePendingRegistration(params: {
  email: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  code: string;
}): { success: boolean; cooldownRemaining?: number } {
  const normalizedEmail = params.email.trim().toLowerCase();
  const existing = pendingVerifications.get(normalizedEmail);

  if (existing) {
    const elapsed = Date.now() - existing.lastSentAt;
    if (elapsed < RESEND_COOLDOWN_MS) {
      const remainingSeconds = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
      return { success: false, cooldownRemaining: remainingSeconds };
    }
  }

  const resendCount = existing ? existing.resendCount + 1 : 0;
  const entry: PendingRegistration = {
    email: normalizedEmail,
    username: params.username.trim(),
    passwordHash: params.passwordHash,
    passwordSalt: params.passwordSalt,
    code: params.code.trim(),
    expiresAt: Date.now() + OTP_TTL_MS,
    createdAt: Date.now(),
    attempts: 0,
    resendCount,
    lastSentAt: Date.now(),
  };

  pendingVerifications.set(normalizedEmail, entry);
  saveToDisk(pendingVerifications);

  return { success: true };
}

export function getPendingRegistration(identifier: string): PendingRegistration | null {
  const clean = identifier.trim().toLowerCase();
  let entry = pendingVerifications.get(clean);
  if (!entry) {
    for (const p of pendingVerifications.values()) {
      if (p.email.toLowerCase() === clean || p.username.toLowerCase() === clean) {
        entry = p;
        break;
      }
    }
  }

  if (!entry) return null;

  if (Date.now() > entry.expiresAt) {
    pendingVerifications.delete(entry.email);
    saveToDisk(pendingVerifications);
    return null;
  }

  return entry;
}

const VERIFICATION_SECRET = process.env.VERIFICATION_SECRET || "streamix_vault_verify_key_2026_sec";

export function createSignedVerificationToken(data: {
  email: string;
  username: string;
  passwordHash: string;
  passwordSalt: string;
  code: string;
  expiresAt: number;
}): string {
  const payloadStr = JSON.stringify(data);
  const payloadB64 = Buffer.from(payloadStr, "utf-8").toString("base64url");
  const signature = crypto.createHmac("sha256", VERIFICATION_SECRET).update(payloadB64).digest("base64url");
  return `${payloadB64}.${signature}`;
}

export function verifySignedVerificationToken(
  token: string,
  inputEmail: string,
  inputCode: string
): { success: boolean; error?: string; registration?: PendingRegistration } {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return { success: false, error: "Invalid verification token." };

    const [payloadB64, signature] = parts;
    const expectedSig = crypto.createHmac("sha256", VERIFICATION_SECRET).update(payloadB64).digest("base64url");
    if (signature !== expectedSig) {
      return { success: false, error: "Verification token invalid or altered." };
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf-8");
    const data = JSON.parse(payloadJson);

    if (data.email.toLowerCase() !== inputEmail.trim().toLowerCase()) {
      return { success: false, error: "Email does not match verification session." };
    }

    if (Date.now() > data.expiresAt) {
      return { success: false, error: "Verification code has expired. Please request a new code." };
    }

    if (data.code !== inputCode.trim()) {
      return { success: false, error: "Invalid verification code. Please check your email." };
    }

    return {
      success: true,
      registration: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        passwordSalt: data.passwordSalt,
        code: data.code,
        expiresAt: data.expiresAt,
        createdAt: data.createdAt || Date.now(),
        attempts: 0,
        resendCount: 0,
        lastSentAt: Date.now(),
      },
    };
  } catch (err) {
    return { success: false, error: "Failed to verify token." };
  }
}

export function verifyRegistrationCode(
  email: string,
  inputCode: string,
  verificationToken?: string
): { success: boolean; error?: string; registration?: PendingRegistration } {
  // 1. Stateless verification token: works 100% across all Vercel/serverless instances!
  if (verificationToken) {
    const tokenCheck = verifySignedVerificationToken(verificationToken, email, inputCode);
    if (tokenCheck.success) {
      return tokenCheck;
    }
  }

  // 2. Fallback to in-memory / local disk store
  const normalizedEmail = email.trim().toLowerCase();
  const cleanCode = inputCode.trim();
  const entry = pendingVerifications.get(normalizedEmail);

  if (!entry) {
    // Try reloading from disk in case this server instance missed it
    const fresh = loadFromDisk();
    const diskEntry = fresh.get(normalizedEmail);
    if (diskEntry && diskEntry.expiresAt > Date.now()) {
      pendingVerifications.set(normalizedEmail, diskEntry);
    } else {
      return {
        success: false,
        error: "No pending verification found. Please request a new code.",
      };
    }
    return verifyRegistrationCode(email, inputCode);
  }

  if (Date.now() > entry.expiresAt) {
    pendingVerifications.delete(normalizedEmail);
    saveToDisk(pendingVerifications);
    return {
      success: false,
      error: "Verification code has expired. Please request a new code.",
    };
  }

  if (entry.attempts >= MAX_ATTEMPTS) {
    pendingVerifications.delete(normalizedEmail);
    saveToDisk(pendingVerifications);
    return {
      success: false,
      error: "Too many failed attempts. For your security, please restart registration.",
    };
  }

  if (entry.code !== cleanCode) {
    entry.attempts += 1;
    saveToDisk(pendingVerifications);
    const remaining = MAX_ATTEMPTS - entry.attempts;
    return {
      success: false,
      error: `Invalid verification code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    };
  }

  // ✅ Code is valid — remove from store and return payload
  pendingVerifications.delete(normalizedEmail);
  saveToDisk(pendingVerifications);
  return { success: true, registration: entry };
}

export function removePendingRegistration(email: string): void {
  pendingVerifications.delete(email.trim().toLowerCase());
  saveToDisk(pendingVerifications);
}
