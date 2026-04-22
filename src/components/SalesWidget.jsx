import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

export default function SalesWidget() {
  const [stats, setStats] = useState({
    today: { total: 0, checks: 0, average: 0, covers: 0 },
    yesterday: { total: 0, checks: 0, average: 0, covers: 0 }
  });
  const [hourlyData, setHourlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
      setLastUpdate(new Date());
    }, 30000); // Actualizar cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/softrestaurant/sales.php?range=today`, {
        credentials: 'include'
      });
      const data = await res.json();
      
      if (data.success) {
        const todayStats = data.stats.today;
        const openAmount = data.open_stats?.total || 0;
        setStats({
          today: { ...todayStats, total: (todayStats.total || 0) + openAmount, openAmount },
          yesterday: data.stats.yesterday
        });
        setHourlyData(data.hourly || []);
      }
    } catch (err) {
      console.error('Error loading sales widget:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const calculateChange = () => {
    if (stats.yesterday.total === 0) return 0;
    return ((stats.today.total - stats.yesterday.total) / stats.yesterday.total) * 100;
  };

  const change = calculateChange();

  if (loading) {
    return (
      <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-6">
        <div className="flex items-center justify-center h-40">
          <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-6 hover:border-cyan-500/30 transition-all">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <h3 className="text-sm font-medium text-white">Ventas en Tiempo Real</h3>
            <p className="text-[10px] text-slate-500">Actualizado hace {Math.floor((new Date() - lastUpdate) / 1000)}s</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
          <span className="text-[10px] text-green-400">En vivo</span>
        </div>
      </div>

      {/* Total del día */}
      <div className="mb-4">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-light text-white">{formatCurrency(stats.today.total)}</span>
          {stats.today.openAmount > 0 && (
            <span className="text-[10px] text-orange-400 font-bold">{formatCurrency(stats.today.openAmount)} en curso</span>
          )}
          <span className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {change >= 0 ? '↑' : '↓'} {Math.abs(change).toFixed(1)}%
          </span>
        </div>
        <p className="text-xs text-slate-500 mt-1">vs ayer {formatCurrency(stats.yesterday.total)}</p>
      </div>

      {/* Mini gráfica */}
      <div className="mb-4 h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={hourlyData.filter(h => h.total > 0)}>
            <Line 
              type="monotone" 
              dataKey="total" 
              stroke="#06b6d4" 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-slate-500">Cheques</p>
          <p className="text-lg font-medium text-white">{stats.today.checks}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Promedio</p>
          <p className="text-lg font-medium text-white">{formatCurrency(stats.today.average)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500">Comensales</p>
          <p className="text-lg font-medium text-white">{stats.today.covers}</p>
        </div>
      </div>

      {/* Link a página completa */}
      <Link
        to="/admin/sales"
        className="block w-full text-center px-4 py-2 rounded-lg border border-cyan-500/20 bg-cyan-500/10 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all"
      >
        Ver análisis completo →
      </Link>
    </div>
  );
}
