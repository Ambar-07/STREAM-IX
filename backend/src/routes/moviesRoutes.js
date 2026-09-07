const express = require("express");
const { findMediaById, getTrendingMovies, getPopularMovies, getTopRatedMovies, searchMovies, searchSeries, getMovieDetails } = require("../lib/tmdb");

const router = express.Router();

function deduplicateMedia(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (!item || !item.id) continue;
    const key = `${item.media_type || "movie"}-${item.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

router.get("/trending", async (req, res) => {
  const movies = await getTrendingMovies();
  return res.json({ movies });
});

router.get("/popular", async (req, res) => {
  const movies = await getPopularMovies();
  return res.json({ movies });
});

router.get("/top-rated", async (req, res) => {
  const movies = await getTopRatedMovies();
  return res.json({ movies });
});

router.get("/search", async (req, res) => {
  const query = String(req.query.query || "").trim();
  const type = String(req.query.type || "all").toLowerCase();

  const idMatch = query.match(/^(?:tmdb[:\s-]*|id[:\s-]*)?(\d+)$/i);
  let directMatches = [];
  if (idMatch) {
    directMatches = await findMediaById(idMatch[1]);
  }

  if (type === "tv") {
    const tvDirect = directMatches.filter((item) => item.media_type === "tv");
    const series = await searchSeries(query);
    return res.json({ movies: deduplicateMedia([...tvDirect, ...series]), type: "tv" });
  }

  if (type === "movie") {
    const movieDirect = directMatches.filter((item) => item.media_type === "movie");
    const movies = await searchMovies(query);
    return res.json({ movies: deduplicateMedia([...movieDirect, ...movies]), type: "movie" });
  }

  const [movies, series] = await Promise.all([searchMovies(query), searchSeries(query)]);
  const merged = deduplicateMedia([...directMatches, ...movies, ...series]);
  return res.json({ movies: merged, type: "all" });
});

router.get("/:id", async (req, res) => {
  const movie = await getMovieDetails(req.params.id);
  return res.json({ movie });
});

module.exports = router;
