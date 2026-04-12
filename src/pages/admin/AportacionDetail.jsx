import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'

const API = import.meta.env.VITE_API_URL
const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX')
const fmtDate = (d) => {
  if (!d) return '—'
  const s = String(d)
  const dt = new Date(s.length === 10 ? s + 'T12:00:00' : s.replace(' ', 'T'))
  return dt.toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: 'numeric', month: 'short', year: 'numeric' })
}
const fmtDT = (d) => {
  if (!d) return '—'
  return new Date(String(d).replace(' ', 'T')).toLocaleString('es-MX', { timeZone: 'America/Hermosillo', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
const isImage = (mime) => mime && mime.startsWith('image/')
const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Hermosillo' })

const METODOS = ['Transferencia', 'Depósito', 'Cheque', 'Efectivo', 'Otro']

export default function AportacionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [apor, setApor] = useState(null)
  const [pagos, setPagos] = useState([])
  const [archivos, setArchivos] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)

  // Edit aportacion
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [saving, setSaving] = useState(false)

  // New pago
  const [pagoForm, setPagoForm] = useState({ monto: '', fecha_pago: today(), metodo_pago: '', referencia: '', banco_origen: '', notas: '' })
  const [pagoSaving, setPagoSaving] = useState(false)
  const [showPagoForm, setShowPagoForm] = useState(false)

  // Delete pago confirm
  const [delPagoId, setDelPagoId] = useState(null)

  // Upload
  const [uploadForm, setUploadForm] = useState({ tipo: 'comprobante_aportacion', pago_id: '', notas: '' })
  const [uploadFile, setUploadFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null)

  const user = (() => { try { return JSON.parse(localStorage.getItem('user') || '{}') } catch { return {} } })()

  const loadAll = async () => {
    setLoading(true); setErr(null)
    try {
      const [rA, rP, rAr] = await Promise.all([
        fetch(`${API}/finances/aportaciones.php?id=${id}`, { credentials: 'include' }),
        fetch(`${API}/finances/pagos.php?aportacion_id=${id}`, { credentials: 'include' }),
        fetch(`${API}/finances/archivos.php?aportacion_id=${id}`, { credentials: 'include' }),
      ])
      const [dA, dP, dAr] = await Promise.all([rA.json(), rP.json(), rAr.json()])
      if (!dA.success) { setErr('Aportación no encontrada'); setLoading(false); return }
      setApor(dA.aportacion)
      setEditForm({ ...dA.aportacion })
      setPagos(dP.pagos || [])
      setArchivos(dAr.archivos || [])
    } catch { setErr('Error de conexión') }
    setLoading(false)
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAll() }, [id])

  const saveEdit = async () => {
    setSaving(true)
    try {
      await fetch(`${API}/finances/aportaciones.php?id=${id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      setApor({ ...apor, ...editForm })
      setEditMode(false)
    } catch (err) { console.error(err) }
    setSaving(false)
  }

  const savePago = async () => {
    if (!pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return
    setPagoSaving(true)
    try {
      const r = await fetch(`${API}/finances/pagos.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pagoForm, aportacion_id: parseInt(id), monto: parseFloat(pagoForm.monto), created_by: user?.username || '' }),
      })
      const d = await r.json()
      if (d.success) {
        setPagoForm({ monto: '', fecha_pago: today(), metodo_pago: '', referencia: '', banco_origen: '', notas: '' })
        setShowPagoForm(false)
        await loadAll()
      }
    } catch (err) { console.error(err) }
    setPagoSaving(false)
  }

  const deletePago = async (pid) => {
    try {
      await fetch(`${API}/finances/pagos.php?id=${pid}`, { method: 'DELETE', credentials: 'include' })
      setDelPagoId(null)
      await loadAll()
    } catch (err) { console.error(err) }
  }

  const uploadArchivo = async () => {
    if (!uploadFile) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('aportacion_id', id)
      fd.append('archivo', uploadFile)
      fd.append('tipo', uploadForm.tipo)
      if (uploadForm.pago_id) fd.append('pago_id', uploadForm.pago_id)
      if (uploadForm.notas) fd.append('notas', uploadForm.notas)
      fd.append('subido_por', user?.username || '')
      const r = await fetch(`${API}/finances/archivos.php`, { method: 'POST', credentials: 'include', body: fd })
      const d = await r.json()
      if (d.success) {
        setUploadFile(null)
        setUploadForm({ tipo: 'comprobante_aportacion', pago_id: '', notas: '' })
        if (fileInputRef.current) fileInputRef.current.value = ''
        await loadAll()
      }
    } catch (err) { console.error(err) }
    setUploading(false)
  }

  const deleteArchivo = async (aid) => {
    try {
      await fetch(`${API}/finances/archivos.php?id=${aid}`, { method: 'DELETE', credentials: 'include' })
      setArchivos(a => a.filter(x => x.id !== aid))
    } catch (err) { console.error(err) }
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const totalPagado = apor ? (apor.total_pagado || 0) : 0
  const monto = apor ? apor.monto : 0
  const pct = monto > 0 ? Math.min(100, (totalPagado / monto) * 100) : 0
  const saldado = pct >= 100

  if (loading) return (
    <div className="min-h-screen bg-[#030a15] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
        <p className="text-[11px] text-slate-600 uppercase tracking-widest">Cargando...</p>
      </div>
    </div>
  )

  if (err) return (
    <div className="min-h-screen bg-[#030a15] flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{err}</p>
        <button onClick={() => navigate(-1)} className="text-xs text-cyan-400 hover:underline">← Regresar</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#030a15] text-white">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-[11px] text-slate-600">
          <button onClick={() => navigate(-1)} className="hover:text-cyan-400 transition-colors flex items-center gap-1">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Aportaciones
          </button>
          <span>/</span>
          <span className="text-slate-400">{apor?.nombre}</span>
        </div>

        {/* ── Hero card ── */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-6">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className={`h-14 w-14 rounded-2xl flex items-center justify-center border text-2xl font-light ${saldado ? 'bg-green-500/20 border-green-500/30 text-green-400' : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/20 text-cyan-400'}`}>
                {apor?.nombre?.charAt(0)}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Aportación</p>
                <h1 className="text-2xl font-light text-white">{apor?.nombre}</h1>
                {apor?.fecha_aportacion && <p className="text-[11px] text-slate-500 mt-0.5">{fmtDate(apor.fecha_aportacion)}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {saldado && <span className="text-[10px] text-green-400 border border-green-500/30 bg-green-500/10 rounded-lg px-3 py-1.5">✓ Saldado</span>}
              {!editMode
                ? <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-2 text-xs text-blue-400 hover:bg-blue-500/20 transition-all">
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Editar
                  </button>
                : <div className="flex gap-2">
                    <button onClick={() => { setEditMode(false); setEditForm({ ...apor }) }} className="rounded-xl border border-slate-700/50 bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
                    <button onClick={saveEdit} disabled={saving} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40">{saving ? 'Guardando…' : 'Guardar'}</button>
                  </div>
              }
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            {[
              { l: 'Monto Comprometido', v: fmt(monto), c: 'text-slate-300' },
              { l: 'Total Pagado', v: fmt(totalPagado), c: 'text-green-400' },
              { l: 'Pendiente', v: fmt(Math.max(0, monto - totalPagado)), c: saldado ? 'text-green-400' : 'text-orange-400' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <p className="text-[9px] uppercase tracking-widest text-slate-600 mb-1">{s.l}</p>
                <p className={`text-lg font-light tabular-nums ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div className="mt-4">
            <div className="flex justify-between mb-1"><span className="text-[10px] text-slate-600">Progreso de pago</span><span className={`text-[11px] tabular-nums ${saldado ? 'text-green-400' : 'text-cyan-400'}`}>{pct.toFixed(1)}%</span></div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-700 ${saldado ? 'bg-green-400' : 'bg-gradient-to-r from-cyan-500 to-blue-500'}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>

        {/* ── Details grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Datos de la aportación */}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5 space-y-4">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500">Datos de la Aportación</h2>
            {editMode
              ? <>
                  <EditField label="Nombre" value={editForm.nombre || ''} onChange={v => setEditForm(f => ({ ...f, nombre: v }))} />
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Fecha de Aportación</label>
                    <input type="date" value={editForm.fecha_aportacion || ''} onChange={e => setEditForm(f => ({ ...f, fecha_aportacion: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all" />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Monto ($)</label>
                    <input type="number" min="0" value={editForm.monto || ''} onChange={e => setEditForm(f => ({ ...f, monto: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all" />
                  </div>
                  <EditField label="Método / Forma de Aportación" value={editForm.metodo_aportacion || ''} onChange={v => setEditForm(f => ({ ...f, metodo_aportacion: v }))} placeholder="Ej. Transferencia, Cheque, Efectivo…" />
                  <EditField label="Referencia / Número de operación" value={editForm.referencia || ''} onChange={v => setEditForm(f => ({ ...f, referencia: v }))} placeholder="Ej. REF-00123" />
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas</label>
                    <textarea rows={3} value={editForm.notas || ''} onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all resize-none" />
                  </div>
                </>
              : <>
                  <Row label="Método de aportación" v={apor?.metodo_aportacion} />
                  <Row label="Referencia" v={apor?.referencia} />
                  <Row label="Notas" v={apor?.notas} multiline />
                  <Row label="Registrado" v={fmtDT(apor?.created_at)} />
                  <Row label="Última actualización" v={fmtDT(apor?.updated_at)} />
                </>
            }
          </div>

          {/* Datos bancarios */}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5 space-y-4">
            <h2 className="text-[10px] uppercase tracking-widest text-slate-500">Cuenta Bancaria de Destino</h2>
            {editMode
              ? <>
                  <EditField label="Banco" value={editForm.banco || ''} onChange={v => setEditForm(f => ({ ...f, banco: v }))} placeholder="Ej. BBVA, Banorte, HSBC…" />
                  <EditField label="CLABE (18 dígitos)" value={editForm.clabe || ''} onChange={v => setEditForm(f => ({ ...f, clabe: v }))} placeholder="000000000000000000" />
                  <EditField label="Número de Cuenta" value={editForm.cuenta || ''} onChange={v => setEditForm(f => ({ ...f, cuenta: v }))} placeholder="Ej. 1234567890" />
                  <EditField label="Titular de la Cuenta" value={editForm.titular || ''} onChange={v => setEditForm(f => ({ ...f, titular: v }))} placeholder="Nombre completo" />
                </>
              : <>
                  <Row label="Banco" v={apor?.banco} />
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">CLABE</p>
                    {apor?.clabe
                      ? <p className="text-sm text-slate-300 font-mono tracking-widest">{apor.clabe}</p>
                      : <p className="text-xs text-slate-700 italic">Sin datos</p>
                    }
                  </div>
                  <Row label="Número de Cuenta" v={apor?.cuenta} />
                  <Row label="Titular" v={apor?.titular} />
                </>
            }
          </div>
        </div>

        {/* ── Pagos ── */}
        <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">Historial de Pagos</h2>
              <p className="text-sm font-light text-white">{pagos.length} pago{pagos.length !== 1 ? 's' : ''} registrado{pagos.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => setShowPagoForm(v => !v)} className="flex items-center gap-1.5 rounded-xl border border-green-500/30 bg-green-500/10 px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Registrar Pago
            </button>
          </div>

          {/* New pago form */}
          {showPagoForm && (
            <div className="mb-5 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
              <p className="text-[10px] uppercase tracking-widest text-green-500/60 mb-3">Nuevo Pago</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Monto ($) *</label>
                  <input type="number" min="0" value={pagoForm.monto} onChange={e => setPagoForm(f => ({ ...f, monto: e.target.value }))} placeholder="0.00" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" />
                  {pagoForm.monto && !isNaN(parseFloat(pagoForm.monto)) && <p className="text-[10px] text-green-500/50 mt-0.5">{fmt(parseFloat(pagoForm.monto))}</p>}
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Fecha de Pago *</label>
                  <input type="date" value={pagoForm.fecha_pago} onChange={e => setPagoForm(f => ({ ...f, fecha_pago: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2 text-sm text-white focus:border-green-500/40 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Método de Pago</label>
                  <select value={pagoForm.metodo_pago} onChange={e => setPagoForm(f => ({ ...f, metodo_pago: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2 text-sm text-white focus:border-green-500/40 focus:outline-none transition-all">
                    <option value="">— Seleccionar —</option>
                    {METODOS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Banco Origen</label>
                  <input type="text" value={pagoForm.banco_origen} onChange={e => setPagoForm(f => ({ ...f, banco_origen: e.target.value }))} placeholder="Ej. BBVA, Banorte…" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Referencia / Folio</label>
                  <input type="text" value={pagoForm.referencia} onChange={e => setPagoForm(f => ({ ...f, referencia: e.target.value }))} placeholder="Ej. TRF-00456" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas</label>
                  <input type="text" value={pagoForm.notas} onChange={e => setPagoForm(f => ({ ...f, notas: e.target.value }))} placeholder="Observaciones…" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowPagoForm(false)} className="rounded-xl border border-slate-700/50 bg-white/[0.02] px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
                <button onClick={savePago} disabled={pagoSaving || !pagoForm.monto || parseFloat(pagoForm.monto) <= 0} className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-40">{pagoSaving ? 'Guardando…' : 'Registrar Pago'}</button>
              </div>
            </div>
          )}

          {/* Pagos list */}
          {pagos.length === 0
            ? <p className="text-center text-[11px] text-slate-700 py-8">Sin pagos registrados</p>
            : <div className="space-y-3">
                {pagos.map(p => {
                  const pArc = archivos.filter(a => a.pago_id && String(a.pago_id) === String(p.id))
                  return (
                    <div key={p.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4 group">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="h-8 w-8 rounded-xl bg-green-500/20 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          </div>
                          <div>
                            <p className="text-base font-light text-green-400 tabular-nums">{fmt(p.monto)}</p>
                            <p className="text-[11px] text-slate-500">{fmtDate(p.fecha_pago)}</p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {p.metodo_pago && <Chip>{p.metodo_pago}</Chip>}
                            {p.banco_origen && <Chip icon="🏦">{p.banco_origen}</Chip>}
                            {p.referencia && <Chip icon="🔖">{p.referencia}</Chip>}
                          </div>
                        </div>
                        <button onClick={() => setDelPagoId(p.id)} className="opacity-0 group-hover:opacity-100 transition-opacity rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 flex-shrink-0">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                      {p.notas && <p className="text-[11px] text-slate-600 mt-2 pl-11">{p.notas}</p>}
                      {p.created_by && <p className="text-[10px] text-slate-700 mt-1 pl-11">Registrado por {p.created_by} · {fmtDT(p.created_at)}</p>}
                      {pArc.length > 0 && (
                        <div className="mt-3 pl-11 flex flex-wrap gap-2">
                          {pArc.map(a => <ArchivoThumb key={a.id} a={a} onDelete={deleteArchivo} onPreview={setLightbox} />)}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
          }
        </div>

        {/* ── Archivos generales ── */}
        <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <h2 className="text-[10px] uppercase tracking-widest text-slate-500 mb-4">Comprobantes y Archivos</h2>

          {/* Upload form */}
          <div className="rounded-xl border border-slate-700/30 bg-white/[0.02] p-4 mb-4">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Subir Archivo</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Tipo</label>
                <select value={uploadForm.tipo} onChange={e => setUploadForm(f => ({ ...f, tipo: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all">
                  <option value="comprobante_aportacion">Comprobante de aportación</option>
                  <option value="comprobante_pago">Comprobante de pago</option>
                  <option value="referencia">Referencia</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              {uploadForm.tipo === 'comprobante_pago' && (
                <div>
                  <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Pago asociado</label>
                  <select value={uploadForm.pago_id} onChange={e => setUploadForm(f => ({ ...f, pago_id: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all">
                    <option value="">— Sin asociar —</option>
                    {pagos.map(p => <option key={p.id} value={p.id}>{fmtDate(p.fecha_pago)} — {fmt(p.monto)}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas del archivo</label>
                <input type="text" value={uploadForm.notas} onChange={e => setUploadForm(f => ({ ...f, notas: e.target.value }))} placeholder="Descripción opcional…" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex-1 cursor-pointer rounded-xl border border-dashed border-slate-600/50 bg-white/[0.02] px-4 py-3 text-center hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-all">
                <input ref={fileInputRef} type="file" accept="image/*,.pdf" className="hidden" onChange={e => setUploadFile(e.target.files[0])} />
                <p className="text-xs text-slate-500">{uploadFile ? <span className="text-cyan-400">{uploadFile.name}</span> : 'Click para seleccionar — JPG, PNG, PDF (máx 10MB)'}</p>
              </label>
              <button onClick={uploadArchivo} disabled={!uploadFile || uploading} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40 flex-shrink-0">
                {uploading ? 'Subiendo…' : 'Subir'}
              </button>
            </div>
          </div>

          {/* Files grid — general (no pago_id) */}
          {(() => {
            const general = archivos.filter(a => !a.pago_id)
            return general.length === 0
              ? <p className="text-center text-[11px] text-slate-700 py-6">Sin archivos generales</p>
              : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {general.map(a => <ArchivoThumb key={a.id} a={a} onDelete={deleteArchivo} onPreview={setLightbox} />)}
                </div>
          })()}
        </div>

      </div>

      {/* ── Delete pago confirm modal ── */}
      {delPagoId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative w-full max-w-xs rounded-2xl border border-red-500/20 bg-[#040c1a] p-6 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
            <p className="text-sm text-white mb-1">¿Eliminar este pago?</p>
            <p className="text-[11px] text-slate-600 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button onClick={() => setDelPagoId(null)} className="flex-1 rounded-xl border border-slate-700/50 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
              <button onClick={() => deletePago(delPagoId)} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition-all">Eliminar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lightbox ── */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90" onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightbox(null)} className="absolute -top-10 right-0 text-slate-400 hover:text-white text-xs">✕ Cerrar</button>
            <img src={lightbox} alt="Comprobante" className="max-h-[85vh] max-w-full rounded-xl object-contain" />
          </div>
        </div>
      )}
    </div>
  )
}

function Row({ label, v, multiline }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-0.5">{label}</p>
      {v ? (multiline ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{v}</p> : <p className="text-sm text-slate-300">{v}</p>)
         : <p className="text-xs text-slate-700 italic">Sin datos</p>}
    </div>
  )
}

function EditField({ label, value, onChange, placeholder = '', type = 'text' }) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" />
    </div>
  )
}

function Chip({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-slate-700/40 bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-500">
      {icon && <span>{icon}</span>}{children}
    </span>
  )
}

function ArchivoThumb({ a, onDelete, onPreview }) {
  const isImg = isImage(a.mime_type)
  const label = { comprobante_aportacion: 'Comp. Aportación', comprobante_pago: 'Comp. Pago', referencia: 'Referencia', otro: 'Otro' }
  return (
    <div className="group relative rounded-xl border border-slate-700/30 bg-white/[0.02] overflow-hidden">
      {isImg
        ? <img src={a.url} alt={a.nombre_original} className="w-full h-28 object-cover cursor-zoom-in" onClick={() => onPreview(a.url)} />
        : <a href={a.url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center h-28 gap-2 hover:bg-white/[0.03] transition-colors">
            <svg className="h-8 w-8 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            <span className="text-[10px] text-slate-600">Ver PDF</span>
          </a>
      }
      <div className="p-2">
        <p className="text-[9px] text-cyan-500/60 uppercase tracking-wide">{label[a.tipo] || 'Archivo'}</p>
        <p className="text-[10px] text-slate-500 truncate">{a.nombre_original}</p>
        {a.notas && <p className="text-[9px] text-slate-700 mt-0.5">{a.notas}</p>}
      </div>
      <button onClick={() => onDelete(a.id)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg bg-black/60 border border-red-500/30 p-1 text-red-400">
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  )
}
