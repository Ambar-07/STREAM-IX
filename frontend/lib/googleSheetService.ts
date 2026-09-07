import type { UserProfile } from "./userStore";

export async function syncUserToGoogleSheet(user: UserProfile): Promise<{ success: boolean; error?: string }> {
  const webhookUrl = process.env.GOOGLE_SHEET_WEBHOOK_URL?.trim();

  const payload = {
    id: user.id,
    username: user.username,
    email: user.email,
    displayName: user.displayName || user.username,
    avatar: user.avatar || "🍿",
    preferredServer: user.preferredServer || "viduki-1",
    registeredAt: new Date(user.createdAt).toISOString(),
    registeredDateFormatted: new Date(user.createdAt).toLocaleString(),
    status: "Verified",
  };

  if (!webhookUrl) {
    console.log("\n=======================================================");
    console.log("[STREAMIX GOOGLE SHEET SYNC] 📊 Notice: GOOGLE_SHEET_WEBHOOK_URL not configured in .env.local");
    console.log("User details ready to append:", JSON.stringify(payload, null, 2));
    console.log("Target Sheet: Google Sheets Webhook (Optional)");
    console.log("=======================================================\n");
    return { success: false, error: "GOOGLE_SHEET_WEBHOOK_URL not configured" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      redirect: "follow",
    });

    if (!res.ok && res.status !== 302) {
      const errText = await res.text().catch(() => "");
      console.error(`[GOOGLE SHEET SYNC ERROR] HTTP ${res.status}:`, errText);
      return { success: false, error: `HTTP status ${res.status}` };
    }

    console.log(`[STREAMIX GOOGLE SHEET SYNC] ✅ User ${user.email} successfully appended to Google Sheet!`);
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync with Google Sheet";
    console.error("[GOOGLE SHEET SYNC ERROR]:", err);
    return { success: false, error: message };
  }
}
