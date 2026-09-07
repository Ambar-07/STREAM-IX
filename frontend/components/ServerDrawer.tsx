"use client";

import { useEffect } from "react";
import { Check, ChevronRight, Server, X } from "lucide-react";
import {
  getNextServerId,
  getServerById,
  STREAM_SERVERS,
  type StreamServerId,
} from "@/lib/videoSource";

type ServerDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  selectedServerId: StreamServerId;
  onSelectServer: (serverId: StreamServerId) => void;
};

export default function ServerDrawer({
  isOpen,
  onClose,
  selectedServerId,
  onSelectServer,
}: ServerDrawerProps) {
  const activeServer = getServerById(selectedServerId);
  const nextServer = getServerById(getNextServerId(selectedServerId));

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999999] flex flex-col justify-end">
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Container (Slides up from bottom) */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="server-selector-title"
        className="relative z-10 w-full max-w-lg mx-auto overflow-hidden border-t-[3px] sm:border-[3px] border-black bg-[#111111] text-white shadow-[0_-8px_30px_rgba(0,0,0,0.9)] animate-in slide-in-from-bottom duration-250 sm:mb-4 sm:rounded-none"
      >
        {/* Mobile Pull Indicator */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-neutral-600" />
        </div>

        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b-[2px] border-black bg-[#ffe600] px-4 py-3 text-black">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center border-[1.5px] border-black bg-black text-[#ffe600] shadow-[1px_1px_0_#000]">
              <Server className="h-4 w-4" />
            </div>
            <div>
              <h3
                id="server-selector-title"
                className="font-[var(--font-bricolage)] text-base font-black uppercase tracking-tight leading-none"
              >
                Server Selector
              </h3>
              <p className="text-[10px] font-bold text-neutral-800 uppercase tracking-wider mt-0.5">
                Active Mirror: <span className="font-black text-black underline">{activeServer.shortName}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close server selector"
            className="flex h-8 w-8 items-center justify-center border-[1.5px] border-black bg-[#ff5376] text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-90 hover:opacity-90"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Drawer Content - List of 5 Servers */}
        <div className="p-3.5 sm:p-4 space-y-2.5 max-h-[70vh] overflow-y-auto pb-[max(env(safe-area-inset-bottom),20px)]">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">
            Available Streaming Servers
          </p>

          <div className="grid grid-cols-1 gap-2">
            {STREAM_SERVERS.map((server) => {
              const isActive = server.id === selectedServerId;
              return (
                <button
                  key={server.id}
                  type="button"
                  onClick={() => {
                    onSelectServer(server.id);
                    onClose();
                  }}
                  className={`group flex items-center justify-between border-[2px] border-black p-3 text-left transition active:scale-[0.98] ${
                    isActive
                      ? "bg-[#ffe600] text-black shadow-[3px_3px_0_#000] z-10"
                      : "bg-[#1c1c1c] text-white shadow-[2px_2px_0_#000] hover:bg-[#262626]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-9 w-9 items-center justify-center border-[1.5px] border-black font-[var(--font-bricolage)] text-sm font-black uppercase shadow-[1px_1px_0_#000] ${
                        isActive
                          ? "bg-black text-[#ffe600]"
                          : "bg-neutral-800 text-white group-hover:bg-neutral-700"
                      }`}
                    >
                      {server.shortName}
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-[var(--font-bricolage)] text-sm font-black uppercase tracking-tight">
                          Server {server.shortName}
                        </p>
                        <span className={`border border-black px-1.5 py-0.2 text-[8px] font-black uppercase ${
                          server.badge === "Sync-Ready"
                            ? "bg-[#00ff88] text-black"
                            : server.badge === "Primary"
                            ? "bg-[#ffe600] text-black"
                            : "bg-[#00f0ff] text-black"
                        }`}>
                          {server.badge}
                        </span>
                      </div>
                      <p
                        className={`text-[10px] font-semibold uppercase tracking-wider ${
                          isActive ? "text-neutral-900" : "text-neutral-400"
                        }`}
                      >
                        {isActive ? "Currently Active" : "Tap to Switch"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {isActive ? (
                      <span className="inline-flex items-center gap-1 border-[1.5px] border-black bg-black px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-[#ffe600] shadow-[1px_1px_0_#000]">
                        <Check className="h-3 w-3" />
                        <span>Active</span>
                      </span>
                    ) : (
                      <span className="flex h-7 w-7 items-center justify-center border-[1.5px] border-neutral-700 bg-neutral-800 text-neutral-300 group-hover:border-black group-hover:bg-[#ffe600] group-hover:text-black transition">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Quick Failover / Next Mirror Action */}
          <button
            type="button"
            onClick={() => {
              onSelectServer(nextServer.id);
              onClose();
            }}
            className="w-full mt-2 flex items-center justify-center gap-2 border-[2px] border-black bg-white p-2.5 text-center text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] transition active:scale-95 hover:bg-neutral-100"
          >
            <span>Switch to Next Server ({nextServer.shortName})</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
