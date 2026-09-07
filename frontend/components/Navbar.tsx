"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Bookmark,
  ChevronDown,
  Film,
  LogOut,
  Menu,
  MoonStar,
  Search,
  Settings,
  Smartphone,
  SunMedium,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import WatchPartyModal from "@/components/WatchPartyModal";
import { useTheme } from "@/hooks/useTheme";
import { openSearchSpotlight } from "@/lib/api";
import { getWatchlist } from "@/lib/watchlist";

const navLinks = [
  { label: "Dashboard", href: "/dashboard", icon: Film },
  { label: "Watchlist", href: "/watchlist", icon: Bookmark },
];

interface CurrentUser {
  id?: string;
  email?: string;
  username?: string;
  displayName?: string;
  avatar?: string;
}

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { darkMode, toggleTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [watchPartyModalOpen, setWatchPartyModalOpen] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [isStandalone] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    }
    return true;
  });

  // Load user and watchlist data
  useEffect(() => {
    function loadUserData() {
      if (typeof window === "undefined") return;
      setWatchlistCount(getWatchlist().length);

      const rawUser = localStorage.getItem("movie_app_user");
      if (rawUser) {
        try {
          setCurrentUser(JSON.parse(rawUser));
        } catch {
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
    }

    loadUserData();

    if (typeof window !== "undefined") {
      window.addEventListener("streamix_watchlist_updated", loadUserData);
      window.addEventListener("streamix_user_updated", loadUserData);
      window.addEventListener("storage", loadUserData);
      return () => {
        window.removeEventListener("streamix_watchlist_updated", loadUserData);
        window.removeEventListener("streamix_user_updated", loadUserData);
        window.removeEventListener("storage", loadUserData);
      };
    }
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    }

    if (userDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userDropdownOpen]);

  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("movie_app_token");
      localStorage.removeItem("movie_app_user");
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));
      setUserDropdownOpen(false);
      setMobileMenuOpen(false);
      router.push("/login");
    }
  };

  const navClass = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const iconButtonClass = darkMode ? "bg-[#1d1d1d] text-[#f5f0e8] hover:bg-[#252525]" : "bg-white text-[#111111] hover:bg-neutral-100";
  const mobileMenuClass = darkMode ? "bg-[#141414] border-black text-[#f5f0e8]" : "bg-[#f2f0ed] border-black text-[#111111]";
  const dropdownClass = darkMode ? "bg-[#161616] text-[#f5f0e8] border-black" : "bg-white text-[#111111] border-black";

  const userAvatar = currentUser?.avatar || "🍿";
  const userDisplayName = currentUser?.displayName || currentUser?.username || "Account";

  return (
    <>
      <WatchPartyModal isOpen={watchPartyModalOpen} onClose={() => setWatchPartyModalOpen(false)} />
      <motion.nav
        initial={prefersReducedMotion ? false : { y: -12, opacity: 0 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        className={`sticky top-0 z-30 border-b-[3px] border-black ${navClass}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-2 md:px-8 md:py-3.5">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="Streamix Dashboard"
              className="flex items-center justify-center transition hover:-translate-y-0.5 active:scale-95"
            >
              <Image
                src="/icon.svg"
                alt="Streamix Logo"
                width={36}
                height={36}
                className="h-8 w-8 sm:h-9 sm:w-9 border-[2px] border-black shadow-[2px_2px_0_#000] hover:shadow-[3px_3px_0_#000] shrink-0 transition"
                priority
              />
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden items-center gap-1.5 md:flex md:ml-4">
              {navLinks.map((link) => {
                const active = pathname === link.href;
                const count = link.href === "/watchlist" ? watchlistCount : 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`inline-flex items-center gap-1.5 border-[2px] border-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] transition ${
                      active
                        ? "bg-[#ffe600] text-black shadow-[2px_2px_0_#000]"
                        : darkMode
                          ? "bg-[#1a1a1a] text-[#f5f0e8] hover:bg-[#262626]"
                          : "bg-white text-[#111111] hover:bg-neutral-100"
                    }`}
                  >
                    <span>{link.label}</span>
                    {count > 0 && (
                      <span className="border-[1.5px] border-black bg-[#00f0ff] px-1.5 py-0.2 text-[9px] font-black text-black">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}

              {/* Watch Party Button */}
              <button
                type="button"
                onClick={() => setWatchPartyModalOpen(true)}
                className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 cursor-pointer"
              >
                <Users className="h-3.5 w-3.5" />
                <span>Watch Party</span>
              </button>
            </nav>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Search Spotlight Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Open search spotlight"
              onClick={openSearchSpotlight}
              className={`h-9 w-9 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 border-[2px] border-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 touch-manipulation ${iconButtonClass}`}
            >
              <Search className="h-4 w-4 text-[#ffe600]" />
            </Button>

            {/* Theme Toggle */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Toggle theme"
              onClick={toggleTheme}
              className={`h-9 w-9 sm:h-10 sm:w-10 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0 border-[2px] border-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 touch-manipulation ${iconButtonClass}`}
            >
              {darkMode ? (
                <SunMedium className="h-4 w-4 text-[#f5f0e8]" />
              ) : (
                <MoonStar className="h-4 w-4 text-[#111111]" />
              )}
            </Button>

            {/* User Profile Dropdown (Desktop) */}
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setUserDropdownOpen((prev) => !prev)}
                className={`flex items-center gap-2 border-[2px] border-black px-2.5 py-1.5 text-xs font-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 cursor-pointer ${
                  userDropdownOpen ? "bg-[#00f0ff] text-black" : iconButtonClass
                }`}
              >
                <span className="text-base leading-none">{userAvatar}</span>
                <span className="max-w-[100px] truncate uppercase tracking-wider text-[11px]">
                  {userDisplayName}
                </span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-70" />
              </button>

              {userDropdownOpen && (
                <div
                  className={`absolute right-0 top-full mt-2 w-64 border-[3px] p-3 shadow-[6px_6px_0_#000] z-50 ${dropdownClass}`}
                >
                  {/* Dropdown Header */}
                  <div className="mb-3 border-b-[2px] border-black pb-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center border-[2px] border-black bg-[#ffe600] text-lg shadow-[1.5px_1.5px_0_#000]">
                        {userAvatar}
                      </div>
                      <div className="overflow-hidden">
                        <p className="text-xs font-black uppercase tracking-wider truncate">
                          {userDisplayName}
                        </p>
                        <p className="text-[10px] opacity-70 truncate font-mono">
                          {currentUser?.email || "Member"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Links */}
                  <div className="space-y-1 text-xs font-bold uppercase tracking-wider">
                    <Link
                      href="/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2 border-[1.5px] border-black p-2 hover:bg-[#00f0ff] hover:text-black transition"
                    >
                      <Settings className="h-3.5 w-3.5" />
                      <span>Account Settings</span>
                    </Link>

                    <Link
                      href="/watchlist"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center justify-between border-[1.5px] border-black p-2 hover:bg-[#ffe600] hover:text-black transition"
                    >
                      <div className="flex items-center gap-2">
                        <Bookmark className="h-3.5 w-3.5" />
                        <span>Watchlist</span>
                      </div>
                      {watchlistCount > 0 && (
                        <span className="border border-black bg-black px-1.5 py-0.2 text-[9px] font-black text-white">
                          {watchlistCount}
                        </span>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        setWatchPartyModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2 border-[1.5px] border-black p-2 hover:bg-[#ffe600] hover:text-black transition cursor-pointer text-left"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>Watch Party</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 border-[1.5px] border-black bg-[#ff5376] text-black p-2 hover:bg-[#ff3355] transition cursor-pointer text-left mt-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Toggle Button */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label={mobileMenuOpen ? "Close menu" : "Open navigation menu"}
              onClick={() => setMobileMenuOpen((curr) => !curr)}
              className="flex h-9 w-9 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[2px_2px_0_#000] md:hidden sm:h-10 sm:w-10"
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className={`border-t-[3px] p-4 md:hidden shadow-[4px_4px_0_#000] ${mobileMenuClass}`}>
            {/* User Profile Card in Mobile Menu */}
            {currentUser && (
              <div className="mb-4 border-[2px] border-black bg-[#00f0ff] p-3 text-black shadow-[2px_2px_0_#000]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">{userAvatar}</span>
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">{userDisplayName}</p>
                      <p className="text-[10px] opacity-75 font-mono truncate max-w-[180px]">
                        {currentUser.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    onClick={() => setMobileMenuOpen(false)}
                    className="border border-black bg-white px-2 py-1 text-[10px] font-black uppercase tracking-wider shadow-[1px_1px_0_#000]"
                  >
                    Manage
                  </Link>
                </div>
              </div>
            )}

            <div className="mb-3 flex items-center justify-between border-b-[2px] border-black pb-2.5">
              <div className="flex items-center">
                <Image
                  src="/icon.svg"
                  alt="Streamix Logo"
                  width={28}
                  height={28}
                  className="h-7 w-7 border-[1.5px] border-black shadow-[1.5px_1.5px_0_#000] shrink-0"
                />
              </div>
              <span className="border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.14em] text-black">
                Navigation
              </span>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openSearchSpotlight();
                }}
                className={`col-span-2 flex items-center justify-between border-[2px] border-black p-3 text-[11px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0_#000] transition ${
                  darkMode ? "bg-[#202020] text-[#f5f0e8] hover:bg-[#282828]" : "bg-white text-[#111111] hover:bg-neutral-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 shrink-0 text-[#ffe600]" />
                  <span>Quick Search</span>
                </div>
                <span className="border-[1.5px] border-black bg-[#ffe600] px-2 py-0.5 text-[9px] font-black text-black">
                  Ctrl K
                </span>
              </button>

              {navLinks.map((link) => {
                const active = pathname === link.href;
                const Icon = link.icon;
                const count = link.href === "/watchlist" ? watchlistCount : 0;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between border-[2px] border-black p-3 text-[11px] font-black uppercase tracking-[0.16em] transition ${
                      active
                        ? "bg-[#ffe600] text-black shadow-[3px_3px_0_#000]"
                        : darkMode
                          ? "bg-[#202020] text-[#f5f0e8] hover:bg-[#282828]"
                          : "bg-white text-[#111111] hover:bg-neutral-100"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{link.label}</span>
                    </div>
                    {count > 0 && (
                      <span className="border-[1.5px] border-black bg-[#00f0ff] px-1.5 py-0.5 text-[9px] font-black text-black">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setWatchPartyModalOpen(true);
                }}
                className="col-span-2 flex items-center justify-between border-[2px] border-black bg-[#ffe600] p-3 text-[11px] font-black uppercase tracking-[0.16em] text-black shadow-[3px_3px_0_#000] transition active:scale-98 cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 shrink-0" />
                  <span>Watch Party</span>
                </div>
                <span className="border-[1.5px] border-black bg-black px-2 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-[#ffe600]">
                  Join / Host
                </span>
              </button>

              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`col-span-2 flex items-center gap-2 border-[2px] border-black p-3 text-[11px] font-black uppercase tracking-[0.16em] shadow-[2px_2px_0_#000] transition ${
                  pathname === "/profile"
                    ? "bg-[#00f0ff] text-black"
                    : darkMode
                    ? "bg-[#202020] text-[#f5f0e8]"
                    : "bg-white text-[#111111]"
                }`}
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Account & Preferences</span>
              </Link>

              <button
                type="button"
                onClick={handleSignOut}
                className="col-span-2 flex items-center justify-center gap-2 border-[2px] border-black bg-[#ff5376] p-2.5 text-[11px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] active:scale-98 transition cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </nav>

            {!isStandalone && (
              <div className="mt-3 pt-3 border-t-[2px] border-black">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    localStorage.removeItem("streamix_pwa_dismissed");
                    window.dispatchEvent(new Event("streamix_open_pwa_install"));
                  }}
                  className="flex w-full items-center justify-center gap-2 border-[2px] border-black bg-[#ffe600] py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[2px_2px_0_#000] transition active:scale-98"
                >
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>Install App on Device</span>
                </button>
              </div>
            )}
          </div>
        )}
      </motion.nav>
    </>
  );
}
