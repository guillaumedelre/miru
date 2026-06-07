vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(() => Promise.resolve(null)), saveUserData: vi.fn(() => Promise.resolve()) }))

import React from 'react'
import { renderHook, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useStore, StoreProvider } from '@/store'
import {
  animeItem,
  seriesItem,
  movieItem,
  planItem,
} from '@/__tests__/helpers/fixtures'

const wrapper = ({ children }: { children: React.ReactNode }) =>
  React.createElement(
    MemoryRouter,
    null,
    React.createElement(StoreProvider, { userId: 'test' }, children)
  )

async function setup() {
  const hook = renderHook(() => useStore(), { wrapper })
  await act(async () => {})
  return hook
}

describe('store - addItem', () => {
  it('adds an item to the empty list', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]).toEqual(animeItem)
  })

  it('appends multiple items', async () => {
    const { result } = await setup()
    act(() => {
      result.current.addItem(animeItem)
      result.current.addItem(seriesItem)
      result.current.addItem(movieItem)
    })
    expect(result.current.items).toHaveLength(3)
    expect(result.current.items.map((i) => i.id)).toEqual([
      animeItem.id,
      seriesItem.id,
      movieItem.id,
    ])
  })

  it('preserves existing items when adding a new one', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    act(() => { result.current.addItem(planItem) })
    expect(result.current.items).toHaveLength(2)
    expect(result.current.items[0]).toEqual(animeItem)
  })
})

describe('store - removeItem', () => {
  it('removes the targeted item', async () => {
    const { result } = await setup()
    act(() => {
      result.current.addItem(animeItem)
      result.current.addItem(seriesItem)
    })
    act(() => { result.current.removeItem(animeItem.id) })
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0].id).toBe(seriesItem.id)
  })

  it('removes watched episodes belonging to the removed item', async () => {
    const { result } = await setup()
    act(() => {
      result.current.addItem(animeItem)
      result.current.addItem(seriesItem)
    })
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
      result.current.markWatched(seriesItem.id, 1)
    })
    act(() => { result.current.removeItem(animeItem.id) })
    expect(result.current.watched.every((w) => w.itemId !== animeItem.id)).toBe(true)
    expect(result.current.watched).toHaveLength(1)
    expect(result.current.watched[0].itemId).toBe(seriesItem.id)
  })

  it('is a no-op when the id does not exist', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    act(() => { result.current.removeItem('non-existent-id') })
    expect(result.current.items).toHaveLength(1)
  })

  it('leaves watched episodes of other items intact', async () => {
    const { result } = await setup()
    act(() => {
      result.current.addItem(animeItem)
      result.current.addItem(movieItem)
    })
    act(() => {
      result.current.markWatched(movieItem.id, 1)
    })
    act(() => { result.current.removeItem(animeItem.id) })
    expect(result.current.watched).toHaveLength(1)
    expect(result.current.watched[0].itemId).toBe(movieItem.id)
  })
})

describe('store - updateItem', () => {
  it('applies a partial patch to the matching item', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    act(() => { result.current.updateItem(animeItem.id, { progress: 10, status: 'completed' }) })
    const updated = result.current.items.find((i) => i.id === animeItem.id)
    expect(updated?.progress).toBe(10)
    expect(updated?.status).toBe('completed')
  })

  it('does not mutate other fields', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    act(() => { result.current.updateItem(animeItem.id, { progress: 5 }) })
    const updated = result.current.items.find((i) => i.id === animeItem.id)
    expect(updated?.title).toBe(animeItem.title)
    expect(updated?.source).toBe(animeItem.source)
    expect(updated?.type).toBe(animeItem.type)
  })

  it('does not affect other items', async () => {
    const { result } = await setup()
    act(() => {
      result.current.addItem(animeItem)
      result.current.addItem(seriesItem)
    })
    act(() => { result.current.updateItem(animeItem.id, { progress: 20 }) })
    const other = result.current.items.find((i) => i.id === seriesItem.id)
    expect(other?.progress).toBe(seriesItem.progress)
  })

  it('is a no-op when the id does not exist', async () => {
    const { result } = await setup()
    act(() => { result.current.addItem(animeItem) })
    act(() => { result.current.updateItem('ghost', { progress: 99 }) })
    expect(result.current.items[0].progress).toBe(animeItem.progress)
  })
})

