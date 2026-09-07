import type { StoredUser } from "./userStore";

const GITHUB_REPO = process.env.GITHUB_REPO || "";
const GITHUB_FILE_PATH = "frontend/data/users.json";
const GITHUB_BRANCH = "main";

function getGitHubToken(): string | null {
  return (
    process.env.GITHUB_TOKEN?.trim() ||
    process.env.GH_TOKEN?.trim() ||
    null
  );
}

/**
 * Fetches the latest users.json content directly from GitHub repository.
 * Essential for serverless deployments (e.g. Vercel) where local disk is ephemeral.
 */
export async function fetchUsersFromGitHub(): Promise<StoredUser[] | null> {
  const token = getGitHubToken();
  if (!token) {
    console.warn("[GITHUB SYNC] No GITHUB_TOKEN configured; skipping remote fetch.");
    return null;
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=${GITHUB_BRANCH}&_t=${Date.now()}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Streamix-Auth-Sync",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(`[GITHUB SYNC] Failed to fetch users.json: HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (!data?.content) return null;

    const raw = Buffer.from(data.content, "base64").toString("utf-8").trim();
    if (!raw || raw === "null" || raw === "[]") return [];

    const list: StoredUser[] = JSON.parse(raw);
    if (Array.isArray(list)) {
      console.log(`[GITHUB SYNC] ✅ Successfully loaded ${list.length} user(s) from GitHub repository.`);
      return list;
    }
    return null;
  } catch (err) {
    console.error("[GITHUB SYNC] Error fetching users from GitHub API:", err);
    return null;
  }
}

let syncQueue: Promise<unknown> = Promise.resolve();

/**
 * Commits the updated users.json file directly to the GitHub repository.
 * Uses a sequential queue and automatic retry on 409 SHA conflicts.
 */
export function syncUsersToGitHub(users: StoredUser[]): Promise<{ success: boolean; error?: string }> {
  const task = syncQueue.then(() => doSyncUsersToGitHub(users, 2));
  syncQueue = task.catch(() => {});
  return task;
}

async function doSyncUsersToGitHub(users: StoredUser[], retriesLeft = 2): Promise<{ success: boolean; error?: string }> {
  const token = getGitHubToken();
  if (!token) {
    console.warn("[GITHUB SYNC] No GITHUB_TOKEN configured; skipping GitHub commit.");
    return { success: false, error: "GITHUB_TOKEN not configured" };
  }

  try {
    const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`;

    // 1. Get current file sha with cache busting
    let sha: string | undefined;
    try {
      const getRes = await fetch(`${url}?ref=${GITHUB_BRANCH}&t=${Date.now()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "Streamix-Auth-Sync",
        },
        cache: "no-store",
      });

      if (getRes.ok) {
        const fileInfo = await getRes.json();
        sha = fileInfo.sha;
      }
    } catch (shaErr) {
      console.warn("[GITHUB SYNC] Could not retrieve existing sha, attempting commit without sha:", shaErr);
    }

    // 2. Prepare payload
    const jsonContent = JSON.stringify(users, null, 2) + "\n";
    const base64Content = Buffer.from(jsonContent, "utf-8").toString("base64");

    const putPayload: Record<string, unknown> = {
      message: `chore(auth): update users.json for new user registration [skip ci]`,
      content: base64Content,
      branch: GITHUB_BRANCH,
    };

    if (sha) {
      putPayload.sha = sha;
    }

    // 3. PUT commit to GitHub API
    const putRes = await fetch(url, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Streamix-Auth-Sync",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(putPayload),
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      if (putRes.status === 409 && retriesLeft > 0) {
        console.warn("[GITHUB SYNC] SHA conflict (409), retrying with latest remote SHA in 500ms...");
        await new Promise((r) => setTimeout(r, 500));
        return doSyncUsersToGitHub(users, retriesLeft - 1);
      }
      console.error(`[GITHUB SYNC ERROR] HTTP ${putRes.status}:`, errText);
      return { success: false, error: `HTTP ${putRes.status}: ${errText}` };
    }

    const putData = await putRes.json();
    const commitSha = putData?.commit?.sha || "ok";
    console.log(`[GITHUB SYNC] ✅ Successfully committed users.json to GitHub (${GITHUB_REPO}@${commitSha.slice(0, 7)})`);

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to commit to GitHub";
    console.error("[GITHUB SYNC ERROR]:", err);
    return { success: false, error: message };
  }
}
