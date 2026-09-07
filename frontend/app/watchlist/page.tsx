"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, BookmarkX, Trash2 } from "lucide-react";
import Navbar from "@/components/Navbar";
import MovieCard from "@/components/MovieCard";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson, type Movie } from "@/lib/api";
import { clearWatchlist, getWatchlist } from "@/lib/watchlist";

export default function WatchlistPage() {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("movie_app_token");
      const user = window.localStorage.getItem("movie_app_user");
      if (!token || !user) {
        router.replace("/login");
        return;
      }
    }

    async function loadWatchlist() {
      const localList = getWatchlist();

      try {
        const data = await fetchJson<{ movies: Movie[] }>("/watchlist");
        const apiList = data.movies ?? [];
        // Merge without duplicates
        const map = new Map<number, Movie>();
        localList.forEach((m) => map.set(m.id, m));
        apiList.forEach((m) => map.set(m.id, m));
        const merged = Array.from(map.values());
        setMovies(merged);
        localStorage.setItem("streamix_watchlist", JSON.stringify(merged));
      } catch {
        setMovies(localList);
      } finally {
        setLoading(false);
      }
    }

    loadWatchlist();

    const handleUpdate = () => {
      setMovies(getWatchlist());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_watchlist_updated", handleUpdate);
      window.addEventListener("storage", handleUpdate);
      return () => {
        window.removeEventListener("streamix_watchlist_updated", handleUpdate);
        window.removeEventListener("storage", handleUpdate);
      };
    }
  }, [router]);

  const handleWatchlistChange = (movieId: number, inList: boolean) => {
    if (!inList) {
      setMovies((curr) => curr.filter((m) => m.id !== movieId));
    }
  };

  const handleClear = () => {
    clearWatchlist();
    setMovies([]);
  };

  const shellClass = darkMode ? "min-h-screen bg-[#0d0d0d] text-[#f5f0e8]" : "min-h-screen bg-[#faf8f5] text-[#111111]";
  const headerBoxClass = darkMode ? "border-black bg-[#141414] text-[#f5f0e8]" : "border-black bg-[#f2f0ed] text-black";

  return (
    <main className={shellClass}>
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 md:px-8">
        <div className={`mb-6 flex flex-col gap-4 border-[2px] p-4 shadow-[4px_4px_0_#000] sm:mb-8 sm:flex-row sm:items-center sm:justify-between sm:p-6 md:border-[3px] ${headerBoxClass}`}>
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[2.5px_2.5px_0_#000] shrink-0">
              <Bookmark className="h-5 w-5 sm:h-6 sm:w-6 fill-black" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] opacity-75">Saved collection</p>
              <h1 className="mt-0.5 font-[var(--font-bricolage)] text-[2rem] font-black uppercase leading-none tracking-[-0.05em] sm:text-[2.6rem]">
                Your Watchlist
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            {movies.length > 0 && (
              <button
                type="button"
                onClick={handleClear}
                className={`inline-flex items-center justify-center border-[2px] border-black px-3.5 py-2 text-[10px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] ${
                  darkMode ? "bg-[#1f1f1f] text-[#f5f0e8] hover:bg-[#2b2b2b]" : "bg-white text-black hover:bg-neutral-100"
                }`}
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5 text-[#ff5376]" />
                Clear all
              </button>
            )}
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center border-[2px] border-black bg-[#ffe600] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000]"
            >
              Explore Movies
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`flex flex-col border-[3px] border-black shadow-[4px_4px_0_#000] animate-pulse ${darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]"}`}>
                <div className="aspect-[2/3] w-full border-b-[3px] border-black bg-black/20" />
                <div className="p-3.5 space-y-2 flex-1">
                  <div className="h-5 w-3/4 bg-black/20" />
                  <div className="h-3 w-1/2 bg-black/20" />
                </div>
              </div>
            ))}
          </div>
        ) : movies.length === 0 ? (
          <div className={`border-[3px] border-dashed border-black p-8 sm:p-12 text-center text-sm ${headerBoxClass}`}>
            <div className="mx-auto mb-3.5 flex h-14 w-14 items-center justify-center border-[2px] border-black bg-neutral-200 text-black shadow-[3px_3px_0_#000] dark:bg-neutral-800 dark:text-[#f5f0e8]">
              <BookmarkX className="h-7 w-7 stroke-[2]" />
            </div>
            <p className="font-bold uppercase tracking-[0.16em]">Your watchlist is empty.</p>
            <p className="mt-1.5 text-xs opacity-75">Click the bookmark icon on any movie card to save it for later.</p>
            <Link
              href="/dashboard"
              className="mt-5 inline-flex items-center justify-center border-[2px] border-black bg-[#ffe600] px-5 py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[2.5px_2.5px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] active:scale-95"
            >
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:gap-6 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {movies.map((movie) => (
              <MovieCard key={movie.id} movie={movie} onWatchlistChange={handleWatchlistChange} />
            ))}
          </div>
        )}
      </div>
      <Footer />
    </main>
  );
}
