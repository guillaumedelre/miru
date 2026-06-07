import { toast } from 'sonner'

export function notifyError(message: string, err?: unknown): void {
  console.error(message, err)
  toast.error(message)
}

export function notifyApiError(context: string, err?: unknown): void {
  console.warn(`[${context}]`, err)
  toast.warning('Certaines données n\'ont pas pu être chargées.')
}

export function notifyEnrichment(context: string, err?: unknown): void {
  console.info(`[${context}]`, err)
  toast.info('Des informations complémentaires sont indisponibles.')
}

export function isNotFoundError(err: unknown): boolean {
  return err instanceof Error && /\b404\b/.test(err.message)
}
