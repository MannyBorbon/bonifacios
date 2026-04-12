import { useEffect, useState, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { quotesAPI } from '../../services/api'

const TZ = 'America/Hermosillo'
const fmtDate = (d) => {
  if (!d) return ''
  const date = new Date(d.includes?.('T') ? d : String(d).replace(' ', 'T'))
  return date.toLocaleDateString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit' })
}
const fmtFull = (d) => {
  if (!d) return ''
  const date = new Date(d.includes?.('T') ? d : String(d).replace(' ', 'T'))
  return date.toLocaleString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

function Quotes() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const navigate = useNavigate()
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingQuote, setEditingQuote] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [stats, setStats] = useState(null)
  const isAdmin = currentUser.role === 'administrador'

  const loadQuotes = useCallback(async () => {
    try {
      const res = await quotesAPI.getQuotes()
      setQuotes(res.data.quotes || [])
      setStats(res.data.stats || null)
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadQuotes() }, [loadQuotes])

  const handleDelete = async (quoteId) => {
    if (!confirm('¿Estás seguro de eliminar esta cotización?')) return
    try {
      await quotesAPI.deleteQuote(quoteId)
      loadQuotes()
    } catch { /* silent */ }
  }

  const handleSave = async (quoteData) => {
    try {
      if (editingQuote) {
        await quotesAPI.updateQuote(editingQuote.id, quoteData)
      } else {
        await quotesAPI.createQuote(quoteData)
      }
      setShowForm(false)
      setEditingQuote(null)
      loadQuotes()
    } catch { /* silent */ }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400 mx-auto mb-3"></div>
          <p className="text-xs text-slate-500">Cargando cotizaciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white tracking-wide">Cotizaciones de Eventos</h1>
          <p className="text-sm text-slate-500 mt-1">Gestiona las solicitudes de cotización de eventos</p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Total Solicitudes</p>
                <p className="text-xl font-semibold text-slate-200">{stats.total_quotes}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Pendientes</p>
                <p className="text-xl font-semibold text-yellow-400">{stats.pending_quotes}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Confirmadas</p>
                <p className="text-xl font-semibold text-green-400">{stats.confirmed_quotes}</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500">Tasa Conversión</p>
                <p className="text-xl font-semibold text-cyan-400">{stats.conversion_rate}%</p>
              </div>
              <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Types Statistics */}
      {stats?.event_types && (
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-6 shadow-lg shadow-cyan-500/5">
          <h3 className="text-base font-light text-white mb-4">Tipos de Evento Más Solicitados</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stats.event_types.map((type, index) => (
              <div key={type.event_type} className="flex items-center justify-between p-3 rounded-lg border border-cyan-500/15 bg-[#040c1a]/50">
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-cyan-400/60">#{index + 1}</span>
                  <span className="text-sm text-slate-500">{type.event_type}</span>
                </div>
                <span className="text-sm font-medium text-cyan-400">{type.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quotes List */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden shadow-lg shadow-cyan-500/5">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-cyan-500/10">
              <tr className="text-left">
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">ID</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Cliente</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Evento</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Fecha</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Invitados</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500">Estado</th>
                <th className="px-6 py-4 text-xs font-medium uppercase tracking-wider text-slate-500 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-cyan-500/8">
              {quotes.map((quote) => (
                <tr key={quote.id} className="hover:bg-[#040c1a]/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-cyan-400/60">#{quote.id}</td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-200">{quote.name}</p>
                      <p className="text-xs text-slate-500">{quote.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-200">{quote.event_type}</p>
                      <p className="text-xs text-slate-500">{quote.location || 'Sin ubicación'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm text-slate-200">{fmtDate(quote.event_date)}</p>
                      <p className="text-xs text-slate-500">{fmtFull(quote.created_at)}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-200">{quote.guests}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border ${statusColors[quote.status]}`}>
                      {statusLabels[quote.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/admin/quotes/${quote.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-[11px] font-medium text-cyan-400 hover:border-cyan-400/50 hover:bg-cyan-500/20 transition-all"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Ver Expediente
                      </Link>
                      <button
                        onClick={() => navigate(`/admin/quotes/${quote.id}/cotizacion`)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-400 hover:border-emerald-400/50 hover:bg-emerald-500/20 transition-all"
                        title="Nueva Cotización desde esta solicitud"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Cotizar
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuote(quote)
                          setShowForm(true)
                        }}
                        className="text-blue-400/60 hover:text-blue-400 transition-colors"
                        title="Editar"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(quote.id)}
                          className="text-red-400/60 hover:text-red-400 transition-colors"
                          title="Eliminar"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {quotes.length === 0 && (
          <div className="p-12 text-center">
            <p className="text-sm text-slate-500">No hay solicitudes de cotización</p>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <QuoteForm
          quote={editingQuote}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingQuote(null)
          }}
        />
      )}
    </div>
  )
}

// Quote Form Component
function QuoteForm({ quote, onSave, onCancel }) {
  const [currentTab, setCurrentTab] = useState(quote?.isFromQuote ? 'cotizacion' : 'datos')
  const [formData, setFormData] = useState({
    name: quote?.name || '',
    phone: quote?.phone || '',
    email: quote?.email || '',
    event_type: quote?.event_type || '',
    event_date: quote?.event_date || '',
    guests: quote?.guests || '',
    location: quote?.location || '',
    notes: quote?.notes || '',
    status: quote?.status || 'pending',
    quote_amount: quote?.quote_amount || '',
    // Hoja de cotización fields
    menu_options: quote?.menu_options || '',
    beverages: quote?.beverages || '',
    services: quote?.services || '',
    decorations: quote?.decorations || '',
    additional_services: quote?.additional_services || '',
    subtotal: quote?.subtotal || '',
    tax: quote?.tax || '',
    total: quote?.total || '',
    deposit: quote?.deposit || '',
    balance: quote?.balance || '',
    payment_terms: quote?.payment_terms || '',
    notes_quote: quote?.notes_quote || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave({
      ...formData,
      guests: parseInt(formData.guests),
      quote_amount: formData.quote_amount ? parseFloat(formData.quote_amount) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/95 to-[#060f20]/90 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-light text-white">
            {quote ? 'Editar Cotización' : 'Nueva Cotización'}
          </h2>
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-200 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tabs */}
          <div className="flex gap-1 border-b border-cyan-500/10">
            {[
              { key: 'datos', label: 'Datos del Cliente' },
              { key: 'cotizacion', label: 'Hoja de Cotización' },
            ].map(tab => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setCurrentTab(tab.key)}
                className={`px-4 py-2 text-xs font-medium transition-all ${
                  currentTab === tab.key
                    ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {currentTab === 'datos' && (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Nombre *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Teléfono *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Email *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Ubicación</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Tipo de Evento *</label>
              <select
                required
                value={formData.event_type}
                onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              >
                <option value="">Seleccionar...</option>
                <option value="Boda">Boda</option>
                <option value="Bautizo">Bautizo</option>
                <option value="Cumpleaños">Cumpleaños</option>
                <option value="Aniversario">Aniversario</option>
                <option value="Evento Corporativo">Evento Corporativo</option>
                <option value="Graduación">Graduación</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Fecha del Evento *</label>
              <input
                type="date"
                required
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Número de Invitados *</label>
              <input
                type="number"
                required
                min="1"
                value={formData.guests}
                onChange={(e) => setFormData({ ...formData, guests: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
              />
            </div>
            <div>
              <label className="block text-xs text-cyan-400/60 mb-1">Monto Cotizado</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.quote_amount}
                onChange={(e) => setFormData({ ...formData, quote_amount: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                placeholder="0.00"
              />
            </div>
            </div>

              <div>
                <label className="block text-xs text-cyan-400/60 mb-1">Notas Adicionales</label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-cyan-400/60 mb-1">Estado</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                >
                  <option value="pending">Pendiente</option>
                  <option value="contacted">Contactado</option>
                  <option value="quoted">Cotizado</option>
                  <option value="confirmed">Confirmado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </>
          )}

          {currentTab === 'cotizacion' && (
            <>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Opciones de Menú</label>
                  <textarea
                    rows={4}
                    value={formData.menu_options}
                    onChange={(e) => setFormData({ ...formData, menu_options: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                    placeholder="Entradas, Platos Fuertes, Postres..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Bebidas</label>
                  <textarea
                    rows={3}
                    value={formData.beverages}
                    onChange={(e) => setFormData({ ...formData, beverages: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                    placeholder="Coctelería, Vinos, Bebidas sin alcohol..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Servicios Adicionales</label>
                  <textarea
                    rows={3}
                    value={formData.services}
                    onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                    placeholder="Música, DJ, Seguridad, Limpieza..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Decoraciones</label>
                  <textarea
                    rows={2}
                    value={formData.decorations}
                    onChange={(e) => setFormData({ ...formData, decorations: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                    placeholder="Arreglos florales, Centros de mesa..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Servicios Extra</label>
                  <textarea
                    rows={2}
                    value={formData.additional_services}
                    onChange={(e) => setFormData({ ...formData, additional_services: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                    placeholder="Fuegos artificiales, Costos por daños..."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Subtotal</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.subtotal}
                    onChange={(e) => setFormData({ ...formData, subtotal: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">IVA (16%)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.tax}
                    onChange={(e) => setFormData({ ...formData, tax: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Total</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.total}
                    onChange={(e) => setFormData({ ...formData, total: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Depósito</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.deposit}
                    onChange={(e) => setFormData({ ...formData, deposit: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs text-cyan-400/60 mb-1">Saldo Restante</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.balance}
                    onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                    className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-cyan-400/60 mb-1">Condiciones de Pago</label>
                <textarea
                  rows={2}
                  value={formData.payment_terms}
                  onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                  placeholder="Ej: 50% al firmar contrato, 50% 15 días antes del evento..."
                />
              </div>

              <div>
                <label className="block text-xs text-cyan-400/60 mb-1">Notas de Cotización</label>
                <textarea
                  rows={3}
                  value={formData.notes_quote}
                  onChange={(e) => setFormData({ ...formData, notes_quote: e.target.value })}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 resize-none"
                  placeholder="Términos, condiciones, políticas..."
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-400 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/15"
            >
              {quote ? 'Actualizar' : 'Crear'} Cotización
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-full border border-slate-700/40 bg-[#040c1a]/60 px-4 py-2 text-sm font-light text-slate-500 transition-all hover:border-slate-600/40 hover:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Quotes
