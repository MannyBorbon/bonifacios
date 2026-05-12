import { MessageSquare } from 'lucide-react'
import Messages from '../Messages'

export default function WorkspaceChat() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-400/20 flex items-center justify-center">
          <MessageSquare size={18} className="text-amber-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Chat del equipo</h2>
          <p className="text-xs text-slate-400">Comunicacion interna en tiempo real</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 overflow-hidden">
        <Messages />
      </div>
    </div>
  )
}
