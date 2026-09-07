const genreNameMap = {
  12: "Adventure",
  14: "Fantasy",
  16: "Animation",
  18: "Drama",
  28: "Action",
  35: "Comedy",
  36: "History",
  53: "Thriller",
  80: "Crime",
  878: "Science Fiction",
  10751: "Family",
  10752: "War",
  10749: "Romance",
  27: "Horror",
  9648: "Mystery",
  10402: "Music",
  99: "Documentary",
  37: "Western",
  10770: "TV Movie",
  10759: "Action & Adventure",
  10762: "Kids",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
};

const fallbackMovies = [
  {
    id: 550,
    title: "Fight Club",
    overview: "An insomniac office worker forms an underground fight club.",
    poster_path: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
    backdrop_path: "/mMZRKb3NVo5ZeSPEIaNW9buLWQ0.jpg",
    vote_average: 8.4,
    release_date: "1999-10-15",
    genre_ids: [18, 53],
    genres: ["Drama", "Thriller"],
    cast: [
      { id: 287, name: "Brad Pitt", character: "Tyler Durden", profile_path: "/cckcYc2v0yh1tc9QjRelptsqRJ4.jpg" },
      { id: 819, name: "Edward Norton", character: "The Narrator", profile_path: "/5XBzD5WuTyVQZeS4VI25LnE2Y8f.jpg" },
      { id: 1283, name: "Helena Bonham Carter", character: "Marla Singer", profile_path: "/DDeItnRSmAhvnnPkhzEa55qFhB.jpg" },
      { id: 7470, name: "Meat Loaf", character: "Robert Paulson", profile_path: "/7wf29Y8dZ557nZ592xS721YVwzF.jpg" },
    ],
  },
  {
    id: 299536,
    title: "Avengers: Infinity War",
    overview: "The Avengers and their allies must sacrifice all to defeat Thanos.",
    poster_path: "/7WsyChQLEftFiDOVTGkv3hFpyyt.jpg",
    backdrop_path: "/bOGkgRGdhrBYJSLpXaxh9eE4mxj.jpg",
    vote_average: 8.3,
    release_date: "2018-04-27",
    genre_ids: [12, 28, 878],
    genres: ["Adventure", "Action", "Science Fiction"],
    cast: [
      { id: 3223, name: "Robert Downey Jr.", character: "Tony Stark / Iron Man", profile_path: "/im9SAqJPZKEbVZGmjXuLI4O7RvM.jpg" },
      { id: 74568, name: "Chris Hemsworth", character: "Thor", profile_path: "/xkHHi0A8V49s3bO0c4i6v0Gg00r.jpg" },
      { id: 103, name: "Mark Ruffalo", character: "Bruce Banner / Hulk", profile_path: "/z3dvKqM8870VqhkFhV0T3e3g24p.jpg" },
      { id: 16828, name: "Chris Evans", character: "Steve Rogers / Captain America", profile_path: "/3bOGNsHlrswhyW79uvIHH1V43JI.jpg" },
    ],
  },
  {
    id: 680,
    title: "Pulp Fiction",
    overview: "The lives of two mob hitmen, a boxer, and a mysterious gangster intersect.",
    poster_path: "/dRZpYh0nW9aVtIYf4a1jFJZlHc6.jpg",
    backdrop_path: "/suaEOtk1N1sgg2MTM7oZd2cfVp3.jpg",
    vote_average: 8.4,
    release_date: "1994-10-14",
    genre_ids: [80, 53],
    genres: ["Crime", "Thriller"],
    cast: [
      { id: 8891, name: "John Travolta", character: "Vincent Vega", profile_path: "/ap8hW4L8dDqKev40s3J7Vw7u8N3.jpg" },
      { id: 2231, name: "Samuel L. Jackson", character: "Jules Winnfield", profile_path: "/mXN4iqEiikEu0tiMu4oQOz7JJag.jpg" },
      { id: 139, name: "Uma Thurman", character: "Mia Wallace", profile_path: "/b0z40kU7yvI5O5aXg5n1V2D9k7o.jpg" },
      { id: 62, name: "Bruce Willis", character: "Butch Coolidge", profile_path: "/caX3Kt9KniovlJ7t5V1SczS0y1C.jpg" },
    ],
  },
  {
    id: 129,
    title: "Spirited Away",
    overview: "A young girl navigates a fantastical world in this beautiful animated tale.",
    poster_path: "/8QmQWk3Fygq8Q9iYfQnP8P5LkK4.jpg",
    backdrop_path: "/mMZRKb3NVo5ZeSPEIaNW9buLWQ0.jpg",
    vote_average: 8.5,
    release_date: "2001-07-20",
    genre_ids: [16, 10751, 14],
    genres: ["Animation", "Family", "Fantasy"],
    cast: [
      { id: 19588, name: "Rumi Hiiragi", character: "Chihiro Ogino (voice)", profile_path: "/9jFkKxP8oB8R8qD2y4o3M2Yw1.jpg" },
      { id: 19589, name: "Miyu Irino", character: "Haku (voice)", profile_path: "/b8mKz0T2Xy4o5P6Q7R8s9t0U1.jpg" },
    ],
  },
  {
    id: 155,
    title: "The Dark Knight",
    overview: "Batman faces the Joker and Gotham falls into chaos.",
    poster_path: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
    backdrop_path: "/nMKdUUQ4DmhQdcN4FPCfP8L7kye.jpg",
    vote_average: 9.0,
    release_date: "2008-07-18",
    genre_ids: [28, 80, 18],
    genres: ["Action", "Crime", "Drama"],
    cast: [
      { id: 3894, name: "Christian Bale", character: "Bruce Wayne / Batman", profile_path: "/b7fTC9WFkgqGOv771QeuEBuAvUm.jpg" },
      { id: 1810, name: "Heath Ledger", character: "Joker", profile_path: "/5Y9HnYYa9jF4NuY9l0G0O0uP6vA.jpg" },
      { id: 3895, name: "Michael Caine", character: "Alfred Pennyworth", profile_path: "/klNx0Jc2Gk1k5x25U3L90j2cZ1o.jpg" },
      { id: 192, name: "Morgan Freeman", character: "Lucius Fox", profile_path: "/jPsLqiYgsOFU4s6LtneP70D2nwh.jpg" },
    ],
  },
  {
    id: 424,
    title: "Schindler's List",
    overview: "A German businessman saves the lives of more than a thousand Jewish refugees.",
    poster_path: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
    backdrop_path: "/i5UlyUJeQ6VfnkA5EJzkd0t7F8.jpg",
    vote_average: 8.6,
    release_date: "1993-12-15",
    genre_ids: [18, 36, 10752],
    genres: ["Drama", "History", "War"],
    cast: [
      { id: 3896, name: "Liam Neeson", character: "Oskar Schindler", profile_path: "/wGQ1l1N4w3g5V6X7Y8Z9a0b1c2.jpg" },
      { id: 2282, name: "Ben Kingsley", character: "Itzhak Stern", profile_path: "/vM9q1P2r3s4t5u6v7w8x9y0z1.jpg" },
      { id: 5469, name: "Ralph Fiennes", character: "Amon Göth", profile_path: "/tL8u9v0w1x2y3z4a5b6c7d8e9.jpg" },
    ],
  },
];

