import { setupServer } from 'msw/node'
import { anilistHandlers } from './handlers/anilist'
import { tmdbHandlers } from './handlers/tmdb'
import { jikanHandlers } from './handlers/jikan'

export const server = setupServer(
  ...anilistHandlers,
  ...tmdbHandlers,
  ...jikanHandlers,
)
