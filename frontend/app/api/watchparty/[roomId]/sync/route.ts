import { NextRequest, NextResponse } from "next/server";
import { updatePartySync } from "@/lib/watchPartyStore";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  try {
    const body = await request.json();
    const { userId, isPlaying, currentTime, season, episode, episodeName, serverId, countdownTarget, action } = body ?? {};

    if (!userId) {
      return NextResponse.json({ message: "userId is required for sync." }, { status: 400 });
    }

    const nextSync = updatePartySync(roomId, {
      userId,
      isPlaying,
      currentTime,
      action,
      season,
      episode,
      episodeName,
      serverId,
      countdownTarget,
    });

    if (!nextSync) {
      return NextResponse.json({ message: "Room not found or unauthorized to sync." }, { status: 404 });
    }

    return NextResponse.json({ syncState: nextSync });
  } catch {
    return NextResponse.json({ message: "Failed to update sync state." }, { status: 500 });
  }
}
