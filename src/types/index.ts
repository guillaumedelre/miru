export type Source = 'anilist' | 'jikan' | 'tmdb'
export type MediaType = 'anime' | 'series' | 'movie'
export type Status = 'watching' | 'completed' | 'plan_to_watch'

export interface TrackedItem {
  id: string
  sourceId: string
  source: Source
  type: MediaType
  title: string
  coverImage: string
  status: Status
  progress: number
  totalEpisodes?: number
  isFinished?: boolean
  malId?: number
  episodeDuration?: number
}

export interface WatchedEpisode {
  itemId: string
  episode: number
  watchedAt: string
}

export interface AiringSchedule {
  itemId: string
  episode: number
  airingAt: number // Unix timestamp
}
