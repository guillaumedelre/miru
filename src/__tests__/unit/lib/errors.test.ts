import { toast } from 'sonner'
import { notifyError, notifyApiError, notifyEnrichment, isNotFoundError } from '@/lib/errors'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('notifyError', () => {
  it('calls toast.error with the message', () => {
    notifyError('Something went wrong')
    expect(toast.error).toHaveBeenCalledWith('Something went wrong')
  })

  it('calls console.error with message and no err when omitted', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    notifyError('Oops')
    expect(spy).toHaveBeenCalledWith('Oops', undefined)
    spy.mockRestore()
  })

  it('calls console.error with message and err when provided', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const err = new Error('boom')
    notifyError('Oops', err)
    expect(spy).toHaveBeenCalledWith('Oops', err)
    spy.mockRestore()
  })

  it('calls toast.error regardless of err presence', () => {
    const err = new Error('detail')
    notifyError('Failed', err)
    expect(toast.error).toHaveBeenCalledWith('Failed')
    expect(toast.error).toHaveBeenCalledTimes(1)
  })
})

describe('notifyApiError', () => {
  it('calls toast.warning with the fixed message', () => {
    notifyApiError('TMDB')
    expect(toast.warning).toHaveBeenCalledWith('Certaines données n\'ont pas pu être chargées.')
  })

  it('calls console.warn with [context] prefix and no err when omitted', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    notifyApiError('AniList')
    expect(spy).toHaveBeenCalledWith('[AniList]', undefined)
    spy.mockRestore()
  })

  it('calls console.warn with [context] prefix and err when provided', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const err = new Error('timeout')
    notifyApiError('Jikan', err)
    expect(spy).toHaveBeenCalledWith('[Jikan]', err)
    spy.mockRestore()
  })

  it('uses the context string in the log prefix', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    notifyApiError('MyContext')
    expect(spy).toHaveBeenCalledWith('[MyContext]', undefined)
    spy.mockRestore()
  })
})

describe('notifyEnrichment', () => {
  it('calls toast.info with the fixed message', () => {
    notifyEnrichment('Jikan')
    expect(toast.info).toHaveBeenCalledWith('Des informations complémentaires sont indisponibles.')
  })

  it('calls console.info with [context] prefix and no err when omitted', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    notifyEnrichment('Jikan')
    expect(spy).toHaveBeenCalledWith('[Jikan]', undefined)
    spy.mockRestore()
  })

  it('calls console.info with [context] prefix and err when provided', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {})
    const err = new TypeError('not found')
    notifyEnrichment('Episodes', err)
    expect(spy).toHaveBeenCalledWith('[Episodes]', err)
    spy.mockRestore()
  })

  it('calls toast.info exactly once per call', () => {
    notifyEnrichment('X')
    notifyEnrichment('Y')
    expect(toast.info).toHaveBeenCalledTimes(2)
  })
})

describe('isNotFoundError', () => {
  it('returns true for Error with 404 in message', () => {
    expect(isNotFoundError(new Error('TMDB 404: /movie/999'))).toBe(true)
    expect(isNotFoundError(new Error('Jikan 404: /anime/0'))).toBe(true)
  })

  it('returns false for Error with other status codes', () => {
    expect(isNotFoundError(new Error('TMDB 500: /movie/1'))).toBe(false)
    expect(isNotFoundError(new Error('TMDB 403: /movie/1'))).toBe(false)
  })

  it('returns false for non-Error values', () => {
    expect(isNotFoundError(null)).toBe(false)
    expect(isNotFoundError('404')).toBe(false)
    expect(isNotFoundError({ message: '404' })).toBe(false)
  })

  it('returns false for Error without 404', () => {
    expect(isNotFoundError(new Error('network error'))).toBe(false)
  })
})
