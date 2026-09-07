import { NextRequest, NextResponse } from "next/server";
import { addPartyReaction, getPartyReactions } from "@/lib/watchPartyStore";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since") || 0);

  const reactions = getPartyReactions(roomId, since);
  return NextResponse.json({ reactions });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const body = await request.json();
    const { emoji, senderName } = body ?? {};

    if (!emoji || !senderName) {
      return NextResponse.json({ message: "Emoji and senderName are required." }, { status: 400 });
    }

    const reaction = addPartyReaction(roomId, {
      emoji: String(emoji).slice(0, 4),
      senderName: String(senderName).trim(),
    });

    if (!reaction) {
      return NextResponse.json({ message: "Room not found." }, { status: 404 });
    }

    return NextResponse.json({ reaction }, { status: 201 });
  } catch {
    return NextResponse.json({ message: "Failed to broadcast reaction." }, { status: 500 });
  }
}
