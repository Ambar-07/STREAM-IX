"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2 } from "lucide-react";

export interface VaultBreachOverlayProps {
  phase: "idle" | "granted" | "breaching" | "opening";
  topBannerText?: string;
  bottomBannerText?: string;
  badgeText?: string;
  title: string;
  subtitle: string;
  matrixLabel?: string;
}

export default function VaultBreachOverlay({
  phase,
  topBannerText = "STREAMIX SECURITY PROTOCOL",
  bottomBannerText = "MEDIA VAULT • DECRYPTING",
  badgeText = "Access Confirmed",
  title,
  subtitle,
  matrixLabel = "Decryption Matrix",
}: VaultBreachOverlayProps) {
  return (
    <AnimatePresence>
      {(phase === "breaching" || phase === "opening") && (
        <div className="fixed inset-0 z-[100] h-[100dvh] w-screen flex items-center justify-center overflow-hidden pointer-events-none select-none touch-none">
          {/* Top Vault Shutter - Overlaps slightly (50.5%) to prevent sub-pixel gaps on Retina screens */}
          <motion.div
            initial={{ y: "-100%" }}
            animate={{ y: phase === "opening" ? "-100%" : "0%" }}
            exit={{ y: "-100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-0 inset-x-0 h-[50.5dvh] sm:h-[50.5%] border-b-[3px] sm:border-b-[4px] border-black bg-[#ffe600] z-20 flex items-end justify-center pb-4 sm:pb-6 shadow-[0_4px_0_#000] will-change-transform"
          >
            <div className="flex items-center gap-2 sm:gap-3 px-3">
              <span className="h-2 w-2 sm:h-3 sm:w-3 bg-black shrink-0" />
              <span className="font-mono text-[9px] sm:text-xs font-black uppercase tracking-[0.16em] sm:tracking-[0.3em] text-black text-center truncate">
                {topBannerText}
              </span>
              <span className="h-2 w-2 sm:h-3 sm:w-3 bg-black shrink-0" />
            </div>
          </motion.div>

          {/* Bottom Vault Shutter */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: phase === "opening" ? "100%" : "0%" }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute bottom-0 inset-x-0 h-[50.5dvh] sm:h-[50.5%] border-t-[3px] sm:border-t-[4px] border-black bg-[#ffe600] z-20 flex items-start justify-center pt-4 sm:pt-6 shadow-[0_-4px_0_#000] will-change-transform"
          >
            <div className="flex items-center gap-2 sm:gap-3 px-3">
              <span className="h-2 w-2 sm:h-3 sm:w-3 bg-black shrink-0" />
              <span className="font-mono text-[9px] sm:text-xs font-black uppercase tracking-[0.16em] sm:tracking-[0.3em] text-black text-center truncate">
                {bottomBannerText}
              </span>
              <span className="h-2 w-2 sm:h-3 sm:w-3 bg-black shrink-0" />
            </div>
          </motion.div>

          {/* Central HUD Modal */}
          <motion.div
            initial={{ scale: 0.72, opacity: 0, rotate: -2 }}
            animate={{
              scale: phase === "opening" ? 1.08 : 1,
              opacity: phase === "opening" ? 0 : 1,
              rotate: 0,
            }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-30 mx-3 sm:mx-4 w-[calc(100%-1.5rem)] max-w-[330px] sm:max-w-sm border-[3px] sm:border-[4px] border-black bg-white p-5 sm:p-7 text-center text-black shadow-[6px_6px_0_#000] sm:shadow-[10px_10px_0_#000] will-change-transform"
          >
            <motion.div
              initial={{ rotate: -180, scale: 0.7 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ duration: 0.42, ease: "easeOut" }}
              className="mx-auto mb-3 sm:mb-4 flex justify-center"
            >
              <Image
                src="/icon.svg"
                alt="Streamix Logo"
                width={60}
                height={60}
                className="h-12 w-12 sm:h-16 sm:w-16 border-[2px] sm:border-[3px] border-black shadow-[3px_3px_0_#000] sm:shadow-[4px_4px_0_#000]"
                priority
              />
            </motion.div>

            <div className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#00ff66] px-2.5 py-0.5 text-[8px] sm:text-[9px] font-black uppercase tracking-[0.18em] text-black shadow-[1.5px_1.5px_0_#000]">
              <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              <span>{badgeText}</span>
            </div>

            <h2 className="mt-1.5 sm:mt-2 font-[var(--font-bricolage)] text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight">
              {title}
            </h2>

            <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] font-mono font-bold uppercase tracking-[0.12em] sm:tracking-[0.14em] text-black/75">
              {subtitle}
            </p>

            {/* Decryption / Matrix Progress Bar */}
            <div className="mt-3.5 sm:mt-4 space-y-1.5">
              <div className="h-4 sm:h-5 w-full border-[2px] border-black bg-neutral-200 p-0.5">
                <motion.div
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 0.75, ease: "easeInOut" }}
                  className="h-full bg-black will-change-transform"
                />
              </div>
              <div className="flex items-center justify-between text-[8px] font-mono font-bold uppercase tracking-[0.1em] text-black/70">
                <span>{matrixLabel}</span>
                <span>100% OK</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
