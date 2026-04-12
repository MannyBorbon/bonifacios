import { useState } from 'react'
import { Link } from 'react-router-dom'
import PublicTracker from '../components/PublicTracker'

function Home() {
  const [language, setLanguage] = useState('es')
  const [showAward, setShowAward] = useState(false)
  const [eventForm, setEventForm] = useState({ name: '', phone: '', email: '', event_type: '', date: '', guests: '', location: '', notes: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState('')

  const phoneDisplay = '622 173 8884'
  const phoneE164Mx = '526221738884'

  const instagramUrl = 'https://www.instagram.com/bonifaciosrestaurant/'
  const facebookUrl = 'https://www.facebook.com/Bonifaciosrestaurant'

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

  const whatsappText = encodeURIComponent(t.whatsappMsg)
  const whatsappUrl = `https://wa.me/${phoneE164Mx}?text=${whatsappText}`

  const handleSubmitQuote = async () => {
    if (!eventForm.name || !eventForm.phone || !eventForm.event_type || !eventForm.date) {
      setSubmitMessage('Por favor completa todos los campos requeridos')
      return
    }

    setIsSubmitting(true)
    setSubmitMessage('')

    try {
      const response = await fetch('/api/quotes/submit.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventForm)
      })

      const data = await response.json()

      if (data.success) {
        setSubmitMessage('¡Solicitud enviada! Te contactaremos pronto.')
        setEventForm({ name: '', phone: '', email: '', event_type: '', date: '', guests: '', location: '', notes: '' })
      } else {
        setSubmitMessage('Error al enviar la solicitud. Por favor intenta de nuevo.')
      }
    } catch {
      setSubmitMessage('Error de conexión. Por favor intenta de nuevo.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const schedule = [
    { day: t.days[0], hours: '8 a.m.–10 p.m.' },
    { day: t.days[1], hours: '1–10:30 p.m.' },
    { day: t.days[2], hours: '1–10:30 p.m.' },
    { day: t.days[3], hours: '1–10:30 p.m.' },
    { day: t.days[4], hours: '1–10:30 p.m.' },
    { day: t.days[5], hours: '1–10:30 p.m.' },
    { day: t.days[6], hours: '8 a.m.–11:30 p.m.' }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f14] via-[#1a1a1f] to-[#0a0a0f]">
      <PublicTracker />
      <div className="relative isolate overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[150px]" />
          <div className="absolute top-1/3 -right-48 h-[700px] w-[700px] rounded-full bg-[#F4E4C1]/6 blur-[140px]" />
          <div className="absolute bottom-0 -left-48 h-[600px] w-[600px] rounded-full bg-[#C9A961]/8 blur-[130px]" />
        </div>

        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAiIGhlaWdodD0iODAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjAuNSIgZmlsbD0icmdiYSgyMTIsMTc1LDU1LDAuMDMpIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-40" />

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />

        <nav className="relative z-40 border-b border-[#D4AF37]/10 bg-black/30 backdrop-blur-xl">
          <div className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src={t.logo} alt="Bonifacio's" className="h-12 w-auto" />
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  {[
                    { code: 'es', flag: 'mx', label: 'MX' },
                    { code: 'en', flag: 'us', label: 'US' },
                    { code: 'fr', flag: 'fr', label: 'FR' },
                    { code: 'zh', flag: 'cn', label: 'CN' }
                  ].map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => setLanguage(lang.code)}
                      className={`flex flex-col items-center gap-1 rounded-lg border px-3 py-2 text-xs font-light uppercase tracking-wider transition-all duration-300 ${
                        language === lang.code
                          ? 'border-[#D4AF37] bg-[#D4AF37]/20 text-[#D4AF37]'
                          : 'border-[#D4AF37]/20 bg-black/30 text-[#D4AF37]/60 hover:border-[#D4AF37]/40 hover:bg-black/50'
                      } backdrop-blur-md`}
                    >
                      <img src={`/flags/${lang.flag}.webp`} alt={lang.label} className="h-3 w-4 object-cover rounded-sm" />
                      <span className="text-[10px] opacity-60">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </nav>

        <main className="relative mx-auto flex min-h-screen max-w-7xl items-center px-6 py-20 lg:px-8">
          <div className="w-full">
            <div className="mx-auto max-w-5xl">
              <div className="flex flex-col items-center text-center">
                <div className="group relative">
                  <div className="absolute -inset-8 rounded-full bg-gradient-to-r from-[#D4AF37]/10 via-[#F4E4C1]/10 to-[#D4AF37]/10 opacity-0 blur-3xl transition-opacity duration-1000 group-hover:opacity-100" />
                  <div className="absolute -inset-4 rounded-full bg-[#D4AF37]/5 opacity-0 blur-2xl transition-opacity duration-700 group-hover:opacity-100" />
                  <img 
                    src={t.logo}
                    alt="Bonifacio's Restaurant" 
                    className="relative h-40 w-auto object-contain transition-all duration-700 group-hover:scale-105 sm:h-48 lg:h-56"
                  />
                </div>

                {/* TripAdvisor Badge - below SAN CARLOS */}
                <button
                  onClick={() => setShowAward(true)}
                  className="group/award -mt-5 relative cursor-pointer transition-all duration-500 hover:scale-110 animate-[fadeInScale_0.8s_ease-out_0.8s_both]"
                >
                  <div className="absolute -inset-1 rounded-full bg-[#34E0A1]/[0.04] blur-md animate-pulse" />
                  <img
                    src="/tripadvisor-badge.png"
                    alt="Tripadvisor Travelers' Choice 2025"
                    className="relative h-[130px] w-[130px] sm:h-[146px] sm:w-[146px] rounded-full object-contain drop-shadow-[0_0_6px_rgba(52,224,161,0.1)] transition-all duration-700 group-hover/award:drop-shadow-[0_0_12px_rgba(52,224,161,0.2)]"
                  />
                </button>

                <div className="mt-3 flex items-center gap-6">
                  <div className="h-px w-20 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-[#D4AF37]/60" />
                  <svg className="h-1.5 w-1.5 text-[#D4AF37]" viewBox="0 0 6 6" fill="currentColor">
                    <circle cx="3" cy="3" r="3" />
                  </svg>
                  <div className="h-px w-20 bg-gradient-to-l from-transparent via-[#D4AF37]/40 to-[#D4AF37]/60" />
                </div>

                <p className="mt-5 font-serif text-base italic leading-relaxed text-[#F4E4C1]/60 sm:text-lg">
                  {t.tagline}
                </p>

                <div className="mt-10 flex flex-col items-center gap-5 sm:flex-row sm:justify-center">
                  <a
                    href={`tel:${phoneE164Mx}`}
                    className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/90 via-[#F4E4C1]/80 to-[#D4AF37]/90 px-10 py-4 font-serif text-sm font-medium tracking-wider text-black shadow-2xl shadow-[#D4AF37]/40 transition-all duration-500 hover:scale-105 hover:border-[#F4E4C1] hover:shadow-[#D4AF37]/60 sm:w-auto"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span className="relative z-10">{t.cta}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#F4E4C1]/0 via-white/20 to-[#F4E4C1]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                  </a>

                  <div className="flex flex-wrap items-center justify-center gap-3">
                    {/* Commented out - Ver Menú button
                    <Link
                      to="/menu"
                      className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-black/40 px-5 py-3 font-serif text-xs tracking-wider text-[#D4AF37]/70 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-black/60"
                    >
                      Ver Menú
                    </Link>
                    */}
                    {/* Commented out - Cotizar Evento button
                    <Link
                      to="/cotizador"
                      className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-black/40 px-5 py-3 font-serif text-xs tracking-wider text-[#D4AF37]/70 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] hover:bg-black/60"
                    >
                      Cotizar Evento
                    </Link>
                    */}
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Instagram"
                      className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-black/40 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/20 hover:shadow-lg hover:shadow-[#D4AF37]/40"
                    >
                      <svg
                        className="h-5 w-5 text-[#D4AF37]/70 transition-colors group-hover:text-[#F4E4C1]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M7.8 2h8.4A5.8 5.8 0 0 1 22 7.8v8.4A5.8 5.8 0 0 1 16.2 22H7.8A5.8 5.8 0 0 1 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2Zm0 2A3.8 3.8 0 0 0 4 7.8v8.4A3.8 3.8 0 0 0 7.8 20h8.4a3.8 3.8 0 0 0 3.8-3.8V7.8A3.8 3.8 0 0 0 16.2 4H7.8Zm10.55 1.65a.95.95 0 1 1 0 1.9.95.95 0 0 1 0-1.9ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
                      </svg>
                    </a>

                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noreferrer"
                      aria-label="Facebook"
                      className="group inline-flex h-12 w-12 items-center justify-center rounded-full border border-[#D4AF37]/20 bg-black/40 backdrop-blur-md transition-all duration-300 hover:scale-110 hover:border-[#D4AF37]/60 hover:bg-[#D4AF37]/20 hover:shadow-lg hover:shadow-[#D4AF37]/40"
                    >
                      <svg
                        className="h-5 w-5 text-[#D4AF37]/70 transition-colors group-hover:text-[#F4E4C1]"
                        fill="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path d="M13.5 22v-8h2.7l.4-3H13.5V9.1c0-.9.2-1.5 1.5-1.5h1.7V5c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2V11H7.5v3h2.6v8h3.4 Z" />
                      </svg>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            <div className="mx-auto mt-20 max-w-6xl">
              <div className="grid gap-8 md:grid-cols-3">
                <a
                  href="https://maps.google.com/?q=Bonifacio's+Restaurant,+Blvr.+Gabriel+Estrada,+85506+San+Carlos,+Son."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative block overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 backdrop-blur-xl transition-all duration-500 hover:border-[#D4AF37]/50 hover:shadow-2xl hover:shadow-[#D4AF37]/20 cursor-pointer"
                >
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-2xl transition-all duration-500 group-hover:bg-[#D4AF37]/20" />
                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-xl bg-[#D4AF37]/15 p-3.5">
                      <svg className="h-6 w-6 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="mb-4 font-serif text-xs font-light uppercase tracking-[0.2em] text-[#D4AF37]">
                      {t.location}
                    </h3>
                    <p className="text-base font-light leading-relaxed text-[#F4E4C1]/80">
                      Blvr. Gabriel Estrada
                    </p>
                    <p className="mt-1.5 text-base font-light leading-relaxed text-[#F4E4C1]/80">
                      85506 San Carlos, Sonora
                    </p>
                  </div>
                </a>

                <div className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 backdrop-blur-xl transition-all duration-500 hover:border-[#D4AF37]/50 hover:shadow-2xl hover:shadow-[#D4AF37]/20">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-2xl transition-all duration-500 group-hover:bg-[#D4AF37]/20" />
                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-xl bg-[#D4AF37]/15 p-3.5">
                      <svg className="h-6 w-6 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                    </div>
                    <h3 className="mb-4 font-serif text-xs font-light uppercase tracking-[0.2em] text-[#D4AF37]">
                      {t.reservations}
                    </h3>
                    <a
                      href={`tel:${phoneE164Mx}`}
                      className="block font-serif text-lg font-light text-[#F4E4C1]/90 transition-colors hover:text-[#D4AF37]"
                    >
                      {phoneDisplay}
                    </a>
                  </div>
                </div>

                <div className="group relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 backdrop-blur-xl transition-all duration-500 hover:border-[#D4AF37]/50 hover:shadow-2xl hover:shadow-[#D4AF37]/20">
                  <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-[#D4AF37]/10 blur-2xl transition-all duration-500 group-hover:bg-[#D4AF37]/20" />
                  <div className="relative">
                    <div className="mb-5 inline-flex rounded-xl bg-[#D4AF37]/15 p-3.5">
                      <svg className="h-6 w-6 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="mb-4 font-serif text-xs font-light uppercase tracking-[0.2em] text-[#D4AF37]">
                      {t.schedule}
                    </h3>
                    <div className="space-y-2.5">
                      {schedule.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm font-light">
                          <span className="text-[#F4E4C1]/50">{item.day}</span>
                          <span className="text-[#F4E4C1]/80">{item.hours}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            
            {/* Event Quote Form */}
            <div className="mx-auto mt-20 max-w-2xl">
              <div className="relative overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 sm:p-10 backdrop-blur-xl">
                <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#D4AF37]/8 blur-3xl" />
                <div className="absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-[#D4AF37]/5 blur-3xl" />
                <div className="relative">
                  <div className="mb-2 inline-flex rounded-xl bg-[#D4AF37]/15 p-3.5">
                    <svg className="h-6 w-6 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 15.999h-5.5a2.5 2.5 0 010-5H21M3 8.5h5.5a2.5 2.5 0 010 5H3m9-10.5v17M8 3h8l-1 3H9L8 3z" />
                    </svg>
                  </div>
                  <h2 className="font-serif text-xl sm:text-2xl font-light text-[#F4E4C1] mb-1">{t.eventTitle}</h2>
                  <p className="text-sm text-[#F4E4C1]/50 mb-8">{t.eventSubtitle}</p>

                  <div className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventName} *</label>
                        <input
                          type="text"
                          value={eventForm.name}
                          onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                          placeholder="..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventPhone} *</label>
                        <input
                          type="tel"
                          value={eventForm.phone}
                          onChange={(e) => setEventForm({ ...eventForm, phone: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                          placeholder="622 000 0000"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventEmail}</label>
                      <input
                        type="email"
                        value={eventForm.email}
                        onChange={(e) => setEventForm({ ...eventForm, email: e.target.value })}
                        className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                        placeholder="correo@ejemplo.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventType} *</label>
                        <select
                          value={eventForm.event_type}
                          onChange={(e) => setEventForm({ ...eventForm, event_type: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-[#1a1a1f]">{t.eventSelectType}</option>
                          {t.eventTypes.map((type) => (
                            <option key={type} value={type} className="bg-[#1a1a1f]">{type}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventDate} *</label>
                        <input
                          type="date"
                          value={eventForm.date}
                          onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventGuests}</label>
                        <input
                          type="number"
                          value={eventForm.guests}
                          onChange={(e) => setEventForm({ ...eventForm, guests: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                          placeholder="50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventLocation} *</label>
                        <select
                          value={eventForm.location}
                          onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                          className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors"
                        >
                          <option value="" className="bg-[#1a1a1f]">{t.eventSelectLocation}</option>
                          {t.eventLocationOptions.map((loc) => (
                            <option key={loc} value={loc} className="bg-[#1a1a1f]">{loc}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-[#D4AF37]/60 mb-1.5">{t.eventNotes}</label>
                      <textarea
                        value={eventForm.notes}
                        onChange={(e) => setEventForm({ ...eventForm, notes: e.target.value })}
                        rows={3}
                        className="w-full rounded-xl border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-sm text-[#F4E4C1] placeholder-[#F4E4C1]/20 backdrop-blur-md focus:border-[#D4AF37]/50 focus:outline-none transition-colors resize-none"
                        placeholder="..."
                      />
                    </div>

                    <button
                      onClick={handleSubmitQuote}
                      disabled={!eventForm.name || !eventForm.phone || !eventForm.event_type || !eventForm.date || !eventForm.location || isSubmitting}
                      className="group relative w-full inline-flex items-center justify-center gap-3 overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/90 via-[#F4E4C1]/80 to-[#D4AF37]/90 px-8 py-4 font-serif text-sm font-medium tracking-wider text-black shadow-2xl shadow-[#D4AF37]/30 transition-all duration-500 hover:scale-[1.02] hover:shadow-[#D4AF37]/50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span className="relative z-10">
                        {isSubmitting ? 'Enviando...' : t.eventSubmit}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-[#F4E4C1]/0 via-white/20 to-[#F4E4C1]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                    </button>

                    {submitMessage && (
                      <div className={`mt-3 text-center text-sm ${
                        submitMessage.includes('enviada') 
                          ? 'text-[#34E0A1]' 
                          : 'text-[#EF4444]'
                      }`}>
                        {submitMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

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

            <div className="mx-auto mt-24 max-w-4xl border-t border-[#D4AF37]/10 pt-10 text-center">
              <p className="font-serif text-xs font-light tracking-[0.2em] text-[#D4AF37]/40">
                © {new Date().getFullYear()} {t.footer}
              </p>
              <Link
                to="/admin"
                className="mt-4 inline-block text-xs text-[#D4AF37]/30 hover:text-[#D4AF37]/60 transition-colors"
              >
                Admin Van Buuren
              </Link>
            </div>
          </div>
        </main>

        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="group fixed bottom-6 right-6 z-50 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] shadow-2xl shadow-[#25D366]/40 transition-all duration-300 hover:scale-110 hover:shadow-[#25D366]/60 sm:h-20 sm:w-20"
          aria-label="Contactar por WhatsApp"
        >
          <span className="absolute -inset-1 animate-ping rounded-full bg-[#25D366] opacity-20"></span>
          <svg className="relative h-8 w-8 text-white sm:h-10 sm:w-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          <span className="absolute -top-12 right-0 hidden whitespace-nowrap rounded-lg bg-[#25D366] px-3 py-2 text-sm font-medium text-white shadow-lg group-hover:block">
            {t.whatsappTooltip}
          </span>
        </a>

        {/* TripAdvisor Award Modal */}
        {showAward && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowAward(false)} />
            <div
              className="relative w-full max-w-md max-h-[85vh] sm:max-h-[90vh] overflow-y-auto animate-[fadeInScale_0.3s_ease-out] rounded-t-2xl sm:rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-b from-[#1a1a1f] via-[#0f0f14] to-[#1a1a1f] shadow-2xl shadow-[#D4AF37]/20"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Decorative top glow */}
              <div className="absolute top-0 left-1/2 h-32 w-64 -translate-x-1/2 rounded-full bg-[#D4AF37]/8 blur-[60px] pointer-events-none" />
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#D4AF37]/60 to-transparent" />

              {/* Mobile drag handle */}
              <div className="flex justify-center pt-3 sm:hidden">
                <div className="h-1 w-10 rounded-full bg-[#F4E4C1]/20" />
              </div>

              {/* Close button */}
              <button
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAward(false); }}
                className="absolute right-3 top-3 z-50 flex h-9 w-9 items-center justify-center rounded-full border border-[#D4AF37]/30 bg-black/60 text-[#F4E4C1]/70 transition-all duration-300 hover:border-[#D4AF37]/60 hover:text-[#F4E4C1] active:scale-95"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Header with badge */}
              <div className="relative flex flex-col items-center px-6 pt-6 pb-3 sm:px-8 sm:pt-8 sm:pb-4">
                <div className="relative">
                  <div className="absolute -inset-3 rounded-full bg-[#D4AF37]/15 blur-xl" />
                  <div className="absolute -inset-1.5 rounded-full bg-[#D4AF37]/10 blur-md" />
                  <img
                    src="/tripadvisor-badge.png"
                    alt="Tripadvisor Travelers' Choice 2025"
                    className="relative h-32 w-32 sm:h-40 sm:w-40 rounded-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="mt-1 text-center">
                  <p className="text-[9px] sm:text-[10px] font-light uppercase tracking-[0.2em] text-[#D4AF37]/70">{t.awardTitle}</p>
                  <h3 className="mt-1 font-serif text-lg sm:text-xl font-medium text-[#F4E4C1]">{t.awardName}</h3>
                  <p className="mt-0.5 text-[11px] sm:text-xs text-[#D4AF37]/60">{t.awardBy}</p>
                </div>
              </div>

              {/* Divider */}
              <div className="mx-6 sm:mx-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
                <svg className="h-1 w-1 text-[#D4AF37]/50" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3" /></svg>
                <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#D4AF37]/30 to-transparent" />
              </div>

              {/* Description */}
              <div className="px-6 py-4 sm:px-8 sm:py-5">
                <p className="font-serif text-[13px] leading-relaxed text-[#F4E4C1]/70 sm:text-sm">
                  {t.awardDesc}
                </p>
              </div>

              {/* Footer actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 border-t border-[#D4AF37]/10 px-6 py-4 sm:px-8 sm:py-4">
                <a
                  href="https://www.tripadvisor.com.mx/Restaurant_Review-g151933-d1835567-Reviews-Bonifacio_s-San_Carlos_Northern_Mexico.html"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#D4AF37]/30 bg-gradient-to-r from-[#D4AF37]/20 via-[#D4AF37]/10 to-[#D4AF37]/20 px-5 py-2.5 font-serif text-sm font-medium tracking-wide text-[#D4AF37] transition-all duration-300 hover:border-[#D4AF37]/60 hover:shadow-lg hover:shadow-[#D4AF37]/20 active:scale-95"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
                  </svg>
                  {t.awardCta}
                </a>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setShowAward(false); }}
                  className="rounded-full border border-[#D4AF37]/10 bg-black/30 px-5 py-2.5 text-sm text-[#F4E4C1]/50 transition-all duration-300 hover:border-[#D4AF37]/30 hover:text-[#F4E4C1]/80 active:scale-95"
                >
                  {t.awardClose}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Sponsors Section - Commented out until ready to use
        <div className="mx-auto mt-20 max-w-4xl">
          <div className="text-center mb-8">
            <p className="font-serif text-xs font-light uppercase tracking-[0.25em] text-[#D4AF37]/50">{t.sponsorsTitle}</p>
            <div className="mt-3 flex items-center justify-center gap-4">
              <div className="h-px w-16 bg-gradient-to-r from-transparent to-[#D4AF37]/30" />
              <svg className="h-1 w-1 text-[#D4AF37]/40" viewBox="0 0 6 6" fill="currentColor"><circle cx="3" cy="3" r="3" /></svg>
              <div className="h-px w-16 bg-gradient-to-l from-transparent to-[#D4AF37]/30" />
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { name: 'SBPA', full: 'San Carlos Bay Preservation Association' },
              { name: 'SAP y Segura', full: 'Sociedad de Amigos del Puerto' },
              { name: 'Torneo de Pickleball', full: 'San Carlos Pickleball Tournament' },
            ].map((sponsor) => (
              <div
                key={sponsor.name}
                className="group flex flex-col items-center gap-2 rounded-xl border border-[#D4AF37]/10 bg-black/30 px-6 py-4 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/30 hover:bg-black/50"
              >
                <span className="font-serif text-sm font-medium tracking-wide text-[#D4AF37]/80 group-hover:text-[#D4AF37] transition-colors">{sponsor.name}</span>
                <span className="text-[9px] text-[#F4E4C1]/30 tracking-wider uppercase">{sponsor.full}</span>
              </div>
            ))}
          </div>
        </div>
*/}
      </div>
    </div>
  )
}

export default Home
