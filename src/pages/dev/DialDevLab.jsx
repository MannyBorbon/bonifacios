import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import CircularSelector from '../../components/CircularSelector'

/**
 * Laboratorio local del dial giratorio (CircularSelector).
 * Solo se registra la ruta cuando import.meta.env.DEV es true (Vite).
 *
 * Abrir: http://localhost:5173/dev/dial-lab (puerto por defecto de Vite)
 */
const DEMO_OPTIONS = {
  applications: { icon: '📋', label: 'Solicitudes' },
  quotes: { icon: '💰', label: 'Cotizaciones' },
  employees: { icon: '👥', label: 'Empleados' },
  reservations: { icon: '📅', label: 'Reservaciones' },
  messages: { icon: '✉️', label: 'Mensajes' },
  sales: { icon: '📈', label: 'Ventas' },
  workspace: { icon: '🗂️', label: 'Workspace' },
  meetings: { icon: '🤝', label: 'Reuniones' },
}
const DEMO_PENDING = {
  applications: 12,
  quotes: 5,
  employees: 3,
  reservations: 7,
  messages: 9,
  sales: 2,
  workspace: 1,
  meetings: 4,
}

export default function DialDevLab() {
  const [selected, setSelected] = useState('applications')
  const [size, setSize] = useState(320)
  const [isDialModalOpen, setIsDialModalOpen] = useState(false)
  const onSelect = useCallback((key) => setSelected(key), [])

  return (
    <div className="min-h-screen bg-[#040c1a] text-slate-100">
      <header className="border-b border-cyan-500/20 bg-slate-950/80 px-4 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-400/80">Dev only</p>
            <h1 className="font-serif text-xl font-light text-cyan-50">Laboratorio — dial giratorio</h1>
            <p className="mt-1 max-w-xl text-xs text-slate-400">
              Editas <code className="rounded bg-black/40 px-1 text-cyan-200">CircularSelector.jsx</code> y recargas: hot reload sin subir a Hostinger.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/admin/dashboard"
              className="rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2.5 text-xs font-medium text-slate-200 transition-colors hover:border-cyan-500/40 hover:text-cyan-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c1a]"
            >
              Ir al dashboard
            </Link>
            <Link
              to="/"
              className="rounded-lg border border-slate-600 px-3 py-2.5 text-xs font-medium text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c1a]"
            >
              Inicio
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-8 rounded-xl border border-slate-700/50 bg-slate-900/40 p-5 shadow-inner">
          <label
            htmlFor="dial-size"
            className="mb-3 block text-[11px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Tamaño del dial
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <input
              id="dial-size"
              type="range"
              min={240}
              max={420}
              step={10}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              aria-valuemin={240}
              aria-valuemax={420}
              aria-valuenow={size}
              aria-valuetext={`${size} píxeles`}
              className="h-2 min-h-[44px] min-w-[min(100%,12rem)] flex-1 cursor-pointer accent-cyan-500 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/80 focus-visible:ring-offset-2 focus-visible:ring-offset-[#040c1a]"
            />
            <output
              htmlFor="dial-size"
              className="min-w-[3.25rem] rounded-md border border-slate-600/80 bg-slate-950/80 px-2 py-1.5 text-center text-sm font-semibold tabular-nums text-cyan-200"
            >
              {size}
              <span className="sr-only"> píxeles</span>
            </output>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-slate-400">
            Módulo activo:{' '}
            <strong className="font-semibold text-cyan-200">{DEMO_OPTIONS[selected]?.label}</strong>
            <span className="text-slate-500"> ({selected})</span>
          </p>
        </div>

        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-b from-slate-900/60 to-black/40 p-6 shadow-[0_0_60px_-20px_rgba(34,211,238,0.25)]">
          <p className="text-sm text-slate-300">
            Vista modal: abre el dial desde el botón flotante inferior derecho.
          </p>
        </div>
      </div>

      <div className="fixed bottom-5 right-5 z-[80]">
        <button
          type="button"
          onClick={() => setIsDialModalOpen((prev) => !prev)}
          className={`rounded-full border px-5 py-3 text-xs font-semibold uppercase tracking-[0.14em] transition-all duration-300 ${
            isDialModalOpen
              ? 'border-cyan-300/70 bg-cyan-400/20 text-cyan-100 shadow-[0_10px_30px_-12px_rgba(34,211,238,0.85)]'
              : 'border-orange-300/45 bg-gradient-to-r from-amber-700 to-orange-700 text-amber-50 shadow-[0_10px_30px_-12px_rgba(251,146,60,0.65)] hover:brightness-110'
          }`}
          aria-expanded={isDialModalOpen}
          aria-controls="dial-modal-panel"
        >
          {isDialModalOpen ? 'Cerrar dial' : 'Abrir dial'}
        </button>
      </div>

      <div
        className={`fixed inset-0 z-[70] flex items-center justify-center p-4 sm:p-6 transition-all duration-300 ${
          isDialModalOpen ? 'pointer-events-auto bg-black/55 backdrop-blur-[2px]' : 'pointer-events-none bg-black/0'
        }`}
      >
        <div
          id="dial-modal-panel"
          className={`w-[min(94vw,420px)] bg-transparent p-0 shadow-none transition-all duration-300 ${
            isDialModalOpen ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-6 scale-95 opacity-0'
          }`}
        >
          <CircularSelector
            options={DEMO_OPTIONS}
            selected={selected}
            onSelect={onSelect}
            size={size}
            pendingByKey={DEMO_PENDING}
            onCenterPress={(key) => {
              console.info('[dial-lab] acción central', key, DEMO_OPTIONS[key]?.label)
              setIsDialModalOpen(false)
            }}
          />
        </div>
      </div>
    </div>
  )
}
