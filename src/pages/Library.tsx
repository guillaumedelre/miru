import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import MediaCard from '@/components/MediaCard'
import AddMediaDialog from '@/components/AddMediaDialog'
import { useStore } from '@/store'
import type { MediaType, Status } from '@/types'

type TypeFilter = 'all' | MediaType
type StatusFilter = 'all' | Status

const TYPE_FILTERS: { value: TypeFilter; label: string }[] = [
  { value: 'all', label: 'Tout' },
  { value: 'anime', label: 'Animes' },
  { value: 'series', label: 'Séries' },
  { value: 'movie', label: 'Films' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Tous' },
  { value: 'plan_to_watch', label: 'À voir' },
  { value: 'watching', label: 'En cours' },
  { value: 'completed', label: 'Terminé' },
]

export default function Library() {
  const items = useStore((s) => s.items)
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const filtered = items
    .filter((i) => typeFilter === 'all' || i.type === typeFilter)
    .filter((i) => statusFilter === 'all' || i.status === statusFilter)
    .filter((i) => !search.trim() || i.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.title.localeCompare(b.title, 'fr', { sensitivity: 'base' }))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Médiathèque</h1>
        <Button onClick={() => setDialogOpen(true)}>+ Ajouter</Button>
      </div>

      <div className="flex items-center gap-3">
        <Tabs value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <TabsList>
            {TYPE_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        <div className="relative flex-1">
          <Input
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={search ? 'pr-8' : ''}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Effacer la recherche"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            {STATUS_FILTERS.map((f) => (
              <TabsTrigger key={f.value} value={f.value}>{f.label}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm py-8 text-center">
          Aucun média dans cette catégorie.
        </p>
      ) : (
        <div className="flex flex-wrap gap-4">
          {filtered.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      <AddMediaDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </div>
  )
}
