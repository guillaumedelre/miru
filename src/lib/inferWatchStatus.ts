import type { MediaType, Status } from '@/types'

interface Params {
  type: MediaType
  isFinished: boolean | undefined
  totalEpisodes?: number
  watchedCount: number
}

export function inferWatchStatus({ type, isFinished, totalEpisodes, watchedCount }: Params): Status {
  if (type === 'movie') {
    return watchedCount > 0 ? 'completed' : 'plan_to_watch'
  }
  if (watchedCount === 0) return 'plan_to_watch'
  if (isFinished && totalEpisodes && watchedCount >= totalEpisodes) return 'completed'
  return 'watching'
}
