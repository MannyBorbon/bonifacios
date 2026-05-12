import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { calendarAPI } from '../../../services/api'

const TZ = 'America/Hermosillo'

const CATEGORY_META = {
  cotizacion:   { label: 'Cotizacion',   color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 text-cyan-300 border-cyan-400/30', dot: 'bg-cyan-400' },
  evento:       { label: 'Evento',       color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 text-emerald-300 border-emerald-400/30', dot: 'bg-emerald-400' },
  reunion:      { label: 'Reunion',      color: 'bg-gradient-to-r from-blue-500/20 to-blue-400/20 text-blue-300 border-blue-400/30', dot: 'bg-blue-400' },
  tarea:        { label: 'Tarea',        color: 'bg-gradient-to-r from-orange-500/20 to-orange-400/20 text-orange-300 border-orange-400/30', dot: 'bg-orange-400' },
  nota:         { label: 'Nota',         color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 text-yellow-300 border-yellow-400/30', dot: 'bg-yellow-400' },
  recordatorio: { label: 'Recordatorio', color: 'bg-gradient-to-r from-pink-500/20 to-pink-400/20 text-pink-300 border-pink-400/30', dot: 'bg-pink-400' },
  personal:     { label: 'Personal',     color: 'bg-gradient-to-r from-purple-500/20 to-purple-400/20 text-purple-300 border-purple-400/30', dot: 'bg-purple-400' },
  otro:         { label: 'Otro',         color: 'bg-gradient-to-r from-slate-500/20 to-slate-400/20 text-slate-300 border-slate-400/30', dot: 'bg-slate-400' },
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
const EMPTY_FORM = { title: '', description: '', event_date: '', start_time: '', end_time: '', category: 'evento', quote_id: '' }

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

export default function WorkspaceCalendar() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getEvents(month, year)
      setEvents(res.data.events || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { loadEvents() }, [loadEvents])

  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsForDay = (day) => {
    if (!day) return []
    const key = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.event_date === key)
  }

  const isToday = (day) => day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const openCreate = (day = null) => {
    const dateStr = day ? `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}` : ''
    setForm({ ...EMPTY_FORM, event_date: dateStr })
    setModal('create')
  }

  const openEdit = (event) => {
    setSelectedEvent(event)
    setForm({ title: event.title || '', description: event.description || '', event_date: event.event_date || '', start_time: event.start_time || '', end_time: event.end_time || '', category: event.category || 'evento', quote_id: event.quote_id || '' })
    setModal('edit')
  }

  const openView = (event) => { setSelectedEvent(event); setModal('view') }

  const handleSave = async () => {
    if (!form.title || !form.event_date) { setFormError('Titulo y fecha son obligatorios'); return }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) { setFormError('La hora fin debe ser mayor a la hora inicio'); return }
    setFormError('')
    setSaving(true)
    try {
      if (modal === 'edit' && selectedEvent) {
        await calendarAPI.updateEvent(selectedEvent.id, { ...form, quote_id: form.quote_id || null })
      } else {
        await calendarAPI.createEvent({ ...form, quote_id: form.quote_id || null })
      }
      await loadEvents()
      setModal(null)
    } catch { setFormError('No se pudo guardar el evento.') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Eliminar este evento?')) return
    try { await calendarAPI.deleteEvent(id); await loadEvents(); setModal(null) } catch { /* silent */ }
  }

  const upd = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))
  const inputCls = 'w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-violet-500/40 focus:outline-none transition-colors min-h-[44px]'

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-400/20 flex items-center justify-center">
            <CalendarIcon size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Calendario</h2>
            <p className="text-xs text-slate-400">Eventos y agenda operativa</p>
          </div>
        </div>
        <button onClick={() => openCreate()} className="flex items-center gap-2 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-purple-500/15 px-3 sm:px-4 py-2.5 text-xs font-medium text-violet-300 hover:from-violet-500/25 hover:to-purple-500/25 transition-all active:scale-95 touch-manipulation min-h-[44px]">
          <Plus size={14} /> Nuevo evento
        </button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 overflow-hidden">
        {/* Month nav */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/20">
          <button onClick={prevMonth} className="rounded-lg p-2 sm:p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft size={18} /></button>
          <div className="flex items-center gap-3">
            <h3 className="text-base font-light text-white">{MONTHS_ES[month - 1]} {year}</h3>
            {(month !== today.getMonth() + 1 || year !== today.getFullYear()) && (
              <button onClick={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()) }}
                className="text-[10px] rounded-full border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-violet-400 hover:border-violet-400/40 transition-all">Hoy</button>
            )}
          </div>
          <button onClick={nextMonth} className="rounded-lg p-2 sm:p-1.5 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight size={18} /></button>
        </div>

        <div className="overflow-x-auto overscroll-x-contain">
          <div className="min-w-[580px] sm:min-w-[700px]">
            <div className="grid grid-cols-7 border-b border-slate-700/20">
              {DAYS_ES.map(d => (<div key={d} className="py-2 text-center text-[10px] uppercase tracking-widest text-slate-600">{d}</div>))}
            </div>
            {loading ? (
              <div className="h-64 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border border-violet-500/20 border-t-violet-400" /></div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dayEvents = eventsForDay(day)
                  const isT = isToday(day)
                  return (
                    <div key={i} onClick={() => day && openCreate(day)}
                      className={`min-h-[72px] sm:min-h-[100px] border-b border-r border-slate-700/10 p-1 sm:p-1.5 cursor-pointer transition-all touch-manipulation ${day ? 'hover:bg-violet-500/5 active:bg-violet-500/8' : 'opacity-0 pointer-events-none'} ${i % 7 === 6 ? 'border-r-0' : ''}`}>
                      {day && (
                        <>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-[11px] sm:text-xs mb-0.5 sm:mb-1 transition-all ${isT ? 'bg-violet-400 text-[#030b18] font-bold' : 'text-slate-500 hover:text-slate-300'}`}>{day}</div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 2).map(ev => (
                              <button key={ev.id} onClick={e => { e.stopPropagation(); openView(ev) }}
                                className={`w-full text-left rounded px-1 sm:px-1.5 py-0.5 text-[9px] sm:text-[10px] truncate border touch-manipulation ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color} hover:opacity-80 transition-opacity`}>
                                {ev.start_time ? `${fmtTime(ev.start_time)} ` : ''}{ev.title}
                              </button>
                            ))}
                            {dayEvents.length > 2 && <p className="text-[9px] text-slate-600 pl-1">+{dayEvents.length - 2} mas</p>}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
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

      {/* Upcoming events */}
      {events.length > 0 && (
        <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-slate-500 mb-4">Eventos este mes</h3>
          <div className="space-y-2">
            {events.map(ev => (
              <button key={ev.id} onClick={() => openView(ev)}
                className="w-full text-left flex items-start gap-3 rounded-xl border border-slate-700/20 bg-[#050a14]/40 px-3 sm:px-4 py-3 hover:border-slate-600/30 hover:bg-[#050a14]/60 active:bg-[#050a14]/80 transition-all group touch-manipulation min-h-[44px]">
                <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${CATEGORY_META[ev.category]?.dot || CATEGORY_META.otro.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">{fmtDate(ev.event_date)}{ev.start_time && ` · ${fmtTime(ev.start_time)}`}{ev.end_time && ` – ${fmtTime(ev.end_time)}`}</p>
                  {ev.quote_client && <p className="text-[10px] text-violet-500/60 mt-0.5">Cliente: {ev.quote_client}</p>}
                </div>
                <span className={`text-[9px] rounded-full border px-2 py-0.5 flex-shrink-0 ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[ev.category]?.label || 'Otro'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* View event drawer */}
      {modal === 'view' && selectedEvent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-[#060d1f]/98 shadow-2xl border-l border-slate-700/30 backdrop-blur-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-b border-slate-700/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <span className={`text-xs rounded-full border px-3 py-1 font-medium ${CATEGORY_META[selectedEvent.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[selectedEvent.category]?.label || 'Otro'}
                </span>
                <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <h2 className="text-xl font-semibold text-white">{selectedEvent.title}</h2>
              <p className="text-sm text-violet-300/80 font-medium">{fmtDate(selectedEvent.event_date)}{selectedEvent.start_time && ` · ${fmtTime(selectedEvent.start_time)}`}{selectedEvent.end_time && ` – ${fmtTime(selectedEvent.end_time)}`}</p>
              {selectedEvent.description && <p className="text-sm text-slate-300 rounded-xl bg-slate-800/30 p-4 whitespace-pre-wrap border border-slate-700/30">{selectedEvent.description}</p>}
              {selectedEvent.quote_client && (
                <Link to={`/admin/quotes/${selectedEvent.quote_id}`} onClick={() => setModal(null)} className="block text-sm text-violet-300 hover:text-violet-200 transition-colors">
                  Cotizacion: {selectedEvent.quote_client} — {selectedEvent.quote_type}
                </Link>
              )}
              <p className="text-xs text-slate-500">Creado por: {selectedEvent.creator_name}</p>
              <div className="flex gap-2 pt-2">
                <button onClick={() => openEdit(selectedEvent)} className="flex-1 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-sm text-violet-300 hover:bg-violet-500/20 transition-all">Editar</button>
                <button onClick={() => handleDelete(selectedEvent.id)} className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-300 hover:bg-red-500/20 transition-all">Eliminar</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Create/Edit event drawer */}
      {(modal === 'create' || modal === 'edit') && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-[#060d1f]/98 shadow-2xl border-l border-slate-700/30 backdrop-blur-2xl overflow-y-auto">
            <div className="sticky top-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-b border-slate-700/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{modal === 'edit' ? 'Editar evento' : 'Nuevo evento'}</h3>
                <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Titulo *</label>
                <input value={form.title} onChange={upd('title')} placeholder="Nombre del evento" className={inputCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Fecha *</label>
                  <input type="date" value={form.event_date} onChange={upd('event_date')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Categoria</label>
                  <select value={form.category} onChange={upd('category')} className={inputCls}>
                    {Object.entries(CATEGORY_META).map(([k, v]) => (<option key={k} value={k}>{v.label}</option>))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Hora inicio</label>
                  <input type="time" value={form.start_time} onChange={upd('start_time')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Hora fin</label>
                  <input type="time" value={form.end_time} onChange={upd('end_time')} className={inputCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">Descripcion</label>
                <textarea value={form.description} onChange={upd('description')} rows={3} placeholder="Detalles del evento" className={`${inputCls} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium uppercase tracking-wider text-slate-400 mb-1.5">ID Cotizacion (opcional)</label>
                <input type="number" value={form.quote_id} onChange={upd('quote_id')} placeholder="Ej: 4" className={inputCls} />
              </div>
              {formError && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2">{formError}</p>}
              <div className="flex gap-2 pt-2">
                <button onClick={() => setModal(null)} className="flex-1 rounded-xl border border-slate-700/40 bg-slate-800/40 py-2.5 text-sm text-slate-300 hover:bg-slate-800/60 transition-all">Cancelar</button>
                <button onClick={handleSave} disabled={!form.title || !form.event_date || saving}
                  className="flex-1 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-500/15 to-purple-500/15 py-2.5 text-sm font-medium text-violet-300 hover:from-violet-500/25 hover:to-purple-500/25 disabled:opacity-40 transition-all">
                  {saving ? 'Guardando...' : modal === 'edit' ? 'Guardar cambios' : 'Crear evento'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
