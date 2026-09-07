export type Genre = { id: number; name: string };

export type Episode = {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path?: string | null;
  air_date?: string;
};

export type Season = {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path?: string | null;
  air_date?: string;
  episode_count?: number;
};

export type TrailerVideo = {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  official?: boolean;
  published_at?: string;
};

export type CastMember = {
  id: number;
  name: string;
  character?: string;
  profile_path?: string | null;
  order?: number;
};

export type Movie = {
  id: number;
  title: string;
  name?: string;
  overview: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: Genre[];
  media_type?: "movie" | "tv";
  seasons?: Season[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  trailer_key?: string | null;
  trailer_name?: string | null;
  videos?: TrailerVideo[];
  cast?: CastMember[];
  recommendations?: Movie[];
  runtime?: number;
};

export type Series = Movie;

export function isSeries(item: {
  media_type?: string;
  first_air_date?: string;
  release_date?: string;
  number_of_seasons?: number;
  seasons?: Season[] | unknown[];
  name?: string;
  title?: string;
} | null | undefined): boolean {
  if (!item) return false;
  if (item.media_type === "tv") return true;
  if (item.media_type === "movie") return false;
  return Boolean(
    (item.number_of_seasons && item.number_of_seasons > 0) ||
    (item.seasons && item.seasons.length > 0) ||
    (item.first_air_date && !item.release_date) ||
    (item.name && !item.title)
  );
}

export function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }
  return localStorage.getItem("movie_app_token");
}

let externalBackendOffline = false;
let lastOfflineCheck = 0;

export function resolveBaseUrl(): string {
  if (typeof window !== "undefined") {
    // If external backend failed recently, stick to internal /api
    if (externalBackendOffline && Date.now() - lastOfflineCheck < 60_000) {
      return "/api";
    }

    const isLocalhost =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    const configured = process.env.NEXT_PUBLIC_API_URL?.trim();

    if (!configured || configured === "/api") {
      return "/api";
    }

    // On mobile devices, tablets, or remote domains, don't attempt calling a remote localhost
    if (!isLocalhost) {
      if (configured.includes("localhost") || configured.includes("127.0.0.1")) {
        return "/api";
      }
      return configured.replace(/\/$/, "");
    }

    return configured.replace(/\/$/, "");
  }

  return process.env.NEXT_PUBLIC_API_URL || "/api";
}

export const API_BASE = resolveBaseUrl();

// In-memory client-side cache and in-flight request deduplication
const clientCache = new Map<string, { data: any; timestamp: number }>();
const inFlightRequests = new Map<string, Promise<any>>();
const CLIENT_CACHE_TTL = 30_000; // 30 seconds

export async function fetchJson<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method || "GET").toUpperCase();
  const isGet = method === "GET";
  const cacheKey = `${endpoint}`;

  // Serve from client cache for GET requests
  if (isGet) {
    const cached = clientCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CLIENT_CACHE_TTL) {
      return cached.data as T;
    }

    // Deduplicate in-flight GET requests
    const ongoing = inFlightRequests.get(cacheKey);
    if (ongoing) {
      return ongoing as Promise<T>;
    }
  }

  const requestPromise = (async () => {
    const token = getAuthToken();
    const headers = new Headers(options.headers ?? {});

    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const primaryBase = resolveBaseUrl();
    const primaryUrl = `${primaryBase}${endpoint}`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(primaryUrl, {
        ...options,
        signal: options.signal || controller.signal,
        headers,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        if (response.status === 204) {
          return undefined as T;
        }
        const data = (await response.json()) as T;
        if (isGet) {
          clientCache.set(cacheKey, { data, timestamp: Date.now() });
        }
        return data;
      }

      // If external backend returns error and we called external URL, attempt internal /api
      if (primaryBase !== "/api") {
        const fallbackResponse = await fetch(`/api${endpoint}`, {
          ...options,
          headers,
        });
        if (fallbackResponse.ok) {
          const data = (await fallbackResponse.json()) as T;
          if (isGet) {
            clientCache.set(cacheKey, { data, timestamp: Date.now() });
          }
          return data;
        }
      }

      const errorBody = await response.json().catch(() => ({ message: "Request failed" }));
      throw new Error(errorBody.message ?? "Request failed");
    } catch (error: any) {
      // If primary fetch failed (e.g. connection refused / network error / mixed content), mark offline & try internal /api
      if (primaryBase !== "/api") {
        externalBackendOffline = true;
        lastOfflineCheck = Date.now();

        try {
          const fallbackResponse = await fetch(`/api${endpoint}`, {
            ...options,
            headers,
          });
          if (fallbackResponse.ok) {
            const data = (await fallbackResponse.json()) as T;
            if (isGet) {
              clientCache.set(cacheKey, { data, timestamp: Date.now() });
            }
            return data;
          }
        } catch {
          // Continue to throw original error
        }
      }

      throw error;
    } finally {
      if (isGet) {
        inFlightRequests.delete(cacheKey);
      }
    }
  })();

  if (isGet) {
    inFlightRequests.set(cacheKey, requestPromise);
  }

  return requestPromise;
}

export async function fetchSeriesDetails(id: string) {
  return fetchJson<{ series: Series }>(`/tv/${id}`);
}

export async function fetchSeasonEpisodes(seriesId: string, seasonNumber: number) {
  return fetchJson<{ episodes: Episode[] }>(`/tv/${seriesId}/seasons/${seasonNumber}/episodes`);
}

export function openSearchSpotlight() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("streamix_open_search"));
  }
}
