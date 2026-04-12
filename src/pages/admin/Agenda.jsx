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

const STATUS_META = {
  pendiente:    { label: 'Pendiente',    color: 'bg-yellow-500/20 text-yellow-400', icon: '⏳' },
  en_progreso:  { label: 'En Progreso',  color: 'bg-blue-500/20 text-blue-400', icon: '🔄' },
  completado:   { label: 'Completado',   color: 'bg-green-500/20 text-green-400', icon: '✅' },
  cancelado:    { label: 'Cancelado',    color: 'bg-red-500/20 text-red-400', icon: '❌' },
}

const PRIORITY_META = {
  baja:   { label: 'Baja',   color: 'bg-slate-500/20 text-slate-400', icon: '⬇️' },
  media:  { label: 'Media',  color: 'bg-blue-500/20 text-blue-400', icon: '➡️' },
  alta:   { label: 'Alta',   color: 'bg-orange-500/20 text-orange-400', icon: '⬆️' },
  urgente: { label: 'Urgente', color: 'bg-red-500/20 text-red-400', icon: '🔥' },
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const EMPTY_FORM = { 
  title: '', 
  description: '', 
  event_date: '', 
  start_time: '', 
  end_time: '', 
  category: 'evento', 
  status: 'pendiente',
  priority: 'media',
  color: '',
  tags: '',
  assigned_to: '',
  quote_id: '' 
}

export default function Agenda() {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedDay, setSelectedDay] = useState(null)
  
  // NUEVO: Estado para vistas y filtros
  const [viewMode, setViewMode] = useState('calendar') // calendar | board | list | timeline
  const [filters, setFilters] = useState({
    category: '',
    status: '',
    priority: '',
    search: ''
  })

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getEvents(month, year)
      setEvents(res.data.events || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { loadEvents() }, [loadEvents])

  // Filtrar eventos
  const filteredEvents = events.filter(event => {
    if (filters.category && event.category !== filters.category) return false
    if (filters.status && event.status !== filters.status) return false
    if (filters.priority && event.priority !== filters.priority) return false
    if (filters.search && !event.title.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay()
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsForDay = (day) => {
    if (!day) return []
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return filteredEvents.filter(e => e.event_date === key)
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
      title: event.title,
      description: event.description || '',
      event_date: event.event_date,
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      category: event.category,
      status: event.status || 'pendiente',
      priority: event.priority || 'media',
      color: event.color || '',
      tags: event.tags || '',
      assigned_to: event.assigned_to || '',
      quote_id: event.quote_id || ''
    })
    setModal('edit')
  }

  const handleSave = async () => {
    if (!form.title || !form.event_date) return
    setSaving(true)
    try {
      if (modal === 'edit') {
        await calendarAPI.updateEvent(selectedEvent.id, form)
      } else {
        await calendarAPI.createEvent(form)
      }
      setModal(null)
      setForm(EMPTY_FORM)
      loadEvents()
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await calendarAPI.deleteEvent(id)
      setModal(null)
      loadEvents()
    } catch { /* silent */ }
  }

  const upd = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  const fmtDate = (d) => {
    if (!d) return ''
    const date = new Date(d.includes?.('T') ? d : String(d).replace(' ', 'T'))
    return date.toLocaleDateString('es-MX', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' })
  }

  const fmtTime = (t) => {
    if (!t) return ''
    return t.slice(0, 5)
  }

  const inputCls = 'w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20'

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400 mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Cargando agenda...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header con selector de vistas */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-light text-white tracking-wide">Agenda</h1>
          <p className="text-sm text-slate-500 mt-1">Organiza eventos, tareas, reuniones y notas</p>
        </div>
        
        {/* Selector de vistas */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3 py-1.5 text-xs rounded transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              📅 Calendario
            </button>
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1.5 text-xs rounded transition-all ${
                viewMode === 'board' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              📊 Tablero
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs rounded transition-all ${
                viewMode === 'list' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              📋 Lista
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`px-3 py-1.5 text-xs rounded transition-all ${
                viewMode === 'timeline' 
                  ? 'bg-cyan-500/20 text-cyan-400' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              📈 Timeline
            </button>
          </div>
          
          <button
            onClick={() => openCreate()}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/15 transition-all"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            placeholder="🔍 Buscar..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={inputCls}
          />
          <select
            value={filters.category}
            onChange={(e) => setFilters({ ...filters, category: e.target.value })}
            className={inputCls}
          >
            <option value="">Todas las categorías</option>
            {Object.entries(CATEGORY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.icon} {meta.label}</option>
            ))}
          </select>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={inputCls}
          >
            <option value="">Todos los estados</option>
            {Object.entries(STATUS_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.icon} {meta.label}</option>
            ))}
          </select>
          <select
            value={filters.priority}
            onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
            className={inputCls}
          >
            <option value="">Todas las prioridades</option>
            {Object.entries(PRIORITY_META).map(([key, meta]) => (
              <option key={key} value={key}>{meta.icon} {meta.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* VISTA: CALENDARIO */}
      {viewMode === 'calendar' && (
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden shadow-lg shadow-cyan-500/5">
          {/* Calendar header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-500/10">
            <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-light text-white">{MONTHS_ES[month - 1]} {year}</h2>
            <button onClick={nextMonth} className="p-2 text-slate-400 hover:text-cyan-400 transition-colors">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Days of week */}
          <div className="grid grid-cols-7 border-b border-cyan-500/10">
            {DAYS_ES.map(day => (
              <div key={day} className="px-2 py-3 text-center text-xs font-medium uppercase tracking-wider text-slate-500">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {cells.map((day, idx) => {
              const dayEvents = eventsForDay(day)
              return (
                <div
                  key={idx}
                  onClick={() => day && openCreate(day)}
                  className={`min-h-[120px] border-r border-b border-cyan-500/8 p-2 transition-colors cursor-pointer ${
                    day ? 'hover:bg-cyan-500/5' : 'bg-[#030712]/50'
                  } ${isToday(day) ? 'bg-cyan-500/10' : ''}`}
                >
                  {day && (
                    <>
                      <div className={`text-xs font-medium mb-2 ${isToday(day) ? 'text-cyan-400' : 'text-slate-400'}`}>
                        {day}
                      </div>
                      <div className="space-y-1">
                        {dayEvents.slice(0, 3).map(event => {
                          const meta = CATEGORY_META[event.category] || CATEGORY_META.otro
                          return (
                            <div
                              key={event.id}
                              onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); setModal('view') }}
                              className={`text-[10px] px-2 py-1 rounded border ${meta.color} truncate cursor-pointer hover:opacity-80 transition-opacity`}
                            >
                              <span className="mr-1">{meta.icon}</span>
                              {event.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-slate-500 px-2">+{dayEvents.length - 3} más</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* VISTA: TABLERO KANBAN */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Object.entries(STATUS_META).map(([status, meta]) => {
            const statusEvents = filteredEvents.filter(e => (e.status || 'pendiente') === status)
            return (
              <div key={status} className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 overflow-hidden">
                <div className={`px-4 py-3 border-b border-cyan-500/10 ${meta.color}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{meta.icon} {meta.label}</span>
                    <span className="text-xs opacity-60">{statusEvents.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-2 max-h-[600px] overflow-y-auto">
                  {statusEvents.map(event => {
                    const catMeta = CATEGORY_META[event.category] || CATEGORY_META.otro
                    const priMeta = PRIORITY_META[event.priority || 'media']
                    return (
                      <div
                        key={event.id}
                        onClick={() => { setSelectedEvent(event); setModal('view') }}
                        className="rounded-lg border border-cyan-500/10 bg-[#030b18]/60 p-3 cursor-pointer hover:border-cyan-500/30 transition-all"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${catMeta.color}`}>
                            {catMeta.icon} {catMeta.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${priMeta.color}`}>
                            {priMeta.icon}
                          </span>
                        </div>
                        <h4 className="text-sm text-slate-200 font-medium mb-1">{event.title}</h4>
                        <p className="text-xs text-slate-500">{fmtDate(event.event_date)}</p>
                        {event.assigned_to && (
                          <p className="text-xs text-cyan-400 mt-2">👤 {event.assigned_to}</p>
                        )}
                      </div>
                    )
                  })}
                  {statusEvents.length === 0 && (
                    <p className="text-xs text-slate-600 text-center py-8">Sin elementos</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* VISTA: LISTA */}
      {viewMode === 'list' && (
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-cyan-500/10">
                <tr className="text-left">
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Título</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Categoría</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Prioridad</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Fecha</th>
                  <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Asignado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-500/8">
                {filteredEvents.map(event => {
                  const catMeta = CATEGORY_META[event.category] || CATEGORY_META.otro
                  const statusMeta = STATUS_META[event.status || 'pendiente']
                  const priMeta = PRIORITY_META[event.priority || 'media']
                  return (
                    <tr
                      key={event.id}
                      onClick={() => { setSelectedEvent(event); setModal('view') }}
                      className="hover:bg-[#040c1a]/50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusMeta.color}`}>
                          {statusMeta.icon} {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-200">{event.title}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${catMeta.color}`}>
                          {catMeta.icon} {catMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${priMeta.color}`}>
                          {priMeta.icon} {priMeta.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">{fmtDate(event.event_date)}</td>
                      <td className="px-6 py-4 text-sm text-cyan-400">{event.assigned_to || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {filteredEvents.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-sm text-slate-500">No hay elementos que coincidan con los filtros</p>
            </div>
          )}
        </div>
      )}

      {/* VISTA: TIMELINE */}
      {viewMode === 'timeline' && (
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-6">
          <div className="space-y-4">
            {filteredEvents
              .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
              .map((event, idx) => {
                const catMeta = CATEGORY_META[event.category] || CATEGORY_META.otro
                const priMeta = PRIORITY_META[event.priority || 'media']
                return (
                  <div key={event.id} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full ${catMeta.dot}`}></div>
                      {idx < filteredEvents.length - 1 && (
                        <div className="w-0.5 flex-1 bg-cyan-500/20 mt-2"></div>
                      )}
                    </div>
                    <div
                      onClick={() => { setSelectedEvent(event); setModal('view') }}
                      className="flex-1 rounded-lg border border-cyan-500/10 bg-[#030b18]/60 p-4 cursor-pointer hover:border-cyan-500/30 transition-all mb-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded border ${catMeta.color}`}>
                            {catMeta.icon} {catMeta.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${priMeta.color}`}>
                            {priMeta.icon} {priMeta.label}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{fmtDate(event.event_date)}</span>
                      </div>
                      <h4 className="text-base text-slate-200 font-medium mb-1">{event.title}</h4>
                      {event.description && (
                        <p className="text-sm text-slate-400 line-clamp-2">{event.description}</p>
                      )}
                      {event.assigned_to && (
                        <p className="text-xs text-cyan-400 mt-2">👤 {event.assigned_to}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            {filteredEvents.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No hay elementos en el timeline</p>
            )}
          </div>
        </div>
      )}

      {/* VIEW MODAL */}
      {modal === 'view' && selectedEvent && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="max-w-lg w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded border ${CATEGORY_META[selectedEvent.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[selectedEvent.category]?.icon} {CATEGORY_META[selectedEvent.category]?.label}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${STATUS_META[selectedEvent.status || 'pendiente'].color}`}>
                  {STATUS_META[selectedEvent.status || 'pendiente'].icon} {STATUS_META[selectedEvent.status || 'pendiente'].label}
                </span>
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${PRIORITY_META[selectedEvent.priority || 'media'].color}`}>
                  {PRIORITY_META[selectedEvent.priority || 'media'].icon} {PRIORITY_META[selectedEvent.priority || 'media'].label}
                </span>
              </div>
              <button onClick={() => setModal(null)} className="text-slate-500 hover:text-slate-200 transition-colors">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <h3 className="text-xl font-light text-white mb-3">{selectedEvent.title}</h3>
            
            {selectedEvent.description && (
              <p className="text-sm text-slate-400 mb-4 whitespace-pre-wrap">{selectedEvent.description}</p>
            )}

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {fmtDate(selectedEvent.event_date)}
                {selectedEvent.start_time && ` • ${fmtTime(selectedEvent.start_time)}`}
                {selectedEvent.end_time && ` - ${fmtTime(selectedEvent.end_time)}`}
              </div>
              
              {selectedEvent.assigned_to && (
                <div className="flex items-center gap-2 text-cyan-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  {selectedEvent.assigned_to}
                </div>
              )}

              {selectedEvent.tags && (
                <div className="flex items-center gap-2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  {selectedEvent.tags}
                </div>
              )}
            </div>

            {selectedEvent.quote_id && (
              <div className="mb-4 p-3 rounded-lg border border-cyan-500/20 bg-cyan-500/5">
                <Link
                  to={`/admin/quotes/${selectedEvent.quote_id}`}
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

      {/* CREATE / EDIT MODAL */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setModal(null)}>
          <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-light text-white mb-5">
              {modal === 'edit' ? 'Editar' : selectedDay ? `Nuevo — ${fmtDate(form.event_date)}` : 'Nuevo'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Título *</label>
                <input value={form.title} onChange={upd('title')} placeholder="Nombre..." className={inputCls} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Categoría *</label>
                  <select value={form.category} onChange={upd('category')} className={inputCls}>
                    {Object.entries(CATEGORY_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Estado</label>
                  <select value={form.status} onChange={upd('status')} className={inputCls}>
                    {Object.entries(STATUS_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Prioridad</label>
                  <select value={form.priority} onChange={upd('priority')} className={inputCls}>
                    {Object.entries(PRIORITY_META).map(([key, meta]) => (
                      <option key={key} value={key}>{meta.icon} {meta.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Asignado a</label>
                  <input value={form.assigned_to} onChange={upd('assigned_to')} placeholder="Nombre..." className={inputCls} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Fecha *</label>
                  <input type="date" value={form.event_date} onChange={upd('event_date')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Inicio</label>
                  <input type="time" value={form.start_time} onChange={upd('start_time')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Fin</label>
                  <input type="time" value={form.end_time} onChange={upd('end_time')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Etiquetas</label>
                <input value={form.tags} onChange={upd('tags')} placeholder="Separadas por comas..." className={inputCls} />
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={upd('description')}
                  rows={4}
                  placeholder="Detalles..."
                  className={inputCls + ' resize-none'}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.title || !form.event_date}
                  className="flex-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-sm font-medium text-cyan-400 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/15 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? 'Guardando...' : modal === 'edit' ? 'Actualizar' : 'Crear'}
                </button>
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 rounded-full border border-slate-700/40 bg-[#040c1a]/60 px-4 py-2.5 text-sm font-light text-slate-500 transition-all hover:border-slate-600/40 hover:text-slate-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
