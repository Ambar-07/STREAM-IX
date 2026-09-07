import { NextRequest, NextResponse } from "next/server";
import {
  getPartyRoom,
  joinPartyRoom,
  leavePartyRoom,
  touchPartyRoom,
  getPartyMessages,
  getPartyReactions,
} from "@/lib/watchPartyStore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId") || undefined;
  const userName = searchParams.get("userName") || undefined;
  const userAvatar = searchParams.get("userAvatar") || undefined;
  const peerId = searchParams.get("peerId") || undefined;

  const room = touchPartyRoom(roomId, userId, userName, userAvatar, peerId);

  if (!room) {
    return NextResponse.json({ message: "Watch party room not found." }, { status: 404 });
  }

  const messages = getPartyMessages(room.id || roomId);
  const reactions = getPartyReactions(room.id || roomId);

  return NextResponse.json({ room, messages, reactions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const queryUserId = searchParams.get("userId");

    // Handle beacon leave via POST
    if (action === "leave" && queryUserId) {
      const room = leavePartyRoom(roomId, queryUserId);
      return NextResponse.json({ room, success: true });
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {
      // Body may be empty on beacon
    }

    if (body?.action === "leave" && body?.userId) {
      const room = leavePartyRoom(roomId, body.userId);
      return NextResponse.json({ room, success: true });
    }

    const { user } = body ?? {};

    if (!user || !user.id || !user.name) {
      return NextResponse.json({ message: "User information is required." }, { status: 400 });
    }

    const room = joinPartyRoom(roomId, {
      id: user.id,
      name: String(user.name).trim(),
      avatar: user.avatar || "🍿",
    });

    if (!room) {
      return NextResponse.json({ message: "Watch party room not found." }, { status: 404 });
    }

    return NextResponse.json({ room });
  } catch (err) {
    console.error("[WATCHPARTY JOIN ERROR]:", err);
    return NextResponse.json({ message: "Failed to join room." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ message: "userId query parameter required." }, { status: 400 });
    }

    const room = leavePartyRoom(roomId, userId);
    return NextResponse.json({ room, success: true });
  } catch {
    return NextResponse.json({ message: "Failed to leave room." }, { status: 500 });
  }
}
