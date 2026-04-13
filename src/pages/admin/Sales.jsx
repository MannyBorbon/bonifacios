import { useState, useEffect, useCallback } from 'react';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LabelList } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * BONIFACIO'S LIVE - Dashboard v1.3
 * Status: Production Ready
 * Features: Floating Labels, Mobile Rotary Dial, Multi-module View.
 */

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const RANGES = ['today', 'yesterday', 'week', 'month'];

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today');
  const [viewMode, setViewMode] = useState('overview');
  const [data, setData] = useState(null);

  // Carga de datos con protección de entorno
  const loadAllData = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://bonifaciossancarlos.com/api';
      const res = await fetch(`${apiUrl}/softrestaurant/sales.php?range=${dateRange}`);
      const result = await res.json();
      if (result.success) {
        setData(result);
      }
    } catch (err) { 
      console.error('Error Crítico de Conexión:', err); 
    } finally { 
      setLoading(false); 
    }
  }, [dateRange]);

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [loadAllData]);

  // Formateadores
  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);
  const formatShort = (v) => formatCurrency(v).split('.')[0]; // Para etiquetas de gráfica

  if (loading || !data) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-cyan-500 animate-pulse text-xs tracking-[0.5em]">
      BONIFACIO'S_OS_v1.3_BOOTING...
    </div>
  );

  // Desestructuración segura
  const stats = data.stats?.[dateRange] || { total: 0, covers: 0, checks: 0 };
  const tickets = data.tickets || [];
  const totalDiscounts = tickets.reduce((acc, s) => acc + Number(s.discount || 0), 0);
  const totalCanceled = data.cancellations?.reduce((acc, c) => acc + Number(c.amount || 0), 0) || 0;

  const viewLabels = { 
    overview: '📊 General', 
    notes: '📄 Notas', 
    waiters: '👥 Meseros', 
    attendance: '🕒 Staff', 
    audit: '⚖️ Auditoría' 
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 lg:p-10 space-y-10 font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}>
          <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-2">
            {formatCurrency(stats.total)}
          </h1>
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
            <p className="text-cyan-500 font-mono text-[10px] uppercase tracking-[0.4em] font-bold">Venta Neta Sincronizada</p>
          </div>
        </motion.div>

        {/* SELECTOR MÓVIL (DIAL CIRCULAR) - EXCLUSIVO MOBILE */}
        <div className="lg:hidden flex justify-center py-6">
          <div className="relative w-64 h-64 flex items-center justify-center">
            {RANGES.map((r, i) => {
              const angle = i * 90;
              return (
                <button
                  key={r}
                  onClick={() => setDateRange(r)}
                  className={`absolute z-20 font-black text-[10px] uppercase transition-all duration-500 ${dateRange === r ? 'text-cyan-400 scale-125' : 'text-slate-600'}`}
                  style={{ transform: `rotate(${angle}deg) translateY(-100px) rotate(-${angle}deg)` }}
                >
                  {r}
                </button>
              );
            })}
            <motion.div 
              animate={{ rotate: RANGES.indexOf(dateRange) * 90 }}
              transition={{ type: "spring", stiffness: 120, damping: 12 }}
              className="w-32 h-32 rounded-full bg-slate-900 border-8 border-slate-800/80 flex items-center justify-center shadow-[0_0_50px_rgba(6,182,212,0.15)] relative"
            >
              <div className="w-2 h-12 bg-cyan-500 rounded-full absolute top-1 shadow-[0_0_20px_#06b6d4]" />
              <div className="text-[11px] font-black text-white italic tracking-widest">DIAL</div>
            </motion.div>
          </div>
        </div>

        {/* SELECTOR MODO DE VISTA (DESKTOP) */}
        <div className="hidden lg:flex bg-slate-900/60 backdrop-blur-2xl p-2 rounded-3xl border border-slate-800 gap-2 shadow-2xl">
          {Object.entries(viewLabels).map(([key, label]) => (
            <button 
              key={key} 
              onClick={() => setViewMode(key)} 
              className={`px-6 py-3 text-[10px] font-black uppercase rounded-2xl transition-all duration-300 ${viewMode === key ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/40' : 'text-slate-500 hover:text-white hover:bg-slate-800'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI CARDS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Ticket Promedio', val: stats.total / (stats.checks || 1), isCurrency: true, color: 'text-white' },
          { label: 'Descuentos/Cortesía', val: totalDiscounts, isCurrency: true, color: 'text-amber-400' },
          { label: 'Comensales', val: stats.covers, isCurrency: false, color: 'text-cyan-400' },
          { label: 'Cancelados (Auditoría)', val: totalCanceled, isCurrency: true, color: 'text-red-500' }
        ].map((kpi, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} className="bg-slate-900/30 border border-slate-800/50 p-6 rounded-[35px] backdrop-blur-md">
            <p className="text-[9px] text-slate-500 uppercase font-black mb-2 tracking-[0.2em]">{kpi.label}</p>
            <p className={`text-3xl font-light ${kpi.color}`}>{kpi.isCurrency ? formatCurrency(kpi.val) : kpi.val}</p>
          </motion.div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* VISTA GENERAL: GRÁFICAS */}
        {viewMode === 'overview' && (
          <motion.div key="ov" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-slate-900/20 border border-slate-800/40 p-10 rounded-[50px] h-[500px] shadow-inner">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-10 tracking-[0.4em] text-center">Flujo de Facturación Horaria</h3>
              <ResponsiveContainer width="100%" height="85%">
                <AreaChart data={data.hourly || []} margin={{ top: 30, right: 30, left: 0, bottom: 0 }}>
                  <XAxis dataKey="hour" stroke="#334155" fontSize={10} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#020617', border: 'none', borderRadius: '20px' }} />
                  <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={5} fillOpacity={0.15} fill="#06b6d4">
                    <LabelList 
                      dataKey="total" position="top" offset={15}
                      content={(p) => p.value > 0 ? <text x={p.x} y={p.y} dy={-10} fill="#06b6d4" fontSize={10} fontWeight="900" textAnchor="middle">{formatShort(p.value)}</text> : null} 
                    />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-slate-900/20 border border-slate-800/40 p-10 rounded-[50px] flex flex-col items-center shadow-inner">
              <h3 className="text-[10px] font-black text-slate-500 uppercase mb-8 tracking-[0.4em]">Mezcla de Cobro</h3>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={data.payment_methods || []} innerRadius={75} outerRadius={95} dataKey="value" stroke="none" label={({name, value}) => value > 0 ? name : ''}>
                    {data.payment_methods?.map((e, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="w-full mt-10 space-y-3">
                {data.payment_methods?.map((m, i) => (
                  <div key={i} className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                    <span className="text-slate-500 flex items-center gap-3">
                      <span className="w-2 h-2 rounded-full shadow-[0_0_8px]" style={{backgroundColor: COLORS[i], boxShadow: `0 0 8px ${COLORS[i]}`}}/>{m.name}
                    </span>
                    <span className="text-white font-mono">{formatCurrency(m.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* VISTA NOTAS */}
        {viewMode === 'notes' && (
          <motion.div key="nt" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/10 border border-slate-800/50 rounded-[40px] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead className="bg-slate-900/60 text-[10px] text-slate-500 font-black uppercase border-b border-slate-800">
                <tr><th className="p-8">Folio</th><th className="p-8">Estado</th><th className="p-8">Mesa</th><th className="p-8">Mesero</th><th className="p-8 text-right">Total</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/20">
                {tickets.map((t, i) => (
                  <tr key={i} className={`hover:bg-cyan-500/[0.03] transition-colors text-sm ${t.status === 'canceled' ? 'opacity-30 grayscale' : ''}`}>
                    <td className="p-8 font-mono text-white font-bold tracking-tighter">#{t.folio}</td>
                    <td className="p-8">
                      <span className={`px-3 py-1 text-[9px] font-black uppercase rounded-xl border ${t.status === 'canceled' ? 'bg-red-500/10 text-red-500 border-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20'}`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="p-8 text-slate-400">Mesa {t.table_number || '--'}</td>
                    <td className="p-8 text-slate-500 text-[10px] font-black uppercase">{t.waiter_name}</td>
                    <td className={`p-8 text-right font-black ${t.status === 'canceled' ? 'line-through text-slate-700' : 'text-cyan-400 text-lg'}`}>{formatCurrency(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* VISTA MESEROS */}
        {viewMode === 'waiters' && (
          <motion.div key="wt" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {data.waiters?.map((w, i) => (
              <div key={i} className="p-10 bg-slate-900/30 border border-slate-800/60 rounded-[45px] text-center group hover:border-cyan-500/50 transition-all duration-500 shadow-xl">
                <div className="w-16 h-16 bg-slate-800 rounded-full mx-auto mb-6 flex items-center justify-center text-xl font-black text-cyan-500 group-hover:bg-cyan-500 group-hover:text-black transition-all">
                  {w.name.charAt(0)}
                </div>
                <h4 className="text-white font-black text-sm tracking-widest uppercase mb-2">{w.name}</h4>
                <p className="text-cyan-400 font-black text-3xl mb-6">{formatCurrency(w.total)}</p>
                <div className="pt-6 border-t border-slate-800 flex justify-between text-[10px] uppercase font-black tracking-tighter">
                  <div className="text-left"><p className="text-slate-500">Tickets</p><p className="text-white text-base">{w.checks}</p></div>
                  <div className="text-right"><p className="text-slate-500">Tips</p><p className="text-amber-400 text-base">{formatCurrency(w.tips)}</p></div>
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* VISTA STAFF (ASISTENCIA) */}
        {viewMode === 'attendance' && (
          <motion.div key="at" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-900/10 border border-slate-800/50 rounded-[40px] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-900/60 text-[10px] text-slate-500 font-black uppercase border-b border-slate-800">
                <tr><th className="p-8">Colaborador</th><th className="p-8">Check-In</th><th className="p-8 text-right">Check-Out</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800/20">
                {data.attendance?.map((a, i) => (
                  <tr key={i} className="hover:bg-slate-800/40 transition-colors text-sm">
                    <td className="p-8 text-white font-black uppercase tracking-tight">{a.name}</td>
                    <td className="p-8 text-cyan-500 font-mono font-bold text-lg">{a.clock_in || '--:--'}</td>
                    <td className="p-8 text-right text-slate-500 font-mono font-bold text-lg">{a.clock_out || 'En turno'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {/* VISTA AUDITORÍA */}
        {viewMode === 'audit' && (
          <motion.div key="ad" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 max-h-[650px] overflow-y-auto pr-4 custom-scrollbar">
            {data.cancellations?.map((c, i) => (
              <div key={i} className="bg-slate-950/60 p-8 rounded-[40px] border border-slate-800 flex justify-between items-center group hover:border-red-500/30 transition-all shadow-lg">
                <div className="flex gap-6 items-center">
                  <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 font-black">!</div>
                  <div>
                    <p className="text-lg font-black text-white font-mono">#{c.ticket_number}</p>
                    <p className="text-[11px] text-slate-500 mt-1 uppercase font-black tracking-widest">
                      Motivo: <span className="text-slate-300">"{c.reason}"</span> — <span className="text-cyan-500">{c.user_name}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-500 font-black text-2xl">{formatCurrency(c.amount)}</p>
                  <p className="text-[10px] text-slate-600 font-mono font-bold">{new Date(c.cancel_date).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {data.cancellations?.length === 0 && (
              <div className="text-center py-20 bg-slate-900/10 rounded-[40px] border border-dashed border-slate-800">
                <p className="text-slate-600 uppercase font-black tracking-[0.5em] text-xs">Sin incidencias registradas</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* SELECTOR RANGO (DESKTOP) */}
      <div className="hidden lg:flex justify-center gap-3 pt-10">
        {RANGES.map((key) => (
          <button 
            key={key} 
            onClick={() => setDateRange(key)} 
            className={`px-10 py-3 text-[11px] font-black uppercase rounded-full border-2 transition-all duration-300 ${dateRange === key ? 'bg-white text-black border-white shadow-xl shadow-white/10 scale-105' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}
          >
            {key}
          </button>
        ))}
      </div>
    </div>
  );
}
