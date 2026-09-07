"use client";

import React, { useState, useEffect, useRef } from "react";
import { Copy, Maximize2, Minimize2, Play, Radio, Share2, Tv, Users, Video, Volume2, VolumeX } from "lucide-react";
import { useWebRTC, type WatchPartyRole } from "@/hooks/useWebRTC";

export interface WatchPartyBarCenterProps {
  roomCode: string;
  participantsCount: number;
  isHost: boolean;
  isSharing: boolean;
}

export interface WatchPartyRoomCardProps {
  roomCode: string;
  participantsCount?: number;
  isHost: boolean;
  isSharing: boolean;
}

/**
 * Dedicated Room Info & Invite Card positioned directly under Party Chat.
 * Clean, concise, without repetitive or filler elements.
 */
export const WatchPartyRoomCard: React.FC<WatchPartyRoomCardProps> = ({
  roomCode,
  isHost,
  isSharing,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Join my Streamix Watch Party!",
          text: `Join my watch party with code: ${roomCode}`,
          url,
        })
        .catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  return (
    <div className="border-[3px] border-black bg-[#ffe600] p-2 sm:p-2.5 text-black shadow-[4px_4px_0_#000] select-none shrink-0 w-full box-border overflow-hidden">
      {/* Action Buttons: 2-column grid that strictly fits within card container */}
      <div className="grid grid-cols-2 gap-2 w-full min-w-0">
        {/* Room Code Button with Copy Feedback */}
        <button
          type="button"
          onClick={handleCopyCode}
          title="Click to copy Room Code"
          aria-label="Click to copy Room Code"
          className="w-full min-w-0 flex items-center justify-center gap-1.5 border-[2px] border-black bg-black text-[#ffe600] hover:bg-neutral-900 min-h-[44px] sm:min-h-0 py-2 sm:py-1.5 px-2 text-[11px] sm:text-xs font-mono font-black uppercase tracking-wider shadow-[2px_2px_0_#000] active:scale-95 transition touch-manipulation cursor-pointer overflow-hidden"
        >
          <Copy className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{copiedCode ? "COPIED! ✓" : roomCode}</span>
        </button>

        {/* Invite Friends Button */}
        <button
          type="button"
          onClick={handleInvite}
          title="Invite friends / copy party link"
          aria-label="Invite friends / copy party link"
          className="w-full min-w-0 flex items-center justify-center gap-1.5 border-[2px] border-black bg-white hover:bg-neutral-100 text-black min-h-[44px] sm:min-h-0 py-2 sm:py-1.5 px-2 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] active:scale-95 transition touch-manipulation cursor-pointer overflow-hidden"
        >
          <Share2 className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate whitespace-nowrap">{copiedInvite ? "COPIED! ✓" : "INVITE"}</span>
        </button>
      </div>

      {isSharing && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5 border border-black bg-[#ff5376] py-0.5 px-2 text-[9px] font-black uppercase tracking-wider text-black">
          <span className="h-1.5 w-1.5 rounded-full bg-black animate-ping" />
          <span>LIVE BROADCASTING TO VIEWERS</span>
        </div>
      )}
    </div>
  );
};

/**
 * Dedicated Center Controls filling the free space of the top bar.
 * Features: Host/Live badge, Click-to-copy Room Code, Invite button, Participants count.
 */
