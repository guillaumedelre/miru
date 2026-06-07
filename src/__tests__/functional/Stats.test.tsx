vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(),
  saveUserData: vi.fn(),
}))

import { screen, waitFor } from '@testing-library/react'
import Stats from '@/pages/Stats'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { loadUserData } from '@/lib/firestore'
import {
  animeItem, seriesItem, movieItem, planItem,
  completedAnimeItem, watchedEpisodes,
} from '@/__tests__/helpers/fixtures'

beforeEach(() => {
  vi.mocked(loadUserData).mockResolvedValue(null)
})

describe('Stats - empty store', () => {
  it('shows 0 items in Titres suivis', async () => {
    renderWithProviders(<Stats />)
    // Wait for store to load and check the StatCard for total items
    await waitFor(() => {
      const allZeros = screen.getAllByText('0')
      expect(allZeros.length).toBeGreaterThan(0)
    })
  })

  it('shows no-genres message', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() =>
      expect(screen.getByText('Aucune donnée de genre disponible.')).toBeInTheDocument()
    )
  })

  it('shows dash for watch time when no durations', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })
})

describe('Stats - with fixtures', () => {
  beforeEach(() => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [animeItem, seriesItem, movieItem, planItem],
      watched: watchedEpisodes,
    })
  })

  it('shows total items count of 4', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('4')).toBeInTheDocument())
  })

  it('displays type label Animes', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('Animes')).toBeInTheDocument())
  })

  it('displays type label Séries', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('Séries')).toBeInTheDocument())
  })

  it('displays type label Films', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('Films')).toBeInTheDocument())
  })

  it('displays status label En cours', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('En cours')).toBeInTheDocument())
  })

  it('displays status label Terminé', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('Terminé')).toBeInTheDocument())
  })

  it('displays status label À voir', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('À voir')).toBeInTheDocument())
  })

  it('shows correct total watched count (7 eps + 1 completed movie = 8)', async () => {
    renderWithProviders(<Stats />)
    // totalViewed = watched.length(7) + completedMovies(1) = 8
    await waitFor(() => expect(screen.getByText('8')).toBeInTheDocument())
  })

  it('shows correct watch time 5h 29min', async () => {
    renderWithProviders(<Stats />)
    // animeItem: 4*24=96, series: 2*47=94, movie: 1*139=139 -> 329min = 5h 29min
    await waitFor(() => expect(screen.getByText('5h 29min')).toBeInTheDocument())
  })

  it('shows genres after async load', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('Action')).toBeInTheDocument(), { timeout: 5000 })
    expect(screen.getByText('Drama')).toBeInTheDocument()
  })

  it('shows sur N titres in completed card', async () => {
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('sur 4 titres')).toBeInTheDocument())
  })
})

describe('Stats - plan_to_watch excluded from time', () => {
  it('shows dash when only plan_to_watch item with no watched eps', async () => {
    vi.mocked(loadUserData).mockResolvedValue({ items: [planItem], watched: [] })
    renderWithProviders(<Stats />)
    await waitFor(() => expect(screen.getByText('—')).toBeInTheDocument())
  })
})

describe('Stats - completed anime watch time', () => {
  it('counts all episodes for completed anime', async () => {
    vi.mocked(loadUserData).mockResolvedValue({
      items: [completedAnimeItem],
      watched: Array.from({ length: 64 }, (_, i) => ({
        itemId: 'item-anime-2',
        episode: i + 1,
        watchedAt: '2024-01-01T00:00:00Z',
      })),
    })
    renderWithProviders(<Stats />)
    // 64 * 24 = 1536 min -> 25h 36min -> h=25 >= 24 -> d=1, rh=1 -> '1j 1h'
    await waitFor(() => expect(screen.getByText('1j 1h')).toBeInTheDocument())
  })
})
