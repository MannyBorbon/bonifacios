import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { meetingsAPI } from '../../services/api'

const TZ = 'America/Hermosillo'

const fmtDT = (d) => {
  if (!d) return ''
  return new Date(String(d).replace(' ', 'T')).toLocaleString('es-MX', {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
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
  const [tab, setTab] = useState('minuta') // 'sala' | 'minuta'
  const saveTimer = useRef(null)
  const hasJoined = useRef(false)

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
      setMeeting(mtg)
      setParticipants(parts)

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

  useEffect(() => {
    const join = async () => {
      try { await meetingsAPI.joinMeeting(parseInt(id)); hasJoined.current = true }
      catch { /* silent */ }
    }
    join()
    loadRoom()
    return () => {
      if (hasJoined.current) meetingsAPI.leaveMeeting(parseInt(id)).catch(() => {})
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [id, loadRoom])

  // Poll participants every 8s
  useEffect(() => {
    const t = setInterval(async () => {
      try {
        const res = await meetingsAPI.getRoom(id)
        setParticipants(res.data.participants || [])
        setMeeting(res.data.meeting)
      } catch { /* silent */ }
    }, 8000)
    return () => clearInterval(t)
  }, [id])

  const upd = (key) => (e) => {
    const value = e.target.value
    setMinuta(prev => ({ ...prev, [key]: value }))
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => doSave({ ...minuta, [key]: value }), 2000)
  }

  const doSave = async (data) => {
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

  const isCreator = meeting?.created_by == currentUser.id
  const isAdmin = currentUser.role === 'administrador'
  const canEnd = isCreator || isAdmin
  const isEnded = meeting?.status === 'ended'

  const taCls = 'w-full bg-[#030712]/40 border border-cyan-500/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:border-cyan-500/30 focus:outline-none resize-none transition-colors'
  const inCls = 'w-full bg-[#030712]/40 border border-cyan-500/10 rounded-lg px-3 py-2 text-sm text-slate-300 placeholder-slate-700 focus:border-cyan-500/30 focus:outline-none transition-colors'

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
    </div>
  )
  if (!meeting) return <div className="text-center py-20"><p className="text-slate-500">Reunión no encontrada</p></div>

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button onClick={handleLeave} className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-cyan-400 transition-colors">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            Reuniones
          </button>
          <span className="text-slate-700">/</span>
          <div className="flex items-center gap-2">
            {!isEnded && <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />}
            <h1 className="text-base font-light text-white">{meeting.title}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-[10px] text-slate-600 animate-pulse">Guardando…</span>}
          {saved && !saving && (
            <span className="text-[10px] text-emerald-500/70 flex items-center gap-1">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Guardado
            </span>
          )}
          {!isEnded && (
            <>
              <button onClick={handleSaveNow} disabled={saving} className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 hover:border-cyan-400/40 disabled:opacity-40 transition-all">
                Guardar minuta
              </button>
              <button onClick={handleLeave} className="rounded-full border border-slate-500/20 bg-slate-500/10 px-3 py-1.5 text-xs text-slate-400 hover:border-slate-400/40 transition-all">
                Salir
              </button>
              {canEnd && (
                <button onClick={handleEnd} disabled={ending} className="rounded-full border border-red-500/25 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 hover:border-red-400/40 hover:bg-red-500/15 disabled:opacity-40 transition-all">
                  {ending ? 'Finalizando…' : 'Finalizar reunión'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 border-b border-cyan-500/10">
        {[
          { key: 'minuta', label: 'Minuta' },
          { key: 'sala', label: `Sala${participants.length ? ` (${participants.length})` : ''}` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-xs font-medium transition-all ${
              tab === t.key
                ? 'text-cyan-400 border-b-2 border-cyan-400 -mb-px'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
        {minutesMeta?.editor_name && (
          <span className="ml-auto text-[10px] text-slate-700 self-center pr-2">
            Última edición: {minutesMeta.editor_name} · {fmtDT(minutesMeta.updated_at)}
          </span>
        )}
      </div>

      {/* ── MINUTA TAB ── */}
      {tab === 'minuta' && (
        <div className="space-y-4">

          {/* S1 – Identificación */}
          <Section number="1" title="Identificación de la reunión"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="Título / Motivo de la reunión">
                  {isEnded
                    ? <p className="text-sm text-slate-300">{minuta.titulo || '—'}</p>
                    : <input value={minuta.titulo} onChange={upd('titulo')} placeholder="Ej: Revisión de cotizaciones Q1" className={inCls} />
                  }
                </Field>
              </div>
              <Field label="Fecha y hora de inicio">
                {isEnded
                  ? <p className="text-sm text-slate-300">{minuta.fecha_inicio ? fmtDT(minuta.fecha_inicio) : '—'}</p>
                  : <input type="datetime-local" value={minuta.fecha_inicio} onChange={upd('fecha_inicio')} className={inCls} />
                }
              </Field>
              <Field label="Fecha y hora de término">
                {isEnded
                  ? <p className="text-sm text-slate-300">{minuta.fecha_fin ? fmtDT(minuta.fecha_fin) : '—'}</p>
                  : <input type="datetime-local" value={minuta.fecha_fin} onChange={upd('fecha_fin')} className={inCls} />
                }
              </Field>
              <div className="sm:col-span-2">
                <Field label="Lugar o plataforma">
                  {isEnded
                    ? <p className="text-sm text-slate-300">{minuta.lugar || '—'}</p>
                    : <input value={minuta.lugar} onChange={upd('lugar')} placeholder="Ej: Comedor Bonifacio's / Zoom / Teams" className={inCls} />
                  }
                </Field>
              </div>
            </div>
          </Section>

          {/* S2 – Asistentes */}
          <Section number="2" title="Asistentes y ausentes"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Asistentes">
                {isEnded
                  ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.asistentes || '—'}</p>
                  : <textarea value={minuta.asistentes} onChange={upd('asistentes')} rows={3} placeholder="Nombres separados por coma o uno por línea…" className={taCls} />
                }
              </Field>
              <Field label="Ausentes (con justificación si aplica)">
                {isEnded
                  ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.ausentes || '—'}</p>
                  : <textarea value={minuta.ausentes} onChange={upd('ausentes')} rows={3} placeholder="Ej: Carlos Ruiz — permiso personal" className={taCls} />
                }
              </Field>
            </div>
          </Section>

          {/* S3 – Orden del día */}
          <Section number="3" title="Orden del día (Agenda)"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h7" /></svg>}
          >
            {isEnded
              ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.orden_del_dia || '—'}</p>
              : <textarea value={minuta.orden_del_dia} onChange={upd('orden_del_dia')} rows={4} placeholder="1. Revisión de cotizaciones pendientes&#10;2. Avance de eventos confirmados&#10;3. Asignación de tareas&#10;4. Varios" className={taCls} />
            }
          </Section>

          {/* S4 – Resumen */}
          <Section number="4" title="Resumen de temas discutidos"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>}
          >
            {isEnded
              ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.resumen_temas || '—'}</p>
              : <textarea value={minuta.resumen_temas} onChange={upd('resumen_temas')} rows={5} placeholder="Describe brevemente los puntos tratados en cada tema de la agenda…" className={taCls} />
            }
          </Section>

          {/* S5 – Decisiones */}
          <Section number="5" title="Decisiones tomadas"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          >
            {isEnded
              ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.decisiones || '—'}</p>
              : <textarea value={minuta.decisiones} onChange={upd('decisiones')} rows={4} placeholder="• Se aprueba el menú para el evento del 25 de marzo&#10;• Se confirma descuento del 10% para grupo mayor a 80 personas…" className={taCls} />
            }
          </Section>

          {/* S6 – Plan de acción */}
          <Section number="6" title="Plan de acción — Tareas asignadas"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
          >
            {isEnded
              ? <p className="text-sm text-slate-300 whitespace-pre-wrap">{minuta.plan_accion || '—'}</p>
              : <textarea value={minuta.plan_accion} onChange={upd('plan_accion')} rows={5} placeholder="Tarea — Responsable — Fecha límite&#10;&#10;Ej:&#10;Enviar cotización a cliente Boda Martínez — Manuel — 20/03/2026&#10;Preparar propuesta de menú para XV años — Chef Carlos — 22/03/2026" className={taCls} />
            }
          </Section>

          {/* S7 – Próxima reunión + Elabora */}
          <Section number="7" title="Cierre"
            icon={<svg className="h-3.5 w-3.5 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Fecha y hora de la próxima reunión (si aplica)">
                {isEnded
                  ? <p className="text-sm text-slate-300">{minuta.proxima_reunion ? fmtDT(minuta.proxima_reunion) : 'No definida'}</p>
                  : <input type="datetime-local" value={minuta.proxima_reunion} onChange={upd('proxima_reunion')} className={inCls} />
                }
              </Field>
              <Field label="Minuta elaborada por">
                {isEnded
                  ? <p className="text-sm text-slate-300">{minuta.elabora_minuta || '—'}</p>
                  : <input value={minuta.elabora_minuta} onChange={upd('elabora_minuta')} placeholder="Nombre de quien levanta la minuta" className={inCls} />
                }
              </Field>
            </div>
          </Section>

          {!isEnded && (
            <div className="flex justify-end">
              <button onClick={handleSaveNow} disabled={saving} className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-6 py-2 text-sm font-medium text-cyan-400 hover:border-cyan-400/60 hover:bg-cyan-500/20 disabled:opacity-40 transition-all">
                {saving ? 'Guardando…' : saved ? '✓ Guardado' : 'Guardar minuta'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── SALA TAB ── */}
      {tab === 'sala' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Participants */}
          <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50">{isEnded ? 'Participantes' : 'En sala ahora'}</h2>
              {!isEnded && <span className="text-[10px] text-emerald-400/60">{participants.length} conectado{participants.length !== 1 ? 's' : ''}</span>}
            </div>
            {participants.length === 0 ? (
              <p className="text-xs text-slate-600 italic">{isEnded ? 'Sin registro' : 'Nadie en sala aún'}</p>
            ) : (
              <div className="space-y-2.5">
                {participants.map(p => (
                  <div key={p.user_id} className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-full overflow-hidden border border-cyan-500/20 bg-[#030b18] flex-shrink-0 flex items-center justify-center">
                      {p.profile_photo
                        ? <img src={p.profile_photo} alt="" className="w-full h-full object-cover" />
                        : <span className="text-xs text-cyan-400 font-medium">{(p.full_name || p.username || '?')[0].toUpperCase()}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-300 truncate">
                        {p.full_name || p.username}
                        {p.user_id == currentUser.id && <span className="text-[9px] text-cyan-500/50 ml-1">(tú)</span>}
                      </p>
                      <p className="text-[9px] text-slate-600">Desde {fmtDT(p.joined_at)}</p>
                    </div>
                    {!isEnded && <span className="h-2 w-2 rounded-full bg-emerald-400 flex-shrink-0" />}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info + invite */}
          <div className="space-y-3">
            <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/80 p-4 space-y-3">
              <h2 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50">Info</h2>
              {meeting.started_at && <div><p className="text-[10px] text-slate-600">Inicio</p><p className="text-xs text-slate-400">{fmtDT(meeting.started_at)}</p></div>}
              {meeting.ended_at && <div><p className="text-[10px] text-slate-600">Fin</p><p className="text-xs text-slate-400">{fmtDT(meeting.ended_at)}</p></div>}
              {meeting.creator_name && <div><p className="text-[10px] text-slate-600">Organiza</p><p className="text-xs text-slate-400">{meeting.creator_name}</p></div>}
              {isEnded && <span className="text-[9px] rounded-full border border-slate-500/20 bg-slate-500/10 text-slate-500 px-2 py-0.5">Finalizada</span>}
            </div>
            {!isEnded && (
              <div className="rounded-xl border border-cyan-500/10 bg-[#030b18]/40 p-3 text-center">
                <p className="text-[10px] text-slate-600 mb-1.5">Invitar al equipo</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(window.location.href) }}
                  className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                  Copiar enlace de la sala
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
