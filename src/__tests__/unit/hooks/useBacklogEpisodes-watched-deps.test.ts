vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(), saveUserData: vi.fn() }))

import { act, renderHook, waitFor } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import { server } from '@/__tests__/mocks/server'
import { StoreProvider, useStore } from '@/store'
import { useBacklogEpisodes } from '@/hooks/useBacklogEpisodes'
import { loadUserData } from '@/lib/firestore'
import { animeItem } from '@/__tests__/helpers/fixtures'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const PAST_AIRING_AT = Math.floor(new Date('2024-06-10').getTime() / 1000)

function makeWrapper(userId = 'test') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(StoreProvider, { userId }, children)
    )
}

function useCombined() {
  const backlog = useBacklogEpisodes()
  const { markWatched, unmarkWatched } = useStore()
  return { ...backlog, markWatched, unmarkWatched }
}

describe('useBacklogEpisodes — watched deps reactivity (fix #12)', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2024-06-17'))
    vi.mocked(loadUserData).mockResolvedValue(null)
  })
  afterEach(() => vi.useRealTimers())

  it('removes an episode from the list when it is marked as watched after load', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 101, episode: 5, airingAt: PAST_AIRING_AT }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useCombined(), { wrapper: makeWrapper('user-watched-reactive') })

    await waitFor(() => expect(result.current.episodes.length).toBe(1), { timeout: 5000 })

    act(() => result.current.markWatched(animeItem.id, 5))

    await waitFor(() => expect(result.current.episodes.length).toBe(0))
  })

  it('re-adds an episode when it is unmarked as watched', async () => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem],
      watched: [{ itemId: animeItem.id, episode: 5, watchedAt: '2024-06-10T00:00:00Z' }],
    })

    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 101, episode: 5, airingAt: PAST_AIRING_AT }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )

    const { result } = renderHook(() => useCombined(), { wrapper: makeWrapper('user-unwatch-reactive') })

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.episodes).toHaveLength(0)

    act(() => result.current.unmarkWatched(animeItem.id, 5))

    await waitFor(() => expect(result.current.episodes.length).toBe(1), { timeout: 5000 })
  })
})
