import { z } from 'zod'

const BASE = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', API_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`TMDB ${res.status}: ${path}${body ? ` — ${body}` : ''}`)
  }
  return res.json()
}

async function getAndParse<T>(path: string, schema: z.ZodType<T>, params: Record<string, string> = {}): Promise<T> {
  const data = await get<unknown>(path, params)
  return schema.parse(data)
}

const TmdbMediaSchema = z.object({
  id: z.number(),
  title: z.string().optional(),
  name: z.string().optional(),
  poster_path: z.string().nullable(),
  media_type: z.enum(['movie', 'tv']),
  number_of_episodes: z.number().optional(),
  runtime: z.number().optional(),
  episode_run_time: z.array(z.number()).optional(),
})

export type TmdbMedia = z.infer<typeof TmdbMediaSchema> & { _source: 'tmdb' }

const TmdbEpisodeSchema = z.object({
  episode_number: z.number(),
  name: z.string(),
  air_date: z.string(),
  season_number: z.number(),
})

export type TmdbEpisode = z.infer<typeof TmdbEpisodeSchema>

const TmdbSeasonSchema = z.object({
  season_number: z.number(),
  name: z.string(),
  episode_count: z.number(),
})

export type TmdbSeason = z.infer<typeof TmdbSeasonSchema>

const TmdbEpisodeDetailSchema = z.object({
  episode_number: z.number(),
  name: z.string(),
})

export type TmdbEpisodeDetail = z.infer<typeof TmdbEpisodeDetailSchema>

const TmdbDetailsSchema = z.object({
  title: z.string().optional(),
  name: z.string().optional(),
  overview: z.string(),
  poster_path: z.string().nullable(),
  backdrop_path: z.string().nullable(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })),
  vote_average: z.number(),
  runtime: z.number().optional(),
  release_date: z.string().optional(),
  number_of_seasons: z.number().optional(),
  number_of_episodes: z.number().optional(),
  first_air_date: z.string().optional(),
  status: z.string().optional(),
})

export type TmdbDetails = z.infer<typeof TmdbDetailsSchema>

export async function getTmdbDetails(id: number, type: 'movie' | 'tv'): Promise<TmdbDetails> {
  return getAndParse(`/${type}/${id}`, TmdbDetailsSchema, { language: 'fr-FR' })
}

const TmdbProviderSchema = z.object({
  provider_id: z.number(),
  provider_name: z.string(),
  logo_path: z.string(),
})

export type TmdbProvider = z.infer<typeof TmdbProviderSchema>

export interface TmdbWatchProviders {
  providers: TmdbProvider[]
  link: string | null
}

export async function getWatchProviders(id: number, type: 'movie' | 'tv'): Promise<TmdbWatchProviders> {
  const data = await get<{ results: Record<string, { link: string; flatrate?: unknown[]; rent?: unknown[]; buy?: unknown[] }> }>(
    `/${type}/${id}/watch/providers`
  )
  const country = data.results['FR'] ?? data.results['US'] ?? null
  if (!country) return { providers: [], link: null }
  const seen = new Set<number>()
  const providers: TmdbProvider[] = []
  for (const p of [...(country.flatrate ?? []), ...(country.rent ?? []), ...(country.buy ?? [])]) {
    const parsed = TmdbProviderSchema.safeParse(p)
    if (parsed.success && !seen.has(parsed.data.provider_id)) {
      seen.add(parsed.data.provider_id)
      providers.push(parsed.data)
    }
  }
  return { providers, link: country.link ?? null }
}

export async function getTvSeasons(tvId: number): Promise<{ seasons: TmdbSeason[]; isFinished: boolean }> {
  const data = await get<{ seasons: unknown[]; status: string }>(`/tv/${tvId}`, { language: 'fr-FR' })
  const seasons = z.array(TmdbSeasonSchema).parse(data.seasons).filter((s) => s.season_number > 0)
  return {
    seasons,
    isFinished: data.status === 'Ended' || data.status === 'Canceled',
  }
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<TmdbEpisodeDetail[]> {
  const { episodes } = await getAndParse(
    `/tv/${tvId}/season/${seasonNumber}`,
    z.object({ episodes: z.array(TmdbEpisodeDetailSchema) }),
    { language: 'fr-FR' },
  )
  return episodes
}

export interface TmdbSearchResult {
  results: TmdbMedia[]
  hasMore: boolean
}

async function searchByEndpoint(
  endpoint: '/search/tv' | '/search/movie',
  mediaType: 'tv' | 'movie',
  q: string,
  page: number,
): Promise<TmdbSearchResult> {
  const data = await get<{ results: unknown[]; page: number; total_pages: number }>(
    endpoint, { query: q, language: 'fr-FR', page: String(page) }
  )
  const results = data.results
    .map(r => TmdbMediaSchema.safeParse({ ...(r as object), media_type: mediaType }))
    .filter(r => r.success)
    .map(r => ({ ...r.data, _source: 'tmdb' as const }))
  return { results, hasMore: data.page < data.total_pages }
}

export async function searchTv(q: string, page = 1): Promise<TmdbSearchResult> {
  return searchByEndpoint('/search/tv', 'tv', q, page)
}

export async function searchMovie(q: string, page = 1): Promise<TmdbSearchResult> {
  return searchByEndpoint('/search/movie', 'movie', q, page)
}

export async function getNextEpisode(tvId: number, progress: number): Promise<TmdbEpisode | null> {
  const nextEp = progress + 1
  const data = await get<{ seasons: { season_number: number; episode_count: number }[] }>(`/tv/${tvId}`)

  let counted = 0
  for (const season of data.seasons) {
    if (season.season_number === 0) continue
    if (counted + season.episode_count >= nextEp) {
      const epInSeason = nextEp - counted
      const ep = await get<unknown>(`/tv/${tvId}/season/${season.season_number}/episode/${epInSeason}`)
      return TmdbEpisodeSchema.parse(ep)
    }
    counted += season.episode_count
  }
  return null
}

export async function getTmdbGenres(id: number, type: 'movie' | 'tv'): Promise<string[]> {
  const data = await get<{ genres: { id: number; name: string }[] }>(`/${type}/${id}`, { language: 'fr-FR' })
  return data.genres.map((g) => g.name)
}

export function posterUrl(path: string | null): string {
  if (!path) return '/placeholder.png'
  return `https://image.tmdb.org/t/p/w300${path}`
}
