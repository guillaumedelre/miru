import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetBody } from '@/components/ui/sheet'
import ProgressPicker from '@/components/ProgressPicker'
import { type AnilistMediaDetails } from '@/api/anilist'
import { posterUrl, type TmdbDetails } from '@/api/tmdb'
import { useStore } from '@/store'
import { useMediaDetails } from '@/hooks/useMediaDetails'
import { stripHtml } from '@/lib/formatting'
import { isAnimeItem, type TrackedItem, type Status } from '@/types'
import { inferWatchStatus } from '@/lib/inferWatchStatus'

function isAnilistDetails(d: AnilistMediaDetails | TmdbDetails | null): d is AnilistMediaDetails {
  return d !== null && 'studios' in d
}

const ANILIST_STATUS: Record<string, string> = {
  FINISHED: 'Terminé',
  RELEASING: 'En cours',
  NOT_YET_RELEASED: 'À venir',
  CANCELLED: 'Annulé',
  HIATUS: 'En pause',
}

type Tab = 'info' | 'progress'

interface Props {
  item: TrackedItem
  open: boolean
  onClose: () => void
  initialTab?: Tab
}

export default function MediaSheet({ item, open, onClose, initialTab = 'info' }: Props) {
  const { updateItem, setWatched, getWatchedForItem } = useStore()
  const { details, watchProviders, loading: loadingInfo } = useMediaDetails(item, open)

  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [resolvedTotal, setResolvedTotal] = useState<number | undefined>(item.totalEpisodes)
  const [tab, setTab] = useState<Tab>(initialTab)

  const hasProgress = item.type !== 'movie'

  useEffect(() => {
    function reset() {
      setTab(initialTab)
      setChecked(new Set(getWatchedForItem(item.id)))
      setResolvedTotal(item.totalEpisodes)
    }
    if (open) reset()
  }, [open, item.id, initialTab, getWatchedForItem, item.totalEpisodes])

  function handleSaveProgress() {
    const episodes = Array.from(checked)
    const progress = episodes.length > 0 ? Math.max(...episodes) : 0
    const displayTotal = resolvedTotal ?? item.totalEpisodes

    const status: Status = inferWatchStatus({
      type: item.type,
      isFinished: item.isFinished,
      totalEpisodes: displayTotal,
      watchedCount: episodes.length,
    })

    setWatched(item.id, episodes)
    updateItem(item.id, {
      progress,
      status,
      ...(resolvedTotal && !item.totalEpisodes ? { totalEpisodes: resolvedTotal } : {}),
    })
    onClose()
  }

  const { title, cover, genres, score, meta, description, streamingLinks, bannerUrl } = useMemo(() => {
    const al = isAnilistDetails(details) ? details : null
    const td = details !== null && !isAnilistDetails(details) ? details : null

    const t = al
      ? (al.title.english ?? al.title.romaji)
      : (td?.title ?? td?.name ?? item.title)

    const c = al
      ? (al.coverImage.extraLarge ?? al.coverImage.large)
      : posterUrl(td?.poster_path ?? null)

    const g = al?.genres ?? td?.genres?.map((g) => g.name) ?? []

    const s = al
      ? (al.averageScore != null ? (al.averageScore / 10).toFixed(1) : null)
      : (td?.vote_average ? td.vote_average.toFixed(1) : null)

    const m: string[] = []
    if (al) {
      if (al.startDate.year) m.push(String(al.startDate.year))
      if (al.studios.nodes[0]) m.push(al.studios.nodes[0].name)
      if (al.episodes) m.push(`${al.episodes} épisodes`)
      if (al.duration) m.push(`${al.duration} min / ép.`)
      if (al.status) m.push(ANILIST_STATUS[al.status] ?? al.status)
    } else if (td) {
      const year = td.release_date?.slice(0, 4) ?? td.first_air_date?.slice(0, 4)
      if (year) m.push(year)
      if (td.number_of_seasons) m.push(`${td.number_of_seasons} saison${td.number_of_seasons > 1 ? 's' : ''}`)
      if (td.number_of_episodes) m.push(`${td.number_of_episodes} épisodes`)
      if (td.runtime) m.push(`${td.runtime} min`)
    }

    const desc = al?.description ? stripHtml(al.description) : (td?.overview ?? null)
    const links = al?.externalLinks.filter((l) => l.type === 'STREAMING') ?? []
    const banner = al?.bannerImage
      ?? (td?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${td.backdrop_path}` : null)
      ?? c

    return { title: t, cover: c, genres: g, score: s, meta: m, description: desc, streamingLinks: links, bannerUrl: banner }
  }, [details, item])

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetClose />

      {/* Bannière */}
      <div className="relative h-48 shrink-0">
        <img src={bannerUrl} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90" />
      </div>

      {/* Header : cover + titre + meta */}
      <div className="flex gap-4 px-6 -mt-12 shrink-0 relative z-10">
        <img
          src={cover}
          alt={item.title}
          className="w-24 h-36 object-cover rounded-lg shrink-0 shadow-lg ring-2 ring-background"
        />
        <div className="flex flex-col justify-end gap-2 min-w-0 pb-2">
          <h2 className="text-base font-semibold leading-tight pr-10">
            {loadingInfo ? item.title : title}
          </h2>
          {meta.length > 0 && (
            <p className="text-xs text-muted-foreground">{meta.join(' · ')}</p>
          )}
          <div className="flex flex-wrap gap-1">
            {genres.map((g) => (
              <Badge key={g} variant="secondary" className="text-xs">{g}</Badge>
            ))}
          </div>
        </div>
        {score && (
          <div className="ml-auto mb-2 self-end shrink-0 flex flex-col items-center justify-center rounded-full w-12 h-12 border-2 border-primary text-primary">
            <span className="text-sm font-bold leading-none">{score}</span>
            <span className="text-[9px] leading-none mt-0.5">/10</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      {hasProgress && (
        <div className="flex shrink-0 border-b border-border mt-4 px-6">
          <button
            onClick={() => setTab('info')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'info'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Infos
          </button>
          <button
            onClick={() => setTab('progress')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === 'progress'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Avancement
          </button>
        </div>
      )}

      {/* Onglet Infos */}
      {tab === 'info' && (
        <SheetBody className="px-6 py-6 space-y-6">
          {loadingInfo && <p className="text-sm text-muted-foreground text-center py-6">Chargement...</p>}
          {!loadingInfo && !details && <p className="text-sm text-muted-foreground text-center py-6">Informations non disponibles.</p>}

          {description && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{description}</p>
          )}

          {watchProviders.providers.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disponible sur</p>
              <div className="flex flex-wrap gap-2">
                {watchProviders.providers.map((p) => (
                  <a
                    key={p.provider_id}
                    href={watchProviders.link ?? undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 hover:bg-secondary transition-colors"
                  >
                    <span className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden">
                      <img src={`https://image.tmdb.org/t/p/original${p.logo_path}`} alt={p.provider_name} className="w-full h-full object-cover" />
                    </span>
                    <span className="text-xs">{p.provider_name}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {streamingLinks.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Disponible sur</p>
              <div className="flex flex-wrap gap-2">
                {streamingLinks.map((l) => (
                  <a
                    key={l.url}
                    href={l.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 hover:bg-secondary transition-colors"
                  >
                    {l.icon && (
                      <span className="w-5 h-5 rounded bg-zinc-900 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src={l.icon} alt={l.site} className="w-full h-full object-cover" />
                      </span>
                    )}
                    <span className="text-xs">{l.site}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </SheetBody>
      )}

      {/* Onglet Avancement */}
      {tab === 'progress' && (
        <>
          <SheetBody className="px-6 py-4">
            <ProgressPicker
              sourceId={item.sourceId}
              source={item.source}
              type={item.type}
              totalEpisodes={item.totalEpisodes}
              malId={isAnimeItem(item) ? item.malId : undefined}
              checked={checked}
              onChange={setChecked}
              onTotalResolved={setResolvedTotal}
            />
          </SheetBody>
          <div className="shrink-0 flex gap-2 justify-end px-6 py-4 border-t border-border">
            <Button variant="ghost" onClick={onClose}>Annuler</Button>
            <Button onClick={handleSaveProgress}>Enregistrer</Button>
          </div>
        </>
      )}
    </Sheet>
  )
}
