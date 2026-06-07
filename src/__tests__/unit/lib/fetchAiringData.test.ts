import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { fetchAiringData } from '@/lib/fetchAiringData'
import { animeItem, seriesItem } from '@/__tests__/helpers/fixtures'
import type { TrackedItem } from '@/types'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'
const TMDB_BASE = 'https://api.themoviedb.org/3'

const watchingAnime: TrackedItem = { ...animeItem, status: 'watching' }
const watchingSeries: TrackedItem = { ...seriesItem, status: 'watching' }

describe('fetchAiringData', () => {
  it('returns empty results when watching list is empty', async () => {
    const result = await fetchAiringData([], 0, 9999999999)
    expect(result.animeSlots).toEqual([])
    expect(result.seriesEps).toEqual([])
  })

  it('returns anime slots paired with their items', async () => {
    const airingAt = Math.floor(new Date('2024-06-20').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, () =>
        HttpResponse.json({
          data: { Page: { airingSchedules: [{ mediaId: 101, episode: 5, airingAt }] } },
        })
      )
    )

    const result = await fetchAiringData([watchingAnime], 0, airingAt + 1)
    expect(result.animeSlots).toHaveLength(1)
    expect(result.animeSlots[0].item.id).toBe(animeItem.id)
    expect(result.animeSlots[0].slot.episode).toBe(5)
    expect(result.animeSlots[0].slot.airingAt).toBe(airingAt)
  })

  it('skips anime slots whose mediaId does not match any watching item', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, () =>
        HttpResponse.json({
          data: { Page: { airingSchedules: [{ mediaId: 999, episode: 1, airingAt: 9999 }] } },
        })
      )
    )

    const result = await fetchAiringData([watchingAnime], 0, 9999999999)
    expect(result.animeSlots).toHaveLength(0)
  })

  it('returns series episodes paired with their items', async () => {
    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({
          seasons: [{ season_number: 1, episode_count: 62 }],
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:season/episode/:ep`, () =>
        HttpResponse.json({ episode_number: 8, name: 'Episode 8', air_date: '2024-06-20', season_number: 1 })
      )
    )

    const result = await fetchAiringData([watchingSeries], 0, 9999999999)
    expect(result.seriesEps).toHaveLength(1)
    expect(result.seriesEps[0].item.id).toBe(seriesItem.id)
    expect(result.seriesEps[0].ep?.episode_number).toBe(8)
  })

  it('returns ep=null for series when TMDB fetch fails', async () => {
    server.use(
      http.get(`${TMDB_BASE}/tv/:id`, () => HttpResponse.json({ error: 'not found' }, { status: 500 }))
    )

    const result = await fetchAiringData([watchingSeries], 0, 9999999999)
    expect(result.seriesEps).toHaveLength(1)
    expect(result.seriesEps[0].ep).toBeNull()
  })

  it('calls onError with context when anilist fails', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, () => HttpResponse.json({ errors: [{ message: 'fail' }] }, { status: 500 }))
    )

    const onError = vi.fn()
    await fetchAiringData([watchingAnime], 0, 9999999999, onError)
    expect(onError).toHaveBeenCalledWith('anilist', expect.anything())
  })

  it('handles both anime and series items together', async () => {
    const airingAt = Math.floor(new Date('2024-06-20').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, () =>
        HttpResponse.json({
          data: { Page: { airingSchedules: [{ mediaId: 101, episode: 3, airingAt }] } },
        })
      ),
      http.get(`${TMDB_BASE}/tv/:id`, () =>
        HttpResponse.json({ seasons: [{ season_number: 1, episode_count: 62 }] })
      ),
      http.get(`${TMDB_BASE}/tv/:id/season/:season/episode/:ep`, () =>
        HttpResponse.json({ episode_number: 8, name: 'Ep 8', air_date: '2024-06-20', season_number: 1 })
      )
    )

    const result = await fetchAiringData([watchingAnime, watchingSeries], 0, airingAt + 1)
    expect(result.animeSlots).toHaveLength(1)
    expect(result.seriesEps).toHaveLength(1)
  })
})