const fallbackSeries = [
  {
    id: 1399,
    name: "Game of Thrones",
    overview: "Power and betrayal collide in a war for the Iron Throne.",
    poster_path: "/u3bZgnGQ9T01sWNhyveQz0wH1h4.jpg",
    backdrop_path: "/suopoADq0k8YZr4dZQXUOMsRbzM.jpg",
    vote_average: 8.4,
    first_air_date: "2011-04-17",
    genre_ids: [10765, 18, 10759],
    genres: ["Drama", "Action & Adventure", "Sci-Fi & Fantasy"],
    cast: [
      { id: 22970, name: "Peter Dinklage", character: "Tyrion Lannister", profile_path: "/lRsRCeXDcuA14mFnxY809f2hP.jpg" },
      { id: 17286, name: "Lena Headey", character: "Cersei Lannister", profile_path: "/5wSKmU17tYk9bWn055rT2qU1z1y.jpg" },
      { id: 1223786, name: "Emilia Clarke", character: "Daenerys Targaryen", profile_path: "/r86VwL33bU2c2dY7O1Y2K4Z0X7Q.jpg" },
      { id: 239019, name: "Kit Harington", character: "Jon Snow", profile_path: "/4MqUjb1SYgnHmImqnR9neRIjHgU.jpg" },
    ],
  },
  {
    id: 2316,
    name: "The Office",
    overview: "A mockumentary about office life and awkward humor.",
    poster_path: "/qWnJzyZhAN4nq2lV8jJb0yJ7QY8.jpg",
    backdrop_path: "/gFZriCkp9h6FqAnrlA4N4Q3xC2R.jpg",
    vote_average: 8.5,
    first_air_date: "2005-03-24",
    genre_ids: [35, 18],
    genres: ["Comedy", "Drama"],
    cast: [
      { id: 4495, name: "Steve Carell", character: "Michael Scott", profile_path: "/fDnTtL3W0XmQzY3i2UvXwY1z.jpg" },
      { id: 17697, name: "John Krasinski", character: "Jim Halpert", profile_path: "/b0z40kU7yvI5O5aXg5n1V2D9k7o.jpg" },
      { id: 51857, name: "Rainn Wilson", character: "Dwight Schrute", profile_path: "/caX3Kt9KniovlJ7t5V1SczS0y1C.jpg" },
      { id: 115160, name: "Jenna Fischer", character: "Pam Beesly", profile_path: "/wGQ1l1N4w3g5V6X7Y8Z9a0b1c2.jpg" },
    ],
  },
  {
    id: 71912,
    name: "The Witcher",
    overview: "A monster hunter navigates destiny in a dark fantasy world.",
    poster_path: "/7VSRK8cqd6h2XeSxT2H1E7z9gU.jpg",
    backdrop_path: "/cXsQuwQfVW3N06NnU4xJ3KxY8pD.jpg",
    vote_average: 8.1,
    first_air_date: "2019-12-20",
    genre_ids: [10765, 18, 10759],
    genres: ["Drama", "Action & Adventure", "Sci-Fi & Fantasy"],
    cast: [
      { id: 73968, name: "Henry Cavill", character: "Geralt of Rivia", profile_path: "/hErUo04Y7i998b3c4v567d8e.jpg" },
      { id: 1667104, name: "Anya Chalotra", character: "Yennefer of Vengerberg", profile_path: "/w5gV1r7V7lFqM913qT9vQ2pP1wA.jpg" },
      { id: 1988849, name: "Freya Allan", character: "Princess Cirilla", profile_path: "/s8qP08z6tUvK1x2y3Z4a5b6c7d.jpg" },
    ],
  },
];

