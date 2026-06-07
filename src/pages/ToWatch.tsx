import { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EpisodeCard from '@/components/EpisodeCard'
import { useWeeklySchedule, getWeekDates, type WeeklyEpisode } from '@/hooks/useWeeklySchedule'
import { getAiringSchedule } from '@/api/anilist'
import { getNextEpisode } from '@/api/tmdb'
import { useStore } from '@/store'
import { formatDay, daysUntil, formatRelative } from '@/lib/formatting'
import type { TrackedItem } from '@/types'

type Tab = 'backlog' | 'week' | 'returning'

const TABS: { value: Tab; label: string }[] = [
  { value: 'backlog', label: 'Retard' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'returning', label: 'Reprises' },
]

function Loading() {
  return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>
}

// ---- Cette semaine ----

function WeekTab() {
  const { schedule, weekDates, loading } = useWeeklySchedule(0)
  const today = new Date().toLocaleDateString('sv-SE')
  const days = weekDates.filter(d => (schedule.get(d) ?? []).length > 0)

  if (loading) return <Loading />
  if (days.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Rien de prévu cette semaine.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {days.map(date => (
        <div key={date} className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground capitalize">
            {formatDay(date)}{date === today ? " · Aujourd'hui" : ''}
          </p>
          {(schedule.get(date) ?? []).map(ep => (
            <EpisodeCard key={`${ep.itemId}-${ep.episode}`} episode={ep} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ---- Retard ----

function BacklogTab() {
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

      // AniList — épisodes diffusés avant cette semaine
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

      // TMDB — prochain épisode non vu si déjà diffusé avant cette semaine
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

  if (loading) return <Loading />
  if (episodes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Aucun retard, tu es à jour !
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {episodes.map(ep => (
        <EpisodeCard key={`${ep.itemId}-${ep.episode}`} episode={ep} />
      ))}
    </div>
  )
}

// ---- Reprises ----

interface ReturningEntry {
  item: TrackedItem
  nextDate: string
  nextEpisode: number
  nextSeason?: number
}


function ReturningCard({ entry }: { entry: ReturningEntry }) {
  const days = daysUntil(entry.nextDate)
  const dateLabel = new Date(entry.nextDate).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="flex gap-3 items-center rounded-xl border border-border bg-card p-3">
      <img
        src={entry.item.coverImage}
        alt={entry.item.title}
        className="w-10 h-14 object-cover rounded shrink-0"
      />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold leading-tight line-clamp-1">{entry.item.title}</p>
        <p className="text-xs text-muted-foreground">
          Ép.&nbsp;{entry.nextEpisode}
          {entry.nextSeason != null ? ` · Saison ${entry.nextSeason}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </div>
      <p className="text-xs text-muted-foreground shrink-0 text-right">{formatRelative(days)}</p>
    </div>
  )
}

function ReturningTab() {
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

      // AniList — premier épisode planifié après cette semaine
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

      // TMDB — prochain épisode planifié après cette semaine
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

  if (loading) return <Loading />
  if (entries.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-12">
        Aucune série en pause pour l'instant.
      </p>
    )
  }

  return (
    <div className="space-y-2">
      {entries.map(e => (
        <ReturningCard key={e.item.id} entry={e} />
      ))}
    </div>
  )
}

// ---- Page principale ----

export default function ToWatch() {
  const [tab, setTab] = useState<Tab>('week')

  return (
    <div className="space-y-4">
<Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList className="w-full">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'backlog' && <BacklogTab />}
      {tab === 'week' && <WeekTab />}
      {tab === 'returning' && <ReturningTab />}
    </div>
  )
}
