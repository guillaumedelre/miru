import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { searchMedia, getAnilistDetails, getAiringSchedule, getAnilistGenresBatch } from '@/api/anilist'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

describe('searchMedia', () => {
  it('parses returned media array and hasMore=false', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              media: [
                {
                  id: 1,
                  idMal: 42,
                  title: { romaji: 'Naruto', english: 'Naruto' },
                  coverImage: { large: 'https://img.example.com/naruto.jpg' },
                  episodes: 220,
                  chapters: null,
                  duration: 23,
                  type: 'ANIME',
                  status: 'FINISHED',
                  nextAiringEpisode: null,
                },
              ],
            },
          },
        })
      )
    )

    const { media, hasMore } = await searchMedia('Naruto', 'ANIME')

    expect(media).toHaveLength(1)
    expect(media[0]).toMatchObject({
      id: 1,
      idMal: 42,
      title: { romaji: 'Naruto', english: 'Naruto' },
    })
    expect(hasMore).toBe(false)
  })

  it('returns hasMore=true when pageInfo.hasNextPage is true', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              pageInfo: { hasNextPage: true },
              media: [
                {
                  id: 2, idMal: null,
                  title: { romaji: 'One Piece', english: 'One Piece' },
                  coverImage: { large: 'https://img.example.com/op.jpg' },
                  episodes: null, chapters: null, duration: 24,
                  type: 'ANIME', status: 'RELEASING', nextAiringEpisode: null,
                },
              ],
            },
          },
        })
      )
    )

    const { hasMore } = await searchMedia('One Piece', 'ANIME', 1)
    expect(hasMore).toBe(true)
  })

  it('throws when GraphQL returns a single error', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({ errors: [{ message: 'Not found' }] })
      )
    )

    await expect(searchMedia('unknown', 'ANIME')).rejects.toThrow('Not found')
  })

  it('joins multiple GraphQL errors with semicolon', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({ errors: [{ message: 'Error one' }, { message: 'Error two' }] })
      )
    )

    await expect(searchMedia('unknown', 'ANIME')).rejects.toThrow('Error one; Error two')
  })

  it('tags returned media with _source: anilist', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              media: [{
                id: 1, idMal: null,
                title: { romaji: 'Test', english: null },
                coverImage: { large: 'https://img.example.com/test.jpg' },
                episodes: 12, chapters: null, duration: 24,
                type: 'ANIME', status: 'FINISHED', nextAiringEpisode: null,
              }],
            },
          },
        })
      )
    )
    const { media } = await searchMedia('Test', 'ANIME')
    expect(media[0]._source).toBe('anilist')
  })

  it('throws on invalid response shape (zod parse error)', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              pageInfo: { hasNextPage: false },
              media: [{ id: 'not-a-number', title: null }],
            },
          },
        })
      )
    )

    await expect(searchMedia('broken', 'ANIME')).rejects.toThrow()
  })
})

describe('getAnilistDetails', () => {
  it('parses the Media object', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Media: {
              id: 101,
              title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
              description: 'Humanity fights titans.',
              coverImage: {
                extraLarge: 'https://img.example.com/aot-xl.jpg',
                large: 'https://img.example.com/aot.jpg',
              },
              bannerImage: 'https://img.example.com/aot-banner.jpg',
              genres: ['Action', 'Drama'],
              averageScore: 84,
              episodes: 25,
              duration: 24,
              status: 'FINISHED',
              startDate: { year: 2013 },
              studios: { nodes: [{ name: 'Wit Studio' }] },
              externalLinks: [
                { url: 'https://crunchyroll.com/aot', site: 'Crunchyroll', type: 'STREAMING', icon: null, color: null },
              ],
            },
          },
        })
      )
    )

    const details = await getAnilistDetails(101)

    expect(details.id).toBe(101)
    expect(details.title.romaji).toBe('Shingeki no Kyojin')
    expect(details.title.english).toBe('Attack on Titan')
    expect(details.genres).toEqual(['Action', 'Drama'])
    expect(details.averageScore).toBe(84)
    expect(details.episodes).toBe(25)
    expect(details.studios.nodes[0].name).toBe('Wit Studio')
    expect(details.externalLinks[0].site).toBe('Crunchyroll')
    expect(details.startDate.year).toBe(2013)
  })
})

describe('getAiringSchedule', () => {
  it('returns airing slots for given ids', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              airingSchedules: [
                { mediaId: 101, episode: 5, airingAt: 1700000000 },
                { mediaId: 202, episode: 3, airingAt: 1700086400 },
              ],
            },
          },
        })
      )
    )

    const slots = await getAiringSchedule([101, 202])

    expect(slots).toHaveLength(2)
    expect(slots[0]).toEqual({ mediaId: 101, episode: 5, airingAt: 1700000000 })
    expect(slots[1]).toEqual({ mediaId: 202, episode: 3, airingAt: 1700086400 })
  })

  it('returns [] immediately without making a request when ids is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await getAiringSchedule([])

    expect(result).toEqual([])
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})

describe('getAnilistGenresBatch', () => {
  it('returns a record mapping id to genres', async () => {
    server.use(
      http.post(ANILIST_ENDPOINT, async () =>
        HttpResponse.json({
          data: {
            Page: {
              media: [
                { id: 101, genres: ['Action', 'Drama'] },
                { id: 202, genres: ['Fantasy', 'Adventure'] },
              ],
            },
          },
        })
      )
    )

    const genres = await getAnilistGenresBatch([101, 202])

    expect(genres).toEqual({
      101: ['Action', 'Drama'],
      202: ['Fantasy', 'Adventure'],
    })
  })

  it('returns {} immediately without making a request when ids is empty', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    const result = await getAnilistGenresBatch([])

    expect(result).toEqual({})
    expect(fetchSpy).not.toHaveBeenCalled()

    fetchSpy.mockRestore()
  })
})
