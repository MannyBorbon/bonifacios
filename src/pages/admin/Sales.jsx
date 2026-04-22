import React, { useState, useEffect, useCallback, useRef } from 'react';
import { XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LabelList, BarChart, Bar, YAxis } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BONIFACIO'S LIVE - Dashboard v2.0
 * Status: Production Ready
 * Features: 9 vistas completas, tiempo real, corte de caja, productos, mesas abiertas.
 */

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
const RANGES = ['today', 'yesterday', 'week', 'month', 'custom'];
const RANGE_LABELS = { today: 'Hoy', yesterday: 'Ayer', week: 'Esta semana', month: 'Mes específico', custom: 'Personalizado' };
const RANGE_ICONS  = { today: '📅', yesterday: '🗓️', week: '📆', month: '🗃️', custom: '🧭' };

function TicketItemsModal({ ticket, onClose, apiUrl }) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!ticket) return;
    setLoading(true); setError(null);
    fetch(`${apiUrl}/softrestaurant/ticket-items.php?folio=${encodeURIComponent(ticket.folio)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { setItems(d.items || []); })
      .catch(() => setError('No se pudieron cargar los productos'))
      .finally(() => setLoading(false));
  }, [ticket]);

  if (!ticket) return null;
  const fmt = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const statusColor = ticket.status === 'closed' ? 'text-emerald-400' : ticket.status === 'open' ? 'text-orange-400' : 'text-red-400';
  const statusLabel = ticket.status === 'closed' ? '✓ Cobrado' : ticket.status === 'open' ? '● Abierto' : '✕ Cancelado';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative z-10 w-full max-w-xl max-h-[85vh] flex flex-col rounded-2xl border border-slate-700 bg-[#080f1e] shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-slate-800 bg-black/30">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-cyan-400 font-black text-lg">#{ticket.folio}</span>
              <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
            </div>
            <div className="flex gap-4 mt-1 text-[11px] text-slate-500">
              <span>Mesa {ticket.table_number || '--'}</span>
              <span>{ticket.waiter_name || '--'}</span>
              <span>{ticket.covers > 0 ? `${ticket.covers} comensales` : ''}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors text-xl leading-none">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-slate-500 text-sm">{error}</p>
              <p className="text-slate-700 text-xs mt-1">El script de sincronización debe estar corriendo</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-slate-500 text-sm">Sin productos sincronizados</p>
              <p className="text-slate-700 text-xs mt-1">Los items se sincronizan en tiempo real desde SoftRestaurant</p>
            </div>
          ) : (
            <table className="w-full text-left">
              <thead className="bg-black/40 text-[9px] text-slate-500 font-black uppercase tracking-widest sticky top-0">
                <tr>
                  <th className="px-5 py-2.5">Producto</th>
                  <th className="px-3 py-2.5 text-center">Cant.</th>
                  <th className="px-3 py-2.5 text-right">Precio</th>
                  <th className="px-5 py-2.5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {items.map((item, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-5 py-3">
                      <p className="text-white text-xs font-medium">{item.product_name}</p>
                      {item.category && <p className="text-slate-600 text-[9px] mt-0.5">{item.category}</p>}
                      {item.notes && <p className="text-amber-500/70 text-[9px] italic mt-0.5">{item.notes}</p>}
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className="text-cyan-400 font-black text-sm">{item.qty % 1 === 0 ? item.qty : item.qty.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-slate-500 font-mono text-xs">{fmt(item.unit_price)}</td>
                    <td className="px-5 py-3 text-right font-black text-white font-mono">
                      {item.discount > 0 ? (
                        <div>
                          <p className="line-through text-slate-600 text-[10px]">{fmt(item.subtotal + item.discount)}</p>
                          <p className="text-emerald-400">{fmt(item.subtotal)}</p>
                        </div>
                      ) : fmt(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer totals */}
        {items.length > 0 && (
          <div className="border-t border-slate-800 px-6 py-3 bg-black/30 flex justify-between items-center">
            <span className="text-slate-500 text-xs">{items.length} productos</span>
            <div className="text-right">
              <p className="text-[10px] text-slate-500">Total cobrado</p>
              <p className="text-white font-black text-lg font-mono">{fmt(ticket.total)}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const VIEW_CONFIG = {
  overview:    { label: 'General',    icon: '📊', desc: 'Resumen de ventas y métricas' },
  tickets:     { label: 'Tickets',    icon: '📋', desc: 'Lista detallada de tickets' },
  waiters:     { label: 'Meseros',    icon: '🧑‍🍳', desc: 'Desempeño por mesero' },
  products:    { label: 'Productos',  icon: '🍽️', desc: 'Los más y menos vendidos' },
  tips:        { label: 'Propinas',   icon: '🤝', desc: 'Propinas por mesero' },
  cash:        { label: 'Caja',       icon: '💰', desc: 'Movimientos de efectivo' },
  shift_close: { label: 'Corte',      icon: '🧾', desc: 'Corte de caja del turno' },
  audit:       { label: 'Auditoría',  icon: '🔍', desc: 'Cancelaciones y ajustes' },
};

function KPICard({ icon, label, value, sub, accent, border, isCurrency, fmt }) {
  return (
    <motion.div whileHover={{ y: -2 }} className={`bg-[#0b1120] border ${border} p-4 rounded-2xl flex flex-col gap-2`}>
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border" style={{ color: accent, borderColor: `${accent}40`, backgroundColor: `${accent}15` }}>{label}</span>
      </div>
      <p className="text-2xl lg:text-3xl font-black leading-none mt-1" style={{ color: accent }}>{isCurrency ? fmt(value) : (value ?? '--')}</p>
      {sub && <p className="text-[10px] text-slate-500 leading-tight">{sub}</p>}
    </motion.div>
  );
}

function SectionHeader({ icon, title, desc }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <h3 className="text-white font-bold text-sm">{title}</h3>
      </div>
      {desc && <p className="text-slate-500 text-xs mt-0.5 ml-6">{desc}</p>}
    </div>
  );
}

