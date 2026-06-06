import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetClose, SheetBody } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProgressPicker from '@/components/ProgressPicker'
import { useStore } from '@/store'
import { searchMedia, type AnilistMedia } from '@/api/anilist'
import { searchMulti, posterUrl, getTvSeasons, type TmdbMedia } from '@/api/tmdb'
import type { TrackedItem, MediaType, Source } from '@/types'

type Tab = 'anime' | 'series' | 'movie'

interface Pending {
  result: AnilistMedia | TmdbMedia
  title: string
  image: string
  totalEpisodes?: number
  source: Source
  type: MediaType
  isFinished: boolean
  malId?: number
  episodeDuration?: number
}

interface Props {
  open: boolean
  onClose: () => void
  initialQuery?: string
}

export default function AddMediaDialog({ open, onClose, initialQuery }: Props) {
  const { addItem, markWatched, items } = useStore()
  const [tab, setTab] = useState<Tab>('anime')
  const [query, setQuery] = useState(initialQuery ?? '')
  const [results, setResults] = useState<(AnilistMedia | TmdbMedia)[]>([])
  const [loading, setLoading] = useState(false)
  const [pending, setPending] = useState<Pending | null>(null)
  const [watchedEps, setWatchedEps] = useState<Set<number>>(new Set())
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!query.trim()) { setResults([]); return }
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        if (tab === 'anime') setResults(await searchMedia(query, 'ANIME'))
        else setResults((await searchMulti(query)).filter(r => r.media_type === (tab === 'series' ? 'tv' : 'movie')))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }, [query, tab])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQuery(initialQuery ?? '')
    setResults([])
    setPending(null)
    setWatchedEps(new Set())
  }, [open, initialQuery])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResults([])
    setPending(null)
    setWatchedEps(new Set())
  }, [tab])

  async function handleSelect(result: AnilistMedia | TmdbMedia) {
    const isAnilist = 'coverImage' in result
    const title = isAnilist
      ? ((result as AnilistMedia).title.english ?? (result as AnilistMedia).title.romaji)
      : ((result as TmdbMedia).name ?? (result as TmdbMedia).title ?? '')
    const image = isAnilist
      ? (result as AnilistMedia).coverImage.large
      : posterUrl((result as TmdbMedia).poster_path)
    const source: Source = isAnilist ? 'anilist' : 'tmdb'

    let totalEpisodes: number | undefined
    let isFinished: boolean
    let malId: number | undefined
    let episodeDuration: number | undefined

    if (isAnilist) {
      const a = result as AnilistMedia
      totalEpisodes = a.episodes ?? a.chapters ?? undefined
      isFinished = a.status === 'FINISHED' || a.status === 'CANCELLED'
      if (a.idMal) malId = a.idMal
      if (a.duration) episodeDuration = a.duration
    } else if (tab === 'series') {
      const t = result as TmdbMedia
      totalEpisodes = t.number_of_episodes
      const details = await getTvSeasons(Number(result.id)).catch(() => null)
      isFinished = details?.isFinished ?? false
      if (details) totalEpisodes = details.seasons.reduce((s, season) => s + season.episode_count, 0)
      if (t.episode_run_time?.length) episodeDuration = t.episode_run_time[0]
    } else {
      isFinished = true
      const t = result as TmdbMedia
      if (t.runtime) episodeDuration = t.runtime
    }

    setPending({ result, title, image, totalEpisodes, source, type: tab as MediaType, isFinished, malId, episodeDuration })
    setWatchedEps(new Set())
  }

  function handleConfirm() {
    if (!pending) return
    const progress = watchedEps.size > 0 ? Math.max(...watchedEps) : 0

    let status: TrackedItem['status']
    if (pending.type === 'movie') {
      status = watchedEps.size > 0 ? 'completed' : 'plan_to_watch'
    } else if (watchedEps.size === 0) {
      status = 'plan_to_watch'
    } else if (pending.isFinished && pending.totalEpisodes && watchedEps.size >= pending.totalEpisodes) {
      status = 'completed'
    } else {
      status = 'watching'
    }

    const itemId = crypto.randomUUID()
    addItem({
      id: itemId,
      sourceId: String(pending.result.id),
      source: pending.source,
      type: pending.type,
      title: pending.title,
      coverImage: pending.image,
      status,
      progress,
      totalEpisodes: pending.totalEpisodes,
      isFinished: pending.isFinished,
      malId: pending.malId,
      episodeDuration: pending.episodeDuration,
    })
    watchedEps.forEach((ep) => markWatched(itemId, ep))
    onClose()
  }

  const showPicker = pending && pending.type !== 'movie'

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetClose />

      {pending ? (
        <>
          {/* En-tête : cover + titre */}
          <div className="shrink-0 flex gap-4 px-6 pt-6 pb-4 border-b border-border">
            <img src={pending.image} alt="" className="w-20 h-28 object-cover rounded-lg shrink-0 shadow-md" />
            <div className="flex flex-col justify-center gap-2 min-w-0 pr-8">
              <h2 className="text-base font-semibold leading-tight">{pending.title}</h2>
              {pending.totalEpisodes && (
                <p className="text-xs text-muted-foreground">{pending.totalEpisodes} épisodes au total</p>
              )}
              {watchedEps.size > 0 && (
                <p className="text-xs text-primary font-semibold">
                  {watchedEps.size} épisode{watchedEps.size > 1 ? 's' : ''} coché{watchedEps.size > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>

          {/* ProgressPicker scrollable */}
          {showPicker && (
            <SheetBody className="px-6 py-4">
              <ProgressPicker
                sourceId={String(pending.result.id)}
                source={pending.source}
                type={pending.type}
                totalEpisodes={pending.totalEpisodes}
                malId={pending.malId}
                checked={watchedEps}
                onChange={setWatchedEps}
                onTotalResolved={(total) => setPending((p) => p ? { ...p, totalEpisodes: total } : p)}
              />
            </SheetBody>
          )}

          {/* Footer */}
          <div className="shrink-0 flex gap-2 justify-end px-6 py-4 border-t border-border mt-auto">
            <Button variant="ghost" onClick={() => setPending(null)}>Retour</Button>
            <Button onClick={handleConfirm}>Ajouter</Button>
          </div>
        </>
      ) : (
        <>
          {/* En-tête : titre + onglets + recherche */}
          <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
            <h2 className="text-base font-semibold pr-10">Ajouter un média</h2>
            <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
              <TabsList className="w-full">
                <TabsTrigger value="anime" className="flex-1">Anime</TabsTrigger>
                <TabsTrigger value="series" className="flex-1">Série</TabsTrigger>
                <TabsTrigger value="movie" className="flex-1">Film</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Rechercher..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* Résultats scrollables */}
          <SheetBody className="px-6 py-4 space-y-2">
            {loading && <p className="text-sm text-muted-foreground text-center py-6">Recherche...</p>}
            {!loading && results.length === 0 && query.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat</p>
            )}
            {!loading && results.length === 0 && !query.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">Tape un titre pour rechercher.</p>
            )}
            {results.map((r) => {
              const isAnilist = 'coverImage' in r
              const id = r.id
              const source: Source = isAnilist ? 'anilist' : 'tmdb'
              const title = isAnilist
                ? ((r as AnilistMedia).title.english ?? (r as AnilistMedia).title.romaji)
                : ((r as TmdbMedia).name ?? (r as TmdbMedia).title ?? '')
              const image = isAnilist
                ? (r as AnilistMedia).coverImage.large
                : posterUrl((r as TmdbMedia).poster_path)
              const alreadyAdded = items.some((i) => i.sourceId === String(id) && i.source === source)

              return (
                <Button
                  key={id}
                  variant="ghost"
                  className="w-full h-auto justify-start gap-3 px-2 py-2 disabled:opacity-60"
                  disabled={alreadyAdded}
                  onClick={() => !alreadyAdded && handleSelect(r)}
                >
                  <img src={image} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
                  <span className="text-left text-sm font-medium leading-tight flex-1 min-w-0 whitespace-normal line-clamp-2">{title}</span>
                  {alreadyAdded && <span className="text-xs text-muted-foreground shrink-0">Déjà ajouté</span>}
                </Button>
              )
            })}
          </SheetBody>
        </>
      )}
    </Sheet>
  )
}
