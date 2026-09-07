export type VideoType = "movie" | "tv";

export const ENABLE_EXTERNAL_STREAMING = process.env.NEXT_PUBLIC_ENABLE_EXTERNAL_STREAMING === "true";

export type StreamServerId =
  | "viduki-1"
  | "viduki-2"
  | "viduki-3"
  | "viduki-4"
  | "vidsrc-to"
  | "vidsrc-pm"
  | "2embed";

export type StreamServer = {
  id: StreamServerId;
  label: string;
  shortName: string;
  badge: string;
  provider: "viduki" | "vidsrc" | "2embed";
  baseUrl: string;
};

export const STREAM_SERVERS: StreamServer[] = [
  {
    id: "viduki-1",
    label: "Server 1",
    shortName: "S1",
    badge: "Primary",
    provider: "viduki",
    baseUrl: process.env.NEXT_PUBLIC_VIDEO_BASE_URL || "https://embed.stream-service.org/1",
  },
  {
    id: "viduki-2",
    label: "Server 2",
    shortName: "S2",
    badge: "Mirror",
    provider: "viduki",
    baseUrl: "https://embed.stream-service.org/2",
  },
  {
    id: "viduki-3",
    label: "Server 3",
    shortName: "S3",
    badge: "Backup",
    provider: "viduki",
    baseUrl: "https://embed.stream-service.org/3",
  },
  {
    id: "viduki-4",
    label: "Server 4",
    shortName: "S4",
    badge: "Resilient",
    provider: "viduki",
    baseUrl: "https://embed.stream-service.org/4",
  },
  {
    id: "vidsrc-to",
    label: "Server 5",
    shortName: "S5",
    badge: "CDN",
    provider: "vidsrc",
    baseUrl: "https://cdn.stream-service.org",
  },
  {
    id: "vidsrc-pm",
    label: "Server 6",
    shortName: "S6",
    badge: "Fast",
    provider: "vidsrc",
    baseUrl: "https://mirror.stream-service.org",
  },
  {
    id: "2embed",
    label: "Server 7",
    shortName: "S7",
    badge: "Sync-Ready",
    provider: "2embed",
    baseUrl: "https://backup.stream-service.org",
  },
];

export const DEFAULT_SERVER_ID: StreamServerId = "viduki-1";
export const DEFAULT_WATCH_PARTY_SERVER_ID: StreamServerId = DEFAULT_SERVER_ID;
export const STREAM_SERVER_STORAGE_KEY = "streamix_stream_server";

export function getServerById(id?: string | null): StreamServer {
  return STREAM_SERVERS.find((s) => s.id === id) ?? STREAM_SERVERS[0];
}

export function getNextServerId(currentId: StreamServerId): StreamServerId {
  const currentIndex = STREAM_SERVERS.findIndex((s) => s.id === currentId);
  const nextIndex = (currentIndex + 1) % STREAM_SERVERS.length;
  return STREAM_SERVERS[nextIndex].id;
}

export function getVideoBaseUrl(serverId: StreamServerId = DEFAULT_SERVER_ID): string {
  const configuredBaseUrl = process.env.NEXT_PUBLIC_VIDEO_BASE_URL?.trim();

  if (configuredBaseUrl && serverId === DEFAULT_SERVER_ID) {
    return configuredBaseUrl.replace(/\/$/, "");
  }

  const server = getServerById(serverId);
  return server.baseUrl;
}

function appendAdControls(url: string, disableAds: boolean): string {
  if (!disableAds) {
    return url;
  }

  const params = new URLSearchParams();
  params.set("ads", "false");
  params.set("disable_ads", "true");
  params.set("noads", "1");

  const separator = url.includes("?") ? "&" : "?";

  return `${url}${separator}${params.toString()}`;
}

export function getVideoEmbedUrl({
  type,
  id,
  season,
  episode,
  serverId = DEFAULT_SERVER_ID,
  disableAds = false,
  startTime,
  isWatchParty = false,
}: {
  type: VideoType;
  id: string;
  season?: number;
  episode?: number;
  serverId?: StreamServerId;
  disableAds?: boolean;
  startTime?: number;
  isWatchParty?: boolean;
}) {
  if (!id) {
    throw new Error("Video ID is required.");
  }

  const server = getServerById(serverId);
  const safeSeason = season && season > 0 ? season : 1;
  const safeEpisode = episode && episode > 0 ? episode : 1;

  let finalUrl = "";

  if (server.provider === "2embed") {
    if (type === "movie") {
      finalUrl = `${server.baseUrl}/embed/${id}`;
    } else {
      finalUrl = `${server.baseUrl}/embedtv/${id}&s=${safeSeason}&e=${safeEpisode}`;
    }
  } else if (server.provider === "vidsrc") {
    if (type === "movie") {
      finalUrl = `${server.baseUrl}/embed/movie/${id}`;
    } else {
      finalUrl = `${server.baseUrl}/embed/tv/${id}/${safeSeason}/${safeEpisode}`;
    }
  } else {
    // Multi-server primary provider (/1, /2, /3, /4)
    if (type === "movie") {
      finalUrl = `${server.baseUrl}/movie/${id}`;
    } else {
      finalUrl = `${server.baseUrl}/tv/${id}/${safeSeason}/${safeEpisode}`;
    }
  }

  finalUrl = appendAdControls(finalUrl, disableAds);

  // Append start time parameters for synchronized playback (supports all major embed formats)
  if (startTime && startTime > 0) {
    const sec = Math.floor(startTime);
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}start=${sec}&t=${sec}&time=${sec}${isWatchParty ? "&wp=1" : ""}#t=${sec}`;
  } else if (isWatchParty) {
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}start=0&t=0&time=0&fresh=1&wp=1`;
  }

  return finalUrl;
}

