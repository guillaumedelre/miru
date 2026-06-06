import { useEffect, useState } from 'react'
import { useStore } from '@/store'
import { getAnilistGenresBatch } from '@/api/anilist'
import { getTmdbGenres } from '@/api/tmdb'

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  const d = Math.floor(h / 24)
  const rh = h % 24
  return rh > 0 ? `${d}j ${rh}h` : `${d}j`
}

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 flex flex-col gap-1">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  )
}

const TYPE_LABELS: Record<string, string> = {
  anime: 'Animes',
  series: 'Séries',
  movie: 'Films',
}

const STATUS_LABELS: Record<string, string> = {
  watching: 'En cours',
  completed: 'Terminé',
  plan_to_watch: 'À voir',
}

export default function Stats() {
  const { items, watched } = useStore()

  const watchedEpisodesCount = watched.length
  const completedMoviesCount = items.filter((i) => i.type === 'movie' && i.status === 'completed').length
  const totalViewed = watchedEpisodesCount + completedMoviesCount

  const totalMinutes = items.reduce((acc, item) => {
    if (!item.episodeDuration) return acc
    const epCount = item.type === 'movie'
      ? (item.status === 'completed' ? 1 : 0)
      : watched.filter((w) => w.itemId === item.id).length
    return acc + epCount * item.episodeDuration
  }, 0)

  const byType = Object.entries(
    items.reduce<Record<string, number>>(
      (acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc },
      { anime: 0, series: 0, movie: 0 }
    )
  ).sort((a, b) => b[1] - a[1])

  const byStatus = Object.entries(
    items.reduce<Record<string, number>>(
      (acc, i) => { acc[i.status] = (acc[i.status] ?? 0) + 1; return acc },
      { watching: 0, completed: 0, plan_to_watch: 0 }
    )
  ).sort((a, b) => b[1] - a[1])

  const [genreMap, setGenreMap] = useState<Record<string, string[]>>({})
  const [loadingGenres, setLoadingGenres] = useState(false)

  useEffect(() => {
    if (items.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingGenres(true)

    async function fetchGenres() {
      const map: Record<string, string[]> = {}

      const anilistItems = items.filter((i) => i.source === 'anilist')
      if (anilistItems.length > 0) {
        const ids = anilistItems.map((i) => Number(i.sourceId))
        const genres = await getAnilistGenresBatch(ids).catch(() => ({} as Record<number, string[]>))
        anilistItems.forEach((item) => {
          const g = genres[Number(item.sourceId)]
          if (g?.length) map[item.id] = g
        })
      }

      const tmdbItems = items.filter((i) => i.source === 'tmdb')
      await Promise.allSettled(
        tmdbItems.map(async (item) => {
          const type = item.type === 'series' ? 'tv' : 'movie'
          const genres = await getTmdbGenres(Number(item.sourceId), type).catch(() => [])
          if (genres.length) map[item.id] = genres
        })
      )

      setGenreMap(map)
      setLoadingGenres(false)
    }

    fetchGenres()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  const genreCounts = Object.values(genreMap)
    .flat()
    .reduce<Record<string, number>>((acc, g) => { acc[g] = (acc[g] ?? 0) + 1; return acc }, {})

  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const maxGenreCount = topGenres[0]?.[1] ?? 1

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold hidden sm:block">Statistiques</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Titres suivis" value={items.length} />
        <StatCard
          label="Épisodes / films vus"
          value={totalViewed}
          sub={completedMoviesCount > 0 ? `dont ${completedMoviesCount} film${completedMoviesCount > 1 ? 's' : ''}` : undefined}
        />
        <StatCard
          label="Temps de visionnage"
          value={totalMinutes > 0 ? formatDuration(totalMinutes) : '—'}
          sub={totalMinutes > 0 ? `${totalMinutes} minutes` : 'Durées non disponibles'}
        />
        <StatCard
          label="Titres terminés"
          value={items.filter((i) => i.status === 'completed').length}
          sub={`sur ${items.length} titres`}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Par type</p>
          {byType.map(([type, count]) => (
            <div key={type} className="flex items-center gap-3">
              <span className="text-sm w-20 shrink-0">{TYPE_LABELS[type] ?? type}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all"
                  style={{ width: items.length ? `${Math.round((count / items.length) * 100)}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-semibold w-6 text-right shrink-0">{count}</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Par statut</p>
          {byStatus.map(([status, count]) => (
            <div key={status} className="flex items-center gap-3">
              <span className="text-sm w-20">{STATUS_LABELS[status] ?? status}</span>
              <div className="flex-1 bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{ width: `${Math.round((count / items.length) * 100)}%` }}
                />
              </div>
              <span className="text-sm font-semibold w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">Par genre</p>
        {loadingGenres && (
          <p className="text-sm text-muted-foreground text-center py-4">Chargement des genres...</p>
        )}
        {!loadingGenres && topGenres.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">Aucune donnée de genre disponible.</p>
        )}
        {!loadingGenres && topGenres.map(([genre, count]) => (
          <div key={genre} className="flex items-center gap-3">
            <span className="text-sm w-28 shrink-0 truncate">{genre}</span>
            <div className="flex-1 bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.round((count / maxGenreCount) * 100)}%` }}
              />
            </div>
            <span className="text-sm font-semibold w-6 text-right shrink-0">{count}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
