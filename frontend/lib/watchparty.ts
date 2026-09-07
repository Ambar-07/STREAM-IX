import type { StreamServerId, VideoType } from "./videoSource";

export interface WatchPartyParticipant {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  joinedAt: number;
  lastSeen: number;
}

export interface WatchPartyMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  text: string;
  isHost?: boolean;
  isSystem?: boolean;
  timestamp: number;
}

export interface WatchPartyReaction {
  id: string;
  emoji: string;
  senderName: string;
  timestamp: number;
}

export interface WatchPartySyncState {
  isPlaying: boolean;
  currentTime?: number;
  action?: "play" | "pause" | "seek" | "sync" | "countdown";
  season?: number;
  episode?: number;
  episodeName?: string;
  serverId?: StreamServerId;
  countdownTarget?: number | null; // epoch ms when countdown ends and video plays
  lastUpdatedBy: string;
  lastUpdatedAt: number;
}

export interface WatchPartyRoom {
  id: string;
  code: string;
  title: string;
  mediaType: VideoType;
  tmdbId: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  season?: number;
  episode?: number;
  episodeName?: string;
  totalEpisodes?: number;
  serverId: StreamServerId;
  hostId: string;
  hostName: string;
  hostPeerId?: string;
  createdAt: number;
  participants: WatchPartyParticipant[];
  syncState: WatchPartySyncState;
}

export interface SelfDescribingRoomPayload {
  m: VideoType;
  id: string; // tmdbId
  t?: string; // title
  p?: string | null; // posterPath
  b?: string | null; // backdropPath
  s?: number; // season
  e?: number; // episode
  en?: string; // episodeName
  te?: number; // totalEpisodes
  srv?: StreamServerId;
  c?: string; // room code
  h?: string; // hostName
  ha?: string; // hostAvatar
  hid?: string; // hostId
  ts?: number; // timestamp
  salt?: string;
}

