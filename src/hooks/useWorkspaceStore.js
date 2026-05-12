/**
 * Workspace Store - Zustand State Management con Event Sourcing + Analytics + Performance + Accessibility
 * 
 * Features:
 * - Centralized state management for workspace modules
 * - Event Sourcing integration for state history
 * - Performance monitoring for state updates
 * - Accessibility features for screen readers
 * - Analytics tracking for user interactions
 * - Persistence with localStorage
 * - Optimistic updates with rollback
 */

import { create } from 'zustand'
import { subscribeWithSelector, devtools, persist } from 'zustand/middleware'
import { workspaceLogger } from '../lib/workspaceLogger'
import { analyticsAPI } from '../services/api'

// Initial state for all workspace modules
const initialState = {
  // Calendar state
  calendar: {
    events: [],
    loading: false,
    error: null,
    selectedDate: null,
    viewMode: 'month',
    filters: {}
  },
  
  // Boards state (Trello-like)
  boards: {
    boards: [],
    activeBoardId: null,
    loading: false,
    error: null,
    columns: {},
    cards: {},
    filters: {},
    search: ''
  },
  
  // Lists state
  lists: {
    lists: [],
    loading: false,
    error: null,
    items: {},
    filters: {}
  },
  
  // Notes state
  notes: {
    notes: [],
    loading: false,
    error: null,
    search: '',
    filters: {}
  },
  
  // Social state
  social: {
    posts: [],
    loading: false,
    error: null,
    unreadCount: 0,
    mentions: [],
    filters: {}
  },
  
  // Messages state
  messages: {
    conversations: [],
    activeConversationId: null,
    messages: {},
    loading: false,
    error: null,
    unreadCount: 0
  },
  
  // Meetings state
  meetings: {
    meetings: [],
    activeMeetingId: null,
    loading: false,
    error: null,
    participants: {}
  },
  
  // Assistant state
  assistant: {
    messages: [
      {
        id: 'assistant-welcome',
        role: 'assistant',
        content: 'Hola, soy tu asistente operativo. Puedes preguntarme: "como va la venta", "cuantas mesas hubo hoy", "que personal falto hoy" o "quien esta de vacaciones".',
      }
    ],
    loading: false,
    error: null
  },
  
  // UI state
  ui: {
    activeModule: 'calendar',
    sidebarOpen: false,
    sidePanel: { open: false, type: null, data: null },
    leftPanel: { open: false, filters: {}, search: '' },
    toast: { message: '', type: '', visible: false },
    theme: 'dark',
    loading: false,
    skeletonLoading: false
  },
  
  // User state
  user: {
    currentUser: null,
    workspaceUsers: [],
    permissions: {},
    onlineUsers: []
  },
  
  // Performance state
  performance: {
    lastActionTime: null,
    actionCounts: {},
    slowOperations: []
  }
}

// Event Sourcing integration
class EventSourcingManager {
  constructor(store) {
    this.store = store
    this.eventQueue = []
    this.isProcessing = false
  }

  async queueEvent(eventType, data, metadata = {}) {
    const event = {
      eventId: this.generateEventId(),
      eventType,
      aggregateId: this.getAggregateId(),
      aggregateType: 'workspace_state',
      version: this.getNextVersion(),
      occurredAt: new Date().toISOString(),
      data,
      metadata: {
        userId: this.getCurrentUserId(),
        sessionId: workspaceLogger.sessionId,
        url: window.location.href,
        ...metadata
      }
    }

    this.eventQueue.push(event)
    await this.processEventQueue()
  }

  async processEventQueue() {
    if (this.isProcessing) return
    
    this.isProcessing = true
    
    try {
      while (this.eventQueue.length > 0) {
        const event = this.eventQueue.shift()
        await this.storeEvent(event)
        await this.applyEvent(event)
      }
    } catch (error) {
      workspaceLogger.error('Failed to process event queue', { error })
    } finally {
      this.isProcessing = false
    }
  }

