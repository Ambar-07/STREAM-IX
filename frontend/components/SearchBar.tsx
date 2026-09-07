"use client";

import { Search } from "lucide-react";
import { openSearchSpotlight } from "@/lib/api";

interface SearchBarProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ placeholder = "Search movies, series, TMDB..." }: SearchBarProps) {
  return (
    <button
      type="button"
      onClick={openSearchSpotlight}
      className="flex h-11 w-full items-center justify-between border-[2.5px] border-black bg-white px-3.5 text-black shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-[0.99] dark:bg-[#1a1a1a] dark:text-[#f5f0e8]"
    >
      <div className="flex items-center gap-2.5">
        <Search className="h-4 w-4 shrink-0 stroke-[2.5] text-[#111111] dark:text-[#f5f0e8]" />
        <span className="text-xs font-black uppercase tracking-[0.14em] text-black/70 dark:text-white/70">
          {placeholder}
        </span>
      </div>
      <kbd className="hidden sm:inline-flex items-center border-[1.5px] border-black bg-black px-1.5 py-0.5 font-mono text-[9px] font-bold text-white shadow-[1px_1px_0_#ffe600]">
        Ctrl K
      </kbd>
    </button>
  );
}

