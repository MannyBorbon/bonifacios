import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
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
    <div className={`relative overflow-hidden rounded-2xl border ${c.border} ${c.bg} p-4 shadow-lg ${c.glow} hover:scale-[1.03] hover:shadow-xl transition-all duration-300 cursor-pointer h-full`}>
      {/* top shimmer line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-current to-transparent opacity-40`} />
      {/* glow corner */}
      <div className={`absolute -top-4 -right-4 w-16 h-16 rounded-full ${c.bg} blur-xl opacity-60`} />
      <div className="flex items-start justify-between mb-3">
        <p className={`text-[10px] uppercase tracking-[0.3em] ${c.text} font-semibold`}>{label}</p>
        {pulse && <span className={`h-2 w-2 rounded-full ${c.dot} animate-pulse flex-shrink-0 mt-0.5`} />}
      </div>
      <p className={`text-3xl font-extralight tabular-nums ${c.text}`} style={{ textShadow: `0 0 20px currentColor` }}>
        {typeof value === 'number' ? displayed : value}
      </p>
      {sub && <p className="text-[10px] text-slate-400 mt-1.5">{sub}</p>}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
    </div>
  )
  return to ? <Link to={to}>{Inner}</Link> : Inner
}

const NAV_ICONS = {
  applications: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  employees:    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  messages:     'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  quotes:       'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z',
  analytics:    'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  meetings:     'M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.899L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
  inbox:        'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  communities:  'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
}

