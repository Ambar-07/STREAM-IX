"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PwaInstaller() {
  const { darkMode } = useTheme();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true
      );
    }
    return false;
  });
  const [isIos] = useState(() => {
    if (typeof window !== "undefined") {
      return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    }
    return false;
  });
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("streamix_pwa_dismissed") === "true";
    }
    return true;
  });

  useEffect(() => {
    if (isStandalone) {
      return;
    }

    const hasDismissed = localStorage.getItem("streamix_pwa_dismissed") === "true";

    // Listen for custom trigger to open install prompt manually from navbar
    const handleOpenManual = () => {
      setDismissed(false);
      if (isIos) {
        setShowIosGuide(true);
      } else if (deferredPrompt) {
        deferredPrompt.prompt();
      }
    };
    window.addEventListener("streamix_open_pwa_install", handleOpenManual);

    // Capture beforeinstallprompt for Android / Chromium browsers
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      if (!hasDismissed) {
        setDismissed(false);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("streamix_open_pwa_install", handleOpenManual);
    };
  }, [deferredPrompt, isIos, isStandalone]);

  const handleInstallClick = async () => {
    if (isIos) {
      setShowIosGuide(true);
      return;
    }

    if (!deferredPrompt) {
      // Fallback hint for desktop or unsupported browsers
      alert("To install Streamix: open your browser settings or address bar and click 'Install app'.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setDismissed(true);
        localStorage.setItem("streamix_pwa_dismissed", "true");
      }
      setDeferredPrompt(null);
    } catch {
      // Ignore user cancellation
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("streamix_pwa_dismissed", "true");
  };

  if (isStandalone || dismissed) {
    return null;
  }

  return (
    <>
      {/* Neo-Brutalist Install Banner */}
      <div className="fixed bottom-4 right-4 z-40 max-w-sm sm:bottom-6 sm:right-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center gap-3 border-[3px] border-black bg-[#ffe600] p-3.5 text-black shadow-[6px_6px_0_#000]">
          <Image
            src="/icon.svg"
            alt="Streamix App Icon"
            width={40}
            height={40}
            className="border-[2px] border-black shadow-[2px_2px_0_#000] shrink-0"
          />

          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-black/75">Mobile App</p>
            <p className="font-[var(--font-bricolage)] text-sm font-black uppercase leading-tight">Install Streamix</p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="inline-flex items-center gap-1 border-[2px] border-black bg-black px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#ffe600] shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95"
            >
              <Download className="h-3 w-3" />
              <span>Install</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install prompt"
              className="flex h-7 w-7 items-center justify-center border-[2px] border-black bg-white text-black shadow-[1.5px_1.5px_0_#000] transition hover:bg-[#ff5376]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Manual Installation Modal */}
      {showIosGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setShowIosGuide(false)}
        >
          <div
            className={`w-full max-w-sm border-[3px] border-black p-5 shadow-[8px_8px_0_#000] ${
              darkMode ? "bg-[#141414] text-[#f5f0e8]" : "bg-[#faf8f5] text-black"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-[2px] border-black pb-3">
              <div className="flex items-center gap-2.5">
                <Image
                  src="/icon.svg"
                  alt="Streamix Logo"
                  width={28}
                  height={28}
                  className="border-[2px] border-black shadow-[1.5px_1.5px_0_#000] shrink-0"
                />
                <p className="font-[var(--font-bricolage)] text-base font-black uppercase tracking-[-0.02em]">
                  Install Streamix
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="flex h-7 w-7 items-center justify-center border-[2px] border-black bg-white text-black"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <ol className="mt-4 space-y-3 text-xs font-bold leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] border-black bg-[#ffe600] text-[10px] text-black">
                  1
                </span>
                <span>Tap the Safari <strong>Share</strong> button at the bottom of the screen.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] border-black bg-[#00f0ff] text-[10px] text-black">
                  2
                </span>
                <span>Scroll down and select <strong>Add to Home Screen</strong>.</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center border-[1.5px] border-black bg-[#ff5376] text-[10px] text-black">
                  3
                </span>
                <span>Tap <strong>Add</strong> in the top right to install Streamix.</span>
              </li>
            </ol>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-5 w-full border-[2px] border-black bg-[#ffe600] py-2.5 text-[10px] font-black uppercase tracking-[0.16em] text-black shadow-[3px_3px_0_#000]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
