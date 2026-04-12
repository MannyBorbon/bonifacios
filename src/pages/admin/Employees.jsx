import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import LocationMap from '../../components/LocationMap';
import { geocodeAddress } from '../../utils/geo';
const ReactQuill = lazy(() => import('react-quill-new'));

function Employees() {
  const [executiveReport, setExecutiveReport] = useState([]);
  const [editingReport, setEditingReport] = useState({});
  const [expandedItems, setExpandedItems] = useState({});
  const [empCoords, setEmpCoords] = useState({});
  const [allEmpMarkers, setAllEmpMarkers] = useState([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPerson, setNewPerson] = useState({ 
    name: '', 
    email: '', 
    phone: '', 
    age: '', 
    gender: '', 
    position: '', 
    experience: '', 
    currentJob: '', 
    address: '', 
    estudios: '',
    application_date: new Date().toISOString().split('T')[0], 
    start_date: '' 
  });
  const [showReportModal, setShowReportModal] = useState(null);
  const [reportType, setReportType] = useState('file');
  const [newReport, setNewReport] = useState({ name: '', content: '', file: null, photo: null });
  const [employeeReports, setEmployeeReports] = useState({});
  const [reportViewMode, setReportViewMode] = useState('list');
  const [reportSearch, setReportSearch] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [filterGender, setFilterGender] = useState('all');
  const [filterAge, setFilterAge] = useState('all');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'administrador';
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragging, setDragging] = useState(false);

  // ── Notes (one per employee, auto-save) ────────────────────────────────
  const [empNotes, setEmpNotes] = useState({});       // { [empId]: { id, content } }
  const [empNoteSaving, setEmpNoteSaving] = useState({}); // { [empId]: bool }
  const noteTimers = useRef({});  // debounce timers
  const noteRefresh = useRef({}); // periodic refresh intervals
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const formatMoney = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const loadExecutiveReport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/get.php`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setExecutiveReport(result.data || []);
      }
    } catch (error) {
      console.error('Error loading executive report:', error);
    }
  };

  useEffect(() => {
    loadExecutiveReport();
  }, []);

  // Geocode all employee addresses for the general map
  useEffect(() => {
    if (executiveReport.length === 0) return;
    let cancelled = false;
    setGeoLoading(true);
    const run = async () => {
      const markers = [];
      const coordsMap = {};
      for (const emp of executiveReport) {
        if (cancelled) return;
        if (emp.address) {
          const coords = await geocodeAddress(emp.address);
          if (coords) {
            coordsMap[emp.id] = coords;
            const status = emp.status || 'active';
            const markerColor = status === 'inactive' ? 'red' : status === 'vacation' ? 'orange' : status === 'eventual' ? 'blue' : 'green';
            const statusLabel = status === 'inactive' ? 'Inactivo' : status === 'vacation' ? 'Vacaciones' : status === 'eventual' ? 'Eventual' : 'Activo';
            markers.push({
              lat: coords[0], lng: coords[1], color: markerColor, label: emp.name,
              popup: `<b>${emp.name}</b><br/>${emp.position || ''}<br/><span style="color: ${markerColor === 'red' ? '#f87171' : markerColor === 'orange' ? '#fb923c' : '#4ade80'}">${statusLabel}</span><br/><small>${emp.address}</small>`
            });
          }
        }
      }
      if (!cancelled) {
        setEmpCoords(coordsMap);
        setAllEmpMarkers(markers);
        setGeoLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [executiveReport]);

  const handlePhotoUpload = async (employeeId, file, photoType = 'profile') => {
    if (!file) return;

    const formData = new FormData();
    formData.append('photo', file);
    formData.append('employee_id', employeeId);
    formData.append('photo_type', photoType);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/upload-photo.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      const result = await response.json();
      if (result.success) {
        alert(photoType === 'id' ? 'Identificación subida exitosamente' : 'Foto subida exitosamente');
        loadExecutiveReport();
      } else {
        alert(result.error || 'Error al subir la foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error al subir la foto');
    }
  };

  const _handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`¿Estás seguro de eliminar a ${name}? Esta acción no se puede deshacer.`)) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/delete.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Empleado eliminado exitosamente');
        loadExecutiveReport();
      } else {
        alert(result.error || 'Error al eliminar empleado');
      }
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert('Error al eliminar empleado');
    }
  };

  const loadReports = async (employeeId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-reports-mysqli.php?employee_id=${employeeId}`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) {
        setEmployeeReports(prev => ({ ...prev, [employeeId]: result.reports || [] }));
      }
    } catch (error) {
      console.error('Error loading reports:', error);
    }
  };

  const handleDeleteReport = async (reportId, employeeId) => {
    if (!window.confirm('¿Eliminar este reporte?')) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/delete-report-mysqli.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId })
      });
      const result = await response.json();
      if (result.success) {
        loadReports(employeeId);
      } else {
        alert(result.error || 'Error al eliminar reporte');
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  
  const handleUploadReport = async (employeeId) => {
    if (!newReport.name) {
      alert('Por favor ingresa un nombre para el reporte');
      return;
    }
    if (reportType === 'file' && !newReport.file) {
      alert('Por favor selecciona un archivo');
      return;
    }
    if (reportType === 'text' && !newReport.content) {
      alert('Por favor ingresa contenido para el reporte');
      return;
    }
    try {
      const formData = new FormData();
      formData.append('employee_id', employeeId);
      formData.append('report_name', newReport.name);
      formData.append('report_type', reportType);
      if (reportType === 'file') {
        formData.append('file', newReport.file);
      } else {
        formData.append('content', newReport.content);
      }
      if (newReport.photo) {
        formData.append('photo', newReport.photo);
      }
      const response = await fetch(`${import.meta.env.VITE_API_URL}/employees/create-report.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const result = await response.json();
      if (result.success) {
        alert('Reporte creado exitosamente');
        setShowReportModal(null);
        setNewReport({ name: '', content: '', file: null, photo: null });
        setReportType('file');
        loadReports(employeeId);
      } else {
        alert(result.error || 'Error al crear reporte');
      }
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Error al crear reporte');
    }
  };

  const handleReportEdit = (id, field, value) => {
    setEditingReport(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
  };

  const saveReportChanges = async (id) => {
    const changes = editingReport[id];
    if (!changes) return;

    try {
      // Send each field update separately (skip internal flags)
      for (const [field, value] of Object.entries(changes)) {
        if (field.startsWith('_')) continue;
        await fetch(`${import.meta.env.VITE_API_URL}/executive-report/update.php`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: id,
            field: field,
            value: value
          })
        });
      }
      
      loadExecutiveReport();
      setEditingReport(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      alert('Cambios guardados exitosamente');
    } catch (error) {
      console.error('Error saving report:', error);
      alert('Error al guardar cambios');
    }
  };

  // ── Drag & Drop (desktop) ───────────────────────────────────────────────
  const handleDragStart = (index) => {
    dragItem.current = index;
    setDragging(true);
  };

  const handleDragEnter = (index) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = async () => {
    setDragging(false);
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
      dragItem.current = null;
      dragOverItem.current = null;
      return;
    }
    const list = [...executiveReport];
    const [removed] = list.splice(dragItem.current, 1);
    list.splice(dragOverItem.current, 0, removed);
    setExecutiveReport(list);
    dragItem.current = null;
    dragOverItem.current = null;
    await persistOrder(list);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // ── Move buttons (mobile-friendly) ─────────────────────────────────────
  const moveItem = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= executiveReport.length) return;
    const list = [...executiveReport];
    [list[index], list[newIndex]] = [list[newIndex], list[index]];
    setExecutiveReport(list);
    await persistOrder(list);
  };

  const persistOrder = async (list) => {
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/executive-report/reorder.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: list.map(i => i.id) })
      });
    } catch (error) {
      console.error('Error saving order:', error);
    }
  };

  // per-employee active tab: 'reportes' | 'notas'
  const [empTabs, setEmpTabs] = useState({});

  const loadEmpNote = async (empId) => {
    if (empNotes[empId] !== undefined) return; // already loaded
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php?employee_id=${empId}`, { credentials: 'include' });
      const d = await res.json();
      const notes = Array.isArray(d.notes) ? d.notes : [];
      const first = notes[0];
      setEmpNotes(prev => ({ ...prev, [empId]: first ? { id: first.id, content: first.content || '' } : { id: null, content: '' } }));
    } catch { /* silent */ }
  };

  const startNoteRefresh = (empId) => {
    if (noteRefresh.current[empId]) return;
    noteRefresh.current[empId] = setInterval(async () => {
      if (noteTimers.current[empId]) return; // user is typing — skip
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php?employee_id=${empId}`, { credentials: 'include' });
        const d = await res.json();
        const notes = Array.isArray(d.notes) ? d.notes : [];
        const first = notes[0];
        const serverContent = first?.content || '';
        setEmpNotes(prev => {
          if (prev[empId]?.content === serverContent) return prev;
          return { ...prev, [empId]: { id: first?.id || prev[empId]?.id || null, content: serverContent } };
        });
      } catch { /* silent */ }
    }, 5000);
  };

  const stopNoteRefresh = (empId) => {
    clearInterval(noteRefresh.current[empId]);
    delete noteRefresh.current[empId];
  };

  const toggleItem = (id) => {
    const willExpand = !expandedItems[id];
    setExpandedItems(prev => ({
      ...prev,
      [id]: willExpand
    }));
    if (willExpand) {
      if (!employeeReports[id]) loadReports(id);
    }
  };

  const handleAddPerson = async () => {
    if (!newPerson.name || !newPerson.email || !newPerson.phone || !newPerson.position) {
      alert('Por favor completa los campos requeridos: Nombre, Email, Teléfono y Puesto');
      return;
    }

    try {
      // 1. Create job application with "Aceptada" status
      const applicationResponse = await fetch(`${import.meta.env.VITE_API_URL}/applications/submit.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPerson.name,
          email: newPerson.email,
          phone: newPerson.phone,
          age: newPerson.age || '',
          gender: newPerson.gender || '',
          position: newPerson.position,
          experience: newPerson.experience || '0',
          currentJob: newPerson.currentJob || '',
          address: newPerson.address || '',
          estudios: newPerson.estudios || '',
          autoAccept: true // Special flag to auto-accept
        })
      });
      const appResult = await applicationResponse.json();
      
      if (appResult.success) {
        // 2. Create executive report entry with amounts
        const reportResponse = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/create.php`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newPerson.name,
            position: newPerson.position,
            application_date: newPerson.application_date,
            start_date: newPerson.start_date
          })
        });
        
        const reportResult = await reportResponse.json();
        
        if (reportResult.success) {
          alert('Persona agregada exitosamente');
          loadExecutiveReport();
          setNewPerson({ name: '', email: '', phone: '', age: '', gender: '', position: '', experience: '', currentJob: '', address: '', estudios: '', application_date: '', start_date: '' });
          setShowAddForm(false);
        }
      }
    } catch (error) {
      console.error('Error adding person:', error);
      alert('Error al agregar persona');
    }
  };

  const handleNoteChange = (empId, content) => {
    setEmpNotes(prev => ({ ...prev, [empId]: { ...(prev[empId] || { id: null }), content } }));
    clearTimeout(noteTimers.current[empId]);
    noteTimers.current[empId] = setTimeout(() => {
      noteTimers.current[empId] = null;
      saveEmpNote(empId, content);
    }, 800);
  };

  const saveEmpNote = async (empId, content) => {
    setEmpNoteSaving(prev => ({ ...prev, [empId]: true }));
    try {

      const note = empNotes[empId];
      const payload = note?.id
        ? { action: 'update', id: note.id, title: 'Nota', content, color: 'default' }
        : { action: 'create', employee_id: empId, title: 'Nota', content, color: 'default', created_by_name: user.username };
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success && !note?.id && d.note?.id) {
        setEmpNotes(prev => ({ ...prev, [empId]: { id: d.note.id, content } }));
      }
    } catch { /* silent */ }
    finally { setEmpNoteSaving(prev => ({ ...prev, [empId]: false })); }
  };

  const _handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar este registro?')) {
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/delete.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      
      const result = await response.json();
      if (result.success) {
        loadExecutiveReport();
      }
    } catch (error) {
      console.error('Error deleting report:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-light text-white tracking-wide">Personal</h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {isAdmin ? 'Gestión de personal y acciones' : 'Vista de personal (solo lectura)'}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm text-cyan-400 transition-all hover:bg-cyan-500/20 w-full sm:w-auto"
          >
            + Agregar Persona
          </button>
        )}
      </div>

      {/* Add new person form - Job Application Format */}
      {showAddForm && (
        <div className="rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 sm:p-6 shadow-lg shadow-cyan-500/5">
          <h3 className="mb-4 text-lg font-light text-white">Agregar Nueva Persona</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Información Personal */}
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Nombre Completo *</label>
              <input
                type="text"
                placeholder="Nombre completo"
                value={newPerson.name}
                onChange={(e) => setNewPerson({...newPerson, name: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Email *</label>
              <input
                type="text"
                placeholder="correo@ejemplo.com"
                value={newPerson.email}
                onChange={(e) => setNewPerson({...newPerson, email: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Teléfono *</label>
              <input
                type="tel"
                placeholder="1234567890"
                value={newPerson.phone}
                onChange={(e) => setNewPerson({...newPerson, phone: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Edad</label>
              <input
                type="number"
                placeholder="18"
                value={newPerson.age}
                onChange={(e) => setNewPerson({...newPerson, age: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Sexo</label>
              <select
                value={newPerson.gender}
                onChange={(e) => setNewPerson({...newPerson, gender: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              >
                <option value="">Seleccionar</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Puesto Deseado *</label>
              <input
                type="text"
                placeholder="Ej: Mesero, Cocinero"
                value={newPerson.position}
                onChange={(e) => setNewPerson({...newPerson, position: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Experiencia (años)</label>
              <input
                type="number"
                placeholder="0"
                value={newPerson.experience}
                onChange={(e) => setNewPerson({...newPerson, experience: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Trabajo Actual</label>
              <input
                type="text"
                placeholder="Empresa/negocio actual"
                value={newPerson.currentJob}
                onChange={(e) => setNewPerson({...newPerson, currentJob: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-xs text-cyan-500/60 mb-1">Dirección</label>
              <input
                type="text"
                placeholder="Calle, número, colonia, ciudad"
                value={newPerson.address}
                onChange={(e) => setNewPerson({...newPerson, address: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div className="sm:col-span-2">
              <label className="block text-xs text-cyan-500/60 mb-1">Estudios</label>
              <input
                type="text"
                placeholder="Nivel de estudios completados"
                value={newPerson.estudios}
                onChange={(e) => setNewPerson({...newPerson, estudios: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            {/* Fechas */}
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Fecha de Solicitud</label>
              <input
                type="date"
                value={newPerson.application_date}
                onChange={(e) => setNewPerson({...newPerson, application_date: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
            
            <div>
              <label className="block text-xs text-cyan-500/60 mb-1">Fecha de Inicio de Labores</label>
              <input
                type="date"
                value={newPerson.start_date}
                onChange={(e) => setNewPerson({...newPerson, start_date: e.target.value})}
                className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              onClick={handleAddPerson}
              className="flex-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-400 transition-all hover:bg-cyan-500/20"
            >
              Guardar y Agregar
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewPerson({ name: '', email: '', phone: '', age: '', gender: '', position: '', experience: '', currentJob: '', address: '', estudios: '', application_date: new Date().toISOString().split('T')[0], start_date: '' });
              }}
              className="rounded-lg border border-slate-700/40 bg-[#040c1a]/60 px-4 py-2 text-sm text-slate-500 transition-all hover:text-slate-300"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 rounded-xl border border-cyan-500/10 bg-[#040c1a]/60 px-3 py-2.5 sm:px-4 sm:py-3">
        <span className="text-xs text-cyan-500/50 mr-1">Filtros:</span>
        <select
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
          className="rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
        >
          <option value="all">Todos los sexos</option>
          <option value="Masculino">Masculino</option>
          <option value="Femenino">Femenino</option>
          <option value="Otro">Otro</option>
        </select>
        <select
          value={filterAge}
          onChange={(e) => setFilterAge(e.target.value)}
          className="rounded-lg border border-cyan-500/15 bg-[#030b18]/60 px-2.5 py-1.5 text-xs text-slate-300 focus:border-cyan-400/40 focus:outline-none"
        >
          <option value="all">Todas las edades</option>
          <option value="18-35">18 - 35 años</option>
          <option value="36-54">36 - 54 años</option>
          <option value="55-80">55 - 80 años</option>
        </select>
        {(filterGender !== 'all' || filterAge !== 'all') && (
          <button
            onClick={() => { setFilterGender('all'); setFilterAge('all'); }}
            className="rounded-lg bg-[#040c1a]/60 border border-slate-700/30 px-2.5 py-1.5 text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Section: Empleados Activos / Vacaciones */}
      <div className="mb-2 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
          <h2 className="text-base sm:text-lg font-light text-white">Empleados Activos</h2>
        </div>
        <span className="text-[10px] text-slate-600">
          {executiveReport.filter(item => {
            const s = item.status || 'active';
            if (s !== 'active' && s !== 'vacation' && s !== 'eventual') return false;
            const genderMatch = filterGender === 'all' || (item.gender || '') === filterGender;
            const age = parseInt(item.age);
            const ageMatch = filterAge === 'all' || (filterAge === '18-35' && age >= 18 && age <= 35) || (filterAge === '36-54' && age >= 36 && age <= 54) || (filterAge === '55-80' && age >= 55 && age <= 80);
            return genderMatch && (isNaN(age) ? filterAge === 'all' : ageMatch);
          }).length} empleados
        </span>
      </div>
      <div className="space-y-3">
        {executiveReport.filter(item => {
          const s = item.status || 'active';
          if (s !== 'active' && s !== 'vacation') return false;
          const genderMatch = filterGender === 'all' || (item.gender || '') === filterGender;
          const age = parseInt(item.age);
          const ageMatch = filterAge === 'all' || (filterAge === '18-35' && age >= 18 && age <= 35) || (filterAge === '36-54' && age >= 36 && age <= 54) || (filterAge === '55-80' && age >= 55 && age <= 80);
          return genderMatch && (isNaN(age) ? filterAge === 'all' : ageMatch);
        }).map((item, index) => (
          <div
            key={item.id}
            draggable={isAdmin && !isTouchDevice}
            onDragStart={() => handleDragStart(index)}
            onDragEnter={() => handleDragEnter(index)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            className={`rounded-xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden shadow-xl shadow-cyan-500/5 transition-all ${
              dragging ? 'cursor-grabbing' : ''
            }`}
          >
            <div
              onClick={() => toggleItem(item.id)}
              className="flex cursor-pointer items-center justify-between px-3 py-2 sm:p-4 transition-all hover:bg-cyan-500/5"
            >
              {/* Drag handle (desktop) + move buttons (mobile) */}
              {isAdmin && (
                <div className="flex-shrink-0 mr-2 sm:mr-3 flex items-center gap-0.5">
                  <div className="hidden sm:block cursor-grab active:cursor-grabbing text-cyan-500/20 hover:text-cyan-400/50 transition-colors" onMouseDown={(e) => e.stopPropagation()} title="Arrastra para reordenar">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                      <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                      <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
                    </svg>
                  </div>
                  <div className="flex sm:hidden flex-col gap-0.5">
                    <button onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }} disabled={index === 0}
                      className="p-0.5 rounded text-cyan-500/30 hover:text-cyan-400 disabled:opacity-20 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" /></svg>
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }} disabled={index === executiveReport.length - 1}
                      className="p-0.5 rounded text-cyan-500/30 hover:text-cyan-400 disabled:opacity-20 transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </button>
                  </div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                    (item.status || 'active') === 'active' ? 'bg-green-500' :
                    item.status === 'vacation' ? 'bg-amber-400' :
                    item.status === 'eventual' ? 'bg-blue-400' : 'bg-red-400'
                  }`} title={item.status === 'inactive' ? 'Inactivo' : item.status === 'vacation' ? 'Vacaciones' : item.status === 'eventual' ? 'Eventual' : 'Activo'} />
                  <h3 className={`text-sm sm:text-base font-medium truncate ${item.status === 'inactive' ? 'text-slate-600' : 'text-slate-200'}`}>{item.name}</h3>
                  <span className="rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-xs text-cyan-400">
                    {item.position || 'Sin posición'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  {item.main_amount > 0 || item.secondary_amount > 0 ? (
                    <span>
                      ${formatMoney(item.main_amount)} / ${formatMoney(item.secondary_amount)}
                    </span>
                  ) : (
                    <span>
                      Inicio: {item.start_date || 'Pendiente'}
                    </span>
                  )}
                </div>
              </div>
              <svg
                className={`h-5 w-5 text-cyan-400/50 transition-transform ${expandedItems[item.id] ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            
            {expandedItems[item.id] && (
              <div className="border-t border-cyan-500/10 bg-[#030b18]/60">
                <div className="p-3 sm:p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Photo & Info Section */}
                    <div className="lg:col-span-1">
                    <h4 className="text-sm font-medium text-cyan-500/50 mb-3">Información del Empleado</h4>
                    <div className="rounded-lg border border-cyan-500/10 bg-[#040c1a]/70 p-3 sm:p-4">
                      {/* Photos Row: Profile LEFT, ID RIGHT */}
                      <div className="flex items-start justify-center gap-4 mb-3">
                        {/* Profile Photo - LEFT */}
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-cyan-500/40 mb-1">Foto Perfil</p>
                          <div className="w-full aspect-square max-w-[140px] mx-auto rounded-lg border border-cyan-500/10 bg-[#030b18]/60 flex items-center justify-center overflow-hidden">
                            {item.photo ? (
                              <img src={item.photo} alt={item.name} onClick={() => setImagePreview(item.photo)} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                            ) : (
                              <svg className="h-8 w-8 text-cyan-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            )}
                          </div>
                          {isAdmin && (
                            <label className="mt-2 cursor-pointer rounded border border-cyan-500/20 bg-cyan-500/8 px-3 py-1 text-[10px] text-cyan-400 transition-all hover:bg-cyan-500/15 inline-block">
                              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0], 'profile')} className="hidden" />
                              Subir Foto
                            </label>
                          )}
                        </div>

                        {/* ID Photo - RIGHT */}
                        <div className="flex-1 text-center">
                          <p className="text-[10px] text-cyan-500/60 mb-1">Identificación</p>
                          <div className="w-full aspect-[3/2] max-w-[210px] mx-auto rounded-lg border border-cyan-500/15 bg-[#030b18]/60 flex items-center justify-center overflow-hidden">
                            {item.id_photo ? (
                              <img src={item.id_photo} alt="ID" onClick={() => setImagePreview(item.id_photo)} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                            ) : (
                              <svg className="h-8 w-8 text-cyan-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                              </svg>
                            )}
                          </div>
                          {isAdmin && (
                            <label className="mt-2 cursor-pointer rounded border border-cyan-500/20 bg-cyan-500/8 px-3 py-1 text-[10px] text-cyan-400 transition-all hover:bg-cyan-500/15 inline-block">
                              <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0], 'id')} className="hidden" />
                              Subir ID
                            </label>
                          )}
                        </div>
                      </div>
                    </div>
                    </div>

                  {/* Expediente Section */}
                  <div className="col-span-1 md:col-span-2 lg:col-span-2">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-medium text-cyan-400/70">Expediente</h4>
                      {isAdmin && !editingReport[item.id] && (
                        <button
                          onClick={() => handleReportEdit(item.id, '_editing', true)}
                          className="rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-3 py-1 text-xs text-cyan-400 transition-all hover:bg-cyan-500/15"
                        >
                          Editar
                        </button>
                      )}
                    </div>
                    <div className="space-y-4">
                      {/* Section 1: Información Personal */}
                      <div className="rounded-lg border border-cyan-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                        <h5 className="text-xs font-medium text-cyan-500/50 mb-3 pb-2 border-b border-cyan-500/10">Información Personal</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {[
                            { label: 'Nombre', field: 'name', value: item.name },
                            { label: 'Edad', field: 'age', value: item.age, type: 'number' },
                            { label: 'Estado Civil', field: 'estado_civil', value: item.estado_civil },
                            { label: 'Teléfono', field: 'phone', value: item.phone },
                            { label: 'Dirección', field: 'address', value: item.address },
                            { label: 'Idiomas', field: 'idiomas', value: item.idiomas },
                            { label: 'Fecha Ingreso', field: 'start_date', value: item.start_date, type: 'date' },
                          ].map(({ label, field, value, type }) => (
                            <div key={field}>
                              <label className="block text-[10px] text-cyan-500/60 mb-1">{label}</label>
                              {isAdmin && editingReport[item.id] ? (
                                <input
                                  type={type || 'text'}
                                  value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                  onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                  className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                  className={`w-full rounded border border-cyan-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-cyan-500/20' : ''}`}
                                >
                                  {value || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 2: Información Laboral */}
                      <div className="rounded-lg border border-cyan-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                        <h5 className="text-xs font-medium text-cyan-500/50 mb-3 pb-2 border-b border-cyan-500/10">Información Laboral</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {[{ label: 'No. Empleado', field: 'employee_number', value: item.employee_number }].map(({ label, field, value }) => (
                            <div key={field}>
                              <label className="block text-[10px] text-cyan-500/60 mb-1">{label}</label>
                              {isAdmin && editingReport[item.id] ? (
                                <input
                                  type="text"
                                  value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                  onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                  placeholder="Ej: EMP-001"
                                  className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                  className={`w-full rounded border border-cyan-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-cyan-500/20' : ''}`}
                                >
                                  {value || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                          {[
                            { label: 'Área / Puesto', field: 'position', value: item.position },
                            { label: 'Accesos (sistema, llaves, cámaras)', field: 'accesos', value: item.accesos },
                            { label: 'Sueldo Actual', field: 'sueldo', value: item.sueldo, type: 'number' },
                            { label: 'Prestaciones / Costo', field: 'prestaciones', value: item.prestaciones },
                            { label: 'Estado', field: 'status', value: item.status, isSelect: true },
                          ].map(({ label, field, value, type, isSelect }) => (
                            <div key={field}>
                              <label className="block text-[10px] text-cyan-500/60 mb-1">{label}</label>
                              {isAdmin && editingReport[item.id] ? (
                                isSelect ? (
                                  <select
                                    value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || 'active')}
                                    onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                    className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                                  >
                                    <option value="active">Activo</option>
                                    <option value="eventual">Eventual</option>
                                    <option value="vacation">Vacaciones</option>
                                    <option value="inactive">Inactivo</option>
                                  </select>
                                ) : (
                                  <input
                                    type={type || 'text'}
                                    value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                    onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                    className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                                  />
                                )
                              ) : (
                                <div
                                  onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                  className={`w-full rounded border border-cyan-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-cyan-500/20' : ''}`}
                                >
                                  {field === 'sueldo' && value ? `$${parseFloat(value).toLocaleString()}` : (value || '-')}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Section 3: Emergencia / Médico */}
                      <div className="rounded-lg border border-cyan-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                        <h5 className="text-xs font-medium text-cyan-500/50 mb-3 pb-2 border-b border-cyan-500/10">Emergencia / Información Médica</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          {[
                            { label: 'Contacto de Emergencia', field: 'emergency_contact', value: item.emergency_contact },
                            { label: 'Tipo de Sangre', field: 'tipo_sangre', value: item.tipo_sangre },
                            { label: 'Alergias', field: 'alergias', value: item.alergias },
                            { label: 'Enfermedades', field: 'enfermedades', value: item.enfermedades },
                          ].map(({ label, field, value }) => (
                            <div key={field}>
                              <label className="block text-[10px] text-cyan-500/60 mb-1">{label}</label>
                              {isAdmin && editingReport[item.id] ? (
                                <input
                                  type="text"
                                  value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                  onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                  className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none"
                                />
                              ) : (
                                <div
                                  onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                  className={`w-full rounded border border-cyan-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-cyan-500/20' : ''}`}
                                >
                                  {value || '-'}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {isAdmin && editingReport[item.id] && (
                        <button
                          onClick={() => saveReportChanges(item.id)}
                          className="w-full rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-sm text-cyan-400 transition-all hover:bg-cyan-500/20 font-medium"
                        >
                          Guardar Cambios
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

                {/* Individual Employee Map */}
                {item.address && (
                  <div className="mt-4 px-3 sm:px-4 pb-3">
                    <h4 className="text-sm font-medium text-cyan-400/70 mb-2">Ubicación</h4>
                    {empCoords[item.id] ? (
                      <LocationMap
                        markers={[{ lat: empCoords[item.id][0], lng: empCoords[item.id][1], color: 'green', popup: `<b>${item.name}</b><br/><small>${item.address}</small>` }]}
                        height={200}
                        zoom={14}
                      />
                    ) : (
                      <div className="h-[200px] rounded-xl border border-cyan-500/20 bg-[#030b18]/60 flex items-center justify-center">
                        <p className="text-xs text-slate-500">{geoLoading ? 'Geocodificando dirección...' : 'No se pudo localizar la dirección'}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Reportes | Notas tabs */}
                <div className="mt-6 pt-6 border-t border-cyan-500/10">
                  {/* Tab bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex rounded-lg overflow-hidden border border-slate-700/40">
                      <button
                        onClick={() => { setEmpTabs(p => ({ ...p, [item.id]: 'reportes' })); stopNoteRefresh(item.id); }}
                        className={`px-3 py-1.5 text-[10px] transition-all ${(empTabs[item.id] || 'reportes') === 'reportes' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-[#040c1a]/60 text-slate-500 hover:text-slate-300'}`}
                      >
                        Reportes ({(employeeReports[item.id] || []).length})
                      </button>
                      {isAdmin && (
                        <button
                          onClick={() => { setEmpTabs(p => ({ ...p, [item.id]: 'notas' })); loadEmpNote(item.id); startNoteRefresh(item.id); }}
                          className={`px-3 py-1.5 text-[10px] transition-all ${(empTabs[item.id] || 'reportes') === 'notas' ? 'bg-amber-500/15 text-amber-400' : 'bg-[#040c1a]/60 text-slate-500 hover:text-slate-300'}`}
                        >
                          Nota
                        </button>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {(empTabs[item.id] || 'reportes') === 'reportes' && (
                        <>
                          <div className="flex rounded-lg overflow-hidden border border-cyan-500/20">
                            <button onClick={() => setReportViewMode('list')} className={`px-2 py-1 text-[10px] ${reportViewMode === 'list' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-[#040c1a]/60 text-slate-500'}`}>Lista</button>
                            <button onClick={() => setReportViewMode('grid')} className={`px-2 py-1 text-[10px] ${reportViewMode === 'grid' ? 'bg-cyan-500/15 text-cyan-400' : 'bg-[#040c1a]/60 text-slate-500'}`}>Bloques</button>
                          </div>
                          {isAdmin && (
                            <button onClick={() => setShowReportModal(item.id)} className="rounded-lg border border-cyan-500/20 bg-cyan-500/8 px-3 py-1.5 text-xs text-cyan-400 transition-all hover:bg-cyan-500/15">+ Nuevo</button>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nota tab — single auto-saving textarea */}
                  {(empTabs[item.id] || 'reportes') === 'notas' && isAdmin && (
                    <div className="relative rounded-xl border border-amber-500/15 bg-[#060d1f]/60 overflow-hidden">
                      {empNotes[item.id] === undefined ? (
                        <div className="flex items-center justify-center h-40">
                          <div className="h-4 w-4 rounded-full border border-amber-400/20 border-t-amber-400 animate-spin" />
                        </div>
                      ) : (
                        <textarea
                          value={empNotes[item.id]?.content ?? ''}
                          onChange={e => handleNoteChange(item.id, e.target.value)}
                          placeholder="Escribe una nota libre…"
                          className="w-full h-52 resize-none bg-transparent px-4 pt-4 pb-7 text-sm text-slate-300 placeholder-slate-700 outline-none leading-relaxed"
                        />
                      )}
                      <div className="absolute bottom-2 right-3 flex items-center gap-2">
                        {empNoteSaving[item.id]
                          ? <span className="text-[9px] text-amber-400/50 animate-pulse">Guardando…</span>
                          : <span className="text-[9px] text-slate-700">Auto-guardado</span>}
                      </div>
                    </div>
                  )}

                  {/* Reportes tab: search */}
                  {(empTabs[item.id] || 'reportes') === 'reportes' && employeeReports[item.id] && employeeReports[item.id].length > 0 && (
                    <div className="mb-3">
                      <input
                        type="text"
                        value={reportSearch}
                        onChange={(e) => setReportSearch(e.target.value)}
                        placeholder="Buscar por nombre o fecha..."
                        className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-3 py-1.5 text-xs text-slate-200 focus:border-cyan-400/40 focus:outline-none placeholder:text-slate-600"
                      />
                    </div>
                  )}

                  {/* Reports Content */}
                  <div className="rounded-lg border border-cyan-500/15 bg-[#060d1f]/60 p-3 max-h-80 overflow-y-auto">
                    {(() => {
                      const reports = (employeeReports[item.id] || [])
                        .filter(r => {
                          if (!reportSearch) return true;
                          const q = reportSearch.toLowerCase();
                          const dateStr = new Date(r.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo' });
                          return r.report_name.toLowerCase().includes(q) || dateStr.includes(q) || (r.created_at || '').includes(q);
                        })
                        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

                      if (!employeeReports[item.id]) {
                        return <p className="text-xs text-slate-500 text-center py-4">Cargando reportes...</p>;
                      }
                      if (reports.length === 0 && employeeReports[item.id].length === 0) {
                        return <p className="text-xs text-slate-500 text-center py-4">No hay reportes registrados</p>;
                      }
                      if (reports.length === 0) {
                        return <p className="text-xs text-slate-500 text-center py-4">Sin resultados para &quot;{reportSearch}&quot;</p>;
                      }

                      if (reportViewMode === 'grid') {
                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {reports.map((report) => (
                              <div key={report.id} className="rounded-lg bg-[#040c1a]/50 border border-cyan-500/10 p-2 hover:border-cyan-500/20 transition-colors">
                                {report.photo_path ? (
                                  <img src={report.photo_path} alt="" onClick={() => setImagePreview(report.photo_path)} className="w-full h-20 object-cover rounded mb-2 cursor-pointer hover:opacity-80" />
                                ) : report.file_path && /\.(jpg|jpeg|png|gif|webp)$/i.test(report.file_path) ? (
                                  <img src={report.file_path} alt="" onClick={() => setImagePreview(report.file_path)} className="w-full h-20 object-cover rounded mb-2 cursor-pointer hover:opacity-80" />
                                ) : (
                                  <div className="w-full h-20 rounded mb-2 bg-[#040c1a]/60 flex items-center justify-center text-cyan-500/20 text-lg">
                                    {report.report_type === 'file' ? '📄' : '📝'}
                                  </div>
                                )}
                                <p className="text-[10px] font-medium text-slate-200 truncate">{report.report_name}</p>
                                <p className="text-[10px] text-slate-500">{new Date(report.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo' })}</p>
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {report.file_path && <a href={report.file_path} target="_blank" rel="noopener noreferrer" className="text-cyan-400 text-[10px]">Descargar</a>}
                                  <a href={`/admin/report/${report.id}`} className="text-cyan-400 text-[10px]">Ver Completo</a>
                                  {isAdmin && <button onClick={() => handleDeleteReport(report.id, item.id)} className="text-red-400 text-[10px]">Eliminar</button>}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {reports.map((report) => (
                            <div key={report.id} className="flex items-start gap-3 p-2 sm:p-3 rounded bg-[#040c1a]/40 hover:bg-cyan-500/5 transition-colors">
                              {(report.photo_path || (report.file_path && /\.(jpg|jpeg|png|gif|webp)$/i.test(report.file_path))) && (
                                <img
                                  src={report.photo_path || report.file_path}
                                  alt=""
                                  onClick={() => setImagePreview(report.photo_path || report.file_path)}
                                  className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border border-cyan-500/20 cursor-pointer hover:opacity-80 flex-shrink-0"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-xs sm:text-sm text-slate-200 font-medium truncate">{report.report_name}</p>
                                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                                  {report.report_type === 'file' ? '📄' : '📝'} {new Date(report.created_at).toLocaleDateString('es-MX', { timeZone: 'America/Hermosillo', year: 'numeric', month: 'short', day: 'numeric' })} • {report.created_by_name || 'Admin'}
                                </p>
                                {report.report_type === 'text' && report.content && (
                                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2" dangerouslySetInnerHTML={{ __html: report.content }} />
                                )}
                              </div>
                              <div className="flex flex-col gap-1 flex-shrink-0">
                                {report.file_path && <a href={report.file_path} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-[10px]">Descargar</a>}
                                <a href={`/admin/report/${report.id}`} className="text-cyan-400 hover:text-cyan-300 text-[10px]">
                                  Ver Completo
                                </a>
                                {isAdmin && <button onClick={() => handleDeleteReport(report.id, item.id)} className="text-red-400 hover:text-red-300 text-[10px]">Eliminar</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {showReportModal === item.id && (
                    <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                      <div className="bg-gradient-to-br from-[#040c1a] to-[#060f20] border border-cyan-500/20 rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
                        <h3 className="text-lg font-light text-white mb-4">Nuevo Reporte</h3>
                        
                        <div className="mb-4">
                          <label className="block text-sm text-cyan-400/70 mb-2">Tipo de Reporte</label>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setReportType('file')}
                              className={`flex-1 px-4 py-2 rounded text-sm ${reportType === 'file' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'bg-[#040c1a]/60 text-slate-400 border border-slate-700/30'}`}
                            >
                              Subir Archivo
                            </button>
                            <button
                              onClick={() => setReportType('text')}
                              className={`flex-1 px-4 py-2 rounded text-sm ${reportType === 'text' ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/25' : 'bg-[#040c1a]/60 text-slate-400 border border-slate-700/30'}`}
                            >
                              Escribir Texto
                            </button>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-sm text-cyan-400/70 mb-1">Nombre del Reporte</label>
                            <input
                              type="text"
                              value={newReport.name}
                              onChange={(e) => setNewReport({...newReport, name: e.target.value})}
                              className="w-full rounded-lg border border-cyan-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/15 placeholder:text-slate-700"
                              placeholder="Ej: Reporte Mensual Enero"
                            />
                          </div>

                          {reportType === 'file' ? (
                            <div>
                              <label className="block text-sm text-cyan-400/70 mb-1">Archivo (PDF, DOC, Imagen)</label>
                              <input
                                type="file"
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
                                onChange={(e) => setNewReport({...newReport, file: e.target.files[0]})}
                                className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/40 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-500/15 file:text-cyan-400 file:text-xs"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-sm text-cyan-400/70 mb-1">Contenido</label>
                              <div className="quill-dark">
                                <Suspense fallback={<div className="h-40 bg-[#040c1a]/60 rounded animate-pulse" />}>
                                  <ReactQuill
                                    theme="snow"
                                    value={newReport.content}
                                    onChange={(val) => setNewReport({...newReport, content: val})}
                                    placeholder="Escribe el contenido del reporte aquí..."
                                    style={{ background: 'rgba(4,12,26,0.6)', borderRadius: '0.5rem', color: '#cbd5e1' }}
                                  />
                                </Suspense>
                              </div>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm text-cyan-400/70 mb-1">Foto del Reporte (opcional)</label>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => setNewReport({...newReport, photo: e.target.files[0]})}
                              className="w-full rounded border border-cyan-500/15 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 focus:border-cyan-400/40 focus:outline-none file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:bg-cyan-500/15 file:text-cyan-400 file:text-xs"
                            />
                          </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                          <button
                            onClick={() => handleUploadReport(item.id)}
                            className="flex-1 rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-400 transition-all hover:bg-cyan-500/20"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => {
                              setShowReportModal(null);
                              setNewReport({ name: '', content: '', file: null, photo: null });
                            }}
                            className="flex-1 rounded-lg bg-[#040c1a]/60 px-4 py-2 text-sm text-slate-400 transition-all hover:bg-[#030b18]/60"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Section: Empleados Inactivos */}
      {(() => {
        const inactiveList = executiveReport.filter(item => {
          if ((item.status || 'active') !== 'inactive') return false;
          const genderMatch = filterGender === 'all' || (item.gender || '') === filterGender;
          const age = parseInt(item.age);
          const ageMatch = filterAge === 'all' || (filterAge === '18-35' && age >= 18 && age <= 35) || (filterAge === '36-54' && age >= 36 && age <= 54) || (filterAge === '55-80' && age >= 55 && age <= 80);
          return genderMatch && (isNaN(age) ? filterAge === 'all' : ageMatch);
        });
        const totalInactive = executiveReport.filter(i => (i.status || 'active') === 'inactive').length;
        if (totalInactive === 0) return null;
        return (
          <>
            <div className="mt-8 mb-2 flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <h2 className="text-base sm:text-lg font-light text-slate-500">Empleados Inactivos</h2>
              </div>
              <span className="text-[10px] text-slate-600">{inactiveList.length} empleados</span>
            </div>
            <div className="space-y-3">
              {inactiveList.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-red-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] overflow-hidden shadow-xl shadow-red-500/5 transition-all opacity-80"
                >
                  <div
                    onClick={() => toggleItem(item.id)}
                    className="flex cursor-pointer items-center justify-between px-3 py-2 sm:p-4 transition-all hover:bg-red-500/5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="h-2 w-2 rounded-full flex-shrink-0 bg-red-400" title="Inactivo" />
                        <h3 className="text-sm sm:text-base font-medium text-slate-400 truncate">{item.name}</h3>
                        <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-xs text-red-400">
                          {item.position || 'Sin posición'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {item.main_amount > 0 || item.secondary_amount > 0 ? (
                          <span>
                            ${formatMoney(item.main_amount)} / ${formatMoney(item.secondary_amount)}
                          </span>
                        ) : (
                          <span>
                            Inicio: {item.start_date || 'Pendiente'}
                          </span>
                        )}
                      </div>
                    </div>
                    <svg
                      className={`h-5 w-5 text-red-400/50 transition-transform ${expandedItems[item.id] ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  
                  {expandedItems[item.id] && (
                    <div className="border-t border-red-500/10 bg-[#030b18]/60">
                      <div className="p-3 sm:p-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Photo & Info Section */}
                          <div className="lg:col-span-1">
                          <h4 className="text-sm font-medium text-red-500/50 mb-3">Información del Empleado</h4>
                          <div className="rounded-lg border border-red-500/10 bg-[#040c1a]/70 p-3 sm:p-4">
                            {/* Photos Row: Profile LEFT, ID RIGHT */}
                            <div className="flex items-start justify-center gap-4 mb-3">
                              {/* Profile Photo - LEFT */}
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-red-500/40 mb-1">Foto Perfil</p>
                                <div className="w-full aspect-square max-w-[140px] mx-auto rounded-lg border border-red-500/10 bg-[#030b18]/60 flex items-center justify-center overflow-hidden">
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} onClick={() => setImagePreview(item.photo)} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                                  ) : (
                                    <svg className="h-8 w-8 text-red-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                    </svg>
                                  )}
                                </div>
                                {isAdmin && (
                                  <label className="mt-2 cursor-pointer rounded border border-red-500/20 bg-red-500/8 px-3 py-1 text-[10px] text-red-400 transition-all hover:bg-red-500/15 inline-block">
                                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0], 'profile')} className="hidden" />
                                    Subir Foto
                                  </label>
                                )}
                              </div>

                              {/* ID Photo - RIGHT */}
                              <div className="flex-1 text-center">
                                <p className="text-[10px] text-red-500/60 mb-1">Identificación</p>
                                <div className="w-full aspect-[3/2] max-w-[210px] mx-auto rounded-lg border border-red-500/15 bg-[#030b18]/60 flex items-center justify-center overflow-hidden">
                                  {item.id_photo ? (
                                    <img src={item.id_photo} alt="ID" onClick={() => setImagePreview(item.id_photo)} className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" />
                                  ) : (
                                    <svg className="h-8 w-8 text-red-500/20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0" />
                                    </svg>
                                  )}
                                </div>
                                {isAdmin && (
                                  <label className="mt-2 cursor-pointer rounded border border-red-500/20 bg-red-500/8 px-3 py-1 text-[10px] text-red-400 transition-all hover:bg-red-500/15 inline-block">
                                    <input type="file" accept="image/*" onChange={(e) => handlePhotoUpload(item.id, e.target.files[0], 'id')} className="hidden" />
                                    Subir ID
                                  </label>
                                )}
                              </div>
                            </div>
                          </div>
                          </div>

                        {/* Expediente Section */}
                        <div className="col-span-1 md:col-span-2 lg:col-span-2">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-medium text-red-400/70">Expediente</h4>
                            {isAdmin && !editingReport[item.id] && (
                              <button
                                onClick={() => handleReportEdit(item.id, '_editing', true)}
                                className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1 text-xs text-red-400 transition-all hover:bg-red-500/15"
                              >
                                Editar
                              </button>
                            )}
                          </div>
                          <div className="space-y-4">
                            {/* Section 1: Información Personal */}
                            <div className="rounded-lg border border-red-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                              <h5 className="text-xs font-medium text-red-500/50 mb-3 pb-2 border-b border-red-500/10">Información Personal</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {[
                                  { label: 'Nombre', field: 'name', value: item.name },
                                  { label: 'Edad', field: 'age', value: item.age, type: 'number' },
                                  { label: 'Estado Civil', field: 'estado_civil', value: item.estado_civil },
                                  { label: 'Teléfono', field: 'phone', value: item.phone },
                                  { label: 'Dirección', field: 'address', value: item.address },
                                  { label: 'Idiomas', field: 'idiomas', value: item.idiomas },
                                  { label: 'Fecha Ingreso', field: 'start_date', value: item.start_date, type: 'date' },
                                ].map(({ label, field, value, type }) => (
                                  <div key={field}>
                                    <label className="block text-[10px] text-red-500/60 mb-1">{label}</label>
                                    {isAdmin && editingReport[item.id] ? (
                                      <input
                                        type={type || 'text'}
                                        value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                        onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                        className="w-full rounded border border-red-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-red-400/40 focus:outline-none"
                                      />
                                    ) : (
                                      <div
                                        onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                        className={`w-full rounded border border-red-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-red-500/20' : ''}`}
                                      >
                                        {value || '-'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 2: Información Laboral */}
                            <div className="rounded-lg border border-red-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                              <h5 className="text-xs font-medium text-red-500/50 mb-3 pb-2 border-b border-red-500/10">Información Laboral</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {[{ label: 'No. Empleado', field: 'employee_number', value: item.employee_number }].map(({ label, field, value }) => (
                                  <div key={field}>
                                    <label className="block text-[10px] text-red-500/60 mb-1">{label}</label>
                                    {isAdmin && editingReport[item.id] ? (
                                      <input
                                        type="text"
                                        value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                        onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                        placeholder="Ej: EMP-001"
                                        className="w-full rounded border border-red-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-red-400/40 focus:outline-none"
                                      />
                                    ) : (
                                      <div
                                        onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                        className={`w-full rounded border border-red-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-red-500/20' : ''}`}
                                      >
                                        {value || '-'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {[
                                  { label: 'Área / Puesto', field: 'position', value: item.position },
                                  { label: 'Accesos (sistema, llaves, cámaras)', field: 'accesos', value: item.accesos },
                                  { label: 'Sueldo Actual', field: 'sueldo', value: item.sueldo, type: 'number' },
                                  { label: 'Prestaciones / Costo', field: 'prestaciones', value: item.prestaciones },
                                  { label: 'Estado', field: 'status', value: item.status, isSelect: true },
                                ].map(({ label, field, value, type, isSelect }) => (
                                  <div key={field}>
                                    <label className="block text-[10px] text-red-500/60 mb-1">{label}</label>
                                    {isAdmin && editingReport[item.id] ? (
                                      isSelect ? (
                                        <select
                                          value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || 'active')}
                                          onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                          className="w-full rounded border border-red-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-red-400/40 focus:outline-none"
                                        >
                                          <option value="active">Activo</option>
                                          <option value="eventual">Eventual</option>
                                          <option value="vacation">Vacaciones</option>
                                          <option value="inactive">Inactivo</option>
                                        </select>
                                      ) : (
                                        <input
                                          type={type || 'text'}
                                          value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                          onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                          className="w-full rounded border border-red-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-red-400/40 focus:outline-none"
                                        />
                                      )
                                    ) : (
                                      <div
                                        onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                        className={`w-full rounded border border-red-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-red-500/20' : ''}`}
                                      >
                                        {field === 'sueldo' && value ? `$${parseFloat(value).toLocaleString()}` : (value || '-')}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Section 3: Emergencia / Médico */}
                            <div className="rounded-lg border border-red-500/15 bg-[#060d1f]/60 p-3 sm:p-4">
                              <h5 className="text-xs font-medium text-red-500/50 mb-3 pb-2 border-b border-red-500/10">Emergencia / Información Médica</h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                {[
                                  { label: 'Contacto de Emergencia', field: 'emergency_contact', value: item.emergency_contact },
                                  { label: 'Tipo de Sangre', field: 'tipo_sangre', value: item.tipo_sangre },
                                  { label: 'Alergias', field: 'alergias', value: item.alergias },
                                  { label: 'Enfermedades', field: 'enfermedades', value: item.enfermedades },
                                ].map(({ label, field, value }) => (
                                  <div key={field}>
                                    <label className="block text-[10px] text-red-500/60 mb-1">{label}</label>
                                    {isAdmin && editingReport[item.id] ? (
                                      <input
                                        type="text"
                                        value={editingReport[item.id][field] !== undefined ? editingReport[item.id][field] : (value || '')}
                                        onChange={(e) => handleReportEdit(item.id, field, e.target.value)}
                                        className="w-full rounded border border-red-500/15 bg-[#030b18]/60 px-2 py-1.5 text-xs text-slate-200 focus:border-red-400/40 focus:outline-none"
                                      />
                                    ) : (
                                      <div
                                        onClick={isAdmin ? () => handleReportEdit(item.id, field, value || '') : undefined}
                                        className={`w-full rounded border border-red-500/10 bg-[#040c1a]/50 px-2 py-1.5 text-xs text-slate-300 ${isAdmin ? 'cursor-pointer hover:border-red-500/20' : ''}`}
                                      >
                                        {value || '-'}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {isAdmin && editingReport[item.id] && (
                              <button
                                onClick={() => saveReportChanges(item.id)}
                                className="w-full rounded-lg border border-red-500/25 bg-red-500/10 px-4 py-2.5 text-sm text-red-400 transition-all hover:bg-red-500/20 font-medium"
                              >
                                Guardar Cambios
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                      {/* Individual Employee Map */}
                      {item.address && (
                        <div className="mt-4 px-3 sm:px-4 pb-3">
                          <h4 className="text-sm font-medium text-red-400/70 mb-2">Ubicación</h4>
                          {empCoords[item.id] ? (
                            <LocationMap
                              markers={[{ lat: empCoords[item.id][0], lng: empCoords[item.id][1], color: 'red', popup: `<b>${item.name}</b><br/><small>${item.address}</small>` }]}
                              height={200}
                              zoom={14}
                            />
                          ) : (
                            <div className="h-[200px] rounded-xl border border-red-500/20 bg-[#030b18]/60 flex items-center justify-center">
                              <p className="text-xs text-slate-500">{geoLoading ? 'Geocodificando dirección...' : 'No se pudo localizar la dirección'}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Reportes | Notas tabs */}
                      <div className="mt-6 pt-6 border-t border-red-500/10">
                        {/* Tab bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <div className="flex rounded-lg overflow-hidden border border-slate-700/40">
                            <button
                              onClick={() => { setEmpTabs(p => ({ ...p, [item.id]: 'reportes' })); stopNoteRefresh(item.id); if (!employeeReports[item.id]) loadReports(item.id); }}
                              className={`px-3 py-1.5 text-[10px] transition-all ${(empTabs[item.id] || 'reportes') === 'reportes' ? 'bg-red-500/15 text-red-400' : 'bg-[#040c1a]/60 text-slate-500 hover:text-slate-300'}`}
                            >
                              Reportes ({(employeeReports[item.id] || []).length})
                            </button>
                            {isAdmin && (
                              <button
                                onClick={() => { setEmpTabs(p => ({ ...p, [item.id]: 'notas' })); loadEmpNote(item.id); startNoteRefresh(item.id); }}
                                className={`px-3 py-1.5 text-[10px] transition-all ${(empTabs[item.id] || 'reportes') === 'notas' ? 'bg-amber-500/15 text-amber-400' : 'bg-[#040c1a]/60 text-slate-500 hover:text-slate-300'}`}
                              >
                                Nota
                              </button>
                            )}
                          </div>
                          <div className="flex gap-2">
                            {(empTabs[item.id] || 'reportes') === 'reportes' && (
                              <>
                                <div className="flex rounded-lg overflow-hidden border border-red-500/20">
                                  <button onClick={() => setReportViewMode('list')} className={`px-2 py-1 text-[10px] ${reportViewMode === 'list' ? 'bg-red-500/15 text-red-400' : 'bg-[#040c1a]/60 text-slate-500'}`}>Lista</button>
                                  <button onClick={() => setReportViewMode('grid')} className={`px-2 py-1 text-[10px] ${reportViewMode === 'grid' ? 'bg-red-500/15 text-red-400' : 'bg-[#040c1a]/60 text-slate-500'}`}>Bloques</button>
                                </div>
                                {isAdmin && (
                                  <button onClick={() => setShowReportModal(item.id)} className="rounded-lg border border-red-500/20 bg-red-500/8 px-3 py-1.5 text-xs text-red-400 transition-all hover:bg-red-500/15">+ Nuevo</button>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Content based on active tab */}
                        {(empTabs[item.id] || 'reportes') === 'notas' && isAdmin ? (
                          <div className="relative">
                            <textarea
                              value={empNotes[item.id]?.content || ''}
                              onChange={(e) => handleNoteChange(item.id, e.target.value)}
                              placeholder="Escribe notas sobre este empleado..."
                              className="w-full h-40 rounded-lg border border-amber-500/20 bg-[#030b18]/60 px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:border-amber-400/50 focus:outline-none resize-none"
                            />
                            {empNoteSaving[item.id] && (
                              <div className="absolute top-2 right-2 text-[10px] text-amber-400 animate-pulse">Guardando...</div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {(employeeReports[item.id] || []).length === 0 ? (
                              <p className="text-xs text-slate-600 py-4 text-center">Sin reportes aún</p>
                            ) : reportViewMode === 'list' ? (
                              (employeeReports[item.id] || []).filter(r => r.report_name?.toLowerCase().includes(reportSearch.toLowerCase())).map(report => (
                                <div key={report.id} className="flex items-center justify-between rounded-lg border border-red-500/10 bg-[#040c1a]/60 px-3 py-2">
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm text-slate-300 truncate">{report.report_name}</p>
                                    <p className="text-[10px] text-slate-600">{new Date(report.created_at).toLocaleDateString('es-MX')}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {report.file_path && (
                                      <a href={report.file_path} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300">Ver</a>
                                    )}
                                    {isAdmin && (
                                      <button onClick={() => handleDeleteReport(report.id, item.id)} className="text-xs text-red-500/50 hover:text-red-400">Eliminar</button>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {(employeeReports[item.id] || []).filter(r => r.report_name?.toLowerCase().includes(reportSearch.toLowerCase())).map(report => (
                                  <div key={report.id} className="rounded-lg border border-red-500/10 bg-[#040c1a]/60 p-3">
                                    <p className="text-sm text-slate-300 truncate mb-1">{report.report_name}</p>
                                    <p className="text-[10px] text-slate-600 mb-2">{new Date(report.created_at).toLocaleDateString('es-MX')}</p>
                                    <div className="flex gap-2">
                                      {report.file_path && (
                                        <a href={report.file_path} target="_blank" rel="noopener noreferrer" className="text-xs text-red-400 hover:text-red-300">Ver</a>
                                      )}
                                      {isAdmin && (
                                        <button onClick={() => handleDeleteReport(report.id, item.id)} className="text-xs text-red-500/50 hover:text-red-400">Eliminar</button>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        );
      })()}

      {/* General Map - All Employees */}
      <div className="mt-6 rounded-2xl border border-cyan-500/15 bg-gradient-to-br from-[#040c1a] to-[#060f20] p-4 sm:p-6 shadow-lg shadow-cyan-500/5">
        <h2 className="mb-3 text-lg sm:text-xl font-light text-white">Mapa General de Empleados</h2>
        <div className="flex flex-wrap items-center gap-3 mb-3 text-xs text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-green-500 inline-block" />
            <span>Activo</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-blue-500 inline-block" />
            <span>Eventual</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-orange-500 inline-block" />
            <span>Vacaciones</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-500 inline-block" />
            <span>Inactivo</span>
          </div>
          <span className="ml-2">{allEmpMarkers.length > 0 ? `${allEmpMarkers.length} empleado${allEmpMarkers.length !== 1 ? 's' : ''} con dirección registrada` : 'Agrega direcciones a los empleados para verlos en el mapa'}</span>
        </div>
        {geoLoading ? (
          <div className="h-[400px] rounded-xl border border-cyan-500/20 bg-[#030b18]/60 flex items-center justify-center">
            <p className="text-xs text-slate-500">Geocodificando direcciones...</p>
          </div>
        ) : allEmpMarkers.length > 0 ? (
          <LocationMap markers={allEmpMarkers} height={400} zoom={11} />
        ) : (
          <div className="h-[400px] rounded-xl border border-cyan-500/20 bg-[#030b18]/60 flex items-center justify-center">
            <p className="text-xs text-slate-500">Sin direcciones registradas</p>
          </div>
        )}
      </div>


      {/* Image Preview Lightbox */}
      {imagePreview && (
        <div className="fixed inset-0 bg-[#030712]/90 backdrop-blur-sm flex items-center justify-center z-[60] p-4" onClick={() => setImagePreview(null)}>
          <div className="relative max-w-4xl max-h-[90vh]">
            <button onClick={() => setImagePreview(null)} className="absolute -top-8 right-0 text-white/60 text-sm hover:text-cyan-400 transition-colors">Cerrar</button>
            <img src={imagePreview} alt="Preview" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

export default Employees;
