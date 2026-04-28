import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { authAPI } from '../services/api';
import trackingService from '../services/tracking';

function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState({ total: 0, unread_chat: 0, unread_emails: 0, new_quotes: 0, new_applications: 0, recent_chats: [] });
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const notifRef = useRef(null);
  const notifDropdownRef = useRef(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const [audio] = useState(() => new Audio('/la-otra-realidad.m4a'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const prevPath = useRef(location.pathname);

  const sessionReady = useRef(false);
  const inactivityTimer = useRef(null);

  // Inactivity auto-logout (3 minutes)
  useEffect(() => {
    const LIMIT = 3 * 60 * 1000;

    const doLogout = () => {
      alert('Sesión cerrada por inactividad\n\nNon omnis moriar');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    };

    const resetTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(doLogout, LIMIT);
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(ev => document.removeEventListener(ev, resetTimer));
    };
  }, []);

  // Track page view on subsequent route changes (initial is handled in startSession effect)
  useEffect(() => {
    if (!sessionReady.current) return;
    trackingService.trackPageView();
  }, [location.pathname]);

  // Main init effect
  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      setProfilePhoto(parsedUser.profile_photo);
    }

    authAPI.getMe()
      .then((res) => {
        if (res?.data?.success && res.data.user) {
          const mergedUser = { ...(JSON.parse(userData || '{}')), ...res.data.user };
          setUser(mergedUser);
          localStorage.setItem('user', JSON.stringify(mergedUser));
          if (mergedUser.profile_photo) setProfilePhoto(mergedUser.profile_photo);
        }
      })
      .catch(() => {});

    loadNotifications();
    const notifInterval = setInterval(loadNotifications, 15000);
    const handleClickOutside = (e) => {
      const inBell = notifRef.current && notifRef.current.contains(e.target);
      const inDropdown = notifDropdownRef.current && notifDropdownRef.current.contains(e.target);
      if (!inBell && !inDropdown) setShowNotifDropdown(false);
    };
    document.addEventListener('mousedown', handleClickOutside);

    // Iniciar tracking de sesión, luego registrar la página inicial
    trackingService.startSession().then(() => {
      sessionReady.current = true;
      trackingService.trackPageView();
    });
    
    // Background music - NO LOOP
    audio.volume = 0.3;
    
    const playAudio = () => {
      audio.currentTime = 0;
      audio.play()
        .then(() => console.log('Dashboard audio playing'))
        .catch(err => console.log('Audio blocked, waiting for interaction:', err));
    };
    
    playAudio();
    
    const handleInteraction = () => {
      playAudio();
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);
    
    return () => {
      clearInterval(notifInterval);
      document.removeEventListener('mousedown', handleClickOutside);
      audio.pause();
      audio.currentTime = 0;
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
    };
  }, [audio]);

  const loadNotifications = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/notifications.php`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setNotifications(data);
    } catch { /* silent */ }
  };

  const markNotificationsSeen = async () => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/chat/mark-notifications-seen.php`, { 
        method: 'POST',
        credentials: 'include' 
      });
      // No recargar inmediatamente - el contador ya se actualizó en el onClick
      // La próxima recarga automática (cada 15s) traerá los datos correctos
    } catch { /* silent */ }
  };


  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (user && !['manuel', 'misael'].includes(user.username.toLowerCase())) {
      alert('Solo Manuel y Misael pueden subir fotos de perfil');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('photo', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/users/upload-profile-photo.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      
      const result = await response.json();
      if (result.success) {
        setProfilePhoto(result.photoUrl);
        const updatedUser = { ...user, profile_photo: result.photoUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        alert('Foto de perfil actualizada');
      } else {
        alert(result.error || 'Error al subir la foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await trackingService.endSession();
    } catch (error) {
      console.error('Tracking end session error:', error);
    }
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/admin/login');
    }
  };

  const isActive = (path) => location.pathname === path;

  // Close mobile menu when route changes
  useEffect(() => {
    if (prevPath.current !== location.pathname) { setMobileMenuOpen(false); prevPath.current = location.pathname; }
  }, [location]);

  const isAdministrador = user?.role === 'administrador';
  const toBool = (v, fallback = true) => (v === undefined || v === null ? fallback : Boolean(v));
  const canViewModule = (viewKey, legacyEditKey, legacyDeleteKey) => {
    if (user?.[viewKey] !== undefined && user?.[viewKey] !== null) return Boolean(user[viewKey]);
    return toBool(user?.[legacyEditKey], true) || toBool(user?.[legacyDeleteKey], true);
  };
  const canApplications = isAdministrador || canViewModule('can_view_applications', 'can_edit_applications', 'can_delete_applications');
  const canEmployees = isAdministrador || canViewModule('can_view_employees', 'can_edit_employees', 'can_delete_employees');
  const canQuotes = isAdministrador || canViewModule('can_view_quotes', 'can_edit_quotes', 'can_delete_quotes');
  const canSales = isAdministrador || toBool(user?.can_view_sales, true);

  const canAccessRoute = (path) => {
    if (path === '/admin/applications') return canApplications;
    if (path === '/admin/employees') return canEmployees;
    if (path === '/admin/quotes') return canQuotes;
    if (path === '/admin/sales') return canSales;
    return true;
  };
  const disabledUiClass = (path) => canAccessRoute(path) ? '' : 'hidden';

  const handlePlayMusic = () => {
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Audio play error:', err));
  };

  return (
    <div className="min-h-screen bg-[#030712] bg-gradient-to-br from-[#030712] via-[#060d1f] to-[#030b18]">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzNCwyMTEsMjM4LDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-100" />

      <nav className="relative z-10 border-b border-cyan-500/10 bg-[#030b18]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 py-2 sm:py-4">
          {/* Top bar: logo + actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Link to="/admin/dashboard" className="flex items-center">
                <img src="/logo-premium.svg" alt="Bonifacio's" className="h-8 sm:h-10 w-auto" />
              </Link>
              <a href="https://bonifaciossancarlos.com/" target="_blank" rel="noopener noreferrer" title="Ir al sitio web" className="hidden sm:flex items-center justify-center h-8 w-8 rounded-lg text-[#F4E4C1]/40 hover:text-[#D4AF37] hover:bg-[#D4AF37]/10 transition-all">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
              </a>
            </div>

            {/* Desktop nav links (hidden on mobile + tablet) */}
            <div className="hidden lg:flex gap-1">
              <Link to="/admin/dashboard" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/dashboard') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Dashboard</Link>
              <Link to="/admin/applications" title={canAccessRoute('/admin/applications') ? '' : 'Funcion desactivada por permisos'} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/applications') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'} ${disabledUiClass('/admin/applications')}`}>Solicitudes</Link>
              <Link to="/admin/employees" title={canAccessRoute('/admin/employees') ? '' : 'Funcion desactivada por permisos'} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/employees') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'} ${disabledUiClass('/admin/employees')}`}>Personal</Link>
              {isAdministrador && (
                <>
                  <Link to="/admin/tracking" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/tracking') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Tracking</Link>
                  <Link to="/admin/analytics" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/analytics') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Estadísticas</Link>
                </>
              )}
              <Link to="/admin/quotes" title={canAccessRoute('/admin/quotes') ? '' : 'Funcion desactivada por permisos'} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/quotes') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'} ${disabledUiClass('/admin/quotes')}`}>Cotizaciones</Link>
              <Link to="/admin/sales" title={canAccessRoute('/admin/sales') ? '' : 'Funcion desactivada por permisos'} className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/sales') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'} ${disabledUiClass('/admin/sales')}`}>Ventas</Link>
              <Link to="/admin/reservations" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/reservations') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Reservaciones</Link>
              <Link to="/admin/calendar" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/calendar') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Agenda</Link>
              <Link to="/admin/meetings" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/meetings') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Reuniones</Link>
              <Link to="/admin/messages" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/messages') ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/20' : 'text-slate-400 hover:bg-cyan-500/5 hover:text-cyan-300'}`}>Mensajes</Link>
              {['manuel','misael'].includes(user?.username?.toLowerCase()) && (
                <Link to="/admin/permissions" className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-light transition-all ${isActive('/admin/permissions') ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' : 'text-amber-600/60 hover:bg-amber-500/5 hover:text-amber-400'}`}>🔐 Permisos</Link>
              )}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2 sm:gap-4">
              {/* Desktop profile photo */}
              <div className="hidden lg:block relative group">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-cyan-500/30 bg-[#060d1f]">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={user?.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cyan-400 font-medium">{user?.username?.[0]?.toUpperCase()}</div>
                  )}
                </div>
                {user && ['manuel', 'misael'].includes(user.username.toLowerCase()) && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 w-10 h-10 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Cambiar foto">
                      <svg className="w-5 h-5 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </>
                )}
              </div>

              {/* Notification bell (both mobile + desktop) */}
              <div className="relative" ref={notifRef}>
                <button onClick={() => { 
                  const willOpen = !showNotifDropdown;
                  setShowNotifDropdown(willOpen);
                  if (willOpen && notifications.total > 0) {
                    // Actualizar el contador inmediatamente a 0
                    setNotifications(prev => ({ ...prev, total: 0 }));
                    // Luego marcar como vistas en el servidor
                    markNotificationsSeen();
                  }
                }} className="relative rounded-lg p-1.5 sm:p-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                  <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                  {notifications.total > 0 && <span className="absolute -top-0.5 -right-0.5 flex h-3.5 w-3.5 sm:h-4 sm:w-4 items-center justify-center rounded-full bg-red-500 text-[8px] sm:text-[9px] font-bold text-white">{notifications.total > 9 ? '9+' : notifications.total}</span>}
                </button>

                {/* Dropdown rendered via portal to escape backdrop-blur stacking context */}
                {showNotifDropdown && createPortal(
                  <div ref={notifDropdownRef} className="fixed right-3 sm:right-6 top-12 sm:top-16 w-[calc(100%-24px)] sm:w-80 max-w-sm rounded-xl border border-cyan-500/15 bg-[#0a0f1e] shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
                    <div className="px-4 py-3 border-b border-cyan-500/10 flex items-center justify-between">
                      <p className="text-sm font-medium text-slate-200">Notificaciones</p>
                      {notifications.total > 0 && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">{notifications.total} nuevas</span>}
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-cyan-500/5">
                      {notifications.unread_chat > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/messages'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200">{notifications.unread_chat} mensaje{notifications.unread_chat > 1 ? 's' : ''} sin leer</p>
                            <p className="text-[10px] text-slate-600">Chat interno</p>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
                        </button>
                      )}
                      {notifications.unread_emails > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/inbox'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200">{notifications.unread_emails} correo{notifications.unread_emails > 1 ? 's' : ''} sin leer</p>
                            <p className="text-[10px] text-slate-600">Bandeja de entrada</p>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
                        </button>
                      )}
                      {notifications.new_quotes > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/quotes'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200">{notifications.new_quotes} solicitud{notifications.new_quotes > 1 ? 'es' : ''} de cotización nueva{notifications.new_quotes > 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-slate-600">Sin atender</p>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
                        </button>
                      )}
                      {notifications.new_applications > 0 && (
                        <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/applications'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors">
                          <div className="h-8 w-8 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0">
                            <svg className="h-4 w-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-200">{notifications.new_applications} solicitud{notifications.new_applications > 1 ? 'es' : ''} de empleo reciente{notifications.new_applications > 1 ? 's' : ''}</p>
                            <p className="text-[10px] text-slate-600">Últimas 48 horas</p>
                          </div>
                          <span className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
                        </button>
                      )}
                      {notifications.recent_chats && notifications.recent_chats.length > 0 && notifications.recent_chats.slice(0, 3).map((n, i) => (
                        <button key={i} onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/messages'); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/5 transition-colors">
                          <div className="h-7 w-7 rounded-full bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {n.sender_photo ? <img src={n.sender_photo} alt="" className="w-full h-full object-cover" /> : <span className="text-[10px] text-cyan-400">{(n.sender_name||'?')[0]}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] text-slate-300 truncate"><span className="font-medium">{n.sender_name}</span>: {n.message_type !== 'text' ? '📎 Archivo' : (n.content || '').substring(0, 40)}</p>
                          </div>
                        </button>
                      ))}
                      {notifications.total === 0 && (
                        <div className="px-4 py-8 text-center">
                          <div className="h-8 w-8 rounded-full bg-cyan-500/10 border border-cyan-500/15 flex items-center justify-center mx-auto mb-2">
                            <svg className="h-4 w-4 text-cyan-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                          </div>
                          <p className="text-xs text-slate-600">Todo al día</p>
                        </div>
                      )}
                    </div>
                  </div>,
                  document.body
                )}
              </div>

              {/* Desktop user info + logout */}
              <div className="hidden lg:flex items-center gap-4">
                <div className="text-sm">
                  <p className="text-slate-300">Bienvenido, {user?.username}</p>
                  {user?.role === 'administrador' && <p className="text-xs text-cyan-500/60">Administrador</p>}
                </div>
                <button onClick={handleLogout} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400 transition-all hover:bg-red-500/20">Salir</button>
              </div>

              {/* Mobile/tablet hamburger button */}
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`lg:hidden rounded-xl p-2 transition-all border ${
                  mobileMenuOpen
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'border-slate-700/50 bg-white/[0.03] text-slate-400 hover:border-cyan-500/30 hover:text-cyan-400'
                }`}
                aria-label="Menú">
                {mobileMenuOpen ? (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" /></svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile/tablet dropdown menu */}
          <div className={`lg:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="mt-3 rounded-2xl border border-cyan-500/10 bg-[#040c1a]/80 backdrop-blur-sm overflow-hidden">
              {/* User row */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-500/8">
                <div className="flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-full overflow-hidden border border-cyan-500/20 bg-slate-800 flex items-center justify-center">
                    {profilePhoto
                      ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                      : <span className="text-xs text-cyan-400 font-medium">{user?.username?.[0]?.toUpperCase()}</span>}
                  </div>
                  <div>
                    <p className="text-xs text-slate-300 leading-tight">{user?.username}</p>
                    <p className="text-[10px] text-cyan-500/50 capitalize">{user?.role}</p>
                  </div>
                </div>
                <button onClick={handleLogout} className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-[11px] text-red-400 hover:bg-red-500/20 transition-all">Salir</button>
              </div>

              {/* Nav links */}
              <div className="p-2 space-y-0.5">
                {[
                  { to: '/admin/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
                  { to: '/admin/applications', label: 'Solicitudes', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
                  { to: '/admin/employees', label: 'Personal', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                  ...(isAdministrador ? [
                    { to: '/admin/tracking', label: 'Tracking', icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7' },
                    { to: '/admin/analytics', label: 'Estadísticas', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
                  ] : []),
                  { to: '/admin/quotes', label: 'Cotizaciones', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                  { to: '/admin/sales', label: 'Ventas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
                  { to: '/admin/reservations', label: 'Reservaciones', icon: 'M8 7V3m8 4V3m-9 8h10m-3 8h5a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v5m0 0h5m-5 0v6a2 2 0 002 2h3' },
                  { to: '/admin/calendar', label: 'Agenda', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                  { to: '/admin/meetings', label: 'Reuniones', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
                  { to: '/admin/messages', label: 'Mensajes', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', badge: notifications.unread_chat > 0 ? notifications.unread_chat : null },
                ].map(item => {
                  const disabled = !canAccessRoute(item.to);
                  if (disabled) return null;
                  return (
                  <Link key={item.to} to={item.to}
                    onClick={(e) => { if (disabled) e.preventDefault(); }}
                    title={disabled ? 'Funcion desactivada por permisos' : ''}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all ${
                      isActive(item.to)
                        ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/15'
                        : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}>
                    <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                    </svg>
                    <span className="font-light">{item.label}</span>
                    {item.badge && <span className="ml-auto text-[10px] bg-blue-500 text-white rounded-full h-4 w-4 flex items-center justify-center font-bold">{item.badge > 9 ? '9+' : item.badge}</span>}
                  </Link>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="admin-mobile-shell relative z-10 mx-auto max-w-7xl px-3 pb-20 sm:px-6 sm:py-8 overflow-x-hidden">
        <div className="admin-mobile-content min-w-0">
          <Outlet />
        </div>
        
        {/* Floating music button - bottom left (invisible) */}
        {isAdministrador && (
          <button
            onClick={handlePlayMusic}
            className="fixed bottom-6 left-6 rounded-full bg-black/10 p-3 text-[#D4AF37]/5 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-[#D4AF37] hover:scale-110 border border-[#D4AF37]/5 hover:border-[#D4AF37]/30 opacity-5 hover:opacity-100"
            title="Reproducir música"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        )}
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan-500/20 bg-[#030b18]/95 backdrop-blur-lg lg:hidden">
        <div className="mx-auto grid max-w-7xl grid-cols-5 px-2 py-1">
          {[
            { to: '/admin/dashboard', label: 'Inicio', icon: 'M3 12l2-2 7-7 7 7m-2 2v8a1 1 0 01-1 1h-3m-6 0H6a1 1 0 01-1-1v-8' },
            { to: '/admin/sales', label: 'Ventas', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V7m0 9v1' },
            { to: '/admin/reservations', label: 'Reservas', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
            { to: '/admin/messages', label: 'Mensajes', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
            { to: '/admin/calendar', label: 'Agenda', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
          ].filter((item) => canAccessRoute(item.to)).map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center rounded-lg py-1.5 text-[10px] transition-all ${
                isActive(item.to) ? 'text-cyan-300 bg-cyan-500/10' : 'text-slate-400'
              }`}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              <span className="mt-0.5">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

export default AdminLayout;
