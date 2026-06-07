import { toast } from 'sonner'

export function notifyError(message: string, err?: unknown): void {
  console.error(message, err)
  toast.error(message)
}

export function notifyApiError(context: string, err?: unknown): void {
  console.error(`[${context}]`, err)
}
