# Streamix Frontend Client

Next.js 16 client application for the Streamix media platform.

## Features

- Neo-brutalist user interface built with Tailwind CSS v4 and Motion.
- Secure user authentication with PBKDF2 hashing, live Gmail OTP verification, and profile management.
- Dashboard with live TMDB trending titles, direct ID lookups, and query search.
- Movie and TV series detail views with season and episode listings.
- Watchlist management.
- Embedded video player with multi-mirror resilience.
- Dark and light theme toggle.

## Environment Variables

Defined in `.env.local`:

```env
NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_VIDEO_BASE_URL=https://embed.stream-service.org/1
NEXT_PUBLIC_ENABLE_EXTERNAL_STREAMING=true
NEXT_PUBLIC_SIGNALING_URL=http://localhost:4000
TMDB_API_KEY=your_tmdb_api_key_here
GMAIL_USER=your-email@gmail.com
GMAIL_APP_PASSWORD=your-16-char-app-password
```

## Available Scripts

- `npm run dev`: Runs Next.js development server at http://localhost:3000
- `npm run build`: Compiles production build
- `npm run start`: Starts production server
- `npm run lint`: Runs ESLint checks
