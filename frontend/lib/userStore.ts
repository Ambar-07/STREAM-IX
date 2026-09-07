import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DEFAULT_SERVER_ID, type StreamServerId } from "./videoSource";
import { validatePasswordPolicy } from "./passwordPolicy";
import { getPendingRegistration, removePendingRegistration } from "./verificationStore";
import { syncUsersToGitHub, fetchUsersFromGitHub } from "./githubSyncService";

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  preferredServer: StreamServerId;
  autoplayTrailers: boolean;
  createdAt: number;
  lastLoginAt: number;
}

export interface StoredUser extends UserProfile {
  passwordHash: string;
  passwordSalt: string;
}

declare global {
  var __streamixUserStore: Map<string, StoredUser> | undefined;
  var __streamixLastGitHubFetch: number | undefined;
}

// In-memory cache
const userCache: Map<string, StoredUser> =
  globalThis.__streamixUserStore || new Map<string, StoredUser>();

globalThis.__streamixUserStore = userCache;

/**
 * Returns a guaranteed writable directory for local disk caching.
 * On serverless platforms (e.g. Vercel, AWS Lambda), /var/task is read-only,
 * so /tmp must be used.
 */
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
    // Verify write permissions
    const probe = path.join(localDir, `.probe_${Date.now()}`);
    fs.writeFileSync(probe, "ok");
    fs.unlinkSync(probe);
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

export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  if (!password || !salt || !expectedHash) return false;
  try {
    const calculatedHash = hashPassword(password, salt);
    return crypto.timingSafeEqual(
      Buffer.from(calculatedHash, "hex"),
      Buffer.from(expectedHash, "hex")
    );
  } catch {
    return false;
  }
}

/**
 * Safely reads all users from disk (checking both project data dir and /tmp).
 * Merges discovered users into memory without wiping existing cache.
 */
function readUsersFromDisk(): StoredUser[] {
  const tryLoad = (filePath: string): boolean => {
    try {
      if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) return false;
      const raw = fs.readFileSync(/*turbopackIgnore: true*/ filePath, "utf-8").replace(/^\uFEFF/, "").trim();
      if (!raw || raw === "null" || raw === "[]") return false;

      const list: StoredUser[] = JSON.parse(raw);
      if (Array.isArray(list) && list.length > 0) {
        for (const u of list) {
          if (u?.id) {
            const existing = userCache.get(u.id);
            if (!existing || (u.lastLoginAt || 0) >= (existing.lastLoginAt || 0)) {
              userCache.set(u.id, u);
            }
          }
        }
        return true;
      }
    } catch {
      // Ignored
    }
    return false;
  };

  const writableFile = path.join(getWritableDataDir(), "users.json");
  const localFile = path.join(process.cwd(), "data", "users.json");

  if (!tryLoad(writableFile)) {
    tryLoad(localFile);
  }

  return Array.from(userCache.values());
}

/**
 * Saves users to in-memory cache and writes to disk.
 * Disk write errors are non-fatal (especially on read-only serverless lambdas).
 */
export function writeUsersToDisk(users: StoredUser[]): void {
  // Always update in-memory cache immediately
  for (const u of users) {
    if (u?.id) userCache.set(u.id, u);
  }

  try {
    const dataDir = getWritableDataDir();
    const usersFile = path.join(dataDir, "users.json");
    const json = JSON.stringify(users, null, 2);

    const tmpFile = path.join(
      dataDir,
      `.users_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.tmp`
    );
    fs.writeFileSync(tmpFile, json, { encoding: "utf-8" });
    try {
      fs.renameSync(tmpFile, usersFile);
    } catch {
      fs.writeFileSync(usersFile, json, { encoding: "utf-8" });
      try {
        fs.unlinkSync(tmpFile);
      } catch {}
    }
  } catch (err) {
    console.warn("[userStore] Non-fatal: disk write failed:", err);
  }
}

/**
 * Ensures userCache is fresh.
 * On serverless (Vercel) or cold boots, fetches users directly from GitHub.
 */
