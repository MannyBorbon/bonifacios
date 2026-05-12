import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { calendarAPI, workspaceBoardsAPI, workspaceListsAPI, workspaceNotesAPI, workspaceSocialAPI, workspaceAssistantAPI } from '../../services/api'
import { useTheme } from '../../hooks/useTheme'
import Messages from './Messages'
import Meetings from './Meetings'

const TZ = 'America/Hermosillo'

const CATEGORY_META = {
  cotizacion:   { label: 'Cotización',   color: 'bg-gradient-to-r from-cyan-500/20 to-cyan-400/20 text-cyan-300 border-cyan-400/30', dot: 'bg-cyan-400', icon: '💰', shadow: 'shadow-cyan-500/20' },
  evento:       { label: 'Evento',       color: 'bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 text-emerald-300 border-emerald-400/30', dot: 'bg-emerald-400', icon: '🎉', shadow: 'shadow-emerald-500/20' },
  reunion:      { label: 'Reunión',      color: 'bg-gradient-to-r from-blue-500/20 to-blue-400/20 text-blue-300 border-blue-400/30', dot: 'bg-blue-400', icon: '👥', shadow: 'shadow-blue-500/20' },
  tarea:        { label: 'Tarea',        color: 'bg-gradient-to-r from-orange-500/20 to-orange-400/20 text-orange-300 border-orange-400/30', dot: 'bg-orange-400', icon: '✓', shadow: 'shadow-orange-500/20' },
  nota:         { label: 'Nota',         color: 'bg-gradient-to-r from-yellow-500/20 to-yellow-400/20 text-yellow-300 border-yellow-400/30', dot: 'bg-yellow-400', icon: '📝', shadow: 'shadow-yellow-500/20' },
  recordatorio: { label: 'Recordatorio', color: 'bg-gradient-to-r from-pink-500/20 to-pink-400/20 text-pink-300 border-pink-400/30', dot: 'bg-pink-400', icon: '🔔', shadow: 'shadow-pink-500/20' },
  personal:     { label: 'Personal',     color: 'bg-gradient-to-r from-purple-500/20 to-purple-400/20 text-purple-300 border-purple-400/30', dot: 'bg-purple-400', icon: '👤', shadow: 'shadow-purple-500/20' },
  otro:         { label: 'Otro',         color: 'bg-gradient-to-r from-slate-500/20 to-slate-400/20 text-slate-300 border-slate-400/30', dot: 'bg-slate-400', icon: '📌', shadow: 'shadow-slate-500/20' },
}

const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DAYS_ES   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']

const EMPTY_FORM = { title: '', description: '', event_date: '', start_time: '', end_time: '', category: 'evento', quote_id: '' }

const WORKSPACE_MODULES = [
  { id: 'calendar', label: 'Calendario', subtitle: 'Eventos y agenda operativa' },
  { id: 'boards', label: 'Tableros', subtitle: 'Flujos visuales por equipo' },
  { id: 'lists', label: 'Listas', subtitle: 'Listas simples y accionables' },
  { id: 'notes', label: 'Notas', subtitle: 'Contexto rápido y acuerdos' },
  { id: 'social', label: 'Social', subtitle: 'Anuncios y posts del equipo' },
  { id: 'messages', label: 'Mensajes', subtitle: 'Chat interno en tiempo real' },
  { id: 'meetings', label: 'Reuniones', subtitle: 'Juntas y seguimiento operativo' },
  { id: 'assistant', label: 'Asistente AI', subtitle: 'Consultas operativas del negocio' },
]

const MODULE_ICONS = {
  calendar:  '📅',
  boards:    '📋',
  lists:     '✅',
  notes:     '📝',
  social:    '💬',
  messages:  '✉️',
  meetings:  '👥',
  assistant: '✨',
}

