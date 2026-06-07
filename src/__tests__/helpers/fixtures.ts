import type { TrackedItem, WatchedEpisode } from '@/types'

export const animeItem: TrackedItem = {
  id: 'item-anime-1',
  sourceId: '101',
  source: 'anilist',
  type: 'anime',
  title: 'Shingeki no Kyojin',
  coverImage: 'https://cdn.anilist.co/cover.jpg',
  status: 'watching',
  progress: 4,
  totalEpisodes: 25,
  malId: 16498,
  episodeDuration: 24,
}

export const seriesItem: TrackedItem = {
  id: 'item-series-1',
  sourceId: '1396',
  source: 'tmdb',
  type: 'series',
  title: 'Breaking Bad',
  coverImage: 'https://image.tmdb.org/t/p/w300/ggFHVNu6YYI5L9pCfOacjizRGt.jpg',
  status: 'watching',
  progress: 7,
  totalEpisodes: 62,
  episodeDuration: 47,
}

export const movieItem: TrackedItem = {
  id: 'item-movie-1',
  sourceId: '550',
  source: 'tmdb',
  type: 'movie',
  title: 'Fight Club',
  coverImage: 'https://image.tmdb.org/t/p/w300/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
  status: 'completed',
  progress: 1,
  totalEpisodes: 1,
  episodeDuration: 139,
  isFinished: true,
}

export const planItem: TrackedItem = {
  id: 'item-plan-1',
  sourceId: '202',
  source: 'anilist',
  type: 'anime',
  title: 'Fullmetal Alchemist: Brotherhood',
  coverImage: 'https://cdn.anilist.co/fmab.jpg',
  status: 'plan_to_watch',
  progress: 0,
  totalEpisodes: 64,
  malId: 5114,
}

export const completedAnimeItem: TrackedItem = {
  id: 'item-anime-2',
  sourceId: '202',
  source: 'anilist',
  type: 'anime',
  title: 'Fullmetal Alchemist: Brotherhood',
  coverImage: 'https://cdn.anilist.co/fmab.jpg',
  status: 'completed',
  progress: 64,
  totalEpisodes: 64,
  malId: 5114,
  episodeDuration: 24,
  isFinished: true,
}

export const watchedEpisodes: WatchedEpisode[] = [
  { itemId: 'item-anime-1', episode: 1, watchedAt: '2024-01-01T00:00:00Z' },
  { itemId: 'item-anime-1', episode: 2, watchedAt: '2024-01-08T00:00:00Z' },
  { itemId: 'item-anime-1', episode: 3, watchedAt: '2024-01-15T00:00:00Z' },
  { itemId: 'item-anime-1', episode: 4, watchedAt: '2024-01-22T00:00:00Z' },
  { itemId: 'item-series-1', episode: 1, watchedAt: '2024-01-01T00:00:00Z' },
  { itemId: 'item-series-1', episode: 2, watchedAt: '2024-01-08T00:00:00Z' },
  { itemId: 'item-movie-1', episode: 1, watchedAt: '2024-02-01T00:00:00Z' },
]
