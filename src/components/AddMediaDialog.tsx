import { useReducer, useEffect, useRef } from 'react'
import { Sheet, SheetClose, SheetBody } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import ProgressPicker from '@/components/ProgressPicker'
import { useStore } from '@/store'
import { searchMedia, type AnilistMedia } from '@/api/anilist'
import { searchTv, searchMovie, type TmdbMedia } from '@/api/tmdb'
import { resolveMediaMetadata, extractDisplayInfo, type MediaMetadata } from '@/api/adapters'
import type { TrackedItem, SeriesItem, MovieItem, MediaType } from '@/types'
import { inferWatchStatus } from '@/lib/inferWatchStatus'

type Pending = MediaMetadata & { result: AnilistMedia | TmdbMedia }

interface State {
  tab: MediaType
  query: string
  results: (AnilistMedia | TmdbMedia)[]
  loading: boolean
  pending: Pending | null
  watchedEps: Set<number>
  hasMore: boolean
}

type Action =
  | { type: 'CHANGE_TAB'; tab: MediaType }
  | { type: 'SET_QUERY'; query: string }
  | { type: 'SEARCH_START' }
  | { type: 'SEARCH_DONE'; results: (AnilistMedia | TmdbMedia)[]; hasMore: boolean; append: boolean }
  | { type: 'SELECT_RESULT'; pending: Pending }
  | { type: 'SET_WATCHED_EPS'; watchedEps: Set<number> }
  | { type: 'RESOLVE_TOTAL'; total: number }
  | { type: 'BACK' }
  | { type: 'RESET'; query: string }

function makeInitialState(query: string): State {
  return { tab: 'anime', query, results: [], loading: false, pending: null, watchedEps: new Set(), hasMore: false }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'CHANGE_TAB':
      return { ...state, tab: action.tab, results: [], pending: null, watchedEps: new Set(), hasMore: false }
    case 'SET_QUERY':
      return { ...state, query: action.query }
    case 'SEARCH_START':
      return { ...state, loading: true }
    case 'SEARCH_DONE':
      return {
        ...state,
        loading: false,
        results: action.append ? [...state.results, ...action.results] : action.results,
        hasMore: action.hasMore,
      }
    case 'SELECT_RESULT':
      return { ...state, pending: action.pending, watchedEps: new Set() }
    case 'SET_WATCHED_EPS':
      return { ...state, watchedEps: action.watchedEps }
    case 'RESOLVE_TOTAL':
      if (!state.pending) return state
      return { ...state, pending: { ...state.pending, totalEpisodes: action.total } }
    case 'BACK':
      return { ...state, pending: null }
    case 'RESET':
      return makeInitialState(action.query)
  }
}

interface Props {
  open: boolean
  onClose: () => void
  initialQuery?: string
}

