# Architecture

## Stack

- [React 19][react] + [TypeScript][ts] + [Vite][vite]
- [Tailwind CSS v4][tailwind] + [Base UI][baseui] + [shadcn/ui][shadcn]
- [Zustand][zustand] (state management)
- [Firebase Auth][firebase] + [Firestore][firestore]

### External APIs

| API | Auth | Usage |
|-----|------|-------|
| [AniList GraphQL][anilist] | none | Anime search, airing schedule, details, genres |
| [TMDB v3][tmdb] | API key | Series/movie search, details, watch providers, genres |
| [Jikan v4][jikan] | none | Episode names via MAL ID |

## Overview

miru is a React SPA[^spa] with no backend of its own. Data is persisted in Firestore and media is resolved via the APIs above.

## Folder structure

```
src/
├── api/            # HTTP clients for external APIs
│   ├── anilist.ts  # GraphQL — anime, airing schedule
│   ├── tmdb.ts     # REST — series, movies, providers
│   └── jikan.ts    # REST — episode names (via MAL)
├── components/     # reusable React components
│   └── ui/         # UI primitives (shadcn/ui + Base UI)
├── contexts/       # AuthContext (Firebase Auth)
├── hooks/          # useWeeklySchedule
├── lib/            # firebase.ts, firestore.ts, utils.ts
├── pages/          # ToWatch, WeekView, Library, Stats, Login, Import
├── store/          # Zustand store + StoreProvider
└── types/          # TrackedItem, WatchedEpisode, MediaType

extension/
├── src/
│   └── content-scripts/  # scripts injected into third-party pages
│       ├── anilist.ts
│       ├── mal.ts
│       └── crunchyroll.ts
├── manifest.json          # Manifest V3 (Chrome + Firefox)
├── build.mjs              # build script (3 separate IIFEs)
└── tsconfig.json
```

## Data flow

### Authentication

```
Click "Continue with Google"
  → signInWithPopup(auth, googleProvider)
  → onAuthStateChanged → AuthContext.user
  → StoreProvider(userId)
    → Firestore load
    → Zustand store hydrated
```

If the popup is blocked by the browser (`auth/popup-blocked`), a message guides the user to allow popups on the site.

### Adding a media item

```
AddMediaDialog
  → AniList search (anime) or TMDB search (series/movie)
  → selection → handleConfirm
  → store.addItem(TrackedItem)
  → debounce 1.5s → saveUserData(Firestore)
```

### Weekly calendar

```
useWeeklySchedule(weekOffset)
  ├── AniList: getAiringSchedule([ids], weekStart, weekEnd)  ← single batch request
  └── TMDB: getNextEpisode(sourceId, progress)               ← one request per series
```

## Store

The Zustand store is created by `StoreProvider` with the Firebase UID. It does not use the `persist` middleware — Firestore is the source of truth.

```
StoreProvider(userId)
  ├── mount → loadUserData(userId) → store.setState(...)
  └── subscribe → debounce 1.5s → saveUserData(userId, state)
```

## Core types

```ts
type MediaType = 'anime' | 'series' | 'movie'
type Source    = 'anilist' | 'tmdb' | 'jikan'
type Status    = 'watching' | 'completed' | 'plan_to_watch'

interface TrackedItem {
  id, sourceId, source, type, title, coverImage,
  status, progress, totalEpisodes?, isFinished?,
  malId?, episodeDuration?
}

interface WatchedEpisode {
  itemId, episode, watchedAt  // watchedAt: ISO 8601
}
```

[^spa]: Single Page Application: the app is entirely client-side rendered, with no application server.

[react]: https://react.dev
[ts]: https://www.typescriptlang.org
[vite]: https://vite.dev
[tailwind]: https://tailwindcss.com
[baseui]: https://base-ui.com
[shadcn]: https://ui.shadcn.com
[zustand]: https://zustand.docs.pmnd.rs
[firebase]: https://firebase.google.com/docs/auth
[firestore]: https://firebase.google.com/docs/firestore
[anilist]: https://anilist.gitbook.io/anilist-apiv2-docs
[tmdb]: https://developer.themoviedb.org/docs
[jikan]: https://docs.api.jikan.moe
