/**
 * BentoGrid HOC - Higher Order Components
 * 
 * Separated from main component for better maintainability and fast refresh support
 */

import { ErrorBoundary } from '../ErrorBoundary'

// HOC for BentoGrid with error boundary
export function withBentoGrid(Component) {
  return function WithBentoGrid(props) {
    // Ensure Component is used to avoid ESLint warning
    const WrappedComponent = Component
    return (
      <ErrorBoundary componentContext="BentoGridWrapper">
        <WrappedComponent {...props} />
      </ErrorBoundary>
    )
  }
}
