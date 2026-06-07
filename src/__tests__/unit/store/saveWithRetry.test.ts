vi.mock('@/lib/firestore', () => ({ loadUserData: vi.fn(), saveUserData: vi.fn() }))

import { FirebaseError } from 'firebase/app'
import { saveUserData } from '@/lib/firestore'
import { saveWithRetry } from '@/store'

beforeEach(() => vi.clearAllMocks())

describe('saveWithRetry', () => {
  it('resolves immediately on first success', async () => {
    vi.mocked(saveUserData).mockResolvedValue(undefined)
    await saveWithRetry('user-1', { items: [], watched: [] })
    expect(saveUserData).toHaveBeenCalledTimes(1)
  })

  it('retries on generic network errors up to the retry count', async () => {
    vi.mocked(saveUserData)
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValue(undefined)
    await saveWithRetry('user-1', { items: [], watched: [] }, 3)
    expect(saveUserData).toHaveBeenCalledTimes(3)
  }, 15000)

  it('throws after exhausting all retries', async () => {
    vi.mocked(saveUserData).mockRejectedValue(new Error('persistent error'))
    await expect(saveWithRetry('user-1', { items: [], watched: [] }, 1)).rejects.toThrow('persistent error')
    expect(saveUserData).toHaveBeenCalledTimes(1)
  })

  it('does not retry on permission-denied FirebaseError', async () => {
    const err = new FirebaseError('permission-denied', 'Missing or insufficient permissions.')
    vi.mocked(saveUserData).mockRejectedValue(err)
    await expect(saveWithRetry('user-1', { items: [], watched: [] }, 3)).rejects.toThrow()
    expect(saveUserData).toHaveBeenCalledTimes(1)
  })

  it('does not retry on unauthenticated FirebaseError', async () => {
    const err = new FirebaseError('unauthenticated', 'Request had invalid credentials.')
    vi.mocked(saveUserData).mockRejectedValue(err)
    await expect(saveWithRetry('user-1', { items: [], watched: [] }, 3)).rejects.toThrow()
    expect(saveUserData).toHaveBeenCalledTimes(1)
  })

  it('retries on other FirebaseError codes', async () => {
    const err = new FirebaseError('unavailable', 'The service is currently unavailable.')
    vi.mocked(saveUserData)
      .mockRejectedValueOnce(err)
      .mockResolvedValue(undefined)
    await saveWithRetry('user-1', { items: [], watched: [] }, 2)
    expect(saveUserData).toHaveBeenCalledTimes(2)
  }, 10000)
})
