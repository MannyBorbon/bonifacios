import { Video } from 'lucide-react'
import Meetings from '../Meetings'

export default function WorkspaceMeetings() {
  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-400/20 flex items-center justify-center">
          <Video size={18} className="text-rose-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Reuniones</h2>
          <p className="text-xs text-slate-400">Planificacion, ejecucion y minutas del equipo</p>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 overflow-hidden">
        <Meetings />
      </div>
    </div>
  )
}
