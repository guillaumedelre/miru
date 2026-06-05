// AniList URL: https://anilist.co/anime/:id/:slug
// SPA: button is injected on initial page load only (direct navigation)

import { injectButton } from '../shared/button'

const match = window.location.pathname.match(/^\/anime\/\d+\/(.+)$/)
if (match) injectButton(match[1].replace(/-/g, ' '))
