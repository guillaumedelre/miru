import { useState, useCallback } from 'react'

export function useAsyncState<T>(initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(false)

  const run = useCallback(async (fn: () => Promise<T>): Promise<void> => {
    setLoading(true)
    try {
      setData(await fn())
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, setData, setLoading, run }
}
