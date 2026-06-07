import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import type { MediaType } from '@/types'

interface Props {
  tab: MediaType
  query: string
  onTabChange: (tab: MediaType) => void
  onQueryChange: (query: string) => void
}

export default function SearchPanel({ tab, query, onTabChange, onQueryChange }: Props) {
  return (
    <div className="shrink-0 px-6 pt-6 pb-4 border-b border-border space-y-4">
      <h2 className="text-base font-semibold pr-10">Ajouter un média</h2>
      <Tabs value={tab} onValueChange={(v) => onTabChange(v as MediaType)}>
        <TabsList className="w-full">
          <TabsTrigger value="anime" className="flex-1">Anime</TabsTrigger>
          <TabsTrigger value="series" className="flex-1">Série</TabsTrigger>
          <TabsTrigger value="movie" className="flex-1">Film</TabsTrigger>
        </TabsList>
      </Tabs>
      <Input
        placeholder="Rechercher..."
        value={query}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onQueryChange(e.target.value)}
        autoFocus
      />
    </div>
  )
}
