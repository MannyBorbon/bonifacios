import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar, LayoutGrid, CheckSquare, StickyNote, MessageSquare,
  Users, Video, Sparkles, TrendingUp, Clock, AlertTriangle,
  ArrowRight, Zap
} from 'lucide-react'
import { calendarAPI, workspaceListsAPI, workspaceNotesAPI, workspaceSocialAPI, workspaceBoardsAPI } from '../../../services/api'

const MODULE_CARDS = [
  { id: 'calendar', label: 'Calendario', icon: Calendar, color: 'from-violet-500/12 to-purple-500/5 border-violet-500/25', accent: 'text-violet-400' },
  { id: 'boards', label: 'Tableros', icon: LayoutGrid, color: 'from-emerald-500/12 to-teal-500/5 border-emerald-500/25', accent: 'text-emerald-400' },
  { id: 'chat', label: 'Chat', icon: MessageSquare, color: 'from-amber-500/12 to-orange-500/5 border-amber-500/25', accent: 'text-amber-400' },
  { id: 'meetings', label: 'Reuniones', icon: Video, color: 'from-rose-500/12 to-pink-500/5 border-rose-500/25', accent: 'text-rose-400' },
  { id: 'lists', label: 'Listas', icon: CheckSquare, color: 'from-cyan-500/12 to-blue-500/5 border-cyan-500/25', accent: 'text-cyan-400' },
  { id: 'notes', label: 'Notas', icon: StickyNote, color: 'from-yellow-500/12 to-amber-500/5 border-yellow-500/25', accent: 'text-yellow-400' },
  { id: 'social', label: 'Social', icon: Users, color: 'from-fuchsia-500/12 to-purple-500/5 border-fuchsia-500/25', accent: 'text-fuchsia-400' },
  { id: 'assistant', label: 'AI', icon: Sparkles, color: 'from-indigo-500/12 to-violet-500/5 border-indigo-500/25', accent: 'text-indigo-400' },
]

export default function WorkspaceHome({ onNavigate, onQuickAction }) {
  const [stats, setStats] = useState({ events: 0, lists: 0, notes: 0, mentions: 0, boards: 0 })
  const [loading, setLoading] = useState(true)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Buenos dias' : hour < 18 ? 'Buenas tardes' : 'Buenas noches'

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const [evRes, listRes, noteRes, socialRes, boardRes] = await Promise.allSettled([
        calendarAPI.getEvents(now.getMonth() + 1, now.getFullYear()),
        workspaceListsAPI.listGroups(),
        workspaceNotesAPI.list(),
        workspaceSocialAPI.list(),
        workspaceBoardsAPI.list(),
      ])
      setStats({
        events: evRes.status === 'fulfilled' ? (evRes.value.data?.events?.length || 0) : 0,
        lists: listRes.status === 'fulfilled' ? (listRes.value.data?.lists?.length || 0) : 0,
        notes: noteRes.status === 'fulfilled' ? (noteRes.value.data?.notes?.length || 0) : 0,
        mentions: socialRes.status === 'fulfilled' ? Number(socialRes.value.data?.unread_mentions || 0) : 0,
        boards: boardRes.status === 'fulfilled' ? (boardRes.value.data?.boards?.length || 0) : 0,
      })
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadStats() }, [loadStats])

  const metricsMap = {
    calendar: { value: stats.events, label: 'eventos este mes' },
    boards: { value: stats.boards, label: 'tableros activos' },
    chat: { value: 'Live', label: 'chat en tiempo real' },
    meetings: { value: 'Sala', label: 'juntas y minutas' },
    lists: { value: stats.lists, label: 'listas activas' },
    notes: { value: stats.notes, label: 'notas del equipo' },
    social: { value: stats.mentions > 0 ? stats.mentions : '0', label: stats.mentions > 0 ? 'menciones sin leer' : 'social hub' },
    assistant: { value: 'AI', label: 'consultas operativas' },
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 sm:space-y-6 max-w-6xl mx-auto">
      {/* Welcome header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#080e1f] to-[#0a1428] p-6 sm:p-8"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/5 via-transparent to-violet-500/5 pointer-events-none" />
        <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-[#D4AF37]/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={14} className="text-[#D4AF37]" />
            <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-[#D4AF37]/60">Workspace</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extralight text-white tracking-tight">
            {greeting}, <span className="font-medium bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">{currentUser?.full_name || currentUser?.username || 'Usuario'}</span>
          </h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg">
            Centro operativo integral. Gestiona calendario, tableros, comunicacion y mas desde un solo lugar.
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Clock size={12} />
              <span>{now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/8 to-emerald-600/3 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={12} className="text-emerald-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-400/70">Eventos</span>
          </div>
          <p className="text-xl font-light text-white">{loading ? '...' : stats.events}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">este mes</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/8 to-blue-600/3 p-4 backdrop-blur-sm">
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare size={12} className="text-cyan-400" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-cyan-400/70">Listas</span>
          </div>
          <p className="text-xl font-light text-white">{loading ? '...' : stats.lists}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">activas</p>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className={`rounded-xl border p-4 backdrop-blur-sm ${stats.mentions > 0 ? 'border-rose-500/20 bg-gradient-to-br from-rose-500/8 to-red-600/3' : 'border-slate-700/20 bg-gradient-to-br from-slate-500/5 to-slate-600/3'}`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} className={stats.mentions > 0 ? 'text-rose-400' : 'text-slate-500'} />
            <span className={`text-[9px] font-bold uppercase tracking-wider ${stats.mentions > 0 ? 'text-rose-400/70' : 'text-slate-500/70'}`}>Menciones</span>
          </div>
          <p className="text-xl font-light text-white">{loading ? '...' : stats.mentions}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">sin leer</p>
        </motion.div>
      </div>

      {/* Module grid */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Modulos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {MODULE_CARDS.map((card, i) => {
            const Icon = card.icon
            const metric = metricsMap[card.id]
            return (
              <motion.button
                key={card.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => onNavigate(card.id)}
                className={`group relative overflow-hidden rounded-xl border bg-gradient-to-br p-3.5 sm:p-4 text-left backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] hover:-translate-y-0.5 active:scale-[0.97] touch-manipulation ${card.color}`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${card.color.replace('/12', '/20').replace('/5', '/15')} flex items-center justify-center`}>
                      <Icon size={16} className={card.accent} />
                    </div>
                    <ArrowRight size={12} className="text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 group-hover:text-slate-300 transition-colors">{card.label}</p>
                  <p className="text-lg font-light text-white mt-0.5">{loading ? '...' : metric?.value}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{metric?.label}</p>
                </div>
              </motion.button>
            )
          })}
        </div>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 mb-3">Acciones rapidas</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'event', label: 'Nuevo evento', icon: Calendar, accent: 'border-violet-500/30 text-violet-300 hover:bg-violet-500/10' },
            { id: 'task', label: 'Nueva tarea', icon: CheckSquare, accent: 'border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10' },
            { id: 'meeting', label: 'Nueva reunion', icon: Video, accent: 'border-rose-500/30 text-rose-300 hover:bg-rose-500/10' },
            { id: 'note', label: 'Nueva nota', icon: StickyNote, accent: 'border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/10' },
          ].map(action => {
            const Icon = action.icon
            return (
              <button
                key={action.id}
                onClick={() => onQuickAction(action.id)}
                className={`flex items-center gap-2 rounded-xl border px-3.5 py-2.5 sm:px-3 sm:py-2 text-xs font-medium transition-all duration-200 active:scale-95 touch-manipulation min-h-[44px] ${action.accent}`}
              >
                <Icon size={14} />
                {action.label}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
