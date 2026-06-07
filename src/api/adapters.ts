import { posterUrl, getTvSeasons, type TmdbMedia } from '@/api/tmdb'
import { type AnilistMedia } from '@/api/anilist'
import type { Source, MediaType } from '@/types'

export interface MediaDisplayInfo {
  title: string
  image: string
  source: Source
}

export interface MediaMetadata extends MediaDisplayInfo {
  type: MediaType
  totalEpisodes?: number
  isFinished: boolean
  malId?: number
  episodeDuration?: number
}

export function extractDisplayInfo(result: AnilistMedia | TmdbMedia): MediaDisplayInfo {
  const isAnilist = 'coverImage' in result
  return {
    title: isAnilist
      ? ((result as AnilistMedia).title.english ?? (result as AnilistMedia).title.romaji)
      : ((result as TmdbMedia).name ?? (result as TmdbMedia).title ?? ''),
    image: isAnilist
      ? (result as AnilistMedia).coverImage.large
      : posterUrl((result as TmdbMedia).poster_path),
    source: isAnilist ? 'anilist' : 'tmdb',
  }
}

export async function resolveMediaMetadata(
  result: AnilistMedia | TmdbMedia,
  tab: MediaType,
): Promise<MediaMetadata> {
  const { title, image, source } = extractDisplayInfo(result)

  let totalEpisodes: number | undefined
  let isFinished: boolean
  let malId: number | undefined
  let episodeDuration: number | undefined

  if (source === 'anilist') {
    const a = result as AnilistMedia
    totalEpisodes = a.episodes ?? a.chapters ?? undefined
    isFinished = a.status === 'FINISHED' || a.status === 'CANCELLED'
    if (a.idMal) malId = a.idMal
    if (a.duration) episodeDuration = a.duration
  } else if (tab === 'series') {
    const t = result as TmdbMedia
    totalEpisodes = t.number_of_episodes
    const details = await getTvSeasons(Number(result.id)).catch(() => null)
    isFinished = details?.isFinished ?? false
    if (details) totalEpisodes = details.seasons.reduce((s, season) => s + season.episode_count, 0)
    if (t.episode_run_time?.length) episodeDuration = t.episode_run_time[0]
  } else {
    isFinished = true
    const t = result as TmdbMedia
    if (t.runtime) episodeDuration = t.runtime
  }

  return { title, image, source, type: tab, totalEpisodes, isFinished, malId, episodeDuration }
}
