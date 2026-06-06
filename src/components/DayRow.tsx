import EpisodeCard from '@/components/EpisodeCard'
import type { WeeklyEpisode } from '@/hooks/useWeeklySchedule'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface Props {
  date: string
  dayIndex: number
  episodes: WeeklyEpisode[]
  isToday: boolean
}

export default function DayRow({ date, dayIndex, episodes, isToday }: Props) {
  const [, month, day] = date.split('-')

  return (
    <div className={`flex gap-3 rounded-xl p-3 border-2 ${isToday ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
      <div className="flex flex-col items-center w-9 shrink-0 pt-0.5 text-center">
        <p className={`text-[10px] font-bold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {DAY_NAMES[dayIndex]}
        </p>
        <p className={`text-xl font-bold leading-tight ${isToday ? 'text-primary' : ''}`}>
          {parseInt(day)}
        </p>
        <p className="text-[10px] text-muted-foreground">{parseInt(month).toString().padStart(2, '0')}</p>
      </div>

      <div className="flex-1 min-w-0">
        {episodes.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3 text-center">-</p>
        ) : (
          <div className="flex flex-col gap-2">
            {episodes.map((ep) => (
              <EpisodeCard key={`${ep.itemId}-${ep.episode}`} episode={ep} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
