import { useState, useEffect, useCallback } from 'react'
import { StickyNote, Plus, Pencil, Trash2, Pin, Check, X, Eye } from 'lucide-react'
import { workspaceNotesAPI } from '../../../services/api'

export default function WorkspaceNotes() {
  const [notesData, setNotesData] = useState([])
  const [loading, setLoading] = useState(true)
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [viewingNote, setViewingNote] = useState(null)

  const loadNotes = useCallback(async () => {
    setLoading(true)
    try {
      const res = await workspaceNotesAPI.list()
      setNotesData(res.data?.notes || [])
    } catch { setNotesData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadNotes() }, [loadNotes])

  const createNote = async () => {
    const title = newNoteTitle.trim()
    if (!title) return
    try {
      await workspaceNotesAPI.create({ title, content: newNoteContent, note_scope: 'team' })
      setNewNoteTitle('')
      setNewNoteContent('')
      await loadNotes()
    } catch { /* silent */ }
  }

  const toggleNotePin = async (noteId, pinned) => {
    try { await workspaceNotesAPI.togglePin({ note_id: noteId, pinned: pinned ? 0 : 1 }); await loadNotes() } catch { /* silent */ }
  }

  const startEditNote = (note) => { setEditingNoteId(note.id); setEditingNoteTitle(note.title || ''); setEditingNoteContent(note.content || '') }
  const cancelEditNote = () => { setEditingNoteId(null); setEditingNoteTitle(''); setEditingNoteContent('') }

  const saveNoteEdit = async () => {
    const title = editingNoteTitle.trim()
    if (!editingNoteId || !title) return
    try { await workspaceNotesAPI.update(editingNoteId, { title, content: editingNoteContent }); cancelEditNote(); await loadNotes() } catch { /* silent */ }
  }

  const deleteNote = async (noteId) => {
    if (!confirm('Eliminar esta nota?')) return
    try { await workspaceNotesAPI.remove(noteId); if (editingNoteId === noteId) cancelEditNote(); await loadNotes() } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border border-yellow-500/20 border-t-yellow-400" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-amber-400/20 flex items-center justify-center">
          <StickyNote size={18} className="text-yellow-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Notas</h2>
          <p className="text-xs text-slate-400">Captura acuerdos y fija notas importantes del equipo</p>
        </div>
      </div>

      {/* Create note */}
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-5 space-y-3">
        <input
          value={newNoteTitle}
          onChange={e => setNewNoteTitle(e.target.value)}
          placeholder="Titulo de la nota..."
          className="w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-yellow-500/40 focus:outline-none transition-colors min-h-[44px]"
        />
        <textarea
          value={newNoteContent}
          onChange={e => setNewNoteContent(e.target.value)}
          rows={3}
          placeholder="Contenido de la nota..."
          className="w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:border-yellow-500/40 focus:outline-none transition-colors resize-none"
        />
        <button onClick={createNote} className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-gradient-to-br from-yellow-500/15 to-amber-500/15 px-4 sm:px-5 py-2.5 text-xs font-medium text-yellow-300 hover:from-yellow-500/25 hover:to-amber-500/25 active:scale-95 transition-all touch-manipulation min-h-[44px]">
          <Plus size={14} /> Crear nota
        </button>
      </div>

      {/* Notes grid */}
      {notesData.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/40 p-12 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-slate-800/50 flex items-center justify-center">
            <StickyNote size={24} className="text-slate-600" />
          </div>
          <h3 className="text-base font-medium text-white mb-2">Sin notas aun</h3>
          <p className="text-sm text-slate-400">Crea tu primera nota para capturar acuerdos importantes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          {notesData.map(note => (
            <div key={note.id} className={`group/note rounded-2xl border backdrop-blur-sm transition-all duration-300 ${
              Number(note.pinned) === 1
                ? 'border-yellow-500/25 bg-gradient-to-br from-[#1a1407]/60 to-[#060d1f]/60 hover:border-yellow-400/35'
                : 'border-slate-700/30 bg-[#060d1f]/60 hover:border-slate-600/40'
            }`}>
              {/* Note header */}
              <div className="p-5 pb-3">
                <div className="flex items-start justify-between gap-3">
                  {editingNoteId === note.id ? (
                    <input value={editingNoteTitle} onChange={e => setEditingNoteTitle(e.target.value)}
                      className="flex-1 rounded-lg border border-yellow-500/40 bg-slate-800/80 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-yellow-400/50 outline-none" autoFocus />
                  ) : (
                    <div className="flex items-start gap-2 flex-1">
                      {Number(note.pinned) === 1 && (
                        <div className="h-5 w-5 rounded bg-yellow-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Pin size={10} className="text-yellow-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-white">{note.title}</h4>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                          <span>{note.full_name || note.username || 'Usuario'}</span>
                          <span>·</span>
                          <span>{new Date(note.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity shrink-0">
                    {editingNoteId === note.id ? (
                      <>
                        <button onClick={saveNoteEdit} className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition-all"><Check size={14} /></button>
                        <button onClick={cancelEditNote} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-700/40 transition-all"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setViewingNote(note)} className="rounded-lg p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"><Eye size={12} /></button>
                        <button onClick={() => startEditNote(note)} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-all"><Pencil size={12} /></button>
                        <button onClick={() => toggleNotePin(note.id, Number(note.pinned) === 1)}
                          className={`rounded-lg p-1.5 transition-all ${Number(note.pinned) === 1 ? 'text-yellow-400 hover:bg-yellow-500/10' : 'text-slate-500 hover:text-yellow-400 hover:bg-yellow-500/10'}`}>
                          <Pin size={12} />
                        </button>
                        <button onClick={() => deleteNote(note.id)} className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Note content */}
              <div className="px-5 pb-5">
                {editingNoteId === note.id ? (
                  <textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)} rows={4}
                    className="w-full rounded-lg border border-yellow-500/40 bg-slate-800/80 px-3 py-2.5 text-xs text-white focus:ring-1 focus:ring-yellow-400/50 outline-none resize-none" />
                ) : (
                  <div className="rounded-lg bg-slate-800/20 border border-slate-700/20 p-3">
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed line-clamp-4">{note.content || 'Sin contenido'}</p>
                  </div>
                )}
              </div>

              {/* Note footer */}
              {Number(note.pinned) === 1 && editingNoteId !== note.id && (
                <div className="px-5 pb-4">
                  <span className="inline-flex items-center gap-1 text-[10px] text-yellow-300 bg-yellow-500/10 rounded-full px-2 py-0.5">
                    <Pin size={8} /> Fijada
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* View note drawer */}
      {viewingNote && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setViewingNote(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-[#060d1f]/98 shadow-2xl border-l border-slate-700/30 backdrop-blur-2xl overflow-y-auto overscroll-contain">
            <div className="sticky top-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-b border-slate-700/20 px-6 py-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Detalle de nota</h3>
                <button onClick={() => setViewingNote(null)} className="rounded-lg p-2 text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
              </div>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <h4 className="text-xl font-semibold text-white mb-2">{viewingNote.title}</h4>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Por: {viewingNote.full_name || viewingNote.username || 'Usuario'}</span>
                  <span>·</span>
                  <span>{new Date(viewingNote.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="rounded-xl bg-slate-800/30 border border-slate-700/30 p-4">
                <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{viewingNote.content || 'Sin contenido'}</p>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] text-slate-500">{viewingNote.content ? `${viewingNote.content.length} caracteres` : 'Sin contenido'}</span>
                <button onClick={() => toggleNotePin(viewingNote.id, Number(viewingNote.pinned) === 1)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
                    Number(viewingNote.pinned) === 1 ? 'border-yellow-500/30 bg-yellow-500/10 text-yellow-300' : 'border-slate-700/40 bg-slate-800/40 text-slate-400 hover:text-yellow-300'
                  }`}>
                  {Number(viewingNote.pinned) === 1 ? 'Desfijar' : 'Fijar nota'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
