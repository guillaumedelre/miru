# Contributing

## Workflow

1. Create a branch from `main`: `git checkout -b type/description`
2. Develop and test locally (see [setup.md](setup.md) for commands)
3. Verify the build passes: `npm run build && npm run lint`
4. Open a Pull Request targeting `main`
5. CI (GitHub Actions) automatically validates lint + app build + extension build

## Releases

### Distribution channels

| Channel | Trigger | Artifact | Target |
|---------|---------|---------|--------|
| `dev` | merge to `main` | `miru-extension-dev.zip` | GitHub Release pre-release (floating tag) |
| beta | tag `v1.2.3-beta.1` | `miru-extension-v1.2.3-beta.1.zip` | GitHub Release pre-release + beta channel stores |
| stable | tag `v1.2.3` | `miru-extension-v1.2.3.zip` | GitHub Release stable + Chrome Store + Firefox AMO |

### Publishing a release

```bash
# Stable release
git tag v1.2.3
git push origin v1.2.3

# Beta
git tag v1.2.3-beta.1
git push origin v1.2.3-beta.1
```

CI automatically creates the GitHub Release, publishes to stores, and generates release notes from commits.

### Required GitHub Actions secrets

| Secret | Usage |
|--------|-------|
| `VITE_MIRU_URL` | Vercel URL injected into the extension at build time |
| `CHROME_EXTENSION_ID` | Chrome Web Store ID |
| `CHROME_CLIENT_ID` | Google Cloud Console OAuth |
| `CHROME_CLIENT_SECRET` | Google Cloud Console OAuth |
| `CHROME_REFRESH_TOKEN` | Generated via OAuth Playground |
| `FIREFOX_JWT_ISSUER` | AMO API credentials |
| `FIREFOX_JWT_SECRET` | AMO API credentials |

## Branch conventions

| Type | Example |
|------|---------|
| `feat/` | `feat/search-filters` |
| `fix/` | `fix/episode-count` |
| `refactor/` | `refactor/store-provider` |
| `docs/` | `docs/api-reference` |

## Commits

[Conventional Commits][cc] format:

```
<type>[scope]: <description>

# Examples
feat(library): add search filter by genre
fix(calendar): exclude past episodes from TMDB series
docs: update setup instructions
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Adding a sign-in provider

1. Enable the provider in the Firebase console (Authentication → Sign-in method)
2. Add the provider in `src/lib/firebase.ts`
3. Add a button in `src/pages/Login.tsx`

## Adding a media source

1. Create `src/api/new-service.ts` with search and detail functions
2. Extend `Source` in `src/types/index.ts`
3. Integrate into `AddMediaDialog` (search tab + `handleSelect` logic)
4. Integrate into `useWeeklySchedule` if the source exposes an airing schedule
5. Integrate into `MediaSheet` for the info panel

[cc]: https://www.conventionalcommits.org/en/v1.0.0/
