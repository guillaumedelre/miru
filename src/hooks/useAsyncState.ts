import { useState } from 'react'

export function useAsyncState<T>(initial: T) {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(false)

  async function run(fn: () => Promise<T>): Promise<void> {
    setLoading(true)
    try {
      setData(await fn())
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, setData, setLoading, run }
}
