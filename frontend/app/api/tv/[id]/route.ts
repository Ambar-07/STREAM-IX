import { NextRequest, NextResponse } from "next/server";
import { getSeriesDetails } from "@/lib/tmdbServer";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const series = await getSeriesDetails(id);
  return NextResponse.json({ series });
}
