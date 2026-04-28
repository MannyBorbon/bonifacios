import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
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
  const [newReport, setNewReport] = useState({ name: '', content: '', file: null });
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
  const [viewMode, setViewMode] = useState('personal'); // personal | horario | nomina
  const [scheduleWeekOffset, setScheduleWeekOffset] = useState(0);

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

  const normalizeName = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim().toUpperCase();
  const normalizeEmployeeId = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    return /^\d+$/.test(raw) ? String(parseInt(raw, 10)) : raw;
  };
  const markerPalette = ['#22c55e', '#06b6d4', '#3b82f6', '#a855f7', '#f97316', '#ec4899', '#D4AF37', '#ef4444'];
  const getMarkerColorForEmployee = (emp) => {
    const seed = `${emp?.id || ''}-${emp?.name || ''}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    return markerPalette[Math.abs(hash) % markerPalette.length];
  };
  const normalizeAvatarUrl = (raw) => {
    const value = String(raw || '').trim();
    if (!value) return '';
    if (/^https?:\/\//i.test(value)) return value;
    // Legacy rows may store only filename: employee_*.jpg / id_*.jpeg
    if (!value.includes('/') && /\.(png|jpe?g|gif|webp)$/i.test(value)) {
      return `/api/uploads/employee-photos/${value}`;
    }
    if (/^\/\//.test(value)) {
      try {
        if (typeof window !== 'undefined' && window.location?.protocol) {
          return `${window.location.protocol}${value}`;
        }
      } catch {
        // ignore and fallback below
      }
      return `https:${value}`;
    }
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(value)) {
      return `https://${value}`;
    }
    if (value.startsWith('/')) {
      try {
        if (typeof window !== 'undefined' && window.location?.origin) {
          return new URL(value, window.location.origin).href;
        }
      } catch {
        // ignore and fallback below
      }
      return value;
    }
    try {
      if (typeof window !== 'undefined' && window.location?.origin) {
        return new URL(value, window.location.origin).href;
      }
    } catch {
      // ignore and return raw value
    }
    return value;
  };
  const getEmployeeAvatar = (emp) => {
    const candidate = emp?.photo || emp?.profile_photo || emp?.avatar || '';
    return normalizeAvatarUrl(candidate);
  };
  const getEmployeeIdPhoto = (emp) => normalizeAvatarUrl(emp?.id_photo || '');

  const getLocalDateYmd = () => {
    const now = new Date();
    const tzOffsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  };

  const getEmpKey = (item) => normalizeEmployeeId(item?.employee_number || item?.id || '');
  const getWeekIndexFromJsDay = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1);

  const getAttendanceForItem = (item) => {
    const key = normalizeEmployeeId(item?.employee_number || '');
    if (key && todayAttendanceMap[key]) return todayAttendanceMap[key];
    const normalizedName = normalizeName(item?.name);
    return todayAttendanceByName[normalizedName] || null;
  };

  const getScheduleForItem = (item) => {
    const key = getEmpKey(item);
    if (key && empSchedules[key]) return empSchedules[key];
    return empSchedules[normalizeName(item?.name)] || {};
  };

  const getScheduleDraftForItem = (item) => {
    const key = getEmpKey(item);
    return scheduleDrafts[key] || scheduleDrafts[normalizeName(item?.name)] || {};
  };

  const getAttendanceDateYmd = (att) => {
    if (!att) return '';
    const raw = att.attendance_date || att.date || att.clock_in || '';
    return String(raw).slice(0, 10);
  };

  const isAttendanceToday = (att) => getAttendanceDateYmd(att) === getLocalDateYmd();

  const isWorkingNowForItem = (item, attendance = null) => {
    const att = attendance || getAttendanceForItem(item);
    if (!att?.clock_in || att?.clock_out) return false;
    if (!isAttendanceToday(att)) return false;

    // Si hay horario de salida definido y ya pasó, no contar como "trabajando"
    const now = new Date();
    const todayIndex = getWeekIndexFromJsDay(now.getDay());
    const sch = getScheduleForItem(item)?.[todayIndex];
    if (sch?.exit) {
      const [xH, xM] = sch.exit.split(':').map(Number);
      const endT = new Date();
      endT.setHours(xH, xM, 0, 0);
      if (now > endT) return false;
    }

    return true;
  };

  const updateScheduleDraft = (item, dayIndex, field, value) => {
    const key = getEmpKey(item);
    const nameKey = normalizeName(item?.name);
    setScheduleDrafts(prev => {
      const source = prev[key] || prev[nameKey] || {};
      const current = { ...(source[dayIndex] || {}), day_type: (source[dayIndex]?.day_type || 'laboral') };
      const next = { ...source, [dayIndex]: { ...current, [field]: value } };
      if (field === 'day_type') {
        if (value !== 'laboral') {
          next[dayIndex].entry = '';
          next[dayIndex].exit = '';
        }
        next[dayIndex].is_day_off = value !== 'laboral';
      }
      if (field === 'entry' || field === 'exit') {
        next[dayIndex].is_day_off = !next[dayIndex].entry && !next[dayIndex].exit;
        if (next[dayIndex].entry || next[dayIndex].exit) next[dayIndex].day_type = 'laboral';
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
    const start = new Date(end); start.setDate(end.getDate() - 6); 
    return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0], label: `${start.toLocaleDateString('es-MX', {day:'2-digit', month:'short'})} al ${end.toLocaleDateString('es-MX', {day:'2-digit', month:'short'})}` };
  };

  const calculatePayroll = (attendanceRecords, item) => {
    const dailyRate = parseFloat(item.daily_salary) || 0;
    const baseWeekly = dailyRate * 7; 
    let absences = 0, totalExtraMinutes = 0;
    attendanceRecords.forEach(rec => {
      if (rec.status === 'absent') absences++;
      if (rec.minutes_worked > 480) totalExtraMinutes += (rec.minutes_worked - 480);
    });
    const extraHours = Math.floor(totalExtraMinutes / 60);
    const deduction = absences * dailyRate;
    const extraPay = extraHours * 50; 
    return { baseWeekly, absences, extraHours, extraPay, deduction, netPay: baseWeekly - deduction + extraPay };
  };

  const loadExecutiveReport = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/get.php`, { credentials: 'include' });
      const result = await response.json();
      if (result.success) setExecutiveReport(result.data || []);
    } catch (error) { console.error('Error al cargar reporte:', error); }
  };

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
            const markerColor = emp.status === 'inactive' ? '#ef4444' : getMarkerColorForEmployee(emp);
            markers.push({
              lat: coords[0],
              lng: coords[1],
              color: markerColor,
              avatar: getEmployeeAvatar(emp),
              label: emp.name,
              popup: `<b>${emp.name}</b><br/>${emp.position || ''}<br/>${emp.address || ''}`
            });
          }
        }
      }
      setEmpCoords(coordsMap); setAllEmpMarkers(markers); setGeoLoading(false);
    };
    run();
  }, [executiveReport]);

  const handleReportEdit = (id, field, value) => {
    setEditingReport(p => ({ ...p, [id]: { ...(p[id] || {}), [field]: value } }));
  };

  const saveReportChanges = async (id) => {
    const changes = editingReport[id]; if (!changes) return;
    try {
      for (const [field, value] of Object.entries(changes)) {
        await fetch(`${import.meta.env.VITE_API_URL}/executive-report/update.php`, {
          method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, field, value })
        });
      }
      await loadExecutiveReport();
      setEditingReport(p => { const n = {...p}; delete n[id]; return n; });
      alert('Datos guardados exitosamente');
    } catch { alert('Error al guardar los cambios'); }
  };

  const handlePhotoUpload = async (id, file, type) => {
    const formData = new FormData();
    formData.append('photo', file); formData.append('employee_id', id); formData.append('photo_type', type);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/upload-photo.php`, { method: 'POST', credentials: 'include', body: formData });
      if ((await res.json()).success) { alert('Foto actualizada'); loadExecutiveReport(); }
    } catch (error) { console.error('Error upload:', error); }
  };

  const openImagePreview = (e, src) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!src) return;
    setImagePreview(src);
  };

  const loadAttendance = async (empId, srId, name, offset = 0) => {
    setAttendanceLoading(p => ({ ...p, [empId]: true }));
    const dates = getPayrollDates(offset);
    try {
      const params = new URLSearchParams({ id: empId, sr_id: srId || '', name: name || '', start: dates.start, end: dates.end });
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-attendance.php?${params.toString()}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) { setEmpAttendance(p => ({ ...p, [empId]: result.data })); setPayrollPeriodOffset(p => ({...p, [empId]: offset})); }
    } catch (error) { console.error('Error attendance:', error); }
    setAttendanceLoading(p => ({ ...p, [empId]: false }));
  };

  const loadSchedules = useCallback(async () => {
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
          is_day_off: Number(s.is_day_off) === 1 || (!s.scheduled_start && !s.scheduled_end),
          day_type: s.day_type || (Number(s.is_day_off) === 1 ? 'descanso' : 'laboral')
        };
        if (!Number.isNaN(day) && day >= 0 && day <= 6) {
          if (empKey) { if (!mapped[empKey]) mapped[empKey] = {}; mapped[empKey][day] = row; }
          if (nameKey) { if (!mapped[nameKey]) mapped[nameKey] = {}; mapped[nameKey][day] = row; }
        }
      });
      setEmpSchedules(mapped); setScheduleDrafts(mapped);
    } catch (error) { console.error('Error schedules:', error); }
  }, []);

  const loadTodayAttendance = useCallback(async () => {
    const today = getLocalDateYmd();
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=attendance&range=today&date=${today}`, { credentials: 'include' });
      const result = await res.json();
      if (!result.success) return;
      const byId = {}; const byName = {}; const sourceIds = new Set();
      (result.attendance || []).forEach((row) => {
        const idKey = normalizeEmployeeId(row.employee_id || '');
        const nameKey = normalizeName(row.display_name || row.employee_name);
        if (row.employee_id) sourceIds.add(String(row.employee_id).toUpperCase());
        if (idKey) byId[idKey] = row;
        if (nameKey) byName[nameKey] = row;
      });
      setTodayAttendanceMap(byId); setTodayAttendanceByName(byName);
      setSrEmployeeIds(Array.from(sourceIds).sort());
    } catch (error) { console.error('Error today attendance:', error); }
  }, []);

  const saveSchedule = async (item) => {
    const key = getEmpKey(item);
    const draft = getScheduleDraftForItem(item);
    if (!key || !draft) return;
    setSavingSchedule(prev => ({ ...prev, [item.id]: true }));
    try {
      const schedules = Array.from({ length: 7 }, (_, day) => ({
        day_of_week: day,
        start: draft[day]?.day_type === 'laboral' ? (draft[day]?.entry || null) : null,
        end: draft[day]?.day_type === 'laboral' ? (draft[day]?.exit || null) : null,
        is_day_off: draft[day]?.day_type === 'laboral' ? false : true,
        day_type: draft[day]?.day_type || (draft[day]?.is_day_off ? 'descanso' : 'laboral')
      }));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'save_schedule', employee_id: key, employee_name: item.name || '', schedules })
      });
      if ((await res.json()).success) { setEmpSchedules(p => ({...p, [key]: draft})); alert('Horario guardado'); }
    } catch { alert('Error al guardar horario'); }
    setSavingSchedule(prev => ({ ...prev, [item.id]: false }));
  };

  useEffect(() => {
    loadExecutiveReport();
    loadSchedules();
    loadTodayAttendance();
    const timer = setInterval(loadTodayAttendance, 60000);
    return () => clearInterval(timer);
  }, [loadSchedules, loadTodayAttendance]);

  const loadNotes = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php?employee_id=${id}`, { credentials: 'include' });
      const data = await res.json();
      if (data.success && data.notes?.length > 0) setEmpNotes(p => ({ ...p, [id]: { id: data.notes[0].id, content: data.notes[0].content || '' } }));
    } catch (error) { console.error('Error loading notes:', error); }
  };

  const loadReports = async (id) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/get-reports-mysqli.php?employee_id=${id}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        const reports = (result.reports || []).map(r => ({ ...r, file_path: r.file_path?.startsWith('http') ? r.file_path : `${import.meta.env.VITE_API_URL}${r.file_path}` }));
        setEmployeeReports(p => ({ ...p, [id]: reports }));
      }
    } catch (error) { console.error('Error reports:', error); }
  };

  const handleUploadReport = async (employeeId) => {
    if (!newReport.name) return alert('El nombre es obligatorio');
    const formData = new FormData();
    formData.append('employee_id', employeeId); formData.append('report_name', newReport.name); formData.append('report_type', reportType);
    if (reportType === 'file' && newReport.file) formData.append('file', newReport.file);
    else if (reportType === 'text' && newReport.content) formData.append('content', newReport.content);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/upload-report.php`, { method: 'POST', credentials: 'include', body: formData });
      if ((await res.json()).success) { setShowReportModal(null); setNewReport({name:'', content:'', file:null}); loadReports(employeeId); alert('Reporte guardado'); }
    } catch { alert('Error al subir'); }
  };

  const handleNoteChange = (id, content) => {
    setEmpNotes(p => ({ ...p, [id]: { ...(p[id] || {}), content } }));
    clearTimeout(noteTimers.current[id]);
    noteTimers.current[id] = setTimeout(async () => {
      setEmpNoteSaving(p => ({ ...p, [id]: true }));
      try {
        const existingNoteId = noteTimers.current[`note_id_${id}`] || empNotes[id]?.id;
        const payload = existingNoteId 
          ? { action: 'update', id: existingNoteId, content, title: 'Nota de administración', color: 'default' }
          : { action: 'create', employee_id: id, content, title: 'Nota de administración', color: 'default' };
        const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/notes.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const data = await res.json();
        if (data.success && data.note?.id) { noteTimers.current[`note_id_${id}`] = data.note.id; setEmpNotes(p => ({ ...p, [id]: { ...(p[id] || {}), id: data.note.id } })); }
      } catch (error) { console.error(error); }
      setEmpNoteSaving(p => ({ ...p, [id]: false }));
    }, 800);
  };


  const handleAddPerson = async () => {
    if (!newPerson.name || !newPerson.position) return alert('Nombre y puesto obligatorios');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/executive-report/create.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPerson) });
      if ((await res.json()).success) { setShowAddForm(false); loadExecutiveReport(); }
    } catch (error) { console.error('Error create:', error); }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`¿Eliminar a ${name}?`)) return;
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/employees/delete.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      loadExecutiveReport();
    } catch (error) { console.error('Error delete:', error); }
  };

  const handleDragEnd = async () => {
    setDragging(false);
    if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;
    const items = [...executiveReport];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1); items.splice(dragOverItem.current, 0, draggedItem);
    dragItem.current = null; dragOverItem.current = null;
    try {
      const updates = items.map((item, index) => ({ id: item.id, sort_order: index }));
      await fetch(`${import.meta.env.VITE_API_URL}/employees/reorder.php`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ updates }) });
      setExecutiveReport(items);
    } catch (error) { console.error('Error reorder:', error); }
  };

  const activeList = executiveReport.filter(i => (i.status || 'active') !== 'inactive');
  const inactiveList = executiveReport.filter(i => i.status === 'inactive');

  return (
    <div className="space-y-6 p-3 sm:p-4 bg-[#030712] min-h-screen text-slate-300">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 bg-[#0b1120] p-4 sm:p-6 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight break-normal">COLABORADORES</h1>
          <p className="text-slate-500 text-[11px] sm:text-xs mt-1 uppercase tracking-wider sm:tracking-widest font-bold break-normal">Gestion de Expedientes y Liquidaciones</p>
        </div>
        {isAdmin && <button onClick={() => setShowAddForm(!showAddForm)} className="bg-cyan-500 text-black px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs hover:scale-105 transition-all shadow-lg shadow-cyan-500/20 self-start sm:self-auto">+ NUEVO INGRESO</button>}
      </div>

      {showAddForm && (
        <div className="bg-[#040c1a] border border-cyan-500/20 p-6 rounded-2xl animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Nombre completo" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <input type="text" placeholder="Puesto" value={newPerson.position} onChange={e => setNewPerson({...newPerson, position: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <input type="date" value={newPerson.start_date} onChange={e => setNewPerson({...newPerson, start_date: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm" />
            <button onClick={handleAddPerson} className="md:col-span-3 bg-cyan-500/20 text-cyan-400 py-3 rounded-xl font-bold border border-cyan-500/30 hover:bg-cyan-500/30">DAR DE ALTA</button>
          </div>
        </div>
      )}

      {/* MENU SUPERIOR: MODO DE VISTA */}
      <div className="grid grid-cols-3 gap-2 bg-[#040c1a] p-2 rounded-2xl border border-slate-800">
        {[
          { id: 'personal', label: 'Personal', icon: '' },
          { id: 'horario',  label: 'Horario',  icon: '' },
          { id: 'nomina',   label: 'Nomina',   icon: '' },
        ].map(v => (
          <button key={v.id} onClick={() => setViewMode(v.id)} className={`w-full py-2.5 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-all ${viewMode === v.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {viewMode === 'personal' && (<>
      {/* FILTROS */}
      <div className="flex gap-4 bg-[#040c1a] p-4 rounded-xl border border-slate-800">
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none">
          <option value="all">Género: Todos</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
        </select>
        <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2 rounded-lg border border-slate-700 outline-none">
          <option value="all">Edad: Todas</option><option value="18-35">18-35 años</option><option value="36-54">36-54 años</option><option value="55-80">55+ años</option>
        </select>
      </div>

      {/* RESUMEN ESTADO ACTUAL */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {(() => {
          const now = new Date();
          const todayIndex = getWeekIndexFromJsDay(now.getDay());
          const working = activeList.filter(item => {
            const att = getAttendanceForItem(item);
            return isWorkingNowForItem(item, att);
          }).length;
          const scheduled = activeList.filter(item => { const sch = getScheduleForItem(item)?.[todayIndex]; return sch && !sch.is_day_off; }).length;
          const late = activeList.filter(item => {
            const sch = getScheduleForItem(item)?.[todayIndex]; const att = getAttendanceForItem(item);
            if (!sch || sch.is_day_off || !sch.entry) return false;
            if (isAttendanceToday(att) && att?.clock_in) return false;
            const [eH, eM] = sch.entry.split(':').map(Number);
            const eT = new Date(); eT.setHours(eH, eM, 0, 0);
            return now > eT;
          }).length;
          const off = activeList.filter(item => {
            const sch = getScheduleForItem(item)?.[todayIndex];
            const att = getAttendanceForItem(item);
            if (isAttendanceToday(att) && att?.clock_in && !att?.clock_out) return false;
            return !sch || sch.is_day_off;
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

      {/* LISTA ACTIVA */}
      <div className="grid grid-cols-1 gap-4">
        {activeList.map((item, index) => {
          const expanded = expandedItems[item.id];
          const activeTab = empTabs[item.id] || 'nomina';
          const payroll = calculatePayroll(empAttendance[item.id] || [], item);
          const attendance = getAttendanceForItem(item);

          return (
            <div key={item.id} 
                 draggable={isAdmin && !isTouchDevice} 
                 onDragStart={() => { dragItem.current = index; setDragging(true); }}
                 onDragEnter={() => { dragOverItem.current = index; }}
                 onDragEnd={handleDragEnd}
                 onDragOver={(e) => e.preventDefault()}
                 className={`bg-[#0b1120] border border-slate-800 rounded-2xl overflow-hidden shadow-xl transition-all ${dragging ? 'opacity-50' : ''}`}>
              <div onClick={() => setExpandedItems(p => ({...p, [item.id]: !expanded}))} className="p-3 sm:p-5 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 cursor-pointer hover:bg-white/[0.02]">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      draggable={false}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.preventDefault()}
                      onClick={(e) => openImagePreview(e, getEmployeeAvatar(item))}
                      className="w-12 h-12 rounded-md overflow-hidden border border-slate-700 bg-slate-800 cursor-zoom-in"
                    >
                      {item.photo ? <img src={getEmployeeAvatar(item)} className="w-full h-full object-cover" alt="Perfil" /> : <div className="h-full flex items-center justify-center opacity-20">Perfil</div>}
                    </button>
                    <button
                      type="button"
                      draggable={false}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                      onDragStart={(e) => e.preventDefault()}
                      onClick={(e) => openImagePreview(e, getEmployeeIdPhoto(item))}
                      className="w-12 h-12 rounded-md overflow-hidden border border-cyan-500/30 bg-slate-800 cursor-zoom-in"
                    >
                      {item.id_photo ? <img src={getEmployeeIdPhoto(item)} className="w-full h-full object-cover" alt="Identificacion" /> : <div className="h-full flex items-center justify-center opacity-20 text-[9px] px-1 text-center leading-tight">ID</div>}
                    </button>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-white font-bold text-sm sm:text-base leading-tight truncate">{item.name}</h3>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isWorkingNowForItem(item, attendance) ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-tight break-words">{item.position} • {isWorkingNowForItem(item, attendance) ? 'En Turno' : 'Fuera'}</p>
                    </div>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                  <div className="text-right">
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase">Neto Semanal</p>
                    <p className="text-base sm:text-lg font-black text-emerald-400 leading-none">${formatMoney(payroll.netPay)}</p>
                  </div>
                  <span className={`text-slate-600 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>

              {expanded && (
                <div className="p-6 bg-black/40 border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex gap-2 mb-6 border-b border-slate-800 overflow-x-auto pb-px">
                    {['info', 'horario', 'nomina', 'reportes', 'notas'].map(t => (
                      <button key={t} onClick={() => {
                        setEmpTabs(p => ({...p, [item.id]: t}));
                        if(t === 'nomina') loadAttendance(item.id, item.employee_number, item.name);
                        if(t === 'reportes') loadReports(item.id);
                        if(t === 'notas') loadNotes(item.id);
                      }} className={`px-5 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                        {t === 'nomina' ? 'Liquidación / Nómina' : t}
                      </button>
                    ))}
                  </div>

                  {activeTab === 'nomina' && (
                    <div className="space-y-6">
                      <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl">
                        <div className="flex justify-between items-center mb-6">
                          <h4 className="text-red-400 text-xs font-black uppercase tracking-widest">Cálculos de Salida y Liquidación</h4>
                          <span className="text-[10px] text-slate-500 font-mono">Antigüedad: {(() => {
                            const inicio = item.hire_date || item.start_date;
                            if(!inicio) return 'No definida';
                            const anios = Math.max(0, (new Date() - new Date(inicio)) / (1000 * 60 * 60 * 24 * 365.25));
                            const aniosE = Math.floor(anios);
                            return `${aniosE} años ${Math.round((anios - aniosE) * 12)} meses`;
                          })()}</span>
                        </div>
                        
                        {(() => {
                          const salario = parseFloat(editingReport[item.id]?.daily_salary ?? item.daily_salary ?? 0);
                          const inicio = item.hire_date || item.start_date;
                          const aniosEnteros = inicio ? Math.floor(Math.max(0, (new Date() - new Date(inicio)) / (1000 * 60 * 60 * 24 * 365.25))) : 0;
                          
                          const base_tresMeses = salario * 90;
                          const base_veinteDias = salario * 20 * aniosEnteros;
                          const base_vacaciones = aniosEnteros >= 1 ? salario * (6 + Math.floor((aniosEnteros - 1) / 2) * 2) : 0;
                          const base_prima = base_vacaciones * 0.25;
                          const base_aguinaldo = salario * 15;

                          const getVal = (field, baseVal) => {
                            const edited = editingReport[item.id]?.[field];
                            if (edited !== undefined && edited !== '') return parseFloat(edited) || 0;
                            if (edited === '') return 0;
                            const dbVal = item[field];
                            if (dbVal !== undefined && dbVal !== null && dbVal !== '') return parseFloat(dbVal) || 0;
                            return baseVal;
                          };

                          const d_3m = getVal('liquid_tres_meses', base_tresMeses);
                          const d_20d = getVal('liquid_veinte_dias', base_veinteDias);
                          const d_vac = getVal('liquid_vacaciones', base_vacaciones);
                          const d_prima = getVal('liquid_prima_vacacional', base_prima);
                          const d_agui = getVal('liquid_aguinaldo', base_aguinaldo);
                          const totalDespido = d_3m + d_20d + d_vac + d_prima + d_agui;

                          const r_vac = getVal('renuncia_vacaciones', base_vacaciones);
                          const r_prima = getVal('renuncia_prima_vacacional', base_prima);
                          const r_agui = getVal('renuncia_aguinaldo', base_aguinaldo);
                          const totalRenuncia = r_vac + r_prima + r_agui;

                          return (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                              <div className="bg-red-950/30 rounded-xl p-4 border border-red-900/20 space-y-3">
                                <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-4">Por Despido (Art. 50 LFT)</p>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">3 meses de salario</span>
                                  <input type="number" value={editingReport[item.id]?.liquid_tres_meses ?? item.liquid_tres_meses ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_tres_meses', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_tresMeses.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">20 días × año</span>
                                  <input type="number" value={editingReport[item.id]?.liquid_veinte_dias ?? item.liquid_veinte_dias ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_veinte_dias', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_veinteDias.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Vacaciones proporcionales</span>
                                  <input type="number" value={editingReport[item.id]?.liquid_vacaciones ?? item.liquid_vacaciones ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_vacaciones', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_vacaciones.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Prima vacacional (25%)</span>
                                  <input type="number" value={editingReport[item.id]?.liquid_prima_vacacional ?? item.liquid_prima_vacacional ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_prima_vacacional', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_prima.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Aguinaldo (15 días)</span>
                                  <input type="number" value={editingReport[item.id]?.liquid_aguinaldo ?? item.liquid_aguinaldo ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_aguinaldo', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_aguinaldo.toFixed(2)} />
                                </div>
                                <div className="flex justify-between text-xs font-black border-t border-red-900/30 pt-3 mt-2">
                                  <span className="text-red-300">TOTAL DESPIDO</span>
                                  <span className="text-red-300 text-lg">${formatMoney(totalDespido)}</span>
                                </div>
                              </div>

                              <div className="bg-orange-950/20 rounded-xl p-4 border border-orange-900/20 space-y-3">
                                <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-4">Por Renuncia (Art. 48 LFT)</p>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Vacaciones proporcionales</span>
                                  <input type="number" value={editingReport[item.id]?.renuncia_vacaciones ?? item.renuncia_vacaciones ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_vacaciones', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_vacaciones.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Prima vacacional (25%)</span>
                                  <input type="number" value={editingReport[item.id]?.renuncia_prima_vacacional ?? item.renuncia_prima_vacacional ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_prima_vacacional', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_prima.toFixed(2)} />
                                </div>
                                <div className="flex justify-between items-center text-[10px]">
                                  <span className="text-slate-400">Aguinaldo (15 días)</span>
                                  <input type="number" value={editingReport[item.id]?.renuncia_aguinaldo ?? item.renuncia_aguinaldo ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_aguinaldo', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_aguinaldo.toFixed(2)} />
                                </div>
                                <div className="flex justify-between text-xs font-black border-t border-orange-900/30 pt-3 mt-2">
                                  <span className="text-orange-300">TOTAL RENUNCIA</span>
                                  <span className="text-orange-300 text-lg">${formatMoney(totalRenuncia)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                        <button onClick={() => saveReportChanges(item.id)} className="w-full mt-6 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 hover:bg-red-500 transition-all">ACTUALIZAR LIQUIDACIÓN EN BASE DE DATOS</button>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                        <div className="bg-[#0b1120] border border-slate-800 p-5 rounded-2xl">
                          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <div>
                              <p className="text-[10px] text-slate-500 font-black uppercase">Resumen Semanal</p>
                              <p className="text-[9px] text-slate-600 mt-0.5">{getPayrollDates(payrollPeriodOffset[item.id] || 0).label}</p>
                            </div>
                            <div className="flex gap-1">
                               <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) - 1)} className="text-[8px] bg-slate-800 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana anterior">←</button>
                               <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, 0)} className="text-[8px] bg-slate-800 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana actual">HOY</button>
                               <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) + 1)} className="text-[8px] bg-slate-800 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana siguiente">→</button>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex justify-between text-xs"><span>Sueldo Base (7d)</span><span className="text-white font-mono">${formatMoney(payroll.baseWeekly)}</span></div>
                            <div className="flex justify-between text-xs text-red-400"><span>Faltas ({payroll.absences})</span><span className="font-mono">-${formatMoney(payroll.deduction)}</span></div>
                            <div className="flex justify-between text-xs text-cyan-400"><span>Bonos/Extras</span><span className="font-mono">+${formatMoney(payroll.extraPay)}</span></div>
                            <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-white text-base"><span>PAGO NETO</span><span className="text-emerald-400 font-mono">${formatMoney(payroll.netPay)}</span></div>
                          </div>
                        </div>
                        <div className="lg:col-span-2 space-y-2 max-h-52 overflow-y-auto pr-2 custom-scrollbar">
                          {attendanceLoading[item.id] ? <div className="py-20 text-center animate-pulse text-[10px] text-slate-600 font-black">SINCRONIZANDO RELOJ...</div> : 
                            (empAttendance[item.id] || []).map((r, i) => (
                              <div key={i} className="flex justify-between items-center p-3 bg-white/[0.02] border border-white/[0.05] rounded-xl">
                                <span className="text-[10px] font-black text-slate-400 uppercase">{new Date(r.date+'T00:00:00').toLocaleDateString('es-MX', {weekday:'short', day:'2-digit'})}</span>
                                <span className="text-[10px] font-mono text-slate-500">{r.clock_in?.split(' ')[1]?.substring(0,5) || '--:--'} - {r.clock_out?.split(' ')[1]?.substring(0,5) || '--:--'}</span>
                                <span className={`text-[8px] font-black px-2 py-1 rounded-lg ${r.status === 'present' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>{r.status.toUpperCase()}</span>
                              </div>
                            ))
                          }
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'info' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="space-y-4">
                        {/* DATOS GENERALES */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                          <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border-b border-slate-800 pb-2">Datos Generales</p>
                          <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Nombre Completo</label>
                            <input type="text" value={editingReport[item.id]?.name ?? item.name ?? ''} onChange={e => handleReportEdit(item.id, 'name', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Puesto</label>
                              <input type="text" value={editingReport[item.id]?.position ?? item.position ?? ''} onChange={e => handleReportEdit(item.id, 'position', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Sueldo Diario</label>
                              <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">ID SoftRestaurant</label>
                              <input type="text" value={editingReport[item.id]?.employee_number ?? item.employee_number ?? ''} onChange={e => handleReportEdit(item.id, 'employee_number', e.target.value.toUpperCase())} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" list="sr-id-options" />
                              <datalist id="sr-id-options">{srEmployeeIds.map((srId) => (<option key={srId} value={srId} />))}</datalist>
                            </div>
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Contratación</label>
                              <input type="date" value={editingReport[item.id]?.hire_date ?? item.hire_date ?? ''} onChange={e => handleReportEdit(item.id, 'hire_date', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                          </div>
                          <div className="bg-black/40 p-3 rounded-xl border border-slate-700 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">Foto perfil</label>
                                <input type="file" onChange={e => e.target.files[0] && handlePhotoUpload(item.id, e.target.files[0], 'profile')} className="text-[9px] text-cyan-400 w-full" />
                              </div>
                              <div>
                                <label className="text-[9px] text-slate-500 font-black uppercase mb-1 block">Identificación</label>
                                <input type="file" onChange={e => e.target.files[0] && handlePhotoUpload(item.id, e.target.files[0], 'id')} className="text-[9px] text-cyan-400 w-full" />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <button type="button" onClick={() => item.photo && setImagePreview(getEmployeeAvatar(item))} className="aspect-square rounded-md border border-slate-700 bg-slate-900/60 overflow-hidden hover:border-cyan-500/40 transition-all">
                                {item.photo ? <img src={getEmployeeAvatar(item)} alt="Perfil" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] text-slate-500">Sin perfil</div>}
                              </button>
                              <button type="button" onClick={() => item.id_photo && setImagePreview(getEmployeeIdPhoto(item))} className="aspect-square rounded-md border border-cyan-500/30 bg-slate-900/60 overflow-hidden hover:border-cyan-500/50 transition-all">
                                {item.id_photo ? <img src={getEmployeeIdPhoto(item)} alt="Identificacion" className="w-full h-full object-cover" /> : <div className="h-full flex items-center justify-center text-[10px] text-slate-500">Sin ID</div>}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* CONTACTO */}
                        <div className="bg-black/20 p-5 rounded-2xl border border-slate-800 space-y-4">
                          <p className="text-[10px] text-cyan-400 font-black uppercase tracking-widest border-b border-slate-800 pb-2">Información de Contacto</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Teléfono</label>
                              <input type="tel" value={editingReport[item.id]?.phone ?? item.phone ?? ''} onChange={e => handleReportEdit(item.id, 'phone', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Correo Electrónico</label>
                              <input type="email" value={editingReport[item.id]?.email ?? item.email ?? ''} onChange={e => handleReportEdit(item.id, 'email', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                          </div>
                          <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Contacto de Emergencia</label>
                            <input type="text" placeholder="Nombre y teléfono" value={editingReport[item.id]?.emergency_contact ?? item.emergency_contact ?? ''} onChange={e => handleReportEdit(item.id, 'emergency_contact', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                          </div>
                        </div>

                        {/* DATOS MÉDICOS */}
                        <div className="bg-red-500/[0.03] p-5 rounded-2xl border border-red-500/15 space-y-4">
                          <p className="text-[10px] text-red-400 font-black uppercase tracking-widest border-b border-red-500/20 pb-2">Datos Médicos</p>
                          <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Tipo de Sangre</label>
                            <select value={editingReport[item.id]?.tipo_sangre ?? item.tipo_sangre ?? ''} onChange={e => handleReportEdit(item.id, 'tipo_sangre', e.target.value)} className="w-full bg-black/40 border border-slate-700 text-white text-xs p-2 rounded-lg outline-none focus:border-red-500">
                              <option value="">No especificado</option>
                              <option value="O+">O+</option><option value="O-">O-</option>
                              <option value="A+">A+</option><option value="A-">A-</option>
                              <option value="B+">B+</option><option value="B-">B-</option>
                              <option value="AB+">AB+</option><option value="AB-">AB-</option>
                            </select>
                          </div>
                          <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Alergias</label>
                            <textarea rows="2" value={editingReport[item.id]?.alergias ?? item.alergias ?? ''} onChange={e => handleReportEdit(item.id, 'alergias', e.target.value)} className="w-full bg-black/40 border border-slate-700 text-white text-xs p-2 rounded-lg outline-none focus:border-red-500" placeholder="Alergias conocidas..." />
                          </div>
                          <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Enfermedades / Condiciones</label>
                            <textarea rows="2" value={editingReport[item.id]?.enfermedades ?? item.enfermedades ?? ''} onChange={e => handleReportEdit(item.id, 'enfermedades', e.target.value)} className="w-full bg-black/40 border border-slate-700 text-white text-xs p-2 rounded-lg outline-none focus:border-red-500" placeholder="Condiciones médicas..." />
                          </div>
                        </div>

                        <button onClick={() => saveReportChanges(item.id)} className="w-full bg-cyan-500/10 text-cyan-400 py-3 rounded-xl text-[10px] font-black border border-cyan-500/20 hover:bg-cyan-500/20 uppercase tracking-widest">Guardar Expediente</button>
                      </div>

                      <div className="space-y-4">
                        {/* RESUMEN SEMANAL */}
                        <div className="bg-[#0b1120] border border-emerald-500/20 p-5 rounded-2xl">
                          <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                            <div>
                              <p className="text-[10px] text-emerald-400 font-black uppercase tracking-widest">Resumen Semanal</p>
                              <p className="text-[9px] text-slate-600 mt-0.5">{getPayrollDates(payrollPeriodOffset[item.id] || 0).label}</p>
                            </div>
                            <div className="flex gap-1">
                              <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) - 1)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana anterior">←</button>
                              <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, 0)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana actual">HOY</button>
                              <button onClick={() => loadAttendance(item.id, item.employee_number, item.name, (payrollPeriodOffset[item.id] || 0) + 1)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1 rounded hover:bg-cyan-500 hover:text-black" title="Semana siguiente">→</button>
                            </div>
                          </div>
                          <div className="space-y-2.5">
                            <div className="flex justify-between text-xs"><span className="text-slate-500">Sueldo Base (7d)</span><span className="text-white font-mono">${formatMoney(payroll.baseWeekly)}</span></div>
                            <div className="flex justify-between text-xs text-red-400"><span>Faltas ({payroll.absences})</span><span className="font-mono">-${formatMoney(payroll.deduction)}</span></div>
                            <div className="flex justify-between text-xs text-cyan-400"><span>Bonos/Extras</span><span className="font-mono">+${formatMoney(payroll.extraPay)}</span></div>
                            <div className="pt-3 border-t border-slate-800 flex justify-between font-black text-white text-base"><span>Pago Neto</span><span className="text-emerald-400 font-mono">${formatMoney(payroll.netPay)}</span></div>
                          </div>
                        </div>

                        {/* UBICACIÓN */}
                        <div className="bg-black/20 p-4 rounded-2xl border border-slate-800">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">Ubicación</p>
                          <input type="text" placeholder="Dirección completa..." value={editingReport[item.id]?.address ?? item.address ?? ''} onChange={e => handleReportEdit(item.id, 'address', e.target.value)} className="w-full bg-black/40 border border-slate-700 p-2 rounded-lg text-white text-xs mb-3 outline-none focus:border-cyan-500" />
                          {String(editingReport[item.id]?.address ?? item.address ?? '').trim() && (
                            <p className="mb-3 text-[10px] text-amber-300/90">
                              Se usara direccion aproximada, por favor corregir direccion.
                            </p>
                          )}
                          {empCoords[item.id] ? (
                            <div className="rounded-xl overflow-hidden border border-slate-700">
                              <LocationMap
                                markers={[{
                                  lat: empCoords[item.id][0],
                                  lng: empCoords[item.id][1],
                                  color: getMarkerColorForEmployee(item),
                                  avatar: getEmployeeAvatar(item),
                                  label: item.name,
                                  popup: `<b>${item.name}</b><br/>${item.address}`
                                }]}
                                height={220}
                              />
                            </div>
                          ) : (
                            <div className="h-40 flex flex-col items-center justify-center text-center rounded-xl border border-slate-800 bg-black/20">
                              <p className="text-3xl mb-2 opacity-20">📍</p><p className="text-[10px] text-slate-600">Sin dirección</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeTab === 'horario' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="bg-[#0c1222] p-5 rounded-2xl border border-purple-500/20 shadow-2xl">
                        <h4 className="text-[9px] font-black text-purple-400 uppercase mb-4 tracking-widest">Configuración de Horario Fijo</h4>
                        <div className="space-y-2">
                          {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day, dIdx) => (
                            <div key={day} className="grid grid-cols-3 gap-3 items-center bg-black/30 p-2.5 rounded-xl border border-white/[0.03]">
                              <div className="text-[10px] font-bold text-slate-400">{day}</div>
                              <div className="flex gap-1.5 col-span-2">
                                <select
                                  className="w-[120px] bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500"
                                  value={getScheduleDraftForItem(item)?.[dIdx]?.day_type || 'laboral'}
                                  onChange={(e) => updateScheduleDraft(item, dIdx, 'day_type', e.target.value)}
                                >
                                  <option value="laboral">Laboral</option>
                                  <option value="descanso">Descanso</option>
                                  <option value="enfermedad">Enfermedad</option>
                                </select>
                                <input
                                  type="time"
                                  disabled={(getScheduleDraftForItem(item)?.[dIdx]?.day_type || 'laboral') !== 'laboral'}
                                  className="flex-1 bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 disabled:opacity-40"
                                  value={getScheduleDraftForItem(item)?.[dIdx]?.entry || ''}
                                  onChange={(e) => updateScheduleDraft(item, dIdx, 'entry', e.target.value)}
                                />
                                <input
                                  type="time"
                                  disabled={(getScheduleDraftForItem(item)?.[dIdx]?.day_type || 'laboral') !== 'laboral'}
                                  className="flex-1 bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 disabled:opacity-40"
                                  value={getScheduleDraftForItem(item)?.[dIdx]?.exit || ''}
                                  onChange={(e) => updateScheduleDraft(item, dIdx, 'exit', e.target.value)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                        <button onClick={() => saveSchedule(item)} disabled={!!savingSchedule[item.id]} className="w-full mt-4 bg-purple-500/20 text-purple-400 py-3 rounded-xl text-[10px] font-black border border-purple-500/20 hover:bg-purple-500/30 transition-all">
                          {savingSchedule[item.id] ? 'PROCESANDO...' : 'ACTUALIZAR HORARIO SEMANAL'}
                        </button>
                      </div>
                    </div>
                  )}

                  {activeTab === 'reportes' && (
                    <div className="space-y-4">
                      <div className="flex gap-2 items-center bg-black/20 p-3 rounded-xl border border-slate-800">
                        <button onClick={() => setReportViewMode('list')} className={`px-3 py-2 text-[9px] font-bold rounded-lg transition-all ${reportViewMode === 'list' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>📋 LISTA</button>
                        <button onClick={() => setReportViewMode('grid')} className={`px-3 py-2 text-[9px] font-bold rounded-lg transition-all ${reportViewMode === 'grid' ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400'}`}>🔲 BLOQUES</button>
                        <input type="text" placeholder="Buscar reportes..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="flex-1 bg-black/40 border border-slate-700 p-2 rounded-lg text-xs text-white outline-none focus:border-cyan-500 transition-all" />
                        <button onClick={() => setShowReportModal(item.id)} className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg text-[10px] font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">+ NUEVO REPORTE</button>
                      </div>
                      <div className={reportViewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                        {(employeeReports[item.id] || []).filter(r => !reportSearch || r.report_name.toLowerCase().includes(reportSearch.toLowerCase())).map(r => (
                          <div key={r.id} className="group bg-gradient-to-br from-slate-900 to-black p-5 border border-slate-800 rounded-xl hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10">
                            <div className="flex flex-col gap-3">
                              <div className="flex-1">
                                <p className="text-sm text-white font-bold group-hover:text-cyan-400 transition-colors mb-1">{r.report_name}</p>
                                <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                              </div>
                              <div className="flex gap-2">
                                <a href={r.file_path} target="_blank" rel="noreferrer" className="flex-1 bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold text-center hover:bg-cyan-400 transition-all shadow-lg hover:shadow-cyan-500/50">📄 VER REPORTE</a>
                              </div>
                            </div>
                          </div>
                        ))}
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

      {/* LISTA INACTIVA (HISTORIAL DE BAJAS) */}
      {inactiveList.length > 0 && (
        <div className="mt-10 space-y-3">
          <h2 className="text-slate-600 text-[9px] font-black uppercase tracking-[0.2em] px-2 flex items-center gap-3"><span className="h-px bg-slate-800 flex-1" /> HISTORIAL DE BAJAS <span className="h-px bg-slate-800 flex-1" /></h2>
          {inactiveList.map((item) => {
            const expanded = expandedItems[item.id];
            const activeTab = empTabs[item.id] || 'nomina';

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
                    {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDeleteEmployee(item.id, item.name); }} className="text-[8px] text-red-900 font-black hover:text-red-500 px-2 py-1 rounded border border-red-900/20 hover:border-red-500/30">ELIMINAR</button>}
                    <span className={`text-slate-600 transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </div>

                {expanded && (
                  <div className="p-5 border-t border-slate-800/60 bg-black/20">
                    <div className="flex gap-2 mb-5 border-b border-slate-800 pb-px">
                      {['info', 'nomina', 'reportes', 'notas'].map(t => (
                        <button key={t} onClick={() => {
                          setEmpTabs(p => ({...p, [item.id]: t}));
                          if(t === 'reportes') loadReports(item.id);
                          if(t === 'notas') loadNotes(item.id);
                        }} className={`px-4 py-2 text-[9px] font-black uppercase tracking-tighter transition-all ${activeTab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300'}`}>
                          {t === 'info' ? 'Expediente' : t === 'nomina' ? 'Liquidación' : t}
                        </button>
                      ))}
                    </div>

                    {activeTab === 'nomina' && (
                      <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-red-500/5 border border-red-500/20 p-6 rounded-2xl">
                          <div className="flex justify-between items-center mb-6">
                            <h4 className="text-red-400 text-xs font-black uppercase tracking-widest">Resumen de Liquidación</h4>
                            <span className="text-[10px] text-slate-500 font-mono">Antigüedad: {(() => {
                              const inicio = item.hire_date || item.start_date;
                              if(!inicio) return 'No definida';
                              const anios = Math.max(0, (new Date() - new Date(inicio)) / (1000 * 60 * 60 * 24 * 365.25));
                              const aniosE = Math.floor(anios);
                              return `${aniosE} años ${Math.round((anios - aniosE) * 12)} meses`;
                            })()}</span>
                          </div>
                          
                          {(() => {
                            const salario = parseFloat(editingReport[item.id]?.daily_salary ?? item.daily_salary ?? 0);
                            const inicio = item.hire_date || item.start_date;
                            const aniosEnteros = inicio ? Math.floor(Math.max(0, (new Date() - new Date(inicio)) / (1000 * 60 * 60 * 24 * 365.25))) : 0;
                            
                            const base_tresMeses = salario * 90;
                            const base_veinteDias = salario * 20 * aniosEnteros;
                            const base_vacaciones = aniosEnteros >= 1 ? salario * (6 + Math.floor((aniosEnteros - 1) / 2) * 2) : 0;
                            const base_prima = base_vacaciones * 0.25;
                            const base_aguinaldo = salario * 15;

                            const getVal = (field, baseVal) => {
                              const edited = editingReport[item.id]?.[field];
                              if (edited !== undefined && edited !== '') return parseFloat(edited) || 0;
                              if (edited === '') return 0;
                              const dbVal = item[field];
                              if (dbVal !== undefined && dbVal !== null && dbVal !== '') return parseFloat(dbVal) || 0;
                              return baseVal;
                            };

                            const d_3m = getVal('liquid_tres_meses', base_tresMeses);
                            const d_20d = getVal('liquid_veinte_dias', base_veinteDias);
                            const d_vac = getVal('liquid_vacaciones', base_vacaciones);
                            const d_prima = getVal('liquid_prima_vacacional', base_prima);
                            const d_agui = getVal('liquid_aguinaldo', base_aguinaldo);
                            const totalDespido = d_3m + d_20d + d_vac + d_prima + d_agui;

                            const r_vac = getVal('renuncia_vacaciones', base_vacaciones);
                            const r_prima = getVal('renuncia_prima_vacacional', base_prima);
                            const r_agui = getVal('renuncia_aguinaldo', base_aguinaldo);
                            const totalRenuncia = r_vac + r_prima + r_agui;

                            return (
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* BLOQUE DESPIDO */}
                                <div className="bg-red-950/30 rounded-xl p-4 border border-red-900/20 space-y-3">
                                  <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-4">Por Despido (Art. 50 LFT)</p>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">3 meses de salario</span>
                                    <input type="number" value={editingReport[item.id]?.liquid_tres_meses ?? item.liquid_tres_meses ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_tres_meses', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_tresMeses.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">20 días × año</span>
                                    <input type="number" value={editingReport[item.id]?.liquid_veinte_dias ?? item.liquid_veinte_dias ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_veinte_dias', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_veinteDias.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Vacaciones proporcionales</span>
                                    <input type="number" value={editingReport[item.id]?.liquid_vacaciones ?? item.liquid_vacaciones ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_vacaciones', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_vacaciones.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Prima vacacional (25%)</span>
                                    <input type="number" value={editingReport[item.id]?.liquid_prima_vacacional ?? item.liquid_prima_vacacional ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_prima_vacacional', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_prima.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Aguinaldo (15 días)</span>
                                    <input type="number" value={editingReport[item.id]?.liquid_aguinaldo ?? item.liquid_aguinaldo ?? ''} onChange={e => handleReportEdit(item.id, 'liquid_aguinaldo', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-red-400 text-right" placeholder={base_aguinaldo.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between text-xs font-black border-t border-red-900/30 pt-3 mt-2">
                                    <span className="text-red-300">TOTAL DESPIDO</span>
                                    <span className="text-red-300 text-lg">${formatMoney(totalDespido)}</span>
                                  </div>
                                </div>

                                {/* BLOQUE RENUNCIA */}
                                <div className="bg-orange-950/20 rounded-xl p-4 border border-orange-900/20 space-y-3">
                                  <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest mb-4">Por Renuncia (Art. 48 LFT)</p>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Vacaciones proporcionales</span>
                                    <input type="number" value={editingReport[item.id]?.renuncia_vacaciones ?? item.renuncia_vacaciones ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_vacaciones', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_vacaciones.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Prima vacacional (25%)</span>
                                    <input type="number" value={editingReport[item.id]?.renuncia_prima_vacacional ?? item.renuncia_prima_vacacional ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_prima_vacacional', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_prima.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between items-center text-[10px]">
                                    <span className="text-slate-400">Aguinaldo (15 días)</span>
                                    <input type="number" value={editingReport[item.id]?.renuncia_aguinaldo ?? item.renuncia_aguinaldo ?? ''} onChange={e => handleReportEdit(item.id, 'renuncia_aguinaldo', e.target.value)} className="bg-black/40 border border-slate-600 text-white w-24 px-2 py-1 rounded outline-none focus:border-orange-400 text-right" placeholder={base_aguinaldo.toFixed(2)} />
                                  </div>
                                  <div className="flex justify-between text-xs font-black border-t border-orange-900/30 pt-3 mt-2">
                                    <span className="text-orange-300">TOTAL RENUNCIA</span>
                                    <span className="text-orange-300 text-lg">${formatMoney(totalRenuncia)}</span>
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                          <button onClick={() => saveReportChanges(item.id)} className="w-full mt-6 bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-red-900/20 hover:bg-red-500 transition-all">ACTUALIZAR HISTORIAL EN BASE DE DATOS</button>
                        </div>
                      </div>
                    )}

                    {activeTab === 'info' && (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in slide-in-from-bottom-2 duration-300">
                        <div className="space-y-5">
                          <div className="bg-black/20 p-4 rounded-xl border border-slate-800 space-y-3">
                            <p className="text-[8px] text-cyan-500/50 font-bold uppercase tracking-widest">Datos Generales (Ex-Empleado)</p>
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-[8px] text-slate-500 font-bold uppercase">Nombre Completo</label>
                                <input type="text" value={editingReport[item.id]?.name ?? item.name ?? ''} onChange={e => handleReportEdit(item.id, 'name', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs transition-colors" />
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[8px] text-slate-500 font-bold uppercase">Puesto</label>
                                  <input type="text" value={editingReport[item.id]?.position ?? item.position ?? ''} onChange={e => handleReportEdit(item.id, 'position', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" />
                                </div>
                                <div>
                                  <label className="text-[8px] text-slate-500 font-bold uppercase">Estatus</label>
                                  <select value={editingReport[item.id]?.status ?? item.status ?? ''} onChange={e => handleReportEdit(item.id, 'status', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs">
                                    <option value="active">Activo</option>
                                    <option value="vacaciones">Vacaciones</option>
                                    <option value="eventual">Eventual</option>
                                    <option value="inactive">Inactivo</option>
                                  </select>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-3">
                                <div>
                                  <label className="text-[8px] text-slate-500 font-bold uppercase">Sueldo Diario</label>
                                  <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" />
                                </div>
                                <div>
                                  <label className="text-[8px] text-slate-500 font-bold uppercase">Fecha Contratación</label>
                                  <input type="date" value={editingReport[item.id]?.hire_date ?? item.hire_date ?? ''} onChange={e => handleReportEdit(item.id, 'hire_date', e.target.value)} className="bg-black/30 border-b border-slate-700 text-white w-full py-1.5 outline-none focus:border-cyan-500 text-xs" />
                                </div>
                              </div>
                            </div>
                            <button onClick={() => saveReportChanges(item.id)} className="w-full bg-cyan-500/10 text-cyan-400 py-3 rounded-xl text-[10px] font-bold border border-cyan-500/20 mt-4">GUARDAR EXPEDIENTE</button>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'reportes' && (
                      <div className="space-y-4">
                        <div className="flex gap-2 items-center bg-black/20 p-3 rounded-xl border border-slate-800">
                          <input type="text" placeholder="Buscar reportes..." value={reportSearch} onChange={e => setReportSearch(e.target.value)} className="flex-1 bg-black/40 border border-slate-700 p-2 rounded-lg text-xs text-white outline-none focus:border-cyan-500 transition-all" />
                          <button onClick={() => setShowReportModal(item.id)} className="bg-cyan-500/20 text-cyan-400 px-4 py-2 rounded-lg text-[10px] font-bold border border-cyan-500/30 hover:bg-cyan-500/30 transition-all">+ NUEVO REPORTE</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {(employeeReports[item.id] || []).filter(r => !reportSearch || r.report_name.toLowerCase().includes(reportSearch.toLowerCase())).map(r => (
                            <div key={r.id} className="group bg-gradient-to-br from-slate-900 to-black p-5 border border-slate-800 rounded-xl hover:border-cyan-500/40 transition-all shadow-lg hover:shadow-cyan-500/10">
                              <div className="flex flex-col gap-3">
                                <div className="flex-1">
                                  <p className="text-sm text-white font-bold group-hover:text-cyan-400 transition-colors mb-1">{r.report_name}</p>
                                  <p className="text-[10px] text-slate-500">{new Date(r.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                </div>
                                <div className="flex gap-2">
                                  <a href={r.file_path} target="_blank" rel="noreferrer" className="flex-1 bg-cyan-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold text-center hover:bg-cyan-400 transition-all">📄 VER REPORTE</a>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {activeTab === 'notas' && (
                      <div className="relative">
                        <textarea value={empNotes[item.id]?.content || ''} onChange={e => handleNoteChange(item.id, e.target.value)} placeholder="Notas privadas..." className="w-full h-32 bg-black/40 border border-amber-500/20 rounded-xl p-4 text-[11px] text-slate-300 outline-none focus:border-amber-500/40 shadow-inner" />
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

      {/* MAPA GENERAL DE COBERTURA */}
      <div className="bg-[#0b1120] border border-slate-800 rounded-3xl p-6 shadow-2xl mt-10">
        <h3 className="text-white text-sm font-black mb-5 tracking-widest flex items-center gap-3 uppercase"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" /> Mapa de Cobertura de Personal</h3>
        {geoLoading ? (
            <div className="h-60 flex flex-col items-center justify-center text-[10px] text-slate-600 animate-pulse font-black uppercase">Calculando coordenadas...</div>
        ) : (
            <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-inner">
                <LocationMap markers={allEmpMarkers} height={450} zoom={11} />
            </div>
        )}
      </div>
      </>)}
      {/* END VIEW personal */}

      {/* VIEW HORARIO: SEMANA ACTUAL POR DÍA */}
      {viewMode === 'horario' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-[#040c1a] p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-white text-sm font-black uppercase tracking-widest">Horario Semanal</h2>
              <p className="text-[10px] text-slate-500 mt-1">{(() => {
                const ref = new Date(); ref.setDate(ref.getDate() + scheduleWeekOffset * 7);
                const day = ref.getDay();
                const diffToMonday = (day + 6) % 7;
                const monday = new Date(ref); monday.setDate(ref.getDate() - diffToMonday);
                const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6);
                return `${monday.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — ${sunday.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`;
              })()}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setScheduleWeekOffset(p => p - 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-cyan-500 hover:text-black">← Anterior</button>
              <button onClick={() => setScheduleWeekOffset(0)} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold">Actual</button>
              <button onClick={() => setScheduleWeekOffset(p => p + 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-cyan-500 hover:text-black">Siguiente →</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'].map((dayName, dIdx) => {
              const today = new Date();
              const todayIdx = getWeekIndexFromJsDay(today.getDay());
              const isToday = scheduleWeekOffset === 0 && todayIdx === dIdx;
              const employeesForDay = activeList.filter(emp => {
                const sch = getScheduleForItem(emp)?.[dIdx];
                return sch && !sch.is_day_off && (sch.entry || sch.exit);
              });
              return (
                <div key={dIdx} className={`bg-[#040c1a] p-3 rounded-2xl border ${isToday ? 'border-cyan-500/60 shadow-lg shadow-cyan-500/10' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>{dayName}</p>
                    <span className="text-[9px] text-slate-600 font-mono">{employeesForDay.length}</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {employeesForDay.length === 0 && (
                      <p className="text-[9px] text-slate-700 text-center py-6">Nadie programado</p>
                    )}
                    {employeesForDay.map(emp => {
                      const sch = getScheduleForItem(emp)[dIdx] || {};
                      const att = isToday ? getAttendanceForItem(emp) : null;
                      const isWorkingNow = isWorkingNowForItem(emp, att);
                      const isLate = isToday && !att?.clock_in && sch.entry && (() => {
                        const [eH, eM] = sch.entry.split(':').map(Number);
                        const eT = new Date(); eT.setHours(eH, eM, 0, 0);
                        return today > eT;
                      })();
                      return (
                        <button key={emp.id} onClick={() => { setViewMode('personal'); setExpandedItems(p => ({...p, [emp.id]: true})); setEmpTabs(p => ({...p, [emp.id]: 'horario'})); }} className={`w-full text-left bg-black/30 hover:bg-cyan-500/10 border hover:border-cyan-500/30 p-2.5 rounded-xl transition-all ${isLate ? 'border-red-500/40 bg-red-500/5' : 'border-white/[0.03]'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${isWorkingNow ? 'bg-green-500 animate-pulse' : isLate ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                            <p className="text-[11px] text-white font-bold truncate flex-1">{emp.name}</p>
                          </div>
                          <p className="text-[9px] text-slate-500 mt-1 ml-3.5 truncate">{emp.position}</p>
                          <p className="text-[9px] text-cyan-400 font-mono mt-1 ml-3.5">{sch.entry || '--:--'} — {sch.exit || '--:--'}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-center text-[10px] text-slate-600 pt-2">Haz clic en un empleado para editar su horario en la vista Personal.</div>
        </div>
      )}

      {/* VIEW NOMINA: RESUMEN DE PAGO SEMANAL */}
      {viewMode === 'nomina' && (
        <div className="space-y-3">
          <div className="bg-[#040c1a] p-4 rounded-2xl border border-slate-800">
            <h2 className="text-white text-sm font-black uppercase tracking-widest">Nómina Semanal</h2>
            <p className="text-[10px] text-slate-500 mt-1">Resumen rápido de pago para todos los colaboradores activos</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {activeList.map(emp => {
              const payroll = calculatePayroll(empAttendance[emp.id] || [], emp);
              return (
                <div key={emp.id} className="bg-[#040c1a] border border-slate-800 hover:border-cyan-500/30 p-4 rounded-2xl transition-all">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={(e) => openImagePreview(e, getEmployeeAvatar(emp))}
                        className="w-10 h-10 rounded-md bg-slate-800 overflow-hidden cursor-zoom-in"
                      >
                        {emp.photo ? <img src={getEmployeeAvatar(emp)} className="w-full h-full object-cover" alt="Perfil" /> : <div className="h-full flex items-center justify-center opacity-30 text-[9px]">Perfil</div>}
                      </button>
                      <button
                        type="button"
                        draggable={false}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        onDragStart={(e) => e.preventDefault()}
                        onClick={(e) => openImagePreview(e, getEmployeeIdPhoto(emp))}
                        className="w-10 h-10 rounded-md bg-slate-800 overflow-hidden border border-cyan-500/30 cursor-zoom-in"
                      >
                        {emp.id_photo ? <img src={getEmployeeIdPhoto(emp)} className="w-full h-full object-cover" alt="Identificacion" /> : <div className="h-full flex items-center justify-center opacity-30 text-[9px]">ID</div>}
                      </button>
                    </div>
                    <div className="min-w-0">
                      <p className="text-white text-xs font-bold truncate">{emp.name}</p>
                      <p className="text-[9px] text-slate-500 uppercase">{emp.position}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[10px]"><span className="text-slate-500">Sueldo base (7d)</span><span className="text-white font-mono">${formatMoney(payroll.baseWeekly)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-red-400">Faltas ({payroll.absences})</span><span className="text-red-400 font-mono">-${formatMoney(payroll.deduction)}</span></div>
                    <div className="flex justify-between text-[10px]"><span className="text-cyan-400">Extras</span><span className="text-cyan-400 font-mono">+${formatMoney(payroll.extraPay)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 text-xs font-black"><span className="text-white">Neto</span><span className="text-emerald-400 font-mono">${formatMoney(payroll.netPay)}</span></div>
                  </div>
                  <button onClick={() => { setViewMode('personal'); setExpandedItems(p => ({...p, [emp.id]: true})); setEmpTabs(p => ({...p, [emp.id]: 'nomina'})); loadAttendance(emp.id, emp.employee_number, emp.name); }} className="w-full mt-3 bg-cyan-500/10 text-cyan-400 py-2 rounded-lg text-[9px] font-black border border-cyan-500/20 hover:bg-cyan-500/20 uppercase tracking-widest">Ver detalle</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL ARCHIVOS */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/90 z-[9000] flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-[#040c1a] border border-cyan-500/30 p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-white text-xl mb-6 font-black uppercase tracking-tighter">Subir al Expediente</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Título del Documento" value={newReport.name} onChange={e => setNewReport({...newReport, name: e.target.value})} className="w-full bg-black/60 border border-slate-800 text-white px-4 py-3 rounded-xl text-sm outline-none focus:border-cyan-500" />
              <div className="flex gap-2 p-1 bg-black/40 rounded-xl border border-slate-800">
                <button onClick={() => setReportType('file')} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${reportType === 'file' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>ARCHIVO</button>
                <button onClick={() => setReportType('text')} className={`flex-1 py-2 rounded-lg text-[10px] font-black ${reportType === 'text' ? 'bg-cyan-500 text-black shadow-lg' : 'text-slate-500'}`}>TEXTO</button>
              </div>
              {reportType === 'file' ? (
                <input type="file" onChange={e => setNewReport({...newReport, file: e.target.files[0]})} className="text-[10px] text-slate-400 file:bg-cyan-500/10 file:text-cyan-400 file:border-none file:px-3 file:py-1 file:rounded-lg file:mr-4 font-bold cursor-pointer" />
              ) : (
                <Suspense fallback={<div className="h-32 bg-black/40 rounded-xl" />}>
                  <div className="bg-white rounded-xl overflow-hidden text-black min-h-[200px]">
                    <ReactQuill theme="snow" value={newReport.content} onChange={val => setNewReport({...newReport, content: val})} />
                  </div>
                </Suspense>
              )}
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => handleUploadReport(showReportModal)} className="flex-[2] bg-cyan-500 text-black py-3.5 rounded-2xl text-xs font-black hover:scale-105 transition-all">SUBIR ARCHIVO</button>
              <button onClick={() => setShowReportModal(null)} className="flex-1 bg-slate-800 text-slate-400 py-3.5 rounded-2xl text-xs font-bold hover:bg-slate-700">CANCELAR</button>
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
