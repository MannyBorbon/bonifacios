import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { analyticsAPI, siteAnalyticsAPI, quotesAPI, userStatusAPI } from '../../services/api'
import SalesWidget from '../../components/SalesWidget'

/* ── animated counter hook ── */
function useCounter(target, duration = 900) {
  const [val, setVal] = useState(0)
  const prev = useRef(0)
  useEffect(() => {
    const start = prev.current
    const diff = target - start
    if (diff === 0) return
    const step = 16
    const steps = Math.ceil(duration / step)
    let i = 0
    const timer = setInterval(() => {
      i++
      const progress = i / steps
      const ease = 1 - Math.pow(1 - progress, 3)
      setVal(Math.round(start + diff * ease))
      if (i >= steps) { clearInterval(timer); prev.current = target }
    }, step)
    return () => clearInterval(timer)
  }, [target, duration])
  return val
}

/* ── Stat card with glowing border ── */
function StatCard({ label, value, color, sub, to, pulse }) {
  const displayed = useCounter(typeof value === 'number' ? value : 0)
  const colorMap = {
    cyan:   { border: 'border-cyan-400/70',   bg: 'bg-cyan-500/20',   text: 'text-cyan-200',   glow: 'shadow-cyan-500/30',  dot: 'bg-cyan-400'   },
    blue:   { border: 'border-blue-400/70',   bg: 'bg-blue-500/20',   text: 'text-blue-200',   glow: 'shadow-blue-500/30',  dot: 'bg-blue-400'   },
    green:  { border: 'border-green-400/70',  bg: 'bg-green-500/20',  text: 'text-green-200',  glow: 'shadow-green-500/30', dot: 'bg-green-400'  },
    orange: { border: 'border-orange-400/70', bg: 'bg-orange-500/20', text: 'text-orange-200', glow: 'shadow-orange-500/30',dot: 'bg-orange-400' },
    purple: { border: 'border-purple-400/70', bg: 'bg-purple-500/20', text: 'text-purple-200', glow: 'shadow-purple-500/30',dot: 'bg-purple-400' },
    amber:  { border: 'border-amber-400/70',  bg: 'bg-amber-500/20',  text: 'text-amber-200',  glow: 'shadow-amber-500/30', dot: 'bg-amber-400'  },
  }
  const c = colorMap[color] || colorMap.cyan
  const Inner = (
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-3 sm:p-4 shadow-lg ${c.glow} hover:scale-[1.03] active:scale-[0.98] hover:shadow-xl transition-all duration-300 cursor-pointer h-full min-w-0 touch-manipulation`}>
      {/* top shimmer line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40`} />
      {/* glow corner */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${c.bg} blur-xl opacity-60`} />
      <div className="flex items-start justify-between mb-3">
        <p className={`text-[10px] uppercase tracking-[0.3em] ${c.text} font-semibold`}>{label}</p>
        {pulse && <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse flex-shrink-0 mt-0.5`} />}
      </div>
      <p className={`text-2xl sm:text-3xl font-extralight tabular-nums break-all leading-tight ${c.text}`} style={{ textShadow: `0 0 20px currentColor` }}>
        {typeof value === 'number' ? displayed : value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5 break-words leading-relaxed">{sub}</p>}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
  return to ? <Link to={to}>{Inner}</Link> : Inner
}

