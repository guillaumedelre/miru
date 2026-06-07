import { AlertTriangle, Loader2 } from 'lucide-react'
import { useSaveStatus } from '@/store'

export default function SaveIndicator() {
  const status = useSaveStatus()
  if (status === 'idle') return null
  if (status === 'saving') {
    return <Loader2 size={14} className="animate-spin text-muted-foreground" aria-label="Sauvegarde en cours" />
  }
  return <AlertTriangle size={14} className="text-destructive" aria-label="Sauvegarde échouée" />
}
