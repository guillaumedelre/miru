import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { create, type UseBoundStore, type StoreApi } from 'zustand'
import { loadUserData, saveUserData } from '@/lib/firestore'
import { notifyError } from '@/lib/errors'
import type { TrackedItem, TrackedItemPatch, WatchedEpisode } from '@/types'

export interface MiruStore {
  items: TrackedItem[]
  watched: WatchedEpisode[]

  addItem: (item: TrackedItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, patch: TrackedItemPatch) => void

  markWatched: (itemId: string, episode: number) => void
  unmarkWatched: (itemId: string, episode: number) => void
  setWatched: (itemId: string, episodes: number[]) => void
  isWatched: (itemId: string, episode: number) => boolean
  getWatchedForItem: (itemId: string) => number[]
}

function createMiruStore(): UseBoundStore<StoreApi<MiruStore>> {
  return create<MiruStore>()((set, get) => ({
    items: [],
    watched: [],

    addItem: (item) =>
      set((s) => ({ items: [...s.items, item] })),

    removeItem: (id) =>
      set((s) => ({
        items: s.items.filter((i) => i.id !== id),
        watched: s.watched.filter((w) => w.itemId !== id),
      })),

    updateItem: (id, patch) =>
      set((s) => ({
        items: s.items.map((i) => (i.id === id ? { ...i, ...patch } as TrackedItem : i)),
      })),

    markWatched: (itemId, episode) => {
      if (get().isWatched(itemId, episode)) return
      const entry: WatchedEpisode = { itemId, episode, watchedAt: new Date().toISOString() }
      set((s) => ({ watched: [...s.watched, entry] }))
    },

    unmarkWatched: (itemId, episode) =>
      set((s) => ({
        watched: s.watched.filter((w) => !(w.itemId === itemId && w.episode === episode)),
      })),

    setWatched: (itemId, episodes) =>
      set((s) => ({
        watched: [
          ...s.watched.filter((w) => w.itemId !== itemId),
          ...episodes.map((ep) => ({ itemId, episode: ep, watchedAt: new Date().toISOString() })),
        ],
      })),

    isWatched: (itemId, episode) =>
      get().watched.some((w) => w.itemId === itemId && w.episode === episode),

    getWatchedForItem: (itemId) =>
      get().watched.filter((w) => w.itemId === itemId).map((w) => w.episode),
  }))
}

const StoreContext = createContext<UseBoundStore<StoreApi<MiruStore>> | null>(null)

export function StoreProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [store] = useState(createMiruStore)
  const [ready, setReady] = useState(false)

  useEffect(() => {

    // Charge les données depuis Firestore
    loadUserData(userId)
      .then((data) => {
        if (data) store.setState({ items: data.items, watched: data.watched })
      })
      .catch((err) => notifyError('Impossible de charger ta médiathèque.', err))
      .finally(() => setReady(true))

    // Sauvegarde dans Firestore à chaque changement (débounce 1.5s)
    let timeout: ReturnType<typeof setTimeout>
    const unsub = store.subscribe((state) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        saveUserData(userId, { items: state.items, watched: state.watched })
          .catch((err) => notifyError('La sauvegarde a échoué.', err))
      }, 1500)
    })

    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [userId, store])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="texture" aria-hidden />
        <p className="text-muted-foreground text-sm">Chargement...</p>
      </div>
    )
  }

  return (
    <StoreContext.Provider value={store}>
      {children}
    </StoreContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useStore<T = MiruStore>(
  selector: (state: MiruStore) => T = (s) => s as unknown as T
): T {
  const store = useContext(StoreContext)
  if (!store) throw new Error('useStore must be used inside StoreProvider')
  return store(selector)
}
