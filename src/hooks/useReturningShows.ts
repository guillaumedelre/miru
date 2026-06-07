import { useEffect } from 'react'
import { useStore } from '@/store'
import { useAsyncState } from '@/hooks/useAsyncState'
import { getWeekDates } from '@/hooks/useWeeklySchedule'
import { fetchAiringData } from '@/lib/fetchAiringData'
import { notifyApiError } from '@/lib/errors'
import type { TrackedItem } from '@/types'

export interface ReturningEntry {
  item: TrackedItem
  nextDate: string
  nextEpisode: number
  nextSeason?: number
}

export function useReturningShows(): { entries: ReturningEntry[]; loading: boolean } {
  const items = useStore(s => s.items)
  const { data: entries, loading, run } = useAsyncState<ReturningEntry[]>([])

  useEffect(() => {
    run(async () => {
      const watching = items.filter(i => i.status === 'watching')
      if (watching.length === 0) return []

      const weekDates = getWeekDates(0)
      const weekEnd = weekDates[6]
      const weekEndTs = Math.floor(new Date(weekEnd + 'T23:59:59').getTime() / 1000)
      const futureEnd = weekEndTs + 365 * 24 * 60 * 60

      const { animeSlots, seriesEps } = await fetchAiringData(
        watching,
        weekEndTs + 1,
        futureEnd,
        (ctx, err) => notifyApiError(`useReturningShows/${ctx}`, err),
      )

      const result: ReturningEntry[] = []

      const byMedia = new Map<number, { item: typeof animeSlots[0]['item']; slot: typeof animeSlots[0]['slot'] }>()
      for (const { item, slot } of animeSlots) {
        const existing = byMedia.get(slot.mediaId)
        if (!existing || slot.airingAt < existing.slot.airingAt) byMedia.set(slot.mediaId, { item, slot })
      }
      for (const [, { item, slot }] of byMedia) {
        result.push({ item, nextDate: new Date(slot.airingAt * 1000).toLocaleDateString('sv-SE'), nextEpisode: slot.episode })
      }

      for (const { item, ep } of seriesEps) {
        if (!ep?.air_date || ep.air_date <= weekEnd) continue
        result.push({ item, nextDate: ep.air_date, nextEpisode: ep.episode_number, nextSeason: ep.season_number })
      }

      result.sort((a, b) => a.nextDate.localeCompare(b.nextDate))
      return result
    })
  }, [items, run])

  return { entries, loading }
}
