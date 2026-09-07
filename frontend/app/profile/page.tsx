"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Bookmark,
  Check,
  CheckCircle2,
  Film,
  KeyRound,
  LogOut,
  Save,
  Server,
  ShieldCheck,
  User,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson } from "@/lib/api";
import { getWatchlist } from "@/lib/watchlist";
import { getPasswordPolicyRequirements, validatePasswordPolicy } from "@/lib/passwordPolicy";
import {
  DEFAULT_SERVER_ID,
  STREAM_SERVERS,
  STREAM_SERVER_STORAGE_KEY,
  type StreamServerId,
} from "@/lib/videoSource";

interface UserProfileData {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatar: string;
  preferredServer: StreamServerId;
  autoplayTrailers: boolean;
  createdAt: number;
  lastLoginAt: number;
}

const AVATAR_OPTIONS = [
  "🍿", "🎬", "🚀", "🕶️", "⚡", "👾", "👑", "🎯",
  "🐱", "🦊", "🛸", "🍕", "🔥", "🎮", "🎧", "💎",
];

export default function ProfilePage() {
  const router = useRouter();
  const { darkMode } = useTheme();

  // Lazy-initialize user state from localStorage
  const [user, setUser] = useState<UserProfileData | null>(() => {
    if (typeof window === "undefined") return null;
    const rawUser = localStorage.getItem("movie_app_user");
    if (!rawUser) return null;
    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  });

  const [displayName, setDisplayName] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    const rawUser = localStorage.getItem("movie_app_user");
    if (!rawUser) return "";
    try {
      const parsed = JSON.parse(rawUser);
      return parsed.displayName || parsed.username || "";
    } catch {
      return "";
    }
  });

  const [avatar, setAvatar] = useState<string>(() => {
    if (typeof window === "undefined") return "🍿";
    const rawUser = localStorage.getItem("movie_app_user");
    if (!rawUser) return "🍿";
    try {
      const parsed = JSON.parse(rawUser);
      return parsed.avatar || "🍿";
    } catch {
      return "🍿";
    }
  });

  const [preferredServer, setPreferredServer] = useState<StreamServerId>(() => {
    if (typeof window === "undefined") return DEFAULT_SERVER_ID;
    const rawUser = localStorage.getItem("movie_app_user");
    if (!rawUser) return DEFAULT_SERVER_ID;
    try {
      const parsed = JSON.parse(rawUser);
      return parsed.preferredServer || DEFAULT_SERVER_ID;
    } catch {
      return DEFAULT_SERVER_ID;
    }
  });

  const [autoplayTrailers, setAutoplayTrailers] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const rawUser = localStorage.getItem("movie_app_user");
    if (!rawUser) return true;
    try {
      const parsed = JSON.parse(rawUser);
      return parsed.autoplayTrailers ?? true;
    } catch {
      return true;
    }
  });

  // Password state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Profile saving state
  const [isSaving, setIsSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState("");
  const [profileError, setProfileError] = useState("");

  // Statistics
  const [watchlistCount, setWatchlistCount] = useState(() => {
    if (typeof window === "undefined") return 0;
    return getWatchlist().length;
  });

  // Watchlist sync listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleUpdate = () => {
      setWatchlistCount(getWatchlist().length);
    };
    window.addEventListener("streamix_watchlist_updated", handleUpdate);
    window.addEventListener("storage", handleUpdate);
    return () => {
      window.removeEventListener("streamix_watchlist_updated", handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  // Load and authenticate
  useEffect(() => {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("movie_app_token");
    const rawUser = localStorage.getItem("movie_app_user");

    if (!token || !rawUser) {
      router.push("/login");
      return;
    }

    // Fetch fresh profile from API
    if (token) {
      fetchJson<{ user: UserProfileData }>("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((data) => {
          if (data && data.user) {
            setUser(data.user);
            setDisplayName(data.user.displayName || data.user.username);
            setAvatar(data.user.avatar || "🍿");
            setPreferredServer(data.user.preferredServer || DEFAULT_SERVER_ID);
            setAutoplayTrailers(data.user.autoplayTrailers ?? true);
            localStorage.setItem("movie_app_user", JSON.stringify(data.user));
          }
        })
        .catch(() => {
          // Keep cached version if offline
        });
    }
  }, [router]);

  // Handle Profile Form Submit
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !user) return;

    setIsSaving(true);
    setProfileError("");
    setProfileSuccess("");

    try {
      const token = localStorage.getItem("movie_app_token") || "";
      const data = await fetchJson<{ success: boolean; user: UserProfileData; message: string }>(
        "/auth/me",
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: user.id,
            displayName: displayName.trim(),
            avatar,
            preferredServer,
            autoplayTrailers,
          }),
        }
      );

      if (data.user) {
        setUser(data.user);
        localStorage.setItem("movie_app_user", JSON.stringify(data.user));
        // Also update local storage server preference so VideoPlayer stays in sync
        localStorage.setItem(STREAM_SERVER_STORAGE_KEY, data.user.preferredServer);
        window.dispatchEvent(new Event("streamix_user_updated"));
        window.dispatchEvent(new Event("storage"));
      }

      setProfileSuccess("Profile settings saved successfully!");
      setTimeout(() => setProfileSuccess(""), 4000);
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to update profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Password Change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isChangingPassword || !user) return;

    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    const policyCheck = validatePasswordPolicy(newPassword);
    if (!policyCheck.valid) {
      setPasswordError(policyCheck.error || "Password must be 8-16 characters and contain a special symbol.");
      return;
    }

    setIsChangingPassword(true);

    try {
      const token = localStorage.getItem("movie_app_token") || "";
      await fetchJson<{ success: boolean; message: string }>("/auth/change-password", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: user.id,
          oldPassword,
          newPassword,
        }),
      });

      setPasswordSuccess("Password updated successfully! Keep it secure.");
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordSuccess(""), 4000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Sign out
  const handleSignOut = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("movie_app_token");
      localStorage.removeItem("movie_app_user");
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));
      router.push("/login");
    }
  };

  const shellClass = darkMode
    ? "min-h-screen bg-[#0a0a0a] font-mono text-[#f5f0e8] transition-colors duration-150"
    : "min-h-screen bg-[#faf8f5] font-mono text-[#111111] transition-colors duration-150";

  const cardClass = darkMode
    ? "border-[3px] border-black bg-[#111111] text-[#f5f0e8] shadow-[6px_6px_0_#000]"
    : "border-[3px] border-black bg-[#ffffff] text-[#111111] shadow-[6px_6px_0_#000]";

  const inputClass = darkMode
    ? "border-[2px] border-black bg-[#1c1c1c] text-[#f5f0e8] placeholder:text-[#f5f0e8]/50"
    : "border-[2px] border-black bg-[#f4f2ee] text-[#111111] placeholder:text-[#111111]/50";

  return (
    <div className={shellClass}>
      <Navbar />

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        {/* Back Link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 border-[2px] border-black bg-[#ffe600] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Cinema</span>
          </Link>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ff5376] px-3 py-1.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:scale-95 transition cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Hero Header */}
        <div className="mb-8 border-[3px] border-black bg-[#00f0ff] p-6 sm:p-8 text-black shadow-[6px_6px_0_#000]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center border-[3px] border-black bg-white text-3xl sm:text-4xl shadow-[3px_3px_0_#000]">
                {avatar}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="border border-black bg-black px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#00f0ff]">
                    ACTIVE MEMBER
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    @{user?.username || "ambr"}
                  </span>
                </div>
                <h1 className="mt-1 font-[var(--font-bricolage)] text-2xl sm:text-3xl font-black uppercase tracking-tight">
                  {displayName || user?.username || "Streamix Member"}
                </h1>
                <p className="text-xs font-medium opacity-80">
                  {user?.email || "Personal Cinema Account"}
                </p>
              </div>
            </div>

            {/* Quick Stats Pill */}
            <div className="flex flex-wrap sm:flex-col gap-2">
              <Link
                href="/watchlist"
                className="flex items-center gap-2 border-[2px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000] hover:bg-[#fff9d6] transition"
              >
                <Bookmark className="h-3.5 w-3.5 text-[#00f0ff]" />
                <span>Watchlist: {watchlistCount} items</span>
              </Link>
              <div className="flex items-center gap-2 border-[2px] border-black bg-white px-3 py-1.5 text-xs font-black uppercase tracking-wider shadow-[2px_2px_0_#000]">
                <ShieldCheck className="h-3.5 w-3.5 text-[#00ff66]" />
                <span>Email Verified</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Main Column: Profile & Streaming Settings */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Identity & Display Settings */}
            <div className={`p-6 sm:p-8 ${cardClass}`}>
              <div className="mb-6 flex items-center justify-between border-b-[2px] border-black pb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-[#ffe600]" />
                  <h2 className="font-[var(--font-bricolage)] text-xl font-black uppercase tracking-tight">
                    Identity & Avatar
                  </h2>
                </div>
                <span className="border border-black bg-[#ffe600] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  PROFILE
                </span>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-6">
                {/* Avatar Picker */}
                <div>
                  <label className="block mb-2 text-xs font-black uppercase tracking-wider opacity-80">
                    Select Your Cinema Avatar
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 sm:gap-2.5">
                    {AVATAR_OPTIONS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setAvatar(emoji)}
                        className={`flex h-12 w-full items-center justify-center border-[2px] border-black text-2xl transition active:scale-90 ${
                          avatar === emoji
                            ? "bg-[#ffe600] shadow-[3px_3px_0_#000] -translate-y-0.5"
                            : darkMode
                            ? "bg-[#222222] hover:bg-[#333333]"
                            : "bg-white hover:bg-neutral-100 shadow-[1.5px_1.5px_0_#000]"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label className="block mb-1 text-xs font-black uppercase tracking-wider opacity-80">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your screen name"
                    className={`w-full px-4 py-3 text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#282828] ${inputClass}`}
                  />
                  <p className="mt-1 text-[10px] opacity-60">This name appears during Watch Parties and shared lists.</p>
                </div>

                {/* Preferred Streaming Server */}
                <div className="pt-4 border-t-[2px] border-black/40">
                  <div className="flex items-center gap-2 mb-3">
                    <Server className="h-4 w-4 text-[#00f0ff]" />
                    <label className="text-xs font-black uppercase tracking-wider">
                      Default Streaming Engine
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {STREAM_SERVERS.map((server) => {
                      const isSelected = preferredServer === server.id;
                      return (
                        <button
                          key={server.id}
                          type="button"
                          onClick={() => setPreferredServer(server.id)}
                          className={`flex items-center justify-between border-[2px] border-black p-3 text-left transition active:scale-98 ${
                            isSelected
                              ? "bg-[#00f0ff] text-black shadow-[3px_3px_0_#000] font-black"
                              : darkMode
                              ? "bg-[#1c1c1c] text-[#f5f0e8] hover:bg-[#252525]"
                              : "bg-neutral-50 text-[#111111] hover:bg-white shadow-[2px_2px_0_#000]"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-black uppercase tracking-wider">{server.label}</p>
                            <p className="text-[10px] opacity-75">{server.baseUrl.replace("https://", "")}</p>
                          </div>
                          <span
                            className={`border border-black px-1.5 py-0.5 text-[8.5px] font-black uppercase ${
                              isSelected ? "bg-black text-[#00f0ff]" : "bg-white text-black"
                            }`}
                          >
                            {server.badge}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[10px] opacity-60">
                    Your preferred server is automatically loaded when you open any movie or TV series.
                  </p>
                </div>

                {/* Autoplay Trailers Toggle */}
                <div className="pt-4 border-t-[2px] border-black/40 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider">Autoplay Ambient Trailers</p>
                    <p className="text-[10px] opacity-60">Automatically preview video trailers on movie cards.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoplayTrailers((prev) => !prev)}
                    className={`flex h-7 w-14 items-center border-[2px] border-black p-0.5 transition ${
                      autoplayTrailers ? "bg-[#00ff66]" : "bg-neutral-400"
                    }`}
                  >
                    <div
                      className={`h-5 w-5 border border-black bg-white transition-transform ${
                        autoplayTrailers ? "translate-x-7" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {profileError ? (
                  <div className="border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    {profileError}
                  </div>
                ) : null}

                {profileSuccess ? (
                  <div className="border-[2px] border-black bg-[#00ff66] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{profileSuccess}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full flex items-center justify-center gap-2 border-[3px] border-black bg-[#ffe600] py-3 px-4 text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-black shadow-[4px_4px_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <span>Saving Preferences...</span>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      <span>Save All Changes</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Change Password Section */}
            <div className={`p-6 sm:p-8 ${cardClass}`}>
              <div className="mb-6 flex items-center justify-between border-b-[2px] border-black pb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-[#ff5376]" />
                  <h2 className="font-[var(--font-bricolage)] text-xl font-black uppercase tracking-tight">
                    Security & Password
                  </h2>
                </div>
                <span className="border border-black bg-[#ff5376] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black">
                  PBKDF2 ENCRYPTED
                </span>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block mb-1 text-[10px] font-black uppercase tracking-wider opacity-80">
                    Current Password
                  </label>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className={`w-full px-4 py-2.5 text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#282828] ${inputClass}`}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-1 text-[10px] font-black uppercase tracking-wider opacity-80">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="8–16 chars + symbol"
                      required
                      minLength={8}
                      maxLength={16}
                      className={`w-full px-4 py-2.5 text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#282828] ${inputClass}`}
                    />
                  </div>

                  <div>
                    <label className="block mb-1 text-[10px] font-black uppercase tracking-wider opacity-80">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type new password"
                      required
                      minLength={8}
                      maxLength={16}
                      className={`w-full px-4 py-2.5 text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#282828] ${inputClass}`}
                    />
                  </div>
                </div>

                {/* Password Policy Live Requirements */}
                {(() => {
                  const reqs = getPasswordPolicyRequirements(newPassword);
                  return (
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-bold select-none">
                      <div
                        className={`flex items-center gap-1.5 border-[1.5px] px-2 py-1 transition ${
                          reqs.lengthValid
                            ? "border-black bg-[#00ff66] text-black font-black shadow-[1px_1px_0_#000]"
                            : "border-black/30 bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-500 dark:text-neutral-400"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${reqs.lengthValid ? "stroke-[3]" : "opacity-40"}`} />
                        <span>8–16 Characters</span>
                      </div>
                      <div
                        className={`flex items-center gap-1.5 border-[1.5px] px-2 py-1 transition ${
                          reqs.specialValid
                            ? "border-black bg-[#00ff66] text-black font-black shadow-[1px_1px_0_#000]"
                            : "border-black/30 bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-500 dark:text-neutral-400"
                        }`}
                      >
                        <Check className={`h-3 w-3 ${reqs.specialValid ? "stroke-[3]" : "opacity-40"}`} />
                        <span>Special Symbol (!@#$)</span>
                      </div>
                    </div>
                  );
                })()}

                {passwordError ? (
                  <div className="border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    {passwordError}
                  </div>
                ) : null}

                {passwordSuccess ? (
                  <div className="border-[2px] border-black bg-[#00ff66] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{passwordSuccess}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="w-full flex items-center justify-center gap-2 border-[2px] border-black bg-white dark:bg-[#1a1a1a] py-2.5 px-4 text-xs font-black uppercase tracking-wider text-black dark:text-white shadow-[3px_3px_0_#000] hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] active:scale-98 transition disabled:opacity-50 cursor-pointer"
                >
                  <KeyRound className="h-3.5 w-3.5" />
                  <span>{isChangingPassword ? "Updating Password..." : "Update Password"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar Column: Account Details & Quick Shortcuts */}
          <div className="space-y-6">
            {/* Account Metadata Card */}
            <div className={`p-6 ${cardClass}`}>
              <h3 className="mb-4 border-b-[2px] border-black pb-2 text-xs font-black uppercase tracking-[0.2em] text-[#00f0ff]">
                Account Overview
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Account ID</p>
                  <p className="font-mono text-[11px] truncate">{user?.id || "user_standard"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Verified Email</p>
                  <p className="font-bold truncate">{user?.email || "member@streamix.app"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Username Handle</p>
                  <p className="font-bold">@{user?.username || "member"}</p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Registered Date</p>
                  <p className="font-mono text-[11px]">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "Founding Member"}
                  </p>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider opacity-60">Last Authenticated</p>
                  <p className="font-mono text-[11px]">
                    {user?.lastLoginAt ? new Date(user.lastLoginAt).toLocaleTimeString() : "Just now"}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Card */}
            <div className={`p-6 ${cardClass}`}>
              <h3 className="mb-4 border-b-[2px] border-black pb-2 text-xs font-black uppercase tracking-[0.2em] text-[#ffe600]">
                Cinema Shortcuts
              </h3>

              <div className="space-y-2.5">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5 border-[2px] border-black bg-white dark:bg-[#1a1a1a] p-2.5 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_#000] hover:bg-[#ffe600] dark:hover:bg-[#ffe600] hover:text-black transition"
                >
                  <Film className="h-4 w-4" />
                  <span>Browse Movies</span>
                </Link>

                <Link
                  href="/watchlist"
                  className="flex items-center justify-between border-[2px] border-black bg-white dark:bg-[#1a1a1a] p-2.5 text-xs font-bold uppercase tracking-wider shadow-[2px_2px_0_#000] hover:bg-[#00f0ff] dark:hover:bg-[#00f0ff] hover:text-black transition"
                >
                  <div className="flex items-center gap-2.5">
                    <Bookmark className="h-4 w-4" />
                    <span>My Watchlist</span>
                  </div>
                  <span className="border border-black bg-black px-1.5 py-0.5 text-[9px] font-black text-white">
                    {watchlistCount}
                  </span>
                </Link>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 border-[2px] border-black bg-[#ff5376] p-2.5 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:-translate-y-0.5 transition cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sign Out of Streamix</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
