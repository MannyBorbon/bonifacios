// Zona horaria: San Carlos, Sonora, México — UTC-7 fijo, sin horario de verano
export const TZ = 'America/Hermosillo'

const parse = (d) => {
  if (!d) return null
  const s = String(d)
  if (s.includes('T') || s.endsWith('Z')) return new Date(s)
  if (s.length === 10) return new Date(s + 'T12:00:00')
  return new Date(s.replace(' ', 'T'))
}

export const fmtDate = (d, opts = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const dt = parse(d); if (!dt) return '—'
  return dt.toLocaleDateString('es-MX', { timeZone: TZ, ...opts })
}

export const fmtTime = (d, opts = { hour: '2-digit', minute: '2-digit' }) => {
  const dt = parse(d); if (!dt) return '—'
  return dt.toLocaleTimeString('es-MX', { timeZone: TZ, ...opts })
}

export const fmtDateTime = (d, opts = { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) => {
  const dt = parse(d); if (!dt) return '—'
  return dt.toLocaleString('es-MX', { timeZone: TZ, ...opts })
}

export const nowStrings = () => {
  const now = new Date()
  return {
    timeStr: now.toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }),
    dateStr: now.toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' }),
  }
}
