import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { getWeekDates } from '@/hooks/useWeeklySchedule'
import type { TrackedItem } from '@/types'

export interface ReturningEntry {
  item: TrackedItem
  nextDate: string
  nextEpisode: number
  nextSeason?: number
}

export function useReturningShows(): { entries: ReturningEntry[]; loading: boolean } {
  const items = useStore(s => s.items)
  const [entries, setEntries] = useState<ReturningEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const watching = items.filter(i => i.status === 'watching')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (watching.length === 0) { setEntries([]); setLoading(false); return }

    setLoading(true)

    const weekDates = getWeekDates(0)
    const weekEnd = weekDates[6]
    const weekEndTs = Math.floor(new Date(weekEnd + 'T23:59:59').getTime() / 1000)
    const futureEnd = weekEndTs + 365 * 24 * 60 * 60

    async function load() {
      const result: ReturningEntry[] = []

      const anilistItems = watching.filter(i => i.source === 'anilist')
      if (anilistItems.length > 0) {
        const ids = anilistItems.map(i => Number(i.sourceId))
        const schedules = await getAiringSchedule(ids, weekEndTs + 1, futureEnd).catch(() => [])
        const byMedia = new Map<number, { mediaId: number; episode: number; airingAt: number }>()
        for (const s of schedules) {
          const existing = byMedia.get(s.mediaId)
          if (!existing || s.airingAt < existing.airingAt) byMedia.set(s.mediaId, s)
        }
        for (const [mediaId, s] of byMedia) {
          const item = anilistItems.find(i => i.sourceId === String(mediaId))
          if (!item) continue
          result.push({
            item,
            nextDate: new Date(s.airingAt * 1000).toLocaleDateString('sv-SE'),
            nextEpisode: s.episode,
          })
        }
      }

      const tmdbItems = watching.filter(i => i.source === 'tmdb' && i.type === 'series')
      await Promise.allSettled(
        tmdbItems.map(async item => {
          const ep = await getNextEpisode(Number(item.sourceId), item.progress).catch(() => null)
          if (!ep?.air_date || ep.air_date <= weekEnd) return
          result.push({
            item,
            nextDate: ep.air_date,
            nextEpisode: ep.episode_number,
            nextSeason: ep.season_number,
          })
        })
      )

      result.sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      setEntries(result)
      setLoading(false)
    }

    load()
  }, [items])

  return { entries, loading }
}
