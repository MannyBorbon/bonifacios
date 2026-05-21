import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PublicTracker from '../components/PublicTracker'

function Home() {
  const [language, setLanguage] = useState('es')
  const [showAward, setShowAward] = useState(false)
  const [activeHomeEvent, setActiveHomeEvent] = useState(null)

  const phoneDisplay = '622 173 8884'
  const phoneE164Mx = '526221738884'

  const translations = {
    es: {
      tagline: 'Cocina internacional · Ambiente exclusivo · Experiencia gastronómica',
      cta: 'RESERVACIONES',
      jobBoard: 'BOLSA DE TRABAJO',
      joinTeam: 'Únete al equipo - Click aquí',
      location: 'Ubicación',
      reservations: 'Reservaciones',
      schedule: 'Horario',
      whatsappMsg: 'Hola, me gustaría hacer una reservación en Bonifacio\'s Restaurant.',
      whatsappTooltip: 'Reservar por WhatsApp',
      footer: 'BONIFACIO\'S RESTAURANT · SAN CARLOS, SONORA',
      days: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      logo: '/logo-premium.svg',
      awardTitle: 'Orgullosos ganadores del',
      awardName: "Travelers' Choice Award 2025",
      awardBy: 'de Tripadvisor',
      awardDesc: 'Restaurante ecléctico en su decoración y en su cocina, con influencias de diversas culturas y regiones pero todo con un toque de inspiración en nuestro México. Nuestro Bar, también ecléctico, tiene la mejor selección de vinos, licores y coctelería. Pensando en ti y diseñados para ti. No te puedes perder nuestros mezcalitos o el favorito de nuestros clientes, el pink Bacanora. Por último, nuestro frondoso jardín invita a pasar las tardes viendo cómo se pone el atardecer en el cerro Tetakawi y nuestra hermosa marina. ¡Los esperamos!',
      awardCta: 'Ver en Tripadvisor',
      awardClose: 'Cerrar',
      eventTitle: 'Cotiza tu Evento',
      eventSubtitle: 'Bodas, bautizos, cumpleaños y más. Cuéntanos sobre tu evento y te contactamos.',
      eventName: 'Nombre completo',
      eventPhone: 'Teléfono',
      eventEmail: 'Correo electrónico',
      eventType: 'Tipo de evento',
      eventTypeOther: '¿Qué evento es?',
      eventTypeOtherPh: 'Describe el tipo de evento',
      eventDate: 'Fecha del evento',
      eventGuests: 'Número aprox. de invitados',
      eventNotes: 'Detalles adicionales (opcional)',
      eventLocation: 'Área del evento',
      eventSelectLocation: 'Selecciona un área',
      eventLocationOptions: ['Comedor', 'Terraza Alta', 'Terraza Baja'],
      eventSubmit: 'Enviar Cotización',
      eventTypes: ['Boda', 'Bautizo', 'Cumpleaños', 'Aniversario', 'Evento Corporativo', 'Graduación', 'Otro'],
      eventSelectType: 'Selecciona tipo de evento',
      sponsorsTitle: 'Orgullosos Patrocinadores',
      sponsorsOf: 'de'
    },
    en: {
      tagline: 'International cuisine · Exclusive ambiance · Gastronomic experience',
      cta: 'RESERVATIONS',
      jobBoard: 'JOB BOARD',
      joinTeam: 'Join the team - Click here',
      location: 'Location',
      reservations: 'Reservations',
      schedule: 'Schedule',
      whatsappMsg: 'Hello, I would like to make a reservation at Bonifacio\'s Restaurant.',
      whatsappTooltip: 'Book via WhatsApp',
      footer: 'BONIFACIO\'S RESTAURANT · SAN CARLOS, SONORA',
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      logo: '/logo-en.svg',
      awardTitle: 'Proud winners of the',
      awardName: "Travelers' Choice Award 2025",
      awardBy: 'by Tripadvisor',
      awardDesc: 'An eclectic restaurant in both its décor and cuisine, with influences from diverse cultures and regions, all with a touch of Mexican inspiration. Our Bar, also eclectic, offers the finest selection of wines, spirits, and cocktails — crafted with you in mind. Don\'t miss our mezcalitos or our guests\' favorite, the pink Bacanora. Finally, our lush garden invites you to spend your evenings watching the sunset over Tetakawi Hill and our beautiful marina. We look forward to seeing you!',
      awardCta: 'View on Tripadvisor',
      awardClose: 'Close',
      eventTitle: 'Get a Quote for Your Event',
      eventSubtitle: 'Weddings, baptisms, birthdays and more. Tell us about your event and we\'ll contact you.',
      eventName: 'Full name',
      eventPhone: 'Phone',
      eventEmail: 'Email',
      eventType: 'Event type',
      eventTypeOther: 'What event is it?',
      eventTypeOtherPh: 'Describe the event type',
      eventDate: 'Event date',
      eventGuests: 'Approx. number of guests',
      eventNotes: 'Additional details (optional)',
      eventLocation: 'Event area',
      eventSelectLocation: 'Select an area',
      eventLocationOptions: ['Dining Room', 'Upper Terrace', 'Lower Terrace'],
      eventSubmit: 'Send Quote',
      eventTypes: ['Wedding', 'Baptism', 'Birthday', 'Anniversary', 'Corporate Event', 'Graduation', 'Other'],
      eventSelectType: 'Select event type',
      sponsorsTitle: 'Proud Sponsors',
      sponsorsOf: 'of'
    },
    fr: {
      tagline: 'Cuisine internationale · Ambiance exclusive · Expérience gastronomique',
      cta: 'RÉSERVATIONS',
      jobBoard: 'OFFRES D\'EMPLOI',
      joinTeam: 'Rejoignez l\'équipe - Cliquez ici',
      location: 'Emplacement',
      reservations: 'Réservations',
      schedule: 'Horaires',
      whatsappMsg: 'Bonjour, je voudrais faire une réservation chez Bonifacio\'s Restaurant.',
      whatsappTooltip: 'Réserver via WhatsApp',
      footer: 'BONIFACIO\'S RESTAURANT · SAN CARLOS, SONORA',
      days: ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'],
      logo: '/logo-fr.svg',
      awardTitle: 'Fiers lauréats du',
      awardName: "Travelers' Choice Award 2025",
      awardBy: 'de Tripadvisor',
      awardDesc: 'Un restaurant éclectique dans sa décoration et sa cuisine, avec des influences de diverses cultures et régions, le tout avec une touche d\'inspiration mexicaine. Notre bar, également éclectique, propose la meilleure sélection de vins, spiritueux et cocktails — conçus pour vous. Ne manquez pas nos mezcalitos ou le favori de nos clients, le pink Bacanora. Enfin, notre jardin luxuriant vous invite à passer vos soirées en admirant le coucher de soleil sur le Cerro Tetakawi et notre magnifique marina. Nous vous attendons !',
      awardCta: 'Voir sur Tripadvisor',
      awardClose: 'Fermer',
      eventTitle: 'Devis pour votre Événement',
      eventSubtitle: 'Mariages, baptêmes, anniversaires et plus. Parlez-nous de votre événement.',
      eventName: 'Nom complet',
      eventPhone: 'Téléphone',
      eventEmail: 'Email',
      eventType: 'Type d\'événement',
      eventTypeOther: 'Quel type d\'événement ?',
      eventTypeOtherPh: 'Décrivez le type d\'événement',
      eventDate: 'Date de l\'événement',
      eventGuests: 'Nombre approx. d\'invités',
      eventNotes: 'Détails supplémentaires (optionnel)',
      eventLocation: 'Zone de l\'événement',
      eventSelectLocation: 'Sélectionnez une zone',
      eventLocationOptions: ['Salle à manger', 'Terrasse haute', 'Terrasse basse'],
      eventSubmit: 'Envoyer le devis',
      eventTypes: ['Mariage', 'Baptême', 'Anniversaire', 'Anniversaire de mariage', 'Événement d\'entreprise', 'Remise de diplômes', 'Autre'],
      eventSelectType: 'Sélectionnez le type d\'événement',
      sponsorsTitle: 'Fiers Parrains',
      sponsorsOf: 'de'
    },
    zh: {
      tagline: '国际美食 · 专属氛围 · 美食体验',
      cta: '预订',
      jobBoard: '招聘信息',
      joinTeam: '加入我们的团队 - 点击这里',
      location: '位置',
      reservations: '预订',
      schedule: '营业时间',
      whatsappMsg: '你好，我想在Bonifacio餐厅预订。',
      whatsappTooltip: '通过WhatsApp预订',
      footer: 'BONIFACIO\'S RESTAURANT · SAN CARLOS, SONORA',
      days: ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'],
      logo: '/logo-premium.svg',
      awardTitle: '我们荣获',
      awardName: "Travelers' Choice Award 2025",
      awardBy: 'Tripadvisor',
      awardDesc: '一家在装饰和美食方面都兼收并蓄的餐厅，融合了不同文化和地区的影响，一切都带有墨西哥的灵感。我们的酒吧同样风格独特，拥有最佳的葡萄酒、烈酒和鸡尾酒精选。不要错过我们的mezcalitos或客人最爱的pink Bacanora。最后，我们茂盛的花园邀请您在傍晚欣赏Tetakawi山丘的日落和美丽的码头。期待您的光临！',
      awardCta: '在Tripadvisor上查看',
      awardClose: '关闭',
      eventTitle: '活动报价',
      eventSubtitle: '婚礼、洗礼、生日等。告诉我们您的活动，我们会联系您。',
      eventName: '全名',
      eventPhone: '电话',
      eventEmail: '电子邮件',
      eventType: '活动类型',
      eventTypeOther: '具体是什么活动？',
      eventTypeOtherPh: '请描述活动类型',
      eventDate: '活动日期',
      eventGuests: '大约宾客人数',
      eventNotes: '其他细节（可选）',
      eventLocation: '活动区域',
      eventSelectLocation: '选择区域',
      eventLocationOptions: ['餐厅', '上层露台', '下层露台'],
      eventSubmit: '发送报价',
      eventTypes: ['婚礼', '洗礼', '生日', '周年纪念', '企业活动', '毕业典礼', '其他'],
      eventSelectType: '选择活动类型',
      sponsorsTitle: '骄傲的赞助商',
      sponsorsOf: '的'
    }
  }

  const t = translations[language]

  useEffect(() => {
    const loadActiveEvent = async () => {
      try {
        const res = await fetch('/api/reservations/event-types.php?public=1&home=1')
        const data = await res.json()
        if (data.success && Array.isArray(data.events) && data.events.length > 0) {
          setActiveHomeEvent(data.events[0])
        } else {
          setActiveHomeEvent(null)
        }
      } catch {
        setActiveHomeEvent(null)
      }
    }
    loadActiveEvent()
  }, [])

  const whatsappText = encodeURIComponent(t.whatsappMsg)
  const whatsappUrl = `https://wa.me/${phoneE164Mx}?text=${whatsappText}`

  const schedule = [
    { day: t.days[0], hours: '8 a.m.–10 p.m.' },
    { day: t.days[1], hours: '1–10:30 p.m.' },
    { day: t.days[2], hours: '1–10:30 p.m.' },
    { day: t.days[3], hours: '1–10:30 p.m.' },
    { day: t.days[4], hours: '1–10:30 p.m.' },
    { day: t.days[5], hours: '1–10:30 p.m.' },
    { day: t.days[6], hours: '8 a.m.–11:30 p.m.' }
  ]

  const getHomeEventTheme = (slug = '') => {
    const normalized = String(slug).toLowerCase().trim()

    const themes = {
      'san-valentin': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-rose-200/35 bg-gradient-to-r from-rose-900/95 via-rose-700/95 to-pink-700/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-rose-50 shadow-xl shadow-rose-900/40 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-rose-100/70 hover:shadow-rose-700/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70'
      },
      'dia-madres': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-pink-200/35 bg-gradient-to-r from-fuchsia-900/95 via-pink-700/95 to-rose-700/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-pink-50 shadow-xl shadow-fuchsia-900/40 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-pink-100/75 hover:shadow-pink-700/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200/70'
      },
      'dia-del-padre': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-sky-200/35 bg-gradient-to-r from-slate-900/95 via-blue-900/95 to-sky-800/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-sky-50 shadow-xl shadow-slate-900/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-sky-100/75 hover:shadow-sky-700/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-200/70'
      },
      'halloween': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-orange-200/40 bg-gradient-to-r from-zinc-950/95 via-orange-900/95 to-amber-800/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-orange-50 shadow-xl shadow-zinc-950/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-orange-100/80 hover:shadow-orange-800/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-200/70'
      },
      'posadas': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-emerald-200/40 bg-gradient-to-r from-emerald-900/95 via-teal-800/95 to-emerald-700/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-emerald-50 shadow-xl shadow-emerald-900/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-emerald-100/80 hover:shadow-emerald-700/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70'
      },
      'navidad': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-red-200/40 bg-gradient-to-r from-emerald-900/95 via-emerald-700/95 to-red-800/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-red-50 shadow-xl shadow-emerald-900/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-red-100/80 hover:shadow-red-800/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200/70'
      },
      'ano-nuevo': {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-violet-200/40 bg-gradient-to-r from-indigo-900/95 via-violet-800/95 to-slate-800/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-violet-50 shadow-xl shadow-indigo-900/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-violet-100/80 hover:shadow-violet-700/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70'
      },
      general: {
        className: 'group relative inline-flex items-center gap-2 overflow-hidden rounded-full border border-amber-200/35 bg-gradient-to-r from-amber-900/95 via-amber-700/95 to-orange-700/95 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-amber-50 shadow-xl shadow-amber-900/45 transition-all duration-400 hover:-translate-y-0.5 hover:scale-[1.02] hover:border-amber-100/80 hover:shadow-amber-700/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70'
      }
    }

    return themes[normalized] || themes.general
  }

  const getHomeEventHref = (event) => {
    const slug = String(event?.slug || '').toLowerCase().trim()
    if (!slug) return null
    if (slug === 'dia-madres') return '/reservacion-dia-madres'
    return `/reservacion-especial/${slug}`
  }

  /** Botón flotante WhatsApp en home: `true` para volver a mostrarlo (código del `<a>` se mantiene abajo). */
  const showHomeWhatsAppFloat = false

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
        <PublicTracker />
        <div className="relative isolate overflow-x-hidden">
          {/* 1. CAPA DE DECORACIÓN (BACKGROUNDS) */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[150px]" />
            <div className="absolute top-1/3 -right-48 h-[700px] w-[700px] rounded-full bg-[#F4E4C1]/6 blur-[140px]" />
            <div className="absolute bottom-0 -left-48 h-[600px] w-[600px] rounded-full bg-[#C9A961]/8 blur-[130px]" />
          </div>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgyMTIsMTc1LDU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />
          
          {/* 2. NAVEGACIÓN */}
          <nav className="relative z-40 border-b border-[#D4AF37]/10 bg-black/30 backdrop-blur-xl">
            <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8 flex items-center justify-between">
              <img src={t.logo} alt="Bonifacio's" className="h-12 w-auto" />
              <div className="flex gap-2">
                {['es', 'en', 'fr', 'zh'].map((code) => (
                  <button key={code} onClick={() => setLanguage(code)} className={`px-3 py-2 border rounded-lg text-[10px] ${language === code ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]' : 'border-[#D4AF37]/20 text-[#D4AF37]/60'}`}>
                    {code.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* 3. CUERPO PRINCIPAL */}
          <main className="relative mx-auto max-w-7xl px-6 py-20 lg:px-8">
            <div className="w-full"> 
              {/* HERO SECTION */}
              <div className="mx-auto max-w-5xl text-center">
                <img src={t.logo} alt="Logo" className="mx-auto h-40 w-auto mb-10" />
                <button onClick={() => setShowAward(true)} className="mb-10 hover:scale-110 transition-transform">
                  <img src="/tripadvisor-badge.png" alt="Award" className="h-32 w-auto" />
                </button>
                <p className="font-serif italic text-[#F4E4C1]/60 mb-10">{t.tagline}</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Link to="/reservacion" className="inline-block rounded-full bg-[#D4AF37] px-10 py-4 text-black font-bold shadow-2xl">
                    Reserva tu Mesa
                  </Link>

                  <Link
                    to="/cotiza-tu-evento"
                    className="inline-flex items-center rounded-full border border-[#D4AF37]/50 bg-black/40 px-8 py-3.5 font-serif text-sm font-semibold tracking-wide text-[#D4AF37] backdrop-blur-md shadow-xl transition-all duration-300 hover:bg-[#D4AF37]/15 hover:border-[#D4AF37]/80 hover:shadow-[#D4AF37]/20"
                  >
                    Cotiza tu Evento
                  </Link>

                  {activeHomeEvent && getHomeEventHref(activeHomeEvent) && (
                    <Link
                      to={getHomeEventHref(activeHomeEvent)}
                      className={getHomeEventTheme(activeHomeEvent.slug).className}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-white/15 via-white/5 to-white/15 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                      <div className="absolute -inset-10 translate-x-[-130%] bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]" />
                      <span className="relative z-10 uppercase">{activeHomeEvent.name}</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* GRID DE INFORMACIÓN (UBICACIÓN, TEL, HORARIO) */}
              <div className="mt-20 grid gap-8 md:grid-cols-3">
                <div className="group rounded-2xl border border-[#D4AF37]/10 bg-black/30 p-8 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-black/50">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <svg className="h-8 w-8 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mb-4 font-serif text-xl font-medium text-[#F4E4C1]">{t.schedule}</h3>
                  <div className="space-y-2 text-sm text-[#F4E4C1]/60">
                    {schedule.map((item, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{item.day}</span>
                        <span>{item.hours}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="group rounded-2xl border border-[#D4AF37]/10 bg-black/30 p-8 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-black/50">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <svg className="h-8 w-8 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h3 className="mb-4 font-serif text-xl font-medium text-[#F4E4C1]">{t.location}</h3>
                  <p className="mb-4 text-[#F4E4C1]/70">Blvd. San Carlos, San Carlos, Sonora</p>
                  <div className="space-y-2 text-sm text-[#F4E4C1]/60">
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Blvd. San Carlos, San Carlos, Sonora</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{phoneDisplay}</span>
                    </div>
                  </div>
                </div>

                <div className="group rounded-2xl border border-[#D4AF37]/10 bg-black/30 p-8 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-black/50">
                  <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-[#C9A961]/20">
                    <svg className="h-8 w-8 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="mb-4 font-serif text-xl font-medium text-[#F4E4C1]">{t.reservations}</h3>
                  <p className="mb-4 text-[#F4E4C1]/70">Reserva tu mesa para disfrutar de una experiencia única</p>
                  <div className="space-y-2 text-sm text-[#F4E4C1]/60">
                    <div className="flex justify-between">
                      <span>Reservaciones</span>
                      <span>Recomendadas</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Eventos privados</span>
                      <span>Disponibles</span>
                    </div>
                    {/* No listar capacidad máxima / N personas: política de negocio + evita HTML obsoleto en caché */}
                  </div>
                  <div className="mt-4 pt-4 border-t border-[#D4AF37]/10">
                    <Link
                      to="/reservacion-detalle"
                      className="inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-2 text-xs text-[#D4AF37] transition-colors hover:border-[#D4AF37]/40 hover:bg-black/60"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      Mis Reservaciones
                    </Link>
                  </div>
                </div>
              </div>


            </div> 
          </main>

          {/* BOLSA DE TRABAJO LINK */}
          <div className="mx-auto mt-16 flex justify-center">
            <Link
              to="/bolsa-de-trabajo"
              className="group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-[#D4AF37]/40 bg-black/40 px-8 py-3.5 font-serif text-sm font-medium tracking-wider text-[#D4AF37] backdrop-blur-md shadow-xl shadow-[#D4AF37]/20 transition-all duration-500 hover:scale-105 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/20 hover:shadow-[#D4AF37]/40"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="relative z-10">{t.joinTeam}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-[#D4AF37]/0 via-[#D4AF37]/10 to-[#D4AF37]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
            </Link>
          </div>

          {/* FOOTER */}
          <div className="mx-auto mt-24 max-w-4xl border-t border-[#D4AF37]/10 pt-10 text-center relative z-10">
            <p className="font-serif text-xs font-light tracking-[0.2em] text-[#D4AF37]/40">
              {new Date().getFullYear()} {t.footer}
            </p>
            <Link
              to="/admin"
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-2 text-xs text-[#D4AF37] transition-colors hover:border-[#D4AF37]/40 hover:bg-black/60 hover:text-[#D4AF37]/80"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Admin Van Buuren
            </Link>
          </div>

          {/* 4. ELEMENTOS FLOTANTES — WhatsApp: oculto con `showHomeWhatsAppFloat`; el marcado sigue en el árbol para reactivar fácil */}
          {showHomeWhatsAppFloat && (
            <a
              href={whatsappUrl}
              className="fixed bottom-6 right-6 z-50 h-16 w-16 rounded-full bg-[#25D366] flex items-center justify-center shadow-2xl"
              aria-label={t.whatsappTooltip}
            >
              <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
              </svg>
            </a>
          )}

          {/* MODAL DE TRIPADVISOR */}
          {showAward && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
              <div className="relative bg-[#1a1a1f] p-8 rounded-2xl border border-[#D4AF37]/30 max-w-md">
                <button onClick={() => setShowAward(false)} className="absolute right-4 top-4 text-[#D4AF37]">✕</button>
                <h3 className="text-[#F4E4C1] text-xl font-serif">{t.awardName}</h3>
                <p className="mt-4 text-[#F4E4C1]/70">{t.awardDesc}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export default Home
