import { useState } from "react";
import { Check, Copy, Crown, Play, RefreshCw, Share2, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { formatPlaybackTime } from "@/components/WatchPartyScrubber";

interface WatchPartyHostControlsProps {
  roomCode: string;
  isHost: boolean;
  hostName: string;
  currentTime?: number;
  hostCurrentTime?: number;
  onTriggerCountdown: () => void;
  onSyncServer: () => void;
  onSyncTimeToAll?: () => void;
  onResyncToHost?: () => void;
  onRestartFromBeginning?: () => void;
  isCountdownActive?: boolean;
}

export default function WatchPartyHostControls({
  roomCode,
  isHost,
  hostName,
  currentTime,
  hostCurrentTime,
  onTriggerCountdown,
  onSyncServer,
  onSyncTimeToAll,
  onResyncToHost,
  onRestartFromBeginning,
  isCountdownActive,
}: WatchPartyHostControlsProps) {
  const { darkMode } = useTheme();
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    const shareData = {
      title: "Streamix Watch Party",
      text: `Join my Streamix watch party with room code: ${roomCode}!`,
      url,
    };

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyCode = async () => {
    if (typeof window === "undefined") return;
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
    }
  };

  const containerBg = darkMode ? "bg-[#161616] text-[#f5f0e8]" : "bg-[#f2f0ed] text-[#111111]";

  return (
    <div className={`border-[3px] border-black p-3 sm:p-3.5 shadow-[4px_4px_0_#000] space-y-2.5 sm:space-y-3 ${containerBg}`}>
      {/* 1. Header & Room Share Pill */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          {isHost ? (
            <span className="inline-flex items-center gap-1 border-[2px] border-black bg-[#ffe600] px-2 py-0.5 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000]">
              <Crown className="h-3 w-3 fill-current" /> You are Host
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 border-[2px] border-black bg-[#00f0ff] px-2 py-0.5 text-[9px] sm:text-[9.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000] truncate">
              Host: {hostName}
            </span>
          )}
        </div>

        {/* Share buttons */}
        <div className="flex items-center gap-1.5 shrink-0 ml-auto">
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy room code"
            className="inline-flex items-center gap-1 border-[2px] border-black bg-white px-2 py-1 text-[9.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000] transition hover:bg-[#ffe600] active:scale-95 touch-manipulation min-h-[30px]"
          >
            {copiedCode ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
            <span>{copiedCode ? "Copied" : roomCode}</span>
          </button>

          <button
            type="button"
            onClick={handleShare}
            title="Invite friends"
            className="inline-flex items-center gap-1 border-[2px] border-black bg-[#ff5376] px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000] transition hover:-translate-y-0.5 active:scale-95 touch-manipulation min-h-[30px]"
          >
            {copiedLink ? <Check className="h-3 w-3" /> : <Share2 className="h-3 w-3" />}
            <span>{copiedLink ? "Link Copied!" : "Invite Friends"}</span>
          </button>
        </div>
      </div>

      {/* 2. Playback Synchronization Actions */}
      <div className="flex flex-wrap gap-2 pt-1 border-t border-black/20">
        {isHost ? (
          <>
            <button
              type="button"
              onClick={onTriggerCountdown}
              disabled={isCountdownActive}
              className="flex-1 min-w-[130px] min-h-[38px] inline-flex items-center justify-center gap-2 border-[2px] border-black bg-[#ffe600] px-3 py-2 text-[10.5px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 touch-manipulation"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>{isCountdownActive ? "Starting Party..." : "Sync Play (3-2-1)"}</span>
            </button>

            {onSyncTimeToAll && (
              <button
                type="button"
                onClick={onSyncTimeToAll}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 border-[2px] border-black bg-[#00ff88] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 touch-manipulation"
                title="Broadcast your exact stream position to all guests"
              >
                <Sparkles className="h-3 w-3" />
                <span>Sync Time To All {currentTime !== undefined ? `(${formatPlaybackTime(currentTime)})` : ""}</span>
              </button>
            )}

            {onRestartFromBeginning && (
              <button
                type="button"
                onClick={onRestartFromBeginning}
                className="min-h-[38px] inline-flex items-center justify-center gap-1.5 border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:bg-black hover:text-white active:scale-95 touch-manipulation"
                title="Reset stream to 00:00 and launch 3-2-1 countdown for all screens"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Restart 00:00 (Sync All)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onSyncServer}
              className="min-h-[38px] inline-flex items-center justify-center gap-1.5 border-[2px] border-black bg-white px-3 py-2 text-[10px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:bg-[#00f0ff] active:scale-95 touch-manipulation"
            >
              <RefreshCw className="h-3 w-3" />
              <span>Broadcast Server</span>
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onResyncToHost}
            className="w-full min-h-[38px] inline-flex items-center justify-center gap-2 border-[2px] border-black bg-[#00f0ff] px-3 py-2 text-[10.5px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 touch-manipulation font-mono"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>
              Re-sync Player to Host {hostCurrentTime !== undefined && hostCurrentTime > 0 ? `(${formatPlaybackTime(hostCurrentTime)})` : ""}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}
