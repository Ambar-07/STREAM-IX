"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles, Users, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import {
  encodeRoomToken,
  getLocalParticipant,
  parseRoomCode,
  saveLocalParticipant,
} from "@/lib/watchparty";

interface WatchPartyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_CHOICES = ["🍿", "🎬", "🥤", "🦊", "⚡", "🚀", "👑", "🔥", "🐱", "🎧"];

export default function WatchPartyModal({ isOpen, onClose }: WatchPartyModalProps) {
  const router = useRouter();
  const { darkMode } = useTheme();
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(() => getLocalParticipant().name);
  const [avatar, setAvatar] = useState(() => getLocalParticipant().avatar);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = getLocalParticipant();
      setName(current.name);
      setAvatar(current.avatar);
      setError("");
      setIsJoining(false);
    }
  }, [isOpen]);

  const handleClose = () => {
    setError("");
    setRoomCode("");
    setIsJoining(false);
    setIsEditingProfile(false);
    onClose();
  };

  if (!isOpen) return null;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = roomCode.trim();
    if (!clean) return;

    setIsJoining(true);
    setError("");

    try {
      // Save profile if modified
      saveLocalParticipant(name, avatar);

      // Check if user pasted a full link or wp_ token directly
      const wpMatch = clean.match(/wp_[a-zA-Z0-9_-]+/);
      if (wpMatch && wpMatch[0]) {
        onClose();
        router.push(`/watchparty/${wpMatch[0]}`);
        return;
      }

      // 1. Try server verification
      try {
        const res = await fetch(`/api/watchparty?code=${encodeURIComponent(clean)}`);
        const data = await res.json();
        if (res.ok && data?.room?.id) {
          onClose();
          router.push(`/watchparty/${data.room.id}`);
          return;
        }
      } catch {
        // Fallback to client-side parsing
      }

      // 2. Client-side self-describing code decode fallback
      const parsed = parseRoomCode(clean);
      if (parsed) {
        const autoToken = encodeRoomToken({
          m: parsed.mediaType,
          id: parsed.tmdbId,
          t: parsed.mediaType === "tv" ? `Series ${parsed.tmdbId}` : `Movie ${parsed.tmdbId}`,
          s: parsed.season,
          e: parsed.episode,
          c: clean.toUpperCase(),
        });
        onClose();
        router.push(`/watchparty/${autoToken}`);
        return;
      }

      setError("Watch party room code or link not recognized. Please check and try again.");
      setIsJoining(false);
    } catch {
      setError("Unable to connect to room. Please try again.");
      setIsJoining(false);
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    saveLocalParticipant(name, avatar);
    setIsEditingProfile(false);
  };

  const modalBg = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const inputBg = darkMode ? "bg-[#1c1c1c] text-[#f5f0e8]" : "bg-white text-[#111111]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`relative w-full max-w-md border-[3px] border-black p-4 sm:p-6 shadow-[8px_8px_0_#000] my-auto max-h-[92dvh] overflow-y-auto scrollbar-thin ${modalBg}`}>
        {/* Close button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close modal"
          className="absolute right-3 top-3 sm:right-3.5 sm:top-3.5 border-[2px] border-black bg-white p-1.5 sm:p-1 text-black shadow-[2px_2px_0_#000] transition hover:bg-[#ffe600] active:scale-95 touch-manipulation"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 mb-4">
          <div className="flex h-10 w-10 items-center justify-center border-[2px] border-black bg-[#ffe600] text-black shadow-[2px_2px_0_#000] shrink-0">
            <Users className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-[var(--font-bricolage)] text-lg sm:text-xl font-black uppercase tracking-tight truncate">
              Watch Party
            </h2>
            <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 truncate">
              Stream together in synchronized harmony
            </p>
          </div>
        </div>

        {/* User Badge Profile Preview */}
        <div className="mb-4 flex items-center justify-between border-[2px] border-black bg-[#00f0ff]/15 p-2.5 shadow-[2px_2px_0_#000]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="text-2xl shrink-0">{avatar}</span>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-widest opacity-60">Your Nickname</p>
              <p className="text-xs font-black truncate">{name || "Viewer"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsEditingProfile((prev) => !prev)}
            className="border-[1.5px] border-black bg-white px-2.5 py-1 text-[9.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000] hover:bg-[#ffe600] active:scale-95 touch-manipulation shrink-0"
          >
            {isEditingProfile ? "Done" : "Change"}
          </button>
        </div>

        {/* Profile Edit Drawer */}
        {isEditingProfile && (
          <form onSubmit={handleSaveProfile} className="mb-4 border-[2px] border-black p-3 space-y-2.5 bg-black/5 dark:bg-white/5">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                className={`w-full border-[2px] border-black px-2.5 py-2 text-base sm:text-xs font-bold ${inputBg}`}
                placeholder="Enter nickname"
              />
            </div>

            <div>
              <label className="block text-[9px] font-black uppercase tracking-wider mb-1">Choose Avatar</label>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {AVATAR_CHOICES.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setAvatar(a)}
                    className={`flex h-9 w-9 sm:h-8 sm:w-8 items-center justify-center border text-lg sm:text-base transition touch-manipulation ${
                      avatar === a ? "border-black bg-[#ffe600] scale-105 shadow-[2px_2px_0_#000]" : "border-black/20 bg-white hover:bg-neutral-100"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </form>
        )}

        {/* Join by Code Form */}
        <form onSubmit={handleJoin} className="space-y-3">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider mb-1.5">
              Enter Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="e.g. STRM-X92"
              className={`w-full border-[3px] border-black px-3.5 py-2.5 text-base font-mono font-black uppercase tracking-widest shadow-[3px_3px_0_#000] outline-none focus:bg-[#fff9d6] dark:focus:bg-[#252525] ${inputBg}`}
            />
          </div>

          {error && (
            <p className="border border-black bg-[#ff5376] p-2 text-[10.5px] font-bold text-black shadow-[2px_2px_0_#000]">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!roomCode.trim() || isJoining}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 border-[3px] border-black bg-[#ffe600] py-3 text-xs font-black uppercase tracking-widest text-black shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[5px_5px_0_#000] active:scale-98 disabled:opacity-50 disabled:pointer-events-none touch-manipulation"
          >
            <span>{isJoining ? "Joining Party..." : "Join Watch Party"}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Start new party hint */}
        <div className="mt-5 border-t-[2px] border-black/20 pt-4 text-center">
          <p className="text-[10px] font-bold uppercase tracking-wider opacity-70 mb-2">
            Want to start your own party?
          </p>
          <button
            type="button"
            onClick={() => {
              onClose();
              router.push("/dashboard");
            }}
            className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#00f0ff] px-3 py-1.5 text-[9.5px] font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:-translate-y-0.5 active:scale-95"
          >
            <Sparkles className="h-3 w-3" />
            <span>Pick a Movie or Series on Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
