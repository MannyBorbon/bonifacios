import { useCallback, useEffect, useState, useRef } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// Función para formatear códigos de mesa al nuevo formato amigable
const formatTableCode = (tableCode) => {
  if (!tableCode) return 'Por asignar';
  
  // Convertir códigos antiguos al nuevo formato
  if (tableCode.startsWith('CD-')) {
    return `Interior Mesa ${tableCode.replace('CD-', '')}`;
  } else if (tableCode.startsWith('TA-')) {
    return `Terraza Alta Mesa ${tableCode.replace('TA-', '')}`;
  } else if (tableCode.startsWith('TB-')) {
    return `Terraza Baja Mesa ${tableCode.replace('TB-', '')}`;
  } else if (tableCode.startsWith('MD-')) {
    return `Interior Mesa ${tableCode.replace('MD-', '').split('-')[0] || '1'}`;
  } else if (tableCode.startsWith('RM-')) {
    return `Interior Mesa ${tableCode.replace('RM-', '').split('-')[0] || '1'}`;
  }
  
  // Si ya tiene el nuevo formato, devolverlo tal cual
  return tableCode;
};


const statusStyles = {
  pending: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
  uploaded: 'border-blue-500/35 bg-blue-500/15 text-blue-300',
  confirmed: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
  cancelled: 'border-rose-500/35 bg-rose-500/15 text-rose-300',
  completed: 'border-cyan-500/35 bg-cyan-500/15 text-cyan-300',
};

