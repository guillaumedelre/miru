import { FirebaseError } from 'firebase/app'
import { saveUserData } from '@/lib/firestore'
import type { UserData } from '@/types'

function isNonRetryable(err: unknown): boolean {
  return err instanceof FirebaseError &&
    (err.code === 'permission-denied' || err.code === 'unauthenticated')
}

export async function saveWithRetry(userId: string, data: UserData, retries = 3): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      await saveUserData(userId, data)
      return
    } catch (err) {
      if (isNonRetryable(err) || i >= retries - 1) {
        throw err
      }
      await new Promise<void>((r) => setTimeout(r, 2000 * 2 ** i))
    }
  }
}
