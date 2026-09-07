"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUpDown,
  Bookmark,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Info,
  LogOut,
  MoonStar,
  Play,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  SunMedium,
  User,
  Users,
  X,
} from "lucide-react";
import MovieCard from "@/components/MovieCard";
import TrailerModal from "@/components/TrailerModal";
import MediaRail from "@/components/MediaRail";
import WatchPartyModal from "@/components/WatchPartyModal";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson, isSeries, openSearchSpotlight, type Movie } from "@/lib/api";
import { clearWatchHistory, formatTimeAgo, getResumeUrl, getWatchHistory, removeFromWatchHistory, type WatchedItem } from "@/lib/watchHistory";
import { getWatchlist, isInWatchlist, toggleWatchlist as toggleWatchlistUtil } from "@/lib/watchlist";

const imageBase = "https://image.tmdb.org/t/p/original";

export const CATALOG_GENRES: { id: number | "all"; name: string; matchIds?: number[]; aliases?: string[] }[] = [
  { id: "all", name: "All Genres" },
  { id: 28, name: "Action", matchIds: [28, 10759], aliases: ["action", "action & adventure"] },
  { id: 878, name: "Sci-Fi", matchIds: [878, 10765], aliases: ["sci-fi", "science fiction", "sci-fi & fantasy"] },
  { id: 12, name: "Adventure", matchIds: [12, 10759], aliases: ["adventure", "action & adventure"] },
  { id: 16, name: "Animation", matchIds: [16], aliases: ["animation", "anime"] },
  { id: 35, name: "Comedy", matchIds: [35], aliases: ["comedy"] },
  { id: 80, name: "Crime", matchIds: [80], aliases: ["crime"] },
  { id: 18, name: "Drama", matchIds: [18], aliases: ["drama"] },
  { id: 14, name: "Fantasy", matchIds: [14, 10765], aliases: ["fantasy", "sci-fi & fantasy"] },
  { id: 27, name: "Horror", matchIds: [27, 9648], aliases: ["horror", "mystery"] },
  { id: 10749, name: "Romance", matchIds: [10749], aliases: ["romance", "romantic"] },
  { id: 53, name: "Thriller", matchIds: [53, 9648], aliases: ["thriller", "mystery", "suspense"] },
];

const genreNameMap: Record<number, string> = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  28: "Action",
  35: "Comedy",
  36: "History",
  53: "Thriller",
  80: "Crime",
  878: "Science Fiction",
  10751: "Family",
  10752: "War",
  10749: "Romance",
};

export interface CurrentUser {
  id?: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  preferredServer?: string;
}

const genreLookupMap = new Map<number | "all", { matchIds: number[]; aliases: string[] }>();
for (const g of CATALOG_GENRES) {
  genreLookupMap.set(g.id, {
    matchIds: g.matchIds ?? (typeof g.id === "number" ? [g.id] : []),
    aliases: g.aliases ?? [g.name.toLowerCase()],
  });
}

const fallbackHero: Movie = {
  id: 0,
  title: "Loading movie suggestion...",
  overview: "Fetching the latest TMDB recommendation...",
  backdrop_path: "",
  poster_path: "",
  vote_average: 0,
  release_date: "",
  genre_ids: [],
  genres: [],
};

