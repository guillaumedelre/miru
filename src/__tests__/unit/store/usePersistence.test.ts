vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(), saveUserData: vi.fn() }))

import { renderHook, waitFor, act } from '@testing-library/react'
import { create } from 'zustand'
import { usePersistence } from '@/store/usePersistence'
import { loadUserData, saveUserData } from '@/lib/firestore'

interface TestState {
  items: { id: string }[]
  watched: { itemId: string; episode: number; watchedAt: string }[]
}

function makeStore() {
  return create<TestState>()(() => ({ items: [], watched: [] }))
}

describe('usePersistence', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets ready=false initially and true after loadUserData resolves', async () => {
    vi.mocked(loadUserData).mockResolvedValue(null)
    const store = makeStore()
    const { result } = renderHook(() => usePersistence('user-1', store as never))

    expect(result.current.ready).toBe(false)

    await waitFor(() => expect(result.current.ready).toBe(true))
  })

  it('hydrates store state when loadUserData returns data', async () => {
    const data = { items: [{ id: 'i1' }], watched: [] }
    vi.mocked(loadUserData).mockResolvedValue(data as never)
    const store = makeStore()
    renderHook(() => usePersistence('user-1', store as never))

    await waitFor(() => expect(store.getState().items).toHaveLength(1))
    expect(store.getState().items[0].id).toBe('i1')
  })

  it('leaves store state empty when loadUserData returns null', async () => {
    vi.mocked(loadUserData).mockResolvedValue(null)
    const store = makeStore()
    renderHook(() => usePersistence('user-1', store as never))

    await waitFor(() => expect(store.getState().items).toHaveLength(0))
  })

  it('saveStatus starts as idle', async () => {
    vi.mocked(loadUserData).mockResolvedValue(null)
    const store = makeStore()
    const { result } = renderHook(() => usePersistence('user-1', store as never))

    await waitFor(() => expect(result.current.ready).toBe(true))
    expect(result.current.saveStatus).toBe('idle')
  })

  it('calls saveUserData after a store change (debounce)', async () => {
    vi.mocked(loadUserData).mockResolvedValue(null)
    vi.mocked(saveUserData).mockResolvedValue(undefined)
    const store = makeStore()
    renderHook(() => usePersistence('user-1', store as never))

    act(() => store.setState({ items: [{ id: 'new' }] }))

    await waitFor(() => expect(saveUserData).toHaveBeenCalledTimes(1), { timeout: 4000 })
  }, 6000)
})
