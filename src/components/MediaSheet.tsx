import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetBody } from '@/components/ui/sheet'
import ProgressPicker from '@/components/ProgressPicker'
import { getAnilistDetails, type AnilistMediaDetails } from '@/api/anilist'
import { getTmdbDetails, getWatchProviders, posterUrl, type TmdbDetails, type TmdbWatchProviders } from '@/api/tmdb'
import { useStore } from '@/store'
import type { TrackedItem, Status } from '@/types'

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
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

  // Info state
  const [details, setDetails] = useState<AnilistMediaDetails | TmdbDetails | null>(null)
  const [watchProviders, setWatchProviders] = useState<TmdbWatchProviders>({ providers: [], link: null })
  const [loadingInfo, setLoadingInfo] = useState(false)

  // Progress state
  const [checked, setChecked] = useState<Set<number>>(new Set())
  const [resolvedTotal, setResolvedTotal] = useState<number | undefined>(item.totalEpisodes)

  // Tab state
  const [tab, setTab] = useState<Tab>(initialTab)

  const hasProgress = item.type !== 'movie'

  useEffect(() => {
    if (!open) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTab(initialTab)
    setChecked(new Set(getWatchedForItem(item.id)))
    setResolvedTotal(item.totalEpisodes)

    setDetails(null)
    setWatchProviders({ providers: [], link: null })
    setLoadingInfo(true)
    const id = Number(item.sourceId)
    const mediaType = item.type === 'series' ? 'tv' : 'movie'

    if (item.source === 'anilist') {
      getAnilistDetails(id)
        .then(setDetails)
        .catch(() => setDetails(null))
        .finally(() => setLoadingInfo(false))
    } else {
      Promise.all([
        getTmdbDetails(id, mediaType).catch(() => null),
        getWatchProviders(id, mediaType).catch(() => ({ providers: [], link: null })),
      ]).then(([det, prov]) => {
        setDetails(det)
        setWatchProviders(prov ?? { providers: [], link: null })
      }).finally(() => setLoadingInfo(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.sourceId, item.source, item.type])

  function handleSaveProgress() {
    const episodes = Array.from(checked)
    const progress = episodes.length > 0 ? Math.max(...episodes) : 0
    const displayTotal = resolvedTotal ?? item.totalEpisodes

    let status: Status
    if (episodes.length === 0) {
      status = 'plan_to_watch'
    } else if (item.isFinished && displayTotal && episodes.length >= displayTotal) {
      status = 'completed'
    } else {
      status = 'watching'
    }

    setWatched(item.id, episodes)
    updateItem(item.id, {
      progress,
      status,
      ...(resolvedTotal && !item.totalEpisodes ? { totalEpisodes: resolvedTotal } : {}),
    })
    onClose()
  }

  // Computed info values
  const isAnilist = item.source === 'anilist'
  const anilist = isAnilist ? (details as AnilistMediaDetails | null) : null
  const tmdb = !isAnilist ? (details as TmdbDetails | null) : null

  const title = anilist
    ? (anilist.title.english ?? anilist.title.romaji)
    : (tmdb?.title ?? tmdb?.name ?? item.title)

  const cover = anilist
    ? (anilist.coverImage.extraLarge ?? anilist.coverImage.large)
    : posterUrl(tmdb?.poster_path ?? null)

  const genres = anilist?.genres ?? tmdb?.genres?.map((g) => g.name) ?? []

  const score = anilist
    ? (anilist.averageScore != null ? (anilist.averageScore / 10).toFixed(1) : null)
    : (tmdb?.vote_average ? tmdb.vote_average.toFixed(1) : null)

  const meta: string[] = []
  if (anilist) {
    if (anilist.startDate.year) meta.push(String(anilist.startDate.year))
    if (anilist.studios.nodes[0]) meta.push(anilist.studios.nodes[0].name)
    if (anilist.episodes) meta.push(`${anilist.episodes} épisodes`)
    if (anilist.duration) meta.push(`${anilist.duration} min / ép.`)
    if (anilist.status) meta.push(ANILIST_STATUS[anilist.status] ?? anilist.status)
  } else if (tmdb) {
    const year = tmdb.release_date?.slice(0, 4) ?? tmdb.first_air_date?.slice(0, 4)
    if (year) meta.push(year)
    if (tmdb.number_of_seasons) meta.push(`${tmdb.number_of_seasons} saison${tmdb.number_of_seasons > 1 ? 's' : ''}`)
    if (tmdb.number_of_episodes) meta.push(`${tmdb.number_of_episodes} épisodes`)
    if (tmdb.runtime) meta.push(`${tmdb.runtime} min`)
  }

  const description = anilist?.description ? stripHtml(anilist.description) : (tmdb?.overview ?? null)
  const streamingLinks = anilist?.externalLinks.filter((l) => l.type === 'STREAMING') ?? []
  const bannerUrl = anilist?.bannerImage
    ?? (tmdb?.backdrop_path ? `https://image.tmdb.org/t/p/w1280${tmdb.backdrop_path}` : null)
    ?? cover

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

      {/* Contenu de l'onglet Infos */}
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

      {/* Contenu de l'onglet Avancement */}
      {tab === 'progress' && (
        <>
          <SheetBody className="px-6 py-4">
            <ProgressPicker
              sourceId={item.sourceId}
              source={item.source}
              type={item.type}
              totalEpisodes={item.totalEpisodes}
              malId={item.malId}
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
