import { renderHook, act } from '@testing-library/react'
import { useAsyncState } from '@/hooks/useAsyncState'
import { useUIStore } from '@/store/ui'

describe('useAsyncState', () => {
  it('returns initial state', () => {
    const { result } = renderHook(() => useAsyncState<string | null>(null))

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(false)
  })

  it('sets loading true during run, then false after resolving', async () => {
    const { result } = renderHook(() => useAsyncState<string | null>(null))

    let resolvePromise!: (value: string) => void
    const deferred = new Promise<string>((res) => { resolvePromise = res })

    act(() => {
      result.current.run(() => deferred)
    })

    expect(result.current.loading).toBe(true)
    expect(result.current.data).toBeNull()

    await act(async () => {
      resolvePromise('hello')
      await deferred
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('hello')
  })

  it('sets loading false in finally when fn throws, data unchanged', async () => {
    const { result } = renderHook(() => useAsyncState<string>('initial'))

    await act(async () => {
      await result.current.run(() => Promise.reject(new Error('boom'))).catch(() => {})
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBe('initial')
  })

  it('setData updates data directly', () => {
    const { result } = renderHook(() => useAsyncState<number>(0))

    act(() => {
      result.current.setData(42)
    })

    expect(result.current.data).toBe(42)
  })

  it('run is a stable reference across re-renders', () => {
    const { result, rerender } = renderHook(() => useAsyncState<null>(null))

    const firstRun = result.current.run
    rerender()
    expect(result.current.run).toBe(firstRun)
  })
})

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ topbarActions: null })
  })

  it('has null topbarActions as initial state', () => {
    const { result } = renderHook(() => useUIStore())
    expect(result.current.topbarActions).toBeNull()
  })

  it('setTopbarActions updates the store', () => {
    const { result } = renderHook(() => useUIStore())

    act(() => {
      result.current.setTopbarActions('some-node')
    })

    expect(result.current.topbarActions).toBe('some-node')
  })

  it('setTopbarActions accepts null to clear', () => {
    const { result } = renderHook(() => useUIStore())

    act(() => {
      result.current.setTopbarActions('some-node')
    })
    act(() => {
      result.current.setTopbarActions(null)
    })

    expect(result.current.topbarActions).toBeNull()
  })
})
