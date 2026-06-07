export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h < 24) return m > 0 ? `${h}h ${m}min` : `${h}h`
  const days = Math.floor(h / 24)
  const remainingHours = h % 24
  return remainingHours > 0 ? `${days}j ${remainingHours}h` : `${days}j`
}

export function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function formatWeekRange(dates: string[]): string {
  const startYear = dates[0].slice(0, 4)
  const endYear = dates[6].slice(0, 4)
  const fmt = (d: string, showYear: boolean) => {
    const [year,, day] = d.split('-')
    const month = new Date(d).toLocaleDateString('fr-FR', { month: 'short' })
    return showYear ? `${parseInt(day)} ${month} ${year}` : `${parseInt(day)} ${month}`
  }
  const sameYear = startYear === endYear
  return `${fmt(dates[0], false)} – ${fmt(dates[6], !sameYear)} ${sameYear ? startYear : ''}`
}

export function daysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr)
  target.setHours(0, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatRelative(days: number): string {
  if (days === 1) return 'demain'
  if (days < 7) return `dans ${days} jours`
  const weeks = Math.round(days / 7)
  if (weeks < 5) return `dans ${weeks} semaine${weeks > 1 ? 's' : ''}`
  const months = Math.round(days / 30)
  if (months < 12) return `dans ${months} mois`
  return `dans ${Math.round(days / 365)} an`
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}
