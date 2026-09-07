"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, MessageSquare, Users, X } from "lucide-react";
import Navbar from "@/components/Navbar";
import VideoPlayer from "@/components/VideoPlayer";
import WatchPartyChat from "@/components/WatchPartyChat";
import WatchPartyReactions from "@/components/WatchPartyReactions";
import WatchParty, { WatchPartyHeaderControls, WatchPartyRoomCard } from "@/components/WatchParty";
import { useWebRTC } from "@/hooks/useWebRTC";
import { useTheme } from "@/hooks/useTheme";
import {
  buildRoomFromPayload,
  decodeRoomToken,
  getLocalParticipant,
  parseRoomCode,
  type WatchPartyMessage,
  type WatchPartyReaction,
  type WatchPartyRoom,
} from "@/lib/watchparty";
import {
  DEFAULT_SERVER_ID,
  DEFAULT_WATCH_PARTY_SERVER_ID,
  STREAM_SERVERS,
  type StreamServerId,
} from "@/lib/videoSource";

export default function WatchPartyRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { darkMode } = useTheme();
  const resolvedParams = use(params);
  const roomId = resolvedParams.roomId;

  // Hydrate user identity safely on client mount
  const [currentUser, setCurrentUser] = useState(() => {
    if (typeof window !== "undefined") {
      return getLocalParticipant();
    }
    return { id: "guest_1", name: "Viewer", avatar: "🍿" };
  });

  const [room, setRoom] = useState<WatchPartyRoom | null>(null);
  const isHost = Boolean(room?.hostId && room.hostId === currentUser.id);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [messages, setMessages] = useState<WatchPartyMessage[]>([]);
  const [reactions, setReactions] = useState<WatchPartyReaction[]>([]);
  const [activeServerId, setActiveServerId] = useState<StreamServerId>(DEFAULT_WATCH_PARTY_SERVER_ID);
  const [playerSyncKey, setPlayerSyncKey] = useState<number>(0);

  // Playback synchronization state
  const [playerCurrentTime, setPlayerCurrentTime] = useState<number>(0);
  const [playerStartTime, setPlayerStartTime] = useState<number>(0);
  const [playerDuration, setPlayerDuration] = useState<number>(7200);
  const [hostCurrentTime, setHostCurrentTime] = useState<number>(0);
  const [isPartyPlaying, setIsPartyPlaying] = useState<boolean>(true);
  const playerCurrentTimeRef = useRef<number>(0);
  const lastSyncProcessedTimeRef = useRef<number>(0);

  // High-precision playback wall-clock synchronization anchor
  const playbackAnchorRef = useRef<{ wallTime: number; mediaTime: number }>({
    wallTime: Date.now(),
    mediaTime: 0,
  });

  // Keep playerCurrentTimeRef synchronized with latest state
  useEffect(() => {
    playerCurrentTimeRef.current = playerCurrentTime;
  }, [playerCurrentTime]);

  // Component lifetime and state refs for robust polling & synchronization
  const isComponentMountedRef = useRef(true);
  const isPollingRef = useRef(false);
  const pollUpdatesRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const currentUserRef = useRef(currentUser);
  const activeServerIdRef = useRef(activeServerId);
  const isPartyPlayingRef = useRef(isPartyPlaying);

  useEffect(() => {
    isComponentMountedRef.current = true;
    return () => {
      isComponentMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    activeServerIdRef.current = activeServerId;
  }, [activeServerId]);

  useEffect(() => {
    isPartyPlayingRef.current = isPartyPlaying;
  }, [isPartyPlaying]);

  // Countdown overlay state
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [countdownActive, setCountdownActive] = useState(false);

  // Mobile tab state ("chat" | "controls")
  const [mobileTab, setMobileTab] = useState<"chat" | "controls">("chat");
  // Mobile chat drawer toggle state
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  // Close mobile drawer on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileChatOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll when mobile chat drawer is open to prevent double scroll
  useEffect(() => {
    if (mobileChatOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileChatOpen]);

  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const peerInstanceRef = useRef<any>(null);
  const guestConnectionsRef = useRef<any[]>([]);
  const hostConnectionRef = useRef<any>(null);

  // Helper to send data over PeerJS to all connected peers
  const sendPeerData = useCallback((msgObj: any) => {
    // 1. Broadcast to all connected guests (if we are host)
    guestConnectionsRef.current.forEach((conn) => {
      if (conn && conn.open) {
        try {
          conn.send(msgObj);
        } catch {}
      }
    });
    // 2. Send to host (if we are guest)
    if (hostConnectionRef.current && hostConnectionRef.current.open) {
      try {
        hostConnectionRef.current.send(msgObj);
      } catch {}
    }
  }, []);

  // Re-read local participant on client mount to ensure logged-in user or unique guest ID is resolved
  useEffect(() => {
    if (typeof window !== "undefined") {
      const resolved = getLocalParticipant();
      setCurrentUser(resolved);
    }
  }, []);

  // 1. Synchronized Countdown Animation Trigger & Video Play Key
  const triggerLocalCountdown = useCallback((targetTime: number, syncStartTime?: number) => {
    setCountdownActive(true);
    const initialRemaining = Math.max(1, Math.ceil((targetTime - Date.now()) / 1000));
    setCountdownNumber(initialRemaining);

    const timer = setInterval(() => {
      const remaining = Math.ceil((targetTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setCountdownNumber(0);
        clearInterval(timer);

        const startTime = syncStartTime !== undefined && syncStartTime >= 0 ? syncStartTime : 0;
        setPlayerStartTime(startTime);
        setPlayerCurrentTime(startTime);
        playerCurrentTimeRef.current = startTime;
        playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: startTime };
        setIsPartyPlaying(true);

        setTimeout(() => {
          setCountdownActive(false);
          setCountdownNumber(null);
        }, 1200);
      } else {
        setCountdownNumber(remaining);
      }
    }, 200);
  }, []);

  // 2. Initial Room Load & Join
  useEffect(() => {
    let isMounted = true;

    async function initRoom() {
      try {
        setLoading(true);
        const activeUser = typeof window !== "undefined" ? getLocalParticipant() : currentUser;
        setCurrentUser(activeUser);

        let loadedRoom: WatchPartyRoom | null = null;

        // 1. Join room via API call
        try {
          const joinRes = await fetch(`/api/watchparty/${roomId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user: activeUser }),
          });

          if (joinRes.ok) {
            const data = await joinRes.json();
            if (data?.room) {
              loadedRoom = data.room;
            }
          }
        } catch {
          // Fallback to client-side reconstruction if API call errors or is throttled
        }

        // 2. Self-describing fallback: Reconstruct room directly from roomId or code
        if (!loadedRoom) {
          const decoded = decodeRoomToken(roomId);
          if (decoded) {
            loadedRoom = buildRoomFromPayload(decoded, roomId);
          } else {
            const parsed = parseRoomCode(roomId);
            if (parsed) {
              loadedRoom = buildRoomFromPayload(
                {
                  m: parsed.mediaType,
                  id: parsed.tmdbId,
                  t: parsed.mediaType === "tv" ? `Series ${parsed.tmdbId}` : `Movie ${parsed.tmdbId}`,
                  s: parsed.season,
                  e: parsed.episode,
                  c: roomId.toUpperCase(),
                },
                roomId
              );
            }
          }
        }

        if (!loadedRoom) {
          throw new Error("Watch party room code or link is invalid.");
        }

        if (isMounted) {
          setRoom(loadedRoom);
          const rawServer = loadedRoom.serverId;
          const resolvedServer: StreamServerId =
            rawServer && rawServer !== "2embed" && STREAM_SERVERS.some((s) => s.id === rawServer)
              ? (rawServer as StreamServerId)
              : DEFAULT_SERVER_ID;
          setActiveServerId(resolvedServer);
          if (loadedRoom.syncState?.currentTime !== undefined && loadedRoom.syncState.currentTime > 0) {
            const initTime = Number(loadedRoom.syncState.currentTime);
            const isPlaying = loadedRoom.syncState.isPlaying ?? true;
            const elapsed =
              isPlaying && loadedRoom.syncState.lastUpdatedAt
                ? Math.min(60, Math.max(0, (Date.now() - loadedRoom.syncState.lastUpdatedAt) / 1000))
                : 0;
            const accurateTime = initTime + elapsed;
            setHostCurrentTime(accurateTime);
            setPlayerCurrentTime(accurateTime);
            playerCurrentTimeRef.current = accurateTime;
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: accurateTime };
            setPlayerStartTime(accurateTime);
          } else {
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: 0 };
          }
          if (loadedRoom.syncState?.isPlaying !== undefined) {
            setIsPartyPlaying(loadedRoom.syncState.isPlaying);
          }
          if (loadedRoom.syncState?.lastUpdatedAt) {
            lastSyncProcessedTimeRef.current = loadedRoom.syncState.lastUpdatedAt;
          }
          setError(null);

          // Fetch exact duration from media details to align scrubber duration with movie
          try {
            const detailsUrl =
              loadedRoom.mediaType === "tv"
                ? `/api/tv/${loadedRoom.tmdbId}`
                : `/api/movies/${loadedRoom.tmdbId}`;
            const detailsRes = await fetch(detailsUrl);
            if (detailsRes.ok) {
              const detailsData = await detailsRes.json();
              const mediaItem = detailsData?.movie || detailsData?.series || detailsData;
              const runtimeMinutes = mediaItem?.runtime || mediaItem?.episode_run_time?.[0];
              if (typeof runtimeMinutes === "number" && runtimeMinutes > 0) {
                setPlayerDuration(runtimeMinutes * 60);
              }
            }
          } catch {}

          // Initial load of messages for room
          try {
            const initialMsgRes = await fetch(`/api/watchparty/${loadedRoom.id}/messages`);
            if (initialMsgRes.ok) {
              const initialMsgData = await initialMsgRes.json();
              if (Array.isArray(initialMsgData.messages) && initialMsgData.messages.length > 0) {
                setMessages(initialMsgData.messages);
              }
            }
          } catch {}

          // Canonical URL sync if joined via code
          if (loadedRoom.id && loadedRoom.id !== roomId && typeof window !== "undefined") {
            window.history.replaceState(null, "", `/watchparty/${loadedRoom.id}`);
          }
        }
      } catch (err: unknown) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : "Failed to load watch party room.";
          setError(message);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initRoom();

    return () => {
      isMounted = false;
    };
  }, [roomId]);

  // 3b. High-precision wall-clock playback ticker while party is playing
  useEffect(() => {
    if (!room || !isPartyPlaying) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, (now - playbackAnchorRef.current.wallTime) / 1000);
      const nextTime = Math.max(0, playbackAnchorRef.current.mediaTime + elapsed);
      setPlayerCurrentTime(nextTime);
      playerCurrentTimeRef.current = nextTime;
      if (room?.hostId === currentUser.id) {
        setHostCurrentTime(nextTime);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [isPartyPlaying, room?.id, room?.hostId, currentUser.id]);

  // 3c. Host periodic heartbeat broadcast every 2.0 seconds to keep all participants aligned
  useEffect(() => {
    const isHost = room?.hostId === currentUser.id;
    if (!isHost || !room) return;

    const interval = setInterval(() => {
      const currentTime = playerCurrentTimeRef.current;
      setHostCurrentTime(currentTime);

      sendPeerData({
        type: "heartbeat_time",
        payload: { time: currentTime, isPlaying: isPartyPlaying, hostId: currentUser.id },
      });

      broadcastChannelRef.current?.postMessage({
        type: "heartbeat_time",
        payload: { time: currentTime, isPlaying: isPartyPlaying, hostId: currentUser.id },
      });

      // Synchronize with server so polling guests always get the host's actual live playback time!
      const targetRoomId = room.id || roomId;
      fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          currentTime,
          isPlaying: isPartyPlaying,
          action: "heartbeat",
        }),
      }).catch(() => {});
    }, 2000);

    return () => clearInterval(interval);
  }, [room?.hostId, currentUser.id, room?.id, isPartyPlaying, sendPeerData, roomId]);

  // 4. BroadcastChannel for instant local cross-tab message, reaction, seek, and play/pause sharing
  useEffect(() => {
    if (typeof window === "undefined" || !roomId) return;

    const cleanRoomCode = (
      room?.code ||
      decodeRoomToken(roomId)?.c ||
      roomId
    )
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");
    const channelName = `streamix_wp_${cleanRoomCode}`;
    const bc = new BroadcastChannel(channelName);
    broadcastChannelRef.current = bc;

    bc.onmessage = (event) => {
      const { type, payload } = event.data ?? {};
      if (type === "message" && payload) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.id === payload.id ||
                (m.senderId === payload.senderId &&
                  m.text === payload.text &&
                  Math.abs(m.timestamp - payload.timestamp) < 4000)
            )
          ) {
            return prev;
          }
          return [...prev, payload];
        });
      } else if (type === "reaction" && payload) {
        setReactions((prev) => [...prev, payload]);
      } else if (type === "countdown" && payload?.target) {
        triggerLocalCountdown(payload.target, payload.startTime);
      } else if (type === "playback_state" && payload) {
        lastSyncProcessedTimeRef.current = Date.now();
        if (payload.isPlaying !== undefined) {
          setIsPartyPlaying(Boolean(payload.isPlaying));
        }
        if (payload.time !== undefined) {
          const newTime = Math.max(0, Number(payload.time));
          setPlayerCurrentTime(newTime);
          playerCurrentTimeRef.current = newTime;
          playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: newTime };
          setPlayerStartTime(newTime);
          if (payload.userId === room?.hostId || room?.hostId === currentUser.id) {
            setHostCurrentTime(newTime);
          }
        }
      } else if (type === "seek" && payload?.time !== undefined) {
        lastSyncProcessedTimeRef.current = Date.now();
        const newTime = Math.max(0, Number(payload.time));
        setPlayerCurrentTime(newTime);
        playerCurrentTimeRef.current = newTime;
        playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: newTime };
        setPlayerStartTime(newTime);
        if (payload.userId === room?.hostId || room?.hostId === currentUser.id) {
          setHostCurrentTime(newTime);
        }
      } else if (type === "heartbeat_time" && payload?.time !== undefined) {
        const hostTime = Math.max(0, Number(payload.time));
        setHostCurrentTime(hostTime);
        const isCurrentHost = room?.hostId === currentUser.id;
        if (!isCurrentHost) {
          const drift = Math.abs(playerCurrentTimeRef.current - hostTime);
          if (drift > 2) {
            setPlayerCurrentTime(hostTime);
            playerCurrentTimeRef.current = hostTime;
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: hostTime };
          }
          if (payload.isPlaying !== undefined && payload.isPlaying !== isPartyPlaying) {
            setIsPartyPlaying(Boolean(payload.isPlaying));
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: hostTime };
          }
        }
      } else if (type === "sync" && payload) {
        if (!isHost && payload.serverId) {
          setActiveServerId(payload.serverId);
          activeServerIdRef.current = payload.serverId;
          setPlayerSyncKey((prev) => prev + 1);
        }
      }
    };

    return () => {
      bc.close();
    };
  }, [roomId, room?.id, room?.code, room?.hostId, currentUser.id, isPartyPlaying, triggerLocalCountdown]);

  // 4b. PeerJS WebRTC DataChannel for instant sub-50ms peer-to-peer sync across devices
  useEffect(() => {
    if (typeof window === "undefined" || !room || !currentUser.id) return;

    let isDestroyed = false;
    let peer: any = null;
    let retryTimer: any = null;

    const roomSlug = (
      room.code ||
      decodeRoomToken(roomId)?.c ||
      roomId
    )
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase()
      .slice(0, 24);
    const hostPeerId = `strm_h_${roomSlug}`;
    const isCurrentHost = room.hostId === currentUser.id;

    async function initPeer() {
      try {
        const PeerModule = (await import("peerjs")).default;
        if (isDestroyed) return;

        if (isCurrentHost) {
          // Initialize as Host
          peer = new PeerModule(hostPeerId, { debug: 0 });

          peer.on("connection", (conn: any) => {
            guestConnectionsRef.current.push(conn);

            conn.on("open", () => {
              conn.send({
                type: "initial_state",
                payload: {
                  messages: messages.slice(-50),
                  serverId: activeServerId,
                  currentTime: playerCurrentTimeRef.current,
                },
              });
            });

            conn.on("data", (data: any) => {
              handleIncomingData(data, conn);
            });

            const cleanup = () => {
              guestConnectionsRef.current = guestConnectionsRef.current.filter((c) => c !== conn);
            };
            conn.on("close", cleanup);
            conn.on("error", cleanup);
          });

          peer.on("disconnected", () => {
            if (!isDestroyed && peer && !peer.destroyed) {
              try { peer.reconnect(); } catch {}
            }
          });

          peer.on("error", () => {
            // Silently fall back to BroadcastChannel and HTTP polling
          });
        } else {
          connectGuest(PeerModule);
        }

        function connectGuest(PeerClass: any) {
          if (isDestroyed) return;
          const userSuffix = currentUser.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8);
          const guestPeerId = `strm_g_${roomSlug}_${userSuffix}_${Math.random().toString(36).slice(2, 5)}`;
          peer = new PeerClass(guestPeerId, { debug: 0 });

          peer.on("disconnected", () => {
            if (!isDestroyed && peer && !peer.destroyed) {
              try { peer.reconnect(); } catch {}
            }
          });

          peer.on("error", () => {
            // Silently fall back to BroadcastChannel and HTTP polling
          });

          peer.on("open", () => {
            connectToHost();
          });

          function connectToHost() {
            if (isDestroyed || !peer) return;
            const conn = peer.connect(hostPeerId, { reliable: true });
            hostConnectionRef.current = conn;

            conn.on("open", () => {
              conn.send({
                type: "join",
                payload: { user: currentUser },
              });
            });

            conn.on("data", (data: any) => {
              handleIncomingData(data);
            });

            const handleClose = () => {
              hostConnectionRef.current = null;
              if (!isDestroyed) {
                retryTimer = setTimeout(connectToHost, 5000);
              }
            };
            conn.on("close", handleClose);
            conn.on("error", handleClose);
          }
        }

        peerInstanceRef.current = peer;
      } catch {
        // Fallback silently to HTTP polling and BroadcastChannel
      }
    }

    function handleIncomingData(data: any, fromConn?: any) {
      if (!data || typeof data !== "object") return;
      const { type, payload } = data;

      if (type === "message" && payload) {
        setMessages((prev) => {
          if (
            prev.some(
              (m) =>
                m.id === payload.id ||
                (m.senderId === payload.senderId &&
                  m.text === payload.text &&
                  Math.abs(m.timestamp - payload.timestamp) < 4000)
            )
          ) {
            return prev;
          }
          return [...prev, payload];
        });

        // Re-broadcast from host to all other guests
        if (fromConn) {
          guestConnectionsRef.current.forEach((c) => {
            if (c !== fromConn && c.open) {
              try { c.send(data); } catch {}
            }
          });
        }
      } else if (type === "reaction" && payload) {
        setReactions((prev) => [...prev, payload]);
        if (fromConn) {
          guestConnectionsRef.current.forEach((c) => {
            if (c !== fromConn && c.open) {
              try { c.send(data); } catch {}
            }
          });
        }
      } else if (type === "countdown" && payload?.target) {
        triggerLocalCountdown(payload.target, payload.startTime);
      } else if (type === "playback_state" && payload) {
        lastSyncProcessedTimeRef.current = Date.now();
        if (payload.isPlaying !== undefined) {
          setIsPartyPlaying(Boolean(payload.isPlaying));
        }
        if (payload.time !== undefined) {
          const newTime = Math.max(0, Number(payload.time));
          setPlayerCurrentTime(newTime);
          playerCurrentTimeRef.current = newTime;
          playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: newTime };
          setPlayerStartTime(newTime);
          if (payload.userId === room?.hostId || isCurrentHost) {
            setHostCurrentTime(newTime);
          }
        }
        if (fromConn) {
          guestConnectionsRef.current.forEach((c) => {
            if (c !== fromConn && c.open) {
              try { c.send(data); } catch {}
            }
          });
        }
      } else if (type === "seek" && payload?.time !== undefined) {
        lastSyncProcessedTimeRef.current = Date.now();
        const newTime = Math.max(0, Number(payload.time));
        setPlayerCurrentTime(newTime);
        playerCurrentTimeRef.current = newTime;
        playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: newTime };
        setPlayerStartTime(newTime);
        if (payload.userId === room?.hostId || isCurrentHost) {
          setHostCurrentTime(newTime);
        }
        if (fromConn) {
          guestConnectionsRef.current.forEach((c) => {
            if (c !== fromConn && c.open) {
              try { c.send(data); } catch {}
            }
          });
        }
      } else if (type === "heartbeat_time" && payload?.time !== undefined) {
        const hostTime = Math.max(0, Number(payload.time));
        setHostCurrentTime(hostTime);
        if (!isCurrentHost) {
          const drift = Math.abs(playerCurrentTimeRef.current - hostTime);
          if (drift > 2) {
            setPlayerCurrentTime(hostTime);
            playerCurrentTimeRef.current = hostTime;
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: hostTime };
          }
          if (payload.isPlaying !== undefined && payload.isPlaying !== isPartyPlaying) {
            setIsPartyPlaying(Boolean(payload.isPlaying));
            playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: hostTime };
          }
        }
      } else if (type === "sync" && payload?.serverId) {
        if (!isHost) {
          setActiveServerId(payload.serverId);
          activeServerIdRef.current = payload.serverId;
          setPlayerSyncKey((prev) => prev + 1);
        }
      } else if (type === "initial_state" && payload) {
        if (Array.isArray(payload.messages) && payload.messages.length > 0) {
          setMessages((prev) => {
            const existing = new Set(prev.map((m) => m.id));
            const fresh = payload.messages.filter((m: any) => !existing.has(m.id));
            return [...prev, ...fresh];
          });
        }
        if (!isHost && payload.serverId) {
          setActiveServerId(payload.serverId);
          activeServerIdRef.current = payload.serverId;
        }
        if (payload.currentTime !== undefined && Number(payload.currentTime) > 0) {
          const hostTime = Number(payload.currentTime);
          setHostCurrentTime(hostTime);
          setPlayerCurrentTime(hostTime);
          playerCurrentTimeRef.current = hostTime;
          playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: hostTime };
          setPlayerStartTime(hostTime);
        }
      } else if (type === "join" && payload?.user) {
        setRoom((prev) => {
          if (!prev) return prev;
          if (prev.participants.some((p) => p.id === payload.user.id)) return prev;
          return {
            ...prev,
            participants: [
              ...prev.participants,
              {
                id: payload.user.id,
                name: payload.user.name,
                avatar: payload.user.avatar,
                isHost: false,
                joinedAt: Date.now(),
                lastSeen: Date.now(),
              },
            ],
          };
        });
      }
    }

    initPeer();

    return () => {
      isDestroyed = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (peerInstanceRef.current) {
        try { peerInstanceRef.current.destroy(); } catch {}
      }
      guestConnectionsRef.current = [];
      hostConnectionRef.current = null;
    };
  }, [room?.code, room?.hostId, roomId, currentUser.id, triggerLocalCountdown]);

  // 5. Polling loop with heartbeat touch for messages, room state, and reactions
  useEffect(() => {
    if (loading) return;

    const targetRoomId = roomId;

    async function pollUpdates() {
      if (!isComponentMountedRef.current || isPollingRef.current) return;
      isPollingRef.current = true;

      try {
        const user = currentUserRef.current;
        // Fetch room state, participant heartbeat touch, messages and reactions in a single flight
        const roomRes = await fetch(
          `/api/watchparty/${targetRoomId}?userId=${encodeURIComponent(user.id)}&userName=${encodeURIComponent(user.name)}&userAvatar=${encodeURIComponent(user.avatar)}`
        );
        if (roomRes.ok && isComponentMountedRef.current) {
          const roomData = await roomRes.json();
          if (roomData.room) {
            setRoom(roomData.room);

            // Check if server was updated by host (viewers follow host; host is the authority)
            if (!isHost && roomData.room.serverId && roomData.room.serverId !== activeServerIdRef.current) {
              setActiveServerId(roomData.room.serverId);
              activeServerIdRef.current = roomData.room.serverId;
              setPlayerSyncKey((prev) => prev + 1);
            }

            // Reconcile real-time playback state from server
            const sync = roomData.room.syncState;
            if (sync) {
              const isFromOther = sync.lastUpdatedBy && sync.lastUpdatedBy !== user.id;
              const isNewer =
                !lastSyncProcessedTimeRef.current || sync.lastUpdatedAt > lastSyncProcessedTimeRef.current;

              if (isFromOther && isNewer) {
                lastSyncProcessedTimeRef.current = sync.lastUpdatedAt;

                // 1. Synchronize Play / Pause state across users
                if (sync.isPlaying !== undefined && sync.isPlaying !== isPartyPlayingRef.current) {
                  setIsPartyPlaying(sync.isPlaying);
                }

                // 2. Synchronize Stream Position (Seek / Scrubbing)
                if (sync.currentTime !== undefined) {
                  const targetSec = Number(sync.currentTime);
                  const currentSec = playerCurrentTimeRef.current;
                  const drift = Math.abs(targetSec - currentSec);

                  setHostCurrentTime(targetSec);

                  // Sync if drift is noticeable (> 2s) or if an explicit seek/pause was issued
                  if (drift > 2 || sync.action === "seek" || sync.action === "pause") {
                    setPlayerCurrentTime(targetSec);
                    playerCurrentTimeRef.current = targetSec;
                    playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: targetSec };
                    setPlayerStartTime(targetSec);
                  }
                }
              } else if (sync.currentTime !== undefined) {
                setHostCurrentTime(Number(sync.currentTime));
              }

              // Check if host triggered a countdown
              const target = sync.countdownTarget;
              if (target && target > Date.now()) {
                triggerLocalCountdown(target, sync.currentTime);
              }
            }
          }

          // Reconcile messages from unified response (with fallback if needed)
          let serverMsgs: WatchPartyMessage[] | null = null;
          if (Array.isArray(roomData.messages)) {
            serverMsgs = roomData.messages;
          } else {
            const msgRes = await fetch(`/api/watchparty/${targetRoomId}/messages`);
            if (msgRes.ok && isComponentMountedRef.current) {
              const msgData = await msgRes.json();
              if (Array.isArray(msgData.messages)) {
                serverMsgs = msgData.messages;
              }
            }
          }

          if (serverMsgs && isComponentMountedRef.current) {
            const incoming = serverMsgs;
            setMessages((prev) => {
              // Keep optimistic messages that haven't appeared on server yet
              const pendingOptimistic = prev.filter(
                (m) =>
                  m.id.startsWith("local_") &&
                  !incoming.some(
                    (sm) =>
                      sm.senderId === m.senderId &&
                      sm.text === m.text &&
                      Math.abs(sm.timestamp - m.timestamp) < 6000
                  )
              );
              const merged = [...incoming, ...pendingOptimistic];

              // Check if merged is identical to prev to prevent unnecessary re-renders
              if (
                prev.length === merged.length &&
                prev.every((m, idx) => m.id === merged[idx]?.id && m.text === merged[idx]?.text)
              ) {
                return prev;
              }
              return merged;
            });
          }

          // Reconcile reactions
          if (Array.isArray(roomData.reactions) && roomData.reactions.length > 0 && isComponentMountedRef.current) {
            setReactions(roomData.reactions);
          }
        }
      } catch {
        // Silently ignore polling network jitter
      } finally {
        isPollingRef.current = false;
      }
    }

    pollUpdatesRef.current = pollUpdates;
    pollUpdates();

    const interval = setInterval(pollUpdates, 1000);
    return () => {
      clearInterval(interval);
    };
  }, [roomId, loading, triggerLocalCountdown]);

  // 6. Explicit Leave Action on Navigation
  const handleExitRoom = async () => {
    try {
      const targetRoomId = room?.id || roomId;
      await fetch(`/api/watchparty/${targetRoomId}?userId=${encodeURIComponent(currentUser.id)}`, {
        method: "DELETE",
      });
    } catch {
      // Ignore
    }
  };

  // 7. Host Action: Trigger Countdown
  const handleHostCountdown = async () => {
    if (!room) return;
    const target = Date.now() + 3500; // 3.5s in future for all clients to align
    const currentSec = playerCurrentTimeRef.current;
    triggerLocalCountdown(target, currentSec);

    // 1. Broadcast locally for tabs
    broadcastChannelRef.current?.postMessage({
      type: "countdown",
      payload: { target, startTime: currentSec },
    });

    // 2. Broadcast via PeerJS for instant sub-50ms peer sync across separate devices
    sendPeerData({
      type: "countdown",
      payload: { target, startTime: currentSec },
    });

    // 3. Broadcast to server
    const targetRoomId = room.id || roomId;
    try {
      await fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          countdownTarget: target,
          currentTime: currentSec,
          isPlaying: true,
        }),
      });
    } catch {
      // Ignore
    }
  };

  // 8. Host Action: Broadcast Server
  const handleHostSyncServer = async () => {
    if (!room) return;

    broadcastChannelRef.current?.postMessage({
      type: "sync",
      payload: { serverId: activeServerId },
    });

    sendPeerData({
      type: "sync",
      payload: { serverId: activeServerId },
    });

    setPlayerSyncKey((prev) => prev + 1);

    const targetRoomId = room.id || roomId;
    try {
      await fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          serverId: activeServerId,
        }),
      });
    } catch {
      // Ignore
    }
  };

  // 8b. Seek Handler (Scrubber drag, jump +/-10s, manual time jump)
  const handleSeek = useCallback(
    (timeInSeconds: number) => {
      const clamped = Math.max(0, Math.round(timeInSeconds));
      setPlayerCurrentTime(clamped);
      playerCurrentTimeRef.current = clamped;
      playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: clamped };
      setPlayerStartTime(clamped);
      lastSyncProcessedTimeRef.current = Date.now();

      if (room?.hostId === currentUser.id) {
        setHostCurrentTime(clamped);
      }

      // 1. Broadcast locally for tabs
      broadcastChannelRef.current?.postMessage({
        type: "seek",
        payload: { time: clamped, userId: currentUser.id },
      });

      // 2. Broadcast via PeerJS
      sendPeerData({
        type: "seek",
        payload: { time: clamped, userId: currentUser.id },
      });

      // 3. Persist to server sync
      const targetRoomId = room?.id || roomId;
      fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          currentTime: clamped,
          isPlaying: isPartyPlaying,
          action: "seek",
        }),
      }).catch(() => {});
    },
    [room?.hostId, room?.id, currentUser.id, roomId, isPartyPlaying, sendPeerData]
  );

  // 8c0. Server change handler: immediate player update, state ref sync, network broadcast, and API persistence
  const handleServerChange = useCallback(
    (newServer: StreamServerId) => {
      setActiveServerId(newServer);
      activeServerIdRef.current = newServer;
      setPlayerSyncKey((prev) => prev + 1);
      setRoom((prev) => (prev ? { ...prev, serverId: newServer } : prev));

      // Broadcast locally across browser tabs
      broadcastChannelRef.current?.postMessage({
        type: "sync",
        payload: { serverId: newServer },
      });

      // Broadcast to all connected WebRTC peers
      sendPeerData({
        type: "sync",
        payload: { serverId: newServer },
      });

      // Persist to server store
      const targetRoomId = room?.id || roomId;
      fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          serverId: newServer,
          action: "server_change",
        }),
      }).catch(() => {});
    },
    [room?.id, roomId, currentUser.id, sendPeerData]
  );

  // 8c. Guest Re-sync to Host: jumps directly to Host's exact timestamp
  const handleResyncToHost = useCallback(() => {
    const targetTime = Math.max(
      0,
      hostCurrentTime > 0 ? hostCurrentTime : (room?.syncState?.currentTime ?? 0)
    );
    setPlayerCurrentTime(targetTime);
    playerCurrentTimeRef.current = targetTime;
    playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: targetTime };
    setPlayerStartTime(targetTime);
    lastSyncProcessedTimeRef.current = Date.now();

    if (!isHost && room?.serverId && room.serverId !== activeServerId) {
      setActiveServerId(room.serverId as StreamServerId);
      activeServerIdRef.current = room.serverId as StreamServerId;
      setPlayerSyncKey((prev) => prev + 1);
    }
  }, [hostCurrentTime, room?.syncState?.currentTime, room?.serverId, activeServerId, isHost]);

  // 8d. Toggle Play / Pause state across all participants
  const handleTogglePlayPause = useCallback(
    (forceState?: boolean) => {
      const nextPlaying = forceState !== undefined ? forceState : !isPartyPlaying;
      const currentSec = playerCurrentTimeRef.current;
      setIsPartyPlaying(nextPlaying);
      playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: currentSec };
      lastSyncProcessedTimeRef.current = Date.now();

      if (nextPlaying) {
        setPlayerStartTime(currentSec);
      }

      // 1. Broadcast locally for tabs
      broadcastChannelRef.current?.postMessage({
        type: "playback_state",
        payload: { isPlaying: nextPlaying, time: currentSec, userId: currentUser.id },
      });

      // 2. Broadcast via PeerJS
      sendPeerData({
        type: "playback_state",
        payload: { isPlaying: nextPlaying, time: currentSec, userId: currentUser.id },
      });

      // 3. Persist to server sync
      const targetRoomId = room?.id || roomId;
      fetch(`/api/watchparty/${targetRoomId}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: currentUser.id,
          isPlaying: nextPlaying,
          currentTime: currentSec,
          action: nextPlaying ? "play" : "pause",
        }),
      }).catch(() => {});
    },
    [isPartyPlaying, currentUser.id, room?.id, roomId, sendPeerData]
  );

  // 8e. Host Action: Broadcast current playback timestamp to all participants
  const handleSyncTimeToAll = useCallback(() => {
    handleSeek(playerCurrentTimeRef.current);
  }, [handleSeek]);

  // 8f. Host Action: Synchronously reset party stream to 00:00 and launch countdown for all screens
  const handleRestartFromBeginning = useCallback(() => {
    if (!room) return;
    setPlayerCurrentTime(0);
    playerCurrentTimeRef.current = 0;
    setHostCurrentTime(0);
    setPlayerStartTime(0);
    playbackAnchorRef.current = { wallTime: Date.now() + 3500, mediaTime: 0 };
    lastSyncProcessedTimeRef.current = Date.now();

    const target = Date.now() + 3500;
    triggerLocalCountdown(target, 0);

    broadcastChannelRef.current?.postMessage({
      type: "countdown",
      payload: { target, startTime: 0 },
    });

    sendPeerData({
      type: "countdown",
      payload: { target, startTime: 0 },
    });

    const targetRoomId = room.id || roomId;
    fetch(`/api/watchparty/${targetRoomId}/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        countdownTarget: target,
        currentTime: 0,
        isPlaying: true,
        action: "seek",
      }),
    }).catch(() => {});
  }, [room, currentUser.id, roomId, triggerLocalCountdown, sendPeerData]);

  // 9. Chat Send with optimistic update & server reconciliation
  const handleSendMessage = async (text: string) => {
    const optimisticMessage: WatchPartyMessage = {
      id: `local_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      text,
      isHost: room?.hostId === currentUser.id,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    // Local cross-tab broadcast
    broadcastChannelRef.current?.postMessage({
      type: "message",
      payload: optimisticMessage,
    });

    // Remote peer broadcast
    sendPeerData({
      type: "message",
      payload: optimisticMessage,
    });

    // Remote sync to server
    const targetRoomId = room?.id || roomId;
    try {
      const res = await fetch(`/api/watchparty/${targetRoomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderId: currentUser.id,
          senderName: currentUser.name,
          senderAvatar: currentUser.avatar,
          text,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          setMessages((prev) =>
            prev.map((m) => (m.id === optimisticMessage.id ? data.message : m))
          );
        }
        pollUpdatesRef.current?.();
      }
    } catch {
      // Ignore
    }
  };

  // 10. Reaction Send
  const handleSendReaction = async (emoji: string) => {
    const optimisticReaction: WatchPartyReaction = {
      id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      emoji,
      senderName: currentUser.name,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev, optimisticReaction]);

    // Local cross-tab broadcast
    broadcastChannelRef.current?.postMessage({
      type: "reaction",
      payload: optimisticReaction,
    });

    // Remote peer broadcast
    sendPeerData({
      type: "reaction",
      payload: optimisticReaction,
    });

    // Announce reaction in party chat so it is prominently visible in chat too
    handleSendMessage(`Reacted with ${emoji}`);

    // Remote sync
    const targetRoomId = room?.id || roomId;
    try {
      await fetch(`/api/watchparty/${targetRoomId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emoji,
          senderName: currentUser.name,
        }),
      });
    } catch {
      // Ignore
    }
  };

  const role: "host" | "viewer" = isHost ? "host" : "viewer";
  const [theaterMode, setTheaterMode] = useState(false);

  const targetRoomId = room?.id || roomId;
  const roomCode = room?.code;

  const webRTC = useWebRTC({
    roomId: targetRoomId,
    roomCode,
    role,
    isHost,
  });

  const handleEnterTheaterMode = () => {
    setTheaterMode(true);
  };

  const handleExitTheaterMode = () => {
    if (webRTC.isSharing) {
      webRTC.stopScreenShare();
    }
    setTheaterMode(false);
  };

  const shellClass = darkMode ? "bg-[#0a0a0a] text-[#f5f0e8]" : "bg-[#f8f6f0] text-[#111111]";

  if (loading) {
    return (
      <main className={`min-h-screen flex flex-col ${shellClass}`}>
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="border-[3px] border-black bg-[#ffe600] px-8 py-6 text-center text-black shadow-[6px_6px_0_#000]">
            <p className="font-[var(--font-bricolage)] text-2xl font-black uppercase tracking-tight">
              Joining Watch Party...
            </p>
            <p className="mt-1 text-xs font-bold uppercase tracking-wider">Syncing room state</p>
          </div>
        </div>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className={`min-h-screen flex flex-col ${shellClass}`}>
        <Navbar />
        <div className="flex flex-1 items-center justify-center p-4">
          <div className="max-w-md border-[3px] border-black bg-[#ff5376] p-6 text-center text-black shadow-[6px_6px_0_#000] space-y-4">
            <h1 className="font-[var(--font-bricolage)] text-3xl font-black uppercase">
              Party Not Found
            </h1>
            <p className="text-xs font-bold">{error || "This watch party room has ended or code is invalid."}</p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 border-[2px] border-black bg-white px-4 py-2 text-xs font-black uppercase tracking-wider text-black shadow-[2px_2px_0_#000] hover:bg-[#ffe600]"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (role === "host" && theaterMode) {
    return (
      <main className="fixed inset-0 z-50 w-screen h-screen bg-black m-0 p-0 overflow-hidden flex flex-col items-center justify-center">
        <div className="w-full h-full flex items-center justify-center bg-black">
          <VideoPlayer
            type={room.mediaType}
            id={room.tmdbId}
            season={room.season}
            episode={room.episode}
            episodeName={room.episodeName}
            totalEpisodes={room.totalEpisodes}
            title={room.title}
            fullScreen
            hideBottomDeck
            serverId={activeServerId}
            syncKey={playerSyncKey}
            startTime={playerStartTime}
            currentTime={playerCurrentTime}
            isPlaying={isPartyPlaying}
            isWatchParty={true}
            onTogglePlayPause={handleTogglePlayPause}
            onTimeUpdate={(time, dur) => {
              if (time > 0) {
                setPlayerCurrentTime(time);
                playerCurrentTimeRef.current = time;
                playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: time };
                if (isHost) {
                  setHostCurrentTime(time);
                }
              }
              if (dur > 0) {
                setPlayerDuration(dur);
              }
            }}
            onServerChange={handleServerChange}
            headerActions={
              <WatchPartyHeaderControls
                isHost={true}
                theaterMode={true}
                isSharing={webRTC.isSharing}
                onExitTheaterMode={handleExitTheaterMode}
                onStartScreenShare={webRTC.startScreenShare}
                onStopScreenShare={webRTC.stopScreenShare}
              />
            }
          />
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-[100dvh] flex flex-col overflow-x-hidden ${shellClass} pb-[env(safe-area-inset-bottom)]`}>
      <Navbar />

      {/* Theatre Room Shell */}
      <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col p-2.5 sm:p-4 md:p-5 lg:p-6 gap-3 sm:gap-4 overflow-x-hidden">
        {/* Responsive Flex Layout: Desktop Side-by-Side (70% / 30%), Tablet/Mobile Stacked (100%) */}
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 lg:gap-5 flex-1 items-start w-full">
          {/* LEFT: Video Player Column (Desktop 70%, Tablet 100%, Mobile 100%) */}
          <div className="w-full lg:w-[70%] flex flex-col gap-3 shrink-0 lg:shrink">
            {/* Player Container: 16:9 Aspect Ratio on all devices, no fixed height */}
            <div className="relative w-full aspect-[16/9] overflow-hidden border-[3px] border-black bg-black shadow-[4px_4px_0_#000] sm:shadow-[6px_6px_0_#000]">
              {role === "host" ? (
                <>
                  <VideoPlayer
                    type={room.mediaType}
                    id={room.tmdbId}
                    season={room.season}
                    episode={room.episode}
                    episodeName={room.episodeName}
                    totalEpisodes={room.totalEpisodes}
                    title={room.title}
                    fullScreen
                    hideBottomDeck
                    serverId={activeServerId}
                    syncKey={playerSyncKey}
                    startTime={playerStartTime}
                    currentTime={playerCurrentTime}
                    isPlaying={isPartyPlaying}
                    isWatchParty={true}
                    onTogglePlayPause={handleTogglePlayPause}
                    onTimeUpdate={(time, dur) => {
                      if (time > 0) {
                        setPlayerCurrentTime(time);
                        playerCurrentTimeRef.current = time;
                        playbackAnchorRef.current = { wallTime: Date.now(), mediaTime: time };
                        if (isHost) {
                          setHostCurrentTime(time);
                        }
                      }
                      if (dur > 0) {
                        setPlayerDuration(dur);
                      }
                    }}
                    onServerChange={handleServerChange}
                    headerLeft={
                      <Link
                        href={room.mediaType === "tv" ? `/series/${room.tmdbId}` : `/movies/${room.tmdbId}`}
                        onClick={handleExitRoom}
                        title="Exit Watch Party Room"
                        aria-label="Exit Watch Party Room"
                        className="flex items-center gap-1 border border-black bg-white px-2 py-0.5 min-h-[44px] sm:min-h-0 text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-white transition shrink-0 shadow-[1px_1px_0_#000] mr-1 touch-manipulation cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Exit</span>
                      </Link>
                    }
                    headerActions={
                      <WatchPartyHeaderControls
                        isHost={isHost}
                        theaterMode={false}
                        isSharing={webRTC.isSharing}
                        onEnterTheaterMode={handleEnterTheaterMode}
                      />
                    }
                  />

                  {/* Live Floating Reaction Particle Overlay */}
                  <WatchPartyReactions reactions={reactions} />
                </>
              ) : (
                <div className="flex flex-col h-full w-full">
                  {/* Viewer Top Bar: Exit + Title */}
                  <div className="z-30 flex shrink-0 items-center justify-between gap-1.5 border-b-[2px] border-black bg-[#ffe600] px-2.5 py-1.5 text-black shadow-[0_2px_0_#000] select-none min-h-[44px]">
                    <div className="flex items-center gap-1.5 min-w-0 shrink">
                      <Link
                        href={room.mediaType === "tv" ? `/series/${room.tmdbId}` : `/movies/${room.tmdbId}`}
                        onClick={handleExitRoom}
                        title="Exit Watch Party Room"
                        aria-label="Exit Watch Party Room"
                        className="flex items-center gap-1 border border-black bg-white px-2 py-1 min-h-[36px] sm:min-h-0 text-[10px] font-black uppercase tracking-wider hover:bg-black hover:text-white transition shrink-0 shadow-[1px_1px_0_#000] mr-1 touch-manipulation cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5" />
                        <span className="hidden xs:inline">Exit</span>
                      </Link>
                      <span className="border-[1.5px] border-black bg-black px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#ffe600] shrink-0">
                        {room.mediaType === "tv" ? "SERIES" : "MOVIE"}
                      </span>
                      <p className="font-[var(--font-bricolage)] text-xs font-black uppercase tracking-tight truncate max-w-[140px] sm:max-w-[220px]">
                        {room.title}
                      </p>
                    </div>
                  </div>

                  <div className="flex-1 min-h-0 relative">
                    <WatchParty roomId={targetRoomId} role="viewer" webRTC={webRTC} />
                    <WatchPartyReactions reactions={reactions} />
                  </div>
                </div>
              )}
            </div>

            {/* Room Info & Invite Card Under Video */}
            <div className="w-full">
              <WatchPartyRoomCard
                roomCode={room.code}
                participantsCount={room.participants.length}
                isHost={isHost}
                isSharing={webRTC.isSharing}
              />
            </div>

            {/* MOBILE ONLY (< 768px, md:hidden): Button to open slide-up chat bottom sheet */}
            <div className="block md:hidden w-full">
              <button
                type="button"
                onClick={() => setMobileChatOpen(true)}
                className="w-full min-h-[48px] flex items-center justify-between gap-2 border-[3px] border-black bg-[#ffe600] px-4 py-2.5 text-black shadow-[3px_3px_0_#000] active:scale-98 transition touch-manipulation cursor-pointer font-[var(--font-bricolage)]"
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-black" />
                  <span className="text-xs sm:text-sm font-black uppercase tracking-wider">
                    Open Party Chat
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="border border-black bg-black text-[#ffe600] px-2 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    {messages.length} msgs
                  </span>
                  <span className="border border-black bg-white text-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {room.participants.length}
                  </span>
                </div>
              </button>
            </div>

            {/* TABLET ONLY (768px–1024px, hidden md:flex lg:hidden): Chat below video */}
            <div className="hidden md:flex lg:hidden w-full flex-col h-[520px] max-h-[600px] gap-2.5">
              <WatchPartyChat
                messages={messages}
                participants={room.participants}
                currentUserId={currentUser.id}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
                isHost={isHost}
              />
            </div>
          </div>

          {/* DESKTOP ONLY (> 1024px, hidden lg:flex): Chat Side-by-Side (30% width) */}
          <div className="hidden lg:flex lg:w-[30%] flex-col lg:sticky lg:top-[76px] lg:h-[calc(100vh-100px)] max-h-[900px] gap-2.5 shrink-0">
            <div className="flex-1 min-h-0 flex flex-col">
              <WatchPartyChat
                messages={messages}
                participants={room.participants}
                currentUserId={currentUser.id}
                onSendMessage={handleSendMessage}
                onSendReaction={handleSendReaction}
                isHost={isHost}
              />
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE SLIDE-UP CHAT DRAWER / BOTTOM SHEET (< 768px, md:hidden) */}
      {mobileChatOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs md:hidden"
          onClick={() => setMobileChatOpen(false)}
        />
      )}
      <div
        className={`fixed inset-x-0 bottom-0 z-50 flex flex-col h-[85dvh] max-h-[85dvh] w-full bg-[#111] dark:bg-[#111] border-t-[3px] border-black shadow-[0_-8px_24px_rgba(0,0,0,0.85)] md:hidden transition-transform duration-300 ease-out pb-[env(safe-area-inset-bottom)] ${
          mobileChatOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {/* Drawer Drag Bar & Header */}
        <div className="flex flex-col border-b-[2px] border-black bg-[#ffe600] text-black shrink-0 select-none">
          <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-black/40" />
          <div className="flex items-center justify-between px-3 py-1.5">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="font-[var(--font-bricolage)] text-sm font-black uppercase tracking-wider">
                Party Chat
              </span>
              <span className="border border-black bg-black text-[#ffe600] px-1.5 py-0.2 text-[9px] font-black">
                {room.participants.length} online
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileChatOpen(false)}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] border border-black bg-white hover:bg-black hover:text-white transition text-black active:scale-90 touch-manipulation cursor-pointer"
              title="Close chat drawer"
              aria-label="Close chat drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Chat Component inside Drawer */}
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <WatchPartyChat
            messages={messages}
            participants={room.participants}
            currentUserId={currentUser.id}
            onSendMessage={handleSendMessage}
            onSendReaction={handleSendReaction}
            isHost={isHost}
          />
        </div>
      </div>
    </main>
  );
}
