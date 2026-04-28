import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import PublicTracker from '../components/PublicTracker'

const API_URL = import.meta.env.VITE_API_URL || '/api'

function EventQuote() {
  const [categories, setCategories] = useState([])
  const [loadingMenu, setLoadingMenu] = useState(true)
  const [activeCategory, setActiveCategory] = useState(null)
  const [cart, setCart] = useState({})
  const [contact, setContact] = useState({ name: '', phone: '', email: '', type: '', date: '', guests: '', notes: '' })
  const [showSummary, setShowSummary] = useState(false)
  const [menuError, setMenuError] = useState('')
  const [formError, setFormError] = useState('')
  const carouselRef = useRef(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_URL}/menu/categories.php?type=event`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.categories?.length) {
          setCategories(data.categories)
          setActiveCategory(data.categories[0].id)
          return
        }
        setMenuError('No se encontraron productos disponibles para cotizar.')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setMenuError('No fue posible cargar el catálogo de eventos. Intenta de nuevo.')
        }
      })
      .finally(() => setLoadingMenu(false))
    
    return () => controller.abort()
  }, [])

  const phoneE164Mx = '526221738884'

  const eventTypes = ['Boda', 'Bautizo', 'Cumpleaños', 'Aniversario', 'Baby Shower', 'Evento Corporativo', 'Graduación', 'Otro']

  const addToCart = (item) => {
    setCart(prev => ({
      ...prev,
      [item.id]: { ...item, qty: (prev[item.id]?.qty || 0) + 1 }
    }))
  }

  const removeFromCart = (itemId) => {
    setCart(prev => {
      const updated = { ...prev }
      if (updated[itemId]) {
        updated[itemId] = { ...updated[itemId], qty: updated[itemId].qty - 1 }
        if (updated[itemId].qty <= 0) delete updated[itemId]
      }
      return updated
    })
  }

  const setQty = (itemId, qty) => {
    const safeQty = Number.isFinite(qty) ? Math.max(0, Math.min(999, qty)) : 0

    if (safeQty <= 0) {
      setCart(prev => { const u = { ...prev }; delete u[itemId]; return u })
    } else {
      setCart(prev => ({ ...prev, [itemId]: { ...prev[itemId], qty: safeQty } }))
    }
  }

  const cartItems = Object.values(cart)
  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0)
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.qty, 0)

  const currentCat = categories.find(c => c.id === activeCategory)

  const scrollCarousel = (dir) => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: dir * 200, behavior: 'smooth' })
    }
  }

  const handleSubmitWhatsApp = () => {
    if (!contact.name || !contact.phone || !contact.type || !contact.date) {
      setFormError('Completa nombre, teléfono, tipo y fecha del evento.')
      return
    }
    if (cartItems.length === 0) {
      setFormError('Agrega al menos un producto antes de enviar la cotización.')
      return
    }
    setFormError('')

    let msg = `🎉 *COTIZACIÓN DE EVENTO - Bonifacio's Restaurant*\n\n`
    msg += `👤 *Cliente:* ${contact.name}\n📞 *Tel:* ${contact.phone}\n📧 *Email:* ${contact.email || 'N/A'}\n🎊 *Tipo:* ${contact.type}\n📅 *Fecha:* ${contact.date}\n👥 *Invitados:* ${contact.guests || 'N/A'}\n\n`
    msg += `📋 *PRODUCTOS SELECCIONADOS:*\n`
    msg += `${'─'.repeat(30)}\n`
    cartItems.forEach(item => {
      msg += `• ${item.name} x${item.qty} — $${(item.price * item.qty).toLocaleString()} MXN\n`
    })
    msg += `${'─'.repeat(30)}\n`
    msg += `💰 *TOTAL ESTIMADO: $${totalPrice.toLocaleString()} MXN*\n`
    if (contact.notes) msg += `\n📝 *Notas:* ${contact.notes}`
    window.open(`https://wa.me/${phoneE164Mx}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
      <PublicTracker />
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
              <button
                onClick={() => setShowSummary(!showSummary)}
                className="relative rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-4 py-2 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/20 transition-all"
              >
                🛒 Cotización {totalItems > 0 && <span className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#D4AF37] text-[10px] font-bold text-black">{totalItems}</span>}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 py-8 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-[#F4E4C1]">Cotizador de Eventos</h1>
          <p className="mt-3 text-sm text-[#F4E4C1]/50 max-w-lg mx-auto">
            Selecciona los productos y servicios para tu evento. El precio se calcula en tiempo real.
          </p>
          {loadingMenu && <p className="mt-4 text-xs text-[#D4AF37]/50 animate-pulse">Cargando productos...</p>}
          {menuError && (
            <p className="mt-4 text-xs text-red-400/90">{menuError}</p>
          )}
          {!loadingMenu && categories.length === 0 && (
            <div className="mt-8 rounded-xl border border-[#D4AF37]/20 bg-black/40 p-8">
              <p className="text-sm text-[#F4E4C1]/40">No hay productos disponibles todavía.</p>
              <p className="text-xs text-[#F4E4C1]/20 mt-2">Los productos se agregarán próximamente.</p>
            </div>
          )}
          {/* Live total bar */}
          <div className="mt-6 inline-flex items-center gap-4 rounded-full border border-[#D4AF37]/30 bg-black/50 px-6 py-3 backdrop-blur-md">
            <span className="text-xs text-[#F4E4C1]/50">Total estimado:</span>
            <span className="font-serif text-xl font-medium text-[#D4AF37]">${totalPrice.toLocaleString()} <span className="text-xs text-[#D4AF37]/60">MXN</span></span>
            <span className="text-xs text-[#F4E4C1]/30">({totalItems} items)</span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left: Categories + Products */}
          <div className="flex-1 min-w-0">
            {/* Category carousel */}
            <div className="relative mb-6">
              <button onClick={() => scrollCarousel(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all sm:hidden">
                ‹
              </button>
              <div ref={carouselRef} className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 px-1 snap-x" style={{ scrollbarWidth: 'none' }}>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setActiveCategory(cat.id)}
                    className={`snap-start flex-shrink-0 flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition-all duration-300 ${
                      activeCategory === cat.id
                        ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                        : 'border-[#D4AF37]/15 bg-black/30 text-[#F4E4C1]/60 hover:border-[#D4AF37]/30 hover:text-[#F4E4C1]'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <span className="whitespace-nowrap">{cat.label}</span>
                  </button>
                ))}
              </div>
              <button onClick={() => scrollCarousel(1)} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-[#D4AF37] border border-[#D4AF37]/20 hover:bg-[#D4AF37]/20 transition-all sm:hidden">
                ›
              </button>
            </div>

            {/* Products grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {currentCat?.items.map(item => {
                const inCart = cart[item.id]
                return (
                  <div
                    key={item.id}
                    className={`group relative overflow-hidden rounded-xl border p-4 backdrop-blur-md transition-all duration-300 ${
                      inCart
                        ? 'border-[#D4AF37]/40 bg-[#D4AF37]/10'
                        : 'border-[#D4AF37]/10 bg-black/40 hover:border-[#D4AF37]/25'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#F4E4C1] leading-tight">{item.name}</h4>
                        <p className="mt-1 text-[10px] text-[#F4E4C1]/40 uppercase tracking-wider">{item.unit}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-serif text-lg font-medium text-[#D4AF37]">${item.price.toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      {inCart ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-black/40 text-[#D4AF37] text-sm hover:bg-red-500/20 hover:border-red-500/30 hover:text-red-400 transition-all"
                          >
                            −
                          </button>
                          <input
                            type="number"
                            value={inCart.qty}
                            min={0}
                            max={999}
                            onChange={(e) => setQty(item.id, parseInt(e.target.value, 10) || 0)}
                            className="w-12 rounded-lg border border-[#D4AF37]/20 bg-black/40 px-2 py-1 text-center text-sm text-[#F4E4C1] focus:outline-none focus:border-[#D4AF37]/40"
                          />
                          <button
                            onClick={() => addToCart(item)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/10 text-[#D4AF37] text-sm hover:bg-[#D4AF37]/20 transition-all"
                          >
                            +
                          </button>
                          <span className="ml-2 text-xs text-[#D4AF37]/70">${(item.price * inCart.qty).toLocaleString()}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(item)}
                          className="rounded-lg border border-[#D4AF37]/20 bg-[#D4AF37]/10 px-4 py-1.5 text-xs text-[#D4AF37] hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/40 transition-all"
                        >
                          + Agregar
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Right: Summary sidebar (desktop always visible, mobile toggled) */}
          <div className={`lg:w-96 lg:flex-shrink-0 ${showSummary ? 'block' : 'hidden lg:block'}`}>
            <div className="sticky top-4 rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-b from-black/60 to-black/40 p-6 backdrop-blur-xl">
              <h3 className="font-serif text-lg font-light text-[#F4E4C1] mb-4">Resumen de Cotización</h3>

              {/* Cart items */}
              {cartItems.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm text-[#F4E4C1]/30">Agrega productos para comenzar</p>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-1">
                  {cartItems.map(item => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-[#D4AF37]/10 bg-black/30 px-3 py-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-[#F4E4C1]/80 truncate">{item.name}</p>
                        <p className="text-[10px] text-[#F4E4C1]/40">x{item.qty} · ${item.price.toLocaleString()} c/u</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-[#D4AF37]">${(item.price * item.qty).toLocaleString()}</span>
                        <button onClick={() => setQty(item.id, 0)} className="text-red-400/50 hover:text-red-400 text-xs transition-colors">✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Total */}
              <div className="border-t border-[#D4AF37]/20 pt-4 mb-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#F4E4C1]/60">Total Estimado</span>
                  <span className="font-serif text-2xl font-medium text-[#D4AF37]">${totalPrice.toLocaleString()}</span>
                </div>
                <p className="text-[10px] text-[#F4E4C1]/30 mt-1">MXN · Precios sujetos a confirmación</p>
              </div>

              {/* Contact form */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase tracking-widest text-[#D4AF37]/50">Datos de contacto</h4>
                <input
                  type="text"
                  placeholder="Nombre completo *"
                  value={contact.name}
                  onChange={(e) => setContact({ ...contact, name: e.target.value })}
                  className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    placeholder="Teléfono *"
                    value={contact.phone}
                    onChange={(e) => setContact({ ...contact, phone: e.target.value })}
                    className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={contact.email}
                    onChange={(e) => setContact({ ...contact, email: e.target.value })}
                    className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={contact.type}
                    onChange={(e) => setContact({ ...contact, type: e.target.value })}
                    className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                  >
                    <option value="" className="bg-[#1a1a1f]">Tipo de evento *</option>
                    {eventTypes.map(t => <option key={t} value={t} className="bg-[#1a1a1f]">{t}</option>)}
                  </select>
                  <input
                    type="date"
                    value={contact.date}
                    onChange={(e) => setContact({ ...contact, date: e.target.value })}
                    className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                  />
                </div>
                <input
                  type="number"
                  placeholder="Número de invitados"
                  value={contact.guests}
                  onChange={(e) => setContact({ ...contact, guests: e.target.value })}
                  className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 focus:border-[#D4AF37]/40 focus:outline-none transition-colors"
                />
                <textarea
                  placeholder="Notas adicionales..."
                  value={contact.notes}
                  onChange={(e) => setContact({ ...contact, notes: e.target.value })}
                  rows={2}
                  className="w-full rounded-lg border border-[#D4AF37]/15 bg-black/40 px-3 py-2.5 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 focus:border-[#D4AF37]/40 focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmitWhatsApp}
                disabled={!contact.name || !contact.phone || !contact.type || !contact.date || cartItems.length === 0}
                className="mt-4 w-full group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/90 via-[#F4E4C1]/80 to-[#D4AF37]/90 px-6 py-3.5 font-serif text-sm font-medium tracking-wider text-black shadow-2xl shadow-[#D4AF37]/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-[#D4AF37]/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                Enviar Cotización por WhatsApp
              </button>
              {formError && (
                <p className="mt-2 text-center text-[11px] text-red-400">{formError}</p>
              )}
              <p className="mt-2 text-center text-[9px] text-[#F4E4C1]/25">Los precios son estimados y están sujetos a confirmación</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-16 border-t border-[#D4AF37]/10 pt-8 text-center">
          <p className="font-serif text-xs font-light tracking-[0.2em] text-[#D4AF37]/40">
            © {new Date().getFullYear()} BONIFACIO'S RESTAURANT · SAN CARLOS, SONORA
          </p>
        </div>
      </div>

      {/* Mobile floating total bar */}
      {totalItems > 0 && (
        <div className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-[#D4AF37]/20 bg-black/90 backdrop-blur-xl px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-[#F4E4C1]/50">{totalItems} items</p>
              <p className="font-serif text-lg font-medium text-[#D4AF37]">${totalPrice.toLocaleString()} MXN</p>
            </div>
            <button
              onClick={() => setShowSummary(true)}
              className="rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 px-5 py-2.5 text-sm text-[#D4AF37] hover:bg-[#D4AF37]/30 transition-all"
            >
              Ver Cotización →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default EventQuote
