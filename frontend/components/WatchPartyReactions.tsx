"use client";

import { useEffect, useRef, useState } from "react";
import type { WatchPartyReaction } from "@/lib/watchparty";

interface FloatingParticle {
  id: string;
  emoji: string;
  senderName: string;
  leftPercent: number;
}

function getPositionFromId(id: string, timestamp: number): number {
  let hash = timestamp;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  }
  return 15 + (Math.abs(hash) % 70);
}

export default function WatchPartyReactions({
  reactions = [],
}: {
  reactions: WatchPartyReaction[];
}) {
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!reactions || reactions.length === 0) return;

    const newReactions = reactions.filter((r) => !seenIdsRef.current.has(r.id));
    if (newReactions.length === 0) return;

    for (const r of newReactions) {
      seenIdsRef.current.add(r.id);
    }

    const newItems: FloatingParticle[] = newReactions.slice(-8).map((r, idx) => ({
      id: `${r.id}_${Date.now()}_${idx}`,
      emoji: r.emoji,
      senderName: r.senderName,
      leftPercent: getPositionFromId(r.id, r.timestamp + idx * 7),
    }));

    setParticles((prev) => [...prev.slice(-16), ...newItems]);
  }, [reactions]);

  // Particle cleanup timer
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles((prev) => prev.slice(1));
    }, 3200);
    return () => clearTimeout(timer);
  }, [particles.length]);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-40 overflow-hidden">
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes streamixFloatUp {
              0% {
                opacity: 0;
                transform: translateY(20px) scale(0.6);
              }
              15% {
                opacity: 1;
                transform: translateY(0px) scale(1.2);
              }
              75% {
                opacity: 1;
                transform: translateY(-160px) scale(1);
              }
              100% {
                opacity: 0;
                transform: translateY(-240px) scale(0.85);
              }
            }
            .streamix-particle-animate {
              animation: streamixFloatUp 3.2s cubic-bezier(0.22, 1, 0.36, 1) forwards;
            }
          `,
        }}
      />
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute bottom-8 flex flex-col items-center streamix-particle-animate"
          style={{
            left: `${p.leftPercent}%`,
          }}
        >
          <span className="text-3xl sm:text-4xl drop-shadow-[0_4px_6px_rgba(0,0,0,0.9)] filter">
            {p.emoji}
          </span>
          <span className="mt-1 rounded border border-black bg-[#ffe600] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-black shadow-[1px_1px_0_#000]">
            {p.senderName}
          </span>
        </div>
      ))}
    </div>
  );
}