function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [eventFilter, setEventFilter] = useState(''); // all, mothers_day, normal
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventTypes, setEventTypes] = useState([]);
  const [eventTypeName, setEventTypeName] = useState('');
  const [homeEventSaving, setHomeEventSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [assigningTable, setAssigningTable] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [occupiedTables, setOccupiedTables] = useState([]);
  const [occupiedStats, setOccupiedStats] = useState({ total: 0, active: 0, cancelled: 0, completed: 0 });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newReservation, setNewReservation] = useState({
    customer_name: '',
    phone: '',
    email: '',
    guests: 2,
    reservation_date: '',
    reservation_time: '',
    table_code: '',
    notes: '',
    occasion: '',
    event_type_id: ''
  });
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImage, setModalImage] = useState('');
  const [resNoteSaving, setResNoteSaving] = useState({});
  const noteTimers = useRef({});

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      if (dateFilter) qs.set('date', dateFilter);
      if (eventFilter) qs.set('event', eventFilter);
      if (eventTypeFilter) qs.set('event_type_id', eventTypeFilter);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/list.php?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setReservations(Array.isArray(data.reservations) ? data.reservations : []);
        setStats(data.stats || null);
        if (!selected && data.reservations?.length) setSelected(data.reservations[0]);
      }
    } catch {
      setReservations([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter, eventFilter, eventTypeFilter, selected]);

  const loadEventTypes = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/event-types.php`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) setEventTypes(Array.isArray(data.events) ? data.events : []);
    } catch {
      setEventTypes([]);
    }
  }, []);

  const loadOccupiedTables = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const qs = new URLSearchParams();
      if (dateFilter) qs.set('date', dateFilter);
      if (eventTypeFilter) qs.set('event_type_id', eventTypeFilter);
      if (eventFilter) qs.set('event', eventFilter);
      const res = await fetch(`${API_BASE}/reservations/occupied-tables.php?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setOccupiedTables(Array.isArray(data.occupied) ? data.occupied : []);
        setOccupiedStats({
          total: data.total || 0,
          active: data.active || 0,
          cancelled: data.cancelled || 0,
          completed: data.completed || 0
        });
        // Guardar info de debug para acceso global
        window.occupiedTablesDebug = data.debug;
        console.log('Backend Debug Info:', data.debug);
      }
    } catch {
      setOccupiedTables([]);
    }
  }, [dateFilter, eventTypeFilter, eventFilter]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    loadOccupiedTables();
  }, [loadOccupiedTables]);

  useEffect(() => {
    loadEventTypes();
  }, [loadEventTypes]);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/update-status.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (data.success) loadReservations();
    } catch {
      // silent
    }
  };

  const assignTable = async (id, tableNumber, prefix) => {
    try {
      // Validar disponibilidad
      const reservation = reservations.find(r => r.id === id);
      const tableCode = `${prefix}-${tableNumber}`;
      
      // Verificar si la mesa está ocupada en la misma hora
      const isOccupied = occupiedTables.some(occupied => 
        occupied.table_code === tableCode && 
        occupied.reservation_date === reservation?.reservation_date &&
        occupied.reservation_time === reservation?.reservation_time &&
        occupied.id !== id
      );
      
      if (isOccupied) {
        alert(`La mesa ${tableCode} ya está ocupada a esa hora. Por favor selecciona otra mesa.`);
        return;
      }
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/assign-table.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, table_code: tableCode }),
      });
      const data = await res.json();
      if (data.success) {
        loadReservations();
        loadOccupiedTables(); // Recargar mesas ocupadas
        setAssigningTable(false);
        setNewTableNumber('');
      } else {
        alert(data.error || 'No se pudo asignar la mesa');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const createReservation = async () => {
    try {
      // Validaciones básicas
      if (!newReservation.customer_name || !newReservation.phone || !newReservation.guests || !newReservation.reservation_date || !newReservation.reservation_time) {
        alert('Por favor completa todos los campos requeridos.');
        return;
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/create-manual.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(newReservation),
      });
      
      const data = await res.json();
      if (data.success) {
        loadReservations();
        loadOccupiedTables();
        setShowCreateModal(false);
        setNewReservation({
          customer_name: '',
          phone: '',
          email: '',
          guests: 2,
          reservation_date: '',
          reservation_time: '',
          table_code: '',
          notes: '',
          occasion: '',
          event_type_id: ''
        });
        alert('Reservación creada correctamente.');
      } else {
        alert(data.error || 'No se pudo crear la reservación.');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const createEventType = async () => {
    if (!eventTypeName.trim()) return;
    try {
      const token = localStorage.getItem('token');
      const slug = eventTypeName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      const res = await fetch(`${API_BASE}/reservations/event-types.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: eventTypeName, slug }),
      });
      const data = await res.json();
      if (data.success) {
        setEventTypeName('');
        loadEventTypes();
      }
    } catch {
      // silent
    }
  };

  const setHomepageEvent = async (eventId) => {
    try {
      setHomeEventSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/event-types.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'set_home_cta', id: eventId }),
      });
      const data = await res.json();
      if (data.success) {
        await loadEventTypes();
      }
    } catch {
      // silent
    } finally {
      setHomeEventSaving(false);
    }
  };

  const handleNoteChange = (id, content) => {
    // Separar el comprobante si existe
    const currentReservation = reservations.find(r => r.id === id);
    const currentNotes = currentReservation?.notes || '';
    
    // Buscar la línea de comprobante y separar correctamente
    const comprobanteIndex = currentNotes.indexOf('\nComprobante:');
    let comprobantePart = '';
    let userNotes = content;
    
    if (comprobanteIndex !== -1) {
      comprobantePart = currentNotes.substring(comprobanteIndex);
      // Asegurarse que haya un salto de línea antes del comprobante
      if (!userNotes.endsWith('\n') && !comprobantePart.startsWith('\n')) {
        userNotes += '\n';
      }
    }
    
    const finalContent = userNotes + comprobantePart;
    
    // Actualizar localmente inmediatamente
    setReservations(prev => prev.map(r => 
      r.id === id ? { ...r, notes: finalContent } : r
    ));
    setSelected(prev => prev && prev.id === id ? { ...prev, notes: finalContent } : prev);
    
    // Cancelar timer anterior
    clearTimeout(noteTimers.current[id]);
    
    // Setear nuevo timer para auto-guardado
    noteTimers.current[id] = setTimeout(async () => {
      setResNoteSaving(p => ({ ...p, [id]: true }));
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/reservations/update-notes.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ id, notes: finalContent }),
        });
        
        const data = await res.json();
        if (!data.success) {
          console.error('Error al guardar notas:', data.error);
        }
      } catch (error) {
        console.error('Error de conexión al guardar notas:', error);
      } finally {
        setResNoteSaving(p => ({ ...p, [id]: false }));
      }
    }, 800); // 800ms debounce como en employees
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-light text-white">
              {eventFilter === 'mothers_day' ? 'Reservaciones Día de las Madres' : 
               eventFilter === 'normal' ? 'Reservaciones Diarias' : 
               'Todas las Reservaciones'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              {eventFilter === 'mothers_day' ? 'Gestión de reservaciones especiales para el 10 de Mayo 2026.' :
               eventFilter === 'normal' ? 'Reservaciones regulares día a día.' :
               'Panel completo de gestión de reservaciones.'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 transition-colors whitespace-nowrap"
          >
            + Nueva
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total" value={stats.total} tone="cyan" />
          <StatCard label="Pendientes" value={stats.pending} tone="amber" />
          <StatCard label="Confirmadas" value={stats.confirmed} tone="emerald" />
          <StatCard label="Canceladas" value={stats.cancelled} tone="rose" />
        </div>
      )}

      {!!eventTypes.length && (
        <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70 mb-2">Totales por categoria</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {eventTypes.map((evt) => {
              const totalByType = reservations.filter((r) => String(r.event_type_id || '') === String(evt.id)).length;
              return (
                <div key={evt.id} className="rounded-xl border border-slate-700/40 bg-slate-900/40 px-3 py-2">
                  <p className="text-[11px] text-slate-200 truncate">{evt.name}</p>
                  <p className="text-sm text-cyan-300 font-semibold">{totalByType}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <section className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4">
          <div className="mb-3 grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-500/40 focus:bg-slate-800/70"
            >
              <option value="">Todas</option>
              <option value="mothers_day">Día de las Madres</option>
              <option value="normal">Diarias</option>
            </select>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-500/40 focus:bg-slate-800/70"
            >
              <option value="">Categoria evento</option>
              {eventTypes.map((evt) => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-200"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="uploaded">Comprobante</option>
              <option value="confirmed">Confirmada</option>
              <option value="cancelled">Cancelada</option>
              <option value="completed">Completada</option>
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 sm:px-3 py-2 text-xs sm:text-sm text-slate-200"
            />
            <button onClick={loadReservations} className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-cyan-300 whitespace-nowrap">
              Actualizar
            </button>
            <button onClick={loadOccupiedTables} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 sm:px-3 py-2 text-xs sm:text-sm text-emerald-300 whitespace-nowrap">
              Mesas
            </button>
          </div>

          <div className="max-h-[520px] overflow-auto pr-1">
            {loading && <p className="text-sm text-slate-500">Cargando reservaciones...</p>}
            {!loading && reservations.length === 0 && <p className="text-sm text-slate-500">Sin reservaciones para filtros actuales.</p>}
            
            {/* Agrupar por nombre */}
            {Object.entries(
              reservations.reduce((groups, item) => {
                const name = item.customer_name;
                if (!groups[name]) groups[name] = [];
                groups[name].push(item);
                return groups;
              }, {})
            )
              .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
              .map(([name, items], groupIndex) => {
                const uniqueId = `accordion-${name.replace(/[^a-zA-Z0-9]/g, '')}-${groupIndex}`;
                return (
                <div key={uniqueId} className="mb-3">
                  {/* Header del acordeón - Nombre del cliente */}
                  <button
                    type="button"
                    onClick={() => {
                      // Toggle expand/collapse para este cliente
                      const element = document.getElementById(uniqueId);
                      element.classList.toggle('hidden');
                    }}
                    className="w-full rounded-xl border border-slate-700/60 bg-[#030b18]/70 p-3 text-left transition-all hover:border-cyan-500/30"
                  >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-white text-sm sm:text-base truncate max-w-[150px] sm:max-w-none">{name}</p>
                        <span className="text-xs text-slate-400 bg-slate-700/40 px-2 py-1 rounded-full whitespace-nowrap">
                          {items.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">
                          {items[0].reservation_date}
                        </span>
                        <svg className="w-4 h-4 text-slate-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </button>

                  {/* Contenido del acordeón - Reservaciones individuales */}
                  <div id={uniqueId} className="hidden mt-2 space-y-2">
                    {items
                      .sort((a, b) => {
                        // Ordenar por fecha y hora
                        const dateA = new Date(`${a.reservation_date} ${a.reservation_time || '00:00'}`);
                        const dateB = new Date(`${b.reservation_date} ${b.reservation_time || '00:00'}`);
                        return dateA - dateB;
                      })
                      .map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setSelected(item)}
                          className={`w-full rounded-lg border p-3 text-left transition-all ml-4 ${
                            selected?.id === item.id ? 'border-cyan-400/60 bg-cyan-500/12' : 'border-slate-600/40 bg-[#040810]/60 hover:border-cyan-400/30'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <p className="text-sm text-white">{String(item.reservation_time || '').slice(0, 5)}</p>
                                <p className="text-xs text-slate-400">{item.guests} pers</p>
                                {item.table_code && (
                                  <span className="text-xs text-cyan-400/60 bg-cyan-500/10 px-2 py-0.5 rounded truncate max-w-[100px]">
                                    {formatTableCode(item.table_code)}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500">{item.phone}</p>
                              {item.occasion && (
                                <p className="text-xs text-amber-400/60 mt-1"> {item.occasion}</p>
                              )}
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${statusStyles[item.status] || statusStyles.pending}`}>
                                {item.status === 'pending' ? 'Pendiente' : 
                                 item.status === 'uploaded' ? 'Comprobante' :
                                 item.status === 'confirmed' ? 'Confirmada' : 
                                 item.status === 'cancelled' ? 'Cancelada' : 
                                 item.status === 'completed' ? 'Completada' : item.status}
                              </span>
                              {item.notes && item.notes.includes('Comprobante:') && (
                                <span className="text-xs text-blue-400">📎</span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
                );
              })}
          </div>
        </section>

        {/* Panel de detalles */}
        <section className="lg:col-span-1">
          <div className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-5">
            {selected ? (
              <>
                <h2 className="text-base text-white">Detalle de Reservacion #{selected.id}</h2>
                <div className="mt-3 space-y-1 text-sm text-slate-300">
                  <p><span className="text-slate-500">Nombre:</span> {selected.customer_name}</p>
                  <p><span className="text-slate-500">Telefono:</span> {selected.phone}</p>
                  <p><span className="text-slate-500">Correo:</span> {selected.email || 'No proporcionado'}</p>
                  <p><span className="text-slate-500">Fecha:</span> {selected.reservation_date}</p>
                  <p><span className="text-slate-500">Hora:</span> {String(selected.reservation_time || '').slice(0, 5)}</p>
                  <p><span className="text-slate-500">Personas:</span> {selected.guests}</p>
                  <p><span className="text-slate-500">Mesa:</span> {formatTableCode(selected.table_code)}</p>
                  <div className="mt-3">
                  <p className="text-xs text-slate-500 mb-2">Notas:</p>
                  <div className="relative">
                    <textarea
                      value={(() => {
                        // Separar el comprobante de las notas sin hacer trim
                        const notes = selected.notes || '';
                        const comprobanteIndex = notes.indexOf('\nComprobante:');
                        if (comprobanteIndex !== -1) {
                          return notes.substring(0, comprobanteIndex);
                        }
                        return notes;
                      })()}
                      onChange={(e) => handleNoteChange(selected.id, e.target.value)}
                      placeholder="Notas sobre esta reservación..."
                      className="w-full h-32 bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-[11px] text-slate-300 outline-none focus:border-cyan-500/40 shadow-inner resize-none"
                      rows="3"
                    />
                    <div className="absolute bottom-3 right-4 text-[8px] text-slate-600 font-bold uppercase">
                      {resNoteSaving[selected.id] ? 'Sincronizando...' : 'Auto-guardado'}
                    </div>
                  </div>
                </div>
                  
                  {/* Mostrar comprobante de depósito si existe */}
                  {selected.notes && selected.notes.includes('Comprobante:') && (
                    <div className="mt-3 pt-3 border-t border-slate-700/50">
                      <p className="text-xs text-slate-400 mb-2">Comprobante de Depósito:</p>
                      {(() => {
                        const match = selected.notes.match(/Comprobante:\s*(.+)/);
                        const imagePath = match ? match[1].trim() : null;
                        if (imagePath) {
                          return (
                            <div className="space-y-2">
                              <img 
                                src={imagePath} 
                                alt="Comprobante de depósito" 
                                className="w-full max-w-xs rounded-lg border border-slate-600/30 bg-slate-800/50"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                              <button
                                onClick={() => {
                                  setModalImage(imagePath);
                                  setShowImageModal(true);
                                }}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline block text-left"
                              >
                                Ver imagen completa
                              </button>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-sm">Selecciona una reservación para ver detalles</p>
            )}
            
            {selected && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => updateStatus(selected.id, 'confirmed')} className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">Confirmar</button>
                  <button onClick={() => updateStatus(selected.id, 'completed')} className="rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3 py-1 text-xs text-cyan-300">Completar</button>
                  <button onClick={() => updateStatus(selected.id, 'cancelled')} className="rounded-full border border-rose-500/35 bg-rose-500/15 px-3 py-1 text-xs text-rose-300">Cancelar</button>
                  <button onClick={() => updateStatus(selected.id, 'pending')} className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3 py-1 text-xs text-amber-300">Pendiente</button>
                </div>
                
                <div className="border-t border-slate-700/50 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Asignar Mesa:</span>
                    <button 
                      onClick={() => setAssigningTable(!assigningTable)}
                      className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300"
                    >
                      {assigningTable ? 'Cancelar' : 'Asignar'}
                    </button>
                  </div>
                  
                  {assigningTable && (
                    <div className="space-y-2">
                      <div className="grid gap-2">
                        <select 
                          value={newTableNumber.split('-')[0] || ''}
                          onChange={(e) => {
                            const prefix = e.target.value;
                            const currentNumber = newTableNumber.split('-')[1] || '1';
                            setNewTableNumber(`${prefix}-${currentNumber}`);
                          }}
                          className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 py-1 text-xs text-slate-200"
                        >
                          <option value="">Ubicación</option>
                          <option value="CD">Interior</option>
                          <option value="TA">Terraza Alta</option>
                          <option value="TB">Terraza Baja</option>
                        </select>
                        
                        {newTableNumber.split('-')[0] && (
                          <select 
                            value={newTableNumber.split('-')[1] || ''}
                            onChange={(e) => {
                              const prefix = newTableNumber.split('-')[0];
                              const number = e.target.value;
                              setNewTableNumber(`${prefix}-${number}`);
                            }}
                            className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="">Número</option>
                            {newTableNumber.split('-')[0] === 'CD' && Array.from({length: 11}, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            {newTableNumber.split('-')[0] === 'TA' && Array.from({length: 7}, (_, i) => i + 15).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                            {newTableNumber.split('-')[0] === 'TB' && Array.from({length: 8}, (_, i) => i + 1).map(n => (
                              <option key={n} value={n}>{n}</option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => {
                          const [prefix, number] = newTableNumber.split('-');
                          if (prefix && number) {
                            assignTable(selected.id, number, prefix);
                          }
                        }}
                        disabled={!newTableNumber.includes('-')}
                        className="w-full rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-xs text-emerald-300 disabled:opacity-50"
                      >
                        Confirmar Asignación
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Mesas Ocupadas por Hora */}
        <section className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
            <h3 className="text-sm uppercase tracking-[0.16em] text-cyan-300/80">
              Mesas Ocupadas por Hora
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-cyan-300/60 bg-cyan-500/10 px-2 py-1 rounded-full">
                {occupiedStats.active} activas
              </span>
              {occupiedStats.cancelled > 0 && (
                <span className="text-xs text-rose-300/60 bg-rose-500/10 px-2 py-1 rounded-full">
                  {occupiedStats.cancelled} canceladas
                </span>
              )}
              {occupiedStats.completed > 0 && (
                <span className="text-xs text-emerald-300/60 bg-emerald-500/10 px-2 py-1 rounded-full">
                  {occupiedStats.completed} completadas
                </span>
              )}
              <span className="text-xs text-slate-400 px-1">|</span>
              <span className="text-xs text-slate-300 font-medium">
                {occupiedStats.total} total
              </span>
            </div>
            <button 
              onClick={() => {
                console.log('=== DEBUG MESAS OCUPADAS ===');
                console.log('Total reservaciones:', occupiedTables.length);
                console.log('Datos completos:', occupiedTables);
                console.log('Reservaciones por hora:');
                
                // Agrupar por hora para mejor visualización
                const byHour = occupiedTables.reduce((acc, reservation) => {
                  const hour = reservation.reservation_time?.slice(0, 5) || 'Sin hora';
                  if (!acc[hour]) acc[hour] = [];
                  acc[hour].push(reservation);
                  return acc;
                }, {});
                
                Object.entries(byHour).forEach(([hour, reservations]) => {
                  console.log(`🕐 ${hour}: ${reservations.length} reservaciones`);
                  reservations.forEach(res => {
                    console.log(`  • ${res.customer_name} - Mesa: ${res.table_code || 'Sin asignar'} - Status: ${res.status}`);
                  });
                });
                
                console.log('==========================');
                
                // Mostrar información del backend si está disponible
                if (window.occupiedTablesDebug) {
                  console.log('🔍 BACKEND DEBUG INFO:');
                  console.log('📊 Reservaciones filtradas:', window.occupiedTablesDebug.filtered_results_count);
                  console.log('📊 Reservaciones totales:', window.occupiedTablesDebug.all_reservations_count);
                  console.log('📊 Breakdown por status:', window.occupiedTablesDebug.status_breakdown);
                  console.log('📋 Todas las reservaciones:', window.occupiedTablesDebug.all_reservations);
                  
                  // Mostrar diferencias
                  const diff = window.occupiedTablesDebug.all_reservations_count - window.occupiedTablesDebug.filtered_results_count;
                  if (diff > 0) {
                    console.log(`⚠️ HAY ${diff} RESERVACIONES QUE SE FILTRAN`);
                    console.log('Reservaciones filtradas (status no válido):');
                    window.occupiedTablesDebug.all_reservations.forEach(res => {
                      if (!['pending', 'confirmed', 'uploaded'].includes(res.status)) {
                        console.log(`  ❌ ${res.customer_name} - Status: ${res.status} - Hora: ${res.reservation_time}`);
                      }
                    });
                  }
                }
              }}
              className="text-xs text-slate-400 hover:text-cyan-300 transition-colors"
              title="Debug: Ver datos completos en consola"
            >
              🐛
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-auto">
            {occupiedTables.length === 0 ? (
              <p className="text-sm text-slate-500">No hay reservaciones para el Día de las Madres (10 de mayo).</p>
            ) : (
              occupiedTables.map((occupied, index) => (
                <div key={`${occupied.id}-${occupied.reservation_date}-${occupied.reservation_time}-${index}`} className="flex items-center justify-between rounded-lg border border-slate-700/60 bg-[#030b18]/70 p-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-cyan-300 font-medium text-sm">
                        {occupied.table_code ? formatTableCode(occupied.table_code) : 'Sin mesa asignada'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-300">{occupied.customer_name}</span>
                      {occupied.occasion === 'Dia de las Madres' && (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">Día de las Madres</span>
                      )}
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        occupied.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-300' :
                        occupied.status === 'uploaded' ? 'bg-blue-500/10 text-blue-300' :
                        'bg-amber-500/10 text-amber-300'
                      }`}>
                        {occupied.status === 'confirmed' ? 'Confirmada' :
                         occupied.status === 'uploaded' ? 'Con Comprobante' : 'Pendiente'}
                      </span>
                      {!occupied.table_code && (
                        <span className="text-xs text-red-400 bg-red-400/10 px-1 py-0.5 rounded">Sin mesa</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>{occupied.reservation_date}</span>
                      <span className="font-medium">{String(occupied.reservation_time || '').slice(0, 5)}</span>
                      <span>{occupied.guests} personas</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Modal para Crear Reservación Manual */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative bg-[#1a1a1f] p-6 rounded-2xl border border-[#D4AF37]/30 max-w-md w-full max-h-[90vh] overflow-auto">
            <button onClick={() => setShowCreateModal(false)} className="absolute right-4 top-4 text-[#D4AF37] hover:text-[#F4E4C1]">
              ✕
            </button>
            <h3 className="text-xl font-serif text-[#F4E4C1] mb-4">Nueva Reservación</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  value={newReservation.customer_name}
                  onChange={(e) => setNewReservation({...newReservation, customer_name: e.target.value})}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={newReservation.phone}
                  onChange={(e) => setNewReservation({...newReservation, phone: e.target.value})}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                  required
                />
              </div>
              
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Email (opcional)</label>
                <input
                  type="email"
                  value={newReservation.email}
                  onChange={(e) => setNewReservation({...newReservation, email: e.target.value})}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#D4AF37]/60 mb-1">Personas</label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={newReservation.guests}
                    onChange={(e) => setNewReservation({...newReservation, guests: parseInt(e.target.value)})}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-[#D4AF37]/60 mb-1">Ocasión</label>
                  <input
                    type="text"
                    value={newReservation.occasion}
                    onChange={(e) => setNewReservation({...newReservation, occasion: e.target.value})}
                    placeholder="Ej: Cumpleaños, Aniversario"
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Categoria de evento (opcional)</label>
                <select
                  value={newReservation.event_type_id}
                  onChange={(e) => setNewReservation({...newReservation, event_type_id: e.target.value})}
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                >
                  <option value="">Seleccionar categoria...</option>
                  {eventTypes.map((evt) => (
                    <option key={evt.id} value={evt.id}>{evt.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-[#D4AF37]/60 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={newReservation.reservation_date}
                    onChange={(e) => setNewReservation({...newReservation, reservation_date: e.target.value})}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs text-[#D4AF37]/60 mb-1">Hora</label>
                  <input
                    type="time"
                    value={newReservation.reservation_time}
                    onChange={(e) => setNewReservation({...newReservation, reservation_time: e.target.value})}
                    className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Mesa (opcional)</label>
                <input
                  type="text"
                  value={newReservation.table_code}
                  onChange={(e) => setNewReservation({...newReservation, table_code: e.target.value})}
                  placeholder="Ej: Interior Mesa 5, Terraza Alta Mesa 15, Terraza Baja Mesa 3"
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                />
              </div>
              
              <div>
                <label className="block text-xs text-[#D4AF37]/60 mb-1">Notas</label>
                <textarea
                  value={newReservation.notes}
                  onChange={(e) => setNewReservation({...newReservation, notes: e.target.value})}
                  rows="3"
                  placeholder="Notas adicionales..."
                  className="w-full rounded-lg border border-[#D4AF37]/20 bg-black/40 px-3 py-2 text-sm text-[#F4E4C1]"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 rounded-lg border border-slate-600/30 bg-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/70"
              >
                Cancelar
              </button>
              <button
                onClick={createReservation}
                className="flex-1 rounded-lg bg-[#D4AF37] hover:bg-[#F4E4C1] text-black px-4 py-2 text-sm font-bold transition-colors"
              >
                Crear Reservación
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4">
        <h3 className="text-sm text-white mb-2">Crear evento especial (dashboard)</h3>
        <div className="flex gap-2">
          <input
            type="text"
            value={eventTypeName}
            onChange={(e) => setEventTypeName(e.target.value)}
            placeholder="Ej. Boda, Navidad, Año Nuevo"
            className="flex-1 rounded-lg border border-slate-700/60 bg-[#030b18] px-3 py-2 text-sm text-slate-200"
          />
          <button
            onClick={createEventType}
            className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 text-sm text-cyan-300"
          >
            Guardar
          </button>
        </div>
        <div className="mt-4 border-t border-slate-700/40 pt-4">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70 mb-2">Boton visible en homepage (solo uno activo)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {eventTypes.filter((evt) => evt.slug !== 'general').map((evt) => (
              <button
                key={evt.id}
                onClick={() => setHomepageEvent(evt.id)}
                disabled={homeEventSaving}
                className={`rounded-xl border px-3 py-2 text-left transition-all ${
                  Number(evt.is_home_cta) === 1
                    ? 'border-pink-400/60 bg-pink-500/15 text-pink-200'
                    : 'border-slate-700/60 bg-slate-900/50 text-slate-300 hover:border-pink-400/30'
                }`}
              >
                <p className="text-sm">{evt.name}</p>
                <p className="text-[10px] uppercase tracking-wider">{Number(evt.is_home_cta) === 1 ? 'Activo en homepage' : 'Inactivo'}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Modal para Ver Imagen de Comprobante */}
      {showImageModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="relative bg-[#1a1a1f] p-4 rounded-2xl border border-[#D4AF37]/30 max-w-4xl w-full max-h-[90vh]">
            <button 
              onClick={() => setShowImageModal(false)} 
              className="absolute right-4 top-4 text-[#D4AF37] hover:text-[#F4E4C1] z-10"
            >
              ✕
            </button>
            
            <div className="flex flex-col items-center">
              <h3 className="text-lg font-serif text-[#F4E4C1] mb-4">Comprobante de Depósito</h3>
              
              <div className="relative w-full max-h-[70vh] overflow-auto rounded-lg border border-slate-600/30 bg-slate-900/50 p-2">
                <img 
                  src={modalImage} 
                  alt="Comprobante de depósito" 
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDlWMTEiIHN0cm9rZT0iI0Y5Q0E0RiIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiLz4KPHA+PC9wPgo8L3N2Zz4K';
                  }}
                />
              </div>
              
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => {
                    // Descargar imagen
                    const link = document.createElement('a');
                    link.href = modalImage;
                    link.download = `comprobante-${Date.now()}.jpg`;
                    link.click();
                  }}
                  className="rounded-lg border border-[#D4AF37]/25 bg-[#D4AF37]/10 px-4 py-2 text-sm text-[#D4AF37] hover:bg-[#D4AF37]/20"
                >
                  📥 Descargar
                </button>
                <button
                  onClick={() => setShowImageModal(false)}
                  className="rounded-lg border border-slate-600/30 bg-slate-700/50 px-4 py-2 text-sm text-slate-300 hover:bg-slate-700/70"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, tone }) {
  const toneMap = {
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    emerald: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    rose: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
  };
  return (
    <div className={`rounded-xl border p-4 ${toneMap[tone] || toneMap.cyan}`}>
      <p className="text-xs uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value ?? 0}</p>
    </div>
  );
}

export default Reservations;
