import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import DayRow from '@/components/DayRow'
import { useWeeklySchedule, getWeekDates } from '@/hooks/useWeeklySchedule'
import { useTopbarActions } from '@/contexts/TopbarActionsContext'
import { formatWeekRange } from '@/lib/formatting'

function TodayIcon() {
  const day = new Date().getDate()
  return (
    <span className="relative inline-flex items-center justify-center size-4">
      <CalendarDays className="size-4" />
      <span className="absolute text-[7px] font-bold leading-none top-[7px]">{day}</span>
    </span>
  )
}

function TodayButton({ disabled, onClick, className = '' }: { disabled: boolean; onClick: () => void; className?: string }) {
  return (
    <Button size="sm" disabled={disabled} onClick={onClick} className={className}>
      <TodayIcon />
      Aujourd'hui
    </Button>
  )
}

export default function WeekView() {
  const [weekOffset, setWeekOffset] = useState(0)
  const { schedule, weekDates, loading } = useWeeklySchedule(weekOffset)
  const today = new Date().toLocaleDateString('sv-SE')
  const { setActions } = useTopbarActions()

  useEffect(() => {
    setActions(
      <TodayButton disabled={weekOffset === 0} onClick={() => setWeekOffset(0)} />
    )
    return () => setActions(null)
  }, [weekOffset, setActions])

  return (
    <div className="space-y-4">
      <div className="flex items-center">
<Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <span className="flex-1 text-xs sm:text-sm font-medium text-center whitespace-nowrap">
          {weekOffset === 0 ? 'Semaine en cours' : formatWeekRange(getWeekDates(weekOffset))}
        </span>
        <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs hidden sm:inline-flex ml-2"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset(0)}
        >
          Aujourd'hui
        </Button>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">Chargement du planning...</p>
      )}

      <div className="flex flex-col gap-2">
        {weekDates.map((date, i) => (
          <DayRow
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
