import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicTracker from '../components/PublicTracker'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function Menu() {
  const [categories, setCategories] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const scrollRef = useRef(null)
  const itemsRef = useRef(null)

  useEffect(() => {
    fetch(`${API_URL}/menu/categories.php?type=menu`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.categories?.length) {
          setCategories(data.categories)
          setActiveCategory(data.categories[0].id)
        }
      })
      .catch(err => console.error('Error loading menu:', err))
      .finally(() => setLoadingMenu(false))
  }, [])

  const currentCat = categories.find(c => c.id === activeCategory)

  const scrollCat = (dir) => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir * 180, behavior: 'smooth' })
  }

  const scrollItems = (dir) => {
    if (itemsRef.current) itemsRef.current.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
      <PublicTracker />
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#D4AF37]/5 blur-[120px]" />
        <div className="absolute bottom-0 -left-48 h-[500px] w-[500px] rounded-full bg-[#C9A961]/5 blur-[110px]" />
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgyMTIsMTc1LDU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40 pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-40 border-b border-[#D4AF37]/10 bg-black/30 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <img src="/logo-premium.svg" alt="Bonifacio's" className="h-10 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/" className="rounded-lg border border-[#D4AF37]/20 bg-black/30 px-4 py-2 text-xs text-[#D4AF37]/60 hover:text-[#D4AF37] hover:border-[#D4AF37]/40 transition-all">
                ← Inicio
              </Link>
              <Link to="/cotizador" className="rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all">
                🎉 Cotizar Evento
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-10 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="mb-4 inline-flex rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-5 py-2">
            <span className="text-xs tracking-[0.3em] uppercase text-[#D4AF37]/60">Menú</span>
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-light text-[#F4E4C1]">Nuestra Carta</h1>
          <p className="mt-4 text-sm text-[#F4E4C1]/40 max-w-md mx-auto">
            Cocina internacional con alma mexicana. Cada platillo refleja nuestra pasión por los sabores auténticos.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4">
            <div className="h-px w-20 bg-gradient-to-r from-transparent to-[#D4AF37]/30" />
            <svg className="h-1.5 w-1.5 text-[#D4AF37]" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3" /></svg>
            <div className="h-px w-20 bg-gradient-to-l from-transparent to-[#D4AF37]/30" />
          </div>
        </div>

        {loadingMenu && <p className="text-center text-xs text-[#D4AF37]/50 animate-pulse mb-8">Cargando menú...</p>}
        {!loadingMenu && categories.length === 0 && (
          <div className="text-center rounded-xl border border-[#D4AF37]/20 bg-black/40 p-10 mb-8">
            <p className="text-sm text-[#F4E4C1]/40">El menú se actualizará próximamente.</p>
            <p className="text-xs text-[#F4E4C1]/20 mt-2">Contáctanos para conocer nuestras opciones.</p>
          </div>
        )}

        {/* Category carousel */}
        {categories.length > 0 && (<>
        <div className="relative mb-10">
          <button onClick={() => scrollCat(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all">
            ‹
          </button>
          <div ref={scrollRef} className="flex gap-3 overflow-x-auto scrollbar-hide px-10 pb-2 snap-x" style={{ scrollbarWidth: 'none' }}>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`snap-start flex-shrink-0 flex flex-col items-center gap-1 rounded-xl border px-5 py-3 transition-all duration-300 ${
                  activeCategory === cat.id
                    ? 'border-[#D4AF37] bg-[#D4AF37]/15 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                    : 'border-[#D4AF37]/10 bg-black/30 text-[#F4E4C1]/50 hover:border-[#D4AF37]/25 hover:text-[#F4E4C1]'
                }`}
              >
                <span className="text-2xl">{cat.icon}</span>
                <span className="text-xs whitespace-nowrap font-medium">{cat.label}</span>
              </button>
            ))}
          </div>
          <button onClick={() => scrollCat(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all">
            ›
          </button>
        </div>

        {/* Category title */}
        <div className="mb-6">
          <h2 className="font-serif text-2xl font-light text-[#F4E4C1]">
            <span className="mr-3 text-3xl">{currentCat?.icon}</span>
            {currentCat?.label}
          </h2>
          <p className="mt-1 text-xs text-[#F4E4C1]/40">{currentCat?.description}</p>
        </div>

        {/* Items carousel */}
        <div className="relative">
          <button onClick={() => scrollItems(-1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all shadow-xl">
            ‹
          </button>
          <div ref={itemsRef} className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 snap-x px-2" style={{ scrollbarWidth: 'none' }}>
            {currentCat?.items.map((item, idx) => (
              <div
                key={idx}
                className="snap-start flex-shrink-0 w-[280px] sm:w-[300px] group rounded-2xl border border-[#D4AF37]/10 bg-gradient-to-b from-black/50 to-black/30 p-5 backdrop-blur-md transition-all duration-500 hover:border-[#D4AF37]/30 hover:shadow-lg hover:shadow-[#D4AF37]/5"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-serif text-base font-medium text-[#F4E4C1] leading-tight group-hover:text-[#D4AF37] transition-colors">{item.name}</h3>
                </div>
                <p className="text-xs text-[#F4E4C1]/40 leading-relaxed mb-4">{item.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="font-serif text-xl font-medium text-[#D4AF37]">${item.price}</span>
                  <span className="text-[9px] text-[#F4E4C1]/20 uppercase tracking-wider">MXN</span>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => scrollItems(1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/80 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all shadow-xl">
            ›
          </button>
        </div>

        {/* Also show grid view */}
        <div className="mt-12">
          <h3 className="text-xs uppercase tracking-[0.2em] text-[#D4AF37]/40 mb-4">Vista completa — {currentCat?.label}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {currentCat?.items.map((item, idx) => (
              <div key={idx} className="flex items-start justify-between gap-3 rounded-xl border border-[#D4AF37]/8 bg-black/30 p-4 transition-all hover:border-[#D4AF37]/20">
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-medium text-[#F4E4C1]/80">{item.name}</h4>
                  <p className="mt-1 text-[10px] text-[#F4E4C1]/30 leading-relaxed">{item.desc}</p>
                </div>
                <span className="font-serif text-sm font-medium text-[#D4AF37] flex-shrink-0">${item.price}</span>
              </div>
            ))}
          </div>
        </div>
        </>)}

        {/* CTA */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <a
              href="https://wa.me/526221738884?text=Hola%2C%20me%20gustaría%20hacer%20una%20reservación%20en%20Bonifacio%27s%20Restaurant."
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/90 via-[#F4E4C1]/80 to-[#D4AF37]/90 px-8 py-3.5 font-serif text-sm font-medium tracking-wider text-black shadow-xl shadow-[#D4AF37]/20 transition-all duration-500 hover:scale-105 hover:shadow-[#D4AF37]/40"
            >
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Reservar ahora
            </a>
            <Link
              to="/cotizador"
              className="rounded-full border border-[#D4AF37]/20 bg-black/40 px-8 py-3.5 font-serif text-sm tracking-wider text-[#D4AF37]/80 backdrop-blur-md transition-all hover:border-[#D4AF37]/40 hover:text-[#D4AF37] hover:bg-black/60"
            >
              🎉 Cotizar Evento
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-[#D4AF37]/10 pt-8 text-center">
          <p className="font-serif text-xs font-light tracking-[0.2em] text-[#D4AF37]/40">
            © {new Date().getFullYear()} BONIFACIO'S RESTAURANT · SAN CARLOS, SONORA
          </p>
          <p className="mt-2 text-[9px] text-[#F4E4C1]/20">Precios en MXN · Sujetos a cambio sin previo aviso</p>
        </div>
      </div>
    </div>
  )
}

export default Menu
