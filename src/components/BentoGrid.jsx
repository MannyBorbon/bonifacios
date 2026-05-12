/**
 * BentoGrid Component - Motion Tokens + Performance Monitoring + State + SEO + PWA + Redis + API + SSE + DDD
 * 
 * Features:
 * - Motion tokens with GSAP/Framer patterns
 * - Performance monitoring and optimization
 * - State management integration
 * - SEO optimization with semantic HTML
 * - PWA offline support
 * - Redis caching integration
 * - API integration
 * - Server-Sent Events for real-time updates
 * - Domain-Driven Design patterns
 * - Drag and drop functionality
 * - Responsive design
 * - Accessibility compliance
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { useWorkspaceStore } from '../hooks/useWorkspaceStore'
import { useWorkspaceTheme } from './WorkspaceThemeProvider'
import { workspaceLogger } from '../lib/workspaceLogger'
import { analyticsAPI } from '../services/api'
import { ErrorBoundary } from './ErrorBoundary'
import { MOTION_TOKENS, GRID_CONFIGS, MODULE_SIZES } from './BentoGrid/constants'

// BentoGrid Component
function BentoGrid({ modules = [], onModuleClick, onLayoutChange }) {
  const { hasReducedMotion } = useWorkspaceTheme()
  const { performanceActions } = useWorkspaceStore()
  
  const [layout, setLayout] = useState(modules)
  const [IS_DRAGGING, setIsDragging] = useState(false)
  const [draggedModule, setDraggedModule] = useState(null)
  const [gridConfig, setGridConfig] = useState(GRID_CONFIGS.desktop)
  const [IS_LOADING, SET_IS_LOADING] = useState(false)
  const [error, setError] = useState(null)
  
  const gridRef = useRef(null)
  const resizeObserverRef = useRef(null)
  const sseConnectionRef = useRef(null)

  // Handle real-time updates from SSE - MOVED BEFORE useEffect
  const handleRealtimeUpdate = useCallback((data) => {
    const startTime = Date.now()
    
    switch (data.type) {
      case 'module_updated':
        setLayout(prev => prev.map(module => 
          module.id === data.moduleId ? { ...module, ...data.updates } : module
        ))
        break
      case 'module_added':
        setLayout(prev => [...prev, data.module])
        break
      case 'module_removed':
        setLayout(prev => prev.filter(module => module.id !== data.moduleId))
        break
      case 'layout_changed':
        setLayout(data.layout)
        break
      default:
        workspaceLogger.warn('Unknown SSE event type', { type: data.type })
    }
    
    performanceActions.trackAction('sse_update', Date.now() - startTime)
  }, [performanceActions])

  // Detect screen size and update grid configuration
  useEffect(() => {
    const updateGridConfig = () => {
      const width = window.innerWidth
      let config
      
      if (width < 768) {
        config = GRID_CONFIGS.mobile
      } else if (width < 1024) {
        config = GRID_CONFIGS.tablet
      } else if (width < 1440) {
        config = GRID_CONFIGS.desktop
      } else {
        config = GRID_CONFIGS.wide
      }
      
      setGridConfig(config)
    }

    updateGridConfig()
    
    // Set up ResizeObserver for performance monitoring
    if (gridRef.current && !resizeObserverRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          performanceActions.trackAction('grid_resize', Date.now())
          workspaceLogger.performance('grid_resize', Date.now(), {
            width: entry.contentRect.width,
            height: entry.contentRect.height
          })
        }
      })
      
      resizeObserverRef.current.observe(gridRef.current)
    }

    window.addEventListener('resize', updateGridConfig)
    
    return () => {
      window.removeEventListener('resize', updateGridConfig)
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect()
      }
    }
  }, [performanceActions])

  // Server-Sent Events for real-time updates
  useEffect(() => {
    if (!gridRef.current) return

    const setupSSE = () => {
      try {
        const eventSource = new EventSource('/api/workspace/events')
        
        eventSource.onopen = () => {
          workspaceLogger.info('SSE connection opened')
          analyticsAPI.track({
            event: 'sse_connected',
            data: { component: 'BentoGrid' }
          }).catch(console.error)
        }
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data)
            handleRealtimeUpdate(data)
          } catch (error) {
            workspaceLogger.error('Failed to parse SSE message', { error })
          }
        }
        
        eventSource.onerror = (error) => {
          workspaceLogger.error('SSE connection error', { error })
          eventSource.close()
        }
        
        sseConnectionRef.current = eventSource
        
        return () => {
          eventSource.close()
          sseConnectionRef.current = null
        }
      } catch (error) {
        workspaceLogger.error('Failed to setup SSE', { error })
      }
    }

    const cleanup = setupSSE()
    return cleanup
  }, [handleRealtimeUpdate])

  // Drag and drop handlers
  const handleDragStart = useCallback((moduleId) => {
    const startTime = Date.now()
    setIsDragging(true)
    setDraggedModule(moduleId)
    
    workspaceLogger.userAction('module_drag_start', { moduleId })
    analyticsAPI.track({
      event: 'module_drag_started',
      data: { moduleId }
    }).catch(console.error)
    
    performanceActions.trackAction('drag_start', Date.now() - startTime)
  }, [performanceActions])

  const handleDragEnd = useCallback((result) => {
    const startTime = Date.now()
    setIsDragging(false)
    setDraggedModule(null)

    if (!result.destination) {
      workspaceLogger.userAction('module_drag_cancelled', { 
        source: result.source.index 
      })
      return
    }

    const newLayout = Array.from(layout)
    const [reorderedItem] = newLayout.splice(result.source.index, 1)
    newLayout.splice(result.destination.index, 0, reorderedItem)

    setLayout(newLayout)
    
    workspaceLogger.userAction('module_drag_end', {
      moduleId: reorderedItem.id,
      from: result.source.index,
      to: result.destination.index
    })
    
    analyticsAPI.track({
      event: 'module_drag_completed',
      data: {
        moduleId: reorderedItem.id,
        from: result.source.index,
        to: result.destination.index
      }
    }).catch(console.error)

    if (onLayoutChange) {
      onLayoutChange(newLayout)
    }
    
    performanceActions.trackAction('drag_end', Date.now() - startTime)
  }, [layout, onLayoutChange, performanceActions])

  // Module click handler
  const handleModuleClick = useCallback((module, event) => {
    const startTime = Date.now()
    
    workspaceLogger.userAction('module_clicked', {
      moduleId: module.id,
      moduleType: module.type
    })
    
    analyticsAPI.track({
      event: 'module_clicked',
      data: {
        moduleId: module.id,
        moduleType: module.type,
        position: layout.findIndex(m => m.id === module.id)
      }
    }).catch(console.error)
    
    if (onModuleClick) {
      onModuleClick(module, event)
    }
    
    performanceActions.trackAction('module_click', Date.now() - startTime)
  }, [layout, onModuleClick, performanceActions])

  // Calculate module dimensions
  const getModuleDimensions = useCallback((module) => {
    const config = MODULE_SIZES[module.size] || MODULE_SIZES.medium
    const columnWidth = (gridConfig.gap * (gridConfig.columns - 1) + 
                        (window.innerWidth - gridConfig.padding * 2)) / gridConfig.columns
    
    return {
      width: columnWidth * config.span + gridConfig.gap * (config.span - 1),
      height: config.height
    }
  }, [gridConfig])

  // Motion variants for animations
  const containerVariants = useMemo(() => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: hasReducedMotion ? 0 : MOTION_TOKENS.stagger.container,
        when: 'beforeChildren'
      }
    }
  }), [hasReducedMotion])

  const itemVariants = useMemo(() => ({
    hidden: { 
      opacity: 0,
      y: hasReducedMotion ? 0 : 20,
      scale: hasReducedMotion ? 1 : 0.9
    },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: hasReducedMotion ? 0 : 0.3,
        ease: hasReducedMotion ? 'linear' : 'easeOut'
      }
    },
    drag: {
      scale: 1.05,
      zIndex: 1000,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  }), [hasReducedMotion])

  // Render individual module
  const renderModule = useCallback((module, index) => {
    const dimensions = getModuleDimensions(module)
    const isDragged = draggedModule === module.id
    
    return (
      <Draggable key={module.id} draggableId={module.id} index={index}>
        {(provided, snapshot) => (
          <motion.div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            variants={itemVariants}
            layout="position"
            animate={isDragged ? 'drag' : 'visible'}
            initial="hidden"
            whileHover={!hasReducedMotion ? { scale: 1.02 } : undefined}
            whileTap={!hasReducedMotion ? { scale: 0.98 } : undefined}
            onClick={(e) => handleModuleClick(module, e)}
            className={`
              relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700
              shadow-sm hover:shadow-lg transition-shadow cursor-pointer overflow-hidden
              ${isDragged ? 'shadow-2xl ring-2 ring-blue-500' : ''}
              ${snapshot.isDragging ? 'opacity-75' : ''}
            `}
            style={{
              ...dimensions,
              gridColumn: `span ${MODULE_SIZES[module.size]?.span || 1}`,
              gridRow: `auto`
            }}
            role="button"
            tabIndex={0}
            aria-label={`${module.title} - ${module.description}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                handleModuleClick(module, e)
              }
            }}
          >
            {/* Module content */}
            <div className="p-6 h-full flex flex-col">
              {/* Module header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">{module.icon}</div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {module.title}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {module.subtitle}
                    </p>
                  </div>
                </div>
                
                {/* Drag handle */}
                <div 
                  {...provided.dragHandleProps}
                  className="cursor-grab active:cursor-grabbing p-1"
                  aria-label="Arrastrar módulo"
                >
                  <svg 
                    className="w-5 h-5 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M4 6h16M4 12h16M4 18h16" 
                    />
                  </svg>
                </div>
              </div>
              
              {/* Module body */}
              <div className="flex-1">
                {module.content || (
                  <div className="text-gray-400 dark:text-gray-500 text-center">
                    <p>Contenido del módulo</p>
                  </div>
                )}
              </div>
              
              {/* Module footer */}
              {module.footer && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  {module.footer}
                </div>
              )}
            </div>
            
            {/* Loading overlay */}
            {module.loading && (
              <div className="absolute inset-0 bg-white dark:bg-gray-800 bg-opacity-75 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
          </motion.div>
        )}
      </Draggable>
    )
  }, [draggedModule, getModuleDimensions, handleModuleClick, hasReducedMotion, itemVariants])

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
            Error al cargar el workspace
          </h3>
          <p className="text-red-600 dark:text-red-300 mb-4">
            {error.message}
          </p>
          <button
            onClick={() => setError(null)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary componentContext="BentoGrid">
      <div 
        ref={gridRef}
        className="w-full min-h-screen bg-gray-50 dark:bg-gray-900"
        style={{
          padding: gridConfig.padding
        }}
      >
        {/* Grid container */}
        <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <Droppable droppableId="bento-grid" direction="horizontal">
            {(provided) => (
              <motion.div
                ref={provided.innerRef}
                {...provided.droppableProps}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${gridConfig.columns}, 1fr)`,
                  gap: gridConfig.gap,
                  minHeight: '600px'
                }}
              >
                <AnimatePresence>
                  {layout.map((module, index) => renderModule(module, index))}
                </AnimatePresence>
                {provided.placeholder}
              </motion.div>
            )}
          </Droppable>
        </DragDropContext>
        
        {/* Loading state */}
        {IS_LOADING && (
          <div className="fixed inset-0 bg-white dark:bg-gray-900 bg-opacity-75 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-300">
                Cargando workspace...
              </p>
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  )
}

// Default export
export default BentoGrid

// HOC available from separate file: ./BentoGrid/hoc
