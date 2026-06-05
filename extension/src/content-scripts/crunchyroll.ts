// Crunchyroll URL: https://www.crunchyroll.com/fr/series/:id/:slug
// SPA: button is injected on initial page load only (direct navigation)

import { injectButton } from '../shared/button'

const match = window.location.pathname.match(/\/series\/[A-Z0-9]+\/([^/]+)/i)
if (match) injectButton(match[1].replace(/-/g, ' '))
