import { NextRequest, NextResponse } from "next/server";
import { getMovieDetails } from "@/lib/tmdbServer";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const movie = await getMovieDetails(id);
  return NextResponse.json({ movie });
}
