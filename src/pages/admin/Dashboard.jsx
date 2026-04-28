import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { analyticsAPI, siteAnalyticsAPI, userStatusAPI, quotesAPI, userPermissionsAPI, authAPI } from '../../services/api';
import SalesWidget from '../../components/SalesWidget';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import AdminDashboard from './AdminDashboard';

function ViewerDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trackingData, setTrackingData] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [siteStats, setSiteStats] = useState(null);
  const [manuelOnsite, setManuelOnsite] = useState(false);
  const [onsiteUpdatedAt, setOnsiteUpdatedAt] = useState(null);
  const [onsiteLoading, setOnsiteLoading] = useState(false);
  const [quotesStats, setQuotesStats] = useState(null);
  const [unreadChat, setUnreadChat] = useState(0);
  const [editPerms, setEditPerms] = useState([]);
  const [permSaving, setPermSaving] = useState({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'administrador';
  const isManuelOrMisael = ['manuel','misael'].includes(user.username?.toLowerCase());
  const [myPerms, setMyPerms] = useState({
    can_view_employees: user?.can_view_employees,
    can_edit_employees: user?.can_edit_employees,
    can_delete_employees: user?.can_delete_employees,
    can_view_quotes: user?.can_view_quotes,
    can_edit_quotes: user?.can_edit_quotes,
    can_delete_quotes: user?.can_delete_quotes,
    can_view_applications: user?.can_view_applications,
    can_edit_applications: user?.can_edit_applications,
    can_delete_applications: user?.can_delete_applications,
    can_view_sales: user?.can_view_sales,
  });

  const boolWithDefault = (v, def = true) => (v === undefined || v === null ? def : Boolean(v));
  const canApplications = isAdmin || (
    myPerms.can_view_applications !== undefined && myPerms.can_view_applications !== null
      ? Boolean(myPerms.can_view_applications)
      : boolWithDefault(myPerms.can_edit_applications, true) || boolWithDefault(myPerms.can_delete_applications, true)
  );
  const canEmployees = isAdmin || (
    myPerms.can_view_employees !== undefined && myPerms.can_view_employees !== null
      ? Boolean(myPerms.can_view_employees)
      : boolWithDefault(myPerms.can_edit_employees, true) || boolWithDefault(myPerms.can_delete_employees, true)
  );
  const canQuotes = isAdmin || (
    myPerms.can_view_quotes !== undefined && myPerms.can_view_quotes !== null
      ? Boolean(myPerms.can_view_quotes)
      : boolWithDefault(myPerms.can_edit_quotes, true) || boolWithDefault(myPerms.can_delete_quotes, true)
  );
  const canSales = isAdmin || boolWithDefault(myPerms.can_view_sales, true);

  const DEUDA_TOTAL = 550000;
  const [aportaciones, setAportaciones] = useState([
    { id: 1, nombre: 'Manuel', monto: 200000 },
    { id: 2, nombre: 'Carlos', monto: 100000 },
    { id: 3, nombre: 'Bonifacios', monto: 50000 },
  ]);
  const [finModal, setFinModal] = useState(false);
  const [finEditing, setFinEditing] = useState(null);
  const [finNombre, setFinNombre] = useState('');
  const [finMonto, setFinMonto] = useState('');
  const [finConfirmId, setFinConfirmId] = useState(null);
  const [finNextId, setFinNextId] = useState(4);

  const fmt = (n) => '$' + Number(n).toLocaleString('es-MX');

  const calcCascade = (rows) => {
    let saldo = DEUDA_TOTAL;
    return rows.map(r => {
      saldo -= r.monto;
      return { ...r, saldoTras: saldo };
    });
  };

  const totalRecaudado = aportaciones.reduce((s, r) => s + r.monto, 0);
  const saldoFinal = DEUDA_TOTAL - totalRecaudado;
  const progreso = Math.min(100, (totalRecaudado / DEUDA_TOTAL) * 100);
  const cascade = calcCascade(aportaciones);

  const openNew = () => { setFinEditing(null); setFinNombre(''); setFinMonto(''); setFinModal(true); };
  const openEdit = (r) => { setFinEditing(r.id); setFinNombre(r.nombre); setFinMonto(String(r.monto)); setFinModal(true); };
  const closeFin = () => setFinModal(false);

  const handleFinSave = () => {
    const m = parseFloat(finMonto);
    if (!finNombre.trim() || isNaN(m) || m <= 0) return;
    if (finEditing !== null) {
      setAportaciones(prev => prev.map(r => r.id === finEditing ? { ...r, nombre: finNombre.trim(), monto: m } : r));
    } else {
      setAportaciones(prev => [...prev, { id: finNextId, nombre: finNombre.trim(), monto: m }]);
      setFinNextId(n => n + 1);
    }
    setFinModal(false);
  };

  const handleFinDelete = (id) => {
    setAportaciones(prev => prev.filter(r => r.id !== id));
    setFinConfirmId(null);
  };
  const isManuel = user.username?.toLowerCase() === 'manuel';
  const isMisael = user.username?.toLowerCase() === 'misael';

  useEffect(() => {
    loadDashboard();
    if (isManuel || isMisael) { loadOnsiteStatus(); loadEditPerms(); }
    loadMyPermissions();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMyPermissions = async () => {
    try {
      const res = await authAPI.getMe();
      if (res?.data?.success && res.data.user) {
        const merged = { ...user, ...res.data.user };
        localStorage.setItem('user', JSON.stringify(merged));
        setMyPerms({
          can_view_employees: res.data.user.can_view_employees,
          can_edit_employees: res.data.user.can_edit_employees,
          can_delete_employees: res.data.user.can_delete_employees,
          can_view_quotes: res.data.user.can_view_quotes,
          can_edit_quotes: res.data.user.can_edit_quotes,
          can_delete_quotes: res.data.user.can_delete_quotes,
          can_view_applications: res.data.user.can_view_applications,
          can_edit_applications: res.data.user.can_edit_applications,
          can_delete_applications: res.data.user.can_delete_applications,
          can_view_sales: res.data.user.can_view_sales,
        });
      }
    } catch { /* silent */ }
  };

  const loadEditPerms = async () => {
    try {
      const res = await userPermissionsAPI.getPermissions();
      if (res.data.success) setEditPerms(res.data.users || []);
    } catch { /* silent */ }
  };

  const toggleEditPerm = async (username, current) => {
    setPermSaving(p => ({ ...p, [username]: true }));
    try {
      await userPermissionsAPI.setPermission(username, !current);
      setEditPerms(p => p.map(u => u.username === username ? { ...u, can_edit: !current } : u));
    } catch { /* silent */ }
    setPermSaving(p => ({ ...p, [username]: false }));
  };

  const loadOnsiteStatus = async () => {
    try {
      const res = await userStatusAPI.getOnsiteStatus();
      if (res.data.success) {
        setManuelOnsite(res.data.onsite);
        setOnsiteUpdatedAt(res.data.updated_at);
      }
    } catch (err) { console.error('Error loading onsite status:', err); }
  };

  const toggleOnsite = async () => {
    setOnsiteLoading(true);
    try {
      const res = await userStatusAPI.setOnsiteStatus(!manuelOnsite);
      if (res.data.success) {
        setManuelOnsite(res.data.onsite);
        setOnsiteUpdatedAt(res.data.updated_at);
      }
    } catch (err) { console.error('Error toggling onsite:', err); }
    finally { setOnsiteLoading(false); }
  };

  const loadQuotesStats = async () => {
    try {
      const res = await quotesAPI.getQuotes();
      if (res.data.success) {
        setQuotesStats(res.data.stats);
      }
    } catch (error) {
      console.error('Error loading quotes stats:', error);
    }
  };

  const loadDashboard = async () => {
    try {
      const response = await analyticsAPI.getDashboard(7);
      setData(response.data);
      if (user.role === 'administrador') {
        loadTrackingData();
        loadSiteStats();
      }
      loadInbox();
      loadQuotesStats();
      loadUnreadChat();
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadChat = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat/notifications.php`, { credentials: 'include' });
      const d = await res.json();
      if (d.success) setUnreadChat((d.unread_chat || 0) + (d.unread_emails || 0));
    } catch { /* silent */ }
  };

  const loadTrackingData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/tracking/recent-activity.php`);
      const result = await response.json();
      if (result.success) setTrackingData(result.data || []);
    } catch (error) {
      console.error('Error loading tracking data:', error);
    }
  };

  const loadSiteStats = async () => {
    try {
      const res = await siteAnalyticsAPI.getStats(7);
      if (res.data.success) setSiteStats(res.data.stats);
    } catch (error) {
      console.error('Error loading site stats:', error);
    }
  };

  const loadInbox = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/email/inbox.php`);
      const result = await response.json();
      if (result.success) setInbox(result.emails || []);
    } catch (error) {
      console.error('Error loading inbox:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="relative h-20 w-20">
          <div className="absolute inset-0 rounded-full border border-cyan-500/10" />
          <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin" style={{ animationDuration: '2s' }} />
          <div className="absolute inset-3 rounded-full border border-blue-500/10" />
          <div className="absolute inset-3 rounded-full border-t border-blue-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.4s' }} />
          <div className="absolute inset-6 rounded-full border border-cyan-400/20" />
          <div className="absolute inset-6 rounded-full bg-cyan-500/5 flex items-center justify-center">
            <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
          </div>
        </div>
        <p className="text-cyan-400/50 text-xs tracking-[0.4em] uppercase font-light">Cargando sistema...</p>
      </div>
    );
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', weekday: 'short', day: 'numeric', month: 'short' });
  const blockedModuleClass = 'opacity-40 grayscale pointer-events-none cursor-not-allowed';
  const moduleEnabledMap = {
    '/admin/applications': canApplications,
    '/admin/employees': canEmployees,
    '/admin/quotes': canQuotes,
    '/admin/sales': canSales,
  };
  const isModuleEnabled = (to) => (moduleEnabledMap[to] ?? true);

  const ModuleLink = ({ to, enabled = true, className = '', children }) => {
    if (!enabled) return null;
    return <Link to={to} className={className}>{children}</Link>;
  };

  return (
    <div className="space-y-4 p-1">

      {/* ── SALES WIDGET (visible para todos los viewers) ── */}
      <div className={!canSales ? blockedModuleClass : ''} title={!canSales ? 'Funcion desactivada por permisos' : ''}>
        <SalesWidget />
      </div>

      {/* ── ROW 1: Header + Hero Metric + Glowing Radar ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Left: Title + Onsite Toggle */}
        <div className="flex flex-col justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/50 mb-1">Panel de Control</p>
            <h1 className="text-xl sm:text-2xl font-light text-white tracking-wide leading-tight">
              {user.full_name || user.username}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">{dateStr} · {timeStr}</p>
          </div>

          {/* Manuel onsite toggle */}
          {isManuel && (
            <button
              onClick={toggleOnsite}
              disabled={onsiteLoading}
              className={`relative flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-500 w-full justify-between ${
                manuelOnsite
                  ? 'border border-green-500/30 bg-green-500/8 text-green-400 shadow-lg shadow-green-500/10'
                  : 'border border-red-500/20 bg-red-500/5 text-red-400/70'
              } ${onsiteLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-[1.01]'}`}
            >
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-60 text-left">Presencia</p>
                <p className="text-sm">{manuelOnsite ? 'En el Restaurante' : 'Fuera del Restaurante'}</p>
              </div>
              <span className={`h-3 w-3 rounded-full flex-shrink-0 ${manuelOnsite ? 'bg-green-400 animate-pulse' : 'bg-red-400/50'}`} />
            </button>
          )}

          {/* Misael: ver estado Manuel */}
          {isMisael && (
            <div className={`relative rounded-xl px-4 py-3 border ${manuelOnsite ? 'border-green-500/20 bg-green-500/5' : 'border-slate-700/40 bg-white/[0.02]'}`}>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Estado de Manuel</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${manuelOnsite ? 'bg-green-400 animate-pulse' : 'bg-slate-600'}`} />
                  <span className={`text-sm ${manuelOnsite ? 'text-green-400' : 'text-slate-500'}`}>{manuelOnsite ? 'En sitio' : 'Fuera'}</span>
                </div>
                <button onClick={loadOnsiteStatus} className="text-[10px] text-cyan-500/40 hover:text-cyan-400 transition-colors uppercase tracking-widest">actualizar</button>
              </div>
              {onsiteUpdatedAt && <p className="text-[9px] text-slate-700 mt-1.5">Desde: {new Date(onsiteUpdatedAt).toLocaleTimeString('es-MX', { timeZone: 'America/Hermosillo', hour: '2-digit', minute: '2-digit' })}</p>}
            </div>
          )}

          {/* Quick links */}
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Solicitudes', to: '/admin/applications' },
              { label: 'Mensajes', to: '/admin/messages' },
              { label: 'Cotizaciones', to: '/admin/quotes' },
              ...(isAdmin ? [{ label: 'Analytics', to: '/admin/analytics' }, { label: 'Empleados', to: '/admin/employees' }] : []),
            ].map(item => (
              <ModuleLink
                key={item.to}
                to={item.to}
                enabled={isModuleEnabled(item.to)}
                className="rounded-md border border-slate-700/50 bg-white/[0.02] px-2.5 py-1 text-[10px] text-slate-500 hover:border-cyan-500/30 hover:text-cyan-400 hover:bg-cyan-500/5 transition-all uppercase tracking-wider"
              >
                {item.label}
              </ModuleLink>
            ))}
          </div>
        </div>

        {/* Center: Glowing Radar Element + Hero Metric → links to quotes */}
        <ModuleLink to="/admin/quotes" enabled={canQuotes} className="group relative overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a] to-[#060f20] shadow-2xl shadow-cyan-500/10 flex flex-col items-center justify-center py-6 px-4 min-h-[240px] hover:border-cyan-400/40 hover:shadow-cyan-500/20 transition-all duration-500 cursor-pointer">
          {/* background glow */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-48 h-48 rounded-full bg-cyan-500/5 blur-3xl group-hover:bg-cyan-500/10 transition-all duration-700" />
          </div>
          {/* Animated rings */}
          <div className="relative flex items-center justify-center mb-3 h-44 w-44">
            {/* Outer ping ring */}
            <div className="absolute w-40 h-40 rounded-full border border-cyan-500/6 animate-ping" style={{ animationDuration: '3.5s' }} />
            {/* Static outer ring */}
            <div className="absolute w-36 h-36 rounded-full border border-cyan-500/10" />
            {/* Dashed orbit ring */}
            <div className="absolute w-32 h-32 rounded-full border border-dashed border-cyan-500/10 animate-spin" style={{ animationDuration: '20s' }} />
            {/* Mid pulse ring */}
            <div className="absolute w-24 h-24 rounded-full border border-cyan-400/18 animate-pulse" style={{ animationDuration: '2.5s' }} />
            {/* Inner spinning arc */}
            <div className="absolute w-24 h-24 rounded-full border-t-2 border-r border-cyan-400/25 animate-spin" style={{ animationDuration: '5s' }} />
            {/* Counter-spin arc */}
            <div className="absolute w-16 h-16 rounded-full border-t border-l border-blue-400/25 animate-spin" style={{ animationDuration: '3.5s', animationDirection: 'reverse' }} />
            {/* Center circle — briefcase/applications icon */}
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-600/15 border border-cyan-400/35 flex items-center justify-center shadow-xl shadow-cyan-500/20 group-hover:scale-110 transition-transform duration-500">
              <div className="absolute inset-0 rounded-full bg-cyan-400/5 group-hover:bg-cyan-400/10 transition-all duration-500" />
              {/* Tag / cotizaciones icon */}
              <svg className="h-7 w-7 text-cyan-300 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" />
              </svg>
            </div>
          </div>
          {/* Hero number */}
          <p className="text-[10px] uppercase tracking-[0.4em] text-cyan-500/50 mb-0.5">Total Cotizaciones</p>
          <p className="text-4xl sm:text-5xl font-extralight text-white tabular-nums break-all leading-tight group-hover:text-cyan-100 transition-colors duration-300" style={{ textShadow: '0 0 30px rgba(34,211,238,0.3)' }}>
            {quotesStats?.total_quotes || 0}
          </p>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-400/50 tracking-widest uppercase group-hover:text-cyan-400/70 transition-colors">Ver Cotizaciones</span>
          </div>
        </ModuleLink>

        {/* Right: Stat stack */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2">
          {[
            { label: 'Pendientes', value: data?.stats.pendingApplications || 0, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', to: '/admin/applications', enabled: canApplications },
            { label: 'Msj Sin Leer', value: unreadChat, color: 'text-green-400', border: 'border-green-500/20', bg: 'bg-green-500/5', to: '/admin/messages' },
            { label: 'Solicitudes', value: data?.stats.totalApplications || 0, color: 'text-orange-400', border: 'border-orange-500/20', bg: 'bg-orange-500/5', to: '/admin/applications', enabled: canApplications },
            { label: 'Correos', value: inbox.filter(e => !e.seen).length, color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5', to: '/admin/inbox' },
            ...(isAdmin ? [
              { label: 'Usuarios', value: data?.stats.totalUsers || 0, color: 'text-purple-400', border: 'border-purple-500/20', bg: 'bg-purple-500/5', to: '/admin/tracking' },
              { label: 'Visitantes Hoy', value: siteStats?.today_views || 0, color: 'text-teal-400', border: 'border-teal-500/20', bg: 'bg-teal-500/5', to: '/admin/analytics', sub: siteStats ? `${siteStats.active_now || 0} ahora` : null },
            ] : []),
          ].map((s, i) => (
            <ModuleLink key={i} to={s.to} enabled={s.enabled ?? true} className="group">
              <div className={`rounded-xl border ${s.border} ${s.bg} p-3 sm:p-4 hover:scale-[1.03] transition-all duration-200 h-full`}>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1.5 leading-tight">{s.label}</p>
                <p className={`text-xl sm:text-3xl font-light tabular-nums break-all leading-tight ${s.color}`}>{s.value}</p>
                {s.sub && <p className="text-[10px] text-slate-600 mt-0.5">{s.sub}</p>}
              </div>
            </ModuleLink>
          ))}
        </div>
      </div>

      {/* ── ROW 2: Area Chart + Bar Chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Area Chart - Visitantes */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5 shadow-lg shadow-cyan-500/5">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/3 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-cyan-500/40 mb-0.5">Tendencia</p>
                <h2 className="text-sm font-light text-white">Solicitudes · 7 días</h2>
              </div>
              <div className="flex items-center gap-4 text-[10px] text-slate-600">
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-cyan-400 rounded" /> Solicitudes</span>
                <span className="flex items-center gap-1"><span className="h-0.5 w-4 bg-blue-400 rounded" /> Mensajes</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data?.dailyStats || []} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff06" vertical={false} />
                <XAxis dataKey="date" stroke="transparent" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#334155', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid #22d3ee20', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} cursor={{ stroke: '#22d3ee20' }} />
                <Area type="monotone" dataKey="applications" stroke="#22d3ee" strokeWidth={1.5} fill="url(#areaGrad1)" name="Solicitudes" dot={false} />
                <Area type="monotone" dataKey="messages" stroke="#3b82f6" strokeWidth={1.5} fill="url(#areaGrad2)" name="Mensajes" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart - Puestos */}
        <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5 shadow-lg shadow-blue-500/5">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-500/3 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-blue-500/40 mb-0.5">Análisis</p>
                <h2 className="text-sm font-light text-white">Top Puestos</h2>
              </div>
              <span className="text-[10px] text-blue-400/40 uppercase tracking-wider">7d</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={data?.topPositions || []} barSize={14} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#0ea5e9" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis dataKey="position" stroke="transparent" tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fill: '#334155', fontSize: 9 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0a1628', border: '1px solid #3b82f620', borderRadius: '8px', color: '#e2e8f0', fontSize: '11px' }} cursor={{ fill: '#22d3ee05' }} />
                <Bar dataKey="count" fill="url(#barGrad2)" name="Solicitudes" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── ROW 3: Activity Feed + Site Stats mini ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Activity Feed */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">Actividad Reciente</p>
              <h2 className="text-sm font-light text-white">Feed en Tiempo Real</h2>
            </div>
            {isAdmin && (
              <span className="flex items-center gap-1.5 text-[10px] text-blue-400/50 uppercase tracking-widest">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" /> Live
              </span>
            )}
          </div>
          {isAdmin && trackingData.length > 0 ? (
            <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1">
              {trackingData.map((activity, idx) => (
                <div key={idx} className="flex items-center gap-3 rounded-lg border border-white/4 bg-white/[0.015] px-3 py-2">
                  <div className="flex-shrink-0 h-7 w-7 rounded-full bg-gradient-to-br from-cyan-500/15 to-blue-500/15 border border-cyan-500/15 flex items-center justify-center">
                    <span className="text-cyan-400 font-medium text-[10px]">{activity.username?.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs text-slate-300 truncate">{activity.username}</p>
                      <span className="text-[10px] text-slate-600 shrink-0">{activity.time_ago}</span>
                    </div>
                    <p className="text-[10px] text-slate-600 truncate">{activity.action}</p>
                  </div>
                  {activity.location && (
                    <span className="text-[10px] text-cyan-600/60 shrink-0 hidden sm:block">{activity.location}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-36 gap-2">
              <div className="h-8 w-8 rounded-full border border-slate-700 flex items-center justify-center">
                <svg className="h-4 w-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <p className="text-[11px] text-slate-700">Sin actividad reciente</p>
            </div>
          )}
        </div>

        {/* Site Stats / Inbox snapshot */}
        <div className="relative overflow-hidden rounded-2xl border border-cyan-500/10 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-4">Resumen del Sistema</p>
          <div className="space-y-3">
            {[
              { label: 'Total aplicaciones', value: data?.stats.totalApplications || 0, accent: 'bg-cyan-400' },
              { label: 'Aplicaciones aprobadas', value: (data?.stats.totalApplications || 0) - (data?.stats.pendingApplications || 0), accent: 'bg-green-400' },
              { label: 'Pendientes revisión', value: data?.stats.pendingApplications || 0, accent: 'bg-orange-400' },
              { label: 'Cotizaciones nuevas', value: quotesStats?.pending_quotes || 0, accent: 'bg-amber-400' },
              ...(isAdmin && siteStats ? [
                { label: 'Visitantes únicos hoy', value: siteStats.today_unique || 0, accent: 'bg-teal-400' },
                { label: 'Activos ahora', value: siteStats.active_now || 0, accent: 'bg-blue-400' },
              ] : []),
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${item.accent}`} />
                  <span className="text-[11px] text-slate-500">{item.label}</span>
                </div>
                <span className="text-sm font-light text-slate-300 tabular-nums">{item.value}</span>
              </div>
            ))}
          </div>
          {/* Decorative bottom glow bar */}
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
        </div>
      </div>

      {/* ── PANEL DE PERMISOS (solo Manuel y Misael, invisible para Francisco/Santiago) ── */}
      {isManuelOrMisael && editPerms.length > 0 && (
        <div className="relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <div className="absolute inset-0 bg-gradient-to-b from-amber-500/2 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-amber-500/40 mb-0.5">Acceso</p>
              <h3 className="text-sm font-light text-white">Permisos de Edición</h3>
            </div>
            <span className="text-[9px] text-slate-600 uppercase tracking-widest">Solo tú puedes ver esto</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {editPerms.map(u => (
              <div key={u.username} className="flex items-center justify-between bg-black/30 rounded-xl px-4 py-3 border border-slate-800">
                <div>
                  <p className="text-xs text-white font-medium">{u.full_name || u.username}</p>
                  <p className="text-[9px] text-slate-600 uppercase tracking-wide">{u.can_edit ? 'Puede editar datos' : 'Solo lectura'}</p>
                </div>
                <button
                  onClick={() => toggleEditPerm(u.username, u.can_edit)}
                  disabled={permSaving[u.username]}
                  className={`relative h-6 w-11 rounded-full transition-all duration-300 flex-shrink-0 ${u.can_edit ? 'bg-green-500' : 'bg-slate-700'} ${permSaving[u.username] ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-300 ${u.can_edit ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── FINANCIAL PANEL (Admin only) ── */}
      {isAdmin && (
        <div className="space-y-4">

          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] px-6 py-5">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/3 via-transparent to-blue-500/3 pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
            <p className="text-[10px] uppercase tracking-[0.35em] text-cyan-500/40 mb-1">Finanzas</p>
            <h2 className="text-lg font-light text-white">Panel de Control Financiero · Restaurante Bonifacios</h2>
            <p className="text-xs text-slate-600 mt-0.5">Control de Deuda y Aportaciones</p>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { label: 'Deuda Total', value: fmt(DEUDA_TOTAL), color: 'text-red-400', border: 'border-red-500/20', bg: 'from-red-500/5', accent: 'bg-red-400', desc: 'Monto inicial fijo' },
              { label: 'Total Recaudado', value: fmt(totalRecaudado), color: 'text-green-400', border: 'border-green-500/20', bg: 'from-green-500/5', accent: 'bg-green-400', desc: `${cascade.length} aportacion${cascade.length !== 1 ? 'es' : ''}` },
              { label: 'Saldo Restante', value: fmt(saldoFinal), color: saldoFinal <= 0 ? 'text-green-400' : 'text-orange-400', border: saldoFinal <= 0 ? 'border-green-500/20' : 'border-orange-500/20', bg: saldoFinal <= 0 ? 'from-green-500/5' : 'from-orange-500/5', accent: saldoFinal <= 0 ? 'bg-green-400' : 'bg-orange-400', desc: `${progreso.toFixed(1)}% cubierto` },
            ].map((k, i) => (
              <div key={i} className={`relative overflow-hidden rounded-2xl border ${k.border} bg-gradient-to-br ${k.bg} to-transparent p-5`}>
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />
                <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">{k.label}</p>
                <p className={`text-2xl sm:text-3xl font-light tabular-nums break-all leading-tight ${k.color}`}>{k.value}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${k.accent}`} />
                  <span className="text-[10px] text-slate-600">{k.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          <div className="rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] px-6 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-widest text-slate-600">Progreso de Pago</span>
              <span className="text-sm font-light text-cyan-400 tabular-nums">{progreso.toFixed(1)}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-700"
                style={{ width: `${progreso}%` }}
              />
            </div>
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-700">$0</span>
              <span className="text-[10px] text-slate-700">{fmt(DEUDA_TOTAL)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-700/30 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-0.5">Registro</p>
                <h3 className="text-sm font-light text-white">Tabla de Aportaciones</h3>
              </div>
              <button
                onClick={openNew}
                className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-400/50 transition-all duration-200"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Registrar Nueva Aportación
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {['#', 'Aportador', 'Monto Aportado', 'Saldo tras el aporte', 'Acciones'].map((h, i) => (
                      <th key={i} className="pb-3 text-[10px] uppercase tracking-widest text-slate-600 font-normal text-left px-2 first:pl-0">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cascade.map((row, idx) => (
                    <tr key={row.id} className="border-b border-white/[0.03] hover:bg-white/[0.015] transition-colors group">
                      <td className="py-3 px-2 pl-0 text-[11px] text-slate-700">{idx + 1}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-[10px] text-cyan-400 font-medium">{row.nombre.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="text-sm text-slate-300">{row.nombre}</span>
                        </div>
                      </td>
                      <td className="py-3 px-2">
                        <span className="text-sm font-light text-green-400 tabular-nums">{fmt(row.monto)}</span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`text-sm font-light tabular-nums ${row.saldoTras <= 0 ? 'text-green-400' : 'text-orange-400'}`}>
                          {fmt(row.saldoTras)}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(row)}
                            className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-1.5 text-blue-400 hover:bg-blue-500/20 transition-all"
                            title="Editar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setFinConfirmId(row.id)}
                            className="rounded-lg border border-red-500/20 bg-red-500/10 p-1.5 text-red-400 hover:bg-red-500/20 transition-all"
                            title="Eliminar"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {cascade.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-[11px] text-slate-700">Sin aportaciones registradas</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ADD/EDIT ── */}
      {finModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-sm rounded-2xl border border-cyan-500/20 bg-[#040c1a] p-6 shadow-2xl shadow-cyan-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent rounded-t-2xl" />
            <h3 className="text-base font-light text-white mb-1">
              {finEditing !== null ? 'Editar Aportación' : 'Nueva Aportación'}
            </h3>
            <p className="text-[11px] text-slate-600 mb-5">Ingresa los datos de la aportación</p>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Nombre</label>
                <input
                  type="text"
                  value={finNombre}
                  onChange={e => setFinNombre(e.target.value)}
                  placeholder="Ej. Manuel"
                  className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-widest text-slate-500 mb-1.5">Monto ($)</label>
                <input
                  type="number"
                  min="1"
                  value={finMonto}
                  onChange={e => setFinMonto(e.target.value)}
                  placeholder="Ej. 200000"
                  className="w-full rounded-xl border border-slate-700/50 bg-white/[0.03] px-4 py-2.5 text-sm text-white placeholder:text-slate-700 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                />
                {finMonto && !isNaN(parseFloat(finMonto)) && (
                  <p className="text-[10px] text-cyan-500/50 mt-1">{fmt(parseFloat(finMonto))}</p>
                )}
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={closeFin}
                className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.02] py-2.5 text-xs text-slate-500 hover:text-slate-300 hover:border-slate-600 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleFinSave}
                disabled={!finNombre.trim() || finMonto === '' || isNaN(parseFloat(finMonto)) || parseFloat(finMonto) < 0}
                className="flex-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 py-2.5 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {finEditing !== null ? 'Guardar cambios' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      {finConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(0,0,0,0.6)' }}>
          <div className="relative w-full max-w-xs rounded-2xl border border-red-500/20 bg-[#040c1a] p-6 shadow-2xl shadow-red-500/10">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/40 to-transparent rounded-t-2xl" />
            <div className="flex items-center gap-3 mb-3">
              <div className="h-9 w-9 rounded-full border border-red-500/20 bg-red-500/10 flex items-center justify-center flex-shrink-0">
                <svg className="h-4 w-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-white">¿Eliminar aportación?</h3>
                <p className="text-[11px] text-slate-600">Esta acción no se puede deshacer</p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setFinConfirmId(null)}
                className="flex-1 rounded-xl border border-slate-700/50 bg-white/[0.02] py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleFinDelete(finConfirmId)}
                className="flex-1 rounded-xl border border-red-500/30 bg-red-500/10 py-2.5 text-xs text-red-400 hover:bg-red-500/20 transition-all"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

function Dashboard() {
  const _user = JSON.parse(localStorage.getItem('user') || '{}');
  if (_user.role === 'administrador') return <AdminDashboard />;
  return <ViewerDashboard />;
}

export default Dashboard;
