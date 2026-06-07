import { useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { X, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import MediaCard from '@/components/MediaCard'
import AddMediaDialog from '@/components/AddMediaDialog'
import { useStore } from '@/store'
import { useUIStore } from '@/store/ui'
import { useState } from 'react'
import type { MediaType, Status } from '@/types'
import { TYPE_LABEL_PLURAL, STATUS_LABEL } from '@/config/constants'

type TypeFilter = 'all' | MediaType
type StatusFilter = 'all' | Status

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'anime', label: TYPE_LABEL_PLURAL.anime },
  { value: 'series', label: TYPE_LABEL_PLURAL.series },
  { value: 'movie', label: TYPE_LABEL_PLURAL.movie },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'watching', label: STATUS_LABEL.watching },
  { value: 'completed', label: STATUS_LABEL.completed },
]

const VALID_TYPES = new Set<string>(['all', 'anime', 'series', 'movie'])
const VALID_STATUSES = new Set<string>(['all', 'watching', 'completed'])

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium border-2 transition-colors ${
        active
          ? 'bg-primary text-primary-foreground border-primary'
          : 'bg-card border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export default function Library() {
  const items = useStore((s) => s.items)
  const [searchParams, setSearchParams] = useSearchParams()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [flippedId, setFlippedId] = useState<string | null>(null)
  const setActions = useUIStore((s) => s.setTopbarActions)

  const rawType = searchParams.get('type') ?? 'all'
  const rawStatus = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''

  const typeFilter: TypeFilter = VALID_TYPES.has(rawType) ? (rawType as TypeFilter) : 'all'
  const statusFilter: StatusFilter = VALID_STATUSES.has(rawStatus) ? (rawStatus as StatusFilter) : 'all'

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === 'all' || value === '') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }

  useEffect(() => {
    setActions(
      <Button onClick={() => setDialogOpen(true)}>+ Ajouter</Button>
    )
    return () => setActions(null)
  }, [setActions])

  const filtered = items
    .filter((i) => typeFilter === 'all' || i.type === typeFilter)
    .filter((i) => statusFilter === 'all' || i.status === statusFilter)
    .filter((i) => !search.trim() || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))

  return (
    <div>
      {/* Zone sticky : recherche + filtres */}
      <div className="sticky top-14 z-20 -mx-3 px-3 sm:-mx-6 sm:px-6 bg-background pt-1 pb-3 space-y-2 border-b border-border mb-4">
        <div className="relative">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            className={search ? 'pr-8' : ''}
          />
          {search && (
            <button
              onClick={() => setParam('search', '')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] pb-px">
          {TYPE_FILTERS.map(f => (
            <Chip key={f.value} active={typeFilter === f.value} onClick={() => setParam('type', f.value)}>
              {f.label}
            </Chip>
          ))}
          <div className="w-px bg-border shrink-0 mx-1" />
          {STATUS_FILTERS.map(f => (
            <Chip key={f.value} active={statusFilter === f.value} onClick={() => setParam('status', f.value)}>
              {f.label}
            </Chip>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Aucun média dans cette catégorie.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
          {filtered.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              flipped={flippedId === item.id}
              onFlip={() => setFlippedId(id => id === item.id ? null : item.id)}
            />
          ))}
        </div>
      )}

      {/* FAB - desktop uniquement */}
      <button
        onClick={() => setDialogOpen(true)}
        className="hidden sm:flex fixed bottom-6 right-6 z-30 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors items-center justify-center"
        title="Ajouter un média"
      >
        <Plus size={24} />
      </button>

      <AddMediaDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