function TipsHistoryModal({ waiter, apiUrl, formatCurrency, onClose, onViewTicket }) {
  const [tips, setTips]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [meta, setMeta]       = useState({ count: 0, total_tips: 0, total_paid: 0, total_pending: 0, by_year: [] });
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'years'

  useEffect(() => {
    setLoading(true);
    fetch(`${apiUrl}/softrestaurant/tips-history.php?waiter=${encodeURIComponent(waiter)}&limit=500`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setTips(d.tips || []);
          setMeta({ count: d.count, total_tips: d.total_tips, total_paid: d.total_paid, total_pending: d.total_pending, by_year: d.by_year || [] });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [waiter]);

  const paidPct = meta.total_tips > 0 ? Math.round(meta.total_paid / meta.total_tips * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-[#0d1424] border border-amber-500/20 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-start justify-between shrink-0">
          <div>
            <p className="text-amber-400 text-[10px] font-black uppercase tracking-widest">Historial de propinas</p>
            <p className="text-white font-black text-xl leading-tight">{waiter}</p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-xl font-bold w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-800 transition-colors shrink-0">✕</button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-7 w-7 animate-spin rounded-full border border-amber-500/20 border-t-amber-400" />
          </div>
        ) : (
          <>
            {/* Panel de resumen */}
            <div className="p-5 border-b border-slate-800 shrink-0 space-y-4">
              {/* Totales principales */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-black/40 rounded-xl p-3 text-center">
                  <p className="text-amber-400 font-black text-xl">{formatCurrency(meta.total_tips)}</p>
                  <p className="text-slate-500 text-[10px] uppercase mt-0.5">Total acumulado</p>
                  <p className="text-slate-600 text-[9px] mt-0.5">{meta.count} tickets</p>
                </div>
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 text-center">
                  <p className="text-emerald-400 font-black text-xl">{formatCurrency(meta.total_paid)}</p>
                  <p className="text-slate-500 text-[10px] uppercase mt-0.5">✓ Pagadas</p>
                  <p className="text-emerald-600 text-[9px] mt-0.5">{paidPct}% del total</p>
                </div>
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3 text-center">
                  <p className="text-amber-400 font-black text-xl">{formatCurrency(meta.total_pending)}</p>
                  <p className="text-slate-500 text-[10px] uppercase mt-0.5">Pendientes</p>
                  <p className="text-amber-600 text-[9px] mt-0.5">{100 - paidPct}% del total</p>
                </div>
              </div>

              {/* Barra pagado vs pendiente */}
              <div>
                <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                  <span>Pagado {paidPct}%</span>
                  <span>Pendiente {100 - paidPct}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden flex">
                  <div className="h-full bg-emerald-500 transition-all" style={{ width: `${paidPct}%` }} />
                  <div className="h-full bg-amber-500/60 flex-1" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1">
                {[['list', '📋 Tickets'], ['years', '📅 Por año']].map(([k, l]) => (
                  <button key={k} onClick={() => setActiveTab(k)}
                    className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeTab === k ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Body scrollable */}
            <div className="overflow-y-auto flex-1">

              {/* Tab: lista de tickets */}
              {activeTab === 'list' && (
                <div className="divide-y divide-slate-800/50">
                  {tips.length === 0 ? (
                    <p className="text-center text-slate-500 py-10 text-sm">Sin propinas registradas</p>
                  ) : tips.map((t, i) => (
                    <div key={i} className={`flex items-center gap-3 px-5 py-3 hover:bg-slate-800/20 transition-colors ${parseInt(t.tip_paid) === 1 ? '' : 'bg-amber-500/3'}`}>
                      {/* Folio */}
                      <div className="text-center shrink-0 w-14">
                        <p className="text-white font-black text-xs font-mono">{t.folio || '—'}</p>
                        <p className="text-slate-600 text-[8px] uppercase">Folio</p>
                      </div>
                      {/* Fecha + mesa */}
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-300 text-xs">{t.sale_datetime?.slice(0, 16)}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-slate-500 text-[10px]">Mesa {t.table_number || '—'} · {formatCurrency(parseFloat(t.total))}</p>
                          {parseInt(t.tip_paid) === 1 && t.authorized && (
                            <span className="text-[9px] text-slate-600">autorizado: {t.authorized}</span>
                          )}
                        </div>
                      </div>
                      {/* Propina + estado */}
                      <div className="text-right shrink-0">
                        <p className="text-amber-400 font-black text-sm">{formatCurrency(parseFloat(t.tip))}</p>
                        {parseInt(t.tip_paid) === 1
                          ? <span className="text-[9px] text-emerald-400 font-bold">✓ Pagada</span>
                          : <span className="text-[9px] text-amber-400 font-bold">Pendiente</span>}
                      </div>
                      {/* Botón ticket */}
                      <button
                        onClick={() => onViewTicket(t)}
                        className="text-[10px] text-cyan-400 font-bold px-2 py-1 rounded-lg border border-cyan-500/30 hover:border-cyan-400/60 transition-all shrink-0"
                      >Ver →</button>
                    </div>
                  ))}
                </div>
              )}

              {/* Tab: por año */}
              {activeTab === 'years' && (
                <div className="p-5 space-y-3">
                  {meta.by_year.length === 0 ? (
                    <p className="text-center text-slate-500 py-8 text-sm">Sin datos</p>
                  ) : meta.by_year.map(y => {
                    const yPct = y.total > 0 ? Math.round(y.paid / y.total * 100) : 0;
                    return (
                      <div key={y.year} className="bg-black/30 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-white font-black text-lg">{y.year}</span>
                            <span className="text-slate-500 text-[10px] bg-slate-800 px-2 py-0.5 rounded-full">{y.count} tickets</span>
                          </div>
                          <p className="text-amber-400 font-black text-lg">{formatCurrency(y.total)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-3 py-2">
                            <p className="text-emerald-400 font-black text-sm">{formatCurrency(y.paid)}</p>
                            <p className="text-slate-500 text-[9px] uppercase">Pagadas · {yPct}%</p>
                          </div>
                          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
                            <p className="text-amber-400 font-black text-sm">{formatCurrency(y.pending)}</p>
                            <p className="text-slate-500 text-[9px] uppercase">Pendientes · {100 - yPct}%</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
                          <div className="h-full bg-emerald-500" style={{ width: `${yPct}%` }} />
                          <div className="h-full bg-amber-500/60 flex-1" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [viewMode, setViewMode] = useState('overview');
  const [data, setData] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [cashMovements, setCashMovements] = useState(null);
  const [shiftsData, setShiftsData] = useState(null);
  const [tipsModal, setTipsModal] = useState(null); // { waiter } o null
  const [tipsViewMode, setTipsViewMode] = useState('general'); // 'general' | 'period' | 'by_waiter'
  const [tipsData, setTipsData] = useState(null);
  const [tipsLoading, setTipsLoading] = useState(false);
  const [tipsStart, setTipsStart] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [tipsEnd, setTipsEnd] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const todayISO = new Date().toISOString().split('T')[0];
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-12
  const [customStart, setCustomStart] = useState(todayISO);
  const [customEnd, setCustomEnd] = useState(todayISO);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [compareEnabled, setCompareEnabled] = useState(false);
  const [customCompareMode, setCustomCompareMode] = useState(false);
  const [compareType, setCompareType] = useState('period'); // 'day' o 'period'
  const [period1Start, setPeriod1Start] = useState(todayISO);
  const [period1End, setPeriod1End] = useState(todayISO);
  const [period2Start, setPeriod2Start] = useState(todayISO);
  const [period2End, setPeriod2End] = useState(todayISO);
  const [shiftDate, setShiftDate] = useState(todayISO);

  // Estado independiente para la vista Caja
  const [cashPeriod, setCashPeriod] = useState('today');
  const [cashDate, setCashDate] = useState(todayISO);
  const [cashMonth, setCashMonth] = useState(currentMonth);
  const [cashYear, setCashYear] = useState(currentYear);
  const [cashCustomStart, setCashCustomStart] = useState(todayISO);
  const [cashCustomEnd, setCashCustomEnd] = useState(todayISO);

  const apiUrl = import.meta.env.VITE_API_URL || 'https://bonifaciossancarlos.com/api';

  // Carga de datos con protección de entorno
  const loadAllData = useCallback(async () => {
    try {
      const from = customStart <= customEnd ? customStart : customEnd;
      const to = customEnd >= customStart ? customEnd : customStart;

      const salesParams = new URLSearchParams({ range: dateRange });
      if (dateRange === 'custom') {
        salesParams.set('start', from);
        salesParams.set('end', to);
      } else if (dateRange === 'month') {
        salesParams.set('month', selectedMonth);
        salesParams.set('year', selectedYear);
      }

      const salesPromise = fetch(`${apiUrl}/softrestaurant/sales.php?${salesParams.toString()}`).then((r) => r.json());
      // Caja usa su propio período independiente
      const cashParams = new URLSearchParams({ period: viewMode === 'cash' ? cashPeriod : dateRange });
      if (viewMode === 'cash') {
        if (cashPeriod === 'day')    { cashParams.set('shift_date', cashDate); cashParams.set('period', 'today'); }
        if (cashPeriod === 'month')  { cashParams.set('month', cashMonth); cashParams.set('year', cashYear); }
        if (cashPeriod === 'custom') { cashParams.set('start', cashCustomStart); cashParams.set('end', cashCustomEnd); }
        if (cashPeriod === 'week')   { cashParams.set('period', 'week'); }
      } else {
        if (dateRange === 'month')  { cashParams.set('month', selectedMonth); cashParams.set('year', selectedYear); }
        if (dateRange === 'custom') { cashParams.set('start', from); cashParams.set('end', to); }
        if (viewMode === 'shift_close' && shiftDate) cashParams.set('shift_date', shiftDate);
      }
      const cashPromise = fetch(`${apiUrl}/softrestaurant/cash-movements.php?${cashParams.toString()}`).then((r) => r.json());

      // Turnos/cortes: siempre cargar para la vista shift_close
      const shiftsParams = new URLSearchParams({ period: 'custom' });
      shiftsParams.set('start', shiftDate);
      shiftsParams.set('end', shiftDate);
      const shiftsPromise = fetch(`${apiUrl}/softrestaurant/shifts.php?${shiftsParams.toString()}`).then((r) => r.json()).catch(() => null);

      const [salesResult, cashResult, shiftsResult] = await Promise.all([salesPromise, cashPromise, shiftsPromise]);
      if (shiftsResult?.success) setShiftsData(shiftsResult); else setShiftsData(null);

      if (salesResult?.success) {
        // Si hay comparación personalizada, cargar ambos periodos
        if (customCompareMode && compareEnabled) {
          // Periodo 1 (actual)
          const p1From = compareType === 'day' ? period1Start : (period1Start <= period1End ? period1Start : period1End);
          const p1To = compareType === 'day' ? period1Start : (period1End >= period1Start ? period1End : period1Start);
          
          // Periodo 2 (a comparar)
          const p2From = compareType === 'day' ? period2Start : (period2Start <= period2End ? period2Start : period2End);
          const p2To = compareType === 'day' ? period2Start : (period2End >= period2Start ? period2End : period2Start);
          
          const period1Params = new URLSearchParams({ range: 'custom', start: p1From, end: p1To });
          const period2Params = new URLSearchParams({ range: 'custom', start: p2From, end: p2To });
          
          const [period1Result, period2Result] = await Promise.all([
            fetch(`${apiUrl}/softrestaurant/sales.php?${period1Params.toString()}`).then((r) => r.json()),
            fetch(`${apiUrl}/softrestaurant/sales.php?${period2Params.toString()}`).then((r) => r.json())
          ]);
          
          if (period1Result?.success && period2Result?.success) {
            // Reemplazar datos actuales con Periodo 1
            salesResult.current_stats = period1Result.current_stats;
            salesResult.selected_period = period1Result.selected_period;
            
            // Inyectar comparación con Periodo 2
            salesResult.comparison = {
              current: period1Result.current_stats,
              previous: period2Result.current_stats,
              previous_period: {
                start: p2From + ' 08:00:00',
                end: p2To + ' 07:59:59'
              },
              delta: {
                amount: (period1Result.current_stats?.total || 0) - (period2Result.current_stats?.total || 0),
                percent: period2Result.current_stats?.total > 0 
                  ? (((period1Result.current_stats?.total || 0) - (period2Result.current_stats?.total || 0)) / period2Result.current_stats.total * 100).toFixed(2)
                  : null
              }
            };
          }
        }
        setData(salesResult);
      }
      
      if (cashResult?.success) {
        setCashMovements(cashResult);
      }
      
      setLastUpdate(new Date());
    } catch (err) { 
      console.error('Error Crítico de Conexión:', err); 
    } finally { 
      setLoading(false); 
    }
  }, [dateRange, apiUrl, customStart, customEnd, selectedMonth, selectedYear, customCompareMode, compareEnabled, compareType, period1Start, period1End, period2Start, period2End, shiftDate, viewMode, cashPeriod, cashDate, cashMonth, cashYear, cashCustomStart, cashCustomEnd]);


  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  useEffect(() => {
    if (viewMode !== 'tips') return;
    setTipsLoading(true);
    const url = tipsViewMode === 'general'
      ? `${apiUrl}/softrestaurant/tips-all.php?start=2000-01-01&end=2099-12-31`
      : `${apiUrl}/softrestaurant/tips-all.php?start=${tipsStart}&end=${tipsEnd}`;
    fetch(url, { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setTipsData(d); })
      .catch(() => {})
      .finally(() => setTipsLoading(false));
  }, [viewMode, tipsViewMode, tipsStart, tipsEnd, apiUrl]);


  // Formateadores
  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const formatShort = (v) => formatCurrency(v).split('.')[0];

  if (loading || !data) return (
    <div className="min-h-screen bg-[#030712] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      <p className="text-cyan-400 font-mono text-sm tracking-widest animate-pulse uppercase">Cargando datos...</p>
    </div>
  );

  // Label con fechas exactas del período
  const fmtDate = (s) => s ? s.slice(0, 10) : '';
  const sp = data.selected_period || {};
  const selectedRangeLabel = (() => {
    if (dateRange === 'custom') return `${customStart} · ${customEnd}`;
    if (sp.start_formatted && sp.end_formatted) {
      if (dateRange === 'today' || dateRange === 'yesterday') return sp.start_formatted || fmtDate(sp.start);
      return `${fmtDate(sp.start)} · ${fmtDate(sp.end)}`;
    }
    // Calcular fechas localmente como fallback
    const now = new Date();
    const h = now.getHours();
    if (dateRange === 'today') {
      const base = h < 8 ? new Date(now - 864e5) : now;
      return base.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (dateRange === 'yesterday') {
      const base = h < 8 ? new Date(now - 2*864e5) : new Date(now - 864e5);
      return base.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (dateRange === 'week') {
      const base = h < 8 ? new Date(now - 864e5) : now;
      const day = base.getDay();
      const mon = new Date(base); mon.setDate(base.getDate() - (day === 0 ? 6 : day - 1));
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6);
      const fmt = (d) => d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
      return `${fmt(mon)} · ${fmt(sun)}`;
    }
    if (dateRange === 'month') {
      const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      return `${months[selectedMonth - 1]} ${selectedYear}`;
    }
    return RANGE_LABELS[dateRange] || dateRange;
  })();
  const stats = data.current_stats || data.stats?.[dateRange] || { total: 0, covers: 0, checks: 0, tips: 0, discounts: 0, gross_sales: 0, total_tax: 0, courtesies: 0, courtesy_checks: 0, cancelled: { checks: 0, amount: 0, tips: 0 }, open: { checks: 0, amount: 0 } };
  const tickets = data.sales || [];
  
  // Propinas, descuentos, cortesias y cancelados separados (NO se suman a venta total)
  const totalTips      = stats.tips           || 0;
  const totalDiscounts = stats.discounts      || 0;
  const totalTax       = stats.total_tax      || 0;
  const grossSales     = stats.gross_sales    || 0;
  const totalCourtesies = stats.courtesies    || 0;
  const courtesyChecks  = stats.courtesy_checks || 0;
  const cancelledStats = stats.cancelled || { checks: 0, amount: 0, tips: 0 };
  
  const openCount = data.open_stats?.checks || 0;
  const openAmount = data.open_stats?.total || 0;
  const totalWithOpen = (stats.total || 0) + openAmount;
  const peakHour = data.analytics?.peak_hour;
  const avgTicket = stats.total / (stats.checks || 1);
  const comparison = data.comparison || null;
  const isHourlyRange = dateRange === 'today' || dateRange === 'yesterday';
  const chartData = isHourlyRange ? (data.hourly || []) : (data.daily || []);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-200 p-4 lg:p-6 space-y-5 font-sans overflow-x-hidden">
      
      {/* ── HEADER ── */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 lg:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <p className="text-emerald-400 text-xs font-bold uppercase tracking-widest">
                En Vivo · {stats.checks} tickets
                {lastUpdate && <span className="text-slate-600 font-mono ml-2">· {lastUpdate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}</span>}
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-baseline gap-3 flex-wrap">
                <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tight leading-none">{formatCurrency(totalWithOpen)}</h1>
                <span className="text-slate-500 text-sm">venta del turno (cerrada + en curso) · {selectedRangeLabel}</span>
              </div>
              {openAmount > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Cerrada:</span> <span className="text-emerald-400 font-bold">{formatCurrency(stats.total || 0)}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">En curso ({openCount}):</span> <span className="text-orange-400 font-bold">{formatCurrency(openAmount)}</span>
                  </span>
                </div>
              )}
              {data.selected_period?.description && (
                <p className="text-cyan-400/60 text-xs font-mono">
                  {data.selected_period.description}
                </p>
              )}
              {/* Desglose SR — igual que reporte SoftRestaurant */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {grossSales > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Bruta:</span> <span className="text-white font-bold">{formatCurrency(grossSales)}</span>
                  </span>
                )}
                {totalTax > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">IVA:</span> <span className="text-amber-400 font-bold">{formatCurrency(totalTax)}</span>
                  </span>
                )}
                {totalDiscounts > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Descuentos:</span> <span className="text-orange-400 font-bold">-{formatCurrency(totalDiscounts)}</span>
                  </span>
                )}
                {totalCourtesies > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Cortesías:</span> <span className="text-rose-400 font-bold">-{formatCurrency(totalCourtesies)}</span>
                    <span className="text-slate-600 ml-1">({courtesyChecks} tickets)</span>
                  </span>
                )}
                {cancelledStats.checks > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Cancelados:</span> <span className="text-red-400 font-bold">{cancelledStats.checks} tickets</span>
                  </span>
                )}
                {totalTips > 0 && (
                  <span className="text-[11px] text-slate-400">
                    <span className="text-slate-500">Propinas:</span> <span className="text-emerald-400 font-bold">{formatCurrency(totalTips)}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-2 shrink-0">
            <div className="flex gap-1 bg-black/40 p-1 rounded-xl border border-slate-800">
              {RANGES.map((key) => (
                <button key={key} onClick={() => setDateRange(key)}
                  className={`flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${dateRange === key ? 'bg-white text-black shadow' : 'text-slate-400 hover:text-white'}`}>
                  <span>{RANGE_ICONS[key]}</span> {RANGE_LABELS[key]}
                </button>
              ))}
            </div>
            {dateRange === 'month' && (
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-slate-800">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                  className="bg-[#0b1120] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg"
                >
                  <option value="1">Enero</option>
                  <option value="2">Febrero</option>
                  <option value="3">Marzo</option>
                  <option value="4">Abril</option>
                  <option value="5">Mayo</option>
                  <option value="6">Junio</option>
                  <option value="7">Julio</option>
                  <option value="8">Agosto</option>
                  <option value="9">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
                <input
                  type="number"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  min="2020"
                  max="2030"
                  className="bg-[#0b1120] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg w-24"
                />
              </div>
            )}
            {dateRange === 'custom' && (
              <div className="flex items-center gap-2 bg-black/40 p-2 rounded-xl border border-slate-800">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="bg-[#0b1120] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg"
                />
                <span className="text-slate-500 text-xs">a</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="bg-[#0b1120] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg"
                />
              </div>
            )}
            <div className="flex flex-col gap-1.5 w-full">
              {/* Toggle comparación */}
              <button
                onClick={() => setCompareEnabled(!compareEnabled)}
                className={`flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-all border ${
                  compareEnabled
                    ? 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30'
                    : 'bg-transparent text-slate-500 border-slate-800 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                <span>Comparativo</span>
                <span className={`w-7 h-4 rounded-full transition-all flex items-center px-0.5 ${compareEnabled ? 'bg-cyan-500' : 'bg-slate-700'}`}>
                  <span className={`w-3 h-3 bg-white rounded-full transition-all shadow ${compareEnabled ? 'translate-x-3' : 'translate-x-0'}`} />
                </span>
              </button>

              {compareEnabled && (
                <div className="flex flex-col gap-1.5 bg-[#0a0f1e] p-2.5 rounded-xl border border-slate-800">
                  {/* Toggle comparación personalizada */}
                  <button
                    onClick={() => setCustomCompareMode(!customCompareMode)}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                      customCompareMode ? 'text-slate-200' : 'text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span>Comparar con periodo personalizado</span>
                    <span className={`w-6 h-3.5 rounded-full transition-all flex items-center px-0.5 ${customCompareMode ? 'bg-slate-500' : 'bg-slate-800'}`}>
                      <span className={`w-2.5 h-2.5 bg-white rounded-full transition-all shadow ${customCompareMode ? 'translate-x-2.5' : 'translate-x-0'}`} />
                    </span>
                  </button>

                  {customCompareMode && (
                    <div className="flex flex-col gap-2 pt-1 border-t border-slate-800/60">
                      {/* Tipo de comparación */}
                      <div className="grid grid-cols-2 gap-1 bg-black/30 p-1 rounded-lg">
                        {[['day', 'Día vs Día'], ['period', 'Periodo vs Periodo']].map(([val, label]) => (
                          <button key={val} onClick={() => setCompareType(val)}
                            className={`py-1.5 text-[11px] font-bold rounded-md transition-all ${
                              compareType === val
                                ? 'bg-slate-700 text-white shadow'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>

                      {/* Periodo 1 */}
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-wide pl-0.5">
                          {compareType === 'day' ? 'Día A' : 'Periodo A'}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" value={period1Start} onChange={(e) => setPeriod1Start(e.target.value)}
                            className="bg-[#0b1120] border border-slate-700/60 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg flex-1 focus:outline-none focus:border-cyan-500/50" />
                          {compareType === 'period' && (
                            <>
                              <span className="text-slate-600 text-[10px]">—</span>
                              <input type="date" value={period1End} onChange={(e) => setPeriod1End(e.target.value)}
                                className="bg-[#0b1120] border border-slate-700/60 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg flex-1 focus:outline-none focus:border-cyan-500/50" />
                            </>
                          )}
                        </div>
                      </div>

                      {/* Periodo 2 */}
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] text-purple-400 font-bold uppercase tracking-wide pl-0.5">
                          {compareType === 'day' ? 'Día B' : 'Periodo B'}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <input type="date" value={period2Start} onChange={(e) => setPeriod2Start(e.target.value)}
                            className="bg-[#0b1120] border border-slate-700/60 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg flex-1 focus:outline-none focus:border-purple-500/50" />
                          {compareType === 'period' && (
                            <>
                              <span className="text-slate-600 text-[10px]">—</span>
                              <input type="date" value={period2End} onChange={(e) => setPeriod2End(e.target.value)}
                                className="bg-[#0b1120] border border-slate-700/60 text-slate-200 text-[11px] px-2 py-1.5 rounded-lg flex-1 focus:outline-none focus:border-purple-500/50" />
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="lg:hidden">
              <select value={viewMode} onChange={(e) => setViewMode(e.target.value)}
                className="w-full bg-black/40 border border-slate-800 text-white text-sm p-2.5 rounded-xl focus:outline-none focus:border-cyan-500">
                {Object.entries(VIEW_CONFIG).map(([k, v]) => (
                  <option key={k} value={k} className="bg-[#0b1120]">{v.icon} {v.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex mt-5 pt-4 border-t border-slate-800 gap-1 flex-wrap">
          {Object.entries(VIEW_CONFIG).map(([key, cfg]) => (
            <button key={key} onClick={() => setViewMode(key)} title={cfg.desc}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                viewMode === key ? 'bg-cyan-500 text-black shadow shadow-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-slate-700'}`}>
              <span>{cfg.icon}</span> {cfg.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <span>{VIEW_CONFIG[viewMode]?.icon}</span>
          <span className="text-white font-bold text-sm">{VIEW_CONFIG[viewMode]?.label}</span>
          <span className="text-slate-500 text-xs">— {VIEW_CONFIG[viewMode]?.desc}</span>
        </div>
      </div>

      {compareEnabled && comparison && viewMode !== 'shift_close' && (
        <div className="bg-[#0b1120] border border-cyan-500/20 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-cyan-400 text-xs font-black uppercase tracking-widest">
                📊 Comparativo de períodos {customCompareMode ? '(Personalizado)' : '(Automático)'}
              </p>
              <p className="text-slate-400 text-xs mt-1">
                {customCompareMode ? (
                  <>
                    <span className="text-cyan-400">Periodo 1:</span> {data.selected_period?.start_formatted} - {data.selected_period?.end_formatted}
                    {' · '}
                    <span className="text-purple-400">Periodo 2:</span> {comparison.previous_period?.start?.slice(0, 16)} - {comparison.previous_period?.end?.slice(0, 16)}
                  </>
                ) : (
                  <>
                    Actual: {selectedRangeLabel} · Anterior: {comparison.previous_period?.start?.slice(0, 10)} · {comparison.previous_period?.end?.slice(0, 10)}
                  </>
                )}
              </p>
            </div>
            <div className={`text-sm font-black ${Number(comparison.delta?.amount || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {Number(comparison.delta?.amount || 0) >= 0 ? '+' : ''}{formatCurrency(comparison.delta?.amount || 0)}
              <span className="text-slate-500 font-medium ml-2">
                ({comparison.delta?.percent === null ? 'N/A' : `${comparison.delta.percent > 0 ? '+' : ''}${comparison.delta.percent}%`})
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            {/* Periodo 1 */}
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
              <p className="text-cyan-400 text-xs font-bold uppercase mb-2">
                {customCompareMode ? '📊 Periodo 1' : '📈 Periodo Actual'}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-slate-400 text-[10px]">Venta Total</p>
                  <p className="text-white font-black text-2xl">{formatCurrency(comparison.current?.total || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Tickets</p>
                    <p className="text-white font-bold">{comparison.current?.checks || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Comensales</p>
                    <p className="text-white font-bold">{comparison.current?.covers || 0}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Periodo 2 */}
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
              <p className="text-purple-400 text-xs font-bold uppercase mb-2">
                {customCompareMode ? '📊 Periodo 2' : '📉 Periodo Anterior'}
              </p>
              <div className="space-y-2">
                <div>
                  <p className="text-slate-400 text-[10px]">Venta Total</p>
                  <p className="text-white font-black text-2xl">{formatCurrency(comparison.previous?.total || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-slate-500">Tickets</p>
                    <p className="text-white font-bold">{comparison.previous?.checks || 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Comensales</p>
                    <p className="text-white font-bold">{comparison.previous?.covers || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Delta/Diferencia */}
          <div className="mt-3 bg-black/20 border border-slate-800 rounded-xl p-3">
            <div className="flex items-center justify-between">
              <p className="text-slate-400 text-xs">Diferencia (Periodo 1 - Periodo 2)</p>
              <div className={`text-lg font-black ${Number(comparison.delta?.amount || 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {Number(comparison.delta?.amount || 0) >= 0 ? '+' : ''}{formatCurrency(comparison.delta?.amount || 0)}
                <span className="text-slate-500 font-medium ml-2 text-sm">
                  ({comparison.delta?.percent === null ? 'N/A' : `${comparison.delta.percent > 0 ? '+' : ''}${comparison.delta.percent}%`})
                </span>
              </div>
            </div>
          </div>

          {/* Métricas adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
            <div className="bg-black/20 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 text-[11px]">Venta total</p>
              <p className="text-white font-black text-lg">{formatCurrency(comparison.current?.total || 0)}</p>
              <p className="text-slate-600 text-xs">vs {formatCurrency(comparison.previous?.total || 0)}</p>
            </div>
            <div className="bg-black/20 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 text-[11px]">Tickets</p>
              <p className="text-white font-black text-lg">{comparison.current?.checks || 0}</p>
              <p className="text-slate-600 text-xs">Antes: {comparison.previous?.checks || 0}</p>
            </div>
            <div className="bg-black/20 border border-slate-800 rounded-xl p-3">
              <p className="text-slate-500 text-[11px]">Ticket promedio</p>
              <p className="text-white font-black text-lg">{formatCurrency(comparison.current?.average || 0)}</p>
              <p className="text-slate-600 text-xs">Antes: {formatCurrency(comparison.previous?.average || 0)}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── KPIs ── (solo en vista General) */}
      {viewMode === 'overview' && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard icon="🧾" label="Tickets cerrados" value={stats.checks} sub="Cuentas cobradas en el período" accent="#06b6d4" border="border-cyan-500/25" isCurrency={false} fmt={formatCurrency} />
        <KPICard icon="💵" label="Ticket promedio" value={avgTicket} sub={`Promedio sobre ${stats.checks} tickets`} accent="#a78bfa" border="border-violet-500/25" isCurrency={true} fmt={formatCurrency} />
        <KPICard icon="👥" label="Comensales" value={stats.covers} sub="Personas atendidas" accent="#818cf8" border="border-indigo-500/25" isCurrency={false} fmt={formatCurrency} />
        <KPICard icon="💚" label="Propinas" value={totalTips} sub="Total propinas (NO incluidas en venta)" accent="#10b981" border="border-emerald-500/25" isCurrency={true} fmt={formatCurrency} />
        <KPICard icon="🏷️" label="Descuentos" value={totalDiscounts} sub="Ya restados de venta neta" accent="#f59e0b" border="border-amber-500/25" isCurrency={true} fmt={formatCurrency} />
        <KPICard icon="❌" label="Cancelaciones" value={cancelledStats.amount} sub={`${cancelledStats.checks} tickets (NO incluidos en venta)`} accent="#ef4444" border="border-red-500/25" isCurrency={true} fmt={formatCurrency} />
        <KPICard icon="🪑" label="Mesas abiertas" value={openCount} sub={`${data.open_stats?.covers || 0} comensales del período`} accent="#f97316" border="border-orange-500/25" isCurrency={false} fmt={formatCurrency} />
        <KPICard icon="⏰" label="Hora pico" value={peakHour ? `${peakHour.hour}:00 h` : '--'} sub={peakHour ? `${peakHour.tickets} tickets · ${formatCurrency(peakHour.sales)}` : 'Sin datos aún'} accent="#ec4899" border="border-pink-500/25" isCurrency={false} fmt={formatCurrency} />
      </div>}

      <AnimatePresence mode="wait">
        {/* ── VISTA GENERAL ── */}
        {viewMode === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Gráfica Horaria */}
              <div className="lg:col-span-2 bg-[#0b1120] border border-slate-800 p-5 rounded-2xl">
                <SectionHeader icon="📈" title={isHourlyRange ? 'Ventas por hora' : 'Ventas por día'} desc={isHourlyRange ? 'Cuánto se vendió en cada franja horaria del día' : 'Resumen diario dentro del período seleccionado'} />
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 22, right: 8, left: -14, bottom: 0 }}>
                      <XAxis dataKey={isHourlyRange ? 'hour' : 'date'} stroke="#334155" fontSize={11} axisLine={false} tickLine={false} tickFormatter={(x) => isHourlyRange ? `${String(x).replace(':00', '')}h` : x} />
                      <YAxis stroke="#334155" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px', color: '#fff' }}
                        formatter={(v) => [formatCurrency(v), 'Venta total']} labelFormatter={(l) => isHourlyRange ? `${l} hrs` : `Día ${l}`} />
                      <Bar dataKey="total" fill="#06b6d4" radius={[5, 5, 0, 0]} maxBarSize={36}>
                        <LabelList dataKey="total" position="top" offset={6}
                          content={(p) => p.value > 0 ? <text x={p.x + p.width / 2} y={p.y} dy={-4} fill="#06b6d4" fontSize={9} fontWeight="800" textAnchor="middle">{formatShort(p.value)}</text> : null} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Métodos de Pago */}
              <div className="bg-[#0b1120] border border-slate-800 p-5 rounded-2xl flex flex-col">
                <SectionHeader icon="💳" title="Métodos de pago" desc="Cómo pagaron los clientes" />
                <ResponsiveContainer width="100%" height={170}>
                  <PieChart>
                    <Pie data={data.payment_methods || []} innerRadius={50} outerRadius={75} dataKey="value" stroke="none">
                      {data.payment_methods?.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [formatCurrency(v), 'Total']} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 mt-2">
                  {data.payment_methods?.map((m, i) => {
                    const pct = stats.total > 0 ? Math.round((m.value / stats.total) * 100) : 0;
                    return (
                      <div key={i} className="flex items-center gap-2.5 p-2 rounded-lg bg-black/20">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i] }} />
                        <span className="text-slate-300 text-sm flex-1 truncate">{m.name}</span>
                        <span className="text-slate-500 text-xs">{pct}%</span>
                        <span className="text-white font-bold text-sm">{formatCurrency(m.value)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Propinas + Hora pico + Mesas */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#0b1120] border border-emerald-500/20 p-5 rounded-2xl">
                <SectionHeader icon="💚" title="Propinas" desc="Cobradas en este período" />
                <div className="space-y-2">
                  <div className="flex justify-between items-center py-2 border-b border-slate-800">
                    <span className="text-slate-400 text-sm">Total acumulado</span>
                    <span className="text-emerald-400 font-black text-xl">{formatCurrency(totalTips)}</span>
                  </div>
                  {data.analytics?.tips_breakdown && (<>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"/>Pagadas a meseros</span>
                      <span className="text-white font-bold text-sm">{formatCurrency(data.analytics.tips_breakdown.paid_tips)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 text-xs flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"/>Pendientes de pago</span>
                      <span className="text-amber-400 font-bold text-sm">{formatCurrency(data.analytics.tips_breakdown.unpaid_tips)}</span>
                    </div>
                  </>)}
                </div>
              </div>

              <div className="bg-[#0b1120] border border-pink-500/20 p-5 rounded-2xl">
                <SectionHeader icon="⏰" title="Hora pico" desc="Franja con más actividad del día" />
                {peakHour ? (
                  <div className="text-center">
                    <p className="text-5xl font-black text-white tabular-nums">{String(peakHour.hour).padStart(2,'0')}:00</p>
                    <div className="flex justify-center gap-4 mt-3">
                      <div><p className="text-pink-400 font-black text-lg">{peakHour.tickets}</p><p className="text-slate-600 text-[10px] uppercase">tickets</p></div>
                      <div className="w-px bg-slate-800"/>
                      <div><p className="text-white font-bold">{formatCurrency(peakHour.sales)}</p><p className="text-slate-600 text-[10px] uppercase">en ventas</p></div>
                    </div>
                  </div>
                ) : <p className="text-slate-600 text-center text-sm py-4">Sin datos suficientes</p>}
              </div>

              <div className="bg-[#0b1120] border border-orange-500/20 p-5 rounded-2xl">
                <SectionHeader icon="🪑" title="Mesas abiertas del período" desc="Tickets abiertos durante este rango de fechas" />
                <div className="text-center">
                  <p className="text-5xl font-black text-orange-400">{openCount}</p>
                  <div className="flex justify-center gap-4 mt-3">
                    <div><p className="text-white font-bold">{formatCurrency(data.open_stats?.total || 0)}</p><p className="text-slate-600 text-[10px] uppercase">acumulado</p></div>
                    <div className="w-px bg-slate-800"/>
                    <div><p className="text-orange-400 font-black text-lg">{data.open_stats?.covers || 0}</p><p className="text-slate-600 text-[10px] uppercase">comensales</p></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Resumen de caja */}
            {cashMovements?.summary && (
              <div className="bg-[#0b1120] border border-cyan-500/20 p-5 rounded-2xl">
                <SectionHeader icon="💰" title="Resumen de efectivo" desc="Estado actual del efectivo en caja" />
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: 'Ventas en efectivo', val: cashMovements.summary.cash_sales, color: 'text-white' },
                    { label: '↑ Depósitos recibidos', val: cashMovements.summary.total_deposits, color: 'text-emerald-400' },
                    { label: '↓ Retiros realizados', val: cashMovements.summary.total_withdrawals, color: 'text-red-400' },
                    { label: '↓ Propinas pagadas', val: cashMovements.summary.total_tip_payments, color: 'text-amber-400' },
                    { label: '✓ Saldo esperado en caja', val: cashMovements.summary.final_balance, color: 'text-cyan-400', highlight: true },
                  ].map((item, i) => (
                    <div key={i} className={`text-center p-3 rounded-xl ${item.highlight ? 'bg-cyan-500/10 border border-cyan-500/25' : 'bg-black/20 border border-slate-800'}`}>
                      <p className="text-slate-500 text-[10px] mb-1 leading-tight">{item.label}</p>
                      <p className={`font-black text-base ${item.color}`}>{formatCurrency(item.val)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── TICKETS ── */}
        {viewMode === 'tickets' && (
          <motion.div key="nt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">📋 Lista de Tickets</h3>
                <p className="text-slate-500 text-xs mt-0.5">{tickets.length} tickets · {selectedRangeLabel}</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold">{tickets.filter(t=>t.status==='closed').length} cobrados</span>
                <span className="px-2.5 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded-lg text-xs font-bold">{tickets.filter(t=>t.status==='open').length} abiertos</span>
                <span className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold">{tickets.filter(t=>t.status==='canceled').length} cancelados</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-black/30 text-[10px] text-slate-500 font-black uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-3">Folio</th>
                    <th className="px-5 py-3">Estado</th>
                    <th className="px-5 py-3">Mesa</th>
                    <th className="px-5 py-3">Mesero</th>
                    <th className="px-5 py-3 text-right">Subtotal</th>
                    <th className="px-5 py-3 text-right">Propina</th>
                    <th className="px-5 py-3 text-right">Total cobrado</th>
                    <th className="px-3 py-3 text-center">Productos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {tickets.map((t, i) => (
                    <tr key={i} className={`hover:bg-white/[0.02] transition-colors ${t.status === 'canceled' ? 'opacity-40' : ''}`}>
                      <td className="px-5 py-3.5 font-mono text-cyan-400 font-bold">#{t.folio}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold uppercase rounded-lg border ${
                          t.status === 'canceled' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                          t.status === 'open'     ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                                                   'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                          {t.status === 'closed' ? '✓ Cobrado' : t.status === 'open' ? '● Abierto' : '✕ Cancelado'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-300 font-medium">Mesa {t.table_number || '--'}</td>
                      <td className="px-5 py-3.5 text-slate-300 text-sm font-bold uppercase tracking-wide">{t.waiter_name || '--'}</td>
                      <td className="px-5 py-3.5 text-right text-slate-500 font-mono text-sm">{formatCurrency(t.subtotal || t.total)}</td>
                      <td className="px-5 py-3.5 text-right text-emerald-400 font-mono font-bold text-sm">{t.tip > 0 ? formatCurrency(t.tip) : <span className="text-slate-700">—</span>}</td>
                      <td className={`px-5 py-3.5 text-right font-black text-base ${t.status === 'canceled' ? 'line-through text-slate-700' : 'text-white'}`}>{formatCurrency(t.total)}</td>
                      <td className="px-3 py-3.5 text-center">
                        <button
                          onClick={() => setSelectedTicket(t)}
                          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold hover:bg-cyan-500/20 transition-all"
                        >
                          🍽️ Ver
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {tickets.length === 0 && (
              <div className="text-center py-16"><p className="text-4xl mb-3">📭</p><p className="text-slate-500 text-sm">Sin tickets en este período</p></div>
            )}
          </motion.div>
        )}

        {/* ── MESEROS ── */}
        {viewMode === 'waiters' && (
          <motion.div key="wt" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
            <div className="bg-[#0b1120] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div><p className="text-white font-bold flex items-center gap-2">🧑‍🍳 Desempeño por mesero</p>
                <p className="text-slate-500 text-xs mt-0.5">{data.waiters?.length || 0} meseros activos · {selectedRangeLabel}</p></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.waiters?.map((w, i) => {
                const topWaiter = data.waiters.reduce((a, b) => a.total > b.total ? a : b, {});
                const isTop = w.name === topWaiter.name;
                return (
                  <div key={i} className={`bg-[#0b1120] border rounded-2xl p-5 hover:border-cyan-500/40 transition-all group relative ${isTop ? 'border-amber-500/35' : 'border-slate-800'}`}>
                    {isTop && <span className="absolute top-4 right-4 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">⭐ Top</span>}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg font-black bg-cyan-500/15 border border-cyan-500/25 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-black transition-all shrink-0">
                        {w.name.charAt(0).toUpperCase()}
                      </div>
                      <div><h4 className="text-white font-bold">{w.name}</h4>
                        <p className="text-slate-500 text-xs">{w.checks} tickets atendidos</p></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center p-3 bg-black/20 rounded-xl">
                        <span className="text-slate-400 text-xs font-bold uppercase">Ventas totales</span>
                        <span className="text-white font-black text-xl">{formatCurrency(w.total)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-2.5 bg-emerald-500/5 border border-emerald-500/15 rounded-xl text-center">
                          <p className="text-emerald-400 font-black text-base">{formatCurrency(w.tips)}</p>
                          <p className="text-slate-600 text-[10px] uppercase mt-0.5">Propinas</p>
                        </div>
                        <div className="p-2.5 bg-cyan-500/5 border border-cyan-500/15 rounded-xl text-center">
                          <p className="text-cyan-400 font-black text-base">{formatCurrency(w.total / (w.checks || 1))}</p>
                          <p className="text-slate-600 text-[10px] uppercase mt-0.5">Prom/ticket</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              {(!data.waiters || data.waiters.length === 0) && (
                <div className="col-span-3 text-center py-16 bg-[#0b1120] rounded-2xl border border-slate-800">
                  <p className="text-4xl mb-3">👥</p><p className="text-slate-500 text-sm">Sin datos de meseros</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── AUDITORÍA ── */}
        {viewMode === 'audit' && (
          <motion.div key="ad" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="bg-[#0b1120] border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
              <div><p className="text-white font-bold">🔍 Cancelaciones y Ajustes</p>
                <p className="text-slate-500 text-xs mt-0.5">Registro de tickets cancelados y sus motivos · {selectedRangeLabel}</p></div>
              <div className="text-right">
                <p className="text-red-400 font-black text-xl">{formatCurrency(cancelledStats.amount)}</p>
                <p className="text-slate-500 text-xs">{cancelledStats.checks} cancelaciones</p>
              </div>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {data.cancellations?.map((c, i) => (
                <div key={i} className="bg-[#0b1120] p-4 rounded-2xl border border-red-500/15 flex flex-col md:flex-row md:justify-between md:items-center gap-4 hover:border-red-500/30 transition-all">
                  <div className="flex gap-3 items-center">
                    <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center text-red-400 font-black shrink-0">✕</div>
                    <div>
                      <p className="text-white font-bold font-mono">Ticket #{c.ticket_number}</p>
                      <p className="text-slate-400 text-sm mt-0.5">Motivo: <span className="text-slate-200 font-medium">"{c.reason}"</span></p>
                      <p className="text-xs text-slate-600 mt-0.5">Canceló: <span className="text-cyan-400 font-bold">{c.user_name}</span></p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-red-400 font-black text-2xl">{formatCurrency(c.amount)}</p>
                    <p className="text-slate-600 text-xs font-mono mt-0.5">{new Date(c.cancel_date).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}</p>
                  </div>
                </div>
              ))}
              {(!data.cancellations || data.cancellations.length === 0) && (
                <div className="text-center py-16 bg-[#0b1120] rounded-2xl border border-dashed border-slate-800">
                  <p className="text-4xl mb-3">✅</p>
                  <p className="text-emerald-400 font-bold">Sin cancelaciones en este período</p>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* ── CORTE DE CAJA ── */}
        {viewMode === 'shift_close' && (
          <motion.div key="shift_close" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Selector de fecha del corte */}
            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                <span className="text-purple-400 text-lg">🧾</span>
                <div>
                  <p className="text-white font-black text-sm">Corte de Caja</p>
                  <p className="text-slate-500 text-[10px]">Selecciona la fecha del turno</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="date"
                  value={shiftDate}
                  onChange={(e) => setShiftDate(e.target.value)}
                  className="bg-[#030712] border border-slate-700 text-slate-200 text-xs px-3 py-2 rounded-xl focus:outline-none focus:border-purple-500/60"
                />
              </div>
              {cashMovements && (
                <div className="text-right shrink-0">
                  <p className="text-slate-500 text-[10px] font-mono">{cashMovements.start?.slice(0,16)} – {cashMovements.end?.slice(0,16)}</p>
                </div>
              )}
            </div>

            {cashMovements?.summary ? (() => {
              const s = cashMovements.summary;
              const totalVentaConImp = s.total_sales || 0;
              const subtotalSinImp   = s.subtotal    || 0;
              const impuestos        = s.total_tax   || 0;
              const descuentos       = s.total_discounts || 0;
              const propinas         = s.total_tips  || 0;
              const efectivo         = s.cash_sales  || 0;
              const tarjeta          = s.card_sales  || 0;
              const vales            = s.voucher_sales || 0;
              const otros            = s.other_sales || 0;
              const depositos        = s.total_deposits    || 0;
              const retiros          = s.total_withdrawals || 0;
              const propinasPagadas  = s.total_tip_payments || 0;
              const saldoFinal       = s.final_balance || 0;
              const efectivoFinal    = saldoFinal;
              const alimentos        = s.sales_alimentos || 0;
              const bebidas          = s.sales_bebidas   || 0;
              const totalSinImpProd  = alimentos + bebidas;
              const pctAlim = totalSinImpProd > 0 ? Math.round(alimentos / totalSinImpProd * 100) : 0;
              const pctBeb  = totalSinImpProd > 0 ? Math.round(bebidas  / totalSinImpProd * 100) : 0;
              const cuentasNormales   = s.total_checks     || 0;
              const cuentasCanceladas = s.cancelled_checks || 0;
              const cuentasDescuento  = s.discount_checks  || 0;
              const cuentasCortesia   = s.courtesy_checks  || 0;
              const cuentaPromedio    = s.avg_check   || 0;
              const consumoPromedio   = s.avg_cover   || 0;
              const comensales        = s.total_covers     || 0;
              const folioInicial      = s.folio_inicial    || '—';
              const folioFinal        = s.folio_final      || '—';
              const cortAlim          = s.cortesia_alimentos || 0;
              const cortBeb           = s.cortesia_bebidas   || 0;
              const totalCortesias    = cortAlim + cortBeb;

              return (
                <>
                  {/* HEADER TOTAL */}
                  <div className="bg-gradient-to-r from-purple-500/10 via-slate-900 to-cyan-500/5 border border-purple-500/20 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest mb-1">BONIFACIO'S · CORTE DE CAJA X</p>
                      <p className="text-white font-black text-3xl">{formatCurrency(totalVentaConImp)}</p>
                      <p className="text-slate-400 text-xs mt-1 font-mono">
                        DEL {cashMovements.start?.slice(0,10)} · AL {cashMovements.end?.slice(0,10)}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center">
                      {[
                        { label: 'Cuentas', val: cuentasNormales, color: 'text-white' },
                        { label: 'Comensales', val: comensales, color: 'text-cyan-400' },
                        { label: 'Promedio', val: formatCurrency(cuentaPromedio), color: 'text-emerald-400', raw: true },
                      ].map((k, i) => (
                        <div key={i} className="bg-black/30 rounded-xl px-3 py-2">
                          <p className={`font-black text-xl ${k.color}`}>{k.raw ? k.val : k.val}</p>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wide">{k.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                    {/* CAJA */}
                    <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-1">
                      <SectionHeader icon="💰" title="CAJA" desc="Movimientos de efectivo del turno" />
                      {[
                        { label: '+ EFECTIVO',              val: efectivo,        color: 'text-emerald-400', sign: '+' },
                        { label: '+ TARJETA',               val: tarjeta,         color: 'text-blue-400',    sign: '+' },
                        { label: '+ VALES',                 val: vales,           color: 'text-slate-300',   sign: '+' },
                        { label: '+ TRANSFERENCIA / OTROS', val: otros,           color: 'text-slate-300',   sign: '+' },
                        { label: `+ DEPÓSITOS EFECTIVO (${s.deposit_count||0})`,   val: depositos,  color: 'text-emerald-400', sign: '+' },
                        { label: `- RETIROS EFECTIVO (${s.withdrawal_count||0})`,  val: retiros,    color: 'text-red-400',     sign: '-' },
                        { label: '- PROPINAS PAGADAS',      val: propinasPagadas, color: 'text-amber-400',   sign: '-' },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                          <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                        </div>
                      ))}
                      <div className="pt-2 mt-1 border-t border-slate-600 flex justify-between items-center">
                        <span className="text-white font-black text-sm">= SALDO FINAL</span>
                        <span className="text-cyan-400 font-black text-xl">{formatCurrency(saldoFinal)}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs font-mono pl-2">EFECTIVO FINAL</span>
                        <span className="text-emerald-400 font-bold text-sm">{formatCurrency(efectivoFinal)}</span>
                      </div>
                    </div>

                    {/* FORMA DE PAGO */}
                    <div className="space-y-4">
                      <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-1">
                        <SectionHeader icon="💳" title="FORMA DE PAGO VENTAS" desc="" />
                        {[
                          { label: 'EFECTIVO', val: efectivo, color: 'text-emerald-400' },
                          { label: 'TARJETA / VISA', val: tarjeta, color: 'text-blue-400' },
                          ...(vales > 0 ? [{ label: 'VALES', val: vales, color: 'text-slate-300' }] : []),
                          ...(otros > 0  ? [{ label: 'TRANSFERENCIA / OTROS', val: otros,  color: 'text-slate-300' }] : []),
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                            <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                      </div>
                      {propinas > 0 && (
                        <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-1">
                          <SectionHeader icon="🤝" title="FORMA DE PAGO PROPINA" desc="" />
                          {[
                            { label: 'TARJETA / VISA', val: propinas, color: 'text-amber-400' },
                          ].map((row, i) => (
                            <div key={i} className="flex justify-between items-center py-1.5">
                              <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                              <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* VENTAS POR TIPO DE PRODUCTO */}
                  <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5">
                    <SectionHeader icon="🍽️" title="VENTA (NO INCLUYE IMPUESTOS) POR TIPO DE PRODUCTO" desc="" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        {[
                          { label: 'ALIMENTOS', val: alimentos, pct: pctAlim, cnt: null, color: 'text-orange-400', bar: 'bg-orange-500' },
                          { label: 'BEBIDAS',   val: bebidas,   pct: pctBeb,  cnt: null, color: 'text-blue-400',   bar: 'bg-blue-500'   },
                          { label: 'OTROS',     val: 0,         pct: 0,       cnt: null, color: 'text-slate-500',  bar: 'bg-slate-700'  },
                        ].map((row, i) => (
                          <div key={i}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-slate-500 text-xs">({row.pct}%)</span>
                                <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                              </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${row.bar}`} style={{ width: `${row.pct}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2 border-l border-slate-800 pl-4">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">POR TIPO DE SERVICIO</p>
                        {[
                          { label: 'COMEDOR',   val: totalVentaConImp, pct: 100, color: 'text-cyan-400' },
                          { label: 'DOMICILIO', val: 0, pct: 0, color: 'text-slate-500' },
                          { label: 'RÁPIDO',    val: 0, pct: 0, color: 'text-slate-500' },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 text-[10px]">({row.pct}%)</span>
                              <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SUBTOTALES */}
                    <div className="mt-4 pt-3 border-t border-slate-700 space-y-1">
                      {[
                        { label: 'SUBTOTAL',     val: subtotalSinImp, color: 'text-white', bold: true },
                        { label: '-DESCUENTOS',  val: descuentos,     color: 'text-red-400', sign: '-' },
                        { label: 'VENTA NETA',   val: subtotalSinImp - descuentos, color: 'text-cyan-400', bold: true },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-1">
                          <span className={`text-xs font-mono ${row.bold ? 'text-white font-black' : 'text-slate-400'}`}>{row.label}</span>
                          <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                        </div>
                      ))}
                    </div>

                    {/* IMPUESTOS */}
                    <div className="mt-3 pt-3 border-t border-slate-700 space-y-1">
                      <div className="flex justify-between items-center py-1">
                        <span className="text-slate-400 text-xs font-mono">IMPUESTOS 16%</span>
                        <span className="text-slate-300 font-bold text-sm">{formatCurrency(impuestos)}</span>
                      </div>
                      <div className="flex justify-between items-center py-1">
                        <span className="text-white font-black text-xs font-mono">IMPUESTOS TOTAL</span>
                        <span className="text-white font-black text-sm">{formatCurrency(impuestos)}</span>
                      </div>
                      <div className="flex justify-between items-center py-2 mt-1 bg-cyan-500/10 rounded-xl px-3 border border-cyan-500/20">
                        <span className="text-cyan-400 font-black text-sm font-mono">VENTAS CON IMP.</span>
                        <span className="text-cyan-400 font-black text-2xl">{formatCurrency(totalVentaConImp)}</span>
                      </div>
                    </div>
                  </div>

                  {/* RESUMEN DE CUENTAS */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-5 space-y-1">
                      <SectionHeader icon="📋" title="CUENTAS" desc="Resumen de tickets del turno" />
                      {[
                        { label: 'CUENTAS NORMALES',          val: cuentasNormales,   color: 'text-white',      isNum: true },
                        { label: 'CUENTAS CANCELADAS',        val: cuentasCanceladas, color: 'text-red-400',    isNum: true },
                        { label: 'CUENTAS CON DESCUENTO',     val: cuentasDescuento,  color: 'text-amber-400',  isNum: true },
                        { label: 'CUENTAS CON CORTESÍA',      val: cuentasCortesia,   color: 'text-purple-400', isNum: true },
                        { label: 'CUENTA PROMEDIO',           val: cuentaPromedio,    color: 'text-emerald-400' },
                        { label: 'CONSUMO PROMEDIO',          val: consumoPromedio,   color: 'text-emerald-400' },
                        { label: 'COMENSALES',                val: comensales,        color: 'text-cyan-400',   isNum: true },
                        { label: 'PROPINAS',                  val: propinas,          color: 'text-amber-400' },
                        { label: 'FOLIO INICIAL',             val: folioInicial,      color: 'text-slate-300',  isStr: true },
                        { label: 'FOLIO FINAL',               val: folioFinal,        color: 'text-slate-300',  isStr: true },
                      ].map((row, i) => (
                        <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                          <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                          <span className={`font-bold text-sm ${row.color}`}>
                            {row.isStr ? row.val : row.isNum ? row.val : formatCurrency(row.val)}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      {/* CORTESÍAS */}
                      <div className="bg-[#0b1120] border border-purple-500/20 rounded-2xl p-5 space-y-1">
                        <SectionHeader icon="🎁" title="CORTESÍAS" desc="Tickets sin cobro" />
                        {[
                          { label: 'CORTESÍA ALIMENTOS', val: cortAlim, color: 'text-orange-400' },
                          { label: 'CORTESÍA BEBIDAS',   val: cortBeb,  color: 'text-blue-400'   },
                          { label: 'CORTESÍA OTROS',     val: 0,        color: 'text-slate-500'  },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                            <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                          <span className="text-white font-black text-xs font-mono">TOTAL CORTESÍAS</span>
                          <span className="text-purple-400 font-black text-lg">{formatCurrency(totalCortesias)}</span>
                        </div>
                      </div>

                      {/* DECLARACIÓN DE CAJERO */}
                      <div className="bg-[#0b1120] border border-cyan-500/20 rounded-2xl p-5 space-y-1">
                        <SectionHeader icon="🏦" title="DECLARACIÓN DE CAJERO" desc="Lo que debe haber en caja" />
                        {[
                          { label: 'EFECTIVO',  val: efectivo, color: 'text-emerald-400' },
                          { label: 'TARJETA',   val: tarjeta,  color: 'text-blue-400'    },
                          { label: 'VALES',     val: vales,    color: 'text-slate-300'   },
                          { label: 'TRANSFERENCIA / OTROS', val: otros, color: 'text-slate-300' },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                            <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                          <span className="text-white font-black text-xs font-mono">TOTAL</span>
                          <span className="text-white font-black text-xl">{formatCurrency(totalVentaConImp)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-xs font-mono">SOBRANTE(+) O FALTANTE(-)</span>
                          <span className="text-emerald-400 font-black text-sm">{formatCurrency(0)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* DESCUENTOS */}
                  {(descuentos > 0 || cuentasCanceladas > 0) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-[#0b1120] border border-amber-500/20 rounded-2xl p-4 space-y-1">
                        <SectionHeader icon="🏷️" title="DESCUENTOS" desc="" />
                        {[
                          { label: 'DESCUENTO ALIMENTOS', val: 0, color: 'text-slate-400' },
                          { label: 'DESCUENTO BEBIDAS',   val: 0, color: 'text-slate-400' },
                          { label: 'DESCUENTO OTROS',     val: 0, color: 'text-slate-400' },
                        ].map((row, i) => (
                          <div key={i} className="flex justify-between items-center py-1 border-b border-slate-800/40 last:border-0">
                            <span className="text-slate-400 text-xs font-mono">{row.label}</span>
                            <span className={`font-bold text-sm ${row.color}`}>{formatCurrency(row.val)}</span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                          <span className="text-white font-black text-xs font-mono">TOTAL DESCUENTOS</span>
                          <span className="text-amber-400 font-black text-lg">{formatCurrency(descuentos)}</span>
                        </div>
                      </div>
                      <div className="bg-[#0b1120] border border-red-500/20 rounded-2xl p-4 flex items-center justify-between">
                        <div>
                          <p className="text-red-400 text-xs font-black uppercase">✕ Cancelaciones</p>
                          <p className="text-slate-500 text-xs mt-1">{cuentasCanceladas} tickets cancelados</p>
                        </div>
                        <p className="text-red-400 font-black text-3xl">{formatCurrency(s.cancelled_amount || 0)}</p>
                      </div>
                    </div>
                  )}

                  {/* ── COMPARATIVO: LO DECLARADO EN SR vs LO REAL ── */}
                  {shiftsData?.shifts?.length > 0 ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">⚖️</span>
                        <p className="text-white font-black text-sm uppercase tracking-wide">Comparativo: Declarado en SR vs Real</p>
                        <span className="text-slate-500 text-xs">· {shiftsData.shifts.length} turno{shiftsData.shifts.length > 1 ? 's' : ''}</span>
                      </div>
                      {shiftsData.shifts.map((sh, idx) => {
                        const dec = sh.declarado;
                        const real = sh.real;
                        const movs = sh.movimientos;
                        const difs = sh.diferencias;
                        const difColor = (v) => v === 0 ? 'text-slate-400' : v > 0 ? 'text-emerald-400' : 'text-red-400';
                        const difLabel = (v) => v === 0 ? '—' : v > 0 ? `+${formatCurrency(v)}` : formatCurrency(v);
                        return (
                          <div key={idx} className="bg-[#0b1120] border border-slate-700 rounded-2xl overflow-hidden">
                            {/* Header del turno */}
                            <div className="bg-gradient-to-r from-purple-500/10 to-slate-900 border-b border-slate-700 p-4 flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-purple-400 text-[10px] font-black uppercase tracking-widest">Turno #{sh.sr_turno_id} · {sh.estacion}</p>
                                <p className="text-white font-black text-lg">{sh.cajero || 'Sin cajero'}</p>
                                <p className="text-slate-500 text-[10px] font-mono mt-0.5">
                                  {sh.apertura?.slice(0,16)} → {sh.cierre?.slice(0,16)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-slate-500 text-[10px] uppercase">Fondo inicial</p>
                                <p className="text-slate-300 font-bold text-sm">{formatCurrency(sh.fondo)}</p>
                              </div>
                            </div>

                            {/* Tabla comparativa */}
                            <div className="p-4">
                              <div className="grid grid-cols-4 gap-2 mb-2 px-1">
                                <span className="text-slate-600 text-[10px] uppercase tracking-wide">Concepto</span>
                                <span className="text-blue-400 text-[10px] uppercase tracking-wide text-right">Declarado SR</span>
                                <span className="text-cyan-400 text-[10px] uppercase tracking-wide text-right">Real (tickets)</span>
                                <span className="text-slate-500 text-[10px] uppercase tracking-wide text-right">Diferencia</span>
                              </div>
                              {[
                                { label: 'Efectivo', dec: dec.efectivo, real: real.efectivo, dif: difs.efectivo, note: 'incl. dep/ret/prop' },
                                { label: 'Tarjeta',  dec: dec.tarjeta,  real: real.tarjeta,  dif: difs.tarjeta  },
                                { label: 'Vales',    dec: dec.vales,    real: real.vales,    dif: difs.vales    },
                                { label: 'Crédito / Otros', dec: dec.credito, real: real.otros, dif: dec.credito - real.otros },
                              ].map((r, i) => (
                                <div key={i} className="grid grid-cols-4 gap-2 py-2 border-b border-slate-800/40 last:border-0 px-1">
                                  <div>
                                    <span className="text-slate-300 text-xs font-medium">{r.label}</span>
                                    {r.note && <p className="text-slate-600 text-[9px]">{r.note}</p>}
                                  </div>
                                  <span className="text-blue-300 text-xs font-bold text-right tabular-nums">{formatCurrency(r.dec)}</span>
                                  <span className="text-cyan-300 text-xs font-bold text-right tabular-nums">{formatCurrency(r.real)}</span>
                                  <span className={`text-xs font-bold text-right tabular-nums ${difColor(r.dif)}`}>{difLabel(r.dif)}</span>
                                </div>
                              ))}

                              {/* Totales */}
                              <div className="grid grid-cols-4 gap-2 py-3 mt-1 border-t-2 border-slate-600 px-1">
                                <span className="text-white font-black text-xs uppercase">TOTAL</span>
                                <span className="text-blue-400 font-black text-sm text-right tabular-nums">{formatCurrency(dec.total)}</span>
                                <span className="text-cyan-400 font-black text-sm text-right tabular-nums">{formatCurrency(real.total_sales)}</span>
                                <span className={`font-black text-sm text-right tabular-nums ${difColor(difs.total)}`}>{difLabel(difs.total)}</span>
                              </div>

                              {/* Movimientos de caja */}
                              {(movs.depositos > 0 || movs.retiros > 0 || movs.propinas_pagadas > 0) && (
                                <div className="mt-3 pt-3 border-t border-slate-800 space-y-1">
                                  <p className="text-slate-500 text-[10px] uppercase tracking-wide font-bold mb-2">Movimientos de caja</p>
                                  {movs.depositos > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">+ Depósitos ({movs.n_depositos})</span>
                                      <span className="text-emerald-400 font-bold">{formatCurrency(movs.depositos)}</span>
                                    </div>
                                  )}
                                  {movs.retiros > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">- Retiros ({movs.n_retiros})</span>
                                      <span className="text-red-400 font-bold">{formatCurrency(movs.retiros)}</span>
                                    </div>
                                  )}
                                  {movs.propinas_pagadas > 0 && (
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-400">- Propinas pagadas</span>
                                      <span className="text-amber-400 font-bold">{formatCurrency(movs.propinas_pagadas)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between text-xs pt-1 border-t border-slate-800">
                                    <span className="text-slate-300 font-bold">Saldo esperado en caja</span>
                                    <span className="text-emerald-400 font-black">{formatCurrency(sh.saldo_esperado)}</span>
                                  </div>
                                </div>
                              )}

                              {/* Resumen real */}
                              <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2">
                                {[
                                  { label: 'Tickets', val: real.total_checks, isNum: true, color: 'text-white' },
                                  { label: 'Comensales', val: real.total_covers, isNum: true, color: 'text-cyan-400' },
                                  { label: 'Propinas', val: real.propinas, color: 'text-amber-400' },
                                  { label: 'Cortesías', val: `${real.courtesy_checks} · ${formatCurrency(real.courtesy_amount)}`, isStr: true, color: 'text-purple-400' },
                                ].map((k, i) => (
                                  <div key={i} className="bg-black/20 rounded-xl p-2 text-center">
                                    <p className={`font-black text-sm ${k.color}`}>{k.isStr ? k.val : k.isNum ? k.val : formatCurrency(k.val)}</p>
                                    <p className="text-slate-600 text-[9px] uppercase">{k.label}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="bg-[#0b1120] border border-dashed border-slate-700 rounded-2xl p-5 text-center">
                      <p className="text-slate-500 text-sm">⚖️ Sin cortes oficiales de SR para esta fecha</p>
                      <p className="text-slate-600 text-xs mt-1">Los cortes se sincronizan desde la tabla <span className="font-mono">turnos</span> de SoftRestaurant</p>
                    </div>
                  )}
                </>
              );
            })() : (
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-8 text-center">
                <p className="text-slate-500 text-sm">Sin datos para la fecha seleccionada</p>
                <p className="text-slate-600 text-xs mt-1">{shiftDate}</p>
              </div>
            )}
          </motion.div>
        )}


        {/* ── PROPINAS ── */}
        {viewMode === 'tips' && (
          <motion.div key="tips" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* ── Controles propios de Propinas ── */}
            <div className="bg-[#0b1120] border border-amber-500/20 rounded-2xl p-4 space-y-3">
              {/* Fila 1: título + tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-amber-400 text-[10px] font-black uppercase tracking-widest">🤝 Propinas</span>
                <div className="flex gap-1">
                  {[
                    ['general',  '🌐 Histórico completo'],
                    ['period',   '📅 Por período'],
                    ['by_waiter','👤 Por mesero'],
                  ].map(([k, l]) => (
                    <button key={k} onClick={() => setTipsViewMode(k)}
                      className={`text-[10px] px-3 py-1.5 rounded-lg font-bold transition-all ${tipsViewMode === k ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                      {l}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fila 2: controles de fecha — solo visible en modo "period" */}
              {tipsViewMode === 'period' && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800">
                  <input type="date" value={tipsStart} onChange={e => setTipsStart(e.target.value)}
                    className="bg-black/40 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50" />
                  <span className="text-slate-600 text-xs">—</span>
                  <input type="date" value={tipsEnd} onChange={e => setTipsEnd(e.target.value)}
                    className="bg-black/40 border border-slate-700 text-slate-200 text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-amber-500/50" />
                  <div className="flex gap-1 flex-wrap">
                    {[
                      ['Hoy',  () => { const t = new Date().toISOString().split('T')[0]; setTipsStart(t); setTipsEnd(t); }],
                      ['7d',   () => { const t = new Date(); const s = new Date(t); s.setDate(t.getDate()-6); setTipsStart(s.toISOString().split('T')[0]); setTipsEnd(t.toISOString().split('T')[0]); }],
                      ['Mes',  () => { const t = new Date(); const s = new Date(t.getFullYear(), t.getMonth(), 1); setTipsStart(s.toISOString().split('T')[0]); setTipsEnd(t.toISOString().split('T')[0]); }],
                      ['Año',  () => { const t = new Date(); const s = new Date(t.getFullYear(), 0, 1); setTipsStart(s.toISOString().split('T')[0]); setTipsEnd(t.toISOString().split('T')[0]); }],
                    ].map(([l, fn]) => (
                      <button key={l} onClick={fn} className="text-[10px] px-2 py-1 rounded-lg bg-slate-800 text-slate-400 hover:bg-amber-500/20 hover:text-amber-400 transition-colors font-bold">{l}</button>
                    ))}
                  </div>
                  <span className="text-slate-600 text-[10px]">{tipsStart} · {tipsEnd}</span>
                </div>
              )}

              {/* Descripción del modo activo */}
              <p className="text-slate-600 text-[10px]">
                {tipsViewMode === 'general'  && 'Todo el historial de propinas desde siempre — sin filtro de fechas.'}
                {tipsViewMode === 'period'   && 'Propinas en el rango de fechas seleccionado.'}
                {tipsViewMode === 'by_waiter'&& 'Resumen por mesero del período seleccionado. Clic en un mesero para ver su historial completo.'}
              </p>
            </div>

            {tipsLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="h-7 w-7 animate-spin rounded-full border border-amber-500/20 border-t-amber-400" />
              </div>
            ) : !tipsData ? null : tipsViewMode !== 'by_waiter' ? (
              <div className="space-y-5">

                {/* ── Estadísticas generales ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Total acumulado', value: formatCurrency(tipsData.total_tips), sub: `${tipsData.count} tickets con propina`, accent: '#f59e0b', border: 'border-amber-500/25' },
                    { label: '✓ Pagadas', value: formatCurrency(tipsData.total_paid), sub: `${tipsData.count_paid} tickets · ${tipsData.total_tips > 0 ? Math.round(tipsData.total_paid/tipsData.total_tips*100) : 0}%`, accent: '#10b981', border: 'border-emerald-500/25' },
                    { label: 'Pendientes', value: formatCurrency(tipsData.total_pending), sub: `${tipsData.count_pending} tickets · ${tipsData.total_tips > 0 ? Math.round(tipsData.total_pending/tipsData.total_tips*100) : 0}%`, accent: '#f97316', border: 'border-orange-500/25' },
                    { label: 'Propina promedio', value: formatCurrency(tipsData.avg_tip), sub: `Mediana: ${formatCurrency(tipsData.median_tip)} · Máx: ${formatCurrency(tipsData.max_tip)}`, accent: '#8b5cf6', border: 'border-violet-500/25' },
                  ].map(s => (
                    <div key={s.label} className={`bg-[#0b1120] border ${s.border} p-4 rounded-2xl`}>
                      <p className="text-[9px] font-black uppercase tracking-widest mb-1" style={{ color: s.accent }}>{s.label}</p>
                      <p className="font-black text-xl" style={{ color: s.accent }}>{s.value}</p>
                      <p className="text-slate-500 text-[10px] mt-0.5">{s.sub}</p>
                    </div>
                  ))}
                </div>

                {/* ── Barra pagado/pendiente ── */}
                {tipsData.total_tips > 0 && (() => {
                  const pct = Math.round(tipsData.total_paid / tipsData.total_tips * 100);
                  return (
                    <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4">
                      <div className="flex justify-between text-xs mb-2">
                        <span className="text-emerald-400 font-bold">✓ Pagado {pct}% · {formatCurrency(tipsData.total_paid)}</span>
                        <span className="text-orange-400 font-bold">Pendiente {100-pct}% · {formatCurrency(tipsData.total_pending)}</span>
                      </div>
                      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
                        <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        <div className="h-full bg-orange-500/60 flex-1" />
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600 mt-1">
                        <span>{tipsData.count_paid} tickets cobrados</span>
                        <span>{tipsData.count_pending} tickets por cobrar</span>
                      </div>
                    </div>
                  );
                })()}

                {/* ── Por mesero ── */}
                {tipsData.by_waiter?.length > 0 && (
                  <div className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-800">
                      <p className="text-white font-bold text-sm">Resumen por mesero</p>
                    </div>
                    <div className="divide-y divide-slate-800/50">
                      {tipsData.by_waiter.map((w, idx) => {
                        const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#f97316','#06b6d4','#ec4899','#84cc16'];
                        const color = COLORS[idx % COLORS.length];
                        const pct = tipsData.total_tips > 0 ? Math.round(w.total / tipsData.total_tips * 100) : 0;
                        return (
                          <div key={w.waiter} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-800/20 transition-colors cursor-pointer"
                            onClick={() => setTipsModal({ waiter: w.waiter })}>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                              {(w.waiter || '?')[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-white font-bold text-xs">{w.waiter}</p>
                                <p className="font-black text-sm" style={{ color }}>{formatCurrency(w.total)}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                                </div>
                                <span className="text-slate-500 text-[10px] shrink-0">{w.count} tickets</span>
                                <span className="text-emerald-400 text-[10px] shrink-0">{formatCurrency(w.paid)} pagado</span>
                                {w.pending > 0 && <span className="text-orange-400 text-[10px] shrink-0">{formatCurrency(w.pending)} pendiente</span>}
                              </div>
                            </div>
                            <span className="text-slate-600 text-[10px] shrink-0">{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Dos columnas: Pagadas | Pendientes ── */}
                {(tipsData.paid?.length > 0 || tipsData.pending?.length > 0) && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Pagadas */}
                    <div className="bg-[#0b1120] border border-emerald-500/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-emerald-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          <p className="text-emerald-400 font-bold text-sm">Pagadas</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-emerald-400 font-black text-sm">{formatCurrency(tipsData.total_paid)}</span>
                          <span className="text-slate-500 text-[10px]">{tipsData.count_paid} tickets</span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-800/30 max-h-80 overflow-y-auto">
                        {tipsData.paid?.length === 0 ? (
                          <p className="text-center text-slate-600 py-8 text-xs">Sin propinas pagadas</p>
                        ) : tipsData.paid.map((t, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-emerald-500/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-[10px]">{t.folio}</span>
                                <span className="text-slate-500 text-[10px]">{t.sale_datetime?.slice(0,10)}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] truncate">{t.waiter_name} · Mesa {t.table_number || '—'}</p>
                              {t.authorized && <p className="text-slate-600 text-[9px]">auth: {t.authorized}</p>}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-emerald-400 font-black text-xs">{formatCurrency(parseFloat(t.tip))}</p>
                              <p className="text-slate-600 text-[9px]">{formatCurrency(parseFloat(t.total))} total</p>
                            </div>
                            <button onClick={() => setSelectedTicket(t)} className="text-[9px] text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 hover:border-cyan-400/40 shrink-0">Ver</button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pendientes */}
                    <div className="bg-[#0b1120] border border-orange-500/20 rounded-2xl overflow-hidden">
                      <div className="px-5 py-3 border-b border-orange-500/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                          <p className="text-orange-400 font-bold text-sm">Pendientes de pago</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-orange-400 font-black text-sm">{formatCurrency(tipsData.total_pending)}</span>
                          <span className="text-slate-500 text-[10px]">{tipsData.count_pending} tickets</span>
                        </div>
                      </div>
                      <div className="divide-y divide-slate-800/30 max-h-80 overflow-y-auto">
                        {tipsData.pending?.length === 0 ? (
                          <p className="text-center text-slate-600 py-8 text-xs">Sin propinas pendientes</p>
                        ) : tipsData.pending.map((t, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-orange-500/5 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono text-[10px]">{t.folio}</span>
                                <span className="text-slate-500 text-[10px]">{t.sale_datetime?.slice(0,10)}</span>
                              </div>
                              <p className="text-slate-400 text-[10px] truncate">{t.waiter_name} · Mesa {t.table_number || '—'}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-orange-400 font-black text-xs">{formatCurrency(parseFloat(t.tip))}</p>
                              <p className="text-slate-600 text-[9px]">{formatCurrency(parseFloat(t.total))} total</p>
                            </div>
                            <button onClick={() => setSelectedTicket(t)} className="text-[9px] text-cyan-400 px-1.5 py-0.5 rounded border border-cyan-500/20 hover:border-cyan-400/40 shrink-0">Ver</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {tipsData.count === 0 && (
                  <div className="bg-[#0b1120] border border-dashed border-slate-800 rounded-2xl p-10 text-center">
                    <p className="text-4xl mb-3">🤝</p>
                    <p className="text-slate-400 font-bold">Sin propinas en este período</p>
                    <p className="text-slate-600 text-xs mt-1">Ajusta el rango de fechas</p>
                  </div>
                )}
              </div>
            ) : (
              /* ── Vista por mesero ── */
              <div className="space-y-4">
                {tipsData.by_waiter?.length === 0 ? (
                  <div className="bg-[#0b1120] border border-dashed border-slate-800 rounded-2xl p-10 text-center">
                    <p className="text-4xl mb-3">🤝</p>
                    <p className="text-slate-400 font-bold">Sin propinas en este período</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tipsData.by_waiter.map((w, idx) => {
                      const COLORS = ['#f59e0b','#3b82f6','#10b981','#8b5cf6','#f97316','#06b6d4','#ec4899','#84cc16'];
                      const color = COLORS[idx % COLORS.length];
                      const pct = tipsData.total_tips > 0 ? Math.round(w.total / tipsData.total_tips * 100) : 0;
                      const paidPct = w.total > 0 ? Math.round(w.paid / w.total * 100) : 0;
                      return (
                        <motion.div key={w.waiter} whileHover={{ y: -2 }}
                          className="bg-[#0b1120] border rounded-2xl p-5 flex flex-col gap-3 cursor-pointer"
                          style={{ borderColor: `${color}30` }}
                          onClick={() => setTipsModal({ waiter: w.waiter })}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black shrink-0" style={{ backgroundColor: `${color}20`, color }}>
                                {(w.waiter || '?')[0].toUpperCase()}
                              </div>
                              <div>
                                <p className="text-white font-bold text-sm leading-tight">{w.waiter}</p>
                                <p className="text-slate-500 text-[10px]">{w.count} propinas · {pct}% del total</p>
                              </div>
                            </div>
                            <p className="font-black text-lg" style={{ color }}>{formatCurrency(w.total)}</p>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg px-2 py-1.5 text-center">
                              <p className="text-emerald-400 font-black">{formatCurrency(w.paid)}</p>
                              <p className="text-slate-600 text-[9px]">Pagado {paidPct}%</p>
                            </div>
                            <div className="bg-orange-500/5 border border-orange-500/20 rounded-lg px-2 py-1.5 text-center">
                              <p className="text-orange-400 font-black">{formatCurrency(w.pending)}</p>
                              <p className="text-slate-600 text-[9px]">Pendiente {100-paidPct}%</p>
                            </div>
                          </div>
                          <div className="text-center text-[11px] font-bold py-1.5 rounded-xl border transition-colors"
                            style={{ color, borderColor: `${color}40`, backgroundColor: `${color}10` }}>
                            Ver historial completo →
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── MODAL PROPINAS HISTÓRICAS ── */}
        {tipsModal && (
          <TipsHistoryModal
            waiter={tipsModal.waiter}
            apiUrl={apiUrl}
            formatCurrency={formatCurrency}
            onClose={() => setTipsModal(null)}
            onViewTicket={(t) => { setSelectedTicket(t); setTipsModal(null); }}
          />
        )}

        {/* ── PRODUCTOS ── */}
        {viewMode === 'products' && (
          <motion.div key="products" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
            {data.analytics?.top_by_category && (
              <div>
                <div className="mb-3"><p className="text-white font-bold flex items-center gap-2">🏆 Más vendido por categoría</p>
                  <p className="text-slate-500 text-xs mt-0.5 ml-6">El producto #1 en cada categoría del menú</p></div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { key: 'food', icon: '🍽️', label: 'Comida #1', color: 'text-orange-400', border: 'border-orange-500/20' },
                    { key: 'beverage', icon: '🥤', label: 'Bebida #1', color: 'text-blue-400', border: 'border-blue-500/20' },
                    { key: 'overall', icon: '⭐', label: 'Más vendido general', color: 'text-amber-400', border: 'border-amber-500/20' },
                  ].map(({ key, icon, label, color, border }) => {
                    const item = data.analytics.top_by_category[key];
                    if (!item) return null;
                    return (
                      <div key={key} className={`bg-[#0b1120] border ${border} p-5 rounded-2xl`}>
                        <p className={`text-xs font-black uppercase mb-1 flex items-center gap-1 ${color}`}><span>{icon}</span>{label}</p>
                        <p className="text-white font-black text-base leading-tight truncate mt-2">{item.product_name}</p>
                        <div className="flex justify-between items-end mt-3">
                          <div><p className={`font-black text-2xl ${color}`}>{item.total_qty}</p><p className="text-slate-500 text-xs">piezas vendidas</p></div>
                          <p className="text-white font-bold text-sm">{formatCurrency(item.total_sales)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <p className="text-white font-bold">📊 Top 10 Productos más vendidos</p>
                <p className="text-slate-500 text-xs mt-0.5">Ordenados por unidades vendidas · {selectedRangeLabel}</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-black/30 text-[10px] text-slate-500 font-black uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3 text-left">Pos.</th>
                      <th className="px-4 py-3 text-left">Producto</th>
                      <th className="px-4 py-3 text-right">Unidades vendidas</th>
                      <th className="px-4 py-3 text-right">En tickets</th>
                      <th className="px-4 py-3 text-right">Total generado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    {data.top_products?.slice(0, 10).map((p, i) => (
                      <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${i===0?'bg-amber-400 text-black':i===1?'bg-slate-400 text-black':i===2?'bg-amber-700 text-white':'bg-slate-800 text-slate-500'}`}>{i+1}</div>
                        </td>
                        <td className="px-4 py-3"><p className="text-white font-bold">{p.product_name}</p></td>
                        <td className="px-4 py-3 text-right"><span className="text-emerald-400 font-black text-lg">{p.total_qty}</span><span className="text-slate-600 text-xs ml-1">pzas</span></td>
                        <td className="px-4 py-3 text-right"><span className="text-cyan-400 font-bold">{p.tickets||0}</span><span className="text-slate-600 text-xs ml-1">tkt</span></td>
                        <td className="px-4 py-3 text-right"><span className="text-white font-bold">{formatCurrency(p.total_sales)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {(!data.top_products || data.top_products.length === 0) && (
                  <div className="text-center py-16"><p className="text-4xl mb-3">📦</p><p className="text-slate-500 text-sm">Sin datos de productos</p></div>
                )}
              </div>
            </div>

            {data.analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {data.analytics.top_beverages?.length > 0 && (
                  <div className="bg-[#0b1120] border border-blue-500/20 p-5 rounded-2xl">
                    <SectionHeader icon="🥤" title="Bebidas más pedidas" desc="Las 5 bebidas más populares del período" />
                    <div className="space-y-2">
                      {data.analytics.top_beverages.slice(0, 5).map((b, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-blue-500/5 border border-blue-500/10 rounded-xl">
                          <div><p className="text-white font-bold text-sm">{b.product_name}</p><p className="text-slate-500 text-xs">{b.total_qty} unidades vendidas</p></div>
                          <p className="text-blue-400 font-bold">{formatCurrency(b.total_sales)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {data.analytics.bottom_products?.length > 0 && (
                  <div className="bg-[#0b1120] border border-red-500/15 p-5 rounded-2xl">
                    <SectionHeader icon="📉" title="Productos menos vendidos" desc="Considera revisar el menú o la promoción de estos items" />
                    <div className="space-y-2">
                      {data.analytics.bottom_products.slice(0, 5).map((b, i) => (
                        <div key={i} className="flex justify-between items-center p-3 bg-red-500/5 border border-red-500/10 rounded-xl">
                          <div><p className="text-slate-300 font-bold text-sm">{b.product_name}</p><p className="text-red-400 text-xs">Solo {b.total_qty} unidad{b.total_qty!==1?'es':''} en el período</p></div>
                          <p className="text-slate-400 font-bold">{formatCurrency(b.total_sales)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* ── CAJA ── */}
        {viewMode === 'cash' && cashMovements && (() => {
          const cs = cashMovements.summary || {};
          const cashS    = cs.cash_sales        || 0;
          const cardS    = cs.card_sales        || 0;
          const voucherS = cs.voucher_sales     || 0;
          const otherS   = cs.other_sales       || 0;
          const deps     = cs.total_deposits    || 0;
          const rets     = cs.total_withdrawals || 0;
          const tips     = cs.total_tip_payments|| 0;
          const tipsProp = cs.total_tips        || 0;
          const saldo    = cs.final_balance     || 0;
          const efectFinal = cashS + deps - rets - tips;
          const subtotalNet= cs.subtotal        || 0;
          const totalDisc  = cs.total_discounts || 0;
          const ventaNeta  = subtotalNet - totalDisc;
          const totalTaxV  = cs.total_tax       || 0;
          const totalSalesV= cs.total_sales     || 0;
          const alimentos  = cs.sales_alimentos || 0;
          const bebidas    = cs.sales_bebidas   || 0;
          const otros      = cs.sales_otros     || 0;
          const prodTotal  = alimentos + bebidas + otros || 1;
          const checks     = cs.total_checks    || 0;
          const cancelled  = cs.cancelled_checks|| 0;
          const discChecks = cs.discount_checks || 0;
          const courtChecks= cs.courtesy_checks || 0;
          const avgCheck   = cs.avg_check       || 0;
          const avgCover   = cs.avg_cover       || 0;
          const covers     = cs.total_covers    || 0;
          const folioIni   = cs.folio_inicial   || '-';
          const folioFin   = cs.folio_final     || '-';
          const cortAlim   = cs.cortesia_alimentos|| 0;
          const cortBeb    = cs.cortesia_bebidas  || 0;
          const cortOtros  = 0;
          const cortTotal  = cortAlim + cortBeb + cortOtros;
          const discAlim   = cs.descuento_alimentos|| 0;
          const discBeb    = cs.descuento_bebidas  || 0;
          const period_label = selectedRangeLabel;
          const Row = ({ label, val, color='text-slate-200', sign='', bold=false, large=false, border=true }) => (
            <div className={`flex justify-between items-center py-2 ${border ? 'border-b border-slate-800/50' : ''}`}>
              <span className={`text-xs ${bold ? 'font-bold uppercase tracking-wide' : 'font-medium'} ${color}`}>{label}</span>
              <span className={`font-bold tabular-nums ${large ? 'text-xl' : 'text-sm'} ${color}`}>{sign}{formatCurrency(val)}</span>
            </div>
          );
          const Block = ({ title, icon, children, accent='border-slate-800' }) => (
            <div className={`bg-[#0b1120] border ${accent} rounded-2xl p-5`}>
              <p className="text-white font-black text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                <span>{icon}</span>{title}
              </p>
              {children}
            </div>
          );
          const cashPeriodLabels = { today: 'Hoy', yesterday: 'Ayer', week: 'Esta semana', day: 'Día específico', month: 'Mes', custom: 'Personalizado' };
          return (
            <motion.div key="cash" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

              {/* Selector de período propio para Caja */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl p-4">
                <p className="text-slate-500 text-[10px] uppercase tracking-widest font-bold mb-3">Período de caja</p>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {Object.entries(cashPeriodLabels).map(([key, lbl]) => (
                    <button key={key} onClick={() => setCashPeriod(key)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${cashPeriod === key ? 'bg-cyan-500 text-black shadow shadow-cyan-500/20' : 'text-slate-400 hover:text-white bg-black/30 border border-slate-800 hover:border-slate-600'}`}>
                      {lbl}
                    </button>
                  ))}
                </div>
                {cashPeriod === 'day' && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-xs">Fecha:</span>
                    <input type="date" value={cashDate} onChange={(e) => setCashDate(e.target.value)}
                      className="bg-[#030712] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-cyan-500/50" />
                    <span className="text-slate-500 text-xs">Turno: 8:00 AM → 7:59 AM siguiente día</span>
                  </div>
                )}
                {cashPeriod === 'month' && (
                  <div className="flex items-center gap-2">
                    <select value={cashMonth} onChange={(e) => setCashMonth(parseInt(e.target.value))}
                      className="bg-[#030712] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-cyan-500/50">
                      {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'].map((m,i) => (
                        <option key={i} value={i+1}>{m}</option>
                      ))}
                    </select>
                    <input type="number" value={cashYear} onChange={(e) => setCashYear(parseInt(e.target.value))}
                      min="2020" max="2030"
                      className="bg-[#030712] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg w-24 focus:outline-none focus:border-cyan-500/50" />
                  </div>
                )}
                {cashPeriod === 'custom' && (
                  <div className="flex items-center gap-2">
                    <input type="date" value={cashCustomStart} onChange={(e) => setCashCustomStart(e.target.value)}
                      className="bg-[#030712] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-cyan-500/50" />
                    <span className="text-slate-500 text-xs">a</span>
                    <input type="date" value={cashCustomEnd} onChange={(e) => setCashCustomEnd(e.target.value)}
                      className="bg-[#030712] border border-slate-700 text-slate-200 text-xs p-2 rounded-lg focus:outline-none focus:border-cyan-500/50" />
                  </div>
                )}
                <p className="text-slate-600 text-[10px] mt-2">
                  {cashMovements?.start?.slice(0,10)} → {cashMovements?.end?.slice(0,10)}
                </p>
              </div>

              {/* Fila 1: CAJA + FORMA DE PAGO VENTAS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Block title="Caja" icon="💰" accent="border-cyan-500/25">
                  <Row label="+ Efectivo"          val={cashS}    color="text-slate-200" />
                  <Row label="+ Tarjeta"            val={cardS}    color="text-slate-200" />
                  {voucherS > 0 && <Row label="+ Vales"  val={voucherS} color="text-slate-200" />}
                  {otherS > 0   && <Row label="+ Transferencia / Otros" val={otherS} color="text-slate-200" />}
                  <Row label={`+ Depósitos efectivo (${cs.deposit_count||0})`}    val={deps}  color="text-emerald-400" sign="+" />
                  <Row label={`- Retiros efectivo (${cs.withdrawal_count||0})`}   val={rets}  color="text-red-400"     sign="-" />
                  <Row label={`- Propinas pagadas (${cs.tip_payment_count||0})`}  val={tips}  color="text-amber-400"   sign="-" />
                  <div className="border-t border-slate-700 mt-1 pt-3 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-cyan-400 font-black text-xs uppercase tracking-wide">= Saldo Final</span>
                      <span className="text-cyan-400 font-black text-2xl tabular-nums">{formatCurrency(saldo)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 text-xs">Efectivo Final</span>
                      <span className="text-slate-200 font-bold text-sm tabular-nums">{formatCurrency(efectFinal)}</span>
                    </div>
                  </div>
                </Block>

                <div className="space-y-4">
                  <Block title="Forma de Pago — Ventas" icon="💳" accent="border-purple-500/20">
                    <Row label="Efectivo" val={cashS}    color="text-slate-200" />
                    <Row label="Tarjeta"  val={cardS}    color="text-slate-200" />
                    {voucherS > 0 && <Row label="Vales"  val={voucherS} color="text-slate-200" />}
                    {otherS > 0   && <Row label="Transferencia / Otros" val={otherS} color="text-slate-200" />}
                  </Block>
                  {tipsProp > 0 && (
                    <Block title="Forma de Pago — Propina" icon="🤝" accent="border-amber-500/20">
                      <Row label="Tarjeta" val={tipsProp} color="text-amber-400" border={false} />
                    </Block>
                  )}
                </div>
              </div>

              {/* Fila 2: VENTAS POR TIPO PRODUCTO + DESGLOSE */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Block title="Venta sin impuestos por tipo de producto" icon="🍽️" accent="border-emerald-500/20">
                  {[
                    { label: 'Alimentos', val: alimentos, pct: Math.round(alimentos/prodTotal*100) },
                    { label: 'Bebidas',   val: bebidas,   pct: Math.round(bebidas/prodTotal*100) },
                    ...(otros > 0 ? [{ label: 'Otros', val: otros, pct: Math.round(otros/prodTotal*100) }] : []),
                  ].map((p, i) => (
                    <div key={i} className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-slate-300 font-medium">{p.label}</span>
                        <span className="text-xs font-bold text-slate-200 tabular-nums">{formatCurrency(p.val)} <span className="text-slate-500">({p.pct}%)</span></span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${p.pct}%`, backgroundColor: i===0?'#10b981':i===1?'#06b6d4':'#8b5cf6' }} />
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 pt-3 mt-1 space-y-1.5">
                    <Row label="Subtotal"     val={subtotalNet} color="text-slate-400" border={false} />
                    <Row label="- Descuentos" val={totalDisc}   color="text-red-400"   sign="-" border={false} />
                    <div className="flex justify-between items-center border-t border-slate-700 pt-2 mt-1">
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wide">Venta Neta</span>
                      <span className="font-black text-slate-200 tabular-nums">{formatCurrency(ventaNeta)}</span>
                    </div>
                    <Row label="Impuestos 16%" val={totalTaxV}  color="text-slate-400" border={false} />
                    <div className="flex justify-between items-center border-t border-slate-700 pt-2 mt-1">
                      <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">Ventas con Imp.</span>
                      <span className="font-black text-emerald-400 text-lg tabular-nums">{formatCurrency(totalSalesV)}</span>
                    </div>
                  </div>
                </Block>

                <div className="space-y-4">
                  <Block title="Cuentas" icon="🧾" accent="border-slate-700/60">
                    {[
                      { label: 'Cuentas normales',       val: checks,       isNum: true },
                      { label: 'Cuentas canceladas',     val: cancelled,    isNum: true },
                      { label: 'Con descuento',          val: discChecks,   isNum: true },
                      { label: 'Con cortesía',           val: courtChecks,  isNum: true },
                      { label: 'Cuenta promedio',        val: avgCheck,     isNum: false },
                      { label: 'Consumo promedio',       val: avgCover,     isNum: false },
                      { label: 'Comensales',             val: covers,       isNum: true },
                      { label: 'Propinas',               val: tipsProp,     isNum: false },
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/40">
                        <span className="text-xs text-slate-400">{r.label}</span>
                        <span className="text-xs font-bold text-slate-200 tabular-nums">
                          {r.isNum ? r.val : formatCurrency(r.val)}
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1.5">
                      <span className="text-xs text-slate-500">Folio inicial</span>
                      <span className="text-xs font-mono text-slate-300">{folioIni}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Folio final</span>
                      <span className="text-xs font-mono text-slate-300">{folioFin}</span>
                    </div>
                  </Block>
                </div>
              </div>

              {/* Fila 3: CORTESÍAS + DECLARACIÓN DE CAJERO */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {cortTotal > 0 && (
                  <Block title="Cortesías" icon="🎁" accent="border-pink-500/20">
                    <Row label="Cortesía Alimentos" val={cortAlim}  color="text-slate-200" />
                    <Row label="Cortesía Bebidas"   val={cortBeb}   color="text-slate-200" />
                    {cortOtros > 0 && <Row label="Cortesía Otros" val={cortOtros} color="text-slate-200" />}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-700 mt-1">
                      <span className="text-pink-400 font-black text-xs uppercase">Total Cortesías</span>
                      <span className="text-pink-400 font-black tabular-nums">{formatCurrency(cortTotal)}</span>
                    </div>
                    {(discAlim > 0 || discBeb > 0) && (
                      <>
                        <div className="mt-3 pt-3 border-t border-slate-800">
                          <Row label="Descuento Alimentos" val={discAlim} color="text-slate-400" />
                          <Row label="Descuento Bebidas"   val={discBeb}  color="text-slate-400" />
                          <div className="flex justify-between items-center pt-2 border-t border-slate-700 mt-1">
                            <span className="text-slate-300 font-black text-xs uppercase">Total Descuentos</span>
                            <span className="text-slate-300 font-black tabular-nums">{formatCurrency(discAlim+discBeb)}</span>
                          </div>
                        </div>
                      </>
                    )}
                  </Block>
                )}

                <Block title="Declaración de Cajero" icon="🏦" accent="border-cyan-500/20">
                  <Row label="Efectivo" val={cashS}    color="text-slate-200" />
                  <Row label="Tarjeta"  val={cardS}    color="text-slate-200" />
                  {voucherS > 0 && <Row label="Vales"  val={voucherS} color="text-slate-200" />}
                  {otherS > 0   && <Row label="Otros"  val={otherS}   color="text-slate-200" />}
                  <div className="border-t border-slate-700 mt-2 pt-2 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-black text-slate-200 uppercase tracking-wide">Total</span>
                      <span className="font-black text-slate-200 tabular-nums">{formatCurrency(totalSalesV)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className={`text-xs font-black uppercase tracking-wide ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {saldo >= 0 ? 'Sobrante (+)' : 'Faltante (-)'}
                      </span>
                      <span className={`font-black tabular-nums text-lg ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(Math.abs(saldo - totalSalesV))}
                      </span>
                    </div>
                  </div>
                </Block>
              </div>

              {/* Movimientos individuales */}
              <div className="bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-white font-bold text-sm">📋 Movimientos de caja</p>
                    <p className="text-slate-500 text-xs mt-0.5">Entradas y salidas registradas · {period_label}</p>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-400 font-bold">{cs.deposit_count||0} dep.</span>
                    <span className="text-red-400 font-bold">{cs.withdrawal_count||0} ret.</span>
                    <span className="text-amber-400 font-bold">{cs.tip_payment_count||0} prop.</span>
                  </div>
                </div>
                <div className="max-h-[400px] overflow-y-auto divide-y divide-slate-800/40">
                  {cashMovements.movements?.map((m, i) => {
                    const isW   = m.type === 'withdrawal';
                    const isD   = m.type === 'deposit';
                    const isT   = m.type === 'tip_payment' || m.is_tip_payment;
                    const hex   = isW ? '#ef4444' : isD ? '#10b981' : isT ? '#f59e0b' : '#06b6d4';
                    const lbl   = isW ? 'Retiro' : isD ? 'Depósito' : isT ? 'Propina pagada' : 'Otro';
                    const sign  = isW || isT ? '-' : '+';
                    return (
                      <div key={i} className="p-4 hover:bg-white/[0.02] flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black shrink-0" style={{ backgroundColor: `${hex}15`, color: hex }}>
                            {isW ? '↓' : isD ? '↑' : '●'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-xs" style={{ color: hex }}>{lbl}</p>
                              {m.folio_movto && <span className="text-slate-600 text-[10px] font-mono">#{m.folio_movto}</span>}
                            </div>
                            <p className="text-slate-400 text-xs truncate">{m.concept || 'Sin concepto'}{m.reference ? ` · ${m.reference}` : ''}</p>
                            {m.user_cancel && <p className="text-slate-600 text-[10px]">Autoriza: <span className="text-slate-400">{m.user_cancel}</span></p>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-black text-base tabular-nums" style={{ color: hex }}>{sign}{formatCurrency(m.amount)}</p>
                          <p className="text-slate-500 text-[10px] font-mono">{m.datetime ? new Date(m.datetime).toLocaleString('es-MX', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' }) : '--'}</p>
                        </div>
                      </div>
                    );
                  })}
                  {(!cashMovements.movements?.length) && (
                    <div className="text-center py-12">
                      <p className="text-3xl mb-2">📥</p>
                      <p className="text-slate-500 text-sm">Sin movimientos registrados en este período</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {selectedTicket && (
        <TicketItemsModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          apiUrl={import.meta.env.VITE_API_URL}
        />
      )}
    </div>
  );
}
