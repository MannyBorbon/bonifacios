import { useState, useEffect, useCallback } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import {
  LayoutGrid, Plus, Search, Pencil, Trash2, Archive, X, Check,
  GripHorizontal, AlertCircle, Calendar, User
} from 'lucide-react'
import { workspaceBoardsAPI } from '../../../services/api'

const isDueDateOverdue = (dueDate) => {
  if (!dueDate) return false
  return dueDate < new Date().toISOString().slice(0, 10)
}

const getChecklistProgress = (card) => {
  const total = Number(card?.checklist_total || 0)
  const done = Number(card?.checklist_done || 0)
  if (!total) return 0
  return Math.round((done / total) * 100)
}

export default function WorkspaceBoards() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdminUser = String(currentUser?.role || '').toLowerCase() === 'administrador'

  const [boards, setBoards] = useState([])
  const [boardsLoading, setBoardsLoading] = useState(true)
  const [activeBoardId, setActiveBoardId] = useState(null)
  const [workspaceUsers, setWorkspaceUsers] = useState([])
  const [boardSearch, setBoardSearch] = useState('')
  const [feedback, setFeedback] = useState('')

  // Board CRUD
  const [newBoardName, setNewBoardName] = useState('')
  const [boardOwnerUserId, setBoardOwnerUserId] = useState('')
  const [editingBoardName, setEditingBoardName] = useState('')
  const [showBoardMenu, setShowBoardMenu] = useState(false)

  // Column CRUD
  const [newColumnName, setNewColumnName] = useState('')
  const [editingColumnId, setEditingColumnId] = useState(null)
  const [editingColumnName, setEditingColumnName] = useState('')

  // Card CRUD
  const [editingCardId, setEditingCardId] = useState(null)
  const [editingCardTitle, setEditingCardTitle] = useState('')

  // Card detail drawer
  const [cardModal, setCardModal] = useState(null)
  const [cardDetailLoading, setCardDetailLoading] = useState(false)
  const [checklistDraft, setChecklistDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true)
    setFeedback('')
    try {
      const res = await workspaceBoardsAPI.list()
      const nextBoards = res.data?.boards || []
      setBoards(nextBoards)
      if (nextBoards.length > 0) setActiveBoardId(prev => prev || nextBoards[0].id)
    } catch (err) {
      setFeedback(err?.response?.data?.error || 'No se pudieron cargar los tableros.')
      setBoards([])
    } finally { setBoardsLoading(false) }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await workspaceBoardsAPI.listUsers()
      const users = res.data?.users || []
      setWorkspaceUsers(users)
      if (users.length > 0 && !boardOwnerUserId) setBoardOwnerUserId(String(users[0].id))
    } catch { setWorkspaceUsers([]) }
  }, [boardOwnerUserId])

  useEffect(() => { loadBoards(); loadUsers() }, [loadBoards, loadUsers])

  const activeBoard = boards.find(b => b.id === activeBoardId) || boards[0] || null
  useEffect(() => { setEditingBoardName(activeBoard?.name || '') }, [activeBoard?.id])

  // Filtered columns
  const normalizedSearch = boardSearch.trim().toLowerCase()
  const boardColumns = (activeBoard?.columns || []).map(col => ({
    ...col,
    cards: (col.cards || []).filter(card => !normalizedSearch || String(card.title || '').toLowerCase().includes(normalizedSearch))
  }))

  // Board operations
  const createBoard = async () => {
    const name = newBoardName.trim()
    if (!name) { setFeedback('Escribe un nombre.'); return }
    try {
      await workspaceBoardsAPI.create({ name, description: '', owner_user_id: isAdminUser ? Number(boardOwnerUserId || currentUser?.id || 0) : currentUser?.id })
      setNewBoardName(''); await loadBoards(); setFeedback('Tablero creado.')
    } catch (err) { setFeedback(err?.response?.data?.error || 'Error creando tablero.') }
  }

  const saveBoardName = async () => {
    if (!activeBoard) return
    const name = editingBoardName.trim()
    if (!name) return
    try { await workspaceBoardsAPI.updateBoard({ board_id: activeBoard.id, name }); await loadBoards(); setFeedback('Nombre actualizado.') }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error editando tablero.') }
  }

  const archiveBoard = async () => {
    if (!activeBoard || !confirm(`Archivar "${activeBoard.name}"?`)) return
    try { await workspaceBoardsAPI.archive(activeBoard.id); await loadBoards() } catch { /* silent */ }
  }

  // Column operations
  const createColumn = async () => {
    if (!activeBoard) return
    const name = newColumnName.trim()
    if (!name) { setFeedback('Escribe un nombre de columna.'); return }
    try { await workspaceBoardsAPI.createColumn({ board_id: activeBoard.id, name }); setNewColumnName(''); await loadBoards() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error creando columna.') }
  }

  const saveColumnName = async () => {
    const name = editingColumnName.trim()
    if (!editingColumnId || !name) return
    try { await workspaceBoardsAPI.updateColumn({ column_id: editingColumnId, name }); setEditingColumnId(null); setEditingColumnName(''); await loadBoards() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error editando columna.') }
  }

  const removeColumn = async (columnId) => {
    if (!confirm('Eliminar esta columna y todas sus cards?')) return
    try { await workspaceBoardsAPI.deleteColumn({ column_id: columnId }); await loadBoards() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error eliminando columna.') }
  }

  // Card operations
  const createCard = async (columnId, title) => {
    if (!activeBoard || !title) return
    try {
      await workspaceBoardsAPI.createCard({ board_id: activeBoard.id, column_id: columnId, title, details: '', priority: 'medium', due_date: null, assigned_to: null })
      await loadBoards()
    } catch (err) { setFeedback(err?.response?.data?.error || 'Error creando card.') }
  }

  const saveCardEdit = async () => {
    const title = editingCardTitle.trim()
    if (!editingCardId || !title) return
    try { await workspaceBoardsAPI.updateCard({ card_id: editingCardId, title }); setEditingCardId(null); setEditingCardTitle(''); await loadBoards() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error editando card.') }
  }

  const removeCard = async (cardId) => {
    if (!confirm('Eliminar esta card?')) return
    try { await workspaceBoardsAPI.deleteCard({ card_id: cardId }); await loadBoards() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error eliminando card.') }
  }

  const onDragEnd = async (result) => {
    const { destination, draggableId } = result
    if (!destination) return
    try {
      await workspaceBoardsAPI.moveCard({ card_id: Number(draggableId), to_column_id: Number(destination.droppableId), to_sort_order: destination.index })
      await loadBoards()
    } catch (err) { setFeedback(err?.response?.data?.error || 'Error moviendo card.') }
  }

  // Card detail
  const openCardModal = async (card) => {
    setCardModal({ id: card.id, title: card.title || '', details: card.details || '', priority: card.priority || 'medium', due_date: card.due_date || '', assigned_to: card.assigned_to ? String(card.assigned_to) : '', checklist: [], comments: [], activity: [] })
    setCardDetailLoading(true)
    try {
      const res = await workspaceBoardsAPI.getCardDetail({ card_id: card.id })
      const p = res.data || {}
      setCardModal(prev => prev?.id === card.id ? { ...prev, details: p.card?.details || prev.details, priority: p.card?.priority || prev.priority, due_date: p.card?.due_date || '', assigned_to: p.card?.assigned_to ? String(p.card.assigned_to) : '', checklist: p.checklist || [], comments: p.comments || [], activity: p.activity || [] } : prev)
    } catch (err) { setFeedback(err?.response?.data?.error || 'Error cargando detalle.') }
    finally { setCardDetailLoading(false) }
  }

  const saveCardModal = async () => {
    if (!cardModal?.id || !cardModal?.title?.trim()) return
    try {
      await workspaceBoardsAPI.updateCard({ card_id: cardModal.id, title: cardModal.title.trim(), details: cardModal.details || '', priority: cardModal.priority || 'medium', due_date: cardModal.due_date || null, assigned_to: cardModal.assigned_to ? Number(cardModal.assigned_to) : null })
      await loadBoards()
      setFeedback('Card actualizada.')
    } catch (err) { setFeedback(err?.response?.data?.error || 'Error actualizando card.') }
  }

  const addChecklistItem = async () => {
    if (!cardModal?.id || !checklistDraft.trim()) return
    try { await workspaceBoardsAPI.addChecklistItem({ card_id: cardModal.id, content: checklistDraft.trim() }); setChecklistDraft(''); await reloadCardDetail() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error.') }
  }

  const toggleChecklistItem = async (item) => {
    if (!cardModal?.id) return
    try { await workspaceBoardsAPI.toggleChecklistItem({ item_id: item.id, is_done: Number(item.is_done) === 1 ? 0 : 1 }); await reloadCardDetail() }
    catch { /* silent */ }
  }

  const removeChecklistItem = async (itemId) => {
    if (!cardModal?.id) return
    try { await workspaceBoardsAPI.deleteChecklistItem({ item_id: itemId }); await reloadCardDetail() } catch { /* silent */ }
  }

  const addComment = async () => {
    if (!cardModal?.id || !commentDraft.trim()) return
    try { await workspaceBoardsAPI.addComment({ card_id: cardModal.id, content: commentDraft.trim() }); setCommentDraft(''); await reloadCardDetail() }
    catch (err) { setFeedback(err?.response?.data?.error || 'Error.') }
  }

  const reloadCardDetail = async () => {
    if (!cardModal?.id) return
    try {
      const res = await workspaceBoardsAPI.getCardDetail({ card_id: cardModal.id })
      const p = res.data || {}
      setCardModal(prev => prev ? { ...prev, checklist: p.checklist || [], comments: p.comments || [], activity: p.activity || [] } : prev)
    } catch { /* silent */ }
  }

  // Inline card creation handler
  const InlineCardInput = ({ columnId }) => {
    const [value, setValue] = useState('')
    const [show, setShow] = useState(false)
    if (!show) return (
      <button onClick={() => setShow(true)} className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-700/30 bg-slate-800/20 px-3 py-2.5 sm:py-2 text-xs text-slate-500 hover:text-emerald-300 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all touch-manipulation min-h-[40px]">
        <Plus size={14} /> Anadir tarjeta
      </button>
    )
    return (
      <div className="flex gap-2">
        <input value={value} onChange={e => setValue(e.target.value)} autoFocus placeholder="Titulo de la tarjeta..."
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { createCard(columnId, value.trim()); setShow(false); setValue('') } if (e.key === 'Escape') setShow(false) }}
          className="flex-1 rounded-lg border border-emerald-500/40 bg-slate-800/80 px-3 py-2.5 sm:py-2 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-400/50 min-h-[40px]" />
        <button onClick={() => { if (value.trim()) { createCard(columnId, value.trim()); setShow(false); setValue('') } }}
          className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-2.5 sm:py-2 text-emerald-400 hover:bg-emerald-500/20 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"><Check size={14} /></button>
        <button onClick={() => setShow(false)} className="rounded-lg p-2.5 sm:p-2 text-slate-500 hover:text-slate-300 touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={14} /></button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 h-full flex flex-col max-w-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4 shrink-0 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-400/20 flex items-center justify-center">
            <LayoutGrid size={18} className="text-emerald-400" />
          </div>
          <div className="flex items-center gap-2">
            <select value={activeBoardId || ''} onChange={e => setActiveBoardId(e.target.value ? parseInt(e.target.value) : null)}
              className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 sm:px-4 py-2.5 sm:py-2 text-sm font-medium text-white focus:border-emerald-500/40 focus:outline-none transition-colors min-h-[44px]">
              <option value="">Seleccionar tablero...</option>
              {boards.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {activeBoard && (
              <button onClick={() => setShowBoardMenu(p => !p)} className="rounded-lg border border-slate-700/40 bg-slate-800/40 p-2.5 sm:p-2 text-slate-500 hover:text-slate-300 transition-colors touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center">
                <GripHorizontal size={14} />
              </button>
            )}
          </div>
        </div>
        {activeBoard && (
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" />
              <input value={boardSearch} onChange={e => setBoardSearch(e.target.value)} placeholder="Buscar tarjetas..."
                className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 pl-9 pr-3 py-2.5 sm:py-2 text-xs text-slate-200 placeholder-slate-600 w-36 sm:w-48 focus:border-emerald-500/40 focus:outline-none transition-colors min-h-[40px]" />
            </div>
          </div>
        )}
      </div>

      {/* Board menu popover */}
      {showBoardMenu && (
        <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/95 p-4 mb-4 space-y-3 backdrop-blur-xl shadow-xl shrink-0">
          <div className="flex gap-2">
            <input value={newBoardName} onChange={e => setNewBoardName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createBoard() }} placeholder="Nuevo tablero"
              className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/80 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none" />
            <button onClick={createBoard} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-all">Crear</button>
          </div>
          {activeBoard && (
            <>
              <div className="flex gap-2 pt-2 border-t border-slate-700/20">
                <input value={editingBoardName} onChange={e => setEditingBoardName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveBoardName() }}
                  className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/80 px-3 py-2 text-sm text-slate-200 focus:outline-none" />
                <button onClick={saveBoardName} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300 hover:bg-cyan-500/20 transition-all">Guardar</button>
              </div>
              <button onClick={archiveBoard} className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300 hover:bg-red-500/20 transition-all">
                <Archive size={12} /> Archivar tablero
              </button>
            </>
          )}
          {feedback && <p className="text-xs text-emerald-300">{feedback}</p>}
        </div>
      )}

      {/* Kanban board */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {boardsLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-4 h-full">
            {[1, 2, 3].map(i => (
              <div key={i} className="min-w-[272px] animate-pulse">
                <div className="rounded-2xl border border-slate-700/20 bg-[#060d1f]/40 p-4">
                  <div className="h-5 w-28 rounded-lg bg-slate-700/30 mb-3" />
                  {[1, 2, 3].map(j => (<div key={j} className="rounded-xl bg-slate-700/20 p-3 mb-2"><div className="h-4 w-full rounded bg-slate-700/30 mb-2" /><div className="h-3 w-2/3 rounded bg-slate-700/20" /></div>))}
                </div>
              </div>
            ))}
          </div>
        ) : !activeBoard ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <LayoutGrid size={40} className="text-slate-700 mx-auto mb-3" />
              <p className="text-base text-slate-400 mb-1">Selecciona un tablero</p>
              <p className="text-sm text-slate-600">o crea uno nuevo desde el menu</p>
            </div>
          </div>
        ) : boardColumns.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <LayoutGrid size={40} className="text-slate-700 mb-3" />
            <h3 className="text-base font-medium text-white mb-2">Tablero vacio</h3>
            <p className="text-sm text-slate-400 mb-4">Crea tu primera columna</p>
            <div className="flex gap-2">
              <input value={newColumnName} onChange={e => setNewColumnName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') createColumn() }}
                placeholder="Nombre de columna..." className="rounded-lg border border-slate-700/40 bg-[#050a14]/80 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none" />
              <button onClick={createColumn} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300 hover:bg-emerald-500/20 transition-all">Crear</button>
            </div>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-4 h-full overscroll-x-contain snap-x snap-mandatory sm:snap-none">
              {boardColumns.map(col => (
                <Droppable key={col.id} droppableId={String(col.id)}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`min-w-[260px] max-w-[260px] sm:min-w-[272px] sm:max-w-[272px] rounded-2xl p-3 transition-all duration-200 flex flex-col snap-center ${
                        snapshot.isDraggingOver
                          ? 'bg-emerald-500/5 ring-2 ring-emerald-400/30 scale-[1.01]'
                          : 'bg-[#060d1f]/40 border border-slate-700/20'
                      }`}>
                      {/* Column header */}
                      <div className="mb-3 flex items-center justify-between gap-1 shrink-0">
                        {editingColumnId === col.id ? (
                          <div className="flex-1 flex items-center gap-1">
                            <input value={editingColumnName} onChange={e => setEditingColumnName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveColumnName() }}
                              className="flex-1 rounded-lg border border-emerald-500/40 bg-slate-800/80 px-2 py-1 text-sm text-white outline-none" autoFocus />
                            <button onClick={saveColumnName} className="p-1 text-emerald-400"><Check size={14} /></button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{col.name}</h3>
                            <span className="text-[10px] text-slate-600 bg-slate-800/40 rounded-full px-1.5 py-0.5">{col.cards.length}</span>
                          </div>
                        )}
                        <div className="flex gap-0.5">
                          {editingColumnId !== col.id && (
                            <button onClick={() => { setEditingColumnId(col.id); setEditingColumnName(col.name || '') }} className="p-1 text-slate-600 hover:text-slate-400 transition-colors"><Pencil size={10} /></button>
                          )}
                          <button onClick={() => removeColumn(col.id)} className="p-1 text-slate-600 hover:text-red-400 transition-colors"><Trash2 size={10} /></button>
                        </div>
                      </div>

                      {/* Cards */}
                      <div className="flex-1 overflow-y-auto space-y-2 min-h-[60px]">
                        {col.cards.map((card, cardIdx) => (
                          <Draggable key={card.id} draggableId={String(card.id)} index={cardIdx}>
                            {(provided, snapshot) => (
                              <div ref={provided.innerRef} {...provided.draggableProps}
                                className={`group/card rounded-xl p-3 transition-all duration-200 ${
                                  snapshot.isDragging
                                    ? 'shadow-2xl ring-2 ring-emerald-400/40 rotate-1 scale-105 bg-[#0a1428]'
                                    : 'bg-[#050a14]/80 border border-slate-700/20 hover:border-emerald-500/20 hover:shadow-lg'
                                }`}>
                                {/* Drag handle */}
                                <div {...provided.dragHandleProps} className="absolute top-1.5 right-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-0.5 rounded hover:bg-slate-700/40">
                                  <GripHorizontal size={12} className="text-slate-500" />
                                </div>

                                {/* Card title */}
                                <div className="pr-6 mb-2">
                                  {editingCardId === card.id ? (
                                    <div className="flex items-center gap-1">
                                      <input value={editingCardTitle} onChange={e => setEditingCardTitle(e.target.value)} onClick={e => e.stopPropagation()}
                                        onKeyDown={e => { if (e.key === 'Enter') saveCardEdit() }}
                                        className="flex-1 rounded-lg border border-emerald-500/40 bg-slate-800/80 px-2 py-1 text-xs text-white outline-none" autoFocus />
                                      <button onClick={saveCardEdit} className="p-0.5 text-emerald-400"><Check size={12} /></button>
                                    </div>
                                  ) : (
                                    <p className="text-sm font-medium text-slate-100 leading-snug cursor-pointer" onClick={() => openCardModal(card)}>{card.title}</p>
                                  )}
                                </div>

                                {/* Card metadata */}
                                <div className="flex flex-wrap items-center gap-1.5">
                                  {card.priority && (
                                    <span className={`rounded-full text-[9px] px-2 py-0.5 font-medium ${
                                      card.priority === 'high' ? 'bg-red-500/15 text-red-300 border border-red-400/20' :
                                      card.priority === 'low' ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/20' :
                                      'bg-amber-500/15 text-amber-200 border border-amber-400/20'
                                    }`}>
                                      {card.priority === 'high' ? 'Alta' : card.priority === 'low' ? 'Baja' : 'Media'}
                                    </span>
                                  )}
                                  {card.due_date && (
                                    <span className={`flex items-center gap-1 rounded-full text-[9px] px-2 py-0.5 ${
                                      isDueDateOverdue(card.due_date) ? 'bg-red-500/15 text-red-300 border border-red-400/20' : 'bg-slate-700/30 text-slate-400 border border-slate-600/20'
                                    }`}>
                                      <Calendar size={8} /> {isDueDateOverdue(card.due_date) ? 'Vencida' : card.due_date}
                                    </span>
                                  )}
                                  {card.assigned_to && (
                                    <span className="flex items-center gap-1 rounded-full text-[9px] px-2 py-0.5 bg-slate-700/30 text-slate-400 border border-slate-600/20">
                                      <User size={8} />
                                    </span>
                                  )}
                                </div>

                                {/* Checklist progress */}
                                {Number(card.checklist_total || 0) > 0 && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                                      <span>Checklist</span>
                                      <span>{Number(card.checklist_done || 0)}/{Number(card.checklist_total || 0)}</span>
                                    </div>
                                    <div className="h-1 w-full rounded-full bg-slate-700/40 overflow-hidden">
                                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-500" style={{ width: `${getChecklistProgress(card)}%` }} />
                                    </div>
                                  </div>
                                )}

                                {/* Card actions */}
                                <div className="mt-2 flex gap-1 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                  {editingCardId !== card.id && (
                                    <button onClick={e => { e.stopPropagation(); setEditingCardId(card.id); setEditingCardTitle(card.title || '') }}
                                      className="rounded-lg p-1 text-slate-600 hover:text-slate-300 hover:bg-slate-700/40 transition-all"><Pencil size={10} /></button>
                                  )}
                                  <button onClick={e => { e.stopPropagation(); openCardModal(card) }}
                                    className="rounded-lg p-1 text-slate-600 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"><AlertCircle size={10} /></button>
                                  <button onClick={e => { e.stopPropagation(); removeCard(card.id) }}
                                    className="rounded-lg p-1 text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={10} /></button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>

                      {/* Add card */}
                      <div className="mt-3 shrink-0">
                        <InlineCardInput columnId={col.id} />
                      </div>
                    </div>
                  )}
                </Droppable>
              ))}

              {/* Add column */}
              <div className="min-w-[272px] flex-shrink-0">
                <div className="rounded-2xl bg-[#060d1f]/30 border border-dashed border-slate-700/30 p-3 hover:border-emerald-500/20 transition-all">
                  <input value={newColumnName} onChange={e => setNewColumnName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newColumnName.trim()) createColumn() }}
                    placeholder="+ Anadir lista" className="w-full bg-transparent text-sm text-slate-500 placeholder-slate-600 focus:outline-none" />
                </div>
              </div>
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Card detail drawer */}
      {cardModal && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setCardModal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[540px] bg-[#060d1f]/98 shadow-2xl border-l border-slate-700/30 backdrop-blur-2xl overflow-y-auto overscroll-contain flex flex-col">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-b border-slate-700/20 px-5 py-4 shrink-0">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-semibold text-white">Detalle de card</h4>
                <button onClick={() => setCardModal(null)} className="rounded-lg p-2 text-slate-500 hover:text-white transition-colors touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center"><X size={18} /></button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 px-5 py-5 space-y-4 overflow-y-auto">
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-3 py-2 text-xs text-slate-300">
                  <span className="font-medium">Checklist:</span> {(cardModal.checklist || []).filter(i => Number(i.is_done) === 1).length}/{(cardModal.checklist || []).length}
                </div>
                <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-3 py-2 text-xs text-slate-300">
                  <span className="font-medium">Progreso:</span> {(() => { const t = (cardModal.checklist || []).length; const d = (cardModal.checklist || []).filter(i => Number(i.is_done) === 1).length; return t ? Math.round((d/t)*100) : 0 })()}%
                </div>
                <div className={`rounded-xl border px-3 py-2 text-xs ${isDueDateOverdue(cardModal.due_date) ? 'border-red-400/30 bg-red-500/10 text-red-200' : 'border-slate-700/30 bg-slate-800/20 text-slate-300'}`}>
                  {cardModal.due_date ? (isDueDateOverdue(cardModal.due_date) ? `Vencida: ${cardModal.due_date}` : `Limite: ${cardModal.due_date}`) : 'Sin fecha'}
                </div>
              </div>

              {/* Title & details */}
              <input value={cardModal.title} onChange={e => setCardModal(prev => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm font-medium text-white placeholder-slate-500 focus:border-emerald-500/40 focus:outline-none min-h-[44px]" placeholder="Titulo" />
              <textarea value={cardModal.details} onChange={e => setCardModal(prev => ({ ...prev, details: e.target.value }))} rows={3}
                className="w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-emerald-500/40 focus:outline-none resize-none" placeholder="Descripcion" />

              {/* Priority, date, assignee */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select value={cardModal.priority} onChange={e => setCardModal(prev => ({ ...prev, priority: e.target.value }))}
                  className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2 text-xs text-slate-200 focus:outline-none min-h-[44px]">
                  <option value="high">Alta</option>
                  <option value="medium">Media</option>
                  <option value="low">Baja</option>
                </select>
                <input type="date" value={cardModal.due_date || ''} onChange={e => setCardModal(prev => ({ ...prev, due_date: e.target.value }))}
                  className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2 text-xs text-slate-200 focus:outline-none min-h-[44px]" />
                <select value={cardModal.assigned_to || ''} onChange={e => setCardModal(prev => ({ ...prev, assigned_to: e.target.value }))}
                  className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2 text-xs text-slate-200 focus:outline-none min-h-[44px]">
                  <option value="">Sin asignar</option>
                  {workspaceUsers.map(u => <option key={u.id} value={u.id}>{u.full_name || u.username}</option>)}
                </select>
              </div>

              {cardDetailLoading ? (
                <div className="rounded-xl border border-slate-700/30 bg-slate-800/20 px-4 py-3 text-sm text-slate-400 animate-pulse">Cargando detalle...</div>
              ) : (
                <>
                  {/* Checklist */}
                  <div className="rounded-xl border border-slate-700/30 bg-slate-800/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Checklist</p>
                    <div className="space-y-1.5">
                      {(cardModal.checklist || []).map(item => (
                        <div key={item.id} className="flex items-center gap-2">
                          <button onClick={() => toggleChecklistItem(item)}
                            className={`flex-1 rounded-lg border px-3 py-2 sm:py-1.5 text-left text-xs transition-all touch-manipulation min-h-[36px] ${
                              Number(item.is_done) === 1 ? 'border-emerald-500/25 bg-emerald-500/8 text-emerald-300 line-through' : 'border-slate-700/30 bg-slate-800/30 text-slate-200'
                            }`}>{item.content}</button>
                          <button onClick={() => removeChecklistItem(item.id)} className="p-1.5 sm:p-1 text-slate-600 hover:text-red-400 touch-manipulation"><X size={12} /></button>
                        </div>
                      ))}
                      <div className="flex gap-2 mt-2">
                        <input value={checklistDraft} onChange={e => setChecklistDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addChecklistItem() }}
                          className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/60 px-3 py-2 sm:py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none min-h-[40px]" placeholder="Nuevo item..." />
                        <button onClick={addChecklistItem} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 sm:px-2 py-2 sm:py-1.5 text-emerald-400 text-xs touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Comments */}
                  <div className="rounded-xl border border-slate-700/30 bg-slate-800/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Comentarios</p>
                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                      {(cardModal.comments || []).map(comment => (
                        <div key={comment.id} className="rounded-lg border border-slate-700/20 bg-slate-800/20 px-3 py-2 text-xs text-slate-200">
                          <p>{comment.content}</p>
                          <p className="text-[10px] text-slate-500 mt-0.5">{comment.full_name || comment.username || 'Usuario'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input value={commentDraft} onChange={e => setCommentDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addComment() }}
                        className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/60 px-3 py-2 sm:py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none min-h-[40px]" placeholder="Comentar..." />
                      <button onClick={addComment} className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2 sm:py-1.5 text-xs text-indigo-300 touch-manipulation min-h-[40px] flex items-center justify-center">Enviar</button>
                    </div>
                  </div>

                  {/* Activity */}
                  <div className="rounded-xl border border-slate-700/30 bg-slate-800/10 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Actividad</p>
                    <div className="space-y-1 max-h-24 overflow-y-auto">
                      {(cardModal.activity || []).map(act => (
                        <div key={act.id} className="rounded-lg border border-slate-700/15 bg-slate-800/15 px-3 py-1.5 text-xs text-slate-300">
                          <span className="text-slate-100">{act.action_label}</span> · {act.full_name || act.username || 'Usuario'}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 z-10 bg-[#060d1f]/95 backdrop-blur-xl border-t border-slate-700/20 px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shrink-0">
              <div className="flex gap-2 justify-end">
                <button onClick={() => setCardModal(null)} className="rounded-xl border border-slate-700/40 bg-slate-800/40 px-4 py-2.5 sm:py-2 text-sm text-slate-300 hover:bg-slate-800/60 transition-all touch-manipulation min-h-[44px]">Cancelar</button>
                <button onClick={saveCardModal} className="rounded-xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/15 to-teal-500/15 px-5 py-2.5 sm:py-2 text-sm font-medium text-emerald-300 hover:from-emerald-500/25 hover:to-teal-500/25 transition-all touch-manipulation min-h-[44px]">Guardar</button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
