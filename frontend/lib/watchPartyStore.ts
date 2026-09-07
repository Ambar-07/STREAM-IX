import fs from "fs";
import path from "path";
import {
  buildRoomFromPayload,
  decodeRoomToken,
  encodeRoomToken,
  generateRoomCode,
  parseRoomCode,
  type WatchPartyMessage,
  type WatchPartyParticipant,
  type WatchPartyReaction,
  type WatchPartyRoom,
  type WatchPartySyncState,
} from "./watchparty";
import { DEFAULT_WATCH_PARTY_SERVER_ID, type StreamServerId, type VideoType } from "./videoSource";

// Global in-memory storage for watch party rooms (persists across Next.js API calls in-process)
declare global {
  var __streamix_party_rooms: Map<string, WatchPartyRoom> | undefined;
  var __streamix_party_messages: Map<string, WatchPartyMessage[]> | undefined;
  var __streamix_party_reactions: Map<string, WatchPartyReaction[]> | undefined;
  var __streamix_party_loaded: boolean | undefined;
}

const rooms: Map<string, WatchPartyRoom> =
  globalThis.__streamix_party_rooms ?? new Map<string, WatchPartyRoom>();
const messages: Map<string, WatchPartyMessage[]> =
  globalThis.__streamix_party_messages ?? new Map<string, WatchPartyMessage[]>();
const reactions: Map<string, WatchPartyReaction[]> =
  globalThis.__streamix_party_reactions ?? new Map<string, WatchPartyReaction[]>();

// Always assign to globalThis across ALL environments
globalThis.__streamix_party_rooms = rooms;
globalThis.__streamix_party_messages = messages;
globalThis.__streamix_party_reactions = reactions;

/**
 * Returns a guaranteed writable directory for local disk caching.
 * On serverless platforms (e.g. Vercel, AWS Lambda), /var/task is read-only, so /tmp must be used.
 */
function getWritableDataDir(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const tmpDir = path.join("/tmp", "streamix_data");
    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      return tmpDir;
    } catch {
      return "/tmp";
    }
  }

  const localDir = path.join(process.cwd(), "data");
  try {
    if (!fs.existsSync(localDir)) fs.mkdirSync(localDir, { recursive: true });
    return localDir;
  } catch {
    return path.join("/tmp", "streamix_data");
  }
}

function getFilePath(filename: string): string {
  return path.join(getWritableDataDir(), filename);
}

const ROOMS_FILE = "watchparty_rooms.json";
const MESSAGES_FILE = "watchparty_messages.json";
const REACTIONS_FILE = "watchparty_reactions.json";

let lastRoomsMtime = 0;
let lastMessagesMtime = 0;
let lastReactionsMtime = 0;

/**
 * Loads and synchronizes state from disk across all worker threads & processes.
 */
