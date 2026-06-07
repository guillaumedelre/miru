import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { getWeekDates, type WeeklyEpisode } from '@/hooks/useWeeklySchedule'

export function useBacklogEpisodes(): { episodes: WeeklyEpisode[]; loading: boolean } {
  const items = useStore(s => s.items)
  const watched = useStore(s => s.watched)
  const [rawEpisodes, setRawEpisodes] = useState<WeeklyEpisode[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const watching = items.filter(i => i.status === 'watching')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (watching.length === 0) { setRawEpisodes([]); setLoading(false); return }

    setLoading(true)

    const [weekStart] = getWeekDates(0)
    const weekStartTs = Math.floor(new Date(weekStart).getTime() / 1000)
    const pastStart = weekStartTs - 60 * 24 * 60 * 60

    async function load() {
      const result: WeeklyEpisode[] = []

      const anilistItems = watching.filter(i => i.source === 'anilist')
      if (anilistItems.length > 0) {
        const ids = anilistItems.map(i => Number(i.sourceId))
        const schedules = await getAiringSchedule(ids, pastStart, weekStartTs - 1).catch(() => [])
        for (const s of schedules) {
          const item = anilistItems.find(i => i.sourceId === String(s.mediaId))
          if (!item) continue
          const date = new Date(s.airingAt * 1000).toLocaleDateString('sv-SE')
          result.push({
            itemId: item.id,
            title: item.title,
            coverImage: item.coverImage,
            episode: s.episode,
            airingDate: date,
            type: 'anime',
          })
        }
      }

      const tmdbItems = watching.filter(i => i.source === 'tmdb' && i.type === 'series')
      await Promise.allSettled(
        tmdbItems.map(async item => {
          const ep = await getNextEpisode(Number(item.sourceId), item.progress).catch(() => null)
          if (!ep?.air_date || ep.air_date >= weekStart) return
          result.push({
            itemId: item.id,
            title: item.title,
            coverImage: item.coverImage,
            episode: ep.episode_number,
            season: ep.season_number,
            episodeName: ep.name || undefined,
            airingDate: ep.air_date,
            type: 'series',
          })
        })
      )

      result.sort((a, b) => b.airingDate.localeCompare(a.airingDate))
      setRawEpisodes(result)
      setLoading(false)
    }

    load()
  }, [items])

  const episodes = rawEpisodes.filter(ep =>
    !watched.some(w => w.itemId === ep.itemId && w.episode === ep.episode)
  )

  return { episodes, loading }
}
