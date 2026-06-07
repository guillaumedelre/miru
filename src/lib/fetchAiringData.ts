import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode, type TmdbEpisode } from '@/api/tmdb'
import { isAnimeItem, isSeriesItem, type AnimeItem, type SeriesItem, type TrackedItem } from '@/types'

export interface AiringSlot {
  mediaId: number
  episode: number
  airingAt: number
}

export interface RawAiringData {
  animeSlots: Array<{ item: AnimeItem; slot: AiringSlot }>
  seriesEps: Array<{ item: SeriesItem; ep: TmdbEpisode | null }>
}

export async function fetchAiringData(
  watching: TrackedItem[],
  rangeStart: number,
  rangeEnd: number,
  onError?: (ctx: string, err: unknown) => void,
): Promise<RawAiringData> {
  const animeItems = watching.filter(isAnimeItem)
  const seriesItems = watching.filter(isSeriesItem)

  const animeSlots: RawAiringData['animeSlots'] = []
  if (animeItems.length > 0) {
    const ids = animeItems.map(i => Number(i.sourceId))
    const slots = await getAiringSchedule(ids, rangeStart, rangeEnd).catch((err) => {
      onError?.('anilist', err)
      return []
    })
    for (const slot of slots) {
      const item = animeItems.find(i => i.sourceId === String(slot.mediaId))
      if (item) animeSlots.push({ item, slot })
    }
  }

  const seriesEps: RawAiringData['seriesEps'] = []
  await Promise.allSettled(
    seriesItems.map(async item => {
      const ep = await getNextEpisode(Number(item.sourceId), item.progress).catch((err) => {
        onError?.('tmdb', err)
        return null
      })
      seriesEps.push({ item, ep })
    })
  )

  return { animeSlots, seriesEps }
}