/* ── Quick action button ── */
function QuickBtn({ label, sub, to, color = 'cyan', iconKey }) {
  const c = {
    cyan:   'border-cyan-400/60 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25 hover:border-cyan-400/80',
    blue:   'border-blue-400/60 bg-blue-500/15 text-blue-200 hover:bg-blue-500/25 hover:border-blue-400/80',
    green:  'border-green-400/60 bg-green-500/15 text-green-200 hover:bg-green-500/25 hover:border-green-400/80',
    orange: 'border-orange-400/60 bg-orange-500/15 text-orange-200 hover:bg-orange-500/25 hover:border-orange-400/80',
    purple: 'border-purple-400/60 bg-purple-500/15 text-purple-200 hover:bg-purple-500/25 hover:border-purple-400/80',
    amber:  'border-amber-400/60 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25 hover:border-amber-400/80',
    violet: 'border-violet-400/60 bg-violet-500/15 text-violet-200 hover:bg-violet-500/25 hover:border-violet-400/80',
  }[color]
  const iconPath = NAV_ICONS[iconKey]
  return (
    <Link to={to} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-all duration-200 group ${c}`}>
      {iconPath && (
        <svg className="h-4 w-4 flex-shrink-0 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
        </svg>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium leading-tight truncate">{label}</p>
        {sub && <p className="text-[10px] opacity-50 truncate mt-0.5">{sub}</p>}
      </div>
      <svg className="h-3 w-3 opacity-25 group-hover:opacity-60 ml-auto flex-shrink-0 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
    </Link>
  )
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
  const [loading, setLoading] = useState(true)
  const [scanPos, setScanPos] = useState(0)

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
      loadUnread(), loadInbox(), loadApplications(), loadEmployees(), loadTracking(), loadCommunities()
    ])
    setLoading(false)
  }

  const loadDash = async () => {
    try { const r = await analyticsAPI.getDashboard(7); setDashData(r.data) } catch { /* silent */ }
  }
  const loadSite = async () => {
    try { const r = await siteAnalyticsAPI.getStats(7); if (r.data.success) setSiteStats(r.data.stats) } catch { /* silent */ }
  }
  const loadQuotes = async () => {
    try { const r = await quotesAPI.getQuotes(); if (r.data.success) setQuotesStats(r.data.stats) } catch { /* silent */ }
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
    <div className="relative space-y-5 p-1 overflow-hidden">

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
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-[#030b18] via-[#040d1c] to-[#030b18] px-5 py-4 shadow-lg shadow-cyan-500/10 overflow-hidden">
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
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all duration-300 ${
                onsite ? 'border-green-400/50 bg-green-500/12 text-green-300 shadow-green-500/20 shadow-md' : 'border-slate-600/50 bg-slate-700/20 text-slate-400'
              } ${onsiteLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-105'}`}
            >
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${onsite ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
              {isManuel ? (onsite ? 'En Sitio' : 'Fuera') : (onsite ? 'Manuel en sitio' : 'Manuel fuera')}
            </button>
          )}
        </div>
      </div>

      {/* ── STATS ROW ── */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard label="Solicitudes Pendientes" value={pending} color="orange" pulse={pending > 0} sub="por revisar" to="/admin/applications" />
        <StatCard label="Total Solicitudes"      value={totalApps}   color="cyan"   sub={`${(totalApps - pending)} revisadas`} to="/admin/applications" />
        <StatCard label="Empleados Activos"      value={totalEmps}   color="green"  sub="en nómina" to="/admin/employees" />
        <StatCard label="Mensajes Sin Leer"      value={unread}      color="blue"   pulse={unread > 0} sub="chat + correo" to="/admin/messages" />
        <StatCard label="Cotizaciones"           value={quotesStats?.total_quotes || 0} color="purple" sub={`${quotesStats?.pending_quotes || 0} pendientes`} to="/admin/quotes" />
        <StatCard label="Visitantes Hoy"         value={siteStats?.today_views || 0}   color="amber"  sub={`${siteStats?.active_now || 0} ahora`} to="/admin/analytics" />
      </div>

      {/* ── SALES WIDGET - Ventas en Tiempo Real ── */}
      <div className="relative z-10">
        <SalesWidget />
      </div>

      {/* ── MAIN CONTENT: Chart + Quick Nav ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area chart - 2 cols */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-cyan-400/25 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-5 shadow-lg shadow-cyan-500/8">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-cyan-400/50">Tendencia</p>
              <h3 className="text-sm font-light text-white">Solicitudes · 7 días</h3>
            </div>
            <div className="flex items-center gap-3 text-[10px]">
              <span className="flex items-center gap-1.5 text-cyan-400/60"><span className="h-0.5 w-4 bg-cyan-400/70 rounded inline-block" />Solicitudes</span>
              <span className="flex items-center gap-1.5 text-blue-400/60"><span className="h-0.5 w-4 bg-blue-400/70 rounded inline-block" />Mensajes</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={dashData?.dailyStats || []} margin={{ top: 5, right: 5, left: -22, bottom: 0 }}>
              <defs>
                <linearGradient id="gCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.06)" vertical={false} />
              <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#040c1a', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '10px', color: '#e2e8f0', fontSize: '11px' }} cursor={{ stroke: 'rgba(34,211,238,0.15)' }} />
              <Area type="monotone" dataKey="applications" stroke="#22d3ee" strokeWidth={2} fill="url(#gCyan)" name="Solicitudes" dot={false} />
              <Area type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={2} fill="url(#gBlue)" name="Mensajes" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Quick navigation - 1 col */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-4 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <p className="text-[9px] uppercase tracking-[0.4em] text-blue-400/50 mb-3">Navegación Rápida</p>
          <div className="space-y-1.5">
            <QuickBtn label="Solicitudes"    sub={`${pending} pendientes`}                         to="/admin/applications" color="orange" iconKey="applications" />
            <QuickBtn label="Empleados"      sub={`${totalEmps} activos`}                          to="/admin/employees"    color="green"  iconKey="employees" />
            <QuickBtn label="Mensajes"       sub={`${unread} sin leer`}                            to="/admin/messages"     color="blue"   iconKey="messages" />
            <QuickBtn label="Cotizaciones"   sub={`${quotesStats?.total_quotes || 0} registradas`} to="/admin/quotes"        color="purple" iconKey="quotes" />
            <QuickBtn label="Ventas"         sub="ventas en tiempo real"                             to="/admin/sales"        color="green"  iconKey="analytics" />
            <QuickBtn label="Analíticas"     sub="visitas y métricas"                              to="/admin/analytics"    color="cyan"   iconKey="analytics" />
            <QuickBtn label="Reuniones"      sub="videoconferencias"                               to="/admin/meetings"     color="amber"  iconKey="meetings" />
            <QuickBtn label="Correo"         sub={`${inbox.filter(e=>!e.seen).length} sin leer`}  to="/admin/inbox"        color="cyan"   iconKey="inbox" />
            <QuickBtn label="Comunidades"    sub={`${communities.length} grupos`}                 to="/admin/communities"  color="violet" iconKey="communities" />
          </div>
        </div>
      </div>

      {/* ── COMMUNITIES + LOWER ROW ── */}
      {communities.length > 0 && (
        <div className="relative z-10 overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-5 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-violet-400/50">Grupos & Clientes</p>
              <h3 className="text-sm font-light text-white">Comunidades</h3>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[10px] text-slate-500">{communities.filter(c => c.status === 'vip').length} VIP · {communities.filter(c => c.status === 'activo').length} activas</span>
              <Link to="/admin/communities" className="text-[10px] text-violet-400/60 hover:text-violet-300 transition-colors uppercase tracking-wider">Ver todas &rarr;</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {communities.slice(0, 12).map((c, i) => (
              <Link key={c.id || i} to="/admin/communities" className="group flex items-center gap-2.5 rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2.5 hover:bg-violet-500/8 hover:border-violet-400/25 transition-all duration-200">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 border border-violet-400/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[11px] font-medium text-violet-300">{c.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-200 truncate font-medium leading-tight">{c.name}</p>
                  <span className={`text-[9px] ${
                    c.status === 'vip' ? 'text-amber-400' : c.status === 'inactivo' ? 'text-slate-600' : 'text-green-400'
                  }`}>{c.status === 'vip' ? 'VIP' : c.status === 'inactivo' ? 'Inactivo' : 'Activo'}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* ── LOWER ROW: Recent Apps + Activity + Bar Chart ── */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Recent applications */}
        <div className="relative overflow-hidden rounded-2xl border border-orange-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-5 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-orange-400/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-orange-400/50">Últimas</p>
              <h3 className="text-sm font-light text-white">Solicitudes</h3>
            </div>
            <Link to="/admin/applications" className="text-[10px] text-orange-400/60 hover:text-orange-300 transition-colors uppercase tracking-wider">Ver todas →</Link>
          </div>
          <div className="space-y-2">
            {applications.length === 0 ? (
              <p className="text-[11px] text-slate-700 text-center py-6">Sin solicitudes recientes</p>
            ) : applications.map((app, i) => (
              <Link key={app.id || i} to="/admin/applications" className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2.5 hover:bg-orange-500/5 hover:border-orange-400/20 transition-all duration-200 group">
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-orange-500/20 to-amber-500/20 border border-orange-400/20 flex items-center justify-center flex-shrink-0 text-[11px] font-medium text-orange-300">
                  {app.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-200 truncate font-medium">{app.name}</p>
                  <p className="text-[10px] text-slate-600 truncate">{app.position || 'Sin puesto'}</p>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  app.status === 'Pendiente' ? 'border-orange-500/30 bg-orange-500/10 text-orange-300' :
                  app.status === 'Aceptada'  ? 'border-green-500/30  bg-green-500/10  text-green-300'  :
                                               'border-slate-600/30  bg-slate-700/10  text-slate-400'
                }`}>{app.status}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Activity feed */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-5 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] uppercase tracking-[0.4em] text-cyan-400/50">En Tiempo Real</p>
              <h3 className="text-sm font-light text-white">Actividad del Sistema</h3>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] text-green-400/60">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />LIVE
            </span>
          </div>
          <div className="space-y-2">
            {trackingData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-2">
                <div className="h-8 w-8 rounded-full border border-cyan-500/20 flex items-center justify-center">
                  <span className="text-cyan-500/30 text-sm">⚡</span>
                </div>
                <p className="text-[11px] text-slate-700">Sin actividad reciente</p>
              </div>
            ) : trackingData.map((a, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.015] px-3 py-2.5">
                <div className="h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-400/20 flex items-center justify-center flex-shrink-0 text-[10px] font-medium text-cyan-300">
                  {a.username?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300 truncate font-medium">{a.username}</p>
                    <span className="text-[9px] text-slate-600 flex-shrink-0 ml-2">{a.time_ago}</span>
                  </div>
                  <p className="text-[10px] text-slate-600 truncate">{a.action}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Site stats footer */}
          {siteStats && (
            <div className="mt-3 pt-3 border-t border-cyan-500/10 flex items-center justify-between">
              <span className="text-[10px] text-slate-600">Únicos hoy</span>
              <span className="text-xs text-cyan-300 tabular-nums font-light">{siteStats.today_unique || 0}</span>
            </div>
          )}
        </div>

        {/* Bar chart + system summary */}
        <div className="relative overflow-hidden rounded-2xl border border-purple-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-5 shadow-lg">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
          <div className="mb-3">
            <p className="text-[9px] uppercase tracking-[0.4em] text-purple-400/50">Análisis</p>
            <h3 className="text-sm font-light text-white">Top Puestos</h3>
          </div>
          <ResponsiveContainer width="100%" height={110}>
            <BarChart data={dashData?.topPositions || []} barSize={12} margin={{ top: 0, right: 0, left: -28, bottom: 0 }}>
              <defs>
                <linearGradient id="gBar" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(167,139,250,0.06)" vertical={false} />
              <XAxis dataKey="position" stroke="transparent" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fill: '#475569', fontSize: 8 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ backgroundColor: '#040c1a', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '10px', color: '#e2e8f0', fontSize: '11px' }} cursor={{ fill: 'rgba(167,139,250,0.05)' }} />
              <Bar dataKey="count" fill="url(#gBar)" name="Solicitudes" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* System summary */}
          <div className="mt-3 pt-3 border-t border-purple-500/10 space-y-2">
            {[
              { label: 'Usuarios del sistema', value: totalUsers, color: 'bg-purple-400' },
              { label: 'Correos sin leer',     value: inbox.filter(e => !e.seen).length, color: 'bg-blue-400' },
              { label: 'Cotiz. pendientes',    value: quotesStats?.pending_quotes || 0, color: 'bg-amber-400' },
              { label: 'Activos ahora',        value: siteStats?.active_now || 0, color: 'bg-green-400' },
            ].map((row, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${row.color} flex-shrink-0`} />
                  <span className="text-[11px] text-slate-500">{row.label}</span>
                </div>
                <span className="text-xs text-slate-300 tabular-nums font-light">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
