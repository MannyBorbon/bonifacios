import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronLeft, Check, Clock, ArrowRight } from 'lucide-react';
import PublicLanguageBar, { readStoredPublicLang, writeStoredPublicLang } from '../components/PublicLanguageBar';
import { lookupTranslations } from '../i18n/reservationLookup';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const LANGS = ['es', 'en', 'fr', 'zh'];


function formatLocation(tableCode, t) {
  if (!tableCode) return '';
  const raw = String(tableCode);
  const u = raw.toUpperCase();
  if (u.startsWith('WEB-')) return t.tableWebPending;
  let zona = null;
  let num = '';

  // Códigos canónicos SR
  let m = u.match(/^M([1-9]|1[0-1])$/);
  if (m) {
    zona = t.zoneInterior;
    num = m[1];
  }
  if (!zona) {
    m = u.match(/^T(1[6-9]|2[0-2])$/);
    if (m) {
      zona = t.zoneHigh;
      num = m[1];
    }
  }
  if (!zona) {
    m = u.match(/^TB([1-8])$/);
    if (m) {
      zona = t.zoneLow;
      num = m[1];
    }
  }

  // Códigos legado
  if (!zona) {
    if (u.includes('TA-')) zona = t.zoneHigh;
    else if (u.includes('TB-')) zona = t.zoneLow;
    else if (u.includes('CD-') || u.includes('MD-') || u.includes('RM-')) zona = t.zoneInterior;
    if (zona) {
      if (raw.length > 8) return `${zona} · ${t.tableAssignOnArrival}`;
      num = raw.replace(/[^0-9]/g, '');
    }
  }

  if (zona && num) return t.tableWithNum(zona, num);
  if (zona) return `${t.zoneOnly(zona)} · ${u}`;

  // Fallback: al menos mostrar el código asignado en vez de ocultar la sección.
  return u;
}

