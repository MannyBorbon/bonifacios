import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsAPI } from '../services/api'

export default function MeetingReminderPopup() {
  const [reminders, setReminders] = useState([])
  const [dismissed, setDismissed] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const res = await notificationsAPI.getMeetingReminders()
      setReminders(res.data?.reminders || [])
    } catch { /* silent */ }
  }, [])

  useEffect(() => { load() }, [load])

  // Poll every 2 min
  useEffect(() => {
    const t = setInterval(load, 120_000)
    return () => clearInterval(t)
  }, [load])

  const handleDismiss = async () => {
    setDismissed(true)
    try { await notificationsAPI.dismissMeetingReminders() } catch { /* silent */ }
  }

  const handleDismissOne = async (id) => {
    setReminders(prev => prev.filter(r => r.id !== id))
    try { await notificationsAPI.markRead(id) } catch { /* silent */ }
  }

  const handleGo = (meetingId, notifId) => {
    handleDismissOne(notifId)
    navigate(`/admin/meetings/${meetingId}`)
  }

  if (dismissed || reminders.length === 0) return null

  const fmtTime = (dt) => {
    if (!dt) return ''
    try {
      return new Date(String(dt).replace(' ', 'T')).toLocaleString('es-MX', {
        timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
      })
    } catch { return dt }
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-md rounded-2xl border border-cyan-500/20 bg-[#0a0f1a] shadow-2xl shadow-cyan-500/5 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border-b border-cyan-500/10 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-200">Recordatorio de Reuniones</h3>
            <p className="text-[10px] text-slate-500">{reminders.length} pendiente{reminders.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={handleDismiss} className="p-2 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/5 transition-colors touch-manipulation">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Reminder list */}
        <div className="max-h-[300px] overflow-y-auto overscroll-contain divide-y divide-cyan-500/5">
          {reminders.map(r => (
            <div key={r.id} className="px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 w-2 h-2 rounded-full bg-cyan-400 shrink-0 animate-pulse" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 font-medium">{r.meeting_title || r.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{r.message}</p>
                  {r.scheduled_at && (
                    <p className="text-[10px] text-cyan-500/60 mt-1">{fmtTime(r.scheduled_at)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleGo(r.related_id, r.id)}
                    className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 text-[11px] font-medium text-cyan-400 hover:bg-cyan-500/20 transition-colors touch-manipulation min-h-[32px]"
                  >
                    Ir
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </button>
                  <button
                    onClick={() => handleDismissOne(r.id)}
                    className="p-1.5 rounded-lg text-slate-700 hover:text-slate-400 hover:bg-white/5 transition-colors touch-manipulation"
                    title="Descartar"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-cyan-500/10 px-5 py-3 flex items-center justify-between">
          <button onClick={handleDismiss} className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors touch-manipulation min-h-[32px]">
            Descartar todos
          </button>
          <button
            onClick={() => { handleDismiss(); navigate('/admin/meetings') }}
            className="text-[11px] text-cyan-500/80 hover:text-cyan-400 font-medium transition-colors touch-manipulation min-h-[32px]"
          >
            Ver todas las reuniones
          </button>
        </div>
      </div>
    </div>
  )
}
