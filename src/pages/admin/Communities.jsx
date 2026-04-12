import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'

export default function Communities() {
  const [communities, setCommunities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      setLoading(true)
      try {
        const r = await fetch(`${import.meta.env.VITE_API_URL}/communities/`, { credentials: 'include' })
        const d = await r.json()
        if (!cancelled && d.success) setCommunities(Array.isArray(d.communities) ? d.communities : [])
      } catch (err) {
        console.error('Error loading communities:', err)
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center h-96">
      <div className="text-violet-400/60 text-sm animate-pulse">Cargando comunidades...</div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-white mb-1">Comunidades</h1>
          <p className="text-sm text-slate-400">{communities.length} comunidades registradas</p>
        </div>
        <Link to="/admin/dashboard" className="px-4 py-2 rounded-lg border border-slate-600/50 bg-slate-700/20 text-slate-300 hover:bg-slate-700/40 transition-all text-sm">
          ← Volver
        </Link>
      </div>

      {/* Communities Grid */}
      {communities.length === 0 ? (
        <div className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-[#030b18] to-[#050e1e] p-12 text-center">
          <p className="text-slate-500">No hay comunidades registradas</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {communities.map((c, i) => (
            <div key={c.id || i} className="group relative overflow-hidden rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/5 to-purple-500/5 p-5 hover:border-violet-400/40 hover:shadow-lg hover:shadow-violet-500/10 transition-all duration-300">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
              
              {/* Avatar */}
              <div className="mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-violet-500/30 to-purple-500/30 border-2 border-violet-400/30 flex items-center justify-center">
                  <span className="text-2xl font-medium text-violet-200">{c.name?.charAt(0)?.toUpperCase() || '?'}</span>
                </div>
              </div>

              {/* Info */}
              <div>
                <h3 className="text-base font-medium text-white mb-1 truncate">{c.name || 'Sin nombre'}</h3>
                <p className="text-xs text-slate-400 mb-3 line-clamp-2">{c.description || 'Sin descripción'}</p>
                
                {/* Status badge */}
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium ${
                    c.status === 'vip' ? 'bg-amber-500/15 text-amber-300 border border-amber-400/30' :
                    c.status === 'activo' ? 'bg-green-500/15 text-green-300 border border-green-400/30' :
                    'bg-slate-500/15 text-slate-400 border border-slate-400/30'
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      c.status === 'vip' ? 'bg-amber-400' :
                      c.status === 'activo' ? 'bg-green-400' :
                      'bg-slate-400'
                    }`} />
                    {c.status === 'vip' ? 'VIP' : c.status === 'activo' ? 'Activo' : 'Inactivo'}
                  </span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
