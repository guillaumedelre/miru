# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (Vite)
npm run build     # Type-check + production build
npm run lint      # ESLint
npm run preview   # Preview production build
```

No test suite currently.

## Environment

Create a `.env` file at the root:

```
VITE_TMDB_API_KEY=...
```

AniList and Jikan APIs are public (no key needed).

## Architecture

**miru** is a media tracking app (anime, series, films) built with React + Vite + Zustand.

### Data flow

- `src/store/index.ts` — single Zustand store, persisted to `localStorage` under key `miru-store`. Contains `items: TrackedItem[]` and `watched: WatchedEpisode[]`.
- `src/types/index.ts` — shared types. `MediaType` is the discriminator used everywhere (`'anime' | 'series' | 'movie'`). `Source` indicates which API the item came from (`'anilist' | 'tmdb'`).

### API layer (`src/api/`)

| File | Purpose |
|------|---------|
| `anilist.ts` | AniList GraphQL — search anime, fetch airing schedules |
| `tmdb.ts` | TMDB REST — search series/movies, fetch episode data |
| `jikan.ts` | Jikan (MAL) REST — fetch episode names via `malId` |

Anime always comes from AniList, series and movies always come from TMDB.

### Pages

- `/` (`WeekView`) — weekly calendar of upcoming/airing episodes, driven by `useWeeklySchedule` hook.
- `/library` (`Library`) — filterable grid of all tracked items.
- `/stats` (`Stats`) — aggregate stats (episodes watched, time spent, breakdown by type/status).

### Key components

- `AddMediaDialog` — multi-step dialog: pick type tab → search → select result → set progress → confirm. Orchestrates both APIs.
- `ProgressPicker` — episode checkbox grid used during add and edit flows.
- `EditProgressDialog` — inline progress update for an existing item.
- `MediaCard` — flip-card showing cover on front, actions on back.

### Weekly schedule logic

`useWeeklySchedule` (hook) fetches the airing schedule for the current week:
- For `anime` (AniList source): bulk `getAiringSchedule` call with all watching item IDs, then enriches episode names via Jikan if `malId` is available.
- For `series` (TMDB source): one `getNextEpisode` call per item, filtered to the current week.
