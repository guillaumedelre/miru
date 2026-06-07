vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(() => Promise.resolve(null)),
  saveUserData: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/hooks/useMediaDetails', () => ({
  useMediaDetails: vi.fn(() => ({ details: null, watchProviders: { providers: [], link: null }, loading: false })),
}))

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/store'
import MediaCard from '@/components/MediaCard'
import { animeItem, seriesItem } from '@/__tests__/helpers/fixtures'

function renderCard(item: typeof animeItem) {
  return render(
    <MemoryRouter>
      <StoreProvider userId="test">
        <MediaCard item={item} />
      </StoreProvider>
    </MemoryRouter>
  )
}

describe('MediaCard — variantForId useMemo (fix #16)', () => {
  it('renders the item title after store loads', async () => {
    renderCard(animeItem)
    await waitFor(() => expect(screen.getAllByText(animeItem.title).length).toBeGreaterThan(0))
  })

  it('applies a mask SVG path via inline style', async () => {
    const { container } = renderCard(animeItem)
    await waitFor(() => {
      const el = container.querySelector('[style*="mask-shape"]') as HTMLElement | null
      expect(el).not.toBeNull()
      expect(el!.getAttribute('style')).toMatch(/mask-shape-\d\.svg/)
    })
  })

  it('produces the same mask SVG for the same item id across renders', async () => {
    const { container, rerender } = renderCard(animeItem)

    let firstMask = ''
    await waitFor(() => {
      const el = container.querySelector('[style*="mask-shape"]') as HTMLElement | null
      expect(el).not.toBeNull()
      firstMask = el!.getAttribute('style') ?? ''
    })

    rerender(
      <MemoryRouter>
        <StoreProvider userId="test">
          <MediaCard item={{ ...animeItem, title: 'Updated title' }} />
        </StoreProvider>
      </MemoryRouter>
    )

    const el = container.querySelector('[style*="mask-shape"]') as HTMLElement
    expect(el.getAttribute('style')).toBe(firstMask)
  })

  it('produces different mask SVGs for items with different ids', async () => {
    const { container: c1 } = renderCard(animeItem)
    const { container: c2 } = renderCard(seriesItem)

    let mask1 = '', mask2 = ''
    await waitFor(() => {
      const e1 = c1.querySelector('[style*="mask-shape"]') as HTMLElement | null
      const e2 = c2.querySelector('[style*="mask-shape"]') as HTMLElement | null
      expect(e1).not.toBeNull()
      expect(e2).not.toBeNull()
      mask1 = e1!.getAttribute('style') ?? ''
      mask2 = e2!.getAttribute('style') ?? ''
    })

    expect(mask1).not.toBe(mask2)
  })
})
