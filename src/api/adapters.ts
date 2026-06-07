import { posterUrl, type TmdbMedia } from '@/api/tmdb'
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
  if (result._source === 'anilist') {
    return {
      title: result.title.english ?? result.title.romaji,
      image: result.coverImage.large,
      source: 'anilist',
    }
  }
  return {
    title: result.name ?? result.title ?? '',
    image: posterUrl(result.poster_path),
    source: 'tmdb',
  }
}

export interface TvDetails {
  seasons: { episode_count: number }[]
  isFinished: boolean
}

export type Pending = MediaMetadata & { result: AnilistMedia | TmdbMedia }

export function resolveMediaMetadata(
  result: AnilistMedia | TmdbMedia,
  tab: MediaType,
  tvDetails?: TvDetails | null,
): MediaMetadata {
  const { title, image, source } = extractDisplayInfo(result)

  let totalEpisodes: number | undefined
  let isFinished: boolean
  let malId: number | undefined
  let episodeDuration: number | undefined

  if (result._source === 'anilist') {
    totalEpisodes = result.episodes ?? result.chapters ?? undefined
    isFinished = result.status === 'FINISHED' || result.status === 'CANCELLED'
    if (result.idMal) malId = result.idMal
    if (result.duration) episodeDuration = result.duration
  } else if (tab === 'series') {
    isFinished = tvDetails?.isFinished ?? false
    totalEpisodes = tvDetails
      ? tvDetails.seasons.reduce((s, season) => s + season.episode_count, 0)
      : result.number_of_episodes
    if (result.episode_run_time?.length) episodeDuration = result.episode_run_time[0]
  } else {
    isFinished = true
    if (result.runtime) episodeDuration = result.runtime
  }

  return { title, image, source, type: tab, totalEpisodes, isFinished, malId, episodeDuration }
}
