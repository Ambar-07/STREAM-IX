const express = require("express");
const { getTrendingSeries, searchSeries, getSeriesDetails, getSeasonEpisodes } = require("../lib/tmdb");

const router = express.Router();

router.get("/trending", async (req, res) => {
  const series = await getTrendingSeries();
  return res.json({ series });
});

router.get("/search", async (req, res) => {
  const query = req.query.query || "";
  const series = await searchSeries(String(query));
  return res.json({ series });
});

router.get("/:id", async (req, res) => {
  const series = await getSeriesDetails(req.params.id);
  return res.json({ series });
});

router.get("/:id/seasons/:seasonNumber/episodes", async (req, res) => {
  const episodes = await getSeasonEpisodes(req.params.id, req.params.seasonNumber);
  return res.json({ episodes });
});

module.exports = router;
