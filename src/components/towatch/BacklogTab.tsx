import EpisodeCard from '@/components/EpisodeCard'
import { useBacklogEpisodes } from '@/hooks/useBacklogEpisodes'

function Loading() {
  return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>
}

export default function BacklogTab() {
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
