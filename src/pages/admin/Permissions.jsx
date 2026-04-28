import { useState, useEffect } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const MODULES = [
  {
    id: 'employees',
    label: 'Empleados',
    desc: 'Expedientes, horarios y datos de personal',
    viewKey: 'can_view_employees',
    editKey: 'can_edit_employees',
  },
  {
    id: 'applications',
    label: 'Solicitudes',
    desc: 'Bolsa de trabajo y estatus de candidatos',
    viewKey: 'can_view_applications',
    editKey: 'can_edit_applications',
  },
  {
    id: 'quotes',
    label: 'Cotizaciones',
    desc: 'Gestión de propuestas y seguimiento comercial',
    viewKey: 'can_view_quotes',
    editKey: 'can_edit_quotes',
  },
  {
    id: 'sales',
    label: 'Ventas',
    desc: 'Métricas de caja, tickets y reportes',
    viewKey: 'can_view_sales',
    editKey: 'can_edit_sales',
  },
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
      const res  = await fetch(`${API_BASE}/users/permissions.php`, { credentials: 'include' });
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
      await fetch(`${API_BASE}/users/permissions.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, permission, value: !current }),
      });
      setUsers(prev =>
        prev.map((u) => {
          if (u.username !== username) return u;
          const nextPerms = { ...u.perms, [permission]: !current };

          // Si activa editar, activa ver del mismo módulo
          if (permission.startsWith('can_edit_') && !current) {
            const viewKey = `can_view_${permission.replace('can_edit_', '')}`;
            nextPerms[viewKey] = true;
          }
          // Si desactiva ver, desactiva editar del mismo módulo
          if (permission.startsWith('can_view_') && current) {
            const editKey = `can_edit_${permission.replace('can_view_', '')}`;
            nextPerms[editKey] = false;
          }
          return { ...u, perms: nextPerms };
        })
      );
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
      <div className="relative overflow-hidden rounded-2xl border border-amber-400/35 bg-gradient-to-br from-[#151006] to-[#0a162b] px-6 py-5 shadow-lg shadow-amber-500/10">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400/16 via-cyan-500/6 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        <p className="text-[10px] uppercase tracking-[0.35em] text-amber-300/85 mb-1">Administración</p>
        <h1 className="text-xl font-light text-white">Control de Permisos</h1>
        <p className="text-xs text-slate-300 mt-0.5">Configura por módulo qué pueden ver y qué pueden editar (Ver y Editar separados)</p>
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
            <div key={u.username} className="relative overflow-hidden rounded-2xl border border-slate-600/55 bg-gradient-to-br from-[#071528] to-[#091a30] shadow-xl shadow-cyan-500/10">
              {/* User header */}
              <div className="px-6 py-4 border-b border-slate-600/45 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-500/25 border border-cyan-400/50 flex items-center justify-center">
                  <span className="text-lg font-bold text-cyan-300">{(u.full_name || u.username).charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{u.full_name || u.username}</p>
                  <p className="text-[10px] text-slate-300 uppercase tracking-widest">@{u.username}</p>
                </div>
                <div className="ml-auto">
                  <span className="text-[9px] text-slate-300 uppercase tracking-widest">
                    {MODULES.filter((m) => u.perms?.[m.viewKey]).length}/{MODULES.length} modulos visibles
                  </span>
                </div>
              </div>

              {/* Permissions list */}
              <div className="divide-y divide-slate-700/45">
                {MODULES.map(({ id, label, desc, viewKey, editKey }) => {
                  const canView = u.perms?.[viewKey] ?? true;
                  const canEdit = u.perms?.[editKey] ?? false;
                  const saveViewKey = `${u.username}_${viewKey}`;
                  const saveEditKey = `${u.username}_${editKey}`;
                  const anySaving = saving[saveViewKey] || saving[saveEditKey];
                  return (
                    <div key={id} className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-white/[0.045] transition-colors">
                      <div className="min-w-0">
                        <p className={`text-xs font-medium transition-colors ${canView ? 'text-white' : 'text-slate-300'}`}>{label}</p>
                        <p className="text-[9px] text-slate-400 truncate">{desc}</p>
                      </div>
                      <div className="ml-4 flex shrink-0 items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-300">Ver</span>
                          <Toggle
                            value={canView}
                            saving={saving[saveViewKey]}
                            onChange={() => togglePerm(u.username, viewKey, canView)}
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] uppercase tracking-wider text-slate-300">Editar</span>
                          <Toggle
                            value={canEdit}
                            saving={saving[saveEditKey]}
                            onChange={() => togglePerm(u.username, editKey, canEdit)}
                          />
                        </div>
                        <span className={`text-[9px] font-bold uppercase tracking-wider ${canView ? (canEdit ? 'text-amber-300' : 'text-cyan-300') : 'text-slate-300'}`}>
                          {anySaving ? '...' : canView ? (canEdit ? 'VER+EDITAR' : 'SOLO VER') : 'SIN ACCESO'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick actions */}
              <div className="px-6 py-3 border-t border-slate-600/45 flex gap-2">
                <button
                  onClick={() => {
                    MODULES.forEach(({ viewKey }) => {
                      if (!u.perms?.[viewKey]) togglePerm(u.username, viewKey, false);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-cyan-500/20 text-cyan-300 hover:bg-cyan-500/10 transition-all"
                >
                  Activar Ver
                </button>
                <button
                  onClick={() => {
                    MODULES.forEach(({ editKey }) => {
                      if (u.perms?.[editKey]) togglePerm(u.username, editKey, true);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-amber-500/20 text-amber-300 hover:bg-amber-500/10 transition-all"
                >
                  Solo Ver
                </button>
                <button
                  onClick={() => {
                    MODULES.forEach(({ viewKey, editKey }) => {
                      if (!u.perms?.[viewKey]) togglePerm(u.username, viewKey, false);
                      if (!u.perms?.[editKey]) togglePerm(u.username, editKey, false);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-green-500/20 text-green-400 hover:bg-green-500/10 transition-all"
                >
                  Ver+Editar
                </button>
                <button
                  onClick={() => {
                    MODULES.forEach(({ viewKey }) => {
                      if (u.perms?.[viewKey]) togglePerm(u.username, viewKey, true);
                    });
                  }}
                  className="flex-1 py-2 rounded-lg text-[10px] font-bold border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all"
                >
                  Bloquear
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
