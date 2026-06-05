import { useState } from 'react'
import { Info, List, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { type MaskedImageVariant } from '@/components/ui/masked-image'
import MediaSheet from '@/components/MediaSheet'
import { useStore } from '@/store'
import type { TrackedItem } from '@/types'

const TYPE_LABELS: Record<string, string> = {
  anime: 'Anime',
  series: 'Série',
  movie: 'Film',
}

const MASK_MAP: Record<MaskedImageVariant, string> = {
  shape1: '/mask-shape-1.svg',
  shape2: '/mask-shape-2.svg',
  shape3: '/mask-shape-3.svg',
  shape4: '/mask-shape-4.svg',
  shape5: '/mask-shape-5.svg',
  shape6: '/mask-shape-6.svg',
}

const VARIANTS: MaskedImageVariant[] = ['shape1', 'shape2', 'shape3', 'shape4', 'shape5', 'shape6']

function variantForId(id: string): MaskedImageVariant {
  const hash = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return VARIANTS[hash % VARIANTS.length]
}

interface Props {
  item: TrackedItem
}

export default function MediaCard({ item }: Props) {
  const { removeItem } = useStore()
  const [sheetOpen, setSheetOpen] = useState(false)
  const [initialTab, setInitialTab] = useState<'info' | 'progress'>('info')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const variant = variantForId(item.id)
  const maskStyle = {
    maskImage: `url(${MASK_MAP[variant]})`,
    maskSize: '100% 100%',
    maskRepeat: 'no-repeat',
    maskPosition: 'center',
  }

  function openSheet(tab: 'info' | 'progress') {
    setInitialTab(tab)
    setSheetOpen(true)
  }

  return (
    <>
      <div
        className="group flex flex-col items-center w-60"
        style={{ perspective: '1000px' }}
      >
        <div className="relative w-60 h-80 transition-transform duration-500 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">

          {/* Front : image masquée + overlay titre/badge */}
          <div className="absolute inset-0 [backface-visibility:hidden]">
            <div className="relative w-full h-full" style={maskStyle}>
              <img
                src={item.coverImage}
                alt={item.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
                <Badge variant="secondary" className="text-xs">{TYPE_LABELS[item.type]}</Badge>
                <p className="text-white font-bold text-sm leading-tight line-clamp-3 drop-shadow-md">
                  {item.title}
                </p>
              </div>
            </div>
          </div>

          {/* Back : infos + actions */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-card px-4 [backface-visibility:hidden] [transform:rotateY(180deg)]"
            style={maskStyle}
          >
            <p className="font-semibold text-sm leading-tight line-clamp-2 text-center">{item.title}</p>
            {item.type !== 'movie' && (
              <p className="text-xs text-muted-foreground">
                Ep. {item.progress}{item.totalEpisodes ? ` / ${item.totalEpisodes}` : ''}
              </p>
            )}
            <div className="flex items-center gap-3">
              <button
                onClick={() => openSheet('info')}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/70 transition-colors cursor-pointer"
                title="Fiche info"
              >
                <Info size={16} />
              </button>
              {item.type !== 'movie' && (
                <button
                  onClick={() => openSheet('progress')}
                  className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary hover:bg-secondary/70 transition-colors cursor-pointer"
                  title="Avancement"
                >
                  <List size={16} />
                </button>
              )}
              <button
                onClick={() => setConfirmOpen(true)}
                className="w-10 h-10 rounded-full flex items-center justify-center bg-secondary hover:bg-destructive hover:text-destructive-foreground transition-colors cursor-pointer"
                title="Supprimer"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <MediaSheet
        item={item}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        initialTab={initialTab}
      />

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer ce média ?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{item.title}</span> sera retiré de ta médiathèque ainsi que tout ton historique de visionnage associé.
          </p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => { removeItem(item.id); setConfirmOpen(false) }}>Supprimer</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
