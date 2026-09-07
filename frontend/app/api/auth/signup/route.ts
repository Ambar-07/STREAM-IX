import { NextRequest, NextResponse } from "next/server";
import { createUser, ensureUsersLoaded } from "@/lib/userStore";
import { syncUserToGoogleSheet } from "@/lib/googleSheetService";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return NextResponse.json({ message: policyCheck.error }, { status: 400 });
    }

    await ensureUsersLoaded(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username || cleanEmail.split("@")[0] || "User").trim();

    const createResult = await createUser({
      email: cleanEmail,
      username: cleanUsername,
      password,
    });

    if (!createResult.success || !createResult.user) {
      return NextResponse.json({ message: createResult.error || "Signup failed." }, { status: 400 });
    }

    // Sync to Google Sheet
    syncUserToGoogleSheet(createResult.user).catch((err) => {
      console.error("Google Sheet background sync error:", err);
    });

    const token = `streamix_tok_${createResult.user.id}_${Date.now()}`;

    return NextResponse.json({ token, user: createResult.user }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Signup processing failed." }, { status: 500 });
  }
}
