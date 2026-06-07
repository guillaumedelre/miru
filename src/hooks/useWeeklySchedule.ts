import { useEffect, useMemo, useRef, useState } from 'react'
import { useStore } from '@/store'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { getEpisodeName } from '@/api/jikan'
import { notifyEnrichment } from '@/lib/errors'
import type { MediaType } from '@/types'

type AiringSlot = { mediaId: number; episode: number; airingAt: number }

// Module-level caches — partagés entre les instances du hook (WeekView et ToWatch)
const anilistScheduleCache = new Map<string, Promise<AiringSlot[]>>()
const tmdbNextEpisodeCache = new Map<string, ReturnType<typeof getNextEpisode>>()

function cachedAiringSchedule(ids: number[], weekStart: number, weekEnd: number): Promise<AiringSlot[]> {
  const key = `${[...ids].sort().join(',')}-${weekStart}-${weekEnd}`
  if (!anilistScheduleCache.has(key)) {
    anilistScheduleCache.set(key, getAiringSchedule(ids, weekStart, weekEnd).catch(() => []))
  }
  return anilistScheduleCache.get(key)!
}

function cachedNextEpisode(sourceId: string, progress: number): ReturnType<typeof getNextEpisode> {
  const key = `${sourceId}-${progress}`
  if (!tmdbNextEpisodeCache.has(key)) {
    tmdbNextEpisodeCache.set(key, getNextEpisode(Number(sourceId), progress))
  }
  return tmdbNextEpisodeCache.get(key)!
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
    const watching = items.filter((i) => i.status === 'watching')
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (watching.length === 0) { setSchedule(new Map()); prevKeyRef.current = watchingKey; return }

    // Évite un re-fetch si rien de pertinent n'a changé (ex: item non-watching modifié)
    if (prevKeyRef.current === watchingKey) return
    prevKeyRef.current = watchingKey

    setLoading(true)

    async function fetch() {
      const map = new Map<string, WeeklyEpisode[]>()
      weekDates.forEach((d) => map.set(d, []))

      // AniList anime — batch unique, résultat mis en cache par (ids + semaine)
      const anilistItems = watching.filter((i) => i.source === 'anilist' && i.type === 'anime')
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
      const tmdbItems = watching.filter((i) => i.source === 'tmdb' && i.type === 'series')
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

    fetch()
  }, [watchingKey, weekDates, items])

  return { schedule, weekDates, loading }
}
