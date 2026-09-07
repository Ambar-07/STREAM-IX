"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bookmark, Film, User, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import TrailerModal from "@/components/TrailerModal";
import MovieCard from "@/components/MovieCard";
import ServerSwitcher from "@/components/ServerSwitcher";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson, isSeries, type Movie } from "@/lib/api";
import { ENABLE_EXTERNAL_STREAMING } from "@/lib/videoSource";
import { recordWatchHistory } from "@/lib/watchHistory";
import { isInWatchlist, toggleWatchlist as toggleWatchlistUtil } from "@/lib/watchlist";
import { getLocalParticipant, encodeRoomToken } from "@/lib/watchparty";

const imageBase = "https://image.tmdb.org/t/p/original";

export default function MovieDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const { darkMode } = useTheme();

  useEffect(() => {
    function checkWatchlist() {
      if (movie?.id) {
        setInWatchlist(isInWatchlist(movie.id));
      }
    }

    checkWatchlist();

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_watchlist_updated", checkWatchlist);
      window.addEventListener("storage", checkWatchlist);
      return () => {
        window.removeEventListener("streamix_watchlist_updated", checkWatchlist);
        window.removeEventListener("storage", checkWatchlist);
      };
    }
  }, [movie?.id]);

  useEffect(() => {
    async function loadMovie() {
      const resolved = await params;
      try {
        const data = await fetchJson<{ movie: Movie }>(`/movies/${resolved.id}`);
        if (data.movie && isSeries(data.movie)) {
          router.replace(`/series/${resolved.id}`);
          return;
        }
        setMovie(data.movie);
        if (typeof window !== "undefined") {
          const sp = new URLSearchParams(window.location.search);
          if (sp.get("autoplay") === "true") {
            setShowPlayer(true);
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        setMovie(null);
      } finally {
        setLoading(false);
      }
    }

    loadMovie();
  }, [params, router]);

  useEffect(() => {
    if (showPlayer && movie) {
      recordWatchHistory({
        id: movie.id,
        title: movie.title,
        name: movie.name,
        overview: movie.overview,
        poster_path: movie.poster_path,
        backdrop_path: movie.backdrop_path,
        media_type: "movie",
        vote_average: movie.vote_average,
      });
    }
  }, [showPlayer, movie]);

  useEffect(() => {
    if (showPlayer) {
      const prevOverflow = document.body.style.overflow;
      const prevTouch = document.body.style.touchAction;
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
      return () => {
        document.body.style.overflow = prevOverflow;
        document.body.style.touchAction = prevTouch;
      };
    }
  }, [showPlayer]);

  const handleStartParty = async () => {
    if (!movie) return;
    const user = getLocalParticipant();
    try {
      const res = await fetch("/api/watchparty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: movie.title,
          mediaType: "movie",
          tmdbId: String(movie.id),
          posterPath: movie.poster_path,
          backdropPath: movie.backdrop_path,
          host: user,
        }),
      });
      const data = await res.json();
      if (res.ok && data.room?.id) {
        router.push(`/watchparty/${data.room.id}`);
        return;
      }
    } catch {
      // Fallback to client generation
    }

    // Client fallback ensures user NEVER gets stuck or sees an error
    const clientToken = encodeRoomToken({
      m: "movie",
      id: String(movie.id),
      t: movie.title,
      p: movie.poster_path,
      b: movie.backdrop_path,
      h: user.name,
      ha: user.avatar,
      hid: user.id,
      ts: Date.now(),
    });
    router.push(`/watchparty/${clientToken}`);
  };

  const shellClass = darkMode ? "min-h-screen bg-[#0d0d0d] text-[#f5f0e8]" : "min-h-screen bg-[#faf8f5] text-[#111111]";
  const panelClass = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const panelSoftClass = darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]";
  const mutedTextClass = darkMode ? "text-[#f5f0e8]/75" : "text-[#111111]/75";

  if (loading) {
    return (
      <main className={shellClass}>
        <Navbar />
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-20">
          <div className={`border-[3px] border-black px-8 py-6 text-center shadow-[6px_6px_0_#000] ${darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]"}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">Loading</p>
            <p className="mt-2 font-[var(--font-bricolage)] text-3xl uppercase tracking-[-0.05em]">Movie</p>
          </div>
        </div>
      </main>
    );
  }

  if (!movie) {
    return (
      <main className={shellClass}>
        <Navbar />
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-20">
          <div className={`border-[3px] border-black px-8 py-6 text-center shadow-[6px_6px_0_#000] ${darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]"}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">Movie</p>
            <p className="mt-2 font-[var(--font-bricolage)] text-3xl uppercase tracking-[-0.05em]">Not found</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <Navbar />
      <div className="relative isolate">
        {movie.backdrop_path && (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <Image
              src={`${imageBase}${movie.backdrop_path}`}
              alt={movie.title}
              fill
              className="object-cover opacity-25"
              priority
            />
          </div>
        )}

        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-10 md:px-8">
          <div className={`relative aspect-[2/3] w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] mx-auto md:w-[360px] md:shrink-0 overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000] bg-neutral-900 ${panelSoftClass}`}>
            <Image
              src={movie.poster_path ? `${imageBase}${movie.poster_path}` : "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80"}
              alt={movie.title}
              fill
              priority
              sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, 360px"
              className="object-cover object-center"
            />
          </div>

          <div className={`flex-1 space-y-5 border-[3px] border-black p-4 shadow-[6px_6px_0_#000] sm:p-6 sm:space-y-6 ${panelClass}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>Movie detail</p>
              <h1 className={`mt-2 font-[var(--font-bricolage)] text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.04em] break-words sm:text-[3rem] md:text-[4.2rem] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>{movie.title}</h1>
            </div>

            <div className={`flex flex-wrap gap-2 sm:gap-3 text-sm ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>
              <span className="border-[2px] border-black bg-[#ffe600] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">★ {movie.vote_average?.toFixed(1) ?? "N/A"}</span>
              <span className="border-[2px] border-black bg-[#f5f0e8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">{movie.release_date?.slice(0, 4) ?? "Unknown"}</span>
              {movie.genres?.map((genre) => (
                <span key={genre.id} className="border-[2px] border-black bg-[#00f0ff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">{genre.name}</span>
              ))}
            </div>

            <p className={`max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 ${mutedTextClass}`}>{movie.overview || "No overview is available for this title."}</p>

            {isSeries(movie) ? (
              <div className="space-y-3 border-[3px] border-black bg-[#00f0ff] p-4 text-black shadow-[4px_4px_0_#000]">
                <p className="text-[10px] font-black uppercase tracking-[0.2em]">TV Series Detected</p>
                <p className="text-xs font-bold">This title has individual seasons and episodes available.</p>
                <Link
                  href={`/series/${movie.id}`}
                  className="inline-flex items-center justify-center border-[2px] border-black bg-[#ffe600] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000]"
                >
                  Open Episode Selector
                </Link>
              </div>
            ) : ENABLE_EXTERNAL_STREAMING ? (
              <div className="space-y-4">
                <ServerSwitcher className="w-full" />
                {!showPlayer ? (
                  <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setShowPlayer(true)}
                      className="w-full sm:w-auto inline-flex items-center justify-center border-[3px] border-black bg-[#ffe600] px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
                    >
                      Watch Now
                    </button>
                    <button
                      type="button"
                      onClick={handleStartParty}
                      className="w-full sm:w-auto inline-flex items-center justify-center border-[3px] border-black bg-[#00f0ff] px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
                    >
                      <Users className="mr-2 h-4 w-4 shrink-0" />
                      Watch Party
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!movie) return;
                        const nextState = await toggleWatchlistUtil(movie);
                        setInWatchlist(nextState);
                      }}
                      aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                      className={`flex-1 sm:flex-initial inline-flex items-center justify-center border-[3px] border-black px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98 ${
                        inWatchlist
                          ? "bg-[#00f0ff] text-black"
                          : darkMode
                            ? "bg-[#222222] text-[#f5f0e8] hover:bg-[#2e2e2e]"
                            : "bg-white text-black hover:bg-neutral-100"
                      }`}
                    >
                      <Bookmark className={`mr-2 h-4 w-4 shrink-0 ${inWatchlist ? "fill-current" : ""}`} />
                      {inWatchlist ? "In Watchlist" : "Add to Watchlist"}
                    </button>
                    {movie.trailer_key && (
                      <button
                        type="button"
                        onClick={() => setShowTrailer(true)}
                        className="flex-1 sm:flex-initial inline-flex items-center justify-center border-[3px] border-black bg-[#ff5376] px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
                      >
                        <Film className="mr-2 h-4 w-4 shrink-0" />
                        Watch Trailer
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="fixed inset-0 z-[9999] flex flex-col h-[100dvh] w-screen bg-black p-0 sm:p-3 md:p-4 overflow-hidden">
                    <div className="mx-auto flex h-full w-full max-w-7xl flex-col min-h-0 overflow-hidden border-0 sm:border-[3px] border-black bg-black shadow-none sm:shadow-[6px_6px_0_#000]">
                      <VideoPlayer
                        type="movie"
                        id={String(movie.id)}
                        title={movie.title}
                        fullScreen
                        onClose={() => setShowPlayer(false)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`border-[3px] border-dashed border-black p-4 text-sm ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]"}`}>
                External streaming is disabled in this build. Enable the provider in the environment config.
              </div>
            )}
          </div>
        </div>

        {/* Top Billed Cast Section */}
        {movie.cast && movie.cast.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe600]">Credits</p>
                <h2 className={`font-[var(--font-bricolage)] text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>
                  Top Billed Cast
                </h2>
              </div>
              <span className="border-[2px] border-black bg-[#ffe600] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000]">
                {movie.cast.length} Actors
              </span>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin snap-x snap-mandatory touch-pan-x overscroll-x-contain">
              {movie.cast.map((actor) => (
                <div
                  key={`${actor.id}-${actor.character || actor.name}`}
                  className={`w-[115px] sm:w-[140px] md:w-[150px] shrink-0 snap-start border-[3px] border-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] overflow-hidden ${panelClass}`}
                >
                  <div className="relative aspect-[3/4] w-full bg-neutral-800 border-b-[2px] sm:border-b-[3px] border-black overflow-hidden">
                    {actor.profile_path ? (
                      <Image
                        src={actor.profile_path}
                        alt={actor.name}
                        fill
                        sizes="(max-width: 640px) 115px, (max-width: 768px) 140px, 150px"
                        className="object-cover object-top transition duration-300 hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-2 text-center text-neutral-400">
                        <User className="h-8 w-8 sm:h-10 sm:w-10 opacity-50 mb-1" />
                        <span className="text-[9px] font-black uppercase tracking-wider">No Photo</span>
                      </div>
                    )}
                  </div>
                  <div className="p-2 sm:p-2.5">
                    <p className="font-bold text-xs sm:text-sm line-clamp-1 leading-tight" title={actor.name}>
                      {actor.name}
                    </p>
                    {actor.character && (
                      <p className={`text-[10px] sm:text-[11px] font-medium leading-tight mt-0.5 sm:mt-1 line-clamp-1 ${mutedTextClass}`} title={actor.character}>
                        {actor.character}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* More Like This (Recommendations) Section */}
        {movie.recommendations && movie.recommendations.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#00f0ff]">Discover</p>
                <h2 className={`font-[var(--font-bricolage)] text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>
                  More Like This
                </h2>
              </div>
              <span className="border-[2px] border-black bg-[#00f0ff] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000]">
                Recommended
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 md:gap-6">
              {movie.recommendations.map((rec) => (
                <MovieCard key={rec.id} movie={rec} />
              ))}
            </div>
          </section>
        )}
      </div>

      {!showPlayer && <Footer />}

      <TrailerModal
        isOpen={showTrailer}
        onClose={() => setShowTrailer(false)}
        title={movie.title}
        trailerKey={movie.trailer_key}
        trailerName={movie.trailer_name}
        videos={movie.videos}
      />
    </main>
  );
}
