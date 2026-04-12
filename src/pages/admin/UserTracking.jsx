import { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { trackingAPI } from '../../services/api';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmtDur = (s) => {
  if (!s || s <= 0) return '—';
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};
const TZ = 'America/Hermosillo';
const fmtTime = (dt) => dt ? new Date(dt.includes('T') || dt.endsWith('Z') ? dt : dt.replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short', timeZone: TZ }) : '—';
const fmtDate = (dt) => dt ? new Date(dt.includes('T') || dt.endsWith('Z') ? dt : dt.replace(' ', 'T') + 'Z').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', timeZone: TZ }) : '—';
const deviceIcon = (t) => t === 'mobile' ? '📱' : t === 'tablet' ? '📟' : '🖥️';
const locationStr = (s) => [s?.city, s?.country].filter(Boolean).join(', ') || s?.ip_address || '—';
const USER_COLORS = [
  '#f59e0b',  // amber
  '#22d3ee',  // cyan
  '#f43f5e',  // rose
  '#4ade80',  // green
  '#c084fc',  // purple
  '#fb923c',  // orange
  '#38bdf8',  // sky
  '#facc15',  // yellow
];

const PAGE_NAMES = {
  '/admin/dashboard': 'Dashboard',
  '/admin/applications': 'Solicitudes',
  '/admin/employees': 'Personal',
  '/admin/tracking': 'Tracking',
  '/admin/messages': 'Mensajes / Inbox',
  '/admin/inbox': 'Inbox',
};
const pageName = (url) => {
  if (!url) return '—';
  const clean = url.split('?')[0].replace(/\/$/, '');
  return PAGE_NAMES[clean] || clean.replace('/admin/', '').replace(/-/g, ' ') || url;
};

// ─── Stat chip ───────────────────────────────────────────────────────────────
const Stat = ({ label, value, accent }) => (
  <div className="flex flex-col items-center gap-0.5">
    <span className={`text-base font-medium ${accent || 'text-slate-200'}`}>{value}</span>
    <span className="text-[10px] text-slate-600 uppercase tracking-wide">{label}</span>
  </div>
);

// ─── Single session card (expandable: pages + clicks tabs) ───────────────────
function SessionCard({ session, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState('pages');
  const [clicks, setClicks] = useState(null);
  const [pages, setPages] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load pages + clicks immediately on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pRes, cRes] = await Promise.all([
          trackingAPI.getSessionPages(session.id),
          trackingAPI.getSessionClicks(session.id)
        ]);
        if (!cancelled) {
          setPages(pRes.data.pages || []);
          setClicks(cRes.data.clicks || []);
        }
      } catch {
        if (!cancelled) { setPages([]); setClicks([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [session.id]);

  const toggle = () => setOpen(o => !o);

  const loc = locationStr(session);
  const isActive = (session.is_active == 1 || session.is_active === true) &&
    (!session.last_activity || (Date.now() - new Date(session.last_activity.includes('T') ? session.last_activity : session.last_activity.replace(' ', 'T') + 'Z').getTime()) < 5 * 60 * 1000);

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden">
      {/* Row summary */}
      <button onClick={toggle} className="w-full text-left p-4 hover:bg-cyan-500/5 transition-all">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className={`h-2 w-2 rounded-full flex-shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-neutral-500'}`} />

          <div className="min-w-[110px]">
            <p className="text-xs text-slate-300">{fmtTime(session.started_at)}</p>
            {session.ended_at && <p className="text-[10px] text-slate-600">fin: {fmtTime(session.ended_at)}</p>}
          </div>

          <div className="text-center min-w-[55px]">
            <p className="text-sm font-medium text-cyan-400">{fmtDur(session.duration_seconds)}</p>
            <p className="text-[10px] text-slate-600">duración</p>
          </div>

          <div className="min-w-[110px]">
            <p className="text-xs text-slate-300">📍 {loc}</p>
          </div>

          <div className="min-w-[80px]">
            <p className="text-xs text-slate-400">{deviceIcon(session.device_type)} {session.browser} · {session.os}</p>
          </div>

          <div className="flex gap-3 ml-auto">
            <span className="text-xs text-amber-400 font-medium">{session.click_count ?? 0} clicks</span>
            <span className="text-xs text-blue-400 font-medium">{session.page_count ?? 0} páginas</span>
          </div>

          <svg className={`h-3.5 w-3.5 text-cyan-500/50 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded panel */}
      {open && (
        <div className="border-t border-cyan-500/8 bg-[#060d1f]/60">
          {/* Tabs */}
          <div className="flex border-b border-cyan-500/8">
            {[
              { key: 'pages', label: '📄 Páginas visitadas' },
              { key: 'clicks', label: '🖱️ Clicks' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2.5 text-xs font-medium transition-all ${
                  tab === t.key
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-4 pb-4 pt-3">
            {loading && <p className="text-xs text-slate-600 animate-pulse py-3">Cargando…</p>}

            {/* Pages tab */}
            {!loading && tab === 'pages' && (
              pages?.length === 0
                ? <p className="text-xs text-slate-700 py-3">Sin páginas registradas aún (se registran en nuevas sesiones)</p>
                : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {pages?.map((p, i) => (
                      <div key={p.id || i} className="flex items-center gap-3 rounded-lg bg-[#060d1f]/60 px-3 py-2">
                        <span className="text-[10px] text-cyan-500/50 font-mono w-4 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-300">{pageName(p.page_url)}</p>
                          <p className="text-[10px] text-slate-700 truncate">{p.page_url}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {p.time_on_page > 0 && (
                            <p className="text-[10px] text-cyan-500/70">{fmtDur(p.time_on_page)}</p>
                          )}
                          <p className="text-[10px] text-slate-700">
                            {p.viewed_at ? new Date(p.viewed_at).toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )
            )}

            {/* Clicks tab */}
            {!loading && tab === 'clicks' && (
              clicks?.length === 0
                ? <p className="text-xs text-slate-700 py-3">Sin clicks registrados</p>
                : (
                  <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                    {clicks?.map((c, i) => (
                      <div key={c.id || i} className="flex items-start gap-2 rounded-lg bg-[#060d1f]/60 px-3 py-1.5">
                        <span className="text-[10px] text-cyan-500/50 font-mono w-4 flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-300 truncate">{c.element_text || c.element_id || c.element_class || 'Elemento'}</p>
                          <p className="text-[10px] text-slate-600 truncate">{pageName(c.page_url)} · {c.page_url}</p>
                        </div>
                        <span className="text-[10px] text-slate-700 flex-shrink-0">
                          {c.timestamp ? new Date(c.timestamp).toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                )
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── User Detail View ─────────────────────────────────────────────────────────
function UserDetailView({ user, onBack }) {
  const [sessions, setSessions] = useState([]);
  const [activeDates, setActiveDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (date = null) => {
    setLoading(true);
    try {
      const res = await trackingAPI.getUserDetail(user.id, date);
      setSessions(res.data.sessions || []);
      if (!date) setActiveDates(res.data.active_dates || []);
    } catch { setSessions([]); }
    finally { setLoading(false); }
  }, [user.id]);

  useEffect(() => { load(); }, [load]);

  const handleDateChange = (e) => {
    const d = e.target.value;
    setSelectedDate(d);
    load(d || null);
  };

  const latest = user.latest_session;
  const loc = locationStr(latest);

  return (
    <div className="space-y-5">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="flex items-center gap-1.5 text-cyan-500/70 hover:text-cyan-400 transition-colors text-sm">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Volver
        </button>
        <div className="h-4 w-px bg-cyan-500/20" />
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${user.is_online ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' : 'bg-neutral-500'}`} />
          <h2 className="text-lg font-light text-white">{user.full_name}</h2>
          <span className="text-xs text-slate-600">@{user.username}</span>
          {user.is_online && <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] text-emerald-400">En línea</span>}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
        {[
          { label: 'Sesiones', value: user.total_sessions },
          { label: 'Tiempo total', value: fmtDur(user.total_seconds), accent: 'text-cyan-400' },
          { label: 'Promedio', value: fmtDur(user.avg_seconds) },
          { label: 'Última vez', value: user.last_seen ? fmtDate(user.last_seen) : '—' },
          { label: 'Estado', value: user.is_online ? 'Online' : 'Offline', accent: user.is_online ? 'text-emerald-400' : 'text-neutral-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-3 text-center">
            <Stat {...s} />
          </div>
        ))}
      </div>

      {/* Latest session highlight */}
      {latest && (
        <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <p className="text-[10px] font-semibold tracking-widest text-cyan-500/70 mb-3">ÚLTIMA SESIÓN</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Inicio</p>
              <p className="text-sm text-slate-200">{fmtTime(latest.started_at)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Duración</p>
              <p className="text-sm font-semibold text-cyan-400">{fmtDur(latest.duration_seconds)}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Ubicación</p>
              <p className="text-sm text-slate-300">📍 {loc}</p>
              {latest.ip_address && <p className="text-[10px] text-slate-700">{latest.ip_address}</p>}
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Dispositivo</p>
              <p className="text-sm text-slate-300">{deviceIcon(latest.device_type)} {latest.browser}</p>
              <p className="text-[10px] text-slate-600">{latest.os}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Clicks</p>
              <p className="text-sm text-orange-400 font-semibold">{latest.click_count ?? 0}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-600 mb-0.5">Páginas</p>
              <p className="text-sm text-slate-300">{latest.page_count ?? 0}</p>
            </div>
          </div>
        </div>
      )}

      {/* History */}
      <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <p className="text-[10px] font-semibold tracking-widest text-cyan-500/70">HISTORIAL DE SESIONES</p>
            {activeDates.length > 0 && (
              <p className="text-[10px] text-slate-600 mt-0.5">{activeDates.length} días con actividad registrada</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500">Filtrar fecha:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              className="rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50"
            />
            {selectedDate && (
              <button onClick={() => { setSelectedDate(''); load(null); }} className="text-xs text-cyan-500/50 hover:text-cyan-400 transition-colors">✕ Limpiar</button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-600 animate-pulse">Cargando sesiones…</div>
        ) : sessions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-700">
            {selectedDate ? `Sin sesiones el ${selectedDate}` : 'Sin sesiones registradas'}
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s, i) => <SessionCard key={s.id} session={s} defaultOpen={i === 0 && !selectedDate} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Custom chart tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/95 px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-400 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-300">{p.dataKey}:</span>
          <span className="font-semibold" style={{ color: p.color }}>
            {p.value > 0 ? `${Math.floor(p.value)}m ${Math.round((p.value % 1) * 60)}s` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────
function UserTracking() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [chartUsers, setChartUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      if (u.username !== 'misael' && u.username !== 'manuel') navigate('/admin/dashboard');
    }
  }, [navigate]);

  const loadDashboard = useCallback(async () => {
    try {
      const [summaryRes, chartRes] = await Promise.all([
        trackingAPI.getUsersSummary(),
        trackingAPI.getChartData(30)
      ]);
      setUsers(summaryRes.data.users || []);
      setChartData(chartRes.data.chart_data || []);
      setChartUsers(chartRes.data.users || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error loading tracking dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const interval = setInterval(loadDashboard, 60000);
    return () => clearInterval(interval);
  }, [loadDashboard]);

  const onlineUsers = users.filter(u => u.is_online);

  // Stable color map: sort users by id so order never changes
  const colorMap = useMemo(() => {
    const sorted = [...users].sort((a, b) => a.id - b.id);
    return Object.fromEntries(sorted.map((u, i) => [u.id, USER_COLORS[i % USER_COLORS.length]]));
  }, [users]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
          <p className="text-slate-600 text-sm">Cargando datos…</p>
        </div>
      </div>
    );
  }

  if (selectedUser) {
    return (
      <div className="p-4 sm:p-6">
        <UserDetailView user={selectedUser} onBack={() => setSelectedUser(null)} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-light text-white tracking-wide">Tracking de Usuarios</h1>
          {lastUpdated && (
            <p className="text-[10px] text-slate-600 mt-0.5">
              Actualizado {lastUpdated.toLocaleTimeString('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })} · se refresca cada 60s
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onlineUsers.length > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/25 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">{onlineUsers.length} en línea</span>
            </div>
          )}
          <button
            onClick={loadDashboard}
            className="rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 px-3 py-1.5 text-xs text-cyan-400 hover:bg-cyan-500/10 transition-all"
          >
            ↻ Actualizar
          </button>
        </div>
      </div>

      {/* ── Duration Chart ── */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-5">
          <p className="text-[10px] font-semibold tracking-widest text-cyan-500/70 mb-4">DURACIÓN DE SESIÓN POR DÍA (minutos)</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 4, right: 16, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.04)" />
              <XAxis
                dataKey="date"
                tick={{ fill: '#475569', fontSize: 10 }}
                tickFormatter={d => {
                  const dt = new Date(d);
                  return `${dt.getDate()}/${dt.getMonth() + 1}`;
                }}
              />
              <YAxis tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', paddingTop: '12px' }}
                formatter={(v) => <span style={{ color: '#64748b' }}>{v}</span>}
              />
              {chartUsers.map((cu) => {
                const matched = users.find(u => u.full_name === cu.full_name);
                const stroke = matched ? (colorMap[matched.id] || cu.color) : cu.color;
                return (
                  <Line
                    key={cu.full_name}
                    type="monotone"
                    dataKey={cu.full_name}
                    stroke={stroke}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── User Cards ── */}
      <div>
        <p className="text-[10px] font-semibold tracking-widest text-cyan-500/70 mb-3">USUARIOS</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {users.map((u) => {
            const color = colorMap[u.id] || USER_COLORS[0];
            const loc = u.latest_session ? locationStr(u.latest_session) : '—';
            return (
              <button
                key={u.id}
                onClick={() => setSelectedUser(u)}
                className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 text-left hover:border-cyan-400/30 hover:shadow-cyan-500/10 hover:shadow-lg transition-all group"
              >
                {/* Card Header */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="relative">
                    <div
                      className="h-10 w-10 rounded-full flex items-center justify-center text-base font-semibold text-[#030712]"
                      style={{ backgroundColor: color }}
                    >
                      {u.full_name?.[0]?.toUpperCase()}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#040c1a] ${u.is_online ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{u.full_name}</p>
                    <p className="text-[10px] text-slate-600">@{u.username} · {u.role}</p>
                  </div>
                  <svg className="h-4 w-4 text-cyan-500/20 group-hover:text-cyan-400/50 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="rounded-lg bg-[#030b18]/60 py-1.5 px-2 text-center">
                    <p className="text-xs font-semibold text-slate-200">{u.total_sessions}</p>
                    <p className="text-[9px] text-slate-600">sesiones</p>
                  </div>
                  <div className="rounded-lg bg-[#030b18]/60 py-1.5 px-2 text-center">
                    <p className="text-xs font-semibold" style={{ color }}>{fmtDur(u.total_seconds)}</p>
                    <p className="text-[9px] text-slate-600">total</p>
                  </div>
                  <div className="rounded-lg bg-[#030b18]/60 py-1.5 px-2 text-center">
                    <p className="text-xs font-semibold text-slate-300">{fmtDur(u.avg_seconds)}</p>
                    <p className="text-[9px] text-slate-600">promedio</p>
                  </div>
                </div>

                {/* Last session info */}
                {u.latest_session ? (
                  <div className="rounded-lg bg-[#030b18]/60 px-3 py-2">
                    <p className="text-[10px] text-slate-500">
                      {u.is_online ? '🟢 Sesión activa' : `Última: ${fmtTime(u.last_seen)}`}
                    </p>
                    <p className="text-[10px] text-slate-700 mt-0.5 truncate">
                      📍 {loc} · {u.latest_session.browser}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-lg bg-[#030b18]/60 px-3 py-2">
                    <p className="text-[10px] text-slate-700">Sin sesiones registradas</p>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UserTracking;
