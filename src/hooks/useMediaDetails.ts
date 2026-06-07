import { useEffect } from 'react'
import { getAnilistDetails, type AnilistMediaDetails } from '@/api/anilist'
import { getTmdbDetails, getWatchProviders, type TmdbDetails, type TmdbWatchProviders } from '@/api/tmdb'
import { useAsyncState } from '@/hooks/useAsyncState'
import { notifyEnrichment } from '@/lib/errors'
import type { TrackedItem } from '@/types'

interface MediaInfo {
  details: AnilistMediaDetails | TmdbDetails | null
  watchProviders: TmdbWatchProviders
}

const EMPTY_INFO: MediaInfo = { details: null, watchProviders: { providers: [], link: null } }
const detailsCache = new Map<string, MediaInfo>()

export function useMediaDetails(item: TrackedItem, open: boolean) {
  const { data: info, loading, run } = useAsyncState<MediaInfo>(EMPTY_INFO)

  useEffect(() => {
    if (!open) return
    const id = Number(item.sourceId)
    const mediaType = item.type === 'series' ? 'tv' : 'movie'
    const cacheKey = `${item.source}-${item.sourceId}-${item.type}`

    run(async () => {
      if (detailsCache.has(cacheKey)) return detailsCache.get(cacheKey)!

      let result: MediaInfo
      if (item.source === 'anilist') {
        const details = await getAnilistDetails(id).catch(() => null)
        result = { details, watchProviders: { providers: [], link: null } }
      } else {
        const [details, watchProviders] = await Promise.all([
          getTmdbDetails(id, mediaType).catch(() => null),
          getWatchProviders(id, mediaType).catch((err) => { notifyEnrichment('useMediaDetails/watch-providers', err); return null }),
        ])
        result = { details, watchProviders: watchProviders ?? { providers: [], link: null } }
      }

      detailsCache.set(cacheKey, result)
      return result
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item.sourceId, item.source, item.type])

  return { details: info.details, watchProviders: info.watchProviders, loading }
}
