import { createContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export { ThemeContext }

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('workspace-theme')
    return saved || 'dark'
  })

  useEffect(() => {
    localStorage.setItem('workspace-theme', theme)
    document.documentElement.classList.toggle('light-theme', theme === 'light')
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark')
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
