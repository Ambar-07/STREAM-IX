"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Bookmark, Film, Play, User, Users } from "lucide-react";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import TrailerModal from "@/components/TrailerModal";
import MovieCard from "@/components/MovieCard";
import ServerSwitcher from "@/components/ServerSwitcher";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { fetchSeasonEpisodes, fetchSeriesDetails, isSeries, type Episode, type Series } from "@/lib/api";
import { ENABLE_EXTERNAL_STREAMING } from "@/lib/videoSource";
import { getLastWatchedItem, recordWatchHistory, type WatchedItem } from "@/lib/watchHistory";
import { isInWatchlist, toggleWatchlist as toggleWatchlistUtil } from "@/lib/watchlist";
import { getLocalParticipant, encodeRoomToken } from "@/lib/watchparty";

const imageBase = "https://image.tmdb.org/t/p/original";

export default function SeriesDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [series, setSeries] = useState<Series | null>(null);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [selectedSeason, setSelectedSeason] = useState(1);
  const [selectedEpisode, setSelectedEpisode] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlayer, setShowPlayer] = useState(false);
  const [showTrailer, setShowTrailer] = useState(false);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [lastWatchedItem, setLastWatchedItem] = useState<WatchedItem | null>(null);
  const { darkMode } = useTheme();

  const initialParamsRef = useRef<{ season?: number; episode?: number; autoplay?: boolean } | null>(null);
  const initialProcessedRef = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const s = parseInt(sp.get("season") || "", 10);
      const e = parseInt(sp.get("episode") || "", 10);
      const autoplay = sp.get("autoplay") === "true";
      initialParamsRef.current = {
        season: !isNaN(s) && s > 0 ? s : undefined,
        episode: !isNaN(e) && e > 0 ? e : undefined,
        autoplay,
      };
    }
  }, []);

  useEffect(() => {
    function updateHistoryItem() {
      if (series?.id) {
        setLastWatchedItem(getLastWatchedItem(series.id) ?? null);
      }
    }
    updateHistoryItem();
    if (typeof window !== "undefined") {
      window.addEventListener("streamix_history_updated", updateHistoryItem);
      return () => window.removeEventListener("streamix_history_updated", updateHistoryItem);
    }
  }, [series?.id]);

  useEffect(() => {
    function checkWatchlist() {
      if (series?.id) {
        setInWatchlist(isInWatchlist(series.id));
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
  }, [series?.id]);

  useEffect(() => {
    async function loadSeries() {
      const resolved = await params;
      try {
        const data = await fetchSeriesDetails(resolved.id);
        const nextSeries = data.series;

        if (!nextSeries) {
          setSeries(null);
          return;
        }

        if (!isSeries(nextSeries) && nextSeries.media_type === "movie") {
          router.replace(`/movies/${resolved.id}`);
          return;
        }

        let validSeasons = (nextSeries.seasons ?? []).filter((s) => s && s.season_number > 0);
        if (validSeasons.length === 0) {
          const num = Math.max(1, Number(nextSeries.number_of_seasons) || 1);
          validSeasons = Array.from({ length: num }, (_, idx) => ({
            id: idx + 1,
            season_number: idx + 1,
            name: `Season ${idx + 1}`,
            overview: `Season ${idx + 1}`,
            episode_count: 12,
          }));
        }
        nextSeries.seasons = validSeasons;

        setSeries(nextSeries);

        const pastWatched = getLastWatchedItem(nextSeries.id);
        const requestedSeason = initialParamsRef.current?.season ?? pastWatched?.season;
        const matchedSeason = requestedSeason
          ? validSeasons.find((s) => s.season_number === requestedSeason)
          : undefined;
        const regularSeason = validSeasons.find((s) => s.season_number === 1) ?? validSeasons[0];
        const targetSeason = matchedSeason ? matchedSeason.season_number : (regularSeason ? regularSeason.season_number : 1);

        setSelectedSeason(targetSeason);
        if (typeof window !== "undefined") {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      } catch {
        setSeries(null);
      } finally {
        setLoading(false);
      }
    }

    loadSeries();
  }, [params, router]);

  useEffect(() => {
    const activeSeries = series;
    if (!activeSeries) return;

    const seriesId = activeSeries.id;
    const season = activeSeries.seasons?.find((item) => item.season_number === selectedSeason) ?? activeSeries.seasons?.[0];
    if (!season) return;

    const safeSeason = season;

    async function loadEpisodes() {
      try {
        const data = await fetchSeasonEpisodes(String(seriesId), safeSeason.season_number);
        let list = data.episodes ?? [];
        if (list.length === 0) {
          const count = Math.max(1, safeSeason.episode_count || 12);
          list = Array.from({ length: count }, (_, idx) => ({
            id: idx + 1,
            episode_number: idx + 1,
            name: `Episode ${idx + 1}`,
            overview: `Episode ${idx + 1} of Season ${safeSeason.season_number}`,
            still_path: null,
          }));
        }
        setEpisodes(list);

        if (!initialProcessedRef.current) {
          initialProcessedRef.current = true;
          const pastWatched = getLastWatchedItem(seriesId);
          const targetEpNum = initialParamsRef.current?.episode ?? (
            initialParamsRef.current?.season === undefined && pastWatched?.season === safeSeason.season_number
              ? pastWatched.episode
              : undefined
          );
          const matchedEp = targetEpNum ? list.find((e) => e.episode_number === targetEpNum) : undefined;
          setSelectedEpisode(matchedEp ? matchedEp.episode_number : (list[0]?.episode_number ?? 1));

          if (initialParamsRef.current?.autoplay) {
            setShowPlayer(true);
          }
        } else {
          setSelectedEpisode(list[0]?.episode_number ?? 1);
        }
      } catch {
        const count = Math.max(1, safeSeason.episode_count || 12);
        const list = Array.from({ length: count }, (_, idx) => ({
          id: idx + 1,
          episode_number: idx + 1,
          name: `Episode ${idx + 1}`,
          overview: `Episode ${idx + 1} of Season ${safeSeason.season_number}`,
          still_path: null,
        }));
        setEpisodes(list);
        setSelectedEpisode(1);
      }
    }

    loadEpisodes();
  }, [series, selectedSeason]);

  const currentEpisode = episodes.find((episode) => episode.episode_number === selectedEpisode) ?? episodes[0];

  useEffect(() => {
    if (showPlayer && series && currentEpisode) {
      recordWatchHistory({
        id: series.id,
        title: series.title || series.name || "Untitled Series",
        name: series.name || series.title,
        overview: currentEpisode.overview || series.overview,
        poster_path: series.poster_path,
        backdrop_path: currentEpisode.still_path || series.backdrop_path,
        media_type: "tv",
        season: selectedSeason,
        episode: currentEpisode.episode_number,
        episodeName: currentEpisode.name,
        vote_average: series.vote_average,
      });

      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        url.searchParams.set("season", String(selectedSeason));
        url.searchParams.set("episode", String(currentEpisode.episode_number));
        window.history.replaceState(null, "", url.toString());
      }
    }
  }, [showPlayer, series, selectedSeason, currentEpisode]);

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
    if (!series) return;
    const user = getLocalParticipant();
    try {
      const res = await fetch("/api/watchparty", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: series.title || series.name || "Series",
          mediaType: "tv",
          tmdbId: String(series.id),
          posterPath: series.poster_path,
          backdropPath: series.backdrop_path,
          season: selectedSeason,
          episode: selectedEpisode,
          episodeName: episodes.find((e) => e.episode_number === selectedEpisode)?.name,
          totalEpisodes: episodes.length,
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
      m: "tv",
      id: String(series.id),
      t: series.title || series.name || "Series",
      p: series.poster_path,
      b: series.backdrop_path,
      s: selectedSeason,
      e: selectedEpisode ?? 1,
      en: episodes.find((e) => e.episode_number === selectedEpisode)?.name,
      te: episodes.length,
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
            <p className="mt-2 font-[var(--font-bricolage)] text-3xl uppercase tracking-[-0.05em]">Series</p>
          </div>
        </div>
      </main>
    );
  }

  if (!series) {
    return (
      <main className={shellClass}>
        <Navbar />
        <div className="mx-auto flex max-w-3xl items-center justify-center px-4 py-20">
          <div className={`border-[3px] border-black px-8 py-6 text-center shadow-[6px_6px_0_#000] ${darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]"}`}>
            <p className="text-[10px] font-black uppercase tracking-[0.22em]">Series</p>
            <p className="mt-2 font-[var(--font-bricolage)] text-3xl uppercase tracking-[-0.05em]">Not found</p>
          </div>
        </div>
      </main>
    );
  }

  const seasonOptions = series.seasons ?? [];

  return (
    <main className={shellClass}>
      <Navbar />
      <div className="relative isolate">
        {series.backdrop_path && (
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <Image
              src={`${imageBase}${series.backdrop_path}`}
              alt={series.title}
              fill
              className="object-cover opacity-25"
              priority
            />
          </div>
        )}

        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 md:flex-row md:gap-8 md:py-10 md:px-8">
          <div className={`relative aspect-[2/3] w-full max-w-[260px] sm:max-w-[320px] md:max-w-[360px] mx-auto md:w-[360px] md:shrink-0 overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000] bg-neutral-900 ${panelSoftClass}`}>
            <Image
              src={series.poster_path ? `${imageBase}${series.poster_path}` : "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?auto=format&fit=crop&w=800&q=80"}
              alt={series.title || series.name || "Series"}
              fill
              priority
              sizes="(max-width: 640px) 260px, (max-width: 768px) 320px, 360px"
              className="object-cover object-center"
            />
          </div>

          <div className={`flex-1 space-y-5 border-[3px] border-black p-4 shadow-[6px_6px_0_#000] sm:p-6 sm:space-y-6 ${panelClass}`}>
            <div>
              <p className={`text-[10px] font-bold uppercase tracking-[0.22em] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>Series detail</p>
              <h1 className={`mt-2 font-[var(--font-bricolage)] text-[2rem] font-black uppercase leading-[0.95] tracking-[-0.04em] break-words sm:text-[3rem] md:text-[4.2rem] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>{series.title || series.name || "Series"}</h1>
            </div>

            <div className={`flex flex-wrap gap-2 sm:gap-3 text-sm ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>
              <span className="border-[2px] border-black bg-[#ffe600] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">★ {series.vote_average?.toFixed(1) ?? "N/A"}</span>
              <span className="border-[2px] border-black bg-[#f5f0e8] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">{series.first_air_date?.slice(0, 4) ?? "Unknown"}</span>
              <span className="border-[2px] border-black bg-[#00f0ff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">{series.number_of_seasons ?? seasonOptions.length} seasons</span>
              {series.genres?.map((genre) => (
                <span key={genre.id} className="border-[2px] border-black bg-[#00f0ff] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-black">{genre.name}</span>
              ))}
            </div>

            <p className={`max-w-2xl text-base sm:text-lg leading-7 sm:leading-8 ${mutedTextClass}`}>{series.overview || "No overview is available for this title."}</p>

            <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
              {lastWatchedItem?.season && lastWatchedItem?.episode && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSeason(lastWatchedItem.season!);
                    setSelectedEpisode(lastWatchedItem.episode!);
                    setShowPlayer(true);
                  }}
                  className="w-full sm:w-auto inline-flex items-center justify-center border-[3px] border-black bg-[#ffe600] px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
                >
                  <Play className="mr-2 h-4 w-4 fill-current shrink-0" />
                  Resume S{lastWatchedItem.season} : E{lastWatchedItem.episode}
                </button>
              )}
              <button
                type="button"
                onClick={handleStartParty}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center border-[3px] border-black bg-[#00f0ff] px-4 py-2.5 sm:px-5 sm:py-3 text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
              >
                <Users className="mr-2 h-4 w-4 shrink-0" />
                Watch Party
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!series) return;
                  const nextState = await toggleWatchlistUtil(series);
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
              {series.trailer_key && (
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

            {ENABLE_EXTERNAL_STREAMING ? (
              <div className="space-y-4">
                <ServerSwitcher className="w-full" />
                <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin snap-x snap-mandatory touch-pan-x sm:flex-wrap">
                  {seasonOptions.map((season) => (
                    <button
                      key={season.season_number}
                      type="button"
                      onClick={() => setSelectedSeason(season.season_number)}
                      className={`shrink-0 snap-start border-[2px] border-black px-3 py-1.5 sm:py-2 text-[10px] font-black uppercase tracking-[0.18em] shadow-[2px_2px_0_#000] transition active:scale-95 ${
                        selectedSeason === season.season_number
                          ? "bg-[#ffe600] text-black"
                          : darkMode
                            ? "bg-[#1a1a1a] text-[#f5f0e8]"
                            : "bg-white text-black"
                      }`}
                    >
                      Season {season.season_number}
                    </button>
                  ))}
                </div>

                <div className="space-y-3">
                  {episodes.length > 0 ? (
                    <>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2">
                        {episodes.map((episode) => (
                          <button
                            key={episode.id}
                            type="button"
                            onClick={() => {
                              setSelectedEpisode(episode.episode_number);
                            }}
                            className={`min-w-[38px] sm:min-w-[44px] h-9 sm:h-10 px-2 sm:px-3 text-center border-[2px] border-black text-[9.5px] sm:text-[10.5px] font-black uppercase tracking-[0.14em] shadow-[2px_2px_0_#000] transition active:scale-95 ${
                              selectedEpisode === episode.episode_number
                                ? "bg-[#00f0ff] text-black"
                                : darkMode
                                  ? "bg-[#1a1a1a] text-[#f5f0e8]"
                                  : "bg-white text-black"
                            }`}
                          >
                            E{episode.episode_number}
                          </button>
                        ))}
                      </div>

                      {currentEpisode && (
                        <div className={`flex flex-col sm:flex-row gap-3.5 sm:gap-4 border-[2px] border-black p-3 sm:p-4 shadow-[3px_3px_0_#000] ${darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]"}`}>
                          {currentEpisode.still_path ? (
                            <div className="relative aspect-video w-full sm:w-60 shrink-0 overflow-hidden border-[2px] border-black bg-neutral-900 shadow-[2px_2px_0_#000]">
                              <Image
                                src={`${imageBase}${currentEpisode.still_path}`}
                                alt={currentEpisode.name}
                                fill
                                sizes="(max-width: 640px) 100vw, 240px"
                                className="object-cover object-center"
                              />
                            </div>
                          ) : null}
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe600]">Selected episode</p>
                            <h2 className="mt-1 font-[var(--font-bricolage)] text-[1.35rem] sm:text-[1.8rem] font-black uppercase leading-tight tracking-[-0.04em]">{currentEpisode.name}</h2>
                            <p className={`mt-1.5 sm:mt-2 text-xs sm:text-sm leading-5 sm:leading-6 line-clamp-3 ${mutedTextClass}`}>{currentEpisode.overview || "No episode summary available."}</p>
                            <button
                              type="button"
                              onClick={() => setShowPlayer(true)}
                              className="mt-3 w-full sm:w-auto inline-flex items-center justify-center border-[3px] border-black bg-[#ffe600] px-4 py-2.5 sm:px-5 sm:py-2.5 text-[10px] font-black uppercase tracking-[0.18em] text-black shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98"
                            >
                              <Play className="mr-1.5 h-3.5 w-3.5 fill-current shrink-0" />
                              Watch S{selectedSeason} : E{currentEpisode.episode_number}
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`border-[2px] border-dashed border-black p-4 text-sm ${darkMode ? "bg-[#1a1a1a] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]"}`}>
                      No episodes were returned for this season.
                    </div>
                  )}
                </div>

                {showPlayer && currentEpisode && (
                  <div className="fixed inset-0 z-[9999] flex flex-col h-[100dvh] w-screen bg-black p-0 sm:p-3 md:p-4 overflow-hidden">
                    <div className="mx-auto flex h-full w-full max-w-7xl flex-col min-h-0 overflow-hidden border-0 sm:border-[3px] border-black bg-black shadow-none sm:shadow-[6px_6px_0_#000]">
                      <VideoPlayer
                        type="tv"
                        id={String(series.id)}
                        season={selectedSeason}
                        episode={currentEpisode.episode_number}
                        episodeName={currentEpisode.name}
                        totalEpisodes={episodes.length}
                        onPrevEpisode={() => setSelectedEpisode((curr) => Math.max(1, (curr ?? 1) - 1))}
                        onNextEpisode={() => setSelectedEpisode((curr) => Math.min(episodes.length, (curr ?? 1) + 1))}
                        title={series.title || series.name}
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

        {/* Series Cast Section */}
        {series.cast && series.cast.length > 0 && (
          <section className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ffe600]">Credits</p>
                <h2 className={`font-[var(--font-bricolage)] text-2xl md:text-3xl font-black uppercase tracking-[-0.04em] ${darkMode ? "text-[#f5f0e8]" : "text-[#111111]"}`}>
                  Series Cast
                </h2>
              </div>
              <span className="border-[2px] border-black bg-[#ffe600] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000]">
                {series.cast.length} Actors
              </span>
            </div>

            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin snap-x snap-mandatory touch-pan-x overscroll-x-contain">
              {series.cast.map((actor) => (
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
        {series.recommendations && series.recommendations.length > 0 && (
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
              {series.recommendations.map((rec) => (
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
        title={series.title || series.name || "Series"}
        trailerKey={series.trailer_key}
        trailerName={series.trailer_name}
        videos={series.videos}
      />
    </main>
  );
}