export function syncStoreFromDisk(force = false): void {
  try {
    // 1. Sync Rooms
    const roomsPath = getFilePath(ROOMS_FILE);
    if (fs.existsSync(roomsPath)) {
      const stats = fs.statSync(roomsPath);
      if (force || stats.mtimeMs > lastRoomsMtime) {
        lastRoomsMtime = stats.mtimeMs;
        const raw = fs.readFileSync(roomsPath, "utf-8");
        if (raw.trim()) {
          const parsed: Array<[string, WatchPartyRoom]> = JSON.parse(raw);
          const now = Date.now();
          for (const [id, room] of parsed) {
            if (room && room.id && now - (room.createdAt || 0) < 24 * 60 * 60 * 1000) {
              const existing = rooms.get(id);
              if (existing) {
                // Safely merge participants so active participants are NEVER dropped
                for (const p of room.participants || []) {
                  const currentP = existing.participants.find((ep) => ep.id === p.id);
                  if (!currentP) {
                    existing.participants.push(p);
                  } else if (p.lastSeen > currentP.lastSeen) {
                    currentP.lastSeen = p.lastSeen;
                    currentP.name = p.name;
                    currentP.avatar = p.avatar;
                  }
                }
                // Keep the fresher playback sync state
                if (
                  room.syncState?.lastUpdatedAt &&
                  (!existing.syncState?.lastUpdatedAt ||
                    room.syncState.lastUpdatedAt > existing.syncState.lastUpdatedAt)
                ) {
                  existing.syncState = room.syncState;
                }
              } else {
                rooms.set(id, room);
              }
            }
          }
        }
      }
    }

    // 2. Sync Messages
    const messagesPath = getFilePath(MESSAGES_FILE);
    if (fs.existsSync(messagesPath)) {
      const stats = fs.statSync(messagesPath);
      if (force || stats.mtimeMs > lastMessagesMtime) {
        lastMessagesMtime = stats.mtimeMs;
        const raw = fs.readFileSync(messagesPath, "utf-8");
        if (raw.trim()) {
          const parsed: Array<[string, WatchPartyMessage[]]> = JSON.parse(raw);
          for (const [id, msgs] of parsed) {
            if (Array.isArray(msgs)) {
              const existing = messages.get(id) || [];
              const existingIds = new Set(existing.map((m) => m.id));
              const fresh = msgs.filter((m) => !existingIds.has(m.id));
              messages.set(id, [...existing, ...fresh].slice(-100));
            }
          }
        }
      }
    }

    // 3. Sync Reactions
    const reactionsPath = getFilePath(REACTIONS_FILE);
    if (fs.existsSync(reactionsPath)) {
      const stats = fs.statSync(reactionsPath);
      if (force || stats.mtimeMs > lastReactionsMtime) {
        lastReactionsMtime = stats.mtimeMs;
        const raw = fs.readFileSync(reactionsPath, "utf-8");
        if (raw.trim()) {
          const parsed: Array<[string, WatchPartyReaction[]]> = JSON.parse(raw);
          const cutoff = Date.now() - 30_000;
          for (const [id, reacts] of parsed) {
            if (Array.isArray(reacts)) {
              reactions.set(id, reacts.filter((r) => r.timestamp > cutoff));
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[WATCHPARTY STORE] Warning: Could not sync from disk:", err);
  }
}

/**
 * Persists current state to disk cache and updates recorded modification times.
 */
function persistToDisk(): void {
  try {
    const roomsPath = getFilePath(ROOMS_FILE);
    const roomsData = JSON.stringify(Array.from(rooms.entries()), null, 2);
    fs.writeFileSync(roomsPath, roomsData, "utf-8");
    try {
      lastRoomsMtime = fs.statSync(roomsPath).mtimeMs;
    } catch {}

    const messagesPath = getFilePath(MESSAGES_FILE);
    const messagesData = JSON.stringify(Array.from(messages.entries()), null, 2);
    fs.writeFileSync(messagesPath, messagesData, "utf-8");
    try {
      lastMessagesMtime = fs.statSync(messagesPath).mtimeMs;
    } catch {}

    const reactionsPath = getFilePath(REACTIONS_FILE);
    const reactionsData = JSON.stringify(Array.from(reactions.entries()), null, 2);
    fs.writeFileSync(reactionsPath, reactionsData, "utf-8");
    try {
      lastReactionsMtime = fs.statSync(reactionsPath).mtimeMs;
    } catch {}
  } catch (err) {
    console.warn("[WATCHPARTY STORE] Warning: Could not write to disk cache:", err);
  }
}

// Initial hydration from disk
if (!globalThis.__streamix_party_loaded) {
  syncStoreFromDisk(true);
  globalThis.__streamix_party_loaded = true;
}

export function createPartyRoom(params: {
  title: string;
  mediaType: VideoType;
  tmdbId: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  season?: number;
  episode?: number;
  episodeName?: string;
  totalEpisodes?: number;
  serverId?: StreamServerId;
  host: { id: string; name: string; avatar: string };
}): WatchPartyRoom {
  syncStoreFromDisk();

  const code = generateRoomCode(params.mediaType, params.tmdbId, params.season, params.episode);
  const hostId = params.host.id || `host_${Date.now()}`;
  const hostName = params.host.name || "Host";
  const hostAvatar = params.host.avatar || "🍿";
  const selectedServer =
    params.serverId && params.serverId !== "2embed"
      ? params.serverId
      : DEFAULT_WATCH_PARTY_SERVER_ID;

  const id = encodeRoomToken({
    m: params.mediaType,
    id: params.tmdbId,
    t: params.title,
    p: params.posterPath,
    b: params.backdropPath,
    s: params.season,
    e: params.episode,
    en: params.episodeName,
    te: params.totalEpisodes,
    srv: selectedServer,
    c: code,
    h: hostName,
    ha: hostAvatar,
    hid: hostId,
    ts: Date.now(),
    salt: Math.random().toString(36).slice(2, 6),
  });

  const hostParticipant: WatchPartyParticipant = {
    id: hostId,
    name: hostName,
    avatar: hostAvatar,
    isHost: true,
    joinedAt: Date.now(),
    lastSeen: Date.now(),
  };

  const syncState: WatchPartySyncState = {
    isPlaying: true,
    currentTime: 0,
    season: params.season,
    episode: params.episode,
    episodeName: params.episodeName,
    serverId: selectedServer,
    countdownTarget: null,
    lastUpdatedBy: hostId,
    lastUpdatedAt: Date.now(),
  };

  const room: WatchPartyRoom = {
    id,
    code,
    title: params.title,
    mediaType: params.mediaType,
    tmdbId: params.tmdbId,
    posterPath: params.posterPath,
    backdropPath: params.backdropPath,
    season: params.season,
    episode: params.episode,
    episodeName: params.episodeName,
    totalEpisodes: params.totalEpisodes,
    serverId: selectedServer,
    hostId,
    hostName,
    createdAt: Date.now(),
    participants: [hostParticipant],
    syncState,
  };

  rooms.set(id, room);
  messages.set(id, [
    {
      id: `msg_init_${Date.now()}`,
      senderId: "system",
      senderName: "Streamix Party",
      senderAvatar: "🍿",
      text: `Welcome to ${params.title}! Share room code ${code} or invite link with friends.`,
      isSystem: true,
      timestamp: Date.now(),
    },
  ]);
  reactions.set(id, []);

  persistToDisk();
  return room;
}

/**
 * Resolves a room by ID, room code, or formatted/unformatted query string.
 * Automatically reconstructs and caches self-describing rooms so they never 404 across serverless containers.
 */
export function getPartyRoom(idOrCode: string): WatchPartyRoom | null {
  if (!idOrCode) return null;

  const trimmed = idOrCode.trim();
  const upper = trimmed.toUpperCase();

  // 1. Direct ID check in memory first (fastest and keeps live participants intact)
  if (rooms.has(trimmed)) {
    return rooms.get(trimmed) ?? null;
  }
  if (rooms.has(upper)) {
    return rooms.get(upper) ?? null;
  }

  // 2. URL extraction if someone pasted full link
  const urlMatch = trimmed.match(/\/watchparty\/([a-zA-Z0-9_-]+)/);
  if (urlMatch && urlMatch[1]) {
    const extracted = getPartyRoom(urlMatch[1]);
    if (extracted) return extracted;
  }

  // 3. Search in-memory rooms by code / alphanumeric normalizations
  const alphanumericOnly = upper.replace(/[^A-Z0-9]/g, "");

  for (const room of rooms.values()) {
    if (room.id === trimmed || room.id.toUpperCase() === upper) {
      return room;
    }
    if (room.code.toUpperCase() === upper) {
      return room;
    }
    const roomCodeAlpha = room.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (roomCodeAlpha === alphanumericOnly) {
      return room;
    }
    const roomSuffix = roomCodeAlpha.replace(/^STRM/, "");
    const querySuffix = alphanumericOnly.replace(/^STRM/, "");
    if (roomSuffix && querySuffix && roomSuffix === querySuffix) {
      return room;
    }
  }

  // 4. If not found in memory, reload from disk in case of fresh write from another process
  syncStoreFromDisk(true);

  for (const room of rooms.values()) {
    if (room.id === trimmed || room.id.toUpperCase() === upper) {
      return room;
    }
    if (room.code.toUpperCase() === upper) {
      return room;
    }
    const roomCodeAlpha = room.code.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (roomCodeAlpha === alphanumericOnly) {
      return room;
    }
    const roomSuffix = roomCodeAlpha.replace(/^STRM/, "");
    const querySuffix = alphanumericOnly.replace(/^STRM/, "");
    if (roomSuffix && querySuffix && roomSuffix === querySuffix) {
      return room;
    }
  }

  // 5. SELF-DESCRIBING ROOM DECODE (Check if an active room matching this media already exists)
  const decodedPayload = decodeRoomToken(trimmed);
  if (decodedPayload) {
    const existingRoom = Array.from(rooms.values()).find(
      (r) =>
        r.mediaType === decodedPayload.m &&
        String(r.tmdbId) === String(decodedPayload.id) &&
        (decodedPayload.s === undefined || r.season === decodedPayload.s) &&
        (decodedPayload.e === undefined || r.episode === decodedPayload.e)
    );
    if (existingRoom) {
      return existingRoom;
    }

    const autoRoom = buildRoomFromPayload(
      decodedPayload,
      trimmed.startsWith("wp_") ? trimmed : undefined
    );
    rooms.set(autoRoom.id, autoRoom);
    if (!messages.has(autoRoom.id)) {
      messages.set(autoRoom.id, [
        {
          id: `msg_init_${Date.now()}`,
          senderId: "system",
          senderName: "Streamix Party",
          senderAvatar: "🍿",
          text: `Watch party connected for ${autoRoom.title}!`,
          isSystem: true,
          timestamp: Date.now(),
        },
      ]);
    }
    if (!reactions.has(autoRoom.id)) {
      reactions.set(autoRoom.id, []);
    }
    persistToDisk();
    return autoRoom;
  }

  // 6. CODE-BASED DECODE (Check if an active room matching this media already exists)
  const parsedCode = parseRoomCode(trimmed);
  if (parsedCode) {
    const existingRoom = Array.from(rooms.values()).find(
      (r) =>
        r.mediaType === parsedCode.mediaType &&
        String(r.tmdbId) === String(parsedCode.tmdbId) &&
        (parsedCode.season === undefined || r.season === parsedCode.season) &&
        (parsedCode.episode === undefined || r.episode === parsedCode.episode)
    );
    if (existingRoom) {
      return existingRoom;
    }

    const autoRoom = buildRoomFromPayload({
      m: parsedCode.mediaType,
      id: parsedCode.tmdbId,
      s: parsedCode.season,
      e: parsedCode.episode,
      t:
        parsedCode.mediaType === "tv"
          ? `Series ${parsedCode.tmdbId}`
          : `Movie ${parsedCode.tmdbId}`,
      c: trimmed.toUpperCase(),
    });
    rooms.set(autoRoom.id, autoRoom);
    if (!messages.has(autoRoom.id)) {
      messages.set(autoRoom.id, [
        {
          id: `msg_init_${Date.now()}`,
          senderId: "system",
          senderName: "Streamix Party",
          senderAvatar: "🍿",
          text: `Watch party connected! Share code ${autoRoom.code} with friends.`,
          isSystem: true,
          timestamp: Date.now(),
        },
      ]);
    }
    if (!reactions.has(autoRoom.id)) {
      reactions.set(autoRoom.id, []);
    }
    persistToDisk();
    return autoRoom;
  }

  return null;
}

/**
 * Updates participant lastSeen timestamp during polling heartbeat and safely maintains active participants.
 */
export function touchPartyRoom(
  idOrCode: string,
  userId?: string,
  userName?: string,
  userAvatar?: string,
  peerId?: string
): WatchPartyRoom | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  const now = Date.now();
  let changed = false;

  if (userId) {
    const participant = room.participants.find((p) => p.id === userId);
    if (participant) {
      participant.lastSeen = now;
      if (userName && userName !== participant.name) {
        participant.name = userName;
        changed = true;
      }
      if (userAvatar && userAvatar !== participant.avatar) {
        participant.avatar = userAvatar;
        changed = true;
      }
      changed = true;
    } else {
      // Auto-rehydrate any active polling user so they are never erroneously dropped
      const isHost = userId === room.hostId;
      room.participants.push({
        id: userId,
        name: userName || (isHost ? room.hostName || "Host" : `Viewer ${userId.slice(-4)}`),
        avatar: userAvatar || (isHost ? "👑" : "🍿"),
        isHost,
        joinedAt: now,
        lastSeen: now,
      });
      changed = true;
    }

    if (userId === room.hostId && peerId && peerId !== room.hostPeerId) {
      room.hostPeerId = peerId;
      changed = true;
    }
  }

  // Prune participants inactive for > 5 minutes (300,000ms) - NEVER prune room host
  const prevCount = room.participants.length;
  room.participants = room.participants.filter(
    (p) => now - p.lastSeen < 300_000 || p.id === room.hostId || p.isHost
  );

  if (room.participants.length !== prevCount) {
    changed = true;
  }

  if (changed) {
    persistToDisk();
  }

  return room;
}

export function joinPartyRoom(
  idOrCode: string,
  user: { id: string; name: string; avatar: string }
): WatchPartyRoom | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  const now = Date.now();
  const existingIdx = room.participants.findIndex((p) => p.id === user.id);

  if (existingIdx >= 0) {
    // Update existing participant
    room.participants[existingIdx].name = user.name;
    room.participants[existingIdx].avatar = user.avatar;
    room.participants[existingIdx].lastSeen = now;
  } else {
    // New participant joins - only assign host if room has no host defined yet
    const isFirst = !room.hostId && room.participants.length === 0;
    const newParticipant: WatchPartyParticipant = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      isHost: isFirst || user.id === room.hostId,
      joinedAt: now,
      lastSeen: now,
    };

    if (newParticipant.isHost) {
      room.hostId = user.id;
      room.hostName = user.name;
    }

    room.participants.push(newParticipant);

    // Announce in chat
    const roomMessages = messages.get(room.id) ?? [];
    roomMessages.push({
      id: `join_${now}_${Math.random().toString(36).slice(2, 5)}`,
      senderId: "system",
      senderName: "Streamix Party",
      senderAvatar: user.avatar,
      text: `${user.name} joined the watch party!`,
      isSystem: true,
      timestamp: now,
    });
    messages.set(room.id, roomMessages.slice(-100));
  }

  // Keep active participants (seen within 5 minutes) - NEVER prune host
  room.participants = room.participants.filter(
    (p) => now - p.lastSeen < 300_000 || p.id === room.hostId || p.isHost
  );

  persistToDisk();
  return room;
}

export function leavePartyRoom(idOrCode: string, userId: string): WatchPartyRoom | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  const leaving = room.participants.find((p) => p.id === userId);
  room.participants = room.participants.filter((p) => p.id !== userId);

  if (leaving) {
    const roomMessages = messages.get(room.id) ?? [];
    roomMessages.push({
      id: `leave_${Date.now()}`,
      senderId: "system",
      senderName: "Streamix Party",
      senderAvatar: leaving.avatar,
      text: `${leaving.name} left the room.`,
      isSystem: true,
      timestamp: Date.now(),
    });
    messages.set(room.id, roomMessages.slice(-100));
  }

  // If host left, appoint next participant as host
  if (room.hostId === userId && room.participants.length > 0) {
    room.participants[0].isHost = true;
    room.hostId = room.participants[0].id;
    room.hostName = room.participants[0].name;

    const roomMessages = messages.get(room.id) ?? [];
    roomMessages.push({
      id: `host_transfer_${Date.now()}`,
      senderId: "system",
      senderName: "Streamix Party",
      senderAvatar: "👑",
      text: `${room.hostName} is now the host.`,
      isSystem: true,
      timestamp: Date.now(),
    });
  }

  persistToDisk();
  return room;
}

export function updatePartySync(
  idOrCode: string,
  update: Partial<WatchPartySyncState> & { userId: string }
): WatchPartySyncState | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  const now = Date.now();
  const isHost = room.hostId === update.userId;
  let participant = room.participants.find((p) => p.id === update.userId);

  // Ensure user is in participants list so sync never fails
  if (!participant) {
    const newParticipant: WatchPartyParticipant = {
      id: update.userId,
      name: isHost ? room.hostName || "Host" : `Viewer ${update.userId.slice(-4)}`,
      avatar: isHost ? "👑" : "🍿",
      isHost,
      joinedAt: now,
      lastSeen: now,
    };
    room.participants.push(newParticipant);
    participant = newParticipant;
  } else {
    participant.lastSeen = now;
  }

  const current = room.syncState;

  const nextState: WatchPartySyncState = {
    isPlaying: update.isPlaying !== undefined ? update.isPlaying : current.isPlaying,
    currentTime: update.currentTime !== undefined ? update.currentTime : current.currentTime,
    action: update.action ?? current.action,
    season: update.season ?? current.season,
    episode: update.episode ?? current.episode,
    episodeName: update.episodeName ?? current.episodeName,
    serverId: update.serverId ?? current.serverId,
    countdownTarget:
      update.countdownTarget !== undefined ? update.countdownTarget : current.countdownTarget,
    lastUpdatedBy: update.userId,
    lastUpdatedAt: now,
  };

  room.syncState = nextState;

  if (update.serverId && update.serverId !== room.serverId) {
    room.serverId = update.serverId;
  }
  if (update.season !== undefined) {
    room.season = update.season;
  }
  if (update.episode !== undefined) {
    room.episode = update.episode;
  }
  if (update.episodeName !== undefined) {
    room.episodeName = update.episodeName;
  }

  persistToDisk();
  return nextState;
}