export default function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  const isManuel = user.username?.toLowerCase() === 'manuel'
  const isMisael = user.username?.toLowerCase() === 'misael'

  const [clock, setClock] = useState(new Date())
  const [dashData, setDashData] = useState(null)
  const [siteStats, setSiteStats] = useState(null)
  const [quotesStats, setQuotesStats] = useState(null)
  const [onsite, setOnsite] = useState(false)
  const [onsiteLoading, setOnsiteLoading] = useState(false)
  const [_onsiteUpdatedAt, setOnsiteUpdatedAt] = useState(null)
  const [unread, setUnread] = useState(0)
  const [inbox, setInbox] = useState([])
  const [applications, setApplications] = useState([])
  const [employees, setEmployees] = useState([])
  const [trackingData, setTrackingData] = useState([])
  const [communities, setCommunities] = useState([])
  const [scheduleAbsences, setScheduleAbsences] = useState({ missing_count: 0, missing: [] })
  const [loading, setLoading] = useState(true)
  const [scanPos, setScanPos] = useState(0)
  const [opIndicators, setOpIndicators] = useState([])
  const [dailyOpsReport, setDailyOpsReport] = useState(null)
  const [dailyReportDate, setDailyReportDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [opLoading, setOpLoading] = useState(false)
  const [newIndicator, setNewIndicator] = useState({ title: '', description: '', due_time: '' })
  const [pendingQuotesList, setPendingQuotesList] = useState([])

  /* ── live clock ── */
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  /* ── scanning line anim ── */
  useEffect(() => {
    const t = setInterval(() => setScanPos(p => (p + 0.4) % 100), 30)
    return () => clearInterval(t)
  }, [])

  /* ── load all data ── */
  useEffect(() => {
    loadAll()
  }, []) // eslint-disable-line

  const loadAll = async () => {
    setLoading(true)
    await Promise.allSettled([
      loadDash(), loadSite(), loadQuotes(), loadOnsite(),
      loadUnread(), loadInbox(), loadApplications(), loadEmployees(), loadTracking(), loadCommunities(), loadScheduleAbsences(),
      loadOperationalIndicators(), loadDailyOpsReport()
    ])
    setLoading(false)
  }

  const refreshAll = async () => {
    await Promise.allSettled([
      loadDash(), loadSite(), loadQuotes(), loadOnsite(),
      loadUnread(), loadInbox(), loadApplications(), loadEmployees(), loadTracking(), loadCommunities(), loadScheduleAbsences(),
      loadOperationalIndicators(), loadDailyOpsReport()
    ])
  }

  const loadDash = async () => {
    try { const r = await analyticsAPI.getDashboard(7); setDashData(r.data) } catch { /* silent */ }
  }
  const loadSite = async () => {
    try { const r = await siteAnalyticsAPI.getStats(7); if (r.data.success) setSiteStats(r.data.stats) } catch { /* silent */ }
  }
  const loadQuotes = async () => {
    try {
      const r = await quotesAPI.getQuotes()
      if (r.data.success) {
        setQuotesStats(r.data.stats)
        setPendingQuotesList(Array.isArray(r.data.quotes) ? r.data.quotes.filter((q) => String(q.status || '').toLowerCase() === 'pending') : [])
      }
    } catch { /* silent */ }
  }
  const loadOnsite = async () => {
    try { const r = await userStatusAPI.getOnsiteStatus(); if (r.data.success) { setOnsite(r.data.onsite); setOnsiteUpdatedAt(r.data.updated_at) } } catch { /* silent */ }
  }
  const loadUnread = async () => {
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/chat/notifications.php`, { credentials: 'include' }); const d = await r.json(); if (d.success) setUnread((d.unread_chat || 0) + (d.unread_emails || 0)) } catch { /* silent */ }
  }
  const loadInbox = async () => {
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/email/inbox.php`, { credentials: 'include' }); const d = await r.json(); if (d.success) setInbox(Array.isArray(d.emails) ? d.emails.slice(0, 4) : []) } catch { /* silent */ }
  }
  const loadApplications = async () => {
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/applications/list.php`, { credentials: 'include' }); const d = await r.json(); if (d.success) setApplications(Array.isArray(d.applications) ? d.applications.slice(0, 5) : []) } catch { /* silent */ }
  }
  const loadEmployees = async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/employees/list.php`, { credentials: 'include' })
      const d = await r.json()
      const arr = Array.isArray(d) ? d : (Array.isArray(d.data) ? d.data : (Array.isArray(d.employees) ? d.employees : []))
      setEmployees(arr)
    } catch { /* silent */ }
  }
  const loadTracking = async () => {
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/tracking/recent-activity.php`, { credentials: 'include' }); const d = await r.json(); if (d.success) setTrackingData(Array.isArray(d.data) ? d.data.slice(0, 6) : []) } catch { /* silent */ }
  }
  const loadCommunities = async () => {
    try { const r = await fetch(`${import.meta.env.VITE_API_URL}/communities/`, { credentials: 'include' }); const d = await r.json(); if (d.success) setCommunities(Array.isArray(d.communities) ? d.communities : []) } catch { /* silent */ }
  }
  const loadScheduleAbsences = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const r = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=expected_absences&date=${today}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setScheduleAbsences({ missing_count: d.missing_count || 0, missing: Array.isArray(d.missing) ? d.missing : [] })
    } catch {
      /* silent */
    }
  }
  const loadOperationalIndicators = async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const r = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/operational-checklist.php?date=${today}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setOpIndicators(Array.isArray(d.indicators) ? d.indicators : [])
    } catch {
      /* silent */
    }
  }
  const loadDailyOpsReport = async () => {
    try {
      const r = await fetch(`${import.meta.env.VITE_API_URL}/dashboard/operational-checklist.php?action=daily_report&date=${dailyReportDate}`, { credentials: 'include' })
      const d = await r.json()
      if (d.success) setDailyOpsReport(d)
    } catch {
      /* silent */
    }
  }
  const saveNewIndicator = async () => {
    if (!newIndicator.title.trim()) return
    setOpLoading(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/dashboard/operational-checklist.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_indicator', ...newIndicator }),
      })
      setNewIndicator({ title: '', description: '', due_time: '' })
      await loadOperationalIndicators()
    } finally {
      setOpLoading(false)
    }
  }
  const toggleIndicator = async (indicator, completed) => {
    setOpLoading(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/dashboard/operational-checklist.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_indicator', id: indicator.id, date: dailyReportDate, completed: completed ? 1 : 0 }),
      })
      await Promise.all([loadOperationalIndicators(), loadDailyOpsReport()])
    } finally {
      setOpLoading(false)
    }
  }
  const deleteIndicator = async (id) => {
    setOpLoading(true)
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/dashboard/operational-checklist.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete_indicator', id }),
      })
      await loadOperationalIndicators()
    } finally {
      setOpLoading(false)
    }
  }

  const toggleOnsite = async () => {
    setOnsiteLoading(true)
    try { const r = await userStatusAPI.setOnsiteStatus(!onsite); if (r.data.success) { setOnsite(r.data.onsite); setOnsiteUpdatedAt(r.data.updated_at) } } catch { /* silent */ }
    finally { setOnsiteLoading(false) }
  }

  const timeStr = clock.toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr = clock.toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const pending = dashData?.stats?.pendingApplications || 0
  const totalApps = dashData?.stats?.totalApplications || 0
  const totalUsers = dashData?.stats?.totalUsers || 0
  const totalEmps = employees.filter(e => e.status === 'active' || !e.status).length
  const pendingQuotes = quotesStats?.pending_quotes || 0
  const unreadInbox = inbox.filter(e => !e.seen).length
  const getQuoteElapsed = () => {
    const quote = pendingQuotesList[0]
    if (!quote) return null
    const rawDate = quote.created_at || quote.createdAt || quote.date || quote.event_date || null
    if (!rawDate) return null
    const createdTs = new Date(rawDate).getTime()
    if (Number.isNaN(createdTs)) return null
    const diffMs = Date.now() - createdTs
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours < 24) return `${diffHours}h`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ${diffHours % 24}h`
  }
  const quoteElapsed = getQuoteElapsed()
  const highPriorityAlerts = [
    { id: 'scheduled-missing', label: 'Programados sin ponche', value: scheduleAbsences.missing_count || 0, tone: 'rose', to: '/admin/employees' },
    { id: 'pending-apps', label: 'Solicitudes pendientes', value: pending, tone: 'orange', to: '/admin/applications' },
    { id: 'pending-quotes', label: 'Cotizaciones pendientes', value: pendingQuotes, tone: 'amber', to: '/admin/quotes', elapsed: quoteElapsed },
    { id: 'unread-messages', label: 'Mensajes/correos sin leer', value: unread, tone: 'blue', to: '/admin/messages' },
    { id: 'unread-inbox', label: 'Correos de inbox sin leer', value: unreadInbox, tone: 'cyan', to: '/admin/inbox' },
  ].filter((alert) => Number(alert.value || 0) > 0)
  const unresolvedCommunications = (unread || 0) + (unreadInbox || 0)
  useEffect(() => {
    loadDailyOpsReport()
  }, [dailyReportDate])

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <div className="relative h-24 w-24">
        <div className="absolute inset-0 rounded-full border border-cyan-400/20 animate-ping" style={{ animationDuration: '3s' }} />
        <div className="absolute inset-0 rounded-full border-t-2 border-cyan-400/60 animate-spin" style={{ animationDuration: '1.8s' }} />
        <div className="absolute inset-4 rounded-full border border-blue-400/30 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }} />
        <div className="absolute inset-8 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-400/20">
          <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
        </div>
      </div>
      <p className="text-cyan-400/60 text-[10px] tracking-[0.5em] uppercase animate-pulse">Iniciando Sistema...</p>
    </div>
  )

  return (
    <div className="relative space-y-4 sm:space-y-5 p-1 pb-[calc(env(safe-area-inset-bottom)+2rem)] overflow-hidden">

      {/* ── BACKGROUND: grid + scanning line ── */}
      <div className="pointer-events-none fixed inset-0 z-0" aria-hidden>
        <div style={{
          backgroundImage: 'linear-gradient(rgba(34,211,238,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,0.03) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} className="absolute inset-0" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/15 to-transparent transition-none"
          style={{ top: `${scanPos}%` }} />
      </div>

      {/* ── HEADER ── */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#030b18] via-[#040d1c] to-[#030b18] px-4 sm:px-5 py-3.5 sm:py-4 shadow-lg shadow-cyan-500/10 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
        {/* Left */}
        <div className="flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-full border-2 border-cyan-400/40 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <span className="text-cyan-300 font-semibold text-sm">{user.full_name?.charAt(0) || user.username?.charAt(0) || 'A'}</span>
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-400 border-2 border-[#030b18] animate-pulse" />
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.5em] text-cyan-400/50 font-medium">Control Center</p>
            <p className="text-base font-light text-white leading-tight">{user.full_name || user.username}</p>
            <p className="text-[10px] text-slate-500 mt-0.5 capitalize">{dateStr}</p>
          </div>
        </div>
        {/* Right: clock + onsite */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Clock */}
          <div className="text-right hidden sm:block">
            <p className="text-2xl font-mono font-light text-cyan-300 tabular-nums" style={{ textShadow: '0 0 20px rgba(34,211,238,0.5)' }}>{timeStr}</p>
          </div>
          {/* Manuel onsite */}
          {(isManuel || isMisael) && (
            <button
              onClick={isManuel ? toggleOnsite : loadOnsite}
              disabled={onsiteLoading}
              className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs font-medium transition-all duration-300 touch-manipulation min-h-[44px] ${
                onsite ? 'border-green-400/50 bg-green-500/12 text-green-300 shadow-green-500/20 shadow-md' : 'border-slate-600/50 bg-slate-700/20 text-slate-400'
              } ${onsiteLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105 active:scale-95'}`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${onsite ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              {isManuel ? (onsite ? 'En Sitio' : 'Fuera') : (onsite ? 'Manuel en sitio' : 'Manuel fuera')}
            </button>
          )}
        </div>
      </div>


      {/* ── STATS ROW ── */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        <StatCard label="Solicitudes Pendientes" value={pending} color="orange" pulse={pending > 0} sub="por revisar" to="/admin/applications" />
        <StatCard label="Total Solicitudes"      value={totalApps}   color="cyan"   sub={`${(totalApps - pending)} revisadas`} to="/admin/applications" />
        <StatCard label="Empleados Activos"      value={totalEmps}   color="green"  sub="en nómina" to="/admin/employees" />
        <StatCard label="Mensajes Sin Leer"      value={unread}      color="blue"   pulse={unread > 0} sub="chat + correo" to="/admin/messages" />
        <StatCard label="Cotizaciones"           value={quotesStats?.total_quotes || 0} color="purple" sub={`${quotesStats?.pending_quotes || 0} pendientes`} to="/admin/quotes" />
        <StatCard label="Visitantes Hoy"         value={siteStats?.today_views || 0}   color="amber"  sub={`${siteStats?.active_now || 0} ahora`} to="/admin/analytics" />
      </div>
      {/* ── LIVE VENTAS ── */}
      <div className="relative z-10">
        <SalesWidget />
      </div>

      {/* ── ALERTAS CRITICAS ── */}
      <div className="relative z-10 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1a1407]/40 to-[#050e1e] p-3.5 sm:p-4">
        <div className="mb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-400/60">Alertas criticas</p>
          <span className="text-[10px] text-slate-500">Priorizadas para accion inmediata</span>
        </div>
        {highPriorityAlerts.length === 0 ? (
          <p className="text-xs text-emerald-300/80">No hay alertas pendientes. Operacion estable.</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {highPriorityAlerts.map((alert) => (
              <Link key={alert.id} to={alert.to} className="rounded-xl border border-amber-400/20 bg-amber-500/5 px-3.5 py-3 sm:px-3 sm:py-2 text-xs text-slate-200 hover:bg-amber-500/10 active:bg-amber-500/15 transition-all touch-manipulation min-h-[44px]">
                <p className="text-[10px] uppercase tracking-wider text-amber-300/70">{alert.label}</p>
                <p className="mt-1 text-lg font-light text-amber-200">{alert.value}</p>
                {alert.id === 'pending-quotes' && alert.elapsed && <p className="mt-0.5 text-[10px] text-amber-100/80">Mas antigua: hace {alert.elapsed}</p>}
              </Link>
            ))}
          </div>
        )}
      </div>
      {scheduleAbsences.missing_count > 0 && (
        <div className="relative z-10 rounded-2xl border border-rose-500/20 bg-rose-500/5 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.35em] text-rose-200/70">Quien debe estar y no esta</p>
            <Link to="/admin/employees" className="text-[10px] text-rose-200/80 hover:text-rose-100">Ver horario</Link>
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {scheduleAbsences.missing.slice(0, 6).map((item, idx) => (
              <div key={`${item.employee_id}-${idx}`} className="rounded-xl border border-rose-500/25 bg-black/20 px-3 py-2">
                <p className="text-xs text-rose-100">{item.employee_name}</p>
                <p className="text-[10px] text-rose-200/70">Entrada {String(item.scheduled_start || '').slice(0, 5)} - Salida {String(item.scheduled_end || '').slice(0, 5)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── CHECKLIST + REPORTE DIARIO ── */}
      <div className="relative z-10 rounded-2xl border border-slate-700/40 bg-[#040c1a]/70 p-3.5 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-300/60">Checklist operativa</p>
          <button onClick={refreshAll} className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 sm:px-3 sm:py-1.5 text-xs text-cyan-200 hover:bg-cyan-500/20 active:bg-cyan-500/25 touch-manipulation min-h-[44px] sm:min-h-0">Actualizar</button>
        </div>
        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-4">
          <input value={newIndicator.title} onChange={(e) => setNewIndicator((prev) => ({ ...prev, title: e.target.value }))} placeholder="Nuevo indicador" className="rounded-xl border border-slate-700 bg-black/30 px-3 py-2.5 sm:py-2 text-xs text-white min-h-[44px]" />
          <input value={newIndicator.description} onChange={(e) => setNewIndicator((prev) => ({ ...prev, description: e.target.value }))} placeholder="Descripcion" className="rounded-xl border border-slate-700 bg-black/30 px-3 py-2.5 sm:py-2 text-xs text-white min-h-[44px]" />
          <input type="time" value={newIndicator.due_time} onChange={(e) => setNewIndicator((prev) => ({ ...prev, due_time: e.target.value }))} className="rounded-xl border border-slate-700 bg-black/30 px-3 py-2.5 sm:py-2 text-xs text-white min-h-[44px]" />
          <button onClick={saveNewIndicator} disabled={opLoading} className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 sm:py-2 text-xs text-emerald-200 disabled:opacity-60 touch-manipulation min-h-[44px] active:bg-emerald-500/20">Agregar indicador</button>
        </div>
        <div className="space-y-2">
          {opIndicators.map((indicator) => (
            <div key={indicator.id} className="flex flex-col sm:flex-row sm:items-center gap-2 rounded-xl border border-slate-800 bg-black/20 px-3 py-3 sm:py-2.5">
              <button onClick={() => toggleIndicator(indicator, !indicator.completed)} className={`h-7 w-7 sm:h-5 sm:w-5 rounded-lg sm:rounded border flex-shrink-0 touch-manipulation ${indicator.completed ? 'border-emerald-400 bg-emerald-500/30' : 'border-slate-600 bg-transparent'}`} aria-label="toggle indicator" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate">{indicator.title}</p>
                <p className="text-[10px] text-slate-500 truncate">{indicator.description || 'Sin descripcion'} • Limite {indicator.due_time || '--:--'}</p>
              </div>
              <span className={`rounded-full px-2 py-1 text-[10px] self-start sm:self-auto ${indicator.status_color === 'green' ? 'bg-emerald-500/15 text-emerald-200 border border-emerald-500/30' : indicator.status_color === 'yellow' ? 'bg-amber-500/15 text-amber-200 border border-amber-500/30' : 'bg-rose-500/15 text-rose-200 border border-rose-500/30'}`}>
                {indicator.status_color === 'green' ? 'Cumplido' : indicator.status_color === 'yellow' ? 'Retrasado' : 'Incumplido'}
              </span>
              <button onClick={() => deleteIndicator(indicator.id)} className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 sm:px-2 sm:py-1 text-[10px] text-rose-200 touch-manipulation min-h-[36px] active:bg-rose-500/20">Eliminar</button>
            </div>
          ))}
        </div>
        <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.35em] text-indigo-300/70">Reporte diario automatico</p>
            <input type="date" value={dailyReportDate} onChange={(e) => setDailyReportDate(e.target.value)} className="rounded-lg border border-slate-700 bg-black/30 px-2 py-1 text-[10px] text-slate-200" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <div className="rounded-lg border border-slate-700/40 bg-black/20 px-2.5 py-2"><p className="text-[9px] text-slate-500">Indicadores</p><p className="text-sm text-white">{dailyOpsReport?.operations?.total_indicators ?? 0}</p></div>
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2"><p className="text-[9px] text-emerald-300/70">Cumplidos</p><p className="text-sm text-emerald-100">{dailyOpsReport?.operations?.completed_count ?? 0}</p></div>
            <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2"><p className="text-[9px] text-cyan-300/70">Cumplimiento %</p><p className="text-sm text-cyan-100">{dailyOpsReport?.operations?.compliance_pct ?? 0}%</p></div>
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-2"><p className="text-[9px] text-amber-300/70">Venta del dia</p><p className="text-sm text-amber-100">${Number(dailyOpsReport?.sales?.total_sales || 0).toLocaleString('es-MX')}</p></div>
            <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-2.5 py-2"><p className="text-[9px] text-violet-300/70">Tickets</p><p className="text-sm text-violet-100">{dailyOpsReport?.sales?.tickets ?? 0}</p></div>
          </div>
        </div>
      </div>

      {/* ── NAVEGACION MOVIL MEJORADA ── */}
      <div className="relative z-10 rounded-2xl border border-slate-700/40 bg-[#040c1a]/70 p-3">
        <p className="mb-2 text-[10px] uppercase tracking-[0.35em] text-blue-300/60">Navegacion rapida</p>
        <div className="flex gap-2 overflow-x-auto pb-1 overscroll-x-contain snap-x snap-mandatory sm:snap-none">
          {[
            { label: 'Solicitudes', to: '/admin/applications' },
            { label: 'Cotizaciones', to: '/admin/quotes' },
            { label: 'Empleados', to: '/admin/employees' },
            { label: 'Reservaciones', to: '/admin/reservations' },
            { label: 'Mensajes', to: '/admin/messages' },
            { label: 'Ventas', to: '/admin/sales' },
            { label: 'Workspace', to: '/admin/workspace' },
            { label: 'Reuniones', to: '/admin/meetings' },
          ].map((item) => (
            <Link key={item.to} to={item.to} className="whitespace-nowrap rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs text-cyan-100 hover:bg-cyan-500/20 active:bg-cyan-500/25 touch-manipulation min-h-[44px] sm:min-h-0 flex items-center snap-start">
              {item.label}
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
