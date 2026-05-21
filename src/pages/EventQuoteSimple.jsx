import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicTracker from '../components/PublicTracker'

const EVENT_TYPES = ['Boda', 'Bautizo', 'Cumpleaños', 'Aniversario', 'Evento Corporativo', 'Graduación', 'Otro']
const LOCATIONS   = ['Comedor', 'Terraza Alta', 'Terraza Baja']

function EventQuoteSimple() {
  const [form, setForm] = useState({
    name: '', phone: '', email: '',
    event_type: '', event_type_other: '',
    date: '', guests: '', location: '', notes: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const isOther = ['otro', 'other', 'autre', '其他'].includes(
    String(form.event_type || '').toLowerCase().trim()
  )

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.event_type || !form.date) {
      setMessage('Por favor completa todos los campos requeridos.')
      return
    }
    if (isOther && !form.event_type_other.trim()) {
      setMessage('Por favor especifica el tipo de evento cuando selecciones "Otro".')
      return
    }

    setIsSubmitting(true)
    setMessage('')

    try {
      const res = await fetch('/api/quotes/submit.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setMessage('¡Solicitud enviada! Te contactaremos pronto.')
        setForm({ name: '', phone: '', email: '', event_type: '', event_type_other: '', date: '', guests: '', location: '', notes: '' })
      } else {
        setMessage('Error al enviar la solicitud. Por favor intenta de nuevo.')
      }
    } catch {
      setMessage('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const inputCls = 'w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors'
  const labelCls = 'block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5'

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
      <PublicTracker />

      {/* Fondo decorativo */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[130px]" />
        <div className="absolute bottom-0 -left-32 h-[500px] w-[500px] rounded-full bg-[#C9A961]/6 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-2xl px-4 py-12 sm:px-6 sm:py-16">
        {/* Back link */}
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-xs text-[#D4AF37]/60 transition-colors hover:text-[#D4AF37]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Volver al inicio
        </Link>

        <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 sm:p-10 backdrop-blur-xl">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#D4AF37]/8 blur-3xl" />
          <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#D4AF37]/5 blur-3xl" />

          <div className="relative">
            <h2 className="font-serif text-xl sm:text-2xl font-light text-[#F4E4C1] mb-1">Cotiza tu Evento</h2>
            <p className="text-sm text-[#F4E4C1]/50 mb-8">Bodas, bautizos, cumpleaños y más. Cuéntanos sobre tu evento y te contactamos.</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Nombre completo *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className={inputCls}
                    placeholder="..."
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Teléfono *</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className={inputCls}
                    placeholder="622 000 0000"
                    required
                  />
                </div>
              </div>

              <div>
                <label className={labelCls}>Correo electrónico</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className={inputCls}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Tipo de evento *</label>
                  <select
                    value={form.event_type}
                    onChange={(e) => {
                      const val = e.target.value
                      const other = ['otro', 'other', 'autre', '其他'].includes(val.toLowerCase().trim())
                      setForm({ ...form, event_type: val, event_type_other: other ? form.event_type_other : '' })
                    }}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecciona tipo de evento</option>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                {isOther ? (
                  <div>
                    <label className={labelCls}>¿Qué evento es? *</label>
                    <input
                      type="text"
                      value={form.event_type_other}
                      onChange={(e) => setForm({ ...form, event_type_other: e.target.value })}
                      className={inputCls}
                      placeholder="Describe el tipo de evento"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className={labelCls}>Fecha del evento *</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className={inputCls}
                      required
                    />
                  </div>
                )}
              </div>

              {isOther && (
                <div>
                  <label className={labelCls}>Fecha del evento *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    className={inputCls}
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Número aprox. de invitados *</label>
                  <input
                    type="number"
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: e.target.value })}
                    className={inputCls}
                    placeholder="..."
                    min="1"
                    required
                  />
                </div>
                <div>
                  <label className={labelCls}>Área del evento *</label>
                  <select
                    value={form.location}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className={inputCls}
                    required
                  >
                    <option value="">Selecciona un área</option>
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelCls}>Detalles adicionales (opcional)</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={4}
                  className={`${inputCls} resize-none`}
                  placeholder="Detalles adicionales (opcional)"
                />
              </div>

              <div className="text-center">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#C9A961] px-8 py-3.5 font-serif text-sm font-medium text-black transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-[#D4AF37]/25 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Enviando...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Enviar Cotización
                    </>
                  )}
                </button>
              </div>

              {message && (
                <div className={`rounded-lg p-4 text-center text-sm ${
                  message.includes('enviada')
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-red-500/20 text-red-400 border border-red-500/30'
                }`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EventQuoteSimple
