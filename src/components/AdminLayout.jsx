import { Link, useNavigate, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, Users, Briefcase, FileText, DollarSign,
  CalendarDays, MessageSquare, BarChart3, Activity, Shield,
  Zap, ChevronLeft, ChevronRight, X, Menu, Bell, Search,
  LogOut, Sun, Moon, ExternalLink, MoreHorizontal
} from 'lucide-react';
import { authAPI } from '../services/api';
import trackingService from '../services/tracking';
import { useTheme } from '../hooks/useTheme';
import AdminSandboxDial from './AdminSandboxDial';
import {
  disablePushNotifications,
  enablePushNotifications,
  getPushAvailability,
  getPushPermission,
  subscribeForegroundPush,
  syncPushNotifications,
} from '../services/pushNotifications';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' ? window.matchMedia(query).matches : false);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    setMatches(mql.matches);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

function AdminLayout() {
  const { theme, toggleTheme } = useTheme();
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
  const [pushReady, setPushReady] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const sessionReady = useRef(false);
  const inactivityTimer = useRef(null);
  const inMeetingRef = useRef(false);

  // Inactivity auto-logout (3 minutes) — suspended while in a meeting room
  useEffect(() => {
    const LIMIT = 3 * 60 * 1000;

    const doLogout = () => {
      if (inMeetingRef.current) return;
      alert('Sesión cerrada por inactividad\n\nNon omnis moriar');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/admin/login';
    };

    const resetTimer = () => {
      if (inMeetingRef.current) return;
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(doLogout, LIMIT);
    };

    const suspendTimer = () => {
      inMeetingRef.current = true;
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };

    const resumeTimer = () => {
      inMeetingRef.current = false;
      resetTimer();
    };

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    events.forEach(ev => document.addEventListener(ev, resetTimer, { passive: true }));
    window.addEventListener('meeting:start', suspendTimer);
    window.addEventListener('meeting:end',   resumeTimer);
    resetTimer();

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      events.forEach(ev => document.removeEventListener(ev, resetTimer));
      window.removeEventListener('meeting:start', suspendTimer);
      window.removeEventListener('meeting:end',   resumeTimer);
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
        .then(() => { if (import.meta.env.DEV) console.log('Dashboard audio playing'); })
        .catch(() => { /* autoplay bloqueado hasta clic/tecla; sin log en prod para no ensuciar consola */ });
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

  useEffect(() => {
    const onMeetingStart = () => { audio.pause() }
    const onMeetingEnd   = () => { audio.play().catch(() => {}) }
    window.addEventListener('meeting:start', onMeetingStart)
    window.addEventListener('meeting:end',   onMeetingEnd)
    return () => {
      window.removeEventListener('meeting:start', onMeetingStart)
      window.removeEventListener('meeting:end',   onMeetingEnd)
    }
  }, [audio])

  useEffect(() => {
    let active = true;
    let disposeForeground = null;

    const bootPush = async () => {
      const availability = await getPushAvailability();
      if (!active) return;
      setPushReady(Boolean(availability.supported));
      if (!availability.supported) return;

      if (getPushPermission() === 'granted') {
        const syncResult = await syncPushNotifications();
        if (!active) return;
        setPushEnabled(Boolean(syncResult.ok));
      } else {
        setPushEnabled(false);
      }

      disposeForeground = await subscribeForegroundPush((payload) => {
        const title = payload?.notification?.title || 'Bonifacios';
        const body = payload?.notification?.body || 'Nueva actividad';
        if (Notification.permission === 'granted' && document.visibilityState !== 'visible') {
          new Notification(title, { body, icon: '/logo.png' });
        } else {
          loadNotifications();
        }
      });
    };

    const onServiceWorkerMessage = (event) => {
      const data = event?.data;
      if (data?.type === 'PUSH_NAVIGATE' && data?.url) {
        navigate(data.url);
      }
    };

    bootPush();
    navigator.serviceWorker?.addEventListener?.('message', onServiceWorkerMessage);
    return () => {
      active = false;
      if (typeof disposeForeground === 'function') disposeForeground();
      navigator.serviceWorker?.removeEventListener?.('message', onServiceWorkerMessage);
    };
  }, [navigate]);

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

  // ── Sidebar state ──
  const isMobile = useMediaQuery('(max-width: 767px)');
  const isTablet = useMediaQuery('(min-width: 768px) and (max-width: 1023px)');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => { if (isTablet) setSidebarCollapsed(true); }, [isTablet]);
  useEffect(() => {
    if (mobileSidebarOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileSidebarOpen]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // ── Nav items ──
  const NAV_ITEMS = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'from-blue-500 to-cyan-400', mobileNav: true },
    { to: '/admin/sales', label: 'Ventas', icon: DollarSign, color: 'from-emerald-500 to-teal-400', mobileNav: true },
    { to: '/admin/reservations', label: 'Reservaciones', icon: CalendarDays, color: 'from-violet-500 to-purple-400', mobileNav: true },
    { to: '/admin/applications', label: 'Solicitudes', icon: Briefcase, color: 'from-amber-500 to-orange-400', mobileNav: false },
    { to: '/admin/employees', label: 'Personal', icon: Users, color: 'from-rose-500 to-pink-400', mobileNav: false },
    { to: '/admin/quotes', label: 'Cotizaciones', icon: FileText, color: 'from-cyan-500 to-blue-400', mobileNav: false },
    { to: '/admin/messages', label: 'Mensajes', icon: MessageSquare, color: 'from-sky-500 to-indigo-400', mobileNav: true },
    ...(isAdministrador ? [
      { to: '/admin/tracking', label: 'Tracking', icon: Activity, color: 'from-fuchsia-500 to-purple-400', mobileNav: false },
      { to: '/admin/analytics', label: 'Estadísticas', icon: BarChart3, color: 'from-teal-500 to-emerald-400', mobileNav: false },
    ] : []),
    ...(['manuel','misael'].includes(user?.username?.toLowerCase()) ? [
      { to: '/admin/permissions', label: 'Permisos', icon: Shield, color: 'from-amber-400 to-yellow-500', mobileNav: false },
    ] : []),
  ].filter(item => canAccessRoute(item.to));

  const MOBILE_NAV_ITEMS = NAV_ITEMS.filter(item => item.mobileNav);
  const activeNavItem = NAV_ITEMS.find(item => isActive(item.to)) || NAV_ITEMS[0];

  const handlePlayMusic = () => {
    audio.currentTime = 0;
    audio.play().catch(err => console.log('Audio play error:', err));
  };

  const handleEnablePush = async () => {
    setPushBusy(true);
    try {
      const result = await enablePushNotifications();
      if (!result.ok) {
        if (result.reason === 'permission_denied') {
          alert('Permiso de notificaciones denegado. Actívalo en ajustes del navegador.');
        } else if (result.reason === 'missing_firebase_config') {
          alert('Falta configurar Firebase para notificaciones push.');
        } else {
          alert('No fue posible activar notificaciones push en este dispositivo.');
        }
        return;
      }
      setPushEnabled(true);
    } finally {
      setPushBusy(false);
    }
  };

  const handleDisablePush = async () => {
    setPushBusy(true);
    try {
      await disablePushNotifications();
      setPushEnabled(false);
    } finally {
      setPushBusy(false);
    }
  };

  // ── Sidebar content (shared between desktop and mobile overlay) ──
  const SidebarContent = ({ onItemClick }) => (
    <>
      <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-0.5 overscroll-contain">
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link key={item.to} to={item.to} onClick={onItemClick}
              title={sidebarCollapsed && !isMobile ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 touch-manipulation min-h-[44px] ${
                sidebarCollapsed && !isMobile ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
              } ${active ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03] active:bg-white/[0.06]'}`}>
              <div className={`w-8 h-8 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                active ? `bg-gradient-to-br ${item.color} shadow-md` : 'bg-slate-800/40'
              }`}>
                <Icon size={15} className={active ? 'text-white' : ''} />
              </div>
              {(isMobile || !sidebarCollapsed) && (
                <div className="flex-1 text-left min-w-0">
                  <span className="text-[12px] font-semibold block truncate">{item.label}</span>
                </div>
              )}
              {active && isMobile && (
                <div className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Workspace link */}
      <div className="p-1.5 border-t border-slate-800/40">
        <Link to="/admin/workspace" onClick={onItemClick}
          className={`w-full flex items-center gap-2.5 rounded-xl transition-all duration-150 touch-manipulation min-h-[44px] ${
            sidebarCollapsed && !isMobile ? 'justify-center py-2.5 px-0' : 'px-3 py-2.5'
          } text-amber-400/70 hover:text-amber-300 hover:bg-amber-500/5 active:bg-amber-500/10`}>
          <div className="w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
            <Zap size={14} className="text-black" />
          </div>
          {(isMobile || !sidebarCollapsed) && (
            <span className="text-[12px] font-semibold">Workspace</span>
          )}
          {(isMobile || !sidebarCollapsed) && <ExternalLink size={12} className="ml-auto text-amber-500/40" />}
        </Link>
      </div>

      {/* Collapse toggle (desktop/tablet only) */}
      {!isMobile && (
        <div className="p-1.5 border-t border-slate-800/40">
          <button onClick={() => setSidebarCollapsed(p => !p)}
            className="w-full flex items-center justify-center py-2.5 rounded-xl text-slate-700 hover:text-slate-400 transition-colors touch-manipulation min-h-[44px]">
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      )}

      {/* Mobile: user info + logout */}
      {isMobile && (
        <div className="p-3 border-t border-slate-800/40 space-y-2">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-8 w-8 rounded-full overflow-hidden border border-cyan-500/20 bg-slate-800 flex items-center justify-center shrink-0">
              {profilePhoto
                ? <img src={profilePhoto} alt="" className="w-full h-full object-cover" />
                : <span className="text-xs text-cyan-400 font-medium">{user?.username?.[0]?.toUpperCase()}</span>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-slate-600 truncate">@{user?.username}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-red-400/70 hover:text-red-400 hover:bg-red-500/5 transition-all touch-manipulation min-h-[44px]">
            <LogOut size={14} />
            <span className="text-[12px] font-medium">Cerrar sesión</span>
          </button>
        </div>
      )}
    </>
  );

  // ── Notification dropdown (reusable via portal) ──
  const NotifDropdown = () => (
    <div ref={notifDropdownRef} className="admin-notif-dropdown fixed right-3 sm:right-6 top-12 sm:top-16 w-[calc(100%-24px)] sm:w-80 max-w-sm rounded-xl border border-cyan-500/15 bg-[#0a0f1e] shadow-2xl overflow-hidden" style={{ zIndex: 99999 }}>
      <div className="px-4 py-3 border-b border-cyan-500/10 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-slate-200">Notificaciones</p>
          {notifications.total > 0 && <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 rounded-full px-2 py-0.5">{notifications.total} nuevas</span>}
        </div>
        {pushReady && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-2.5 py-2">
            <div>
              <p className="text-[11px] text-slate-300">Push al celular</p>
              <p className="text-[10px] text-slate-500">{pushEnabled ? 'Activo en este dispositivo' : 'Activa para recibir alertas'}</p>
            </div>
            <button type="button" onClick={pushEnabled ? handleDisablePush : handleEnablePush} disabled={pushBusy}
              className={`inline-flex min-h-[34px] items-center justify-center rounded-md border px-2.5 text-[10px] font-medium transition-all touch-manipulation ${
                pushEnabled ? 'border-emerald-500/30 bg-emerald-500/12 text-emerald-300' : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
              } ${pushBusy ? 'opacity-60' : ''}`}>
              {pushBusy ? '...' : pushEnabled ? 'Desactivar' : 'Activar'}
            </button>
          </div>
        )}
      </div>
      <div className="max-h-80 overflow-y-auto divide-y divide-cyan-500/5 overscroll-contain">
        {notifications.unread_chat > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/messages'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors touch-manipulation">
            <div className="h-8 w-8 rounded-full bg-blue-500/15 border border-blue-500/20 flex items-center justify-center flex-shrink-0"><MessageSquare size={14} className="text-blue-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200">{notifications.unread_chat} mensaje{notifications.unread_chat > 1 ? 's' : ''} sin leer</p>
              <p className="text-[10px] text-slate-600">Chat interno</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-blue-400 flex-shrink-0" />
          </button>
        )}
        {notifications.unread_emails > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/inbox'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors touch-manipulation">
            <div className="h-8 w-8 rounded-full bg-green-500/15 border border-green-500/20 flex items-center justify-center flex-shrink-0"><svg className="h-4 w-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200">{notifications.unread_emails} correo{notifications.unread_emails > 1 ? 's' : ''} sin leer</p>
              <p className="text-[10px] text-slate-600">Bandeja de entrada</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-green-400 flex-shrink-0" />
          </button>
        )}
        {notifications.new_quotes > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/quotes'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors touch-manipulation">
            <div className="h-8 w-8 rounded-full bg-cyan-500/15 border border-cyan-500/20 flex items-center justify-center flex-shrink-0"><FileText size={14} className="text-cyan-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200">{notifications.new_quotes} solicitud{notifications.new_quotes > 1 ? 'es' : ''} de cotización</p>
              <p className="text-[10px] text-slate-600">Sin atender</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-cyan-400 flex-shrink-0" />
          </button>
        )}
        {notifications.new_applications > 0 && (
          <button onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/applications'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 hover:bg-cyan-500/5 transition-colors touch-manipulation">
            <div className="h-8 w-8 rounded-full bg-orange-500/15 border border-orange-500/20 flex items-center justify-center flex-shrink-0"><Briefcase size={14} className="text-orange-400" /></div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200">{notifications.new_applications} solicitud{notifications.new_applications > 1 ? 'es' : ''} de empleo</p>
              <p className="text-[10px] text-slate-600">Últimas 48 horas</p>
            </div>
            <span className="h-2 w-2 rounded-full bg-orange-400 flex-shrink-0" />
          </button>
        )}
        {notifications.recent_chats && notifications.recent_chats.length > 0 && notifications.recent_chats.slice(0, 3).map((n, i) => (
          <button key={i} onClick={(e) => { e.stopPropagation(); setShowNotifDropdown(false); navigate('/admin/messages'); }} className="w-full text-left flex items-center gap-3 px-4 py-2.5 hover:bg-cyan-500/5 transition-colors touch-manipulation">
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
    </div>
  );

  return (
    <div className={`admin-layout-root h-[100dvh] bg-[#030712] flex overflow-hidden select-none${theme === 'light' ? ' admin-light' : ''}`}>

      {/* ─── Desktop/Tablet Sidebar ─── */}
      {!isMobile && (
        <motion.aside
          animate={{ width: sidebarCollapsed ? 56 : 220 }}
          transition={{ type: 'spring', stiffness: 400, damping: 34 }}
          className="admin-sidebar h-full bg-[#050a14] border-r border-slate-800/40 flex flex-col shrink-0 z-20">
          {/* Sidebar header / logo */}
          <div className={`flex items-center h-14 border-b border-slate-800/40 shrink-0 ${sidebarCollapsed ? 'justify-center' : 'gap-2.5 px-4'}`}>
            <Link to="/admin/dashboard" className="flex items-center gap-2.5 group">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20 transition-transform group-hover:scale-110">
                <span className="text-sm font-black text-black">B</span>
              </div>
              {!sidebarCollapsed && <span className="text-white font-black text-xs tracking-tight">BONIFACIO'S</span>}
            </Link>
          </div>
          <SidebarContent />
        </motion.aside>
      )}

      {/* ─── Mobile Sidebar Overlay ─── */}
      <AnimatePresence>
        {isMobile && mobileSidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 400, damping: 40 }}
              className="admin-sidebar fixed inset-y-0 left-0 z-[70] w-[280px] bg-[#050a14] border-r border-slate-800/40 flex flex-col shadow-2xl">
              <div className="flex items-center justify-between h-14 border-b border-slate-800/40 px-4 shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#D4AF37] to-amber-600 flex items-center justify-center shrink-0">
                    <span className="text-sm font-black text-black">B</span>
                  </div>
                  <span className="text-white font-black text-xs tracking-tight">BONIFACIO'S</span>
                </div>
                <button onClick={() => setMobileSidebarOpen(false)} className="p-2 rounded-lg text-slate-600 hover:text-white transition-colors touch-manipulation">
                  <X size={18} />
                </button>
              </div>
              <SidebarContent onItemClick={() => setMobileSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ─── Main Area ─── */}
      <div className="admin-main flex-1 flex flex-col min-w-0">
        {/* Header bar */}
        <header className="admin-header h-14 border-b border-slate-800/40 bg-[#050a14]/80 backdrop-blur-sm flex items-center justify-between px-3 sm:px-4 shrink-0 z-10">
          <div className="flex items-center gap-2">
            {isMobile && (
              <button onClick={() => setMobileSidebarOpen(true)} className="p-2 -ml-1 rounded-lg text-slate-500 hover:text-white transition-colors touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center">
                <Menu size={20} />
              </button>
            )}
            {activeNavItem && (
              <>
                <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${activeNavItem.color} flex items-center justify-center`}>
                  {(() => { const I = activeNavItem.icon; return <I size={12} className="text-white" />; })()}
                </div>
                <h1 className="text-white font-bold text-sm truncate">{activeNavItem.label}</h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Theme toggle */}
            <button onClick={toggleTheme}
              className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.03] transition-colors touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}>
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-indigo-400" />}
            </button>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button onClick={() => {
                const willOpen = !showNotifDropdown;
                setShowNotifDropdown(willOpen);
                if (willOpen && notifications.total > 0) {
                  setNotifications(prev => ({ ...prev, total: 0 }));
                  markNotificationsSeen();
                }
              }} className="relative p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/[0.03] transition-colors touch-manipulation min-h-[36px] min-w-[36px] flex items-center justify-center">
                <Bell size={16} />
                {notifications.total > 0 && <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-rose-500 text-[8px] font-bold text-white flex items-center justify-center ring-2 ring-[#050a14]">{notifications.total > 9 ? '9+' : notifications.total}</span>}
              </button>
              {showNotifDropdown && createPortal(<NotifDropdown />, document.body)}
            </div>

            {/* Desktop profile + logout */}
            <div className="hidden md:flex items-center gap-2 ml-1">
              <div className="relative group">
                <div className="w-8 h-8 rounded-full overflow-hidden border-2 border-cyan-500/30 bg-[#060d1f] cursor-pointer">
                  {profilePhoto ? (
                    <img src={profilePhoto} alt={user?.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-cyan-400 font-medium text-xs">{user?.username?.[0]?.toUpperCase()}</div>
                  )}
                </div>
                {user && ['manuel', 'misael'].includes(user.username?.toLowerCase()) && (
                  <>
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="absolute inset-0 w-8 h-8 rounded-full bg-black/70 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="Cambiar foto">
                      <svg className="w-4 h-4 text-[#D4AF37]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                  </>
                )}
              </div>
              <p className="text-xs text-slate-500 hidden lg:block">{user?.username}</p>
              <button onClick={handleLogout} className="rounded-lg border border-red-500/20 bg-red-500/10 px-2.5 py-1.5 text-[10px] text-red-400 transition-all hover:bg-red-500/20 touch-manipulation">
                <LogOut size={12} />
              </button>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className={`flex-1 overflow-y-auto overflow-x-hidden overscroll-contain ${isMobile ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}`}>
          <div className="mx-auto max-w-7xl px-3 py-3 sm:px-6 sm:py-6">
            <Outlet />
          </div>

          {/* Floating music button */}
          {isAdministrador && (
            <button onClick={handlePlayMusic}
              className={`fixed ${isMobile ? 'bottom-24 left-4' : 'bottom-6 left-6'} rounded-full bg-black/10 p-3 text-[#D4AF37]/5 backdrop-blur-sm transition-all hover:bg-black/60 hover:text-[#D4AF37] hover:scale-110 border border-[#D4AF37]/5 hover:border-[#D4AF37]/30 opacity-5 hover:opacity-100 z-30`}
              title="Reproducir música">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
            </button>
          )}
        </main>
      </div>

      {/* ─── Mobile Bottom Nav ─── */}
      {isMobile && (
        <nav className="admin-mobile-nav fixed bottom-0 inset-x-0 z-50 bg-[#050a14]/95 backdrop-blur-xl border-t border-slate-800/40 pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-around h-16 px-1">
            {MOBILE_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link key={item.to} to={item.to}
                  className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all touch-manipulation active:scale-90 min-w-[52px] ${
                    active ? 'text-white' : 'text-slate-600'
                  }`}>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                    active ? `bg-gradient-to-br ${item.color} shadow-md shadow-white/5` : ''
                  }`}>
                    <Icon size={16} />
                  </div>
                  <span className={`text-[9px] font-semibold transition-colors ${active ? 'text-white' : 'text-slate-700'}`}>{item.label}</span>
                </Link>
              );
            })}
            {/* More button for non-mobile-nav items */}
            <button onClick={() => setMobileSidebarOpen(true)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all touch-manipulation active:scale-90 min-w-[52px] ${
                !MOBILE_NAV_ITEMS.find(m => isActive(m.to)) ? 'text-white' : 'text-slate-600'
              }`}>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                !MOBILE_NAV_ITEMS.find(m => isActive(m.to)) && activeNavItem ? `bg-gradient-to-br ${activeNavItem.color} shadow-md shadow-white/5` : ''
              }`}>
                <MoreHorizontal size={16} />
              </div>
              <span className={`text-[9px] font-semibold ${!MOBILE_NAV_ITEMS.find(m => isActive(m.to)) ? 'text-white' : 'text-slate-700'}`}>Más</span>
            </button>
          </div>
        </nav>
      )}

      <AdminSandboxDial />
    </div>
  );
}

export default AdminLayout;
