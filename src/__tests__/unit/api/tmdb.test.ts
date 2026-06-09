import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import {
  getTmdbDetails,
  getWatchProviders,
  getTvSeasons,
  getSeasonEpisodes,
  searchTv,
  searchMovie,
  getNextEpisode,
  posterUrl,
} from '@/api/tmdb'

const BASE = 'https://api.themoviedb.org/3'

describe('posterUrl', () => {
  it('returns placeholder for null', () => {
    expect(posterUrl(null)).toBe('/placeholder.png')
  })

  it('returns full TMDB URL for a path', () => {
    expect(posterUrl('/path.jpg')).toBe('https://image.tmdb.org/t/p/w300/path.jpg')
  })
})

describe('getTmdbDetails', () => {
  it('parses movie details', async () => {
    const result = await getTmdbDetails(550, 'movie')
    expect(result.title).toBe('Fight Club')
    expect(result.vote_average).toBe(8.4)
    expect(result.runtime).toBe(139)
    expect(result.release_date).toBe('1999-10-15')
    expect(result.genres).toEqual([{ id: 28, name: 'Action' }])
    expect(result.backdrop_path).toBeNull()
  })

  it('parses tv details', async () => {
    const result = await getTmdbDetails(1396, 'tv')
    expect(result.name).toBe('Breaking Bad')
    expect(result.vote_average).toBe(9.5)
    expect(result.number_of_seasons).toBe(5)
    expect(result.number_of_episodes).toBe(62)
    expect(result.first_air_date).toBe('2008-01-20')
    expect(result.status).toBe('Ended')
  })

  it('throws on HTTP error with status in message', async () => {
    server.use(
      http.get(`${BASE}/movie/:id`, () => HttpResponse.json({ error: 'Not found' }, { status: 500 }))
    )
    await expect(getTmdbDetails(999, 'movie')).rejects.toThrow('TMDB 500')
  })

  it('includes response body in error message', async () => {
    server.use(
      http.get(`${BASE}/movie/:id`, () => HttpResponse.text('Resource not found', { status: 404 }))
    )
    await expect(getTmdbDetails(999, 'movie')).rejects.toThrow('Resource not found')
  })
})

describe('getWatchProviders', () => {
  it('returns providers for FR country', async () => {
    const result = await getWatchProviders(1396, 'tv')
    expect(result.providers).toHaveLength(1)
    expect(result.providers[0].provider_name).toBe('Netflix')
    expect(result.providers[0].provider_id).toBe(8)
    expect(result.link).toBe('https://www.netflix.com')
  })

  it('returns empty when no country match', async () => {
    server.use(
      http.get(`${BASE}/tv/:id/watch/providers`, () =>
        HttpResponse.json({ results: {} })
      )
    )
    const result = await getWatchProviders(1396, 'tv')
    expect(result.providers).toEqual([])
    expect(result.link).toBeNull()
  })
})

describe('getTvSeasons', () => {
  it('filters out season_number=0 and sets isFinished for Ended status', async () => {
    server.use(
      http.get(`${BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'Breaking Bad',
          overview: '...',
          poster_path: '/poster.jpg',
          backdrop_path: null,
          genres: [],
          vote_average: 9.5,
          number_of_seasons: 5,
          number_of_episodes: 62,
          first_air_date: '2008-01-20',
          status: 'Ended',
          seasons: [
            { season_number: 0, episode_count: 3, name: 'Specials' },
            { season_number: 1, episode_count: 7, name: 'Season 1' },
          ],
        })
      )
    )
    const result = await getTvSeasons(1396)
    expect(result.seasons).toHaveLength(1)
    expect(result.seasons[0].season_number).toBe(1)
    expect(result.isFinished).toBe(true)
  })

  it('sets isFinished=false for ongoing series', async () => {
    server.use(
      http.get(`${BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'Some Show',
          overview: '...',
          poster_path: null,
          backdrop_path: null,
          genres: [],
          vote_average: 7.0,
          number_of_seasons: 2,
          number_of_episodes: 20,
          first_air_date: '2020-01-01',
          status: 'Returning Series',
          seasons: [{ season_number: 1, episode_count: 10, name: 'Season 1' }],
        })
      )
    )
    const result = await getTvSeasons(1396)
    expect(result.isFinished).toBe(false)
  })
})

describe('getSeasonEpisodes', () => {
  it('returns episode array', async () => {
    const result = await getSeasonEpisodes(1396, 1)
    expect(result).toHaveLength(1)
    expect(result[0].episode_number).toBe(1)
    expect(result[0].name).toBe('Pilot')
  })
})


describe('searchTv', () => {
  it('returns results with media_type=tv and hasMore based on total_pages', async () => {
    const { results, hasMore } = await searchTv('breaking')
    expect(results).toHaveLength(1)
    expect(results[0].media_type).toBe('tv')
    expect(results[0].id).toBe(1396)
    expect(hasMore).toBe(true)
  })

  it('returns hasMore=false when on last page', async () => {
    server.use(
      http.get(`${BASE}/search/tv`, () =>
        HttpResponse.json({
          results: [{ id: 1, name: 'Show', poster_path: '/p.jpg' }],
          page: 3, total_pages: 3,
        })
      )
    )
    const { hasMore } = await searchTv('show', 3)
    expect(hasMore).toBe(false)
  })
})

describe('searchMovie', () => {
  it('returns results with media_type=movie and hasMore=false', async () => {
    const { results, hasMore } = await searchMovie('fight')
    expect(results).toHaveLength(1)
    expect(results[0].media_type).toBe('movie')
    expect(results[0].id).toBe(550)
    expect(hasMore).toBe(false)
  })
})

describe('getNextEpisode', () => {
  it('returns ep 1 of season 1 when progress=0', async () => {
    server.use(
      http.get(`${BASE}/tv/:id`, () =>
        HttpResponse.json({
          seasons: [
            { season_number: 0, episode_count: 3 },
            { season_number: 1, episode_count: 7 },
          ],
        })
      )
    )
    const result = await getNextEpisode(1396, 0)
    expect(result).not.toBeNull()
    expect(result?.episode_number).toBe(1)
    expect(result?.name).toBe('Pilot')
    expect(result?.season_number).toBe(1)
  })

  it('returns null when progress exceeds total episodes', async () => {
    server.use(
      http.get(`${BASE}/tv/:id`, () =>
        HttpResponse.json({
          seasons: [{ season_number: 1, episode_count: 7 }],
        })
      )
    )
    const result = await getNextEpisode(1396, 7)
    expect(result).toBeNull()
  })

  it('accepts null air_date for unscheduled episodes', async () => {
    server.use(
      http.get(`${BASE}/tv/:id/season/:season/episode/:ep`, () =>
        HttpResponse.json({ episode_number: 1, name: 'Pilot', air_date: null, season_number: 1 })
      )
    )
    const result = await getNextEpisode(1396, 0)
    expect(result).not.toBeNull()
    expect(result?.air_date).toBeNull()
  })
})
