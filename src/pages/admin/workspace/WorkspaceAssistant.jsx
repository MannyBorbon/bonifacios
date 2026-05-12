import { useState, useCallback, useRef, useEffect } from 'react'
import { Sparkles, Send, User, Bot } from 'lucide-react'
import { workspaceAssistantAPI } from '../../../services/api'

const SUGGESTED_PROMPTS = [
  'como va la venta hoy',
  'cuantas mesas hubo hoy',
  'que personal falto hoy',
  'quien esta de vacaciones',
]

export default function WorkspaceAssistant() {
  const [messages, setMessages] = useState([
    {
      id: 'assistant-welcome',
      role: 'assistant',
      content: 'Hola, soy tu asistente operativo. Puedes preguntarme: "como va la venta", "cuantas mesas hubo hoy", "que personal falto hoy" o "quien esta de vacaciones".',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, loading])

  const askAssistant = useCallback(async () => {
    const question = input.trim()
    if (!question || loading) return
    const userMsg = { id: `user-${Date.now()}`, role: 'user', content: question }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await workspaceAssistantAPI.ask(question)
      const answer = res.data?.answer || 'No pude responder esa consulta en este momento.'
      setMessages(prev => [...prev, { id: `assistant-${Date.now()}`, role: 'assistant', content: answer }])
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `assistant-error-${Date.now()}`,
          role: 'assistant',
          content: err?.response?.data?.error || 'Error consultando al asistente. Intenta de nuevo.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }, [input, loading])

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-400/20 flex items-center justify-center">
          <Sparkles size={18} className="text-indigo-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Asistente AI</h2>
          <p className="text-xs text-slate-400">Control conversacional de operacion en lenguaje natural</p>
        </div>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-4 space-y-3 min-h-0">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20'
                : 'bg-gradient-to-br from-indigo-500/20 to-violet-500/20'
            }`}>
              {message.role === 'user' ? <User size={12} className="text-cyan-400" /> : <Bot size={12} className="text-indigo-400" />}
            </div>
            <div className={`max-w-[85%] sm:max-w-[80%] rounded-xl px-3.5 sm:px-4 py-2.5 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-100'
                : 'bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/30 text-slate-200'
            }`}>
              {message.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center shrink-0">
              <Bot size={12} className="text-indigo-400" />
            </div>
            <div className="rounded-xl bg-gradient-to-br from-slate-800/60 to-slate-800/40 border border-slate-700/30 px-4 py-2.5 text-sm text-slate-400">
              <span className="inline-flex gap-1">
                <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
              </span>
              <span className="ml-2">Analizando datos operativos...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested prompts */}
      <div className="flex gap-2 mt-3 shrink-0 overflow-x-auto pb-1 -mx-1 px-1 sm:flex-wrap sm:overflow-x-visible">
        {SUGGESTED_PROMPTS.map(prompt => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="rounded-lg border border-slate-700/40 bg-slate-800/40 px-3 py-2 sm:px-2.5 sm:py-1.5 text-[11px] text-slate-400 hover:text-indigo-300 hover:border-indigo-500/30 active:bg-indigo-500/10 transition-all touch-manipulation whitespace-nowrap shrink-0 sm:shrink min-h-[36px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input area */}
      <div className="flex gap-2 mt-3 shrink-0 pb-1">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); askAssistant() } }}
          placeholder="Pregunta al asistente..."
          className="flex-1 rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:border-indigo-500/40 focus:outline-none transition-colors min-h-[44px]"
        />
        <button
          onClick={askAssistant}
          disabled={loading || !input.trim()}
          className="rounded-xl border border-indigo-500/30 bg-gradient-to-br from-indigo-500/15 to-violet-500/15 px-4 py-3 sm:py-2.5 text-indigo-300 hover:from-indigo-500/25 hover:to-violet-500/25 disabled:opacity-40 transition-all touch-manipulation min-w-[44px] min-h-[44px] flex items-center justify-center"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
