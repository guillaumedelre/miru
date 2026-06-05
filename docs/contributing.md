# Contributing

## Workflow

1. Crée une branche depuis `main` : `git checkout -b type/description`
2. Développe et teste localement (voir [setup.md](setup.md) pour les commandes)
3. Vérifie que le build passe : `npm run build && npm run lint`
4. Ouvre une Pull Request vers `main`
5. Le CI (GitHub Actions) valide lint + build automatiquement

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
