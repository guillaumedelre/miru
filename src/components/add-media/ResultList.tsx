import { Button } from '@/components/ui/button'
import { SheetBody } from '@/components/ui/sheet'
import { extractDisplayInfo } from '@/api/adapters'
import type { AnilistMedia } from '@/api/anilist'
import type { TmdbMedia } from '@/api/tmdb'
import type { TrackedItem } from '@/types'

interface Props {
  results: (AnilistMedia | TmdbMedia)[]
  loading: boolean
  query: string
  hasMore: boolean
  existingItems: TrackedItem[]
  onSelect: (result: AnilistMedia | TmdbMedia) => void
  onLoadMore: () => void
}

export default function ResultList({ results, loading, query, hasMore, existingItems, onSelect, onLoadMore }: Props) {
  return (
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
        const alreadyAdded = existingItems.some((i) => i.sourceId === String(id) && i.source === source)

        return (
          <Button
            key={id}
            variant="ghost"
            className="w-full h-auto justify-start gap-3 px-2 py-2 disabled:opacity-60"
            disabled={alreadyAdded}
            onClick={() => !alreadyAdded && onSelect(r)}
          >
            <img src={image} alt="" className="w-10 h-14 object-cover rounded shrink-0" />
            <span className="text-left text-sm font-medium leading-tight flex-1 min-w-0 whitespace-normal line-clamp-2">{title}</span>
            {alreadyAdded && <span className="text-xs text-muted-foreground shrink-0">Déjà ajouté</span>}
          </Button>
        )
      })}
      {hasMore && !loading && (
        <Button variant="outline" className="w-full mt-2" onClick={onLoadMore}>
          Charger plus
        </Button>
      )}
      {loading && results.length > 0 && (
        <p className="text-sm text-muted-foreground text-center py-2">Chargement...</p>
      )}
    </SheetBody>
  )
}
