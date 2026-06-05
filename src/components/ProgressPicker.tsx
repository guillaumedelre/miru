import { useState, useEffect } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { getTvSeasons, getSeasonEpisodes, type TmdbSeason, type TmdbEpisodeDetail } from '@/api/tmdb'
import { getAnimeEpisodeCount } from '@/api/jikan'
import type { Source, MediaType } from '@/types'

interface Season {
  number: number
  name: string
  episodeCount: number
  globalOffset: number
  episodes: TmdbEpisodeDetail[] | null
}

interface Props {
  sourceId: string
  source: Source
  type: MediaType
  totalEpisodes?: number
  malId?: number
  checked: Set<number>
  onChange: (checked: Set<number>) => void
  onTotalResolved?: (total: number) => void
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

export default function ProgressPicker({ sourceId, source, type, totalEpisodes, malId, checked, onChange, onTotalResolved }: Props) {
  const [seasons, setSeasons] = useState<Season[]>([])
  const [loadingSeasons, setLoadingSeasons] = useState(false)
  const [loadingEpisodes, setLoadingEpisodes] = useState<number | null>(null)
  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set())
  const [resolvedTotal, setResolvedTotal] = useState<number | undefined>(totalEpisodes)
  const [loadingAll, setLoadingAll] = useState(false)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        .catch(() => setSeasons([]))
        .finally(() => setLoadingSeasons(false))
    } else if (totalEpisodes) {
      setSeasons(buildVirtualSeasons(totalEpisodes))
    } else if (malId) {
      // AniList n'a pas le total (série en cours) : fallback Jikan
      setLoadingSeasons(true)
      getAnimeEpisodeCount(malId)
        .then((count) => {
          if (count) {
            setResolvedTotal(count)
            setSeasons(buildVirtualSeasons(count))
            onTotalResolved?.(count)
          }
        })
        .catch(() => {})
        .finally(() => setLoadingSeasons(false))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceId, source, type, totalEpisodes, malId])

  async function toggleOpen(seasonNumber: number) {
    const next = new Set(openSeasons)
    if (next.has(seasonNumber)) {
      next.delete(seasonNumber)
    } else {
      next.add(seasonNumber)
      if (source === 'tmdb') {
        const season = seasons.find((s) => s.number === seasonNumber)
        if (season && season.episodes === null) {
          setLoadingEpisodes(seasonNumber)
          try {
            const eps = await getSeasonEpisodes(Number(sourceId), seasonNumber)
            setSeasons((prev) =>
              prev.map((s) => (s.number === seasonNumber ? { ...s, episodes: eps } : s))
            )
          } finally {
            setLoadingEpisodes(null)
          }
        }
      }
    }
    setOpenSeasons(next)
  }

  function globalEp(season: Season, localEp: number) {
    return season.globalOffset + localEp
  }

  function toggleEpisode(gep: number) {
    const next = new Set(checked)
    if (next.has(gep)) next.delete(gep)
    else next.add(gep)
    onChange(next)
  }

  async function toggleSeason(season: Season) {
    let eps = season.episodes

    // Charge les épisodes si pas encore fait (TMDB lazy)
    if (!eps && source === 'tmdb') {
      setLoadingEpisodes(season.number)
      try {
        eps = await getSeasonEpisodes(Number(sourceId), season.number)
        setSeasons((prev) =>
          prev.map((s) => (s.number === season.number ? { ...s, episodes: eps! } : s))
        )
      } finally {
        setLoadingEpisodes(null)
      }
    }

    if (!eps || eps.length === 0) return
    const globalEps = eps.map((e) => globalEp(season, e.episode_number))
    const allChecked = globalEps.every((g) => checked.has(g))
    const next = new Set(checked)
    if (allChecked) globalEps.forEach((g) => next.delete(g))
    else globalEps.forEach((g) => next.add(g))
    onChange(next)
  }

  function seasonCheckedCount(season: Season): number {
    let count = 0
    for (const ep of checked) {
      if (ep > season.globalOffset && ep <= season.globalOffset + season.episodeCount) count++
    }
    return count
  }

  function seasonIsAll(season: Season): boolean {
    if (season.episodeCount === 0) return false
    return seasonCheckedCount(season) === season.episodeCount
  }

  function seasonIsPartial(season: Season): boolean {
    const count = seasonCheckedCount(season)
    return count > 0 && !seasonIsAll(season)
  }

  if (loadingSeasons) {
    return <p className="text-sm text-muted-foreground text-center py-6">Chargement des saisons...</p>
  }

  if (seasons.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucune information disponible.</p>
  }

  const allLoadedEps = seasons.flatMap((s) =>
    s.episodes ? s.episodes.map((e) => globalEp(s, e.episode_number)) : []
  )
  const allEpsCount = seasons.reduce((acc, s) => acc + s.episodeCount, 0)
  const allChecked = allEpsCount > 0 && checked.size >= allEpsCount && seasons.every((s) => seasonIsAll(s))

  async function toggleAll() {
    if (allChecked) {
      onChange(new Set())
      return
    }

    // Pour TMDB : charger les saisons non encore ouvertes avant de tout cocher
    const unloaded = seasons.filter((s) => s.episodes === null)
    if (unloaded.length > 0) {
      setLoadingAll(true)
      const updates = await Promise.allSettled(
        unloaded.map(async (s) => {
          const eps = await getSeasonEpisodes(Number(sourceId), s.number)
          return { number: s.number, eps }
        })
      )
      setSeasons((prev) => prev.map((s) => {
        const update = updates.find(
          (u) => u.status === 'fulfilled' && u.value.number === s.number
        )
        if (update && update.status === 'fulfilled') return { ...s, episodes: update.value.eps }
        return s
      }))
      setLoadingAll(false)
      // Recalcule après le set (le state sera mis à jour au prochain render)
      // On utilise les épisodes fraîchement chargés directement
      const freshEps = updates
        .filter((u): u is PromiseFulfilledResult<{ number: number; eps: TmdbEpisodeDetail[] }> => u.status === 'fulfilled')
        .flatMap(({ value: { number: sNum, eps } }) => {
          const season = seasons.find((s) => s.number === sNum)!
          return eps.map((e) => globalEp(season, e.episode_number))
        })
      const alreadyLoaded = seasons
        .filter((s) => s.episodes !== null)
        .flatMap((s) => s.episodes!.map((e) => globalEp(s, e.episode_number)))
      const next = new Set(checked)
      ;[...alreadyLoaded, ...freshEps].forEach((g) => next.add(g))
      onChange(next)
    } else {
      const next = new Set(checked)
      allLoadedEps.forEach((g) => next.add(g))
      onChange(next)
    }
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs text-muted-foreground">
          {checked.size} / {resolvedTotal ?? '?'} épisode{checked.size > 1 ? 's' : ''} vus
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={toggleAll} disabled={loadingAll}>
          {loadingAll ? 'Chargement...' : allChecked ? 'Tout décocher' : 'Tout cocher'}
        </Button>
      </div>
      {seasons.map((season) => {
        const isOpen = openSeasons.has(season.number)
        const all = seasonIsAll(season)
        const partial = seasonIsPartial(season)
        const count = seasonCheckedCount(season)

        return (
          <div key={season.number}>
            <div className="flex items-center gap-2 py-2">
              <button
                type="button"
                className="flex items-center gap-2 flex-1 text-left"
                onClick={() => toggleOpen(season.number)}
              >
                {isOpen ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
                <span className="text-sm font-semibold">{season.name}</span>
              </button>
              <span className="text-xs text-muted-foreground">
                {season.episodes ? `${count} / ${season.episodeCount}` : `${season.episodeCount} ep.`}
              </span>
              {partial ? (
                <button
                  type="button"
                  onClick={() => toggleSeason(season)}
                  className="size-4 shrink-0 rounded-[4px] border-2 border-primary bg-primary flex items-center justify-center"
                  aria-label={`Tout cocher ${season.name}`}
                >
                  <Minus className="size-2.5 text-primary-foreground" />
                </button>
              ) : (
                <Checkbox
                  checked={all}
                  onCheckedChange={() => toggleSeason(season)}
                  aria-label={`Tout cocher ${season.name}`}
                />
              )}
            </div>

            {isOpen && (
              <div className="pb-2 pl-6 flex flex-col gap-0.5">
                {loadingEpisodes === season.number ? (
                  <p className="text-xs text-muted-foreground py-2">Chargement...</p>
                ) : season.episodes ? (
                  season.episodes.map((ep) => {
                    const gep = globalEp(season, ep.episode_number)
                    return (
                      <label
                        key={ep.episode_number}
                        className="flex items-center gap-3 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                      >
                        <Checkbox
                          checked={checked.has(gep)}
                          onCheckedChange={() => toggleEpisode(gep)}
                        />
                        <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">
                          {ep.episode_number}
                        </span>
                        <span className="text-sm leading-tight">{ep.name}</span>
                      </label>
                    )
                  })
                ) : null}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
