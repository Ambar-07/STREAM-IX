import { NextRequest, NextResponse } from "next/server";
import { createPartyRoom, getPartyRoom } from "@/lib/watchPartyStore";
import { DEFAULT_WATCH_PARTY_SERVER_ID } from "@/lib/videoSource";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code") || searchParams.get("id");

  if (!code || !code.trim()) {
    return NextResponse.json({ message: "Room code or ID is required." }, { status: 400 });
  }

  const room = getPartyRoom(code.trim());
  if (!room) {
    return NextResponse.json({ message: "Watch party room not found." }, { status: 404 });
  }

  // If reconstructed from raw code and has generic title, enrich via TMDB
  if (room.title.startsWith("Movie ") || room.title.startsWith("Series ")) {
      const tmdbKey = process.env.TMDB_API_KEY;
      if (!tmdbKey) return NextResponse.json(room);
      const endpoint =
        room.mediaType === "tv"
          ? `https://api.themoviedb.org/3/tv/${room.tmdbId}?api_key=${tmdbKey}`
          : `https://api.themoviedb.org/3/movie/${room.tmdbId}?api_key=${tmdbKey}`;
      const res = await fetch(endpoint, { next: { revalidate: 3600 } });
      if (res.ok) {
        const data = await res.json();
        room.title = data.title || data.name || room.title;
        room.posterPath = data.poster_path || room.posterPath;
        room.backdropPath = data.backdrop_path || room.backdropPath;
      }
    } catch {
      // Ignore enrichment errors
    }
  }

  return NextResponse.json({ room });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      mediaType,
      tmdbId,
      posterPath,
      backdropPath,
      season,
      episode,
      episodeName,
      totalEpisodes,
      serverId,
      host,
    } = body ?? {};

    if (!title || !tmdbId || !mediaType || !host?.name) {
      return NextResponse.json({ message: "Missing required fields for watch party." }, { status: 400 });
    }

    const room = createPartyRoom({
      title: String(title).trim(),
      mediaType,
      tmdbId: String(tmdbId),
      posterPath,
      backdropPath,
      season: season !== undefined ? Number(season) : undefined,
      episode: episode !== undefined ? Number(episode) : undefined,
      episodeName,
      totalEpisodes: totalEpisodes !== undefined ? Number(totalEpisodes) : undefined,
      serverId: serverId && serverId !== "2embed" ? serverId : DEFAULT_WATCH_PARTY_SERVER_ID,
      host: {
        id: String(host.id || `user_${Date.now()}`),
        name: String(host.name).trim(),
        avatar: host.avatar || "🍿",
      },
    });

    return NextResponse.json({ room }, { status: 201 });
  } catch (err) {
    console.error("[WATCHPARTY CREATE ERROR]:", err);
    return NextResponse.json({ message: "Failed to create watch party room." }, { status: 500 });
  }
}
