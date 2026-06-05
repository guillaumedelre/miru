// MAL URL: https://myanimelist.net/anime/:id/:slug

import { injectButton } from '../shared/button'

const match = window.location.pathname.match(/^\/anime\/\d+\/(.+)$/)
if (match) injectButton(match[1].replace(/_/g, ' '))
