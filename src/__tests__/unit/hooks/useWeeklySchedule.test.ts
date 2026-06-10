vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(),
  saveUserData: vi.fn(),
}))

import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { server } from '@/__tests__/mocks/server'
import { StoreProvider } from '@/store'
import { useWeeklySchedule, getWeekDates } from '@/hooks/useWeeklySchedule'
import { loadUserData } from '@/lib/firestore'
import { animeItem, seriesItem } from '@/__tests__/helpers/fixtures'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const TMDB_BASE = 'https://api.themoviedb.org/3'

function makeWrapper(userId = 'test') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, null,
      React.createElement(StoreProvider, { userId }, children))
}

describe('getWeekDates', () => {
  beforeEach(() => vi.setSystemTime(new Date('2024-06-17')))
  afterEach(() => vi.useRealTimers())

  it('returns 7 date strings', () => {
    expect(getWeekDates(0)).toHaveLength(7)
  })

  it('starts on Monday 2024-06-17', () => {
    expect(getWeekDates(0)[0]).toBe('2024-06-17')
  })

  it('ends on Sunday 2024-06-23', () => {
    expect(getWeekDates(0)[6]).toBe('2024-06-23')
  })

  it('all dates match YYYY-MM-DD', () => {
    getWeekDates(0).forEach(d => expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/))
  })

  it('offset=1 is next week', () => {
    const d = getWeekDates(1)
    expect(d[0]).toBe('2024-06-24')
    expect(d[6]).toBe('2024-06-30')
  })

  it('offset=-1 is previous week', () => {
    const d = getWeekDates(-1)
    expect(d[0]).toBe('2024-06-10')
    expect(d[6]).toBe('2024-06-16')
  })

  it('consecutive dates differ by exactly 1 day', () => {
    const dates = getWeekDates(0)
    for (let i = 1; i < dates.length; i++) {
      const diff = new Date(dates[i]).getTime() - new Date(dates[i - 1]).getTime()
      expect(diff).toBe(86400000)
    }
  })
})

describe('useWeeklySchedule', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-06-17'))
    vi.mocked(loadUserData).mockResolvedValue(null)
  })
  afterEach(() => vi.useRealTimers())

  it('returns empty schedule when store has no watching items', async () => {
    const { result } = renderHook(() => useWeeklySchedule(0), {
      wrapper: makeWrapper('sched-empty'),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.schedule.size).toBe(0)
  })

  it('returns 7 weekDates starting on Monday', async () => {
    const { result } = renderHook(() => useWeeklySchedule(0), {
      wrapper: makeWrapper('sched-dates'),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.weekDates).toHaveLength(7)
    expect(result.current.weekDates[0]).toBe('2024-06-17')
  })

  it('weekDates shifts by 7 days for offset=1', async () => {
    const { result } = renderHook(() => useWeeklySchedule(1), {
      wrapper: makeWrapper('sched-offset'),
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.weekDates[0]).toBe('2024-06-24')
  })

  it('populates schedule with AniList anime episode within the week', async () => {
    const airingAt = Math.floor(new Date('2024-06-20T12:00:00Z').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 101, episode: 5, airingAt }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    const { result } = renderHook(() => useWeeklySchedule(0), {
      wrapper: makeWrapper('sched-anime'),
    })
    const date = new Date(airingAt * 1000).toLocaleDateString('sv-SE')
    await waitFor(() => {
      const eps = result.current.schedule.get(date)
      expect(eps).toBeDefined()
      expect(eps![0]).toMatchObject({ itemId: animeItem.id, episode: 5, type: 'anime' })
    }, { timeout: 5000 })
  })

  it('populates schedule with TMDB series episode within the week', async () => {
    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'BB', overview: '', poster_path: '/', backdrop_path: null, genres: [],
          vote_average: 9, number_of_seasons: 1, number_of_episodes: 62,
          first_air_date: '2008-01-20', status: 'Ended',
          seasons: [{ season_number: 1, episode_count: 62, name: 'S1' }],
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:s/episode/:e`, () =>
        HttpResponse.json({ episode_number: 8, name: 'Ep8', air_date: '2024-06-19', season_number: 1 })
      )
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [seriesItem], watched: [] })

    const { result } = renderHook(() => useWeeklySchedule(0), {
      wrapper: makeWrapper('sched-series'),
    })
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

    const eps = result.current.schedule.get('2024-06-19')
    expect(eps).toBeDefined()
    expect(eps![0]).toMatchObject({ itemId: seriesItem.id, episode: 8, type: 'series' })
  })

  it('excludes series episode with air_date outside the week', async () => {
    // Use a different sourceId to avoid module-level cache collision with previous test
    const outsideSeries = { ...seriesItem, id: 'item-outside-1', sourceId: '9999', progress: 0 }
    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({
          name: 'BB', overview: '', poster_path: '/', backdrop_path: null, genres: [],
          vote_average: 9, number_of_seasons: 1, number_of_episodes: 62,
          first_air_date: '2008-01-20', status: 'Ended',
          seasons: [{ season_number: 1, episode_count: 62, name: 'S1' }],
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:s/episode/:e`, () =>
        HttpResponse.json({ episode_number: 1, name: 'Far future', air_date: '2024-07-15', season_number: 1 })
      )
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [outsideSeries], watched: [] })

    const { result } = renderHook(() => useWeeklySchedule(0), {
      wrapper: makeWrapper('sched-series-out'),
    })
    await waitFor(() => expect(result.current.loading).toBe(false), { timeout: 5000 })

    let total = 0
    result.current.schedule.forEach(eps => { total += eps.length })
    expect(total).toBe(0)
  })
})
