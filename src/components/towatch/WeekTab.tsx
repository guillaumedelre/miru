import EpisodeCard from '@/components/EpisodeCard'
import { useWeeklySchedule } from '@/hooks/useWeeklySchedule'
import { formatDay } from '@/lib/formatting'

function Loading() {
  return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>
}

export default function WeekTab() {
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
