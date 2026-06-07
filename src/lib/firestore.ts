import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import { TrackedItemSchema, WatchedEpisodeSchema, type UserData } from '@/types'

export async function loadUserData(userId: string): Promise<UserData | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null

  const raw = snap.data()
  const items = Array.isArray(raw?.items)
    ? raw.items.flatMap((item: unknown) => {
        const r = TrackedItemSchema.safeParse(item)
        if (!r.success) {
          console.warn('[firestore] invalid item discarded', r.error.issues)
          return []
        }
        return [r.data]
      })
    : []
  const watched = Array.isArray(raw?.watched)
    ? raw.watched.flatMap((ep: unknown) => {
        const r = WatchedEpisodeSchema.safeParse(ep)
        if (!r.success) {
          console.warn('[firestore] invalid episode discarded', r.error.issues)
          return []
        }
        return [r.data]
      })
    : []

  return { items, watched }
}

export async function saveUserData(userId: string, data: UserData): Promise<void> {
  await setDoc(doc(db, 'users', userId), data)
}
