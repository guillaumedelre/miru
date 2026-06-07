vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(), saveUserData: vi.fn() }))

import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { server } from '@/__tests__/mocks/server'
import { StoreProvider } from '@/store'
import { useBacklogEpisodes } from '@/hooks/useBacklogEpisodes'
import { useReturningShows } from '@/hooks/useReturningShows'
import { loadUserData } from '@/lib/firestore'
import { animeItem, seriesItem } from '@/__tests__/helpers/fixtures'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const TMDB_BASE = 'https://api.themoviedb.org/3'

// 2024-06-17 00:00:00 UTC (Monday — week start)
const weekStartTs = Math.floor(new Date('2024-06-17').getTime() / 1000)

// Past slot: 2024-06-10, clearly before weekStart
const PAST_AIRING_AT = Math.floor(new Date('2024-06-10').getTime() / 1000)

// Future slot: 2024-06-30, after weekEnd (2024-06-23)
const FUTURE_AIRING_AT = Math.floor(new Date('2024-06-30').getTime() / 1000)

function makeWrapper(userId = 'test') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StoreProvider, { userId }, children)
    )
}

describe('useBacklogEpisodes', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-06-17'))
    vi.mocked(loadUserData).mockResolvedValue(null)
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty episodes and loading=false when store is empty', async () => {
    const { result } = renderHook(() => useBacklogEpisodes(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.episodes).toEqual([])
  })

  it('includes an anilist item whose airing date is before weekStart', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }

        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: {
              Page: {
                airingSchedules: [{ mediaId: 101, episode: 5, airingAt: PAST_AIRING_AT }],
              },
            },
          })
        }

        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useBacklogEpisodes(), {
      wrapper: makeWrapper('user-backlog-anilist'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.episodes.length).toBe(1)
    expect(result.current.episodes[0]).toMatchObject({
      itemId: animeItem.id,
      title: animeItem.title,
      episode: 5,
      type: 'anime',
    })
  })

  it('filters out already-watched episodes', async () => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem],
      watched: [{ itemId: 'item-anime-1', episode: 5, watchedAt: '2024-06-10T00:00:00Z' }],
    })

    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }

        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: {
              Page: {
                airingSchedules: [{ mediaId: 101, episode: 5, airingAt: PAST_AIRING_AT }],
              },
            },
          })
        }

        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useBacklogEpisodes(), {
      wrapper: makeWrapper('user-backlog-watched'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.episodes.every(ep => !(ep.itemId === 'item-anime-1' && ep.episode === 5))).toBe(true)
  })

  it('includes a tmdb series whose next episode aired before weekStart', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [seriesItem], watched: [] })

    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'Breaking Bad', overview: '...', poster_path: '/...', backdrop_path: '/...',
          genres: [{ id: 18, name: 'Drama' }], vote_average: 9.5,
          number_of_seasons: 1, number_of_episodes: 62,
          first_air_date: '2008-01-20', status: 'Ended',
          seasons: [{ season_number: 1, episode_count: 62, name: 'Season 1' }],
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:season/episode/:ep`, () =>
        HttpResponse.json({
          episode_number: 8,
          name: 'Backlog Episode',
          air_date: '2024-06-10',
          season_number: 1,
        })
      )
    )

    const { result } = renderHook(() => useBacklogEpisodes(), {
      wrapper: makeWrapper('user-backlog-tmdb'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.episodes.length).toBe(1)
    expect(result.current.episodes[0]).toMatchObject({
      itemId: seriesItem.id,
      title: seriesItem.title,
      episode: 8,
      type: 'series',
      airingDate: '2024-06-10',
    })
  })
})

describe('useReturningShows', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-06-17'))
    vi.mocked(loadUserData).mockResolvedValue(null)
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty entries and loading=false when store is empty', async () => {
    const { result } = renderHook(() => useReturningShows(), {
      wrapper: makeWrapper(),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entries).toEqual([])
  })

  it('includes an anilist item whose next airing is after weekEnd', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }

        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: {
              Page: {
                airingSchedules: [{ mediaId: 101, episode: 6, airingAt: FUTURE_AIRING_AT }],
              },
            },
          })
        }

        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useReturningShows(), {
      wrapper: makeWrapper('user-returning-anilist'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entries.length).toBe(1)
    expect(result.current.entries[0]).toMatchObject({
      item: expect.objectContaining({ id: animeItem.id }),
      nextEpisode: 6,
    })
    expect(result.current.entries[0].nextDate).toBe('2024-06-30')
  })

  it('includes a tmdb series whose next episode airs after weekEnd', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [seriesItem], watched: [] })

    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'Breaking Bad', overview: '...', poster_path: '/...', backdrop_path: '/...',
          genres: [{ id: 18, name: 'Drama' }], vote_average: 9.5,
          number_of_seasons: 1, number_of_episodes: 62,
          first_air_date: '2008-01-20', status: 'Ended',
          seasons: [{ season_number: 1, episode_count: 62, name: 'Season 1' }],
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:season/episode/:ep`, () =>
        HttpResponse.json({
          episode_number: 8,
          name: 'Returning Episode',
          air_date: '2024-07-01',
          season_number: 2,
        })
      )
    )

    const { result } = renderHook(() => useReturningShows(), {
      wrapper: makeWrapper('user-returning-tmdb'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entries.length).toBe(1)
    expect(result.current.entries[0]).toMatchObject({
      item: expect.objectContaining({ id: seriesItem.id }),
      nextEpisode: 8,
      nextSeason: 2,
      nextDate: '2024-07-01',
    })
  })

  it('sorts entries by nextDate ascending when multiple returning shows exist', async () => {
    const animeItem2 = {
      ...animeItem,
      id: 'item-anime-3',
      sourceId: '202',
    }

    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, animeItem2],
      watched: [],
    })

    // First call returns the later date for mediaId 101, earlier date for 202
    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }

        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: {
              Page: {
                airingSchedules: [
                  { mediaId: 101, episode: 6, airingAt: Math.floor(new Date('2024-08-01').getTime() / 1000) },
                  { mediaId: 202, episode: 3, airingAt: Math.floor(new Date('2024-07-15').getTime() / 1000) },
                ],
              },
            },
          })
        }

        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useReturningShows(), {
      wrapper: makeWrapper('user-returning-sort'),
    })

    await waitFor(() => expect(result.current.loading).toBe(false))

    expect(result.current.entries.length).toBe(2)
    expect(result.current.entries[0].nextDate <= result.current.entries[1].nextDate).toBe(true)
    expect(result.current.entries[0].nextDate).toBe('2024-07-15')
    expect(result.current.entries[1].nextDate).toBe('2024-08-01')
  })
})
