import { useState, useEffect } from 'react';
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Sales() {
  // --- ESTADOS ---
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState([]);
  const [stats, setStats] = useState({
    today: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    yesterday: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    week: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    month: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 },
    custom: { total: 0, checks: 0, average: 0, covers: 0, tips: 0 }
  });
  
  const [dateRange, setDateRange] = useState('today');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [viewMode, setViewMode] = useState('overview');
  const [statusFilter, setStatusFilter] = useState('closed');
  
  const [openStats, setOpenStats] = useState({ total: 0, checks: 0, average: 0, covers: 0 });
  const [cancellations, setCancellations] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [hourlyData, setHourlyData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);
  const [waiterPerformance, setWaiterPerformance] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [cashMovements, setCashMovements] = useState({ summary: null, movements: [] });

  // --- CARGA DE DATOS ---
  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000); // Polling cada 30s
    return () => clearInterval(interval);
  }, [dateRange, startDate, endDate, statusFilter]);

  const loadAllData = () => {
    loadSalesData();
    loadCashMovements();
  };

  const loadCashMovements = async () => {
    try {
      let url = `${import.meta.env.VITE_API_URL}/softrestaurant/cash-movements.php?period=${dateRange}`;
      if (dateRange === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setCashMovements({ summary: data.summary, movements: data.movements || [] });
    } catch (err) { console.error('Error en movimientos de caja:', err); }
  };

  const loadSalesData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        range: dateRange,
        start: startDate,
        end: endDate,
        status: statusFilter
      });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/softrestaurant/sales.php?${params}`);
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setSalesData(data.sales || []);
        setHourlyData(data.hourly || []);
        setTopProducts(data.top_products || []);
        setWaiterPerformance(data.waiters || []);
        setPaymentMethods(data.payment_methods || []);
        setAttendance(data.attendance || []);
        if (data.open_stats) setOpenStats(data.open_stats);
        if (data.cancellations) setCancellations(data.cancellations);
      }
    } catch (err) { console.error('Error en ventas:', err); }
    finally { setLoading(false); }
  };

  // --- UTILIDADES ---
  const formatCurrency = (v) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(v);

  // --- RENDERIZADO DE COMPONENTES INTERNOS ---
  const renderCashMovements = () => (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 mt-6">
      <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2"><span>💰</span> MOVIMIENTOS DE CAJA</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Efectivo en Ventas</p>
          <p className="text-xl text-green-400">{formatCurrency(cashMovements.summary?.cash_sales || 0)}</p>
        </div>
        <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Retiros / Propinas Pagadas</p>
          <p className="text-xl text-red-400">{formatCurrency((cashMovements.summary?.total_withdrawals || 0) + (cashMovements.summary?.total_tip_payments || 0))}</p>
        </div>
        <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10">
          <p className="text-[10px] text-slate-500 uppercase font-bold">Saldo en Caja</p>
          <p className="text-xl text-cyan-400">{formatCurrency(cashMovements.summary?.final_balance || 0)}</p>
        </div>
      </div>
      <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
        {cashMovements.movements.map((m, i) => (
          <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-800/40 border border-slate-700/50 text-xs">
            <div>
              <p className="text-white font-medium">{m.description || m.concept}</p>
              <p className="text-slate-500">{new Date(m.movement_datetime || m.datetime).toLocaleTimeString()}</p>
            </div>
            <p className={m.movement_type === 'withdrawal' ? 'text-red-400' : 'text-green-400'}>
              {m.movement_type === 'withdrawal' ? '-' : '+'}{formatCurrency(m.amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-4 lg:p-8 space-y-8">
      {/* HEADER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extralight text-white">Bonifacio's <span className="text-cyan-500 font-semibold">Live</span></h1>
          <p className="text-xs text-slate-500 uppercase tracking-widest mt-1">Panel de Control Operativo</p>
        </div>

        <div className="flex flex-wrap items-center bg-slate-900/80 p-1.5 rounded-2xl border border-slate-800 gap-1">
          {[
            { id: 'overview', label: '📊 General' },
            { id: 'waiters', label: '👥 Meseros' },
            { id: 'attendance', label: '🕒 Asistencia' },
            { id: 'products', label: '🍽️ Menú' },
            { id: 'audit', label: '🗑️ Auditoría' }
          ].map((mode) => (
            <button key={mode.id} onClick={() => setViewMode(mode.id)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-xl transition-all ${viewMode === mode.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}>
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* SELECTOR DE FECHAS */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['today', 'yesterday', 'week', 'month', 'custom'].map((range) => (
          <button key={range} onClick={() => setDateRange(range)} className={`px-4 py-2 text-[10px] font-bold uppercase rounded-full border transition-all whitespace-nowrap ${dateRange === range ? 'bg-white text-black border-white' : 'border-slate-800 text-slate-500 hover:border-slate-600'}`}>
            {range === 'today' ? 'Hoy' : range === 'yesterday' ? 'Ayer' : range === 'week' ? 'Semana' : range === 'month' ? 'Mes' : 'Calendario'}
          </button>
        ))}
      </div>

      {/* MÉTRICAS RÁPIDAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Ventas Totales', val: stats[dateRange]?.total, color: 'text-white' },
          { label: 'Propinas', val: stats[dateRange]?.tips, color: 'text-amber-400' },
          { label: 'Comensales', val: stats[dateRange]?.covers, color: 'text-cyan-400', noCurr: true },
          { label: 'Ticket Promedio', val: stats[dateRange]?.average, color: 'text-white' }
        ].map((s, i) => (
          <div key={i} className="bg-slate-900/40 border border-slate-800 p-5 rounded-3xl">
            <p className="text-[10px] text-slate-500 uppercase font-black mb-1">{s.label}</p>
            <p className={`text-2xl font-light ${s.color}`}>{s.noCurr ? s.val : formatCurrency(s.val || 0)}</p>
          </div>
        ))}
      </div>

      {/* VISTAS DINÁMICAS */}
      {viewMode === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Ventas por Hora</h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={hourlyData}>
                  <defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="hour" stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  <Area type="monotone" dataKey="total" stroke="#06b6d4" strokeWidth={3} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-slate-900/40 border border-slate-800 p-6 rounded-3xl">
              <h3 className="text-xs font-black text-slate-500 uppercase mb-6 tracking-widest">Métodos de Pago</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={paymentMethods} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                    {paymentMethods.map((entry, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          {renderCashMovements()}
        </div>
      )}

      {viewMode === 'waiters' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {waiterPerformance.map((waiter, i) => (
            <div key={i} className={`relative p-6 rounded-3xl border ${i === 0 ? 'border-cyan-500/40 bg-cyan-500/5' : 'border-slate-800 bg-slate-900/40'}`}>
              {i === 0 && <div className="absolute top-4 right-4 text-xl">🏆</div>}
              <div className="flex flex-col items-center text-center">
                <img src={waiter.photo || `https://ui-avatars.com/api/?name=${waiter.name}&background=0f172a&color=fff&size=128`} className="w-20 h-20 rounded-full border-4 border-slate-800 object-cover mb-4" alt={waiter.name} />
                <h4 className="text-white font-medium text-sm">{waiter.name}</h4>
                <div className="w-full mt-6 grid grid-cols-2 gap-2 border-t border-slate-800 pt-4">
                  <div><p className="text-[9px] text-slate-500 uppercase">Venta</p><p className="text-sm font-bold text-white">{formatCurrency(waiter.total)}</p></div>
                  <div><p className="text-[9px] text-slate-500 uppercase">Tips</p><p className="text-sm font-bold text-amber-400">{formatCurrency(waiter.tips)}</p></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {viewMode === 'attendance' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Colaborador</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Entrada</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Salida</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-center">Días</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {attendance.map((person, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-5 flex items-center gap-3">
                    <img src={person.photo || `https://ui-avatars.com/api/?name=${person.name}&background=random`} className="w-8 h-8 rounded-full" />
                    <div><p className="text-sm text-white">{person.name}</p><p className="text-[9px] text-cyan-500 uppercase font-bold">{person.role}</p></div>
                  </td>
                  <td className="p-5 text-xs text-slate-400">{person.first_clock_in ? new Date(person.first_clock_in).toLocaleString() : '--'}</td>
                  <td className="p-5 text-xs text-slate-400">{person.last_clock_out ? new Date(person.last_clock_out).toLocaleString() : 'En Turno'}</td>
                  <td className="p-5 text-center"><span className="bg-cyan-500/10 text-cyan-400 px-3 py-1 rounded-full text-xs font-mono">{person.days_worked}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {viewMode === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-slate-900/40 border border-red-500/20 p-6 rounded-3xl">
            <h3 className="text-red-400 text-xs font-black uppercase mb-4 tracking-widest">Tickets Cancelados</h3>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {cancellations.map((c, i) => (
                <div key={i} className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div><p className="text-sm font-bold text-white">#{c.ticket_number}</p><p className="text-[10px] text-slate-500 italic">"{c.reason}"</p></div>
                  <div className="text-right"><p className="text-sm text-red-400 font-bold">{formatCurrency(c.amount)}</p><p className="text-[9px] text-slate-600 uppercase font-bold">{c.user_name}</p></div>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-slate-900/40 border border-amber-500/20 p-6 rounded-3xl">
            <h3 className="text-amber-400 text-xs font-black uppercase mb-4 tracking-widest">Resumen de Cortesías</h3>
            <div className="bg-amber-400/5 p-6 rounded-2xl border border-amber-400/10 mb-6">
              <p className="text-[10px] text-amber-500 uppercase font-black">Total Descontado</p>
              <p className="text-3xl font-light text-white">{formatCurrency(salesData.filter(s => Number(s.discount) > 0).reduce((acc, s) => acc + Number(s.discount), 0))}</p>
            </div>
          </div>
        </div>
      )}

      {viewMode === 'products' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50">
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase">Producto</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-right">Cantidad</th>
                <th className="p-5 text-[10px] font-black text-slate-500 uppercase text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {topProducts.map((p, i) => (
                <tr key={i} className="hover:bg-slate-800/20 transition-colors">
                  <td className="p-5 text-sm text-white">{p.name}</td>
                  <td className="p-5 text-sm text-right text-slate-400">{p.quantity}</td>
                  <td className="p-5 text-sm text-right text-cyan-400 font-bold">{formatCurrency(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}