/**
 * BentoGrid Constants - Motion Tokens + Grid Configurations
 * 
 * Separated from main component for better maintainability and fast refresh support
 */

// Motion tokens configuration
export const MOTION_TOKENS = {
  // Stagger animations for grid items
  stagger: {
    container: 0.1,
    item: 0.05,
    content: 0.02
  },
  
  // Spring animations for interactions
  spring: {
    gentle: { type: 'spring', stiffness: 300, damping: 30 },
    bouncy: { type: 'spring', stiffness: 400, damping: 10 },
    smooth: { type: 'spring', stiffness: 200, damping: 40 }
  },
  
  // Tween animations for transitions
  tween: {
    fast: { duration: 0.2, ease: 'easeOut' },
    normal: { duration: 0.3, ease: 'easeInOut' },
    slow: { duration: 0.5, ease: 'easeInOut' }
  },
  
  // Layout animations
  layout: {
    shift: { type: 'tween', duration: 0.4, ease: 'easeInOut' },
    resize: { type: 'spring', stiffness: 400, damping: 25 }
  }
}

// Grid configurations for different screen sizes
export const GRID_CONFIGS = {
  mobile: {
    columns: 1,
    gap: 16,
    padding: 16
  },
  tablet: {
    columns: 2,
    gap: 20,
    padding: 20
  },
  desktop: {
    columns: 4,
    gap: 24,
    padding: 24
  },
  wide: {
    columns: 6,
    gap: 24,
    padding: 24
  }
}

// Module size configurations
export const MODULE_SIZES = {
  small: { span: 1, height: 200 },
  medium: { span: 2, height: 300 },
  large: { span: 3, height: 400 },
  full: { span: 4, height: 500 }
}
