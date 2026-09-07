import { fetchJson, type Movie } from "@/lib/api";

export async function getTrendingMovies() {
  const data = await fetchJson<{ movies: Movie[] }>("/movies/trending");
  return data.movies;
}

export async function getPopularMovies() {
  const data = await fetchJson<{ movies: Movie[] }>("/movies/popular");
  return data.movies;
}

export async function searchMovies(query: string) {
  const data = await fetchJson<{ movies: Movie[] }>(`/movies/search?query=${encodeURIComponent(query)}`);
  return data.movies;
}

export async function getMovieDetails(id: string | number) {
  const data = await fetchJson<{ movie: Movie }>(`/movies/${id}`);
  return data.movie;
}