function toGenreList(genreList) {
  return (genreList ?? []).map((genre) => (
    typeof genre === "string"
      ? { id: genre.toLowerCase(), name: genre }
      : { id: genre.id, name: genre.name }
  ));
}

function isSeriesItem(item) {
  if (!item) return false;
  if (item.media_type === "tv") return true;
  if (item.media_type === "movie") return false;
  return Boolean(
    (item.number_of_seasons && Number(item.number_of_seasons) > 0) ||
    (item.seasons && item.seasons.length > 0) ||
    (item.first_air_date && !item.release_date) ||
    (item.name && !item.title)
  );
}

function extractVideos(raw) {
  const rawVideos = Array.isArray(raw?.videos?.results)
    ? raw.videos.results
    : Array.isArray(raw?.videos)
      ? raw.videos
      : [];

  const youtubeVideos = rawVideos
    .filter((v) => v && (v.site === "YouTube" || !v.site) && v.key)
    .map((v) => ({
      id: String(v.id || v.key),
      key: String(v.key),
      name: String(v.name || "Official Trailer"),
      site: "YouTube",
      type: String(v.type || "Trailer"),
      official: Boolean(v.official),
      published_at: v.published_at || "",
    }));

  const primaryTrailer =
    youtubeVideos.find((v) => v.type === "Trailer" && v.official) ||
    youtubeVideos.find((v) => v.type === "Trailer") ||
    youtubeVideos.find((v) => v.type === "Teaser") ||
    youtubeVideos[0] ||
    null;

  const fallbackKey = raw?.trailer_key || null;
  const finalKey = primaryTrailer ? primaryTrailer.key : fallbackKey;
  const finalName = primaryTrailer ? primaryTrailer.name : raw?.trailer_name || "Official Trailer";

  return {
    trailer_key: finalKey,
    trailer_name: finalName,
    videos: youtubeVideos.length > 0 ? youtubeVideos : finalKey ? [{
      id: finalKey,
      key: finalKey,
      name: finalName,
      site: "YouTube",
      type: "Trailer",
      official: true,
    }] : [],
  };
}

