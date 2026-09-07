import { NextResponse } from "next/server";
import { getTopRatedMovies } from "@/lib/tmdbServer";

export async function GET() {
  const movies = await getTopRatedMovies();
  return NextResponse.json({ movies });
}
