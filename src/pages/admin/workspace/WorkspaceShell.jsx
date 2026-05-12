import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Calendar, LayoutGrid, CheckSquare, StickyNote, MessageSquare,
  Users, Video, Sparkles, Search, Bell, ChevronLeft,
  ChevronRight, X, Home, Zap, Plus, Menu, ArrowLeft, MoreHorizontal
} from 'lucide-react'
import WorkspaceHome from './WorkspaceHome'
import WorkspaceBoards from './WorkspaceBoards'
import WorkspaceChat from './WorkspaceChat'
import WorkspaceMeetings from './WorkspaceMeetings'
import WorkspaceCalendar from './WorkspaceCalendar'
import WorkspaceLists from './WorkspaceLists'
import WorkspaceNotes from './WorkspaceNotes'
import WorkspaceSocial from './WorkspaceSocial'
import WorkspaceAssistant from './WorkspaceAssistant'

export const MODULES = [
  { id: 'home', label: 'Inicio', icon: Home, shortcut: '1', color: 'from-blue-500 to-cyan-400', mobileNav: true },
  { id: 'calendar', label: 'Calendario', icon: Calendar, shortcut: '2', color: 'from-violet-500 to-purple-400', mobileNav: true },
  { id: 'boards', label: 'Tableros', icon: LayoutGrid, shortcut: '3', color: 'from-emerald-500 to-teal-400', mobileNav: true },
  { id: 'chat', label: 'Chat', icon: MessageSquare, shortcut: '4', color: 'from-amber-500 to-orange-400', mobileNav: true },
  { id: 'meetings', label: 'Reuniones', icon: Video, shortcut: '5', color: 'from-rose-500 to-pink-400', mobileNav: false },
  { id: 'lists', label: 'Listas', icon: CheckSquare, shortcut: '6', color: 'from-cyan-500 to-blue-400', mobileNav: false },
  { id: 'notes', label: 'Notas', icon: StickyNote, shortcut: '7', color: 'from-yellow-500 to-amber-400', mobileNav: false },
  { id: 'social', label: 'Social', icon: Users, shortcut: '8', color: 'from-fuchsia-500 to-purple-400', mobileNav: false },
  { id: 'assistant', label: 'AI', icon: Sparkles, shortcut: '9', color: 'from-indigo-500 to-violet-400', mobileNav: true },
]

const MOBILE_NAV_MODULES = MODULES.filter(m => m.mobileNav)

export const QUICK_ACTIONS = [
  { id: 'event', label: 'Nuevo evento', icon: Calendar, module: 'calendar' },
  { id: 'task', label: 'Nueva tarea', icon: CheckSquare, module: 'boards' },
  { id: 'meeting', label: 'Nueva reunion', icon: Video, module: 'meetings' },
  { id: 'note', label: 'Nueva nota', icon: StickyNote, module: 'notes' },
]

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' ? window.matchMedia(query).matches : false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    setMatches(mql.matches)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

