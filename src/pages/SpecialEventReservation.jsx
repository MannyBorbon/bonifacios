import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PublicLanguageBar, { readStoredPublicLang, writeStoredPublicLang } from '../components/PublicLanguageBar';
import { specialEventReservationPublic } from '../i18n/mothersAndSpecialPublic';
import MothersDayReservation from './MothersDayReservation';

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const LANGS = ['es', 'en', 'fr', 'zh'];

const DEFAULT_DIA_MADRES_YMD = '2026-05-10';

/** YYYY-MM-DD del evento: catálogo o, para día de las madres sin fecha, 10 de mayo fijo. */
function resolvedEventDateYmd(event) {
  if (!event) return '';
  const raw = event.event_date && String(event.event_date).slice(0, 10);
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const s = String(event.slug || '').toLowerCase();
  if (s === 'dia-madres') return DEFAULT_DIA_MADRES_YMD;
  return '';
}

const DATE_LOCALE = { es: 'es-MX', en: 'en-US', fr: 'fr-FR', zh: 'zh-CN' };

function formatEventDateLong(ymd, lang) {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-').map((n) => parseInt(n, 10));
  if (!y || !m || !d) return ymd;
  const dt = new Date(y, m - 1, d);
  const loc = DATE_LOCALE[lang] || 'es-MX';
  return dt.toLocaleDateString(loc, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export default function SpecialEventReservation() {
  const { slug } = useParams();
  
  // Redirigir dia-madres al componente dedicado
  if (slug === 'dia-madres') {
    return <MothersDayReservation />;
  }
  
  const [language, setLanguage] = useState(() => readStoredPublicLang());
  const [eventConfig, setEventConfig] = useState(null);
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    guests: 2,
    reservation_date: '',
    reservation_time: '',
    notes: '',
    event_type_id: '',
  });
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const t = useMemo(() => {
    const code = LANGS.includes(language) ? language : 'es';
    return specialEventReservationPublic[code] || specialEventReservationPublic.es;
  }, [language]);

  useEffect(() => {
    writeStoredPublicLang(language);
  }, [language]);

  useEffect(() => {
    setMessage('');
  }, [language]);

  const setLang = useCallback((code) => {
    if (LANGS.includes(code)) setLanguage(code);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE}/reservations/event-types.php?public=1`);
        const data = await res.json();
        if (!data.success) return;
        const found = (data.events || []).find(
          (e) => String(e.slug || '').toLowerCase() === String(slug || '').toLowerCase(),
        );
        if (!found) return;
        setEventConfig(found);
        const fixedYmd = resolvedEventDateYmd(found);
        setForm((prev) => ({
          ...prev,
          reservation_date: fixedYmd,
          event_type_id: String(found.id),
        }));
      } catch {
        // silent
      }
    };
    load();
  }, [slug]);

  const lockedDateYmd = eventConfig ? resolvedEventDateYmd(eventConfig) : '';
  const isDateLocked = Boolean(lockedDateYmd);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const reservationDate = isDateLocked ? lockedDateYmd : form.reservation_date;
    if (!form.customer_name || !form.phone || !reservationDate || !form.reservation_time || !form.event_type_id) {
      setMessage(t.errRequired);
      return;
    }
    setIsSubmitting(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE}/reservations/special-event.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, reservation_date: reservationDate }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage(t.success);
        setForm((prev) => ({
          ...prev,
          customer_name: '',
          phone: '',
          email: '',
          guests: 2,
          reservation_time: '',
          notes: '',
          reservation_date: lockedDateYmd || prev.reservation_date,
        }));
      } else {
        setMessage(data.error || t.errGeneric);
      }
    } catch {
      setMessage(t.errNetwork);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] p-4 text-[#F4E4C1]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-serif">
            {t.titlePrefix} {eventConfig?.name || ''}
          </h1>
          <div className="flex flex-wrap items-center gap-3 sm:justify-end">
            <PublicLanguageBar value={language} onChange={setLang} />
            <Link to="/" className="text-sm font-medium text-[#D4AF37] hover:underline">
              {t.back}
            </Link>
          </div>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-black/40 p-6">
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1] placeholder:text-[#F4E4C1]/50"
              placeholder={t.phName}
              aria-label={t.phName}
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1] placeholder:text-[#F4E4C1]/50"
              placeholder={t.phPhone}
              aria-label={t.phPhone}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <input
              className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1] placeholder:text-[#F4E4C1]/50"
              placeholder={t.phEmail}
              aria-label={t.phEmail}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {isDateLocked ? (
              <div className="space-y-2">
                <p className="rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-3 py-2 text-sm text-[#F4E4C1]/90">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37]/80">{t.labelEventDate}</span>
                  <br />
                  <span className="font-medium text-[#D4AF37]">{formatEventDateLong(lockedDateYmd, language)}</span>
                </p>
                <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/70">{t.labelTime}</label>
                <input
                  type="time"
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1]"
                  aria-label={t.labelTime}
                  value={form.reservation_time}
                  onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-widest text-[#D4AF37]/70">{t.labelDate}</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1]"
                    aria-label={t.labelDate}
                    value={form.reservation_date}
                    onChange={(e) => setForm({ ...form, reservation_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] uppercase tracking-widest text-[#D4AF37]/70">{t.labelTime}</label>
                  <input
                    type="time"
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1]"
                    aria-label={t.labelTime}
                    value={form.reservation_time}
                    onChange={(e) => setForm({ ...form, reservation_time: e.target.value })}
                  />
                </div>
              </div>
            )}
            <div>
              <label className="mb-1 block text-[10px] uppercase tracking-widest text-[#D4AF37]/70">{t.labelGuests}</label>
              <input
                type="number"
                min={1}
                max={20}
                className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1]"
                aria-label={t.labelGuests}
                value={form.guests}
                onChange={(e) => setForm({ ...form, guests: parseInt(e.target.value, 10) || 1 })}
              />
            </div>
            <textarea
              className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-[#F4E4C1] placeholder:text-[#F4E4C1]/50"
              rows={3}
              placeholder={t.phNotes}
              aria-label={t.phNotes}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
            <button
              disabled={isSubmitting}
              type="submit"
              className="w-full rounded-lg bg-[#D4AF37] px-4 py-2 font-semibold text-black disabled:opacity-60"
            >
              {isSubmitting ? t.submitting : t.submit}
            </button>
            {message && <p className="text-xs text-amber-300">{message}</p>}
          </form>
        </div>
      </div>
    </div>
  );
}
