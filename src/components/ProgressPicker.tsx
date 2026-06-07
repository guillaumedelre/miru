import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { ChevronDown, ChevronRight, Minus } from 'lucide-react'
import { getSeasonEpisodes, type TmdbEpisodeDetail } from '@/api/tmdb'
import { useSeasons, type Season } from '@/hooks/useSeasons'
import type { Source, MediaType } from '@/types'

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

function globalEp(season: Season, localEp: number) {
  return season.globalOffset + localEp
}

interface SeasonRowProps {
  season: Season
  isOpen: boolean
  loadingEpisodes: number | null
  checked: Set<number>
  onToggleOpen: (n: number) => void
  onToggleSeason: (s: Season) => void
  onToggleEpisode: (gep: number) => void
}

function SeasonRow({ season, isOpen, loadingEpisodes, checked, onToggleOpen, onToggleSeason, onToggleEpisode }: SeasonRowProps) {
  const checkedCount = [...checked].filter(
    ep => ep > season.globalOffset && ep <= season.globalOffset + season.episodeCount
  ).length
  const all = season.episodeCount > 0 && checkedCount === season.episodeCount
  const partial = checkedCount > 0 && !all

  return (
    <div>
      <div className="flex items-center gap-2 py-2">
        <button
          type="button"
          className="flex items-center gap-2 flex-1 text-left"
          onClick={() => onToggleOpen(season.number)}
        >
          {isOpen
            ? <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
            : <ChevronRight className="size-4 shrink-0 text-muted-foreground" />}
          <span className="text-sm font-semibold">{season.name}</span>
        </button>
        <span className="text-xs text-muted-foreground">
          {season.episodes ? `${checkedCount} / ${season.episodeCount}` : `${season.episodeCount} ep.`}
        </span>
        {partial ? (
          <button
            type="button"
            onClick={() => onToggleSeason(season)}
            className="size-4 shrink-0 rounded-[4px] border-2 border-primary bg-primary flex items-center justify-center"
            aria-label={`Tout cocher ${season.name}`}
          >
            <Minus className="size-2.5 text-primary-foreground" />
          </button>
        ) : (
          <Checkbox
            checked={all}
            onCheckedChange={() => onToggleSeason(season)}
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
                  <Checkbox checked={checked.has(gep)} onCheckedChange={() => onToggleEpisode(gep)} />
                  <span className="text-xs text-muted-foreground w-6 shrink-0 text-right">{ep.episode_number}</span>
                  <span className="text-sm leading-tight">{ep.name}</span>
                </label>
              )
            })
          ) : null}
        </div>
      )}
    </div>
  )
}

