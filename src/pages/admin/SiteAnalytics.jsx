import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { siteAnalyticsAPI } from '../../services/api';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const COLORS = ['#22d3ee', '#3b82f6', '#10B981', '#a78bfa', '#f59e0b', '#EF4444', '#EC4899', '#06B6D4'];

const fmtDate = (d) => {
  if (!d) return '—';
  const date = new Date(d.includes('T') ? d : d.replace(' ', 'T'));
  return date.toLocaleString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
};

const pageName = (url) => {
  if (!url || url === '/') return 'Inicio';
  if (url === '/bolsa-de-trabajo') return 'Bolsa de Trabajo';
  return url.replace(/^\//, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
};

const deviceIcon = (t) => {
  if (t === 'mobile') return '📱';
  if (t === 'tablet') return '📋';
  return '🖥️';
};

// ─── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent = 'text-cyan-400', sub }) {
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] text-slate-600 uppercase tracking-wide">{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <p className={`text-2xl font-light ${accent}`}>{value}</p>
      {sub && <p className="text-[10px] text-slate-600 mt-1">{sub}</p>}
    </div>
  );
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-cyan-500/15 bg-[#040c1a]/95 px-4 py-3 shadow-xl text-xs">
      <p className="text-slate-600 mb-2">{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="font-semibold" style={{ color: p.color }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Visitor Row ─────────────────────────────────────────────────────────────
function VisitorRow({ v }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-[#040c1a]/60 px-4 py-3 border border-cyan-500/8">
      <div className="min-w-[30px]">
        <span className="text-base">{deviceIcon(v.device_type)}</span>
      </div>
      <div className="min-w-[120px]">
        <p className="text-xs text-slate-300">{pageName(v.page_url)}</p>
        <p className="text-[10px] text-slate-700 truncate max-w-[200px]">{v.page_url}</p>
      </div>
      <div className="min-w-[110px]">
        <p className="text-xs text-slate-400">📍 {v.city ? `${v.city}, ${v.country}` : v.country || 'Desconocido'}</p>
      </div>
      <div className="min-w-[100px]">
        <p className="text-[10px] text-slate-500">{v.browser} · {v.os}</p>
      </div>
      {v.referrer && (
        <div className="min-w-[80px]">
          <p className="text-[10px] text-blue-400/60 truncate max-w-[150px]" title={v.referrer}>🔗 {v.referrer.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</p>
        </div>
      )}
      <div className="ml-auto flex items-center gap-2">
        {v.is_new_visitor == 1 && (
          <span className="rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2 py-0.5 text-[10px] text-emerald-400">Nuevo</span>
        )}
        <p className="text-[10px] text-slate-600">{fmtDate(v.visited_at)}</p>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
function SiteAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [visitorPage, setVisitorPage] = useState(1);
  const [totalVisitorPages, setTotalVisitorPages] = useState(1);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [visitorLoading, setVisitorLoading] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [filterCountry, setFilterCountry] = useState('');
  const [filterDevice, setFilterDevice] = useState('');
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (userData) {
      const u = JSON.parse(userData);
      if (u.username !== 'misael' && u.username !== 'manuel') navigate('/admin/dashboard');
    }
  }, [navigate]);

  const loadStats = useCallback(async () => {
    try {
      const res = await siteAnalyticsAPI.getStats(days);
      setStats(res.data);
    } catch (err) {
      console.error('Error loading site stats:', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  const loadVisitors = useCallback(async (page = 1) => {
    setVisitorLoading(true);
    try {
      const params = { page, limit: 50 };
      if (filterDate) params.date = filterDate;
      if (filterCountry) params.country = filterCountry;
      if (filterDevice) params.device = filterDevice;
      const res = await siteAnalyticsAPI.getVisitors(params);
      setVisitors(res.data.visitors || []);
      setTotalVisitorPages(res.data.pages || 1);
      setVisitorPage(page);
    } catch {
      setVisitors([]);
    } finally {
      setVisitorLoading(false);
    }
  }, [filterDate, filterCountry, filterDevice]);

  useEffect(() => { loadStats(); }, [loadStats]);
  useEffect(() => { if (tab === 'visitors') loadVisitors(1); }, [tab, loadVisitors]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border border-cyan-500/20 border-t-cyan-400 animate-spin" />
          <p className="text-slate-500 text-sm">Cargando analíticas…</p>
        </div>
      </div>
    );
  }

  const s = stats?.stats || {};
  const dailyChart = (stats?.daily_chart || []).map(d => ({
    ...d,
    day: new Date(d.day + 'T12:00:00').toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: 'short' })
  }));

  const deviceData = (stats?.devices || []).map((d, i) => ({
    name: d.device_type === 'desktop' ? 'Escritorio' : d.device_type === 'mobile' ? 'Móvil' : 'Tablet',
    value: parseInt(d.cnt),
    fill: COLORS[i % COLORS.length]
  }));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-light text-white tracking-wide">Analíticas del Sitio Web</h1>
          <p className="text-[10px] text-slate-600 mt-0.5">Visitantes públicos de bonifaciossancarlos.com</p>
        </div>
        <div className="flex items-center gap-2">
          {s.active_now > 0 && (
            <div className="flex items-center gap-1.5 rounded-full bg-[#030b18]/60 border border-emerald-500/25 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">{s.active_now} ahora</span>
            </div>
          )}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50"
          >
            <option value={7}>7 días</option>
            <option value={14}>14 días</option>
            <option value={30}>30 días</option>
            <option value={90}>90 días</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-cyan-500/10">
        {[
          { key: 'overview', label: '📊 Resumen' },
          { key: 'visitors', label: '👥 Visitantes' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium transition-all ${
              tab === t.key
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <StatCard label="Visitas Totales" value={s.total_views} icon="👁️" />
            <StatCard label="Visitantes Únicos" value={s.unique_visitors} icon="👤" accent="text-blue-400" />
            <StatCard label="Nuevos" value={s.new_visitors} icon="✨" accent="text-emerald-400" />
            <StatCard label="Hoy" value={s.today_views} icon="📅" accent="text-cyan-400" sub={`${s.today_unique} únicos`} />
            <StatCard label="Ahora" value={s.active_now} icon="🟢" accent="text-emerald-400" />
            <StatCard label="Periodo" value={`${days}d`} icon="📆" accent="text-slate-400" />
          </div>

          {/* Daily Chart */}
          {dailyChart.length > 0 && (
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-4">VISITAS DIARIAS</p>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={dailyChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#22d3ee" opacity={0.05} />
                  <XAxis dataKey="day" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="page_views" name="Visitas" stroke="#22d3ee" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="unique_visitors" name="Únicos" stroke="#3B82F6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Top Pages */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">PÁGINAS MÁS VISITADAS</p>
              <div className="space-y-2">
                {(stats?.top_pages || []).map((p, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-cyan-500/50 font-mono w-4">{i + 1}</span>
                      <span className="text-xs text-slate-300">{pageName(p.page_url)}</span>
                    </div>
                    <span className="text-xs font-medium text-cyan-400">{p.views}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Devices Pie */}
            {deviceData.length > 0 && (
              <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
                <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">DISPOSITIVOS</p>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={deviceData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {deviceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top Countries */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">PAÍSES</p>
              <div className="space-y-2">
                {(stats?.top_countries || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                    <span className="text-xs text-slate-300">🌍 {c.country}</span>
                    <span className="text-xs font-medium text-blue-400">{c.visits}</span>
                  </div>
                ))}
                {(stats?.top_countries || []).length === 0 && <p className="text-xs text-slate-700 py-2">Sin datos aún</p>}
              </div>
            </div>

            {/* Top Cities */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">CIUDADES</p>
              <div className="space-y-2">
                {(stats?.top_cities || []).map((c, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                    <span className="text-xs text-slate-300">📍 {c.city}{c.region ? `, ${c.region}` : ''}</span>
                    <span className="text-xs font-medium text-emerald-400">{c.visits}</span>
                  </div>
                ))}
                {(stats?.top_cities || []).length === 0 && <p className="text-xs text-slate-700 py-2">Sin datos aún</p>}
              </div>
            </div>

            {/* Browsers */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">NAVEGADORES</p>
              <div className="space-y-2">
                {(stats?.browsers || []).map((b, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                    <span className="text-xs text-slate-300">🌐 {b.browser}</span>
                    <span className="text-xs font-medium text-slate-400">{b.cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OS */}
            <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5">
              <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">SISTEMAS OPERATIVOS</p>
              <div className="space-y-2">
                {(stats?.os_list || []).map((o, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                    <span className="text-xs text-slate-300">💻 {o.os}</span>
                    <span className="text-xs font-medium text-slate-400">{o.cnt}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Referrers */}
            {(stats?.referrers || []).length > 0 && (
              <div className="rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 p-5 lg:col-span-2">
                <p className="text-[10px] font-medium uppercase tracking-widest text-cyan-500/50 mb-3">REFERENCIAS (de dónde vienen)</p>
                <div className="space-y-2">
                  {stats.referrers.map((r, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg bg-[#060d1f]/60 px-3 py-2">
                      <span className="text-xs text-blue-400/80 truncate max-w-[400px]">🔗 {r.referrer}</span>
                      <span className="text-xs font-medium text-slate-400">{r.cnt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VISITORS TAB */}
      {tab === 'visitors' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="date"
              value={filterDate}
              onChange={(e) => { setFilterDate(e.target.value); }}
              className="rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50"
            />
            <select
              value={filterDevice}
              onChange={(e) => { setFilterDevice(e.target.value); }}
              className="rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-cyan-400/50"
            >
              <option value="">Todos los dispositivos</option>
              <option value="desktop">Escritorio</option>
              <option value="mobile">Móvil</option>
              <option value="tablet">Tablet</option>
            </select>
            <button
              onClick={() => loadVisitors(1)}
              className="rounded-lg bg-cyan-500/20 border border-cyan-500/30 px-4 py-1.5 text-xs text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Filtrar
            </button>
            {(filterDate || filterDevice) && (
              <button
                onClick={() => { setFilterDate(''); setFilterDevice(''); setFilterCountry(''); }}
                className="text-xs text-cyan-400/50 hover:text-cyan-400 transition-colors"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* Visitor List */}
          {visitorLoading ? (
            <div className="py-8 text-center text-xs text-slate-600 animate-pulse">Cargando visitantes…</div>
          ) : visitors.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-700">Sin visitantes registrados</div>
          ) : (
            <div className="space-y-2">
              {visitors.map(v => <VisitorRow key={v.id} v={v} />)}
            </div>
          )}

          {/* Pagination */}
          {totalVisitorPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                disabled={visitorPage <= 1}
                onClick={() => loadVisitors(visitorPage - 1)}
                className="rounded-lg border border-cyan-500/15 bg-[#040c1a]/60 px-3 py-1 text-xs text-slate-500 hover:text-cyan-400 disabled:opacity-30"
              >
                ← Anterior
              </button>
              <span className="text-xs text-slate-600">Página {visitorPage} de {totalVisitorPages}</span>
              <button
                disabled={visitorPage >= totalVisitorPages}
                onClick={() => loadVisitors(visitorPage + 1)}
                className="rounded-lg border border-cyan-500/15 bg-[#040c1a]/60 px-3 py-1 text-xs text-slate-500 hover:text-cyan-400 disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default SiteAnalytics;
