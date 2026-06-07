vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(() => Promise.resolve(null)), saveUserData: vi.fn() }))

import { renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { useSeasons } from '@/hooks/useSeasons'
import { toast } from 'sonner'

const TMDB_BASE = 'https://api.themoviedb.org/3'
const JIKAN_BASE = 'https://api.jikan.moe/v4'

describe('useSeasons', () => {
  it('fetches TMDB seasons for a series and builds Season[] with correct globalOffset', async () => {
    const { result } = renderHook(() =>
      useSeasons({ sourceId: '1396', source: 'tmdb', type: 'series' })
    )

    await waitFor(() => expect(result.current.loadingSeasons).toBe(false))

    expect(result.current.seasons).toHaveLength(1)
    expect(result.current.seasons[0]).toMatchObject({
      number: 1,
      name: 'Season 1',
      episodeCount: 7,
      globalOffset: 0,
    })
  })

  it('builds virtual seasons for anime with totalEpisodes=25', () => {
    const { result } = renderHook(() =>
      useSeasons({ sourceId: '101', source: 'anilist', type: 'anime', totalEpisodes: 25 })
    )

    expect(result.current.loadingSeasons).toBe(false)
    expect(result.current.seasons).toHaveLength(2)

    expect(result.current.seasons[0]).toMatchObject({
      number: 1,
      name: 'Partie 1',
      episodeCount: 13,
      globalOffset: 0,
    })
    expect(result.current.seasons[0].episodes).toHaveLength(13)
    expect(result.current.seasons[0].episodes![0]).toMatchObject({ episode_number: 1 })
    expect(result.current.seasons[0].episodes![12]).toMatchObject({ episode_number: 13 })

    expect(result.current.seasons[1]).toMatchObject({
      number: 2,
      name: 'Partie 2',
      episodeCount: 12,
      globalOffset: 13,
    })
    expect(result.current.seasons[1].episodes).toHaveLength(12)
    expect(result.current.seasons[1].episodes![0]).toMatchObject({ episode_number: 1 })
  })

  it('fetches episode count from Jikan when malId provided and totalEpisodes absent', async () => {
    server.use(
      http.get(`${JIKAN_BASE}/anime/:id/episodes`, () =>
        HttpResponse.json({
          data: [{ mal_id: 25, title: 'Final Episode' }],
          pagination: { last_visible_page: 1 },
        })
      )
    )

    const onTotalResolved = vi.fn()
    const { result } = renderHook(() =>
      useSeasons({ sourceId: '101', source: 'anilist', type: 'anime', malId: 16498, onTotalResolved })
    )

    await waitFor(() => expect(result.current.loadingSeasons).toBe(false))

    expect(result.current.resolvedTotal).toBe(25)
    expect(result.current.seasons).toHaveLength(2)
    expect(result.current.seasons[0]).toMatchObject({ name: 'Partie 1', episodeCount: 13, globalOffset: 0 })
    expect(result.current.seasons[1]).toMatchObject({ name: 'Partie 2', episodeCount: 12, globalOffset: 13 })
    expect(onTotalResolved).toHaveBeenCalledWith(25)
  })

  it('sets seasons to [] and calls notifyApiError when getTvSeasons fails', async () => {
    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () => HttpResponse.json({ error: 'not found' }, { status: 500 }))
    )

    const { result } = renderHook(() =>
      useSeasons({ sourceId: '1396', source: 'tmdb', type: 'series' })
    )

    await waitFor(() => expect(result.current.loadingSeasons).toBe(false))

    expect(result.current.seasons).toEqual([])
    expect(toast.warning).toHaveBeenCalled()
  })
})
