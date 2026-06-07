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
        return r.success ? [r.data] : []
      })
    : []
  const watched = Array.isArray(raw?.watched)
    ? raw.watched.flatMap((ep: unknown) => {
        const r = WatchedEpisodeSchema.safeParse(ep)
        return r.success ? [r.data] : []
      })
    : []

  return { items, watched }
}

export async function saveUserData(userId: string, data: UserData): Promise<void> {
  await setDoc(doc(db, 'users', userId), data)
}
