vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(() => Promise.resolve(null)),
  saveUserData: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/components/AddMediaDialog', () => ({
  default: ({ open }: { open: boolean }) =>
    open ? React.createElement('div', { 'data-testid': 'add-dialog' }, 'Dialog') : null,
}))

vi.mock('@/components/MediaCard', () => ({
  default: ({ item }: { item: { title: string } }) =>
    React.createElement('div', { 'data-testid': 'media-card' }, item.title),
}))

import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { animeItem, seriesItem, movieItem } from '@/__tests__/helpers/fixtures'
import { loadUserData } from '@/lib/firestore'
import Library from '@/pages/Library'

describe('Library', () => {
  beforeEach(() => {
    vi.mocked(loadUserData).mockResolvedValue(null)
  })

  it('shows empty state when store has no items', async () => {
    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getByText('Aucun média dans cette catégorie.')).toBeInTheDocument()
    })
  })

  it('renders a MediaCard for each tracked item', async () => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })

    expect(screen.getByText(animeItem.title)).toBeInTheDocument()
    expect(screen.getByText(seriesItem.title)).toBeInTheDocument()
    expect(screen.getByText(movieItem.title)).toBeInTheDocument()
  })

  it('filters items by search query', async () => {
    const user = userEvent.setup()

    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })

    const input = screen.getByPlaceholderText('Rechercher...')
    await user.type(input, 'Breaking')

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(1)
      expect(screen.getByText(seriesItem.title)).toBeInTheDocument()
    })

    expect(screen.queryByText(animeItem.title)).not.toBeInTheDocument()
    expect(screen.queryByText(movieItem.title)).not.toBeInTheDocument()
  })

  it('filters items by type chip', async () => {
    const user = userEvent.setup()

    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })

    await user.click(screen.getByRole('button', { name: 'Animes' }))

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(1)
      expect(screen.getByText(animeItem.title)).toBeInTheDocument()
    })

    expect(screen.queryByText(seriesItem.title)).not.toBeInTheDocument()
    expect(screen.queryByText(movieItem.title)).not.toBeInTheDocument()
  })

  it('filters items by status chip', async () => {
    const user = userEvent.setup()

    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })

    await user.click(screen.getByRole('button', { name: 'Terminé' }))

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(1)
      expect(screen.getByText(movieItem.title)).toBeInTheDocument()
    })

    expect(screen.queryByText(animeItem.title)).not.toBeInTheDocument()
    expect(screen.queryByText(seriesItem.title)).not.toBeInTheDocument()
  })

  it('clears the search query when the X button is clicked', async () => {
    const user = userEvent.setup()

    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })

    const input = screen.getByPlaceholderText('Rechercher...')
    await user.type(input, 'Breaking')

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(1)
    })

    await user.click(screen.getByLabelText('Effacer la recherche'))

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(3)
    })
  })

  it('pre-activates anime filter when URL has ?type=anime', async () => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem],
      watched: [],
    })

    renderWithProviders(<Library />, { route: '/library?type=anime' })

    await waitFor(() => {
      expect(screen.getAllByTestId('media-card')).toHaveLength(1)
      expect(screen.getByText(animeItem.title)).toBeInTheDocument()
    })

    expect(screen.queryByText(seriesItem.title)).not.toBeInTheDocument()
    expect(screen.queryByText(movieItem.title)).not.toBeInTheDocument()
  })
})