export function addPartyMessage(
  idOrCode: string,
  msg: { senderId: string; senderName: string; senderAvatar: string; text: string }
): WatchPartyMessage | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  syncStoreFromDisk();

  const roomMessages = messages.get(room.id) ?? [];
  const message: WatchPartyMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    senderId: msg.senderId,
    senderName: msg.senderName,
    senderAvatar: msg.senderAvatar,
    text: msg.text.trim(),
    isHost: room.hostId === msg.senderId,
    timestamp: Date.now(),
  };

  roomMessages.push(message);
  messages.set(room.id, roomMessages.slice(-100)); // retain last 100 messages

  persistToDisk();
  return message;
}

export function getPartyMessages(idOrCode: string, since = 0): WatchPartyMessage[] {
  const room = getPartyRoom(idOrCode);
  if (!room) return [];

  syncStoreFromDisk();

  const roomMessages = messages.get(room.id) ?? [];
  if (!since) return roomMessages;
  return roomMessages.filter((m) => m.timestamp >= since);
}

export function addPartyReaction(
  idOrCode: string,
  reaction: { emoji: string; senderName: string }
): WatchPartyReaction | null {
  const room = getPartyRoom(idOrCode);
  if (!room) return null;

  syncStoreFromDisk();

  const roomReactions = reactions.get(room.id) ?? [];
  const newReaction: WatchPartyReaction = {
    id: `react_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    emoji: reaction.emoji,
    senderName: reaction.senderName,
    timestamp: Date.now(),
  };

  roomReactions.push(newReaction);
  const cutoff = Date.now() - 25_000;
  reactions.set(room.id, roomReactions.filter((r) => r.timestamp > cutoff));

  persistToDisk();
  return newReaction;
}

export function getPartyReactions(idOrCode: string, since = 0): WatchPartyReaction[] {
  const room = getPartyRoom(idOrCode);
  if (!room) return [];

  syncStoreFromDisk();

  const roomReactions = reactions.get(room.id) ?? [];
  const cutoff = since || Date.now() - 15_000;
  return roomReactions.filter((r) => r.timestamp >= cutoff);
}
