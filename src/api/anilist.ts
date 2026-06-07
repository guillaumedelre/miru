import { z } from 'zod'

const ENDPOINT = 'https://graphql.anilist.co'

async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error((json.errors as { message: string }[]).map(e => e.message).join('; '))
  return json.data
}

const AnilistMediaSchema = z.object({
  id: z.number(),
  idMal: z.number().nullable(),
  title: z.object({ romaji: z.string(), english: z.string().nullable() }),
  coverImage: z.object({ large: z.string() }),
  episodes: z.number().nullable(),
  chapters: z.number().nullable(),
  duration: z.number().nullable(),
  type: z.enum(['ANIME', 'MANGA']),
  status: z.string(),
  nextAiringEpisode: z.object({ episode: z.number(), airingAt: z.number() }).nullable(),
})

export type AnilistMedia = z.infer<typeof AnilistMediaSchema> & { _source: 'anilist' }

export interface AnilistSearchResult {
  media: AnilistMedia[]
  hasMore: boolean
}

export async function searchMedia(search: string, type: 'ANIME' | 'MANGA', page = 1): Promise<AnilistSearchResult> {
  const data = await query<{ Page: { media: unknown[]; pageInfo: { hasNextPage: boolean } } }>(`
    query ($search: String, $type: MediaType, $page: Int) {
      Page(page: $page, perPage: 20) {
        pageInfo { hasNextPage }
        media(search: $search, type: $type) {
          id
          idMal
          title { romaji english }
          coverImage { large }
          episodes
          chapters
          duration
          type
          status
          nextAiringEpisode { episode airingAt }
        }
      }
    }
  `, { search, type, page })
  return {
    media: z.array(AnilistMediaSchema).parse(data.Page.media).map(m => ({ ...m, _source: 'anilist' as const })),
    hasMore: data.Page.pageInfo.hasNextPage,
  }
}

const AnilistExternalLinkSchema = z.object({
  url: z.string(),
  site: z.string(),
  type: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
})

export type AnilistExternalLink = z.infer<typeof AnilistExternalLinkSchema>

const AnilistMediaDetailsSchema = z.object({
  id: z.number(),
  title: z.object({ romaji: z.string(), english: z.string().nullable() }),
  description: z.string().nullable(),
  coverImage: z.object({ extraLarge: z.string(), large: z.string() }),
  bannerImage: z.string().nullable(),
  genres: z.array(z.string()),
  averageScore: z.number().nullable(),
  episodes: z.number().nullable(),
  duration: z.number().nullable(),
  status: z.string(),
  startDate: z.object({ year: z.number().nullable() }),
  studios: z.object({ nodes: z.array(z.object({ name: z.string() })) }),
  externalLinks: z.array(AnilistExternalLinkSchema),
})

export type AnilistMediaDetails = z.infer<typeof AnilistMediaDetailsSchema>

export async function getAnilistDetails(id: number): Promise<AnilistMediaDetails> {
  const data = await query<{ Media: unknown }>(`
    query ($id: Int) {
      Media(id: $id) {
        id
        title { romaji english }
        description(asHtml: false)
        coverImage { extraLarge large }
        bannerImage
        genres
        averageScore
        episodes
        duration
        status
        startDate { year }
        studios(isMain: true) { nodes { name } }
        externalLinks { url site type icon color }
      }
    }
  `, { id })
  return AnilistMediaDetailsSchema.parse(data.Media)
}

const AiringSlotSchema = z.object({
  mediaId: z.number(),
  episode: z.number(),
  airingAt: z.number(),
})

export async function getAiringSchedule(
  mediaIds: number[],
  from?: number,
  to?: number,
): Promise<{ mediaId: number; episode: number; airingAt: number }[]> {
  if (mediaIds.length === 0) return []

  const now = Math.floor(Date.now() / 1000)
  const airingAt_greater = from ?? now - 7 * 24 * 60 * 60
  const airingAt_lesser = to ?? now + 7 * 24 * 60 * 60

  const data = await query<{ Page: { airingSchedules: unknown[] } }>(`
    query ($mediaId_in: [Int], $airingAt_greater: Int, $airingAt_lesser: Int) {
      Page(perPage: 50) {
        airingSchedules(
          mediaId_in: $mediaId_in
          airingAt_greater: $airingAt_greater
          airingAt_lesser: $airingAt_lesser
        ) {
          mediaId
          episode
          airingAt
        }
      }
    }
  `, { mediaId_in: mediaIds, airingAt_greater, airingAt_lesser })

  return z.array(AiringSlotSchema).parse(data.Page.airingSchedules)
}

export async function getAnilistGenresBatch(ids: number[]): Promise<Record<number, string[]>> {
  if (ids.length === 0) return {}
  const data = await query<{ Page: { media: { id: number; genres: string[] }[] } }>(`
    query ($id_in: [Int]) {
      Page(perPage: 50) {
        media(id_in: $id_in) { id genres }
      }
    }
  `, { id_in: ids })
  return Object.fromEntries(data.Page.media.map((m) => [m.id, m.genres]))
}
