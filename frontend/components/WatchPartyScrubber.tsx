"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Clock, FastForward, Pause, Play, RefreshCw, Rewind, Sparkles } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface WatchPartyScrubberProps {
  currentTime: number; // in seconds
  duration?: number; // in seconds
  isHost: boolean;
  hostName: string;
  hostCurrentTime?: number;
  isPlaying?: boolean;
  onTogglePlayPause?: () => void;
  onSeek: (timeInSeconds: number) => void;
  onSyncAllToMyTime?: (timeInSeconds: number) => void;
  onResyncToHost?: () => void;
  onRestartFromBeginning?: () => void;
}

export function formatPlaybackTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const totalSecs = Math.floor(seconds);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;

  const mm = String(mins).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hrs > 0) {
    return `${hrs}:${mm}:${ss}`;
  }
  return `${mm}:${ss}`;
}

export function parsePlaybackTime(input: string): number | null {
  if (!input || !input.trim()) return null;
  const parts = input.trim().split(":").map((p) => parseInt(p, 10));
  if (parts.some((p) => isNaN(p) || p < 0)) return null;

  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  if (parts.length === 1) {
    return parts[0];
  }
  return null;
}

export default function WatchPartyScrubber({
  currentTime,
  duration = 7200, // default 2 hours if unknown
  isHost,
  hostName,
  hostCurrentTime,
  isPlaying = true,
  onTogglePlayPause,
  onSeek,
  onSyncAllToMyTime,
  onResyncToHost,
  onRestartFromBeginning,
}: WatchPartyScrubberProps) {
  const { darkMode } = useTheme();
  const sliderId = useId();
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState(currentTime);
  const [jumpInput, setJumpInput] = useState("");
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Sync local scrubber value when not dragging
  useEffect(() => {
    if (!isScrubbing) {
      setScrubValue(currentTime);
    }
  }, [currentTime, isScrubbing]);

  const effectiveDuration = Math.max(duration > 0 ? duration : 7200, currentTime + 600);

  const displayTime = isScrubbing ? scrubValue : currentTime;
  const hostTimeDiff =
    hostCurrentTime !== undefined && !isHost
      ? Math.abs(currentTime - hostCurrentTime)
      : 0;

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setScrubValue(Number(e.target.value));
  };

  const handleSliderCommit = () => {
    setIsScrubbing(false);
    onSeek(scrubValue);
    showNotice(`Scrubbed to ${formatPlaybackTime(scrubValue)}`);
  };

  const handleRelativeJump = (deltaSeconds: number) => {
    const nextTime = Math.max(0, Math.min(effectiveDuration, currentTime + deltaSeconds));
    onSeek(nextTime);
    showNotice(`${deltaSeconds > 0 ? "+" : ""}${deltaSeconds}s -> ${formatPlaybackTime(nextTime)}`);
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parsePlaybackTime(jumpInput);
    if (parsed !== null) {
      const clamped = Math.max(0, Math.min(effectiveDuration, parsed));
      onSeek(clamped);
      setJumpInput("");
      showNotice(`Jumped to ${formatPlaybackTime(clamped)}`);
    }
  };

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const containerBg = darkMode
    ? "bg-[#111111] text-[#f5f0e8] border-black"
    : "bg-[#faf8f5] text-[#111111] border-black";

  return (
    <div className={`border-[3px] p-3 sm:p-3.5 shadow-[4px_4px_0_#000] space-y-2.5 ${containerBg}`}>
      {/* Room Sync Controller Badge */}
      <div className="flex items-center justify-between border-b border-black/15 pb-1.5 text-[9.5px] font-black uppercase tracking-wider">
        <span className="inline-flex items-center gap-1.5 text-[#ffe600] bg-black px-2 py-0.5 shadow-[1px_1px_0_#000]">
          <Sparkles className="h-3 w-3 text-[#ffe600]" />
          <span>Watch Party Sync Controller</span>
        </span>
        <span className="opacity-75 hidden xs:inline">
          Controls stream position for all participants
        </span>
      </div>

      {/* 1. Header: Status & Live Timing */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0 flex-wrap">
          {/* Synchronized Play / Pause Button */}
          {onTogglePlayPause && (
            <button
              type="button"
              onClick={onTogglePlayPause}
              className={`inline-flex items-center gap-1.5 border-[2px] border-black px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-95 touch-manipulation cursor-pointer ${
                isPlaying
                  ? "bg-[#ffe600] hover:bg-[#ff5376]"
                  : "bg-[#00ff66] animate-pulse hover:bg-[#ffe600]"
              }`}
              title={isPlaying ? "Pause stream for everyone in the room" : "Resume stream for everyone in the room"}
            >
              {isPlaying ? (
                <>
                  <Pause className="h-3.5 w-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Resume</span>
                </>
              )}
            </button>
          )}

          <span className="flex items-center gap-1.5 border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 font-mono text-[11px] font-black uppercase text-black shadow-[1px_1px_0_#000]">
            <Clock className="h-3 w-3" />
            <span>{formatPlaybackTime(displayTime)}</span>
            <span className="opacity-50">/</span>
            <span className="opacity-75">{formatPlaybackTime(effectiveDuration)}</span>
          </span>

          {!isPlaying && (
            <span className="border border-black bg-[#ff5376] px-2 py-0.5 text-[9.5px] font-black uppercase text-black animate-pulse">
              PAUSED
            </span>
          )}

          {statusNotice ? (
            <span className="border border-black bg-[#00f0ff] px-2 py-0.5 text-[9.5px] font-black uppercase text-black animate-in fade-in duration-150">
              {statusNotice}
            </span>
          ) : (
            !isHost && hostCurrentTime !== undefined && (
              <span
                className={`border border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                  hostTimeDiff <= 3
                    ? "bg-[#00ff66] text-black"
                    : "bg-[#ff5376] text-black animate-pulse"
                }`}
              >
                {hostTimeDiff <= 3 ? "Synced with Host" : `Drifted by ${Math.round(hostTimeDiff)}s`}
              </span>
            )
          )}
        </div>

        {/* Sync to Host Quick Action for Guest */}
        {!isHost && hostCurrentTime !== undefined && onResyncToHost && (
          <button
            type="button"
            onClick={onResyncToHost}
            className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#00f0ff] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0_#000] transition hover:-translate-y-0.5 active:scale-95 touch-manipulation cursor-pointer"
            title="Jump directly to the Host's exact timestamp"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Sync to Host ({formatPlaybackTime(hostCurrentTime)})</span>
          </button>
        )}

        {/* Host Sync All Screens Quick Action */}
        {isHost && onSyncAllToMyTime && (
          <button
            type="button"
            onClick={() => {
              onSyncAllToMyTime(currentTime);
              showNotice(`Synced all participants to ${formatPlaybackTime(currentTime)}`);
            }}
            className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black shadow-[1.5px_1.5px_0_#000] transition hover:-translate-y-0.5 hover:bg-[#00f0ff] active:scale-95 touch-manipulation cursor-pointer"
            title="Force all participant screens to align with your current timestamp"
          >
            <Sparkles className="h-3 w-3" />
            <span>Sync All to My Time</span>
          </button>
        )}
      </div>

      {/* 2. Interactive Synchronized Scrub Bar */}
      <div className="relative pt-1">
        <label htmlFor={sliderId} className="sr-only">
          Seek stream position
        </label>
        <input
          id={sliderId}
          type="range"
          min={0}
          max={effectiveDuration}
          step={1}
          value={scrubValue}
          onChange={handleSliderChange}
          onMouseDown={() => setIsScrubbing(true)}
          onTouchStart={() => setIsScrubbing(true)}
          onMouseUp={handleSliderCommit}
          onTouchEnd={handleSliderCommit}
          className="h-3 w-full cursor-pointer appearance-none border-[2px] border-black bg-neutral-200 dark:bg-neutral-800 accent-[#ffe600] shadow-[2px_2px_0_#000] transition active:accent-[#00f0ff]"
        />

        {/* Progress fill visual indicator */}
        <div className="flex justify-between text-[9px] font-mono font-bold opacity-60 mt-1">
          <span>00:00</span>
          <span className="font-black uppercase tracking-wider text-current opacity-90">
            {isScrubbing ? `Dragging to ${formatPlaybackTime(scrubValue)}...` : "Drag scrubber to sync everyone"}
          </span>
          <span>{formatPlaybackTime(effectiveDuration)}</span>
        </div>
      </div>

      {/* 3. Scrub Controls & Jump to Timestamp Input */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/15">
        {/* Step Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => {
              if (onRestartFromBeginning) {
                onRestartFromBeginning();
              } else {
                onSeek(0);
              }
              showNotice("Reset stream to 00:00 for everyone");
            }}
            className="inline-flex items-center gap-1 border-[1.5px] border-black bg-[#ff5376] px-2 py-1 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_#000] transition hover:bg-black hover:text-white active:scale-95 touch-manipulation cursor-pointer"
            title="Reset stream to 00:00 for all participants"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Start 00:00</span>
          </button>

          <button
            type="button"
            onClick={() => handleRelativeJump(-10)}
            className="inline-flex items-center gap-1 border-[1.5px] border-black bg-white dark:bg-neutral-900 px-2 py-1 text-[10px] font-black uppercase text-black dark:text-white shadow-[1px_1px_0_#000] transition hover:bg-[#ffe600] dark:hover:bg-[#ffe600] dark:hover:text-black active:scale-95 touch-manipulation"
            title="Rewind 10 seconds for all"
          >
            <Rewind className="h-3 w-3" />
            <span>-10s</span>
          </button>

          <button
            type="button"
            onClick={() => handleRelativeJump(10)}
            className="inline-flex items-center gap-1 border-[1.5px] border-black bg-white dark:bg-neutral-900 px-2 py-1 text-[10px] font-black uppercase text-black dark:text-white shadow-[1px_1px_0_#000] transition hover:bg-[#ffe600] dark:hover:bg-[#ffe600] dark:hover:text-black active:scale-95 touch-manipulation"
            title="Forward 10 seconds for all"
          >
            <span>+10s</span>
            <FastForward className="h-3 w-3" />
          </button>

          <button
            type="button"
            onClick={() => handleRelativeJump(60)}
            className="inline-flex items-center gap-1 border-[1.5px] border-black bg-white dark:bg-neutral-900 px-2 py-1 text-[10px] font-black uppercase text-black dark:text-white shadow-[1px_1px_0_#000] transition hover:bg-[#ffe600] dark:hover:bg-[#ffe600] dark:hover:text-black active:scale-95 touch-manipulation"
            title="Forward 1 minute for all"
          >
            <span>+1m</span>
          </button>
        </div>

        {/* Direct Timestamp Jump Form */}
        <form onSubmit={handleJumpSubmit} className="flex items-center gap-1.5 ml-auto">
          <input
            type="text"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            placeholder="e.g. 25:00"
            className="w-20 sm:w-24 border-[1.5px] border-black bg-white dark:bg-neutral-900 px-2 py-1 text-[10.5px] font-mono font-black uppercase text-black dark:text-white shadow-[1px_1px_0_#000] outline-none"
          />
          <button
            type="submit"
            disabled={!jumpInput.trim()}
            className="border-[1.5px] border-black bg-[#ffe600] px-2.5 py-1 text-[10px] font-black uppercase text-black shadow-[1px_1px_0_#000] transition hover:bg-[#00f0ff] active:scale-95 disabled:opacity-40 disabled:pointer-events-none touch-manipulation"
          >
            Jump
          </button>
        </form>
      </div>
    </div>
  );
}
