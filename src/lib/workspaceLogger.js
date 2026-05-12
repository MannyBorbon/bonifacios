/**
 * Workspace Logger - Logging Estructurado con 5 Niveles + Observabilidad + Analytics + Event Sourcing
 * 
 * Niveles:
 * - ERROR: Errores críticos que requieren atención inmediata
 * - WARN: Advertencias que podrían indicar problemas
 * - INFO: Información general sobre operaciones del sistema
 * - DEBUG: Información detallada para debugging
 * - TRACE: Información ultra-detalles para tracing
 */

import { analyticsAPI } from '../services/api'

class WorkspaceLogger {
  constructor() {
    this.levels = {
      ERROR: 0,
      WARN: 1,
      INFO: 2,
      DEBUG: 3,
      TRACE: 4
    }
    
    this.currentLevel = this.levels.INFO
    this.enableConsole = true
    this.enableAnalytics = true
    this.enableEventSourcing = true
    this.sessionId = this.generateSessionId()
    this.userId = this.getCurrentUserId()
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  getCurrentUserId() {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}')
      return user.id || 'anonymous'
    } catch {
      return 'anonymous'
    }
  }

  shouldLog(level) {
    return level <= this.currentLevel
  }

  formatMessage(level, message, context = {}) {
    const timestamp = new Date().toISOString()
    const levelName = Object.keys(this.levels)[level]
    
    return {
      timestamp,
      level: levelName,
      message,
      context: {
        ...context,
        sessionId: this.sessionId,
        userId: this.userId,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    }
  }

  async log(level, message, context = {}) {
    if (!this.shouldLog(level)) return

    const logEntry = this.formatMessage(level, message, context)

    // Console logging
    if (this.enableConsole) {
      const consoleMethod = this.getConsoleMethod(level)
      consoleMethod(`[${logEntry.level}] ${message}`, logEntry.context)
    }

    // Analytics tracking
    if (this.enableAnalytics && level <= this.levels.WARN) {
      try {
        await analyticsAPI.track({
          event: 'workspace_log',
          data: {
            level: logEntry.level,
            message: message.substring(0, 200), // Limit message length
            context: {
              ...context,
              sessionId: this.sessionId,
              userId: this.userId
            }
          }
        })
      } catch (error) {
        // Avoid infinite loops - don't log analytics errors
        console.error('Failed to send analytics:', error)
      }
    }

    // Event Sourcing - Store critical events
    if (this.enableEventSourcing && level <= this.levels.ERROR) {
      try {
        this.storeEvent(logEntry)
      } catch (error) {
        console.error('Failed to store event:', error)
      }
    }

    return logEntry
  }

  getConsoleMethod(level) {
    switch (level) {
      case this.levels.ERROR:
        return console.error
      case this.levels.WARN:
        return console.warn
      case this.levels.INFO:
        return console.info
      case this.levels.DEBUG:
        return console.debug
      case this.levels.TRACE:
        return console.trace
      default:
        return console.log
    }
  }

  async storeEvent(logEntry) {
    // Store critical events in localStorage for Event Sourcing
    const events = JSON.parse(localStorage.getItem('workspaceEvents') || '[]')
    events.push({
      ...logEntry,
      eventId: this.generateEventId(),
      eventType: 'workspace_log',
      aggregateId: this.sessionId,
      aggregateType: 'workspace_session'
    })

    // Keep only last 100 events to prevent storage bloat
    if (events.length > 100) {
      events.splice(0, events.length - 100)
    }

    localStorage.setItem('workspaceEvents', JSON.stringify(events))
  }

  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  // Public API methods
  error(message, context = {}) {
    return this.log(this.levels.ERROR, message, context)
  }

  warn(message, context = {}) {
    return this.log(this.levels.WARN, message, context)
  }

  info(message, context = {}) {
    return this.log(this.levels.INFO, message, context)
  }

  debug(message, context = {}) {
    return this.log(this.levels.DEBUG, message, context)
  }

  trace(message, context = {}) {
    return this.log(this.levels.TRACE, message, context)
  }

  // Performance logging
  async performance(operation, startTime, context = {}) {
    const duration = Date.now() - startTime
    return this.info(`Performance: ${operation}`, {
      ...context,
      duration,
      performance: true
    })
  }

  // Error boundary logging
  errorBoundary(error, errorInfo, componentStack) {
    return this.error('React Error Boundary caught an error', {
      error: error.message,
      stack: error.stack,
      componentStack,
      errorBoundary: true
    })
  }

  // User action logging
  userAction(action, details = {}) {
    return this.info(`User Action: ${action}`, {
      ...details,
      userAction: true
    })
  }

  // API call logging
  apiCall(method, url, status, duration, error = null) {
    const level = status >= 400 ? this.levels.ERROR : this.levels.INFO
    const message = `API ${method} ${url} - ${status}`
    
    return this.log(level, message, {
      method,
      url,
      status,
      duration,
      error: error?.message,
      apiCall: true
    })
  }

  // Module-specific logging
  module(moduleName, message, context = {}) {
    return this.info(`[${moduleName}] ${message}`, {
      ...context,
      module: moduleName
    })
  }

  // Configuration
  setLevel(level) {
    this.currentLevel = typeof level === 'string' ? this.levels[level.toUpperCase()] : level
  }

  enableConsoleLogging(enabled) {
    this.enableConsole = enabled
  }

  enableAnalyticsTracking(enabled) {
    this.enableAnalytics = enabled
  }

  enableEventSourcingStorage(enabled) {
    this.enableEventSourcing = enabled
  }

  // Get stored events for Event Sourcing replay
  getStoredEvents() {
    try {
      return JSON.parse(localStorage.getItem('workspaceEvents') || '[]')
    } catch {
      return []
    }
  }

  // Clear stored events
  clearStoredEvents() {
    localStorage.removeItem('workspaceEvents')
  }

  // Get session statistics
  getSessionStats() {
    const events = this.getStoredEvents()
    const stats = {
      totalEvents: events.length,
      errors: events.filter(e => e.level === 'ERROR').length,
      warnings: events.filter(e => e.level === 'WARN').length,
      sessionDuration: Date.now() - parseInt(this.sessionId.split('_')[1]),
      userId: this.userId
    }

    return stats
  }
}

// Singleton instance
export const workspaceLogger = new WorkspaceLogger()

// Development helper - enable debug logging in development
if (import.meta.env.DEV) {
  workspaceLogger.setLevel(workspaceLogger.levels.DEBUG)
} else {
  workspaceLogger.setLevel(workspaceLogger.levels.INFO)
}

export default workspaceLogger
