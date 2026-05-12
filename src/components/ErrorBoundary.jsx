/**
 * Error Boundary Component - Protocolo de Resolución de Errores + Logging Estructurado + Observabilidad + Analytics + Event Sourcing
 * 
 * Protocolo de 6 pasos:
 * 1. Capturar el error y el error info
 * 2. Loggear el error con contexto completo
 * 3. Enviar analytics del error
 * 4. Almacenar en Event Sourcing
 * 5. Mostrar UI fallback accesible
 * 6. Intentar recuperación automática si es posible
 */

import React, { Component } from 'react'
import { workspaceLogger } from '../lib/workspaceLogger'
import { analyticsAPI } from '../services/api'

class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    }
    
    this.maxRetries = props.maxRetries || 3
    this.fallbackComponent = props.fallback || DefaultErrorFallback
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
      errorId: this.generateErrorId?.() || null
    }
  }

  componentDidCatch(error, errorInfo) {
    const errorId = this.generateErrorId()
    
    // Update state with error info
    this.setState({
      error,
      errorInfo,
      errorId
    })

    // Protocolo de resolución de errores - Paso 1: Capturar
    this.handleError(error, errorInfo, errorId)
  }

  generateErrorId() {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  async handleError(error, errorInfo, errorId) {
    const { onError, componentContext } = this.props

    try {
      // Paso 2: Loggear con contexto completo
      workspaceLogger.errorBoundary(error, errorInfo, errorInfo.componentStack)

      // Paso 3: Enviar analytics
      await this.sendErrorAnalytics(error, errorInfo, errorId)

      // Paso 4: Almacenar en Event Sourcing
      await this.storeErrorEvent(error, errorInfo, errorId)

      // Paso 5: Notificar al componente padre si hay callback
      if (onError) {
        onError(error, errorInfo, errorId)
      }

    } catch (handlingError) {
      // Evitar loops infinitos - loggear silenciosamente
      console.error('Error in error boundary handling:', handlingError)
    }
  }

  async sendErrorAnalytics(error, errorInfo, errorId) {
    try {
      await analyticsAPI.track({
        event: 'error_boundary_triggered',
        data: {
          errorId,
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          componentContext: this.props.componentContext,
          userId: workspaceLogger.userId,
          sessionId: workspaceLogger.sessionId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString()
        }
      })
    } catch (analyticsError) {
      console.error('Failed to send error analytics:', analyticsError)
    }
  }

  async storeErrorEvent(error, errorInfo, errorId) {
    try {
      const errorEvent = {
        eventId: errorId,
        eventType: 'error_boundary_triggered',
        aggregateId: workspaceLogger.sessionId,
        aggregateType: 'workspace_session',
        version: 1,
        occurredAt: new Date().toISOString(),
        data: {
          errorMessage: error.message,
          errorStack: error.stack,
          componentStack: errorInfo.componentStack,
          componentContext: this.props.componentContext,
          errorBoundaryId: this.props.id || 'default'
        },
        metadata: {
          userId: workspaceLogger.userId,
          sessionId: workspaceLogger.sessionId,
          url: window.location.href,
          userAgent: navigator.userAgent,
          correlationId: this.props.correlationId
        }
      }

      // Store in localStorage for Event Sourcing
      const events = JSON.parse(localStorage.getItem('workspaceEvents') || '[]')
      events.push(errorEvent)

      // Keep only last 100 events
      if (events.length > 100) {
        events.splice(0, events.length - 100)
      }

      localStorage.setItem('workspaceEvents', JSON.stringify(events))
    } catch (storageError) {
      console.error('Failed to store error event:', storageError)
    }
  }

  handleRetry = () => {
    const { retryCount } = this.state

    if (retryCount < this.maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: null,
        retryCount: prevState.retryCount + 1,
        isRecovering: true
      }))

      // Log retry attempt
      workspaceLogger.info('Error boundary retry attempt', {
        retryCount: retryCount + 1,
        maxRetries: this.maxRetries,
        componentContext: this.props.componentContext
      })

      // Send retry analytics
      analyticsAPI.track({
        event: 'error_boundary_retry',
        data: {
          retryCount: retryCount + 1,
          maxRetries: this.maxRetries,
          componentContext: this.props.componentContext
        }
      }).catch(console.error)

    } else {
      // Max retries reached
      workspaceLogger.error('Error boundary max retries reached', {
        retryCount,
        maxRetries: this.maxRetries,
        componentContext: this.props.componentContext
      })
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
      retryCount: 0,
      isRecovering: false
    })

    workspaceLogger.info('Error boundary manually reset', {
      componentContext: this.props.componentContext
    })
  }

  render() {
    const { hasError, error, errorInfo, errorId, retryCount, isRecovering } = this.state
    const { children, fallback, componentContext } = this.props

    if (hasError) {
      const FallbackComponent = fallback || this.fallbackComponent
      
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          errorId={errorId}
          retryCount={retryCount}
          maxRetries={this.maxRetries}
          isRecovering={isRecovering}
          onRetry={this.handleRetry}
          onReset={this.handleReset}
          componentContext={componentContext}
        />
      )
    }

    return children
  }
}

