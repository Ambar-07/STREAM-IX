import { NextRequest, NextResponse } from "next/server";
import { searchSeries } from "@/lib/tmdbServer";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query") || "";
  const series = await searchSeries(query);
  return NextResponse.json({ series });
}
