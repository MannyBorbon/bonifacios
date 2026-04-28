import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { calendarAPI } from '../../services/api'

const TZ = 'America/Hermosillo'

const CATEGORY_META = {
  cotizacion:   { label: 'Cotización',   color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',    dot: 'bg-cyan-400', icon: '💰' },
  evento:       { label: 'Evento',       color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400', icon: '🎉' },
  reunion:      { label: 'Reunión',      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',    dot: 'bg-blue-400', icon: '👥' },
  tarea:        { label: 'Tarea',        color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', dot: 'bg-orange-400', icon: '✓' },
  nota:         { label: 'Nota',         color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', dot: 'bg-yellow-400', icon: '📝' },
  recordatorio: { label: 'Recordatorio', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30',    dot: 'bg-pink-400', icon: '🔔' },
  personal:     { label: 'Personal',     color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', dot: 'bg-purple-400', icon: '👤' },
  otro:         { label: 'Otro',         color: 'bg-slate-500/20 text-slate-400 border-slate-500/30', dot: 'bg-slate-400', icon: '📌' },
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const EMPTY_FORM = { title: '', description: '', event_date: '', start_time: '', end_time: '', category: 'evento', quote_id: '' }

export default function Calendar() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'view'
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [selectedDay, setSelectedDay] = useState(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getEvents(month, year)
      setEvents(res.data.events || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsForDay = (day) => {
    if (!day) return []
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => e.event_date === key)
  }

  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const openCreate = (day = null) => {
    const dateStr = day
      ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      : ''
    setForm({ ...EMPTY_FORM, event_date: dateStr })
    setSelectedDay(day)
    setModal('create')
  }

  const openEdit = (event) => {
    setSelectedEvent(event)
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      category: event.category || 'evento',
      quote_id: event.quote_id || '',
    })
    setModal('edit')
  }

  const openView = (event) => {
    setSelectedEvent(event)
    setModal('view')
  }

  const handleSave = async () => {
    if (!form.title || !form.event_date) {
      setFormError('Titulo y fecha son obligatorios')
      return
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setFormError('La hora fin debe ser mayor a la hora inicio')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      if (modal === 'edit' && selectedEvent) {
        await calendarAPI.updateEvent({ id: selectedEvent.id, ...form, quote_id: form.quote_id || null })
      } else {
        await calendarAPI.createEvent({ ...form, quote_id: form.quote_id || null })
      }
      await loadEvents()
      setModal(null)
    } catch {
      setFormError('No se pudo guardar el evento. Intenta de nuevo.')
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await calendarAPI.deleteEvent(id)
      await loadEvents()
      setModal(null)
    } catch { /* silent */ }
  }

  const upd = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const inputCls = 'w-full rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none transition-colors'

  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'pm' : 'am'}`
  }

  const fmtDate = (d) => {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white tracking-wide">Agenda</h1>
          <p className="text-xs text-slate-500 mt-0.5">Eventos, reuniones y cotizaciones del restaurante</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Nuevo Evento
        </button>
      </div>

      {/* Calendar Card */}
      <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/80 overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-cyan-500/10">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-light text-white">{MONTHS_ES[month - 1]} {year}</h2>
            {(month !== today.getMonth() + 1 || year !== today.getFullYear()) && (
              <button
                onClick={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()) }}
                className="text-[10px] rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-400 hover:border-cyan-400/40 transition-all"
              >
                Hoy
              </button>
            )}
          </div>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 border-b border-cyan-500/10">
          {DAYS_ES.map(d => (
            <div key={d} className="py-2 text-center text-[10px] uppercase tracking-widest text-slate-600">{d}</div>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
          </div>
        ) : (
          <div className="grid grid-cols-7">
            {cells.map((day, i) => {
              const dayEvents = eventsForDay(day)
              const isT = isToday(day)
              return (
                <div
                  key={i}
                  onClick={() => day && openCreate(day)}
                  className={`min-h-[80px] sm:min-h-[100px] border-b border-r border-cyan-500/5 p-1.5 cursor-pointer transition-all ${
                    day ? 'hover:bg-cyan-500/5' : 'opacity-0 pointer-events-none'
                  } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 transition-all ${
                        isT
                          ? 'bg-cyan-400 text-[#030b18] font-bold'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}>
                        {day}
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 3).map(ev => (
                          <button
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); openView(ev) }}
                            className={`w-full text-left rounded px-1.5 py-0.5 text-[9px] sm:text-[10px] truncate border ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color} hover:opacity-80 transition-opacity`}
                          >
                            {ev.start_time ? `${fmtTime(ev.start_time)} ` : ''}{ev.title}
                          </button>
                        ))}
                        {dayEvents.length > 3 && (
                          <p className="text-[9px] text-slate-600 pl-1">+{dayEvents.length - 3} más</p>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <span className="text-[10px] text-slate-500">{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 mb-4">Eventos este mes</h3>
          <div className="space-y-2">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => openView(ev)}
                className="w-full text-left flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-[#030b18]/40 px-4 py-3 hover:border-cyan-500/25 hover:bg-[#030b18]/70 transition-all group"
              >
                <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${CATEGORY_META[ev.category]?.dot || CATEGORY_META.otro.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {fmtDate(ev.event_date)}
                    {ev.start_time && ` · ${fmtTime(ev.start_time)}`}
                    {ev.end_time && ` – ${fmtTime(ev.end_time)}`}
                  </p>
                  {ev.quote_client && (
                    <p className="text-[10px] text-cyan-500/60 mt-0.5">Cliente: {ev.quote_client}</p>
                  )}
                </div>
                <span className={`text-[9px] rounded-full border px-2 py-0.5 flex-shrink-0 ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[ev.category]?.label || 'Otro'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── VIEW MODAL ── */}
      {modal === 'view' && selectedEvent && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 rounded-full ${CATEGORY_META[selectedEvent.category]?.dot || CATEGORY_META.otro.dot}`} />
                <span className={`text-[10px] rounded-full border px-2 py-0.5 ${CATEGORY_META[selectedEvent.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[selectedEvent.category]?.label || 'Otro'}
                </span>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-600 hover:text-slate-300 transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <h2 className="text-lg font-light text-white mb-1">{selectedEvent.title}</h2>
            <p className="text-sm text-cyan-400/70 mb-3">{fmtDate(selectedEvent.event_date)}{selectedEvent.start_time && ` · ${fmtTime(selectedEvent.start_time)}`}{selectedEvent.end_time && ` – ${fmtTime(selectedEvent.end_time)}`}</p>

            {selectedEvent.description && (
              <p className="text-sm text-slate-400 bg-[#030b18]/50 rounded-lg p-3 mb-3 whitespace-pre-wrap">{selectedEvent.description}</p>
            )}

            {selectedEvent.quote_client && (
              <div className="flex items-center gap-2 mb-3">
                <svg className="h-3.5 w-3.5 text-cyan-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <Link
                  to={`/admin/quotes/${selectedEvent.quote_id}`}
                  onClick={() => setModal(null)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Cotización: {selectedEvent.quote_client} — {selectedEvent.quote_type}
                </Link>
              </div>
            )}

            <p className="text-[10px] text-slate-600 mb-4">Creado por: {selectedEvent.creator_name}</p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => openEdit(selectedEvent)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 hover:border-cyan-400/40 transition-all"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(selectedEvent.id)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/15 bg-transparent px-3 py-1.5 text-xs text-red-400/60 hover:border-red-500/30 hover:text-red-400 transition-all ml-auto"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-light text-white mb-5">
              {modal === 'edit' ? 'Editar evento' : selectedDay ? `Nuevo evento — ${fmtDate(form.event_date)}` : 'Nuevo evento'}
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Título *</label>
                <input value={form.title} onChange={upd('title')} placeholder="Nombre del evento…" className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Fecha *</label>
                  <input type="date" value={form.event_date} onChange={upd('event_date')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Categoría</label>
                  <select value={form.category} onChange={upd('category')} className={inputCls}>
                    {Object.entries(CATEGORY_META).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[#030b18]">{v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Hora inicio</label>
                  <input type="time" value={form.start_time} onChange={upd('start_time')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Hora fin</label>
                  <input type="time" value={form.end_time} onChange={upd('end_time')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Descripción / Notas</label>
                <textarea value={form.description} onChange={upd('description')} rows={3} placeholder="Detalles del evento…" className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">ID de Cotización (opcional)</label>
                <input type="number" value={form.quote_id} onChange={upd('quote_id')} placeholder="Ej: 4" className={inputCls} />
              </div>
              {formError && (
                <p className="text-xs text-red-300">{formError}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(null)} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={!form.title || !form.event_date || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-5 py-2 text-xs font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:opacity-40 transition-all"
              >
                {saving ? 'Guardando…' : modal === 'edit' ? 'Guardar cambios' : 'Crear evento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