export async function ensureUsersLoaded(forceRefresh = false): Promise<StoredUser[]> {
  // 1. If cache is empty, try disk first
  if (userCache.size === 0) {
    readUsersFromDisk();
  }

  // 2. Decide whether to query GitHub API
  const now = Date.now();
  const lastFetch = globalThis.__streamixLastGitHubFetch || 0;
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production");

  // Re-fetch if forced, if cache is empty, or if serverless and more than 4 seconds elapsed
  const shouldFetchGitHub =
    forceRefresh ||
    userCache.size === 0 ||
    (isServerless && now - lastFetch > 4000);

  if (shouldFetchGitHub) {
    try {
      const remoteUsers = await fetchUsersFromGitHub();
      if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
        globalThis.__streamixLastGitHubFetch = now;
        for (const u of remoteUsers) {
          if (u?.id) {
            userCache.set(u.id, u);
          }
        }
        writeUsersToDisk(Array.from(userCache.values()));
      }
    } catch (err) {
      console.warn("[userStore] GitHub fetch error in ensureUsersLoaded:", err);
    }
  }

  return Array.from(userCache.values());
}

export async function clearAllUsers(): Promise<void> {
  userCache.clear();
  writeUsersToDisk([]);
  await syncUsersToGitHub([]);
}

// Initial disk load
readUsersFromDisk();

export function toUserProfile(user: StoredUser): UserProfile {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "🍿",
    preferredServer: user.preferredServer || DEFAULT_SERVER_ID,
    autoplayTrailers: user.autoplayTrailers ?? true,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt,
  };
}

export function getUserByEmailOrUsername(identifier: string): StoredUser | null {
  const clean = (identifier || "").trim().toLowerCase();
  if (!clean) return null;

  for (const user of userCache.values()) {
    const userEmail = (user.email || "").toLowerCase();
    const userUsername = (user.username || "").toLowerCase();

    if (userEmail === clean || userUsername === clean) {
      return user;
    }
  }
  return null;
}

export function getUserById(id: string): StoredUser | null {
  return userCache.get(id) || null;
}

/**
 * Creates a new user account, saves it to memory and disk, and
 * AWAITS committing it to the GitHub repository so serverless instances persist it.
 */
export async function createUser(params: {
  email: string;
  username: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  avatar?: string;
}): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
  const normalizedEmail = params.email.trim().toLowerCase();
  const cleanUsername = params.username.trim();

  // Check uniqueness
  if (getUserByEmailOrUsername(normalizedEmail)) {
    return { success: false, error: "An account with this email already exists." };
  }
  if (getUserByEmailOrUsername(cleanUsername)) {
    return { success: false, error: "This username is already taken." };
  }

  let salt = params.passwordSalt;
  let hash = params.passwordHash;

  if (!salt || !hash) {
    if (!params.password) {
      return { success: false, error: "Password is required." };
    }
    const policyCheck = validatePasswordPolicy(params.password);
    if (!policyCheck.valid) {
      return { success: false, error: policyCheck.error };
    }
    salt = generateSalt();
    hash = hashPassword(params.password, salt);
  }

  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const newUser: StoredUser = {
    id,
    email: normalizedEmail,
    username: cleanUsername,
    displayName: cleanUsername,
    avatar: params.avatar || "🍿",
    preferredServer: DEFAULT_SERVER_ID,
    autoplayTrailers: true,
    createdAt: Date.now(),
    lastLoginAt: Date.now(),
    passwordHash: hash,
    passwordSalt: salt,
  };

  // 1. Immediately store in memory
  userCache.set(id, newUser);

  // 2. Save to local/tmp disk
  const allUsers = Array.from(userCache.values());
  writeUsersToDisk(allUsers);

  // 3. AWAIT committing directly to GitHub repository (critical for Vercel/serverless!)
  try {
    const syncRes = await syncUsersToGitHub(allUsers);
    if (!syncRes.success) {
      console.warn("[userStore] GitHub sync warning during createUser:", syncRes.error);
    } else {
      console.log(`[userStore] ✅ Successfully persisted user "${newUser.email}" to GitHub repo`);
    }
  } catch (syncErr) {
    console.error("[userStore] GitHub sync exception during createUser:", syncErr);
  }

  return { success: true, user: toUserProfile(newUser) };
}

