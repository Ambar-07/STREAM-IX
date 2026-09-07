import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, ensureUsersLoaded } from "@/lib/userStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Accept whatever the user typed — could be email or username
    const raw = ((body.username || body.email || "") as string).trim();
    const password = (body.password || "") as string;

    if (!raw || !password) {
      return NextResponse.json(
        { message: "Username/email and password are required." },
        { status: 400 }
      );
    }

    // Ensure users are fresh from GitHub / disk
    await ensureUsersLoaded(true);

    // Try the identifier as-is (getUserByEmailOrUsername matches both fields)
    const authResult = authenticateUser(raw, password);

    if (!authResult.success || !authResult.user) {
      console.warn(`[LOGIN 401] Failed login attempt for identifier: "${raw}"`);
      return NextResponse.json(
        { message: authResult.error || "Invalid username or password." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      token: authResult.token,
      user: authResult.user,
    });
  } catch (err) {
    console.error("login error:", err);
    return NextResponse.json(
      { message: "Login processing failed. Please try again." },
      { status: 500 }
    );
  }
}
