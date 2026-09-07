"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, MessageSquare, Send, Smile, Users } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import type { WatchPartyMessage, WatchPartyParticipant } from "@/lib/watchparty";

interface WatchPartyChatProps {
  messages: WatchPartyMessage[];
  participants: WatchPartyParticipant[];
  currentUserId: string;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
  onUpdateNickname?: (newName: string, newAvatar: string) => void;
  isHost?: boolean;
}

const QUICK_EMOJIS = ["🍿", "🔥", "😂", "😱", "❤️", "👏", "🎉", "💀"];

export default function WatchPartyChat({
  messages = [],
  participants = [],
  currentUserId,
  onSendMessage,
  onSendReaction,
}: WatchPartyChatProps) {
  const { darkMode } = useTheme();
  const [inputText, setInputText] = useState("");
  const [showRoster, setShowRoster] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;
    onSendMessage(trimmed);
    setInputText("");
  };

  const bgClass = darkMode ? "bg-[#111111] text-[#f5f0e8]" : "bg-[#faf8f5] text-[#111111]";
  const headerBg = darkMode ? "bg-[#1a1a1a]" : "bg-[#f2f0ed]";
  const inputBg = darkMode ? "bg-[#181818] text-[#f5f0e8]" : "bg-white text-black";

  return (
    <div className={`flex h-full min-h-0 flex-1 flex-col border-[3px] border-black shadow-[6px_6px_0_#000] ${bgClass}`}>
      {/* 1. Chat Header */}
      <div className={`flex items-center justify-between border-b-[3px] border-black px-3.5 py-2.5 ${headerBg}`}>
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          <span className="font-[var(--font-bricolage)] text-sm font-black uppercase tracking-wider">
            Party Chat
          </span>
        </div>

        <button
          type="button"
          onClick={() => setShowRoster((prev) => !prev)}
          className={`flex items-center gap-1.5 border-[2px] border-black px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition active:scale-95 ${
            showRoster ? "bg-[#ffe600] text-black shadow-[2px_2px_0_#000]" : "bg-white text-black hover:bg-neutral-100"
          }`}
        >
          <Users className="h-3.5 w-3.5" />
          <span>{participants.length}</span>
        </button>
      </div>

      {/* 2. Collapsible Participant Roster */}
      {showRoster && (
        <div className={`border-b-[3px] border-black p-3 space-y-2 max-h-48 overflow-y-auto scrollbar-thin ${darkMode ? "bg-[#141414]" : "bg-[#fffde6]"}`}>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-70">Participants ({participants.length})</p>
          <div className="space-y-1.5">
            {participants.map((p) => {
              const isMe = p.id === currentUserId;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded border border-black/20 bg-black/5 px-2 py-1 text-xs dark:bg-white/5"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">{p.avatar}</span>
                    <span className="truncate font-bold text-xs">
                      {p.name} {isMe && "(You)"}
                    </span>
                  </div>
                  {p.isHost && (
                    <span className="flex items-center gap-1 border border-black bg-[#ffe600] px-1.5 py-0.5 text-[8.5px] font-black uppercase tracking-wider text-black">
                      <Crown className="h-2.5 w-2.5 fill-current" /> Host
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Messages Stream */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-3 scrollbar-thin">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center opacity-60">
            <Smile className="h-8 w-8 mb-2" />
            <p className="text-xs font-bold uppercase tracking-wider">No messages yet</p>
            <p className="text-[10px] mt-0.5">Say hello to the watch party!</p>
          </div>
        ) : (
          messages.map((m) => {
            if (m.isSystem) {
              return (
                <div key={m.id} className="flex justify-center my-1.5">
                  <div className="inline-flex items-center gap-1.5 border border-black bg-[#00f0ff]/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-black dark:text-[#00f0ff] shadow-[1px_1px_0_#000]">
                    <span>{m.senderAvatar}</span>
                    <span>{m.text}</span>
                  </div>
                </div>
              );
            }

            const isMe = m.senderId === currentUserId;
            const isReactionMsg = m.text.startsWith("Reacted ");

            if (isReactionMsg) {
              const reactionEmoji = m.text.replace("Reacted ", "").trim();
              return (
                <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                  <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                    <span className="text-xs">{m.senderAvatar}</span>
                    <span className="text-[10px] font-black tracking-wide opacity-80">
                      {m.senderName}
                    </span>
                    <span className="text-[8.5px] opacity-40">
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>

                  <div className="inline-flex items-center gap-1.5 border-[2px] border-black bg-[#ffe600] px-3 py-1 text-black shadow-[2px_2px_0_#000]">
                    <span className="text-base sm:text-lg animate-bounce">{reactionEmoji}</span>
                    <span className="text-[10px] font-black uppercase tracking-wider">Reacted {reactionEmoji}</span>
                  </div>
                </div>
              );
            }

            return (
              <div key={m.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1.5 mb-0.5 px-0.5">
                  <span className="text-xs">{m.senderAvatar}</span>
                  <span className="text-[10px] font-black tracking-wide opacity-80">
                    {m.senderName}
                  </span>
                  {m.isHost && (
                    <span className="rounded bg-[#ffe600] text-black px-1 text-[8px] font-black uppercase">
                      Host
                    </span>
                  )}
                  <span className="text-[8.5px] opacity-40">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>

                <div
                  className={`max-w-[85%] border-[2px] border-black px-3 py-1.5 text-xs font-medium leading-relaxed shadow-[2px_2px_0_#000] break-words ${
                    isMe
                      ? "bg-[#ffe600] text-black"
                      : darkMode
                        ? "bg-[#222222] text-[#f5f0e8]"
                        : "bg-white text-black"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 4. Quick Emoji Reaction Tray */}
      <div className={`border-t-[2px] border-black px-2.5 py-1.5 flex items-center justify-between gap-1 overflow-x-auto scrollbar-none ${headerBg}`}>
        {QUICK_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onSendReaction(emoji)}
            title={`Send ${emoji} reaction`}
            className="flex h-8 w-8 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded border border-black bg-white text-base sm:text-sm shadow-[1px_1px_0_#000] transition hover:-translate-y-0.5 hover:bg-[#ffe600] active:scale-90 touch-manipulation"
          >
            {emoji}
          </button>
        ))}
      </div>

      {/* 5. Message Input Bar */}
      <form onSubmit={handleSend} className="border-t-[3px] border-black p-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] flex items-center gap-1.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type a message..."
          maxLength={300}
          className={`flex-1 min-w-0 border-[2px] border-black px-3 py-2 text-base sm:text-xs font-medium outline-none focus:bg-[#fff9d6] dark:focus:bg-[#282828] ${inputBg}`}
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          aria-label="Send message"
          className="h-10 sm:h-auto min-w-[42px] flex items-center justify-center border-[2px] border-black bg-[#ffe600] px-3.5 py-2 text-black shadow-[2px_2px_0_#000] transition hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:pointer-events-none touch-manipulation shrink-0"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </form>
    </div>
  );
}
