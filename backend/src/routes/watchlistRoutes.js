const express = require("express");
const { getWatchlistForUser, addToWatchlist, removeFromWatchlist } = require("../data/store");
const { protect } = require("../middleware/auth");

const router = express.Router();

router.get("/", protect, (req, res) => {
  const movies = getWatchlistForUser(req.user.id);
  return res.json({ movies });
});

router.post("/", protect, (req, res) => {
  const movie = req.body?.movie;
  if (!movie || !movie.id || (!movie.title && !movie.name)) {
    return res.status(400).json({ message: "Movie payload is required." });
  }

  const movies = addToWatchlist(req.user.id, movie);
  return res.status(201).json({ movies });
});

router.delete("/:movieId", protect, (req, res) => {
  const movies = removeFromWatchlist(req.user.id, Number(req.params.movieId));
  return res.json({ movies });
});

module.exports = router;