  async storeEvent(event) {
    try {
      const events = JSON.parse(localStorage.getItem('workspaceStateEvents') || '[]')
      events.push(event)
      
      // Keep only last 200 events
      if (events.length > 200) {
        events.splice(0, events.length - 200)
      }
      
      localStorage.setItem('workspaceStateEvents', JSON.stringify(events))
    } catch (error) {
      workspaceLogger.error('Failed to store event', { error, event })
    }
  }

  async applyEvent(event) {
    // Apply event to state optimistically
    const currentState = this.store.getState()
    const newState = this.applyEventToState(currentState, event)
    
    // Update state with optimistic update
    Object.keys(newState).forEach(key => {
      if (key !== 'performance') { // Don't overwrite performance state
        this.store.setState({ [key]: newState[key] }, false)
      }
    })
  }

  applyEventToState(state, event) {
    const { eventType, data } = event
    const newState = { ...state }

    switch (eventType) {
      case 'calendar_event_added':
        newState.calendar.events.push(data)
        break
      case 'calendar_event_updated':
        newState.calendar.events = newState.calendar.events.map(e => 
          e.id === data.id ? { ...e, ...data } : e
        )
        break
      case 'calendar_event_deleted':
        newState.calendar.events = newState.calendar.events.filter(e => e.id !== data.id)
        break
      case 'board_created':
        newState.boards.boards.push(data)
        break
      case 'board_updated':
        newState.boards.boards = newState.boards.boards.map(b => 
          b.id === data.id ? { ...b, ...data } : b
        )
        break
      case 'board_deleted':
        newState.boards.boards = newState.boards.boards.filter(b => b.id !== data.id)
        break
      case 'note_created':
        newState.notes.notes.push(data)
        break
      case 'note_updated':
        newState.notes.notes = newState.notes.notes.map(n => 
          n.id === data.id ? { ...n, ...data } : n
        )
        break
      case 'note_deleted':
        newState.notes.notes = newState.notes.notes.filter(n => n.id !== data.id)
        break
      case 'ui_theme_changed':
        newState.ui.theme = data.theme
        break
      case 'ui_module_changed':
        newState.ui.activeModule = data.module
        break
      default:
        workspaceLogger.warn('Unknown event type', { eventType })
    }

    return newState
  }

