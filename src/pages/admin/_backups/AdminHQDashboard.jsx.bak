import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { analyticsAPI, siteAnalyticsAPI, quotesAPI } from '../../services/api'

const DEUDA_TOTAL = 550000
const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-MX')
const fmtDate = (d) => {
  if (!d) return '—'
  const s = String(d)
  const dt = new Date(s.length === 10 ? s + 'T12:00:00' : s.replace(' ', 'T'))
  return dt.toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: 'numeric', month: 'short', year: 'numeric' })
}

const INIT_APORTACIONES = [
  { id: 1, nombre: 'Manuel', monto: 200000 },
  { id: 2, nombre: 'Carlos', monto: 100000 },
  { id: 3, nombre: 'Bonifacios', monto: 50000 },
]

const EMPTY_COMM_FORM = { name: '', contact_name: '', phone: '', email: '', members: 1, address: '', notes: '', status: 'activo' }

const statusColor = { activo: 'text-green-400 border-green-500/30 bg-green-500/10', vip: 'text-amber-400 border-amber-500/30 bg-amber-500/10', inactivo: 'text-slate-500 border-slate-600/30 bg-slate-700/10' }
const statusLabel = { activo: 'Activo', vip: 'VIP', inactivo: 'Inactivo' }

export default function AdminHQDashboard() {
  const navigate = useNavigate()
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const [view, setView] = useState('overview')
  const [animState, setAnimState] = useState('idle')
  const [zoomTarget, setZoomTarget] = useState(null)
  const [communityDetail, setCommunityDetail] = useState(null)
  const [commSlide, setCommSlide] = useState('idle')
  const [dashData, setDashData] = useState(null)
  const [siteStats, setSiteStats] = useState(null)
  const [quotesStats, setQuotesStats] = useState(null)
  const [aportaciones, setAportaciones] = useState(INIT_APORTACIONES)
  const [finEdit, setFinEdit] = useState(null)
  const [finNombre, setFinNombre] = useState('')
  const [finMonto, setFinMonto] = useState('')
  const [finFecha, setFinFecha] = useState('')
  const [finConfirmId, setFinConfirmId] = useState(null)
  const [finNextId, setFinNextId] = useState(4)
  const [aporLoading, setAporLoading] = useState(false)
  const [pagoModal, setPagoModal] = useState(null)
  const [pagosList, setPagosList] = useState([])
  const [pagosLoading, setPagosLoading] = useState(false)
  const [pagoForm, setPagoForm] = useState({ monto: '', fecha_pago: new Date().toISOString().split('T')[0], notas: '' })
  const [pagoSaving, setPagoSaving] = useState(false)
  const [communities, setCommunities] = useState([])
  const [commLoading, setCommLoading] = useState(false)
  const [commSaving, setCommSaving] = useState(false)
  const [editComm, setEditComm] = useState(null)
  const [newCommOpen, setNewCommOpen] = useState(false)
  const [newCommForm, setNewCommForm] = useState(EMPTY_COMM_FORM)
  const [deleteConfirmComm, setDeleteConfirmComm] = useState(null)
  const [newNote, setNewNote] = useState('')
  const [noteSaving, setNoteSaving] = useState(false)
  const [dialSelected, setDialSelected] = useState(null)
  const [dialDetail, setDialDetail] = useState(null)
  const [dialDetailLoading, setDialDetailLoading] = useState(false)
  const [dialEditMode, setDialEditMode] = useState(false)
  const [dialEditForm, setDialEditForm] = useState({})
  const [dialRotation, setDialRotation] = useState(0)
  const [dialSnapping, setDialSnapping] = useState(false)
  const dialDragRef = useRef({ dragging: false, startAngle: 0, startRot: 0, currentRot: 0 })
  const [finTab, setFinTab] = useState('deuda')
  const [salesData, setSalesData] = useState(null)
  const [salesPeriod, setSalesPeriod] = useState('month')
  const [salesLoading, setSalesLoading] = useState(false)
  const [salesFormOpen, setSalesFormOpen] = useState(false)
  const [salesSaving, setSalesSaving] = useState(false)
  const [salesForm, setSalesForm] = useState({ date: new Date().toISOString().split('T')[0], cash: '', card: '', other: '', covers: '', tickets: '', notes: '' })
  const [salesEditDate, setSalesEditDate] = useState(null)

  useEffect(() => { loadData(); loadCommunities(); loadAportaciones() }, []) // eslint-disable-line
  useEffect(() => {
    if (!dialSelected) { setDialDetail(null); setDialEditMode(false); return }
    const load = async () => {
      setDialDetailLoading(true)
      try {
        const BASE2 = import.meta.env.VITE_API_URL
        const r = await fetch(`${BASE2}/communities/?id=${dialSelected.id}`, { credentials: 'include' })
        const d = await r.json()
        if (d.success) { setDialDetail(d.community); setDialEditForm(d.community) }
      } catch (e) { console.error(e) }
      finally { setDialDetailLoading(false) }
    }
    load()
  }, [dialSelected]) // eslint-disable-line

  const loadData = async () => {
    try {
      const [d, s, q] = await Promise.allSettled([analyticsAPI.getDashboard(7), siteAnalyticsAPI.getStats(7), quotesAPI.getQuotes()])
      if (d.status === 'fulfilled') setDashData(d.value.data)
      if (s.status === 'fulfilled' && s.value.data.success) setSiteStats(s.value.data.stats)
      if (q.status === 'fulfilled' && q.value.data.success) setQuotesStats(q.value.data.stats)
    } catch (e) { console.error(e) }
  }

  const loadSalesData = async (period) => {
    setSalesLoading(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/summary.php?period=${period}`, { credentials: 'include' })
      const d = await res.json()
      if (d.success) setSalesData(d)
    } catch (e) { console.error(e) }
    finally { setSalesLoading(false) }
  }

  const saveSalesEntry = async () => {
    setSalesSaving(true)
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/sales/manual.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date:    salesForm.date,
          cash:    parseFloat(salesForm.cash)    || 0,
          card:    parseFloat(salesForm.card)    || 0,
          other:   parseFloat(salesForm.other)   || 0,
          covers:  parseInt(salesForm.covers)    || 0,
          tickets: parseInt(salesForm.tickets)   || 0,
          notes:   salesForm.notes,
        }),
      })
      const d = await res.json()
      if (d.success) {
        setSalesFormOpen(false)
        setSalesForm({ date: new Date().toISOString().split('T')[0], cash: '', card: '', other: '', covers: '', tickets: '', notes: '' })
        setSalesEditDate(null)
        loadSalesData(salesPeriod)
      }
    } catch (e) { console.error(e) }
    finally { setSalesSaving(false) }
  }

  const deleteSalesEntry = async (date) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/sales/manual.php?date=${date}`, { method: 'DELETE', credentials: 'include' })
      loadSalesData(salesPeriod)
    } catch (e) { console.error(e) }
  }

  const openSalesEdit = (row) => {
    setSalesForm({ date: row.sale_date, cash: String(row.cash_amount), card: String(row.card_amount), other: String(row.other_amount), covers: String(row.covers), tickets: String(row.tickets), notes: row.notes || '' })
    setSalesEditDate(row.sale_date)
    setSalesFormOpen(true)
  }

  const goTo = (panel) => {
    setZoomTarget(panel); setAnimState('zooming')
    setTimeout(() => { setView(panel); setAnimState('entering'); setTimeout(() => setAnimState('idle'), 40) }, 360)
  }

  const goBack = () => {
    setAnimState('exiting')
    setTimeout(() => { setView('overview'); setZoomTarget(null); setCommunityDetail(null); setAnimState('idle') }, 360)
  }

  const closeCommunity = () => {
    setCommSlide('back')
    setTimeout(() => { setCommunityDetail(null); setCommSlide('idle') }, 280)
  }

  const tileStyle = (id) => {
    const base = 'transition-all duration-[360ms] ease-[cubic-bezier(0.4,0,0.2,1)]'
    if (animState === 'zooming') return id === zoomTarget ? `${base} scale-105 opacity-0` : `${base} scale-90 opacity-0`
    if (animState === 'idle') return `${base} scale-100 opacity-100`
    return base
  }

  const panelStyle = () => {
    if (animState === 'entering') return { transform: 'translateY(24px) scale(0.97)', opacity: 0 }
    if (animState === 'exiting') return { transform: 'translateY(24px) scale(0.97)', opacity: 0, transition: 'all 0.36s cubic-bezier(0.4,0,0.2,1)' }
    return { transform: 'translateY(0) scale(1)', opacity: 1, transition: 'all 0.4s cubic-bezier(0.16,1,0.3,1)' }
  }

  const commListStyle = () => {
    if (commSlide === 'out') return { transform: 'translateX(-60px)', opacity: 0, transition: 'all 0.28s ease' }
    if (commSlide === 'back') return { transform: 'translateX(-60px)', opacity: 0, transition: 'all 0.28s ease' }
    return { transform: 'translateX(0)', opacity: 1, transition: 'all 0.32s cubic-bezier(0.16,1,0.3,1)' }
  }

  const commDetailStyle = () => {
    if (commSlide === 'in') return { transform: 'translateX(60px)', opacity: 0 }
    if (commSlide === 'back') return { transform: 'translateX(60px)', opacity: 0, transition: 'all 0.28s ease' }
    return { transform: 'translateX(0)', opacity: 1, transition: 'all 0.35s cubic-bezier(0.16,1,0.3,1)' }
  }

  const totalRecaudado = aportaciones.reduce((s, r) => s + parseFloat(r.total_pagado || 0), 0)
  const totalComprometido = aportaciones.reduce((s, r) => s + parseFloat(r.monto || 0), 0)
  const saldoFinal = DEUDA_TOTAL - totalRecaudado
  const progreso = Math.min(100, (totalRecaudado / DEUDA_TOTAL) * 100)
  const cascade = (() => { let s = DEUDA_TOTAL; return aportaciones.map(r => { s -= r.monto; return { ...r, st: s } }) })()

  const loadAportaciones = async () => {
    setAporLoading(true)
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/finances/aportaciones.php`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setAportaciones(d.aportaciones)
    } catch (e) { console.error(e) }
    finally { setAporLoading(false) }
  }

  const loadPagos = async (aporId) => {
    setPagosLoading(true)
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/finances/pagos.php?aportacion_id=${aporId}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setPagosList(d.pagos)
    } catch (e) { console.error(e) }
    finally { setPagosLoading(false) }
  }

  const openPagoModal = (row) => {
    setPagoModal(row)
    setPagosList([])
    setPagoForm({ monto: '', fecha_pago: new Date().toISOString().split('T')[0], notas: '' })
    loadPagos(row.id)
  }

  const savePago = async () => {
    if (!pagoModal || !pagoForm.monto || parseFloat(pagoForm.monto) <= 0) return
    setPagoSaving(true)
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/finances/pagos.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aportacion_id: pagoModal.id, monto: parseFloat(pagoForm.monto), fecha_pago: pagoForm.fecha_pago, notas: pagoForm.notas, created_by: user?.username || '' })
      })
      const d = await r.json()
      if (d.success) {
        setPagoForm(p => ({ ...p, monto: '', notas: '' }))
        await Promise.all([loadPagos(pagoModal.id), loadAportaciones()])
      }
    } catch (e) { console.error(e) }
    finally { setPagoSaving(false) }
  }

  const deletePago = async (pagoId) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/finances/pagos.php?id=${pagoId}`, { method: 'DELETE', credentials: 'include' })
      setPagosList(p => p.filter(x => x.id !== pagoId))
      await loadAportaciones()
    } catch (e) { console.error(e) }
  }

  const handleFinSave = async () => {
    const m = parseFloat(finMonto); if (!finNombre.trim() || isNaN(m) || m < 0) return
    const BASE_FIN = import.meta.env.VITE_API_URL
    const body = { nombre: finNombre.trim(), monto: m, fecha_aportacion: finFecha || null }
    if (finEdit && finEdit !== 'new') {
      await fetch(`${BASE_FIN}/finances/aportaciones.php?id=${finEdit}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    } else {
      await fetch(`${BASE_FIN}/finances/aportaciones.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    }
    setFinEdit(null)
    await loadAportaciones()
  }

  const BASE = import.meta.env.VITE_API_URL

  const loadCommunities = async () => {
    setCommLoading(true)
    try {
      const r = await fetch(`${BASE}/communities/`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setCommunities(d.communities)
    } catch (e) { console.error(e) }
    finally { setCommLoading(false) }
  }

  const openCommunityDetail = async (c) => {
    setCommSlide('out')
    try {
      const r = await fetch(`${BASE}/communities/?id=${c.id}`, { credentials: 'include' })
      const d = await r.json()
      setTimeout(() => { setCommunityDetail(d.success ? d.community : c); setCommSlide('in'); setTimeout(() => setCommSlide('idle'), 40) }, 280)
    } catch {
      setTimeout(() => { setCommunityDetail(c); setCommSlide('in'); setTimeout(() => setCommSlide('idle'), 40) }, 280)
    }
  }

  const saveCommEdit = async () => {
    if (!editComm || commSaving) return
    setCommSaving(true)
    try {
      const r = await fetch(`${BASE}/communities/?id=${editComm.id}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editComm),
      })
      const d = await r.json()
      if (d.success) {
        await loadCommunities()
        const refreshed = await fetch(`${BASE}/communities/?id=${editComm.id}`, { credentials: 'include' })
        const rd = await refreshed.json()
        if (rd.success) setCommunityDetail(rd.community)
        setEditComm(null)
      }
    } catch (e) { console.error(e) }
    finally { setCommSaving(false) }
  }

  const createCommunity = async () => {
    if (!newCommForm.name.trim() || commSaving) return
    setCommSaving(true)
    try {
      const r = await fetch(`${BASE}/communities/`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCommForm),
      })
      const d = await r.json()
      if (d.success) { setNewCommOpen(false); setNewCommForm(EMPTY_COMM_FORM); await loadCommunities() }
    } catch (e) { console.error(e) }
    finally { setCommSaving(false) }
  }

  const deleteCommunity = async (id) => {
    try {
      await fetch(`${BASE}/communities/?id=${id}`, { method: 'DELETE', credentials: 'include' })
      setDeleteConfirmComm(null)
      if (communityDetail?.id === id) { setCommunityDetail(null); setCommSlide('idle') }
      await loadCommunities()
    } catch (e) { console.error(e) }
  }

  const addNote = async () => {
    if (!newNote.trim() || !communityDetail || noteSaving) return
    setNoteSaving(true)
    try {
      const r = await fetch(`${BASE}/communities/notes.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ community_id: communityDetail.id, content: newNote.trim() }),
      })
      const d = await r.json()
      if (d.success) {
        const newNoteObj = { id: d.id, content: newNote.trim(), created_by: user.username || 'admin', created_at: new Date().toISOString() }
        setCommunityDetail(p => ({ ...p, notes_list: [newNoteObj, ...(p.notes_list || [])] }))
        setNewNote('')
      }
    } catch (e) { console.error(e) }
    finally { setNoteSaving(false) }
  }

  const deleteNote = async (noteId) => {
    try {
      await fetch(`${BASE}/communities/notes.php?id=${noteId}`, { method: 'DELETE', credentials: 'include' })
      setCommunityDetail(p => ({ ...p, notes_list: (p.notes_list || []).filter(n => n.id !== noteId) }))
    } catch (e) { console.error(e) }
  }

  const now = new Date()

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  if (view === 'overview') {
    const tiles = [
      {
        id: 'financial', label: 'FINANCIERO', title: 'Control de Deuda',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 11v-1m0 1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
        color: 'cyan', metrics: [{ l: 'Saldo', v: fmt(saldoFinal) }, { l: `${progreso.toFixed(0)}% pagado`, v: fmt(totalRecaudado) }],
        glow: 'shadow-cyan-500/20 border-cyan-500/25',
      },
      {
        id: 'communities', label: 'COMUNIDADES', title: 'Grupos & Clientes VIP',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />,
        color: 'violet', metrics: [{ l: 'Comunidades', v: communities.length }, { l: 'VIP', v: communities.filter(c => c.status === 'vip').length }],
        glow: 'shadow-violet-500/20 border-violet-500/25',
      },
      {
        id: 'employees', label: 'PERSONAL', title: 'Empleados & RRHH',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />,
        color: 'emerald', metrics: [{ l: 'Solicitudes', v: dashData?.stats?.totalApplications || 0 }, { l: 'Pendientes', v: dashData?.stats?.pendingApplications || 0 }],
        glow: 'shadow-emerald-500/20 border-emerald-500/25',
      },
      {
        id: 'analytics', label: 'ANALÍTICA', title: 'Estadísticas & Métricas',
        icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
        color: 'blue', metrics: [{ l: 'Visitantes hoy', v: siteStats?.today_views || 0 }, { l: 'Activos ahora', v: siteStats?.active_now || 0 }],
        glow: 'shadow-blue-500/20 border-blue-500/25',
      },
    ]
    const colorMap = { cyan: { ring: 'border-cyan-500/25', glow: 'bg-cyan-500/8', text: 'text-cyan-400', dot: 'bg-cyan-400', bar: 'from-cyan-500', hover: 'hover:border-cyan-400/50 hover:bg-cyan-500/10' }, violet: { ring: 'border-violet-500/25', glow: 'bg-violet-500/8', text: 'text-violet-400', dot: 'bg-violet-400', bar: 'from-violet-500', hover: 'hover:border-violet-400/50 hover:bg-violet-500/10' }, emerald: { ring: 'border-emerald-500/25', glow: 'bg-emerald-500/8', text: 'text-emerald-400', dot: 'bg-emerald-400', bar: 'from-emerald-500', hover: 'hover:border-emerald-400/50 hover:bg-emerald-500/10' }, blue: { ring: 'border-blue-500/25', glow: 'bg-blue-500/8', text: 'text-blue-400', dot: 'bg-blue-400', bar: 'from-blue-500', hover: 'hover:border-blue-400/50 hover:bg-blue-500/10' } }

    return (
      <div className="relative space-y-4">
        <div className="pointer-events-none fixed inset-0 z-0" style={{ background: 'repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,255,255,0.005) 2px,rgba(0,255,255,0.005) 4px)' }} />
        <div className="relative flex items-start sm:items-end justify-between flex-wrap gap-3">
          <div>
            <p className="text-[9px] uppercase tracking-[0.5em] text-cyan-500/30 mb-1">Sistema Administrativo · Bonifacio's</p>
            <h1 className="text-lg sm:text-xl font-light text-white tracking-wide">Centro de Mando <span className="text-cyan-400/60">ABBA</span></h1>
            <p className="text-[11px] text-slate-600 mt-0.5 hidden sm:block">{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {user.full_name || user.username}</p>
            <p className="text-[11px] text-slate-600 mt-0.5 sm:hidden">{now.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · {user.full_name || user.username}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] text-green-400/60 uppercase tracking-widest hidden sm:inline">Sistema activo</span>
            <span className="text-[10px] text-green-400/60 uppercase tracking-widest sm:hidden">Online</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tiles.map((tile) => {
            const c = colorMap[tile.color]
            return (
              <button key={tile.id} onClick={() => goTo(tile.id)} className={`${tileStyle(tile.id)} group relative overflow-hidden rounded-2xl border ${c.ring} ${c.glow} ${c.hover} p-4 sm:p-6 text-left cursor-pointer transition-all duration-300 shadow-xl min-h-[160px] sm:min-h-[200px]`}>
                <div className={`absolute inset-0 bg-gradient-to-br ${c.glow} to-transparent opacity-60`} />
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
                <div className="absolute bottom-0 left-0 h-full w-px bg-gradient-to-b from-transparent via-white/5 to-transparent" />
                <div className="relative z-10">
                  <div className="flex items-start justify-between mb-3 sm:mb-4">
                    <div>
                      <p className={`text-[9px] uppercase tracking-[0.4em] ${c.text} opacity-60 mb-1`}>{tile.label}</p>
                      <h2 className="text-sm sm:text-base font-light text-white">{tile.title}</h2>
                    </div>
                    <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-xl border ${c.ring} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300`} style={{ background: 'rgba(0,0,0,0.3)' }}>
                      <svg className={`h-4 w-4 sm:h-5 sm:w-5 ${c.text}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>{tile.icon}</svg>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 sm:mt-6">
                    {tile.metrics.map((m, i) => (
                      <div key={i}>
                        <p className={`text-2xl font-light tabular-nums ${c.text}`}>{m.v}</p>
                        <p className="text-[10px] text-slate-600 mt-0.5">{m.l}</p>
                      </div>
                    ))}
                  </div>
                  <div className={`mt-4 flex items-center gap-1.5 ${c.text} opacity-0 group-hover:opacity-60 transition-opacity`}>
                    <span className="text-[10px] uppercase tracking-widest">Abrir panel</span>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent ${c.bar} to-transparent opacity-0 group-hover:opacity-100 transition-opacity`} />
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ── BACK BUTTON ────────────────────────────────────────────────────────────
  const BackBtn = ({ label }) => (
    <button onClick={goBack} className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-cyan-400 hover:border-cyan-500/30 transition-all">
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
      {label || 'Panel Principal'}
    </button>
  )

  // ── FINANCIAL ─────────────────────────────────────────────────────────────
  if (view === 'financial') {
    const PERIODS = [{ k: 'today', l: 'Hoy' }, { k: 'week', l: 'Semana' }, { k: 'month', l: 'Mes' }, { k: 'year', l: 'Año' }]
    const st = salesData?.totals || {}
    const rt = salesData?.today_rt || {}
    const syncLog = salesData?.last_sync

    const handlePeriod = (p) => { setSalesPeriod(p); loadSalesData(p) }
    if (finTab === 'ventas' && !salesData && !salesLoading) loadSalesData(salesPeriod)

    return (
    <div style={panelStyle()} className="space-y-4">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.4em] text-cyan-500/30 mb-1">Finanzas</p>
          <h2 className="text-base sm:text-lg font-light text-white">Panel de Control Financiero</h2>
          <p className="text-xs text-slate-600">Control de Deuda, Aportaciones y Ventas</p>
        </div>
        <BackBtn />
      </div>

      {/* ── TABS ── */}
      <div className="flex gap-1 rounded-xl border border-slate-700/30 bg-white/[0.02] p-1">
        {[{ k: 'deuda', l: 'Deuda & Aportaciones', s: 'Deuda', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 11v-1m0 1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' }, { k: 'ventas', l: 'Ventas & SoftRestaurant', s: 'Ventas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' }].map(t => (
          <button key={t.k} onClick={() => { setFinTab(t.k); if (t.k === 'ventas' && !salesData) loadSalesData(salesPeriod) }} className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-lg px-2 sm:px-4 py-2.5 text-xs transition-all duration-200 ${finTab === t.k ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-500 hover:text-slate-300'}`}>
            <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d={t.icon} /></svg>
            <span className="hidden sm:inline">{t.l}</span>
            <span className="sm:hidden">{t.s}</span>
          </button>
        ))}
      </div>
      {/* ── TAB: DEUDA ── */}
      {finTab === 'deuda' && <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { l: 'Deuda Total', v: fmt(DEUDA_TOTAL), color: 'text-red-400', border: 'border-red-500/20', from: 'from-red-500/5', dot: 'bg-red-400', sub: 'Monto inicial fijo' },
            { l: 'Total Pagado', v: fmt(totalRecaudado), color: 'text-green-400', border: 'border-green-500/20', from: 'from-green-500/5', dot: 'bg-green-400', sub: `Comprometido: ${fmt(totalComprometido)}` },
            { l: 'Saldo Restante', v: fmt(saldoFinal), color: saldoFinal <= 0 ? 'text-green-400' : 'text-orange-400', border: saldoFinal <= 0 ? 'border-green-500/20' : 'border-orange-500/20', from: saldoFinal <= 0 ? 'from-green-500/5' : 'from-orange-500/5', dot: saldoFinal <= 0 ? 'bg-green-400' : 'bg-orange-400', sub: `${progreso.toFixed(1)}% cubierto` },
          ].map((k, i) => (
            <div key={i} className={`relative overflow-hidden rounded-2xl border ${k.border} bg-gradient-to-br ${k.from} to-transparent p-5`}>
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">{k.l}</p>
              <p className={`text-xl sm:text-3xl font-light tabular-nums ${k.color}`}>{k.v}</p>
              <div className="flex items-center gap-1.5 mt-2"><span className={`h-1.5 w-1.5 rounded-full ${k.dot}`} /><span className="text-[10px] text-slate-600">{k.sub}</span></div>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] px-6 py-4">
          <div className="flex items-center justify-between mb-2"><span className="text-[10px] uppercase tracking-widest text-slate-600">Progreso de Pago</span><span className="text-sm font-light text-cyan-400">{progreso.toFixed(1)}%</span></div>
          <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700" style={{ width: `${progreso}%` }} /></div>
          <div className="flex justify-between mt-1.5"><span className="text-[10px] text-slate-700">$0</span><span className="text-[10px] text-slate-700">{fmt(DEUDA_TOTAL)}</span></div>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <div className="flex items-center justify-between mb-4">
            <div><p className="text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">Registro</p><h3 className="text-sm font-light text-white">Tabla de Aportaciones</h3></div>
            <button onClick={() => { setFinEdit('new'); setFinNombre(''); setFinMonto(''); setFinFecha('') }} className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">
              <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">Registrar Aportación</span>
              <span className="sm:hidden">Agregar</span>
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px]">
              <thead><tr className="border-b border-white/5">{['#','Aportador','Monto','Saldo tras aporte','Acciones'].map((h,i) => <th key={i} className="pb-3 text-[10px] uppercase tracking-widest text-slate-600 font-normal text-left px-2 first:pl-0">{h}</th>)}</tr></thead>
              <tbody>
                {cascade.map((row, idx) => {
                  const pct = row.monto > 0 ? Math.min(100, (parseFloat(row.total_pagado || 0) / row.monto) * 100) : 0
                  const saldado = pct >= 100
                  return (
                  <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors group">
                    <td className="py-3 px-2 pl-0 text-[11px] text-slate-700">{idx + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <div className={`h-6 w-6 rounded-full flex-shrink-0 flex items-center justify-center border ${saldado ? 'bg-green-500/20 border-green-500/30' : 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-500/20'}`}>
                          <span className={`text-[10px] font-medium ${saldado ? 'text-green-400' : 'text-cyan-400'}`}>{row.nombre.charAt(0)}</span>
                        </div>
                        <div>
                          <button onClick={() => navigate(`/admin/aportaciones/${row.id}`)} className="text-sm text-slate-300 hover:text-cyan-400 transition-colors text-left">{row.nombre}</button>
                          {row.fecha_aportacion && <p className="text-[9px] text-slate-600 mt-0.5">{fmtDate(row.fecha_aportacion)}</p>}
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <div className="h-1 w-16 rounded-full bg-white/5 overflow-hidden">
                              <div className={`h-full rounded-full transition-all duration-500 ${saldado ? 'bg-green-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className={`text-[9px] tabular-nums ${saldado ? 'text-green-400' : 'text-slate-600'}`}>{Math.round(pct)}%</span>
                            {saldado && <span className="text-[8px] text-green-400 border border-green-500/30 rounded px-1 py-0.5">Saldado</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2">
                      <span className="text-sm font-light text-cyan-400 tabular-nums">{fmt(row.monto)}</span>
                      <p className="text-[9px] text-green-400 mt-0.5 tabular-nums">Pagado: {fmt(row.total_pagado || 0)}</p>
                    </td>
                    <td className="py-3 px-2"><span className={`text-sm font-light tabular-nums ${row.st <= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(row.st)}</span></td>
                    <td className="py-3 px-2">
                      <div className="flex gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openPagoModal(row)} title="Registrar pago" className="flex items-center gap-1 rounded-lg border border-green-500/20 bg-green-500/10 px-2 py-1.5 text-[10px] text-green-400 hover:bg-green-500/20 transition-all">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          Pagos
                        </button>
                        <button onClick={() => { setFinEdit(row.id); setFinNombre(row.nombre); setFinMonto(String(row.monto)); setFinFecha(row.fecha_aportacion || '') }} className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20 transition-all"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                        <button onClick={() => setFinConfirmId(row.id)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all"><svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                      </div>
                    </td>
                  </tr>
                )})}
                {cascade.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-[11px] text-slate-700">Sin aportaciones registradas</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </>}

      {/* ── TAB: VENTAS ── */}
      {finTab === 'ventas' && <>
        {/* Period selector + sync status */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex gap-1 rounded-xl border border-slate-700/30 bg-white/[0.02] p-1">
            {PERIODS.map(p => (
              <button key={p.k} onClick={() => handlePeriod(p.k)} className={`rounded-lg px-3 py-1.5 text-xs transition-all ${salesPeriod === p.k ? 'bg-green-500/15 text-green-400 border border-green-500/20' : 'text-slate-500 hover:text-slate-300'}`}>{p.l}</button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            {syncLog && (
              <div className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${syncLog.status === 'success' ? 'bg-green-400' : 'bg-orange-400'}`} />
                <span className="text-[10px] text-slate-600">SR: {syncLog.synced_at ? new Date(syncLog.synced_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : 'Sin sincronizar'}</span>
              </div>
            )}
            <button onClick={() => { setSalesFormOpen(true); setSalesEditDate(null); setSalesForm({ date: new Date().toISOString().split('T')[0], cash: '', card: '', other: '', covers: '', tickets: '', notes: '' }) }} className="flex items-center gap-1.5 rounded-xl border border-green-500/25 bg-green-500/10 px-3 py-2 text-xs text-green-400 hover:bg-green-500/20 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Agregar ventas manuales
            </button>
          </div>
        </div>

        {/* Today real-time from SoftRestaurant */}
        {rt?.total > 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent p-5">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />
            <div className="flex items-center gap-2 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              <p className="text-[10px] uppercase tracking-widest text-green-500/60">SoftRestaurant · Tiempo Real · Hoy</p>
              {rt.last_transaction && <span className="text-[10px] text-slate-700 ml-auto">Último: {new Date(rt.last_transaction).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { l: 'Efectivo', v: fmt(rt.cash), c: 'text-green-400' },
                { l: 'Tarjeta', v: fmt(rt.card), c: 'text-blue-400' },
                { l: 'Total Hoy', v: fmt(rt.total), c: 'text-white' },
                { l: 'Tickets', v: rt.ticket_count || 0, c: 'text-cyan-400' },
              ].map((s,i) => <div key={i}><p className="text-[10px] text-slate-600 mb-1">{s.l}</p><p className={`text-xl font-light tabular-nums ${s.c}`}>{s.v}</p></div>)}
            </div>
          </div>
        )}

        {/* KPI Cards for period */}
        {salesLoading ? (
          <div className="flex items-center justify-center py-12"><div className="h-8 w-8 rounded-full border-t border-cyan-400 animate-spin" /></div>
        ) : salesData ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { l: 'Total Efectivo', v: fmt(st.total_cash), c: 'text-green-400', b: 'border-green-500/20', bg: 'from-green-500/5' },
                { l: 'Total Tarjeta', v: fmt(st.total_card), c: 'text-blue-400', b: 'border-blue-500/20', bg: 'from-blue-500/5' },
                { l: 'Gran Total', v: fmt(st.grand_total), c: 'text-white', b: 'border-cyan-500/20', bg: 'from-cyan-500/5' },
                { l: 'Ticket Promedio', v: fmt(st.avg_ticket), c: 'text-amber-400', b: 'border-amber-500/20', bg: 'from-amber-500/5' },
              ].map((s,i) => (
                <div key={i} className={`relative overflow-hidden rounded-2xl border ${s.b} bg-gradient-to-br ${s.bg} to-transparent p-4`}>
                  <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                  <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">{s.l}</p>
                  <p className={`text-2xl font-light tabular-nums ${s.c}`}>{s.v}</p>
                </div>
              ))}
            </div>
            {salesData.growth !== null && (
              <div className="rounded-xl border border-slate-700/30 bg-white/[0.02] px-4 py-3 flex items-center gap-3">
                <span className={`text-lg font-light ${salesData.growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>{salesData.growth >= 0 ? '▲' : '▼'} {Math.abs(salesData.growth)}%</span>
                <span className="text-[11px] text-slate-600">vs. mismo período mes anterior ({fmt(salesData.prev_total)})</span>
              </div>
            )}
            {/* Daily breakdown table */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-4">Desglose Diario</p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px]">
                  <thead><tr className="border-b border-white/5">{['Fecha','Efectivo','Tarjeta','Otro','Total','Comensales','Fuente','Acciones'].map((h,i) => <th key={i} className="pb-3 text-[10px] uppercase tracking-widest text-slate-600 font-normal text-left px-2 first:pl-0">{h}</th>)}</tr></thead>
                  <tbody>
                    {(salesData.daily || []).slice().reverse().map((row) => (
                      <tr key={row.sale_date} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors group">
                        <td className="py-2.5 px-2 pl-0 text-xs text-slate-400 whitespace-nowrap">{fmtDate(row.sale_date)}</td>
                        <td className="py-2.5 px-2 text-xs text-green-400 tabular-nums">{fmt(row.cash_amount)}</td>
                        <td className="py-2.5 px-2 text-xs text-blue-400 tabular-nums">{fmt(row.card_amount)}</td>
                        <td className="py-2.5 px-2 text-xs text-slate-500 tabular-nums">{fmt(row.other_amount)}</td>
                        <td className="py-2.5 px-2 text-xs font-medium text-white tabular-nums">{fmt(row.total_amount)}</td>
                        <td className="py-2.5 px-2 text-xs text-slate-500">{row.covers || '—'}</td>
                        <td className="py-2.5 px-2">
                          <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${row.source === 'softrestaurant' ? 'text-cyan-400 border-cyan-500/20 bg-cyan-500/10' : row.source === 'both' ? 'text-purple-400 border-purple-500/20 bg-purple-500/10' : 'text-slate-500 border-slate-700/30'}`}>{row.source === 'softrestaurant' ? 'SR' : row.source === 'both' ? 'SR+M' : 'Manual'}</span>
                        </td>
                        <td className="py-2.5 px-2"><div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openSalesEdit(row)} className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-1 text-blue-400 hover:bg-blue-500/20 transition-all"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                          {row.source !== 'softrestaurant' && <button onClick={() => deleteSalesEntry(row.sale_date)} className="rounded-lg border border-red-500/20 bg-red-500/10 p-1 text-red-400 hover:bg-red-500/20 transition-all"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>}
                        </div></td>
                      </tr>
                    ))}
                    {(salesData.daily || []).length === 0 && <tr><td colSpan={8} className="py-10 text-center text-[11px] text-slate-700">Sin ventas registradas para este período</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-12 w-12 rounded-2xl border border-slate-700/30 flex items-center justify-center"><svg className="h-6 w-6 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg></div>
            <p className="text-[12px] text-slate-600">Sin datos de ventas</p>
            <button onClick={() => loadSalesData(salesPeriod)} className="text-[11px] text-cyan-500/50 hover:text-cyan-400 transition-colors">Cargar datos</button>
          </div>
        )}
      </>}

      {/* Modals: aportacion add/edit */}
      {finEdit !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/20 bg-[#040c1a] p-6 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent rounded-t-2xl" />
            <h3 className="text-base font-light text-white mb-1">{finEdit === 'new' ? 'Nueva Aportación' : 'Editar Aportación'}</h3>
            <p className="text-[11px] text-slate-600 mb-5">Ingresa los datos de la aportación</p>
            <div className="space-y-4">
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Nombre</label><input type="text" value={finNombre} onChange={e => setFinNombre(e.target.value)} placeholder="Ej. Manuel" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" /></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Fecha de Aportación</label><input type="date" value={finFecha} onChange={e => setFinFecha(e.target.value)} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-4 py-2.5 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all" /></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Monto ($)</label><input type="number" min="0" value={finMonto} onChange={e => setFinMonto(e.target.value)} placeholder="200000" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" />{finMonto && !isNaN(parseFloat(finMonto)) && <p className="text-[10px] text-cyan-500/50 mt-1">{fmt(parseFloat(finMonto))}</p>}</div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => setFinEdit(null)} className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.02] py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
              <button onClick={handleFinSave} disabled={!finNombre.trim() || finMonto === '' || isNaN(parseFloat(finMonto)) || parseFloat(finMonto) < 0} className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-30">{finEdit === 'new' ? 'Registrar' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
      {finConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-xs rounded-2xl border border-red-500/20 bg-[#040c1a] p-6 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
            <p className="text-sm font-medium text-white mb-1">¿Eliminar aportación?</p>
            <p className="text-[11px] text-slate-600 mb-5">Esta acción no se puede deshacer</p>
            <div className="flex gap-2"><button onClick={() => setFinConfirmId(null)} className="flex-1 rounded-xl border border-slate-700/50 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button><button onClick={async () => { await fetch(`${import.meta.env.VITE_API_URL}/finances/aportaciones.php?id=${finConfirmId}`, { method: 'DELETE', credentials: 'include' }); setFinConfirmId(null); loadAportaciones() }} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition-all">Sí, eliminar</button></div>
          </div>
        </div>
      )}

      {/* Modal: pagos de aportación */}
      {pagoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.7)' }}>
          <div className="relative w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#040c1a] shadow-2xl max-h-[90vh] flex flex-col">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent rounded-t-2xl" />

            {/* Header */}
            <div className="p-5 pb-4 flex-shrink-0">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-cyan-500/40 mb-0.5">Historial de pagos</p>
                  <h3 className="text-base font-light text-white">{pagoModal.nombre}</h3>
                  {pagoModal.fecha_aportacion && <p className="text-[10px] text-slate-600 mt-0.5">Aportación: {fmtDate(pagoModal.fecha_aportacion)}</p>}
                </div>
                <button onClick={() => setPagoModal(null)} className="rounded-lg border border-slate-700/50 p-1.5 text-slate-500 hover:text-slate-300 transition-all flex-shrink-0">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              {/* Progress bar */}
              {(() => {
                const pagado = pagoModal.total_pagado || 0
                const pct = pagoModal.monto > 0 ? Math.min(100, (pagado / pagoModal.monto) * 100) : 0
                const saldado = pct >= 100
                const pendiente = Math.max(0, pagoModal.monto - pagado)
                return (
                  <div className={`mt-4 rounded-xl border p-4 ${saldado ? 'border-green-500/25 bg-green-500/5' : 'border-slate-700/30 bg-white/[0.02]'}`}>
                    <div className="flex items-end justify-between mb-2">
                      <div>
                        <p className="text-[10px] text-slate-600 mb-0.5">Pagado</p>
                        <p className="text-xl font-light text-green-400 tabular-nums">{fmt(pagado)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-600 mb-0.5">Comprometido</p>
                        <p className="text-sm font-light text-slate-400 tabular-nums">{fmt(pagoModal.monto)}</p>
                      </div>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-white/5 overflow-hidden mb-1.5">
                      <div className={`h-full rounded-full transition-all duration-700 ${saldado ? 'bg-green-400' : 'bg-gradient-to-r from-cyan-500 to-blue-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-[11px] font-medium ${saldado ? 'text-green-400' : 'text-cyan-400'}`}>{pct.toFixed(1)}% {saldado ? '— ¡Saldado!' : ''}</span>
                      {!saldado && <span className="text-[10px] text-slate-600">Pendiente: <span className="text-orange-400">{fmt(pendiente)}</span></span>}
                    </div>
                  </div>
                )
              })()}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">

              {/* Payment list */}
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Registro de pagos</p>
                {pagosLoading ? (
                  <div className="flex justify-center py-6"><div className="h-5 w-5 rounded-full border-t border-cyan-400 animate-spin" /></div>
                ) : pagosList.length === 0 ? (
                  <p className="text-[11px] text-slate-700 py-3 text-center">Sin pagos registrados aún</p>
                ) : (
                  <div className="space-y-1">
                    {pagosList.map(p => (
                      <div key={p.id} className="group flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5 hover:border-red-500/15 transition-all">
                        <div className="flex-shrink-0">
                          <span className="h-2 w-2 rounded-full bg-green-400 block" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-light text-green-400 tabular-nums">{fmt(p.monto)}</span>
                            <span className="text-[10px] text-slate-600">{fmtDate(p.fecha_pago)}</span>
                          </div>
                          {p.notas && <p className="text-[10px] text-slate-600 mt-0.5 truncate">{p.notas}</p>}
                          {p.created_by && <p className="text-[9px] text-slate-700 mt-0.5">por {p.created_by}</p>}
                        </div>
                        <button onClick={() => deletePago(p.id)} className="opacity-0 group-hover:opacity-100 flex-shrink-0 rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* New payment form */}
              <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/[0.04] p-4">
                <p className="text-[10px] uppercase tracking-widest text-cyan-500/50 mb-3">Registrar nuevo pago</p>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-600 mb-1">Monto ($)</label>
                    <input type="number" min="1" step="any" value={pagoForm.monto} onChange={e => setPagoForm(p => ({ ...p, monto: e.target.value }))}
                      placeholder="50000" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" />
                    {pagoForm.monto && !isNaN(parseFloat(pagoForm.monto)) && parseFloat(pagoForm.monto) > 0 && (
                      <p className="text-[9px] text-cyan-500/50 mt-0.5">{fmt(parseFloat(pagoForm.monto))}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-slate-600 mb-1">Fecha</label>
                    <input type="date" value={pagoForm.fecha_pago} onChange={e => setPagoForm(p => ({ ...p, fecha_pago: e.target.value }))}
                      className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-3 py-2.5 text-sm text-white focus:border-cyan-500/40 focus:outline-none transition-all" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="block text-[10px] uppercase tracking-widest text-slate-600 mb-1">Notas (opcional)</label>
                  <input type="text" value={pagoForm.notas} onChange={e => setPagoForm(p => ({ ...p, notas: e.target.value }))}
                    placeholder="Ej. Transferencia OXXO, efectivo..." className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none transition-all" />
                </div>
                <button onClick={savePago} disabled={pagoSaving || !pagoForm.monto || parseFloat(pagoForm.monto) <= 0}
                  className="w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-40">
                  {pagoSaving ? 'Registrando...' : 'Registrar pago'}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal: sales manual entry */}
      {salesFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-md rounded-2xl border border-green-500/20 bg-[#040c1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-green-500/40 to-transparent rounded-t-2xl" />
            <h3 className="text-base font-light text-white mb-1">{salesEditDate ? 'Editar Ventas' : 'Registrar Ventas Manuales'}</h3>
            <p className="text-[11px] text-slate-600 mb-5">Ingresa los totales del día por forma de pago</p>
            <div className="space-y-3">
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Fecha</label><input type="date" value={salesForm.date} onChange={e => setSalesForm(p => ({ ...p, date: e.target.value }))} disabled={!!salesEditDate} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-green-500/40 focus:outline-none transition-all disabled:opacity-50" /></div>
              <div className="grid grid-cols-3 gap-3">
                {[['Efectivo ($)', 'cash', 'text-green-400'], ['Tarjeta ($)', 'card', 'text-blue-400'], ['Otro ($)', 'other', 'text-slate-400']].map(([l, k, c]) => (
                  <div key={k}><label className={`block text-[10px] uppercase tracking-widest mb-1 ${c}`}>{l}</label><input type="number" min="0" value={salesForm[k]} onChange={e => setSalesForm(p => ({ ...p, [k]: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" /></div>
                ))}
              </div>
              {(parseFloat(salesForm.cash) || parseFloat(salesForm.card) || parseFloat(salesForm.other)) > 0 && (
                <div className="rounded-xl border border-green-500/15 bg-green-500/5 px-4 py-2.5 flex items-center justify-between">
                  <span className="text-[11px] text-slate-600">Total del día</span>
                  <span className="text-base font-light text-white tabular-nums">{fmt((parseFloat(salesForm.cash) || 0) + (parseFloat(salesForm.card) || 0) + (parseFloat(salesForm.other) || 0))}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Comensales</label><input type="number" min="0" value={salesForm.covers} onChange={e => setSalesForm(p => ({ ...p, covers: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" /></div>
                <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Tickets</label><input type="number" min="0" value={salesForm.tickets} onChange={e => setSalesForm(p => ({ ...p, tickets: e.target.value }))} placeholder="0" className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" /></div>
              </div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas</label><input type="text" value={salesForm.notes} onChange={e => setSalesForm(p => ({ ...p, notes: e.target.value }))} placeholder="Ej. Día de fiesta, alta demanda..." className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-green-500/40 focus:outline-none transition-all" /></div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setSalesFormOpen(false); setSalesEditDate(null) }} className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.02] py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
              <button onClick={saveSalesEntry} disabled={salesSaving} className="flex-1 rounded-xl border border-green-500/30 bg-green-500/10 py-2.5 text-xs text-green-400 hover:bg-green-500/20 transition-all disabled:opacity-50">{salesSaving ? 'Guardando...' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
    )
  }

  // ── COMMUNITIES ───────────────────────────────────────────────────────────
  if (view === 'communities') return (
    <div style={panelStyle()} className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div><p className="text-[9px] uppercase tracking-[0.4em] text-violet-500/30 mb-1">Comunidades</p><h2 className="text-base sm:text-lg font-light text-white">Grupos & Clientes VIP</h2><p className="text-xs text-slate-600 hidden sm:block">Haz clic en una comunidad para ver su perfil completo</p></div>
        <BackBtn />
      </div>
      {!communityDetail ? (
        <div style={commListStyle()}>
          {commLoading ? (
            <div className="flex items-center justify-center py-20"><div className="h-8 w-8 rounded-full border-t border-violet-400 animate-spin" /></div>
          ) : (() => {
            const DIAL = 280, CTR = 140, R = 105, DOT = 38
            const sel = dialSelected
            const dots = communities.map((c, idx) => {
              const angle = (idx / communities.length) * 2 * Math.PI - Math.PI / 2
              return { ...c, x: CTR + R * Math.cos(angle) - DOT / 2, y: CTR + R * Math.sin(angle) - DOT / 2, angle }
            })
            const ticks = Array.from({ length: 60 }, (_, i) => {
              const a = (i / 60) * 2 * Math.PI - Math.PI / 2
              const isLong = i % 5 === 0
              const r1 = CTR - (isLong ? 18 : 12), r2 = CTR - 8
              return { x1: CTR + r1 * Math.cos(a), y1: CTR + r1 * Math.sin(a), x2: CTR + r2 * Math.cos(a), y2: CTR + r2 * Math.sin(a), long: isLong }
            })
            return (
              <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-10">
                {/* ── DIAL ── */}
                {(() => {
                  const snapTo = (idx) => {
                    const n = communities.length
                    if (n === 0) return
                    const base = -(idx / n) * 360
                    let nearest = base
                    for (let k = -5; k <= 5; k++) {
                      const c = base + k * 360
                      if (Math.abs(c - dialDragRef.current.currentRot) < Math.abs(nearest - dialDragRef.current.currentRot)) nearest = c
                    }
                    setDialSnapping(true)
                    setDialRotation(nearest)
                    setDialSelected(communities[idx])
                    setTimeout(() => setDialSnapping(false), 350)
                  }
                  const getAngle = (e, rect) => {
                    const cx = rect.left + CTR, cy = rect.top + CTR
                    const cx_ = e.touches ? e.touches[0].clientX : e.clientX
                    const cy_ = e.touches ? e.touches[0].clientY : e.clientY
                    return Math.atan2(cy_ - cy, cx_ - cx) * 180 / Math.PI
                  }
                  // keep ref in sync
                  dialDragRef.current.currentRot = dialRotation
                  return (
                    <div className="flex flex-col items-center gap-3 flex-shrink-0">
                      <div className="relative select-none" style={{ width: DIAL, height: DIAL, cursor: dialDragRef.current.dragging ? 'grabbing' : 'grab', touchAction: 'none' }}
                        onPointerDown={e => {
                          e.currentTarget.setPointerCapture(e.pointerId)
                          const rect = e.currentTarget.getBoundingClientRect()
                          dialDragRef.current = { ...dialDragRef.current, dragging: true, startAngle: getAngle(e, rect), startRot: dialRotation, currentRot: dialRotation }
                        }}
                        onPointerMove={e => {
                          if (!dialDragRef.current.dragging) return
                          const rect = e.currentTarget.getBoundingClientRect()
                          const delta = getAngle(e, rect) - dialDragRef.current.startAngle
                          const nr = dialDragRef.current.startRot + delta
                          dialDragRef.current.currentRot = nr
                          setDialSnapping(false)
                          setDialRotation(nr)
                        }}
                        onPointerUp={() => {
                          if (!dialDragRef.current.dragging) return
                          dialDragRef.current.dragging = false
                          const n = communities.length
                          if (n === 0) return
                          let bestIdx = 0, bestSnap = 0, bestDist = Infinity
                          for (let i = 0; i < n; i++) {
                            const base = -(i / n) * 360
                            for (let k = -6; k <= 6; k++) {
                              const cand = base + k * 360
                              const dist = Math.abs(cand - dialDragRef.current.currentRot)
                              if (dist < bestDist) { bestDist = dist; bestIdx = i; bestSnap = cand }
                            }
                          }
                          setDialSnapping(true)
                          setDialRotation(bestSnap)
                          setDialSelected(communities[bestIdx])
                          setTimeout(() => setDialSnapping(false), 350)
                        }}
                      >
                        {/* Static base rings */}
                        <svg width={DIAL} height={DIAL} className="absolute inset-0 pointer-events-none">
                          <circle cx={CTR} cy={CTR} r={CTR - 4} fill="none" stroke="rgba(139,92,246,0.10)" strokeWidth="1" />
                          <circle cx={CTR} cy={CTR} r={44} fill="none" stroke="rgba(139,92,246,0.12)" strokeWidth="1" />
                          {/* Fixed indicator notch at 12 o'clock */}
                          <polygon points={`${CTR},10 ${CTR-5},20 ${CTR+5},20`} fill="rgba(167,139,250,0.6)" />
                        </svg>

                        {/* Rotating layer: ticks + dots */}
                        <div className="absolute inset-0 pointer-events-none"
                          style={{ transform: `rotate(${dialRotation}deg)`, transition: dialSnapping ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', transformOrigin: `${CTR}px ${CTR}px` }}>
                          {/* Ticks SVG */}
                          <svg width={DIAL} height={DIAL} className="absolute inset-0">
                            {ticks.map((t, i) => (
                              <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
                                stroke={t.long ? 'rgba(139,92,246,0.4)' : 'rgba(139,92,246,0.15)'}
                                strokeWidth={t.long ? '1.5' : '0.8'} strokeLinecap="round" />
                            ))}
                          </svg>
                        </div>

                        {/* Rotating community dots — pointer-events ON */}
                        <div className="absolute inset-0"
                          style={{ transform: `rotate(${dialRotation}deg)`, transition: dialSnapping ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', transformOrigin: `${CTR}px ${CTR}px` }}>
                          {dots.map((c, idx) => {
                            const isSelected = sel?.id === c.id
                            return (
                              <button key={c.id}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => { e.stopPropagation(); snapTo(idx) }}
                                style={{ left: c.x, top: c.y, width: DOT, height: DOT, background: isSelected ? 'radial-gradient(circle,rgba(167,139,250,0.45)0%,rgba(109,40,217,0.2)100%)' : 'rgba(12,12,28,0.95)', border: `1.5px solid ${isSelected ? 'rgba(167,139,250,0.9)' : 'rgba(139,92,246,0.3)'}`, boxShadow: isSelected ? '0 0 18px rgba(167,139,250,0.6),0 0 40px rgba(139,92,246,0.25)' : 'none', zIndex: isSelected ? 10 : 1 }}
                                className="absolute rounded-full flex items-center justify-center transition-all duration-200 hover:border-violet-400/70 group/dot pointer-events-auto">
                                {/* Counter-rotate text */}
                                <span style={{ transform: `rotate(${-dialRotation}deg)`, transition: dialSnapping ? 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1)' : 'none', display: 'block' }}
                                  className={`text-xs font-semibold ${isSelected ? 'text-violet-100' : 'text-violet-500 group-hover/dot:text-violet-300'}`}>
                                  {c.name.charAt(0)}
                                </span>
                                {/* Tooltip */}
                                <span style={{ transform: `rotate(${-dialRotation}deg)` }} className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-violet-200 bg-slate-900/95 border border-violet-500/20 rounded-lg px-2 py-1 opacity-0 group-hover/dot:opacity-100 transition-opacity pointer-events-none z-20">{c.name}</span>
                              </button>
                            )
                          })}
                        </div>

                        {/* Fixed center knob */}
                        <div className="absolute rounded-full flex flex-col items-center justify-center pointer-events-none transition-all duration-400"
                          style={{ left: CTR - 42, top: CTR - 42, width: 84, height: 84, background: sel ? 'radial-gradient(circle,rgba(139,92,246,0.3)0%,rgba(109,40,217,0.08)100%)' : 'radial-gradient(circle,rgba(255,255,255,0.03)0%,transparent 100%)', border: `1px solid ${sel ? 'rgba(139,92,246,0.6)' : 'rgba(139,92,246,0.18)'}`, boxShadow: sel ? '0 0 28px rgba(139,92,246,0.35),inset 0 0 18px rgba(139,92,246,0.1)' : 'none' }}>
                          {sel
                            ? <><span className="text-2xl font-light text-violet-200 leading-none">{sel.name.charAt(0)}</span><span className="text-[8px] text-violet-400/60 mt-0.5 uppercase tracking-widest max-w-[70px] text-center truncate">{sel.name}</span></>
                            : <svg className="h-5 w-5 text-violet-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          }
                        </div>
                      </div>

                      {/* Counter + add button */}
                      <div className="flex items-center gap-3">
                        <p className="text-[10px] uppercase tracking-widest text-violet-500/30">
                          {sel ? `${communities.indexOf(communities.find(c => c.id === sel.id)) + 1} / ${communities.length}` : `${communities.length} comunidades`}
                        </p>
                        <button onClick={() => setNewCommOpen(true)} className="flex items-center gap-1 rounded-lg border border-dashed border-violet-500/25 px-2.5 py-1 text-[10px] text-violet-500/40 hover:text-violet-300 hover:border-violet-400/50 transition-all">
                          <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                          Nueva
                        </button>
                      </div>
                    </div>
                  )
                })()}

                {/* ── INFO PANEL ── */}
                <div className="flex-1 w-full min-w-0 max-h-[70vh] overflow-y-auto pr-1">
                  {!sel ? (
                    <div className="flex flex-col items-center justify-center h-full min-h-[200px] gap-3 text-center">
                      <div className="h-12 w-12 rounded-2xl border border-violet-500/15 flex items-center justify-center">
                        <svg className="h-6 w-6 text-violet-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
                      </div>
                      <p className="text-[12px] text-slate-600">Toca una comunidad<br/>en el dial para gestionar</p>
                      <button onClick={() => setNewCommOpen(true)} className="mt-2 flex items-center gap-1.5 rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-4 py-2 text-xs text-violet-500 hover:text-violet-300 hover:border-violet-400/40 transition-all">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        Nueva comunidad
                      </button>
                    </div>
                  ) : dialDetailLoading ? (
                    <div className="flex items-center justify-center py-16"><div className="h-6 w-6 rounded-full border-t border-violet-400 animate-spin" /></div>
                  ) : (
                    <div className="space-y-3">

                      {/* ── HEADER CARD ── */}
                      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent p-4">
                        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
                        <div className="flex items-start justify-between flex-wrap gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500/25 to-purple-500/25 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                              <span className="text-lg text-violet-300 font-light">{sel.name.charAt(0)}</span>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-white leading-tight">{sel.name}</p>
                              <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-full border ${statusColor[sel.status]}`}>{statusLabel[sel.status]}</span>
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            <button onClick={() => { setDialEditMode(e => !e); setDialEditForm(dialDetail || sel) }} className={`rounded-lg border px-3 py-1.5 text-[10px] transition-all ${dialEditMode ? 'border-cyan-500/40 bg-cyan-500/15 text-cyan-400' : 'border-slate-700/50 bg-white/[0.02] text-slate-500 hover:text-violet-400 hover:border-violet-500/30'}`}>
                              {dialEditMode ? 'Cancelar' : 'Editar'}
                            </button>
                            <button onClick={() => setDeleteConfirmComm(sel)} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-500/20 transition-all">Eliminar</button>
                          </div>
                        </div>

                        {/* ── VIEW / EDIT FIELDS ── */}
                        {dialEditMode ? (
                          <div className="space-y-2">
                            {[['Nombre', 'name', 'text'], ['Contacto', 'contact_name', 'text'], ['Teléfono', 'phone', 'tel'], ['Email', 'email', 'email'], ['Dirección', 'address', 'text']].map(([l, k, t]) => (
                              <div key={k} className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-600 w-16 flex-shrink-0">{l}</span>
                                <input type={t} value={dialEditForm[k] || ''} onChange={e => setDialEditForm(p => ({ ...p, [k]: e.target.value }))} className="flex-1 rounded-lg border border-slate-700/50 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-violet-500/40 focus:outline-none transition-all" />
                              </div>
                            ))}
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-600 w-16 flex-shrink-0">Personas</span>
                              <input type="number" min="1" value={dialEditForm.members || 1} onChange={e => setDialEditForm(p => ({ ...p, members: parseInt(e.target.value) || 1 }))} className="w-24 rounded-lg border border-slate-700/50 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-violet-500/40 focus:outline-none transition-all" />
                              <select value={dialEditForm.status || 'activo'} onChange={e => setDialEditForm(p => ({ ...p, status: e.target.value }))} className="flex-1 rounded-lg border border-slate-700/50 bg-[#040c1a] px-3 py-1.5 text-xs text-white focus:border-violet-500/40 focus:outline-none transition-all">
                                <option value="activo">Activo</option><option value="vip">VIP</option><option value="inactivo">Inactivo</option>
                              </select>
                            </div>
                            <div className="flex items-start gap-2">
                              <span className="text-[10px] text-slate-600 w-16 flex-shrink-0 mt-1.5">Notas</span>
                              <textarea value={dialEditForm.notes || ''} onChange={e => setDialEditForm(p => ({ ...p, notes: e.target.value }))} rows={2} className="flex-1 rounded-lg border border-slate-700/50 bg-white/[0.03] px-3 py-1.5 text-xs text-white focus:border-violet-500/40 focus:outline-none transition-all resize-none" />
                            </div>
                            <button onClick={async () => {
                              setCommSaving(true)
                              try {
                                const r = await fetch(`${BASE}/communities/?id=${sel.id}`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dialEditForm) })
                                const d = await r.json()
                                if (d.success) {
                                  await loadCommunities()
                                  const r2 = await fetch(`${BASE}/communities/?id=${sel.id}`, { credentials: 'include' })
                                  const d2 = await r2.json()
                                  if (d2.success) { setDialDetail(d2.community); setDialSelected(d2.community) }
                                  setDialEditMode(false)
                                }
                              } catch(e) { console.error(e) } finally { setCommSaving(false) }
                            }} disabled={commSaving} className="w-full rounded-xl border border-violet-500/30 bg-violet-500/10 py-2 text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-40">
                              {commSaving ? 'Guardando...' : 'Guardar cambios'}
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-1 text-xs text-slate-500">
                            {sel.contact_name && <div className="flex gap-2"><span className="text-slate-700 w-16">Contacto</span><span className="text-slate-300">{sel.contact_name}</span></div>}
                            {sel.phone && <div className="flex gap-2"><span className="text-slate-700 w-16">Teléfono</span><a href={`tel:${sel.phone}`} className="text-violet-400 hover:text-violet-300 transition-colors">{sel.phone}</a></div>}
                            {sel.email && <div className="flex gap-2"><span className="text-slate-700 w-16">Email</span><a href={`mailto:${sel.email}`} className="text-slate-300 hover:text-violet-400 transition-colors">{sel.email}</a></div>}
                            {sel.address && <div className="flex gap-2"><span className="text-slate-700 w-16">Dirección</span><span className="text-slate-300">{sel.address}</span></div>}
                          </div>
                        )}
                      </div>

                      {/* ── STATS ── */}
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { l: 'Visitas', v: dialDetail?.total_visits || sel.total_visits || 0 },
                          { l: 'Personas', v: dialEditForm.members || sel.members },
                          { l: 'Gastado', v: fmt(dialDetail?.total_spent || sel.total_spent || 0) },
                        ].map((s, i) => (
                          <div key={i} className="rounded-xl border border-slate-700/30 bg-white/[0.02] p-3 text-center">
                            <p className="text-[10px] text-slate-600 mb-1">{s.l}</p>
                            <p className="text-sm font-light text-violet-400 tabular-nums">{s.v}</p>
                          </div>
                        ))}
                      </div>

                      {/* ── VISITS ── */}
                      {(dialDetail?.visits || []).length > 0 && (
                        <div className="rounded-2xl border border-slate-700/30 bg-white/[0.02] p-4">
                          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Últimas visitas</p>
                          <div className="space-y-2">
                            {(dialDetail.visits || []).slice(0, 5).map((v, i) => (
                              <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/[0.04] last:border-0">
                                <div>
                                  <p className="text-xs text-slate-300">{v.occasion || 'Visita'}</p>
                                  <p className="text-[10px] text-slate-600">{fmtDate(v.visit_date)} · {v.guests} pers.</p>
                                </div>
                                <span className="text-sm font-light text-green-400 tabular-nums">{fmt(v.total_spent)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── NOTES ── */}
                      <div className="rounded-2xl border border-slate-700/30 bg-white/[0.02] p-4">
                        <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Notas</p>
                        {dialDetail?.notes && <p className="text-xs text-slate-400 mb-3 pb-3 border-b border-white/[0.04]">{dialDetail.notes}</p>}
                        {(dialDetail?.notes_list || []).length === 0 && !dialDetail?.notes && (
                          <p className="text-[11px] text-slate-700 mb-3">Sin notas aún</p>
                        )}
                        {(dialDetail?.notes_list || []).map(n => (
                          <div key={n.id} className="group flex items-start gap-2 py-1.5 border-b border-white/[0.03] last:border-0">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                            <p className="text-[11px] text-slate-400 flex-1 leading-relaxed">{n.content}</p>
                            <button onClick={async () => {
                              await deleteNote(n.id)
                              setDialDetail(p => p ? { ...p, notes_list: (p.notes_list || []).filter(x => x.id !== n.id) } : p)
                            }} className="opacity-0 group-hover:opacity-100 flex-shrink-0 transition-opacity text-red-400/50 hover:text-red-400 mt-0.5">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </div>
                        ))}
                        <div className="flex gap-2 mt-3">
                          <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)}
                            onKeyDown={async e => {
                              if (e.key !== 'Enter' || !newNote.trim() || noteSaving) return
                              setNoteSaving(true)
                              try {
                                const r = await fetch(`${BASE}/communities/notes.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community_id: sel.id, content: newNote.trim() }) })
                                const d = await r.json()
                                if (d.success) {
                                  const nn = { id: d.id, content: newNote.trim(), created_at: new Date().toISOString() }
                                  setDialDetail(p => p ? { ...p, notes_list: [nn, ...(p.notes_list || [])] } : p)
                                  setNewNote('')
                                }
                              } catch(ex) { console.error(ex) } finally { setNoteSaving(false) }
                            }}
                            placeholder="Nueva nota… (Enter para guardar)"
                            className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-xs text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all" />
                          <button disabled={!newNote.trim() || noteSaving} onClick={async () => {
                            if (!newNote.trim() || noteSaving) return
                            setNoteSaving(true)
                            try {
                              const r = await fetch(`${BASE}/communities/notes.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ community_id: sel.id, content: newNote.trim() }) })
                              const d = await r.json()
                              if (d.success) {
                                const nn = { id: d.id, content: newNote.trim(), created_at: new Date().toISOString() }
                                setDialDetail(p => p ? { ...p, notes_list: [nn, ...(p.notes_list || [])] } : p)
                                setNewNote('')
                              }
                            } catch(ex) { console.error(ex) } finally { setNoteSaving(false) }
                          }} className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-3 py-2 text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-40">
                            {noteSaving ? '…' : '+'}
                          </button>
                        </div>
                      </div>

                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>
      ) : (
        <div style={commDetailStyle()} className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={closeCommunity} className="flex items-center gap-1.5 rounded-xl border border-slate-700/50 bg-white/[0.02] px-3 py-2 text-xs text-slate-500 hover:text-violet-400 hover:border-violet-500/30 transition-all">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              Comunidades
            </button>
            <span className="text-slate-700">·</span>
            <span className="text-sm text-slate-400">{communityDetail.name}</span>
          </div>
          <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/8 to-transparent p-6">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-violet-500/25 to-purple-500/25 border border-violet-500/30 flex items-center justify-center flex-shrink-0"><span className="text-xl sm:text-2xl text-violet-300 font-light">{communityDetail.name.charAt(0)}</span></div>
                <div>
                  <h3 className="text-lg sm:text-xl font-light text-white">{communityDetail.name}</h3>
                  <p className="text-sm text-slate-500">{communityDetail.contact}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusColor[communityDetail.status]}`}>{statusLabel[communityDetail.status]}</span>
                    {communityDetail.phone && <a href={`tel:${communityDetail.phone}`} className="text-[11px] text-slate-600 hover:text-violet-400 transition-colors">{communityDetail.phone}</a>}
                  </div>
                </div>
              </div>
              <button onClick={() => setEditComm({ ...communityDetail })} className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs text-violet-400 hover:bg-violet-500/20 transition-all">Editar perfil</button>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { l: 'Visitas totales', v: communityDetail.total_visits || 0, c: 'text-violet-400' },
              { l: 'Personas', v: communityDetail.members, c: 'text-violet-400' },
              { l: 'Total gastado', v: fmt(communityDetail.total_spent || 0), c: 'text-green-400' },
              { l: 'Última visita', v: fmtDate(communityDetail.last_visit), c: 'text-slate-300' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl border border-slate-700/30 bg-white/[0.02] p-4">
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-1.5">{s.l}</p>
                <p className={`text-lg font-light tabular-nums ${s.c}`}>{s.v}</p>
              </div>
            ))}
          </div>
          {(communityDetail.visits || []).length > 0 && (
            <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Últimas visitas</p>
              <div className="space-y-2">
                {(communityDetail.visits || []).slice(0, 4).map((v, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                    <div><p className="text-xs text-slate-300">{v.occasion || 'Visita'}</p><p className="text-[10px] text-slate-600">{fmtDate(v.visit_date)} · {v.guests} personas</p></div>
                    <span className="text-sm font-light text-green-400 tabular-nums">{fmt(v.total_spent)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
            <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-3">Notas</p>
            {communityDetail.notes && <p className="text-sm text-slate-400 mb-4">{communityDetail.notes}</p>}
            {(communityDetail.notes_list || []).map((n) => (
              <div key={n.id} className="group flex items-start gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-violet-400 mt-1.5 flex-shrink-0" />
                <p className="text-[12px] text-slate-500 flex-1">{n.content}</p>
                <button onClick={() => deleteNote(n.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400/50 hover:text-red-400"><svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            ))}
            {(communityDetail.notes_list || []).length === 0 && !communityDetail.notes && <p className="text-[11px] text-slate-700 mb-3">Sin notas aún</p>}
            <div className="flex gap-2 mt-4">
              <input type="text" value={newNote} onChange={e => setNewNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addNote()} placeholder="Agregar nota..." className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.03] px-3 py-2 text-sm text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all" />
              <button onClick={addNote} disabled={noteSaving} className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-50">{noteSaving ? '...' : 'Agregar'}</button>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Link to="/admin/applications" className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">Ver solicitudes</Link>
            <Link to="/admin/quotes" className="rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-xs text-blue-400 hover:bg-blue-500/20 transition-all">Ver cotizaciones</Link>
            <Link to="/admin/calendar" className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-2 text-xs text-violet-400 hover:bg-violet-500/20 transition-all">Agendar visita</Link>
          </div>
        </div>
      )}
      {editComm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-md rounded-2xl border border-violet-500/20 bg-[#040c1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent rounded-t-2xl" />
            <h3 className="text-base font-light text-white mb-5">Editar Comunidad</h3>
            <div className="space-y-3">
              {[['Nombre', 'name', 'text'], ['Contacto', 'contact_name', 'text'], ['Teléfono', 'phone', 'tel'], ['Email', 'email', 'email'], ['Personas', 'members', 'number']].map(([l, k, t]) => (
                <div key={k}><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{l}</label><input type={t} value={editComm[k] || ''} onChange={e => setEditComm(p => ({ ...p, [k]: t === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all" /></div>
              ))}
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Estado</label><select value={editComm.status} onChange={e => setEditComm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-4 py-2.5 text-sm text-white focus:border-violet-500/40 focus:outline-none transition-all"><option value="activo">Activo</option><option value="vip">VIP</option><option value="inactivo">Inactivo</option></select></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas</label><textarea value={editComm.notes || ''} onChange={e => setEditComm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all resize-none" /></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => setEditComm(null)} className="flex-1 rounded-xl border border-slate-700/50 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button><button onClick={saveCommEdit} disabled={commSaving} className="flex-1 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-50">{commSaving ? 'Guardando...' : 'Guardar'}</button></div>
          </div>
        </div>
      )}

      {/* Modal: nueva comunidad */}
      {newCommOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-md rounded-2xl border border-violet-500/20 bg-[#040c1a] p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent rounded-t-2xl" />
            <h3 className="text-base font-light text-white mb-5">Nueva Comunidad</h3>
            <div className="space-y-3">
              {[['Nombre *', 'name', 'text'], ['Contacto', 'contact_name', 'text'], ['Teléfono', 'phone', 'tel'], ['Email', 'email', 'email'], ['Dirección', 'address', 'text']].map(([l, k, t]) => (
                <div key={k}><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">{l}</label><input type={t} value={newCommForm[k] || ''} onChange={e => setNewCommForm(p => ({ ...p, [k]: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all" /></div>
              ))}
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Personas</label><input type="number" min="1" value={newCommForm.members} onChange={e => setNewCommForm(p => ({ ...p, members: parseInt(e.target.value) || 1 }))} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white focus:border-violet-500/40 focus:outline-none transition-all" /></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Estado</label><select value={newCommForm.status} onChange={e => setNewCommForm(p => ({ ...p, status: e.target.value }))} className="w-full rounded-xl border border-slate-700/50 bg-[#040c1a] px-4 py-2.5 text-sm text-white focus:border-violet-500/40 focus:outline-none transition-all"><option value="activo">Activo</option><option value="vip">VIP</option><option value="inactivo">Inactivo</option></select></div>
              <div><label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1">Notas</label><textarea value={newCommForm.notes} onChange={e => setNewCommForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-violet-500/40 focus:outline-none transition-all resize-none" /></div>
            </div>
            <div className="flex gap-2 mt-6"><button onClick={() => { setNewCommOpen(false); setNewCommForm(EMPTY_COMM_FORM) }} className="flex-1 rounded-xl border border-slate-700/50 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button><button onClick={createCommunity} disabled={!newCommForm.name.trim() || commSaving} className="flex-1 rounded-xl border border-violet-500/30 bg-violet-500/10 py-2.5 text-xs text-violet-400 hover:bg-violet-500/20 transition-all disabled:opacity-40">{commSaving ? 'Creando...' : 'Crear comunidad'}</button></div>
          </div>
        </div>
      )}

      {/* Modal: confirmar eliminar */}
      {deleteConfirmComm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.65)' }}>
          <div className="relative w-full max-w-xs rounded-2xl border border-red-500/20 bg-[#040c1a] p-6 shadow-2xl">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
            <p className="text-sm font-medium text-white mb-1">¿Eliminar comunidad?</p>
            <p className="text-[11px] text-slate-500 mb-1"><span className="text-slate-300">{deleteConfirmComm.name}</span></p>
            <p className="text-[11px] text-slate-600 mb-5">Se eliminarán también sus visitas, notas y reportes. Esta acción no se puede deshacer.</p>
            <div className="flex gap-2"><button onClick={() => setDeleteConfirmComm(null)} className="flex-1 rounded-xl border border-slate-700/50 py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button><button onClick={() => deleteCommunity(deleteConfirmComm.id)} className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition-all">Sí, eliminar</button></div>
          </div>
        </div>
      )}
    </div>
  )

  // ── EMPLOYEES ─────────────────────────────────────────────────────────────
  if (view === 'employees') return (
    <div style={panelStyle()} className="space-y-4">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3"><div><p className="text-[9px] uppercase tracking-[0.4em] text-emerald-500/30 mb-1">Personal</p><h2 className="text-base sm:text-lg font-light text-white">Empleados & RRHH</h2><p className="text-xs text-slate-600 hidden sm:block">Gestión de personal y solicitudes</p></div><BackBtn /></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {[
          { l: 'Total solicitudes', v: dashData?.stats?.totalApplications || 0, c: 'text-emerald-400', b: 'border-emerald-500/20' },
          { l: 'Pendientes', v: dashData?.stats?.pendingApplications || 0, c: 'text-orange-400', b: 'border-orange-500/20' },
          { l: 'Aprobadas', v: (dashData?.stats?.totalApplications || 0) - (dashData?.stats?.pendingApplications || 0), c: 'text-green-400', b: 'border-green-500/20' },
        ].map((s, i) => <div key={i} className={`rounded-2xl border ${s.b} bg-white/[0.02] p-4 sm:p-5`}><p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">{s.l}</p><p className={`text-2xl sm:text-3xl font-light tabular-nums ${s.c}`}>{s.v}</p></div>)}
      </div>
      <div className="rounded-2xl border border-emerald-500/15 bg-gradient-to-br from-emerald-500/5 to-transparent p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-600">Acceso rápido</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/applications" className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400 hover:bg-emerald-500/20 transition-all">Ver todas las solicitudes<svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></Link>
          <Link to="/admin/employees" className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-white/[0.02] px-4 py-3 text-sm text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30 transition-all">Expedientes de personal<svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></Link>
        </div>
      </div>
    </div>
  )

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  if (view === 'analytics') return (
    <div style={panelStyle()} className="space-y-4">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-3"><div><p className="text-[9px] uppercase tracking-[0.4em] text-blue-500/30 mb-1">Analítica</p><h2 className="text-base sm:text-lg font-light text-white">Estadísticas & Métricas</h2><p className="text-xs text-slate-600 hidden sm:block">Datos en tiempo real del sitio y operaciones</p></div><BackBtn /></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { l: 'Visitantes hoy', v: siteStats?.today_views || 0, c: 'text-blue-400', b: 'border-blue-500/20' },
          { l: 'Activos ahora', v: siteStats?.active_now || 0, c: 'text-cyan-400', b: 'border-cyan-500/20' },
          { l: 'Únicos hoy', v: siteStats?.today_unique || 0, c: 'text-teal-400', b: 'border-teal-500/20' },
          { l: 'Cotizaciones', v: quotesStats?.total_quotes || 0, c: 'text-amber-400', b: 'border-amber-500/20' },
        ].map((s, i) => <div key={i} className={`rounded-2xl border ${s.b} bg-white/[0.02] p-4 sm:p-5`}><p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">{s.l}</p><p className={`text-2xl sm:text-3xl font-light tabular-nums ${s.c}`}>{s.v}</p></div>)}
      </div>
      <div className="rounded-2xl border border-blue-500/15 bg-gradient-to-br from-blue-500/5 to-transparent p-6 space-y-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-600">Acceso rápido</p>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/analytics" className="flex items-center gap-2 rounded-xl border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-400 hover:bg-blue-500/20 transition-all">Ver analytics completo<svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></Link>
          <Link to="/admin/tracking" className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-white/[0.02] px-4 py-3 text-sm text-slate-400 hover:text-blue-400 hover:border-blue-500/30 transition-all">Tracking de usuarios<svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></Link>
          <Link to="/admin/quotes" className="flex items-center gap-2 rounded-xl border border-slate-700/50 bg-white/[0.02] px-4 py-3 text-sm text-slate-400 hover:text-amber-400 hover:border-amber-500/30 transition-all">Cotizaciones<svg className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg></Link>
        </div>
      </div>
    </div>
  )

  return null
}