function CommandPalette({ open, onClose, onNavigate, onQuickAction, isMobile }) {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef(null)

  const results = useMemo(() => {
    if (!query.trim()) {
      return [
        ...MODULES.map(m => ({ type: 'module', ...m })),
        ...QUICK_ACTIONS.map(a => ({ type: 'action', ...a })),
      ]
    }
    const q = query.toLowerCase()
    return [
      ...MODULES.filter(m => m.label.toLowerCase().includes(q)).map(m => ({ type: 'module', ...m })),
      ...QUICK_ACTIONS.filter(a => a.label.toLowerCase().includes(q)).map(a => ({ type: 'action', ...a })),
    ]
  }, [query])

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 80)
      setQuery('')
      setSelectedIndex(0)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => Math.min(i + 1, results.length - 1)) }
      if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(i => Math.max(i - 1, 0)) }
      if (e.key === 'Enter') {
        e.preventDefault()
        const item = results[selectedIndex]
        if (item) {
          if (item.type === 'module') onNavigate(item.id)
          if (item.type === 'action') onQuickAction(item.id)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, selectedIndex, results, onClose, onNavigate, onQuickAction])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-[100] flex ${isMobile ? 'items-end sm:items-start sm:justify-center sm:pt-[14vh]' : 'items-start justify-center pt-[14vh]'}`} onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <motion.div
        initial={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.95, y: -8 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, scale: 1, y: 0 }}
        exit={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        className={`relative z-10 w-full bg-[#0a0f1e]/98 backdrop-blur-xl shadow-2xl overflow-hidden ${
          isMobile
            ? 'max-h-[85vh] rounded-t-3xl border-t border-x border-slate-700/50 pb-[env(safe-area-inset-bottom)]'
            : 'max-w-md rounded-2xl border border-slate-700/50'
        }`}
        onClick={e => e.stopPropagation()}
      >
        {isMobile && (
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-slate-600/60" />
          </div>
        )}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800/40">
          <Search size={16} className="text-slate-500 shrink-0" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIndex(0) }}
            placeholder="Ir a... o crear algo" className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-slate-600" autoComplete="off" />
          {!isMobile && <kbd className="text-[9px] text-slate-600 border border-slate-700/50 px-1.5 py-0.5 rounded font-mono">ESC</kbd>}
          {isMobile && <button onClick={onClose} className="p-1 text-slate-500"><X size={16} /></button>}
        </div>
        <div className={`overflow-y-auto py-1.5 ${isMobile ? 'max-h-[60vh]' : 'max-h-64'}`}>
          {results.map((item, i) => {
            const isActive = i === selectedIndex
            const Icon = item.icon
            return (
              <button key={`${item.type}-${item.id}`} onClick={() => {
                if (item.type === 'module') onNavigate(item.id)
                if (item.type === 'action') onQuickAction(item.id)
                onClose()
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 sm:py-2 text-sm transition-colors touch-manipulation ${isActive ? 'bg-white/[0.04] text-white' : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.02]'}`}>
                <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${isActive ? `bg-gradient-to-br ${item.color}` : 'bg-slate-800/60'}`}>
                  <Icon size={14} className="text-white" />
                </div>
                <span className="font-medium text-xs flex-1 text-left">{item.label}</span>
                {!isMobile && item.shortcut && <kbd className="ml-auto text-[9px] text-slate-700 font-mono">{item.type === 'module' ? `Ctrl+${item.shortcut}` : ''}</kbd>}
                {item.type === 'action' && <Plus size={12} className="ml-auto text-slate-600" />}
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

function NotificationPanel({ open, onClose, isMobile }) {
  const notifications = [
    { id: 1, icon: MessageSquare, text: 'Maria comento en "Cena ejecutiva"', time: '5m', unread: true, accent: 'text-amber-400' },
    { id: 2, icon: CheckSquare, text: 'Tarea completada: Confirmar proveedor', time: '1h', unread: true, accent: 'text-emerald-400' },
    { id: 3, icon: Video, text: 'Reunion de equipo en 30 min', time: '30m', unread: false, accent: 'text-rose-400' },
    { id: 4, icon: Calendar, text: 'Evento "Cena VIP" manana 7PM', time: '2h', unread: false, accent: 'text-violet-400' },
  ]

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[90]" onClick={onClose}>
      {isMobile && <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />}
      <motion.div
        initial={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, y: -4, x: 8 }}
        animate={isMobile ? { opacity: 1, y: 0 } : { opacity: 1, y: 0, x: 0 }}
        exit={isMobile ? { opacity: 0, y: 40 } : { opacity: 0, y: -4 }}
        className={`overflow-hidden ${
          isMobile
            ? 'absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-x border-slate-700/50 bg-[#0a0f1e]/98 backdrop-blur-xl shadow-2xl pb-[env(safe-area-inset-bottom)]'
            : 'absolute right-4 top-14 w-80 rounded-2xl border border-slate-700/50 bg-[#0a0f1e]/98 backdrop-blur-xl shadow-2xl'
        }`}
        onClick={e => e.stopPropagation()}>
        {isMobile && (
          <div className="flex justify-center py-2">
            <div className="w-10 h-1 rounded-full bg-slate-600/60" />
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/40">
          <span className="text-white font-bold text-sm">Notificaciones</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-600 hover:text-white hover:bg-white/[0.04] transition-colors touch-manipulation"><X size={16} /></button>
        </div>
        <div className={`overflow-y-auto divide-y divide-slate-800/30 ${isMobile ? 'max-h-[60vh]' : 'max-h-80'}`}>
          {notifications.map(n => {
            const Icon = n.icon
            return (
              <div key={n.id} className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] active:bg-white/[0.04] transition-colors cursor-pointer touch-manipulation">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${n.unread ? 'bg-white/[0.04]' : 'bg-transparent'}`}>
                  <Icon size={14} className={n.accent} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-[12px] leading-relaxed">{n.text}</p>
                  <p className="text-slate-600 text-[10px] mt-0.5">{n.time}</p>
                </div>
                {n.unread && <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1.5 shrink-0" />}
              </div>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

function MobileMoreSheet({ open, onClose, activeModule, onNavigate }) {
  const hiddenModules = MODULES.filter(m => !m.mobileNav)
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 60 }}
        transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="absolute inset-x-0 bottom-0 rounded-t-3xl border-t border-x border-slate-700/50 bg-[#0a0f1e]/98 backdrop-blur-xl shadow-2xl pb-[env(safe-area-inset-bottom)] overflow-hidden"
        onClick={e => e.stopPropagation()}>
        <div className="flex justify-center py-2.5">
          <div className="w-10 h-1 rounded-full bg-slate-600/60" />
        </div>
        <div className="px-4 pb-2">
          <h3 className="text-white font-bold text-sm mb-1">Mas modulos</h3>
          <p className="text-slate-600 text-[11px]">Accede a todas las herramientas</p>
        </div>
        <div className="grid grid-cols-4 gap-1 px-3 pb-6 pt-2">
          {hiddenModules.map(mod => {
            const Icon = mod.icon
            const isActive = activeModule === mod.id
            return (
              <button key={mod.id} onClick={() => { onNavigate(mod.id); onClose() }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl py-3 px-2 transition-all touch-manipulation active:scale-95 ${
                  isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03] active:bg-white/[0.05]'
                }`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isActive ? `bg-gradient-to-br ${mod.color} shadow-lg` : 'bg-slate-800/50'
                }`}>
                  <Icon size={18} className={isActive ? 'text-white' : 'text-slate-500'} />
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>{mod.label}</span>
              </button>
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

export default function WorkspaceShell() {
  const navigate = useNavigate()
  const [activeModule, setActiveModule] = useState('home')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [toast, setToast] = useState(null)
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const unreadCount = 2

  const isMobile = useMediaQuery('(max-width: 767px)')
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)')

  useEffect(() => {
    if (isTablet) setSidebarCollapsed(true)
  }, [isTablet])

  useEffect(() => {
    if (mobileSidebarOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [mobileSidebarOpen])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }, [])

  const handleNavigate = useCallback((id) => {
    setActiveModule(id)
    setMobileSidebarOpen(false)
  }, [])

  const handleQuickAction = useCallback((actionId) => {
    const action = QUICK_ACTIONS.find(a => a.id === actionId)
    if (action) { setActiveModule(action.module); setMobileSidebarOpen(false); showToast(action.label) }
  }, [showToast])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); setPaletteOpen(p => !p) }
      const n = parseInt(e.key)
      if ((e.metaKey || e.ctrlKey) && n >= 1 && n <= 9 && MODULES[n - 1]) { e.preventDefault(); setActiveModule(MODULES[n - 1].id) }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const activeMod = MODULES.find(m => m.id === activeModule) || MODULES[0]

  const renderModule = () => {
    switch (activeModule) {
      case 'home': return <WorkspaceHome onNavigate={handleNavigate} onQuickAction={handleQuickAction} />
      case 'calendar': return <WorkspaceCalendar />
      case 'boards': return <WorkspaceBoards />
      case 'chat': return <WorkspaceChat />
      case 'meetings': return <WorkspaceMeetings />
      case 'lists': return <WorkspaceLists />
      case 'notes': return <WorkspaceNotes />
      case 'social': return <WorkspaceSocial />
      case 'assistant': return <WorkspaceAssistant />
      default: return <WorkspaceHome onNavigate={handleNavigate} onQuickAction={handleQuickAction} />
    }
  }

  const SidebarContent = ({ onItemClick }) => (
    <>
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5">
        {MODULES.map(mod => {
          const Icon = mod.icon
          const isActive = activeModule === mod.id
          return (
            <button key={mod.id} onClick={() => { setActiveModule(mod.id); onItemClick?.() }}
              title={sidebarCollapsed && !isMobile ? mod.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 touch-manipulation min-h-[44px] ${
                sidebarCollapsed && !isMobile ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
              } ${isActive ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] active:bg-white/[0.06]'}`}>
              <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                isActive ? `bg-gradient-to-br ${mod.color} shadow-md` : 'bg-slate-800/40'
              }`}>
                <Icon size={15} className={isActive ? 'text-white' : ''} />
              </div>
              {(isMobile || !sidebarCollapsed) && (
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[12px] font-semibold block truncate">{mod.label}</span>
                  {isMobile && <span className="text-[10px] text-slate-600 block truncate">{mod.shortcut && `Ctrl+${mod.shortcut}`}</span>}
                </div>
              )}
              {isActive && isMobile && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              )}
            </button>
          )
        })}
      </nav>
      {/* Back to Admin link */}
      <div className="p-1.5 border-t border-slate-800/40">
        <button onClick={() => { navigate('/admin/dashboard'); onItemClick?.() }}
          title={sidebarCollapsed && !isMobile ? 'Volver al Admin' : undefined}
          className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 touch-manipulation min-h-[44px] text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] active:bg-white/[0.06] ${
            sidebarCollapsed && !isMobile ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
          }`}>
          <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-slate-800/40 flex items-center justify-center shrink-0">
            <ArrowLeft size={14} />
          </div>
          {(isMobile || !sidebarCollapsed) && (
            <span className="text-[12px] font-semibold">Volver al Admin</span>
          )}
        </button>
      </div>
      {/* Collapse toggle (desktop/tablet only) */}
      {!isMobile && (
        <div className="p-1.5 border-t border-slate-800/40">
          <button onClick={() => setSidebarCollapsed(p => !p)}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-slate-700 hover:text-slate-400 transition-colors touch-manipulation min-h-[44px]">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      )}
    </>
  )

  return (
    <div className="h-[100dvh] bg-[#030712] flex overflow-hidden select-none">
      {/* Desktop/Tablet Sidebar */}
      {!isMobile && (
        <motion.aside animate={{ width: sidebarCollapsed ? 56 : 220 }} transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="h-full bg-[#050a14] border-r border-slate-800/40 flex flex-col shrink-0 z-20">
          <div className={`flex items-center h-14 border-b border-slate-800/40 shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-2.5 px-4'}`}>
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center shrink-0">
              <Zap size={14} className="text-black" />
            </div>
            {!sidebarCollapsed && <span className="text-white font-black text-xs tracking-tight">WORKSPACE</span>}
          </div>
          <SidebarContent />
        </motion.aside>
      )}

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobile && mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#050a14] border-r border-slate-800/40 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between h-14 border-b border-slate-800/40 px-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center shrink-0">
                    <Zap size={14} className="text-black" />
                  </div>
                  <span className="text-white font-black text-xs tracking-tight">WORKSPACE</span>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg text-slate-600 hover:text-white transition-colors touch-manipulation">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent onItemClick={() => setMobileSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-14 border-b border-slate-800/40 bg-[#050a14]/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            {isMobile ? (
              <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-1 rounded-lg text-slate-500 hover:text-white transition-colors touch-manipulation">
                <Menu size={20} />
              </button>
            ) : null}
            <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activeMod.color} flex items-center justify-center`}>
              {(() => { const I = activeMod.icon; return <I size={12} className="text-white" /> })()}
            </div>
            <h1 className="text-white font-bold text-sm truncate">{activeMod.label}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => setPaletteOpen(true)}
              className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg bg-slate-800/40 border border-slate-700/30 text-slate-500 hover:text-white hover:border-slate-600 transition-all text-[11px] touch-manipulation min-h-[36px]">
              <Search size={14} />
              <span className="hidden md:inline">Buscar</span>
              <kbd className="hidden lg:inline text-[9px] text-slate-700 font-mono ml-1">Ctrl+K</kbd>
            </button>
            <button onClick={() => setNotificationsOpen(p => !p)}
              className="relative p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.03] transition-colors touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center">
              <Bell size={16} />
              {unreadCount > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center ring-2 ring-[#050a14]">{unreadCount}</span>}
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center text-[10px] font-bold text-black ml-0.5 cursor-pointer shrink-0">
              {String(currentUser?.name || 'B').charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className={`flex-1 overflow-hidden ${isMobile ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}`}>
          <AnimatePresence mode="wait">
            <motion.div key={activeModule} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }} className="h-full overflow-y-auto overscroll-contain">
              {renderModule()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      {isMobile && (
        <nav className="fixed bottom-0 inset-x-0 z-50 bg-[#050a14]/95 backdrop-blur-xl border-t border-slate-800/40 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-1">
            {MOBILE_NAV_MODULES.map(mod => {
              const Icon = mod.icon
              const isActive = activeModule === mod.id
              return (
                <button key={mod.id} onClick={() => setActiveModule(mod.id)}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all touch-manipulation active:scale-90 min-w-[52px] ${
                    isActive ? 'text-white' : 'text-slate-600'
                  }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    isActive ? `bg-gradient-to-br ${mod.color} shadow-md shadow-white/5` : ''
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors ${isActive ? 'text-white' : 'text-slate-700'}`}>{mod.label}</span>
                </button>
              )
            })}
            <button onClick={() => setMobileMoreOpen(true)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all touch-manipulation active:scale-90 min-w-[52px] ${
                !MOBILE_NAV_MODULES.find(m => m.id === activeModule) ? 'text-white' : 'text-slate-600'
              }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                !MOBILE_NAV_MODULES.find(m => m.id === activeModule) ? `bg-gradient-to-br ${activeMod.color} shadow-md shadow-white/5` : ''
              }`}>
                <MoreHorizontal size={16} />
              </div>
              <span className={`text-[9px] font-semibold ${!MOBILE_NAV_MODULES.find(m => m.id === activeModule) ? 'text-white' : 'text-slate-700'}`}>Mas</span>
            </button>
          </div>
        </nav>
      )}

      {/* Overlays */}
      <AnimatePresence>
        {paletteOpen && <CommandPalette open onClose={() => setPaletteOpen(false)} onNavigate={handleNavigate} onQuickAction={handleQuickAction} isMobile={isMobile} />}
        {notificationsOpen && <NotificationPanel open onClose={() => setNotificationsOpen(false)} isMobile={isMobile} />}
        {isMobile && mobileMoreOpen && <MobileMoreSheet open onClose={() => setMobileMoreOpen(false)} activeModule={activeModule} onNavigate={handleNavigate} />}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 16 }}
            className={`fixed z-[110] left-1/2 -translate-x-1/2 px-4 py-2.5 rounded-xl bg-slate-800/90 border border-slate-700/50 text-white text-xs font-medium shadow-xl backdrop-blur-sm ${
              isMobile ? 'bottom-24' : 'bottom-5'
            }`}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
