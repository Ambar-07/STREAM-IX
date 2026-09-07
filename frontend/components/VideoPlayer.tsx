"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play, RotateCw, Server, X } from "lucide-react";
import ServerDrawer from "@/components/ServerDrawer";
import { useTheme } from "@/hooks/useTheme";
import { formatPlaybackTime } from "@/components/WatchPartyScrubber";
import {
  DEFAULT_SERVER_ID,
  DEFAULT_WATCH_PARTY_SERVER_ID,
  ENABLE_EXTERNAL_STREAMING,
  getNextServerId,
  getServerById,
  getVideoEmbedUrl,
  STREAM_SERVER_STORAGE_KEY,
  STREAM_SERVERS,
  type StreamServerId,
  type VideoType,
} from "@/lib/videoSource";

type VideoPlayerProps = {
  type: VideoType;
  id: string;
  season?: number;
  episode?: number;
  episodeName?: string;
  totalEpisodes?: number;
  onPrevEpisode?: () => void;
  onNextEpisode?: () => void;
  fullScreen?: boolean;
  title?: string;
  onClose?: () => void;
  serverId?: StreamServerId;
  onServerChange?: (serverId: StreamServerId) => void;
  hideBottomDeck?: boolean;
  syncKey?: string | number;
  startTime?: number;
  currentTime?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  onPlaybackStateChange?: (isPlaying: boolean) => void;
  isWatchParty?: boolean;
  headerLeft?: React.ReactNode;
  headerCenter?: React.ReactNode;
  headerActions?: React.ReactNode;
};

type VendorDoc = Document & {
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  webkitExitFullscreen?: () => Promise<void> | void;
  mozCancelFullScreen?: () => Promise<void> | void;
  msExitFullscreen?: () => Promise<void> | void;
};

type VendorEl = HTMLDivElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
  mozRequestFullScreen?: () => Promise<void> | void;
  msRequestFullscreen?: () => Promise<void> | void;
};

type VendorOrientation = ScreenOrientation & {
  lock?: (orientation: string) => Promise<void>;
  unlock?: () => void;
};

