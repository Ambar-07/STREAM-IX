"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight, Flame, Sparkles, Star } from "lucide-react";
import MovieCard from "@/components/MovieCard";
import { useTheme } from "@/hooks/useTheme";
import type { Movie } from "@/lib/api";

interface MediaRailProps {
  title: string;
  tag?: string;
  tagColor?: string;
  icon?: "flame" | "sparkles" | "star";
  items: Movie[];
  loading?: boolean;
}

export default function MediaRail({
  title,
  tag = "Curated Shelf",
  tagColor = "#ffe600",
  icon = "flame",
  items,
  loading = false,
}: MediaRailProps) {
  const { darkMode } = useTheme();
  const railRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (railRef.current) {
      const scrollAmount = Math.min(railRef.current.clientWidth * 0.75, 600);
      railRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  const panelBg = darkMode ? "bg-[#111111]" : "bg-[#faf8f5]";
  const headerBorder = darkMode ? "border-black text-[#f5f0e8]" : "border-black text-black";
  const navBtnClass = darkMode
    ? "bg-[#1a1a1a] text-[#f5f0e8] hover:bg-[#252525]"
    : "bg-white text-black hover:bg-neutral-100";

  return (
    <section
      className={`mt-6 border-[2px] border-black p-3 shadow-[4px_4px_0_#000] sm:mt-10 sm:p-4 md:border-[3px] md:p-5 md:shadow-[6px_6px_0_#000] ${panelBg}`}
    >
      {/* Rail Header */}
      <div
        className={`mb-3 flex items-center justify-between gap-2 border-b-[2px] border-black pb-2.5 sm:mb-4 sm:gap-3 sm:pb-3 md:border-b-[3px] ${headerBorder}`}
      >
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div
            className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center border-[2px] border-black text-black shadow-[1.5px_1.5px_0_#000]"
            style={{ backgroundColor: tagColor }}
          >
            {icon === "flame" && <Flame className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />}
            {icon === "sparkles" && <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />}
            {icon === "star" && <Star className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span
                className="border-[1.5px] border-black px-1.5 py-0.2 text-[8.5px] sm:text-[9px] font-black uppercase text-black shadow-[1px_1px_0_#000]"
                style={{ backgroundColor: tagColor }}
              >
                {tag}
              </span>
              <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.14em] opacity-75 hidden xs:inline">
                {items.length} titles
              </span>
            </div>
            <h2 className="mt-0.5 font-[var(--font-bricolage)] text-[1.3rem] font-black uppercase leading-none tracking-[-0.05em] sm:text-[1.8rem] md:text-[2.1rem]">
              {title}
            </h2>
          </div>
        </div>

        {/* Scroll Arrows */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label={`Scroll ${title} left`}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-[2px] border-black shadow-[1.5px_1.5px_0_#000] sm:shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 ${navBtnClass}`}
          >
            <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label={`Scroll ${title} right`}
            className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center border-[2px] border-black shadow-[1.5px_1.5px_0_#000] sm:shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 ${navBtnClass}`}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Rail with Native Touch-Snap */}
      {loading ? (
        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-none">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="w-[155px] sm:w-[190px] md:w-[220px] shrink-0 aspect-[2/3] border-[3px] border-black bg-neutral-800 animate-pulse shadow-[4px_4px_0_#000]"
            />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div
          ref={railRef}
          className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 pt-1 scrollbar-thin scroll-smooth snap-x snap-mandatory touch-pan-x overscroll-x-contain"
        >
          {items.map((item) => (
            <div
              key={item.id}
              className="w-[155px] sm:w-[190px] md:w-[220px] shrink-0 snap-start flex flex-col"
            >
              <MovieCard movie={item} />
            </div>
          ))}
        </div>
      ) : (
        <div
          className={`border-[2px] border-dashed border-black p-6 text-center text-sm ${
            darkMode ? "bg-[#181818] text-[#f5f0e8]" : "bg-[#f2f0ed] text-black"
          }`}
        >
          No titles available in this shelf right now.
        </div>
      )}
    </section>
  );
}
