import { useEffect } from 'react'
import { useStore } from '@/store'
import { useAsyncState } from '@/hooks/useAsyncState'
import { getWeekDates, type WeeklyEpisode } from '@/hooks/useWeeklySchedule'
import { fetchAiringData } from '@/lib/fetchAiringData'
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

      const { animeSlots, seriesEps } = await fetchAiringData(
        watching,
        pastStart,
        weekStartTs - 1,
        (ctx, err) => notifyApiError(`useBacklogEpisodes/${ctx}`, err),
      )

      const result: WeeklyEpisode[] = []

      for (const { item, slot } of animeSlots) {
        const date = new Date(slot.airingAt * 1000).toLocaleDateString('sv-SE')
        result.push({ itemId: item.id, title: item.title, coverImage: item.coverImage, episode: slot.episode, airingDate: date, type: 'anime' })
      }

      for (const { item, ep } of seriesEps) {
        if (!ep?.air_date || ep.air_date >= weekStart) continue
        result.push({
          itemId: item.id, title: item.title, coverImage: item.coverImage,
          episode: ep.episode_number, season: ep.season_number,
          episodeName: ep.name || undefined, airingDate: ep.air_date, type: 'series',
        })
      }

      result.sort((a, b) => b.airingDate.localeCompare(a.airingDate))
      return result
    })
  }, [items, watched, run])

  const episodes = rawEpisodes.filter(ep =>
    !watched.some(w => w.itemId === ep.itemId && w.episode === ep.episode)
  )

  return { episodes, loading }
}
