import { useReducer, useEffect, useRef } from 'react'
import { Sheet, SheetClose } from '@/components/ui/sheet'
import { useStore } from '@/store'
import { searchMedia, type AnilistMedia } from '@/api/anilist'
import { searchTv, searchMovie, getTvSeasons, type TmdbMedia } from '@/api/tmdb'
import { resolveMediaMetadata, type Pending } from '@/api/adapters'
import SearchPanel from '@/components/add-media/SearchPanel'
import ResultList from '@/components/add-media/ResultList'
import ConfirmPanel from '@/components/add-media/ConfirmPanel'
import type { TrackedItem, SeriesItem, MovieItem, MediaType } from '@/types'
import { inferWatchStatus } from '@/lib/inferWatchStatus'

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
    if (!open) dispatch({ type: 'RESET', query: '' })
  }, [open])

  useEffect(() => {
    if (initialQuery) dispatch({ type: 'RESET', query: initialQuery })
  }, [initialQuery])

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
    const tvDetails = (result._source === 'tmdb' && tab === 'series')
      ? await getTvSeasons(Number(result.id)).catch(() => null)
      : null
    const meta = resolveMediaMetadata(result, tab, tvDetails)
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

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetClose />

      {pending ? (
        <ConfirmPanel
          pending={pending}
          watchedEps={watchedEps}
          onWatchedChange={(eps) => dispatch({ type: 'SET_WATCHED_EPS', watchedEps: eps })}
          onTotalResolved={(total) => dispatch({ type: 'RESOLVE_TOTAL', total })}
          onBack={() => dispatch({ type: 'BACK' })}
          onConfirm={handleConfirm}
        />
      ) : (
        <>
          <SearchPanel
            tab={tab}
            query={query}
            onTabChange={(t) => dispatch({ type: 'CHANGE_TAB', tab: t })}
            onQueryChange={(q) => dispatch({ type: 'SET_QUERY', query: q })}
          />
          <ResultList
            results={results}
            loading={loading}
            query={query}
            hasMore={hasMore}
            existingItems={items}
            onSelect={handleSelect}
            onLoadMore={handleLoadMore}
          />
        </>
      )}
    </Sheet>
  )
}
