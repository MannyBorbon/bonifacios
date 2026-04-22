import { useState, useEffect } from 'react';

const PERMISSION_LABELS = [
  { key: 'can_edit_employees',      label: 'Editar Empleados',      desc: 'Modificar expedientes, horarios y datos de personal', icon: '👤' },
  { key: 'can_delete_employees',    label: 'Eliminar Empleados',    desc: 'Dar de baja o eliminar registros de empleados',       icon: '🗑️' },
  { key: 'can_edit_quotes',         label: 'Editar Cotizaciones',   desc: 'Modificar y actualizar cotizaciones de eventos',       icon: '📋' },
  { key: 'can_delete_quotes',       label: 'Eliminar Cotizaciones', desc: 'Borrar cotizaciones del sistema',                     icon: '🗑️' },
  { key: 'can_edit_applications',   label: 'Editar Solicitudes',    desc: 'Modificar estatus y datos de solicitudes de empleo',  icon: '📝' },
  { key: 'can_delete_applications', label: 'Eliminar Solicitudes',  desc: 'Borrar solicitudes de empleo',                       icon: '🗑️' },
  { key: 'can_view_sales',          label: 'Ver Ventas',            desc: 'Acceder al módulo de ventas y reportes de caja',      icon: '💰' },
  { key: 'can_edit_sales',          label: 'Editar Ventas',         desc: 'Modificar datos en el módulo de ventas',              icon: '✏️' },
];

function Toggle({ value, onChange, saving }) {
  return (
    <button
      onClick={onChange}
      disabled={saving}
      className={`relative h-7 w-13 min-w-[52px] rounded-full transition-all duration-300 flex-shrink-0
        ${value ? 'bg-green-500 shadow-lg shadow-green-500/30' : 'bg-slate-700'}
        ${saving ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:opacity-90'}`}
      style={{ width: 52 }}
    >
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-md transition-all duration-300
        ${value ? 'left-[28px]' : 'left-1'}`}
      />
    </button>
  );
}

export default function Permissions() {
  const [users, setUsers]     = useState([]);
  const [saving, setSaving]   = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isManuelOrMisael = ['manuel', 'misael'].includes(user.username?.toLowerCase());

  useEffect(() => { loadPerms(); }, []);

  const loadPerms = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${import.meta.env.VITE_API_URL}/users/permissions.php`, { credentials: 'include' });
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
      else setError(data.error || 'Error al cargar permisos');
    } catch {
      setError('No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const togglePerm = async (username, permission, current) => {
    const key = `${username}_${permission}`;
    setSaving(p => ({ ...p, [key]: true }));
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/users/permissions.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, permission, value: !current }),
      });
      setUsers(prev => prev.map(u =>
        u.username === username
          ? { ...u, perms: { ...u.perms, [permission]: !current } }
          : u
      ));
    } catch (e) { console.error(e); }
    setSaving(p => ({ ...p, [key]: false }));
  };

  if (!isManuelOrMisael) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-4xl mb-4">🔒</p>
          <p className="text-white text-lg font-light">Acceso restringido</p>
          <p className="text-slate-500 text-sm mt-1">Solo Manuel y Misael pueden acceder a esta sección</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-1">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#0d0a00] to-[#060f20] px-6 py-5">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/3 via-transparent to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-amber-500/50 mb-1">Administración</p>
        <h1 className="text-xl font-light text-white">Control de Permisos</h1>
        <p className="text-xs text-slate-500 mt-0.5">Activa o desactiva funciones para Francisco y Santiago — ellos no saben qué permisos tienen activos</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="h-6 w-6 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-6 text-center">
          <p className="text-red-400 text-sm">{error}</p>
          <p className="text-slate-500 text-xs mt-1">Verifica que la columna de permisos exista en la base de datos</p>
          <button onClick={loadPerms} className="mt-3 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg text-xs border border-red-500/20 hover:bg-red-500/20">Reintentar</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {users.map(u => (
            <div key={u.username} className="relative overflow-hidden rounded-2xl border border-slate-700/40 bg-gradient-to-br from-[#040c1a] to-[#060f20] shadow-xl">
              {/* User header */}
              <div className="px-6 py-4 border-b border-slate-800/60 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                  <span className="text-lg font-bold text-cyan-400">{(u.full_name || u.username).charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{u.full_name || u.username}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">@{u.username}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[9px] text-slate-600 uppercase tracking-widest">
                    {Object.values(u.perms).filter(Boolean).length}/{PERMISSION_LABELS.length} activos
                  </span>
                </div>
              </div>

              {/* Permissions list */}
              <div className="divide-y divide-slate-800/40">
                {PERMISSION_LABELS.map(({ key, label, desc, icon }) => {
                  const val     = u.perms[key] ?? false;
                  const saveKey = `${u.username}_${key}`;
                  return (
                    <div key={key} className="flex items-center justify-between px-6 py-3.5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-base flex-shrink-0">{icon}</span>
                        <div className="min-w-0">
                          <p className={`text-xs font-medium transition-colors ${val ? 'text-white' : 'text-slate-500'}`}>{label}</p>
                          <p className="text-[9px] text-slate-600 truncate">{desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${val ? 'text-green-400' : 'text-slate-600'}`}>
                          {val ? 'ON' : 'OFF'}
                        </span>
                        <Toggle
                          value={val}
                          saving={saving[saveKey]}
                          onChange={() => togglePerm(u.username, key, val)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="px-6 py-3 border-t border-slate-800/60 flex gap-2">
                <button
                  onClick={() => {
                    PERMISSION_LABELS.forEach(({ key }) => {
                      if (!u.perms[key]) togglePerm(u.username, key, false);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-all"
                >
                  Activar todo
                </button>
                <button
                  onClick={() => {
                    PERMISSION_LABELS.forEach(({ key }) => {
                      if (u.perms[key]) togglePerm(u.username, key, true);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Desactivar todo
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SQL reminder */}
      <div className="rounded-xl border border-slate-800 bg-black/20 p-4">
        <p className="text-[9px] text-slate-600 uppercase tracking-widest mb-2">SQL requerido en phpMyAdmin (una sola vez)</p>
        <pre className="text-[10px] text-slate-500 font-mono overflow-x-auto whitespace-pre-wrap">{`ALTER TABLE users
  ADD COLUMN can_edit_employees TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_delete_employees TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_edit_quotes TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_delete_quotes TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_edit_applications TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_delete_applications TINYINT(1) NOT NULL DEFAULT 0,
  ADD COLUMN can_view_sales TINYINT(1) NOT NULL DEFAULT 1,
  ADD COLUMN can_edit_sales TINYINT(1) NOT NULL DEFAULT 0;`}</pre>
      </div>
    </div>
  );
}
