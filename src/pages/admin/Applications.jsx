import { useEffect, useRef, useState } from 'react';
import { applicationsAPI } from '../../services/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import LocationMap from '../../components/LocationMap';
import { parseIpCoords, geocodeAddress } from '../../utils/geo';

function Applications() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filter, setFilter] = useState('all');
  const [chartData, setChartData] = useState([]);
  const [modalMarkers, setModalMarkers] = useState([]);
  const [mapLoading, setMapLoading] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [editing, setEditing] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [editData, setEditData] = useState({});
  const [generalMapMarkers, setGeneralMapMarkers] = useState([]);
  const [generalMapLoading, setGeneralMapLoading] = useState(false);
  const [sectorStats, setSectorStats] = useState([]);
  const [viewingFullImage, setViewingFullImage] = useState(false);
  const [notesDraft, setNotesDraft] = useState({});
  const [notesSaving, setNotesSaving] = useState({});
  const noteTimers = useRef({});
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'administrador';
  const normalizeAvatarUrl = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    if (/^\/\//.test(value)) return `https:${value}`;
    if (value.startsWith('/')) {
      try {
        if (typeof window !== 'undefined' && window.location?.origin) {
          return new URL(value, window.location.origin).href;
        }
      } catch {
        return value;
      }
    }
    return value;
  };

  useEffect(() => {
    loadApplications();
    loadChartData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Load employees for the map
  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/get.php`, { credentials: 'include' });
        const result = await res.json();
        if (result.success) {
          const emps = result.data || [];
          console.log('[Apps] Loaded employees for map:', emps.length, 'with addresses:', emps.filter(e => e.address).length);
          setEmployees(emps);
        } else {
          console.warn('[Apps] Employee load failed:', result);
        }
      } catch (err) { console.error('[Apps] Employee load error:', err); }
    };
    loadEmployees();
  }, []);

  // Build modal markers: applicant (blue=address, red=IP) + all hired employees (green)
  useEffect(() => {
    if (!selectedApp) { setModalMarkers([]); setMapLoading(false); return; }
    let cancelled = false;
    setMapLoading(true);
    const build = async () => {
      const m = [];
      const appAvatar = normalizeAvatarUrl(selectedApp.photo_url || '');
      // Applicant IP location (red)
      const ipCoords = parseIpCoords(selectedApp.ip_location);
      if (ipCoords) m.push({ lat: ipCoords[0], lng: ipCoords[1], color: 'red', avatar: appAvatar, label: `${selectedApp.name} (IP)`, popup: `<b style="color:#ef4444">Ubicación IP</b><br/><b>${selectedApp.name}</b><br/><small>${selectedApp.ip_location?.split(' - ')[0] || ''}</small>` });
      // Applicant stated address (blue)
      if (selectedApp.address) {
        const coords = await geocodeAddress(selectedApp.address);
        if (coords && !cancelled) m.push({ lat: coords[0], lng: coords[1], color: 'blue', avatar: appAvatar, label: `${selectedApp.name} (Dirección)`, popup: `<b style="color:#3b82f6">Dirección declarada</b><br/><b>${selectedApp.name}</b><br/><small>${selectedApp.address}</small>` });
      }
      // All hired employees (green)
      console.log('[Apps] Building map with', employees.length, 'employees');
      for (const emp of employees) {
        if (cancelled) return;
        if (emp.address) {
          const coords = await geocodeAddress(emp.address);
          if (coords) m.push({ lat: coords[0], lng: coords[1], color: 'green', avatar: normalizeAvatarUrl(emp.photo || ''), label: emp.name, popup: `<b style="color:#22c55e">Empleado</b><br/><b>${emp.name}</b><br/>${emp.position || ''}<br/><small>${emp.address}</small>` });
        }
      }
      if (!cancelled) {
        console.log('[Apps] Map markers built:', m.length, '(blue/red=applicant, green=employees)');
        setModalMarkers(m);
        setMapLoading(false);
      }
    };
    build();
    return () => { cancelled = true; };
  }, [selectedApp, employees]);

  // Build general map markers + sector stats from ALL applications (not filtered)
  // Includes employees to compare postulantes vs colaboradores activos
  useEffect(() => {
    if (applications.length === 0) return;
    let cancelled = false;
    setGeneralMapLoading(true);
    const build = async () => {
      const m = [];
      const sectors = {};
      for (const app of applications) {
        if (cancelled) return;
        let sector = 'Desconocido';
        const appAvatar = normalizeAvatarUrl(app.photo_url || '');
        // Applicant IP location (red)
        const ipCoords = parseIpCoords(app.ip_location);
        if (ipCoords) {
          m.push({
            lat: ipCoords[0],
            lng: ipCoords[1],
            color: 'red',
            avatar: appAvatar,
            label: `${app.name} (IP)`,
            popup: `<b style="color:#ef4444">IP del solicitante</b><br/><b>${app.name}</b><br/><small>${app.ip_location || ''}</small>`
          });
          const ipCity = app.ip_location?.split(',')[0]?.trim();
          if (ipCity) sector = ipCity;
        }
        // Applicant declared address (blue)
        if (app.address) {
          const addrCoords = await geocodeAddress(app.address);
          if (addrCoords && !cancelled) {
            m.push({
              lat: addrCoords[0],
              lng: addrCoords[1],
              color: 'blue',
              avatar: appAvatar,
              label: `${app.name} (Dirección)`,
              popup: `<b style="color:#3b82f6">Dirección del solicitante</b><br/><b>${app.name}</b><br/><small>${app.address || ''}</small>`
            });
            // Extract sector from address
            const addrParts = app.address.split(',').map(p => p.trim());
            // Find a colonia/neighborhood or city name
            if (addrParts.length >= 2) {
              sector = addrParts[addrParts.length - 2] || addrParts[addrParts.length - 1] || sector;
              // Clean up sector name
              sector = sector.replace(/\d{5}/g, '').replace(/C\.?\s*P\.?/gi, '').replace(/Son\.?$/i, '').trim();
              if (sector.length < 3 && addrParts.length >= 3) sector = addrParts[addrParts.length - 3]?.trim() || sector;
            }
          }
        }
        if ((ipCoords || app.address) && !cancelled) {
          sectors[sector] = (sectors[sector] || 0) + 1;
        }
      }

      // Add employee markers (teal) to compare with applicants
      for (const emp of employees) {
        if (cancelled) return;
        if (!emp?.address) continue;
        const empCoords = await geocodeAddress(emp.address);
        if (empCoords && !cancelled) {
          m.push({
            lat: empCoords[0],
            lng: empCoords[1],
            color: 'green',
            avatar: normalizeAvatarUrl(emp.photo || ''),
            label: emp.name,
            popup: `<b style="color:#22c55e">Empleado</b><br/><b>${emp.name || ''}</b><br/><small>${emp.position || ''}</small><br/><small style="opacity:0.6">${emp.address || ''}</small>`
          });
        }
      }

      if (!cancelled) {
        setGeneralMapMarkers(m);
        // Sort sectors by count descending
        const sorted = Object.entries(sectors).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
        setSectorStats(sorted);
        setGeneralMapLoading(false);
      }
    };
    build();
    return () => { cancelled = true; };
  }, [applications, employees]);

  const loadApplications = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await applicationsAPI.list(params);
      const list = response.data.applications || [];
      setApplications(list);
      setNotesDraft(prev => {
        const next = { ...prev };
        list.forEach((app) => {
          if (next[app.id] === undefined) next[app.id] = app.notes || '';
        });
        return next;
      });
    } catch (error) {
      console.error('Error loading applications:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApplicationNotes = async (id) => {
    try {
      setNotesSaving(prev => ({ ...prev, [id]: true }));
      const noteValue = notesDraft[id] ?? '';
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/update-field.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, field: 'notes', value: noteValue })
      });
      const result = await res.json();
      if (!res.ok || !result.success) throw new Error(result.error || 'Error al guardar notas');
      setApplications(prev => prev.map(app => (app.id === id ? { ...app, notes: noteValue } : app)));
      if (selectedApp?.id === id) setSelectedApp(prev => ({ ...prev, notes: noteValue }));
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('No se pudo guardar la nota');
    } finally {
      setNotesSaving(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleAutoSaveNote = (id, value) => {
    setNotesDraft(prev => ({ ...prev, [id]: value }));
    if (noteTimers.current[id]) clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = setTimeout(() => {
      saveApplicationNotes(id);
    }, 800);
  };

  useEffect(() => {
    return () => {
      Object.values(noteTimers.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const loadChartData = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/tracking/analytics-summary.php`);
      const result = await response.json();
      if (result.chartData) {
        setChartData(result.chartData);
      }
    } catch (error) {
      console.error('Error loading chart data:', error);
    }
  };

  const handleDownloadPDF = async (id) => {
    try {
      const response = await applicationsAPI.downloadPDF(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `solicitud-${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
  };

  const handleUpdateStatus = async (id, status, notes = '') => {
    try {
      await applicationsAPI.updateStatus(id, status, notes);
      loadApplications();
      setSelectedApp(null);
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado de la solicitud');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-orange-400 bg-orange-500/20',
      reviewing: 'text-blue-400 bg-blue-500/20',
      accepted: 'text-green-400 bg-green-500/20',
      rejected: 'text-red-400 bg-red-500/20'
    };
    return colors[status] || colors.pending;
  };

  const handleAdminPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedApp) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      fd.append('application_id', selectedApp.id);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/applications/upload-photo.php`, {
        method: 'POST',
        body: fd
      });
      const result = await res.json();
      if (result.success) {
        const photoUrl = result.photo_url;
        setSelectedApp(prev => ({ ...prev, photo_url: photoUrl }));
        setApplications(prev => prev.map(a => a.id === selectedApp.id ? { ...a, photo_url: photoUrl } : a));
      } else {
        alert(result.error || 'Error al subir la foto');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      alert('Error al subir la foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveFields = async () => {
    if (!selectedApp || !editData) return;
    try {
      for (const [field, value] of Object.entries(editData)) {
        await fetch(`${import.meta.env.VITE_API_URL}/applications/update-field.php`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: selectedApp.id, field, value })
        });
      }
      setEditing(false);
      setEditData({});
      loadApplications();
      setSelectedApp(prev => ({ ...prev, ...editData }));
      alert('Datos actualizados');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar');
    }
  };

  const getStatusText = (status) => {
    const texts = {
      pending: 'Pendiente',
      reviewing: 'En Revisión',
      accepted: 'Aceptado',
      rejected: 'Rechazado'
    };
    return texts[status] || status;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><div className="h-8 w-8 animate-spin rounded-full border border-cyan-500/20 border-t-cyan-400" /></div>;
  }

  return (
    <div className="space-y-5 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-3xl font-light text-white tracking-wide leading-tight">Solicitudes de Empleo</h1>
        <p className="mt-1 text-sm text-slate-500">Gestiona las solicitudes recibidas</p>
      </div>

      {/* Applications Chart */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 sm:p-6 shadow-lg shadow-cyan-500/5">
        <h2 className="mb-4 text-base font-light text-slate-300 uppercase tracking-widest text-[10px] text-cyan-500/50">SOLICITUDES — ÚLTIMOS 7 DÍAS</h2>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(34,211,238,0.05)" />
            <XAxis dataKey="date" stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <YAxis stroke="#334155" tick={{ fill: '#475569', fontSize: 10 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ backgroundColor: '#040c1a', border: '1px solid rgba(34,211,238,0.2)', borderRadius: '8px', color: '#cbd5e1' }} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#64748b' }} />
            <Line type="monotone" dataKey="value" stroke="#22d3ee" strokeWidth={1.5} dot={false} name="Solicitudes" />
          </LineChart>
        </ResponsiveContainer>
      </div>


      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'reviewing', 'accepted', 'rejected'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-light transition-all ${
              filter === status
                ? 'border border-cyan-400/50 bg-cyan-500/15 text-cyan-400'
                : 'border border-cyan-500/15 bg-[#040c1a]/60 text-slate-500 hover:border-cyan-500/25 hover:text-slate-300'
            }`}
          >
            {status === 'all' ? 'Todas' : getStatusText(status)}
          </button>
        ))}
      </div>

      <div className="grid gap-4">
        {applications.map((app) => (
          <div
            key={app.id}
            className="rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-3 sm:p-6 transition-all hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/8"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0">
              <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4 flex-1 min-w-0">
                {/* Photo thumbnail */}
                {app.photo_url ? (
                  <img
                    src={app.photo_url}
                    alt={app.name}
                    className="h-14 w-14 rounded-full object-cover border-2 border-cyan-500/30 flex-shrink-0 cursor-pointer"
                    onClick={() => setSelectedApp(app)}
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full border border-slate-700/40 bg-[#030b18]/60 flex items-center justify-center flex-shrink-0 text-slate-600 text-xs">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <h3 className="text-lg sm:text-xl font-light text-slate-200 leading-tight break-words">{app.name}</h3>
                  <span className={`rounded-full px-3 py-1 text-xs ${getStatusColor(app.status)}`}>
                    {getStatusText(app.status)}
                  </span>
                </div>
                <div className="mt-3 grid gap-1.5 sm:gap-2 text-xs sm:text-sm text-slate-400">
                  <p><span className="text-cyan-500/70">Puesto:</span> {app.position}</p>
                  <p><span className="text-cyan-500/70">Experiencia:</span> {app.experience} años</p>
                  <p><span className="text-cyan-500/70">Teléfono:</span> 
                    <a href={`tel:${app.phone}`} className="ml-2 text-cyan-400 hover:underline">
                      {app.phone}
                    </a>
                  </p>
                  {(app.email || app.no_email) && (
                    <p><span className="text-cyan-500/70">Email:</span> {app.email || 'No tiene correo'}</p>
                  )}
                  <p><span className="text-cyan-500/70">Fecha:</span> {new Date(app.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', day: '2-digit', month: 'short', year: 'numeric' })}</p>
                </div>
                {isAdmin && (
                  <div className="mt-3 rounded-lg border border-cyan-500/15 bg-[#030b18]/40 p-2.5">
                    <label className="block text-[10px] uppercase tracking-wider text-cyan-500/60 mb-1">Notas internas</label>
                    <textarea
                      value={notesDraft[app.id] ?? app.notes ?? ''}
                      onChange={(e) => handleAutoSaveNote(app.id, e.target.value)}
                      rows={2}
                      className="w-full rounded border border-cyan-500/20 bg-[#030b18]/60 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400/50 focus:outline-none resize-y"
                      placeholder="Escribe una nota para esta solicitud..."
                    />
                    <div className="mt-1.5 text-[10px] text-right text-slate-500">
                      {notesSaving[app.id] ? 'Guardando...' : 'Guardado automatico'}
                    </div>
                  </div>
                )}
              </div>
              </div>
              <div className="flex gap-2 self-end sm:self-start">
                <button
                  onClick={() => handleDownloadPDF(app.id)}
                  className="rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 p-2 text-cyan-400/60 transition-all hover:text-cyan-400 hover:border-cyan-400/40"
                  title="Descargar PDF"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setSelectedApp(app)}
                  className="rounded-lg border border-cyan-500/20 bg-[#040c1a]/60 p-2 text-cyan-400/60 transition-all hover:text-cyan-400 hover:border-cyan-400/40"
                  title="Ver detalles"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* General Applications Map + Sector Stats */}
      <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 sm:p-6 shadow-lg shadow-cyan-500/5">
        <h2 className="mb-1 text-base font-light text-white">Mapa General de Solicitudes</h2>
        <p className="mb-4 text-xs text-slate-500">Ubicaciones de solicitantes por dirección e IP, junto con empleados activos</p>
        <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-slate-500">
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Dirección del solicitante</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> IP del solicitante</span>
          <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> Empleados contratados</span>
        </div>
        {generalMapLoading ? (
          <div className="h-[400px] rounded-xl border border-cyan-500/15 bg-[#030b18]/60 flex items-center justify-center">
            <p className="text-xs text-slate-500">Geocodificando solicitantes y empleados...</p>
          </div>
        ) : generalMapMarkers.length > 0 ? (
          <LocationMap markers={generalMapMarkers} height={400} zoom={11} />
        ) : (
          <div className="h-[400px] rounded-xl border border-cyan-500/15 bg-[#030b18]/60 flex items-center justify-center">
            <p className="text-xs text-slate-500">Sin datos de ubicación disponibles</p>
          </div>
        )}
        <div className="mt-3 text-[10px] text-slate-600">
          {generalMapMarkers.length} marcadores totales ({applications.length} solicitudes + empleados)
        </div>

        {/* Sector Statistics */}
        {sectorStats.length > 0 && (
          <div className="mt-5 border-t border-cyan-500/10 pt-4">
            <h3 className="text-sm font-medium text-cyan-500/60 mb-3">Sectores con más solicitudes</h3>
            <div className="space-y-2">
              {sectorStats.slice(0, 10).map((s, i) => {
                const maxCount = sectorStats[0].count;
                const pct = Math.round((s.count / maxCount) * 100);
                return (
                  <div key={s.name} className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600 w-4 text-right">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-slate-400 truncate">{s.name}</span>
                        <span className="text-[10px] text-cyan-400 ml-2 flex-shrink-0">{s.count} solicitud{s.count !== 1 ? 'es' : ''}</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-slate-800/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500/50 to-cyan-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#030712]/90 backdrop-blur-sm p-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-[#040c1a]/95 to-[#060f20]/90 p-8">
            {/* Applicant photo in modal */}
            <div className="flex flex-col items-center mb-6 gap-2">
              {selectedApp.photo_url ? (
                <img
                  src={selectedApp.photo_url}
                  alt={selectedApp.name}
                  onClick={() => setViewingFullImage(true)}
                  className="h-32 w-32 rounded-full object-cover border-2 border-cyan-500/30 shadow-lg shadow-cyan-500/10 cursor-pointer hover:border-cyan-400/50 transition-all"
                  title="Click para ver en tamaño completo"
                />
              ) : (
                <div className="h-32 w-32 rounded-full border-2 border-dashed border-cyan-500/20 bg-[#030b18]/60 flex items-center justify-center">
                  <svg className="h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                </div>
              )}
              <label className={`cursor-pointer rounded-lg border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all ${uploadingPhoto ? 'opacity-50 pointer-events-none' : ''}`}>
                {uploadingPhoto ? 'Subiendo...' : selectedApp.photo_url ? 'Cambiar foto' : 'Subir foto'}
                <input type="file" accept="image/*" className="hidden" onChange={handleAdminPhotoUpload} disabled={uploadingPhoto} />
              </label>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-2xl font-light text-white">Detalles de Solicitud</h2>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-500 hover:text-slate-200 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-3 text-sm">
              {[
                { label: 'Nombre', field: 'name', value: selectedApp.name },
                { label: 'Estudios', field: 'estudios', value: selectedApp.no_studies ? 'No tiene estudios' : (selectedApp.estudios || selectedApp.studies) },
                { label: 'Email', field: 'email', value: selectedApp.email || (selectedApp.no_email ? 'No tiene correo' : '-') },
                { label: 'Teléfono', field: 'phone', value: selectedApp.phone },
                { label: 'Edad', field: 'age', value: selectedApp.age },
                { label: 'Género', field: 'gender', value: selectedApp.gender },
                { label: 'Trabajo Actual', field: 'current_job', value: selectedApp.no_current_job ? 'No tiene trabajo actual' : selectedApp.current_job },
                { label: 'Puesto', field: 'position', value: selectedApp.position },
                { label: 'Experiencia', field: 'experience', value: selectedApp.experience },
                { label: 'Dirección', field: 'address', value: selectedApp.address },
              ].map(({ label, field, value }) => (
                <div key={field}>
                  <label className="text-[10px] text-cyan-500/60 block mb-0.5">{label}</label>
                  {editing ? (
                    <input
                      type="text"
                      value={editData[field] !== undefined ? editData[field] : (value || '')}
                      onChange={(e) => setEditData(prev => ({ ...prev, [field]: e.target.value }))}
                      className="w-full rounded border border-cyan-500/20 bg-[#030b18]/60 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400/50 focus:outline-none"
                    />
                  ) : (
                    <div className="text-slate-300 text-xs px-1">{value || '-'}</div>
                  )}
                </div>
              ))}
              <div className="rounded-lg border border-cyan-500/15 bg-[#030b18]/50 p-3 mt-1">
                <label className="text-[10px] text-cyan-500/60 block mb-1 uppercase tracking-wider">Notas internas</label>
                <textarea
                  value={notesDraft[selectedApp.id] ?? selectedApp.notes ?? ''}
                  onChange={(e) => handleAutoSaveNote(selectedApp.id, e.target.value)}
                  rows={3}
                  className="w-full rounded border border-cyan-500/20 bg-[#030b18]/60 px-2.5 py-1.5 text-xs text-slate-200 focus:border-cyan-400/50 focus:outline-none resize-y"
                  placeholder="Agregar notas para seguimiento de esta solicitud..."
                  disabled={!isAdmin}
                />
                {isAdmin && (
                  <div className="mt-1.5 text-[10px] text-right text-slate-500">
                    {notesSaving[selectedApp.id] ? 'Guardando...' : 'Guardado automatico'}
                  </div>
                )}
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-2">
                  {editing ? (
                    <>
                      <button onClick={handleSaveFields} className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">Guardar</button>
                      <button onClick={() => { setEditing(false); setEditData({}); }} className="rounded-lg border border-slate-700/40 bg-[#040c1a]/60 px-4 py-2 text-xs text-slate-500 hover:text-slate-300 transition-all">Cancelar</button>
                    </>
                  ) : (
                    <button onClick={() => setEditing(true)} className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-400 hover:bg-cyan-500/20 transition-all">Editar datos</button>
                  )}
                </div>
              )}
              {selectedApp.ip_location && (
                <div className="rounded-lg border border-cyan-500/15 bg-[#030b18]/60 p-3 mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="h-4 w-4 text-cyan-400/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="text-cyan-400 text-xs font-medium">Ubicación por IP:</span>
                  </div>
                  <p className="text-slate-300 text-xs">{selectedApp.ip_location}</p>
                  {selectedApp.ip_address && <p className="text-slate-600 text-[10px] mt-1">IP: {selectedApp.ip_address}</p>}
                </div>
              )}
              <div className="mt-4">
                <h3 className="text-sm font-medium text-cyan-500/60 mb-2">Mapa</h3>
                <div className="flex flex-wrap gap-3 mb-2 text-[10px] text-slate-500">
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Dirección del solicitante</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-500 inline-block" /> IP del solicitante</span>
                  <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-green-500 inline-block" /> Empleados contratados</span>
                </div>
                {mapLoading ? (
                  <div className="h-[280px] rounded-xl border border-cyan-500/15 bg-[#030b18]/60 flex items-center justify-center">
                    <p className="text-xs text-slate-500">Cargando mapa...</p>
                  </div>
                ) : modalMarkers.length > 0 ? (
                  <LocationMap markers={modalMarkers} height={280} zoom={11} />
                ) : (
                  <div className="h-[280px] rounded-xl border border-cyan-500/15 bg-[#030b18]/60 flex items-center justify-center">
                    <p className="text-xs text-slate-500">Sin datos de ubicación disponibles</p>
                  </div>
                )}
              </div>
            </div>

            {isAdmin && (
              <div className="mt-6 flex gap-2">
                {['pending', 'reviewing', 'accepted', 'rejected'].map((status) => (
                  <button
                    key={status}
                    onClick={() => handleUpdateStatus(selectedApp.id, status, '')}
                    className={`flex-1 rounded-lg px-4 py-2 text-sm transition-all ${getStatusColor(status)} hover:opacity-80`}
                  >
                    {getStatusText(status)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de imagen completa */}
      {viewingFullImage && selectedApp?.photo_url && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-sm p-4"
          onClick={() => setViewingFullImage(false)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setViewingFullImage(false)}
              className="absolute -top-12 right-0 text-white/80 hover:text-white transition-colors"
              title="Cerrar (ESC)"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={selectedApp.photo_url}
              alt={selectedApp.name}
              className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-center text-white/60 text-sm mt-4">{selectedApp.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Applications;
