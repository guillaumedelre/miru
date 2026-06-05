# Contributing

## Workflow

1. Crée une branche depuis `main` : `git checkout -b type/description`
2. Développe et teste localement (voir [setup.md](setup.md) pour les commandes)
3. Vérifie que le build passe : `npm run build && npm run lint`
4. Ouvre une Pull Request vers `main`
5. Le CI (GitHub Actions) valide lint + build app + build extension automatiquement

## Releases

La publication de l'extension sur le Chrome Web Store et Firefox AMO se déclenche automatiquement en taguant une release :

```bash
git tag v1.2.3
git push origin v1.2.3
```

Les secrets nécessaires dans GitHub Actions :

| Secret | Usage |
|--------|-------|
| `VITE_MIRU_URL` | URL Vercel injectée dans l'extension |
| `CHROME_EXTENSION_ID` | ID du Chrome Web Store |
| `CHROME_CLIENT_ID` | Google Cloud Console OAuth |
| `CHROME_CLIENT_SECRET` | Google Cloud Console OAuth |
| `CHROME_REFRESH_TOKEN` | Généré via OAuth Playground |
| `FIREFOX_JWT_ISSUER` | AMO API credentials |
| `FIREFOX_JWT_SECRET` | AMO API credentials |

## Conventions de branches

| Type | Exemple |
|------|---------|
| `feat/` | `feat/search-filters` |
| `fix/` | `fix/episode-count` |
| `refactor/` | `refactor/store-provider` |
| `docs/` | `docs/api-reference` |

## Commits

Format [Conventional Commits][cc] :

```
<type>[scope]: <description>

# Exemples
feat(library): add search filter by genre
fix(calendar): exclude past episodes from TMDB series
docs: update setup instructions
```

Types : `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `chore`

## Ajouter un provider de connexion

1. Active le provider dans la console Firebase (Authentication → Méthode de connexion)
2. Ajoute le provider dans `src/lib/firebase.ts`
3. Ajoute un bouton dans `src/pages/Login.tsx`

## Ajouter une source de médias

1. Crée `src/api/nouveau-service.ts` avec les fonctions de recherche et de détail
2. Étends `Source` dans `src/types/index.ts`
3. Intègre dans `AddMediaDialog` (onglet de recherche + logique `handleSelect`)
4. Intègre dans `useWeeklySchedule` si la source expose un planning de diffusion
5. Intègre dans `MediaSheet` pour la fiche info

[cc]: https://www.conventionalcommits.org/en/v1.0.0/
