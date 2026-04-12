import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Sales() {
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]); // Aquí están todos los folios
  const [stats, setStats] = useState({
    today: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    yesterday: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    week: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    month: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 }
  });
  
  const [dateRange, setDateRange] = useState('today');
  const [viewMode, setViewMode] = useState('overview');
  const [cancellations, setCancellations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [waiterPerformance, setWaiterPerformance] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashMovements, setCashMovements] = useState({ summary: null, movements: [] });

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Cargar Ventas y Folios
      const resSales = await fetch(`${import.meta.env.VITE_API_URL}/softrestaurant/sales.php?range=${dateRange}`);
      const data = await resSales.json();
      if (data.success) {
        setStats(data.stats);
        setSalesData(data.tickets || data.sales || []); // Detalle por folio
        setHourlyData(data.hourly || []);
        setTopProducts(data.top_products || []);
        setWaiterPerformance(data.waiters || []);
        setPaymentMethods(data.payment_methods || []);
        setAttendance(data.attendance || []);
        setCancellations(data.cancellations || []);
      }

      // 2. Cargar Movimientos de Caja
      const resCash = await fetch(`${import.meta.env.VITE_API_URL}/softrestaurant/cash-movements.php?period=${dateRange}`);
      const dataCash = await resCash.json();
      if (dataCash.success) setCashMovements({ summary: dataCash.summary, movements: dataCash.movements || [] });

    } catch (err) { console.error('Error:', err); }
    finally { setLoading(false); }
  };

  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v || 0);

  // --- LÓGICA DE AUDITORÍA ---
  const cortesias = salesData.filter(s => Number(s.discount) > 0);
  const totalCortesias = cortesias.reduce((acc, s) => acc + Number(s.discount), 0);
  const totalCancelado = cancellations.reduce((acc, c) => acc + Number(c.amount), 0);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 lg:p-8 space-y-8">
      {/* HEADER CON NAVEGACIÓN EXTENDIDA */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extralight text-white">Bonifacio's <span className="text-cyan-500 font-semibold">Live</span></h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Auditoría y Ventas en Tiempo Real</p>
        </div>

        <div className="flex flex-wrap items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-1 shadow-2xl">
          {[
            { id: 'overview', label: '📊 General' },
            { id: 'notes', label: '📄 Notas' },
            { id: 'waiters', label: '👥 Meseros' },
            { id: 'attendance', label: '🕒 Asistencia' },
            { id: 'audit', label: '⚖️ Auditoría' }
          ].map((mode) => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} 
              className={`px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === mode.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* SELECTOR DE FECHAS */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {['today', 'yesterday', 'week', 'month'].map((range) => (
          <button key={range} onClick={() => setDateRange(range)} 
            className={`px-4 py-2 text-[10px] font-bold uppercase rounded-full border transition-all ${dateRange === range ? 'bg-white text-black border-white' : 'border-slate-800 text-slate-500'}`}>
            {range === 'today' ? 'Hoy' : range === 'yesterday' ? 'Ayer' : range === 'week' ? 'Semana' : 'Mes'}
          </button>
        ))}
      </div>

      {/* MÉTRICAS PRINCIPALES (LIMPIAS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl">
          <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Venta Neta</p>
          <p className="text-2xl font-light text-white">{formatCurrency(stats[dateRange]?.total)}</p>
          <p className="text-[9px] text-green-500/70 mt-1 uppercase">Excluye Cancelados</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl">
          <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Descuentos</p>
          <p className="text-2xl font-light text-amber-500">{formatCurrency(totalCortesias)}</p>
        </div>
        <div className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl">
          <p className="text-[10px] text-slate-500 uppercase font-black mb-1">Comensales</p>
          <p className="text-2xl font-light text-cyan-400">{stats[dateRange]?.covers}</p>
        </div>
        <div className="bg-slate-900/40 border border-red-500/20 p-5 rounded-3xl">
          <p className="text-[10px] text-red-500/50 uppercase font-black mb-1">Cancelaciones</p>
          <p className="text-2xl font-light text-red-400">{formatCurrency(totalCancelado)}</p>
        </div>
      </div>

      {/* VISTA: NOTAS (DESGLOSE POR FOLIO) */}
      {viewMode === 'notes' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="text-sm font-bold text-white uppercase tracking-tighter">Listado de Notas y Folios</h3>
            <span className="text-[10px] text-slate-500">{salesData.length} Tickets encontrados</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-800/50 text-[10px] text-slate-500 uppercase font-black">
                  <th className="p-5">Folio</th>
                  <th className="p-5">Hora</th>
                  <th className="p-5">Mesa</th>
                  <th className="p-5">Mesero</th>
                  <th className="p-5">Estado</th>
                  <th className="p-5 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {salesData.map((t, i) => (
                  <tr key={i} className={`hover:bg-slate-800/20 transition-colors ${t.folio.includes('TEST') ? 'bg-blue-500/5' : ''}`}>
                    <td className="p-5 text-sm font-mono text-cyan-500">#{t.folio}</td>
                    <td className="p-5 text-xs text-slate-400">{new Date(t.sale_datetime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="p-5 text-sm text-white">Mesa {t.table_number}</td>
                    <td className="p-5 text-sm text-slate-300">{t.waiter_name || 'Sin nombre'}</td>
                    <td className="p-5">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase ${t.status === 'closed' ? 'bg-green-500/10 text-green-500' : 'bg-amber-500/10 text-amber-500'}`}>
                        {t.status === 'closed' ? 'Pagado' : 'Abierto'}
                      </span>
                    </td>
                    <td className="p-5 text-right font-bold text-white">{formatCurrency(t.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VISTA: AUDITORÍA (CONTROL DE RIESGOS) */}
      {viewMode === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Tickets Eliminados */}
          <div className="bg-slate-900/40 border border-red-500/20 p-6 rounded-3xl">
            <h3 className="text-red-400 text-xs font-black uppercase mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              Tickets Eliminados en SR
            </h3>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {cancellations.length > 0 ? cancellations.map((c, i) => (
                <div key={i} className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex justify-between items-start">
                  <div>
                    <p className="text-sm font-bold text-white">Ticket #{c.ticket_number}</p>
                    <p className="text-[10px] text-slate-500 mt-1 italic">"{c.reason}"</p>
                    <p className="text-[9px] text-slate-600 mt-2 uppercase font-black">Autorizó: {c.user_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-red-400 font-bold">{formatCurrency(c.amount)}</p>
                    <p className="text-[9px] text-slate-500">{new Date(c.cancel_date).toLocaleTimeString()}</p>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-slate-600 italic text-sm">No hay cancelaciones registradas</div>
              )}
            </div>
          </div>

          {/* Cortesías y Descuentos */}
          <div className="bg-slate-900/40 border border-amber-500/20 p-6 rounded-3xl">
            <h3 className="text-amber-400 text-xs font-black uppercase mb-6">Cortesías y Descuentos Aplicados</h3>
            <div className="space-y-3">
              {cortesias.map((s, i) => (
                <div key={i} className="flex justify-between items-center p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <div>
                    <p className="text-sm font-bold text-white">Folio #{s.folio}</p>
                    <p className="text-[10px] text-slate-500">Mesa {s.table_number} • {s.waiter_name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-amber-500 font-bold">-{formatCurrency(s.discount)}</p>
                    <p className="text-[9px] text-slate-500">Nota de {formatCurrency(Number(s.total) + Number(s.discount))}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* RENDERIZADO DE OTRAS VISTAS (GENERAL, MESEROS, ETC - Se mantiene igual) */}
      {viewMode === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
           {/* ... Aquí va tu gráfica de Recharts que ya tienes ... */}
           <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Flujo de Ventas</h3>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={hourlyData}>
                  <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={3} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
           </div>
           {/* Movimientos de caja integrados */}
           <div className="mt-8">{/* Tu componente renderCashMovements aquí */}</div>
        </div>
      )}
    </div>
  );
}