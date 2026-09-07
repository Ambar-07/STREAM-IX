"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUp, Code2, LogOut } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export default function Footer() {
  const router = useRouter();
  const { darkMode } = useTheme();

  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("movie_app_token");
      localStorage.removeItem("movie_app_user");
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));
      router.push("/login");
    }
  };

  const footerBg = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const borderClass = "border-black";
  const linkHover = darkMode ? "hover:text-[#ffe600]" : "hover:text-neutral-600";

  return (
    <footer className={`mt-16 border-t-[3px] ${borderClass} ${footerBg}`}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* Brand & Developer Attribution */}
          <div className="flex flex-wrap items-center gap-3.5">
            <Link href="/dashboard" className="flex items-center gap-2.5 transition hover:opacity-85">
              <Image
                src="/icon.svg"
                alt="Streamix Logo"
                width={32}
                height={32}
                className="h-8 w-8 border-[2px] border-black shadow-[2px_2px_0_#000] shrink-0"
              />
              <span className="font-[var(--font-bricolage)] text-lg font-black uppercase tracking-tight">
                STREAMIX
              </span>
            </Link>

            <div
              className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000]"
            >
              <Code2 className="h-3.5 w-3.5" />
              <span>Neo-Brutalist Edition</span>
            </div>
          </div>

          {/* Navigation Links & Session Actions */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-bold uppercase tracking-[0.14em]">
            <Link href="/dashboard" className={`transition ${linkHover}`}>
              Dashboard
            </Link>
            <span className="opacity-25 select-none">•</span>
            <Link href="/watchlist" className={`transition ${linkHover}`}>
              Watchlist
            </Link>
            <span className="opacity-25 select-none">•</span>
            <button
              type="button"
              onClick={handleSignOut}
              className={`inline-flex items-center gap-1.5 transition ${linkHover}`}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
            <span className="opacity-25 select-none">•</span>
            <button
              type="button"
              onClick={scrollToTop}
              className={`inline-flex items-center gap-1.5 transition ${linkHover}`}
            >
              <ArrowUp className="h-3.5 w-3.5" />
              <span>Top</span>
            </button>
          </div>
        </div>

        {/* Minimal Bottom Bar */}
        <div className="mt-6 border-t-[1.5px] border-black/20 dark:border-white/15 pt-4 flex items-center justify-between gap-2 text-[10px] font-mono opacity-60">
          <p>&copy; {new Date().getFullYear()} Streamix &bull; All rights reserved</p>
        </div>
      </div>
    </footer>
  );
}
