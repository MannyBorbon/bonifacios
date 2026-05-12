import { useState, useEffect, useRef, lazy, Suspense, useCallback } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import LocationMap from '../../components/LocationMap';
import { geocodeAddress } from '../../utils/geo';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
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
  const [scheduleReportLoading, setScheduleReportLoading] = useState(false);
  const [scheduleReportSummary, setScheduleReportSummary] = useState(null);
  const [periodReportStart, setPeriodReportStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [periodReportEnd, setPeriodReportEnd] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedPeriodEmployees, setSelectedPeriodEmployees] = useState([]);
  const [periodReportLoading, setPeriodReportLoading] = useState(false);
  const [periodReportRows, setPeriodReportRows] = useState([]);
  const [periodReportSummary, setPeriodReportSummary] = useState(null);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [performanceReport, setPerformanceReport] = useState({
    staff_performance: [],
    role_summary: { mesero: { people: 0, total_sales: 0, checks: 0 }, bartender: { people: 0, total_sales: 0, checks: 0 } },
    top_products: [],
    bottom_products: [],
  });

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
  // Fri=0, Sat=1, Sun=2, Mon=3, Tue=4, Wed=5, Thu=6
  const PAYROLL_DAY_NAMES = ['Viernes','Sábado','Domingo','Lunes','Martes','Miércoles','Jueves'];
  const getWeekIndexFromJsDay = (jsDay) => {
    // jsDay: 0=Sun,1=Mon..5=Fri,6=Sat -> payroll: Fri=0,Sat=1,Sun=2,Mon=3,Tue=4,Wed=5,Thu=6
    const map = [2, 3, 4, 5, 6, 0, 1]; // Sun,Mon,Tue,Wed,Thu,Fri,Sat
    return map[jsDay];
  };
  const getWeekStartYmd = (offsetWeeks = 0) => {
    const ref = new Date();
    ref.setDate(ref.getDate() + (offsetWeeks * 7));
    const jsDay = ref.getDay(); // 0=Sun
    // Days since last Friday: (jsDay - 5 + 7) % 7
    const diffToFriday = (jsDay - 5 + 7) % 7;
    const friday = new Date(ref);
    friday.setDate(ref.getDate() - diffToFriday);
    const tzOffsetMs = friday.getTimezoneOffset() * 60000;
    return new Date(friday.getTime() - tzOffsetMs).toISOString().slice(0, 10);
  };
  // Map payroll day index (0=Fri) to JS day offset from Friday
  const payrollDayToJsOffset = (pIdx) => pIdx; // Fri+0=Fri, Fri+1=Sat, etc.

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
      // Allow note field
      if (field === 'note') {
        next[dayIndex].note = value;
      }
      return { ...prev, [key]: next, [nameKey]: next };
    });
  };

  const getPayrollDates = (offsetWeeks = 0) => {
    // Payroll week: Friday to Thursday
    const today = new Date();
    const jsDay = today.getDay(); // 0=Sun
    // Days since last Friday (if today is Fri, it's the current week start)
    const daysSinceFri = (jsDay - 5 + 7) % 7;
    const start = new Date(today);
    start.setDate(today.getDate() - daysSinceFri + (offsetWeeks * 7));
    const end = new Date(start);
    end.setDate(start.getDate() + 6); // Thursday
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

  const loadSchedules = useCallback(async (weekOffset = 0) => {
    const weekStart = getWeekStartYmd(weekOffset);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=schedules&week_start=${encodeURIComponent(weekStart)}`, { credentials: 'include' });
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
      // Override with date-specific week assignments when available.
      (result.overrides || []).forEach((s) => {
        const empKey = normalizeEmployeeId(s.employee_id || '');
        const nameKey = normalizeName(s.employee_name);
        const day = Number(s.day_of_week);
        const row = {
          entry: s.scheduled_start && s.scheduled_start !== '00:00:00' ? String(s.scheduled_start).slice(0, 5) : '',
          exit: s.scheduled_end && s.scheduled_end !== '00:00:00' ? String(s.scheduled_end).slice(0, 5) : '',
          is_day_off: Number(s.is_day_off) === 1 || String(s.day_type || '') !== 'laboral',
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
    const weekStart = getWeekStartYmd(scheduleWeekOffset);
    if (!key || !draft) {
      alert('No se pudo identificar empleado para guardar horario');
      return;
    }
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
        body: JSON.stringify({ action: 'save_schedule', employee_id: key, employee_name: item.name || '', week_start: weekStart, schedules })
      });
      const result = await res.json();
      if (result.success) {
        setEmpSchedules(p => ({...p, [key]: draft, [normalizeName(item?.name)]: draft}));
        alert(`Horario guardado para la semana ${weekStart}`);
      } else {
        alert(result.error || 'No se pudo guardar el horario');
      }
    } catch { alert('Error al guardar horario'); }
    setSavingSchedule(prev => ({ ...prev, [item.id]: false }));
  };

  const saveEmployeeStatus = async (item, newStatus) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_employee_status', employee_id: item.id, status: newStatus })
      });
      const result = await res.json();
      if (result.success) {
        loadExecutiveReport();
      } else { alert(result.error || 'No se pudo actualizar status'); }
    } catch { alert('Error al cambiar status'); }
  };

  const saveDayOverride = async (item, dayIndex, scheduleDate, overrideData) => {
    const key = getEmpKey(item);
    if (!key || !scheduleDate) { alert('No se pudo identificar empleado'); return; }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php`, {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_day_override',
          employee_id: key,
          employee_name: item.name || '',
          schedule_date: scheduleDate,
          day_of_week: dayIndex,
          day_type: overrideData.day_type || 'laboral',
          scheduled_start: overrideData.entry || '00:00:00',
          scheduled_end: overrideData.exit || '00:00:00',
          note: overrideData.note || '',
        })
      });
      const result = await res.json();
      if (result.success) {
        loadSchedules(scheduleWeekOffset);
      } else { alert(result.error || 'No se pudo guardar override'); }
    } catch { alert('Error al guardar corrección'); }
  };

  const exportScheduleReport = async () => {
    const weekStart = getWeekStartYmd(scheduleWeekOffset);
    setScheduleReportLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?action=schedule_report&week_start=${encodeURIComponent(weekStart)}`, { credentials: 'include' });
      const result = await res.json();
      if (!result.success) {
        alert(result.error || 'No se pudo generar reporte');
        return;
      }
      setScheduleReportSummary(result.summary || null);
      const header = ['Fecha', 'Empleado ID', 'Empleado', 'Tipo dia', 'Entrada programada', 'Salida programada', 'Poncho entrada', 'Poncho salida'];
      const lines = [header.join(',')];
      (result.rows || []).forEach((row) => {
        const values = [
          row.schedule_date || '',
          row.employee_id || '',
          row.employee_name || '',
          row.day_type || '',
          row.scheduled_start || '',
          row.scheduled_end || '',
          row.clock_in || '',
          row.clock_out || ''
        ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
        lines.push(values.join(','));
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `reporte_horarios_${weekStart}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch {
      alert('Error al generar reporte de horarios');
    } finally {
      setScheduleReportLoading(false);
    }
  };

  const togglePeriodEmployee = (empId) => {
    setSelectedPeriodEmployees((prev) => {
      if (prev.includes(empId)) return prev.filter((id) => id !== empId);
      return [...prev, empId];
    });
  };

  const generatePeriodEmployeeReport = async () => {
    setPeriodReportLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'employee_period_report',
        start_date: periodReportStart,
        end_date: periodReportEnd,
      });
      if (selectedPeriodEmployees.length > 0) {
        params.set('employee_ids', selectedPeriodEmployees.join(','));
      }
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?${params.toString()}`, { credentials: 'include' });
      const result = await res.json();
      if (!result.success) {
        alert(result.error || 'No se pudo generar el reporte');
        return;
      }
      setPeriodReportRows(Array.isArray(result.rows) ? result.rows : []);
      setPeriodReportSummary(result.summary || null);
      loadPerformanceReport();
    } catch {
      alert('Error al generar reporte de periodo');
    } finally {
      setPeriodReportLoading(false);
    }
  };

  const loadPerformanceReport = async () => {
    setPerformanceLoading(true);
    try {
      const params = new URLSearchParams({
        action: 'employee_performance_report',
        start_date: periodReportStart,
        end_date: periodReportEnd,
      });
      if (selectedPeriodEmployees.length > 0) params.set('employee_ids', selectedPeriodEmployees.join(','));
      const res = await fetch(`${import.meta.env.VITE_API_URL}/employees/attendance-management.php?${params.toString()}`, { credentials: 'include' });
      const result = await res.json();
      if (result.success) {
        setPerformanceReport({
          staff_performance: Array.isArray(result.staff_performance) ? result.staff_performance : [],
          role_summary: result.role_summary || { mesero: { people: 0, total_sales: 0, checks: 0 }, bartender: { people: 0, total_sales: 0, checks: 0 } },
          top_products: Array.isArray(result.top_products) ? result.top_products : [],
          bottom_products: Array.isArray(result.bottom_products) ? result.bottom_products : [],
        });
      }
    } catch {
      // silent
    } finally {
      setPerformanceLoading(false);
    }
  };

  const exportPeriodEmployeeReportCsv = () => {
    if (!periodReportRows.length) {
      alert('Primero genera un reporte');
      return;
    }
    const headers = [
      'Empleado ID', 'Empleado', 'Puesto', 'Estatus', 'Periodo inicio', 'Periodo fin',
      'Faltas', 'Ausencias', 'Enfermedades', 'Vacaciones', 'No iba y si estuvo',
      'Dias programados', 'Horas programadas', 'Horas trabajadas', 'Balance horas',
      'Salario diario', 'Nomina periodo', 'Nomina semanal'
    ];
    const lines = [headers.join(',')];
    periodReportRows.forEach((r) => {
      const values = [
        r.employee_id, r.employee_name, r.position, r.status, r.period_start, r.period_end,
        r.faltas, r.ausencias, r.enfermedades, r.vacaciones, r.unexpected_present,
        r.scheduled_days, r.hours_scheduled, r.hours_worked, r.hours_balance,
        r.daily_salary, r.payroll_period, r.payroll_weekly
      ].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`);
      lines.push(values.join(','));
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reporte_empleados_${periodReportStart}_${periodReportEnd}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  useEffect(() => {
    loadExecutiveReport();
    loadSchedules(scheduleWeekOffset);
    loadTodayAttendance();
    const timer = setInterval(loadTodayAttendance, 60000);
    return () => clearInterval(timer);
  }, [loadSchedules, loadTodayAttendance, scheduleWeekOffset]);

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
        {isAdmin && <button onClick={() => setShowAddForm(!showAddForm)} className="bg-cyan-500 text-black px-4 sm:px-5 py-2.5 rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-cyan-500/20 self-start sm:self-auto touch-manipulation min-h-[44px]">+ NUEVO INGRESO</button>}
      </div>

      {showAddForm && (
        <div className="bg-[#040c1a] border border-cyan-500/20 p-6 rounded-2xl animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input type="text" placeholder="Nombre completo" value={newPerson.name} onChange={e => setNewPerson({...newPerson, name: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm min-h-[44px]" />
            <input type="text" placeholder="Puesto" value={newPerson.position} onChange={e => setNewPerson({...newPerson, position: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm min-h-[44px]" />
            <input type="date" value={newPerson.start_date} onChange={e => setNewPerson({...newPerson, start_date: e.target.value})} className="bg-black/40 border border-slate-800 p-3 rounded-xl text-white outline-none focus:border-cyan-500 text-sm min-h-[44px]" />
            <button onClick={handleAddPerson} className="md:col-span-3 bg-cyan-500/20 text-cyan-400 py-3 rounded-xl font-bold border border-cyan-500/30 hover:bg-cyan-500/30 active:scale-95 touch-manipulation min-h-[44px]">DAR DE ALTA</button>
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
          <button key={v.id} onClick={() => setViewMode(v.id)} className={`w-full py-3 sm:py-3 rounded-xl text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest transition-all touch-manipulation min-h-[44px] active:scale-95 ${viewMode === v.id ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:bg-white/5'}`}>
            {v.label}
          </button>
        ))}
      </div>

      {viewMode === 'personal' && (<>
      {/* FILTROS */}
      <div className="flex flex-wrap gap-3 bg-[#040c1a] p-4 rounded-xl border border-slate-800">
        <select value={filterGender} onChange={e => setFilterGender(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2.5 sm:p-2 rounded-lg border border-slate-700 outline-none min-h-[44px] sm:min-h-0 touch-manipulation">
          <option value="all">Género: Todos</option><option value="Masculino">Masculino</option><option value="Femenino">Femenino</option>
        </select>
        <select value={filterAge} onChange={e => setFilterAge(e.target.value)} className="bg-black/40 text-slate-300 text-xs p-2.5 sm:p-2 rounded-lg border border-slate-700 outline-none min-h-[44px] sm:min-h-0 touch-manipulation">
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
                    <div className="flex items-center gap-2">
                      <h3 className="text-white font-bold text-sm sm:text-base leading-tight truncate">{item.name}</h3>
                      {(() => {
                        const st = (item.status || 'active').toLowerCase();
                        const cfg = { active: { label: 'Activo', cls: 'bg-green-500/15 text-green-400 border-green-500/30' }, vacations: { label: 'Vacaciones', cls: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30' }, sick: { label: 'Enfermo', cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30' }, eventual: { label: 'Eventual', cls: 'bg-violet-500/15 text-violet-400 border-violet-500/30' }, suspended: { label: 'Suspendido', cls: 'bg-rose-500/15 text-rose-400 border-rose-500/30' } };
                        const c = cfg[st] || cfg.active;
                        return <span className={`shrink-0 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-md border ${c.cls}`}>{c.label}</span>;
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 min-w-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${isWorkingNowForItem(item, attendance) ? 'bg-green-500 animate-pulse' : 'bg-slate-600'}`} />
                      <p className="text-[9px] sm:text-[10px] text-slate-500 font-bold uppercase tracking-wide leading-tight break-words">{item.position} • {isWorkingNowForItem(item, attendance) ? 'En Turno' : 'Fuera'}</p>
                    </div>
                  </div>
                </div>
                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3 sm:gap-6">
                  <select
                    value={item.status || 'active'}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => { e.stopPropagation(); saveEmployeeStatus(item, e.target.value); }}
                    className="bg-black/40 border border-slate-700 text-slate-300 text-[10px] px-2 py-1.5 rounded-lg outline-none focus:border-cyan-500 min-h-[36px] touch-manipulation"
                  >
                    <option value="active">Activo</option>
                    <option value="vacations">Vacaciones</option>
                    <option value="sick">Enfermedad</option>
                    <option value="eventual">Eventual</option>
                    <option value="suspended">Suspendido</option>
                    <option value="inactive">Inactivo (Baja)</option>
                  </select>
                  <div className="text-right">
                    <p className="text-[8px] sm:text-[9px] text-slate-500 font-black uppercase">Neto Semanal</p>
                    <p className="text-base sm:text-lg font-black text-emerald-400 leading-none">${formatMoney(payroll.netPay)}</p>
                  </div>
                  <span className={`text-slate-600 transform transition-transform ${expanded ? 'rotate-180' : ''}`}>▼</span>
                </div>
              </div>

              {expanded && (
                <div className="p-6 bg-black/40 border-t border-slate-800 animate-in slide-in-from-top-2 duration-200">
                  <div className="flex gap-1 mb-6 border-b border-slate-800 overflow-x-auto pb-px">
                    {['info', 'horario', 'nomina', 'reportes', 'notas'].map(t => (
                      <button key={t} onClick={() => {
                        setEmpTabs(p => ({...p, [item.id]: t}));
                        if(t === 'nomina') loadAttendance(item.id, item.employee_number, item.name);
                        if(t === 'reportes') loadReports(item.id);
                        if(t === 'notas') loadNotes(item.id);
                      }} className={`px-4 sm:px-5 py-3 sm:py-2.5 text-[10px] font-black uppercase tracking-widest transition-all touch-manipulation min-h-[44px] sm:min-h-0 whitespace-nowrap ${activeTab === t ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-500 hover:text-slate-300 active:text-slate-200'}`}>
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
                            <div className="flex justify-between text-xs text-cyan-400"><span>Hrs extra ({payroll.extraHours}h × $50)</span><span className="font-mono">+${formatMoney(payroll.extraPay)}</span></div>
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
                          <div className="grid grid-cols-3 gap-4">
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Puesto</label>
                              <input type="text" value={editingReport[item.id]?.position ?? item.position ?? ''} onChange={e => handleReportEdit(item.id, 'position', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Sueldo Diario</label>
                              <input type="number" value={editingReport[item.id]?.daily_salary ?? item.daily_salary ?? ''} onChange={e => handleReportEdit(item.id, 'daily_salary', e.target.value)} className="w-full bg-transparent border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none" />
                            </div>
                            <div><label className="text-[8px] text-slate-500 font-black uppercase mb-1 block">Estatus</label>
                              <select value={editingReport[item.id]?.status ?? item.status ?? 'active'} onChange={e => handleReportEdit(item.id, 'status', e.target.value)} className="w-full bg-black/40 border-b border-slate-700 text-white text-sm py-1 focus:border-cyan-500 outline-none">
                                <option value="active">Activo</option>
                                <option value="vacations">Vacaciones</option>
                                <option value="sick">Enfermedad</option>
                                <option value="eventual">Eventual</option>
                                <option value="suspended">Suspendido</option>
                                <option value="inactive">Inactivo (Baja)</option>
                              </select>
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
                            <div className="flex justify-between text-xs text-cyan-400"><span>Hrs extra ({payroll.extraHours}h × $50)</span><span className="font-mono">+${formatMoney(payroll.extraPay)}</span></div>
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
                    <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-300">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] text-purple-400 font-black uppercase tracking-widest">Horario Semanal (Vie — Jue)</p>
                          <p className="text-[9px] text-slate-600 mt-0.5">{(() => {
                            const ws = getWeekStartYmd(scheduleWeekOffset);
                            const we = new Date(new Date(ws).getTime() + 6 * 86400000);
                            return `${new Date(ws+'T12:00:00').toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — ${we.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`;
                          })()}</p>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => setScheduleWeekOffset(p => p - 1)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1.5 rounded hover:bg-cyan-500 hover:text-black touch-manipulation min-h-[36px]">←</button>
                          <button onClick={() => setScheduleWeekOffset(0)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1.5 rounded hover:bg-cyan-500 hover:text-black touch-manipulation min-h-[36px]">HOY</button>
                          <button onClick={() => setScheduleWeekOffset(p => p + 1)} className="text-[8px] bg-slate-800 text-slate-300 px-2 py-1.5 rounded hover:bg-cyan-500 hover:text-black touch-manipulation min-h-[36px]">→</button>
                        </div>
                      </div>
                      <div className="bg-[#0c1222] p-4 rounded-2xl border border-purple-500/20 shadow-2xl space-y-2">
                        {PAYROLL_DAY_NAMES.map((dayName, dIdx) => {
                          const draft = getScheduleDraftForItem(item)?.[dIdx] || {};
                          const dayType = draft.day_type || 'laboral';
                          const isLaboral = dayType === 'laboral';
                          const wsYmd = getWeekStartYmd(scheduleWeekOffset);
                          const dateObj = new Date(new Date(wsYmd+'T12:00:00').getTime() + dIdx * 86400000);
                          const dateYmd = dateObj.toISOString().slice(0, 10);
                          const dayTypeColors = { laboral: 'border-slate-700', descanso: 'border-blue-500/30 bg-blue-500/5', enfermedad: 'border-amber-500/30 bg-amber-500/5', vacaciones: 'border-cyan-500/30 bg-cyan-500/5', falta: 'border-red-500/30 bg-red-500/5', incapacidad: 'border-fuchsia-500/30 bg-fuchsia-500/5', permiso: 'border-violet-500/30 bg-violet-500/5' };
                          return (
                            <div key={dIdx} className={`rounded-xl border p-3 ${dayTypeColors[dayType] || 'border-slate-700'}`}>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                                <div className="flex items-center gap-2 sm:w-28 shrink-0">
                                  <p className="text-[10px] font-bold text-slate-300">{dayName}</p>
                                  <p className="text-[9px] text-slate-600">{dateObj.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</p>
                                </div>
                                <select
                                  className="bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 min-h-[36px] touch-manipulation"
                                  value={dayType}
                                  onChange={(e) => updateScheduleDraft(item, dIdx, 'day_type', e.target.value)}
                                >
                                  <option value="laboral">Laboral</option>
                                  <option value="descanso">Descanso</option>
                                  <option value="enfermedad">Enfermedad</option>
                                  <option value="vacaciones">Vacaciones</option>
                                  <option value="falta">Falta</option>
                                  <option value="incapacidad">Incapacidad</option>
                                  <option value="permiso">Permiso</option>
                                </select>
                                <input type="time" disabled={!isLaboral} className="bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 disabled:opacity-30 min-h-[36px] touch-manipulation" value={draft.entry || ''} onChange={(e) => updateScheduleDraft(item, dIdx, 'entry', e.target.value)} />
                                <span className="text-slate-600 text-[10px] hidden sm:inline">—</span>
                                <input type="time" disabled={!isLaboral} className="bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 disabled:opacity-30 min-h-[36px] touch-manipulation" value={draft.exit || ''} onChange={(e) => updateScheduleDraft(item, dIdx, 'exit', e.target.value)} />
                                <input type="text" placeholder="Nota..." className="flex-1 bg-slate-900 border border-slate-700 text-white text-[10px] p-1.5 rounded-lg outline-none focus:border-purple-500 min-h-[36px] touch-manipulation" value={draft.note || ''} onChange={(e) => updateScheduleDraft(item, dIdx, 'note', e.target.value)} />
                                <button onClick={() => saveDayOverride(item, dIdx, dateYmd, draft)} className="bg-purple-500/20 text-purple-300 px-2 py-1.5 rounded-lg text-[9px] font-bold border border-purple-500/20 hover:bg-purple-500/30 min-h-[36px] touch-manipulation shrink-0" title="Guardar este día">💾</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => saveSchedule(item)} disabled={!!savingSchedule[item.id]} className="w-full bg-purple-500/20 text-purple-400 py-3 rounded-xl text-[10px] font-black border border-purple-500/20 hover:bg-purple-500/30 transition-all touch-manipulation min-h-[44px]">
                        {savingSchedule[item.id] ? 'PROCESANDO...' : 'GUARDAR TODA LA SEMANA'}
                      </button>
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
                                    <option value="vacations">Vacaciones</option>
                                    <option value="sick">Enfermedad</option>
                                    <option value="eventual">Eventual</option>
                                    <option value="suspended">Suspendido</option>
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

      {/* VIEW HORARIO: SEMANA ACTUAL POR DÍA (Vie-Jue) */}
      {viewMode === 'horario' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-[#040c1a] p-4 rounded-2xl border border-slate-800">
            <div>
              <h2 className="text-white text-sm font-black uppercase tracking-widest">Horario Semanal (Vie — Jue)</h2>
              <p className="text-[10px] text-slate-500 mt-1">{(() => {
                const ws = getWeekStartYmd(scheduleWeekOffset);
                const friday = new Date(ws + 'T12:00:00');
                const thursday = new Date(friday.getTime() + 6 * 86400000);
                return `${friday.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})} — ${thursday.toLocaleDateString('es-MX',{day:'2-digit',month:'short',year:'numeric'})}`;
              })()}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setScheduleWeekOffset(p => p - 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-cyan-500 hover:text-black touch-manipulation min-h-[40px]">← Anterior</button>
              <button onClick={() => setScheduleWeekOffset(0)} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold touch-manipulation min-h-[40px]">Actual</button>
              <button onClick={() => setScheduleWeekOffset(p => p + 1)} className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-bold hover:bg-cyan-500 hover:text-black touch-manipulation min-h-[40px]">Siguiente →</button>
              <button
                onClick={exportScheduleReport}
                disabled={scheduleReportLoading}
                className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold disabled:opacity-60 touch-manipulation min-h-[40px]"
              >
                {scheduleReportLoading ? 'Generando...' : 'Exportar CSV'}
              </button>
            </div>
          </div>
          {scheduleReportSummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-2.5">
                <p className="text-[9px] text-cyan-200/70 uppercase">Registros</p>
                <p className="text-sm text-cyan-100 font-bold">{scheduleReportSummary.total_rows || 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                <p className="text-[9px] text-emerald-200/70 uppercase">Laboral</p>
                <p className="text-sm text-emerald-100 font-bold">{scheduleReportSummary.laboral || 0}</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5">
                <p className="text-[9px] text-amber-200/70 uppercase">Descanso</p>
                <p className="text-sm text-amber-100 font-bold">{scheduleReportSummary.descanso || 0}</p>
              </div>
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-2.5">
                <p className="text-[9px] text-rose-200/70 uppercase">Sin ponchar</p>
                <p className="text-sm text-rose-100 font-bold">{scheduleReportSummary.scheduled_missing_clock_in || 0}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            {PAYROLL_DAY_NAMES.map((dayName, dIdx) => {
              const today = new Date();
              const todayIdx = getWeekIndexFromJsDay(today.getDay());
              const isToday = scheduleWeekOffset === 0 && todayIdx === dIdx;
              const wsYmd = getWeekStartYmd(scheduleWeekOffset);
              const dateObj = new Date(new Date(wsYmd+'T12:00:00').getTime() + dIdx * 86400000);
              const employeesForDay = activeList.filter(emp => {
                const sch = getScheduleForItem(emp)?.[dIdx];
                return sch && !sch.is_day_off && (sch.entry || sch.exit);
              });
              const dayTypeLabels = { laboral: '', descanso: 'DESC', enfermedad: 'ENF', vacaciones: 'VAC', falta: 'FALTA', incapacidad: 'INCAP', permiso: 'PERM' };
              return (
                <div key={dIdx} className={`bg-[#040c1a] p-3 rounded-2xl border ${isToday ? 'border-cyan-500/60 shadow-lg shadow-cyan-500/10' : 'border-slate-800'}`}>
                  <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest ${isToday ? 'text-cyan-400' : 'text-slate-500'}`}>{dayName}</p>
                      <p className="text-[9px] text-slate-600">{dateObj.toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</p>
                    </div>
                    <span className="text-[9px] text-slate-600 font-mono">{employeesForDay.length}</span>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto overscroll-contain">
                    {employeesForDay.length === 0 && (
                      <p className="text-[9px] text-slate-700 text-center py-6">Nadie programado</p>
                    )}
                    {activeList.map(emp => {
                      const sch = getScheduleForItem(emp)?.[dIdx] || {};
                      const dt = sch.day_type || (sch.is_day_off ? 'descanso' : (sch.entry ? 'laboral' : null));
                      if (!dt) return null;
                      const att = isToday ? getAttendanceForItem(emp) : null;
                      const isWorkingNow = dt === 'laboral' && isWorkingNowForItem(emp, att);
                      const isLate = isToday && dt === 'laboral' && !att?.clock_in && sch.entry && (() => {
                        const [eH, eM] = sch.entry.split(':').map(Number);
                        const eT = new Date(); eT.setHours(eH, eM, 0, 0);
                        return today > eT;
                      })();
                      const dtLabel = dayTypeLabels[dt] || '';
                      const dtColors = { descanso: 'text-blue-400', enfermedad: 'text-amber-400', vacaciones: 'text-cyan-400', falta: 'text-red-400', incapacidad: 'text-fuchsia-400', permiso: 'text-violet-400' };
                      return (
                        <button key={emp.id} onClick={() => { setViewMode('personal'); setExpandedItems(p => ({...p, [emp.id]: true})); setEmpTabs(p => ({...p, [emp.id]: 'horario'})); }} className={`w-full text-left bg-black/30 hover:bg-cyan-500/10 border hover:border-cyan-500/30 p-2.5 rounded-xl transition-all touch-manipulation ${isLate ? 'border-red-500/40 bg-red-500/5' : 'border-white/[0.03]'}`}>
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isWorkingNow ? 'bg-green-500 animate-pulse' : isLate ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
                            <p className="text-[11px] text-white font-bold truncate flex-1">{emp.name}</p>
                            {dtLabel && <span className={`text-[8px] font-black ${dtColors[dt] || 'text-slate-400'}`}>{dtLabel}</span>}
                          </div>
                          {dt === 'laboral' && <p className="text-[9px] text-cyan-400 font-mono mt-1 ml-3.5">{sch.entry || '--:--'} — {sch.exit || '--:--'}</p>}
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
            <h2 className="text-white text-sm font-black uppercase tracking-widest">Nómina Semanal (Vie — Jue)</h2>
            <p className="text-[10px] text-slate-500 mt-1">Periodo de nómina: viernes a jueves · Hora extra: $50/hr · Resumen de pago para colaboradores activos</p>
          </div>
          <div className="bg-[#040c1a] p-4 rounded-2xl border border-cyan-500/20 space-y-3">
            <div className="flex flex-col md:flex-row md:items-end gap-2">
              <div>
                <p className="text-[10px] text-slate-400 uppercase mb-1">Periodo inicio</p>
                <input type="date" value={periodReportStart} onChange={(e) => setPeriodReportStart(e.target.value)} className="bg-black/40 border border-slate-700 text-white text-xs px-2.5 py-2 rounded-lg" />
              </div>
              <div>
                <p className="text-[10px] text-slate-400 uppercase mb-1">Periodo fin</p>
                <input type="date" value={periodReportEnd} onChange={(e) => setPeriodReportEnd(e.target.value)} className="bg-black/40 border border-slate-700 text-white text-xs px-2.5 py-2 rounded-lg" />
              </div>
              <button onClick={generatePeriodEmployeeReport} disabled={periodReportLoading} className="px-3 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold disabled:opacity-60">
                {periodReportLoading ? 'Generando...' : 'Generar reporte del periodo'}
              </button>
              <button onClick={exportPeriodEmployeeReportCsv} className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                Exportar CSV
              </button>
            </div>
            <div className="rounded-xl border border-slate-800 bg-black/20 p-2.5">
              <p className="text-[10px] text-slate-500 uppercase mb-2">Filtrar empleados (vacío = todos)</p>
              <div className="max-h-28 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {activeList.map((emp) => {
                  const idKey = String(emp.employee_number || emp.id || '');
                  const selected = selectedPeriodEmployees.includes(idKey);
                  return (
                    <button
                      key={`pick-${emp.id}`}
                      onClick={() => togglePeriodEmployee(idKey)}
                      className={`text-left rounded-lg border px-2.5 py-1.5 text-[10px] ${selected ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-slate-700 bg-black/20 text-slate-300'}`}
                    >
                      <p className="font-bold truncate">{emp.name}</p>
                      <p className="text-[9px] opacity-70 truncate">{emp.position}</p>
                    </button>
                  );
                })}
              </div>
            </div>
            {periodReportSummary && (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-2"><p className="text-[9px] text-rose-300/70 uppercase">Faltas</p><p className="text-sm text-rose-200 font-bold">{periodReportSummary.total_faltas || 0}</p></div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2"><p className="text-[9px] text-amber-300/70 uppercase">Ausencias</p><p className="text-sm text-amber-200 font-bold">{periodReportSummary.total_ausencias || 0}</p></div>
                <div className="rounded-lg border border-fuchsia-500/20 bg-fuchsia-500/5 p-2"><p className="text-[9px] text-fuchsia-300/70 uppercase">Enfermedades</p><p className="text-sm text-fuchsia-200 font-bold">{periodReportSummary.total_enfermedades || 0}</p></div>
                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-2"><p className="text-[9px] text-cyan-300/70 uppercase">Vacaciones</p><p className="text-sm text-cyan-200 font-bold">{periodReportSummary.total_vacaciones || 0}</p></div>
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2"><p className="text-[9px] text-emerald-300/70 uppercase">No iba y si estuvo</p><p className="text-sm text-emerald-200 font-bold">{periodReportSummary.total_unexpected_present || 0}</p></div>
              </div>
            )}
            {periodReportRows.length > 0 && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="min-w-full text-[10px]">
                  <thead className="bg-black/40 text-slate-300">
                    <tr>
                      <th className="px-2 py-2 text-left">Empleado</th>
                      <th className="px-2 py-2 text-right">Faltas</th>
                      <th className="px-2 py-2 text-right">Ausencias</th>
                      <th className="px-2 py-2 text-right">Enfermedad</th>
                      <th className="px-2 py-2 text-right">Vacaciones</th>
                      <th className="px-2 py-2 text-right">No iba y si estuvo</th>
                      <th className="px-2 py-2 text-right">Horas</th>
                      <th className="px-2 py-2 text-right">Nómina periodo</th>
                      <th className="px-2 py-2 text-right">Nómina semanal</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periodReportRows.map((row, idx) => (
                      <tr key={`${row.employee_id}-${idx}`} className="border-t border-slate-800 text-slate-200">
                        <td className="px-2 py-2">
                          <p className="font-bold">{row.employee_name}</p>
                          <p className="text-[9px] text-slate-500">{row.position}</p>
                        </td>
                        <td className="px-2 py-2 text-right text-rose-300">{row.faltas}</td>
                        <td className="px-2 py-2 text-right text-amber-300">{row.ausencias}</td>
                        <td className="px-2 py-2 text-right text-fuchsia-300">{row.enfermedades}</td>
                        <td className="px-2 py-2 text-right text-cyan-300">{row.vacaciones}</td>
                        <td className="px-2 py-2 text-right text-emerald-300">{row.unexpected_present || 0}</td>
                        <td className="px-2 py-2 text-right">
                          <p>{row.hours_worked} / {row.hours_scheduled}</p>
                          <p className={`text-[9px] ${Number(row.hours_balance) < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{Number(row.hours_balance) >= 0 ? '+' : ''}{row.hours_balance}</p>
                        </td>
                        <td className="px-2 py-2 text-right text-white font-mono">${formatMoney(row.payroll_period)}</td>
                        <td className="px-2 py-2 text-right text-emerald-300 font-mono">${formatMoney(row.payroll_weekly)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-slate-400 uppercase">Ventas por colaborador (mesero/bartender)</p>
                  {performanceLoading && <span className="text-[10px] text-cyan-400">Cargando...</span>}
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceReport.staff_performance.slice(0, 10)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="employee_name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="total_sales" fill="#22d3ee" name="Ventas" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                <p className="text-[10px] text-slate-400 uppercase mb-2">Ticket promedio por colaborador</p>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceReport.staff_performance.slice(0, 10)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="employee_name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-20} textAnchor="end" height={60} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="avg_ticket" fill="#a78bfa" name="Ticket promedio" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                <p className="text-[10px] text-slate-400 uppercase mb-2">Productos mas vendidos</p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceReport.top_products.slice(0, 8)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="product_name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={65} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="total_qty" fill="#34d399" name="Cantidad" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="rounded-xl border border-slate-800 bg-black/20 p-3">
                <p className="text-[10px] text-slate-400 uppercase mb-2">Productos menos vendidos</p>
                <div className="h-60">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={performanceReport.bottom_products.slice(0, 8)} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.15)" />
                      <XAxis dataKey="product_name" tick={{ fill: '#94a3b8', fontSize: 10 }} interval={0} angle={-18} textAnchor="end" height={65} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip />
                      <Bar dataKey="total_qty" fill="#f59e0b" name="Cantidad" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
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
                    <div className="flex justify-between text-[10px]"><span className="text-cyan-400">Hrs extra ({payroll.extraHours}h × $50)</span><span className="text-cyan-400 font-mono">+${formatMoney(payroll.extraPay)}</span></div>
                    <div className="flex justify-between pt-2 border-t border-slate-800 text-xs font-black"><span className="text-white">Neto</span><span className="text-emerald-400 font-mono">${formatMoney(payroll.netPay)}</span></div>
                  </div>
                  <button onClick={() => { setViewMode('personal'); setExpandedItems(p => ({...p, [emp.id]: true})); setEmpTabs(p => ({...p, [emp.id]: 'nomina'})); loadAttendance(emp.id, emp.employee_number, emp.name); }} className="w-full mt-3 bg-cyan-500/10 text-cyan-400 py-2 rounded-lg text-[9px] font-black border border-cyan-500/20 hover:bg-cyan-500/20 uppercase tracking-widest touch-manipulation min-h-[40px]">Ver detalle</button>
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
