import { useState, useEffect, useRef, useCallback, lazy, Suspense, useMemo } from 'react';
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
    name: '', email: '', phone: '', age: '', gender: '', position: '', experience: '', currentJob: '', address: '', estudios: '',
    application_date: new Date().toISOString().split('T')[0], start_date: '' 
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
  const [empTabs, setEmpTabs] = useState({});
  const [empAttendance, setEmpAttendance] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState({});
  const [payrollPeriodOffset, setPayrollPeriodOffset] = useState({});
  const [empSchedules, setEmpSchedules] = useState({});
  const [scheduleDrafts, setScheduleDrafts] = useState({});
  const [savingSchedule, setSavingSchedule] = useState({});
  const [todayAttendanceMap, setTodayAttendanceMap] = useState({});
  const [todayAttendanceByName, setTodayAttendanceByName] = useState({});
  const [srEmployeeIds, setSrEmployeeIds] = useState([]);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'administrador';
  
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [empNotes, setEmpNotes] = useState({});       
  const [empNoteSaving, setEmpNoteSaving] = useState({}); 
  const noteTimers = useRef({});  
  const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  const formatMoney = (amount) => {
    const num = parseFloat(amount || 0);
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const normalizeName = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const normalizeEmployeeId = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (/^\d+$/.test(raw)) return String(parseInt(raw, 10));
    return raw;
  };
  const getLocalDateYmd = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const getWeekIndexFromJsDay = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1); // Lun=0 ... Dom=6

  const getEmpKey = (item) => normalizeEmployeeId(item?.employee_number || item?.id || '');
  const getAttendanceEmpKey = (item) => normalizeEmployeeId(item?.employee_number || '');

  const getAttendanceForItem = (item) => {
    const key = getAttendanceEmpKey(item);
    if (key && todayAttendanceMap[key]) return todayAttendanceMap[key];
    const normalizedName = normalizeName(item?.name);
    if (todayAttendanceByName[normalizedName]) return todayAttendanceByName[normalizedName];
    // Fallback: buscar por prefijo (ej: "YARELI" dentro de "YARELI CORTEZ")
    if (normalizedName) {
      const entry = Object.entries(todayAttendanceByName).find(([k]) => k.startsWith(normalizedName));
      if (entry) return entry[1];
    }
    return null;
  };

  const getScheduleForItem = (item) => {
    const key = getEmpKey(item);
    if (key && empSchedules[key]) return empSchedules[key];
    return empSchedules[normalizeName(item?.name)] || {};
  };

  const getScheduleDraftForItem = (item) => {
    const key = getEmpKey(item);
    if (key && scheduleDrafts[key]) return scheduleDrafts[key];
    return scheduleDrafts[normalizeName(item?.name)] || {};
  };

  const updateScheduleDraft = (item, dayIndex, field, value) => {
    const key = getEmpKey(item);
    const nameKey = normalizeName(item?.name);

    setScheduleDrafts(prev => {
      const source = prev[key] || prev[nameKey] || {};
      const next = {
        ...source,
        [dayIndex]: {
          ...(source[dayIndex] || {}),
          [field]: value
        }
      };

      if (field === 'entry' || field === 'exit') {
        next[dayIndex].is_day_off = !next[dayIndex].entry && !next[dayIndex].exit;
      }

      return { ...prev, [key]: next, [nameKey]: next };
    });
  };

  const getPayrollDates = (offsetWeeks = 0) => {
    const today = new Date();
    const currentDay = today.getDay(); 
    const daysToLastThursday = (currentDay >= 4) ? currentDay - 4 : currentDay + 3;
    const end = new Date(today);
    end.setDate(today.getDate() - daysToLastThursday + (offsetWeeks * 7));
    const start = new Date(end);
    start.setDate(end.getDate() - 6); 
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      label: `${start.toLocaleDateString('es-MX', {day:'2-digit', month:'short'})} al ${end.toLocaleDateString('es-MX', {day:'2-digit', month:'short'})}`
    };
  };

  const calculatePayroll = (attendanceRecords, item) => {
    // Usar daily_salary si existe, si no usar un valor predeterminado o calcularlo
    const dailyRate = parseFloat(item.daily_salary) || 0;
    const baseWeekly = dailyRate * 7; // 7 días pagados (descanso incluido)
    let absences = 0, late = 0, totalExtraMinutes = 0, daysWorked = 0;
    attendanceRecords.forEach(rec => {
      if (rec.status === 'absent') absences++;
      if (rec.status === 'late') late++;
      if (['present', 'late', 'early_leave'].includes(rec.status)) daysWorked++;
      if (rec.minutes_worked > 480) totalExtraMinutes += (rec.minutes_worked - 480);
    });
    const extraHours = Math.floor(totalExtraMinutes / 60);
    const extraPay = extraHours * 50; 
    const deduction = absences * dailyRate;
    return { baseWeekly, dailyRate, daysWorked, absences, late, extraHours, extraPay, deduction, netPay: baseWeekly - deduction + extraPay };
  };

  const loadExecutiveReport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/get.php`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setExecutiveReport(result.data || []);
    } catch (error) { console.error('Error al cargar reporte:', error); }
  };

  useEffect(() => { loadExecutiveReport(); }, []);

  useEffect(() => {
    if (executiveReport.length === 0) return;
    setGeoLoading(true);
    const run = async () => {
      const markers = []; const coordsMap = {};
      for (const emp of executiveReport) {
        if (emp.address) {
          const coords = await geocodeAddress(emp.address);
          if (coords) {
            coordsMap[emp.id] = coords;
            const markerColor = emp.status === 'inactive' ? 'red' : emp.status === 'vacation' ? 'orange' : 'green';
            markers.push({ lat: coords[0], lng: coords[1], color: markerColor, label: emp.name, popup: `<b>${emp.name}</b><br/>${emp.address}` });
          }
        }
      }
      setEmpCoords(coordsMap); setAllEmpMarkers(markers); setGeoLoading(false);
    };
    run();
  }, [executiveReport]);

  const handlePhotoUpload = async (id, file, type) => {
    const formData = new FormData();
    formData.append('photo', file); formData.append('employee_id', id); formData.append('photo_type', type);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/upload-photo.php`, { method: 'POST', credentials: 'include', body: formData });
      if ((await res.json()).success) { alert('Subido'); loadExecutiveReport(); }
    } catch (error) { console.error('Error upload:', error); }
  };

  const loadAttendance = async (empId, srId, name, offset = 0) => {
    setAttendanceLoading(prev => ({ ...prev, [empId]: true }));
    const dates = getPayrollDates(offset);
    try {
      const params = new URLSearchParams({ id: empId, sr_id: srId || '', name: name || '', start: dates.start, end: dates.end });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-attendance.php?${params.toString()}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) { 
        setEmpAttendance(p => ({ ...p, [empId]: result.data })); 
        setPayrollPeriodOffset(p => ({...p, [empId]: offset})); 
      }
    } catch (error) { console.error('Error attendance:', error); }
    setAttendanceLoading(p => ({ ...p, [empId]: false }));
  };

  const loadSchedules = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=schedules`, { credentials: 'include' });
      const result = await res.json();
      if (!result.success) return;

      const mapped = {};
      (result.schedules || []).forEach((s) => {
        const empKey = normalizeEmployeeId(s.employee_id || '');
        const nameKey = normalizeName(s.employee_name);
        const day = Number(s.day_of_week);
        const row = {
          entry: s.scheduled_start || '',
          exit: s.scheduled_end || '',
          is_day_off: Number(s.is_day_off) === 1 || (!s.scheduled_start && !s.scheduled_end)
        };

        if (!Number.isNaN(day) && day >= 0 && day <= 6) {
          if (empKey) {
            if (!mapped[empKey]) mapped[empKey] = {};
            mapped[empKey][day] = row;
          }
          if (nameKey) {
            if (!mapped[nameKey]) mapped[nameKey] = {};
            mapped[nameKey][day] = row;
          }
        }
      });

      setEmpSchedules(mapped);
      setScheduleDrafts(mapped);
    } catch (error) {
      console.error('Error loading schedules:', error);
    }
  };

  const loadTodayAttendance = async () => {
    const today = getLocalDateYmd();
    try {
      const url = `${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=attendance&range=today&date=${today}`;
      const res = await fetch(url, { credentials: 'include' });
      const result = await res.json();
      if (!result.success) return;

      const byId = {};
      const byName = {};
      const sourceIds = new Set();
      (result.attendance || []).forEach((row) => {
        const sourceIdRaw = String(row.employee_id ?? '').trim();
        const idKey = normalizeEmployeeId(row.employee_id || '');
        const websiteIdKey = normalizeEmployeeId(row.website_employee_id || '');
        const nameKey = normalizeName(row.display_name || row.website_employee_name || row.employee_name);
        const sourceNameKey = normalizeName(row.employee_name);
        if (sourceIdRaw) sourceIds.add(sourceIdRaw.toUpperCase());
        if (idKey) byId[idKey] = row;
        if (websiteIdKey) byId[websiteIdKey] = row;
        if (nameKey) byName[nameKey] = row;
        if (sourceNameKey) byName[sourceNameKey] = row;
      });

      setTodayAttendanceMap(byId);
      setTodayAttendanceByName(byName);
      setSrEmployeeIds(Array.from(sourceIds).sort((a, b) => a.localeCompare(b, 'es', { numeric: true, sensitivity: 'base' })));
    } catch (error) {
      console.error('Error loading today attendance:', error);
    }
  };

  const saveSchedule = async (item) => {
    const key = getEmpKey(item);
    const draft = getScheduleDraftForItem(item);
    if (!key || !draft) return;

    setSavingSchedule(prev => ({ ...prev, [item.id]: true }));
    try {
      const schedules = Array.from({ length: 7 }, (_, day) => {
        const row = draft[day] || {};
        return {
          day_of_week: day,
          start: row.entry || null,
          end: row.exit || null,
          is_day_off: row.is_day_off || (!row.entry && !row.exit)
        };
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_schedule',
          employee_id: key,
          employee_name: item.name || '',
          schedules
        })
      });

      const result = await res.json();
      if (!result.success) {
        alert('No se pudo guardar el horario');
        return;
      }

      setEmpSchedules(prev => ({
        ...prev,
        [key]: draft,
        [normalizeName(item.name)]: draft
      }));
      alert('Horario guardado');
    } catch (error) {
      console.error('Error saving schedule:', error);
      alert('Error al guardar horario');
    } finally {
      setSavingSchedule(prev => ({ ...prev, [item.id]: false }));
    }
  };

  useEffect(() => {
    if (executiveReport.length === 0) return;

    loadSchedules();
    loadTodayAttendance();

    const timer = setInterval(loadTodayAttendance, 60000);
    return () => clearInterval(timer);
  }, [executiveReport.length]);

  const loadNotes = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php?employee_id=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.notes?.length > 0) {
        const note = data.notes[0];
        noteTimers.current[`note_id_${id}`] = note.id;
        setEmpNotes(p => ({ ...p, [id]: { id: note.id, content: note.content || '' } }));
      }
    } catch (e) { console.error('Error loading notes:', e); }
  };

  const loadReports = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-reports-mysqli.php?employee_id=${id}`, { credentials: 'include' });
      const result = await res.json();
      console.log('📄 Reports loaded for employee', id, ':', result);
      if (result.success) {
        // Asegurar que file_path tenga la URL completa
        const reports = (result.reports || []).map(r => ({
          ...r,
          file_path: r.file_path?.startsWith('http') ? r.file_path : `${import.meta.env.VITE_API_URL}${r.file_path}`
        }));
        console.log('📄 Processed reports:', reports);
        setEmployeeReports(p => ({ ...p, [id]: reports }));
      }
    } catch (error) { console.error('Error reports:', error); }
  };

  const saveReportChanges = useCallback(async (id) => {
    const changes = editingReport[id];
    if (!changes) return;

    // Validate employee_number if present
    const normalizedChanges = { ...changes };
    if (Object.prototype.hasOwnProperty.call(normalizedChanges, 'employee_number')) {
      const rawInput = String(normalizedChanges.employee_number ?? '').trim().toUpperCase();
      normalizedChanges.employee_number = rawInput;

      if (rawInput && srEmployeeIds.length > 0) {
        const validSrIds = new Set(srEmployeeIds.map((value) => normalizeEmployeeId(value)));
        const normalizedInput = normalizeEmployeeId(rawInput);
        if (!validSrIds.has(normalizedInput)) {
          alert(`ID SoftRestaurant no encontrado: ${rawInput}. Selecciona uno válido de la lista.`);
          return;
        }
      }
    }

    try {
      // Process each field change individually
      for (const [field, value] of Object.entries(normalizedChanges)) {
        if (field.startsWith('_')) continue;
        
        const res = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/update.php`, {
          method: 'POST',
          credentials: 'include', 
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, field, value })
        });

        const result = await res.json().catch(() => ({ error: 'Network error' }));
        
        if (!res.ok || result?.success === false) {
          throw new Error(result?.error || `Error guardando campo ${field}`);
        }
      }
      
      // Refresh data and clear editing state
      await Promise.all([
        loadExecutiveReport(),
        loadTodayAttendance()
      ]);
      
      setEditingReport(prev => {
        const newState = { ...prev };
        delete newState[id];
        return newState;
      });
      
      alert('Datos del empleado actualizados exitosamente');
    } catch (error) { 
      console.error('Error update:', error);
      alert(`Error al actualizar los datos del empleado: ${error.message}`);
    }
  }, [editingReport, srEmployeeIds, loadExecutiveReport, loadTodayAttendance]);

  const handleReportEdit = useCallback((id, field, value) => {
    setEditingReport(prev => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        [field]: value
      }
    }));
  }, []);

  const handleUploadReport = async (employeeId) => {
    if (!newReport.name) return alert('El nombre del reporte es obligatorio');
    const formData = new FormData();
    formData.append('employee_id', employeeId);
    formData.append('report_name', newReport.name);
    formData.append('report_type', reportType);
    if (reportType === 'file' && newReport.file) {
      formData.append('file', newReport.file);
    } else if (reportType === 'text' && newReport.content) {
      formData.append('content', newReport.content);
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/upload-report.php`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });
      const result = await res.json();
      if (result.success) {
        alert('Reporte subido exitosamente');
        setShowReportModal(null);
        setNewReport({ name: '', content: '', file: null, photo: null });
        loadReports(employeeId);
      } else {
        alert('Error al subir reporte: ' + (result.error || 'Desconocido'));
      }
    } catch (error) {
      console.error('Error upload report:', error);
      alert('Error al subir el reporte');
    }
  };

  const handleNoteChange = (id, content) => {
    setEmpNotes(p => ({ ...p, [id]: { ...(p[id] || {}), content } }));
    clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = setTimeout(async () => {
      setEmpNoteSaving(p => ({ ...p, [id]: true }));
      try {
        const existingNoteId = noteTimers.current[`note_id_${id}`];
        let payload;
        if (existingNoteId) {
          payload = { action: 'update', id: existingNoteId, content, title: 'Nota de administración', color: 'default' };
        } else {
          payload = { action: 'create', employee_id: id, content, title: 'Nota de administración', color: 'default' };
        }
        const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success && data.note?.id) {
          noteTimers.current[`note_id_${id}`] = data.note.id;
          setEmpNotes(p => ({ ...p, [id]: { ...(p[id] || {}), id: data.note.id } }));
        }
      } catch (error) { console.error('Error note:', error); }
      setEmpNoteSaving(p => ({ ...p, [id]: false }));
    }, 800);
  };

  const handleAddPerson = async () => {
    if (!newPerson.name || !newPerson.position) return alert('Nombre y puesto obligatorios');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/create.php`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPerson)
      });
      if ((await res.json()).success) { setShowAddForm(false); loadExecutiveReport(); }
    } catch (error) { console.error('Error create:', error); }
  };

  const _handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/employees/delete.php`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id })
      });
      loadExecutiveReport();
    } catch (error) { console.error('Error delete:', error); }
  };

  const handleDragEnd = async () => {
    setDragging(false);
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;
    
    const items = [...executiveReport];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);
    
    dragItem.current = null;
    dragOverItem.current = null;
    
    // Update sort_order in backend
    try {
      const updates = items.map((item, index) => ({ id: item.id, sort_order: index }));
      await fetch(`${import.meta.env.VITE_API_URL}/employees/reorder.php`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
      });
      setExecutiveReport(items);
    } catch (error) {
      console.error('Error reordering:', error);
    }
  };

  const filterList = (item, statusArr) => {
    const s = item.status || 'active';
    if (!statusArr.includes(s)) return false;
    if (filterGender !== 'all' && (item.gender || '') !== filterGender) return false;
    const age = parseInt(item.age);
    if (filterAge === '18-35' && (age < 18 || age > 35)) return false;
    if (filterAge === '36-54' && (age < 36 || age > 54)) return false;
    if (filterAge === '55-80' && age < 55) return false;
    return true;
  };

  const activeList = executiveReport.filter(i => filterList(i, ['active', 'vacation', 'eventual']));
  const inactiveList = executiveReport.filter(i => filterList(i, ['inactive']));

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-light text-white">Recursos Humanos</h1>
        {isAdmin && <button onClick={() => setShowAddForm(!showAddForm)} className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg hover:bg-cyan-500/20 transition-all font-bold text-xs">+ AGREGAR PERSONA</button>}
      </div>

      {showAddForm && (
        <div className="bg-[#040c1a] border border-cyan-500/20 p-6 rounded-2xl animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Nombre completo" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <input type="text" placeholder="Puesto" value={newPerson.position} onChange={e => setNewPerson({...newPerson, position: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <input type="date" value={newPerson.start_date} onChange={e => setNewPerson({...newPerson, start_date: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <button onClick={handleAddPerson} className="md:col-span-3 bg-cyan-500/20 text-cyan-400 py-3 rounded-xl font-bold border border-cyan-500/30">DAR DE ALTA</button>
          </div>
        </div>
      )}

      <div className="flex gap-4 bg-[#040c1a] p-4 rounded-xl border border-slate-800">
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none">
          <option value="all">Género: Todos</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
        </select>
        <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none">
          <option value="all">Edad: Todas</option><option value="18-35">18-35 años</option><option value="36-54">36-54 años</option><option value="55-80">55+ años</option>
        </select>
      </div>

      {/* Resumen de estado actual del personal */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const now = new Date();
          const todayIndex = getWeekIndexFromJsDay(now.getDay());

          const working = activeList.filter(item => {
            const todayAttendance = getAttendanceForItem(item);
            return Boolean(todayAttendance?.clock_in) && !todayAttendance?.clock_out;
          }).length;
          
          const scheduled = activeList.filter(item => {
            const daySchedule = getScheduleForItem(item)?.[todayIndex];
            const todayAttendance = getAttendanceForItem(item);
            // Cuenta como programado si tiene horario no-descanso O si ya hizo clock_in hoy
            return (daySchedule && !daySchedule.is_day_off) || Boolean(todayAttendance?.clock_in);
          }).length;
          
          const late = activeList.filter(item => {
            const daySchedule = getScheduleForItem(item)?.[todayIndex];
            const todayAttendance = getAttendanceForItem(item);
            if (!daySchedule || daySchedule.is_day_off) return false;

            if (todayAttendance?.minutes_late > 0) return true;

            if (todayAttendance?.clock_in) return false;

            const [entryHour, entryMin] = (daySchedule.entry || '00:00').split(':').map(Number);
            const entryTime = new Date();
            entryTime.setHours(entryHour, entryMin, 0, 0);
            return now > entryTime;
          }).length;
          
          // Descanso: sin horario configurado Y sin asistencia hoy, O con is_day_off=1
          const off = activeList.filter(item => {
            const daySchedule = getScheduleForItem(item)?.[todayIndex];
            const todayAttendance = getAttendanceForItem(item);
            if (todayAttendance?.clock_in) return false; // tiene asistencia = no está en descanso
            return !daySchedule || daySchedule.is_day_off;
          }).length;
          
          return [
            { label: 'Trabajando', count: working, color: 'green', icon: 'ACT' },
            { label: 'Programados', count: scheduled, color: 'blue', icon: 'PROG' },
            { label: 'Tarde/Ausentes', count: late, color: 'red', icon: 'TARDE' },
            { label: 'Descanso', count: off, color: 'slate', icon: 'DESC' }
          ].map(stat => (
            <div key={stat.label} className={`bg-[#040c1a] border border-${stat.color}-500/20 p-4 rounded-xl text-center`}>
              <div className={`text-2xl mb-1 text-${stat.color}-400`}>{stat.icon}</div>
              <div className={`text-xl font-bold text-${stat.color}-400`}>{stat.count}</div>
              <div className="text-[9px] text-slate-400 uppercase">{stat.label}</div>
            </div>
          ));
        })()}
      </div>

      <div className="space-y-3">
        {activeList.map((item, index) => {
          const expanded = expandedItems[item.id];
          const activeTab = empTabs[item.id] || 'info';
          const records = empAttendance[item.id] || [];
          const payroll = calculatePayroll(records, item);
          const dates = getPayrollDates(payrollPeriodOffset[item.id] || 0);

          return (
            <div key={item.id} 
                 draggable={isAdmin && !isTouchDevice} 
                 onDragStart={() => { dragItem.current = index; setDragging(true); }}
                 onDragEnter={() => { dragOverItem.current = index; }}
                 onDragEnd={handleDragEnd}
                 onDragOver={(e) => e.preventDefault()}
                 className={`bg-[#040c1a] border border-slate-800 rounded-2xl overflow-hidden transition-all ${dragging ? 'opacity-50' : 'shadow-xl'}`}>
              
              <div onClick={() => setExpandedItems(p => ({...p, [item.id]: !expanded}))} className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <span className={`w-2 h-2 rounded-full ${item.status === 'vacation' ? 'bg-amber-500' : 'bg-green-500'}`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-medium text-sm">{item.name}</h3>
                      {/* Estado actual del día */}
                      {(() => {
                        const now = new Date();
                        const todayIndex = getWeekIndexFromJsDay(now.getDay());
                        const daySchedule = getScheduleForItem(item)?.[todayIndex];
                        const todayAttendance = getAttendanceForItem(item);

                        if (todayAttendance?.clock_in && !todayAttendance?.clock_out) {
                          return <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full border border-green-500/30">Trabajando</span>;
                        }

                        if (todayAttendance?.clock_in && todayAttendance?.clock_out) {
                          return <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full border border-blue-500/30">Turno terminado</span>;
                        }
                        
                        if (daySchedule) {
                          if (daySchedule.is_day_off) {
                            return <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/30">Descanso</span>;
                          }
                          const [entryHour, entryMin] = (daySchedule.entry || '00:00').split(':').map(Number);
                          const entryTime = new Date();
                          entryTime.setHours(entryHour, entryMin, 0, 0);

                          if (now > entryTime) {
                            return <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">No llegó</span>;
                          }

                          return <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">Esperando</span>;
                        }

                        return <span className="text-xs bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full border border-slate-500/30">Sin horario</span>;
                      })()}
                    </div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-widest">{item.position} ? Diario: ${formatMoney(item.daily_salary || 0)}</p>
                  </div>
                </div>
                <div className="text-right flex items-center gap-4">
                  <div className="hidden sm:block">
                    <p className="text-[8px] text-slate-500 uppercase font-bold">Estimado Semanal</p>
                    <p className="text-sm font-bold text-green-400">${formatMoney(payroll.netPay)}</p>
                  </div>
                  <span className={`text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>

              {expanded && (
                <div className="p-5 border-t border-slate-800/60 bg-black/20">
                  <div className="flex gap-2 mb-5 border-b border-slate-800 pb-px">
                    {['info', 'horario', 'nomina', 'reportes', 'notas'].map(t => (
                      <button key={t} onClick={() => {
                        setEmpTabs(p => ({...p, [item.id]: t}));
                        if(t === 'nomina') loadAttendance(item.id, item.employee_number, item.name);
                        if(t === 'reportes') loadReports(item.id);
                        if(t === 'notas') loadNotes(item.id);
                      }} className={`px-4 py-2 text-[9px] font-black uppercase tracking-tighter transition-all ${activeTab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                        {t === 'info' ? 'Expediente' : t === 'horario' ? 'Horario' : t === 'nomina' ? 'Nómina' : t}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                      {/* Columna izquierda: todos los campos */}
                      <div className="space-y-4">
                        {/* Foto + ID */}
                        <div className="flex gap-4 items-center bg-black/20 p-4 rounded-xl border border-slate-800">
                          <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex-shrink-0">
                            {item.photo ? <img src={item.photo} className="w-full h-full object-cover" alt="" /> : <div className="h-full flex items-center justify-center text-xl opacity-20">👤</div>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-[10px] font-bold text-cyan-400 mb-1">Foto de perfil</div>
                            <input type="file" onChange={e => handlePhotoUpload(item.id, e.target.files[0], 'profile')} className="text-[9px] text-cyan-400" />
                          </div>
                        </div>

                        {/* Datos personales */}
                        <div className="bg-black/20 p-4 rounded-xl border border-slate-800 space-y-3">
                          <p className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">Datos Personales</p>
                          <div className="grid grid-cols-1 gap-3">
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Nombre Completo</label>
                              <input type="text" value={editingReport[item.id]?.name ?? item.name ?? ''} onChange={e => handleReportEdit(item.id, 'name', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs transition-colors" placeholder="Nombre del empleado" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Puesto</label>
                                <input type="text" value={editingReport[item.id]?.position ?? item.position ?? ''} onChange={e => handleReportEdit(item.id, 'position', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="Ej: Mesero" />
                              </div>
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Edad</label>
                                <input type="number" value={editingReport[item.id]?.age ?? item.age ?? ''} onChange={e => handleReportEdit(item.id, 'age', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="25" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Teléfono</label>
                                <input type="text" value={editingReport[item.id]?.phone ?? item.phone ?? ''} onChange={e => handleReportEdit(item.id, 'phone', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="622-123-4567" />
                              </div>
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Email</label>
                                <input type="email" value={editingReport[item.id]?.email ?? item.email ?? ''} onChange={e => handleReportEdit(item.id, 'email', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="correo@email.com" />
                              </div>
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Dirección (aparece en el mapa)</label>
                              <input type="text" value={editingReport[item.id]?.address ?? item.address ?? ''} onChange={e => handleReportEdit(item.id, 'address', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="Calle, Colonia, San Carlos, Sonora" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Estado Civil</label>
                                <select value={editingReport[item.id]?.estado_civil ?? item.estado_civil ?? ''} onChange={e => handleReportEdit(item.id, 'estado_civil', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs">
                                  <option value="">Seleccionar</option>
                                  <option value="Soltero">Soltero/a</option>
                                  <option value="Casado">Casado/a</option>
                                  <option value="Divorciado">Divorciado/a</option>
                                  <option value="Viudo">Viudo/a</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Tipo de Sangre</label>
                                <input type="text" value={editingReport[item.id]?.tipo_sangre ?? item.tipo_sangre ?? ''} onChange={e => handleReportEdit(item.id, 'tipo_sangre', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="O+, A-, etc." />
                              </div>
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Contacto de Emergencia</label>
                              <input type="text" value={editingReport[item.id]?.emergency_contact ?? item.emergency_contact ?? ''} onChange={e => handleReportEdit(item.id, 'emergency_contact', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="Nombre - Teléfono" />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Fecha de Contratación</label>
                              <input type="date" value={editingReport[item.id]?.hire_date ?? item.hire_date ?? ''} onChange={e => handleReportEdit(item.id, 'hire_date', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" />
                            </div>
                          </div>
                        </div>

                        {/* Datos laborales */}
                        <div className="bg-black/20 p-4 rounded-xl border border-slate-800 space-y-3">
                          <p className="text-[8px] text-amber-500/50 font-bold uppercase tracking-widest">Datos Laborales</p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Sueldo Diario</label>
                              <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">ID SoftRestaurant</label>
                              <input
                                type="text"
                                value={editingReport[item.id]?.employee_number ?? item.employee_number ?? ''}
                                onChange={e => handleReportEdit(item.id, 'employee_number', e.target.value.toUpperCase())}
                                className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs"
                                placeholder="Ej: 22 o YARELI CORTEZ"
                                list="sr-id-options"
                              />
                              <datalist id="sr-id-options">
                                {srEmployeeIds.map((srId) => (<option key={srId} value={srId} />))}
                              </datalist>
                            </div>
                          </div>
                        </div>

                        {/* Liquidación */}
                        {useMemo(() => {
                          const salario = parseFloat(editingReport[item.id]?.daily_salary ?? item.daily_salary ?? 0);
                          const hireDate = item.hire_date || item.start_date;
                          const hoy = new Date();
                          const inicio = hireDate ? new Date(hireDate) : null;
                          const anios = inicio ? Math.max(0, (hoy - inicio) / (1000 * 60 * 60 * 24 * 365.25)) : 0;
                          const aniosEnteros = Math.floor(anios);
                          
                          // Valores editables desde el estado
                          const tresMeses = parseFloat(editingReport[item.id]?.liquid_tres_meses ?? item.liquid_tres_meses ?? salario * 90);
                          const veinteDiasPorAnio = parseFloat(editingReport[item.id]?.liquid_veinte_dias ?? item.liquid_veinte_dias ?? salario * 20 * aniosEnteros);
                          const vacaciones = parseFloat(editingReport[item.id]?.liquid_vacaciones ?? item.liquid_vacaciones ?? (aniosEnteros >= 1 ? salario * (6 + Math.floor((aniosEnteros - 1) / 2) * 2) : 0));
                          const primaVacacional = parseFloat(editingReport[item.id]?.liquid_prima_vacacional ?? item.liquid_prima_vacacional ?? vacaciones * 0.25);
                          const aguinaldo = parseFloat(editingReport[item.id]?.liquid_aguinaldo ?? item.liquid_aguinaldo ?? salario * 15);
                          
                          const totalDespido = tresMeses + veinteDiasPorAnio + vacaciones + primaVacacional + aguinaldo;
                          const totalRenuncia = vacaciones + primaVacacional + aguinaldo;
                          
                          return (
                            <div className="bg-black/20 p-4 rounded-xl border border-red-900/30 space-y-3">
                              <p className="text-[8px] text-red-400/70 font-bold uppercase tracking-widest">Liquidación</p>
                              {!salario || !inicio ? (
                                <p className="text-[10px] text-slate-600">Requiere sueldo diario y fecha de contratación</p>
                              ) : (
                                <>
                                  <div className="text-[10px] text-slate-500 mb-1">Antigüedad: <span className="text-white font-bold">{aniosEnteros} año{aniosEnteros !== 1 ? 's' : ''} {Math.round((anios - aniosEnteros) * 12)} mes{Math.round((anios - aniosEnteros) * 12) !== 1 ? 'es' : ''}</span></div>
                                  
                                  {/* Por Despido */}
                                  <div className="bg-red-950/30 rounded-lg p-3 border border-red-900/20 space-y-1.5">
                                    <p className="text-[8px] text-red-400 font-black uppercase tracking-widest mb-2">Por Despido (Art. 50 LFT)</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">3 meses de salario</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_tres_meses ?? item.liquid_tres_meses ?? tresMeses}
                                        onChange={e => handleReportEdit(item.id, 'liquid_tres_meses', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">20 días × {aniosEnteros} año{aniosEnteros !== 1 ? 's' : ''}</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_veinte_dias ?? item.liquid_veinte_dias ?? veinteDiasPorAnio}
                                        onChange={e => handleReportEdit(item.id, 'liquid_veinte_dias', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Vacaciones proporcionales</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_vacaciones ?? item.liquid_vacaciones ?? vacaciones}
                                        onChange={e => handleReportEdit(item.id, 'liquid_vacaciones', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Prima vacacional (25%)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_prima_vacacional ?? item.liquid_prima_vacacional ?? primaVacacional}
                                        onChange={e => handleReportEdit(item.id, 'liquid_prima_vacacional', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Aguinaldo (15 días)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_aguinaldo ?? item.liquid_aguinaldo ?? aguinaldo}
                                        onChange={e => handleReportEdit(item.id, 'liquid_aguinaldo', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black border-t border-red-900/30 pt-1.5 mt-1">
                                      <span className="text-red-300">TOTAL DESPIDO</span>
                                      <span className="text-red-300 text-sm">${formatMoney(totalDespido)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Por Renuncia */}
                                  <div className="bg-orange-950/20 rounded-lg p-3 border border-orange-900/20 space-y-1.5">
                                    <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest mb-2">Por Renuncia (Art. 48 LFT)</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Vacaciones proporcionales</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_vacaciones ?? item.renuncia_vacaciones ?? vacaciones}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_vacaciones', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Prima vacacional (25%)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_prima_vacacional ?? item.renuncia_prima_vacacional ?? primaVacacional}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_prima_vacacional', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Aguinaldo (15 días)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_aguinaldo ?? item.renuncia_aguinaldo ?? aguinaldo}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_aguinaldo', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black border-t border-orange-900/30 pt-1.5 mt-1">
                                      <span className="text-orange-300">TOTAL RENUNCIA</span>
                                      <span className="text-orange-300 text-sm">${formatMoney(totalRenuncia)}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="text-[10px] text-slate-500 mb-1">Antigüedad: <span className="text-white font-bold">{aniosEnteros} año{aniosEnteros !== 1 ? 's' : ''} {Math.round((anios - aniosEnteros) * 12)} mes{Math.round((anios - aniosEnteros) * 12) !== 1 ? 'es' : ''}</span></div>
                                  
                                  {/* Por Despido */}
                                  <div className="bg-red-950/30 rounded-lg p-3 border border-red-900/20 space-y-1.5">
                                    <p className="text-[8px] text-red-400 font-black uppercase tracking-widest mb-2">Por Despido (Art. 50 LFT)</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">3 meses de salario</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_tres_meses ?? item.liquid_tres_meses ?? tresMeses}
                                        onChange={e => handleReportEdit(item.id, 'liquid_tres_meses', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">20 días × {aniosEnteros} año{aniosEnteros !== 1 ? 's' : ''}</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_veinte_dias ?? item.liquid_veinte_dias ?? veinteDiasPorAnio}
                                        onChange={e => handleReportEdit(item.id, 'liquid_veinte_dias', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Vacaciones proporcionales</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_vacaciones ?? item.liquid_vacaciones ?? vacaciones}
                                        onChange={e => handleReportEdit(item.id, 'liquid_vacaciones', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Prima vacacional (25%)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_prima_vacacional ?? item.liquid_prima_vacacional ?? primaVacacional}
                                        onChange={e => handleReportEdit(item.id, 'liquid_prima_vacacional', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Aguinaldo (15 días)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.liquid_aguinaldo ?? item.liquid_aguinaldo ?? aguinaldo}
                                        onChange={e => handleReportEdit(item.id, 'liquid_aguinaldo', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-red-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black border-t border-red-900/30 pt-1.5 mt-1">
                                      <span className="text-red-300">TOTAL DESPIDO</span>
                                      <span className="text-red-300 text-sm">${formatMoney(totalDespido)}</span>
                                    </div>
                                  </div>
                                  
                                  {/* Por Renuncia */}
                                  <div className="bg-orange-950/20 rounded-lg p-3 border border-orange-900/20 space-y-1.5">
                                    <p className="text-[8px] text-orange-400 font-black uppercase tracking-widest mb-2">Por Renuncia (Art. 48 LFT)</p>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Vacaciones proporcionales</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_vacaciones ?? item.renuncia_vacaciones ?? vacaciones}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_vacaciones', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Prima vacacional (25%)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_prima_vacacional ?? item.renuncia_prima_vacacional ?? primaVacacional}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_prima_vacacional', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px]">
                                      <span className="text-slate-400">Aguinaldo (15 días)</span>
                                      <input 
                                        type="number" 
                                        value={editingReport[item.id]?.renuncia_aguinaldo ?? item.renuncia_aguinaldo ?? aguinaldo}
                                        onChange={e => handleReportEdit(item.id, 'renuncia_aguinaldo', e.target.value)}
                                        className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded text-xs outline-none focus:border-orange-400 text-right"
                                      />
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black border-t border-orange-900/30 pt-1.5 mt-1">
                                      <span className="text-orange-300">TOTAL RENUNCIA</span>
                                      <span className="text-orange-300 text-sm">${formatMoney(totalRenuncia)}</span>
                                    </div>
                                  </div>
                                  
                                  <p className="text-[8px] text-slate-600 italic">* Edita los valores manualmente si es necesario</p>
                                </>
                              );
                            }, [item.id, item.daily_salary, item.hire_date, item.start_date, item.liquid_tres_meses, item.liquid_veinte_dias, item.liquid_vacaciones, item.liquid_prima_vacacional, item.liquid_aguinaldo, item.renuncia_vacaciones, item.renuncia_prima_vacacional, item.renuncia_aguinaldo, editingReport])()}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Employees;

                  {activeTab === 'nomina' && (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-[#040c1a] p-3 rounded-xl border border-slate-800">
                        <p className="text-[10px] text-green-400 font-bold uppercase tracking-widest">{dates.label}</p>
                        <div className="flex gap-2">
                          <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) - 1)} className="bg-slate-800/60 px-3 py-1 rounded text-[9px] text-white">← SEMANA ANTERIOR</button>
                          <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, 0)} className="bg-slate-800/60 px-3 py-1 rounded text-[9px] text-white">ACTUAL</button>
                        </div>
                      </div>

                      {/* Datos de Liquidación Editables */}
                      <div className="bg-black/20 p-4 rounded-xl border border-red-900/30 space-y-3">
                        <p className="text-[8px] text-red-400/70 font-bold uppercase tracking-widest">Datos de Liquidación</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Sueldo Diario</label>
                            <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="0.00" />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Días Trabajados Totales</label>
                            <input type="number" value={editingReport[item.id]?.dias_trabajados_total ?? item.dias_trabajados_total ?? ''} onChange={e => handleReportEdit(item.id, 'dias_trabajados_total', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" placeholder="0" />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Fecha de Baja</label>
                            <input type="date" value={editingReport[item.id]?.fecha_baja ?? item.fecha_baja ?? ''} onChange={e => handleReportEdit(item.id, 'fecha_baja', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" />
                          </div>
                          <div>
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Motivo de Baja</label>
                            <select value={editingReport[item.id]?.motivo_baja ?? item.motivo_baja ?? ''} onChange={e => handleReportEdit(item.id, 'motivo_baja', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs">
                              <option value="">-- seleccionar --</option>
                              <option value="despido">Despido</option>
                              <option value="renuncia">Renuncia</option>
                            </select>
                          </div>
                          <div className="md:col-span-2">
                            <label className="text-[8px] text-slate-500 font-bold uppercase">Notas de Liquidación</label>
                            <textarea value={editingReport[item.id]?.liquidacion_notas ?? item.liquidacion_notas ?? ''} onChange={e => handleReportEdit(item.id, 'liquidacion_notas', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs resize-none" rows="2" placeholder="Observaciones..." />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-slate-900 to-black p-5 rounded-2xl border border-green-500/20 shadow-2xl">
                          <h4 className="text-[9px] font-black text-slate-500 uppercase mb-4 border-b border-slate-800 pb-2">Resumen</h4>
                          <div className="space-y-2 text-[11px]">
                            <div className="flex justify-between text-slate-400"><span>Sueldo Base</span><span>${formatMoney(payroll.baseWeekly)}</span></div>
                            <div className="flex justify-between text-red-400"><span>Faltas ({payroll.absences})</span><span>-${formatMoney(payroll.deduction)}</span></div>
                            <div className="flex justify-between text-cyan-400"><span>Extras ({payroll.extraHours}h)</span><span>+${formatMoney(payroll.extraPay)}</span></div>
                            <div className="pt-2 border-t border-slate-800 flex justify-between font-black text-white text-base"><span>TOTAL NETO</span><span>${formatMoney(payroll.netPay)}</span></div>
                          </div>
                        </div>
                        <div className="lg:col-span-2 space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                          {attendanceLoading[item.id] ? <div className="py-10 text-center animate-pulse text-[10px] text-slate-600">Sincronizando reloj...</div> : 
                            records.map((r, i) => (
                              <div key={i} className="flex justify-between items-center p-2 bg-white/5 rounded-xl border border-slate-800/50">
                                <span className="text-[9px] text-slate-300 font-bold uppercase">{new Date(r.date+'T00:00:00').toLocaleDateString('es-MX', {weekday:'short', day:'2-digit'})}</span>
                                <span className="text-[9px] text-slate-500">{r.clock_in?.split(' ')[1] || '--:--'} - {r.clock_out?.split(' ')[1] || '--:--'}</span>
                                <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${r.status === 'present' ? 'text-green-400 border border-green-400/20' : 'text-red-400 border border-red-400/20'}`}>{r.status === 'present' ? 'ASISTIÓ' : 'FALTA'}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reportes' && (
                    <div className="space-y-4">
                      {/* Header con foto e ID */}
                      <div className="flex gap-5 items-center bg-gradient-to-br from-cyan-500/5 to-transparent p-5 rounded-2xl border border-cyan-500/20">
                        <div className="w-20 h-20 rounded-full bg-slate-800 overflow-hidden border-2 border-cyan-500/30 shadow-xl">
                          {item.photo ? (
                            <img src={item.photo} className="w-full h-full object-cover" alt={item.name} />
                          ) : (
                            <div className="h-full flex items-center justify-center text-3xl opacity-20">👤</div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{item.name}</h3>
                          <p className="text-cyan-400 text-sm font-mono">ID: {item.employee_number || `EMP-${item.id}`}</p>
                          <p className="text-slate-400 text-xs mt-1">{item.position}</p>
                        </div>
                      </div>

                      {/* Controles */}
                      <div className="flex gap-2 items-center bg-black/20 p-3 rounded-xl border border-slate-800">
                        <button onClick={() => setReportViewMode('list')} className={`px-3 py-2 text-[9px] font-bold rounded-lg transition-all ${reportViewMode === 'list' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>📋 LISTA</button>
                        <button onClick={() => setReportViewMode('grid')} className={`px-3 py-2 text-[9px] font-bold rounded-lg transition-all ${reportViewMode === 'grid' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>🔲 BLOQUES</button>
                        <input type="text" placeholder="Buscar reportes..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="flex-1 bg-black/40 border border-slate-700 p-2 rounded-lg text-xs text-white outline-none focus:border-cyan-500 transition-all" />
                        <button onClick={() => setShowReportModal(item.id)} className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg text-[10px] font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">+ NUEVO REPORTE</button>
                      </div>

                      {/* Lista de reportes */}
                      <div className={reportViewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                        {(employeeReports[item.id] || []).filter(r => !reportSearch || r.report_name.toLowerCase().includes(reportSearch.toLowerCase())).map(r => (
                          <div key={r.id} className="group bg-gradient-to-br from-slate-900 to-black p-5 border border-slate-800 rounded-xl hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10">
                            <div className="flex flex-col gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-white font-bold group-hover:text-cyan-400 transition-colors mb-1">{r.report_name}</p>
                                <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                {r.report_type && <p className="text-[9px] text-slate-600 mt-1">Tipo: {r.report_type}</p>}
                              </div>
                              <div className="flex gap-2">
                                <a 
                                  href={r.file_path} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  onClick={(e) => {
                                    console.log('🔗 Opening report:', r.report_name, 'Path:', r.file_path);
                                    if (!r.file_path || r.file_path === 'null' || r.file_path === 'undefined') {
                                      e.preventDefault();
                                      alert('Este reporte no tiene archivo adjunto');
                                    }
                                  }}
                                  className="flex-1 bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold text-center hover:bg-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/50"
                                >
                                  📄 VER REPORTE
                                </a>
                                {r.content && (
                                  <button 
                                    onClick={() => {
                                      console.log('📝 Content:', r.content);
                                      alert(r.content.replace(/<[^>]*>/g, '').substring(0, 200) + '...');
                                    }}
                                    className="bg-slate-700 text-slate-300 px-3 py-2.5 rounded-lg text-xs font-bold hover:bg-slate-600 transition-all"
                                  >
                                    �
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                        {(!employeeReports[item.id] || employeeReports[item.id].length === 0) && (
                          <div className="col-span-full text-center py-12 bg-black/20 rounded-xl border border-slate-800">
                            <p className="text-slate-500 text-sm">📁 Sin reportes aún</p>
                            <p className="text-slate-600 text-xs mt-2">Haz clic en "+ NUEVO REPORTE" para agregar uno</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'notas' && (
                    <div className="relative">
                      <textarea value={empNotes[item.id]?.content || ''} onChange={e => handleNoteChange(item.id, e.target.value)} placeholder="Notas privadas de administración..." className="w-full h-32 bg-black/40 border border-amber-500/20 rounded-xl p-4 text-[11px] text-slate-300 outline-none focus:border-amber-500/40 shadow-inner" />
                      <div className="absolute bottom-3 right-4 text-[8px] text-slate-600 font-bold uppercase">{empNoteSaving[item.id] ? 'Sincronizando...' : 'Auto-guardado'}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {inactiveList.length > 0 && (
        <div className="mt-10 space-y-3">
          <h2 className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] px-2 flex items-center gap-3"><span className="h-px bg-slate-800 flex-1" /> HISTORIAL DE BAJAS <span className="h-px bg-slate-800 flex-1" /></h2>
          {inactiveList.map((item, index) => {
            const expanded = expandedItems[item.id];
            const activeTab = empTabs[item.id] || 'info';
            const records = empAttendance[item.id] || [];
            const payroll = calculatePayroll(records, item);
            const dates = getPayrollDates(payrollPeriodOffset[item.id] || 0);
            return (
              <div key={item.id} className="bg-[#040c1a] border border-red-900/20 rounded-2xl overflow-hidden transition-all shadow-xl opacity-60 hover:opacity-100">
                <div onClick={() => setExpandedItems(p => ({...p, [item.id]: !expanded}))} className="p-4 flex justify-between items-center cursor-pointer hover:bg-white/5 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="w-2 h-2 rounded-full bg-red-700" />
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm">{item.name}</h3>
                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-900/40">Baja</span>
                      </div>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">{item.position} · Diario: ${formatMoney(item.daily_salary || 0)}</p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-4">
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); _handleDeleteEmployee(item.id, item.name); }} className="text-[8px] text-red-900 font-black hover:text-red-500 px-2 py-1 rounded border border-red-900/20 hover:border-red-500/30">ELIMINAR</button>}
                    <span className={`text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {expanded && (
                  <div className="p-5 border-t border-slate-800/60 bg-black/20">
                    <div className="flex gap-2 mb-5 border-b border-slate-800 pb-px">
                      {['info', 'nomina', 'reportes', 'notas'].map(t => (
                        <button key={t} onClick={() => {
                          setEmpTabs(p => ({...p, [item.id]: t}));
                          if(t === 'nomina') loadAttendance(item.id, item.employee_number, item.name);
                          if(t === 'reportes') loadReports(item.id);
                          if(t === 'notas') loadNotes(item.id);
                        }} className={`px-4 py-2 text-[9px] font-black uppercase tracking-tighter transition-all ${activeTab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          {t === 'info' ? 'Expediente' : t === 'nomina' ? 'Nómina' : t}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'info' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-5">
                          <div className="flex gap-5 items-center bg-black/20 p-4 rounded-xl border border-slate-800">
                            <div className="w-16 h-16 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
                              {item.photo ? <img src={item.photo} className="w-full h-full object-cover" alt="" /> : <div className="h-full flex items-center justify-center text-xl opacity-20">👤</div>}
                            </div>
                            <div className="flex-1">
                              <div className="text-xs font-bold text-cyan-400">ID: {item.employee_number || `EMP-${item.id}`}</div>
                              <input type="file" onChange={e => handlePhotoUpload(item.id, e.target.files[0], 'profile')} className="text-[9px] text-cyan-400 mt-1" />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Sueldo Diario</label>
                              <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="bg-black/30 border-b border-slate-800 text-white w-full py-1 outline-none focus:border-cyan-500 text-xs" placeholder="0.00" />
                            </div>
                            <div>
                              <label className="text-[8px] text-slate-500 font-bold uppercase">Liquidación</label>
                              <input type="number" value={editingReport[item.id]?.main_amount ?? item.main_amount} onChange={e => handleReportEdit(item.id, 'main_amount', e.target.value)} className="bg-black/30 border-b border-slate-800 text-white w-full py-1 outline-none focus:border-cyan-500 text-xs" placeholder="0.00" />
                            </div>
                          </div>
                          <button onClick={() => saveReportChanges(item.id)} className="w-full bg-cyan-500/10 text-cyan-400 py-2 rounded-xl text-[10px] font-bold border border-cyan-500/20">GUARDAR EXPEDIENTE</button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'nomina' && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold">Período</p>
                            <p className="text-xs text-slate-300">{dates.label}</p>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) + 1)} className="text-[9px] text-slate-500 hover:text-white px-2 py-1 rounded border border-slate-800">← Anterior</button>
                            {(payrollPeriodOffset[item.id] || 0) > 0 && <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) - 1)} className="text-[9px] text-slate-500 hover:text-white px-2 py-1 rounded border border-slate-800">Siguiente →</button>}
                          </div>
                        </div>
                        {attendanceLoading[item.id] ? <div className="text-center text-slate-600 text-xs py-4">Cargando...</div> : (
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-black/30 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[8px] text-slate-500 uppercase">Sueldo semanal</p><p className="text-white font-bold text-sm">${formatMoney(payroll.baseWeekly)}</p></div>
                            <div className="bg-black/30 p-3 rounded-xl border border-slate-800 text-center"><p className="text-[8px] text-slate-500 uppercase">Neto estimado</p><p className="text-emerald-400 font-bold text-sm">${formatMoney(payroll.netPay)}</p></div>
                          </div>
                        )}
                      </div>
                    )}

                    {activeTab === 'reportes' && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="flex gap-2 items-center bg-black/20 p-3 rounded-xl border border-slate-800">
                          <input type="text" placeholder="Buscar reportes..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="flex-1 bg-black/40 border border-slate-700 p-2 rounded-lg text-xs text-white outline-none focus:border-cyan-500" />
                          <button onClick={() => setShowReportModal(item.id)} className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg text-[10px] font-bold border border-cyan-500/30 hover:bg-cyan-500/30">+ NUEVO</button>
                        </div>
                        <div className="space-y-3">
                          {(employeeReports[item.id] || []).filter(r => !reportSearch || r.report_name.toLowerCase().includes(reportSearch.toLowerCase())).map(r => (
                            <div key={r.id} className="bg-black/30 p-4 border border-slate-800 rounded-xl flex justify-between items-center">
                              <div>
                                <p className="text-sm text-white font-bold">{r.report_name}</p>
                                <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <a href={r.file_path} target="_blank" rel="noreferrer" className="bg-cyan-500/20 text-cyan-400 px-3 py-2 rounded-lg text-xs font-bold border border-cyan-500/30">Ver</a>
                            </div>
                          ))}
                          {(!employeeReports[item.id] || employeeReports[item.id].length === 0) && (
                            <div className="text-center py-8 text-slate-600 text-xs">Sin reportes</div>
                          )}
                        </div>
                        
                      </div>
                    )}

                    {activeTab === 'notas' && (
                      <div className="relative">
                        <textarea value={empNotes[item.id]?.content || ''} onChange={e => handleNoteChange(item.id, e.target.value)} placeholder="Notas privadas..." className="w-full h-32 bg-black/40 border border-amber-500/20 rounded-xl p-4 text-[11px] text-slate-300 outline-none focus:border-amber-500/40" />
                        <div className="absolute bottom-3 right-4 text-[8px] text-slate-600 font-bold uppercase">{empNoteSaving[item.id] ? 'Sincronizando...' : 'Auto-guardado'}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-black/40 border border-slate-800 rounded-3xl p-6 shadow-2xl mt-10">
        <h3 className="text-white text-sm font-light mb-5 tracking-widest flex items-center gap-3 uppercase"><span className="w-1 h-1 rounded-full bg-cyan-400" /> Ubicación del Personal</h3>
        {geoLoading ? <div className="h-60 flex flex-col items-center justify-center text-[10px] text-slate-600 animate-pulse font-black uppercase">GENERANDO MAPA...</div> : <div className="rounded-2xl overflow-hidden border border-slate-800"><LocationMap markers={allEmpMarkers} height={400} zoom={11} /></div>}
      </div>

      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 z-[9000] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#040c1a] border border-cyan-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl">
            <h3 className="text-white text-lg mb-6 font-light uppercase tracking-tighter">Subir Archivo</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre descriptivo" value={newReport.name} onChange={e => setNewReport({...newReport, name: e.target.value})} className="w-full bg-black/60 border border-slate-800 text-white px-4 py-2 rounded-xl text-xs outline-none focus:border-cyan-500" />
              <div className="flex gap-2">
                <button onClick={() => setReportType('file')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${reportType === 'file' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-black/40 border-slate-800 text-slate-600'}`}>ARCHIVO</button>
                <button onClick={() => setReportType('text')} className={`flex-1 py-2 rounded-lg text-[10px] font-bold border transition-all ${reportType === 'text' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400' : 'bg-black/40 border-slate-800 text-slate-600'}`}>TEXTO</button>
              </div>
              {reportType === 'file' ? (
                <input type="file" onChange={e => setNewReport({...newReport, file: e.target.files[0]})} className="w-full text-slate-500 text-[10px]" />
              ) : (
                <Suspense fallback={<div className="h-32 bg-black/40 rounded-xl animate-pulse" />}>
                  <ReactQuill theme="snow" value={newReport.content} onChange={val => setNewReport({...newReport, content: val})} />
                </Suspense>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => handleUploadReport(showReportModal)} className="flex-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 py-2 rounded-xl text-[10px] font-black">GUARDAR</button>
              <button onClick={() => setShowReportModal(null)} className="flex-1 bg-slate-800/50 text-slate-400 py-3 rounded-xl text-[10px] font-bold">CANCELAR</button>
            </div>
          </div>
        </div>
      )}

      {imagePreview && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex items-center justify-center p-4" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl border border-white/5" alt="Preview" />
          <button className="absolute top-6 right-6 text-white text-xl">✕</button>
        </div>
      )}
    </div>
  );
}

export default Employees;