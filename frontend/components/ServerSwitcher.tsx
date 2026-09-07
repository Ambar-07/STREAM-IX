"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Server } from "lucide-react";
import ServerDrawer from "@/components/ServerDrawer";
import { useTheme } from "@/hooks/useTheme";
import {
  DEFAULT_SERVER_ID,
  getServerById,
  STREAM_SERVER_STORAGE_KEY,
  STREAM_SERVERS,
  type StreamServerId,
} from "@/lib/videoSource";

type ServerSwitcherProps = {
  activeServerId?: StreamServerId;
  onServerChange?: (serverId: StreamServerId) => void;
  compact?: boolean;
  className?: string;
};

export default function ServerSwitcher({
  activeServerId,
  onServerChange,
  compact = false,
  className = "",
}: ServerSwitcherProps) {
  const { darkMode } = useTheme();
  const [selectedId, setSelectedId] = useState<StreamServerId>(() => {
    if (activeServerId) return activeServerId;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(STREAM_SERVER_STORAGE_KEY) as StreamServerId;
      if (saved && STREAM_SERVERS.some((s) => s.id === saved)) {
        return saved;
      }
    }
    return DEFAULT_SERVER_ID;
  });
  const [prevPropServerId, setPrevPropServerId] = useState(activeServerId);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Sync state if activeServerId prop updates externally
  if (activeServerId && activeServerId !== prevPropServerId) {
    setPrevPropServerId(activeServerId);
    setSelectedId(activeServerId);
  }

  // Sync with localStorage and custom event
  useEffect(() => {
    function syncServer() {
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem(STREAM_SERVER_STORAGE_KEY) as StreamServerId;
        if (saved && STREAM_SERVERS.some((s) => s.id === saved)) {
          setSelectedId(saved);
        }
      }
    }

    syncServer();

    const handleCustomChange = (e: Event) => {
      const detail = (e as CustomEvent<StreamServerId>).detail;
      if (detail && STREAM_SERVERS.some((s) => s.id === detail)) {
        setSelectedId(detail);
      }
    };

    window.addEventListener("streamix_server_changed", handleCustomChange);
    window.addEventListener("storage", syncServer);

    return () => {
      window.removeEventListener("streamix_server_changed", handleCustomChange);
      window.removeEventListener("storage", syncServer);
    };
  }, []);

  const handleSelect = (id: StreamServerId) => {
    if (id === selectedId) return;
    setSelectedId(id);

    if (typeof window !== "undefined") {
      localStorage.setItem(STREAM_SERVER_STORAGE_KEY, id);
      window.dispatchEvent(new CustomEvent("streamix_server_changed", { detail: id }));
    }

    if (onServerChange) {
      onServerChange(id);
    }
  };

  const containerBg = darkMode ? "bg-[#141414] border-black" : "bg-[#f4f2ee] border-black";
  const labelBg = darkMode ? "bg-[#222222] text-[#ffe600]" : "bg-black text-[#ffe600]";

  if (compact) {
    return (
      <>
        <div className={`flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            title="Open Server Selector drawer"
            className="inline-flex items-center gap-1.5 border-[1.5px] border-black bg-[#ffe600] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-black shadow-[1.5px_1.5px_0_#000] transition active:scale-95 hover:brightness-105"
          >
            <Server className="h-3 w-3 shrink-0" />
            <span>Server Selector</span>
            <span className="border-[1px] border-black bg-black px-1 text-[9px] font-black text-[#ffe600]">
              {getServerById(selectedId).shortName}
            </span>
            <ChevronDown className="h-2.5 w-2.5 shrink-0" />
          </button>
        </div>
        <ServerDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          selectedServerId={selectedId}
          onSelectServer={handleSelect}
        />
      </>
    );
  }

  return (
    <>
      <div className={`flex flex-wrap items-center justify-between gap-3 border-[2px] border-black p-2.5 sm:p-3 shadow-[3px_3px_0_#000] ${containerBg} ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 border-[1.5px] border-black px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] shadow-[1.5px_1.5px_0_#000] ${labelBg}`}>
            <Server className="h-3 w-3 shrink-0" />
            <span>SERVER</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-75">
            ACTIVE: <span className="text-[#ffe600] font-black">{getServerById(selectedId).shortName}</span>
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          title="Open Server Selector drawer"
          className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3.5 py-1.5 text-[10px] font-black uppercase tracking-[0.14em] text-black shadow-[2px_2px_0_#000] transition active:scale-95 hover:brightness-105 cursor-pointer"
        >
          <Server className="h-3.5 w-3.5 shrink-0" />
          <span>Server Selector</span>
          <ChevronDown className="h-3.5 w-3.5 shrink-0" />
        </button>
      </div>

      <ServerDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        selectedServerId={selectedId}
        onSelectServer={handleSelect}
      />
    </>
  );
}
