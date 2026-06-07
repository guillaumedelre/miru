import { TrackedItemSchema, WatchedEpisodeSchema, UserDataSchema } from '@/types'

const validItem = {
  id: 'abc',
  sourceId: '123',
  source: 'anilist',
  type: 'anime',
  title: 'My Anime',
  coverImage: 'https://img.co/x.jpg',
  status: 'watching',
  progress: 0,
}

describe('TrackedItemSchema', () => {
  it('accepts a minimal valid item', () => {
    expect(TrackedItemSchema.safeParse(validItem).success).toBe(true)
  })

  it('accepts all optional fields', () => {
    const full = { ...validItem, totalEpisodes: 24, isFinished: false, malId: 101, episodeDuration: 24 }
    expect(TrackedItemSchema.safeParse(full).success).toBe(true)
  })

  it('rejects missing required field id', () => {
    const { id, ...rest } = validItem
    void id
    expect(TrackedItemSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects missing required field title', () => {
    const { title, ...rest } = validItem
    void title
    expect(TrackedItemSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects invalid source', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, source: 'crunchyroll' }).success).toBe(false)
  })

  it('accepts all valid source values', () => {
    for (const source of ['anilist', 'jikan', 'tmdb']) {
      expect(TrackedItemSchema.safeParse({ ...validItem, source }).success).toBe(true)
    }
  })

  it('rejects invalid type', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, type: 'book' }).success).toBe(false)
  })

  it('accepts all valid type values', () => {
    for (const type of ['anime', 'series', 'movie']) {
      expect(TrackedItemSchema.safeParse({ ...validItem, type }).success).toBe(true)
    }
  })

  it('rejects invalid status', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, status: 'dropped' }).success).toBe(false)
  })

  it('accepts all valid status values', () => {
    for (const status of ['watching', 'completed', 'plan_to_watch']) {
      expect(TrackedItemSchema.safeParse({ ...validItem, status }).success).toBe(true)
    }
  })

  it('rejects negative progress', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, progress: -1 }).success).toBe(false)
  })

  it('accepts progress = 0', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, progress: 0 }).success).toBe(true)
  })

  it('rejects zero totalEpisodes (must be positive)', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, totalEpisodes: 0 }).success).toBe(false)
  })

  it('rejects non-integer episodeDuration', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, episodeDuration: 23.5 }).success).toBe(false)
  })

  it('rejects zero malId (must be positive)', () => {
    expect(TrackedItemSchema.safeParse({ ...validItem, malId: 0 }).success).toBe(false)
  })
})

describe('WatchedEpisodeSchema', () => {
  const validEp = { itemId: 'item-1', episode: 1, watchedAt: '2024-01-01T00:00:00Z' }

  it('accepts a valid episode', () => {
    expect(WatchedEpisodeSchema.safeParse(validEp).success).toBe(true)
  })

  it('rejects episode 0 (episodes start at 1)', () => {
    expect(WatchedEpisodeSchema.safeParse({ ...validEp, episode: 0 }).success).toBe(false)
  })

  it('rejects negative episode', () => {
    expect(WatchedEpisodeSchema.safeParse({ ...validEp, episode: -1 }).success).toBe(false)
  })

  it('rejects missing itemId', () => {
    const { itemId, ...rest } = validEp
    void itemId
    expect(WatchedEpisodeSchema.safeParse(rest).success).toBe(false)
  })

  it('rejects non-string watchedAt', () => {
    expect(WatchedEpisodeSchema.safeParse({ ...validEp, watchedAt: 1234567890 }).success).toBe(false)
  })

  it('rejects non-integer episode', () => {
    expect(WatchedEpisodeSchema.safeParse({ ...validEp, episode: 1.5 }).success).toBe(false)
  })
})

describe('UserDataSchema', () => {
  it('accepts valid UserData with items and watched', () => {
    const data = {
      items: [validItem],
      watched: [{ itemId: 'abc', episode: 1, watchedAt: '2024-01-01T00:00:00Z' }],
    }
    expect(UserDataSchema.safeParse(data).success).toBe(true)
  })

  it('accepts empty arrays', () => {
    expect(UserDataSchema.safeParse({ items: [], watched: [] }).success).toBe(true)
  })

  it('rejects missing items array', () => {
    expect(UserDataSchema.safeParse({ watched: [] }).success).toBe(false)
  })

  it('rejects missing watched array', () => {
    expect(UserDataSchema.safeParse({ items: [] }).success).toBe(false)
  })

  it('rejects invalid item inside items array', () => {
    const data = { items: [{ bad: true }], watched: [] }
    expect(UserDataSchema.safeParse(data).success).toBe(false)
  })
})
