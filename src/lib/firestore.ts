import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase'
import type { TrackedItem, WatchedEpisode } from '@/types'

export interface UserData {
  items: TrackedItem[]
  watched: WatchedEpisode[]
}

export async function loadUserData(userId: string): Promise<UserData | null> {
  const snap = await getDoc(doc(db, 'users', userId))
  if (!snap.exists()) return null
  return snap.data() as UserData
}

export async function saveUserData(userId: string, data: UserData): Promise<void> {
  await setDoc(doc(db, 'users', userId), data)
}
