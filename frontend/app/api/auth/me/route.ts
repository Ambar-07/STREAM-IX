import { NextRequest, NextResponse } from "next/server";
import { ensureUsersLoaded, getUserById, toUserProfile, updateUserProfile } from "@/lib/userStore";
import type { StreamServerId } from "@/lib/videoSource";

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

export async function GET(request: NextRequest) {
  try {
    const userId = getUserId(request);
    if (!userId) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    await ensureUsersLoaded();
    const user = getUserById(userId);
    if (!user) {
      return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ user: toUserProfile(user) });
  } catch (err) {
    console.error("GET /api/auth/me error:", err);
    return NextResponse.json({ message: "Failed to load user profile." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const userId = getUserId(request) || body.userId;

    if (!userId) {
      return NextResponse.json({ message: "Authentication required." }, { status: 401 });
    }

    const updates: {
      displayName?: string;
      avatar?: string;
      preferredServer?: StreamServerId;
      autoplayTrailers?: boolean;
    } = {};

    if (body.displayName !== undefined) updates.displayName = String(body.displayName).trim();
    if (body.avatar !== undefined) updates.avatar = String(body.avatar);
    if (body.preferredServer !== undefined) updates.preferredServer = body.preferredServer as StreamServerId;
    if (body.autoplayTrailers !== undefined) updates.autoplayTrailers = Boolean(body.autoplayTrailers);

    await ensureUsersLoaded();
    const result = updateUserProfile(userId, updates);
    if (!result.success || !result.user) {
      return NextResponse.json({ message: result.error || "Update failed." }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      user: result.user,
      message: "Profile updated successfully.",
    });
  } catch (err) {
    console.error("PATCH /api/auth/me error:", err);
    return NextResponse.json({ message: "Failed to update profile." }, { status: 500 });
  }
}
