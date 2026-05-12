import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import CircularSelector from './CircularSelector'
import { analyticsAPI, quotesAPI } from '../services/api'

const DIAL_OPTIONS = {
  dashboard: { icon: '🏠', label: 'Dashboard', path: '/admin/dashboard' },
  applications: { icon: '📋', label: 'Solicitudes', path: '/admin/applications' },
  quotes: { icon: '💰', label: 'Cotizaciones', path: '/admin/quotes' },
  employees: { icon: '👥', label: 'Empleados', path: '/admin/employees' },
  reservations: { icon: '📅', label: 'Reservaciones', path: '/admin/reservations' },
  messages: { icon: '✉️', label: 'Mensajes', path: '/admin/messages' },
  sales: { icon: '📈', label: 'Ventas', path: '/admin/sales' },
  workspace: { icon: '🗂️', label: 'Workspace', path: '/admin/workspace' },
  meetings: { icon: '🤝', label: 'Reuniones', path: '/admin/meetings' },
}

function getKeyByPath(pathname) {
  if (pathname.startsWith('/admin/applications')) return 'applications'
  if (pathname.startsWith('/admin/quotes')) return 'quotes'
  if (pathname.startsWith('/admin/employees')) return 'employees'
  if (pathname.startsWith('/admin/reservations')) return 'reservations'
  if (pathname.startsWith('/admin/messages') || pathname.startsWith('/admin/inbox')) return 'messages'
  if (pathname.startsWith('/admin/sales')) return 'sales'
  if (pathname.startsWith('/admin/workspace') || pathname.startsWith('/admin/calendar')) return 'workspace'
  if (pathname.startsWith('/admin/meetings')) return 'meetings'
  return 'dashboard'
}

function ymdHermosillo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Hermosillo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const pick = (type) => parts.find((p) => p.type === type)?.value || ''
  return `${pick('year')}-${pick('month')}-${pick('day')}`
}

export default function AdminSandboxDial() {
  const navigate = useNavigate()
  const location = useLocation()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedKey, setSelectedKey] = useState(getKeyByPath(location.pathname))
  const [dialMetrics, setDialMetrics] = useState({ workspace: null })
  // En `vite build`, import.meta.env.DEV es false: antes el modal no salía en producción.
  // Por defecto activo en admin; ocultar con VITE_ADMIN_CIRCULAR_SELECTOR=0 (o false/off/no).
  const explicitlyOff = ['0', 'false', 'no', 'off'].includes(
    String(import.meta.env.VITE_ADMIN_CIRCULAR_SELECTOR ?? '').trim().toLowerCase()
  )
  const showDial = !explicitlyOff

  useEffect(() => {
    setSelectedKey(getKeyByPath(location.pathname))
  }, [location.pathname])

  useEffect(() => {
    if (!showDial) return undefined

    let cancelled = false

    const loadDialMetrics = async () => {
      const today = ymdHermosillo()
      const apiBase = import.meta.env.VITE_API_URL || '/api'
      const nextMetrics = { workspace: null }
      try {
        const dashRes = await analyticsAPI.getDashboard(7)
        const pendingApplications = Number(dashRes?.data?.stats?.pendingApplications || 0)
        nextMetrics.applications = { label: 'Pendientes', value: pendingApplications }
      } catch {
        // silent
      }

      try {
        const quotesRes = await quotesAPI.getQuotes()
        const pendingQuotes = Number(quotesRes?.data?.stats?.pending_quotes || 0)
        nextMetrics.quotes = { label: 'Pendientes', value: pendingQuotes }
      } catch {
        // silent
      }

      try {
        const employeesRes = await fetch(`${apiBase}/employees/list.php`, { credentials: 'include' })
        const absencesRes = await fetch(`${apiBase}/employees/attendance-management.php?action=expected_absences&date=${today}`, { credentials: 'include' })
        const employeesJson = await employeesRes.json().catch(() => null)
        const absencesJson = await absencesRes.json().catch(() => null)
        const employeesArr = Array.isArray(employeesJson)
          ? employeesJson
          : Array.isArray(employeesJson?.data)
            ? employeesJson.data
            : Array.isArray(employeesJson?.employees)
              ? employeesJson.employees
              : []
        const activeEmployees = employeesArr.filter((employee) => employee.status === 'active' || !employee.status).length
        const missingToday = Number(absencesJson?.missing_count || 0)
        const workingToday = Math.max(activeEmployees - missingToday, 0)
        nextMetrics.employees = { label: 'Trabajando hoy', value: workingToday }
      } catch {
        // silent
      }

      try {
        const salesRes = await fetch(`${apiBase}/softrestaurant/sales.php?range=today&sections=core`, { credentials: 'include' })
        const salesJson = await salesRes.json().catch(() => null)
        const todayClosed = Number(salesJson?.stats?.today?.total || 0)
        const todayOpen = Number(salesJson?.open_stats?.total || 0)
        const salesToday = Math.max(todayClosed + todayOpen, 0)
        nextMetrics.sales = { label: 'En vivo', value: `$${salesToday.toLocaleString('es-MX')}` }
      } catch {
        try {
          // Fallback para entornos donde no esté disponible softrestaurant/sales.php
          const fallbackRes = await fetch(`${apiBase}/dashboard/operational-checklist.php?action=daily_report&date=${today}`, { credentials: 'include' })
          const fallbackJson = await fallbackRes.json().catch(() => null)
          const salesToday = Number(fallbackJson?.sales?.total_sales || 0)
          nextMetrics.sales = { label: 'Venta hoy', value: `$${salesToday.toLocaleString('es-MX')}` }
        } catch {
          // silent
        }
      }

      if (cancelled) return
      setDialMetrics(nextMetrics)
    }

    loadDialMetrics()
    const intervalId = setInterval(loadDialMetrics, 30000)
    return () => {
      cancelled = true
      clearInterval(intervalId)
    }
  }, [showDial])

  if (!showDial) return null

  return (
    <>
      <div className="fixed right-5 bottom-[calc(5.2rem+env(safe-area-inset-bottom))] z-[135]">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 ${
            isOpen
              ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.85)]'
              : 'border-orange-300/45 bg-gradient-to-r from-amber-700 to-orange-700 text-amber-50 shadow-[0_10px_30px_-12px_rgba(251,146,60,0.65)] hover:brightness-110'
          }`}
          aria-expanded={isOpen}
          aria-controls="admin-sandbox-dial-modal"
        >
          {isOpen ? 'Cerrar selector' : 'Selector'}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[130] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
          isOpen ? 'pointer-events-auto bg-black/55 backdrop-blur-[2px]' : 'pointer-events-none bg-black/0'
        }`}
        onClick={(event) => {
          if (event.target === event.currentTarget) setIsOpen(false)
        }}
      >
        <div
          id="admin-sandbox-dial-modal"
          className={`w-[min(94vw,430px)] bg-transparent p-0 shadow-none transition-all duration-300 ${
            isOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-95 opacity-0'
          }`}
        >
          <CircularSelector
            options={DIAL_OPTIONS}
            selected={selectedKey}
            onSelect={setSelectedKey}
            size={340}
            pendingByKey={dialMetrics}
            onCenterPress={(key) => {
              const target = DIAL_OPTIONS[key]?.path || '/admin/dashboard'
              navigate(target)
              setIsOpen(false)
            }}
          />
        </div>
      </div>
    </>
  )
}
