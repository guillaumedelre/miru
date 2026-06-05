import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import DayColumn from '@/components/DayColumn'
import { useWeeklySchedule, getWeekDates } from '@/hooks/useWeeklySchedule'

function formatWeekRange(dates: string[]): string {
  const startYear = dates[0].slice(0, 4)
  const endYear = dates[6].slice(0, 4)
  const fmt = (d: string, showYear: boolean) => {
    const [year,, day] = d.split('-')
    const month = new Date(d).toLocaleDateString('fr-FR', { month: 'short' })
    return showYear ? `${parseInt(day)} ${month} ${year}` : `${parseInt(day)} ${month}`
  }
  const sameYear = startYear === endYear
  return `${fmt(dates[0], false)} – ${fmt(dates[6], !sameYear)} ${sameYear ? startYear : ''}`
}

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { schedule, weekDates, loading } = useWeeklySchedule(weekOffset)
  const today = new Date().toLocaleDateString('sv-SE')

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold flex-1">Calendrier</h1>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="text-sm font-medium min-w-36 text-center">
          {weekOffset === 0 ? 'Semaine en cours' : formatWeekRange(getWeekDates(weekOffset))}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`text-xs ${weekOffset === 0 ? 'opacity-40 pointer-events-none' : ''}`}
          onClick={() => setWeekOffset(0)}
        >
          Aujourd'hui
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Chargement du planning...</p>
      )}

      <div className="flex gap-3 overflow-x-auto pb-2">
        {weekDates.map((date, i) => (
          <DayColumn
            key={date}
            date={date}
            dayIndex={i}
            episodes={schedule.get(date) ?? []}
            isToday={date === today}
          />
        ))}
      </div>
    </div>
  )
}
