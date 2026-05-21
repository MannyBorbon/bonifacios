import { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { meetingsAPI, messagesAPI } from '../../services/api'
import GroupCallWebRTC from './GroupCallWebRTC'

const TZ = 'America/Hermosillo'

const fmtDT = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleString('es-MX', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

const fmtChatTime = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleTimeString('es-MX', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit'
  })
}

const ROLE_BADGE = {
  host: { label: 'Anfitrión', cls: 'border-amber-500/30 bg-amber-500/[0.12] text-amber-100/85' },
  moderator: { label: 'Moderador', cls: 'border-violet-500/35 bg-violet-500/[0.12] text-violet-100/85' },
  participant: { label: 'Participante', cls: 'border-slate-600/40 bg-slate-800/50 text-slate-400' },
}

function RoleBadge({ role }) {
  const meta = ROLE_BADGE[role] || ROLE_BADGE.participant
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium tracking-wide uppercase ${meta.cls}`}>
      {meta.label}
    </span>
  )
}

const toLocalDT = (d) => {
  if (!d) return ''
  const dt = new Date(String(d).replace(' ', 'T'))
  const pad = (n) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

const EMPTY_MINUTA = {
  titulo: '',
  lugar: 'Bonifacio\'s Restaurant, San Carlos, Sonora',
  fecha_inicio: '',
  fecha_fin: '',
  asistentes: '',
  ausentes: '',
  orden_del_dia: '',
  resumen_temas: '',
  decisiones: '',
  plan_accion: '',
  proxima_reunion: '',
  elabora_minuta: '',
}

const Section = ({ number, title, icon, children }) => (
  <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 overflow-hidden">
    <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-cyan-500/8 bg-[#040c1a]/60">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500/15 border border-cyan-500/20 text-[9px] font-bold text-cyan-400">{number}</span>
      {icon}
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium">{title}</h3>
    </div>
    <div className="p-4">{children}</div>
  </div>
)

const Field = ({ label, children }) => (
  <div>
    <label className="block text-[9px] uppercase tracking-widest text-slate-600 mb-1">{label}</label>
    {children}
  </div>
)


const ChecklistField = ({ items = [], onChange, placeholder = 'Agregar elemento…', numbered = false }) => {
  const [input, setInput] = useState('')
  const handleAdd = () => {
    const val = input.trim()
    if (!val) return
    onChange([...items, val])
    setInput('')
  }
  const handleRemove = (idx) => onChange(items.filter((_, i) => i !== idx))
  const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }
  return (
    <div className="space-y-1.5">
      {items.map((item, i) => (
        <div key={i} className="group flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-cyan-500/8 bg-[#030712]/30 hover:border-cyan-500/20 transition-colors">
          <span className="text-[11px] text-cyan-500/50 font-medium shrink-0 w-4 text-right">{numbered ? `${i+1}.` : '•'}</span>
          <span className="flex-1 text-sm text-slate-300 break-words min-w-0">{item}</span>
          <button type="button" onClick={() => handleRemove(i)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/10 touch-manipulation" title="Eliminar">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2 mt-1">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 bg-[#030712]/40 border border-cyan-500/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:border-cyan-500/30 focus:outline-none transition-colors min-h-[40px]"
        />
        <button type="button" onClick={handleAdd} disabled={!input.trim()} className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 disabled:opacity-30 transition-all touch-manipulation min-h-[40px]">
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
          Agregar
        </button>
      </div>
    </div>
  )
}

export default function MeetingRoom() {
  const { id } = useParams()
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')

  const [meeting, setMeeting] = useState(null)
  const [participants, setParticipants] = useState([])
  const [minuta, setMinuta] = useState(EMPTY_MINUTA)
  const [minutesMeta, setMinutesMeta] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [ending, setEnding] = useState(false)
  const [tab, setTab] = useState('sala') // 'sala' | 'minuta'
  const [groupCallOpen, setGroupCallOpen] = useState(false)
  const [groupCallMode, setGroupCallMode] = useState('video') // video | audio
  const [mobileSalaPane, setMobileSalaPane] = useState('video') // video | participants | chat
  const [messages, setMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatSending, setChatSending] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [chatError, setChatError] = useState('')
  const [allUsers, setAllUsers] = useState([])
  const [attendeeIds, setAttendeeIds] = useState([])
  const saveTimer = useRef(null)
  const hasJoined = useRef(false)
  const chatScrollRef = useRef(null)
  const chatInitialScrollDoneRef = useRef(false)
  const autoOpenedCallRef = useRef(false)

  // Derived flags must be declared before any hook that lists them in dependency arrays
  // (otherwise TDZ: "Cannot access before initialization" in production bundles).

  useEffect(() => {
    window.dispatchEvent(new Event('meeting:start'))
    return () => { window.dispatchEvent(new Event('meeting:end')) }
  }, [])

  const isCreator = meeting?.created_by == currentUser.id
  const isAdmin = currentUser.role === 'administrador'
  const canEnd = isCreator || isAdmin
  const isEnded = meeting?.status === 'ended'
  const canModerate = Boolean(
    meeting?.can_moderate ||
    meeting?.moderator_user_id == currentUser.id ||
    isCreator ||
    isAdmin
  )
  /** Solo Manuel puede editar/guardar la minuta (usuario de login o nombre visible). */
  const isMinutaEditor = (() => {
    const un = String(currentUser?.username ?? '').trim().toLowerCase()
    const fn = String(currentUser?.full_name ?? '').trim().toLowerCase()
    if (un === 'manuel') return true
    if (fn === 'manuel') return true
    if (fn.startsWith('manuel ')) return true
    return false
  })()
  const canEditMinuta = isMinutaEditor

  const parseMinuta = (content) => {
    if (!content) return EMPTY_MINUTA
    try { return { ...EMPTY_MINUTA, ...JSON.parse(content) } }
    catch { return { ...EMPTY_MINUTA, resumen_temas: content } }
  }

  const loadRoom = useCallback(async () => {
    try {
      const [rRes, mRes] = await Promise.all([
        meetingsAPI.getRoom(id),
        meetingsAPI.getMinutes(id),
      ])
      const mtg = rRes.data.meeting
      const parts = rRes.data.participants || []
      setMeeting({ ...mtg, can_moderate: Boolean(rRes.data.can_moderate) })
      setParticipants(parts)
      if (rRes.data.attendee_ids) setAttendeeIds(rRes.data.attendee_ids.map(Number))

      if (mRes.data.minutes) {
        setMinuta(parseMinuta(mRes.data.minutes.content))
        setMinutesMeta(mRes.data.minutes)
      } else {
        // Auto-fill from meeting data
        setMinuta(prev => ({
          ...prev,
          titulo: mtg.title || '',
          fecha_inicio: toLocalDT(mtg.started_at),
          fecha_fin: toLocalDT(mtg.ended_at),
          asistentes: parts.map(p => p.full_name || p.username).join(', '),
          elabora_minuta: currentUser.full_name || currentUser.username || '',
        }))
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadMessages = useCallback(async () => {
    try {
      const res = await meetingsAPI.getMessages(id)
      const next = Array.isArray(res.data?.messages) ? res.data.messages : []
      setMessages((prev) => {
        if (prev.length !== next.length) return next
        for (let i = 0; i < prev.length; i += 1) {
          const a = prev[i]
          const b = next[i]
          if (!b || a.id !== b.id || a.content !== b.content || String(a.created_at) !== String(b.created_at)) {
            return next
          }
        }
        return prev
      })
    } catch {
      // silent
    }
  }, [id])

  // Load all users for attendee checklist
  useEffect(() => {
    (async () => {
      try {
        const res = await messagesAPI.getUsers()
        const users = Array.isArray(res.data) ? res.data : (res.data?.users || [])
        setAllUsers(users)
      } catch { /* silent */ }
    })()
  }, [])

  useEffect(() => {
    const join = async () => {
      try { await meetingsAPI.joinMeeting(parseInt(id)); hasJoined.current = true }
      catch { /* silent */ }
    }
    join()
    loadRoom()
    loadMessages()
    return () => {
      if (hasJoined.current) meetingsAPI.leaveMeeting(parseInt(id)).catch(() => {})
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [id, loadRoom, loadMessages])

  // Poll participants every 8s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await meetingsAPI.getRoom(id)
        setParticipants(res.data.participants || [])
        setMeeting((prev) => {
          const m = res.data.meeting
          if (!m) return prev
          return {
            ...m,
            can_moderate: Boolean(res.data.can_moderate ?? prev?.can_moderate ?? m.can_moderate),
          }
        })
      } catch { /* silent */ }
    }, 8000)
    return () => clearInterval(t)
  }, [id])

  useEffect(() => {
    const t = setInterval(() => {
      loadMessages()
    }, 3000)
    return () => clearInterval(t)
  }, [loadMessages])

  useEffect(() => {
    if (tab !== 'sala') chatInitialScrollDoneRef.current = false
  }, [tab])

  useEffect(() => {
    if (!groupCallOpen) return
    setMobileSalaPane('video')
  }, [groupCallOpen, groupCallMode])

  useEffect(() => {
    if (isEnded || autoOpenedCallRef.current) return
    if (tab !== 'sala') return
    setGroupCallMode('video')
    setGroupCallOpen(true)
    autoOpenedCallRef.current = true
  }, [tab, isEnded])

  /** No usar scrollIntoView: sube toda la página. Sólo el panel del chat, y sólo si el usuario estaba abajo o es la primera sincronización. */
  useLayoutEffect(() => {
    if (tab !== 'sala') return
    const el = chatScrollRef.current
    if (!el) return
    const threshold = 120
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight
    if (!chatInitialScrollDoneRef.current && messages.length > 0) {
      el.scrollTop = el.scrollHeight
      chatInitialScrollDoneRef.current = true
      return
    }
    if (dist < threshold) el.scrollTop = el.scrollHeight
  }, [messages, tab])

  useEffect(() => {
    if (!chatError) return
    const t = setTimeout(() => setChatError(''), 5000)
    return () => clearTimeout(t)
  }, [chatError])

  const upd = (key) => (e) => {
    if (!isMinutaEditor) return
    const value = e.target.value
    setMinuta(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave({ ...minuta, [key]: value }), 2000)
  }

  const doSave = async (data) => {
    if (!isMinutaEditor) return
    setSaving(true)
    try {
      const res = await meetingsAPI.saveMinutes({ meeting_id: parseInt(id), content: JSON.stringify(data) })
      setMinutesMeta(res.data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { /* silent */ }
    finally { setSaving(false) }
  }

  const handleSaveNow = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    doSave(minuta)
  }

  const handleToggleAttendee = async (userId) => {
    if (!isAdmin) return
    const next = attendeeIds.includes(userId)
      ? attendeeIds.filter(i => i !== userId)
      : [...attendeeIds, userId]
    setAttendeeIds(next)
    try {
      const res = await meetingsAPI.updateAttendees(parseInt(id), next)
      if (res.data?.attendee_ids) setAttendeeIds(res.data.attendee_ids.map(Number))
    } catch { /* silent */ }
  }

  const handleEnd = async () => {
    if (!confirm('¿Finalizar la reunión para todos?')) return
    setEnding(true)
    try {
      await doSave(minuta)
      await meetingsAPI.endMeeting(parseInt(id))
      navigate('/admin/meetings')
    } catch { /* silent */ }
    finally { setEnding(false) }
  }

  const handleLeave = async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await doSave(minuta).catch(() => {})
    await meetingsAPI.leaveMeeting(parseInt(id)).catch(() => {})
    hasJoined.current = false
    navigate('/admin/meetings')
  }

  const taCls = 'w-full bg-[#030712]/40 border border-cyan-500/10 rounded-xl px-3 py-3 sm:py-2 text-sm text-slate-300 placeholder-slate-700 focus:border-cyan-500/30 focus:outline-none resize-none transition-colors'
  const inCls = 'w-full bg-[#030712]/40 border border-cyan-500/10 rounded-xl px-3 py-3 sm:py-2 text-sm text-slate-300 placeholder-slate-700 focus:border-cyan-500/30 focus:outline-none transition-colors min-h-[44px]'

  const closeGroupCall = useCallback(() => setGroupCallOpen(false), [])

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text || chatSending || isEnded) return
    setChatSending(true)
    try {
      await meetingsAPI.sendMessage(parseInt(id, 10), text)
      setChatInput('')
      setChatError('')
      await loadMessages()
    } catch {
      setChatError('No se pudo enviar el mensaje. Revisa tu conexión e inténtalo de nuevo.')
    } finally {
      setChatSending(false)
    }
  }

  const changeParticipantRole = async (userId, participantRole) => {
    if (!canModerate || isEnded) return
    try {
      await meetingsAPI.setParticipantRole(parseInt(id, 10), userId, participantRole)
      await loadRoom()
    } catch {
      // silent
    }
  }

  const removeParticipant = async (userId) => {
    if (!canModerate || isEnded) return
    if (!confirm('¿Remover participante de la reunión?')) return
    try {
      await meetingsAPI.removeParticipant(parseInt(id, 10), userId)
      await loadRoom()
    } catch {
      // silent
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse" aria-busy="true" aria-label="Cargando reunión">
      <div className="h-10 rounded-lg bg-slate-800/40" />
      <div className="h-10 rounded-lg bg-slate-800/30 max-w-xs" />
      <div className="space-y-3">
        <div className="h-24 rounded-xl bg-slate-800/25" />
        <div className="h-40 rounded-xl bg-slate-800/20" />
        <div className="h-32 rounded-xl bg-slate-800/20" />
      </div>
    </div>
  )
  if (!meeting) {
    return (
      <div className="rounded-2xl border border-slate-700/40 bg-[#030b18]/70 px-6 py-16 text-center">
        <p className="text-sm text-slate-400">No encontramos esta reunión o ya no tienes acceso.</p>
        <button
          type="button"
          onClick={() => navigate('/admin/meetings')}
          className="mt-6 inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 py-2.5 text-sm text-cyan-300 transition-colors hover:border-cyan-400/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
        >
          Volver a reuniones
        </button>
      </div>
    )
  }

  const copyMeetingLink = async () => {
    const url = window.location.href
    try {
      await navigator.clipboard.writeText(url)
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 2200)
    } catch {
      setChatError('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <main className="space-y-4 pb-[calc(env(safe-area-inset-bottom)+5.5rem)] sm:space-y-5 sm:pb-10">
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-20 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#050f1a]/95 to-[#030812]/90 px-4 py-3 sm:static sm:px-5 shadow-inner shadow-black/20 ring-1 ring-cyan-500/[0.06] backdrop-blur-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleLeave}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 sm:px-2 sm:py-1 text-xs text-slate-500 transition-colors hover:bg-white/[0.04] hover:text-cyan-400 active:text-cyan-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/35 touch-manipulation min-h-[44px] sm:min-h-0"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Reuniones
              </button>
              <span className="text-slate-700" aria-hidden>/</span>
              {!isEnded && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-emerald-400/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" aria-hidden />
                  En curso
                </span>
              )}
              {isEnded && (
                <span className="rounded-full border border-slate-600/35 bg-slate-800/50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  Finalizada
                </span>
              )}
              {canModerate && !isEnded && (
                <span className="rounded-full border border-violet-500/30 bg-violet-500/[0.1] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-violet-300/85">
                  Moderación
                </span>
              )}
            </div>
            <h1 className="mt-2 text-lg font-light tracking-wide text-white sm:text-xl truncate">{meeting.title}</h1>
            {(meeting.started_at || meeting.scheduled_at) && (
              <p className="mt-1 text-[11px] text-slate-500">
                {meeting.started_at ? <>Inicio: {fmtDT(meeting.started_at)}</> : <>Programada: {fmtDT(meeting.scheduled_at)}</>}
              </p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {saving && <span className="text-[10px] text-slate-500 animate-pulse">Guardando minuta…</span>}
            {saved && !saving && (
              <span className="text-[10px] text-emerald-400/80 flex items-center gap-1" role="status">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Minuta guardada
              </span>
            )}
            {canEditMinuta && (
              <button
                type="button"
                onClick={handleSaveNow}
                disabled={saving}
                className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.08] px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-medium text-cyan-300 transition-all hover:border-cyan-400/45 hover:bg-cyan-500/15 active:scale-95 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 touch-manipulation min-h-[44px]"
              >
                <span className="hidden sm:inline">Guardar minuta</span>
                <span className="sm:hidden">Guardar</span>
              </button>
            )}
            {!isEnded && (
              <>
                <button
                  type="button"
                  onClick={handleLeave}
                  className="rounded-xl border border-slate-600/35 bg-slate-800/40 px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-500/50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/35 touch-manipulation min-h-[44px]"
                >
                  Salir
                </button>
                {canEnd && (
                  <button
                    type="button"
                    onClick={handleEnd}
                    disabled={ending}
                    className="rounded-xl border border-red-500/30 bg-red-950/40 px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-medium text-red-300 transition-all hover:border-red-400/45 hover:bg-red-950/60 active:scale-95 disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400/40 touch-manipulation min-h-[44px]"
                  >
                    {ending ? 'Finalizando…' : <><span className="hidden sm:inline">Finalizar para todos</span><span className="sm:hidden">Finalizar</span></>}
                  </button>
                )}
              </>
            )}
            {isEnded && canEditMinuta && (
              <button
                type="button"
                onClick={handleLeave}
                className="rounded-xl border border-slate-600/35 bg-slate-800/40 px-3 sm:px-3.5 py-2.5 sm:py-2 text-xs font-medium text-slate-300 transition-all hover:border-slate-500/50 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/35 touch-manipulation min-h-[44px]"
              >
                Salir
              </button>
            )}
          </div>
        </div>
      </header>

      <div aria-live="polite" className="sr-only">
        {copyFeedback ? 'Enlace copiado al portapapeles' : ''}
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-px sm:flex-row sm:items-end sm:justify-between">
        <div className="grid grid-cols-2 gap-1.5 sm:gap-1" role="tablist" aria-label="Secciones de la reunión">
          {[
            { key: 'minuta', label: 'Minuta' },
            { key: 'sala', label: 'Sala en vivo', count: participants.length },
          ].map((tItem) => (
            <button
              key={tItem.key}
              type="button"
              role="tab"
              aria-selected={tab === tItem.key}
              id={`meeting-tab-${tItem.key}`}
              aria-controls={`meeting-panel-${tItem.key}`}
              onClick={() => setTab(tItem.key)}
              className={`relative inline-flex min-h-[44px] items-center justify-center px-4 py-2.5 text-xs font-medium transition-all rounded-xl sm:rounded-t-xl sm:rounded-b-none focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 touch-manipulation ${
                tab === tItem.key
                  ? 'text-cyan-200 bg-[#061018]/95 border border-b-0 border-white/[0.08]'
                  : 'text-slate-500 hover:text-slate-300 active:text-slate-200 border border-transparent'
              }`}
            >
              {tItem.label}
              {tItem.key === 'sala' && tItem.count > 0 && !isEnded && (
                <span className="ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-md bg-emerald-500/20 px-1 text-[10px] font-semibold text-emerald-400">
                  {tItem.count}
                </span>
              )}
            </button>
          ))}
        </div>
        {minutesMeta?.editor_name && (
          <span className="text-[10px] text-slate-600 self-center sm:pb-2 text-right">
            Última edición · {minutesMeta.editor_name}
            <span className="text-slate-700"> · {fmtDT(minutesMeta.updated_at)}</span>
          </span>
        )}
      </div>

      {/* ── MINUTA TAB ── */}
      {tab === 'minuta' && (
        <div role="tabpanel" id="meeting-panel-minuta" aria-labelledby="meeting-tab-minuta" className="space-y-4 pt-2">

          {/* S1 – Identificación */}
          <Section number="1" title="Identificación de la reunión"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Título / Motivo de la reunión">
                  {!canEditMinuta
                    ? <p className="text-sm text-slate-300">{minuta.titulo || '—'}</p>
                    : <input value={minuta.titulo} onChange={upd('titulo')} placeholder="Ej: Revisión de cotizaciones Q1" className={inCls} />
                  }
                </Field>
              </div>
              <Field label="Fecha y hora de inicio">
                {!canEditMinuta
                  ? <p className="text-sm text-slate-300">{minuta.fecha_inicio ? fmtDT(minuta.fecha_inicio) : '—'}</p>
                  : <input type="datetime-local" value={minuta.fecha_inicio} onChange={upd('fecha_inicio')} className={inCls} />
                }
              </Field>
              <Field label="Fecha y hora de término">
                {!canEditMinuta
                  ? <p className="text-sm text-slate-300">{minuta.fecha_fin ? fmtDT(minuta.fecha_fin) : '—'}</p>
                  : <input type="datetime-local" value={minuta.fecha_fin} onChange={upd('fecha_fin')} className={inCls} />
                }
              </Field>
              <div className="sm:col-span-2">
                <Field label="Lugar o plataforma">
                  {!canEditMinuta
                    ? <p className="text-sm text-slate-300">{minuta.lugar || '—'}</p>
                    : <input value={minuta.lugar} onChange={upd('lugar')} placeholder="Ej: Comedor Bonifacio's / Zoom / Teams" className={inCls} />
                  }
                </Field>
              </div>
            </div>
          </Section>

          {/* S2 – Asistentes (checklist) */}
          <Section number="2" title="Asistentes y ausentes"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          >
            <div className="space-y-1 max-h-60 overflow-y-auto overscroll-contain">
              {allUsers.map(u => {
                const checked = attendeeIds.includes(u.id)
                const isCreatorUser = meeting && parseInt(meeting.created_by) === u.id
                return (
                  <label key={u.id} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all touch-manipulation min-h-[40px] ${
                    checked ? 'bg-cyan-500/5 border border-cyan-500/15' : 'border border-transparent hover:bg-white/[0.02]'
                  } ${!isAdmin ? 'pointer-events-none' : 'cursor-pointer'}`}>
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!isAdmin || isCreatorUser}
                        onChange={() => handleToggleAttendee(u.id)}
                        className="h-4 w-4 rounded border-slate-600 bg-[#030712]/60 text-cyan-500 focus:ring-cyan-500/30 accent-cyan-500 disabled:opacity-50"
                      />
                    )}
                    <span className={`text-sm ${isAdmin && !checked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{u.full_name || u.username}</span>
                    {isAdmin && isCreatorUser && <span className="text-[9px] text-amber-500/60 ml-auto">Creador</span>}
                    {isAdmin && !checked && !isCreatorUser && <span className="text-[9px] text-red-400/50 ml-auto">No verá la reunión</span>}
                  </label>
                )
              })}
              {allUsers.length === 0 && <p className="text-xs text-slate-600 py-2">Cargando usuarios…</p>}
            </div>
            <div className="mt-3 pt-3 border-t border-cyan-500/8">
              <Field label="Ausentes (con justificación si aplica)">
                {!canEditMinuta
                  ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.ausentes || '—'}</p>
                  : <textarea value={minuta.ausentes} onChange={upd('ausentes')} rows={2} placeholder="Ej: Carlos Ruiz — permiso personal" className={taCls} />
                }
              </Field>
            </div>
          </Section>

          {/* S3 – Orden del día (list items) */}
          <Section number="3" title="Orden del día (Agenda)"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h7" /></svg>}
          >
            {!canEditMinuta ? (
              <ul className="space-y-1">
                {(Array.isArray(minuta.orden_del_dia) ? minuta.orden_del_dia : (minuta.orden_del_dia || '').split('\n').filter(Boolean)).map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-cyan-500/60 font-medium shrink-0">{i+1}.</span>{item}</li>
                ))}
                {(!minuta.orden_del_dia || (Array.isArray(minuta.orden_del_dia) && minuta.orden_del_dia.length === 0)) && <li className="text-sm text-slate-600">—</li>}
              </ul>
            ) : (
              <ChecklistField
                items={Array.isArray(minuta.orden_del_dia) ? minuta.orden_del_dia : (minuta.orden_del_dia || '').split('\n').filter(Boolean)}
                onChange={(items) => { setMinuta(prev => ({ ...prev, orden_del_dia: items })); setSaved(false); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => doSave({ ...minuta, orden_del_dia: items }), 2000) }}
                placeholder="Agregar punto de agenda…"
                numbered
              />
            )}
          </Section>

          {/* S4 – Resumen (texto libre) */}
          <Section number="4" title="Resumen de temas discutidos"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          >
            {!canEditMinuta
              ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.resumen_temas || '—'}</p>
              : <textarea value={minuta.resumen_temas} onChange={upd('resumen_temas')} rows={5} placeholder="Describe brevemente los puntos tratados en cada tema de la agenda…" className={taCls} />
            }
          </Section>

          {/* S5 – Decisiones (list items) */}
          <Section number="5" title="Decisiones tomadas"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          >
            {!canEditMinuta ? (
              <ul className="space-y-1">
                {(Array.isArray(minuta.decisiones) ? minuta.decisiones : (minuta.decisiones || '').split('\n').filter(Boolean)).map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-emerald-400/60">✓</span>{item}</li>
                ))}
                {(!minuta.decisiones || (Array.isArray(minuta.decisiones) && minuta.decisiones.length === 0)) && <li className="text-sm text-slate-600">—</li>}
              </ul>
            ) : (
              <ChecklistField
                items={Array.isArray(minuta.decisiones) ? minuta.decisiones : (minuta.decisiones || '').split('\n').filter(Boolean)}
                onChange={(items) => { setMinuta(prev => ({ ...prev, decisiones: items })); setSaved(false); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => doSave({ ...minuta, decisiones: items }), 2000) }}
                placeholder="Agregar decisión…"
              />
            )}
          </Section>

          {/* S6 – Plan de acción (list items) */}
          <Section number="6" title="Plan de acción — Tareas asignadas"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          >
            {!canEditMinuta ? (
              <ul className="space-y-1">
                {(Array.isArray(minuta.plan_accion) ? minuta.plan_accion : (minuta.plan_accion || '').split('\n').filter(Boolean)).map((item, i) => (
                  <li key={i} className="text-sm text-slate-300 flex items-start gap-2"><span className="text-amber-400/60 font-medium shrink-0">{i+1}.</span>{item}</li>
                ))}
                {(!minuta.plan_accion || (Array.isArray(minuta.plan_accion) && minuta.plan_accion.length === 0)) && <li className="text-sm text-slate-600">—</li>}
              </ul>
            ) : (
              <ChecklistField
                items={Array.isArray(minuta.plan_accion) ? minuta.plan_accion : (minuta.plan_accion || '').split('\n').filter(Boolean)}
                onChange={(items) => { setMinuta(prev => ({ ...prev, plan_accion: items })); setSaved(false); if (saveTimer.current) clearTimeout(saveTimer.current); saveTimer.current = setTimeout(() => doSave({ ...minuta, plan_accion: items }), 2000) }}
                placeholder="Tarea — Responsable — Fecha límite"
                numbered
              />
            )}
          </Section>

          {/* S7 – Próxima reunión + Elabora */}
          <Section number="7" title="Cierre"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha y hora de la próxima reunión (si aplica)">
                {!canEditMinuta
                  ? <p className="text-sm text-slate-300">{minuta.proxima_reunion ? fmtDT(minuta.proxima_reunion) : 'No definida'}</p>
                  : <input type="datetime-local" value={minuta.proxima_reunion} onChange={upd('proxima_reunion')} className={inCls} />
                }
              </Field>
              <Field label="Minuta elaborada por">
                {!canEditMinuta
                  ? <p className="text-sm text-slate-300">{minuta.elabora_minuta || '—'}</p>
                  : <input value={minuta.elabora_minuta} onChange={upd('elabora_minuta')} placeholder="Nombre de quien levanta la minuta" className={inCls} />
                }
              </Field>
            </div>
          </Section>

          {canEditMinuta && (
            <div className="flex justify-end">
              <button type="button" onClick={handleSaveNow} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-5 sm:px-6 py-2.5 sm:py-2 text-sm font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 active:scale-95 disabled:opacity-40 transition-all touch-manipulation min-h-[44px]">
                {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar minuta'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SALA TAB ── */}
      {tab === 'sala' && (
        <div role="tabpanel" id="meeting-panel-sala" aria-labelledby="meeting-tab-sala" className="space-y-4 pt-2">
          {!isEnded && groupCallOpen && (
            <GroupCallWebRTC
              meetingId={id}
              currentUserId={parseInt(currentUser.id)}
              participants={participants}
              mode={groupCallMode}
              meetingTitle={meeting?.title || 'Reunion en vivo'}
              onClose={closeGroupCall}
            />
          )}

          {!isEnded && groupCallOpen && (
            <section className="lg:hidden rounded-xl border border-cyan-500/15 bg-[#030b14]/85 p-2.5">
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setMobileSalaPane('video')}
                  className={`rounded-xl px-2.5 py-2.5 text-[11px] font-medium transition-all touch-manipulation min-h-[44px] ${
                    mobileSalaPane === 'video'
                      ? 'border border-cyan-400/40 bg-cyan-500/18 text-cyan-100'
                      : 'border border-slate-700/40 bg-slate-900/50 text-slate-400 active:bg-slate-800/60'
                  }`}
                >
                  Video
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSalaPane('participants')}
                  className={`rounded-xl px-2.5 py-2.5 text-[11px] font-medium transition-all touch-manipulation min-h-[44px] ${
                    mobileSalaPane === 'participants'
                      ? 'border border-cyan-400/40 bg-cyan-500/18 text-cyan-100'
                      : 'border border-slate-700/40 bg-slate-900/50 text-slate-400 active:bg-slate-800/60'
                  }`}
                >
                  Personas
                </button>
                <button
                  type="button"
                  onClick={() => setMobileSalaPane('chat')}
                  className={`rounded-xl px-2.5 py-2.5 text-[11px] font-medium transition-all touch-manipulation min-h-[44px] ${
                    mobileSalaPane === 'chat'
                      ? 'border border-cyan-400/40 bg-cyan-500/18 text-cyan-100'
                      : 'border border-slate-700/40 bg-slate-900/50 text-slate-400 active:bg-slate-800/60'
                  }`}
                >
                  Chat
                </button>
              </div>
            </section>
          )}

          {!isEnded && (
            <section className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-[#051018]/95 to-[#030a12]/92 p-4 sm:p-5 ring-1 ring-cyan-500/[0.07] shadow-lg shadow-black/30" aria-labelledby="sala-acciones-heading">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <h2 id="sala-acciones-heading" className="text-sm font-medium text-slate-200 tracking-wide">
                    Videollamada y audio
                  </h2>
                  <p className="mt-1 max-w-xl text-[11px] leading-relaxed text-slate-500">
                    Videollamada WebRTC nativa — sin dependencias externas. Usa los controles de mic y cámara en la barra del video.
                  </p>
                </div>
                <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:w-auto lg:flex-wrap lg:justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupCallMode('video')
                      setGroupCallOpen(true)
                    }}
                    className={`inline-flex w-full min-h-[48px] sm:min-h-[46px] items-center justify-center gap-2 rounded-xl border px-4 py-3 sm:py-2.5 text-xs font-medium transition-all touch-manipulation active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/45 ${
                      groupCallOpen && groupCallMode === 'video'
                        ? 'border-emerald-400/45 bg-emerald-500/[0.18] text-emerald-100 shadow-[0_0_24px_-8px_rgba(52,211,153,0.35)]'
                        : 'border-emerald-500/25 bg-emerald-500/[0.08] text-emerald-300/95 hover:border-emerald-400/40'
                    }`}
                  >
                    <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Videollamada grupal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setGroupCallMode('audio')
                      setGroupCallOpen(true)
                    }}
                    className={`inline-flex w-full min-h-[48px] sm:min-h-[46px] items-center justify-center gap-2 rounded-xl border px-4 py-3 sm:py-2.5 text-xs font-medium transition-all touch-manipulation active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45 ${
                      groupCallOpen && groupCallMode === 'audio'
                        ? 'border-amber-400/45 bg-amber-500/[0.16] text-amber-100'
                        : 'border-amber-500/28 bg-amber-500/[0.08] text-amber-200/95 hover:border-amber-400/35'
                    }`}
                  >
                    <svg className="h-4 w-4 opacity-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 6v8a3 3 0 01-3 3z" />
                    </svg>
                    Solo audio
                  </button>
                </div>
              </div>
            </section>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-5">
            {/* Participantes */}
            <section
              className={`lg:col-span-5 rounded-2xl border border-white/[0.06] bg-[#030b14]/85 p-4 sm:p-5 ring-1 ring-cyan-500/[0.05] ${
                groupCallOpen && mobileSalaPane !== 'participants' ? 'hidden lg:block' : ''
              }`}
              aria-labelledby="participantes-heading"
            >
              <div className="flex items-center justify-between gap-3 border-b border-white/[0.05] pb-3 mb-4">
                <h2 id="participantes-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-500/65">
                  {isEnded ? 'Participantes' : 'En sala ahora'}
                </h2>
                {!isEnded && (
                  <span className="text-[11px] text-emerald-400/75 tabular-nums">
                    {participants.length === 0 ? 'Nadie aún' : `${participants.length} en línea`}
                  </span>
                )}
              </div>
              {participants.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-700/50 bg-[#020910]/80 px-4 py-10 text-center text-xs text-slate-500 leading-relaxed">
                  {isEnded ? 'Sin registro de asistencia en esta reunión.' : 'Cuando alguien entre a la sala, aparecerá aquí con estado en tiempo real.'}
                </p>
              ) : (
                <ul className="space-y-2 max-h-[42svh] overflow-y-auto pr-1 sm:max-h-none sm:overflow-visible">
                  {participants.map((p) => {
                    const name = p.full_name || p.username || 'Usuario'
                    const initial = (name)[0]?.toUpperCase() || '?'
                    return (
                      <li
                        key={p.user_id}
                        className="flex flex-wrap items-center gap-2.5 rounded-xl border border-white/[0.04] bg-[#040d16]/55 px-3 py-2.5 transition-colors hover:border-cyan-500/12"
                      >
                        <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden border border-white/[0.08] bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                          {p.profile_photo ? (
                            <img src={p.profile_photo} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <span className="text-sm font-semibold text-cyan-400/85">{initial}</span>
                          )}
                          {!isEnded && (
                            <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-[#030b14] bg-emerald-400" title="Presente en sala" aria-hidden />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-200 truncate max-w-[12rem] sm:max-w-none">
                              {name}
                              {Number(p.user_id) === Number(currentUser.id) && (
                                <span className="ml-2 text-[10px] font-normal uppercase tracking-wide text-cyan-500/55">tú</span>
                              )}
                            </p>
                            {isAdmin && <RoleBadge role={p.participant_role} />}
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-600">
                            {!isEnded && <>En sala desde · {fmtChatTime(p.joined_at)}</>}
                            {isEnded && <>Registro · {fmtDT(p.joined_at)}</>}
                          </p>
                        </div>
                        {canModerate && !isEnded && Number(p.user_id) !== Number(currentUser.id) && (
                          <div className="flex w-full sm:w-auto sm:justify-end gap-1.5 pt-1 sm:pt-0">
                            <button
                              type="button"
                              onClick={() =>
                                changeParticipantRole(Number(p.user_id), p.participant_role === 'moderator' ? 'participant' : 'moderator')
                              }
                              className="rounded-lg border border-cyan-500/30 bg-cyan-500/[0.08] px-3 sm:px-2.5 py-2 sm:py-1.5 text-[10px] font-medium text-cyan-200/95 transition-colors hover:bg-cyan-500/15 active:bg-cyan-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40 touch-manipulation min-h-[36px]"
                              aria-label={p.participant_role === 'moderator' ? `Quitar rol moderador a ${name}` : `Designar moderador a ${name}`}
                            >
                              {p.participant_role === 'moderator' ? 'Quitar mod' : 'Moderador'}
                            </button>
                            <button
                              type="button"
                              onClick={() => removeParticipant(Number(p.user_id))}
                              className="rounded-lg border border-rose-500/35 bg-rose-500/[0.08] px-3 sm:px-2.5 py-2 sm:py-1.5 text-[10px] font-medium text-rose-200/95 transition-colors hover:bg-rose-500/15 active:bg-rose-500/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40 touch-manipulation min-h-[36px]"
                              aria-label={`Remover a ${name} de la reunión`}
                            >
                              Remover
                            </button>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            <div className={`lg:col-span-7 flex flex-col gap-4 ${groupCallOpen && mobileSalaPane !== 'chat' ? 'hidden lg:flex' : ''}`}>
              <section
                className={`rounded-2xl border border-white/[0.06] bg-[#030b14]/85 p-4 sm:p-5 ring-1 ring-slate-500/[0.06] ${
                  groupCallOpen ? 'hidden lg:block' : ''
                }`}
                aria-labelledby="sala-info-heading"
              >
                <h2 id="sala-info-heading" className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500 mb-3">
                  Detalle
                </h2>
                <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                  {meeting.started_at && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-slate-600">Inicio</dt>
                      <dd className="mt-0.5 text-slate-400">{fmtDT(meeting.started_at)}</dd>
                    </div>
                  )}
                  {meeting.ended_at && (
                    <div>
                      <dt className="text-[10px] uppercase tracking-wider text-slate-600">Fin</dt>
                      <dd className="mt-0.5 text-slate-400">{fmtDT(meeting.ended_at)}</dd>
                    </div>
                  )}
                  {meeting.creator_name && (
                    <div className="sm:col-span-2">
                      <dt className="text-[10px] uppercase tracking-wider text-slate-600">Organiza</dt>
                      <dd className="mt-0.5 text-slate-400">{meeting.creator_name}</dd>
                    </div>
                  )}
                </dl>
              </section>

              {!isEnded && (
                <div className={`rounded-xl border border-cyan-500/15 bg-gradient-to-br from-cyan-500/[0.06] to-transparent px-4 py-4 text-center ${groupCallOpen ? 'hidden lg:block' : ''}`}>
                  <p className="text-[11px] font-medium text-slate-300">Invitar al equipo</p>
                  <p className="mx-auto mt-1 max-w-sm text-[10px] text-slate-600">Copia el enlace y compártelo por WhatsApp o correo para que entren directo a esta sala.</p>
                  <button
                    type="button"
                    onClick={copyMeetingLink}
                    className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/[0.1] px-5 py-2.5 text-sm font-medium text-cyan-300 transition-all hover:border-cyan-400/50 hover:bg-cyan-500/15 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/45 touch-manipulation"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copyFeedback ? 'Enlace copiado' : 'Copiar enlace de la sala'}
                  </button>
                </div>
              )}

              <section
                className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-violet-500/15 bg-gradient-to-b from-[#090b18]/90 to-[#030812]/95 shadow-inner shadow-black/20 ring-1 ring-indigo-500/[0.08] min-h-[56svh] sm:min-h-[320px]"
                aria-labelledby="chat-heading"
              >
                <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
                  <h2 id="chat-heading" className="text-[11px] font-semibold uppercase tracking-[0.22em] text-indigo-200/75">
                    Chat del equipo
                  </h2>
                  {!isEnded && (
                    <span className="text-[10px] text-slate-600">Persistente · mismo hilo para todos</span>
                  )}
                </div>

                <div
                  ref={chatScrollRef}
                  role="log"
                  aria-relevant="additions"
                  aria-live="polite"
                  className="flex-1 space-y-2 overflow-y-auto px-4 py-3 min-h-[200px] max-h-[min(52vh,420px)] pr-2"
                >
                  {messages.map((message) => {
                    const mine = Number(message.sender_user_id) === Number(currentUser.id)
                    const sender = message.full_name || message.username || 'Usuario'
                    return (
                      <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 sm:max-w-[75%] ${
                            mine
                              ? 'border border-cyan-500/25 bg-gradient-to-br from-cyan-500/18 to-[#052028]/95 text-slate-100'
                              : 'border border-slate-600/35 bg-[#060d18]/95 text-slate-200'
                          }`}
                        >
                          {!mine && <p className="text-[10px] font-medium text-indigo-300/80">{sender}</p>}
                          <p className={`mt-0.5 text-sm leading-snug whitespace-pre-wrap break-words ${mine ? 'text-slate-100/95' : ''}`}>{message.content}</p>
                          <p className={`mt-2 text-[9px] tabular-nums ${mine ? 'text-cyan-200/35 text-right' : 'text-slate-600'}`}>
                            {fmtChatTime(message.created_at)}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                  {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center gap-2 py-12 px-4 text-center">
                      <div className="rounded-full bg-indigo-500/10 p-4 ring-1 ring-indigo-500/15">
                        <svg className="h-8 w-8 text-indigo-400/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </div>
                      <p className="text-xs text-slate-500">{isEnded ? 'No hay mensajes en esta reunión.' : 'Aquí pueden coordinar antes o durante la videollamada.'}</p>
                    </div>
                  )}
                </div>

                {chatError && (
                  <div className="border-t border-red-500/20 bg-red-950/35 px-4 py-2 text-center text-[11px] text-red-300/95" role="alert">
                    {chatError}
                  </div>
                )}

                {!isEnded ? (
                  <div className="border-t border-white/[0.06] p-3 sm:p-4">
                    <div className="flex gap-2">
                      <label htmlFor="meeting-chat-input" className="sr-only">
                        Mensaje para el chat grupal
                      </label>
                      <input
                        id="meeting-chat-input"
                        value={chatInput}
                        maxLength={2000}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            sendChatMessage()
                          }
                        }}
                        placeholder="Escribe un mensaje…"
                        disabled={chatSending}
                        className="min-h-[44px] flex-1 rounded-xl border border-slate-600/40 bg-[#030912]/95 px-3.5 py-2.5 sm:py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:border-indigo-500/40 focus:outline-none focus:ring-1 focus:ring-indigo-500/30 disabled:opacity-60"
                      />
                      <button
                        type="button"
                        onClick={sendChatMessage}
                        disabled={chatSending || !chatInput.trim()}
                        className="inline-flex shrink-0 min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-indigo-500/35 bg-indigo-500/15 px-4 text-sm font-medium text-indigo-100 transition-all hover:bg-indigo-500/25 active:bg-indigo-500/30 disabled:pointer-events-none disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/50 touch-manipulation"
                      >
                        {chatSending ? (
                          <span className="h-4 w-4 animate-spin rounded-full border border-indigo-300/40 border-t-indigo-100" aria-hidden />
                        ) : (
                          <span className="px-1">Enviar</span>
                        )}
                      </button>
                    </div>
                    <p className="mt-2 text-[10px] text-slate-600">Enter envía · este chat es independiente del chat de Jitsi</p>
                  </div>
                ) : (
                  <div className="border-t border-white/[0.05] px-4 py-3 text-center text-[11px] text-slate-600">El chat está cerrado: la reunión finalizó.</div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