function extractCast(raw) {
  const rawCast = Array.isArray(raw?.credits?.cast)
    ? raw.credits.cast
    : Array.isArray(raw?.cast)
      ? raw.cast
      : [];

  return rawCast.slice(0, 16).map((c) => ({
    id: c.id,
    name: c.name || c.original_name || "Unknown Actor",
    character: c.character || "",
    profile_path: c.profile_path
      ? c.profile_path.startsWith("http")
        ? c.profile_path
        : `https://image.tmdb.org/t/p/w300${c.profile_path}`
      : null,
    order: c.order ?? 0,
  }));
}

function extractRecommendations(raw, isSeries) {
  const rawList = Array.isArray(raw?.recommendations?.results)
    ? raw.recommendations.results
    : Array.isArray(raw?.recommendations)
      ? raw.recommendations
      : [];

  return rawList.slice(0, 10).map((item) => {
    const stripped = { ...item, recommendations: undefined, credits: undefined };
    const isTv = isSeries || item.media_type === "tv" || Boolean(item.first_air_date && !item.release_date) || Boolean(item.name && !item.title);
    if (isTv) {
      return normalizeSeries({ ...stripped, media_type: "tv" });
    }
    return normalizeMovie({ ...stripped, media_type: "movie" });
  });
}

function normalizeMovie(movie) {
  if (isSeriesItem(movie)) {
    return normalizeSeries(movie);
  }

  const mappedGenres = toGenreList(movie.genres);
  const inferredGenres = (movie.genre_ids ?? []).slice(0, 3).map((id) => ({
    id,
    name: genreNameMap[id] ?? "Drama",
  }));
  const videoData = extractVideos(movie);
  const castData = extractCast(movie);
  const recsData = Array.isArray(movie.recommendations) && movie.recommendations.length > 0 && (movie.recommendations[0]?.title || movie.recommendations[0]?.name)
    ? movie.recommendations
    : extractRecommendations(movie, false);

  return {
    id: movie.id,
    title: movie.title,
    name: movie.name ?? movie.title,
    overview: movie.overview || "No overview available.",
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    vote_average: movie.vote_average ?? 0,
    release_date: movie.release_date ?? movie.first_air_date,
    first_air_date: movie.first_air_date,
    media_type: "movie",
    genre_ids: movie.genre_ids ?? [],
    genres: mappedGenres.length > 0 ? mappedGenres : inferredGenres,
    seasons: movie.seasons ?? [],
    number_of_seasons: movie.number_of_seasons,
    number_of_episodes: movie.number_of_episodes,
    trailer_key: videoData.trailer_key,
    trailer_name: videoData.trailer_name,
    videos: videoData.videos,
    cast: castData,
    recommendations: recsData,
  };
}

function normalizeSeries(series) {
  const mappedGenres = toGenreList(series.genres);
  const inferredGenres = (series.genre_ids ?? []).slice(0, 3).map((id) => ({
    id,
    name: genreNameMap[id] ?? "Drama",
  }));

  let rawSeasons = series.seasons;
  if (!rawSeasons || !Array.isArray(rawSeasons) || rawSeasons.length === 0) {
    const count = Math.max(1, Number(series.number_of_seasons) || 1);
    rawSeasons = Array.from({ length: count }, (_, idx) => ({
      id: idx + 1,
      season_number: idx + 1,
      name: `Season ${idx + 1}`,
      overview: `Season ${idx + 1}`,
      poster_path: series.poster_path,
      air_date: series.first_air_date,
      episode_count: 12,
    }));
  }

  const positiveSeasons = rawSeasons.filter((s) => s && (s.season_number > 0 || rawSeasons.length === 1));
  const finalSeasons = positiveSeasons.length > 0 ? positiveSeasons : rawSeasons;
  const videoData = extractVideos(series);
  const castData = extractCast(series);
  const recsData = Array.isArray(series.recommendations) && series.recommendations.length > 0 && (series.recommendations[0]?.title || series.recommendations[0]?.name)
    ? series.recommendations
    : extractRecommendations(series, true);

  return {
    id: series.id,
    title: series.name,
    name: series.name,
    overview: series.overview || "No overview available.",
    poster_path: series.poster_path,
    backdrop_path: series.backdrop_path,
    vote_average: series.vote_average ?? 0,
    media_type: "tv",
    first_air_date: series.first_air_date ?? series.release_date,
    release_date: series.first_air_date ?? series.release_date,
    genre_ids: series.genre_ids ?? [],
    genres: mappedGenres.length > 0 ? mappedGenres : inferredGenres,
    seasons: finalSeasons.map((season) => ({
      id: season.id,
      season_number: season.season_number,
      name: season.name || `Season ${season.season_number}`,
      overview: season.overview || "",
      poster_path: season.poster_path,
      air_date: season.air_date,
      episode_count: season.episode_count || 12,
    })),
    number_of_seasons: series.number_of_seasons || finalSeasons.length,
    number_of_episodes: series.number_of_episodes,
    trailer_key: videoData.trailer_key,
    trailer_name: videoData.trailer_name,
    videos: videoData.videos,
    cast: castData,
    recommendations: recsData,
  };
}

