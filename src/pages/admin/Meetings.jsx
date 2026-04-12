import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { meetingsAPI } from '../../services/api'

const TZ = 'America/Hermosillo'

const STATUS_META = {
  active:    { label: 'En curso',    color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400 animate-pulse' },
  scheduled: { label: 'Programada', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',          dot: 'bg-cyan-400' },
  ended:     { label: 'Finalizada',  color: 'bg-slate-500/20 text-slate-400 border-slate-500/30',       dot: 'bg-slate-500' },
}

const fmtDT = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleString('es-MX', {
    timeZone: TZ, weekday: 'short', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
  })
}

const EMPTY = { title: '', description: '', scheduled_at: '', start_now: true }

export default function Meetings() {
  const navigate = useNavigate()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const [meetings, setMeetings] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [createError, setCreateError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await meetingsAPI.getMeetings()
      setMeetings(res.data.meetings || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll for updates every 10s
  useEffect(() => {
    const t = setInterval(load, 10000)
    return () => clearInterval(t)
  }, [load])

  const handleCreate = async () => {
    if (!form.title.trim()) return
    setSaving(true)
    setCreateError('')
    try {
      const payload = {
        title: form.title,
        description: form.description,
        scheduled_at: form.start_now ? null : (form.scheduled_at || null),
      }
      const res = await meetingsAPI.createMeeting(payload)
      if (res.data?.error) {
        setCreateError(res.data.error)
        return
      }
      setModal(false)
      setForm(EMPTY)
      await load()
      if (res.data.status === 'active') navigate(`/admin/meetings/${res.data.id}`)
    } catch (err) {
      setCreateError(err.response?.data?.error || err.message || 'Error al crear la reunión')
    }
    finally { setSaving(false) }
  }

  const handleJoin = async (meeting) => {
    try {
      await meetingsAPI.joinMeeting(meeting.id)
      navigate(`/admin/meetings/${meeting.id}`)
    } catch { /* silent */ }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta reunión?')) return
    try { await meetingsAPI.deleteMeeting(id); load() } catch { /* silent */ }
  }

  const upd = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))
  const inputCls = 'w-full rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none'

  const active    = meetings.filter(m => m.status === 'active')
  const scheduled = meetings.filter(m => m.status === 'scheduled')
  const ended     = meetings.filter(m => m.status === 'ended')

  const MeetingCard = ({ m }) => {
    const meta = STATUS_META[m.status] || STATUS_META.ended
    const iAmIn = parseInt(m.i_am_in) > 0
    return (
      <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/50 p-4 hover:border-cyan-500/20 transition-all">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`h-2 w-2 rounded-full flex-shrink-0 ${meta.dot}`} />
              <span className={`text-[9px] rounded-full border px-2 py-0.5 ${meta.color}`}>{meta.label}</span>
              {m.status === 'active' && parseInt(m.active_count) > 0 && (
                <span className="text-[9px] text-emerald-400/60">{m.active_count} en sala</span>
              )}
            </div>
            <h3 className="text-sm font-medium text-slate-200 truncate">{m.title}</h3>
            {m.description && <p className="text-xs text-slate-600 truncate mt-0.5">{m.description}</p>}
            <p className="text-[10px] text-slate-600 mt-1">
              {m.scheduled_at ? `Programada: ${fmtDT(m.scheduled_at)}` : m.started_at ? `Inició: ${fmtDT(m.started_at)}` : ''}
              {m.creator_name && ` · Por ${m.creator_name}`}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            {m.status !== 'ended' && (
              <button
                onClick={() => handleJoin(m)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition-all ${
                  m.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                    : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20'
                }`}
              >
                {iAmIn ? (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                    Continuar
                  </>
                ) : (
                  <>
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                    Entrar
                  </>
                )}
              </button>
            )}
            {m.status === 'ended' && (
              <button
                onClick={() => navigate(`/admin/meetings/${m.id}`)}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs border border-slate-500/20 bg-slate-500/10 text-slate-400 hover:border-slate-400/30 transition-all"
              >
                Ver minuta
              </button>
            )}
            {(m.created_by == currentUser.id || currentUser.role === 'administrador') && (
              <button
                onClick={() => handleDelete(m.id)}
                className="text-[9px] text-red-400/40 hover:text-red-400/70 text-center transition-colors"
              >
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-white tracking-wide">Reuniones</h1>
          <p className="text-xs text-slate-500 mt-0.5">Sala de juntas del equipo Bonifacio's</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-500/20 transition-all"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          Nueva Reunión
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-emerald-500/60 mb-3 flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                En curso ahora
              </h2>
              <div className="space-y-2">{active.map(m => <MeetingCard key={m.id} m={m} />)}</div>
            </div>
          )}

          {/* Scheduled */}
          {scheduled.length > 0 && (
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 mb-3">Programadas</h2>
              <div className="space-y-2">{scheduled.map(m => <MeetingCard key={m.id} m={m} />)}</div>
            </div>
          )}

          {/* Empty */}
          {active.length === 0 && scheduled.length === 0 && (
            <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/40 p-12 text-center">
              <div className="h-12 w-12 rounded-full bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6 text-cyan-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.868v6.264a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500 mb-1">No hay reuniones activas</p>
              <p className="text-xs text-slate-700">Inicia una reunión ahora o programa una para después</p>
            </div>
          )}

          {/* Ended */}
          {ended.length > 0 && (
            <div>
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-slate-600 mb-3">Anteriores</h2>
              <div className="space-y-2">{ended.map(m => <MeetingCard key={m.id} m={m} />)}</div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      {modal && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 p-6 shadow-2xl">
            <h3 className="text-base font-light text-white mb-5">Nueva Reunión</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Título *</label>
                <input value={form.title} onChange={upd('title')} placeholder="Nombre de la reunión…" className={inputCls} autoFocus />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Descripción</label>
                <textarea value={form.description} onChange={upd('description')} rows={2} placeholder="Agenda u objetivo…" className={`${inputCls} resize-none`} />
              </div>

              {/* Start now vs schedule */}
              <div className="rounded-lg border border-cyan-500/10 bg-[#030b18]/40 p-3 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={form.start_now}
                    onChange={() => setForm(p => ({ ...p, start_now: true }))}
                    className="accent-emerald-400"
                  />
                  <div>
                    <p className="text-sm text-slate-200">Iniciar ahora</p>
                    <p className="text-[10px] text-slate-600">Entra directamente a la sala</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    checked={!form.start_now}
                    onChange={() => setForm(p => ({ ...p, start_now: false }))}
                    className="accent-cyan-400"
                  />
                  <div>
                    <p className="text-sm text-slate-200">Programar para después</p>
                    <p className="text-[10px] text-slate-600">Quedará en la lista para que todos se unan</p>
                  </div>
                </label>
                {!form.start_now && (
                  <input type="datetime-local" value={form.scheduled_at} onChange={upd('scheduled_at')} className={`${inputCls} mt-1`} />
                )}
              </div>
            </div>

            {createError && (
              <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                {createError}
              </div>
            )}
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim() || saving}
                className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-5 py-2 text-xs font-medium text-emerald-400 hover:border-emerald-400/60 hover:bg-emerald-500/20 disabled:opacity-40 transition-all"
              >
                {saving ? 'Creando…' : form.start_now ? 'Iniciar reunión' : 'Programar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
