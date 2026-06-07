import { inferWatchStatus } from '@/lib/inferWatchStatus'

describe('inferWatchStatus', () => {
  describe('movie', () => {
    it('returns completed when watchedCount > 0', () => {
      expect(inferWatchStatus({ type: 'movie', isFinished: true, watchedCount: 1 })).toBe('completed')
    })

    it('returns plan_to_watch when watchedCount = 0', () => {
      expect(inferWatchStatus({ type: 'movie', isFinished: false, watchedCount: 0 })).toBe('plan_to_watch')
    })

    it('ignores isFinished and totalEpisodes for movies', () => {
      expect(inferWatchStatus({ type: 'movie', isFinished: false, totalEpisodes: 1, watchedCount: 1 })).toBe('completed')
    })
  })

  describe('anime and series', () => {
    it('returns plan_to_watch when watchedCount = 0', () => {
      expect(inferWatchStatus({ type: 'anime', isFinished: false, watchedCount: 0 })).toBe('plan_to_watch')
      expect(inferWatchStatus({ type: 'series', isFinished: true, totalEpisodes: 12, watchedCount: 0 })).toBe('plan_to_watch')
    })

    it('returns completed when isFinished and watchedCount >= totalEpisodes', () => {
      expect(inferWatchStatus({ type: 'anime', isFinished: true, totalEpisodes: 12, watchedCount: 12 })).toBe('completed')
      expect(inferWatchStatus({ type: 'anime', isFinished: true, totalEpisodes: 12, watchedCount: 13 })).toBe('completed')
    })

    it('returns watching when finished but count < total', () => {
      expect(inferWatchStatus({ type: 'anime', isFinished: true, totalEpisodes: 12, watchedCount: 6 })).toBe('watching')
    })

    it('returns watching when ongoing even if watchedCount >= totalEpisodes', () => {
      expect(inferWatchStatus({ type: 'series', isFinished: false, totalEpisodes: 12, watchedCount: 12 })).toBe('watching')
    })

    it('returns watching when totalEpisodes is unknown', () => {
      expect(inferWatchStatus({ type: 'anime', isFinished: true, totalEpisodes: undefined, watchedCount: 5 })).toBe('watching')
    })

    it('handles undefined isFinished as falsy', () => {
      expect(inferWatchStatus({ type: 'anime', isFinished: undefined, totalEpisodes: 12, watchedCount: 12 })).toBe('watching')
    })
  })
})
