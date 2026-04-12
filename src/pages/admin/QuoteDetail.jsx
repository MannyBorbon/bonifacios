import { useEffect, useState, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quotesAPI } from '../../services/api'

const TZ = 'America/Hermosillo'
const fmtDate = (d) => {
  if (!d) return '—'
  const date = new Date(String(d).replace(' ', 'T'))
  return date.toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}
const fmtTS = (d) => {
  if (!d) return ''
  const date = new Date(String(d).replace(' ', 'T'))
  return date.toLocaleString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const statusColors = {
  nueva_solicitud: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  contacted: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  quoted: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  en_negociacion: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  confirmed: 'bg-green-500/20 text-green-400 border-green-500/30',
  garantizado: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  cerrado: 'bg-slate-500/20 text-slate-400 border-slate-500/30',
  cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
}
const statusLabels = {
  nueva_solicitud: 'Nueva Solicitud',
  pending: 'Pendiente',
  contacted: 'Contactado',
  quoted: 'Cotizado',
  en_negociacion: 'En Negociación',
  confirmed: 'Confirmado',
  garantizado: 'Garantizado',
  cerrado: 'Cerrado',
  cancelled: 'Cancelado',
}
const CANCEL_REASONS = [
  'Por precio',
  'Cambio de destino',
  'Causas de fuerza mayor',
  'Cambio de fecha no disponible',
  'Falta de respuesta del cliente',
  'El cliente eligió otro proveedor',
  'Otro',
]

function Section({ title, children }) {
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Field({ label, children }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">{label}</p>
      <div className="text-sm text-slate-200">{children || <span className="text-slate-600">—</span>}</div>
    </div>
  )
}

export default function QuoteDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdmin = currentUser.role === 'administrador'

  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notes, setNotes] = useState([])
  const [requirements, setRequirements] = useState([])
  const [cotizaciones, setCotizaciones] = useState([])
  const [newNote, setNewNote] = useState('')
  const [newReq, setNewReq] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [savingReq, setSavingReq] = useState(false)
  const [statusSaving, setStatusSaving] = useState(false)
  const [cancelModal, setCancelModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelNotes, setCancelNotes] = useState('')
  const [pendingStatus, setPendingStatus] = useState(null)

  const loadAll = useCallback(async () => {
    try {
      const [qRes, nRes, rRes, cRes] = await Promise.all([
        quotesAPI.getQuote(id),
        quotesAPI.getNotes(id),
        quotesAPI.getRequirements(id),
        quotesAPI.getCotizaciones(id),
      ])
      setQuote(qRes.data.quote)
      setNotes(nRes.data.notes || [])
      setRequirements(rRes.data.requirements || [])
      setCotizaciones(cRes.data.cotizaciones || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadAll() }, [loadAll])

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'cancelled') {
      setPendingStatus(newStatus)
      setCancelModal(true)
      return
    }
    setStatusSaving(true)
    try {
      await quotesAPI.updateQuote(id, { status: newStatus })
      setQuote(prev => ({ ...prev, status: newStatus }))
    } catch { /* silent */ }
    finally { setStatusSaving(false) }
  }

  const handleConfirmCancel = async () => {
    if (!cancelReason) return
    setStatusSaving(true)
    try {
      await quotesAPI.updateQuote(id, {
        status: pendingStatus,
        cancellation_reason: cancelReason,
        cancellation_notes: cancelNotes,
      })
      setQuote(prev => ({ ...prev, status: pendingStatus }))
      setCancelModal(false)
      setCancelReason('')
      setCancelNotes('')
      setPendingStatus(null)
    } catch { /* silent */ }
    finally { setStatusSaving(false) }
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setSavingNote(true)
    try {
      const res = await quotesAPI.addNote({ quote_id: parseInt(id), note: newNote.trim() })
      setNotes(prev => [res.data.note, ...prev])
      setNewNote('')
    } catch { /* silent */ }
    finally { setSavingNote(false) }
  }

  const handleDeleteNote = async (noteId) => {
    try {
      await quotesAPI.deleteNote(noteId)
      setNotes(prev => prev.filter(n => n.id !== noteId))
    } catch { /* silent */ }
  }

  const handleAddReq = async () => {
    if (!newReq.trim()) return
    setSavingReq(true)
    try {
      const res = await quotesAPI.saveRequirement({ action: 'add', quote_id: parseInt(id), item: newReq.trim() })
      setRequirements(prev => [...prev, res.data.requirement])
      setNewReq('')
    } catch { /* silent */ }
    finally { setSavingReq(false) }
  }

  const handleToggleReq = async (req) => {
    const newChecked = req.is_checked ? 0 : 1
    setRequirements(prev => prev.map(r => r.id === req.id ? { ...r, is_checked: newChecked } : r))
    try {
      await quotesAPI.saveRequirement({ action: 'toggle', id: req.id, is_checked: newChecked })
    } catch { /* silent */ }
  }

  const handleDeleteReq = async (reqId) => {
    setRequirements(prev => prev.filter(r => r.id !== reqId))
    try {
      await quotesAPI.saveRequirement({ action: 'delete', id: reqId })
    } catch { /* silent */ }
  }

  const phoneClean = (phone) => {
    if (!phone) return ''
    const digits = phone.replace(/\D/g, '')
    if (digits.startsWith('52')) return digits
    if (digits.length === 10) return '52' + digits
    return digits
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-8 w-8 rounded-full border-t border-cyan-400 animate-spin" />
    </div>
  )

  if (!quote) return (
    <div className="p-8 text-center text-slate-500">
      <p>Cotización no encontrada.</p>
      <Link to="/admin/quotes" className="text-cyan-400 text-sm mt-2 inline-block">← Regresar</Link>
    </div>
  )

  const wa = `https://wa.me/${phoneClean(quote.phone)}?text=${encodeURIComponent(`Hola ${quote.name}, te contactamos de Bonifacio's Restaurant respecto a tu solicitud de cotización para tu ${quote.event_type}.`)}`
  const tel = `tel:+${phoneClean(quote.phone)}`
  const completedReqs = requirements.filter(r => r.is_checked).length

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/admin/quotes')}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Cotizaciones
          </button>
          <span className="text-slate-700">/</span>
          <h1 className="text-xl font-light text-white">Expediente <span className="text-cyan-400">#{quote.id}</span></h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <select
              value={quote.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              disabled={statusSaving}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border cursor-pointer focus:outline-none transition-all ${statusColors[quote.status]}`}
              style={{ background: 'transparent' }}
            >
              {Object.entries(statusLabels).map(([v, l]) => (
                <option key={v} value={v} className="bg-[#030b18] text-slate-200">{l}</option>
              ))}
            </select>
          )}
          {!isAdmin && (
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium border ${statusColors[quote.status]}`}>
              {statusLabels[quote.status]}
            </span>
          )}
          <Link
            to={`/admin/quotes/${id}/cotizacion`}
            className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs font-medium text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-500/20 transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Cotizaciones {cotizaciones.length > 0 && <span className="bg-emerald-500/20 rounded-full px-1.5 py-0.5 text-[10px]">{cotizaciones.length}</span>}
          </Link>
          <Link
            to={`/admin/quotes/${id}/beo`}
            className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 text-xs font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 transition-all"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Orden de Servicio
          </Link>
        </div>
      </div>

      {/* Client + Contact */}
      <Section title="Datos del Cliente">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Nombre completo">{quote.name}</Field>
          <Field label="Correo electrónico">
            {quote.email ? (
              <a href={`mailto:${quote.email}`} className="text-cyan-400 hover:underline">{quote.email}</a>
            ) : null}
          </Field>
          <Field label="Teléfono">
            <div className="flex items-center gap-2 flex-wrap mt-1">
              <a
                href={tel}
                className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                {quote.phone}
              </a>
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1.5 text-xs text-green-400 hover:border-green-400/50 hover:bg-green-500/20 transition-all"
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </a>
            </div>
          </Field>
        </div>
      </Section>

      {/* Event Details */}
      <Section title="Detalles del Evento">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Tipo de evento">{quote.event_type}</Field>
          <Field label="Fecha del evento">{fmtDate(quote.event_date)}</Field>
          <Field label="Área / Ubicación">{quote.location}</Field>
          <Field label="Invitados estimados">{quote.guests}</Field>
          <Field label="Solicitud recibida">{fmtTS(quote.created_at)}</Field>
          {quote.quote_amount && <Field label="Cotización ($)">{parseFloat(quote.quote_amount).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</Field>}
        </div>
        {quote.notes && (
          <div className="mt-4 pt-4 border-t border-cyan-500/10">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">Notas del cliente</p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap">{quote.notes}</p>
          </div>
        )}
      </Section>

      {/* Requirements */}
      <Section title={`Lista de Requerimientos${requirements.length ? ` · ${completedReqs}/${requirements.length}` : ''}`}>
        <div className="space-y-2 mb-4">
          {requirements.length === 0 && (
            <p className="text-xs text-slate-600 py-2">No hay requerimientos registrados.</p>
          )}
          {requirements.map(req => (
            <div key={req.id} className="flex items-start gap-3 group">
              <button
                onClick={() => handleToggleReq(req)}
                className={`mt-0.5 flex-shrink-0 h-4 w-4 rounded border transition-all ${req.is_checked ? 'bg-cyan-500/30 border-cyan-500/50' : 'border-slate-600 hover:border-cyan-500/50'}`}
              >
                {!!req.is_checked && (
                  <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              <span className={`flex-1 text-sm ${req.is_checked ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                {req.item}
              </span>
              <button
                onClick={() => handleDeleteReq(req.id)}
                className="opacity-0 group-hover:opacity-100 text-red-400/50 hover:text-red-400 transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newReq}
            onChange={e => setNewReq(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddReq()}
            placeholder="Agregar requerimiento…"
            className="flex-1 rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/40 focus:outline-none"
          />
          <button
            onClick={handleAddReq}
            disabled={savingReq || !newReq.trim()}
            className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:opacity-40 transition-all"
          >
            + Agregar
          </button>
        </div>
      </Section>

      {/* Internal Notes */}
      <Section title="Notas Internas del Equipo">
        <div className="mb-4 space-y-2">
          <textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            placeholder="Escribe una nota interna (solo visible para el equipo)…"
            className="w-full rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/40 focus:outline-none resize-none"
          />
          <button
            onClick={handleAddNote}
            disabled={savingNote || !newNote.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/20 disabled:opacity-40 transition-all"
          >
            {savingNote ? 'Guardando…' : 'Guardar nota'}
          </button>
        </div>

        <div className="space-y-3">
          {notes.length === 0 && <p className="text-xs text-slate-600 py-2">No hay notas registradas.</p>}
          {notes.map(n => (
            <div key={n.id} className="flex gap-3 group">
              <div className="flex-shrink-0 mt-0.5 h-6 w-6 rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <span className="text-[10px] text-cyan-400 font-medium">{(n.author_name || 'U')[0].toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-slate-400">{n.author_name || 'Usuario'}</span>
                  <span className="text-[10px] text-slate-600">{fmtTS(n.created_at)}</span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap">{n.note}</p>
              </div>
              <button
                onClick={() => handleDeleteNote(n.id)}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-red-400/50 hover:text-red-400 transition-all"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* Historial de Cotizaciones */}
      <Section title="Historial de cotizaciones">
        {cotizaciones.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-xs text-slate-600 mb-3">Aún no hay cotizaciones para esta solicitud</p>
            <Link
              to={`/admin/quotes/${id}/cotizacion`}
              className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 hover:border-emerald-400/50 transition-all"
            >
              + Nueva cotización
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {cotizaciones.map(c => (
              <Link
                key={c.id}
                to={`/admin/quotes/${id}/cotizacion`}
                className="flex items-center gap-3 p-3 rounded-lg border border-cyan-500/8 bg-[#030b18]/40 hover:border-cyan-500/20 transition-all"
              >
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-purple-400">v{c.version_number}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-slate-300">Cotización #{c.id}</span>
                    {c.is_final && <span className="text-[9px] text-emerald-400 border border-emerald-500/30 rounded-full px-1.5 py-0.5">★ FINAL</span>}
                    {c.sent_at && <span className="text-[9px] text-sky-400/60">✉ Enviado</span>}
                  </div>
                  <p className="text-[10px] text-slate-600">{c.created_by_name} · {fmtTS(c.created_at)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">
                    {c.data?.total_con_extras ? `$${parseFloat(c.data.total_con_extras).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'}
                  </p>
                  <p className="text-[10px] text-red-400">
                    {c.data?.saldo ? `Saldo: $${parseFloat(c.data.saldo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : ''}
                  </p>
                </div>
              </Link>
            ))}
            <Link
              to={`/admin/quotes/${id}/cotizacion`}
              className="block text-center py-2 text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors"
            >
              + Nueva versión de cotización
            </Link>
          </div>
        )}
      </Section>

      {/* Cancellation Modal */}
      {cancelModal && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-red-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="flex-shrink-0 h-9 w-9 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center">
                <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">Cancelar solicitud</h3>
                <p className="text-xs text-slate-500">Debes indicar el motivo antes de continuar</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Motivo de cancelación *</label>
                <select
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full rounded-lg border border-red-500/20 bg-[#030b18]/70 px-3 py-2 text-sm text-slate-200 focus:border-red-400/40 focus:outline-none"
                >
                  <option value="">Selecciona un motivo…</option>
                  {CANCEL_REASONS.map(r => <option key={r} value={r} className="bg-[#030b18]">{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Detalle / notas adicionales</label>
                <textarea
                  value={cancelNotes}
                  onChange={e => setCancelNotes(e.target.value)}
                  rows={3}
                  placeholder="Describe qué ocurrió…"
                  className="w-full rounded-lg border border-red-500/20 bg-[#030b18]/70 px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:border-red-400/40 focus:outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => { setCancelModal(false); setPendingStatus(null) }}
                className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Regresar
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={!cancelReason || statusSaving}
                className="inline-flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/15 px-4 py-2 text-xs font-medium text-red-400 hover:border-red-400/50 hover:bg-red-500/20 disabled:opacity-40 transition-all"
              >
                {statusSaving ? 'Guardando…' : 'Confirmar cancelación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