export function generateRoomCode(
  mediaType: VideoType,
  tmdbId: string | number,
  season?: number,
  episode?: number
): string {
  const chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let suffix = "";
  for (let i = 0; i < 2; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  if (mediaType === "tv") {
    const s = season ?? 1;
    const e = episode ?? 1;
    return `STRM-T${tmdbId}-S${s}E${e}-${suffix}`;
  }
  return `STRM-M${tmdbId}-${suffix}`;
}

export function parseRoomCode(code: string): {
  mediaType: VideoType;
  tmdbId: string;
  season?: number;
  episode?: number;
} | null {
  if (!code) return null;
  const clean = code.trim().toUpperCase().replace(/\s+/g, "");

  // Pattern 1: TV series e.g. STRM-T1399-S1E2-9K or T1399-S1E2 or STRM-T-1399-S1-E2
  const tvMatch = clean.match(/(?:STRM[-_]?)?T(?:[-_]?)(\d+)(?:[-_]?S(\d+))?(?:[-_]?E(\d+))?/);
  if (tvMatch && tvMatch[1] && (clean.includes("S") || clean.includes("T"))) {
    return {
      mediaType: "tv",
      tmdbId: tvMatch[1],
      season: tvMatch[2] ? parseInt(tvMatch[2], 10) : 1,
      episode: tvMatch[3] ? parseInt(tvMatch[3], 10) : 1,
    };
  }

  // Pattern 2: Movie e.g. STRM-M27205-9X or STRM-M-27205 or M27205
  const movieMatch = clean.match(/(?:STRM[-_]?)?M(?:[-_]?)(\d+)/);
  if (movieMatch && movieMatch[1]) {
    return {
      mediaType: "movie",
      tmdbId: movieMatch[1],
    };
  }

  // Pattern 3: Simple numeric TMDB id (defaults to movie)
  const numMatch = clean.match(/^(\d+)$/);
  if (numMatch) {
    return {
      mediaType: "movie",
      tmdbId: numMatch[1],
    };
  }

  return null;
}

export function encodeRoomToken(payload: SelfDescribingRoomPayload): string {
  const json = JSON.stringify(payload);
  if (typeof Buffer !== "undefined") {
    return "wp_" + Buffer.from(json, "utf-8").toString("base64url");
  } else {
    // Browser fallback
    const b64 = btoa(
      encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
    return "wp_" + b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
}

export function decodeRoomToken(roomId: string): SelfDescribingRoomPayload | null {
  if (!roomId || typeof roomId !== "string") return null;
  // If full URL was provided, extract the room id token
  const match = roomId.match(/wp_[a-zA-Z0-9_-]+/);
  const token = match ? match[0] : (roomId.startsWith("wp_") ? roomId : null);
  if (!token) return null;

  try {
    const raw = token.slice(3);
    let json = "";
    if (typeof Buffer !== "undefined") {
      json = Buffer.from(raw, "base64url").toString("utf-8");
    } else {
      let b64 = raw.replace(/-/g, "+").replace(/_/g, "/");
      while (b64.length % 4) b64 += "=";
      const decodedStr = atob(b64);
      json = decodeURIComponent(
        Array.prototype.map
          .call(decodedStr, (c: string) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    }
    const parsed = JSON.parse(json);
    if (parsed && parsed.m && parsed.id) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildRoomFromPayload(
  payload: SelfDescribingRoomPayload,
  roomIdOverride?: string
): WatchPartyRoom {
  const code =
    payload.c ||
    generateRoomCode(payload.m, payload.id, payload.s, payload.e);
  const hostId = payload.hid || `host_${payload.salt || "creator"}`;
  const hostName = payload.h || "Host";
  const hostAvatar = payload.ha || "🍿";
  const createdAt = payload.ts || Date.now();
  const roomId = roomIdOverride || encodeRoomToken(payload);

  return {
    id: roomId,
    code,
    title: payload.t || (payload.m === "tv" ? `Series ${payload.id}` : `Movie ${payload.id}`),
    mediaType: payload.m,
    tmdbId: String(payload.id),
    posterPath: payload.p ?? null,
    backdropPath: payload.b ?? null,
    season: payload.s,
    episode: payload.e,
    episodeName: payload.en,
    totalEpisodes: payload.te,
    serverId: (payload.srv as StreamServerId) || "auto",
    hostId,
    hostName,
    createdAt,
    participants: [
      {
        id: hostId,
        name: hostName,
        avatar: hostAvatar,
        isHost: true,
        joinedAt: createdAt,
        lastSeen: Date.now(),
      },
    ],
    syncState: {
      isPlaying: false,
      currentTime: 0,
      season: payload.s,
      episode: payload.e,
      episodeName: payload.en,
      serverId: (payload.srv as StreamServerId) || "auto",
      countdownTarget: null,
      lastUpdatedBy: hostId,
      lastUpdatedAt: Date.now(),
    },
  };
}

const PARTICIPANT_KEY = "streamix_party_participant";

export function getLocalParticipant(): { id: string; name: string; avatar: string } {
  if (typeof window === "undefined") {
    return { id: "guest_1", name: "Viewer", avatar: "🍿" };
  }

  // 1. Check tab session participant FIRST (isolated per browser tab to avoid multi-tab collisions)
  try {
    const rawSession = sessionStorage.getItem("streamix_session_participant");
    if (rawSession) {
      const parsed = JSON.parse(rawSession);
      if (parsed?.id && parsed?.name) {
        return parsed;
      }
    }
  } catch {}

  // 2. Check authenticated user profile in Streamix
  let baseName = "";
  let baseAvatar = "🍿";
  let baseUserId = "";
  try {
    const rawUser = localStorage.getItem("movie_app_user");
    if (rawUser) {
      const authUser = JSON.parse(rawUser);
      if (authUser && (authUser.id || authUser.username)) {
        baseUserId = String(authUser.id || `user_${authUser.username}`);
        baseName = authUser.displayName || authUser.username || "Streamix Member";
        baseAvatar = authUser.avatar || "🍿";
      }
    }
  } catch {}

  // Check custom nickname for user if previously saved
  if (baseUserId) {
    try {
      const rawCustom = localStorage.getItem(`${PARTICIPANT_KEY}_${baseUserId}`);
      if (rawCustom) {
        const custom = JSON.parse(rawCustom);
        if (custom?.name) baseName = custom.name;
        if (custom?.avatar) baseAvatar = custom.avatar;
      }
    } catch {}

    const tabSuffix = Math.random().toString(36).slice(2, 6);
    const authParticipant = {
      id: `${baseUserId}_${tabSuffix}`,
      name: baseName || "Streamix Member",
      avatar: baseAvatar,
    };
    try {
      sessionStorage.setItem("streamix_session_participant", JSON.stringify(authParticipant));
    } catch {}
    return authParticipant;
  }

  // 3. Generate fresh guest participant for this tab session
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  const avatars = ["🍿", "🎬", "🥤", "🦊", "⚡", "🚀", "👑", "🔥"];
  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
  const initial = {
    id: `guest_${Date.now()}_${randomNum}`,
    name: `Viewer ${randomNum}`,
    avatar: randomAvatar,
  };

  try {
    sessionStorage.setItem("streamix_session_participant", JSON.stringify(initial));
    localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(initial));
  } catch {}

  return initial;
}

export function saveLocalParticipant(name: string, avatar: string) {
  if (typeof window === "undefined") return;
  const current = getLocalParticipant();
  const updated = { ...current, name: name.trim() || current.name, avatar };

  try {
    sessionStorage.setItem("streamix_session_participant", JSON.stringify(updated));
    localStorage.setItem(PARTICIPANT_KEY, JSON.stringify(updated));

    // Also persist for logged-in user if available
    const rawUser = localStorage.getItem("movie_app_user");
    if (rawUser) {
      const authUser = JSON.parse(rawUser);
      const userId = String(authUser?.id || (authUser?.username ? `user_${authUser.username}` : ""));
      if (userId) {
        localStorage.setItem(`${PARTICIPANT_KEY}_${userId}`, JSON.stringify(updated));
      }
    }
  } catch {
    // Ignore
  }
  return updated;
}
