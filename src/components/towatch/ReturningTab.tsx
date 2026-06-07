import { useReturningShows, type ReturningEntry } from '@/hooks/useReturningShows'
import { daysUntil, formatRelative } from '@/lib/formatting'

function Loading() {
  return <p className="text-sm text-muted-foreground text-center py-12">Chargement...</p>
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

export default function ReturningTab() {
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
