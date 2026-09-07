import { NextResponse } from "next/server";
import { getTrendingSeries } from "@/lib/tmdbServer";

export async function GET() {
  const series = await getTrendingSeries();
  return NextResponse.json({ series });
}
