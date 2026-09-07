"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Clock, Film, Loader2, Search, TrendingUp, Tv, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson, isSeries, type Movie } from "@/lib/api";

const imageBase = "https://image.tmdb.org/t/p/w185";

const trendingSuggestions = [
  { title: "Fight Club", type: "movie" },
  { title: "Game of Thrones", type: "tv" },
  { title: "The Dark Knight", type: "movie" },
  { title: "The Office", type: "tv" },
  { title: "Avengers: Infinity War", type: "movie" },
  { title: "Pulp Fiction", type: "movie" },
];

export function openSearchSpotlight() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("streamix_open_search"));
  }
}

export default function SearchSpotlight() {
  const router = useRouter();
  const { darkMode } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [mediaFilter, setMediaFilter] = useState<"all" | "movie" | "tv">("all");
  const [results, setResults] = useState<Movie[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = window.localStorage.getItem("streamix_recent_searches");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            return parsed.slice(0, 6);
          }
        }
      } catch {
        // Ignore
      }
    }
    return [];
  });

  const inputRef = useRef<HTMLInputElement | null>(null);
  const resultsContainerRef = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    setQuery("");
    setDebouncedQuery("");
    setResults([]);
    setSelectedIndex(0);
  }, []);

  const saveSearchTerm = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const nextList = [trimmed, ...recentSearches.filter((item) => item.toLowerCase() !== trimmed.toLowerCase())].slice(0, 6);
    setRecentSearches(nextList);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("streamix_recent_searches", JSON.stringify(nextList));
      } catch {
        // Ignore storage write errors
      }
    }
  }, [recentSearches]);

  const removeSearchTerm = (termToRemove: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextList = recentSearches.filter((item) => item !== termToRemove);
    setRecentSearches(nextList);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("streamix_recent_searches", JSON.stringify(nextList));
      } catch {
        // Ignore storage write errors
      }
    }
  };

  const clearAllRecent = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches([]);
    if (typeof window !== "undefined") {
      try {
        window.localStorage.removeItem("streamix_recent_searches");
      } catch {
        // Ignore storage write errors
      }
    }
  };

  // Filter results by media type (declared before keyboard shortcuts)
  const filteredResults = useMemo(() => {
    return results.filter((item) => {
      if (mediaFilter === "movie") return !isSeries(item);
      if (mediaFilter === "tv") return isSeries(item);
      return true;
    });
  }, [results, mediaFilter]);

  const navigateToItem = useCallback((item: Movie) => {
    if (query.trim()) {
      saveSearchTerm(query.trim());
    }
    handleClose();
    const href = isSeries(item) ? `/series/${item.id}` : `/movies/${item.id}`;
    router.push(href);
  }, [query, router, saveSearchTerm, handleClose]);

  // Debounce query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Global Keyboard Shortcuts (Cmd+K, Ctrl+K, /) and Custom Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        return;
      }

      // Quick slash / key (only if not focused in an input/textarea)
      if (e.key === "/" && !isOpen) {
        const activeTag = document.activeElement?.tagName.toLowerCase();
        if (activeTag !== "input" && activeTag !== "textarea" && !(document.activeElement as HTMLElement)?.isContentEditable) {
          e.preventDefault();
          setIsOpen(true);
          return;
        }
      }

      // When Spotlight is Open
      if (isOpen) {
        if (e.key === "Escape") {
          e.preventDefault();
          handleClose();
          return;
        }

        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((curr) => {
            const max = filteredResults.length - 1;
            return curr < max ? curr + 1 : 0;
          });
          return;
        }

        if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((curr) => {
            const max = filteredResults.length - 1;
            return curr > 0 ? curr - 1 : max;
          });
          return;
        }

        if (e.key === "Enter") {
          if (filteredResults.length > 0 && selectedIndex >= 0 && selectedIndex < filteredResults.length) {
            e.preventDefault();
            navigateToItem(filteredResults[selectedIndex]);
          }
        }
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("streamix_open_search", handleCustomOpen);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("streamix_open_search", handleCustomOpen);
    };
  }, [isOpen, filteredResults, selectedIndex, handleClose, navigateToItem]);

  // Lock body scroll and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);

      return () => {
        clearTimeout(timer);
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Execute search queries
  useEffect(() => {
    if (!debouncedQuery) {
      return;
    }

    let isMounted = true;

    async function runSearch() {
      try {
        const searchRes = await fetchJson<{ movies: Movie[] }>(
          `/movies/search?query=${encodeURIComponent(debouncedQuery)}&type=all`
        );

        if (!isMounted) return;

        setResults(searchRes.movies ?? []);
        setSelectedIndex(0);
      } catch {
        if (isMounted) setResults([]);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    runSearch();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery]);

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    setDebouncedQuery(term);
    setLoading(true);
    inputRef.current?.focus();
  };

  if (!isOpen) return null;

  const modalBgClass = darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const inputBgClass = darkMode ? "bg-[#1c1c1c] text-[#f5f0e8]" : "bg-white text-[#111111]";
  const itemMutedText = darkMode ? "text-[#f5f0e8]/70" : "text-[#111111]/70";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Search Spotlight"
      onClick={handleClose}
      className="fixed inset-0 z-[99999] flex items-start justify-center p-2.5 pt-4 sm:p-6 sm:pt-20 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-3xl flex flex-col border-[3px] border-black shadow-[5px_5px_0_#000] sm:shadow-[8px_8px_0_#000] overflow-hidden ${modalBgClass}`}
      >
        {/* Search Header */}
        <div className="flex items-center gap-2 sm:gap-2.5 p-2.5 sm:p-4 border-b-[3px] border-black bg-neutral-900/10">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[2px_2px_0_#000] shrink-0">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5 stroke-[2.5]" />}
          </div>

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              const val = e.target.value;
              setQuery(val);
              setSelectedIndex(0);
              if (!val.trim()) {
                setDebouncedQuery("");
                setResults([]);
              }
            }}
            placeholder="Search movies, TV series, actors..."
            className={`flex-1 border-[2px] border-black px-3 py-2 text-sm sm:text-base font-bold uppercase tracking-tight shadow-[2px_2px_0_#000] focus:outline-none ${inputBgClass}`}
          />

          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setDebouncedQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="flex h-9 w-9 items-center justify-center border-[2px] border-black bg-neutral-200 dark:bg-neutral-800 text-black dark:text-white shadow-[2px_2px_0_#000] hover:bg-neutral-300 dark:hover:bg-neutral-700 shrink-0 transition"
              aria-label="Clear query"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="border-[2px] border-black bg-[#ff5376] px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] hover:opacity-90 active:scale-95 shrink-0"
            aria-label="Close spotlight"
          >
            ESC
          </button>
        </div>

        {/* Media Filter Tabs */}
        {results.length > 0 && (
          <div className="flex items-center gap-2 px-3 py-2 border-b-[2px] border-black bg-neutral-500/5 text-xs font-black uppercase tracking-wider overflow-x-auto">
            <span className="text-[10px] tracking-[0.18em] opacity-60 mr-1">Filter:</span>
            <button
              type="button"
              onClick={() => {
                setMediaFilter("all");
                setSelectedIndex(0);
              }}
              className={`border-[1.5px] border-black px-2.5 py-0.5 text-[10px] font-bold transition ${
                mediaFilter === "all"
                  ? "bg-[#00f0ff] text-black shadow-[1.5px_1.5px_0_#000]"
                  : "bg-transparent opacity-70 hover:opacity-100"
              }`}
            >
              All ({results.length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaFilter("movie");
                setSelectedIndex(0);
              }}
              className={`border-[1.5px] border-black px-2.5 py-0.5 text-[10px] font-bold transition ${
                mediaFilter === "movie"
                  ? "bg-[#ffe600] text-black shadow-[1.5px_1.5px_0_#000]"
                  : "bg-transparent opacity-70 hover:opacity-100"
              }`}
            >
              Movies ({results.filter((r) => !isSeries(r)).length})
            </button>
            <button
              type="button"
              onClick={() => {
                setMediaFilter("tv");
                setSelectedIndex(0);
              }}
              className={`border-[1.5px] border-black px-2.5 py-0.5 text-[10px] font-bold transition ${
                mediaFilter === "tv"
                  ? "bg-[#ff5376] text-black shadow-[1.5px_1.5px_0_#000]"
                  : "bg-transparent opacity-70 hover:opacity-100"
              }`}
            >
              TV Series ({results.filter((r) => isSeries(r)).length})
            </button>
          </div>
        )}

        {/* Content Body */}
        <div ref={resultsContainerRef} className="max-h-[60vh] overflow-y-auto divide-y-[2px] divide-black scrollbar-thin">
          {/* Case 1: Results available */}
          {filteredResults.length > 0 ? (
            filteredResults.map((item: Movie, idx: number) => {
              const isTv = isSeries(item);
              const isSelected = idx === selectedIndex;
              const title = item.title || item.name || "Untitled";
              const year = item.release_date?.slice(0, 4) || item.first_air_date?.slice(0, 4) || "Unknown";
              const poster = item.poster_path
                ? item.poster_path.startsWith("http")
                  ? item.poster_path
                  : `${imageBase}${item.poster_path}`
                : null;

              return (
                <div
                  key={`${isTv ? "tv" : "movie"}-${item.id}`}
                  onClick={() => navigateToItem(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center gap-3 p-3 cursor-pointer transition ${
                    isSelected
                      ? darkMode
                        ? "bg-[#252525] border-l-[6px] border-l-[#ffe600]"
                        : "bg-[#fff9d6] border-l-[6px] border-l-[#ffe600]"
                      : "hover:bg-neutral-500/5"
                  }`}
                >
                  <div className="relative aspect-[2/3] w-12 sm:w-14 shrink-0 overflow-hidden border-[2px] border-black bg-neutral-900 shadow-[2px_2px_0_#000]">
                    {poster ? (
                      <Image src={poster} alt={title} fill sizes="56px" className="object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-1 text-center text-[9px] font-black uppercase text-neutral-400">
                        {isTv ? <Tv className="h-5 w-5 opacity-50" /> : <Film className="h-5 w-5 opacity-50" />}
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`border-[1.5px] border-black px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider ${
                          isTv ? "bg-[#ff5376] text-black" : "bg-[#00f0ff] text-black"
                        }`}
                      >
                        {isTv ? "TV Series" : "Movie"}
                      </span>
                      <span className="text-xs font-bold opacity-75">{year}</span>
                      {typeof item.vote_average === "number" && item.vote_average > 0 && (
                        <span className="border-[1.5px] border-black bg-[#ffe600] px-1.5 py-0.2 text-[9px] font-black text-black">
                          ★ {item.vote_average.toFixed(1)}
                        </span>
                      )}
                    </div>

                    <h3 className="mt-1 font-[var(--font-bricolage)] text-sm sm:text-base font-black uppercase tracking-[-0.02em] line-clamp-1">
                      {title}
                    </h3>

                    <p className={`mt-0.5 text-xs line-clamp-1 ${itemMutedText}`}>
                      {item.overview || "No overview available."}
                    </p>
                  </div>

                  {isSelected && (
                    <div className="hidden sm:flex items-center gap-1 border-[2px] border-black bg-white dark:bg-black px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] shrink-0">
                      <span>OPEN</span>
                      <ArrowRight className="h-3 w-3" />
                    </div>
                  )}
                </div>
              );
            })
          ) : query.trim() && !loading ? (
            /* Case 2: Zero Results */
            <div className="p-8 text-center space-y-3">
              <div className="mx-auto flex h-12 w-12 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[3px_3px_0_#000]">
                <Search className="h-6 w-6" />
              </div>
              <p className="font-[var(--font-bricolage)] text-lg font-black uppercase tracking-[-0.03em]">
                No matching titles found
              </p>
              <p className={`text-xs max-w-sm mx-auto ${itemMutedText}`}>
                We couldn&apos;t find anything matching &quot;{query}&quot;. Check the spelling or try searching for another title.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  inputRef.current?.focus();
                }}
                className="mt-2 border-[2px] border-black bg-[#00f0ff] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5"
              >
                Clear Search
              </button>
            </div>
          ) : (
            /* Case 3: Empty query (Initial state) */
            <div className="p-4 sm:p-6 space-y-5">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 opacity-60" />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                        Recent Searches
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={clearAllRecent}
                      className="text-[10px] font-black uppercase tracking-[0.14em] opacity-60 hover:opacity-100 underline decoration-dashed"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {recentSearches.map((term) => (
                      <div
                        key={term}
                        onClick={() => handleSuggestionClick(term)}
                        className={`inline-flex items-center gap-1.5 border-[2px] border-black px-2.5 py-1 text-xs font-bold uppercase tracking-wider cursor-pointer shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 ${
                          darkMode ? "bg-[#1e1e1e] hover:bg-[#282828]" : "bg-white hover:bg-neutral-100"
                        }`}
                      >
                        <span>{term}</span>
                        <button
                          type="button"
                          onClick={(e) => removeSearchTerm(term, e)}
                          className="opacity-50 hover:opacity-100"
                          aria-label={`Remove ${term}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trending Suggestions */}
              <div>
                <div className="flex items-center gap-1.5 mb-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-[#ffe600]" />
                  <span className="text-[10px] font-black uppercase tracking-[0.18em] opacity-70">
                    Trending Suggestions
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {trendingSuggestions.map((item) => (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => handleSuggestionClick(item.title)}
                      className={`inline-flex items-center gap-2 border-[2px] border-black px-3 py-1.5 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 ${
                        darkMode ? "bg-[#1a1a1a] hover:bg-[#252525]" : "bg-neutral-100 hover:bg-white"
                      }`}
                    >
                      <span>{item.title}</span>
                      <span
                        className={`border-[1.5px] border-black px-1 text-[8px] font-black ${
                          item.type === "tv" ? "bg-[#ff5376] text-black" : "bg-[#ffe600] text-black"
                        }`}
                      >
                        {item.type === "tv" ? "TV" : "MOVIE"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spotlight Footer Bar */}
        <div className="flex items-center justify-between gap-2 border-t-[3px] border-black p-2 sm:p-2.5 sm:px-4 bg-neutral-900/15 text-[10px] font-black uppercase tracking-wider">
          <div className="hidden sm:flex items-center gap-3">
            <span className="inline-flex items-center gap-1 opacity-75">
              <kbd className="border-[1.5px] border-black bg-white dark:bg-black px-1.5 py-0.5 shadow-[1px_1px_0_#000]">↑↓</kbd>
              Navigate
            </span>
            <span className="inline-flex items-center gap-1 opacity-75">
              <kbd className="border-[1.5px] border-black bg-white dark:bg-black px-1.5 py-0.5 shadow-[1px_1px_0_#000]">ENTER</kbd>
              Select
            </span>
            <span className="inline-flex items-center gap-1 opacity-75">
              <kbd className="border-[1.5px] border-black bg-white dark:bg-black px-1.5 py-0.5 shadow-[1px_1px_0_#000]">ESC</kbd>
              Close
            </span>
          </div>

          <div className="flex sm:hidden items-center text-[9px] opacity-65 font-mono">
            <span>Tap item to open</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-black">
              STREAMIX SPOTLIGHT
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
