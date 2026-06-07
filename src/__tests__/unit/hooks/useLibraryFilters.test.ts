import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import React from 'react'
import { useLibraryFilters } from '@/hooks/useLibraryFilters'

function makeWrapper(initialUrl = '/library') {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(MemoryRouter, { initialEntries: [initialUrl] }, children)
}

describe('useLibraryFilters', () => {
  it('returns all filters as "all" by default', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper() })
    expect(result.current.typeFilter).toBe('all')
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.search).toBe('')
  })

  it('reads typeFilter from URL param', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?type=anime') })
    expect(result.current.typeFilter).toBe('anime')
  })

  it('reads statusFilter from URL param', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?status=watching') })
    expect(result.current.statusFilter).toBe('watching')
  })

  it('reads search from URL param', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?search=naruto') })
    expect(result.current.search).toBe('naruto')
  })

  it('falls back to "all" for unknown type param', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?type=unknown') })
    expect(result.current.typeFilter).toBe('all')
  })

  it('falls back to "all" for unknown status param', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?status=nope') })
    expect(result.current.statusFilter).toBe('all')
  })

  it('setParam updates the URL', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper() })

    act(() => result.current.setParam('type', 'series'))

    expect(result.current.typeFilter).toBe('series')
  })

  it('setParam deletes the key when value is "all"', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?type=anime') })

    act(() => result.current.setParam('type', 'all'))

    expect(result.current.typeFilter).toBe('all')
  })

  it('setParam deletes the key when value is empty string', () => {
    const { result } = renderHook(() => useLibraryFilters(), { wrapper: makeWrapper('/library?search=naruto') })

    act(() => result.current.setParam('search', ''))

    expect(result.current.search).toBe('')
  })
})