describe('store - markWatched', () => {
  it('adds a watched entry', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 1) })
    expect(result.current.watched).toHaveLength(1)
    expect(result.current.watched[0]).toMatchObject({ itemId: animeItem.id, episode: 1 })
  })

  it('is idempotent: does not duplicate an already-watched episode', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 1)
    })
    expect(result.current.watched).toHaveLength(1)
  })

  it('can mark different episodes independently', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
      result.current.markWatched(seriesItem.id, 1)
    })
    expect(result.current.watched).toHaveLength(3)
  })

  it('stores a watchedAt ISO timestamp', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 1) })
    const entry = result.current.watched[0]
    expect(entry.watchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
  })
})

describe('store - unmarkWatched', () => {
  it('removes the specified watched episode', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
    })
    act(() => { result.current.unmarkWatched(animeItem.id, 1) })
    expect(result.current.watched).toHaveLength(1)
    expect(result.current.watched[0].episode).toBe(2)
  })

  it('is a no-op when the episode was not watched', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 1) })
    act(() => { result.current.unmarkWatched(animeItem.id, 99) })
    expect(result.current.watched).toHaveLength(1)
  })

  it('does not affect watched entries of other items', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(seriesItem.id, 1)
    })
    act(() => { result.current.unmarkWatched(animeItem.id, 1) })
    expect(result.current.watched).toHaveLength(1)
    expect(result.current.watched[0].itemId).toBe(seriesItem.id)
  })
})

describe('store - setWatched', () => {
  it('replaces all watched episodes for the item', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
      result.current.markWatched(animeItem.id, 3)
    })
    act(() => { result.current.setWatched(animeItem.id, [4, 5]) })
    const forItem = result.current.watched.filter((w) => w.itemId === animeItem.id)
    expect(forItem.map((w) => w.episode).sort()).toEqual([4, 5])
  })

  it('does not affect watched entries of other items', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(seriesItem.id, 1)
      result.current.markWatched(seriesItem.id, 2)
      result.current.markWatched(animeItem.id, 1)
    })
    act(() => { result.current.setWatched(animeItem.id, [10, 11]) })
    const forSeries = result.current.watched.filter((w) => w.itemId === seriesItem.id)
    expect(forSeries).toHaveLength(2)
  })

  it('clears all watched episodes when given an empty array', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
    })
    act(() => { result.current.setWatched(animeItem.id, []) })
    const forItem = result.current.watched.filter((w) => w.itemId === animeItem.id)
    expect(forItem).toHaveLength(0)
  })

  it('stores watchedAt on each new entry', async () => {
    const { result } = await setup()
    act(() => { result.current.setWatched(animeItem.id, [1, 2]) })
    const forItem = result.current.watched.filter((w) => w.itemId === animeItem.id)
    forItem.forEach((w) => expect(w.watchedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/))
  })
})

describe('store - isWatched', () => {
  it('returns true for a watched episode', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 3) })
    expect(result.current.isWatched(animeItem.id, 3)).toBe(true)
  })

  it('returns false for an unwatched episode', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 3) })
    expect(result.current.isWatched(animeItem.id, 4)).toBe(false)
  })

  it('returns false when no episodes have been watched', async () => {
    const { result } = await setup()
    expect(result.current.isWatched(animeItem.id, 1)).toBe(false)
  })

  it('does not confuse episodes across different items', async () => {
    const { result } = await setup()
    act(() => { result.current.markWatched(animeItem.id, 1) })
    expect(result.current.isWatched(seriesItem.id, 1)).toBe(false)
  })
})

describe('store - getWatchedForItem', () => {
  it('returns the watched episode numbers for an item', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
      result.current.markWatched(animeItem.id, 5)
    })
    expect(result.current.getWatchedForItem(animeItem.id).sort((a, b) => a - b)).toEqual([1, 2, 5])
  })

  it('returns an empty array when nothing is watched', async () => {
    const { result } = await setup()
    expect(result.current.getWatchedForItem(animeItem.id)).toEqual([])
  })

  it('does not include episodes from other items', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(seriesItem.id, 1)
      result.current.markWatched(seriesItem.id, 2)
    })
    expect(result.current.getWatchedForItem(animeItem.id)).toHaveLength(1)
    expect(result.current.getWatchedForItem(seriesItem.id)).toHaveLength(2)
  })

  it('reflects removals made via unmarkWatched', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
    })
    act(() => { result.current.unmarkWatched(animeItem.id, 1) })
    expect(result.current.getWatchedForItem(animeItem.id)).toEqual([2])
  })

  it('reflects replacements made via setWatched', async () => {
    const { result } = await setup()
    act(() => {
      result.current.markWatched(animeItem.id, 1)
      result.current.markWatched(animeItem.id, 2)
    })
    act(() => { result.current.setWatched(animeItem.id, [3, 4, 5]) })
    expect(result.current.getWatchedForItem(animeItem.id).sort((a, b) => a - b)).toEqual([3, 4, 5])
  })
})
