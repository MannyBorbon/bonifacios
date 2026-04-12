import { useState } from 'react'
import { Link } from 'react-router-dom'
import { applicationsAPI } from '../services/api'
import PublicTracker from '../components/PublicTracker'

function JobBoard() {
  const [language, setLanguage] = useState('es')
  const [formData, setFormData] = useState({
    name: '',
    studies: '',
    email: '',
    phone: '',
    currentJob: '',
    position: '',
    otherPosition: '',
    experience: '',
    address: '',
    age: '',
    gender: '',
    privacyAccepted: false,
    noCurrentJob: false,
    noStudies: false,
    noEmail: false
  })
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const translations = {
    es: {
      title: 'Bolsa de Trabajo',
      subtitle: 'Únete a nuestro equipo',
      description: 'En Bonifacio\'s Restaurant buscamos personas apasionadas por la gastronomía y el servicio de excelencia.',
      form: {
        name: 'Nombre completo',
        studies: 'Estudios',
        email: 'Correo',
        phone: 'Celular',
        currentJob: 'Trabajo Actual',
        position: 'Puesto que buscas',
        experience: 'Años de experiencia en ese puesto',
        address: 'Dirección',
        age: 'Edad',
        gender: 'Sexo',
        genderMale: 'Masculino',
        genderFemale: 'Femenino',
        genderOther: 'Otro',
        privacy: 'Acepto el aviso de privacidad y términos de uso de mi información.',
        noCurrentJob: 'No tengo trabajo actual',
        noStudies: 'No tengo estudios',
        noEmail: 'No tengo correo',
        submit: 'Enviar'
      },
      positions: [
        'Chef',
        'Sous Chef',
        'Cocinero',
        'Mesero',
        'Bartender',
        'Host/Hostess',
        'Ayudante de cocina',
        'Lavaplatos',
        'Otro'
      ],
      backHome: 'Volver al inicio'
    },
    en: {
      title: 'Job Board',
      subtitle: 'Join our team',
      description: 'At Bonifacio\'s Restaurant we are looking for people passionate about gastronomy and excellent service.',
      form: {
        name: 'Full name',
        studies: 'Studies',
        email: 'Email',
        phone: 'Cell phone',
        currentJob: 'Current Job',
        position: 'Position you are looking for',
        experience: 'Years of experience in that position',
        address: 'Address',
        age: 'Age',
        gender: 'Gender',
        genderMale: 'Male',
        genderFemale: 'Female',
        genderOther: 'Other',
        privacy: 'I accept the privacy notice and terms of use of my information.',
        noCurrentJob: 'I don\'t have a current job',
        noStudies: 'I don\'t have studies',
        noEmail: 'I don\'t have email',
        submit: 'Submit'
      },
      positions: [
        'Chef',
        'Sous Chef',
        'Cook',
        'Waiter',
        'Bartender',
        'Host/Hostess',
        'Kitchen helper',
        'Dishwasher',
        'Other'
      ],
      backHome: 'Back to home'
    },
    fr: {
      title: 'Offres d\'emploi',
      subtitle: 'Rejoignez notre équipe',
      description: 'Chez Bonifacio\'s Restaurant, nous recherchons des personnes passionnées par la gastronomie et l\'excellence du service.',
      form: {
        name: 'Nom complet',
        studies: 'Études',
        email: 'Email',
        phone: 'Téléphone portable',
        currentJob: 'Emploi actuel',
        position: 'Poste recherché',
        experience: 'Années d\'expérience dans ce poste',
        address: 'Adresse',
        age: 'Âge',
        gender: 'Sexe',
        genderMale: 'Homme',
        genderFemale: 'Femme',
        genderOther: 'Autre',
        privacy: 'J\'accepte l\'avis de confidentialité et les conditions d\'utilisation de mes informations.',
        noCurrentJob: 'Je n\'ai pas d\'emploi actuel',
        noStudies: 'Je n\'ai pas d\'études',
        noEmail: 'Je n\'ai pas d\'email',
        submit: 'Envoyer'
      },
      positions: [
        'Chef',
        'Sous Chef',
        'Cuisinier',
        'Serveur',
        'Barman',
        'Hôte/Hôtesse',
        'Aide de cuisine',
        'Plongeur',
        'Autre'
      ],
      backHome: 'Retour à l\'accueil'
    },
    zh: {
      title: '招聘信息',
      subtitle: '加入我们的团队',
      description: '在Bonifacio餐厅，我们正在寻找对美食和卓越服务充满热情的人。',
      form: {
        name: '全名',
        studies: '学历',
        email: '电子邮件',
        phone: '手机',
        currentJob: '当前工作',
        position: '您正在寻找的职位',
        experience: '该职位的工作年限',
        address: '地址',
        age: '年龄',
        gender: '性别',
        genderMale: '男',
        genderFemale: '女',
        genderOther: '其他',
        privacy: '我接受隐私声明和我的信息使用条款。',
        noCurrentJob: '我没有当前的工作',
        noStudies: '我没有学历',
        noEmail: '我没有电子邮件',
        submit: '提交'
      },
      positions: [
        '厨师长',
        '副厨师长',
        '厨师',
        '服务员',
        '调酒师',
        '迎宾',
        '厨房助手',
        '洗碗工',
        '其他'
      ],
      backHome: '返回首页'
    }
  }

  const t = translations[language]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.privacyAccepted) {
      alert('Por favor acepta el aviso de privacidad para continuar.')
      return
    }

    setIsSubmitting(true)

    try {
      const response = await applicationsAPI.submit({
        name: formData.name,
        studies: formData.studies,
        email: formData.email,
        phone: formData.phone,
        currentJob: formData.currentJob,
        position: formData.position === 'Otro' ? formData.otherPosition : formData.position,
        experience: formData.experience,
        address: formData.address,
        age: formData.age,
        gender: formData.gender,
        noStudies: formData.noStudies,
        noEmail: formData.noEmail,
        noCurrentJob: formData.noCurrentJob
      });

      const applicationId = response.data?.applicationId;
      
      // Upload photo if exists
      if (photoFile && applicationId) {
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        photoFormData.append('application_id', applicationId);
        
        try {
          await fetch(`${import.meta.env.VITE_API_URL}/applications/upload-photo.php`, {
            method: 'POST',
            body: photoFormData
          });
        } catch (photoError) {
          console.error('Error uploading photo:', photoError);
        }
      }

      alert('¡Solicitud enviada exitosamente! Nos pondremos en contacto contigo pronto.');
      
      setFormData({
        name: '',
        studies: '',
        email: '',
        phone: '',
        currentJob: '',
        position: '',
        experience: '',
        address: '',
        privacyAccepted: false,
        noCurrentJob: false,
        noStudies: false,
        noEmail: false
      })
      setPhotoFile(null)
      setPhotoPreview(null)
    } catch (error) {
      console.error('Error submitting application:', error)
      alert('Hubo un error al enviar tu solicitud. Por favor intenta nuevamente.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handlePhotoCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      const video = document.createElement('video')
      video.srcObject = stream
      await video.play()
      
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      canvas.getContext('2d').drawImage(video, 0, 0)
      
      stream.getTracks().forEach(track => track.stop())
      
      canvas.toBlob((blob) => {
        const file = new File([blob], 'selfie.jpg', { type: 'image/jpeg' })
        setPhotoFile(file)
        setPhotoPreview(canvas.toDataURL('image/jpeg'))
      }, 'image/jpeg')
    } catch (error) {
      console.error('Error accessing camera:', error)
      alert('No se pudo acceder a la cámara. Por favor sube una foto desde tu galería.')
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    if (type === 'checkbox') {
      const updates = { [name]: checked }
      
      // Clear field values when "no" checkboxes are checked
      if (name === 'noStudies' && checked) {
        updates.studies = ''
      } else if (name === 'noEmail' && checked) {
        updates.email = ''
      } else if (name === 'noCurrentJob' && checked) {
        updates.currentJob = ''
      }
      
      setFormData({
        ...formData,
        ...updates
      })
    } else {
      setFormData({
        ...formData,
        [name]: value
      })
    }
  }

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
              <Link to="/" className="flex items-center gap-3">
                <img src="/logo-premium.svg" alt="Bonifacio's" className="h-12 w-auto" />
              </Link>
              
              <div className="flex items-center gap-4">
                <Link
                  to="/"
                  className="rounded-lg border border-[#D4AF37]/20 bg-black/30 px-4 py-2 text-sm font-light tracking-wider text-[#D4AF37]/80 backdrop-blur-md transition-all duration-300 hover:border-[#D4AF37]/40 hover:bg-black/50"
                >
                  {t.backHome}
                </Link>
                
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

        <main className="relative mx-auto max-w-4xl px-6 py-16 lg:px-8">
          <div className="text-center">
            <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#D4AF37]/20 bg-black/30 px-5 py-2.5 backdrop-blur-xl">
              <svg className="h-5 w-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span className="text-xs font-light tracking-[0.25em] text-[#D4AF37]">
                {t.title.toUpperCase()}
              </span>
            </div>

            <h1 className="mb-4 font-serif text-4xl font-light text-[#F4E4C1] sm:text-5xl">
              {t.subtitle}
            </h1>

            <div className="mx-auto mb-12 flex items-center justify-center gap-6">
              <div className="h-px w-16 bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-[#D4AF37]/60" />
              <svg className="h-1.5 w-1.5 text-[#D4AF37]" viewBox="0 0 6 6" fill="currentColor">
                <circle cx="3" cy="3" r="3" />
              </svg>
              <div className="h-px w-16 bg-gradient-to-l from-transparent via-[#D4AF37]/40 to-[#D4AF37]/60" />
            </div>

            <p className="mb-12 font-serif text-base italic leading-relaxed text-[#F4E4C1]/60">
              {t.description}
            </p>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-black/60 via-black/40 to-black/60 p-8 backdrop-blur-xl sm:p-10">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                  {t.form.name}
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  placeholder={t.form.name}
                />
              </div>

              <div>
                <label htmlFor="studies" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                  {t.form.studies}
                </label>
                <input
                  type="text"
                  id="studies"
                  name="studies"
                  required={!formData.noStudies}
                  disabled={formData.noStudies}
                  value={formData.studies}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t.form.studies}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="noStudies"
                    name="noStudies"
                    checked={formData.noStudies}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-[#D4AF37]/40 bg-black/40 text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                  <label htmlFor="noStudies" className="text-sm font-light text-[#F4E4C1]/70">
                    {t.form.noStudies}
                  </label>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.email}
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required={!formData.noEmail}
                    disabled={formData.noEmail}
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    placeholder={t.form.email}
                  />
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="noEmail"
                      name="noEmail"
                      checked={formData.noEmail}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-[#D4AF37]/40 bg-black/40 text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                    <label htmlFor="noEmail" className="text-sm font-light text-[#F4E4C1]/70">
                      {t.form.noEmail}
                    </label>
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.phone}
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder={t.form.phone}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="currentJob" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                  {t.form.currentJob}
                </label>
                <input
                  type="text"
                  id="currentJob"
                  name="currentJob"
                  required={!formData.noCurrentJob}
                  disabled={formData.noCurrentJob}
                  value={formData.currentJob}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={t.form.currentJob}
                />
                <div className="mt-2 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="noCurrentJob"
                    name="noCurrentJob"
                    checked={formData.noCurrentJob}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-[#D4AF37]/40 bg-black/40 text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                  />
                  <label htmlFor="noCurrentJob" className="text-sm font-light text-[#F4E4C1]/70">
                    {t.form.noCurrentJob}
                  </label>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label htmlFor="position" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.position}
                  </label>
                  <select
                    id="position"
                    name="position"
                    required
                    value={formData.position}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="" className="bg-[#1a1a1f]">{t.form.position}</option>
                    {t.positions.map((pos, idx) => (
                      <option key={idx} value={pos} className="bg-[#1a1a1f]">{pos}</option>
                    ))}
                  </select>
                  
                  {formData.position === 'Otro' && (
                    <div className="mt-3">
                      <input
                        type="text"
                        id="otherPosition"
                        name="otherPosition"
                        required
                        value={formData.otherPosition}
                        onChange={handleChange}
                        placeholder={language === 'es' ? 'Especifica el puesto' : language === 'en' ? 'Specify the position' : 'Spécifiez le poste'}
                        className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="experience" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.experience}
                  </label>
                  <input
                    type="number"
                    id="experience"
                    name="experience"
                    required
                    min="0"
                    value={formData.experience}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="address" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                  {t.form.address}
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  placeholder={t.form.address}
                />
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div>
                  <label htmlFor="age" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.age}
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    required
                    min="18"
                    max="100"
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 placeholder:text-[#F4E4C1]/30 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="18"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                    {t.form.gender}
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-3 text-[#F4E4C1] backdrop-blur-sm transition-all duration-300 focus:border-[#D4AF37]/50 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                  >
                    <option value="" className="bg-[#1a1a1f]">{t.form.gender}</option>
                    <option value="Masculino" className="bg-[#1a1a1f]">{t.form.genderMale}</option>
                    <option value="Femenino" className="bg-[#1a1a1f]">{t.form.genderFemale}</option>
                    <option value="Otro" className="bg-[#1a1a1f]">{t.form.genderOther}</option>
                  </select>
                </div>
              </div>

              {/* Photo upload */}
              <div>
                <label className="mb-2 block text-sm font-light tracking-wide text-[#D4AF37]">
                  {language === 'es' ? 'Foto' : language === 'en' ? 'Photo' : 'Photo'}
                </label>
                
                {photoPreview ? (
                  <div className="space-y-3">
                    <div className="flex justify-center">
                      <img 
                        src={photoPreview} 
                        alt="Preview" 
                        className="h-48 w-48 rounded-lg border border-[#D4AF37]/20 object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => { setPhotoFile(null); setPhotoPreview(null); }}
                      className="w-full rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-400 transition-all hover:bg-red-500/20"
                    >
                      {language === 'es' ? 'Cambiar foto' : language === 'en' ? 'Change photo' : 'Changer la photo'}
                    </button>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-6 text-center transition-all hover:border-[#D4AF37]/50 hover:bg-black/50">
                      <svg className="mb-2 h-8 w-8 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm text-[#F4E4C1]/80">
                        {language === 'es' ? 'Elegir de galería' : language === 'en' ? 'Choose from gallery' : 'Choisir de la galerie'}
                      </span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handlePhotoChange}
                        className="hidden"
                      />
                    </label>
                    
                    <button
                      type="button"
                      onClick={handlePhotoCapture}
                      className="flex flex-col items-center justify-center rounded-lg border border-[#D4AF37]/20 bg-black/40 px-4 py-6 text-center transition-all hover:border-[#D4AF37]/50 hover:bg-black/50"
                    >
                      <svg className="mb-2 h-8 w-8 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-sm text-[#F4E4C1]/80">
                        {language === 'es' ? 'Tomar selfie' : language === 'en' ? 'Take selfie' : 'Prendre un selfie'}
                      </span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="privacyAccepted"
                  name="privacyAccepted"
                  required
                  checked={formData.privacyAccepted}
                  onChange={handleChange}
                  className="mt-1 h-4 w-4 rounded border-[#D4AF37]/40 bg-black/40 text-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                />
                <label htmlFor="privacyAccepted" className="text-sm font-light leading-relaxed text-[#F4E4C1]/80">
                  {t.form.privacy}
                </label>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="group relative inline-flex w-full items-center justify-center gap-3 overflow-hidden rounded-full border border-[#D4AF37]/40 bg-gradient-to-r from-[#D4AF37]/90 via-[#F4E4C1]/80 to-[#D4AF37]/90 px-10 py-4 font-serif text-sm font-medium tracking-wider text-black shadow-2xl shadow-[#D4AF37]/40 transition-all duration-500 hover:scale-105 hover:border-[#F4E4C1] hover:shadow-[#D4AF37]/60 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {isSubmitting ? (
                  <>
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="relative z-10">{language === 'es' ? 'Enviando...' : language === 'en' ? 'Submitting...' : language === 'fr' ? 'Envoi...' : '提交中...'}</span>
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    <span className="relative z-10">{t.form.submit}</span>
                  </>
                )}
                <div className="absolute inset-0 bg-gradient-to-r from-[#F4E4C1]/0 via-white/20 to-[#F4E4C1]/0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              </button>
            </form>
          </div>

          <div className="mt-16 border-t border-[#D4AF37]/10 pt-8 text-center">
            <p className="font-serif text-xs font-light tracking-[0.2em] text-[#D4AF37]/40">
              © {new Date().getFullYear()} BONIFACIO'S RESTAURANT · SAN CARLOS, SONORA
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}

export default JobBoard
