import { Checkbox } from '@/components/ui/checkbox'
import { useStore } from '@/store'
import type { WeeklyEpisode } from '@/hooks/useWeeklySchedule'

const TYPE_LABELS: Record<string, string> = {
  anime: 'Anime',
  series: 'Série',
  movie: 'Film',
}

interface Props {
  episode: WeeklyEpisode
}

export default function EpisodeCard({ episode }: Props) {
  const { isWatched, markWatched, unmarkWatched } = useStore()
  const watched = isWatched(episode.itemId, episode.episode)

  function toggle() {
    if (watched) unmarkWatched(episode.itemId, episode.episode)
    else markWatched(episode.itemId, episode.episode)
  }

  return (
    <div className={`flex gap-2 rounded-lg border border-border bg-card p-2 ${watched ? 'opacity-50' : ''}`}>
      <img
        src={episode.coverImage}
        alt={episode.title}
        className="w-10 h-14 object-cover rounded shrink-0"
      />
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <p className="text-xs font-semibold leading-tight line-clamp-2">{episode.title}</p>
        <p className="text-xs text-muted-foreground">
          {TYPE_LABELS[episode.type]}
          {episode.season != null && ` · S${episode.season}`}
          &nbsp;&middot; Ep.&nbsp;{episode.episode}
        </p>
        {episode.episodeName && (
          <p className="text-xs text-foreground leading-tight line-clamp-2 italic">{episode.episodeName}</p>
        )}
      </div>
      <Checkbox
        checked={watched}
        onCheckedChange={toggle}
        aria-label={`Marquer épisode ${episode.episode} comme vu`}
        className="shrink-0 self-center"
      />
    </div>
  )
}
