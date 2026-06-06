const ENDPOINT = 'https://graphql.anilist.co'

async function query<T>(q: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: q, variables }),
  })
  const json = await res.json()
  if (json.errors) throw new Error(json.errors[0].message)
  return json.data
}

export interface AnilistMedia {
  id: number
  idMal: number | null
  title: { romaji: string; english: string | null }
  coverImage: { large: string }
  episodes: number | null
  chapters: number | null
  duration: number | null
  type: 'ANIME' | 'MANGA'
  status: string
  nextAiringEpisode: { episode: number; airingAt: number } | null
}

export async function searchMedia(search: string, type: 'ANIME' | 'MANGA'): Promise<AnilistMedia[]> {
  const data = await query<{ Page: { media: AnilistMedia[] } }>(`
    query ($search: String, $type: MediaType) {
      Page(perPage: 50) {
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
  `, { search, type })
  return data.Page.media
}

export interface AnilistExternalLink {
  url: string
  site: string
  type: string
  icon: string | null
  color: string | null
}

export interface AnilistMediaDetails {
  id: number
  title: { romaji: string; english: string | null }
  description: string | null
  coverImage: { extraLarge: string; large: string }
  bannerImage: string | null
  genres: string[]
  averageScore: number | null
  episodes: number | null
  duration: number | null
  status: string
  startDate: { year: number | null }
  studios: { nodes: { name: string }[] }
  externalLinks: AnilistExternalLink[]
}

export async function getAnilistDetails(id: number): Promise<AnilistMediaDetails> {
  const data = await query<{ Media: AnilistMediaDetails }>(`
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
  return data.Media
}

export async function getAiringSchedule(
  mediaIds: number[],
  from?: number,
  to?: number,
): Promise<{ mediaId: number; episode: number; airingAt: number }[]> {
  if (mediaIds.length === 0) return []

  const now = Math.floor(Date.now() / 1000)
  const airingAt_greater = from ?? now - 7 * 24 * 60 * 60
  const airingAt_lesser = to ?? now + 7 * 24 * 60 * 60

  const data = await query<{ Page: { airingSchedules: { mediaId: number; episode: number; airingAt: number }[] } }>(`
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

  return data.Page.airingSchedules
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
