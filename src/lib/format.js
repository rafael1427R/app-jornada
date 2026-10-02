export function uid() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'id-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function nowISO() {
  return new Date().toISOString()
}

export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pt-BR')
}

export function formatDate(value) {
  if (!value) return '—'
  const date = value.length === 10 ? new Date(`${value}T12:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pt-BR')
}

export function formatTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function todayISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function dateOf(value) {
  if (!value) return ''
  if (value.length === 10) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

export function isToday(value) {
  return dateOf(value) === todayISO()
}

/** Diferença em minutos entre duas datas (b - a). */
export function minutesBetween(a, b = new Date()) {
  if (!a) return 0
  const start = new Date(a).getTime()
  const end = new Date(b).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return 0
  return Math.floor((end - start) / 60000)
}

/** Segundos restantes até `deadline`. Pode ser negativo. */
export function secondsUntil(deadline) {
  if (!deadline) return 0
  return Math.round((new Date(deadline).getTime() - Date.now()) / 1000)
}

/** Formata segundos como MM:SS (aceita valores negativos). */
export function formatCountdown(totalSeconds) {
  const negative = totalSeconds < 0
  const abs = Math.abs(totalSeconds)
  const minutes = String(Math.floor(abs / 60)).padStart(2, '0')
  const seconds = String(abs % 60).padStart(2, '0')
  return `${negative ? '-' : ''}${minutes}:${seconds}`
}

/** Duração legível em horas/minutos. */
export function formatDuration(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return '—'
  const abs = Math.abs(Math.round(minutes))
  const h = Math.floor(abs / 60)
  const m = abs % 60
  if (h === 0) return `${m}min`
  return `${h}h${String(m).padStart(2, '0')}`
}

export const normalize = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

export function matches(term, ...fields) {
  const needle = normalize(term)
  if (!needle) return true
  return fields.some((field) => normalize(field).includes(needle))
}

export const upper = (value) => String(value ?? '').toLocaleUpperCase('pt-BR')

export function percent(part, total) {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}