// Default Fallback Component
function DefaultErrorFallback({
  error,
  errorInfo,
  errorId,
  retryCount,
  maxRetries,
  isRecovering,
  onRetry,
  onReset,
  componentContext
}) {
  const canRetry = retryCount < maxRetries
  const showRetry = canRetry && !isRecovering

  return (
    <div 
      className="min-h-[200px] flex items-center justify-center p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
      role="alert"
      aria-live="polite"
    >
      <div className="text-center max-w-md">
        {/* Icon */}
        <div className="mb-4">
          <svg 
            className="w-16 h-16 mx-auto text-red-500 dark:text-red-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
            />
          </svg>
        </div>

        {/* Error Message */}
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-200 mb-2">
          Algo salió mal
        </h2>
        
        <p className="text-red-600 dark:text-red-300 mb-4 text-sm">
          {componentContext ? `Error en ${componentContext}: ` : ''}
          {error?.message || 'Ha ocurrido un error inesperado'}
        </p>

        {/* Error ID for debugging */}
        {errorId && (
          <p className="text-xs text-red-500 dark:text-red-400 mb-4">
            ID de error: {errorId}
          </p>
        )}

        {/* Retry Info */}
        {retryCount > 0 && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-4">
            Intentos de recuperación: {retryCount}/{maxRetries}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 justify-center">
          {showRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              aria-label="Intentar recuperar el componente"
            >
              Reintentar
            </button>
          )}
          
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            aria-label="Reiniciar el componente"
          >
            Reiniciar
          </button>
        </div>

        {/* Recovery State */}
        {isRecovering && (
          <div className="mt-4">
            <div className="inline-flex items-center text-sm text-red-600 dark:text-red-400">
              <svg 
                className="animate-spin -ml-1 mr-2 h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24"
              >
                <circle 
                  className="opacity-25" 
                  cx="12" 
                  cy="12" 
                  r="10" 
                  stroke="currentColor" 
                  strokeWidth="4"
                />
                <path 
                  className="opacity-75" 
                  fill="currentColor" 
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Recuperando...
            </div>
          </div>
        )}

        {/* Development Details */}
        {import.meta.env.DEV && errorInfo && (
          <details className="mt-4 text-left">
            <summary className="text-xs text-red-500 dark:text-red-400 cursor-pointer">
              Detalles técnicos (desarrollo)
            </summary>
            <pre className="mt-2 text-xs text-red-600 dark:text-red-300 bg-red-100 dark:bg-red-900/30 p-2 rounded overflow-auto max-h-32">
              {errorInfo.componentStack}
            </pre>
          </details>
        )}
      </div>
    </div>
  )
}

// HOC for wrapping components with Error Boundary
export function withErrorBoundary(Component, options = {}) {
  return function WrappedWithErrorBoundary(props) {
    return (
      <ErrorBoundary {...options}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}

// Hook for using Error Boundary in functional components
export function useErrorBoundary() {
  const [error, setError] = React.useState(null)
  const [errorInfo, setErrorInfo] = React.useState(null)

  const resetError = React.useCallback(() => {
    setError(null)
    setErrorInfo(null)
  }, [])

  const captureError = React.useCallback((error, errorInfo) => {
    setError(error)
    setErrorInfo(errorInfo)
  }, [])

  return {
    error,
    errorInfo,
    resetError,
    captureError
  }
}

export default ErrorBoundary
