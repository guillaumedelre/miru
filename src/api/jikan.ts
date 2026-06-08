import { z } from 'zod'

const BASE = 'https://api.jikan.moe/v4'

const etagCache = new Map<string, string>()
const responseCache = new Map<string, unknown>()

async function get<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {}
  const etag = etagCache.get(path)
  if (etag) headers['If-None-Match'] = etag

  const res = await fetch(`${BASE}${path}`, { headers })

  if (res.status === 304) return responseCache.get(path) as T

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Jikan ${res.status}: ${path}${body ? ` — ${body}` : ''}`)
  }

  const data = await res.json()
  const newEtag = res.headers.get('ETag')
  if (newEtag) {
    etagCache.set(path, newEtag)
    responseCache.set(path, data)
  }
  return data
}

// Jikan rate limit: 3 req/s and 60 req/min — 1100ms gap stays safely under both
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
let jikanChain = Promise.resolve()

function throttled<T>(fn: () => Promise<T>): Promise<T> {
  const p = jikanChain.then(fn)
  jikanChain = p.then(() => sleep(1100), () => sleep(1100))
  return p
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

const episodeNameCache = new Map<string, Promise<string | null>>()

export function getEpisodeName(malId: number, episodeNumber: number): Promise<string | null> {
  const key = `${malId}-${episodeNumber}`
  if (episodeNameCache.has(key)) return episodeNameCache.get(key)!

  const p = throttled(async () => {
    const page = Math.ceil(episodeNumber / 100)
    const data = await get<{ data: unknown[] }>(`/anime/${malId}/episodes?page=${page}`)
    const episodes = z.array(JikanEpisodeSchema).parse(data.data)
    const ep = episodes.find((e) => e.mal_id === episodeNumber)
    return ep?.title ?? null
  })
  episodeNameCache.set(key, p)
  return p
}

const JikanPaginationSchema = z.object({
  pagination: z.object({ last_visible_page: z.number() }),
})

export function getAnimeEpisodeCount(malId: number): Promise<number | null> {
  // /anime/{id} returns null for ongoing series — use episodes pagination instead
  return throttled(async () => {
    const first = await get<unknown>(`/anime/${malId}/episodes?page=1`)
    const { pagination } = JikanPaginationSchema.parse(first)
    const lastPage = pagination.last_visible_page
    if (lastPage === 0) return null
    const last = await get<{ data: unknown[] }>(`/anime/${malId}/episodes?page=${lastPage}`)
    const episodes = z.array(JikanEpisodeSchema).parse(last.data)
    if (!episodes.length) return null
    return episodes[episodes.length - 1].mal_id
  })
}
