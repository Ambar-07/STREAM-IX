export type WatchedItem = {
  id: number;
  title: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type: "movie" | "tv";
  season?: number;
  episode?: number;
  episodeName?: string;
  watchedAt: number;
  vote_average?: number;
};

export const WATCH_HISTORY_KEY = "streamix_watch_history";

export function getWatchHistory(): WatchedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(WATCH_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0));
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

export function recordWatchHistory(item: Omit<WatchedItem, "watchedAt"> & { watchedAt?: number }): void {
  if (typeof window === "undefined") return;
  try {
    const current = getWatchHistory();
    const filtered = current.filter((prev) => prev.id !== item.id);
    const newItem: WatchedItem = {
      ...item,
      watchedAt: Date.now(),
    };
    const updated = [newItem, ...filtered].slice(0, 20);
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("streamix_history_updated"));
  } catch {
    // Ignore storage errors
  }
}

export function removeFromWatchHistory(id: number): void {
  if (typeof window === "undefined") return;
  try {
    const current = getWatchHistory();
    const updated = current.filter((item) => item.id !== id);
    localStorage.setItem(WATCH_HISTORY_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("streamix_history_updated"));
  } catch {
    // Ignore error
  }
}

export function clearWatchHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(WATCH_HISTORY_KEY);
    window.dispatchEvent(new Event("streamix_history_updated"));
  } catch {
    // Ignore error
  }
}

export function getLastWatchedItem(id: number): WatchedItem | undefined {
  if (typeof window === "undefined") return undefined;
  const history = getWatchHistory();
  return history.find((item) => Number(item.id) === Number(id));
}

export function getResumeUrl(item: WatchedItem): string {
  if (item.media_type === "tv") {
    const s = item.season && item.season > 0 ? item.season : 1;
    const e = item.episode && item.episode > 0 ? item.episode : 1;
    return `/series/${item.id}?season=${s}&episode=${e}&autoplay=true`;
  }
  return `/movies/${item.id}?autoplay=true`;
}

export function formatTimeAgo(timestamp?: number): string {
  if (!timestamp) return "Recently";
  const diffSeconds = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSeconds < 60) return "Just now";
  const minutes = Math.floor(diffSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
