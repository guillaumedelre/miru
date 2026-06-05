const BASE = 'https://api.themoviedb.org/3'
const API_KEY = import.meta.env.VITE_TMDB_API_KEY as string

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  url.searchParams.set('api_key', API_KEY)
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v)
  const res = await fetch(url.toString())
  if (!res.ok) throw new Error(`TMDB ${res.status}: ${path}`)
  return res.json()
}

export interface TmdbMedia {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  media_type: 'movie' | 'tv'
  number_of_episodes?: number
  runtime?: number
  episode_run_time?: number[]
}

export interface TmdbEpisode {
  episode_number: number
  name: string
  air_date: string
  season_number: number
}

export interface TmdbSeason {
  season_number: number
  name: string
  episode_count: number
}

export interface TmdbEpisodeDetail {
  episode_number: number
  name: string
}

export interface TmdbDetails {
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  genres: { id: number; name: string }[]
  vote_average: number
  // movie
  runtime?: number
  release_date?: string
  // tv
  number_of_seasons?: number
  number_of_episodes?: number
  first_air_date?: string
  status?: string
}

export async function getTmdbDetails(id: number, type: 'movie' | 'tv'): Promise<TmdbDetails> {
  return get<TmdbDetails>(`/${type}/${id}`, { language: 'fr-FR' })
}

export interface TmdbProvider {
  provider_id: number
  provider_name: string
  logo_path: string
}

export interface TmdbWatchProviders {
  providers: TmdbProvider[]
  link: string | null
}

export async function getWatchProviders(id: number, type: 'movie' | 'tv'): Promise<TmdbWatchProviders> {
  const data = await get<{ results: Record<string, { link: string; flatrate?: TmdbProvider[]; rent?: TmdbProvider[]; buy?: TmdbProvider[] }> }>(
    `/${type}/${id}/watch/providers`
  )
  const country = data.results['FR'] ?? data.results['US'] ?? null
  if (!country) return { providers: [], link: null }
  const seen = new Set<number>()
  const providers: TmdbProvider[] = []
  for (const p of [...(country.flatrate ?? []), ...(country.rent ?? []), ...(country.buy ?? [])]) {
    if (!seen.has(p.provider_id)) { seen.add(p.provider_id); providers.push(p) }
  }
  return { providers, link: country.link ?? null }
}

export async function getTvSeasons(tvId: number): Promise<{ seasons: TmdbSeason[]; isFinished: boolean }> {
  const data = await get<{ seasons: TmdbSeason[]; status: string }>(`/tv/${tvId}`, { language: 'fr-FR' })
  return {
    seasons: data.seasons.filter((s) => s.season_number > 0),
    isFinished: data.status === 'Ended' || data.status === 'Canceled',
  }
}

export async function getSeasonEpisodes(tvId: number, seasonNumber: number): Promise<TmdbEpisodeDetail[]> {
  const data = await get<{ episodes: TmdbEpisodeDetail[] }>(`/tv/${tvId}/season/${seasonNumber}`, { language: 'fr-FR' })
  return data.episodes
}

export async function searchMulti(query: string): Promise<TmdbMedia[]> {
  const data = await get<{ results: TmdbMedia[] }>('/search/multi', { query, language: 'fr-FR' })
  return data.results.filter(r => r.media_type === 'movie' || r.media_type === 'tv')
}

export async function getNextEpisode(tvId: number, progress: number): Promise<TmdbEpisode | null> {
  const nextEp = progress + 1
  const data = await get<{ seasons: { season_number: number; episode_count: number }[] }>(`/tv/${tvId}`)

  let counted = 0
  for (const season of data.seasons) {
    if (season.season_number === 0) continue
    if (counted + season.episode_count >= nextEp) {
      const epInSeason = nextEp - counted
      const ep = await get<TmdbEpisode>(`/tv/${tvId}/season/${season.season_number}/episode/${epInSeason}`)
      return ep
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
