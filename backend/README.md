# Streamix Backend API

Express 5 REST API providing authentication, TMDB proxying, and user watchlist persistence for the Streamix platform.

---

## Features

- **TMDB Proxy**: Fetches and normalizes movie and TV series metadata, trending feeds, popular titles, and search queries with offline fallback resilience.
- **TV Series & Episode Queries**: Direct endpoints for TV series details and season episode listings.
- **Authentication**: User registration and login utilizing `bcryptjs` password hashing and signed JSON Web Tokens (`jsonwebtoken`).
- **Watchlist Persistence**: MongoDB persistence via Mongoose, with automatic, graceful fallback to an in-memory store when MongoDB is not running.
- **CORS Enabled**: Configured for cross-origin communication with the Next.js frontend client.

---

## Environment Variables

Configured in `backend/.env`:

```env
PORT=5000
JWT_SECRET=movie-mind-demo-secret
TMDB_API_KEY=your_tmdb_api_key_here
MONGO_URI=mongodb://localhost:27017/movie-platform
```

| Variable | Type | Default | Description |
|---|---|---|---|
| `PORT` | Number | `5000` | Port for the Express server. |
| `JWT_SECRET` | String | `movie-mind-demo-secret` | Secret key used for signing and verifying JWTs. |
| `TMDB_API_KEY` | String | -- | TMDB API v3 key (optional; static fallback is served if omitted). |
| `MONGO_URI` | String | `mongodb://localhost:27017/movie-platform` | MongoDB connection URI (optional; in-memory store is used if unreachable). |

---

## API Endpoints

All endpoints are mounted under the `/api` prefix:

### Health Check
- `GET /api/health` - Server health status

### Authentication (`/api/auth`)
- `POST /api/auth/signup` - Register a new user (`email`, `password`)
- `POST /api/auth/login` - Authenticate user (`email`, `password`)

### Movies (`/api/movies`)
- `GET /api/movies/trending` - Weekly trending movies
- `GET /api/movies/popular` - Popular movies
- `GET /api/movies/search?query=...&type=...` - Search movies / TV
- `GET /api/movies/:id` - Movie details, trailers, and credits

### TV Series (`/api/tv`)
- `GET /api/tv/trending` - Weekly trending TV shows
- `GET /api/tv/search?query=...` - Search TV shows
- `GET /api/tv/:id` - TV series details and seasons
- `GET /api/tv/:id/seasons/:seasonNumber/episodes` - Episodes for a given season

### Watchlist (`/api/watchlist`) *(Requires `Authorization: Bearer <token>`)*
- `GET /api/watchlist` - Retrieve authenticated user's watchlist
- `POST /api/watchlist` - Add item to watchlist (`{ movie: { ... } }`)
- `DELETE /api/watchlist/:movieId` - Remove item from watchlist

---

## Available Scripts

- `npm run dev`: Starts the API server with Node (`node src/server.js`)
- `npm start`: Starts the API server in production mode
