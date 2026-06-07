import { getDoc } from 'firebase/firestore'
import { loadUserData } from '@/lib/firestore'
import { animeItem, seriesItem, watchedEpisodes } from '@/__tests__/helpers/fixtures'

beforeEach(() => {
  vi.clearAllMocks()
})

function mockSnap(data: unknown) {
  vi.mocked(getDoc).mockResolvedValue({ exists: () => true, data: () => data } as ReturnType<typeof getDoc> extends Promise<infer R> ? R : never)
}

describe('loadUserData', () => {
  it('returns null when document does not exist', async () => {
    vi.mocked(getDoc).mockResolvedValue({ exists: () => false } as ReturnType<typeof getDoc> extends Promise<infer R> ? R : never)
    expect(await loadUserData('user-1')).toBeNull()
  })

  it('returns parsed items and watched for valid data', async () => {
    mockSnap({ items: [animeItem], watched: watchedEpisodes })
    const result = await loadUserData('user-1')
    expect(result?.items).toHaveLength(1)
    expect(result?.items[0].id).toBe(animeItem.id)
    expect(result?.watched).toHaveLength(watchedEpisodes.length)
  })

  it('drops items that fail schema validation, keeps valid ones', async () => {
    const invalid = { id: 123, source: 'unknown' }
    mockSnap({ items: [invalid, animeItem, seriesItem], watched: [] })
    const result = await loadUserData('user-1')
    expect(result?.items).toHaveLength(2)
    expect(result?.items.map(i => i.id)).toEqual([animeItem.id, seriesItem.id])
  })

  it('returns empty items when all items fail validation', async () => {
    mockSnap({ items: [{ bad: true }, { also: 'bad' }], watched: [] })
    const result = await loadUserData('user-1')
    expect(result?.items).toEqual([])
  })

  it('drops watched episodes with episode = 0', async () => {
    const invalidEp = { itemId: 'x', episode: 0, watchedAt: '2024-01-01T00:00:00Z' }
    const validEp = { itemId: 'x', episode: 1, watchedAt: '2024-01-01T00:00:00Z' }
    mockSnap({ items: [], watched: [invalidEp, validEp] })
    const result = await loadUserData('user-1')
    expect(result?.watched).toHaveLength(1)
    expect(result?.watched[0].episode).toBe(1)
  })

  it('drops watched episodes missing required fields', async () => {
    const invalid = { episode: 1 }
    mockSnap({ items: [], watched: [invalid, watchedEpisodes[0]] })
    const result = await loadUserData('user-1')
    expect(result?.watched).toHaveLength(1)
  })

  it('returns empty arrays when items and watched keys are absent', async () => {
    mockSnap({})
    const result = await loadUserData('user-1')
    expect(result).toEqual({ items: [], watched: [] })
  })

  it('returns empty arrays when items and watched are not arrays', async () => {
    mockSnap({ items: 'invalid', watched: null })
    const result = await loadUserData('user-1')
    expect(result).toEqual({ items: [], watched: [] })
  })

  it('preserves all valid fields on a TrackedItem', async () => {
    mockSnap({ items: [animeItem], watched: [] })
    const result = await loadUserData('user-1')
    expect(result?.items[0]).toMatchObject({
      id: animeItem.id,
      sourceId: animeItem.sourceId,
      malId: animeItem.malId,
      episodeDuration: animeItem.episodeDuration,
    })
  })
})