export default function VideoPlayer({
  type,
  id,
  season,
  episode,
  episodeName,
  totalEpisodes,
  onPrevEpisode,
  onNextEpisode,
  fullScreen = false,
  title,
  onClose,
  serverId: externalServerId,
  onServerChange,
  hideBottomDeck = false,
  syncKey,
  startTime,
  currentTime,
  onTimeUpdate,
  isPlaying = true,
  onTogglePlayPause,
  onPlaybackStateChange,
  isWatchParty = false,
  headerLeft,
  headerCenter,
  headerActions,
}: VideoPlayerProps) {
  const { darkMode } = useTheme();
  const [selectedServerId, setSelectedServerId] = useState<StreamServerId>(() => {
    if (externalServerId) return externalServerId;
    if (isWatchParty) return DEFAULT_WATCH_PARTY_SERVER_ID;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STREAM_SERVER_STORAGE_KEY) as StreamServerId;
      if (saved && STREAM_SERVERS.some((s) => s.id === saved)) {
        return saved;
      }
    }
    return DEFAULT_SERVER_ID;
  });
  const [prevExternalId, setPrevExternalId] = useState(externalServerId);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isServerDrawerOpen, setIsServerDrawerOpen] = useState(false);
  const [keyCounter, setKeyCounter] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync if externalServerId changes
  if (externalServerId && externalServerId !== prevExternalId) {
    setPrevExternalId(externalServerId);
    setSelectedServerId(externalServerId);
  }

  // Preserve initial start time for embed URL so seeking doesn't remount or flash the iframe
  const initialStartTimeRef = useRef(startTime);
  useEffect(() => {
    initialStartTimeRef.current = startTime;
  }, [selectedServerId, type, id, season, episode, keyCounter]);

  // Handle external syncKey changes (e.g. host countdown or server sync)
  const prevSyncKeyRef = useRef(syncKey);
  useEffect(() => {
    if (syncKey !== undefined && syncKey !== prevSyncKeyRef.current) {
      prevSyncKeyRef.current = syncKey;
      // In Watch Party mode, NEVER remount or reload the iframe on syncKey changes
      if (syncKey && !isWatchParty) {
        initialStartTimeRef.current = startTime;
        setKeyCounter((prev) => prev + 1);
      }
    }
  }, [syncKey, startTime, isWatchParty]);

  // Send postMessage play/pause to iframe whenever isPlaying changes
  const prevIsPlayingRef = useRef(isPlaying);
  useEffect(() => {
    if (isPlaying !== undefined && isPlaying !== prevIsPlayingRef.current) {
      prevIsPlayingRef.current = isPlaying;
      if (iframeRef.current?.contentWindow) {
        const win = iframeRef.current.contentWindow;
        try {
          const action = isPlaying ? "play" : "pause";
          win.postMessage({ event: action }, "*");
          win.postMessage({ type: action }, "*");
          win.postMessage({ action: action }, "*");
          win.postMessage({ method: action }, "*");
          win.postMessage({ command: action }, "*");
          win.postMessage(JSON.stringify({ event: action }), "*");
          win.postMessage(JSON.stringify({ type: action }), "*");
          win.postMessage(JSON.stringify({ action: action }), "*");
          win.postMessage(
            JSON.stringify({
               event: "command",
               func: isPlaying ? "playVideo" : "pauseVideo",
               args: "",
            }),
            "*"
          );
        } catch {}
      }
    }
  }, [isPlaying]);

  // Send postMessage seek and handle deliberate seek reloading
  const prevStartTimeRef = useRef(startTime);
  useEffect(() => {
    if (startTime !== undefined && startTime !== prevStartTimeRef.current) {
      const diff = Math.abs((startTime ?? 0) - (prevStartTimeRef.current ?? 0));
      prevStartTimeRef.current = startTime;
      
      // 1. Send postMessage seek for any player that supports it
      if (iframeRef.current?.contentWindow) {
        const sec = Math.floor(startTime);
        const win = iframeRef.current.contentWindow;
        try {
          win.postMessage({ event: "seek", time: sec, currentTime: sec }, "*");
          win.postMessage({ type: "seek", time: sec, currentTime: sec }, "*");
          win.postMessage({ action: "seek", time: sec }, "*");
          win.postMessage({ method: "setCurrentTime", value: sec }, "*");
          win.postMessage(JSON.stringify({ event: "seek", time: sec }), "*");
          win.postMessage(JSON.stringify({ type: "seek", time: sec }), "*");
          win.postMessage(JSON.stringify({ action: "seek", time: sec }), "*");
          win.postMessage(
            JSON.stringify({
              event: "command",
              func: "seekTo",
              args: [sec, true],
            }),
            "*"
          );
        } catch {}
      }

      // 2. If this is a deliberate seek (drift/jump >= 3s), update initialStartTimeRef and reload iframe at target timestamp!
      // In Watch Party mode, NEVER destroy/remount the iframe on seek or drift! It causes infinite loops and resets embeds to 00:00.
      if (!isWatchParty && diff >= 3) {
        initialStartTimeRef.current = startTime;
        setKeyCounter((prev) => prev + 1);
      }
    }
  }, [startTime, isWatchParty]);

  // Listen to message events from the embed iframe player (timeupdate, seek, play, pause)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!event.data) return;

      let payload = event.data;
      if (typeof payload === "string") {
        try {
          payload = JSON.parse(payload);
        } catch {
          return;
        }
      }

      if (typeof payload !== "object" || payload === null) return;

      // Handle play / pause events from iframe if emitted (ignored in Watch Party to avoid ads/pre-roll pausing the party)
      if (!isWatchParty) {
        const eventName = String(
          payload.event || payload.type || payload.action || ""
        ).toLowerCase();
        if (eventName === "pause" || payload.data === 2 || payload.state === "paused") {
          onPlaybackStateChange?.(false);
        } else if (eventName === "play" || payload.data === 1 || payload.state === "playing") {
          onPlaybackStateChange?.(true);
        }
      }

      if (onTimeUpdate) {
        const rawTime =
          payload.currentTime ??
          payload.time ??
          payload.data?.currentTime ??
          payload.data?.time ??
          (payload.event === "timeupdate" ? payload.time : undefined);

        const rawDuration =
          payload.duration ??
          payload.data?.duration;

        if (typeof rawTime === "number" && !isNaN(rawTime) && rawTime >= 0) {
          onTimeUpdate(rawTime, typeof rawDuration === "number" ? rawDuration : 0);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onTimeUpdate, onPlaybackStateChange]);

  const activeServer = useMemo(() => getServerById(selectedServerId), [selectedServerId]);
  const nextServer = useMemo(() => getServerById(getNextServerId(selectedServerId)), [selectedServerId]);

  const embedUrl = useMemo(() => {
    try {
      return getVideoEmbedUrl({
        type,
        id,
        season,
        episode,
        serverId: selectedServerId,
        disableAds: true,
        startTime: initialStartTimeRef.current,
        isWatchParty,
      });
    } catch {
      return "";
    }
  }, [type, id, season, episode, selectedServerId, keyCounter, isWatchParty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 4500);
    return () => clearTimeout(timer);
  }, [embedUrl, keyCounter]);

  const handleServerChange = (newServerId: StreamServerId) => {
    if (newServerId === selectedServerId) return;
    setSelectedServerId(newServerId);
    setPrevExternalId(newServerId);
    setIsLoading(true);
    setHasError(false);

    if (typeof window !== "undefined") {
      localStorage.setItem(STREAM_SERVER_STORAGE_KEY, newServerId);
      window.dispatchEvent(new CustomEvent("streamix_server_changed", { detail: newServerId }));
    }

    if (onServerChange) {
      onServerChange(newServerId);
    }
  };

  const handleSwitchNextServer = () => {
    const nextId = getNextServerId(selectedServerId);
    handleServerChange(nextId);
  };

  const handleReload = () => {
    setIsLoading(true);
    setHasError(false);
    setKeyCounter((prev) => prev + 1);
  };

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current as VendorEl | null;
    if (!container) return;

    const vDoc = document as VendorDoc;
    const isCurrentlyFullscreen = Boolean(
      vDoc.fullscreenElement ||
      vDoc.webkitFullscreenElement ||
      vDoc.mozFullScreenElement ||
      vDoc.msFullscreenElement ||
      isFullscreen
    );

    const vOrientation = (window.screen.orientation || {}) as VendorOrientation;

    if (isCurrentlyFullscreen) {
      setIsFullscreen(false);
      try {
        if (vOrientation && typeof vOrientation.unlock === "function") {
          vOrientation.unlock();
        }
      } catch {}
      try {
        if (vDoc.exitFullscreen) {
          await vDoc.exitFullscreen();
        } else if (vDoc.webkitExitFullscreen) {
          vDoc.webkitExitFullscreen();
        } else if (vDoc.mozCancelFullScreen) {
          vDoc.mozCancelFullScreen();
        } else if (vDoc.msExitFullscreen) {
          vDoc.msExitFullscreen();
        }
      } catch {
        // Ignore exit errors
      }
    } else {
      setIsFullscreen(true);
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if (container.webkitRequestFullscreen) {
          container.webkitRequestFullscreen();
        } else if (container.mozRequestFullScreen) {
          container.mozRequestFullScreen();
        } else if (container.msRequestFullscreen) {
          container.msRequestFullscreen();
        }
      } catch (err) {
        console.warn("Native fullscreen unavailable, using edge-to-edge mode:", err);
      }
      try {
        if (vOrientation && typeof vOrientation.lock === "function") {
          await vOrientation.lock("landscape");
        }
      } catch {}
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      const vDoc = document as VendorDoc;
      const isNativeFs = Boolean(
        vDoc.fullscreenElement ||
        vDoc.webkitFullscreenElement ||
        vDoc.mozFullScreenElement ||
        vDoc.msFullscreenElement
      );
      if (!isNativeFs && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        toggleFullscreen();
      }
    };

    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    document.addEventListener("mozfullscreenchange", handleFsChange);
    document.addEventListener("MSFullscreenChange", handleFsChange);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
      document.removeEventListener("mozfullscreenchange", handleFsChange);
      document.removeEventListener("MSFullscreenChange", handleFsChange);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  const noticeClass = darkMode
    ? "border-black bg-[#141414] text-[#f5f0e8]"
    : "border-black bg-[#f2f0ed] text-black";

  if (!ENABLE_EXTERNAL_STREAMING) {
    return (
      <div className={`flex min-h-[220px] items-center justify-center border-[3px] p-6 text-center text-sm shadow-[6px_6px_0_#000] ${noticeClass}`}>
        External streaming is currently disabled.
      </div>
    );
  }

  if (!embedUrl) {
    return (
      <div className={`flex min-h-[220px] items-center justify-center border-[3px] p-6 text-center text-sm shadow-[6px_6px_0_#000] ${noticeClass}`}>
        Video source could not be generated for this selection.
      </div>
    );
  }

  const wrapperClassName = isFullscreen
    ? "fixed inset-0 z-[99999] flex flex-col h-[100dvh] w-screen max-w-none m-0 p-0 border-0 bg-black rounded-none overflow-hidden"
    : fullScreen
      ? "relative flex flex-col h-full w-full overflow-hidden border-0 sm:border-[2px] border-black bg-black"
      : "relative flex flex-col h-full w-full overflow-hidden border-[2px] sm:border-[3px] border-black bg-black shadow-[4px_4px_0_#000]";

  const overlayBg = darkMode ? "bg-[#0d0d0d]/90 text-[#f5f0e8]" : "bg-[#faf8f5]/90 text-[#111111]";

  return (
    <div ref={containerRef} className={wrapperClassName}>
      {/* 1. Mobile Portrait Top Bar (Clean, Uncluttered, Safe-Area Padded) */}
      <div className="z-30 flex shrink-0 items-center justify-between gap-2 border-b-[2px] border-black bg-[#ffe600] px-2.5 py-1.5 text-black shadow-[0_2px_0_#000] select-none min-h-[44px] pt-[max(env(safe-area-inset-top),6px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)] portrait:flex sm:hidden landscape:hidden">
        {/* Left: HeaderLeft + Close button + Badge + Title */}
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {headerLeft}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close player"
              aria-label="Close player"
              className="flex h-8 w-8 min-w-[32px] items-center justify-center border-[2px] border-black bg-[#ff5376] text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-95 hover:opacity-90"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <span className="border-[1.5px] border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#ffe600] shrink-0">
            {type === "tv" ? `S${season}•E${episode}` : "MOVIE"}
          </span>
          <p className="font-[var(--font-bricolage)] text-xs font-black uppercase tracking-tight truncate">
            {type === "tv" ? (episodeName || title || "Series") : (title || "Movie")}
          </p>
        </div>

        {/* Right: Server Selector Button + Reload + Fullscreen */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto flex-wrap">
          {headerCenter}
          {headerActions}
          <button
            type="button"
            onClick={() => setIsServerDrawerOpen(true)}
            title="Open Server Selector drawer"
            aria-label="Open Server Selector drawer"
            className="flex items-center gap-1 border-[1.5px] border-black bg-black px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#ffe600] shadow-[1px_1px_0_#000] transition active:scale-95 hover:bg-neutral-900 shrink-0"
          >
            <Server className="h-3 w-3 shrink-0" />
            <span className="hidden xs:inline">Server Selector</span>
            <span className="xs:hidden">Servers</span>
            <span className="border-[1px] border-black bg-[#ffe600] px-1 text-[8.5px] font-black text-black">
              {activeServer.shortName}
            </span>
            <ChevronDown className="h-2.5 w-2.5 shrink-0 opacity-80" />
          </button>
          <button
            type="button"
            onClick={handleReload}
            title="Reload stream"
            aria-label="Reload stream"
            className="flex h-8 w-8 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-90"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex h-8 w-8 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-90"
          >
            {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {/* 2. Desktop & Mobile Landscape Unified Top Bar */}
      <div className="z-30 hidden sm:flex landscape:flex shrink-0 items-center justify-between gap-1.5 sm:gap-2 border-b-[2px] border-black bg-[#ffe600] px-2 py-1 sm:px-3 sm:py-1.5 text-black shadow-[0_2px_0_#000] select-none min-h-[40px] sm:min-h-[44px] pt-[max(env(safe-area-inset-top),4px)] pl-[max(env(safe-area-inset-left),8px)] pr-[max(env(safe-area-inset-right),8px)]">
        {/* Left: Exit + Media / Episode Info */}
        <div className="flex items-center gap-1.5 min-w-0 shrink">
          {headerLeft}
          {type === "tv" ? (
            <>
              <span className="border-[1.5px] border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#ffe600] shrink-0">
                S{season}E{episode}
              </span>
              <p className="font-[var(--font-bricolage)] text-xs font-black uppercase tracking-[-0.01em] line-clamp-1 max-w-[120px] sm:max-w-[200px] md:max-w-[280px]">
                {episodeName || title || "Series"}
              </p>
              {onPrevEpisode && onNextEpisode && (
                <div className="flex items-center gap-1 shrink-0 ml-1">
                  <button
                    type="button"
                    disabled={Boolean(episode && episode <= 1)}
                    onClick={onPrevEpisode}
                    title="Previous Episode"
                    aria-label="Previous Episode"
                    className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1px_1px_0_#000] disabled:opacity-30 transition active:scale-90"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(episode && totalEpisodes && episode >= totalEpisodes)}
                    onClick={onNextEpisode}
                    title="Next Episode"
                    aria-label="Next Episode"
                    className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1px_1px_0_#000] disabled:opacity-30 transition active:scale-90"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              <span className="border-[1.5px] border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-[#ffe600] shrink-0">
                MOVIE
              </span>
              <p className="font-[var(--font-bricolage)] text-xs font-black uppercase tracking-[-0.01em] line-clamp-1 max-w-[130px] sm:max-w-[240px] md:max-w-[340px]">
                {title || "Movie"}
              </p>
            </>
          )}
        </div>

        {/* Center: Server Selector Button + headerCenter (Fill free space) */}
        <div className="flex items-center gap-1.5 shrink-0 mx-auto px-1">
          <button
            type="button"
            onClick={() => setIsServerDrawerOpen(true)}
            title="Open Server Selector drawer"
            aria-label="Open Server Selector drawer"
            className="inline-flex items-center gap-1.5 border-[1.5px] border-black bg-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#ffe600] shadow-[1.5px_1.5px_0_#000] transition active:scale-95 hover:bg-neutral-900 shrink-0 cursor-pointer"
          >
            <Server className="h-3.5 w-3.5 shrink-0" />
            <span>Server Selector</span>
            <span className="border-[1px] border-black bg-[#ffe600] px-1.5 py-0.2 text-[9px] font-black text-black">
              {activeServer.shortName}
            </span>
            <ChevronDown className="h-3 w-3 shrink-0 opacity-80" />
          </button>
          {headerCenter}
        </div>

        {/* Right: Controls (Reload, Fullscreen, Close) */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          {headerActions}
          <button
            type="button"
            onClick={handleReload}
            title="Reload stream"
            aria-label="Reload stream"
            className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1px_1px_0_#000] transition hover:bg-neutral-100 active:scale-90"
          >
            <RotateCw className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center border-[1.5px] border-black bg-white text-black shadow-[1px_1px_0_#000] transition hover:bg-neutral-100 active:scale-90"
          >
            {isFullscreen ? (
              <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            ) : (
              <Maximize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            )}
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              title="Close player"
              aria-label="Close player"
              className="flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center border-[1.5px] border-black bg-[#ff5376] text-black shadow-[1px_1px_0_#000] transition hover:opacity-90 active:scale-90 ml-0.5"
            >
              <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Video Frame Container */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden bg-black">
        {isLoading && (
          <div className={`absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 backdrop-blur-sm pointer-events-auto p-4 text-center text-sm font-bold uppercase tracking-[0.16em] transition-opacity duration-300 ${overlayBg}`}>
            <div className="flex items-center gap-2 border-[2px] border-black bg-[#ffe600] px-3.5 py-2 text-black shadow-[2px_2px_0_#000]">
              <Image
                src="/icon.svg"
                alt="Streamix"
                width={20}
                height={20}
                className="border-[1.5px] border-black shadow-[1px_1px_0_#000] shrink-0 animate-pulse"
              />
              <span className="text-xs sm:text-sm">Loading {activeServer.shortName}...</span>
            </div>

            <button
              type="button"
              onClick={handleSwitchNextServer}
              className="text-[10px] uppercase font-black underline underline-offset-2 hover:text-[#ffe600] text-current cursor-pointer mt-1"
            >
              Switch to {nextServer.shortName} &rarr;
            </button>
          </div>
        )}

        {hasError ? (
          <div className={`flex h-full min-h-[220px] flex-col items-center justify-center gap-3 p-6 text-center text-sm ${noticeClass}`}>
            <AlertCircle className="h-8 w-8 text-[#ff5376]" />
            <p className="font-bold">Stream unavailable on {activeServer.shortName}.</p>
            <button
              type="button"
              onClick={handleSwitchNextServer}
              className="mt-2 inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000]"
            >
              Switch to {nextServer.shortName}
            </button>
          </div>
        ) : (
          <iframe
            ref={iframeRef}
            key={`${selectedServerId}-${type}-${id}-${season || 1}-${episode || 1}-${keyCounter}`}
            src={embedUrl}
            allow="autoplay *; fullscreen *; encrypted-media *; picture-in-picture *; screen-wake-lock *; accelerometer *; gyroscope *"
            allowFullScreen={true}
            {...(isWatchParty ? { credentialless: "" } : {})}
            {...{
              webkitallowfullscreen: "true",
              mozallowfullscreen: "true",
              playsInline: true,
              "webkit-playsinline": "true",
            }}
            referrerPolicy="no-referrer-when-downgrade"
            className="absolute inset-0 h-full w-full border-0 bg-black"
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false);
              setHasError(true);
            }}
            title={`Video player (${activeServer.shortName})`}
          />
        )}

        {/* Synchronized Stream Pause Overlay */}
        {isPlaying === false && (
          <div
            onClick={onTogglePlayPause}
            className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/75 backdrop-blur-[2px] cursor-pointer select-none animate-in fade-in duration-150 p-3 sm:p-4"
          >
            <div className="border-[3px] border-black bg-[#ffe600] px-5 py-3 sm:px-7 sm:py-4 text-center text-black shadow-[4px_4px_0_#000] sm:shadow-[6px_6px_0_#000] max-w-[90vw] max-h-[90%] flex flex-col items-center justify-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Pause className="h-5 w-5 sm:h-7 sm:w-7 fill-current" />
                <span className="font-[var(--font-bricolage)] text-xl sm:text-3xl font-black uppercase tracking-tight">PAUSED</span>
              </div>
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-neutral-800">
                Stream paused at {formatPlaybackTime(currentTime ?? startTime ?? 0)}
              </p>
              {onTogglePlayPause && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTogglePlayPause();
                  }}
                  className="mt-2.5 inline-flex items-center gap-1.5 border-[2px] border-black bg-[#00f0ff] px-4 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:bg-white active:scale-95 transition"
                >
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Click to Resume for Everyone</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 4. Mobile Bottom Control Deck (Thumb-Friendly for Portrait Mode) */}
      {!hideBottomDeck && (
        <div className="z-30 shrink-0 border-t-[2px] border-black bg-[#111111] text-white px-3 pt-2.5 pb-[max(env(safe-area-inset-bottom),10px)] select-none portrait:flex sm:hidden landscape:hidden flex-col gap-2 shadow-[0_-2px_0_#000]">
        {/* Server Selector Trigger Button */}
        <button
          type="button"
          onClick={() => setIsServerDrawerOpen(true)}
          title="Open Server Selector drawer"
          aria-label="Open Server Selector drawer"
          className="w-full flex items-center justify-between border-[2px] border-black bg-neutral-950 p-2.5 text-left text-white shadow-[2px_2px_0_#000] transition active:scale-[0.98] hover:bg-neutral-900"
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border-[1.5px] border-black bg-[#ffe600] text-black shadow-[1px_1px_0_#000]">
              <Server className="h-3.5 w-3.5" />
            </div>
            <div>
              <span className="block text-[11px] font-black uppercase tracking-wider text-[#ffe600]">
                Server Selector
              </span>
              <span className="block text-[9px] font-semibold text-neutral-400">
                Tap to open server drawer
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-[10px] font-black text-black shadow-[1px_1px_0_#000]">
              {activeServer.shortName}
            </span>
            <ChevronDown className="h-4 w-4 text-neutral-400" />
          </div>
        </button>

        {/* Series Episode Navigation Deck (if TV) */}
        {type === "tv" && onPrevEpisode && onNextEpisode && (
          <div className="flex flex-col gap-1.5 pt-1.5 border-t border-neutral-800">
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
              <span className="truncate max-w-[210px] text-neutral-200">
                {episodeName ? `E${episode}: ${episodeName}` : `Episode ${episode}`}
              </span>
              {totalEpisodes && <span className="shrink-0">{episode} / {totalEpisodes}</span>}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={Boolean(episode && episode <= 1)}
                onClick={onPrevEpisode}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-[1.5px] border-black bg-white text-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] disabled:opacity-30 transition active:scale-95 hover:bg-neutral-100"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                <span>Prev Ep</span>
              </button>
              <button
                type="button"
                disabled={Boolean(episode && totalEpisodes && episode >= totalEpisodes)}
                onClick={onNextEpisode}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-[1.5px] border-black bg-[#ffe600] text-black text-[11px] font-black uppercase tracking-wider shadow-[2px_2px_0_#000] disabled:opacity-30 transition active:scale-95 hover:brightness-105"
              >
                <span>Next Ep</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
      )}

      {/* 5. Swipeable Server Selector Bottom Drawer */}
      <ServerDrawer
        isOpen={isServerDrawerOpen}
        onClose={() => setIsServerDrawerOpen(false)}
        selectedServerId={selectedServerId}
        onSelectServer={handleServerChange}
      />
    </div>
  );
}
