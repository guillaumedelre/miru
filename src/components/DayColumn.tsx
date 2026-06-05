import EpisodeCard from '@/components/EpisodeCard'
import type { WeeklyEpisode } from '@/hooks/useWeeklySchedule'

const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

interface Props {
  date: string // YYYY-MM-DD
  dayIndex: number // 0 = Monday
  episodes: WeeklyEpisode[]
  isToday: boolean
}

export default function DayColumn({ date, dayIndex, episodes, isToday }: Props) {
  const [, month, day] = date.split('-')

  return (
    <div className={`flex flex-col gap-2 min-w-[160px] flex-1 rounded-xl p-3 border-2 ${isToday ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
      <div className="text-center mb-1">
        <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {DAY_NAMES[dayIndex]}
        </p>
        <p className={`text-lg font-bold leading-none ${isToday ? 'text-primary' : ''}`}>
          {parseInt(day)}
        </p>
        <p className="text-xs text-muted-foreground">{parseInt(month).toString().padStart(2, '0')}</p>
      </div>

      {episodes.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">-</p>
      ) : (
        <div className="flex flex-col gap-2">
          {episodes.map((ep) => (
            <EpisodeCard key={`${ep.itemId}-${ep.episode}`} episode={ep} />
          ))}
        </div>
      )}
    </div>
  )
}
