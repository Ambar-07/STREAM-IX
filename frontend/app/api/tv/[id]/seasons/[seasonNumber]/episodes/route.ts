import { NextRequest, NextResponse } from "next/server";
import { getSeasonEpisodes } from "@/lib/tmdbServer";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; seasonNumber: string }> }
) {
  const { id, seasonNumber } = await params;
  const safeSeason = Number(seasonNumber) || 1;
  const episodes = await getSeasonEpisodes(id, safeSeason);
  return NextResponse.json({ episodes });
}
