"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  MoonStar,
  RefreshCw,
  SunMedium,
  User,
  UserPlus,
} from "lucide-react";
import HazardGeometricBackground from "@/components/HazardGeometricBackground";
import VaultBreachOverlay from "@/components/VaultBreachOverlay";
import { useTheme } from "@/hooks/useTheme";
import { fetchJson } from "@/lib/api";
import { getPasswordPolicyRequirements, validatePasswordPolicy } from "@/lib/passwordPolicy";

interface SendVerificationResponse {
  success: boolean;
  message: string;
  verificationToken?: string;
  cooldownRemaining?: number;
}

interface VerifySignupResponse {
  success: boolean;
  token: string;
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  message: string;
}

export default function SignupPage() {
  const router = useRouter();
  const { darkMode, toggleTheme } = useTheme();
  const prefersReducedMotion = useReducedMotion();

  // Step 1: Form state
  const [step, setStep] = useState<"form" | "otp">("form");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2: OTP state
  const [otpDigits, setOtpDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verificationToken, setVerificationToken] = useState<string>("");
  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const [resendCooldown, setResendCooldown] = useState<number>(0);
  const [isResending, setIsResending] = useState(false);

  // UX & Animation state
  const [error, setError] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unlockPhase, setUnlockPhase] = useState<"idle" | "granted" | "breaching" | "opening">("idle");
  const [shakeError, setShakeError] = useState(false);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Focus first OTP input when switching to OTP step
  useEffect(() => {
    if (step === "otp") {
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    }
  }, [step]);

  // Handle Step 1 Submit: Dispatch Verification Code
  const handleRequestVerification = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError("");
    setInfoMessage("");

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      setError(policyCheck.error || "Password must be at least 8 characters and include a special symbol.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 420);
      return;
    }

    setIsSubmitting(true);

    try {
      const data = await fetchJson<SendVerificationResponse>("/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
        }),
      });

      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setResendCooldown(45);
      setInfoMessage(data.message || `Verification code sent to ${email}`);
      setStep("otp");
    } catch (err) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 420);
      setError(err instanceof Error ? err.message : "Failed to send verification code.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Resend Verification Code
  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setError("");
    setIsResending(true);
    try {
      const data = await fetchJson<SendVerificationResponse>("/auth/send-verification", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          username: username.trim(),
          password,
        }),
      });

      if (data.verificationToken) {
        setVerificationToken(data.verificationToken);
      }
      setResendCooldown(45);
      setInfoMessage("A new verification code has been dispatched!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code.");
    } finally {
      setIsResending(false);
    }
  };

  // Handle OTP Box Input
  const handleOtpChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(-1); // Only digits, last typed
    const nextDigits = [...otpDigits];
    nextDigits[index] = clean;
    setOtpDigits(nextDigits);
    if (error) setError("");

    // Auto-advance
    if (clean && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }
  };

  // Handle OTP Keydown (Backspace navigation)
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  // Handle OTP Paste (Split 6 digits)
  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasteData) return;

    const nextDigits = [...otpDigits];
    for (let i = 0; i < pasteData.length; i++) {
      nextDigits[i] = pasteData[i];
    }
    setOtpDigits(nextDigits);

    const focusIdx = Math.min(pasteData.length, 5);
    otpInputsRef.current[focusIdx]?.focus();
  };

  // Handle Step 2 Submit: Verify Code and Finalize Account
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    const fullCode = otpDigits.join("");
    if (fullCode.length !== 6) {
      setError("Please enter all 6 digits of the code.");
      setShakeError(true);
      setTimeout(() => setShakeError(false), 420);
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const data = await fetchJson<VerifySignupResponse>("/auth/verify-signup", {
        method: "POST",
        body: JSON.stringify({
          email: email.trim(),
          code: fullCode,
          verificationToken,
        }),
      });

      // Save user session
      localStorage.setItem("movie_app_token", data.token);
      localStorage.setItem("movie_app_user", JSON.stringify(data.user));
      localStorage.removeItem("streamix-unlocked");
      window.dispatchEvent(new Event("streamix_user_updated"));

      setUnlockPhase("granted");

      if (prefersReducedMotion) {
        setTimeout(() => {
          router.push("/dashboard");
        }, 300);
        return;
      }

      // Phase 1: Button turns electric green with ACCOUNT VERIFIED (0ms - 280ms)
      setTimeout(() => {
        setUnlockPhase("breaching");
      }, 280);

      // Phase 2: Dual shutters iris split open (1100ms)
      setTimeout(() => {
        setUnlockPhase("opening");
      }, 1100);

      // Phase 3: Route into dashboard (1400ms)
      setTimeout(() => {
        router.push("/dashboard");
      }, 1400);
    } catch (err) {
      setShakeError(true);
      setTimeout(() => setShakeError(false), 420);
      setError(err instanceof Error ? err.message : "Verification failed.");
      setIsSubmitting(false);
      setUnlockPhase("idle");
    }
  };

  const shellClass = darkMode
    ? "relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#0a0a0a] px-4 font-mono text-[#f5f0e8] transition-colors duration-150 py-10"
    : "relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-[#faf8f5] px-4 font-mono text-[#111111] transition-colors duration-150 py-10";

  const cardClass = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#ffffff] text-[#111111]";
  const inputClass = darkMode
    ? "bg-[#1a1a1a] text-[#f5f0e8] placeholder:text-[#f5f0e8]/55 border-black"
    : "bg-[#f2f0ed] text-[#111111] placeholder:text-[#111111]/55 border-black";

  return (
    <main className={shellClass}>
      {/* Diagonal Hazard & Neo-Brutalist Geometric Background */}
      <HazardGeometricBackground darkMode={darkMode} />

      {/* Top-Right Theme Toggle */}
      <button
        type="button"
        aria-label="Toggle theme"
        onClick={toggleTheme}
        className={`fixed right-4 top-4 sm:right-6 sm:top-6 z-20 flex h-10 w-10 items-center justify-center border-[2px] border-black shadow-[3px_3px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000] active:scale-95 ${
          darkMode ? "bg-[#1d1d1d] text-[#f5f0e8]" : "bg-white text-[#111111]"
        }`}
      >
        {darkMode ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
      </button>

      {/* Signup Card with Motion Shake & Scale */}
      <motion.div
        animate={
          shakeError
            ? { x: [-10, 10, -7, 7, -4, 4, 0] }
            : isSubmitting && unlockPhase !== "idle"
            ? { scale: [1, 0.98, 1.01, 0.95], opacity: [1, 1, 1, 0.2] }
            : {}
        }
        transition={{ duration: isSubmitting ? 0.75 : 0.4 }}
        className="relative z-10 w-full max-w-md mx-auto"
      >
        <div className={`border-[3px] border-black p-6 sm:p-8 shadow-[6px_6px_0_#000] ${cardClass}`}>
          {/* Header Bar */}
          <div className="mb-6 flex items-center justify-between border-b-[2px] border-black pb-4">
            <div className="flex items-center gap-2.5 select-none">
              <Image
                src="/icon.svg"
                alt="Streamix Logo"
                width={36}
                height={36}
                className="h-9 w-9 border-[2px] border-black shadow-[2px_2px_0_#000] shrink-0"
                priority
              />
              <div>
                <p className="text-[12px] font-black uppercase tracking-[0.24em] leading-none">STREAMIX</p>
                <p className="mt-0.5 text-[8px] font-bold uppercase tracking-[0.16em] opacity-60">
                  {step === "form" ? "NEW MEMBER" : "EMAIL VERIFY"}
                </p>
              </div>
            </div>

            <div className="border border-black bg-[#00f0ff] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-black font-mono">
              {step === "form" ? "STEP 01/02" : "STEP 02/02"}
            </div>
          </div>

          {step === "form" ? (
            /* STEP 1: Registration Form */
            <>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">Personal Account</p>
              <h1 className="mb-6 font-[var(--font-bricolage)] text-[2.2rem] sm:text-[2.6rem] font-black uppercase leading-none tracking-[-0.05em]">
                Create Account
              </h1>

              <form onSubmit={handleRequestVerification} className="space-y-4" autoComplete="off">
                {/* Username */}
                <div>
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      value={username}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (error) setError("");
                      }}
                      type="text"
                      placeholder="e.g. user_92"
                      autoComplete="off"
                      required
                      minLength={2}
                      className={`w-full border-[3px] px-4 py-3 pl-11 text-base sm:text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#252525] ${inputClass}`}
                    />
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Email Address
                  </label>
                  <div className="relative">
                    <input
                      value={email}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError("");
                      }}
                      type="email"
                      placeholder="name@example.com"
                      autoComplete="off"
                      required
                      className={`w-full border-[3px] px-4 py-3 pl-11 text-base sm:text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#252525] ${inputClass}`}
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                  </div>
                  <p className="mt-1 text-[9px] opacity-60">A 6-digit Gmail verification code will be sent here.</p>
                </div>

                {/* Password */}
                <div>
                  <label className="block mb-1 text-[10px] font-bold uppercase tracking-wider opacity-75">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      value={password}
                      disabled={isSubmitting}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError("");
                      }}
                      type={showPassword ? "text" : "password"}
                      placeholder="Create strong password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      maxLength={64}
                      className={`w-full border-[3px] px-4 py-3 pl-11 pr-12 text-base sm:text-sm font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#252525] ${inputClass}`}
                    />
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 opacity-50" />
                    <button
                      type="button"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center border-[2px] border-black bg-[#f5f0e8] text-black shadow-[1.5px_1.5px_0_#000] active:scale-95"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>

                  {/* Password Policy Indicator Badges */}
                  {(() => {
                    const reqs = getPasswordPolicyRequirements(password);
                    return (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[10px] font-bold select-none">
                        <div
                          className={`flex items-center gap-1.5 border-[1.5px] px-2 py-1 transition ${
                            reqs.lengthValid
                              ? "border-black bg-[#00ff66] text-black font-black shadow-[1px_1px_0_#000]"
                              : "border-black/30 bg-neutral-100 dark:bg-[#1f1f1f] text-neutral-500 dark:text-neutral-400"
                          }`}
                        >
                          <Check className={`h-3 w-3 ${reqs.lengthValid ? "stroke-[3]" : "opacity-40"}`} />
                          <span>8+ Characters</span>
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
                </div>

                {error ? (
                  <div className="border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 border-[3px] border-black py-3 px-4 text-center text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-black bg-[#00f0ff] shadow-[4px_4px_0_#000] transition hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000] active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Sending Code...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      <span>Send Verification Code</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="mt-5 text-xs sm:text-sm opacity-75">
                Already have an account?{" "}
                <Link href="/login" className="font-bold underline underline-offset-4 hover:text-[#00f0ff]">
                  Login
                </Link>
              </p>
            </>
          ) : (
            /* STEP 2: 6-Box OTP Verification */
            <>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setStep("form");
                    setError("");
                  }}
                  className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider underline hover:text-[#00f0ff] mb-2"
                >
                  <ArrowLeft className="h-3 w-3" />
                  Edit Email / Details
                </button>
                <p className="text-[10px] font-bold uppercase tracking-[0.22em] opacity-80">Security Check</p>
                <h1 className="font-[var(--font-bricolage)] text-[2.2rem] sm:text-[2.6rem] font-black uppercase leading-none tracking-[-0.05em]">
                  Verify Email
                </h1>
                <p className="mt-2 text-xs opacity-75">
                  We sent a 6-digit verification code to:
                  <br />
                  <span className="font-bold text-[#00f0ff] underline break-all">{email}</span>
                </p>
              </div>

              {infoMessage && !error && (
                <div className="mb-4 border-[2px] border-black bg-[#00ff66]/20 border-black px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#00a844] dark:text-[#55ff99]">
                  {infoMessage}
                </div>
              )}

              <form onSubmit={handleVerifyOtp} className="space-y-5" autoComplete="off">
                {/* 6 Digit Input Boxes */}
                <div>
                  <label className="block mb-2 text-[10px] font-bold uppercase tracking-wider opacity-75 text-center">
                    Enter 6-Digit Code
                  </label>
                  <div className="flex items-center justify-between gap-1.5 sm:gap-2">
                    {otpDigits.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => {
                          otpInputsRef.current[idx] = el;
                        }}
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={digit}
                        disabled={isSubmitting}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        onPaste={handleOtpPaste}
                        className={`h-12 sm:h-14 w-10 sm:w-12 text-center text-xl sm:text-2xl font-black border-[3px] border-black outline-none shadow-[2px_2px_0_#000] focus:bg-[#fff9d6] dark:focus:bg-[#252525] focus:-translate-y-0.5 transition ${inputClass}`}
                      />
                    ))}
                  </div>
                </div>

                {error ? (
                  <div className="border-[2px] border-black bg-[#ff5376] px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-black">
                    {error}
                  </div>
                ) : null}

                {/* Verify Button with Vault Breach Trigger */}
                <motion.button
                  type="submit"
                  disabled={isSubmitting}
                  animate={
                    isSubmitting && unlockPhase !== "idle"
                      ? {
                          backgroundColor: "#00ff66",
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.25 }}
                  className={`w-full flex items-center justify-center gap-2 border-[3px] border-black py-3 px-4 text-center text-xs sm:text-sm font-black uppercase tracking-[0.18em] text-black shadow-[4px_4px_0_#000] transition active:scale-98 cursor-pointer ${
                    unlockPhase !== "idle"
                      ? "bg-[#00ff66] shadow-[0_0_24px_rgba(0,255,102,0.8)] cursor-wait"
                      : "bg-[#00ff66] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#000]"
                  }`}
                >
                  {unlockPhase !== "idle" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 animate-bounce" />
                      <span>Account Verified!</span>
                    </>
                  ) : isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Validating Code...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" />
                      <span>Verify & Finish Signup</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </motion.button>

                {/* Resend Cooldown Section */}
                <div className="flex items-center justify-between pt-2 border-t-[2px] border-black/30 text-xs">
                  <span className="opacity-70">Didn&apos;t get the email?</span>
                  <button
                    type="button"
                    disabled={resendCooldown > 0 || isResending || isSubmitting}
                    onClick={handleResendCode}
                    className="font-bold uppercase tracking-wider text-[11px] underline underline-offset-2 hover:text-[#00f0ff] disabled:opacity-40 disabled:no-underline cursor-pointer"
                  >
                    {isResending
                      ? "Resending..."
                      : resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend Code"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </motion.div>

      {/* Cinematic Neo-Brutalist Vault Breach Overlay */}
      <VaultBreachOverlay
        phase={unlockPhase}
        topBannerText="STREAMIX SECURITY PROTOCOL"
        bottomBannerText="ACCOUNT VERIFIED • PROVISIONED"
        badgeText="Account Created"
        title="Identity Provisioned"
        subtitle="Initializing Encrypted Workspace..."
        matrixLabel="Provisioning Matrix"
      />
    </main>
  );
}