export const WatchPartyBarCenter: React.FC<WatchPartyBarCenterProps> = ({
  roomCode,
  participantsCount,
  isHost,
  isSharing,
}) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleInvite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator
        .share({
          title: "Join my Streamix Watch Party!",
          text: `Join my watch party with code: ${roomCode}`,
          url,
        })
        .catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(url);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  return (
    <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
      {/* Host / Role Badge */}
      {isHost ? (
        <span
          className={`border-[1.5px] border-black px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider shrink-0 shadow-[1px_1px_0_#000] ${
            isSharing
              ? "bg-[#ff5376] text-black animate-pulse"
              : "bg-black text-[#ffe600]"
          }`}
          title={isSharing ? "Broadcasting live to party" : "You are party host"}
        >
          {isSharing ? "🔴 LIVE" : "👑 HOST"}
        </span>
      ) : (
        <span
          className="border-[1.5px] border-black bg-white text-black px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider shrink-0 shadow-[1px_1px_0_#000]"
          title="Watching party as guest"
        >
          🍿 VIEWER
        </span>
      )}

      {/* Room Code Button with Copy Feedback */}
      <button
        type="button"
        onClick={handleCopyCode}
        title="Click to copy Room Code"
        aria-label="Click to copy Room Code"
        className="flex items-center gap-1 border-[1.5px] border-black bg-black text-[#ffe600] px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-mono font-black uppercase tracking-wider shadow-[1px_1px_0_#000] hover:bg-neutral-900 active:scale-95 transition cursor-pointer shrink-0"
      >
        <Copy className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
        <span>{copiedCode ? "COPIED! ✓" : roomCode}</span>
      </button>

      {/* Invite Friends Button */}
      <button
        type="button"
        onClick={handleInvite}
        title="Copy invite link or share"
        aria-label="Copy invite link or share"
        className="flex items-center gap-1 border-[1.5px] border-black bg-white hover:bg-neutral-100 text-black px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000] active:scale-95 transition cursor-pointer shrink-0"
      >
        <Share2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
        <span className="hidden xs:inline">
          {copiedInvite ? "COPIED! ✓" : "INVITE"}
        </span>
        <span className="xs:hidden">
          {copiedInvite ? "✓" : "INVITE"}
        </span>
      </button>

      {/* Participants Count Badge */}
      <div
        title={`${participantsCount} participant${participantsCount === 1 ? "" : "s"} in room`}
        className="flex items-center gap-1 border-[1.5px] border-black bg-white text-black px-1.5 sm:px-2 py-0.5 text-[8.5px] sm:text-[9.5px] font-black shrink-0 shadow-[1px_1px_0_#000]"
      >
        <Users className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
        <span>{participantsCount}</span>
      </div>
    </div>
  );
};

export interface WatchPartyHeaderControlsProps {
  isHost: boolean;
  theaterMode: boolean;
  isSharing: boolean;
  onEnterTheaterMode?: () => void;
  onExitTheaterMode?: () => void;
  onStartScreenShare?: () => void;
  onStopScreenShare?: () => void;
}

/**
 * Dedicated Header Controls rendered directly inside VideoPlayer top bar right section.
 */
export const WatchPartyHeaderControls: React.FC<WatchPartyHeaderControlsProps> = ({
  isHost,
  theaterMode,
  isSharing,
  onEnterTheaterMode,
  onExitTheaterMode,
  onStartScreenShare,
  onStopScreenShare,
}) => {
  if (!isHost) return null;

  if (theaterMode) {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Dedicated Start / Stop Watch Party Button */}
        {isSharing ? (
          <button
            type="button"
            onClick={onStopScreenShare}
            title="Stop Screen Sharing"
            aria-label="Stop Screen Sharing"
            className="flex items-center gap-1 sm:gap-1.5 border-[1.5px] border-black bg-[#ff5376] hover:bg-[#ff3b64] text-black px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:scale-95 transition cursor-pointer shrink-0"
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-black opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-black"></span>
            </span>
            <span className="hidden xs:inline">Stop Watch Party</span>
            <span className="xs:hidden">Stop</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onStartScreenShare}
            title="Start Screen Sharing to Viewers"
            aria-label="Start Screen Sharing to Viewers"
            className="flex items-center gap-1 sm:gap-1.5 border-[1.5px] border-black bg-[#00e599] hover:bg-[#00c985] text-black px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:scale-95 transition cursor-pointer shrink-0"
          >
            <Radio className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden xs:inline">Start Watch Party</span>
            <span className="xs:hidden">Share</span>
          </button>
        )}

        {/* Dedicated Exit Theater Mode Button */}
        {onExitTheaterMode && (
          <button
            type="button"
            onClick={onExitTheaterMode}
            title="Exit Theater Mode"
            aria-label="Exit Theater Mode"
            className="flex items-center gap-1 sm:gap-1.5 border-[1.5px] border-black bg-white hover:bg-neutral-100 text-black px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:scale-95 transition cursor-pointer shrink-0"
          >
            <Minimize2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
            <span className="hidden xs:inline">Exit Theater</span>
            <span className="xs:hidden">Exit</span>
          </button>
        )}
      </div>
    );
  }

  // Normal Mode inside header bar
  return (
    <div className="flex items-center gap-1 shrink-0">
      {onEnterTheaterMode && (
        <button
          type="button"
          onClick={onEnterTheaterMode}
          title="Enter Theater Mode for clean screen sharing"
          aria-label="Enter Theater Mode"
          className="flex items-center gap-1 sm:gap-1.5 border-[1.5px] border-black bg-black text-[#ffe600] hover:bg-neutral-900 px-2 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-wider shadow-[1.5px_1.5px_0_#000] active:scale-95 transition cursor-pointer shrink-0"
        >
          <Tv className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
          <span className="hidden xs:inline">Theater Mode</span>
          <span className="xs:hidden">Theater</span>
        </button>
      )}
    </div>
  );
};

