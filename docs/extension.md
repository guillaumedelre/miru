# Extension navigateur

L'extension injecte un bouton "Ajouter à Miru" sur les pages de détail des sites supportés. Au clic, elle ouvre l'app miru avec le titre pré-rempli dans le dialog d'ajout.

## Sites supportés

| Site | URL détectée | Extraction |
|------|-------------|-----------|
| AniList | `anilist.co/anime/:id/:slug` | slug → titre |
| MyAnimeList | `myanimelist.net/anime/:id/:slug` | slug → titre |
| Crunchyroll | `crunchyroll.com/[locale/]series/:id/:slug` | slug → titre |

## Prérequis

Ajouter dans `.env` :

```
VITE_MIRU_URL=https://your-miru.vercel.app
```

## Build

```bash
npm run build:extension
```

Les fichiers compilés sont dans `extension/dist/`. Ce dossier n'est pas versionné.

## Installation dans Chrome

1. Ouvrir `chrome://extensions`
2. Activer le **Mode développeur** (en haut à droite)
3. Cliquer **Charger l'extension non empaquetée**
4. Sélectionner le dossier `extension/dist/`

## Installation dans Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer **Charger un module complémentaire temporaire**
3. Sélectionner `extension/dist/manifest.json`

> L'extension temporaire est supprimée au redémarrage de Firefox.
> Pour une installation permanente, soumettre sur [addons.mozilla.org][amo].

## Limitations connues

AniList et Crunchyroll sont des SPA[^spa] : le bouton est injecté uniquement lors de la navigation directe vers une page série (pas lors des navigations internes à l'application).

[^spa]: Single Page Application : la navigation interne ne recharge pas la page, donc le content script ne se réexécute pas.

[amo]: https://addons.mozilla.org/developers/
