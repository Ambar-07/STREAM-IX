import { fetchJson, type Movie } from "./api";

const STORAGE_KEY = "streamix_watchlist";
const EVENT_NAME = "streamix_watchlist_updated";

export function getWatchlist(): Movie[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isInWatchlist(movieId: number): boolean {
  if (!movieId) return false;
  const list = getWatchlist();
  return list.some((item) => Number(item.id) === Number(movieId));
}

function emitUpdate(list: Movie[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: { watchlist: list } }));
  } catch {
    // Ignore storage errors
  }
}

export async function addToWatchlist(movie: Movie): Promise<Movie[]> {
  if (!movie || !movie.id) return getWatchlist();

  const current = getWatchlist();
  const exists = current.some((m) => Number(m.id) === Number(movie.id));
  const updated = exists ? current : [movie, ...current];

  emitUpdate(updated);

  // Sync with API in background
  fetchJson("/watchlist", {
    method: "POST",
    body: JSON.stringify({ movie }),
  }).catch(() => {});

  return updated;
}

export async function removeFromWatchlist(movieId: number): Promise<Movie[]> {
  if (!movieId) return getWatchlist();

  const current = getWatchlist();
  const updated = current.filter((m) => Number(m.id) !== Number(movieId));

  emitUpdate(updated);

  // Sync with API in background
  fetchJson(`/watchlist/${movieId}`, {
    method: "DELETE",
  }).catch(() => {});

  return updated;
}

export async function toggleWatchlist(movie: Movie): Promise<boolean> {
  if (!movie || !movie.id) return false;

  const current = getWatchlist();
  const exists = current.some((m) => Number(m.id) === Number(movie.id));

  if (exists) {
    await removeFromWatchlist(Number(movie.id));
    return false;
  } else {
    await addToWatchlist(movie);
    return true;
  }
}

export function clearWatchlist(): void {
  emitUpdate([]);
}