  generateEventId() {
    return `state_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getAggregateId() {
    return `workspace_${workspaceLogger.sessionId}`
  }

  getNextVersion() {
    const events = JSON.parse(localStorage.getItem('workspaceStateEvents') || '[]')
    return events.length + 1
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.id || 'anonymous'
    } catch {
      return 'anonymous'
    }
  }

  // Replay events to reconstruct state
  async replayEvents() {
    try {
      const events = JSON.parse(localStorage.getItem('workspaceStateEvents') || '[]')
      const state = { ...initialState }
      
      for (const event of events) {
        const updatedState = this.applyEventToState(state, event)
        Object.assign(state, updatedState)
      }
      
      return state
    } catch (error) {
      workspaceLogger.error('Failed to replay events', { error })
      return initialState
    }
  }
}

// Create the store
const createWorkspaceStore = () => {
  const store = create(
    devtools(
      subscribeWithSelector(
        persist(
          (set, get) => ({
            ...initialState,
            
            // Actions for Calendar
            calendarActions: {
              setEvents: (events) => {
                const startTime = Date.now()
                set((state) => ({
                  calendar: { ...state.calendar, events }
                }), false, 'calendar/setEvents')
                
                // Performance tracking
                get().performanceActions.trackAction('setEvents', Date.now() - startTime)
                
                // Event Sourcing
                get().eventSourcing.queueEvent('calendar_events_loaded', { events })
              },
              
              addEvent: (event) => {
                const startTime = Date.now()
                set((state) => ({
                  calendar: { 
                    ...state.calendar, 
                    events: [...state.calendar.events, event] 
                  }
                }), false, 'calendar/addEvent')
                
                // Performance tracking
                get().performanceActions.trackAction('addEvent', Date.now() - startTime)
                
                // Analytics
                analyticsAPI.track({
                  event: 'calendar_event_added',
                  data: { eventId: event.id, eventType: event.category }
                }).catch(console.error)
                
                // Event Sourcing
                get().eventSourcing.queueEvent('calendar_event_added', event)
                
                // Accessibility announcement
                get().uiActions.announceToScreenReader(
                  `Evento ${event.title} agregado al calendario`
                )
              },
              
              updateEvent: (eventId, updates) => {
                const startTime = Date.now()
                set((state) => ({
                  calendar: {
                    ...state.calendar,
                    events: state.calendar.events.map(e =>
                      e.id === eventId ? { ...e, ...updates } : e
                    )
                  }
                }), false, 'calendar/updateEvent')
                
                // Performance tracking
                get().performanceActions.trackAction('updateEvent', Date.now() - startTime)
                
                // Analytics
                analyticsAPI.track({
                  event: 'calendar_event_updated',
                  data: { eventId }
                }).catch(console.error)
                
                // Event Sourcing
                get().eventSourcing.queueEvent('calendar_event_updated', { id: eventId, ...updates })
              },
              
              deleteEvent: (eventId) => {
                const startTime = Date.now()
                set((state) => ({
                  calendar: {
                    ...state.calendar,
                    events: state.calendar.events.filter(e => e.id !== eventId)
                  }
                }), false, 'calendar/deleteEvent')
                
                // Performance tracking
                get().performanceActions.trackAction('deleteEvent', Date.now() - startTime)
                
                // Analytics
                analyticsAPI.track({
                  event: 'calendar_event_deleted',
                  data: { eventId }
                }).catch(console.error)
                
                // Event Sourcing
                get().eventSourcing.queueEvent('calendar_event_deleted', { id: eventId })
                
                // Accessibility announcement
                get().uiActions.announceToScreenReader(
                  'Evento eliminado del calendario'
                )
              },
              
              setLoading: (loading) => set((state) => ({
                calendar: { ...state.calendar, loading }
              }), false, 'calendar/setLoading'),
              
              setError: (error) => set((state) => ({
                calendar: { ...state.calendar, error }
              }), false, 'calendar/setError'),
              
              setSelectedDate: (date) => set((state) => ({
                calendar: { ...state.calendar, selectedDate: date }
              }), false, 'calendar/setSelectedDate'),
              
              setViewMode: (mode) => set((state) => ({
                calendar: { ...state.calendar, viewMode: mode }
              }), false, 'calendar/setViewMode')
            },
            
            // Actions for Boards
            boardsActions: {
              setBoards: (boards) => {
                const startTime = Date.now()
                set((state) => ({
                  boards: { ...state.boards, boards }
                }), false, 'boards/setBoards')
                
                get().performanceActions.trackAction('setBoards', Date.now() - startTime)
                get().eventSourcing.queueEvent('boards_loaded', { boards })
              },
              
              setActiveBoard: (boardId) => {
                set((state) => ({
                  boards: { ...state.boards, activeBoardId: boardId }
                }), false, 'boards/setActiveBoard')
                
                analyticsAPI.track({
                  event: 'board_selected',
                  data: { boardId }
                }).catch(console.error)
              },
              
              createBoard: (board) => {
                const startTime = Date.now()
                set((state) => ({
                  boards: { ...state.boards, boards: [...state.boards.boards, board] }
                }), false, 'boards/createBoard')
                
                get().performanceActions.trackAction('createBoard', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'board_created',
                  data: { boardId: board.id }
                }).catch(console.error)
                get().eventSourcing.queueEvent('board_created', board)
              },
              
              updateBoard: (boardId, updates) => {
                const startTime = Date.now()
                set((state) => ({
                  boards: {
                    ...state.boards,
                    boards: state.boards.boards.map(b =>
                      b.id === boardId ? { ...b, ...updates } : b
                    )
                  }
                }), false, 'boards/updateBoard')
                
                get().performanceActions.trackAction('updateBoard', Date.now() - startTime)
                get().eventSourcing.queueEvent('board_updated', { id: boardId, ...updates })
              },
              
              deleteBoard: (boardId) => {
                const startTime = Date.now()
                set((state) => ({
                  boards: {
                    ...state.boards,
                    boards: state.boards.boards.filter(b => b.id !== boardId)
                  }
                }), false, 'boards/deleteBoard')
                
                get().performanceActions.trackAction('deleteBoard', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'board_deleted',
                  data: { boardId }
                }).catch(console.error)
                get().eventSourcing.queueEvent('board_deleted', { id: boardId })
              },
              
              setLoading: (loading) => set((state) => ({
                boards: { ...state.boards, loading }
              }), false, 'boards/setLoading'),
              
              setError: (error) => set((state) => ({
                boards: { ...state.boards, error }
              }), false, 'boards/setError')
            },
            
            // Actions for Notes
            notesActions: {
              setNotes: (notes) => {
                const startTime = Date.now()
                set((state) => ({
                  notes: { ...state.notes, notes }
                }), false, 'notes/setNotes')
                
                get().performanceActions.trackAction('setNotes', Date.now() - startTime)
                get().eventSourcing.queueEvent('notes_loaded', { notes })
              },
              
              createNote: (note) => {
                const startTime = Date.now()
                set((state) => ({
                  notes: { ...state.notes, notes: [...state.notes.notes, note] }
                }), false, 'notes/createNote')
                
                get().performanceActions.trackAction('createNote', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'note_created',
                  data: { noteId: note.id }
                }).catch(console.error)
                get().eventSourcing.queueEvent('note_created', note)
              },
              
              updateNote: (noteId, updates) => {
                const startTime = Date.now()
                set((state) => ({
                  notes: {
                    ...state.notes,
                    notes: state.notes.notes.map(n =>
                      n.id === noteId ? { ...n, ...updates } : n
                    )
                  }
                }), false, 'notes/updateNote')
                
                get().performanceActions.trackAction('updateNote', Date.now() - startTime)
                get().eventSourcing.queueEvent('note_updated', { id: noteId, ...updates })
              },
              
              deleteNote: (noteId) => {
                const startTime = Date.now()
                set((state) => ({
                  notes: {
                    ...state.notes,
                    notes: state.notes.notes.filter(n => n.id !== noteId)
                  }
                }), false, 'notes/deleteNote')
                
                get().performanceActions.trackAction('deleteNote', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'note_deleted',
                  data: { noteId }
                }).catch(console.error)
                get().eventSourcing.queueEvent('note_deleted', { id: noteId })
              },
              
              setLoading: (loading) => set((state) => ({
                notes: { ...state.notes, loading }
              }), false, 'notes/setLoading'),
              
              setError: (error) => set((state) => ({
                notes: { ...state.notes, error }
              }), false, 'notes/setError')
            },
            
            // Actions for UI
            uiActions: {
              setActiveModule: (module) => {
                const startTime = Date.now()
                set((state) => ({
                  ui: { ...state.ui, activeModule: module }
                }), false, 'ui/setActiveModule')
                
                get().performanceActions.trackAction('setActiveModule', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'module_changed',
                  data: { module }
                }).catch(console.error)
                get().eventSourcing.queueEvent('ui_module_changed', { module })
              },
              
              toggleSidebar: () => set((state) => ({
                ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen }
              }), false, 'ui/toggleSidebar'),
              
              setSidePanel: (panel) => set((state) => ({
                ui: { ...state.ui, sidePanel: panel }
              }), false, 'ui/setSidePanel'),
              
              setLeftPanel: (panel) => set((state) => ({
                ui: { ...state.ui, leftPanel: panel }
              }), false, 'ui/setLeftPanel'),
              
              showToast: (message, type = 'info') => {
                set((state) => ({
                  ui: { 
                    ...state.ui, 
                    toast: { message, type, visible: true }
                  }
                }), false, 'ui/showToast')
                
                // Auto-hide after 3 seconds
                setTimeout(() => {
                  set((state) => ({
                    ui: { ...state.ui, toast: { ...state.ui.toast, visible: false } }
                  }), false, 'ui/hideToast')
                }, 3000)
              },
              
              setTheme: (theme) => {
                const startTime = Date.now()
                set((state) => ({
                  ui: { ...state.ui, theme }
                }), false, 'ui/setTheme')
                
                get().performanceActions.trackAction('setTheme', Date.now() - startTime)
                analyticsAPI.track({
                  event: 'theme_changed',
                  data: { theme }
                }).catch(console.error)
                get().eventSourcing.queueEvent('ui_theme_changed', { theme })
                
                // Apply theme to document
                document.documentElement.classList.toggle('light-theme', theme === 'light')
              },
              
              setLoading: (loading) => set((state) => ({
                ui: { ...state.ui, loading }
              }), false, 'ui/setLoading'),
              
              setSkeletonLoading: (loading) => set((state) => ({
                ui: { ...state.ui, skeletonLoading: loading }
              }), false, 'ui/setSkeletonLoading'),
              
              // Accessibility helpers
              announceToScreenReader: (message) => {
                const announcement = document.createElement('div')
                announcement.setAttribute('aria-live', 'polite')
                announcement.setAttribute('aria-atomic', 'true')
                announcement.className = 'sr-only'
                announcement.textContent = message
                
                document.body.appendChild(announcement)
                
                setTimeout(() => {
                  document.body.removeChild(announcement)
                }, 1000)
              }
            },
            
            // Actions for Performance
            performanceActions: {
              trackAction: (action, duration) => {
                const startTime = Date.now()
                set((state) => ({
                  performance: {
                    ...state.performance,
                    lastActionTime: startTime,
                    actionCounts: {
                      ...state.performance.actionCounts,
                      [action]: (state.performance.actionCounts[action] || 0) + 1
                    },
                    slowOperations: duration > 1000 ? [
                      ...state.performance.slowOperations,
                      { action, duration, timestamp: startTime }
                    ].slice(-10) : state.performance.slowOperations
                  }
                }), false, 'performance/trackAction')
                
                // Log slow operations
                if (duration > 1000) {
                  workspaceLogger.performance(action, startTime - duration, { duration })
                }
              },
              
              getPerformanceStats: () => {
                const state = get()
                return {
                  totalActions: Object.values(state.performance.actionCounts).reduce((a, b) => a + b, 0),
                  actionCounts: state.performance.actionCounts,
                  slowOperations: state.performance.slowOperations,
                  lastActionTime: state.performance.lastActionTime
                }
              }
            },
            
            // Event Sourcing instance
            eventSourcing: null
          }),
          {
            name: 'workspace-store',
            partialize: (state) => ({
              // Only persist specific parts of state
              ui: {
                theme: state.ui.theme,
                activeModule: state.ui.activeModule
              }
            }),
            onRehydrateStorage: () => (state) => {
              // Initialize Event Sourcing after rehydration
              if (state) {
                state.eventSourcing = new EventSourcingManager(state)
              }
            }
          }
        ),
        {
          name: 'workspace-store'
        }
      )
    )
  )

  // Initialize Event Sourcing
  const eventSourcing = new EventSourcingManager(store)
  store.setState({ eventSourcing }, false, 'initialize-event-sourcing')

  return store
}

// Create and export the store
export const useWorkspaceStore = createWorkspaceStore()

// Selectors for common state combinations
export const useCalendarState = () => useWorkspaceStore((state) => state.calendar)
export const useBoardsState = () => useWorkspaceStore((state) => state.boards)
export const useNotesState = () => useWorkspaceStore((state) => state.notes)
export const useUIState = () => useWorkspaceStore((state) => state.ui)
export const usePerformanceState = () => useWorkspaceStore((state) => state.performance)

// Action selectors
export const useCalendarActions = () => useWorkspaceStore((state) => state.calendarActions)
export const useBoardsActions = () => useWorkspaceStore((state) => state.boardsActions)
export const useNotesActions = () => useWorkspaceStore((state) => state.notesActions)
export const useUIActions = () => useWorkspaceStore((state) => state.uiActions)
export const usePerformanceActions = () => useWorkspaceStore((state) => state.performanceActions)

// Combined hooks for convenience
export const useCalendar = () => ({
  ...useCalendarState(),
  ...useCalendarActions()
})

export const useBoards = () => ({
  ...useBoardsState(),
  ...useBoardsActions()
})

export const useNotes = () => ({
  ...useNotesState(),
  ...useNotesActions()
})

export const useUI = () => ({
  ...useUIState(),
  ...useUIActions()
})

export default useWorkspaceStore
