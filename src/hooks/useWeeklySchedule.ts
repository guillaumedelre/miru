import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { getEpisodeName } from '@/api/jikan'
import { notifyEnrichment } from '@/lib/errors'
import { isAnimeItem, isSeriesItem, type MediaType } from '@/types'
import type { AiringSlot } from '@/lib/fetchAiringData'

const SCHEDULE_CACHE_TTL_MS = 60 * 60 * 1000

interface TimedEntry<T> {
  value: T
  cachedAt: number
}

const anilistScheduleCache = new Map<string, TimedEntry<Promise<AiringSlot[]>>>()
const tmdbNextEpisodeCache = new Map<string, TimedEntry<ReturnType<typeof getNextEpisode>>>()

function cachedAiringSchedule(ids: number[], weekStart: number, weekEnd: number): Promise<AiringSlot[]> {
  const key = `${[...ids].sort().join(',')}-${weekStart}-${weekEnd}`
  const entry = anilistScheduleCache.get(key)
  if (entry && Date.now() - entry.cachedAt < SCHEDULE_CACHE_TTL_MS) return entry.value
  const promise = getAiringSchedule(ids, weekStart, weekEnd).catch(() => [])
  anilistScheduleCache.set(key, { value: promise, cachedAt: Date.now() })
  return promise
}

function cachedNextEpisode(sourceId: string, progress: number): ReturnType<typeof getNextEpisode> {
  const key = `${sourceId}-${progress}`
  const entry = tmdbNextEpisodeCache.get(key)
  if (entry && Date.now() - entry.cachedAt < SCHEDULE_CACHE_TTL_MS) return entry.value
  const promise = getNextEpisode(Number(sourceId), progress)
  tmdbNextEpisodeCache.set(key, { value: promise, cachedAt: Date.now() })
  return promise
}

export interface WeeklyEpisode {
  itemId: string
  title: string
  coverImage: string
  episode: number
  season?: number
  episodeName?: string
  airingDate: string
  type: MediaType
}

export function getWeekDates(offset = 0): string[] {
  const today = new Date()
  const day = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)

  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toLocaleDateString('sv-SE')
  })
}

function tsToLocalDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString('sv-SE')
}

export function useWeeklySchedule(weekOffset = 0) {
  const items = useStore((s) => s.items)
  const [schedule, setSchedule] = useState<Map<string, WeeklyEpisode[]>>(new Map())
  const [loading, setLoading] = useState(false)

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset])

  // Clé stable : ne change que si les items watching (ids + progress) changent vraiment
  const watchingKey = useMemo(() => {
    return items
      .filter(i => i.status === 'watching')
      .map(i => `${i.id}:${i.progress}`)
      .sort()
      .join('|')
  }, [items])

  const prevKeyRef = useRef<string | null>(null)

  useEffect(() => {
    async function fetchSchedule() {
      const watching = items.filter((i) => i.status === 'watching')
      if (watching.length === 0) {
        setSchedule(new Map())
        prevKeyRef.current = watchingKey
        return
      }

      // Évite un re-fetch si rien de pertinent n'a changé (ex: item non-watching modifié)
      if (prevKeyRef.current === watchingKey) return
      prevKeyRef.current = watchingKey

      setLoading(true)

      const map = new Map<string, WeeklyEpisode[]>()
      weekDates.forEach((d) => map.set(d, []))

      // AniList anime — batch unique, résultat mis en cache par (ids + semaine)
      const anilistItems = watching.filter(isAnimeItem)
      if (anilistItems.length > 0) {
        const ids = anilistItems.map((i) => Number(i.sourceId))
        const weekStart = Math.floor(new Date(weekDates[0]).getTime() / 1000)
        const weekEnd = Math.floor(new Date(weekDates[6] + 'T23:59:59').getTime() / 1000)
        const schedules = await cachedAiringSchedule(ids, weekStart, weekEnd)

        await Promise.allSettled(
          schedules.map(async (s) => {
            const date = tsToLocalDate(s.airingAt)
            if (!map.has(date)) return
            const item = anilistItems.find((i) => i.sourceId === String(s.mediaId))
            if (!item) return

            let episodeName: string | undefined
            if (item.malId) {
              episodeName = (await getEpisodeName(item.malId, s.episode).catch((err) => { notifyEnrichment('useWeeklySchedule/jikan', err); return null })) ?? undefined
            }

            map.get(date)!.push({
              itemId: item.id,
              title: item.title,
              coverImage: item.coverImage,
              episode: s.episode,
              episodeName,
              airingDate: date,
              type: 'anime',
            })
          })
        )
      }

      // TMDB series — un appel par item, mis en cache par (sourceId + progress)
      const tmdbItems = watching.filter(isSeriesItem)
      await Promise.allSettled(
        tmdbItems.map(async (item) => {
          const ep = await cachedNextEpisode(item.sourceId, item.progress).catch(() => null)
          if (!ep?.air_date) return
          if (!weekDates.includes(ep.air_date)) return
          map.get(ep.air_date)!.push({
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

      setSchedule(new Map(map))
      setLoading(false)
    }

    fetchSchedule()
  }, [watchingKey, weekDates, items])

  return { schedule, weekDates, loading }
}
