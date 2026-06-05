const BASE = 'https://api.jikan.moe/v4'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`Jikan ${res.status}: ${path}`)
  return res.json()
}

export interface JikanMedia {
  mal_id: number
  title: string
  images: { jpg: { image_url: string } }
  episodes: number | null
  type: string
}

export async function searchAnime(query: string): Promise<JikanMedia[]> {
  const data = await get<{ data: JikanMedia[] }>(`/anime?q=${encodeURIComponent(query)}&limit=10`)
  return data.data
}

export async function searchManga(query: string): Promise<JikanMedia[]> {
  const data = await get<{ data: JikanMedia[] }>(`/manga?q=${encodeURIComponent(query)}&limit=10`)
  return data.data
}

export async function getEpisodeName(malId: number, episodeNumber: number): Promise<string | null> {
  const page = Math.ceil(episodeNumber / 100)
  const data = await get<{ data: { mal_id: number; title: string }[] }>(`/anime/${malId}/episodes?page=${page}`)
  const ep = data.data.find((e) => e.mal_id === episodeNumber)
  return ep?.title ?? null
}

export async function getAnimeEpisodeCount(malId: number): Promise<number | null> {
  // /anime/{id} returns null for ongoing series — use episodes pagination instead
  const first = await get<{ pagination: { last_visible_page: number } }>(`/anime/${malId}/episodes?page=1`)
  const lastPage = first.pagination.last_visible_page
  if (lastPage === 0) return null
  const last = await get<{ data: { mal_id: number }[] }>(`/anime/${malId}/episodes?page=${lastPage}`)
  const episodes = last.data
  if (!episodes.length) return null
  return episodes[episodes.length - 1].mal_id
}