export default function ProgressPicker({ sourceId, source, type, totalEpisodes, malId, checked, onChange, onTotalResolved }: Props) {
  const { seasons, setSeasons, loadingSeasons, resolvedTotal } = useSeasons({
    sourceId, source, type, totalEpisodes, malId, onTotalResolved,
  })

  const [openSeasons, setOpenSeasons] = useState<Set<number>>(new Set())
  const [loadingEpisodes, setLoadingEpisodes] = useState<number | null>(null)
  const [loadingAll, setLoadingAll] = useState(false)

  async function loadSeasonEpisodes(seasonNumber: number): Promise<TmdbEpisodeDetail[]> {
    setLoadingEpisodes(seasonNumber)
    try {
      const eps = await getSeasonEpisodes(Number(sourceId), seasonNumber)
      setSeasons(prev => prev.map(s => s.number === seasonNumber ? { ...s, episodes: eps } : s))
      return eps
    } finally {
      setLoadingEpisodes(null)
    }
  }

  async function handleToggleOpen(seasonNumber: number) {
    const next = new Set(openSeasons)
    if (next.has(seasonNumber)) {
      next.delete(seasonNumber)
    } else {
      next.add(seasonNumber)
      if (source === 'tmdb') {
        const season = seasons.find(s => s.number === seasonNumber)
        if (season?.episodes === null) await loadSeasonEpisodes(seasonNumber)
      }
    }
    setOpenSeasons(next)
  }

  async function handleToggleSeason(season: Season) {
    let eps = season.episodes
    if (!eps && source === 'tmdb') eps = await loadSeasonEpisodes(season.number)
    if (!eps?.length) return

    const globalEps = eps.map(e => globalEp(season, e.episode_number))
    const allChecked = globalEps.every(g => checked.has(g))
    const next = new Set(checked)
    if (allChecked) globalEps.forEach(g => next.delete(g))
    else globalEps.forEach(g => next.add(g))
    onChange(next)
  }

  function handleToggleEpisode(gep: number) {
    const next = new Set(checked)
    if (next.has(gep)) next.delete(gep)
    else next.add(gep)
    onChange(next)
  }

  const allEpsCount = seasons.reduce((acc, s) => acc + s.episodeCount, 0)
  const allChecked = allEpsCount > 0 && checked.size >= allEpsCount && seasons.every(s => {
    const count = [...checked].filter(ep => ep > s.globalOffset && ep <= s.globalOffset + s.episodeCount).length
    return count === s.episodeCount
  })

  async function handleToggleAll() {
    if (allChecked) { onChange(new Set()); return }

    const unloaded = seasons.filter(s => s.episodes === null)
    if (unloaded.length > 0) {
      setLoadingAll(true)
      const updates = await Promise.allSettled(
        unloaded.map(async s => {
          const eps = await getSeasonEpisodes(Number(sourceId), s.number)
          return { number: s.number, eps }
        })
      )
      setSeasons(prev => prev.map(s => {
        const update = updates.find(u => u.status === 'fulfilled' && u.value.number === s.number)
        if (update?.status === 'fulfilled') return { ...s, episodes: update.value.eps }
        return s
      }))
      setLoadingAll(false)

      const freshEps = updates
        .filter((u): u is PromiseFulfilledResult<{ number: number; eps: TmdbEpisodeDetail[] }> => u.status === 'fulfilled')
        .flatMap(({ value: { number: sNum, eps } }) => {
          const season = seasons.find(s => s.number === sNum)!
          return eps.map(e => globalEp(season, e.episode_number))
        })
      const alreadyLoaded = seasons
        .filter(s => s.episodes !== null)
        .flatMap(s => s.episodes!.map(e => globalEp(s, e.episode_number)))
      const next = new Set(checked)
      ;[...alreadyLoaded, ...freshEps].forEach(g => next.add(g))
      onChange(next)
    } else {
      const next = new Set(checked)
      seasons.flatMap(s => s.episodes!.map(e => globalEp(s, e.episode_number))).forEach(g => next.add(g))
      onChange(next)
    }
  }

  if (loadingSeasons) {
    return <p className="text-sm text-muted-foreground text-center py-6">Chargement des saisons...</p>
  }

  if (seasons.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-6">Aucune information disponible.</p>
  }

  return (
    <div className="flex flex-col divide-y divide-border">
      <div className="flex items-center justify-between py-2">
        <span className="text-xs text-muted-foreground">
          {checked.size} / {resolvedTotal ?? '?'} épisode{checked.size > 1 ? 's' : ''} vus
        </span>
        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={handleToggleAll} disabled={loadingAll}>
          {loadingAll ? 'Chargement...' : allChecked ? 'Tout décocher' : 'Tout cocher'}
        </Button>
      </div>
      {seasons.map(season => (
        <SeasonRow
          key={season.number}
          season={season}
          isOpen={openSeasons.has(season.number)}
          loadingEpisodes={loadingEpisodes}
          checked={checked}
          onToggleOpen={handleToggleOpen}
          onToggleSeason={handleToggleSeason}
          onToggleEpisode={handleToggleEpisode}
        />
      ))}
    </div>
  )
}