export interface WatchPartyProps {
  roomId: string;
  role?: WatchPartyRole;
  isHost?: boolean;
  theaterMode?: boolean;
  onEnterTheaterMode?: () => void;
  onExitTheaterMode?: () => void;
  webRTC?: ReturnType<typeof useWebRTC>;
}

export const WatchParty: React.FC<WatchPartyProps> = ({
  roomId,
  role: roleProp,
  isHost: isHostProp,
  theaterMode = false,
  onEnterTheaterMode,
  onExitTheaterMode,
  webRTC: externalWebRTC,
}) => {
  const role: WatchPartyRole = roleProp || (isHostProp ? "host" : "viewer");

  const internalWebRTC = useWebRTC({
    roomId,
    role,
  });

  const {
    isSharing,
    remoteStream,
    startScreenShare,
    stopScreenShare,
    remoteVideoRef,
  } = externalWebRTC || internalWebRTC;

  const [hasReceivedStream, setHasReceivedStream] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const videoContainerRef = useRef<HTMLDivElement>(null);

  // Sync state whenever remoteStream or isSharing becomes true
  useEffect(() => {
    if (remoteStream || isSharing) {
      setHasReceivedStream(true);
    }
  }, [remoteStream, isSharing]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement || (document as any).webkitFullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    document.addEventListener("webkitfullscreenchange", handleFsChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFsChange);
      document.removeEventListener("webkitfullscreenchange", handleFsChange);
    };
  }, []);

  // Listen directly on the video element for playback & audio state
  useEffect(() => {
    const video = remoteVideoRef?.current;
    if (!video) return;

    const handlePlay = () => {
      setHasReceivedStream(true);
      setIsPlaying(true);
      setIsAudioMuted(video.muted);
    };
    const handlePause = () => {
      setIsPlaying(false);
    };
    const handleVolume = () => {
      setIsAudioMuted(video.muted);
    };

    const handleStalled = () => {
      if (video.srcObject && video.paused) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener("playing", handlePlay);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("loadedmetadata", handlePlay);
    video.addEventListener("timeupdate", handlePlay);
    video.addEventListener("volumechange", handleVolume);
    video.addEventListener("waiting", handleStalled);
    video.addEventListener("stalled", handleStalled);

    if (video.srcObject) {
      setHasReceivedStream(true);
      video.muted = true;
      video.playsInline = true;
      video.play().then(() => setIsPlaying(true)).catch(() => {});
    }

    return () => {
      video.removeEventListener("playing", handlePlay);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("loadedmetadata", handlePlay);
      video.removeEventListener("timeupdate", handlePlay);
      video.removeEventListener("volumechange", handleVolume);
      video.removeEventListener("waiting", handleStalled);
      video.removeEventListener("stalled", handleStalled);
    };
  }, [remoteVideoRef, remoteStream]);

  const handleToggleMute = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = remoteVideoRef?.current;
    if (video) {
      const nextMuted = !video.muted;
      video.muted = nextMuted;
      setIsAudioMuted(nextMuted);
      if (video.paused) {
        video.play().catch(() => {});
      }
    }
  };

  const handleStartPlayback = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = remoteVideoRef?.current;
    if (video) {
      video.muted = false;
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setIsAudioMuted(false);
        })
        .catch(() => {
          video.muted = true;
          setIsAudioMuted(true);
          video
            .play()
            .then(() => setIsPlaying(true))
            .catch(() => {});
        });
    }
  };

  const toggleFullscreen = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const container = videoContainerRef.current;
    if (!container) return;

    if (!document.fullscreenElement) {
      if (container.requestFullscreen) {
        container.requestFullscreen().catch(() => {});
      } else if ((container as any).webkitRequestFullscreen) {
        (container as any).webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if ((document as any).webkitExitFullscreen) {
        (document as any).webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  const hasActiveStream = Boolean(
    remoteStream ||
    isSharing ||
    hasReceivedStream ||
    (remoteVideoRef?.current && remoteVideoRef.current.srcObject)
  );

  // Viewer View: Stream Display with Custom Live Neo-Brutalist Controls
  if (role === "viewer") {
    return (
      <div
        ref={videoContainerRef}
        className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none group"
        onClick={handleStartPlayback}
      >
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          muted
          onPlaying={() => {
            setHasReceivedStream(true);
            setIsPlaying(true);
          }}
          onLoadedData={() => {
            setHasReceivedStream(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
          }}
          onLoadedMetadata={() => {
            setHasReceivedStream(true);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.play().catch(() => {});
            }
          }}
          onCanPlay={() => {
            setHasReceivedStream(true);
            if (remoteVideoRef.current && remoteVideoRef.current.paused) {
              remoteVideoRef.current.play().catch(() => {});
            }
          }}
          className="w-full h-full object-contain bg-black"
        />

        {/* Floating Tap-to-Play if Browser Autoplay Policy Paused the Stream */}
        {hasActiveStream && !isPlaying && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px] p-4 text-center">
            <button
              type="button"
              onClick={handleStartPlayback}
              className="flex items-center gap-2 border-[3px] border-black bg-[#ffe600] px-5 sm:px-6 py-3 sm:py-3.5 min-h-[48px] text-sm sm:text-base font-black uppercase tracking-wider text-black shadow-[5px_5px_0_#000] hover:bg-white active:scale-95 transition touch-manipulation cursor-pointer"
            >
              <Play className="h-5 w-5 fill-current text-black" />
              <span>Tap to Watch Live Feed</span>
            </button>
            <p className="mt-3 text-xs font-bold text-neutral-300">
              Click anywhere to resume video & audio playback
            </p>
          </div>
        )}

        {/* Custom Streamix Live Bar Overlay */}
        {hasActiveStream && (
          <div className="absolute bottom-0 inset-x-0 z-30 flex items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5 pb-[max(env(safe-area-inset-bottom),0.5rem)] bg-gradient-to-t from-black/90 via-black/60 to-transparent pointer-events-auto">
            {/* Left: Live status badge */}
            <div className="flex items-center gap-2 border-[2px] border-black bg-[#111] px-2.5 py-1 shadow-[2px_2px_0_#000]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600"></span>
              </span>
              <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider text-white">
                LIVE FEED
              </span>
            </div>

            {/* Right: Audio toggle + Fullscreen */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={handleToggleMute}
                className={`flex items-center justify-center gap-1.5 border-[2px] border-black px-3 sm:px-2.5 py-2 sm:py-1 min-h-[44px] sm:min-h-0 text-[11px] sm:text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] transition active:scale-95 touch-manipulation cursor-pointer ${
                  isAudioMuted
                    ? "bg-[#ffe600] text-black hover:bg-white"
                    : "bg-[#222] text-white hover:bg-neutral-800"
                }`}
                title={isAudioMuted ? "Click to Unmute" : "Mute Stream"}
              >
                {isAudioMuted ? (
                  <>
                    <VolumeX className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                    <span>Unmute</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 sm:h-3.5 sm:w-3.5 text-emerald-400" />
                    <span>Audio On</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleFullscreen}
                className="flex items-center justify-center border-[2px] border-black bg-[#222] p-2.5 sm:p-1.5 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 text-white shadow-[2px_2px_0_#000] hover:bg-neutral-800 active:scale-95 touch-manipulation transition cursor-pointer"
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <Maximize2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
                )}
              </button>
            </div>
          </div>
        )}

        {!hasActiveStream && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 text-white p-4 text-center">
            <div className="border-[3px] border-[#ffe600] bg-black px-6 py-5 shadow-[5px_5px_0_#ffe600] max-w-sm space-y-2">
              <Radio className="h-7 w-7 text-[#ffe600] mx-auto animate-pulse" />
              <p className="font-[var(--font-bricolage)] text-sm sm:text-base font-black uppercase tracking-wider text-[#ffe600]">
                Waiting for Host Stream...
              </p>
              <p className="text-[11px] text-neutral-300 font-bold leading-relaxed">
                The host hasn't started screen sharing yet. Stream will start playing automatically once broadcasting begins.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Host View: Theater Mode
  if (theaterMode) {
    return (
      <WatchPartyHeaderControls
        isHost={true}
        theaterMode={true}
        isSharing={isSharing}
        onExitTheaterMode={onExitTheaterMode}
        onStartScreenShare={startScreenShare}
        onStopScreenShare={stopScreenShare}
      />
    );
  }

  return null;
};

export default WatchParty;
