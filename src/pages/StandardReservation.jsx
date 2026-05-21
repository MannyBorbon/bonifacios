import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicLanguageBar, { readStoredPublicLang, writeStoredPublicLang } from '../components/PublicLanguageBar'
import { standardReservationPublic } from '../i18n/standardReservationPublic'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const LANGS = ['es', 'en', 'fr', 'zh']

const INITIAL_FORM = {
  customer_name: '',
  phone: '',
  email: '',
  guests: 2,
  reservation_date: '',
  reservation_time: '',
  notes: '',
}

export default function StandardReservation() {
  const [language, setLanguage] = useState(() => readStoredPublicLang())
  const [form, setForm] = useState(INITIAL_FORM)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const t = useMemo(() => {
    const code = LANGS.includes(language) ? language : 'es'
    return standardReservationPublic[code] || standardReservationPublic.es
  }, [language])

  useEffect(() => {
    writeStoredPublicLang(language)
  }, [language])

  const setLang = useCallback((code) => {
    if (LANGS.includes(code)) setLanguage(code)
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const emailTrim = (form.email || '').trim()
    if (!form.customer_name || !form.phone || !form.reservation_date || !form.reservation_time) {
      setMessage(t.errRequired)
      return
    }
    if (emailTrim && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setMessage(t.errEmailFmt)
      return
    }

    setIsSubmitting(true)
    setMessage('')
    try {
      const response = await fetch(`${API_BASE}/reservations/submit.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: emailTrim,
          source: 'website_general',
          occasion: '',
        }),
      })
      let data
      try {
        data = await response.json()
      } catch {
        setMessage(t.errServer(response.status))
        return
      }

      if (data.success) {
        setMessage(t.success)
        setForm(INITIAL_FORM)
      } else {
        setMessage(data.error || t.errGeneric)
      }
    } catch {
      setMessage(t.errNetwork)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] text-[#F4E4C1]">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#D4AF37]/10 blur-[90px]" />
        <div className="absolute right-[-120px] top-[80px] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[110px]" />
        <div className="absolute bottom-[-140px] left-[30%] h-[320px] w-[320px] rounded-full bg-fuchsia-500/10 blur-[120px]" />
      </div>

      <div className="mx-auto max-w-7xl px-3 py-6 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <p className="mb-2 inline-flex rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-[#D4AF37]">
              {t.badge}
            </p>
            <h1 className="font-serif text-2xl sm:text-3xl">{t.title}</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#F4E4C1]/75">{t.subtitle}</p>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center lg:flex-col lg:items-end">
            <PublicLanguageBar value={language} onChange={setLang} className="justify-start sm:justify-end" />
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-2 text-sm text-[#D4AF37] transition-colors hover:border-[#D4AF37]/40 hover:bg-black/60"
            >
              {t.back}
            </Link>
          </div>
        </div>

        <div className="mx-auto max-w-2xl">
          <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 sm:p-10 backdrop-blur-xl">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#D4AF37]/8 blur-3xl" />
            <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#D4AF37]/5 blur-3xl" />
            <div className="relative">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Nombre completo *</label>
                    <input
                      type="text"
                      value={form.customer_name}
                      onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      placeholder="Tu nombre"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Teléfono *</label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      placeholder="622 000 0000"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Correo electrónico (opcional)</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                    placeholder="correo@ejemplo.com"
                    autoComplete="email"
                  />
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Fecha *</label>
                    <input
                      type="date"
                      value={form.reservation_date}
                      onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Hora *</label>
                    <input
                      type="time"
                      value={form.reservation_time}
                      onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                      className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Personas *</label>
                  <input
                    type="number"
                    value={form.guests}
                    onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value, 10) || 1 })}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                    placeholder="Número de personas"
                    min="1"
                    required
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-[#D4AF37]/60">Notas (opcional)</label>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                    placeholder="Preferencia de mesa, festejo, etc."
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-[#D4AF37] px-6 py-3.5 text-sm font-semibold text-black transition-all hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isSubmitting ? t.sending : t.submit}
                </button>

                {message && <p className="text-center text-sm text-amber-200">{message}</p>}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
