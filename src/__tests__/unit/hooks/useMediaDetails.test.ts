import { renderHook, waitFor } from '@testing-library/react'
import { useMediaDetails } from '@/hooks/useMediaDetails'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import type { TrackedItem } from '@/types'

const baseAnime = (sourceId: string): TrackedItem => ({
  id: `md-test-${sourceId}`,
  sourceId,
  source: 'anilist',
  type: 'anime',
  title: 'Test Anime',
  coverImage: '',
  status: 'watching',
  progress: 0,
  totalEpisodes: 12,
})

const baseMovie = (sourceId: string): TrackedItem => ({
  id: `md-test-${sourceId}`,
  sourceId,
  source: 'tmdb',
  type: 'movie',
  title: 'Test Movie',
  coverImage: '',
  status: 'watching',
  progress: 0,
  totalEpisodes: 1,
})

const baseSeries = (sourceId: string): TrackedItem => ({
  id: `md-test-${sourceId}`,
  sourceId,
  source: 'tmdb',
  type: 'series',
  title: 'Test Series',
  coverImage: '',
  status: 'watching',
  progress: 0,
  totalEpisodes: 10,
})

describe('useMediaDetails', () => {
  describe('open=false', () => {
    it('returns null details and loading=false without fetching', () => {
      const item = baseAnime('9000')
      const { result } = renderHook(() => useMediaDetails(item, false))

      expect(result.current.loading).toBe(false)
      expect(result.current.details).toBeNull()
      expect(result.current.watchProviders).toEqual({ providers: [], link: null })
    })
  })

  describe('open=true, source=anilist', () => {
    it('fetches AniList details and returns genres', async () => {
      const item = baseAnime('9001')

      server.use(
        http.post('https://graphql.anilist.co', async ({ request }) => {
          const body = await request.json() as { query: string; variables: Record<string, unknown> }
          if (
            body.query.includes('Media(id') ||
            ('id' in (body.variables ?? {}) && !body.variables['search'])
          ) {
            return HttpResponse.json({
              data: {
                Media: {
                  id: 9001,
                  title: { romaji: 'Test Anime', english: 'Test Anime EN' },
                  description: 'A test anime.',
                  coverImage: { extraLarge: '...', large: '...' },
                  bannerImage: null,
                  genres: ['Fantasy', 'Adventure'],
                  averageScore: 90,
                  episodes: 12,
                  duration: 23,
                  status: 'RELEASING',
                  startDate: { year: 2024 },
                  studios: { nodes: [{ name: 'Test Studio' }] },
                  externalLinks: [],
                },
              },
            })
          }
          return HttpResponse.json({ data: { Page: { media: [] } } })
        })
      )

      const { result } = renderHook(() => useMediaDetails(item, true))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.details).not.toBeNull()
      const details = result.current.details as { genres: string[] }
      expect(details.genres).toContain('Fantasy')
      expect(details.genres).toContain('Adventure')
      expect(result.current.watchProviders).toEqual({ providers: [], link: null })
    })
  })

  describe('open=true, source=tmdb, type=movie', () => {
    it('fetches TMDB movie details and watch providers', async () => {
      const item = baseMovie('9002')

      const { result } = renderHook(() => useMediaDetails(item, true))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.details).not.toBeNull()
      const details = result.current.details as { title: string; runtime: number }
      expect(details.title).toBe('Fight Club')
      expect(details.runtime).toBe(139)

      expect(result.current.watchProviders.providers).toHaveLength(1)
      expect(result.current.watchProviders.providers[0].provider_name).toBe('Netflix')
      expect(result.current.watchProviders.link).toBe('https://www.netflix.com')
    })
  })

  describe('open=true, source=tmdb, type=series', () => {
    it('fetches TMDB TV details', async () => {
      const item = baseSeries('9003')

      const { result } = renderHook(() => useMediaDetails(item, true))

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.details).not.toBeNull()
      const details = result.current.details as { name: string; number_of_episodes: number }
      expect(details.name).toBe('Breaking Bad')
      expect(details.number_of_episodes).toBe(62)
    })
  })

  describe('caching', () => {
    it('does not trigger a new fetch on second render for the same item', async () => {
      const item = baseAnime('9004')
      let callCount = 0

      server.use(
        http.post('https://graphql.anilist.co', async ({ request }) => {
          const body = await request.json() as { query: string; variables: Record<string, unknown> }
          if (
            body.query.includes('Media(id') ||
            ('id' in (body.variables ?? {}) && !body.variables['search'])
          ) {
            callCount++
            return HttpResponse.json({
              data: {
                Media: {
                  id: 9004,
                  title: { romaji: 'Cached Anime', english: null },
                  description: '',
                  coverImage: { extraLarge: '', large: '' },
                  bannerImage: null,
                  genres: ['Sci-Fi'],
                  averageScore: 80,
                  episodes: 24,
                  duration: 24,
                  status: 'FINISHED',
                  startDate: { year: 2020 },
                  studios: { nodes: [] },
                  externalLinks: [],
                },
              },
            })
          }
          return HttpResponse.json({ data: { Page: { media: [] } } })
        })
      )

      const { result: result1 } = renderHook(() => useMediaDetails(item, true))
      await waitFor(() => expect(result1.current.loading).toBe(false))
      expect(callCount).toBe(1)

      const { result: result2 } = renderHook(() => useMediaDetails(item, true))
      await waitFor(() => expect(result2.current.loading).toBe(false))

      expect(callCount).toBe(1)
      expect(result2.current.details).not.toBeNull()
    })
  })

  describe('loading state', () => {
    it('starts with loading=true and transitions to false after fetch', async () => {
      const item = baseAnime('9005')

      server.use(
        http.post('https://graphql.anilist.co', async ({ request }) => {
          const body = await request.json() as { query: string; variables: Record<string, unknown> }
          if (
            body.query.includes('Media(id') ||
            ('id' in (body.variables ?? {}) && !body.variables['search'])
          ) {
            return HttpResponse.json({
              data: {
                Media: {
                  id: 9005,
                  title: { romaji: 'Loading Test', english: null },
                  description: '',
                  coverImage: { extraLarge: '', large: '' },
                  bannerImage: null,
                  genres: [],
                  averageScore: 70,
                  episodes: 10,
                  duration: 24,
                  status: 'FINISHED',
                  startDate: { year: 2021 },
                  studios: { nodes: [] },
                  externalLinks: [],
                },
              },
            })
          }
          return HttpResponse.json({ data: { Page: { media: [] } } })
        })
      )

      const { result } = renderHook(() => useMediaDetails(item, true))

      expect(result.current.loading).toBe(true)

      await waitFor(() => expect(result.current.loading).toBe(false))

      expect(result.current.details).not.toBeNull()
    })
  })
})
