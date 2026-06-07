import { z } from 'zod'

const BASE = 'https://api.jikan.moe/v4'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Jikan ${res.status}: ${path}`)
  return res.json()
}

const JikanMediaSchema = z.object({
  mal_id: z.number(),
  title: z.string(),
  images: z.object({ jpg: z.object({ image_url: z.string() }) }),
  episodes: z.number().nullable(),
  type: z.string(),
})

export type JikanMedia = z.infer<typeof JikanMediaSchema>

export async function searchAnime(query: string): Promise<JikanMedia[]> {
  const data = await get<{ data: unknown[] }>(`/anime?q=${encodeURIComponent(query)}&limit=10`)
  return z.array(JikanMediaSchema).parse(data.data)
}

export async function searchManga(query: string): Promise<JikanMedia[]> {
  const data = await get<{ data: unknown[] }>(`/manga?q=${encodeURIComponent(query)}&limit=10`)
  return z.array(JikanMediaSchema).parse(data.data)
}

const JikanEpisodeSchema = z.object({
  mal_id: z.number(),
  title: z.string(),
})

export async function getEpisodeName(malId: number, episodeNumber: number): Promise<string | null> {
  const page = Math.ceil(episodeNumber / 100)
  const data = await get<{ data: unknown[] }>(`/anime/${malId}/episodes?page=${page}`)
  const episodes = z.array(JikanEpisodeSchema).parse(data.data)
  const ep = episodes.find((e) => e.mal_id === episodeNumber)
  return ep?.title ?? null
}

const JikanPaginationSchema = z.object({
  pagination: z.object({ last_visible_page: z.number() }),
})

export async function getAnimeEpisodeCount(malId: number): Promise<number | null> {
  // /anime/{id} returns null for ongoing series — use episodes pagination instead
  const first = await get<unknown>(`/anime/${malId}/episodes?page=1`)
  const { pagination } = JikanPaginationSchema.parse(first)
  const lastPage = pagination.last_visible_page
  if (lastPage === 0) return null
  const last = await get<{ data: unknown[] }>(`/anime/${malId}/episodes?page=${lastPage}`)
  const episodes = z.array(JikanEpisodeSchema).parse(last.data)
  if (!episodes.length) return null
  return episodes[episodes.length - 1].mal_id
}
