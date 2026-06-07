import { useState, useEffect } from 'react'
import { getTvSeasons, type TmdbSeason, type TmdbEpisodeDetail } from '@/api/tmdb'
import { getAnimeEpisodeCount } from '@/api/jikan'
import { notifyApiError } from '@/lib/errors'
import type { Source, MediaType } from '@/types'

export interface Season {
  number: number
  name: string
  episodeCount: number
  globalOffset: number
  episodes: TmdbEpisodeDetail[] | null
}

function buildVirtualSeasons(total: number): Season[] {
  const seasons: Season[] = []
  const perPart = 13
  let offset = 0
  let part = 1
  while (offset < total) {
    const count = Math.min(perPart, total - offset)
    seasons.push({
      number: part,
      name: `Partie ${part}`,
      episodeCount: count,
      globalOffset: offset,
      episodes: Array.from({ length: count }, (_, i) => ({
        episode_number: i + 1,
        name: `Épisode ${offset + i + 1}`,
      })),
    })
    offset += count
    part++
  }
  return seasons
}

interface Options {
  sourceId: string
  source: Source
  type: MediaType
  totalEpisodes?: number
  malId?: number
  onTotalResolved?: (total: number) => void
}

export function useSeasons({ sourceId, source, type, totalEpisodes, malId, onTotalResolved }: Options) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)
  const [resolvedTotal, setResolvedTotal] = useState<number | undefined>(totalEpisodes)

  useEffect(() => {
    async function loadSeasons() {
      setResolvedTotal(totalEpisodes)

      if (source === 'tmdb' && type === 'series') {
        setLoadingSeasons(true)
        getTvSeasons(Number(sourceId))
          .then(({ seasons: tmdbSeasons }: { seasons: TmdbSeason[]; isFinished: boolean }) => {
            let offset = 0
            const built: Season[] = tmdbSeasons.map((s) => {
              const season: Season = {
                number: s.season_number,
                name: s.name,
                episodeCount: s.episode_count,
                globalOffset: offset,
                episodes: null,
              }
              offset += s.episode_count
              return season
            })
            setSeasons(built)
          })
          .catch((err) => { notifyApiError('useSeasons/tmdb', err); setSeasons([]) })
          .finally(() => setLoadingSeasons(false))
      } else if (totalEpisodes) {
        setSeasons(buildVirtualSeasons(totalEpisodes))
      } else if (malId) {
        setLoadingSeasons(true)
        getAnimeEpisodeCount(malId)
          .then((count) => {
            if (count) {
              setResolvedTotal(count)
              setSeasons(buildVirtualSeasons(count))
              onTotalResolved?.(count)
            }
          })
          .catch((err) => notifyApiError('useSeasons/jikan', err))
          .finally(() => setLoadingSeasons(false))
      }
    }

    loadSeasons()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, source, type, totalEpisodes, malId])

  return { seasons, setSeasons, loadingSeasons, resolvedTotal }
}
