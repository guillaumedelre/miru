vi.mock('@/lib/firestore', () => ({
  loadUserData: vi.fn(),
  saveUserData: vi.fn(),
}))
vi.mock('@/components/EpisodeCard', () => ({
  default: ({ episode }: { episode: { title: string; episode: number } }) =>
    React.createElement('div', { 'data-testid': 'episode-card' }, `${episode.title} ep${episode.episode}`),
}))

import React from 'react'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import ToWatch from '@/pages/ToWatch'
import { renderWithProviders } from '@/__tests__/helpers/render'
import { loadUserData } from '@/lib/firestore'
import { animeItem } from '@/__tests__/helpers/fixtures'

const ANILIST_ENDPOINT = 'https://graphql.anilist.co'

beforeEach(() => {
  vi.setSystemTime(new Date('2024-06-17'))
  vi.mocked(loadUserData).mockResolvedValue(null)
})
afterEach(() => vi.useRealTimers())

describe('ToWatch tabs', () => {
  it('renders 3 tab triggers after store loads', async () => {
    renderWithProviders(<ToWatch />)
    // Wait for store loading to finish
    await screen.findByText('Retard')
    expect(screen.getByText('Cette semaine')).toBeInTheDocument()
    expect(screen.getByText('Reprises')).toBeInTheDocument()
  })

  it('shows Cette semaine empty state by default', async () => {
    renderWithProviders(<ToWatch />)
    await waitFor(() =>
      expect(screen.getByText('Rien de prévu cette semaine.')).toBeInTheDocument(),
      { timeout: 5000 }
    )
  })

  it('switches to Retard tab on click', async () => {
    renderWithProviders(<ToWatch />)
    const tab = await screen.findByText('Retard')
    fireEvent.click(tab)
    await waitFor(() =>
      expect(screen.getByText('Aucun retard, tu es à jour !')).toBeInTheDocument()
    )
  })

  it('switches to Reprises tab on click', async () => {
    renderWithProviders(<ToWatch />)
    const tab = await screen.findByText('Reprises')
    fireEvent.click(tab)
    await waitFor(() =>
      expect(screen.getByText("Aucune série en pause pour l'instant.")).toBeInTheDocument()
    )
  })
})

describe('ToWatch - Retard with backlog episode', () => {
  it('shows backlog episode for past anilist airing', async () => {
    const pastAiringAt = Math.floor(new Date('2024-06-10').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 101, episode: 5, airingAt: pastAiringAt }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    renderWithProviders(<ToWatch />)
    const tab = await screen.findByText('Retard')
    fireEvent.click(tab)

    await waitFor(() =>
      expect(screen.getByTestId('episode-card')).toBeInTheDocument(),
      { timeout: 5000 }
    )
    expect(screen.getByTestId('episode-card').textContent).toContain('ep5')
  })
})

describe('ToWatch - Reprises with returning show', () => {
  it('shows returning show for future anilist airing', async () => {
    const futureAiringAt = Math.floor(new Date('2024-06-30').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 101, episode: 6, airingAt: futureAiringAt }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [animeItem], watched: [] })

    renderWithProviders(<ToWatch />)
    const tab = await screen.findByText('Reprises')
    fireEvent.click(tab)

    await waitFor(() =>
      expect(screen.getByText(animeItem.title)).toBeInTheDocument(),
      { timeout: 5000 }
    )
  })
})

describe('ToWatch - Cette semaine with episode', () => {
  it('shows episode card for anime airing this week', async () => {
    // Use unique sourceId 555 to avoid cache collision with other tests that used mediaId 101
    const weekAnimeItem = { ...animeItem, id: 'item-week-1', sourceId: '555' }
    const airingAt = Math.floor(new Date('2024-06-20T12:00:00Z').getTime() / 1000)
    server.use(
      http.post(ANILIST_ENDPOINT, async ({ request }) => {
        const body = await request.json() as { query: string; variables: Record<string, unknown> }
        if (body.query.includes('airingSchedules')) {
          return HttpResponse.json({
            data: { Page: { airingSchedules: [{ mediaId: 555, episode: 5, airingAt }] } },
          })
        }
        return HttpResponse.json({ data: { Page: { media: [] } } })
      })
    )
    vi.mocked(loadUserData).mockResolvedValue({ items: [weekAnimeItem], watched: [] })

    renderWithProviders(<ToWatch />)

    await waitFor(() =>
      expect(screen.getByTestId('episode-card')).toBeInTheDocument(),
      { timeout: 5000 }
    )
    expect(screen.getByTestId('episode-card').textContent).toContain('ep5')
  })
})
