import { formatDuration, formatDay, formatWeekRange, daysUntil, formatRelative, stripHtml } from '@/lib/formatting'

describe('formatDuration', () => {
  it('returns minutes only when less than 60', () => {
    expect(formatDuration(0)).toBe('0 min')
    expect(formatDuration(1)).toBe('1 min')
    expect(formatDuration(59)).toBe('59 min')
  })

  it('returns hours only when exactly 60 minutes', () => {
    expect(formatDuration(60)).toBe('1h')
  })

  it('returns hours and minutes when between 60 and 1440', () => {
    expect(formatDuration(61)).toBe('1h 1min')
    expect(formatDuration(90)).toBe('1h 30min')
    expect(formatDuration(119)).toBe('1h 59min')
    expect(formatDuration(120)).toBe('2h')
    expect(formatDuration(1439)).toBe('23h 59min')
  })

  it('returns days only when exactly 1440 minutes', () => {
    expect(formatDuration(1440)).toBe('1j')
  })

  it('returns days and hours when above 1440 minutes', () => {
    expect(formatDuration(1500)).toBe('1j 1h')
    expect(formatDuration(2880)).toBe('2j')
    expect(formatDuration(2940)).toBe('2j 1h')
  })
})

describe('formatDay', () => {
  it('formats a date string to French long day format', () => {
    expect(formatDay('2024-06-15')).toBe('samedi 15 juin')
  })

  it('formats a Monday correctly', () => {
    expect(formatDay('2024-06-10')).toBe('lundi 10 juin')
  })

  it('includes the correct day of month', () => {
    expect(formatDay('2024-01-01')).toBe('lundi 1 janvier')
  })
})

describe('formatWeekRange', () => {
  it('formats a week range within the same year', () => {
    const dates = ['2024-06-10', '2024-06-11', '2024-06-12', '2024-06-13', '2024-06-14', '2024-06-15', '2024-06-16']
    const result = formatWeekRange(dates)
    expect(result).toContain('10')
    expect(result).toContain('16')
    expect(result).toContain('2024')
    expect(result).not.toMatch(/2024.*2024/)
  })

  it('formats a cross-year week range showing year on end date', () => {
    const dates = ['2024-12-30', '2024-12-31', '2025-01-01', '2025-01-02', '2025-01-03', '2025-01-04', '2025-01-05']
    const result = formatWeekRange(dates)
    expect(result).toContain('2025')
    expect(result).toContain('30')
    expect(result).toContain('5')
  })

  it('does not show year twice in same-year range', () => {
    const dates = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07']
    const result = formatWeekRange(dates)
    const yearMatches = result.match(/2024/g)
    expect(yearMatches).toHaveLength(1)
  })
})

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns 0 for today', () => {
    expect(daysUntil('2024-06-15')).toBe(0)
  })

  it('returns 1 for tomorrow', () => {
    expect(daysUntil('2024-06-16')).toBe(1)
  })

  it('returns 7 for next week', () => {
    expect(daysUntil('2024-06-22')).toBe(7)
  })

  it('returns negative for past dates', () => {
    expect(daysUntil('2024-06-14')).toBe(-1)
    expect(daysUntil('2024-06-08')).toBe(-7)
  })

  it('returns correct value for distant future', () => {
    expect(daysUntil('2024-12-15')).toBe(183)
  })
})

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-06-15'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "demain" for 1 day', () => {
    expect(formatRelative(1)).toBe('demain')
  })

  it('returns days count for 2 to 6 days', () => {
    expect(formatRelative(2)).toBe('dans 2 jours')
    expect(formatRelative(6)).toBe('dans 6 jours')
  })

  it('returns singular week for exactly 7 days', () => {
    expect(formatRelative(7)).toBe('dans 1 semaine')
  })

  it('returns plural weeks for 2-4 weeks', () => {
    expect(formatRelative(14)).toBe('dans 2 semaines')
    expect(formatRelative(21)).toBe('dans 3 semaines')
    expect(formatRelative(28)).toBe('dans 4 semaines')
  })

  it('returns months for 5+ weeks up to 11 months', () => {
    expect(formatRelative(35)).toBe('dans 1 mois')
    expect(formatRelative(60)).toBe('dans 2 mois')
    expect(formatRelative(330)).toBe('dans 11 mois')
  })

  it('returns years for 12+ months', () => {
    expect(formatRelative(365)).toBe('dans 1 an')
    expect(formatRelative(730)).toBe('dans 2 an')
  })
})

describe('stripHtml', () => {
  it('removes simple tags', () => {
    expect(stripHtml('<p>Hello</p>')).toBe('Hello')
    expect(stripHtml('<b>bold</b>')).toBe('bold')
  })

  it('converts <br> to newline', () => {
    expect(stripHtml('line1<br>line2')).toBe('line1\nline2')
    expect(stripHtml('line1<br/>line2')).toBe('line1\nline2')
    expect(stripHtml('line1<br />line2')).toBe('line1\nline2')
  })

  it('decodes HTML entities', () => {
    expect(stripHtml('a &amp; b')).toBe('a & b')
    expect(stripHtml('&lt;tag&gt;')).toBe('<tag>')
    expect(stripHtml('say &quot;hi&quot;')).toBe('say "hi"')
    expect(stripHtml('it&#039;s')).toBe("it's")
    expect(stripHtml('hello&nbsp;world')).toBe('hello world')
  })

  it('trims leading and trailing whitespace', () => {
    expect(stripHtml('  hello  ')).toBe('hello')
    expect(stripHtml('<p>  text  </p>')).toBe('text')
  })

  it('handles nested tags', () => {
    expect(stripHtml('<div><p><b>deep</b></p></div>')).toBe('deep')
  })

  it('handles tags with attributes', () => {
    expect(stripHtml('<a href="https://example.com" class="link">click</a>')).toBe('click')
  })

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('')
  })

  it('returns plain text unchanged', () => {
    expect(stripHtml('plain text')).toBe('plain text')
  })

  it('handles mixed content', () => {
    expect(stripHtml('<p>Hello &amp; <b>world</b><br/>!</p>')).toBe('Hello & world\n!')
  })
})
