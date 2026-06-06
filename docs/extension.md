# Browser extension

The extension injects an "Add to Miru" button on detail pages of supported sites. On click, it opens the miru app with the title pre-filled in the add dialog.

## Supported sites

| Site | Detected URL | Extraction |
|------|-------------|-----------|
| AniList | `anilist.co/anime/:id/:slug` | slug → title |
| MyAnimeList | `myanimelist.net/anime/:id/:slug` | slug → title |
| Crunchyroll | `crunchyroll.com/[locale/]series/:id/:slug` | slug → title |

## Install from GitHub Releases (recommended for testing)

No local build required — download the zip from the [Releases][releases] page:

- **`miru-extension-dev.zip`** — latest build from `main`, updated on every merge
- **`miru-extension-vX.Y.Z.zip`** — stable or beta tagged version

### Chrome

1. Unzip the archive into a folder
2. Open `chrome://extensions`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked**
5. Select the unzipped folder

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select the `manifest.json` file inside the unzipped folder

> The temporary add-on is removed when Firefox restarts.
> For a permanent install, use a signed version via [addons.mozilla.org][amo].

## Local build

Only needed when developing the extension.

Add to `.env`:

```
VITE_MIRU_URL=https://your-miru.vercel.app
```

```bash
npm run build:extension
```

Compiled files are in `extension/dist/`. This folder is not versioned.

Without `VITE_MIRU_URL`, the extension points to `http://localhost:5173` (handy for local testing).

## Known limitations

AniList and Crunchyroll are SPAs[^spa]: the button is only injected on direct navigation to a series page (not during in-app navigation).

[^spa]: Single Page Application: internal navigation does not reload the page, so the content script does not re-execute.

[releases]: https://github.com/guillaumedelre/miru/releases
[amo]: https://addons.mozilla.org/developers/
