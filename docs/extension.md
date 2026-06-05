# Extension navigateur

L'extension injecte un bouton "Ajouter à Miru" sur les pages de détail des sites supportés. Au clic, elle ouvre l'app miru avec le titre pré-rempli dans le dialog d'ajout.

## Sites supportés

| Site | URL détectée | Extraction |
|------|-------------|-----------|
| AniList | `anilist.co/anime/:id/:slug` | slug → titre |
| MyAnimeList | `myanimelist.net/anime/:id/:slug` | slug → titre |
| Crunchyroll | `crunchyroll.com/[locale/]series/:id/:slug` | slug → titre |

## Installation depuis GitHub Releases (recommandé pour tester)

Sans avoir à builder localement, télécharge le zip depuis la page [Releases][releases] :

- **`miru-extension-dev.zip`** — dernier build de `main`, mis à jour à chaque merge
- **`miru-extension-vX.Y.Z.zip`** — version stable ou beta taguée

### Chrome

1. Décompresser le zip dans un dossier
2. Ouvrir `chrome://extensions`
3. Activer le **Mode développeur** (en haut à droite)
4. Cliquer **Charger l'extension non empaquetée**
5. Sélectionner le dossier décompressé

### Firefox

1. Ouvrir `about:debugging#/runtime/this-firefox`
2. Cliquer **Charger un module complémentaire temporaire**
3. Sélectionner le fichier `manifest.json` dans le dossier décompressé

> L'extension temporaire est supprimée au redémarrage de Firefox.
> Pour une installation permanente, utiliser une version signée via [addons.mozilla.org][amo].

## Build local

Nécessaire uniquement pour développer l'extension.

Ajouter dans `.env` :

```
VITE_MIRU_URL=https://your-miru.vercel.app
```

```bash
npm run build:extension
```

Les fichiers compilés sont dans `extension/dist/`. Ce dossier n'est pas versionné.

Sans `VITE_MIRU_URL`, l'extension pointe sur `http://localhost:5173` (pratique pour les tests locaux).

## Limitations connues

AniList et Crunchyroll sont des SPA[^spa] : le bouton est injecté uniquement lors de la navigation directe vers une page série (pas lors des navigations internes à l'application).

[^spa]: Single Page Application : la navigation interne ne recharge pas la page, donc le content script ne se réexécute pas.

[releases]: https://github.com/guillaumedelre/miru/releases
[amo]: https://addons.mozilla.org/developers/
