import { NextResponse } from "next/server";
import { getTrendingMovies } from "@/lib/tmdbServer";

export async function GET() {
  const movies = await getTrendingMovies();
  return NextResponse.json({ movies });
}
