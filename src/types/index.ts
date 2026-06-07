import { z } from 'zod'

export const TrackedItemSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  source: z.enum(['anilist', 'jikan', 'tmdb']),
  type: z.enum(['anime', 'series', 'movie']),
  title: z.string(),
  coverImage: z.string(),
  status: z.enum(['watching', 'completed', 'plan_to_watch']),
  progress: z.number().int().min(0),
  totalEpisodes: z.number().int().positive().optional(),
  isFinished: z.boolean().optional(),
  malId: z.number().int().positive().optional(),
  episodeDuration: z.number().int().positive().optional(),
})

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
export type TrackedItem = z.infer<typeof TrackedItemSchema>
export type WatchedEpisode = z.infer<typeof WatchedEpisodeSchema>
export type UserData = z.infer<typeof UserDataSchema>

export interface AiringSchedule {
  itemId: string
  episode: number
  airingAt: number // Unix timestamp
}
