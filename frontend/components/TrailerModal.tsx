"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { Play, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { TrailerVideo } from "@/lib/api";

type TrailerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  trailerKey: string | null | undefined;
  trailerName?: string | null;
  videos?: TrailerVideo[];
};

export default function TrailerModal({
  isOpen,
  onClose,
  title,
  trailerKey,
  trailerName,
  videos = [],
}: TrailerModalProps) {
  const { darkMode } = useTheme();

  // Available YouTube videos
  const availableVideos = useMemo(
    () => videos.filter((v) => v.key && (v.site === "YouTube" || !v.site)),
    [videos]
  );
  const defaultKey = trailerKey || availableVideos[0]?.key || null;
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const activeKey = selectedKey ?? defaultKey;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentVideo = availableVideos.find((v) => v.key === activeKey);
  const currentTitle = currentVideo?.name || trailerName || "Official Trailer";

  const overlayBg = darkMode ? "bg-[#0d0d0d]/95" : "bg-[#111111]/85";
  const modalBg = darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const headerBg = darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} Trailer`}
      className={`fixed inset-0 z-[100] flex items-center justify-center p-2.5 sm:p-4 md:p-6 backdrop-blur-sm transition-opacity duration-200 ${overlayBg}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className={`relative flex w-full max-w-4xl flex-col border-[3px] border-black shadow-[8px_8px_0_#000] overflow-hidden ${modalBg}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className={`flex items-center justify-between gap-3 border-b-[3px] border-black px-3.5 py-2.5 sm:px-5 sm:py-3 ${headerBg}`}>
          <div className="flex items-center gap-2.5 min-w-0">
            <Image
              src="/icon.svg"
              alt="Streamix"
              width={30}
              height={30}
              className="border-[2px] border-black shadow-[1.5px_1.5px_0_#000] shrink-0"
            />
            <div className="min-w-0">
              <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] opacity-75">
                Streamix Theater Preview
              </p>
              <h3 className="truncate font-[var(--font-bricolage)] text-base sm:text-xl font-black uppercase tracking-[-0.03em]">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="hidden sm:inline-block border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-black">
              {currentTitle}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close trailer"
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-[2px] border-black bg-white text-black shadow-[2px_2px_0_#000] transition hover:bg-[#ff5376] active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Video Player Box */}
        <div className="relative w-full aspect-video bg-black overflow-hidden">
          {activeKey ? (
            <iframe
              key={activeKey}
              src={`https://www.youtube-nocookie.com/embed/${activeKey}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
              title={`${title} Trailer`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="block h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm font-bold uppercase tracking-[0.16em] text-white/80">
              No official trailer available for this title.
            </div>
          )}
        </div>

        {/* Multi-Trailer Selection Pills */}
        {availableVideos.length > 1 && (
          <div className={`border-t-[3px] border-black p-2.5 sm:p-3 ${headerBg}`}>
            <p className="mb-2 text-[9px] font-black uppercase tracking-[0.18em] opacity-80">
              Select clip ({availableVideos.length} available):
            </p>
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 max-h-24 overflow-y-auto">
              {availableVideos.map((video) => {
                const isCurrent = video.key === activeKey;
                return (
                  <button
                    key={video.id}
                    type="button"
                    onClick={() => setSelectedKey(video.key)}
                    className={`inline-flex items-center gap-1.5 border-[2px] border-black px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.12em] transition ${
                      isCurrent
                        ? "bg-[#ffe600] text-black shadow-[2px_2px_0_#000]"
                        : darkMode
                          ? "bg-[#252525] text-[#f5f0e8] hover:bg-[#303030]"
                          : "bg-white text-black hover:bg-neutral-100"
                    }`}
                  >
                    <Play className={`h-2.5 w-2.5 ${isCurrent ? "fill-current" : ""}`} />
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">{video.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