function ReservationClientDetail() {
  const [language, setLanguage] = useState(() => readStoredPublicLang());
  const [phone, setPhone] = useState('');
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);

  const t = useMemo(() => {
    const code = LANGS.includes(language) ? language : 'es';
    return lookupTranslations[code] || lookupTranslations.es;
  }, [language]);

  useEffect(() => {
    writeStoredPublicLang(language);
  }, [language]);

  const selected = reservations.find((r) => r.id === selectedId) || null;

  const setLang = useCallback((code) => {
    if (LANGS.includes(code)) setLanguage(code);
  }, []);

  const searchReservations = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const resReservations = await fetch(`${API_BASE}/reservations/client-lookup.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const dataReservations = await resReservations.json();

      if (dataReservations.success) {
        const list = Array.isArray(dataReservations.reservations) ? dataReservations.reservations : [];
        setReservations(list);
        setSelectedId(list[0]?.id || null);
        if (!list.length) setMessage(t.msgNoResults);
      } else {
        setMessage(dataReservations.error || t.msgQueryError);
      }
    } catch {
      setMessage(t.msgConnError);
    } finally {
      setLoading(false);
    }
  };

  const onFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('reservation_id', selected.id);
      formData.append('screenshot', file);
      formData.append('phone', phone);
      const response = await fetch(`${API_BASE}/reservations/client-upload-deposit.php`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();
      if (data.success) {
        setMessage(t.msgUploadOk);
        setReservations((prev) =>
          prev.map((r) =>
            r.id === selected.id
              ? { ...r, deposit_status: 'uploaded', deposit_screenshot: data.deposit_screenshot || r.deposit_screenshot }
              : r,
          ),
        );
      } else {
        setMessage(data.error || t.msgUploadFail);
      }
    } catch {
      setMessage(t.msgSendFail);
    } finally {
      setLoading(false);
    }
  };

  const loc = selected ? formatLocation(selected.table_code, t) : '';
  const showDeposit =
    selected && 
    selected.status !== 'confirmed' && 
    !['uploaded', 'confirmed'].includes(String(selected.deposit_status || '')) &&
    String(selected.status || '') !== 'uploaded';

  const depositUp = selected && ['uploaded', 'confirmed'].includes(String(selected.deposit_status || ''));
  const legacyUploadedStatus = selected && String(selected.status || '') === 'uploaded';

  const statusLabel = () => {
    if (!selected) return '';
    if (selected.status === 'confirmed') return t.statusConfirmed;
    if (depositUp || legacyUploadedStatus) return t.statusUploaded;
    if (showDeposit) {
      return t.statusPendingDeposit;
    }
    if (selected.status === 'pending') return t.statusPending;
    return t.statusConfirmed;
  };

  const resetLookup = () => {
    setReservations([]);
    setSelectedId(null);
    setMessage('');
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f] text-[#F4E4C1]">
      <div className="pointer-events-none fixed inset-0 -z-0">
        <div className="absolute left-[-120px] top-[-120px] h-[360px] w-[360px] rounded-full bg-[#D4AF37]/10 blur-[90px]" />
        <div className="absolute right-[-120px] top-[80px] h-[360px] w-[360px] rounded-full bg-cyan-500/10 blur-[110px]" />
      </div>

      <nav className="relative z-10 border-b border-[#D4AF37]/15 bg-black/35 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-[#D4AF37]/80 transition-colors hover:text-[#D4AF37]"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
            {t.navHome}
          </Link>
          <div className="font-serif text-lg tracking-[0.25em] text-[#D4AF37] sm:text-xl">{"BONIFACIO'S"}</div>
          <PublicLanguageBar value={language} onChange={setLang} />
        </div>
      </nav>

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        {!selected && (
          <div className="mx-auto max-w-md text-center">
            <h1 className="font-serif text-3xl text-[#F4E4C1] sm:text-4xl">{t.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-[#F4E4C1]/80">{t.subtitle}</p>

            <div className="mt-10 rounded-2xl border border-[#D4AF37]/25 bg-black/45 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.65)] backdrop-blur-md sm:p-8">
              <label className="sr-only" htmlFor="lookup-phone">
                {t.subtitle}
              </label>
              <input
                id="lookup-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t.phonePh}
                className="w-full rounded-xl border border-[#D4AF37]/30 bg-black/50 px-4 py-4 text-center font-serif text-2xl tracking-wide text-[#F4E4C1] placeholder:text-[#F4E4C1]/45 outline-none ring-0 transition-colors focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30 sm:text-3xl"
              />
              <button
                type="button"
                onClick={searchReservations}
                disabled={loading || !phone.trim()}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-4 text-xs font-semibold uppercase tracking-[0.2em] text-black transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? t.btnSearching : t.btnSearch}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>

            {message && (
              <p className="mt-8 text-center text-sm font-medium text-amber-200/95" role="status">
                {message}
              </p>
            )}
          </div>
        )}

        {selected && (
          <div className="animate-in fade-in duration-500">
            {reservations.length > 1 && (
              <div className="mb-8 flex flex-wrap justify-center gap-2 border-b border-[#D4AF37]/15 pb-4 sm:gap-4">
                {reservations.map((r, index) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`rounded-lg px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] transition-colors ${
                      selected.id === r.id
                        ? 'bg-[#D4AF37]/20 text-[#D4AF37] ring-1 ring-[#D4AF37]/40'
                        : 'text-[#F4E4C1]/55 hover:bg-white/5 hover:text-[#F4E4C1]'
                    }`}
                  >
                    {t.resTab(index + 1)}
                  </button>
                ))}
              </div>
            )}

            <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/25 bg-black/50 shadow-[0_28px_90px_-28px_rgba(0,0,0,0.75)] backdrop-blur-md">
              <div className="h-1 w-full bg-gradient-to-r from-[#D4AF37]/60 via-[#D4AF37] to-[#D4AF37]/60" />
              <div className="p-6 sm:p-10 md:p-12">
                <div className="text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#D4AF37]/70">{t.forName}</p>
                  <h2 className="mt-3 font-serif text-3xl text-[#F4E4C1] sm:text-4xl md:text-5xl">{selected.customer_name}</h2>

                  <div className="mt-10 flex flex-col items-center justify-center gap-8 text-[#F4E4C1] sm:flex-row sm:gap-14">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F4E4C1]/55">{t.date}</p>
                      <p className="mt-2 font-serif text-2xl">{selected.reservation_date}</p>
                    </div>
                    <div className="hidden h-10 w-px bg-[#D4AF37]/25 sm:block" />
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F4E4C1]/55">{t.time}</p>
                      <p className="mt-2 font-serif text-2xl">{String(selected.reservation_time).slice(0, 5)}</p>
                    </div>
                  </div>
                </div>

                <hr className="my-10 border-[#D4AF37]/15" />

                <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F4E4C1]/55">{t.guests}</p>
                    <p className="mt-2 text-lg text-[#F4E4C1]">{t.guestsCount(Number(selected.guests) || 0)}</p>
                  </div>
                  {loc ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F4E4C1]/55">{t.location}</p>
                      <p className="mt-2 text-lg text-[#F4E4C1]">{loc}</p>
                    </div>
                  ) : null}
                  <div className={loc ? 'sm:col-span-2' : ''}>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#F4E4C1]/55">{t.resStatus}</p>
                    <p
                      className={`mt-2 flex items-center gap-2 text-lg ${
                        selected.status === 'confirmed'
                          ? 'text-emerald-300'
                          : depositUp || legacyUploadedStatus
                            ? 'text-sky-300'
                            : 'text-amber-200'
                      }`}
                    >
                      {statusLabel()}
                    </p>
                  </div>
                </div>

                {showDeposit && (
                  <div className="mt-10 rounded-xl border border-[#D4AF37]/20 bg-[#D4AF37]/5 p-6 sm:p-8">
                    {depositUp || legacyUploadedStatus ? (
                      <div className="py-4 text-center">
                        <Clock className="mx-auto mb-4 text-sky-300" strokeWidth={1.5} size={36} />
                        <h3 className="font-serif text-2xl text-[#F4E4C1]">{t.depositReceivedTitle}</h3>
                        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-[#F4E4C1]/75">{t.depositReceivedDesc}</p>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={loading}
                          className="flex w-full items-center justify-center gap-2 border border-[#D4AF37] py-4 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37] transition-colors hover:bg-[#D4AF37] hover:text-black disabled:opacity-40"
                        >
                          {loading ? t.attachProcessing : t.attachBtn}
                        </button>
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
                      </>
                    )}
                  </div>
                )}

                {selected.status === 'confirmed' && (
                  <div className="mt-10 border-t border-[#D4AF37]/15 pt-10 text-center">
                    <Check className="mx-auto mb-4 text-emerald-400" strokeWidth={1.5} size={36} />
                    <p className="font-serif text-2xl text-emerald-300">{t.confirmedTitle}</p>
                    <p className="mx-auto mt-3 max-w-md text-sm text-[#F4E4C1]/70">{t.confirmedSub}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={resetLookup}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#D4AF37] underline-offset-4 hover:underline"
              >
                <Search size={16} />
                {t.searchAnother}
              </button>
              {message && (
                <p className="text-center text-sm text-amber-200/95" role="status">
                  {message}
                </p>
              )}
            </div>
          </div>
        )}
      </main>

      <footer className="relative z-10 pb-10 text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-[#F4E4C1]/35">{t.footer}</p>
      </footer>
    </div>
  );
}

export default ReservationClientDetail;
