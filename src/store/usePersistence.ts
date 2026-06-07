import { useEffect, useRef, useState } from 'react'
import type { UseBoundStore, StoreApi } from 'zustand'
import { loadUserData } from '@/lib/firestore'
import { saveWithRetry } from '@/lib/saveWithRetry'
import { notifyError } from '@/lib/errors'
import type { TrackedItem, WatchedEpisode } from '@/types'

export type SaveStatus = 'idle' | 'saving' | 'error'

interface StoreState {
  items: TrackedItem[]
  watched: WatchedEpisode[]
}

export function usePersistence(
  userId: string,
  store: UseBoundStore<StoreApi<StoreState>>,
): { ready: boolean; saveStatus: SaveStatus } {
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const saveVersion = useRef(0)

  useEffect(() => {
    loadUserData(userId)
      .then((data) => {
        if (data) store.setState({ items: data.items, watched: data.watched })
      })
      .catch((err) => notifyError('Impossible de charger ta médiathèque.', err))
      .finally(() => setReady(true))

    let timeout: ReturnType<typeof setTimeout>
    const unsub = store.subscribe((state) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => {
        const ver = ++saveVersion.current
        const data = { items: state.items, watched: state.watched }
        setSaveStatus('saving')
        saveWithRetry(userId, data)
          .then(() => { if (ver === saveVersion.current) setSaveStatus('idle') })
          .catch((err) => {
            if (ver === saveVersion.current) {
              notifyError('La sauvegarde a échoué.', err)
              setSaveStatus('error')
            }
          })
      }, 1500)
    })

    return () => {
      unsub()
      clearTimeout(timeout)
    }
  }, [userId, store])

  return { ready, saveStatus }
}
