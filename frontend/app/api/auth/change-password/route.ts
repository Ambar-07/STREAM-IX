import { NextRequest, NextResponse } from "next/server";
import { changeUserPassword, ensureUsersLoaded } from "@/lib/userStore";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";

function getUserId(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : auth.trim();

  if (token.startsWith("streamix_tok_")) {
    const parts = token.split("_");
    if (parts.length >= 4) {
      return parts.slice(2, -1).join("_");
    }
  }

  const customHeader = request.headers.get("x-user-id");
  if (customHeader) return customHeader.trim();

  const url = new URL(request.url);
  const queryUserId = url.searchParams.get("userId");
  if (queryUserId) return queryUserId.trim();

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = getUserId(request) || body.userId;

    if (!userId) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const oldPassword = body.oldPassword || "";
    const newPassword = body.newPassword || "";

    if (!oldPassword || !newPassword) {
      return NextResponse.json(
        { message: "Both current and new passwords are required." },
        { status: 400 }
      );
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      return NextResponse.json({ message: policyCheck.error }, { status: 400 });
    }

    await ensureUsersLoaded(true);
    const result = await changeUserPassword(userId, oldPassword, newPassword);

    if (!result.success) {
      return NextResponse.json({ message: result.error || "Password change failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (err) {
    console.error("change-password error:", err);
    return NextResponse.json(
      { message: "Failed to change password. Please try again." },
      { status: 500 }
    );
  }
}
