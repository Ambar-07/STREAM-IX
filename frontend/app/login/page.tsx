"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowRight, Eye, EyeOff, MoonStar, SunMedium, Unlock } from "lucide-react";
import HazardGeometricBackground from "@/components/HazardGeometricBackground";
import VaultBreachOverlay from "@/components/VaultBreachOverlay";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockPhase, setUnlockPhase] = useState<"idle" | "granted" | "breaching" | "opening">("idle");
  const [shakeError, setShakeError] = useState(false);

  // Redirect already-authenticated users straight to dashboard
  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("movie_app_token");
    const user = localStorage.getItem("movie_app_user");
    if (token && user) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    try {
      const data = await fetchJson<{ token: string; user: { id: string; email: string; username?: string } }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: username.trim(), username: username.trim(), password }),
      });

      localStorage.setItem("movie_app_token", data.token);
      localStorage.setItem("movie_app_user", JSON.stringify(data.user));
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));

      setIsSubmitting(true);
      setUnlockPhase("granted");

      if (prefersReducedMotion) {
        setTimeout(() => router.push("/dashboard"), 300);
        return;
      }

      setTimeout(() => setUnlockPhase("breaching"), 280);
      setTimeout(() => setUnlockPhase("opening"), 1100);
      setTimeout(() => router.push("/dashboard"), 1400);
    } catch (err) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 420);
      setError(err instanceof Error ? err.message : "Authentication failed.");
      setIsSubmitting(false);
      setUnlockPhase("idle");
    }
  };

  const bg = darkMode ? "bg-[#0a0a0a] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const card = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#ffffff] text-[#111111]";
  const input = darkMode
    ? "bg-[#181818] text-[#f5f0e8] placeholder:text-[#f5f0e8]/40"
    : "bg-[#f2f0ed] text-[#111111] placeholder:text-[#111111]/40";

  return (
    <main className={`relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4 font-mono transition-colors duration-150 ${bg}`}>
      <HazardGeometricBackground darkMode={darkMode} />

      {/* Theme toggle */}
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={toggleTheme}
        className={`fixed right-4 top-4 z-20 flex h-9 w-9 items-center justify-center border-[2px] border-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 ${
          darkMode ? "bg-[#1d1d1d] text-[#f5f0e8]" : "bg-white text-[#111111]"
        }`}
      >
        {darkMode ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </button>

      <motion.div
        animate={
          shakeError
            ? { x: [-10, 10, -7, 7, -4, 4, 0] }
            : isSubmitting
            ? { scale: [1, 0.98, 1.01, 0.95], opacity: [1, 1, 1, 0.2] }
            : {}
        }
        transition={{ duration: isSubmitting ? 0.75 : 0.4 }}
        className="relative z-10 w-full max-w-sm mx-auto"
      >
        <div className={`border-[3px] border-black p-6 sm:p-8 shadow-[6px_6px_0_#000] ${card}`}>

          {/* Logo header */}
          <div className="mb-7 flex items-center gap-2.5 select-none">
            <Image
              src="/icon.svg"
              alt="Logo"
              width={32}
              height={32}
              className="h-8 w-8 border-[2px] border-black shadow-[2px_2px_0_#000] shrink-0"
              priority
            />
            <span className="text-[11px] font-black uppercase tracking-[0.28em]">STREAMIX</span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3" autoComplete="off">
            <input
              value={username}
              disabled={isSubmitting}
              onChange={(e) => { setUsername(e.target.value); if (error) setError(""); }}
              type="text"
              name="username"
              placeholder="Username or Email"
              autoComplete="off"
              required
              className={`w-full border-[2.5px] border-black px-3.5 py-2.5 text-sm font-medium outline-none focus:outline-none ${input}`}
            />

            <div className="relative">
              <input
                value={password}
                disabled={isSubmitting}
                onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="Password"
                autoComplete="current-password"
                required
                className={`w-full border-[2.5px] border-black px-3.5 py-2.5 pr-11 text-sm font-medium outline-none focus:outline-none ${input}`}
              />
              <button
                type="button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((p) => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center border border-black bg-neutral-100 dark:bg-[#272727] text-current active:scale-95"
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </button>
            </div>

            {error && (
              <div className="border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-black">
                {error}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={isSubmitting}
              animate={isSubmitting ? { backgroundColor: "#00ff66" } : {}}
              transition={{ duration: 0.2 }}
              className={`w-full flex items-center justify-center gap-2 border-[3px] border-black py-2.5 px-4 text-xs font-black uppercase tracking-[0.18em] text-black shadow-[4px_4px_0_#000] transition active:scale-[0.98] ${
                isSubmitting
                  ? "bg-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.7)] cursor-wait"
                  : "bg-[#ffe600] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000]"
              }`}
            >
              {isSubmitting ? (
                <><Unlock className="h-3.5 w-3.5 animate-bounce" /><span>Authenticating...</span></>
              ) : (
                <><span>Sign In</span><ArrowRight className="h-3.5 w-3.5" /></>
              )}
            </motion.button>
          </form>

          {/* Create account link */}
          <p className="mt-5 text-[11px] opacity-60 font-mono">
            No account?{" "}
            <Link href="/signup" className="font-bold opacity-100 underline underline-offset-4 hover:text-[#ffe600] transition">
              Create one
            </Link>
          </p>

        </div>
      </motion.div>

      <VaultBreachOverlay
        phase={unlockPhase}
        topBannerText="AUTHENTICATION PROTOCOL"
        bottomBannerText="SESSION AUTHORIZED"
        badgeText="Access Confirmed"
        title="Access Granted"
        subtitle="Decrypting Workspace..."
        matrixLabel="Credential Matrix"
      />
    </main>
  );
}
