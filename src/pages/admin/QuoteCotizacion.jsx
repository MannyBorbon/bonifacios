import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { quotesAPI } from '../../services/api'

const TZ = 'America/Hermosillo'
const fmtDate = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleDateString('es-MX', { timeZone: TZ, day: '2-digit', month: 'long', year: 'numeric' })
}
const fmtDT = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleString('es-MX', { timeZone: TZ, day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
}
const fmt$ = (v) => isNaN(parseFloat(v)) ? '0.00' : parseFloat(v).toFixed(2)

const CURSO_OPTS = ['Aperitivo','Bienvenida','Ensalada','Sopa','Entrada','Plato Fuerte','Postre','Otro']
const BEBIDA_OPTS = ['Vino Tinto','Vino Blanco','Cerveza','Refresco','Agua','Cóctel','Barra Libre','Champagne','Whisky','Otro']

const EMPTY = {
  tel_contacto: '', celebracion: '', area: '', hora_evento: '',
  hora_cena: '', invitados: '', entretenimiento: '', bebidas_items: [], nota_alimentos: '',
  menu_items: [],
  subtotal: '', servicio: '', total_persona: '', total_general: '',
  extras: [], anticipos: [], total_con_extras: '', saldo: '', condiciones: ''
}

const inCls = 'w-full bg-[#0d1829] border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-400/60 focus:outline-none transition-colors'
const taCls = inCls + ' resize-none'

const Lbl = ({ children }) => <label className="block text-xs font-medium text-slate-300 mb-1">{children}</label>
const F = ({ label, children }) => <div><Lbl>{label}</Lbl>{children}</div>

export default function QuoteCotizacion() {
  const { id } = useParams()          // quote request id
  const _navigate = useNavigate()
  const _currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [quote, setQuote] = useState(null)
  const [cotizaciones, setCotizaciones] = useState([])
  const [selected, setSelected] = useState(null)    // selected cotizacion id
  const [form, setForm] = useState(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [emailTo, setEmailTo] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [tab, setTab] = useState('editor')
  const _saveTimer = useRef(null)

  const loadData = useCallback(async () => {
    try {
      const [qRes, cRes] = await Promise.all([
        quotesAPI.getQuote(id),
        quotesAPI.getCotizaciones(id),
      ])
      const q = qRes.data.quote
      setQuote(q)
      const list = cRes.data.cotizaciones || []
      setCotizaciones(list)

      if (list.length > 0) {
        const final = list.find(c => c.is_final) || list[0]
        setSelected(final.id)
        setForm({ ...EMPTY, ...final.data, invitados: final.data.invitados || q.guests || '' })
        setEmailTo(final.sent_to || q.email || '')
      } else {
        // Pre-fill from quote request
        setForm(prev => ({
          ...prev,
          tel_contacto: q.phone || '',
          celebracion: q.event_type || '',
          area: q.location || '',
          invitados: String(q.guests || ''),
        }))
        setEmailTo(q.email || '')
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  const upd = (k) => (e) => {
    const v = e.target.value
    setForm(prev => {
      const next = { ...prev, [k]: v }
      // Auto-calc total_persona, total_general, saldo
      return autoCalc(next)
    })
    setSaved(false)
  }

  const autoCalc = (f) => {
    const sub = parseFloat(f.subtotal) || 0
    const serv = parseFloat(f.servicio) || 0
    const inv = parseFloat(f.invitados) || 0
    const totalPer = sub + serv
    const totalGen = totalPer * inv
    const extrasTotal = (f.extras || []).reduce((acc, e) => acc + (parseFloat(e.monto) || 0), 0)
    const totalConExtras = totalGen + extrasTotal
    const anticiposTotal = (f.anticipos || []).reduce((acc, a) => acc + (parseFloat(a.monto) || 0), 0)
    const saldo = totalConExtras - anticiposTotal
    return {
      ...f,
      total_persona: totalPer ? totalPer.toFixed(2) : f.total_persona,
      total_general: totalGen ? totalGen.toFixed(2) : f.total_general,
      total_con_extras: totalConExtras ? totalConExtras.toFixed(2) : f.total_con_extras,
      saldo: saldo >= 0 ? saldo.toFixed(2) : f.saldo,
    }
  }

  // Extras rows
  const addExtra = () => setForm(prev => ({ ...prev, extras: [...(prev.extras || []), { concepto: '', monto: '' }] }))
  const updExtra = (i, k, v) => setForm(prev => {
    const extras = [...(prev.extras || [])]
    extras[i] = { ...extras[i], [k]: v }
    return autoCalc({ ...prev, extras })
  })
  const delExtra = (i) => setForm(prev => {
    const extras = (prev.extras || []).filter((_, idx) => idx !== i)
    return autoCalc({ ...prev, extras })
  })

  // Menu items rows
  const addMenuItem = () => setForm(prev => ({ ...prev, menu_items: [...(prev.menu_items || []), { tipo: 'Plato Fuerte', descripcion: '', precio: '' }] }))
  const updMenuItem = (i, k, v) => setForm(prev => {
    const menu_items = [...(prev.menu_items || [])]
    menu_items[i] = { ...menu_items[i], [k]: v }
    return { ...prev, menu_items }
  })
  const delMenuItem = (i) => setForm(prev => ({ ...prev, menu_items: (prev.menu_items || []).filter((_, idx) => idx !== i) }))

  // Bebidas rows
  const addBebida = () => setForm(prev => ({ ...prev, bebidas_items: [...(prev.bebidas_items || []), { tipo: 'Otro', descripcion: '', precio: '', precio_tipo: 'fijo' }] }))
  const updBebida = (i, k, v) => setForm(prev => {
    const bebidas_items = [...(prev.bebidas_items || [])]
    bebidas_items[i] = { ...bebidas_items[i], [k]: v }
    return { ...prev, bebidas_items }
  })
  const delBebida = (i) => setForm(prev => ({ ...prev, bebidas_items: (prev.bebidas_items || []).filter((_, idx) => idx !== i) }))

  // Anticipos rows
  const addAnticipo = () => setForm(prev => ({ ...prev, anticipos: [...(prev.anticipos || []), { fecha: '', monto: '' }] }))
  const updAnticipo = (i, k, v) => setForm(prev => {
    const anticipos = [...(prev.anticipos || [])]
    anticipos[i] = { ...anticipos[i], [k]: v }
    return autoCalc({ ...prev, anticipos })
  })
  const delAnticipo = (i) => setForm(prev => {
    const anticipos = (prev.anticipos || []).filter((_, idx) => idx !== i)
    return autoCalc({ ...prev, anticipos })
  })

  const handleSave = async (asNew = false) => {
    setSaving(true)
    try {
      const payload = {
        quote_id: parseInt(id),
        data: form,
        id: (!asNew && selected) ? selected : undefined,
      }
      const res = await quotesAPI.saveCotizacion(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      await loadData()
      if (res.data.id) setSelected(res.data.id)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleMarkFinal = async () => {
    if (!selected) return
    try {
      await quotesAPI.markCotizacionFinal({ id: selected, quote_id: parseInt(id) })
      await loadData()
    } catch { /* silent */ }
  }

  const handleSelectVersion = (cot) => {
    setSelected(cot.id)
    setForm({ ...EMPTY, ...cot.data })
    setSaved(false)
  }

  const handleSendEmail = async () => {
    if (!emailTo || !selected) return
    setSendingEmail(true)
    try {
      await quotesAPI.sendCotizacion({ id: selected, to: emailTo })
      setEmailSent(true)
      setShowEmailModal(false)
      await loadData()
      setTimeout(() => setEmailSent(false), 5000)
    } catch { /* silent */ }
    finally { setSendingEmail(false) }
  }

  const selectedCot = cotizaciones.find(c => c.id === selected)
  const isFinal = selectedCot?.is_final

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to={`/admin/quotes/${id}`} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Expediente
          </Link>
          <span className="text-slate-700">/</span>
          <div>
            <h1 className="text-base font-light text-white">Cotizaciones — {quote?.name}</h1>
            <p className="text-[10px] text-slate-600">{quote?.event_type} · {fmtDate(quote?.event_date)} · {quote?.guests} invitados</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {emailSent && (
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Correo enviado
            </span>
          )}
          {saving && <span className="text-[10px] text-slate-600 animate-pulse">Guardando…</span>}
          {saved && !saving && <span className="text-[10px] text-emerald-400">✓ Guardado</span>}
          {selected && !isFinal && (
            <button onClick={handleMarkFinal} className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:border-emerald-400/50 transition-all">
              Marcar como final
            </button>
          )}
          {isFinal && (
            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-400">
              ✓ Cotización final
            </span>
          )}
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 hover:border-cyan-400/50 disabled:opacity-40 transition-all"
          >
            Guardar cambios
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="rounded-full border border-purple-500/25 bg-purple-500/10 px-3 py-1.5 text-xs text-purple-400 hover:border-purple-400/50 disabled:opacity-40 transition-all"
          >
            + Nueva versión
          </button>
          <button
            onClick={() => setShowEmailModal(true)}
            disabled={!selected}
            className="rounded-full border border-sky-500/25 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-400 hover:border-sky-400/50 disabled:opacity-40 transition-all flex items-center gap-1.5"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Enviar por correo
          </button>
        </div>
      </div>

      {/* ── Version Tabs ── */}
      {cotizaciones.length > 0 && (
        <div className="flex gap-1 flex-wrap border-b border-cyan-500/10 pb-0">
          {cotizaciones.map(c => (
            <button
              key={c.id}
              onClick={() => handleSelectVersion(c)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all rounded-t-lg ${
                selected === c.id
                  ? 'text-cyan-400 border border-b-0 border-cyan-500/20 bg-[#040c1a]/80 -mb-px'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <span>v{c.version_number}</span>
              <span className="text-[9px] text-slate-600">{fmtDT(c.created_at)}</span>
              {c.is_final && <span className="text-[9px] text-emerald-400 font-bold">★ FINAL</span>}
              {c.sent_at && <span className="text-[9px] text-sky-500/60">✉</span>}
            </button>
          ))}
          <button
            onClick={() => { setSelected(null); setForm({ ...EMPTY, tel_contacto: quote?.phone || '', celebracion: quote?.event_type || '', area: quote?.location || '', invitados: String(quote?.guests || '') }) }}
            className="px-3 py-2 text-xs text-emerald-400/60 hover:text-emerald-400 transition-colors"
          >
            + Nueva cotización
          </button>
        </div>
      )}

      {/* ── Tabs: Editor / Preview ── */}
      <div className="flex gap-1 border-b border-cyan-500/8">
        {[{ k: 'editor', l: 'Editor' }, { k: 'preview', l: 'Vista previa' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className={`px-4 py-2 text-xs font-medium transition-all ${tab === t.k ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px' : 'text-slate-500 hover:text-slate-300'}`}
          >{t.l}</button>
        ))}
        {selectedCot?.sent_at && (
          <span className="ml-auto text-[10px] text-slate-700 self-center pr-2">
            Enviado a {selectedCot.sent_to} · {fmtDT(selectedCot.sent_at)}
          </span>
        )}
      </div>

      {/* ── EDITOR ── */}
      {tab === 'editor' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT column */}
          <div className="space-y-4">
            {/* Datos generales */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-3">Datos del evento</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <F label="Tel Contacto"><input value={form.tel_contacto} onChange={upd('tel_contacto')} className={inCls} /></F>
                <F label="Tipo de Celebración"><input value={form.celebracion} onChange={upd('celebracion')} className={inCls} /></F>
                <F label="Área / Espacio"><input value={form.area} onChange={upd('area')} className={inCls} /></F>
                <F label="No. Invitados"><input type="number" min="0" value={form.invitados} onChange={upd('invitados')} className={inCls} /></F>
                <F label="Hora de Inicio"><input value={form.hora_evento} onChange={upd('hora_evento')} className={inCls} /></F>
                <F label="Inicio de Servicio"><input value={form.hora_cena} onChange={upd('hora_cena')} className={inCls} /></F>
                <F label="Entretenimiento"><input value={form.entretenimiento} onChange={upd('entretenimiento')} className={inCls} /></F>
              </div>
            </div>

            {/* Bebidas */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Bebidas</p>
                <button type="button" onClick={addBebida} className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors">+ Agregar bebida</button>
              </div>
              {(form.bebidas_items || []).length === 0 && (
                <p className="text-xs text-slate-400 italic">Sin bebidas — usa "+ Agregar bebida" para añadir</p>
              )}
              <div className="space-y-2">
                {(form.bebidas_items || []).map((b, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <select
                      value={b.tipo}
                      onChange={(e) => updBebida(i, 'tipo', e.target.value)}
                      className="bg-[#0d1829] border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none w-36 flex-shrink-0"
                    >
                      {BEBIDA_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input
                      value={b.descripcion}
                      onChange={(e) => updBebida(i, 'descripcion', e.target.value)}
                      className={inCls + ' flex-1'}
                      placeholder="Descripción"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={b.precio}
                      onChange={(e) => updBebida(i, 'precio', e.target.value)}
                      className="bg-[#0d1829] border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none w-24 flex-shrink-0"
                      placeholder="$ precio"
                    />
                    <button
                      type="button"
                      title="Precio por unidad (c/u)"
                      onClick={() => updBebida(i, 'precio_tipo', b.precio_tipo === 'cu' ? 'fijo' : 'cu')}
                      className={`flex-shrink-0 rounded px-1.5 py-1 text-[10px] font-mono border transition-colors ${b.precio_tipo === 'cu' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-slate-600/40 text-slate-500 hover:text-slate-300'}`}
                    >c/u</button>
                    <button type="button" onClick={() => delBebida(i)} className="text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Alimentos — por tiempo */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Alimentos — Menú</p>
                <button type="button" onClick={addMenuItem} className="text-[11px] text-cyan-400/70 hover:text-cyan-300 transition-colors">+ Agregar tiempo</button>
              </div>
              {(form.menu_items || []).length === 0 && (
                <p className="text-xs text-slate-400 italic mb-2">Sin platillos — usa "+ Agregar tiempo" para añadir</p>
              )}
              <div className="space-y-2">
                {(form.menu_items || []).map((item, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <select
                      value={item.tipo}
                      onChange={(e) => updMenuItem(i, 'tipo', e.target.value)}
                      className="bg-[#0d1829] border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none w-36 flex-shrink-0"
                    >
                      {CURSO_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <input
                      value={item.descripcion}
                      onChange={(e) => updMenuItem(i, 'descripcion', e.target.value)}
                      className={inCls + ' flex-1'}
                      placeholder="Descripción del platillo"
                    />
                    <input
                      type="number"
                      step="0.01"
                      value={item.precio}
                      onChange={(e) => updMenuItem(i, 'precio', e.target.value)}
                      className="bg-[#0d1829] border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none w-24 flex-shrink-0"
                      placeholder="$ precio"
                    />
                    <button type="button" onClick={() => delMenuItem(i)} className="text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0 mt-2">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3">
                <Lbl>Nota especial (alergias / restricciones)</Lbl>
                <input value={form.nota_alimentos} onChange={upd('nota_alimentos')} className={inCls} />
              </div>
            </div>
          </div>

          {/* RIGHT column */}
          <div className="space-y-4">
            {/* Costos por persona */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-3">Costo por persona</p>
              <div className="grid grid-cols-2 gap-3">
                <F label="Subtotal"><input type="number" step="0.01" value={form.subtotal} onChange={upd('subtotal')} className={inCls} placeholder="0.00" /></F>
                <F label="(+) Servicio"><input type="number" step="0.01" value={form.servicio} onChange={upd('servicio')} className={inCls} placeholder="0.00" /></F>
                <F label="Total por persona (auto)"><input readOnly value={form.total_persona} className={inCls + ' opacity-75'} /></F>
                <F label={`× ${form.invitados || 0} invitados (auto)`}><input readOnly value={form.total_general} className={inCls + ' opacity-75'} /></F>
              </div>
            </div>

            {/* Extras */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Extras</p>
                <button type="button" onClick={addExtra} className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">+ Agregar</button>
              </div>
              {(form.extras || []).length === 0 && <p className="text-xs text-slate-400 italic">Sin extras</p>}
              <div className="space-y-2">
                {(form.extras || []).map((e, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={e.concepto} onChange={(ev) => updExtra(i, 'concepto', ev.target.value)} className={inCls + ' flex-1'} placeholder="Descripción del extra / opcional" />
                    <input type="number" step="0.01" value={e.monto} onChange={(ev) => updExtra(i, 'monto', ev.target.value)} className="bg-[#0d1829] border border-slate-600/50 rounded-lg px-2 py-2 text-sm text-white focus:border-cyan-400/60 focus:outline-none w-24 flex-shrink-0" placeholder="$" />
                    <button
                      type="button"
                      title="Cambiar entre precio fijo y precio por unidad (c/u)"
                      onClick={() => updExtra(i, 'precio_tipo', e.precio_tipo === 'cu' ? 'fijo' : 'cu')}
                      className={`flex-shrink-0 rounded px-1.5 py-1 text-[10px] font-mono border transition-colors ${e.precio_tipo === 'cu' ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' : 'border-slate-600/40 text-slate-500 hover:text-slate-300'}`}
                    >c/u</button>
                    <button type="button" onClick={() => delExtra(i)} className="text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <div className="text-xs text-slate-300">Total con extras: <span className="font-medium text-white">${fmt$(form.total_con_extras)}</span></div>
              </div>
            </div>

            {/* Anticipos */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">Anticipos recibidos</p>
                <button type="button" onClick={addAnticipo} className="text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors">+ Agregar</button>
              </div>
              {(form.anticipos || []).length === 0 && <p className="text-xs text-slate-400 italic">Sin anticipos</p>}
              <div className="space-y-2">
                {(form.anticipos || []).map((a, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={a.fecha} onChange={(ev) => updAnticipo(i, 'fecha', ev.target.value)} className={inCls + ' flex-1'} placeholder="Fecha del anticipo" />
                    <input type="number" step="0.01" value={a.monto} onChange={(ev) => updAnticipo(i, 'monto', ev.target.value)} className={inCls + ' w-28'} placeholder="$" />
                    <button type="button" onClick={() => delAnticipo(i)} className="text-red-400/40 hover:text-red-400 transition-colors flex-shrink-0">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ))}
              </div>
              {(form.anticipos || []).length > 0 && (
                <div className="mt-3 flex justify-end gap-6">
                  <div className="text-xs text-slate-400">Total pagado: <span className="text-slate-200">${fmt$((form.anticipos || []).reduce((s, a) => s + (parseFloat(a.monto) || 0), 0))}</span></div>
                  <div className="text-xs text-slate-300">Saldo pendiente: <span className="font-semibold text-red-400">${fmt$(form.saldo)}</span></div>
                </div>
              )}
            </div>

            {/* Condiciones */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300 mb-3">Condiciones / Notas</p>
              <textarea value={form.condiciones} onChange={upd('condiciones')} rows={3} className={taCls} placeholder="Términos, políticas, condiciones especiales…" />
            </div>
          </div>
        </div>
      )}

      {/* ── PREVIEW ── */}
      {tab === 'preview' && (
        <div className="rounded-xl border border-cyan-500/10 bg-white text-black p-8 shadow-xl max-w-2xl mx-auto print:shadow-none print:border-none">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-3xl font-bold tracking-widest underline">B o n i f a c i o ' s</h1>
            <span className="text-sm text-gray-600">{new Date().toLocaleDateString('es-MX', { timeZone: TZ, day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
          <table className="text-sm mb-4">
            <tbody>
              {[
                ['Evento', quote?.name],
                ['Tel Contacto', form.tel_contacto],
                ['Fecha celebración', fmtDate(quote?.event_date)],
                ['Tipo de Evento', form.celebracion],
                ['Lugar', "Bonifacio's Restaurant"],
                ['Área', form.area],
                ['Hora de Inicio', form.hora_evento],
                ['Inicio de Servicio', form.hora_cena],
                ['Invitados', form.invitados],
                ['Entretenimiento', form.entretenimiento],
              ].filter(([, v]) => v).map(([k, v]) => (
                <tr key={k}>
                  <td className="pr-4 text-gray-600 align-top py-0.5">{k}</td>
                  <td className="pr-3 text-gray-400 py-0.5">=</td>
                  <td className="py-0.5">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(form.bebidas_items || []).filter(b => b.descripcion || b.tipo).length > 0 && (
            <div className="mb-3">
              <p className="text-sm font-bold mb-1">Bebidas -</p>
              {(form.bebidas_items || []).map((b, i) => (
                <p key={i} className="text-sm">
                  {b.tipo}{b.descripcion ? ` - ${b.descripcion}` : ''}
                  {b.precio ? <span className="ml-2">${fmt$(b.precio)}{b.precio_tipo === 'cu' ? ' c/u' : ''}</span> : ''}
                </p>
              ))}
            </div>
          )}

          {/* Alimentos block — matches Bonifacio's format */}
          {((form.menu_items || []).length > 0 || form.subtotal) && (
            <div className="mb-1">
              <p className="text-sm font-bold mb-1">Alimentos:</p>
              <table className="w-full text-sm mb-1">
                <tbody>
                  <tr>
                    <td className="align-top">Menú</td>
                    <td className="text-right align-top font-medium">${fmt$(form.subtotal)}</td>
                  </tr>
                  {(form.menu_items || []).filter(m => m.descripcion).map((m, i) => (
                    <tr key={i}>
                      <td className="align-top pb-0.5" colSpan={2}>
                        {m.tipo} - {m.descripcion}
                        {m.precio ? <span className="ml-2 text-gray-600">(${fmt$(m.precio)} c/u)</span> : ''}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {form.nota_alimentos && <p className="text-xs text-gray-600 mt-1">* {form.nota_alimentos}</p>}
            </div>
          )}

          <table className="w-full text-sm mt-3 border-t border-gray-400">
            <tbody>
              <tr>
                <td className="py-2">Costo Alimentos por persona</td>
                <td className="text-right py-2">${fmt$(form.subtotal)}</td>
              </tr>
              {form.servicio && (
                <tr>
                  <td className="py-1">(+) servicio {form.servicio_pct ? `${form.servicio_pct}%` : ''}</td>
                  <td className="text-right py-1">$ {fmt$(form.servicio)}</td>
                </tr>
              )}
              <tr className="border-t border-gray-400 font-bold">
                <td className="py-2">TOTAL</td>
                <td className="text-right py-2">${fmt$(form.total_persona)} por persona</td>
              </tr>
              <tr>
                <td className="pb-2">(X) cantidad de invitados {form.invitados}</td>
                <td className="text-right pb-2">${fmt$(form.total_general)}</td>
              </tr>
              {(form.extras || []).length > 0 && <>
                <tr className="border-t border-gray-400">
                  <td colSpan={2} className="pt-3 pb-1 font-bold">Opcionales</td>
                </tr>
                {form.extras.map((e, i) => (
                  <tr key={i}>
                    <td className="py-0.5">(+) {e.concepto}{e.precio_tipo === 'cu' ? '' : '.'}</td>
                    <td className="text-right py-0.5">${fmt$(e.monto)}{e.precio_tipo === 'cu' ? ' c/u' : ''}</td>
                  </tr>
                ))}
              </>}
              {(form.anticipos || []).length > 0 && <>
                <tr className="border-t border-gray-400">
                  <td colSpan={2} className="pt-2 pb-1">(-) Anticipos recibidos</td>
                </tr>
                {form.anticipos.map((a, i) => (
                  <tr key={i}><td className="pl-4 py-0.5">{a.fecha}</td><td className="text-right">${fmt$(a.monto)}</td></tr>
                ))}
              </>}
              <tr className="border-t border-gray-400 font-bold">
                <td className="py-2">Saldo Pendiente</td>
                <td className="text-right py-2">${fmt$(form.saldo)}</td>
              </tr>
            </tbody>
          </table>
          {form.condiciones && <p className="text-xs text-gray-600 mt-4 border-t border-gray-200 pt-2">{form.condiciones}</p>}
          <p className="text-[10px] text-gray-400 mt-4">v{selectedCot?.version_number || '—'} · Bonifacio's Restaurant, San Carlos, Sonora</p>
        </div>
      )}

      {/* ── Email Modal ── */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6">
            <h3 className="text-base font-light text-white mb-4">Enviar cotización por correo</h3>
            <p className="text-xs text-slate-500 mb-4">
              Se enviará la cotización <span className="text-cyan-400">v{selectedCot?.version_number}</span> en formato Bonifacio's al correo indicado.
            </p>
            <div className="mb-4">
              <Lbl>Correo destinatario</Lbl>
              <input
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                type="email"
                className={inCls}
                placeholder="cliente@email.com"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowEmailModal(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSendEmail}
                disabled={!emailTo || sendingEmail}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-500/30 bg-sky-500/10 px-5 py-2 text-xs font-medium text-sky-400 hover:border-sky-400/60 hover:bg-sky-500/20 disabled:opacity-40 transition-all"
              >
                {sendingEmail ? 'Enviando…' : 'Enviar correo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

