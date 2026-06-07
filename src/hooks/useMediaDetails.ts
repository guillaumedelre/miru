import { useEffect } from 'react'
import { getAnilistDetails, type AnilistMediaDetails } from '@/api/anilist'
import { getTmdbDetails, getWatchProviders, type TmdbDetails, type TmdbWatchProviders } from '@/api/tmdb'
import { useAsyncState } from '@/hooks/useAsyncState'
import { notifyEnrichment, isNotFoundError } from '@/lib/errors'
import type { TrackedItem } from '@/types'

interface MediaInfo {
  details: AnilistMediaDetails | TmdbDetails | null
  watchProviders: TmdbWatchProviders
}

interface CacheEntry {
  data: MediaInfo
  cachedAt: number
}

const CACHE_TTL_MS = 60 * 60 * 1000
const EMPTY_INFO: MediaInfo = { details: null, watchProviders: { providers: [], link: null } }
const detailsCache = new Map<string, CacheEntry>()

function getFromCache(key: string): MediaInfo | null {
  const entry = detailsCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) {
    detailsCache.delete(key)
    return null
  }
  return entry.data
}

export function useMediaDetails(item: TrackedItem, open: boolean) {
  const { data: info, loading, run } = useAsyncState<MediaInfo>(EMPTY_INFO)

  useEffect(() => {
    if (!open) return
    const id = Number(item.sourceId)
    const mediaType = item.type === 'series' ? 'tv' : 'movie'
    const cacheKey = `${item.source}-${item.sourceId}-${item.type}`

    run(async () => {
      const cached = getFromCache(cacheKey)
      if (cached) return cached

      let result: MediaInfo
      if (item.source === 'anilist') {
        const details = await getAnilistDetails(id).catch((err) => {
          if (!isNotFoundError(err)) notifyEnrichment('useMediaDetails/anilist', err)
          return null
        })
        result = { details, watchProviders: { providers: [], link: null } }
      } else {
        const [details, watchProviders] = await Promise.all([
          getTmdbDetails(id, mediaType).catch((err) => {
            if (!isNotFoundError(err)) notifyEnrichment('useMediaDetails/tmdb', err)
            return null
          }),
          getWatchProviders(id, mediaType).catch((err) => { notifyEnrichment('useMediaDetails/watch-providers', err); return null }),
        ])
        result = { details, watchProviders: watchProviders ?? { providers: [], link: null } }
      }

      detailsCache.set(cacheKey, { data: result, cachedAt: Date.now() })
      return result
    })
  }, [open, item.sourceId, item.source, item.type, run])

  return { details: info.details, watchProviders: info.watchProviders, loading }
}
