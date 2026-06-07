vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(() => Promise.resolve(null)),
  saveUserData: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/api/anilist', () => ({
  searchMedia: vi.fn(() => Promise.resolve({ media: [], hasMore: false })),
}))

vi.mock('@/api/tmdb', () => ({
  searchTv: vi.fn(() => Promise.resolve({ results: [], hasMore: false })),
  searchMovie: vi.fn(() => Promise.resolve({ results: [], hasMore: false })),
}))

import React, { useState } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { StoreProvider } from '@/store'
import AddMediaDialog from '@/components/AddMediaDialog'

function getInput() {
  return screen.getAllByRole('textbox', { hidden: true })[0] as HTMLInputElement
}

function Harness({ initialQuery, startOpen = true }: { initialQuery?: string; startOpen?: boolean }) {
  const [open, setOpen] = useState(startOpen)
  return (
    <MemoryRouter>
      <StoreProvider userId="test">
        <button data-testid="toggle" onClick={() => setOpen((v) => !v)}>toggle</button>
        <AddMediaDialog open={open} onClose={() => setOpen(false)} initialQuery={initialQuery} />
      </StoreProvider>
    </MemoryRouter>
  )
}

function HarnessWithChangingQuery() {
  const [query, setQuery] = useState<string | undefined>(undefined)
  return (
    <MemoryRouter>
      <StoreProvider userId="test">
        <button data-testid="set-query" onClick={() => setQuery('Naruto')}>set query</button>
        <AddMediaDialog open={true} onClose={() => {}} initialQuery={query} />
      </StoreProvider>
    </MemoryRouter>
  )
}

describe('AddMediaDialog — effect separation (fix #13)', () => {
  it('pre-fills the search input with initialQuery when dialog opens', async () => {
    render(<Harness initialQuery="One Piece" />)
    await waitFor(() => expect(getInput().value).toBe('One Piece'))
  })

  it('resets the query to empty when the dialog is closed and re-opened', async () => {
    render(<Harness initialQuery="One Piece" />)
    await waitFor(() => expect(getInput().value).toBe('One Piece'))

    act(() => screen.getByTestId('toggle').click())
    act(() => screen.getByTestId('toggle').click())

    await waitFor(() => expect(getInput().value).toBe(''))
  })

  it('updates the query when initialQuery prop changes while open', async () => {
    render(<HarnessWithChangingQuery />)
    await waitFor(() => expect(getInput().value).toBe(''))

    act(() => screen.getByTestId('set-query').click())

    await waitFor(() => expect(getInput().value).toBe('Naruto'))
  })

  it('allows the user to type in the search field', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    const input = await screen.findByRole('textbox', { hidden: true })
    await user.type(input, 'Demon Slayer')

    expect((input as HTMLInputElement).value).toBe('Demon Slayer')
  })
})
