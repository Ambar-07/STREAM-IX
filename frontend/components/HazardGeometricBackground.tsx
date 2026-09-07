"use client";

import { motion, useMotionValue, useReducedMotion, useSpring } from "motion/react";
import { useEffect } from "react";

interface HazardGeometricBackgroundProps {
  darkMode: boolean;
}

export default function HazardGeometricBackground({ darkMode }: HazardGeometricBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const smoothX = useSpring(mouseX, { stiffness: 60, damping: 20, mass: 0.5 });
  const smoothY = useSpring(mouseY, { stiffness: 60, damping: 20, mass: 0.5 });

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const offsetX = (e.clientX / window.innerWidth - 0.5) * 24;
      const offsetY = (e.clientY / window.innerHeight - 0.5) * 24;
      mouseX.set(offsetX);
      mouseY.set(offsetY);
    };

    window.addEventListener("pointermove", handlePointerMove);
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, [mouseX, mouseY]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none">
      {/* Base Neo-Brutalist Dot Matrix */}
      <div
        className={
          darkMode
            ? "absolute inset-0 bg-[radial-gradient(#2a2a2a_1px,transparent_1px)] [background-size:24px_24px] opacity-75"
            : "absolute inset-0 bg-[radial-gradient(#b8b3a8_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-70"
        }
      />

      {/* Diagonal Hazard Stripe Banner 1 (Top-Left to Mid) */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        className={`absolute -top-12 -left-20 w-[140vw] rotate-[-7deg] border-y-[3px] border-black shadow-[0_6px_0_#000] ${
          darkMode ? "opacity-80 sm:opacity-85" : "opacity-85 sm:opacity-90"
        }`}
      >
        <div
          className="h-10 sm:h-12 w-full animate-[hazardSlide_3s_linear_infinite]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ffe600, #ffe600 18px, #000000 18px, #000000 36px)",
            backgroundSize: "50.91px 50.91px",
          }}
        />
      </motion.div>

      {/* Diagonal Accent Stripe Banner 2 (Electric Cyan & Black, Mid-Lower) */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        className={`absolute top-[68%] -left-20 w-[140vw] rotate-[-5deg] border-y-[3px] border-black shadow-[0_6px_0_#000] ${
          darkMode ? "opacity-65 sm:opacity-75" : "opacity-75 sm:opacity-85"
        }`}
      >
        <div
          className="h-7 sm:h-8 w-full animate-[hazardSlideRev_4s_linear_infinite]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, #00f0ff, #00f0ff 14px, #000000 14px, #000000 28px)",
            backgroundSize: "39.6px 39.6px",
          }}
        />
      </motion.div>

      {/* Diagonal Hazard Stripe Banner 3 (Bottom) */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        className={`absolute -bottom-10 -left-20 w-[140vw] rotate-[-8deg] border-y-[3px] border-black shadow-[0_6px_0_#000] ${
          darkMode ? "opacity-80 sm:opacity-85" : "opacity-85 sm:opacity-90"
        }`}
      >
        <div
          className="h-10 sm:h-12 w-full animate-[hazardSlide_3.5s_linear_infinite]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(45deg, #ffe600, #ffe600 18px, #000000 18px, #000000 36px)",
            backgroundSize: "50.91px 50.91px",
          }}
        />
      </motion.div>

      {/* Floating Neo-Brutalist Geometric Accent Blocks */}
      {/* Yellow Box Top-Right */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        animate={prefersReducedMotion ? {} : { y: [-6, 6, -6], rotate: [0, 4, 0] }}
        transition={{ duration: 6, ease: "easeInOut", repeat: Infinity }}
        className="absolute top-20 right-12 sm:right-28 hidden sm:flex h-14 w-14 items-center justify-center border-[3px] border-black bg-[#ffe600] shadow-[5px_5px_0_#000]"
      >
        <div className="h-4 w-4 bg-black" />
      </motion.div>

      {/* Cyan Diamond Left */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        animate={prefersReducedMotion ? {} : { y: [8, -8, 8], rotate: [45, 52, 45] }}
        transition={{ duration: 7, ease: "easeInOut", repeat: Infinity }}
        className="absolute top-1/2 left-8 sm:left-24 hidden sm:block h-12 w-12 border-[3px] border-black bg-[#00f0ff] shadow-[4px_4px_0_#000] rotate-45"
      />

      {/* Coral Square Bottom-Left */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        animate={prefersReducedMotion ? {} : { y: [-5, 7, -5], rotate: [0, -6, 0] }}
        transition={{ duration: 6.5, ease: "easeInOut", repeat: Infinity }}
        className="absolute bottom-28 left-16 hidden sm:flex h-11 w-11 items-center justify-center border-[3px] border-black bg-[#ff5376] shadow-[4px_4px_0_#000]"
      >
        <div className="h-3 w-3 bg-black" />
      </motion.div>

      {/* Dual Inverted Block Bottom-Right */}
      <motion.div
        style={{ x: smoothX, y: smoothY }}
        animate={prefersReducedMotion ? {} : { y: [6, -6, 6] }}
        transition={{ duration: 5.5, ease: "easeInOut", repeat: Infinity }}
        className={`absolute bottom-28 right-16 hidden sm:flex h-12 w-12 items-center justify-center border-[3px] border-black shadow-[4px_4px_0_#000] ${
          darkMode ? "bg-white" : "bg-[#111111]"
        }`}
      >
        <div className="h-5 w-5 border-[2px] border-black bg-[#ffe600]" />
      </motion.div>

      {/* Central Vignette Mask to keep the passcode card perfectly readable */}
      <div
        className={
          darkMode
            ? "absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,rgba(10,10,10,0.85)_0%,rgba(10,10,10,0.5)_50%,rgba(10,10,10,0.95)_100%)]"
            : "absolute inset-0 bg-[radial-gradient(ellipse_75%_75%_at_50%_50%,rgba(250,248,245,0.90)_0%,rgba(250,248,245,0.55)_50%,rgba(250,248,245,0.96)_100%)]"
        }
      />

      {/* Ambient Brand Glow directly behind the Vault Card */}
      <div
        className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[420px] w-[420px] sm:h-[560px] sm:w-[560px] rounded-full blur-3xl pointer-events-none ${
          darkMode
            ? "bg-[radial-gradient(circle,#ffe600_0%,rgba(255,230,0,0.14)_35%,transparent_70%)] opacity-35"
            : "bg-[radial-gradient(circle,#ffe600_0%,rgba(255,230,0,0.28)_38%,transparent_70%)] opacity-45"
        }`}
      />
    </div>
  );
}
