const bcrypt = require("bcryptjs");

const users = [];

const watchlist = [];

function sanitizeMovie(movie) {
  return {
    id: movie.id,
    title: movie.title,
    overview: movie.overview,
    poster_path: movie.poster_path,
    backdrop_path: movie.backdrop_path,
    vote_average: movie.vote_average,
    release_date: movie.release_date,
    genre_ids: movie.genre_ids ?? [],
  };
}

function getUserByEmail(identifier) {
  if (!identifier) return undefined;
  const normalized = String(identifier).trim().toLowerCase();
  return users.find(
    (user) =>
      (user.email && user.email.toLowerCase() === normalized) ||
      (user.username && user.username.toLowerCase() === normalized)
  );
}

function getUserById(id) {
  return users.find((user) => user.id === id);
}

function createUser(identifier, password) {
  const isEmail = identifier.includes("@");
  const user = {
    id: `user-${Date.now()}`,
    username: isEmail ? identifier.split("@")[0] : identifier,
    email: isEmail ? identifier : `${identifier.toLowerCase()}@streamix.app`,
    password: bcrypt.hashSync(password, 10),
    watchlist: [],
  };

  users.push(user);
  return user;
}

function getWatchlistForUser(userId) {
  return watchlist.filter((entry) => entry.userId === userId).map((entry) => entry.movie);
}

function addToWatchlist(userId, movie) {
  const existing = watchlist.find((entry) => entry.userId === userId && entry.movie.id === movie.id);
  if (!existing) {
    watchlist.push({ userId, movie: sanitizeMovie(movie) });
  }
  return getWatchlistForUser(userId);
}

function removeFromWatchlist(userId, movieId) {
  const index = watchlist.findIndex((entry) => entry.userId === userId && entry.movie.id === movieId);
  if (index >= 0) {
    watchlist.splice(index, 1);
  }

  return getWatchlistForUser(userId);
}

module.exports = {
  users,
  watchlist,
  getUserByEmail,
  getUserById,
  createUser,
  addToWatchlist,
  getWatchlistForUser,
  removeFromWatchlist,
  sanitizeMovie,
};
