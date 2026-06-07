import { Button } from '@/components/ui/button'
import { SheetBody } from '@/components/ui/sheet'
import ProgressPicker from '@/components/ProgressPicker'
import type { Pending } from '@/api/adapters'

interface Props {
  pending: Pending
  watchedEps: Set<number>
  onWatchedChange: (eps: Set<number>) => void
  onTotalResolved: (total: number) => void
  onBack: () => void
  onConfirm: () => void
}

export default function ConfirmPanel({ pending, watchedEps, onWatchedChange, onTotalResolved, onBack, onConfirm }: Props) {
  const showPicker = pending.type !== 'movie'

  return (
    <>
      <div className="shrink-0 flex gap-4 px-6 pt-6 pb-4 border-b border-border">
        <img src={pending.image} alt="" className="w-20 h-28 object-cover rounded-lg shrink-0 shadow-md" />
        <div className="flex flex-col justify-center gap-2 min-w-0 pr-8">
          <h2 className="text-base font-semibold leading-tight">{pending.title}</h2>
          {pending.totalEpisodes && (
            <p className="text-xs text-muted-foreground">{pending.totalEpisodes} épisodes au total</p>
          )}
          {watchedEps.size > 0 && (
            <p className="text-xs text-primary font-semibold">
              {watchedEps.size} épisode{watchedEps.size > 1 ? 's' : ''} coché{watchedEps.size > 1 ? 's' : ''}
            </p>
          )}
        </div>
      </div>

      {showPicker && (
        <SheetBody className="px-6 py-4">
          <ProgressPicker
            sourceId={String(pending.result.id)}
            source={pending.source}
            type={pending.type}
            totalEpisodes={pending.totalEpisodes}
            malId={pending.malId}
            checked={watchedEps}
            onChange={onWatchedChange}
            onTotalResolved={onTotalResolved}
          />
        </SheetBody>
      )}

      <div className="shrink-0 flex gap-2 justify-end px-6 py-4 border-t border-border mt-auto">
        <Button variant="ghost" onClick={onBack}>Retour</Button>
        <Button onClick={onConfirm}>Ajouter</Button>
      </div>
    </>
  )
}