export default function Calendar() {
  const { theme, toggleTheme } = useTheme()
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdminUser = String(currentUser?.role || '').toLowerCase() === 'administrador'
  const today = new Date()
  const [activeModule, setActiveModule] = useState('calendar')
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1) // 1-based
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'view'
  const [form, setForm] = useState(EMPTY_FORM)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [, setSelectedDay] = useState(null)
  const [sidePanel, setSidePanel] = useState({ open: false, type: null, data: null })
  const [leftPanel, setLeftPanel] = useState({ open: false, filters: {}, search: '' })
  const [toast, setToast] = useState({ message: '', type: '', visible: false })
  const [skeletonLoading, setSkeletonLoading] = useState(false)
  const [boards, setBoards] = useState([])
  const [boardsLoading, setBoardsLoading] = useState(false)
  const [activeBoardId, setActiveBoardId] = useState(null)
  const [newBoardName, setNewBoardName] = useState('')
  const [boardOwnerUserId, setBoardOwnerUserId] = useState('')
  const [workspaceUsers, setWorkspaceUsers] = useState([])
  const [newCardByColumn, setNewCardByColumn] = useState({})
  const [boardsFeedback, setBoardsFeedback] = useState('')
  const [editingBoardName, setEditingBoardName] = useState('')
  const [editingColumnId, setEditingColumnId] = useState(null)
  const [editingColumnName, setEditingColumnName] = useState('')
  const [editingCardId, setEditingCardId] = useState(null)
  const [editingCardTitle, setEditingCardTitle] = useState('')
  const [newColumnName, setNewColumnName] = useState('')
  const [newCardPriorityByColumn, setNewCardPriorityByColumn] = useState({})
  const [boardSearch, setBoardSearch] = useState('')
  const [boardPriorityFilter] = useState('all')
  const [boardViewMode] = useState('all')
  const [inboxTab] = useState('today')
  const [cardModal, setCardModal] = useState(null)
  const [cardDetailLoading, setCardDetailLoading] = useState(false)
  const [checklistDraft, setChecklistDraft] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [listsData, setListsData] = useState([])
  const [newListTitle, setNewListTitle] = useState('')
  const [newListItemByList, setNewListItemByList] = useState({})
  const [editingListId, setEditingListId] = useState(null)
  const [editingListTitle, setEditingListTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemContent, setEditingItemContent] = useState('')
  const [notesData, setNotesData] = useState([])
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [editingNoteTitle, setEditingNoteTitle] = useState('')
  const [editingNoteContent, setEditingNoteContent] = useState('')
  const [newNoteTitle, setNewNoteTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [socialPosts, setSocialPosts] = useState([])
  const [socialLoading, setSocialLoading] = useState(false)
  const [socialType, setSocialType] = useState('post')
  const [socialTitle, setSocialTitle] = useState('')
  const [socialContent, setSocialContent] = useState('')
  const [socialCommentDrafts, setSocialCommentDrafts] = useState({})
  const [socialUnreadMentions, setSocialUnreadMentions] = useState(0)
  const [socialMentions, setSocialMentions] = useState([])
  const [socialAttachmentFile, setSocialAttachmentFile] = useState(null)
  const [socialAttachmentPreview, setSocialAttachmentPreview] = useState('')
  const [socialPosting, setSocialPosting] = useState(false)
  const [assistantMessages, setAssistantMessages] = useState([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Hola, soy tu asistente operativo. Puedes preguntarme: "como va la venta", "cuantas mesas hubo hoy", "que personal falto hoy" o "quien esta de vacaciones".',
    },
  ])
  const [assistantInput, setAssistantInput] = useState('')
  const [assistantLoading, setAssistantLoading] = useState(false)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await calendarAPI.getEvents(month, year)
      setEvents(res.data.events || [])
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [month, year])

  useEffect(() => { loadEvents() }, [loadEvents])

  const loadBoards = useCallback(async () => {
    setBoardsLoading(true)
    setBoardsFeedback('')
    try {
      const res = await workspaceBoardsAPI.list()
      const nextBoards = res.data?.boards || []
      setBoards(nextBoards)
      if (nextBoards.length > 0) {
        setActiveBoardId((prev) => prev || nextBoards[0].id)
      }
    } catch (err) {
      const apiError = err?.response?.data?.error || 'No se pudieron cargar los tableros.'
      setBoardsFeedback(apiError)
      setBoards([])
    } finally {
      setBoardsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeModule === 'boards') {
      loadBoards()
    }
  }, [activeModule, loadBoards])

  const loadWorkspaceUsers = useCallback(async () => {
    try {
      const res = await workspaceBoardsAPI.listUsers()
      const users = res.data?.users || []
      setWorkspaceUsers(users)
      if (users.length > 0 && !boardOwnerUserId) {
        setBoardOwnerUserId(String(users[0].id))
      }
    } catch {
      setWorkspaceUsers([])
    }
  }, [boardOwnerUserId])

  useEffect(() => {
    if (activeModule === 'boards') {
      loadWorkspaceUsers()
    }
  }, [activeModule, loadWorkspaceUsers])

  useEffect(() => {
    if (activeModule === 'social' && workspaceUsers.length === 0) {
      loadWorkspaceUsers()
    }
  }, [activeModule, workspaceUsers.length, loadWorkspaceUsers])

  useEffect(() => {
    return () => {
      if (socialAttachmentPreview && socialAttachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(socialAttachmentPreview)
      }
    }
  }, [socialAttachmentPreview])

  const loadLists = useCallback(async () => {
    try {
      const res = await workspaceListsAPI.listGroups()
      setListsData(res.data?.lists || [])
    } catch {
      setListsData([])
    }
  }, [])

  const loadNotes = useCallback(async () => {
    try {
      const res = await workspaceNotesAPI.list()
      setNotesData(res.data?.notes || [])
    } catch {
      setNotesData([])
    }
  }, [])

  const showSidePanel = (type, data) => {
    setSidePanel({ open: true, type, data })
  }

  const hideSidePanel = () => {
    setSidePanel({ open: false, type: null, data: null })
  }

  const showToast = (message, type = 'info') => {
    setToast({ message, type, visible: true })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 3000)
  }

  const toggleLeftPanel = () => {
    setLeftPanel(prev => ({ ...prev, open: !prev.open }))
  }

  const openCardDetail = (card) => {
    showSidePanel('card', card)
  }

  const openNoteDetail = (note) => {
    showSidePanel('note', note)
  }

  const loadSocial = useCallback(async () => {
    setSocialLoading(true)
    try {
      const res = await workspaceSocialAPI.list()
      setSocialPosts(res.data?.posts || [])
      setSocialUnreadMentions(Number(res.data?.unread_mentions || 0))
      setSocialMentions(res.data?.mentions || [])
    } catch {
      setSocialPosts([])
      setSocialUnreadMentions(0)
      setSocialMentions([])
    } finally {
      setSocialLoading(false)
    }
  }, [])

  useEffect(() => {
    if (activeModule === 'lists') loadLists()
    if (activeModule === 'notes') loadNotes()
    if (activeModule === 'social') loadSocial()
  }, [activeModule, loadLists, loadNotes, loadSocial])

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay() // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)

  const eventsForDay = (day) => {
    if (!day) return []
    const key = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
    return events.filter(e => e.event_date === key)
  }

  const isToday = (day) => {
    return day === today.getDate() && month === today.getMonth() + 1 && year === today.getFullYear()
  }

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1) }
    else if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  const openCreate = (day = null) => {
    const dateStr = day
      ? `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
      : ''
    setForm({ ...EMPTY_FORM, event_date: dateStr })
    setSelectedDay(day)
    setModal('create')
  }

  const openEdit = (event) => {
    setSelectedEvent(event)
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time || '',
      end_time: event.end_time || '',
      category: event.category || 'evento',
      quote_id: event.quote_id || '',
    })
    setModal('edit')
  }

  const openView = (event) => {
    setSelectedEvent(event)
    setModal('view')
  }

  const handleSave = async () => {
    if (!form.title || !form.event_date) {
      setFormError('Titulo y fecha son obligatorios')
      return
    }
    if (form.start_time && form.end_time && form.end_time <= form.start_time) {
      setFormError('La hora fin debe ser mayor a la hora inicio')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      if (modal === 'edit' && selectedEvent) {
        await calendarAPI.updateEvent(selectedEvent.id, { ...form, quote_id: form.quote_id || null })
      } else {
        await calendarAPI.createEvent({ ...form, quote_id: form.quote_id || null })
      }
      await loadEvents()
      setModal(null)
    } catch {
      setFormError('No se pudo guardar el evento. Intenta de nuevo.')
    }
    finally { setSaving(false) }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este evento?')) return
    try {
      await calendarAPI.deleteEvent(id)
      await loadEvents()
      setModal(null)
    } catch { /* silent */ }
  }

  const upd = (key) => (e) => setForm(prev => ({ ...prev, [key]: e.target.value }))

  const inputCls = 'w-full rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:border-cyan-500/40 focus:outline-none transition-colors'

  const fmtTime = (t) => {
    if (!t) return ''
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'pm' : 'am'}`
  }

  const fmtDate = (d) => {
    if (!d) return ''
    return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long' })
  }

  const activeBoard = boards.find((b) => b.id === activeBoardId) || boards[0] || null
  useEffect(() => {
    setEditingBoardName(activeBoard?.name || '')
  }, [activeBoard?.id])

  const createBoard = async () => {
    const name = newBoardName.trim()
    if (!name) {
      setBoardsFeedback('Escribe un nombre de tablero antes de crear.')
      return
    }
    try {
      setBoardsFeedback('')
      await workspaceBoardsAPI.create({
        name,
        description: '',
        owner_user_id: isAdminUser ? Number(boardOwnerUserId || currentUser?.id || 0) : currentUser?.id,
      })
      setNewBoardName('')
      await loadBoards()
      setBoardsFeedback('Tablero creado correctamente.')
    } catch (err) {
      const apiError = err?.response?.data?.error || 'No se pudo crear el tablero.'
      setBoardsFeedback(apiError)
    }
  }

  const createCard = async (columnId) => {
    if (!activeBoard) return
    const title = (newCardByColumn[columnId] || '').trim()
    if (!title) {
      setBoardsFeedback('Escribe un título para la card.')
      return
    }
    try {
      setBoardsFeedback('')
      await workspaceBoardsAPI.createCard({
        board_id: activeBoard.id,
        column_id: columnId,
        title,
        details: '',
        priority: newCardPriorityByColumn[columnId] || 'medium',
        due_date: null,
        assigned_to: null,
      })
      setNewCardByColumn((prev) => ({ ...prev, [columnId]: '' }))
      setNewCardPriorityByColumn((prev) => ({ ...prev, [columnId]: 'medium' }))
      await loadBoards()
      setBoardsFeedback('Card agregada correctamente.')
    } catch (err) {
      const apiError = err?.response?.data?.error || 'No se pudo agregar la card.'
      setBoardsFeedback(apiError)
    }
  }

  const onCardDragStart = (ev, cardId) => {
    ev.dataTransfer.setData('text/plain', String(cardId))
    ev.dataTransfer.effectAllowed = 'move'
  }

  const onColumnDrop = async (ev, columnId) => {
    ev.preventDefault()
    const cardId = Number(ev.dataTransfer.getData('text/plain'))
    if (!cardId || !activeBoard) return
    const targetColumn = activeBoard.columns.find((col) => col.id === columnId)
    const sortOrder = (targetColumn?.cards?.length || 0) + 1
    try {
      await workspaceBoardsAPI.moveCard({
        card_id: cardId,
        to_column_id: columnId,
        to_sort_order: sortOrder,
      })
      await loadBoards()
    } catch (err) {
      const apiError = err?.response?.data?.error || 'No se pudo mover la card.'
      setBoardsFeedback(apiError)
    }
  }

  const saveBoardName = async () => {
    if (!activeBoard) return
    const name = editingBoardName.trim()
    if (!name) return
    try {
      await workspaceBoardsAPI.updateBoard({ board_id: activeBoard.id, name })
      await loadBoards()
      setBoardsFeedback('Nombre del tablero actualizado.')
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo editar el tablero.')
    }
  }

  const archiveActiveBoard = async () => {
    if (!activeBoard) return
    if (!confirm(`¿Archivar el tablero "${activeBoard.name}"?`)) return
    try {
      await workspaceBoardsAPI.archive(activeBoard.id)
      await loadBoards()
    } catch {
      // silent
    }
  }

  const createColumn = async () => {
    if (!activeBoard) return
    const name = newColumnName.trim()
    if (!name) {
      setBoardsFeedback('Escribe un nombre de columna.')
      return
    }
    try {
      await workspaceBoardsAPI.createColumn({ board_id: activeBoard.id, name })
      setNewColumnName('')
      await loadBoards()
      setBoardsFeedback('Columna creada.')
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo crear la columna.')
    }
  }

  const removeColumn = async (columnId) => {
    if (!confirm('¿Eliminar esta columna y todas sus cards?')) return
    try {
      await workspaceBoardsAPI.deleteColumn({ column_id: columnId })
      await loadBoards()
      setBoardsFeedback('Columna eliminada.')
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo eliminar la columna.')
    }
  }

  const startEditColumn = (column) => {
    setEditingColumnId(column.id)
    setEditingColumnName(column.name || '')
  }

  const saveColumnName = async () => {
    const name = editingColumnName.trim()
    if (!editingColumnId || !name) return
    try {
      await workspaceBoardsAPI.updateColumn({ column_id: editingColumnId, name })
      setEditingColumnId(null)
      setEditingColumnName('')
      await loadBoards()
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo editar la columna.')
    }
  }

  const startEditCard = (card) => {
    setEditingCardId(card.id)
    setEditingCardTitle(card.title || '')
  }

  const saveCardEdit = async () => {
    const title = editingCardTitle.trim()
    if (!editingCardId || !title) return
    try {
      await workspaceBoardsAPI.updateCard({ card_id: editingCardId, title })
      setEditingCardId(null)
      setEditingCardTitle('')
      await loadBoards()
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo editar la card.')
    }
  }

  const removeCard = async (cardId) => {
    if (!confirm('¿Eliminar esta card?')) return
    try {
      await workspaceBoardsAPI.deleteCard({ card_id: cardId })
      await loadBoards()
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo eliminar la card.')
    }
  }

  const openCardModal = (card) => {
    setCardModal({
      id: card.id,
      title: card.title || '',
      details: card.details || '',
      priority: card.priority || 'medium',
      due_date: card.due_date || '',
      assigned_to: card.assigned_to ? String(card.assigned_to) : '',
      checklist: [],
      comments: [],
      activity: [],
    })
    loadCardDetail(card.id)
  }

  const loadCardDetail = async (cardId) => {
    setCardDetailLoading(true)
    try {
      const res = await workspaceBoardsAPI.getCardDetail({ card_id: cardId })
      const payload = res.data || {}
      setCardModal((prev) => {
        if (!prev || prev.id !== cardId) return prev
        return {
          ...prev,
          details: payload.card?.details || prev.details || '',
          priority: payload.card?.priority || prev.priority || 'medium',
          due_date: payload.card?.due_date || '',
          assigned_to: payload.card?.assigned_to ? String(payload.card.assigned_to) : '',
          checklist: payload.checklist || [],
          comments: payload.comments || [],
          activity: payload.activity || [],
        }
      })
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo cargar el detalle de la card.')
    } finally {
      setCardDetailLoading(false)
    }
  }

  const saveCardModal = async () => {
    if (!cardModal?.id || !cardModal?.title?.trim()) return
    try {
      await workspaceBoardsAPI.updateCard({
        card_id: cardModal.id,
        title: cardModal.title.trim(),
        details: cardModal.details || '',
        priority: cardModal.priority || 'medium',
        due_date: cardModal.due_date || null,
        assigned_to: cardModal.assigned_to ? Number(cardModal.assigned_to) : null,
      })
      await loadBoards()
      await loadCardDetail(cardModal.id)
      setBoardsFeedback('Card actualizada.')
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo actualizar la card.')
    }
  }

  const addChecklistItem = async () => {
    if (!cardModal?.id || !checklistDraft.trim()) return
    try {
      await workspaceBoardsAPI.addChecklistItem({ card_id: cardModal.id, content: checklistDraft.trim() })
      setChecklistDraft('')
      await loadCardDetail(cardModal.id)
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo agregar checklist.')
    }
  }

  const toggleChecklistItem = async (item) => {
    if (!cardModal?.id) return
    try {
      await workspaceBoardsAPI.toggleChecklistItem({ item_id: item.id, is_done: Number(item.is_done) === 1 ? 0 : 1 })
      await loadCardDetail(cardModal.id)
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo actualizar checklist.')
    }
  }

  const removeChecklistItem = async (itemId) => {
    if (!cardModal?.id) return
    try {
      await workspaceBoardsAPI.deleteChecklistItem({ item_id: itemId })
      await loadCardDetail(cardModal.id)
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo eliminar checklist.')
    }
  }

  const addComment = async () => {
    if (!cardModal?.id || !commentDraft.trim()) return
    try {
      await workspaceBoardsAPI.addComment({ card_id: cardModal.id, content: commentDraft.trim() })
      setCommentDraft('')
      await loadCardDetail(cardModal.id)
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo agregar comentario.')
    }
  }

  const _priorityPillClass = (priority) => {
    if (priority === 'high') return 'border-red-400/40 bg-red-500/15 text-red-200'
    if (priority === 'low') return 'border-emerald-400/40 bg-emerald-500/15 text-emerald-200'
    return 'border-amber-400/40 bg-amber-500/15 text-amber-100'
  }
  const getChecklistProgress = (card) => {
    const total = Number(card?.checklist_total || 0)
    const done = Number(card?.checklist_done || 0)
    if (!total) return 0
    return Math.round((done / total) * 100)
  }
  const isDueDateOverdue = (dueDate) => {
    if (!dueDate) return false
    const todayISO = new Date().toISOString().slice(0, 10)
    return dueDate < todayISO
  }

  const normalizedSearch = boardSearch.trim().toLowerCase()
  const boardColumns = (activeBoard?.columns || []).map((col) => {
    const filteredCards = (col.cards || []).filter((card) => {
      const bySearch = !normalizedSearch || String(card.title || '').toLowerCase().includes(normalizedSearch)
      const byPriority = boardPriorityFilter === 'all' || card.priority === boardPriorityFilter
      const isMine = Number(card.assigned_to || 0) === Number(currentUser?.id || 0)
      const byViewMode =
        boardViewMode === 'all' ||
        (boardViewMode === 'mine' && isMine) ||
        (boardViewMode === 'overdue' && isDueDateOverdue(card.due_date))
      return bySearch && byPriority && byViewMode
    })
    return { ...col, cards: filteredCards }
  })
  const totalVisibleCards = boardColumns.reduce((acc, col) => acc + col.cards.length, 0)
  const myAssignedCards = (activeBoard?.columns || [])
    .flatMap((col) => (col.cards || []).map((card) => ({ ...card, column_name: col.name })))
    .filter((card) => Number(card.assigned_to || 0) === Number(currentUser?.id || 0))
    .sort((a, b) => {
      const overdueA = isDueDateOverdue(a.due_date) ? 1 : 0
      const overdueB = isDueDateOverdue(b.due_date) ? 1 : 0
      if (overdueA !== overdueB) return overdueB - overdueA
      const weight = { high: 3, medium: 2, low: 1 }
      const pA = weight[a.priority] || 0
      const pB = weight[b.priority] || 0
      if (pA !== pB) return pB - pA
      return String(a.due_date || '9999-12-31').localeCompare(String(b.due_date || '9999-12-31'))
    })
  const myOverdueCount = myAssignedCards.filter((card) => isDueDateOverdue(card.due_date)).length
  const allAssignedCards = boards
    .flatMap((board) =>
      (board.columns || []).flatMap((col) =>
        (col.cards || []).map((card) => ({
          ...card,
          board_id: board.id,
          board_name: board.name,
          column_name: col.name,
        })),
      ),
    )
    .filter((card) => Number(card.assigned_to || 0) === Number(currentUser?.id || 0))
  const todayISO = new Date().toISOString().slice(0, 10)
  const oneWeekLater = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toISOString().slice(0, 10)
  })()
  const inboxFilteredCards = allAssignedCards
    .filter((card) => {
      if (inboxTab === 'today') return card.due_date === todayISO
      if (inboxTab === 'week') return Boolean(card.due_date) && card.due_date >= todayISO && card.due_date <= oneWeekLater
      if (inboxTab === 'overdue') return isDueDateOverdue(card.due_date)
      if (inboxTab === 'high') return card.priority === 'high'
      return true
    })
    .sort((a, b) => {
      const overdueA = isDueDateOverdue(a.due_date) ? 1 : 0
      const overdueB = isDueDateOverdue(b.due_date) ? 1 : 0
      if (overdueA !== overdueB) return overdueB - overdueA
      return String(a.due_date || '9999-12-31').localeCompare(String(b.due_date || '9999-12-31'))
    })
  const createList = async () => {
    const title = newListTitle.trim()
    if (!title) return
    try {
      await workspaceListsAPI.createGroup({ title, description: '' })
      setNewListTitle('')
      await loadLists()
    } catch {
      // silent
    }
  }

  const addListItem = async (listId) => {
    const content = (newListItemByList[listId] || '').trim()
    if (!content) return
    try {
      await workspaceListsAPI.saveItem({ list_id: listId, content, priority: 'medium' })
      setNewListItemByList((prev) => ({ ...prev, [listId]: '' }))
      await loadLists()
    } catch {
      // silent
    }
  }

  const startEditList = (listItem) => {
    setEditingListId(listItem.id)
    setEditingListTitle(listItem.title || '')
  }

  const saveListEdit = async () => {
    const title = editingListTitle.trim()
    if (!editingListId || !title) return
    try {
      await workspaceListsAPI.updateGroup({ list_id: editingListId, title })
      setEditingListId(null)
      setEditingListTitle('')
      await loadLists()
    } catch {
      // silent
    }
  }

  const deleteList = async (listId) => {
    if (!confirm('¿Eliminar esta lista y todos sus pendientes?')) return
    try {
      await workspaceListsAPI.deleteGroup({ list_id: listId })
      await loadLists()
    } catch {
      // silent
    }
  }

  const toggleListItem = async (itemId, isDone) => {
    try {
      await workspaceListsAPI.toggleItem({ item_id: itemId, is_done: isDone ? 0 : 1 })
      await loadLists()
    } catch {
      // silent
    }
  }

  const startEditItem = (item) => {
    setEditingItemId(item.id)
    setEditingItemContent(item.content || '')
  }

  const saveItemEdit = async () => {
    const content = editingItemContent.trim()
    if (!editingItemId || !content) return
    try {
      await workspaceListsAPI.updateItem({ item_id: editingItemId, content })
      setEditingItemId(null)
      setEditingItemContent('')
      await loadLists()
    } catch {
      // silent
    }
  }

  const deleteItem = async (itemId) => {
    if (!confirm('¿Eliminar este pendiente?')) return
    try {
      await workspaceListsAPI.deleteItem({ item_id: itemId })
      await loadLists()
    } catch {
      // silent
    }
  }

  const createNote = async () => {
    const title = newNoteTitle.trim()
    if (!title) return
    try {
      await workspaceNotesAPI.create({ title, content: newNoteContent, note_scope: 'team' })
      setNewNoteTitle('')
      setNewNoteContent('')
      await loadNotes()
    } catch {
      // silent
    }
  }

  const toggleNotePin = async (noteId, pinned) => {
    try {
      await workspaceNotesAPI.togglePin({ note_id: noteId, pinned: pinned ? 0 : 1 })
      await loadNotes()
    } catch {
      // silent
    }
  }

  const startEditNote = (note) => {
    setEditingNoteId(note.id)
    setEditingNoteTitle(note.title || '')
    setEditingNoteContent(note.content || '')
  }

  const cancelEditNote = () => {
    setEditingNoteId(null)
    setEditingNoteTitle('')
    setEditingNoteContent('')
  }

  const saveNoteEdit = async () => {
    const title = editingNoteTitle.trim()
    if (!editingNoteId || !title) return
    try {
      await workspaceNotesAPI.update(editingNoteId, { title, content: editingNoteContent })
      cancelEditNote()
      await loadNotes()
    } catch {
      // silent
    }
  }

  const deleteNote = async (noteId) => {
    if (!confirm('¿Eliminar esta nota?')) return
    try {
      await workspaceNotesAPI.remove(noteId)
      if (editingNoteId === noteId) cancelEditNote()
      await loadNotes()
    } catch {
      // silent
    }
  }

  const createSocialPost = async () => {
    const content = socialContent.trim()
    if (!content || socialPosting) return
    try {
      setSocialPosting(true)
      let attachmentPayload = {}
      if (socialAttachmentFile) {
        const formData = new FormData()
        formData.append('action', 'upload_attachment')
        formData.append('file', socialAttachmentFile)
        const uploadRes = await workspaceSocialAPI.uploadAttachment(formData)
        const attachment = uploadRes.data?.attachment
        if (attachment?.url) {
          attachmentPayload = {
            attachment_url: attachment.url,
            attachment_name: attachment.name || socialAttachmentFile.name,
            attachment_size: Number(attachment.size || socialAttachmentFile.size || 0),
            attachment_mime: attachment.mime || socialAttachmentFile.type || '',
          }
        }
      }

      await workspaceSocialAPI.createPost({
        post_type: socialType,
        title: socialTitle.trim(),
        content,
        ...attachmentPayload,
      })
      setSocialTitle('')
      setSocialContent('')
      setSocialType('post')
      setSocialAttachmentFile(null)
      setSocialAttachmentPreview('')
      await loadSocial()
    } catch {
      // silent
    } finally {
      setSocialPosting(false)
    }
  }

  const createSocialComment = async (postId) => {
    const content = (socialCommentDrafts[postId] || '').trim()
    if (!content) return
    try {
      await workspaceSocialAPI.createComment({ post_id: postId, content })
      setSocialCommentDrafts((prev) => ({ ...prev, [postId]: '' }))
      await loadSocial()
    } catch {
      // silent
    }
  }

  const toggleSocialPin = async (postId, pinned) => {
    if (!isAdminUser) return
    try {
      await workspaceSocialAPI.togglePin({ post_id: postId, pinned: pinned ? 0 : 1 })
      await loadSocial()
    } catch {
      // silent
    }
  }

  const toggleSocialReaction = async (postId, reactionType) => {
    try {
      await workspaceSocialAPI.toggleReaction({ post_id: postId, reaction_type: reactionType })
      await loadSocial()
    } catch {
      // silent
    }
  }

  const markSocialMentionsSeen = async () => {
    if (socialUnreadMentions <= 0) return
    try {
      await workspaceSocialAPI.markMentionsSeen()
      setSocialUnreadMentions(0)
      setSocialMentions((prev) => prev.map((mention) => ({ ...mention, seen_at: mention.seen_at || new Date().toISOString() })))
    } catch {
      // silent
    }
  }

  const markSocialMentionSeen = async (mentionId) => {
    try {
      const target = socialMentions.find((mention) => Number(mention.id) === Number(mentionId))
      const wasUnread = target ? !target.seen_at : false
      await workspaceSocialAPI.markMentionSeen({ mention_id: mentionId })
      setSocialMentions((prev) =>
        prev.map((mention) => (Number(mention.id) === Number(mentionId) ? { ...mention, seen_at: mention.seen_at || new Date().toISOString() } : mention))
      )
      if (wasUnread) {
        setSocialUnreadMentions((prev) => Math.max(0, prev - 1))
      }
    } catch {
      // silent
    }
  }

  const renderMentions = (text) => {
    const value = String(text || '')
    const parts = value.split(/(@[a-zA-Z0-9_.-]{3,40})/g)
    return parts.map((part, idx) => {
      if (/^@[a-zA-Z0-9_.-]{3,40}$/.test(part)) {
        return <span key={`${part}-${idx}`} className="font-medium text-cyan-300">{part}</span>
      }
      return <span key={`plain-${idx}`}>{part}</span>
    })
  }

  const handleSocialAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) return
    const maxSize = 8 * 1024 * 1024
    if (file.size > maxSize) return
    setSocialAttachmentFile(file)
    if (String(file.type || '').startsWith('image/')) {
      setSocialAttachmentPreview(URL.createObjectURL(file))
    } else {
      setSocialAttachmentPreview('')
    }
  }

  const bentoCards = [
    {
      id: 'calendar',
      title: 'Calendario',
      metric: `${events.length}`,
      metricLabel: 'eventos este mes',
      tone: 'from-cyan-500/12 to-blue-500/5 border-cyan-500/25',
    },
    {
      id: 'boards',
      title: 'Tableros',
      metric: '4',
      metricLabel: 'estados de flujo',
      tone: 'from-fuchsia-500/12 to-violet-500/5 border-fuchsia-500/25',
    },
    {
      id: 'lists',
      title: 'Listas',
      metric: `${listsData.length}`,
      metricLabel: 'listas activas',
      tone: 'from-emerald-500/12 to-teal-500/5 border-emerald-500/25',
    },
    {
      id: 'notes',
      title: 'Notas',
      metric: `${notesData.length}`,
      metricLabel: 'notas recientes',
      tone: 'from-amber-500/12 to-orange-500/5 border-amber-500/25',
    },
    {
      id: 'social',
      title: 'Social',
      metric: socialUnreadMentions > 0 ? `${socialUnreadMentions}` : `${socialPosts.length}`,
      metricLabel: socialUnreadMentions > 0 ? 'menciones pendientes' : 'posts del equipo',
      tone: 'from-indigo-500/12 to-violet-500/5 border-indigo-500/25',
    },
    {
      id: 'messages',
      title: 'Mensajes',
      metric: 'Live',
      metricLabel: 'chat interno activo',
      tone: 'from-sky-500/12 to-cyan-500/5 border-sky-500/25',
    },
    {
      id: 'meetings',
      title: 'Reuniones',
      metric: 'Sala',
      metricLabel: 'juntas y minuta',
      tone: 'from-emerald-500/12 to-cyan-500/5 border-emerald-500/25',
    },
    {
      id: 'assistant',
      title: 'Asistente AI',
      metric: assistantLoading ? '...' : `${assistantMessages.length - 1}`,
      metricLabel: 'consultas respondidas',
      tone: 'from-fuchsia-500/12 to-indigo-500/5 border-fuchsia-500/25',
    },
  ]

  const onDragEnd = async (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return // dropped outside
    if (source.droppableId === destination.droppableId && source.index === destination.index) return // no move
    try {
      await workspaceBoardsAPI.moveCard({
        card_id: Number(draggableId),
        to_column_id: Number(destination.droppableId),
        to_sort_order: destination.index,
      })
      await loadBoards()
    } catch (err) {
      setBoardsFeedback(err?.response?.data?.error || 'No se pudo mover la card.')
    }
  }

  const askAssistant = async () => {
    const question = assistantInput.trim()
    if (!question || assistantLoading) return
    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: question }
    setAssistantMessages((prev) => [...prev, userMsg])
    setAssistantInput('')
    setAssistantLoading(true)
    try {
      const res = await workspaceAssistantAPI.ask(question)
      const answer = res.data?.answer || 'No pude responder esa consulta en este momento.'
      setAssistantMessages((prev) => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: answer }])
    } catch (err) {
      setAssistantMessages((prev) => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: err?.response?.data?.error || 'Error consultando al asistente. Intenta de nuevo.',
        },
      ])
    } finally {
      setAssistantLoading(false)
    }
  }

  return (
    <div className="min-h-screen pb-20 sm:pb-2 space-y-3 sm:space-y-5">
      <div className="group relative overflow-hidden rounded-2xl sm:rounded-3xl border border-cyan-500/25 bg-gradient-to-br from-[#040c1a]/95 to-[#060f20]/90 p-4 sm:p-5 lg:p-6 backdrop-blur-xl shadow-2xl shadow-cyan-500/5 transition-all duration-500 hover:shadow-cyan-500/10 hover:border-cyan-400/35">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/8 via-blue-500/5 to-fuchsia-500/8 pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="hidden sm:block absolute -top-24 -right-24 h-48 w-48 rounded-full bg-cyan-400/5 blur-3xl group-hover:bg-cyan-400/10 transition-all duration-1000" />
        <div className="relative flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] sm:text-[10px] font-medium uppercase tracking-[0.3em] sm:tracking-[0.4em] text-cyan-400/60 mb-1.5 sm:mb-2 animate-pulse">Workspace</p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extralight text-white tracking-tight bg-gradient-to-r from-white via-cyan-50 to-blue-100 bg-clip-text text-transparent">Centro Operativo</h1>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-1 sm:mt-1.5 max-w-2xl leading-relaxed">Calendario, tableros, listas, notas, social, mensajes y reuniones</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <button
              onClick={toggleTheme}
              className="group/theme relative inline-flex h-11 w-11 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-slate-700/40 bg-gradient-to-br from-slate-800/60 to-slate-900/40 backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/20 active:scale-95 touch-manipulation"
              aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? (
                <svg className="h-5 w-5 text-amber-400 transition-all duration-300 group-hover/theme:rotate-180 group-hover/theme:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="h-5 w-5 text-indigo-400 transition-all duration-300 group-hover/theme:-rotate-12 group-hover/theme:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            {activeModule === 'calendar' && (
              <button
                onClick={() => openCreate()}
                className="group/btn inline-flex flex-1 sm:flex-initial items-center justify-center gap-2 sm:gap-2.5 rounded-full border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-4 sm:px-5 py-3 sm:py-2.5 text-sm font-semibold text-cyan-300 shadow-lg shadow-cyan-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-cyan-300/60 hover:from-cyan-500/25 hover:to-blue-500/25 hover:shadow-xl hover:shadow-cyan-400/30 active:scale-95 touch-manipulation min-h-[44px]"
                aria-label="Crear nuevo evento"
              >
                <svg className="h-4 w-4 transition-transform duration-300 group-hover/btn:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Nuevo Evento
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-gradient-to-t from-[#030b18] via-[#030b18]/98 to-[#030b18]/95 border-t border-cyan-500/10 backdrop-blur-xl pb-safe" aria-label="Navegación principal del workspace">
        <div className="grid grid-cols-4 gap-0.5 px-1 py-2" role="tablist">
          {WORKSPACE_MODULES.slice(0, 8).map((mod) => (
            <button
              key={mod.id}
              onClick={() => setActiveModule(mod.id)}
              role="tab"
              aria-selected={activeModule === mod.id}
              aria-label={`Módulo ${mod.label}`}
              className={`flex flex-col items-center gap-1 rounded-xl py-2.5 px-1 text-center transition-all active:scale-95 touch-manipulation min-h-[60px] ${
                activeModule === mod.id
                  ? 'bg-cyan-500/15 text-cyan-300'
                  : 'text-slate-400 active:bg-slate-800/40'
              }`}
            >
              <span className="text-2xl leading-none">{MODULE_ICONS[mod.id]}</span>
              <span className="text-[10px] leading-tight font-medium">{mod.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-4">
        {bentoCards.map((card) => (
          <button
            key={card.id}
            onClick={() => setActiveModule(card.id)}
            className={`group/card relative overflow-hidden rounded-xl sm:rounded-2xl border bg-gradient-to-br p-4 sm:p-5 lg:p-6 text-left backdrop-blur-sm transition-all duration-500 active:scale-95 sm:hover:scale-[1.03] sm:hover:-translate-y-1 touch-manipulation min-h-[100px] sm:min-h-[120px] ${card.tone} ${
              activeModule === card.id ? 'ring-2 ring-cyan-400/50 shadow-2xl shadow-cyan-500/20 scale-[1.02]' : 'shadow-lg sm:hover:shadow-2xl'
            }`}
          >
            <div className="hidden sm:block absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/card:opacity-100" />
            <div className="relative">
              <p className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.2em] sm:tracking-[0.25em] text-slate-400/80 mb-2 sm:mb-3 transition-colors duration-300 sm:group-hover/card:text-slate-300">{card.title}</p>
              <p className="text-xl sm:text-2xl lg:text-3xl font-extralight text-white transition-all duration-300 sm:group-hover/card:scale-105">{card.metric}</p>
              <p className="text-[11px] sm:text-xs text-slate-400/90 mt-1.5 sm:mt-2 leading-relaxed">{card.metricLabel}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="hidden sm:grid grid-cols-1 gap-3 md:grid-cols-3 md:gap-4">
        <div className="group/stat relative overflow-hidden rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 px-5 py-4 backdrop-blur-sm shadow-lg shadow-cyan-500/10 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/70">Ejecución</p>
          <p className="relative mt-2 text-2xl font-extralight text-cyan-50 transition-transform duration-300 group-hover/stat:scale-110">{totalVisibleCards}</p>
          <p className="relative text-xs text-slate-400/90 mt-1.5">cards visibles en el tablero activo</p>
        </div>
        <div className="group/stat relative overflow-hidden rounded-2xl border border-red-500/30 bg-gradient-to-br from-red-500/10 to-red-600/5 px-5 py-4 backdrop-blur-sm shadow-lg shadow-red-500/10 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-red-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-red-300/70">Riesgo</p>
          <p className="relative mt-2 text-2xl font-extralight text-red-100 transition-transform duration-300 group-hover/stat:scale-110">{myOverdueCount}</p>
          <p className="relative text-xs text-slate-400/90 mt-1.5">cards vencidas asignadas a ti</p>
        </div>
        <div className="group/stat relative overflow-hidden rounded-2xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 px-5 py-4 backdrop-blur-sm shadow-lg shadow-indigo-500/10 transition-all duration-500 hover:scale-105 hover:shadow-xl hover:shadow-indigo-500/20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 transition-opacity duration-500 group-hover/stat:opacity-100" />
          <p className="relative text-[10px] font-semibold uppercase tracking-[0.2em] text-indigo-300/70">Inbox</p>
          <p className="relative mt-2 text-2xl font-extralight text-indigo-100 transition-transform duration-300 group-hover/stat:scale-110">{inboxFilteredCards.length}</p>
          <p className="relative text-xs text-slate-400/90 mt-1.5">items en el filtro global actual</p>
        </div>
      </div>

      <div className="hidden sm:block sticky top-2 z-20 -mx-2 rounded-xl border border-cyan-500/10 bg-[#020816]/80 px-2 py-2 backdrop-blur-sm sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0">
        <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible">
          {WORKSPACE_MODULES.map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveModule(module.id)}
              className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition-all ${
                activeModule === module.id
                  ? 'border-cyan-400/40 bg-cyan-500/12 text-cyan-300'
                  : 'border-slate-700/50 bg-[#030b18]/40 text-slate-400 hover:border-cyan-500/30 hover:text-cyan-300'
              }`}
            >
              {module.label}
            </button>
          ))}
        </div>
      </div>

      <div className="sm:hidden flex items-center gap-2 px-1">
        <span className="text-lg">{MODULE_ICONS[activeModule]}</span>
        <div>
          <p className="text-sm font-medium text-white leading-none">{WORKSPACE_MODULES.find(m => m.id === activeModule)?.label}</p>
          <p className="text-[10px] text-slate-500 mt-0.5">{WORKSPACE_MODULES.find(m => m.id === activeModule)?.subtitle}</p>
        </div>
      </div>

      {activeModule === 'calendar' && (
      <>
      {/* Calendar Card */}
      <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/80 overflow-hidden">
        {/* Month Navigation */}
        <div className="flex items-center justify-between gap-2 px-3 py-3 sm:px-5 sm:py-4 border-b border-cyan-500/10">
          <button onClick={prevMonth} className="rounded-lg p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <h2 className="truncate text-base font-light text-white sm:text-lg">{MONTHS_ES[month - 1]} {year}</h2>
            {(month !== today.getMonth() + 1 || year !== today.getFullYear()) && (
              <button
                onClick={() => { setMonth(today.getMonth() + 1); setYear(today.getFullYear()) }}
                className="text-[10px] rounded-full border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-400 hover:border-cyan-400/40 transition-all"
              >
                Hoy
              </button>
            )}
          </div>
          <button onClick={nextMonth} className="rounded-lg p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[700px]">
            {/* Day headers */}
            <div className="grid grid-cols-7 border-b border-cyan-500/10">
              {DAYS_ES.map(d => (
                <div key={d} className="py-2 text-center text-[10px] uppercase tracking-widest text-slate-600">{d}</div>
              ))}
            </div>

            {/* Grid */}
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
              </div>
            ) : (
              <div className="grid grid-cols-7">
                {cells.map((day, i) => {
                  const dayEvents = eventsForDay(day)
                  const isT = isToday(day)
                  return (
                    <div
                      key={i}
                      onClick={() => day && openCreate(day)}
                      className={`min-h-[100px] border-b border-r border-cyan-500/5 p-1.5 cursor-pointer transition-all ${
                        day ? 'hover:bg-cyan-500/5' : 'opacity-0 pointer-events-none'
                      } ${i % 7 === 6 ? 'border-r-0' : ''}`}
                    >
                      {day && (
                        <>
                          <div className={`w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 transition-all ${
                            isT
                              ? 'bg-cyan-400 text-[#030b18] font-bold'
                              : 'text-slate-500 hover:text-slate-300'
                          }`}>
                            {day}
                          </div>
                          <div className="space-y-0.5">
                            {dayEvents.slice(0, 3).map(ev => (
                              <button
                                key={ev.id}
                                onClick={(e) => { e.stopPropagation(); openView(ev) }}
                                className={`w-full text-left rounded px-1.5 py-0.5 text-[10px] truncate border ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color} hover:opacity-80 transition-opacity`}
                              >
                                {ev.start_time ? `${fmtTime(ev.start_time)} ` : ''}{ev.title}
                              </button>
                            ))}
                            {dayEvents.length > 3 && (
                              <p className="text-[9px] text-slate-600 pl-1">+{dayEvents.length - 3} más</p>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(CATEGORY_META).map(([key, meta]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${meta.dot}`} />
            <span className="text-[10px] text-slate-500">{meta.label}</span>
          </div>
        ))}
      </div>

      {/* Upcoming events list */}
      {events.length > 0 && (
        <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/80 p-5">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-cyan-500/50 mb-4">Eventos este mes</h3>
          <div className="space-y-2">
            {events.map(ev => (
              <button
                key={ev.id}
                onClick={() => openView(ev)}
                className="w-full text-left flex items-start gap-3 rounded-xl border border-cyan-500/10 bg-[#030b18]/40 px-4 py-3 hover:border-cyan-500/25 hover:bg-[#030b18]/70 transition-all group"
              >
                <div className={`mt-0.5 h-2.5 w-2.5 rounded-full flex-shrink-0 ${CATEGORY_META[ev.category]?.dot || CATEGORY_META.otro.dot}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate">{ev.title}</p>
                  <p className="text-[10px] text-slate-600 mt-0.5">
                    {fmtDate(ev.event_date)}
                    {ev.start_time && ` · ${fmtTime(ev.start_time)}`}
                    {ev.end_time && ` – ${fmtTime(ev.end_time)}`}
                  </p>
                  {ev.quote_client && (
                    <p className="text-[10px] text-cyan-500/60 mt-0.5">Cliente: {ev.quote_client}</p>
                  )}
                </div>
                <span className={`text-[9px] rounded-full border px-2 py-0.5 flex-shrink-0 ${CATEGORY_META[ev.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[ev.category]?.label || 'Otro'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
      </>
      )}

      {activeModule === 'boards' && (
        <div className="flex flex-col h-full">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <select
                value={activeBoardId || ''}
                onChange={(e) => setActiveBoardId(e.target.value ? parseInt(e.target.value) : null)}
                className="rounded-lg border border-slate-600/40 bg-[#030b18]/70 px-4 py-2 text-base font-semibold text-white hover:bg-[#030b18]/90 focus:outline-none focus:border-fuchsia-400/50 transition-all"
              >
                <option value="">Seleccionar tablero...</option>
                {boards.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
              {activeBoard && (
                <button
                  onClick={() => {
                    const section = document.getElementById('board-menu')
                    if (section) section.classList.toggle('hidden')
                  }}
                  className="rounded-lg border border-slate-600/40 bg-[#030b18]/50 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 hover:border-slate-500/60 transition-all"
                >
                  ⋯
                </button>
              )}
            </div>
            {activeBoard && (
              <input
                value={boardSearch}
                onChange={(e) => setBoardSearch(e.target.value)}
                className="w-64 rounded-lg border border-slate-600/40 bg-[#030b18]/50 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:border-fuchsia-400/50 focus:outline-none transition-all"
                placeholder="Buscar tarjetas..."
              />
            )}
          </div>

          <div id="board-menu" className="hidden mb-4 rounded-xl border border-slate-700/40 bg-[#060d1f]/90 p-4 space-y-3 absolute right-4 top-20 z-10 min-w-[280px] shadow-xl">
            <div className="space-y-2">
              <input
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                placeholder="Nuevo tablero"
                className="w-full rounded-lg border border-slate-600/40 bg-[#030b18]/50 px-3 py-2 text-sm text-slate-200"
              />
              <button onClick={createBoard} className="w-full rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-3 py-2 text-sm text-fuchsia-300 hover:bg-fuchsia-500/20 transition-all">
                Crear tablero
              </button>
            </div>
            {activeBoard && (
              <>
                <div className="border-t border-slate-700/40 pt-3 space-y-2">
                  <input
                    value={editingBoardName}
                    onChange={(e) => setEditingBoardName(e.target.value)}
                    className="w-full rounded-lg border border-slate-600/40 bg-[#030b18]/50 px-3 py-2 text-sm text-slate-200"
                    placeholder="Renombrar tablero"
                  />
                  <button onClick={saveBoardName} className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300 hover:bg-cyan-500/20 transition-all">
                    Guardar nombre
                  </button>
                </div>
                <div className="border-t border-slate-700/40 pt-3">
                  <button onClick={archiveActiveBoard} className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20 transition-all">
                    Archivar tablero
                  </button>
                </div>
              </>
            )}
            {boardsFeedback && <p className="text-sm text-cyan-300">{boardsFeedback}</p>}
          </div>

          {boardsLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="min-w-[272px] animate-pulse">
                  <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#0b1426]/60 to-[#060d1a]/40 p-4">
                    <div className="h-5 w-32 rounded-lg bg-slate-700/40 mb-3" />
                    <div className="space-y-2">
                      {[1, 2, 3].map((j) => (
                        <div key={j} className="rounded-xl bg-slate-700/30 p-3">
                          <div className="h-4 w-full rounded bg-slate-600/40 mb-2" />
                          <div className="h-3 w-2/3 rounded bg-slate-600/30" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : boardColumns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="rounded-full bg-gradient-to-br from-fuchsia-500/10 to-indigo-500/10 p-6 mb-4">
                <svg className="h-12 w-12 text-fuchsia-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Tu tablero está vacío</h3>
              <p className="text-sm text-slate-400 text-center max-w-sm mb-6">Crea tu primera columna para organizar tus tareas y proyectos</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <kbd className="px-2 py-1 rounded bg-slate-700/40 border border-slate-600/40">Tip:</kbd>
                <span>Usa columnas como "Por hacer", "En progreso", "Completado"</span>
              </div>
            </div>
          ) : !activeBoard ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg text-slate-400 mb-2">Selecciona un tablero para comenzar</p>
                <p className="text-sm text-slate-500">o crea uno nuevo desde el menú ⋯</p>
              </div>
            </div>
          ) : (
            <>

              <DragDropContext onDragEnd={onDragEnd}>
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {boardColumns.map((col) => (
                    <Droppable key={col.id} droppableId={String(col.id)}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`group/column relative min-h-[220px] min-w-[272px] rounded-2xl p-4 backdrop-blur-sm xl:min-w-0 transition-all duration-300 ${
                            snapshot.isDraggingOver
                              ? 'bg-gradient-to-br from-[#0d1f3c]/90 to-[#1a2847]/80 shadow-2xl shadow-fuchsia-500/20 ring-2 ring-fuchsia-400/40 scale-[1.02]'
                              : 'bg-gradient-to-br from-[#0b1426]/70 to-[#060d1a]/60 shadow-lg border border-slate-700/30'
                          }`}
                        >
                          <div className="mb-4 flex items-center justify-between">
                            {editingColumnId === col.id ? (
                              <input
                                value={editingColumnName}
                                onChange={(e) => setEditingColumnName(e.target.value)}
                                className="flex-1 rounded-lg border border-fuchsia-500/40 bg-slate-800/90 px-3 py-1.5 text-sm text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-fuchsia-400/50 transition-all"
                              />
                            ) : (
                              <h3 className="text-sm font-semibold text-slate-200 tracking-tight">{col.name}</h3>
                            )}
                            <div className="flex gap-1">
                              {editingColumnId === col.id ? (
                                <button onClick={saveColumnName} className="rounded border border-cyan-500/40 bg-cyan-500/20 px-1.5 py-0.5 text-[9px] text-cyan-300 hover:bg-cyan-500/30">OK</button>
                              ) : (
                                <button onClick={() => startEditColumn(col)} className="rounded border border-slate-600/50 bg-slate-700/60 px-1.5 py-0.5 text-[9px] text-slate-300 hover:bg-slate-600/50">E</button>
                              )}
                              <button onClick={() => removeColumn(col.id)} className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] text-red-300 hover:bg-red-500/20">X</button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            {col.cards.map((card, cardIdx) => (
                              <Draggable key={card.id} draggableId={String(card.id)} index={cardIdx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`group/card relative rounded-xl p-4 backdrop-blur-sm transition-all duration-300 ${
                                      snapshot.isDragging
                                        ? 'shadow-2xl shadow-fuchsia-500/40 rotate-2 scale-110 ring-2 ring-fuchsia-400/60 bg-gradient-to-br from-[#030b18] to-[#0a1428]'
                                        : 'shadow-lg hover:shadow-xl hover:scale-[1.02] hover:-translate-y-0.5 bg-gradient-to-br from-[#030b18]/95 to-[#050d1a]/90 border border-slate-700/40 hover:border-fuchsia-500/30'
                                    }`}
                                  >
                                    {/* Drag handle visual */}
                                    <div {...provided.dragHandleProps} className="absolute top-2 right-2 opacity-0 group-hover/card:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1 rounded hover:bg-slate-700/40">
                                      <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
                                      </svg>
                                    </div>
                                    {/* Card cover image placeholder */}
                                    {card.cover_image && (
                                      <div className="mb-3 -mx-4 -mt-4 h-20 rounded-t-xl overflow-hidden">
                                        <img src={card.cover_image} alt="" className="w-full h-full object-cover" />
                                      </div>
                                    )}
                                    
                                    {/* Card content */}
                                    <div className={`${card.cover_image ? 'mb-3' : 'mb-3 pr-8'}`}>
                                      {editingCardId === card.id ? (
                                        <input
                                          value={editingCardTitle}
                                          onChange={(e) => setEditingCardTitle(e.target.value)}
                                          onClick={(e) => e.stopPropagation()}
                                          className="w-full rounded-lg border border-fuchsia-500/40 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-fuchsia-400/50 transition-all"
                                        />
                                      ) : (
                                        <div>
                                          <p className="text-sm font-medium text-slate-50 leading-snug tracking-tight cursor-text hover:text-slate-100 transition-colors">{card.title}</p>
                                          {card.description && (
                                            <p className="mt-2 text-xs text-slate-400 line-clamp-2">{card.description}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Card metadata */}
                                    <div className="flex flex-wrap items-center gap-2">
                                      {/* Priority badge */}
                                      {card.priority && (
                                        <span className={`group/badge relative rounded-full text-[10px] px-2.5 py-1 font-semibold shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                                          card.priority === 'high'
                                            ? 'bg-red-500/25 text-red-200 border border-red-400/30 shadow-red-500/20'
                                            : card.priority === 'low'
                                            ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 shadow-emerald-500/20'
                                            : 'bg-amber-500/25 text-amber-100 border border-amber-400/30 shadow-amber-500/20'
                                        }`}>
                                          {card.priority === 'high' ? '🔴 Alta' : card.priority === 'low' ? '🟢 Baja' : '🟡 Media'}
                                        </span>
                                      )}
                                      
                                      {/* Due date badge */}
                                      {card.due_date && (
                                        <span className={`group/badge relative rounded-full text-[10px] px-2.5 py-1 font-semibold shadow-sm backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                                          isDueDateOverdue(card.due_date)
                                            ? 'bg-red-500/25 text-red-200 border border-red-400/30 shadow-red-500/20 animate-pulse'
                                            : 'bg-slate-500/25 text-slate-300 border border-slate-400/30'
                                        }`}>
                                          📅 {isDueDateOverdue(card.due_date) ? 'Vencida' : card.due_date}
                                        </span>
                                      )}
                                      
                                      {/* Assigned users */}
                                      {card.assigned_to && (
                                        <div className="flex -space-x-1">
                                          {Array.isArray(card.assigned_to) ? 
                                            card.assigned_to.slice(0, 3).map((userId, idx) => {
                                              const user = workspaceUsers.find(u => u.id === userId)
                                              return user ? (
                                                <div key={userId} className="h-5 w-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-500 border border-slate-700/50 flex items-center justify-center text-[8px] text-white font-medium">
                                                  {user.full_name?.[0] || user.username?.[0] || 'U'}
                                                </div>
                                              ) : null
                                            }) : (
                                              <div className="h-5 w-5 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-500 border border-slate-700/50 flex items-center justify-center text-[8px] text-white font-medium">
                                                U
                                              </div>
                                            )
                                          }
                                          {(Array.isArray(card.assigned_to) && card.assigned_to.length > 3) && (
                                            <div className="h-5 w-5 rounded-full bg-slate-600/50 border border-slate-700/50 flex items-center justify-center text-[8px] text-slate-300 font-medium">
                                              +{card.assigned_to.length - 3}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                      
                                      {/* Category label */}
                                      {card.category && (
                                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${CATEGORY_META[card.category]?.color || CATEGORY_META.otro.color}`}>
                                          {CATEGORY_META[card.category]?.icon} {CATEGORY_META[card.category]?.label || card.category}
                                        </span>
                                      )}
                                    </div>
                                    {Number(card.checklist_total || 0) > 0 && (
                                      <div className="mt-3">
                                        <div className="mb-1.5 flex items-center justify-between text-[10px] text-slate-400">
                                          <span className="font-medium">Checklist</span>
                                          <span className="text-slate-200 font-semibold">{Number(card.checklist_done || 0)}/{Number(card.checklist_total || 0)}</span>
                                        </div>
                                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700/50 shadow-inner">
                                          <div
                                            className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 shadow-lg shadow-cyan-500/50 transition-all duration-700 ease-out"
                                            style={{ width: `${getChecklistProgress(card)}%` }}
                                          />
                                        </div>
                                      </div>
                                    )}
                                    {/* Card action buttons */}
                                    <div className="mt-3 flex gap-1.5 opacity-0 group-hover/card:opacity-100 transition-opacity duration-200">
                                      {editingCardId === card.id ? (
                                        <button 
                                          onClick={saveCardEdit} 
                                          className="group/btn rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2 py-1 text-[10px] font-medium text-emerald-300 hover:bg-emerald-500/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-emerald-500/25" 
                                          title="Guardar"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        </button>
                                      ) : (
                                        <button 
                                          onClick={() => startEditCard(card)} 
                                          className="group/btn rounded-lg border border-slate-600/50 bg-slate-700/60 px-2 py-1 text-[10px] font-medium text-slate-300 hover:bg-slate-600/50 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-slate-500/25" 
                                          title="Editar título"
                                        >
                                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => openCardDetail(card)} 
                                        className="group/btn rounded-lg border border-indigo-500/40 bg-indigo-500/20 px-2 py-1 text-[10px] font-medium text-indigo-300 hover:bg-indigo-500/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-indigo-500/25" 
                                        title="Ver detalles"
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                      </button>
                                      <button 
                                        onClick={() => removeCard(card.id)} 
                                        className="group/btn rounded-lg border border-red-500/40 bg-red-500/20 px-2 py-1 text-[10px] font-medium text-red-300 hover:bg-red-500/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-red-500/25" 
                                        title="Eliminar"
                                      >
                                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                            {col.cards.length === 0 && (
                              <div className="py-12 text-center">
                                <button
                                  onClick={(ev) => {
                                    const input = document.createElement('input')
                                    input.type = 'text'
                                    input.placeholder = 'Introducir un título para esta tarjeta…'
                                    input.className = 'w-full rounded border border-slate-600/50 bg-[#030b18]/70 px-3 py-2 text-sm text-white placeholder-slate-400 focus:border-fuchsia-400/60 focus:bg-[#030b18]/90 transition-all'
                                    input.onKeyDown = (e) => {
                                      if (e.key === 'Enter' && input.value.trim()) {
                                        setNewCardByColumn(prev => ({ ...prev, [col.id]: input.value.trim() }))
                                        createCard(col.id)
                                        input.remove()
                                      }
                                      if (e.key === 'Escape') input.remove()
                                    }
                                    const container = ev.currentTarget.parentElement.parentElement
                                    const addSection = container.querySelector('.add-card-section')
                                    if (addSection) {
                                      addSection.insertBefore(input, addSection.firstChild)
                                      input.focus()
                                    }
                                  }}
                                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                                >
                                  <span className="text-slate-600">+</span> Añadir tarjeta
                                </button>
                              </div>
                            )}
                            <div className="pt-3 add-card-section">
                              <button
                                onClick={(e) => {
                                  const input = document.createElement('input')
                                  input.type = 'text'
                                  input.placeholder = 'Introducir un título para esta tarjeta…'
                                  input.className = 'w-full rounded border border-slate-600/50 bg-[#030b18]/70 px-3 py-2 text-sm text-white placeholder-slate-400 hover:border-slate-500/60 focus:border-fuchsia-400/60 focus:bg-[#030b18]/90 transition-all'
                                  input.onKeyDown = (ev) => {
                                    if (ev.key === 'Enter' && input.value.trim()) {
                                      setNewCardByColumn(prev => ({ ...prev, [col.id]: input.value.trim() }))
                                      createCard(col.id)
                                      input.remove()
                                    }
                                    if (ev.key === 'Escape') input.remove()
                                  }
                                  const container = e.currentTarget.parentElement
                                  container.insertBefore(input, e.currentTarget)
                                  input.focus()
                                }}
                                className="group/add w-full rounded-xl border border-slate-600/50 bg-[#030b18]/70 px-3 py-2.5 text-sm text-slate-400 hover:border-fuchsia-500/40 hover:bg-fuchsia-500/5 hover:text-fuchsia-300 transition-all active:scale-98 flex items-center justify-center gap-2"
                              >
                                <svg className="h-4 w-4 transition-transform group-hover/add:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                                Añadir tarjeta
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </Droppable>
                  ))}
                  <div className="min-w-[272px] flex-shrink-0">
                    <div className="rounded-lg bg-[#0b1426]/40 p-3 border border-slate-700/30 hover:bg-[#0b1426]/60 transition-all">
                      <input
                        value={newColumnName}
                        onChange={(e) => setNewColumnName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && newColumnName.trim()) {
                            createColumn()
                          }
                        }}
                        placeholder="+ Añadir otra lista"
                        className="w-full bg-transparent text-sm text-slate-400 placeholder-slate-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </DragDropContext>
            </>
          )}
        </div>
      )}

      {/* Side Panel Drawer tipo Trello/Monday */}
      {cardModal && (
        <>
          {/* Overlay semi-transparente */}
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setCardModal(null)} aria-hidden="true" />
          
          {/* Drawer lateral */}
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] lg:w-[560px] bg-gradient-to-br from-[#060d1f]/98 to-[#0a1428]/95 shadow-2xl border-l border-indigo-500/20 backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-300" role="dialog" aria-modal="true" aria-labelledby="card-detail-title">
            {/* Header sticky */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-[#060d1f] to-[#060d1f]/95 backdrop-blur-xl border-b border-indigo-500/10 px-5 sm:px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setCardModal(null)} className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all touch-manipulation" aria-label="Cerrar panel">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <h4 id="card-detail-title" className="text-lg font-semibold text-white">Detalle de card</h4>
                </div>
                <div className="flex items-center gap-2">
                  <button className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all touch-manipulation" aria-label="Más opciones" title="Más opciones">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" /></svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Content scrollable */}
            <div className="px-5 sm:px-6 py-5">
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/60 to-[#050d1a]/50 px-4 py-3 text-xs text-slate-200 backdrop-blur-sm shadow-inner">
                <span className="font-semibold">Checklist:</span> {Number(cardModal.checklist?.filter((i) => Number(i.is_done) === 1).length || 0)}/{Number(cardModal.checklist?.length || 0)}
              </div>
              <div className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/60 to-[#050d1a]/50 px-4 py-3 text-xs text-slate-200 backdrop-blur-sm shadow-inner">
                <span className="font-semibold">Progreso:</span> {(() => {
                  const total = Number(cardModal.checklist?.length || 0)
                  const done = Number(cardModal.checklist?.filter((i) => Number(i.is_done) === 1).length || 0)
                  return total ? Math.round((done / total) * 100) : 0
                })()}%
              </div>
              <div className={`rounded-xl border px-4 py-3 text-xs backdrop-blur-sm shadow-inner transition-all duration-300 ${
                isDueDateOverdue(cardModal.due_date)
                  ? 'border-red-400/50 bg-gradient-to-br from-red-500/20 to-red-600/10 text-red-100 shadow-red-500/20 animate-pulse'
                  : 'border-slate-700/60 bg-gradient-to-br from-[#030b18]/60 to-[#050d1a]/50 text-slate-200'
              }`}>
                {cardModal.due_date ? (isDueDateOverdue(cardModal.due_date) ? `⚠️ Vencida: ${cardModal.due_date}` : `📅 Límite: ${cardModal.due_date}`) : 'Sin fecha límite'}
              </div>
            </div>
            <div className="mt-4 space-y-3 sm:space-y-4">
              <input
                value={cardModal.title}
                onChange={(e) => setCardModal((prev) => ({ ...prev, title: e.target.value }))}
                className="w-full rounded-xl border border-slate-700/60 bg-[#030b18]/80 px-4 py-3 text-sm font-medium text-slate-100 placeholder-slate-500 shadow-inner backdrop-blur-sm transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-400/30"
                placeholder="Título de la card"
              />
              <textarea
                value={cardModal.details}
                onChange={(e) => setCardModal((prev) => ({ ...prev, details: e.target.value }))}
                rows={4}
                className="w-full rounded-xl border border-slate-700/60 bg-[#030b18]/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 shadow-inner backdrop-blur-sm transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-400/30"
                placeholder="Descripción operativa y detalles"
              />
              <div className="grid grid-cols-1 gap-2.5 sm:gap-3 sm:grid-cols-3">
                <select
                  value={cardModal.priority}
                  onChange={(e) => setCardModal((prev) => ({ ...prev, priority: e.target.value }))}
                  className="rounded-xl border border-slate-700/60 bg-[#030b18]/80 px-4 py-2.5 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-400/30"
                >
                  <option value="high">🔴 Prioridad alta</option>
                  <option value="medium">🟡 Prioridad media</option>
                  <option value="low">🟢 Prioridad baja</option>
                </select>
                <input
                  type="date"
                  value={cardModal.due_date || ''}
                  onChange={(e) => setCardModal((prev) => ({ ...prev, due_date: e.target.value }))}
                  className="rounded-xl border border-slate-700/60 bg-[#030b18]/80 px-4 py-2.5 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-400/30"
                />
                <select
                  value={cardModal.assigned_to || ''}
                  onChange={(e) => setCardModal((prev) => ({ ...prev, assigned_to: e.target.value }))}
                  className="rounded-xl border border-slate-700/60 bg-[#030b18]/80 px-4 py-2.5 text-sm text-slate-100 shadow-inner backdrop-blur-sm transition-all focus:border-indigo-500/60 focus:ring-2 focus:ring-indigo-400/30"
                >
                  <option value="">👤 Sin asignar</option>
                  {workspaceUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username}
                    </option>
                  ))}
                </select>
              </div>
              {cardDetailLoading ? (
                <div className="rounded-xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/60 to-[#050d1a]/50 px-4 py-3 text-sm text-slate-300 backdrop-blur-sm shadow-inner animate-pulse">✨ Cargando detalle...</div>
              ) : (
                <>
                  <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/70 to-[#050d1a]/60 p-4 backdrop-blur-sm shadow-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">✓ Checklist</p>
                    <div className="mt-2 space-y-1.5">
                      {(cardModal.checklist || []).map((item) => (
                        <div key={item.id} className="flex items-center gap-1.5">
                          <button
                            onClick={() => toggleChecklistItem(item)}
                            className={`flex-1 rounded border px-2 py-1 text-left text-xs ${
                              Number(item.is_done) === 1
                                ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300 line-through'
                                : 'border-slate-700/60 bg-[#020813]/70 text-slate-200'
                            }`}
                          >
                            {item.content}
                          </button>
                          <button onClick={() => removeChecklistItem(item.id)} className="rounded border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300">X</button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          value={checklistDraft}
                          onChange={(e) => setChecklistDraft(e.target.value)}
                          className="w-full rounded border border-slate-700/60 bg-[#020813]/70 px-2 py-1 text-xs text-slate-200"
                          placeholder="Nuevo checklist..."
                        />
                        <button onClick={addChecklistItem} className="rounded border border-emerald-500/35 bg-emerald-500/10 px-2 py-1 text-[10px] text-emerald-300">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/70 to-[#050d1a]/60 p-4 backdrop-blur-sm shadow-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">💬 Comentarios</p>
                    <div className="mt-2 space-y-1.5 max-h-28 overflow-auto">
                      {(cardModal.comments || []).map((comment) => (
                        <div key={comment.id} className="rounded border border-slate-700/50 bg-[#020813]/70 px-2 py-1.5 text-xs text-slate-200">
                          <p>{comment.content}</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">{comment.full_name || comment.username || 'Usuario'}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <input
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        className="w-full rounded border border-slate-700/60 bg-[#020813]/70 px-2 py-1 text-xs text-slate-200"
                        placeholder="Escribe un comentario..."
                      />
                      <button onClick={addComment} className="rounded border border-indigo-500/35 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-200">Enviar</button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-700/60 bg-gradient-to-br from-[#030b18]/70 to-[#050d1a]/60 p-4 backdrop-blur-sm shadow-lg">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400 mb-1">📊 Actividad</p>
                    <div className="mt-2 max-h-24 space-y-1 overflow-auto text-xs">
                      {(cardModal.activity || []).map((act) => (
                        <div key={act.id} className="rounded border border-slate-700/40 bg-[#020813]/70 px-2 py-1 text-slate-300">
                          <span className="text-slate-100">{act.action_label}</span> · {act.full_name || act.username || 'Usuario'}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
            {/* Footer sticky */}
            <div className="sticky bottom-0 z-10 bg-gradient-to-t from-[#060d1f] to-[#060d1f]/95 backdrop-blur-xl border-t border-indigo-500/10 px-5 sm:px-6 py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
                <button onClick={() => setCardModal(null)} className="rounded-xl border border-slate-700/60 bg-[#030b18]/70 px-5 py-3 sm:py-2.5 text-sm text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/80 hover:bg-[#030b18]/90 hover:text-slate-100 active:scale-95 touch-manipulation min-h-[44px]" aria-label="Cancelar cambios">Cancelar</button>
                <button onClick={saveCardModal} className="rounded-xl border border-indigo-500/40 bg-gradient-to-r from-indigo-500/20 to-blue-500/20 px-6 py-3 sm:py-2.5 text-sm font-semibold text-indigo-200 shadow-lg shadow-indigo-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-indigo-400/60 hover:from-indigo-500/30 hover:to-blue-500/30 hover:shadow-xl hover:shadow-indigo-400/30 active:scale-95 touch-manipulation min-h-[44px]" aria-label="Guardar cambios en la card">💾 Guardar cambios</button>
              </div>
            </div>
            </div>
          </div>
        </>
      )}

      {activeModule === 'lists' && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#071a14]/80 to-[#0a1321]/80 p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/20 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-emerald-400/50">Listas</p>
                <h3 className="text-xl font-semibold text-white bg-gradient-to-r from-white to-emerald-100 bg-clip-text text-transparent">Gestión de Tareas</h3>
                <p className="text-xs text-slate-400 mt-1">Organiza pendientes y seguimiento por equipos</p>
              </div>
            </div>
          </div>

          {/* Create New List */}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#060d1f]/70 to-[#0a1321]/60 p-4 backdrop-blur-sm shadow-lg">
            <div className="flex flex-wrap gap-3">
              <input
                value={newListTitle}
                onChange={(e) => setNewListTitle(e.target.value)}
                placeholder="📝 Nueva lista (ej: Pendientes cocina, Prioridades semana)"
                className="flex-1 min-w-[280px] rounded-xl border border-slate-700/60 bg-[#030b18]/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-400 focus:border-emerald-500/50 focus:bg-[#030b18]/90 transition-all duration-200"
              />
              <button 
                onClick={createList} 
                className="group rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 px-6 py-3 text-xs font-semibold text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-400/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-emerald-500/25"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Crear lista
                </span>
              </button>
            </div>
          </div>

          {/* Lists Grid */}
          {listsData.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#060d1f]/50 to-[#0a1321]/40 p-12 text-center backdrop-blur-sm">
              <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-500/20 flex items-center justify-center">
                <span className="text-3xl">📋</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Sin listas aún</h3>
              <p className="text-sm text-slate-400 mb-4">Crea tu primera lista para organizar tareas y pendientes</p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ej: "Tareas de cocina", "Prioridades semana"</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
              {listsData.map((listItem) => (
                <div key={listItem.id} className="group/list rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#060d1f]/70 to-[#0a1321]/60 p-5 backdrop-blur-sm shadow-lg hover:shadow-xl hover:border-emerald-500/20 transition-all duration-300">
                  {/* List Header */}
                  <div className="mb-4 flex items-center justify-between gap-2">
                    {editingListId === listItem.id ? (
                      <input
                        value={editingListTitle}
                        onChange={(e) => setEditingListTitle(e.target.value)}
                        className="flex-1 rounded-lg border border-emerald-500/40 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-emerald-400/50 transition-all"
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-400/20 flex items-center justify-center">
                          <span className="text-sm">📝</span>
                        </div>
                        <h4 className="text-base font-semibold text-white">{listItem.title}</h4>
                      </div>
                    )}
                    <div className="flex items-center gap-1 opacity-0 group-hover/list:opacity-100 transition-opacity">
                      {editingListId === listItem.id ? (
                        <>
                          <button 
                            onClick={saveListEdit} 
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 p-2 text-[10px] text-emerald-300 hover:bg-emerald-500/30 transition-all" 
                            title="Guardar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => { setEditingListId(null); setEditingListTitle('') }} 
                            className="rounded-lg border border-slate-600/50 bg-slate-700/60 p-2 text-[10px] text-slate-400 hover:bg-slate-600/50 transition-all" 
                            title="Cancelar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            onClick={() => startEditList(listItem)} 
                            className="rounded-lg border border-slate-600/50 bg-slate-700/60 p-2 text-[10px] text-slate-300 hover:bg-slate-600/50 transition-all" 
                            title="Editar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button 
                            onClick={() => deleteList(listItem.id)} 
                            className="rounded-lg border border-red-500/40 bg-red-500/20 p-2 text-[10px] text-red-300 hover:bg-red-500/30 transition-all" 
                            title="Eliminar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* List Items */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(listItem.items || []).map((entry) => (
                      <div key={entry.id} className="group/item flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/30 transition-all duration-200">
                        <button
                          onClick={() => toggleListItem(entry.id, Number(entry.is_done) === 1)}
                          className={`flex-shrink-0 h-4 w-4 rounded border-2 transition-all duration-200 ${
                            Number(entry.is_done) === 1
                              ? 'border-emerald-400 bg-emerald-400'
                              : 'border-slate-500 hover:border-emerald-400'
                          }`}
                        >
                          {Number(entry.is_done) === 1 && (
                            <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </button>
                        <div className="flex-1">
                          {editingItemId === entry.id ? (
                            <input
                              value={editingItemContent}
                              onChange={(e) => setEditingItemContent(e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-full rounded-lg border border-emerald-500/40 bg-slate-800/90 px-3 py-2 text-xs text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-emerald-400/50 transition-all"
                            />
                          ) : (
                            <p className={`text-sm ${
                              Number(entry.is_done) === 1
                                ? 'text-slate-500 line-through'
                                : 'text-slate-200'
                            } transition-all duration-200`}>
                              {entry.content}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                          {editingItemId === entry.id ? (
                            <button 
                              onClick={saveItemEdit} 
                              className="rounded border border-emerald-500/40 bg-emerald-500/20 p-1 text-[9px] text-emerald-300 hover:bg-emerald-500/30 transition-all" 
                              title="Guardar"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          ) : (
                            <button 
                              onClick={() => startEditItem(entry)} 
                              className="rounded border border-slate-600/50 bg-slate-700/60 p-1 text-[9px] text-slate-300 hover:bg-slate-600/50 transition-all" 
                              title="Editar"
                            >
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                          )}
                          <button 
                            onClick={() => deleteItem(entry.id)} 
                            className="rounded border border-red-500/40 bg-red-500/20 p-1 text-[9px] text-red-300 hover:bg-red-500/30 transition-all" 
                            title="Eliminar"
                          >
                            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add New Item */}
                  <div className="mt-4 pt-3 border-t border-slate-700/30">
                    <div className="flex gap-2">
                      <input
                        value={newListItemByList[listItem.id] || ''}
                        onChange={(e) => setNewListItemByList((prev) => ({ ...prev, [listItem.id]: e.target.value }))}
                        placeholder="➕ Nuevo pendiente..."
                        className="flex-1 rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-xs text-slate-300 placeholder-slate-500 focus:border-emerald-500/50 focus:bg-[#030b18]/90 transition-all"
                      />
                      <button
                        onClick={() => addListItem(listItem.id)}
                        className="rounded-lg border border-emerald-500/40 bg-gradient-to-r from-emerald-500/20 to-emerald-400/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:from-emerald-500/30 hover:to-emerald-400/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-emerald-500/25"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeModule === 'notes' && (
        <div className="space-y-6">
          {/* Header Section */}
          <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#1a1407]/80 to-[#0a1321]/80 p-6 backdrop-blur-sm shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-400/20 flex items-center justify-center">
                <span className="text-2xl">📝</span>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-amber-400/50">Notas</p>
                <h3 className="text-xl font-semibold text-white bg-gradient-to-r from-white to-amber-100 bg-clip-text text-transparent">Notas Operativas</h3>
                <p className="text-xs text-slate-400 mt-1">Captura acuerdos y fija notas importantes del equipo</p>
              </div>
            </div>
          </div>

          {/* Create New Note */}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#060d1f]/70 to-[#0a1321]/60 p-5 backdrop-blur-sm shadow-lg">
            <div className="space-y-4">
              <input
                value={newNoteTitle}
                onChange={(e) => setNewNoteTitle(e.target.value)}
                placeholder="📌 Título de la nota..."
                className="w-full rounded-xl border border-slate-700/60 bg-[#030b18]/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-400 focus:border-amber-500/50 focus:bg-[#030b18]/90 transition-all duration-200"
              />
              <textarea
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={4}
                placeholder="✍️ Contenido de la nota..."
                className="w-full rounded-xl border border-slate-700/60 bg-[#030b18]/70 px-4 py-3 text-sm text-slate-300 placeholder-slate-400 focus:border-amber-500/50 focus:bg-[#030b18]/90 transition-all duration-200 resize-none"
              />
              <button 
                onClick={createNote} 
                className="group rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/20 to-yellow-400/20 px-6 py-3 text-xs font-semibold text-amber-300 hover:from-amber-500/30 hover:to-yellow-400/30 hover:scale-105 active:scale-95 transition-all duration-200 shadow-sm hover:shadow-amber-500/25"
              >
                <span className="flex items-center gap-2">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Crear nota
                </span>
              </button>
            </div>
          </div>

          {/* Notes Grid */}
          {notesData.length === 0 ? (
            <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#060d1f]/50 to-[#0a1321]/40 p-12 text-center backdrop-blur-sm">
              <div className="h-16 w-16 mx-auto mb-4 rounded-xl bg-gradient-to-br from-slate-600/20 to-slate-500/20 flex items-center justify-center">
                <span className="text-3xl">📝</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-2">Sin notas aún</h3>
              <p className="text-sm text-slate-400 mb-4">Crea tu primera nota para capturar acuerdos importantes</p>
              <div className="inline-flex items-center gap-2 text-xs text-slate-500 bg-slate-800/50 rounded-lg px-3 py-2">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Ej: "Acuerdos reunión", "Recordatorios semana"</span>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {notesData.map((note) => (
                <div key={note.id} className={`group/note rounded-2xl border backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300 ${
                  Number(note.pinned) === 1
                    ? 'border-amber-500/30 bg-gradient-to-br from-[#1a1407]/80 to-[#0a1321]/70 hover:border-amber-400/40'
                    : 'border-slate-700/30 bg-gradient-to-br from-[#060d1f]/70 to-[#0a1321]/60 hover:border-slate-600/40'
                }`}>
                  {/* Note Header */}
                  <div className="p-5 pb-4">
                    <div className="flex items-start justify-between gap-3">
                      {editingNoteId === note.id ? (
                        <input
                          value={editingNoteTitle}
                          onChange={(e) => setEditingNoteTitle(e.target.value)}
                          className="flex-1 rounded-lg border border-amber-500/40 bg-slate-800/90 px-3 py-2 text-sm text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-amber-400/50 transition-all"
                        />
                      ) : (
                        <div className="flex items-start gap-3 flex-1">
                          {Number(note.pinned) === 1 && (
                            <div className="h-6 w-6 rounded bg-gradient-to-br from-amber-500/20 to-yellow-400/20 flex items-center justify-center flex-shrink-0 mt-1">
                              <span className="text-xs">📌</span>
                            </div>
                          )}
                          <div className="flex-1">
                            <h4 className="text-base font-semibold text-white mb-1">{note.title}</h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <span>Por: {note.full_name || note.username || 'Usuario'}</span>
                              <span>•</span>
                              <span>{new Date(note.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                        {editingNoteId === note.id ? (
                          <>
                            <button 
                              onClick={saveNoteEdit} 
                              className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 p-2 text-[10px] text-emerald-300 hover:bg-emerald-500/30 transition-all" 
                              title="Guardar"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button 
                              onClick={cancelEditNote} 
                              className="rounded-lg border border-slate-600/50 bg-slate-700/60 p-2 text-[10px] text-slate-400 hover:bg-slate-600/50 transition-all" 
                              title="Cancelar"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              onClick={() => openNoteDetail(note)} 
                              className="rounded-lg border border-indigo-500/40 bg-indigo-500/20 p-2 text-[10px] text-indigo-300 hover:bg-indigo-500/30 transition-all" 
                              title="Ver detalles"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => startEditNote(note)} 
                              className="rounded-lg border border-slate-600/50 bg-slate-700/60 p-2 text-[10px] text-slate-300 hover:bg-slate-600/50 transition-all" 
                              title="Editar"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => toggleNotePin(note.id, Number(note.pinned) === 1)} 
                              className={`rounded-lg border p-2 text-[10px] transition-all ${
                                Number(note.pinned) === 1
                                  ? 'border-amber-400/45 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
                                  : 'border-slate-600/50 bg-slate-700/60 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300'
                              }`}
                              title={Number(note.pinned) === 1 ? 'Desfijar' : 'Fijar'}
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button 
                              onClick={() => deleteNote(note.id)} 
                              className="rounded-lg border border-red-500/40 bg-red-500/20 p-2 text-[10px] text-red-300 hover:bg-red-500/30 transition-all" 
                              title="Eliminar"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Note Content */}
                  <div className="px-5 pb-5">
                    {editingNoteId === note.id ? (
                      <textarea
                        value={editingNoteContent}
                        onChange={(e) => setEditingNoteContent(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-amber-500/40 bg-slate-800/90 px-3 py-3 text-xs text-white placeholder-slate-400 shadow-inner focus:ring-2 focus:ring-amber-400/50 transition-all resize-none"
                      />
                    ) : (
                      <div className="rounded-lg border border-slate-700/50 bg-[#030b18]/50 p-4">
                        <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {note.content || 'Sin contenido'}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Note Footer */}
                  <div className="px-5 pb-5 pt-3 border-t border-slate-700/30">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {Number(note.pinned) === 1 && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-amber-300 bg-amber-500/10 rounded-full px-2 py-1">
                            <span>📌</span>
                            <span>Fijada</span>
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500">
                          {note.content ? `${note.content.length} caracteres` : 'Sin contenido'}
                        </span>
                      </div>
                      <button
                        onClick={() => openNoteDetail(note)}
                        className="text-[10px] text-indigo-300 hover:text-indigo-200 transition-colors"
                      >
                        Ver más →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeModule === 'social' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-[#0a1122] to-[#0a1321] p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-indigo-300/60">Social Hub</p>
                <h3 className="text-lg font-light text-white">Anuncios y posts del equipo</h3>
              </div>
              <div className="flex items-center gap-2">
                {socialUnreadMentions > 0 && (
                  <span className="rounded-full border border-cyan-400/35 bg-cyan-500/15 px-2.5 py-1 text-[10px] text-cyan-200">
                    {socialUnreadMentions} menciones
                  </span>
                )}
                <button
                  onClick={markSocialMentionsSeen}
                  className="rounded-md border border-indigo-500/35 bg-indigo-500/10 px-2.5 py-1 text-[10px] text-indigo-200 disabled:opacity-50"
                  disabled={socialUnreadMentions <= 0}
                >
                  Marcar vistas
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-1">Un board abierto para toda la organización, estilo Slack/Monday.</p>
          </div>
          <div className="rounded-2xl border border-cyan-500/20 bg-[#061126]/85 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-cyan-200">Inbox de menciones</p>
              <span className="text-[10px] text-slate-400">{socialMentions.length} recientes</span>
            </div>
            <div className="space-y-2">
              {socialMentions.slice(0, 6).map((mention) => {
                const isUnread = !mention.seen_at
                return (
                  <div
                    key={mention.id}
                    className={`rounded-lg border px-3 py-2 ${
                      isUnread ? 'border-cyan-400/35 bg-cyan-500/10' : 'border-slate-700/50 bg-[#030b18]/70'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-200">
                        {mention.mentioned_by_name || mention.mentioned_by_username || 'Usuario'} te mencionó
                      </p>
                      <button
                        onClick={() => markSocialMentionSeen(mention.id)}
                        disabled={!isUnread}
                        className="rounded-md border border-indigo-500/35 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-200 disabled:opacity-50"
                      >
                        {isUnread ? 'Marcar leída' : 'Leída'}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400 whitespace-pre-wrap">{mention.post_preview || mention.post_title || 'Sin vista previa'}</p>
                  </div>
                )
              })}
              {socialMentions.length === 0 && (
                <p className="text-[11px] text-slate-500">Sin menciones recientes.</p>
              )}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-[#060d1f]/80 p-4 space-y-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select
                value={socialType}
                onChange={(e) => setSocialType(e.target.value)}
                className="rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-xs text-slate-200"
              >
                <option value="post">Post</option>
                <option value="announcement">Anuncio</option>
              </select>
              <input
                value={socialTitle}
                onChange={(e) => setSocialTitle(e.target.value)}
                placeholder="Título (opcional)"
                className="rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-xs text-slate-200"
              />
              <button onClick={createSocialPost} disabled={socialPosting} className="rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200 disabled:opacity-60">{socialPosting ? 'Publicando...' : 'Publicar'}</button>
            </div>
            <textarea
              value={socialContent}
              onChange={(e) => setSocialContent(e.target.value)}
              rows={3}
              placeholder="Comparte un anuncio, update o post interno..."
              className="w-full rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-sm text-slate-300"
            />
            <div className="flex flex-wrap items-center gap-2">
              <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-700/60 bg-[#030b18]/70 px-2.5 py-1.5 text-[11px] text-slate-300">
                Adjuntar archivo
                <input type="file" accept="image/*,.pdf,.txt" onChange={handleSocialAttachmentChange} className="hidden" />
              </label>
              {socialAttachmentFile && (
                <>
                  <span className="text-[11px] text-slate-400">{socialAttachmentFile.name}</span>
                  <button
                    onClick={() => {
                      setSocialAttachmentFile(null)
                      setSocialAttachmentPreview('')
                    }}
                    className="rounded-md border border-rose-500/35 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-200"
                  >
                    Quitar
                  </button>
                </>
              )}
            </div>
            {socialAttachmentPreview && (
              <div className="rounded-lg border border-slate-700/60 bg-[#020813]/70 p-2">
                <img src={socialAttachmentPreview} alt="Preview adjunto" className="max-h-44 rounded-md object-cover" />
              </div>
            )}
            <p className="text-[11px] text-slate-500">
              Menciona usuarios con <span className="text-cyan-300">@username</span>. Detectados: {workspaceUsers.slice(0, 8).map((u) => `@${u.username}`).join(', ') || 'sin usuarios cargados'}.
            </p>
          </div>
          {socialLoading ? (
            <div className="h-24 flex items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border border-indigo-500/20 border-t-indigo-300" />
            </div>
          ) : (
            <div className="space-y-3">
              {socialPosts.map((post) => (
                <div key={post.id} className="rounded-2xl border border-slate-700/55 bg-[#060d1f]/80 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-white">{post.title || (post.post_type === 'announcement' ? 'Anuncio' : 'Post')}</p>
                      <p className="text-[10px] text-slate-500">
                        {(post.full_name || post.username || 'Usuario')} · {post.post_type === 'announcement' ? 'Anuncio' : 'Post'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {post.pinned === '1' || Number(post.pinned) === 1 ? (
                        <span className="rounded-full border border-amber-400/40 bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200">Fijado</span>
                      ) : null}
                      {isAdminUser && (
                        <button
                          onClick={() => toggleSocialPin(post.id, Number(post.pinned) === 1)}
                          className="rounded-md border border-indigo-500/35 bg-indigo-500/10 px-2 py-1 text-[10px] text-indigo-200"
                        >
                          {Number(post.pinned) === 1 ? 'Desfijar' : 'Fijar'}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{renderMentions(post.content)}</p>
                  {post.attachment_url ? (
                    <div className="mt-3 rounded-lg border border-slate-700/60 bg-[#020813]/70 p-2">
                      {String(post.attachment_mime || '').startsWith('image/') ? (
                        <a href={post.attachment_url} target="_blank" rel="noreferrer" className="block">
                          <img src={post.attachment_url} alt={post.attachment_name || 'Adjunto'} className="max-h-64 w-full rounded-md object-cover" />
                        </a>
                      ) : (
                        <a href={post.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline">
                          {post.attachment_name || 'Descargar adjunto'}
                        </a>
                      )}
                    </div>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {[
                      { key: 'like', label: 'Me gusta' },
                      { key: 'insightful', label: 'Útil' },
                      { key: 'celebrate', label: 'Celebrar' },
                    ].map((reaction) => {
                      const active = Boolean(post.user_reactions?.[reaction.key])
                      const count = Number(post.reaction_counts?.[reaction.key] || 0)
                      return (
                        <button
                          key={reaction.key}
                          onClick={() => toggleSocialReaction(post.id, reaction.key)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                            active
                              ? 'border-indigo-400/45 bg-indigo-500/15 text-indigo-200'
                              : 'border-slate-700/60 bg-[#030b18]/60 text-slate-300 hover:border-indigo-500/35'
                          }`}
                        >
                          {reaction.label} · {count}
                        </button>
                      )
                    })}
                  </div>
                  <div className="mt-3 space-y-2">
                    {(post.comments || []).map((comment) => (
                      <div key={comment.id} className="rounded-lg border border-slate-700/50 bg-[#020813]/70 px-3 py-2 text-xs text-slate-200">
                        <p>{renderMentions(comment.content)}</p>
                        <p className="mt-0.5 text-[10px] text-slate-500">{comment.full_name || comment.username || 'Usuario'}</p>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={socialCommentDrafts[post.id] || ''}
                        onChange={(e) => setSocialCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Comentar..."
                        className="w-full rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-xs text-slate-300"
                      />
                      <button
                        onClick={() => createSocialComment(post.id)}
                        className="rounded-lg border border-indigo-500/35 bg-indigo-500/10 px-3 py-2 text-xs text-indigo-200"
                      >
                        Enviar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              {socialPosts.length === 0 && (
                <div className="rounded-xl border border-slate-700/50 bg-[#060d1f]/80 px-4 py-4 text-xs text-slate-500">
                  No hay publicaciones todavía. Publica el primer anuncio del equipo.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {activeModule === 'messages' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-sky-500/20 bg-gradient-to-br from-[#091423] to-[#0a1321] p-5">
            <p className="text-[10px] uppercase tracking-widest text-sky-300/60">Mensajes</p>
            <h3 className="text-lg font-light text-white">Comunicación del equipo</h3>
            <p className="text-xs text-slate-400 mt-1">Chat interno integrado dentro del Workspace.</p>
          </div>
          <Messages />
        </div>
      )}

      {activeModule === 'meetings' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-[#071a14] to-[#0a1321] p-5">
            <p className="text-[10px] uppercase tracking-widest text-emerald-300/60">Reuniones</p>
            <h3 className="text-lg font-light text-white">Juntas del equipo</h3>
            <p className="text-xs text-slate-400 mt-1">Planeación, ejecución y minuta sin salir de Workspace.</p>
          </div>
          <Meetings />
        </div>
      )}

      {activeModule === 'assistant' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-fuchsia-500/20 bg-gradient-to-br from-[#1a0d2b] to-[#0a1321] p-5">
            <p className="text-[10px] uppercase tracking-widest text-fuchsia-300/60">Asistente AI</p>
            <h3 className="text-lg font-light text-white">Control conversacional de operación</h3>
            <p className="text-xs text-slate-400 mt-1">Consulta ventas, mesas, ausencias y vacaciones en lenguaje natural.</p>
          </div>
          <div className="rounded-2xl border border-slate-700/50 bg-[#060d1f]/80 p-4">
            <div className="max-h-[360px] space-y-2 overflow-auto pr-1">
              {assistantMessages.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-xl border px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'ml-8 border-cyan-500/30 bg-cyan-500/10 text-cyan-100'
                      : 'mr-8 border-fuchsia-500/25 bg-fuchsia-500/10 text-slate-200'
                  }`}
                >
                  {message.content}
                </div>
              ))}
              {assistantLoading && (
                <div className="mr-8 rounded-xl border border-fuchsia-500/25 bg-fuchsia-500/10 px-3 py-2 text-sm text-slate-300">
                  Analizando datos operativos...
                </div>
              )}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                'como va la venta hoy',
                'cuantas mesas hubo hoy',
                'que personal falto hoy',
                'quien esta de vacaciones',
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => setAssistantInput(prompt)}
                  className="rounded-full border border-slate-700/60 bg-[#030b18]/70 px-2.5 py-1 text-[11px] text-slate-300 hover:border-fuchsia-500/35 hover:text-fuchsia-200"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={assistantInput}
                onChange={(e) => setAssistantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    askAssistant()
                  }
                }}
                placeholder="Pregunta al asistente..."
                className="w-full rounded-lg border border-slate-700/60 bg-[#030b18]/70 px-3 py-2 text-sm text-slate-200"
              />
              <button
                onClick={askAssistant}
                disabled={assistantLoading || !assistantInput.trim()}
                className="rounded-lg border border-fuchsia-500/35 bg-fuchsia-500/10 px-3 py-2 text-xs text-fuchsia-200 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── EVENTO QUICK VIEW (Side Panel tipo Monday) ── */}
      {modal === 'view' && selectedEvent && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setModal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 shadow-2xl border-l border-cyan-500/20 backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-[#040c1a] to-[#040c1a]/95 backdrop-blur-xl border-b border-cyan-500/10 px-6 py-4">
              <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`h-3 w-3 rounded-full shadow-lg ${CATEGORY_META[selectedEvent.category]?.dot || CATEGORY_META.otro.dot}`} />
                <span className={`text-xs rounded-full border px-3 py-1 font-semibold backdrop-blur-sm shadow-sm ${CATEGORY_META[selectedEvent.category]?.color || CATEGORY_META.otro.color}`}>
                  {CATEGORY_META[selectedEvent.category]?.label || 'Otro'}
                </span>
              </div>
              <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-500 hover:text-slate-200 hover:bg-slate-700/40 transition-all duration-300 active:scale-90 touch-manipulation">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
              </div>
            </div>

            <div className="px-6 py-5">

            <h2 className="text-xl font-semibold text-white mb-2 bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">{selectedEvent.title}</h2>
            <p className="text-sm text-cyan-300/80 mb-4 font-medium">{fmtDate(selectedEvent.event_date)}{selectedEvent.start_time && ` · ${fmtTime(selectedEvent.start_time)}`}{selectedEvent.end_time && ` – ${fmtTime(selectedEvent.end_time)}`}</p>

            {selectedEvent.description && (
              <p className="text-sm text-slate-300 bg-gradient-to-br from-[#030b18]/60 to-[#050d1a]/50 rounded-xl p-4 mb-4 whitespace-pre-wrap leading-relaxed border border-slate-700/40 shadow-inner backdrop-blur-sm">{selectedEvent.description}</p>
            )}

            {selectedEvent.quote_client && (
              <div className="flex items-center gap-2.5 mb-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                <svg className="h-4 w-4 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <Link
                  to={`/admin/quotes/${selectedEvent.quote_id}`}
                  onClick={() => setModal(null)}
                  className="text-sm text-cyan-300 hover:text-cyan-200 transition-all duration-300 font-medium"
                >
                  📋 Cotización: {selectedEvent.quote_client} — {selectedEvent.quote_type}
                </Link>
              </div>
            )}

            <p className="text-xs text-slate-500 mb-5 font-medium">👤 Creado por: {selectedEvent.creator_name}</p>

            <div className="sticky bottom-0 z-10 bg-gradient-to-t from-[#040c1a] to-[#040c1a]/95 backdrop-blur-xl border-t border-cyan-500/10 px-6 py-4">
              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5 sm:gap-3">
                <button
                  onClick={() => openEdit(selectedEvent)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 px-5 py-3 sm:py-2.5 text-sm font-semibold text-cyan-300 shadow-lg shadow-cyan-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-cyan-400/50 hover:from-cyan-500/25 hover:to-blue-500/25 hover:shadow-xl hover:shadow-cyan-400/30 active:scale-95 touch-manipulation min-h-[44px]"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(selectedEvent.id)}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/25 bg-red-500/10 px-5 py-3 sm:py-2.5 text-sm font-semibold text-red-300 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-red-400/40 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/20 active:scale-95 touch-manipulation min-h-[44px]"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
            </div>
          </div>
        </>
      )}

      {/* ── CREATE / EDIT EVENTO (Side Panel) ── */}
      {(modal === 'create' || modal === 'edit') && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setModal(null)} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 shadow-2xl border-l border-cyan-500/20 backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-[#040c1a] to-[#040c1a]/95 backdrop-blur-xl border-b border-cyan-500/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 transition-all touch-manipulation">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <h3 className="text-lg font-semibold text-white">
                    {modal === 'edit' ? 'Editar evento' : 'Nuevo evento'}
                  </h3>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">

            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Título *</label>
                <input value={form.title} onChange={upd('title')} placeholder="Nombre del evento…" className={inputCls} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Fecha *</label>
                  <input type="date" value={form.event_date} onChange={upd('event_date')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Categoría</label>
                  <select value={form.category} onChange={upd('category')} className={inputCls}>
                    {Object.entries(CATEGORY_META).map(([k, v]) => (
                      <option key={k} value={k} className="bg-[#030b18]">{v.icon} {v.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hora inicio</label>
                  <input type="time" value={form.start_time} onChange={upd('start_time')} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Hora fin</label>
                  <input type="time" value={form.end_time} onChange={upd('end_time')} className={inputCls} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">Descripción / Notas</label>
                <textarea value={form.description} onChange={upd('description')} rows={3} placeholder="Detalles del evento…" className={`${inputCls} resize-none`} />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">ID de Cotización (opcional)</label>
                <input type="number" value={form.quote_id} onChange={upd('quote_id')} placeholder="Ej: 4" className={inputCls} />
              </div>
              {formError && (
                <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-2.5 backdrop-blur-sm">⚠️ {formError}</p>
              )}
            </div>

            <div className="sticky bottom-0 z-10 bg-gradient-to-t from-[#040c1a] to-[#040c1a]/95 backdrop-blur-xl border-t border-cyan-500/10 px-6 py-4">
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
                <button onClick={() => setModal(null)} className="rounded-xl border border-slate-700/60 bg-[#030b18]/70 px-5 py-3 sm:py-2.5 text-sm text-slate-300 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/80 hover:bg-[#030b18]/90 hover:text-slate-100 active:scale-95 touch-manipulation min-h-[44px]">
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={!form.title || !form.event_date || saving}
                  className="inline-flex items-center justify-center gap-2.5 rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 px-6 py-3 sm:py-2.5 text-sm font-semibold text-cyan-300 shadow-lg shadow-cyan-500/20 backdrop-blur-sm transition-all duration-300 hover:scale-105 hover:border-cyan-400/60 hover:from-cyan-500/30 hover:to-blue-500/30 hover:shadow-xl hover:shadow-cyan-400/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-95 touch-manipulation min-h-[44px]"
                >
                  {saving ? '⏳ Guardando…' : modal === 'edit' ? '💾 Guardar cambios' : '✨ Crear evento'}
                </button>
              </div>
            </div>
            </div>
          </div>
        </>
      )}

      {/* ── SIDE PANEL PRINCIPAL ── */}
      {sidePanel.open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={hideSidePanel} />
          <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] lg:w-[480px] bg-gradient-to-br from-[#040c1a]/98 to-[#060f20]/95 shadow-2xl border-l border-cyan-500/20 backdrop-blur-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="sticky top-0 z-10 bg-gradient-to-b from-[#040c1a] to-[#040c1a]/90 backdrop-blur-xl border-b border-cyan-500/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white bg-gradient-to-r from-white to-cyan-100 bg-clip-text text-transparent">
                  {sidePanel.type === 'card' ? '📋 Detalles de la Card' : '📝 Detalles de la Nota'}
                </h2>
                <button
                  onClick={hideSidePanel}
                  className="rounded-lg border border-slate-600/50 bg-slate-700/60 p-2 text-slate-300 hover:bg-slate-600/50 hover:text-white transition-all duration-200"
                  aria-label="Cerrar panel"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5">
              {sidePanel.type === 'card' && sidePanel.data && (
                <div className="space-y-6">
                  {/* Card Title */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{sidePanel.data.title}</h3>
                    {sidePanel.data.description && (
                      <p className="text-sm text-slate-300 leading-relaxed">{sidePanel.data.description}</p>
                    )}
                  </div>

                  {/* Card Metadata */}
                  <div className="grid grid-cols-1 gap-4">
                    {sidePanel.data.priority && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">Prioridad</span>
                        <span className={`rounded-full text-[10px] px-2.5 py-1 font-semibold ${
                          sidePanel.data.priority === 'high'
                            ? 'bg-red-500/25 text-red-200 border border-red-400/30'
                            : sidePanel.data.priority === 'low'
                            ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/30'
                            : 'bg-amber-500/25 text-amber-100 border border-amber-400/30'
                        }`}>
                          {sidePanel.data.priority === 'high' ? '🔴 Alta' : sidePanel.data.priority === 'low' ? '🟢 Baja' : '🟡 Media'}
                        </span>
                      </div>
                    )}

                    {sidePanel.data.due_date && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">Fecha límite</span>
                        <span className="text-sm text-slate-300">📅 {sidePanel.data.due_date}</span>
                      </div>
                    )}

                    {sidePanel.data.category && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">Categoría</span>
                        <span className={`text-[9px] px-2 py-0.5 rounded-md font-medium ${CATEGORY_META[sidePanel.data.category]?.color || CATEGORY_META.otro.color}`}>
                          {CATEGORY_META[sidePanel.data.category]?.icon} {CATEGORY_META[sidePanel.data.category]?.label || sidePanel.data.category}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Checklist Progress */}
                  {Number(sidePanel.data.checklist_total || 0) > 0 && (
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-widest text-slate-400">Progreso</span>
                        <span className="text-sm text-slate-300 font-medium">{Number(sidePanel.data.checklist_done || 0)}/{Number(sidePanel.data.checklist_total || 0)}</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700/50 shadow-inner">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-400 shadow-lg shadow-cyan-500/50 transition-all duration-700 ease-out"
                          style={{ width: `${getChecklistProgress(sidePanel.data)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Assigned Users */}
                  {sidePanel.data.assigned_to && (
                    <div>
                      <span className="text-[10px] uppercase tracking-widest text-slate-400">Asignado a</span>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Array.isArray(sidePanel.data.assigned_to) ? 
                          sidePanel.data.assigned_to.map((userId) => {
                            const user = workspaceUsers.find(u => u.id === userId)
                            return user ? (
                              <div key={userId} className="flex items-center gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 py-2">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-fuchsia-500 to-purple-500 border border-slate-700/50 flex items-center justify-center text-[10px] text-white font-medium">
                                  {user.full_name?.[0] || user.username?.[0] || 'U'}
                                </div>
                                <span className="text-xs text-slate-300">{user.full_name || user.username}</span>
                              </div>
                            ) : null
                          }) : (
                            <div className="text-sm text-slate-400">Sin asignar</div>
                          )
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}

              {sidePanel.type === 'note' && sidePanel.data && (
                <div className="space-y-6">
                  {/* Note Title */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{sidePanel.data.title}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>Por: {sidePanel.data.full_name || sidePanel.data.username || 'Usuario'}</span>
                      <span>•</span>
                      <span>{new Date(sidePanel.data.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Note Content */}
                  <div>
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Contenido</span>
                    <div className="mt-2 rounded-lg border border-slate-700/50 bg-slate-800/50 p-4">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                        {sidePanel.data.content || 'Sin contenido'}
                      </p>
                    </div>
                  </div>

                  {/* Note Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-widest text-slate-400">Estado</span>
                    <button
                      onClick={() => toggleNotePin(sidePanel.data.id, Number(sidePanel.data.pinned) === 1)}
                      className={`rounded-md border px-3 py-1.5 text-[10px] font-medium transition-all ${
                        Number(sidePanel.data.pinned) === 1
                          ? 'border-amber-400/45 bg-amber-500/15 text-amber-300'
                          : 'border-slate-700/60 bg-slate-800/60 text-slate-400 hover:border-slate-600/50 hover:text-slate-300'
                      }`}
                    >
                      {Number(sidePanel.data.pinned) === 1 ? '📌 Fijada' : '📌 Fijar'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── TOAST NOTIFICATIONS ── */}
      {toast.visible && (
        <div className={`fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-in slide-in-from-bottom duration-300 ${
          toast.type === 'success' 
            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 shadow-emerald-500/20'
            : toast.type === 'error'
            ? 'border-red-500/30 bg-red-500/10 text-red-300 shadow-red-500/20'
            : toast.type === 'warning'
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 shadow-amber-500/20'
            : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 shadow-cyan-500/20'
        }`}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{toast.message}</span>
            <button
              onClick={() => setToast(prev => ({ ...prev, visible: false }))}
              className="ml-auto rounded border border-current/20 p-1 hover:bg-current/10 transition-colors"
              aria-label="Cerrar notificación"
            >
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
