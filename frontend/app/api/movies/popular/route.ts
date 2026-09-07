import { NextResponse } from "next/server";
import { getPopularMovies } from "@/lib/tmdbServer";

export async function GET() {
  const movies = await getPopularMovies();
  return NextResponse.json({ movies });
}