export function authenticateUser(
  identifier: string,
  password: string
): { success: boolean; user?: UserProfile; token?: string; error?: string } {
  let user = getUserByEmailOrUsername(identifier);

  // Fallback: Check pending registrations in case OTP flow auto-activation applies
  if (!user) {
    try {
      const pendingData = getPendingRegistration(identifier);
      if (pendingData) {
        let isPendingValid = verifyPassword(password, pendingData.passwordSalt, pendingData.passwordHash);
        if (!isPendingValid && typeof password === "string") {
          const trimmed = password.trim();
          if (trimmed && trimmed !== password) {
            isPendingValid = verifyPassword(trimmed, pendingData.passwordSalt, pendingData.passwordHash);
          }
        }

        if (isPendingValid) {
          console.log(`[AUTH] Auto-activating pending user "${pendingData.email}" (${pendingData.username})`);
          createUser({
            email: pendingData.email,
            username: pendingData.username,
            passwordHash: pendingData.passwordHash,
            passwordSalt: pendingData.passwordSalt,
          });
          removePendingRegistration(pendingData.email);
          user = getUserByEmailOrUsername(pendingData.email) || getUserByEmailOrUsername(pendingData.username);
        }
      }
    } catch (err) {
      console.error("[AUTH] Error checking pending registrations:", err);
    }
  }

  if (!user) {
    console.warn(`[AUTH] User not found for identifier: "${identifier}"`);
    return { success: false, error: "Invalid username/email or password." };
  }

  // 1. Verify exact password
  let isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);

  // 2. Fallback: verify trimmed password in case mobile autocomplete added whitespace
  if (!isValid && typeof password === "string") {
    const trimmed = password.trim();
    if (trimmed && trimmed !== password) {
      isValid = verifyPassword(trimmed, user.passwordSalt, user.passwordHash);
    }
  }

  if (!isValid) {
    console.warn(`[AUTH] Password mismatch for user "${user.email}" (${user.username})`);
    return { success: false, error: "Invalid username/email or password." };
  }

  // Update last login
  user.lastLoginAt = Date.now();
  userCache.set(user.id, user);
  writeUsersToDisk(Array.from(userCache.values()));

  console.log(`[AUTH] ✅ Successfully authenticated "${user.email}" (${user.username})`);
  const token = `streamix_tok_${user.id}_${Date.now()}`;
  return { success: true, user: toUserProfile(user), token };
}

export function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, "displayName" | "avatar" | "preferredServer" | "autoplayTrailers">>
): { success: boolean; user?: UserProfile; error?: string } {
  const user = userCache.get(userId);
  if (!user) {
    return { success: false, error: "User not found." };
  }

  if (updates.displayName !== undefined) user.displayName = updates.displayName.trim();
  if (updates.avatar !== undefined) user.avatar = updates.avatar;
  if (updates.preferredServer !== undefined) user.preferredServer = updates.preferredServer;
  if (updates.autoplayTrailers !== undefined) user.autoplayTrailers = updates.autoplayTrailers;

  userCache.set(user.id, user);
  const allUsers = Array.from(userCache.values());
  writeUsersToDisk(allUsers);
  syncUsersToGitHub(allUsers).catch(() => {});

  return { success: true, user: toUserProfile(user) };
}

export async function changeUserPassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const user = userCache.get(userId);
  if (!user) {
    return { success: false, error: "User not found." };
  }

  const isValid = verifyPassword(oldPassword, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    return { success: false, error: "Current password is incorrect." };
  }

  const policyCheck = validatePasswordPolicy(newPassword);
  if (!policyCheck.valid) {
    return { success: false, error: policyCheck.error };
  }

  const newSalt = generateSalt();
  const newHash = hashPassword(newPassword, newSalt);

  user.passwordSalt = newSalt;
  user.passwordHash = newHash;
  userCache.set(user.id, user);

  const allUsers = Array.from(userCache.values());
  writeUsersToDisk(allUsers);
  await syncUsersToGitHub(allUsers);

  return { success: true };
}