export default function DashboardPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [watchPartyModalOpen, setWatchPartyModalOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const [movies, setMovies] = useState<Movie[]>([]);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [topRatedMovies, setTopRatedMovies] = useState<Movie[]>([]);
  const [railsLoading, setRailsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredTimerKey, setFeaturedTimerKey] = useState(0);
  const [isHeroHovered, setIsHeroHovered] = useState(false);
  const [showHeroTrailer, setShowHeroTrailer] = useState(false);
  const [lastWatched, setLastWatched] = useState<WatchedItem[]>([]);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [catalogPage, setCatalogPage] = useState(0);
  const [selectedGenre, setSelectedGenre] = useState<number | "all">("all");
  const [mediaTypeFilter, setMediaTypeFilter] = useState<"all" | "movie" | "tv">("all");
  const [sortBy, setSortBy] = useState<"trending" | "rating" | "date" | "title">("trending");
  const pageSize = 15;
  const prefersReducedMotion = useReducedMotion();
  const { darkMode, toggleTheme } = useTheme();

  // Load and synchronize user account data
  useEffect(() => {
    function loadUserData() {
      if (typeof window === "undefined") return;
      const rawUser = window.localStorage.getItem("movie_app_user");
      if (rawUser) {
        try {
          setCurrentUser(JSON.parse(rawUser));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    }

    loadUserData();

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_user_updated", loadUserData);
      window.addEventListener("storage", loadUserData);
      return () => {
        window.removeEventListener("streamix_user_updated", loadUserData);
        window.removeEventListener("storage", loadUserData);
      };
    }
  }, []);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }

    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userDropdownOpen]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("movie_app_token");
      localStorage.removeItem("movie_app_user");
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));
      setUserDropdownOpen(false);
      router.push("/login");
    }
  };

  useEffect(() => {
    function updateWatchlistCount() {
      setWatchlistCount(getWatchlist().length);
    }
    updateWatchlistCount();
    if (typeof window !== "undefined") {
      window.addEventListener("streamix_watchlist_updated", updateWatchlistCount);
      window.addEventListener("storage", updateWatchlistCount);
      return () => {
        window.removeEventListener("streamix_watchlist_updated", updateWatchlistCount);
        window.removeEventListener("storage", updateWatchlistCount);
      };
    }
  }, []);

  useEffect(() => {
    function loadHistory() {
      setLastWatched(getWatchHistory());
    }

    loadHistory();

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_history_updated", loadHistory);
      window.addEventListener("storage", loadHistory);
      return () => {
        window.removeEventListener("streamix_history_updated", loadHistory);
        window.removeEventListener("storage", loadHistory);
      };
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("movie_app_token");
      const user = window.localStorage.getItem("movie_app_user");
      if (!token || !user) {
        router.replace("/login");
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    let isMounted = true;

    async function loadMovies() {
      try {
        setLoading(true);
        setRailsLoading(true);

        const [movieRes, tvRes, popularRes, topRatedRes] = await Promise.allSettled([
          fetchJson<{ movies: Movie[] }>("/movies/trending"),
          fetchJson<{ series: Movie[] }>("/tv/trending"),
          fetchJson<{ movies: Movie[] }>("/movies/popular"),
          fetchJson<{ movies: Movie[] }>("/movies/top-rated"),
        ]);

        const loadedMovies = movieRes.status === "fulfilled" ? movieRes.value?.movies ?? [] : [];
        const loadedSeries = tvRes.status === "fulfilled" ? tvRes.value?.series ?? [] : [];
        const loadedPopular = popularRes.status === "fulfilled" ? popularRes.value?.movies ?? [] : [];
        const loadedTopRated = topRatedRes.status === "fulfilled" ? topRatedRes.value?.movies ?? [] : [];

        const seen = new Set<string>();
        const combined: Movie[] = [];

        const maxLen = Math.max(loadedMovies.length, loadedSeries.length);
        for (let i = 0; i < maxLen; i++) {
          if (i < loadedMovies.length) {
            const m = loadedMovies[i];
            if (m && m.id) {
              const key = `movie-${m.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                combined.push(m);
              }
            }
          }
          if (i < loadedSeries.length) {
            const s = loadedSeries[i];
            if (s && s.id) {
              const key = `tv-${s.id}`;
              if (!seen.has(key)) {
                seen.add(key);
                combined.push(s);
              }
            }
          }
        }

        if (isMounted) {
          setMovies(combined);
          setPopularMovies(loadedPopular);
          setTopRatedMovies(loadedTopRated);
          setFeaturedIndex(0);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) setMovies([]);
      } finally {
        if (isMounted) {
          setLoading(false);
          setRailsLoading(false);
        }
      }
    }

    loadMovies();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredMovies = useMemo(() => (movies.length > 0 ? movies.slice(0, 6) : [fallbackHero]), [movies]);

  const handleNextFeatured = () => {
    if (!featuredMovies.length) return;
    setFeaturedIndex((current) => (current + 1) % featuredMovies.length);
    setFeaturedTimerKey((k) => k + 1);
  };

  const handlePrevFeatured = () => {
    if (!featuredMovies.length) return;
    setFeaturedIndex((current) => (current - 1 + featuredMovies.length) % featuredMovies.length);
    setFeaturedTimerKey((k) => k + 1);
  };

  const handleSelectFeatured = (idx: number) => {
    setFeaturedIndex(idx);
    setFeaturedTimerKey((k) => k + 1);
  };

  useEffect(() => {
    if (featuredMovies.length <= 1 || isHeroHovered) return;

    const interval = setInterval(() => {
      setFeaturedIndex((current) => (current + 1) % featuredMovies.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [featuredMovies.length, featuredTimerKey, isHeroHovered]);

  const featuredMovie = useMemo(
    () => featuredMovies[featuredIndex] ?? featuredMovies[0] ?? fallbackHero,
    [featuredMovies, featuredIndex]
  );
  const [featuredInWatchlist, setFeaturedInWatchlist] = useState(false);

  useEffect(() => {
    function checkFeaturedWatchlist() {
      if (featuredMovie?.id) {
        setFeaturedInWatchlist(isInWatchlist(featuredMovie.id));
      }
    }

    checkFeaturedWatchlist();

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_watchlist_updated", checkFeaturedWatchlist);
      window.addEventListener("storage", checkFeaturedWatchlist);
      return () => {
        window.removeEventListener("streamix_watchlist_updated", checkFeaturedWatchlist);
        window.removeEventListener("storage", checkFeaturedWatchlist);
      };
    }
  }, [featuredMovie?.id]);
  const featuredGenres = useMemo(() => {
    if (featuredMovie.genres && featuredMovie.genres.length > 0) {
      return featuredMovie.genres.slice(0, 3);
    }

    const inferredGenres = (featuredMovie.genre_ids ?? []).slice(0, 3).map((genreId) => ({
      id: genreId,
      name: genreNameMap[genreId] ?? "Drama",
    }));

    return inferredGenres.length > 0 ? inferredGenres : [{ id: 18, name: "Drama" }, { id: 53, name: "Thriller" }];
  }, [featuredMovie]);

  const handleSelectGenre = (genreId: number | "all") => {
    setSelectedGenre(genreId);
    setCatalogPage(0);
  };

  const handleSelectMediaType = (type: "all" | "movie" | "tv") => {
    setMediaTypeFilter(type);
    setCatalogPage(0);
  };

  const handleSelectSort = (sort: "trending" | "rating" | "date" | "title") => {
    setSortBy(sort);
    setCatalogPage(0);
  };

  // Preload upcoming featured slide backdrop image for zero latency & flicker-free auto-rotation
  useEffect(() => {
    if (featuredMovies.length > 1) {
      const nextIdx = (featuredIndex + 1) % featuredMovies.length;
      const nextMovie = featuredMovies[nextIdx];
      const nextPath = nextMovie?.backdrop_path || nextMovie?.poster_path;
      if (nextPath && typeof window !== "undefined") {
        const nextUrl = nextPath.startsWith("http") ? nextPath : `${imageBase}${nextPath}`;
        const img = new window.Image();
        img.src = nextUrl;
      }
    }
  }, [featuredIndex, featuredMovies]);

  const hasGenre = (movie: Movie, genreId: number | "all") => {
    if (genreId === "all") return true;

    const target = genreLookupMap.get(genreId);
    if (!target) return true;

    // Check numeric genre_ids
    if (movie.genre_ids && movie.genre_ids.some((id) => target.matchIds.includes(id))) {
      return true;
    }

    // Check genre objects
    if (movie.genres && movie.genres.length > 0) {
      for (const g of movie.genres) {
        if (typeof g.id === "number" && target.matchIds.includes(g.id)) return true;
        const gName = (g.name || "").toLowerCase();
        if (target.aliases.some((alias) => gName.includes(alias) || alias.includes(gName))) {
          return true;
        }
      }
    }

    return false;
  };

  const filteredCatalog = useMemo(() => {
    if (!movies.length) return [featuredMovie];

    let result = [...movies];

    if (mediaTypeFilter === "movie") {
      result = result.filter((movie) => !isSeries(movie));
    } else if (mediaTypeFilter === "tv") {
      result = result.filter((movie) => isSeries(movie));
    }

    if (selectedGenre !== "all") {
      result = result.filter((movie) => hasGenre(movie, selectedGenre));
    }

    if (sortBy === "rating") {
      result.sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0));
    } else if (sortBy === "date") {
      result.sort((a, b) => {
        const dateA = a.release_date || a.first_air_date || "";
        const dateB = b.release_date || b.first_air_date || "";
        return dateB.localeCompare(dateA);
      });
    } else if (sortBy === "title") {
      result.sort((a, b) => {
        const titleA = (a.title || a.name || "").toLowerCase();
        const titleB = (b.title || b.name || "").toLowerCase();
        return titleA.localeCompare(titleB);
      });
    }

    return result;
  }, [movies, featuredMovie, mediaTypeFilter, selectedGenre, sortBy]);

  const movieCount = useMemo(() => movies.filter((m) => !isSeries(m)).length, [movies]);
  const seriesCount = useMemo(() => movies.filter((m) => isSeries(m)).length, [movies]);
  const isFilterActive = selectedGenre !== "all" || mediaTypeFilter !== "all" || sortBy !== "trending";

  const handleResetFilters = () => {
    setSelectedGenre("all");
    setMediaTypeFilter("all");
    setSortBy("trending");
    setCatalogPage(0);
  };

  const totalCatalogPages = Math.max(1, Math.ceil(filteredCatalog.length / pageSize));

  const paginatedCatalog = useMemo(() => {
    const start = catalogPage * pageSize;
    return filteredCatalog.slice(start, start + pageSize);
  }, [filteredCatalog, catalogPage, pageSize]);

  const backgroundImage = featuredMovie.backdrop_path
    ? featuredMovie.backdrop_path.startsWith("http")
      ? featuredMovie.backdrop_path
      : `${imageBase}${featuredMovie.backdrop_path}`
    : featuredMovie.poster_path
      ? featuredMovie.poster_path.startsWith("http")
        ? featuredMovie.poster_path
        : `${imageBase}${featuredMovie.poster_path}`
      : "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=1600&q=80";

  const mediaHref = (movie: Movie) => (isSeries(movie) ? `/series/${movie.id}` : `/movies/${movie.id}`);

  const handleRemoveHistoryItem = (id: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    removeFromWatchHistory(id);
    setLastWatched((curr) => curr.filter((item) => item.id !== id));
  };

  const handleClearHistory = () => {
    clearWatchHistory();
    setLastWatched([]);
  };

  const watchedMediaImage = (item: WatchedItem) => {
    const path = item.backdrop_path || item.poster_path;
    if (!path) return "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80";
    return path.startsWith("http") ? path : `${imageBase}${path}`;
  };

  const shellClass = darkMode ? "min-h-screen bg-[#0d0d0d] text-[#f5f0e8]" : "min-h-screen bg-[#faf8f5] text-[#111111]";
  const headerClass = darkMode ? "border-black bg-[#121212]" : "border-black bg-[#faf8f5]";
  const topBarClass = darkMode ? "border-black bg-[#1a1a1a]" : "border-black bg-[#f2f0ed]";
  const iconButtonClass = darkMode ? "bg-[#1d1d1d] text-[#f5f0e8]" : "bg-white text-[#111111]";

  return (
    <main className={shellClass}>
      <div className="mx-auto max-w-[1440px] px-3 py-3 sm:px-4 md:px-8">
        <header className={`border-[2px] border-black shadow-[4px_4px_0_#000] md:border-[3px] ${headerClass}`}>
          <div className={`flex items-center justify-between gap-2 border-b-[2px] border-black px-3 py-2.5 md:border-b-[3px] md:px-6 md:py-3 ${topBarClass}`}>
            <div className="flex items-center justify-start">
              <button
                type="button"
                aria-label="Open Search Spotlight"
                onClick={openSearchSpotlight}
                className="flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] active:scale-95"
              >
                <Search className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center justify-center">
              <Link
                href="/dashboard"
                aria-label="Streamix Dashboard"
                className="flex items-center justify-center transition hover:-translate-y-0.5 active:scale-95"
              >
                <Image
                  src="/icon.svg"
                  alt="Streamix Logo"
                  width={40}
                  height={40}
                  className="h-[38px] w-[38px] sm:h-10 sm:w-10 border-[2px] border-black shadow-[2.5px_2.5px_0_#000] hover:shadow-[4px_4px_0_#000] shrink-0 transition"
                  priority
                />
              </Link>
            </div>

            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
              <Link
                href="/watchlist"
                aria-label="Open watchlist"
                className={`flex h-10 items-center gap-1.5 border-[2px] border-black px-2.5 sm:px-3 text-[10px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] ${
                  darkMode ? "bg-[#1d1d1d] text-[#f5f0e8] hover:bg-[#252525]" : "bg-white text-[#111111] hover:bg-neutral-100"
                }`}
              >
                <Bookmark className="h-4 w-4 shrink-0" />
                <span className="hidden sm:inline">Watchlist</span>
                {watchlistCount > 0 && (
                  <span className="border-[1.5px] border-black bg-[#00f0ff] px-1.5 py-0.2 text-[9px] font-black text-black">
                    {watchlistCount}
                  </span>
                )}
              </Link>

              <button
                type="button"
                aria-label="Toggle dark mode"
                onClick={toggleTheme}
                className={`flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] ${iconButtonClass}`}
              >
                {darkMode ? (
                  <SunMedium className="h-4 w-4" style={{ color: "#f5f0e8" }} />
                ) : (
                  <MoonStar className="h-4 w-4" style={{ color: "#111111" }} />
                )}
              </button>

              {/* User Account Profile & Dropdown */}
              <div className="relative" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen((prev) => !prev)}
                  aria-label="User Account Menu"
                  aria-expanded={userDropdownOpen}
                  className={`flex h-10 items-center gap-1.5 sm:gap-2 border-[2px] border-black px-2 sm:px-2.5 text-xs font-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] active:scale-95 cursor-pointer ${
                    userDropdownOpen ? "bg-[#00f0ff] text-black" : iconButtonClass
                  }`}
                >
                  <div className="flex h-6 w-6 items-center justify-center border border-black bg-[#ffe600] text-sm leading-none shrink-0 shadow-[1px_1px_0_#000]">
                    {currentUser?.avatar || "🍿"}
                  </div>
                  <span className="hidden md:inline max-w-[85px] truncate uppercase tracking-wider text-[10px] font-black">
                    {currentUser?.displayName || currentUser?.username || "Account"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 shrink-0 opacity-70 transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {userDropdownOpen && (
                  <div
                    className={`absolute right-0 top-full mt-2 w-64 border-[3px] border-black p-3 shadow-[6px_6px_0_#000] z-50 ${
                      darkMode ? "bg-[#161616] text-[#f5f0e8]" : "bg-white text-[#111111]"
                    }`}
                  >
                    {/* Dropdown Header */}
                    <div className="mb-3 border-b-[2px] border-black pb-2.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#ffe600] text-xl shadow-[1.5px_1.5px_0_#000] shrink-0">
                          {currentUser?.avatar || "🍿"}
                        </div>
                        <div className="overflow-hidden min-w-0">
                          <p className="text-xs font-black uppercase tracking-wider truncate">
                            {currentUser?.displayName || currentUser?.username || "Account"}
                          </p>
                          <p className="text-[10px] opacity-70 truncate font-mono">
                            {currentUser?.email || (currentUser?.username ? `@${currentUser.username}` : "Active Session")}
                          </p>
                          <div className="mt-1 inline-flex items-center gap-1 border border-black bg-[#00f0ff] px-1 py-0.2 text-[8.5px] font-black uppercase text-black">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            <span>AUTHENTICATED</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Dropdown Links */}
                    <div className="space-y-1.5 text-xs font-bold uppercase tracking-wider">
                      <Link
                        href="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 border-[1.5px] border-black p-2 hover:bg-[#00f0ff] hover:text-black transition"
                      >
                        <Settings className="h-3.5 w-3.5 shrink-0" />
                        <span>Account & Settings</span>
                      </Link>

                      <Link
                        href="/watchlist"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center justify-between border-[1.5px] border-black p-2 hover:bg-[#ffe600] hover:text-black transition"
                      >
                        <div className="flex items-center gap-2">
                          <Bookmark className="h-3.5 w-3.5 shrink-0" />
                          <span>My Watchlist</span>
                        </div>
                        {watchlistCount > 0 && (
                          <span className="border border-black bg-black px-1.5 py-0.2 text-[9px] font-black text-white">
                            {watchlistCount}
                          </span>
                        )}
                      </Link>

                      <button
                        type="button"
                        onClick={handleSignOut}
                        className="w-full flex items-center gap-2 border-[1.5px] border-black bg-[#ff5376] text-black p-2 hover:bg-[#ff3355] transition cursor-pointer text-left mt-2 font-black"
                      >
                        <LogOut className="h-3.5 w-3.5 shrink-0" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Streamix Member Welcome Bar */}
        <div
          className={`mt-3 flex items-center justify-between border-[2px] border-black px-3.5 py-2 shadow-[3px_3px_0_#000] md:border-[3px] md:px-5 md:py-2.5 ${
            darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#f5f2eb] text-[#111111]"
          }`}
        >
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center border-[2px] border-black bg-[#ffe600] text-sm sm:text-base shadow-[1.5px_1.5px_0_#000] shrink-0">
              {currentUser?.avatar || "🍿"}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                Welcome back,{" "}
                <span className="bg-[#00f0ff] text-black px-1.5 py-0.5 border border-black shadow-[1px_1px_0_#000]">
                  {currentUser?.displayName || currentUser?.username || "Member"}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setWatchPartyModalOpen(true)}
              className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3 py-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:bg-[#00f0ff] hover:shadow-[3px_3px_0_#000] active:scale-95 cursor-pointer touch-manipulation"
              title="Start or join a synchronized watch party"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Watch Party</span>
            </button>
          </div>
        </div>

        <section
          onMouseEnter={() => setIsHeroHovered(true)}
          onMouseLeave={() => setIsHeroHovered(false)}
          className="mt-4 grid gap-4 xl:grid-cols-[1.35fr_0.9fr] xl:h-[480px]"
        >
          {/* Hero Media Backdrop with Fixed Consistent Dimensions & Smooth Cross-fade */}
          <div
            className={`relative aspect-video w-full overflow-hidden border-[2px] border-black shadow-[4px_4px_0_#000] sm:aspect-[16/9] md:border-[3px] md:shadow-[6px_6px_0_#000] xl:aspect-auto xl:h-full ${darkMode ? "bg-[#1c1c1c]" : "bg-[#d9d7d4]"}`}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`backdrop-${featuredMovie.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="absolute inset-0"
              >
                <Image
                  src={backgroundImage}
                  alt={featuredMovie.title || featuredMovie.name || "Featured backdrop"}
                  fill
                  priority={featuredIndex === 0}
                  sizes="(max-width: 1280px) 100vw, 60vw"
                  className="object-cover object-center"
                  quality={75}
                />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.68),rgba(0,0,0,0.12))] pointer-events-none" />

            {/* Bottom Metadata Bar */}
            <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between border-t-[3px] border-black px-4 py-3 backdrop-blur-sm z-10 ${darkMode ? "bg-[#0d0d0d]/90" : "bg-[#faf8f5]/90"}`}>
              <AnimatePresence mode="wait">
                <motion.span
                  key={`badge-type-${featuredMovie.id}`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`text-[10px] font-bold uppercase tracking-[0.18em] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}
                >
                  {isSeries(featuredMovie) ? "TV Series pick" : "Movie pick"}
                </motion.span>
              </AnimatePresence>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`badge-stats-${featuredMovie.id}`}
                  initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-2"
                >
                  <span className="border-[2px] border-black bg-[#ffe600] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-[1.5px_1.5px_0_#000]">
                    ★ {featuredMovie.vote_average ? featuredMovie.vote_average.toFixed(1) : "N/A"}
                  </span>
                  <span className="border-[2px] border-black bg-[#00f0ff] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black shadow-[1.5px_1.5px_0_#000]">
                    {(featuredMovie.release_date || featuredMovie.first_air_date)?.slice(0, 4) ?? "N/A"}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Hero Content Panel with Consistent Fixed Dimensions */}
          <div
            className={`relative flex flex-col justify-between overflow-hidden border-[2px] border-black p-4 shadow-[4px_4px_0_#000] sm:p-5 md:border-[3px] md:p-6 md:shadow-[6px_6px_0_#000] xl:h-full ${darkMode ? "bg-[#111111]" : "bg-[#faf8f5]"}`}
          >
            {/* Auto-Rotation Progress Bar */}
            <div className="absolute top-0 left-0 right-0 h-[3.5px] bg-black/15 overflow-hidden z-20">
              <motion.div
                key={`progress-${featuredMovie.id}-${featuredTimerKey}`}
                initial={{ width: "0%" }}
                animate={{ width: isHeroHovered ? undefined : "100%" }}
                transition={{ duration: 7, ease: "linear" }}
                className="h-full bg-[#ffe600]"
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={featuredMovie.id}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-1 flex-col justify-between h-full pt-1"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <div className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] ${darkMode ? "text-[#f5f0e8]/70" : "text-black/70"}`}>
                      <span className="inline-block h-2 w-2 border border-black bg-[#ff5376] animate-pulse" />
                      <span>Featured Spotlight</span>
                      <span className="border-[1.5px] border-black bg-[#ffe600] px-1.5 py-0.2 text-[9px] font-black text-black">
                        0{featuredIndex + 1} / 0{featuredMovies.length}
                      </span>
                    </div>

                    {/* Quick navigation arrows */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handlePrevFeatured}
                        aria-label="Previous featured movie"
                        className={`flex h-7 w-7 items-center justify-center border-[2px] border-black shadow-[1.5px_1.5px_0_#000] transition hover:-translate-y-0.5 active:scale-95 ${
                          darkMode ? "bg-[#1f1f1f] text-[#f5f0e8] hover:bg-[#2a2a2a]" : "bg-white text-black hover:bg-neutral-100"
                        }`}
                      >
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextFeatured}
                        aria-label="Next featured movie"
                        className={`flex h-7 w-7 items-center justify-center border-[2px] border-black shadow-[1.5px_1.5px_0_#000] transition hover:-translate-y-0.5 active:scale-95 ${
                          darkMode ? "bg-[#1f1f1f] text-[#f5f0e8] hover:bg-[#2a2a2a]" : "bg-white text-black hover:bg-neutral-100"
                        }`}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Punchy Kinetic Title - Locked Line-clamp */}
                  <h1 className={`mt-3 font-[var(--font-bricolage)] text-[1.8rem] font-black uppercase leading-[0.95] tracking-[-0.05em] break-words line-clamp-2 sm:text-[2.4rem] md:text-[3.2rem] lg:text-[3.6rem] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
                    {featuredMovie.title || featuredMovie.name || "Featured Title"}
                  </h1>

                  <p className={`mt-3 max-w-lg text-[13px] leading-6 line-clamp-3 sm:mt-4 sm:text-[15px] sm:leading-7 ${darkMode ? "text-[#f5f0e8]/75" : "text-black/75"}`}>
                    {featuredMovie.overview}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-black sm:mt-5">
                    {featuredGenres.map((genre) => (
                      <span
                        key={genre.id}
                        className={`border-[2px] border-black px-2 py-1 shadow-[1.5px_1.5px_0_#000] ${
                          (genre?.name || "").toLowerCase() === "action"
                            ? "bg-[#00f0ff]"
                            : (genre?.name || "").toLowerCase() === "comedy"
                              ? "bg-[#ffe600]"
                              : (genre?.name || "").toLowerCase() === "romance"
                                ? "bg-[#ff5376]"
                                : (genre?.name || "").toLowerCase() === "thriller"
                                  ? "bg-[#00f0ff]"
                                  : "bg-white"
                        }`}
                      >
                        {genre.name}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mt-4 sm:mt-6 flex flex-wrap items-center gap-2 sm:gap-3">
                    <Link
                      href={mediaHref(featuredMovie)}
                      className="inline-flex h-10 sm:h-11 md:h-12 items-center justify-center rounded-lg border-[3px] border-black bg-[#ffe600] px-3 sm:px-4 md:px-5 text-[9.5px] sm:text-[10px] md:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:scale-95 transition"
                    >
                      <Play className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
                      {isSeries(featuredMovie) ? "Watch series" : "Play now"}
                    </Link>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!featuredMovie?.id) return;
                        const nextState = await toggleWatchlistUtil(featuredMovie);
                        setFeaturedInWatchlist(nextState);
                      }}
                      aria-label={featuredInWatchlist ? "Remove from watchlist" : "Add to watchlist"}
                      className={`inline-flex h-10 sm:h-11 md:h-12 items-center justify-center rounded-lg border-[3px] border-black px-3 sm:px-4 text-[9.5px] sm:text-[10px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:scale-95 ${
                        featuredInWatchlist
                          ? "bg-[#00f0ff] text-black"
                          : darkMode
                            ? "bg-[#222222] text-[#f5f0e8] hover:bg-[#2c2c2c]"
                            : "bg-white text-black hover:bg-neutral-100"
                      }`}
                    >
                      <Bookmark className={`mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${featuredInWatchlist ? "fill-current" : ""}`} />
                      {featuredInWatchlist ? "In Watchlist" : "Add to Watchlist"}
                    </button>
                    {featuredMovie?.trailer_key && (
                      <button
                        type="button"
                        onClick={() => setShowHeroTrailer(true)}
                        className="inline-flex h-10 sm:h-11 md:h-12 items-center justify-center rounded-lg border-[3px] border-black bg-[#ff5376] px-3 sm:px-4 text-[9.5px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:scale-95 transition"
                      >
                        <Film className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        Trailer
                      </button>
                    )}
                    <Link
                      href={mediaHref(featuredMovie)}
                      className={`inline-flex h-10 sm:h-11 md:h-12 items-center justify-center rounded-lg border-[3px] border-black px-3 sm:px-4 text-[9.5px] sm:text-[10px] font-black uppercase tracking-[0.18em] shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0_#000] active:scale-95 transition ${
                        darkMode ? "bg-[#f5f0e8] text-black" : "bg-white text-black"
                      }`}
                    >
                      <Info className="mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      More info
                    </Link>
                  </div>

                  {/* Segmented slide indicators */}
                  <div className="mt-5 pt-3 border-t-[2px] border-black/15 flex items-center gap-1.5">
                    {featuredMovies.map((item, idx) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => handleSelectFeatured(idx)}
                        aria-label={`Jump to spotlight title ${idx + 1}: ${item.title || item.name}`}
                        className={`h-2 transition-all duration-300 border-[1.5px] border-black ${
                          idx === featuredIndex
                            ? "w-8 bg-[#ffe600] shadow-[1px_1px_0_#000]"
                            : darkMode
                              ? "w-2.5 bg-neutral-700 hover:bg-neutral-500"
                              : "w-2.5 bg-neutral-300 hover:bg-neutral-400"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* Last Watched Section */}
        {lastWatched.length > 0 && (
          <section className={`mt-8 border-[2px] border-black p-4 shadow-[4px_4px_0_#000] sm:mt-10 md:border-[3px] md:shadow-[6px_6px_0_#000] ${darkMode ? "bg-[#111111]" : "bg-[#faf8f5]"}`}>
            <div className={`mb-4 flex items-center justify-between gap-3 border-b-[2px] border-black pb-3 md:border-b-[3px] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 border-[2px] border-black bg-[#00f0ff]" />
                <h2 className={`font-[var(--font-bricolage)] text-[1.6rem] font-black uppercase leading-none tracking-[-0.05em] sm:text-[2rem] md:text-[2.2rem] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
                  Last Watched
                </h2>
                <span className="border-[1.5px] border-black bg-[#ffe600] px-1.5 py-0.5 text-[9px] font-black uppercase text-black">
                  {lastWatched.length}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearHistory}
                className={`border-[2px] border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8] hover:bg-[#252525]" : "bg-white text-black hover:bg-neutral-100"}`}
              >
                Clear History
              </button>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {lastWatched.map((item) => (
                <div
                  key={`${item.media_type}-${item.id}`}
                  className={`group relative flex flex-col justify-between border-[3px] border-black shadow-[4px_4px_0_#000] transition hover:-translate-y-1 hover:shadow-[7px_7px_0_#000] ${darkMode ? "bg-[#141414]" : "bg-[#faf8f5]"}`}
                >
                  <button
                    type="button"
                    onClick={(e) => handleRemoveHistoryItem(item.id, e)}
                    aria-label={`Remove ${item.title} from history`}
                    className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center border-[2px] border-black bg-white text-black shadow-[2px_2px_0_#000] opacity-85 transition hover:bg-[#ff5376] hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <Link href={getResumeUrl(item)} className="flex flex-1 flex-col justify-between h-full">
                    <div>
                      <div className="relative w-full aspect-video overflow-hidden border-b-[3px] border-black bg-neutral-950">
                        <Image
                          src={watchedMediaImage(item)}
                          alt={item.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 20vw"
                          className="object-cover object-center transition duration-300 group-hover:scale-105 opacity-90 group-hover:opacity-100"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent pointer-events-none" />

                        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
                          {item.media_type === "tv" ? (
                            <span className="border-[1.5px] border-black bg-[#00f0ff] px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow-[1px_1px_0_#000]">
                              S{item.season ?? 1} : E{item.episode ?? 1}
                            </span>
                          ) : (
                            <span className="border-[1.5px] border-black bg-[#ffe600] px-1.5 py-0.5 text-[9px] font-black uppercase text-black shadow-[1px_1px_0_#000]">
                              Movie
                            </span>
                          )}
                          <span className="flex items-center gap-1 border-[1.5px] border-black bg-black/85 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTimeAgo(item.watchedAt)}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 p-3">
                        <h3 className={`font-[var(--font-bricolage)] text-[1.25rem] font-black uppercase leading-tight tracking-[-0.04em] line-clamp-1 ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
                          {item.title}
                        </h3>
                        {item.episodeName && item.media_type === "tv" ? (
                          <p className={`line-clamp-1 text-[11px] font-bold uppercase tracking-[0.08em] ${darkMode ? "text-[#00f0ff]" : "text-sky-700"}`} title={item.episodeName}>
                            E{item.episode ?? 1} • {item.episodeName}
                          </p>
                        ) : (
                          <p className={`line-clamp-1 text-[11px] font-medium ${darkMode ? "text-[#f5f0e8]/65" : "text-black/65"}`}>
                            {item.overview || "Click to resume playback."}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="p-3 pt-0">
                      <span className="inline-flex w-full items-center justify-center border-[2px] border-black bg-[#ffe600] py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] transition group-hover:bg-[#00f0ff]">
                        <Play className="mr-1.5 h-3 w-3 fill-current" />
                        {item.media_type === "tv" ? `Resume S${item.season ?? 1} : E${item.episode ?? 1}` : "Resume movie"}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Curated Discovery Rails: Popular & Top Rated */}
        {selectedGenre === "all" && mediaTypeFilter === "all" && (
          <>
            <MediaRail
              title="Popular Blockbusters"
              tag="Trending & Hot"
              tagColor="#00f0ff"
              icon="flame"
              items={popularMovies}
              loading={railsLoading}
            />

            <MediaRail
              title="Top Rated All-Time Classics"
              tag="Critically Acclaimed"
              tagColor="#ffe600"
              icon="star"
              items={topRatedMovies}
              loading={railsLoading}
            />
          </>
        )}

        <section className={`mt-8 border-[2px] border-black p-4 shadow-[4px_4px_0_#000] sm:mt-10 md:border-[3px] md:shadow-[6px_6px_0_#000] ${darkMode ? "bg-[#111111]" : "bg-[#faf8f5]"}`}>
          <div className={`mb-4 flex items-center justify-between gap-3 border-b-[2px] border-black pb-3 md:border-b-[3px] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 border-[2px] border-black bg-[#ffe600]" />
              <h2 className={`font-[var(--font-bricolage)] text-[1.6rem] font-black uppercase leading-none tracking-[-0.05em] sm:text-[2rem] md:text-[2.2rem] ${darkMode ? "text-[#f5f0e8]" : "text-black"}`}>
                {selectedGenre !== "all"
                  ? `${CATALOG_GENRES.find((g) => g.id === selectedGenre)?.name ?? "Catalog"} (${filteredCatalog.length})`
                  : `Trending Now (${filteredCatalog.length})`}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-[0.16em] opacity-75 hidden sm:inline">
                Page {catalogPage + 1} of {totalCatalogPages}
              </span>
              <button
                type="button"
                disabled={catalogPage === 0}
                onClick={() => setCatalogPage((curr) => Math.max(0, curr - 1))}
                aria-label="Previous page"
                className={`flex h-9 w-9 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] disabled:opacity-30 disabled:pointer-events-none transition hover:-translate-y-0.5 ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8]" : "bg-[#faf8f5] text-black"}`}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                disabled={catalogPage >= totalCatalogPages - 1}
                onClick={() => setCatalogPage((curr) => Math.min(totalCatalogPages - 1, curr + 1))}
                aria-label="Next page"
                className={`flex h-9 w-9 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] disabled:opacity-30 disabled:pointer-events-none transition hover:-translate-y-0.5 ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8]" : "bg-[#faf8f5] text-black"}`}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Catalog Filtering & Discovery Controls */}
          <div className="mb-5 space-y-3">
            {/* Top Row: Media Type Tabs + Sort Selector */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
              {/* Media Type Segmented Pills */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                {[
                  { key: "all", label: "All Titles", count: movies.length },
                  { key: "movie", label: "Movies", count: movieCount },
                  { key: "tv", label: "TV Series", count: seriesCount },
                ].map((tab) => {
                  const active = mediaTypeFilter === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => handleSelectMediaType(tab.key as "all" | "movie" | "tv")}
                      className={`flex items-center gap-1.5 border-[2px] border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] transition ${
                        active
                          ? "bg-[#ffe600] text-black shadow-[2px_2px_0_#000]"
                          : darkMode
                            ? "bg-[#1d1d1d] text-[#f5f0e8] hover:bg-[#262626] shadow-[1.5px_1.5px_0_#000]"
                            : "bg-white text-[#111111] hover:bg-neutral-100 shadow-[1.5px_1.5px_0_#000]"
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span
                        className={`border-[1.5px] border-black px-1.5 py-0.2 text-[9px] font-black ${
                          active ? "bg-black text-[#ffe600]" : "bg-[#00f0ff] text-black"
                        }`}
                      >
                        {tab.count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Sort By Dropdown */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000]">
                  <ArrowUpDown className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Sort:</span>
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => handleSelectSort(e.target.value as "trending" | "rating" | "date" | "title")}
                    className={`h-[34px] appearance-none border-[2px] border-black px-3 pr-8 text-[10px] font-black uppercase tracking-[0.12em] shadow-[2px_2px_0_#000] outline-none cursor-pointer ${
                      darkMode ? "bg-[#1d1d1d] text-[#f5f0e8]" : "bg-white text-[#111111]"
                    }`}
                  >
                    <option value="trending">Trending Velocity</option>
                    <option value="rating">Rating: High to Low</option>
                    <option value="date">Release: Newest First</option>
                    <option value="title">Title: A to Z</option>
                  </select>
                  <div className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2">
                    <span className="block h-0 w-0 border-x-[3.5px] border-x-transparent border-t-[5px] border-t-current" />
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Row: Horizontal Scrollable Genre Ribbon with Touch-Snap */}
            <div className="relative">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-0.5 scrollbar-none snap-x snap-mandatory touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none]">
                {CATALOG_GENRES.map((genre) => {
                  const active = selectedGenre === genre.id;
                  return (
                    <button
                      key={String(genre.id)}
                      type="button"
                      onClick={() => handleSelectGenre(genre.id)}
                      className={`whitespace-nowrap border-[2px] border-black px-2.5 py-1 text-[9.5px] font-black uppercase tracking-[0.12em] transition shrink-0 snap-start ${
                        active
                          ? "bg-[#00f0ff] text-black shadow-[2px_2px_0_#000] -translate-y-0.5"
                          : darkMode
                            ? "bg-[#1a1a1a] text-[#f5f0e8]/80 hover:text-[#f5f0e8] hover:bg-[#242424] shadow-[1.5px_1.5px_0_#000]"
                            : "bg-white text-[#111111]/80 hover:text-[#111111] hover:bg-neutral-100 shadow-[1.5px_1.5px_0_#000]"
                      }`}
                    >
                      {genre.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bottom Row: Active Filter Telemetry & Reset Button (Conditional) */}
            {isFilterActive && (
              <div
                className={`flex flex-wrap items-center justify-between gap-2 border-[2px] border-black p-2.5 shadow-[2px_2px_0_#000] ${
                  darkMode ? "bg-[#161616]" : "bg-[#f2f0ed]"
                }`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1.5 text-[9.5px] font-black uppercase tracking-[0.14em]">
                    <SlidersHorizontal className="h-3 w-3" />
                    <span>Active Filters:</span>
                  </span>
                  {selectedGenre !== "all" && (
                    <span className="border-[1.5px] border-black bg-[#00f0ff] px-2 py-0.5 text-[9px] font-black uppercase text-black">
                      Genre: {CATALOG_GENRES.find((g) => g.id === selectedGenre)?.name}
                    </span>
                  )}
                  {mediaTypeFilter !== "all" && (
                    <span className="border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-[9px] font-black uppercase text-black">
                      Type: {mediaTypeFilter === "movie" ? "Movies Only" : "TV Series Only"}
                    </span>
                  )}
                  {sortBy !== "trending" && (
                    <span className="border-[1.5px] border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase text-black">
                      Sort: {sortBy === "rating" ? "Rating" : sortBy === "date" ? "Release Date" : "Title A-Z"}
                    </span>
                  )}
                  <span className="text-[9.5px] font-bold uppercase tracking-[0.1em] opacity-70">
                    ({filteredCatalog.length} matching)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex items-center gap-1 border-[1.5px] border-black bg-[#ff5376] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black shadow-[1.5px_1.5px_0_#000] transition hover:-translate-y-0.5 active:scale-95"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span>Reset All</span>
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-2.5 sm:gap-4 grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {loading ? (
              Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className={`flex flex-col border-[3px] border-black shadow-[4px_4px_0_#000] animate-pulse ${darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]"}`}>
                  <div className="aspect-[2/3] w-full border-b-[3px] border-black bg-black/20" />
                  <div className="p-3 space-y-2 flex-1">
                    <div className="h-4 w-3/4 bg-black/20" />
                    <div className="h-3 w-1/2 bg-black/20" />
                  </div>
                </div>
              ))
            ) : paginatedCatalog.length === 0 ? (
              <div className={`col-span-full border-[3px] border-dashed border-black p-8 text-center text-sm ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8]" : "bg-[#f2f0ed] text-black"}`}>
                <p className="font-black uppercase tracking-[0.16em]">No titles found</p>
                <p className="mt-1 text-xs opacity-75">
                  No results matched the active catalog filters. Try adjusting or clearing your filters, or search the global database.
                </p>
                <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                  {isFilterActive && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5"
                    >
                      <RotateCcw className="h-3 w-3" />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={openSearchSpotlight}
                    className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#00f0ff] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95"
                  >
                    <Search className="h-3 w-3 stroke-[2.5]" />
                    <span>Search TMDB Spotlight</span>
                  </button>
                </div>
              </div>
            ) : (
              paginatedCatalog.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))
            )}
          </div>
        </section>
      </div>

      <Footer />

      {featuredMovie && (
        <TrailerModal
          isOpen={showHeroTrailer}
          onClose={() => setShowHeroTrailer(false)}
          title={featuredMovie.title || featuredMovie.name || "Featured Title"}
          trailerKey={featuredMovie.trailer_key}
          trailerName={featuredMovie.trailer_name}
          videos={featuredMovie.videos}
        />
      )}

      <WatchPartyModal
        isOpen={watchPartyModalOpen}
        onClose={() => setWatchPartyModalOpen(false)}
      />
    </main>
  );
}
