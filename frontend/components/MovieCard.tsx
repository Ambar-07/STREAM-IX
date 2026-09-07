"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bookmark } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { isSeries, type Movie } from "@/lib/api";
import { isInWatchlist, toggleWatchlist as toggleWatchlistUtil } from "@/lib/watchlist";

const imageBase = "https://image.tmdb.org/t/p/w500";

const genreMap: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  28: "Action",
  35: "Comedy",
  36: "History",
  21: "Thriller",
  80: "Crime",
  878: "Sci-Fi",
  10751: "Family",
  10752: "War",
  10749: "Romance",
};

export default function MovieCard({
  movie,
  onWatchlistChange,
}: {
  movie: Movie;
  onWatchlistChange?: (movieId: number, inList: boolean) => void;
}) {
  const { darkMode } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [inWatchlist, setInWatchlist] = useState(false);
  const isTv = isSeries(movie);
  const itemHref = isTv ? `/series/${movie.id}` : `/movies/${movie.id}`;

  useEffect(() => {
    function checkWatchlist() {
      setInWatchlist(isInWatchlist(movie.id));
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
  }, [movie.id]);

  const toggleWatchlist = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    const nextState = await toggleWatchlistUtil(movie);
    setInWatchlist(nextState);

    if (onWatchlistChange) {
      onWatchlistChange(movie.id, nextState);
    }
  };

  const poster = movie.poster_path
    ? movie.poster_path.startsWith("http")
      ? movie.poster_path
      : `${imageBase}${movie.poster_path}`
    : "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80";

  const displayGenres = (
    movie.genres && movie.genres.length > 0
      ? movie.genres
      : (movie.genre_ids ?? []).slice(0, 2).map((genreId) => ({
          id: genreId,
          name: genreMap[genreId] ?? "Drama",
        }))
  ).slice(0, 2);

  const displayTitle = movie.title || movie.name || "Untitled";
  const displayYear = movie.release_date?.slice(0, 4) || movie.first_air_date?.slice(0, 4) || "Unknown";

  const cardBg = darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const mutedText = darkMode ? "text-[#f5f0e8]/70" : "text-[#111111]/70";
  const descText = darkMode ? "text-[#f5f0e8]/75" : "text-[#111111]/75";
  const genreBadge = darkMode ? "bg-[#252525] text-[#f5f0e8]" : "bg-neutral-200 text-black";

  return (
    <motion.div
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={prefersReducedMotion ? undefined : { y: -4 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="h-full"
    >
      <div className={`flex flex-col h-full overflow-hidden border-[3px] border-black shadow-[4px_4px_0_#000] transition hover:shadow-[7px_7px_0_#000] ${cardBg}`}>
        <div className="relative aspect-[2/3] w-full overflow-hidden border-b-[3px] border-black bg-neutral-900">
          <Link href={itemHref} className="block h-full w-full">
            <Image
              src={poster}
              alt={displayTitle}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover object-center transition duration-300 hover:scale-105"
            />
          </Link>

          {/* Bookmark Button */}
          <button
            type="button"
            onClick={toggleWatchlist}
            aria-label={inWatchlist ? "Remove from watchlist" : "Add to watchlist"}
            className={`absolute left-2 top-2 sm:left-2.5 sm:top-2.5 flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center border-[2px] border-black shadow-[1.5px_1.5px_0_#000] sm:shadow-[2px_2px_0_#000] transition hover:scale-105 ${
              inWatchlist ? "bg-[#ffe600] text-black" : "bg-white text-black"
            }`}
          >
            <Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${inWatchlist ? "fill-current" : ""}`} />
          </button>

          {/* Rating */}
          <span className="absolute right-2 top-2 sm:right-2.5 sm:top-2.5 border-[2px] border-black bg-[#ffe600] px-1.5 py-0.5 sm:px-2 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[1.5px_1.5px_0_#000] sm:shadow-[2px_2px_0_#000]">
            ★ {movie.vote_average ? movie.vote_average.toFixed(1) : "N/A"}
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-between space-y-2 p-2.5 sm:p-3.5">
          <div className="space-y-1.5 sm:space-y-2">
            <Link href={itemHref} className="line-clamp-1 font-[var(--font-bricolage)] text-[1.1rem] sm:text-[1.3rem] font-black uppercase leading-tight tracking-[-0.04em] transition hover:opacity-80">
              {displayTitle}
            </Link>

            <div className={`flex items-center justify-between text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] ${mutedText}`}>
              <span>{displayYear}</span>
              <div className="flex items-center gap-1">
                {isTv && (
                  <span className="border-[1.5px] border-black bg-[#00f0ff] px-1 sm:px-1.5 py-0.2 text-[8.5px] sm:text-[9px] font-black uppercase text-black shadow-[1px_1px_0_#000]">
                    Series
                  </span>
                )}
                <span className={`border-[1.5px] border-black px-1 sm:px-1.5 py-0.2 text-[8.5px] sm:text-[9px] ${genreBadge}`}>
                  {displayGenres[0]?.name ?? "Drama"}
                </span>
              </div>
            </div>

            <p className={`line-clamp-2 text-[11px] sm:text-xs leading-snug sm:leading-relaxed ${descText}`}>
              {movie.overview || "No overview available."}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
