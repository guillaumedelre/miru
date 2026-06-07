import { http, HttpResponse } from 'msw'

const ENDPOINT = 'https://graphql.anilist.co'

export const mockAnilistMedia = {
  id: 101,
  idMal: 16498,
  title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
  coverImage: { large: 'https://cdn.anilist.co/cover.jpg' },
  episodes: 25,
  chapters: null,
  duration: 24,
  type: 'ANIME' as const,
  status: 'FINISHED',
  nextAiringEpisode: null,
}

export const mockAnilistDetails = {
  id: 101,
  title: { romaji: 'Shingeki no Kyojin', english: 'Attack on Titan' },
  description: 'Humanity fights giants.',
  coverImage: {
    extraLarge: 'https://cdn.anilist.co/extralarge.jpg',
    large: 'https://cdn.anilist.co/cover.jpg',
  },
  bannerImage: 'https://cdn.anilist.co/banner.jpg',
  genres: ['Action', 'Drama'],
  averageScore: 84,
  episodes: 25,
  duration: 24,
  status: 'FINISHED',
  startDate: { year: 2013 },
  studios: { nodes: [{ name: 'Wit Studio' }] },
  externalLinks: [],
}

export const mockAiringSlot = {
  mediaId: 101,
  episode: 5,
  airingAt: 1700000000,
}

export const anilistHandlers = [
  http.post(ENDPOINT, async ({ request }) => {
    const body = await request.json() as { query: string; variables: Record<string, unknown> }

    if (body.query.includes('id_in') || body.query.includes('id_in:')) {
      return HttpResponse.json({
        data: {
          Page: { media: [{ id: 101, genres: ['Action', 'Drama'] }] },
        },
      })
    }

    if (body.query.includes('airingSchedules')) {
      return HttpResponse.json({
        data: {
          Page: { airingSchedules: [mockAiringSlot] },
        },
      })
    }

    if (body.query.includes('Media(id') || (body.variables && 'id' in body.variables && !body.variables['search'])) {
      return HttpResponse.json({
        data: { Media: mockAnilistDetails },
      })
    }

    return HttpResponse.json({
      data: { Page: { media: [mockAnilistMedia] } },
    })
  }),
]
