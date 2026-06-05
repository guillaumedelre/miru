# Architecture

## Stack

- [React 19][react] + [TypeScript][ts] + [Vite][vite]
- [Tailwind CSS v4][tailwind] + [Base UI][baseui] + [shadcn/ui][shadcn]
- [Zustand][zustand] (state management)
- [Firebase Auth][firebase] + [Firestore][firestore]

### APIs externes

| API | Auth | Usage |
|-----|------|-------|
| [AniList GraphQL][anilist] | aucune | Recherche animes, planning de diffusion, détails, genres |
| [TMDB v3][tmdb] | clé API | Recherche séries/films, détails, watch providers, genres |
| [Jikan v4][jikan] | aucune | Noms d'épisodes via l'ID MAL |

## Vue d'ensemble

miru est un SPA[^spa] React sans backend propre. Les données sont persistées dans Firestore et les médias sont résolus via les APIs ci-dessus.

## Structure des dossiers

```
src/
├── api/            # clients HTTP vers les APIs externes
│   ├── anilist.ts  # GraphQL — animes, planning de diffusion
│   ├── tmdb.ts     # REST — séries, films, providers
│   └── jikan.ts    # REST — noms d'épisodes (via MAL)
├── components/     # composants React réutilisables
│   └── ui/         # primitives UI (shadcn/ui + Base UI)
├── contexts/       # AuthContext (Firebase Auth)
├── hooks/          # useWeeklySchedule
├── lib/            # firebase.ts, firestore.ts, utils.ts
├── pages/          # WeekView, Library, Stats, Login, Import
├── store/          # Zustand store + StoreProvider
└── types/          # TrackedItem, WatchedEpisode, MediaType

extension/
├── src/
│   └── content-scripts/  # scripts injectés dans les pages tierces
│       ├── anilist.ts
│       ├── mal.ts
│       └── crunchyroll.ts
├── manifest.json          # Manifest V3 (Chrome + Firefox)
├── build.mjs              # script de build (3 IIFE séparés)
└── tsconfig.json
```

## Flux de données

### Authentification

```
Clic "Continuer avec Google"
  → signInWithPopup(auth, googleProvider)
  → onAuthStateChanged → AuthContext.user
  → StoreProvider(userId)
    → chargement Firestore
    → store Zustand hydraté
```

Si la popup est bloquée par le navigateur (`auth/popup-blocked`), un message guide l'utilisateur pour autoriser les popups sur le site.

### Ajout d'un média

```
AddMediaDialog
  → recherche AniList (anime) ou TMDB (série/film)
  → sélection → handleConfirm
  → store.addItem(TrackedItem)
  → debounce 1.5s → saveUserData(Firestore)
```

### Calendrier hebdomadaire

```
useWeeklySchedule(weekOffset)
  ├── AniList: getAiringSchedule([ids], weekStart, weekEnd)  ← une seule requête batch
  └── TMDB: getNextEpisode(sourceId, progress)               ← une requête par série
```

## Store

Le store Zustand est créé par `StoreProvider` avec l'UID Firebase. Il n'utilise pas le middleware `persist` — Firestore est la source de vérité.

```
StoreProvider(userId)
  ├── mount → loadUserData(userId) → store.setState(...)
  └── subscribe → debounce 1.5s → saveUserData(userId, state)
```

## Types principaux

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

[^spa]: Single Page Application : l'app est entièrement rendue côté client, sans serveur applicatif.

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
