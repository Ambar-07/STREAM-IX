import { NextRequest, NextResponse } from "next/server";
import { addPartyMessage, getPartyMessages } from "@/lib/watchPartyStore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") || 0);

  const messages = getPartyMessages(roomId, since);
  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const body = await request.json();
    const { senderId, senderName, senderAvatar, text } = body ?? {};

    if (!senderId || !senderName || !text || !text.trim()) {
      return NextResponse.json({ message: "Invalid message payload." }, { status: 400 });
    }

    const message = addPartyMessage(roomId, {
      senderId,
      senderName,
      senderAvatar: senderAvatar || "🍿",
      text: text.trim(),
    });

    if (!message) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ message }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Failed to send message." }, { status: 500 });
  }
}
