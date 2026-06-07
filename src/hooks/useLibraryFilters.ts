import { useSearchParams } from 'react-router-dom'
import type { MediaType, Status } from '@/types'

export type TypeFilter = 'all' | MediaType
export type StatusFilter = 'all' | Status

const VALID_TYPES = new Set<string>(['all', 'anime', 'series', 'movie'])
const VALID_STATUSES = new Set<string>(['all', 'watching', 'completed'])

export interface LibraryFilters {
  typeFilter: TypeFilter
  statusFilter: StatusFilter
  search: string
  setParam: (key: string, value: string) => void
}

export function useLibraryFilters(): LibraryFilters {
  const [searchParams, setSearchParams] = useSearchParams()

  const rawType = searchParams.get('type') ?? 'all'
  const rawStatus = searchParams.get('status') ?? 'all'
  const search = searchParams.get('search') ?? ''

  const typeFilter: TypeFilter = VALID_TYPES.has(rawType) ? (rawType as TypeFilter) : 'all'
  const statusFilter: StatusFilter = VALID_STATUSES.has(rawStatus) ? (rawStatus as StatusFilter) : 'all'

  function setParam(key: string, value: string) {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (value === 'all' || value === '') next.delete(key)
      else next.set(key, value)
      return next
    }, { replace: true })
  }

  return { typeFilter, statusFilter, search, setParam }
}
