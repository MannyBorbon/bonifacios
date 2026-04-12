import { useState, useEffect } from 'react';

function Inbox() {
  const [inbox, setInbox] = useState([]);
  const [loadingInbox, setLoadingInbox] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailData, setEmailData] = useState({ to: '', subject: '', message: '' });
  const [emailSending, setEmailSending] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    loadInbox();
  }, []);

  const loadInbox = async () => {
    setLoadingInbox(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/email/inbox.php`);
      const result = await response.json();
      if (result.success) {
        setInbox(result.emails || []);
      }
    } catch (error) {
      console.error('Error loading inbox:', error);
    } finally {
      setLoadingInbox(false);
    }
  };

  const handleSendEmail = async () => {
    if (!emailData.to || !emailData.subject || !emailData.message) {
      alert('Todos los campos son requeridos');
      return;
    }

    setEmailSending(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/email/send.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailData)
      });
      const result = await response.json();
      if (result.success) {
        alert('Correo enviado exitosamente');
        setEmailData({ to: '', subject: '', message: '' });
        setShowEmailForm(false);
      } else {
        alert('Error al enviar el correo');
      }
    } catch (error) {
      console.error('Error sending email:', error);
      alert('Error al enviar el correo');
    } finally {
      setEmailSending(false);
    }
  };

  const handleEmailClick = async (emailId) => {
    setLoadingEmail(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/email/get-email.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_id: emailId })
      });
      const result = await response.json();
      if (result.success) {
        setSelectedEmail(result.email);
      }
    } catch (error) {
      console.error('Error loading email:', error);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleBackToInbox = () => {
    setSelectedEmail(null);
    loadInbox(); // Refresh inbox
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-light text-white tracking-wide">Bandeja de Correo</h1>
        <p className="mt-1 text-sm text-slate-400">info@bonifaciossancarlos.com</p>
      </div>

      {/* Email Client */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] backdrop-blur-sm overflow-hidden shadow-lg shadow-cyan-500/5">
        <div className="border-b border-cyan-500/10 bg-[#030b18]/60 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="h-6 w-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h2 className="text-xl font-light text-slate-200">Correo Electrónico</h2>
            </div>
            <button
              onClick={loadInbox}
              className="rounded-lg bg-cyan-500/15 px-3 py-1.5 text-xs text-cyan-400 transition-all hover:bg-cyan-500/20"
            >
              🔄 Actualizar
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-cyan-500/10">
          <button
            onClick={() => setShowEmailForm(false)}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${!showEmailForm ? 'border-b-2 border-cyan-400 text-cyan-400 bg-cyan-500/8' : 'text-slate-400 hover:text-slate-100 hover:bg-cyan-500/5'}`}
          >
            📥 Bandeja de Entrada ({inbox.length})
          </button>
          <button
            onClick={() => setShowEmailForm(true)}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${showEmailForm ? 'border-b-2 border-cyan-400 text-cyan-400 bg-cyan-500/8' : 'text-slate-400 hover:text-slate-100 hover:bg-cyan-500/5'}`}
          >
            ✉️ Redactar
          </button>
        </div>

        <div className="p-4 sm:p-6">
          {loadingEmail ? (
            // Loading Email
            <div className="text-center text-slate-400 py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
              <p className="mt-2">Cargando correo...</p>
            </div>
          ) : selectedEmail ? (
            // Email Detail View
            <div className="space-y-4">
              <button
                onClick={handleBackToInbox}
                className="flex items-center gap-2 text-sm text-cyan-400 hover:text-slate-100 transition-colors"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Volver a la bandeja
              </button>
              
              <div className="rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 p-6">
                <h3 className="text-xl font-medium text-slate-200 mb-4">{selectedEmail.subject}</h3>
                
                <div className="space-y-2 mb-4 pb-4 border-b border-cyan-500/15">
                  <p className="text-sm text-cyan-400/80"><strong>De:</strong> {selectedEmail.from}</p>
                  <p className="text-sm text-slate-400">
                    <strong>Fecha:</strong> {new Date(selectedEmail.date).toLocaleString('es-MX', { 
                      timeZone: 'America/Hermosillo',
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div className="text-sm text-slate-300 whitespace-pre-wrap">
                  {selectedEmail.html_body ? (
                    <div 
                      dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }} 
                      className="email-content"
                      style={{
                        backgroundColor: 'white',
                        color: 'black',
                        padding: '1rem',
                        borderRadius: '0.5rem',
                        fontFamily: 'Arial, sans-serif',
                        lineHeight: '1.6',
                        maxWidth: '100%',
                        overflowX: 'auto'
                      }}
                    />
                  ) : (
                    selectedEmail.body
                  )}
                </div>
              </div>
            </div>
          ) : !showEmailForm ? (
            // Inbox View
            <>
              {loadingInbox ? (
                <div className="text-center text-slate-400 py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                  <p className="mt-2">Cargando correos...</p>
                </div>
              ) : inbox.length > 0 ? (
                <div className="space-y-2">
                  {inbox.map((email) => (
                    <div
                      key={email.id}
                      onClick={() => handleEmailClick(email.id)}
                      className={`p-4 rounded-xl cursor-pointer transition-all border border-transparent ${
                        email.seen
                          ? 'bg-[#040c1a]/60 hover:bg-[#040c1a]/80'
                          : 'bg-cyan-500/8 hover:bg-cyan-500/12 border border-cyan-500/25'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm truncate ${email.seen ? 'text-slate-300' : 'text-slate-200 font-medium'}`}>
                            {email.from}
                          </p>
                          <p className={`text-sm truncate mt-1 ${email.seen ? 'text-slate-400' : 'text-slate-200'}`}>
                            {email.subject}
                          </p>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{email.preview}</p>
                        </div>
                        <span className="text-xs text-slate-500 flex-shrink-0">
                          {new Date(email.date).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: 'short' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="h-16 w-16 mx-auto text-cyan-400/20 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <p className="text-slate-500">No hay correos en la bandeja de entrada</p>
                </div>
              )}
            </>
          ) : (
            // Compose Form
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-cyan-400/80 mb-2">De</label>
                <div className="rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 px-4 py-2.5 text-sm text-slate-400">
                  info@bonifaciossancarlos.com
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-cyan-400/80 mb-2">Para</label>
                <input
                  type="email"
                  placeholder="destinatario@ejemplo.com"
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-cyan-400/80 mb-2">Asunto</label>
                <input
                  type="text"
                  placeholder="Asunto del correo"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-4 py-2.5 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-cyan-400/80 mb-2">Mensaje</label>
                <textarea
                  placeholder="Escribe tu mensaje aquí..."
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows="12"
                  className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-4 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 resize-y"
                />
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleSendEmail}
                  disabled={emailSending}
                  className="flex-1 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-6 py-3 text-sm font-light text-cyan-300 transition-all hover:bg-cyan-500/20 hover:border-cyan-400/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailSending ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-black"></span>
                      Enviando...
                    </span>
                  ) : (
                    '📤 Enviar Correo'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowEmailForm(false);
                    setEmailData({ to: '', subject: '', message: '' });
                  }}
                  className="px-6 py-3 rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 text-sm text-slate-400 transition-all hover:bg-[#040c1a]/80 hover:text-slate-100"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Inbox;
