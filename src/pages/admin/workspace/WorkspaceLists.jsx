import { useState, useEffect, useCallback } from 'react'
import { CheckSquare, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { workspaceListsAPI } from '../../../services/api'

export default function WorkspaceLists() {
  const [listsData, setListsData] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListTitle, setNewListTitle] = useState('')
  const [newListItemByList, setNewListItemByList] = useState({})
  const [editingListId, setEditingListId] = useState(null)
  const [editingListTitle, setEditingListTitle] = useState('')
  const [editingItemId, setEditingItemId] = useState(null)
  const [editingItemContent, setEditingItemContent] = useState('')

  const loadLists = useCallback(async () => {
    setLoading(true)
    try {
      const res = await workspaceListsAPI.listGroups()
      setListsData(res.data?.lists || [])
    } catch { setListsData([]) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadLists() }, [loadLists])

  const createList = async () => {
    const title = newListTitle.trim()
    if (!title) return
    try { await workspaceListsAPI.createGroup({ title, description: '' }); setNewListTitle(''); await loadLists() } catch { /* silent */ }
  }

  const addListItem = async (listId) => {
    const content = (newListItemByList[listId] || '').trim()
    if (!content) return
    try {
      await workspaceListsAPI.saveItem({ list_id: listId, content, priority: 'medium' })
      setNewListItemByList(prev => ({ ...prev, [listId]: '' }))
      await loadLists()
    } catch { /* silent */ }
  }

  const toggleListItem = async (itemId, isDone) => {
    try { await workspaceListsAPI.toggleItem({ item_id: itemId, is_done: isDone ? 0 : 1 }); await loadLists() } catch { /* silent */ }
  }

  const startEditList = (listItem) => { setEditingListId(listItem.id); setEditingListTitle(listItem.title || '') }

  const saveListEdit = async () => {
    const title = editingListTitle.trim()
    if (!editingListId || !title) return
    try { await workspaceListsAPI.updateGroup({ list_id: editingListId, title }); setEditingListId(null); setEditingListTitle(''); await loadLists() } catch { /* silent */ }
  }

  const deleteList = async (listId) => {
    if (!confirm('Eliminar esta lista y todos sus pendientes?')) return
    try { await workspaceListsAPI.deleteGroup({ list_id: listId }); await loadLists() } catch { /* silent */ }
  }

  const startEditItem = (item) => { setEditingItemId(item.id); setEditingItemContent(item.content || '') }

  const saveItemEdit = async () => {
    const content = editingItemContent.trim()
    if (!editingItemId || !content) return
    try { await workspaceListsAPI.updateItem({ item_id: editingItemId, content }); setEditingItemId(null); setEditingItemContent(''); await loadLists() } catch { /* silent */ }
  }

  const deleteItem = async (itemId) => {
    if (!confirm('Eliminar este pendiente?')) return
    try { await workspaceListsAPI.deleteItem({ item_id: itemId }); await loadLists() } catch { /* silent */ }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-400/20 flex items-center justify-center">
          <CheckSquare size={18} className="text-cyan-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Listas</h2>
          <p className="text-xs text-slate-400">Organiza pendientes y seguimiento por equipos</p>
        </div>
      </div>

      {/* Create new list */}
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-4">
        <div className="flex flex-wrap gap-3">
          <input
            value={newListTitle}
            onChange={e => setNewListTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') createList() }}
            placeholder="Nueva lista (ej: Pendientes cocina)"
            className="flex-1 min-w-[180px] sm:min-w-[240px] rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none transition-colors min-h-[44px]"
          />
          <button onClick={createList} className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/15 to-blue-500/15 px-4 sm:px-5 py-2.5 text-xs font-medium text-cyan-300 hover:from-cyan-500/25 hover:to-blue-500/25 active:scale-95 transition-all touch-manipulation min-h-[44px]">
            <Plus size={14} /> Crear lista
          </button>
        </div>
      </div>

      {/* Lists */}
      {listsData.length === 0 ? (
        <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/40 p-12 text-center">
          <div className="h-14 w-14 mx-auto mb-4 rounded-xl bg-slate-800/50 flex items-center justify-center">
            <CheckSquare size={24} className="text-slate-600" />
          </div>
          <h3 className="text-base font-medium text-white mb-2">Sin listas aun</h3>
          <p className="text-sm text-slate-400">Crea tu primera lista para organizar tareas y pendientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
          {listsData.map(listItem => (
            <div key={listItem.id} className="group/list rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-5 hover:border-cyan-500/20 transition-all duration-300">
              {/* List header */}
              <div className="mb-4 flex items-center justify-between gap-2">
                {editingListId === listItem.id ? (
                  <div className="flex-1 flex items-center gap-2">
                    <input value={editingListTitle} onChange={e => setEditingListTitle(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveListEdit() }}
                      className="flex-1 rounded-lg border border-cyan-500/40 bg-slate-800/80 px-3 py-1.5 text-sm text-white focus:ring-1 focus:ring-cyan-400/50 outline-none transition-all" autoFocus />
                    <button onClick={saveListEdit} className="rounded-lg p-1.5 text-emerald-400 hover:bg-emerald-500/10 transition-all"><Check size={14} /></button>
                    <button onClick={() => { setEditingListId(null); setEditingListTitle('') }} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-700/40 transition-all"><X size={14} /></button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <CheckSquare size={12} className="text-cyan-400" />
                      </div>
                      <h4 className="text-sm font-semibold text-white">{listItem.title}</h4>
                      <span className="text-[10px] text-slate-600">{(listItem.items || []).length}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover/list:opacity-100 transition-opacity">
                      <button onClick={() => startEditList(listItem)} className="rounded-lg p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-700/40 transition-all"><Pencil size={12} /></button>
                      <button onClick={() => deleteList(listItem.id)} className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"><Trash2 size={12} /></button>
                    </div>
                  </>
                )}
              </div>

              {/* Items */}
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {(listItem.items || []).map(entry => (
                  <div key={entry.id} className="group/item flex items-center gap-2 p-2 rounded-lg hover:bg-slate-700/20 transition-all">
                    <button onClick={() => toggleListItem(entry.id, Number(entry.is_done) === 1)}
                      className={`flex-shrink-0 h-5 w-5 sm:h-4 sm:w-4 rounded border-2 transition-all touch-manipulation ${Number(entry.is_done) === 1 ? 'border-cyan-400 bg-cyan-400' : 'border-slate-600 hover:border-cyan-400'}`}>
                      {Number(entry.is_done) === 1 && <Check size={10} className="text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      {editingItemId === entry.id ? (
                        <div className="flex items-center gap-1">
                          <input value={editingItemContent} onChange={e => setEditingItemContent(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') saveItemEdit() }}
                            className="flex-1 rounded-lg border border-cyan-500/40 bg-slate-800/80 px-2 py-1 text-xs text-white outline-none" autoFocus />
                          <button onClick={saveItemEdit} className="p-1 text-emerald-400"><Check size={12} /></button>
                        </div>
                      ) : (
                        <p className={`text-sm truncate ${Number(entry.is_done) === 1 ? 'text-slate-500 line-through' : 'text-slate-200'}`}>{entry.content}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      {editingItemId !== entry.id && <button onClick={() => startEditItem(entry)} className="p-1 text-slate-600 hover:text-slate-300"><Pencil size={10} /></button>}
                      <button onClick={() => deleteItem(entry.id)} className="p-1 text-slate-600 hover:text-red-400"><X size={10} /></button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add item */}
              <div className="mt-3 pt-3 border-t border-slate-700/20">
                <div className="flex gap-2">
                  <input
                    value={newListItemByList[listItem.id] || ''}
                    onChange={e => setNewListItemByList(prev => ({ ...prev, [listItem.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') addListItem(listItem.id) }}
                    placeholder="Nuevo pendiente..."
                    className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/60 px-3 py-2.5 sm:py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-cyan-500/40 focus:outline-none transition-colors min-h-[40px]"
                  />
                  <button onClick={() => addListItem(listItem.id)} className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-2.5 sm:py-2 text-cyan-400 hover:bg-cyan-500/20 transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
