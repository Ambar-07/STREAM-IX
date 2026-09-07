import { NextRequest, NextResponse } from "next/server";
import { findMediaById, searchMovies, searchSeries } from "@/lib/tmdbServer";
import type { Movie } from "@/lib/api";

function deduplicateMedia(items: Movie[]): Movie[] {
  const seen = new Set<string>();
  const result: Movie[] = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    const key = `${item.media_type || "movie"}-${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = (searchParams.get("query") || "").trim();
  const type = (searchParams.get("type") || "all").toLowerCase();

  const idMatch = query.match(/^(?:tmdb[:\s-]*|id[:\s-]*)?(\d+)$/i);
  let directMatches: Movie[] = [];
  if (idMatch) {
    directMatches = await findMediaById(idMatch[1]);
  }

  if (type === "tv") {
    const tvDirect = directMatches.filter((item) => item.media_type === "tv");
    const series = await searchSeries(query);
    return NextResponse.json({ movies: deduplicateMedia([...tvDirect, ...series]), type: "tv" });
  }

  if (type === "movie") {
    const movieDirect = directMatches.filter((item) => item.media_type === "movie");
    const movies = await searchMovies(query);
    return NextResponse.json({ movies: deduplicateMedia([...movieDirect, ...movies]), type: "movie" });
  }

  const [movies, series] = await Promise.all([searchMovies(query), searchSeries(query)]);
  const merged = deduplicateMedia([...directMatches, ...movies, ...series]);
  return NextResponse.json({ movies: merged, type: "all" });
}
