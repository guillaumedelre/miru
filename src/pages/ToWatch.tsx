import { useState } from 'react'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import EpisodeCard from '@/components/EpisodeCard'
import { useWeeklySchedule } from '@/hooks/useWeeklySchedule'
import { useBacklogEpisodes } from '@/hooks/useBacklogEpisodes'
import { useReturningShows, type ReturningEntry } from '@/hooks/useReturningShows'
import { formatDay, daysUntil, formatRelative } from '@/lib/formatting'

type Tab = 'backlog' | 'week' | 'returning'

const TABS: { value: Tab; label: string }[] = [
  { value: 'backlog', label: 'Retard' },
  { value: 'week', label: 'Cette semaine' },
  { value: 'returning', label: 'Reprises' },
]

function Loading() {
  return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>
}

function WeekTab() {
  const { schedule, weekDates, loading } = useWeeklySchedule(0)
  const today = new Date().toLocaleDateString('sv-SE')
  const days = weekDates.filter(d => (schedule.get(d) ?? []).length > 0)

  if (loading) return <Loading />
  if (days.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Rien de prévu cette semaine.</p>
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

function BacklogTab() {
  const { episodes, loading } = useBacklogEpisodes()

  if (loading) return <Loading />
  if (episodes.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Aucun retard, tu es à jour !</p>
  }

  return (
    <div className="space-y-2">
      {episodes.map(ep => (
        <EpisodeCard key={`${ep.itemId}-${ep.episode}`} episode={ep} />
      ))}
    </div>
  )
}

function ReturningCard({ entry }: { entry: ReturningEntry }) {
  const days = daysUntil(entry.nextDate)
  const dateLabel = new Date(entry.nextDate).toLocaleDateString('fr-FR', {
    day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <div className="flex gap-3 items-center rounded-xl border border-border bg-card p-3">
      <img src={entry.item.coverImage} alt={entry.item.title} className="w-10 h-14 object-cover rounded shrink-0" />
      <div className="flex-1 min-w-0 space-y-1">
        <p className="text-sm font-semibold leading-tight line-clamp-1">{entry.item.title}</p>
        <p className="text-xs text-muted-foreground">
          Ép.&nbsp;{entry.nextEpisode}{entry.nextSeason != null ? ` · Saison ${entry.nextSeason}` : ''}
        </p>
        <p className="text-xs text-muted-foreground">{dateLabel}</p>
      </div>
      <p className="text-xs text-muted-foreground shrink-0 text-right">{formatRelative(days)}</p>
    </div>
  )
}

function ReturningTab() {
  const { entries, loading } = useReturningShows()

  if (loading) return <Loading />
  if (entries.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-12">Aucune série en pause pour l'instant.</p>
  }

  return (
    <div className="space-y-2">
      {entries.map(e => <ReturningCard key={e.item.id} entry={e} />)}
    </div>
  )
}

export default function ToWatch() {
  const [tab, setTab] = useState<Tab>('week')

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
        <TabsList className="w-full">
          {TABS.map(t => (
            <TabsTrigger key={t.value} value={t.value} className="flex-1">{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {tab === 'backlog' && <BacklogTab />}
      {tab === 'week' && <WeekTab />}
      {tab === 'returning' && <ReturningTab />}
    </div>
  )
}