export default function AddMediaDialog({ open, onClose, initialQuery }: Props) {
  const { addItem, markWatched, items } = useStore()
  const [state, dispatch] = useReducer(reducer, makeInitialState(initialQuery ?? ''))
  const { tab, query, results, loading, pending, watchedEps, hasMore } = state
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pageRef = useRef(1)

  useEffect(() => {
    dispatch({ type: 'RESET', query: initialQuery ?? '' })
  }, [open, initialQuery])

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current)
    if (!query.trim()) { dispatch({ type: 'SEARCH_DONE', results: [], hasMore: false, append: false }); return }
    debounce.current = setTimeout(async () => {
      pageRef.current = 1
      dispatch({ type: 'SEARCH_START' })
      try {
        if (tab === 'anime') {
          const { media, hasMore } = await searchMedia(query, 'ANIME', 1)
          dispatch({ type: 'SEARCH_DONE', results: media, hasMore, append: false })
        } else if (tab === 'series') {
          const { results, hasMore } = await searchTv(query, 1)
          dispatch({ type: 'SEARCH_DONE', results, hasMore, append: false })
        } else {
          const { results, hasMore } = await searchMovie(query, 1)
          dispatch({ type: 'SEARCH_DONE', results, hasMore, append: false })
        }
      } catch {
        dispatch({ type: 'SEARCH_DONE', results: [], hasMore: false, append: false })
      }
    }, 400)
  }, [query, tab])

  async function handleLoadMore() {
    const nextPage = pageRef.current + 1
    pageRef.current = nextPage
    dispatch({ type: 'SEARCH_START' })
    try {
      if (tab === 'anime') {
        const { media, hasMore } = await searchMedia(query, 'ANIME', nextPage)
        dispatch({ type: 'SEARCH_DONE', results: media, hasMore, append: true })
      } else if (tab === 'series') {
        const { results, hasMore } = await searchTv(query, nextPage)
        dispatch({ type: 'SEARCH_DONE', results, hasMore, append: true })
      } else {
        const { results, hasMore } = await searchMovie(query, nextPage)
        dispatch({ type: 'SEARCH_DONE', results, hasMore, append: true })
      }
    } catch {
      dispatch({ type: 'SEARCH_DONE', results: [], hasMore: false, append: true })
    }
  }

  async function handleSelect(result: AnilistMedia | TmdbMedia) {
    const meta = await resolveMediaMetadata(result, tab)
    dispatch({ type: 'SELECT_RESULT', pending: { ...meta, result } })
  }

  function handleConfirm() {
    if (!pending) return
    const progress = watchedEps.size > 0 ? Math.max(...watchedEps) : 0

    const status = inferWatchStatus({
      type: pending.type,
      isFinished: pending.isFinished,
      totalEpisodes: pending.totalEpisodes,
      watchedCount: watchedEps.size,
    })

    const itemId = crypto.randomUUID()
    const base = {
      id: itemId,
      sourceId: String(pending.result.id),
      title: pending.title,
      coverImage: pending.image,
      status,
      progress,
      totalEpisodes: pending.totalEpisodes,
      isFinished: pending.isFinished,
      episodeDuration: pending.episodeDuration,
    }
    let item: TrackedItem
    if (pending.type === 'anime') {
      item = { ...base, type: 'anime', source: 'anilist', malId: pending.malId }
    } else if (pending.type === 'series') {
      item = { ...base, type: 'series', source: 'tmdb' } satisfies SeriesItem
    } else {
      item = { ...base, type: 'movie', source: 'tmdb' } satisfies MovieItem
    }
    addItem(item)
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
                onChange={(eps) => dispatch({ type: 'SET_WATCHED_EPS', watchedEps: eps })}
                onTotalResolved={(total) => dispatch({ type: 'RESOLVE_TOTAL', total })}
              />
            </SheetBody>
          )}

          {/* Footer */}
          <div className="shrink-0 flex gap-2 justify-end px-6 py-4 border-t border-border mt-auto">
            <Button variant="ghost" onClick={() => dispatch({ type: 'BACK' })}>Retour</Button>
            <Button onClick={handleConfirm}>Ajouter</Button>
          </div>
        </>
      ) : (
        <>
          {/* En-tête : titre + onglets + recherche */}
          <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
            <h2 className="text-base font-semibold pr-10">Ajouter un média</h2>
            <Tabs value={tab} onValueChange={(v) => dispatch({ type: 'CHANGE_TAB', tab: v as MediaType })}>
              <TabsList className="w-full">
                <TabsTrigger value="anime" className="flex-1">Anime</TabsTrigger>
                <TabsTrigger value="series" className="flex-1">Série</TabsTrigger>
                <TabsTrigger value="movie" className="flex-1">Film</TabsTrigger>
              </TabsList>
            </Tabs>
            <Input
              placeholder="Rechercher..."
              value={query}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => dispatch({ type: 'SET_QUERY', query: e.target.value })}
              autoFocus
            />
          </div>

          {/* Résultats scrollables */}
          <SheetBody className="px-6 py-4 space-y-2">
            {loading && results.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Recherche...</p>
            )}
            {!loading && results.length === 0 && query.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">Aucun résultat</p>
            )}
            {!loading && results.length === 0 && !query.trim() && (
              <p className="text-sm text-muted-foreground text-center py-6">Tape un titre pour rechercher.</p>
            )}
            {results.map((r) => {
              const { title, image, source } = extractDisplayInfo(r)
              const id = r.id
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
            {hasMore && !loading && (
              <Button variant="outline" className="w-full mt-2" onClick={handleLoadMore}>
                Charger plus
              </Button>
            )}
            {loading && results.length > 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Chargement...</p>
            )}
          </SheetBody>
        </>
      )}
    </Sheet>
  )
}
