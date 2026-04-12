import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../services/api';

function AdminLogin() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authAPI.login(formData);
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030712] bg-gradient-to-br from-[#030712] via-[#060d1f] to-[#030b18] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI0MCIgaGVpZ2h0PSI0MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSA0MCAwIEwgMCAwIDAgNDAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgzNCwyMTEsMjM4LDAuMDQpIiBzdHJva2Utd2lkdGg9IjEiLz48L3BhdHRlcm4+PC9kZWZzPjxyZWN0IHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiIGZpbGw9InVybCgjZ3JpZCkiLz48L3N2Zz4=')] opacity-100" />
      
      <div className="relative w-full max-w-md">
        <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/90 via-[#060d1f]/80 to-[#040c1a]/90 p-8 backdrop-blur-xl shadow-2xl shadow-cyan-500/10">
          <div className="mb-8 text-center">
            <img src="/logo-premium.svg" alt="Bonifacio's" className="mx-auto h-16 w-auto mb-4" />
            <h1 className="text-2xl font-light text-slate-200 tracking-wide">Panel Administrativo</h1>
            <p className="mt-2 text-sm text-slate-500 tracking-wider">Bonifacio's Restaurant</p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="mb-2 block text-xs uppercase tracking-widest text-cyan-500/60">
                Usuario
              </label>
              <input
                type="text"
                id="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-4 py-3 text-slate-200 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-xs uppercase tracking-widest text-cyan-500/60">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-4 py-3 text-slate-200 backdrop-blur-sm transition-all focus:border-cyan-400/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 px-6 py-3 text-sm font-light tracking-widest text-cyan-300 uppercase transition-all hover:scale-[1.02] hover:border-cyan-400/60 hover:bg-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
