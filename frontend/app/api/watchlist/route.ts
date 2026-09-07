import { NextRequest, NextResponse } from "next/server";
import type { Movie } from "@/lib/api";

// Serverless fallback watchlist store
let inMemoryWatchlist: Movie[] = [];

export function getInMemoryWatchlist(): Movie[] {
  return inMemoryWatchlist;
}

export function setInMemoryWatchlist(list: Movie[]) {
  inMemoryWatchlist = list;
}

export async function GET() {
  return NextResponse.json({ movies: inMemoryWatchlist });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const movie = body?.movie || body;
    if (movie && movie.id) {
      if (!inMemoryWatchlist.some((m) => Number(m.id) === Number(movie.id))) {
        inMemoryWatchlist.unshift(movie);
      }
    }
    return NextResponse.json({ movies: inMemoryWatchlist }, { status: 201 });
  } catch {
    return NextResponse.json({ movies: inMemoryWatchlist });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    let movieId = idParam ? Number(idParam) : NaN;

    if (isNaN(movieId)) {
      const body = await request.json().catch(() => null);
      if (body?.movieId) movieId = Number(body.movieId);
      if (body?.id) movieId = Number(body.id);
    }

    if (!isNaN(movieId)) {
      inMemoryWatchlist = inMemoryWatchlist.filter((m) => Number(m.id) !== movieId);
    }
  } catch {
    // Ignore errors
  }

  return NextResponse.json({ movies: inMemoryWatchlist });
}
