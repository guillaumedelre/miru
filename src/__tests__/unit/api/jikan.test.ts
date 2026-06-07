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
