import { z } from 'zod'

const BaseTrackedItemSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  title: z.string(),
  coverImage: z.string(),
  status: z.enum(['watching', 'completed', 'plan_to_watch']),
  progress: z.number().int().min(0),
  totalEpisodes: z.number().int().positive().optional(),
  isFinished: z.boolean().optional(),
  episodeDuration: z.number().int().positive().optional(),
})

export const AnimeItemSchema = BaseTrackedItemSchema.extend({
  type: z.literal('anime'),
  source: z.enum(['anilist', 'jikan']),
  malId: z.number().int().positive().optional(),
})

export const SeriesItemSchema = BaseTrackedItemSchema.extend({
  type: z.literal('series'),
  source: z.literal('tmdb'),
})

export const MovieItemSchema = BaseTrackedItemSchema.extend({
  type: z.literal('movie'),
  source: z.literal('tmdb'),
})

export const TrackedItemSchema = z.discriminatedUnion('type', [
  AnimeItemSchema,
  SeriesItemSchema,
  MovieItemSchema,
])

export const WatchedEpisodeSchema = z.object({
  itemId: z.string(),
  episode: z.number().int().min(1),
  watchedAt: z.string(),
})

export const UserDataSchema = z.object({
  items: z.array(TrackedItemSchema),
  watched: z.array(WatchedEpisodeSchema),
})

export type Source = 'anilist' | 'jikan' | 'tmdb'
export type MediaType = 'anime' | 'series' | 'movie'
export type Status = 'watching' | 'completed' | 'plan_to_watch'
export type AnimeItem = z.infer<typeof AnimeItemSchema>
export type SeriesItem = z.infer<typeof SeriesItemSchema>
export type MovieItem = z.infer<typeof MovieItemSchema>
export type TrackedItem = z.infer<typeof TrackedItemSchema>
export type WatchedEpisode = z.infer<typeof WatchedEpisodeSchema>
export type UserData = z.infer<typeof UserDataSchema>

export type TrackedItemPatch = Partial<{
  title: string
  coverImage: string
  status: Status
  progress: number
  totalEpisodes: number
  isFinished: boolean
  episodeDuration: number
}>

export function isAnimeItem(item: TrackedItem): item is AnimeItem {
  return item.type === 'anime'
}

export function isSeriesItem(item: TrackedItem): item is SeriesItem {
  return item.type === 'series'
}

export function isMovieItem(item: TrackedItem): item is MovieItem {
  return item.type === 'movie'
}

export interface AiringSchedule {
  itemId: string
  episode: number
  airingAt: number // Unix timestamp
}
