import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { searchAnime, searchManga, getEpisodeName, getAnimeEpisodeCount } from '@/api/jikan'

const BASE = 'https://api.jikan.moe/v4'

describe('searchAnime', () => {
  it('returns JikanMedia array with correct fields', async () => {
    const results = await searchAnime('attack on titan')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      mal_id: 16498,
      title: 'Shingeki no Kyojin',
      images: { jpg: { image_url: 'https://cdn.myanimelist.net/cover.jpg' } },
      episodes: 25,
      type: 'TV',
    })
  })
})

describe('searchManga', () => {
  it('returns JikanMedia array with correct fields', async () => {
    const results = await searchManga('attack on titan')
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      mal_id: 16498,
      title: 'Shingeki no Kyojin',
      images: { jpg: { image_url: 'https://cdn.myanimelist.net/cover.jpg' } },
      episodes: 25,
      type: 'TV',
    })
  })
})

describe('getEpisodeName', () => {
  it('returns title when episode is found', async () => {
    const name = await getEpisodeName(16498, 1)
    expect(name).toBe('To You, in 2000 Years')
  })

  it('returns null when episode is not in list', async () => {
    const name = await getEpisodeName(16498, 99)
    expect(name).toBeNull()
  })

  it('fetches page=2 for episode > 100', async () => {
    let capturedPage: string | null = null

    server.use(
      http.get(`${BASE}/anime/:id/episodes`, ({ request }) => {
        const url = new URL(request.url)
        capturedPage = url.searchParams.get('page')
        return HttpResponse.json({
          data: [{ mal_id: 101, title: 'Episode 101' }],
          pagination: { last_visible_page: 2 },
        })
      })
    )

    await getEpisodeName(16498, 101)
    expect(capturedPage).toBe('2')
  })
})

describe('getAnimeEpisodeCount', () => {
  it('returns mal_id of last episode on last page', async () => {
    server.use(
      http.get(`${BASE}/anime/:id/episodes`, ({ request }) => {
        const url = new URL(request.url)
        const page = url.searchParams.get('page')
        if (page === '1') {
          return HttpResponse.json({
            data: [{ mal_id: 1, title: 'Episode 1' }],
            pagination: { last_visible_page: 2 },
          })
        }
        return HttpResponse.json({
          data: [{ mal_id: 12, title: 'Episode 12' }, { mal_id: 13, title: 'Episode 13' }],
          pagination: { last_visible_page: 2 },
        })
      })
    )

    const count = await getAnimeEpisodeCount(16498)
    expect(count).toBe(13)
  })

  it('returns null when last_visible_page is 0', async () => {
    server.use(
      http.get(`${BASE}/anime/:id/episodes`, () =>
        HttpResponse.json({
          data: [],
          pagination: { last_visible_page: 0 },
        })
      )
    )

    const count = await getAnimeEpisodeCount(16498)
    expect(count).toBeNull()
  })
})

describe('HTTP errors', () => {
  it('throws on 500 response', async () => {
    server.use(
      http.get(`${BASE}/anime`, () => HttpResponse.json({ message: 'Server Error' }, { status: 500 }))
    )

    await expect(searchAnime('test')).rejects.toThrow('Jikan 500')
  })
})

describe('episodeNameCache', () => {
  it('returns the same promise on duplicate calls without a second network request', async () => {
    let fetchCount = 0
    server.use(
      http.get(`${BASE}/anime/77701/episodes`, () => {
        fetchCount++
        return HttpResponse.json({
          data: [{ mal_id: 3, title: 'Cached Episode' }],
          pagination: { last_visible_page: 1 },
        })
      }),
    )

    const p1 = getEpisodeName(77701, 3)
    const p2 = getEpisodeName(77701, 3)

    expect(p1).toBe(p2)
    await p1
    expect(fetchCount).toBe(1)
  }, 10000)
})

describe('ETag caching', () => {
  it('sends If-None-Match on second call and handles 304 without re-fetching', async () => {
    const captured: Array<{ page: string | null; etag: string | null }> = []

    server.use(
      http.get(`${BASE}/anime/77702/episodes`, ({ request }) => {
        const url = new URL(request.url)
        const page = url.searchParams.get('page')
        const etag = request.headers.get('If-None-Match')
        captured.push({ page, etag })

        if (page === '1') {
          if (etag === '"p1-etag"') return new HttpResponse(null, { status: 304 })
          return HttpResponse.json(
            { data: [{ mal_id: 1, title: 'Ep 1' }], pagination: { last_visible_page: 2 } },
            { headers: { ETag: '"p1-etag"' } },
          )
        }
        if (etag === '"p2-etag"') return new HttpResponse(null, { status: 304 })
        return HttpResponse.json(
          { data: [{ mal_id: 13, title: 'Last Episode' }], pagination: { last_visible_page: 2 } },
          { headers: { ETag: '"p2-etag"' } },
        )
      }),
    )

    const count1 = await getAnimeEpisodeCount(77702)
    const count2 = await getAnimeEpisodeCount(77702)

    expect(count1).toBe(13)
    expect(count2).toBe(13)

    // First call: no ETags known yet
    expect(captured[0]).toEqual({ page: '1', etag: null })
    expect(captured[1]).toEqual({ page: '2', etag: null })
    // Second call: sends stored ETags, server returns 304
    expect(captured[2]).toEqual({ page: '1', etag: '"p1-etag"' })
    expect(captured[3]).toEqual({ page: '2', etag: '"p2-etag"' })
  }, 10000)
})