const tmdbCache = new Map();
const MAX_CACHE_ENTRIES = 300;

function getCachedData(key) {
  const entry = tmdbCache.get(key);
  if (!entry) return null;
  const isStale = Date.now() - entry.timestamp > entry.ttl;
  return { data: entry.data, isStale };
}

function setCachedData(key, data, ttlMs) {
  if (tmdbCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = tmdbCache.keys().next().value;
    if (oldestKey) tmdbCache.delete(oldestKey);
  }
  tmdbCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

const TMDB_API_KEYS = [
  process.env.TMDB_API_KEY,
].filter(Boolean);

let currentKeyIndex = 0;

async function callTmdb(endpoint, customTtl) {
  const cacheKey = endpoint;
  const cached = getCachedData(cacheKey);

  if (cached && !cached.isStale) {
    return cached.data;
  }

  const defaultTtl = endpoint.includes("/trending") || endpoint.includes("/popular") || endpoint.includes("/top_rated")
    ? 15 * 60 * 1000
    : endpoint.includes("/search")
      ? 5 * 60 * 1000
      : 60 * 60 * 1000;

  const ttl = customTtl ?? defaultTtl;
  const baseUrl = "https://api.themoviedb.org/3";
  const glue = endpoint.includes("?") ? "&" : "?";

  let lastError = null;
  const maxAttempts = 3;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const apiKey = TMDB_API_KEYS[(currentKeyIndex + attempt) % TMDB_API_KEYS.length];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(`${baseUrl}${endpoint}${glue}api_key=${apiKey}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        setCachedData(cacheKey, json, ttl);
        return json;
      }

      if (response.status === 429 || response.status >= 500) {
        currentKeyIndex = (currentKeyIndex + 1) % TMDB_API_KEYS.length;
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        continue;
      }

      if (response.status === 404) {
        throw new Error("TMDB 404: Not found");
      }

      throw new Error(`TMDB request failed: ${response.status}`);
    } catch (err) {
      lastError = err;
      if (err.name === "AbortError") {
        console.warn(`TMDB request timeout for ${endpoint} (attempt ${attempt + 1}/${maxAttempts})`);
      }
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      }
    }
  }

  if (cached) {
    console.warn(`TMDB request failed, serving stale cache for: ${endpoint}`);
    return cached.data;
  }

  throw lastError ?? new Error(`TMDB request failed for: ${endpoint}`);
}

async function getTrendingMovies() {
  try {
    const [p1, p2, p3] = await Promise.allSettled([
      callTmdb("/trending/movie/week?language=en-US&page=1"),
      callTmdb("/trending/movie/week?language=en-US&page=2"),
      callTmdb("/trending/movie/week?language=en-US&page=3"),
    ]);

    const results = [];
    const seen = new Set();
    for (const res of [p1, p2, p3]) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
        for (const item of res.value.results) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            results.push(normalizeMovie({ ...item, media_type: "movie" }));
          }
        }
      }
    }

    if (results.length > 0) return results;
    return fallbackMovies.map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  } catch (error) {
    console.warn("TMDB trending fallback used:", error.message);
    return fallbackMovies.map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  }
}

async function getTrendingSeries() {
  try {
    const [p1, p2, p3] = await Promise.allSettled([
      callTmdb("/trending/tv/week?language=en-US&page=1"),
      callTmdb("/trending/tv/week?language=en-US&page=2"),
      callTmdb("/trending/tv/week?language=en-US&page=3"),
    ]);

    const results = [];
    const seen = new Set();
    for (const res of [p1, p2, p3]) {
      if (res.status === "fulfilled" && Array.isArray(res.value?.results)) {
        for (const item of res.value.results) {
          if (item && item.id && !seen.has(item.id)) {
            seen.add(item.id);
            results.push(normalizeSeries({ ...item, media_type: "tv" }));
          }
        }
      }
    }

    if (results.length > 0) return results;
    return fallbackSeries.map((show) => normalizeSeries({ ...show, media_type: "tv" }));
  } catch (error) {
    console.warn("TMDB series trending fallback used:", error.message);
    return fallbackSeries.map((show) => normalizeSeries({ ...show, media_type: "tv" }));
  }
}

async function getPopularMovies() {
  try {
    const data = await callTmdb("/movie/popular?language=en-US&page=1");
    return (data.results ?? []).map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  } catch (error) {
    console.warn("TMDB popular fallback used:", error.message);
    return fallbackMovies.map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  }
}

async function getTopRatedMovies() {
  try {
    const data = await callTmdb("/movie/top_rated?language=en-US&page=1");
    return (data.results ?? []).map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  } catch (error) {
    console.warn("TMDB top rated fallback used:", error.message);
    return fallbackMovies
      .slice()
      .sort((a, b) => (b.vote_average ?? 0) - (a.vote_average ?? 0))
      .map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  }
}

async function findMediaById(id) {
  const cleanId = String(id).trim().replace(/^(?:tmdb[:\s-]*|id[:\s-]*)?/i, "");
  if (!/^\d+$/.test(cleanId)) return [];

  const numericId = parseInt(cleanId, 10);
  const results = [];

  const [movieRes, tvRes] = await Promise.allSettled([
    callTmdb(`/movie/${numericId}?language=en-US&append_to_response=videos,credits,recommendations`),
    callTmdb(`/tv/${numericId}?language=en-US&append_to_response=videos,images,credits,recommendations`),
  ]);

  if (movieRes.status === "fulfilled" && movieRes.value && movieRes.value.id) {
    results.push(normalizeMovie({ ...movieRes.value, media_type: "movie" }));
  }

  if (tvRes.status === "fulfilled" && tvRes.value && tvRes.value.id) {
    results.push(normalizeSeries({ ...tvRes.value, media_type: "tv" }));
  }

  if (results.length === 0) {
    const movieMatch = fallbackMovies.find((m) => String(m.id) === String(numericId));
    if (movieMatch) {
      results.push(normalizeMovie({ ...movieMatch, media_type: "movie" }));
    }
    const seriesMatch = fallbackSeries.find((s) => String(s.id) === String(numericId));
    if (seriesMatch) {
      results.push(normalizeSeries({ ...seriesMatch, media_type: "tv" }));
    }
  }

  return results;
}

async function searchMovies(query) {
  if (!query || !query.trim()) {
    return getTrendingMovies();
  }

  const trimmed = query.trim();
  const normalizedQuery = trimmed.toLowerCase();
  const idMatch = trimmed.match(/^(?:tmdb[:\s-]*|id[:\s-]*)?(\d+)$/i);
  let directMatches = [];

  if (idMatch) {
    const found = await findMediaById(idMatch[1]);
    directMatches = found.filter((item) => item.media_type === "movie");
  }

  let textResults = [];
  try {
    const data = await callTmdb(`/search/movie?query=${encodeURIComponent(trimmed)}&include_adult=false&language=en-US`);
    textResults = (data.results ?? []).map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  } catch (error) {
    console.warn("TMDB search fallback used:", error.message);
    const matchedMovies = fallbackMovies.filter((movie) => {
      const haystacks = [String(movie.id), movie.title, movie.overview, ...(movie.genres ?? [])].join(" ").toLowerCase();
      return haystacks.includes(normalizedQuery);
    });

    textResults = (matchedMovies.length > 0 ? matchedMovies : fallbackMovies).map((movie) => normalizeMovie({ ...movie, media_type: "movie" }));
  }

  const seen = new Set();
  const combined = [];
  for (const item of [...directMatches, ...textResults]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  }

  return combined;
}

async function searchSeries(query) {
  if (!query || !query.trim()) {
    return getTrendingSeries();
  }

  const trimmed = query.trim();
  const normalizedQuery = trimmed.toLowerCase();
  const idMatch = trimmed.match(/^(?:tmdb[:\s-]*|id[:\s-]*)?(\d+)$/i);
  let directMatches = [];

  if (idMatch) {
    const found = await findMediaById(idMatch[1]);
    directMatches = found.filter((item) => item.media_type === "tv");
  }

  let textResults = [];
  try {
    const data = await callTmdb(`/search/tv?query=${encodeURIComponent(trimmed)}&include_adult=false&language=en-US`);
    textResults = (data.results ?? []).map((show) => normalizeSeries({ ...show, media_type: "tv" }));
  } catch (error) {
    console.warn("TMDB series search fallback used:", error.message);
    const matchedSeries = fallbackSeries.filter((show) => {
      const haystacks = [String(show.id), show.name, show.overview, ...(show.genres ?? [])].join(" ").toLowerCase();
      return haystacks.includes(normalizedQuery);
    });

    textResults = (matchedSeries.length > 0 ? matchedSeries : fallbackSeries).map((show) => normalizeSeries({ ...show, media_type: "tv" }));
  }

  const seen = new Set();
  const combined = [];
  for (const item of [...directMatches, ...textResults]) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      combined.push(item);
    }
  }

  return combined;
}

async function getMovieDetails(id) {
  try {
    const data = await callTmdb(`/movie/${id}?language=en-US&append_to_response=videos,credits,recommendations`);
    return normalizeMovie({ ...data, media_type: "movie" });
  } catch (error) {
    try {
      const tvData = await callTmdb(`/tv/${id}?language=en-US&append_to_response=videos,images,credits,recommendations`);
      return normalizeSeries({ ...tvData, media_type: "tv" });
    } catch {
      console.warn("TMDB detail fallback used:", error.message);
      const seriesMatch = fallbackSeries.find((s) => String(s.id) === String(id));
      if (seriesMatch) return normalizeSeries({ ...seriesMatch, media_type: "tv" });
      const movieMatch = fallbackMovies.find((movie) => String(movie.id) === String(id));
      return normalizeMovie({ ...(movieMatch ?? fallbackMovies[0]), media_type: "movie" });
    }
  }
}

async function getSeriesDetails(id) {
  try {
    const data = await callTmdb(`/tv/${id}?language=en-US&append_to_response=videos,images,credits,recommendations`);
    return normalizeSeries({ ...data, media_type: "tv" });
  } catch (error) {
    try {
      const movieData = await callTmdb(`/movie/${id}?language=en-US&append_to_response=videos,credits,recommendations`);
      return normalizeMovie({ ...movieData, media_type: "movie" });
    } catch {
      console.warn("TMDB series detail fallback used:", error.message);
      const seriesMatch = fallbackSeries.find((show) => String(show.id) === String(id));
      if (seriesMatch) return normalizeSeries({ ...seriesMatch, media_type: "tv" });
      const movieMatch = fallbackMovies.find((movie) => String(movie.id) === String(id));
      return normalizeMovie({ ...(movieMatch ?? fallbackMovies[0]), media_type: "movie" });
    }
  }
}

async function getSeasonEpisodes(seriesId, seasonNumber) {
  try {
    const data = await callTmdb(`/tv/${seriesId}/season/${seasonNumber}?language=en-US`);
    const episodes = (data.episodes ?? []).map((episode) => ({
      id: episode.id,
      episode_number: episode.episode_number,
      name: episode.name || `Episode ${episode.episode_number}`,
      overview: episode.overview || "",
      still_path: episode.still_path,
      air_date: episode.air_date,
    }));

    if (episodes.length > 0) {
      return episodes;
    }
  } catch (error) {
    console.warn("TMDB season episode fallback used:", error.message);
  }

  return Array.from({ length: 12 }, (_, i) => ({
    id: i + 1,
    episode_number: i + 1,
    name: `Episode ${i + 1}`,
    overview: `Season ${seasonNumber}, Episode ${i + 1}`,
    still_path: null,
    air_date: "",
  }));
}

module.exports = {
  findMediaById,
  getTrendingMovies,
  getTrendingSeries,
  getPopularMovies,
  getTopRatedMovies,
  searchMovies,
  searchSeries,
  getMovieDetails,
  getSeriesDetails,
  getSeasonEpisodes,
};
