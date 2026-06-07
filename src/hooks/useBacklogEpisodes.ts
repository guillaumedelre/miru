import { useEffect } from 'react'
import { useStore } from '@/store'
import { useAsyncState } from '@/hooks/useAsyncState'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { getWeekDates, type WeeklyEpisode } from '@/hooks/useWeeklySchedule'
import { notifyApiError } from '@/lib/errors'

export function useBacklogEpisodes(): { episodes: WeeklyEpisode[]; loading: boolean } {
  const items = useStore(s => s.items)
  const watched = useStore(s => s.watched)
  const { data: rawEpisodes, loading, run } = useAsyncState<WeeklyEpisode[]>([])

  useEffect(() => {
    run(async () => {
      const watching = items.filter(i => i.status === 'watching')
      if (watching.length === 0) return []

      const [weekStart] = getWeekDates(0)
      const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000)
      const pastStart = weekStartTs - 60 * 24 * 60 * 60
      const result: WeeklyEpisode[] = []

      const anilistItems = watching.filter(i => i.source === 'anilist')
      if (anilistItems.length > 0) {
        const ids = anilistItems.map(i => Number(i.sourceId))
        const schedules = await getAiringSchedule(ids, pastStart, weekStartTs - 1).catch((err) => { notifyApiError('useBacklogEpisodes/anilist', err); return [] })
        for (const s of schedules) {
          const item = anilistItems.find(i => i.sourceId === String(s.mediaId))
          if (!item) continue
          const date = new Date(s.airingAt * 1000).toLocaleDateString('sv-SE')
          result.push({ itemId: item.id, title: item.title, coverImage: item.coverImage, episode: s.episode, airingDate: date, type: 'anime' })
        }
      }

      const tmdbItems = watching.filter(i => i.source === 'tmdb' && i.type === 'series')
      await Promise.allSettled(
        tmdbItems.map(async item => {
          const ep = await getNextEpisode(Number(item.sourceId), item.progress).catch((err) => { notifyApiError('useBacklogEpisodes/tmdb', err); return null })
          if (!ep?.air_date || ep.air_date >= weekStart) return
          result.push({
            itemId: item.id, title: item.title, coverImage: item.coverImage,
            episode: ep.episode_number, season: ep.season_number,
            episodeName: ep.name || undefined, airingDate: ep.air_date, type: 'series',
          })
        })
      )

      result.sort((a, b) => b.airingDate.localeCompare(a.airingDate))
      return result
    })
  }, [items, run])

  const episodes = rawEpisodes.filter(ep =>
    !watched.some(w => w.itemId === ep.itemId && w.episode === ep.episode)
  )

  return { episodes, loading }
}
