import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import ReservationFloorPlan from '../../components/ReservationFloorPlan';
import { VENUE_TABLES } from '../../data/venueTablesCatalog';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/** Refresco del mapa y «mesas por hora» mientras el panel está abierto (POS / SR sin WebSockets). */
const FLOOR_MAP_POLL_MS = 12000;

// Función para formatear códigos de mesa al nuevo formato amigable
const formatTableCode = (tableCode) => {
  if (!tableCode) return 'Por asignar';

  const u = String(tableCode).toUpperCase();
  if (/^M([1-9]|1[0-1])$/.test(u)) return `Comedor ${u} (SR)`;
  if (/^T(1[6-9]|2[0-2])$/.test(u)) return `Terraza alta ${u} (SR)`;
  if (/^TB[1-8]$/.test(u)) return `Terraza baja TB${u.slice(2)} (SR)`;
  if (/^BARR-I[1-5]$/.test(u)) return `Bar taburete int. ${u.slice(-1)}`;
  if (/^BARR-E[1-5]$/.test(u)) return `Bar taburete ext. ${u.slice(-1)}`;

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
  
  if (String(tableCode).toUpperCase().startsWith('WEB-')) {
    return tableCode;
  }

  // Si ya tiene el nuevo formato, devolverlo tal cual
  return tableCode;
};

/**
 * Igual que `api/lib/table_venue_codes.php` (M2P4→M2, "2"→M2, CD-1→M1, …).
 */
function canonicalVenueTableCode(raw) {
  let s = String(raw || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '');
  if (!s) return null;
  if (/^WEB-/i.test(s)) return s;
  s = s.replace(/P\d+$/i, '');
  let m = s.match(/^M0*(\d+)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 11) return `M${n}`;
  }
  m = s.match(/^T0*(\d+)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 22) return `T${n}`;
  }
  m = s.match(/^TB0*(\d+)$/i);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 8) return `TB${n}`;
  }
  if (/^BARR-I[1-5]$/.test(s) || /^BARR-E[1-5]$/.test(s)) return s;
  m = s.match(/^B-(\d+)$/);
  if (m) {
    const tb = parseInt(m[1], 10) - 10;
    if (tb >= 1 && tb <= 8) return `TB${tb}`;
  }
  m = s.match(/^CD-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 11) return `M${n}`;
  }
  m = s.match(/^TA-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 16 && n <= 22) return `T${n}`;
    if (n === 15) return 'T16';
  }
  m = s.match(/^TB-(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 8) return `TB${n}`;
  }
  m = s.match(/^(\d{1,2})$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n <= 11) return `M${n}`;
    if (n >= 16 && n <= 22) return `T${n}`;
    if (n === 15) return 'T16';
  }
  return null;
}

/** Compat: reservas legado + claves POS antes de normalizar en servidor. */
function legacyTableCodeToVenueCode(raw) {
  const c = canonicalVenueTableCode(raw);
  if (c != null && c !== '') return c;
  return String(raw || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '');
}

/** Indexa por código API y por alias canónico del plano. */
function normalizeFloorCodesMap(byCode) {
  const out = {};
  Object.keys(byCode || {}).forEach((k) => {
    const val = byCode[k];
    const ku = String(k).toUpperCase().trim();
    if (!ku) return;
    out[ku] = val;
    const canon = legacyTableCodeToVenueCode(ku);
    if (canon && canon !== ku) out[canon] = val;
  });
  return out;
}

/** Muestra hora local Hermosillo a partir de ISO8601 (meta.generated_at del API). */
function formatFloorStateUpdatedClock(iso) {
  if (!iso || typeof iso !== 'string') return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-MX', {
    timeZone: 'America/Hermosillo',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function formatMoneyMx(n) {
  const x = Number(n);
  if (Number.isNaN(x)) return '—';
  return `${x.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

function truncateText(s, max = 220) {
  const t = String(s || '');
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Capacidad efectiva cuando la reserva usa mesa junta (`secondary_table_code`). */
function mergedVenueCoverCapacity(reservation, venueTableCapacityFallback = 99) {
  const res = reservation;
  if (!res?.table_code) return venueTableCapacityFallback;
  const pc =
    canonicalVenueTableCode(String(res.table_code).toUpperCase().trim())
    ?? String(res.table_code).toUpperCase().trim();
  const tMain = VENUE_TABLES.find((t) => t.code === pc);
  let cap = tMain?.capacity ?? venueTableCapacityFallback;
  const rawS = res.secondary_table_code;
  if (rawS == null || String(rawS).trim() === '') return cap;
  const sc =
    canonicalVenueTableCode(String(rawS).toUpperCase().trim()) ??
    String(rawS).toUpperCase().trim();
  if (!sc || sc === pc) return cap;
  const t2 = VENUE_TABLES.find((t) => t.code === sc);
  return cap + (t2?.capacity ?? 0);
}

/** True si esa fila de `occupiedTables` incluye ese código como mesa principal o junta, mismo día/hora. */
function reservationsSlotClaimsVenueTable(occupiedRow, candidateCodeCanon, reservationDateStr, hm5, excludeReservationId) {
  if (
    excludeReservationId != null &&
    Number((occupiedRow && occupiedRow.id) ?? 0) === Number(excludeReservationId)
  ) {
    return false;
  }
  if (
    occupiedRow?.reservation_date == null ||
    String(occupiedRow.reservation_date).slice(0, 10) !== String(reservationDateStr || '').slice(0, 10)
  ) {
    return false;
  }
  const occHm = String(occupiedRow.reservation_time || '').slice(0, 5);
  if (occHm !== String(hm5 || '').slice(0, 5)) return false;
  const want =
    canonicalVenueTableCode(String(candidateCodeCanon || '').toUpperCase().trim()) ??
    String(candidateCodeCanon || '').toUpperCase().trim();
  if (!want) return false;
  const p =
    canonicalVenueTableCode(String(occupiedRow.table_code || '').toUpperCase().trim()) ??
    String(occupiedRow.table_code || '').toUpperCase().trim();
  const sRaw =
    occupiedRow.secondary_table_code != null
      ? String(occupiedRow.secondary_table_code).toUpperCase().trim()
      : '';
  const q = sRaw ? canonicalVenueTableCode(sRaw) ?? sRaw : '';
  return want !== '' && (want === p || (q !== '' && want === q));
}

/** Líneas para tooltip (title) con ticket SR completo. */
function buildTicketTooltipLines(ticket) {
  if (!ticket?.sale) return [];
  const s = ticket.sale;
  const lines = [
    '— Ticket SR (abierto) —',
    `Folio: ${s.folio || s.sr_ticket_id || '—'} · Cheque: ${s.ticket_number || '—'}`,
    `Mesa en SR (raw): ${s.table_number_raw || '—'}`,
    `Mesero: ${s.waiter_name || '—'} · Cubiertos: ${s.covers ?? '—'}`,
    `Abierto: ${s.opened_at || s.sale_datetime || '—'}`,
    `Subtotal ${formatMoneyMx(s.subtotal)} · IVA ${formatMoneyMx(s.tax)} · Desc ${formatMoneyMx(s.discount)} · Propina ${formatMoneyMx(s.tip)}`,
    `TOTAL ${formatMoneyMx(s.total)} · Tipo cobro: ${s.payment_type || '—'}`,
  ];
  if (Number(s.cash_amount) > 0 || Number(s.card_amount) > 0) {
    lines.push(
      `Pagos: efectivo ${formatMoneyMx(s.cash_amount)} · tarjeta ${formatMoneyMx(s.card_amount)} · vales ${formatMoneyMx(s.voucher_amount)} · otros ${formatMoneyMx(s.other_amount)}`,
    );
  }
  const items = Array.isArray(ticket.items) ? ticket.items : [];
  if (items.length) {
    lines.push('— Conceptos del ticket —');
    items.slice(0, 45).forEach((it, i) => {
      const nm = String(it.product_name || '');
      const note = it.notes ? ` (${it.notes})` : '';
      lines.push(
        `${i + 1}. ${nm} ×${it.quantity} @${formatMoneyMx(it.unit_price)} → ${formatMoneyMx(it.subtotal)}${Number(it.discount) > 0 ? ` desc ${formatMoneyMx(it.discount)}` : ''}${note}`,
      );
    });
    if (items.length > 45) lines.push(`… +${items.length - 45} conceptos más`);
  }
  return lines;
}

/** Día de las Madres: nunca para reservas WEB (/reservacion); solo slug dia-madres u ocasión legacy (sin categoría general). */
const isMothersDayOccasion = (row) => {
  const code = String(row?.table_code || '').toUpperCase()
  if (code.startsWith('WEB-')) return false
  const slug = String(row?.event_type_slug || '').toLowerCase()
  if (slug === 'general') return false
  if (slug === 'dia-madres') return true
  const occ = String(row?.occasion || '')
  return occ === 'Dia de las Madres' || occ === 'Día de las Madres'
}

const isWebGeneralReservation = (row) =>
  String(row?.table_code || '').toUpperCase().startsWith('WEB-')

/** Categoría “reserva general” (no confundir con solo canal web). */
const isGeneralCategoryReservation = (row) => {
  const slug = String(row?.event_type_slug || '').toLowerCase()
  if (slug === 'general') return true
  const occ = String(row?.occasion || '')
  const isMother =
    occ === 'Dia de las Madres' || occ === 'Día de las Madres' || slug === 'dia-madres'
  if (isMother) return false
  if (row?.event_type_id == null || row?.event_type_id === '') {
    return true
  }
  return false
}

/** Etiqueta de categoría; el canal “web” va aparte (chip). */
const reservationOccasionLabel = (row) => {
  const slug = String(row?.event_type_slug || '').toLowerCase()
  const occ = String(row?.occasion || '').trim()
  if (slug === 'general') return 'Reserva general'
  if (slug === 'dia-madres' || occ === 'Dia de las Madres' || occ === 'Día de las Madres') {
    return occ || row?.event_type_name || 'Día de las Madres'
  }
  if (row?.event_type_name) return row.event_type_name
  if (isGeneralCategoryReservation(row)) return 'Reserva general'
  return occ || row?.event_type_name || '—'
}

const statusStyles = {
  pending: 'border-amber-500/35 bg-amber-500/15 text-amber-300',
  uploaded: 'border-blue-500/35 bg-blue-500/15 text-blue-300',
  confirmed: 'border-emerald-500/35 bg-emerald-500/15 text-emerald-300',
  cancelled: 'border-rose-500/35 bg-rose-500/15 text-rose-300',
  completed: 'border-cyan-500/35 bg-cyan-500/15 text-cyan-300',
};

/** Comprobante en BD: `deposit_status`. Compat: filas con `status === 'uploaded'` (incorrecto ante el enum actual). */
function reservationHasComprobante(row) {
  if (!row) return false
  const ds = String(row.deposit_status || '')
  if (ds === 'uploaded' || ds === 'confirmed') return true
  return String(row.status || '') === 'uploaded'
}

/** Clave visual para badges (sidebar / listas): “Comprobante” si hay garantía adjunta pero reserva sigue pendiente. */
function reservationStatusUiKey(row) {
  if (!row) return 'pending'
  const st = String(row.status || 'pending')
  if (['confirmed', 'cancelled', 'completed'].includes(st)) return st
  if (reservationHasComprobante(row)) return 'uploaded'
  return st === 'pending' ? 'pending' : st
}

function reservationStatusLabel(row) {
  if (!row) return '—'
  const st = String(row.status || '')
  if (st === 'confirmed') return 'Confirmada'
  if (st === 'cancelled') return 'Cancelada'
  if (st === 'completed') return 'Completada'
  if (reservationHasComprobante(row)) return 'Comprobante'
  if (st === 'pending') return 'Pendiente'
  return st || '—'
}

const DEFAULT_MOTHERS_DATE = '2026-05-10';

/** Hoy en calendario America/Hermosillo (YYYY-MM-DD). */
function dateYmdHermosillo() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Hermosillo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const pick = (t) => parts.find((p) => p.type === t)?.value || '';
  const y = pick('year');
  const m = pick('month');
  const d = pick('day');
  if (y && m && d) return `${y}-${m}-${d}`;
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function normalizeEventDate(raw) {
  if (!raw) return '';
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : '';
}

/**
 * Fecha enviada a list.php / occupied-tables.php:
 * - Reserva general → siempre día en curso (Hermosillo).
 * - Día de las Madres → fecha del tipo `dia-madres` en catálogo, o 10 may 2026 por defecto.
 * - Otro tipo con event_date → esa fecha.
 * - Si no aplica lo anterior → dateFilter (manual).
 */
function effectiveReservationQueryDate(eventFilter, eventTypeFilter, dateFilter, eventTypes) {
  const today = dateYmdHermosillo();
  const list = Array.isArray(eventTypes) ? eventTypes : [];
  const byId = Object.fromEntries(list.map((e) => [String(e.id), e]));
  const mothersRow = list.find((e) => String(e.slug || '').toLowerCase() === 'dia-madres');
  const mothersDate = normalizeEventDate(mothersRow?.event_date) || DEFAULT_MOTHERS_DATE;

  if (eventFilter === 'general') return today;

  if (eventFilter === 'mothers_day') return mothersDate;

  if (eventTypeFilter) {
    const et = byId[eventTypeFilter];
    if (!et) return dateFilter || '';
    const slug = String(et.slug || '').toLowerCase();
    if (slug === 'dia-madres') return mothersDate;
    if (slug === 'general') return today;
    const ed = normalizeEventDate(et.event_date);
    if (ed) return ed;
  }

  return dateFilter || '';
}

/** Parámetros GET compartidos entre `occupied-tables.php` y `floor-state.php` (mapa + lista por hora). */
function buildMapOccupiedQueryParams({
  floorIndependentView,
  floorViewDate,
  floorViewScope,
  floorViewEventTypeId,
  eventFilter,
  eventTypeFilter,
  dateFilter,
  eventTypes,
}) {
  const qs = new URLSearchParams();

  if (floorIndependentView) {
    const date = normalizeEventDate(floorViewDate) || dateYmdHermosillo();
    qs.set('date', date);
    if (floorViewScope === 'general') qs.set('event', 'general');
    else if (floorViewScope === 'normal') qs.set('event', 'normal');
    else if (floorViewScope === 'mothers_day') qs.set('event', 'mothers_day');
    else if (floorViewScope === 'event_type' && floorViewEventTypeId) {
      qs.set('event_type_id', String(floorViewEventTypeId));
    }
  } else {
    const eff = effectiveReservationQueryDate(eventFilter, eventTypeFilter, dateFilter, eventTypes);
    if (eff) qs.set('date', eff);
    if (eventFilter) qs.set('event', eventFilter);
    if (eventTypeFilter && eventFilter !== 'general' && eventFilter !== 'mothers_day') {
      qs.set('event_type_id', eventTypeFilter);
    }
  }

  // Sin fecha explícita (p. ej. filtros «Todas» + calendario vacío), el mapa y ocupación usan el día actual.
  if (!qs.get('date')) {
    qs.set('date', dateYmdHermosillo());
  }

  return qs;
}

function timelineSlotTone(level) {
  switch (level) {
    case 'low':
      return 'bg-emerald-800/85 border-emerald-500/35 text-emerald-100';
    case 'medium':
      return 'bg-amber-800/85 border-amber-500/35 text-amber-50';
    case 'high':
      return 'bg-rose-900/85 border-rose-500/40 text-rose-50';
    default:
      return 'bg-slate-800/60 border-slate-600/35 text-slate-400';
  }
}

function Reservations() {
  const [reservations, setReservations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(() => dateYmdHermosillo());
  const [eventFilter, setEventFilter] = useState(''); // all, mothers_day, normal
  const [eventTypeFilter, setEventTypeFilter] = useState('');
  const [eventTypes, setEventTypes] = useState([]);
  const [eventTypeName, setEventTypeName] = useState('');
  const [homeEventSaving, setHomeEventSaving] = useState(false);
  const [selected, setSelected] = useState(null);
  const [editingReservation, setEditingReservation] = useState(false);
  const [savingReservationEdit, setSavingReservationEdit] = useState(false);
  const [reservationDraft, setReservationDraft] = useState({
    customer_name: '',
    phone: '',
    email: '',
    guests: 2,
    reservation_date: '',
    reservation_time: '',
    occasion: '',
    event_type_id: '',
    status: 'pending',
    notes: '',
  });
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
  const [floorReservationByCode, setFloorReservationByCode] = useState({});
  const [floorPosByCode, setFloorPosByCode] = useState({});
  /** { [venueCode]: { sale: object, items: array } } desde sr_sales / sr_sale_items (floor-state). */
  const [floorTicketByCode, setFloorTicketByCode] = useState({});
  /**
   * undefined = reflejar la mesa de la reserva seleccionada en el mapa / panel POS.
   * string vacío = usuario hizo clic en el fondo del plano: sin foco de mesa.
   * texto = mesa fijada explícitamente por clic en el mapa u otras acciones (p. ej. asignación).
   */
  const [mapSelectionOverride, setMapSelectionOverride] = useState(undefined);
  const [floorMapBusy, setFloorMapBusy] = useState(false);
  /** ISO8601 del último floor-state exitoso (servidor, meta.generated_at). */
  const [floorStateUpdatedAt, setFloorStateUpdatedAt] = useState('');
  /** Vista propia para mapa + «Mesas ocupadas por hora» (fecha y categoría sin atarse a «general = hoy»). */
  const [floorIndependentView, setFloorIndependentView] = useState(false);
  const [floorViewDate, setFloorViewDate] = useState(() => dateYmdHermosillo());
  /** all | general | normal | mothers_day | event_type */
  const [floorViewScope, setFloorViewScope] = useState('general');
  const [floorViewEventTypeId, setFloorViewEventTypeId] = useState('');
  const [floorViewUseSlot, setFloorViewUseSlot] = useState(false);
  const [floorViewSlotTime, setFloorViewSlotTime] = useState('19:00');
  const [timelineSlots, setTimelineSlots] = useState([]);
  const [timelineMeta, setTimelineMeta] = useState(null);
  const [timelineMode, setTimelineMode] = useState('calendar_day');
  const [timelineReplayIndex, setTimelineReplayIndex] = useState(0);
  const [timelineReplayPlaying, setTimelineReplayPlaying] = useState(false);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [tableActivity, setTableActivity] = useState(null);
  const [tableActivityLoading, setTableActivityLoading] = useState(false);
  const [focusDetailTab, setFocusDetailTab] = useState('live');
  /** Detalle de mesa: ventana emergente al hacer clic en el plano (sin Mayús en modo normal). */
  const [tableDetailModalOpen, setTableDetailModalOpen] = useState(false);
  /** Vista de colores del mapa: operación POS vs sólo capa de reservas (sin mezclar rojo/ámbar POS). */
  const [floorMapColorMode, setFloorMapColorMode] = useState('operations');
  const [secondaryMergeDraft, setSecondaryMergeDraft] = useState('');

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (statusFilter) qs.set('status', statusFilter);
      const effDate = effectiveReservationQueryDate(eventFilter, eventTypeFilter, dateFilter, eventTypes);
      if (effDate) qs.set('date', effDate);
      if (eventFilter) qs.set('event', eventFilter);
      if (eventTypeFilter && eventFilter !== 'general' && eventFilter !== 'mothers_day') {
        qs.set('event_type_id', eventTypeFilter);
      }
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
  }, [statusFilter, dateFilter, eventFilter, eventTypeFilter, eventTypes, selected]);

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
      const qs = buildMapOccupiedQueryParams({
        floorIndependentView,
        floorViewDate,
        floorViewScope,
        floorViewEventTypeId,
        eventFilter,
        eventTypeFilter,
        dateFilter,
        eventTypes,
      });
      if (floorIndependentView && floorViewUseSlot && floorViewSlotTime) {
        const hm = String(floorViewSlotTime).slice(0, 5);
        if (/^\d{2}:\d{2}$/.test(hm)) qs.set('time', hm);
      }
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
  }, [
    dateFilter,
    eventTypeFilter,
    eventFilter,
    eventTypes,
    floorIndependentView,
    floorViewDate,
    floorViewScope,
    floorViewEventTypeId,
    floorViewUseSlot,
    floorViewSlotTime,
  ]);

  const loadFloorState = useCallback(async () => {
    const qs = buildMapOccupiedQueryParams({
      floorIndependentView,
      floorViewDate,
      floorViewScope,
      floorViewEventTypeId,
      eventFilter,
      eventTypeFilter,
      dateFilter,
      eventTypes,
    });
    const dateParam = qs.get('date');
    if (!dateParam) {
      setFloorReservationByCode({});
      setFloorPosByCode({});
      setFloorTicketByCode({});
      setFloorStateUpdatedAt('');
      return;
    }
    if (floorIndependentView && floorViewUseSlot && floorViewSlotTime) {
      const hm = String(floorViewSlotTime).slice(0, 5);
      if (/^\d{2}:\d{2}$/.test(hm)) qs.set('time', hm);
    } else if (!floorIndependentView) {
      const selDate = selected?.reservation_date ? String(selected.reservation_date).slice(0, 10) : '';
      const hm = selected?.reservation_time ? String(selected.reservation_time).slice(0, 5) : '';
      if (hm && selDate && dateParam && selDate === dateParam) {
        qs.set('time', hm);
      }
    }
    setFloorMapBusy(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/floor-state.php?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setFloorReservationByCode(normalizeFloorCodesMap(data.reservation_by_code || {}));
        setFloorPosByCode(normalizeFloorCodesMap(data.pos_by_code || {}));
        const tb = data.ticket_by_code || {};
        const normT = {};
        Object.keys(tb).forEach((k) => {
          const ku = String(k).toUpperCase().trim();
          if (!ku) return;
          normT[ku] = tb[k];
          const canon = legacyTableCodeToVenueCode(ku);
          if (canon && canon !== ku) normT[canon] = tb[k];
        });
        setFloorTicketByCode(normT);
        const gen = data.meta && typeof data.meta.generated_at === 'string' ? data.meta.generated_at : '';
        setFloorStateUpdatedAt(gen || new Date().toISOString());
      } else {
        setFloorReservationByCode({});
        setFloorPosByCode({});
        setFloorTicketByCode({});
      }
    } catch {
      setFloorReservationByCode({});
      setFloorPosByCode({});
      setFloorTicketByCode({});
    } finally {
      setFloorMapBusy(false);
    }
  }, [
    dateFilter,
    eventTypeFilter,
    eventFilter,
    eventTypes,
    selected?.reservation_time,
    floorIndependentView,
    floorViewDate,
    floorViewScope,
    floorViewEventTypeId,
    floorViewUseSlot,
    floorViewSlotTime,
    selected?.reservation_date,
  ]);

  const loadOccupancyTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const token = localStorage.getItem('token');
      const qs = buildMapOccupiedQueryParams({
        floorIndependentView,
        floorViewDate,
        floorViewScope,
        floorViewEventTypeId,
        eventFilter,
        eventTypeFilter,
        dateFilter,
        eventTypes,
      });
      qs.set('mode', timelineMode);
      qs.set('slot_minutes', '30');
      const res = await fetch(`${API_BASE}/reservations/occupancy-day-timeline.php?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) {
        setTimelineSlots(Array.isArray(data.slots) ? data.slots : []);
        setTimelineMeta(data.meta || null);
      } else {
        setTimelineSlots([]);
        setTimelineMeta(null);
      }
    } catch {
      setTimelineSlots([]);
      setTimelineMeta(null);
    } finally {
      setTimelineLoading(false);
    }
  }, [
    dateFilter,
    eventTypeFilter,
    eventFilter,
    eventTypes,
    floorIndependentView,
    floorViewDate,
    floorViewScope,
    floorViewEventTypeId,
    timelineMode,
  ]);

  useEffect(() => {
    loadReservations();
  }, [loadReservations]);

  useEffect(() => {
    loadOccupiedTables();
  }, [loadOccupiedTables]);

  useEffect(() => {
    loadFloorState();
  }, [loadFloorState]);

  useEffect(() => {
    void loadOccupancyTimeline();
  }, [loadOccupancyTimeline]);

  useEffect(() => {
    setTimelineReplayIndex(0);
  }, [timelineSlots]);

  useEffect(() => {
    if (!timelineReplayPlaying || !timelineSlots.length) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const slots = timelineSlots;
    const id = setInterval(() => {
      setTimelineReplayIndex((i) => {
        if (!slots.length) return 0;
        const ni = (i + 1) % slots.length;
        const s = slots[ni];
        if (s?.clock) {
          setFloorViewUseSlot(true);
          setFloorViewSlotTime(String(s.clock).slice(0, 5));
        }
        return ni;
      });
    }, 1150);
    return () => clearInterval(id);
  }, [timelineReplayPlaying, timelineSlots]);

  useEffect(() => {
    if (timelineReplayPlaying) setFloorViewUseSlot(true);
  }, [timelineReplayPlaying]);

  useEffect(() => {
    if (!timelineSlots.length) return;
    if (!floorViewUseSlot && !timelineReplayPlaying) return;
    const i = Math.min(Math.max(0, timelineReplayIndex), timelineSlots.length - 1);
    const s = timelineSlots[i];
    if (s?.clock) setFloorViewSlotTime(String(s.clock).slice(0, 5));
  }, [timelineReplayIndex, timelineSlots, floorViewUseSlot, timelineReplayPlaying]);

  useEffect(() => {
    if (!tableDetailModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setTableDetailModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tableDetailModalOpen]);

  useEffect(() => {
    const tick = () => {
      if (typeof document !== 'undefined' && document.hidden) return;
      loadFloorState();
      loadOccupiedTables();
      void loadOccupancyTimeline();
    };
    const id = setInterval(tick, FLOOR_MAP_POLL_MS);
    const onVis = () => {
      if (!document.hidden) {
        loadFloorState();
        loadOccupiedTables();
        void loadOccupancyTimeline();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [loadFloorState, loadOccupiedTables, loadOccupancyTimeline]);

  useEffect(() => {
    setMapSelectionOverride(undefined);
  }, [selected?.id, selected?.table_code]);

  const effectiveMapPinCode =
    mapSelectionOverride === undefined
      ? String(selected?.table_code || '').toUpperCase().trim()
      : String(mapSelectionOverride || '').toUpperCase().trim();

  useEffect(() => {
    setSecondaryMergeDraft(
      selected?.secondary_table_code ? String(selected.secondary_table_code).toUpperCase().trim() : '',
    );
  }, [selected?.id, selected?.secondary_table_code]);

  useEffect(() => {
    if (!selected) {
      setEditingReservation(false);
      return;
    }
    setReservationDraft({
      customer_name: selected.customer_name || '',
      phone: selected.phone || '',
      email: selected.email || '',
      guests: Number(selected.guests || 2),
      reservation_date: String(selected.reservation_date || '').slice(0, 10),
      reservation_time: String(selected.reservation_time || '').slice(0, 5),
      occasion: selected.occasion || '',
      event_type_id: selected.event_type_id ? String(selected.event_type_id) : '',
      status:
        selected.status === 'uploaded'
          ? 'pending'
          : selected.status || 'pending',
      notes: selected.notes || '',
    });
    setEditingReservation(false);
  }, [selected?.id]);

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
      if (data.success) {
        loadReservations();
        loadOccupiedTables();
        loadFloorState();
      }
    } catch {
      // silent
    }
  };

  const saveReservationEdit = async () => {
    if (!selected?.id) return;
    if (
      !reservationDraft.customer_name?.trim() ||
      !reservationDraft.phone?.trim() ||
      !reservationDraft.reservation_date ||
      !reservationDraft.reservation_time
    ) {
      alert('Nombre, teléfono, fecha y hora son obligatorios.');
      return;
    }
    if (Number(reservationDraft.guests || 0) < 1) {
      alert('Personas debe ser mayor a 0.');
      return;
    }
    if (reservationDraft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationDraft.email)) {
      alert('Correo inválido.');
      return;
    }
    try {
      setSavingReservationEdit(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/update-reservation.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          id: selected.id,
          ...reservationDraft,
          guests: Number(reservationDraft.guests || 0),
          event_type_id: reservationDraft.event_type_id === '' ? null : Number(reservationDraft.event_type_id),
          email: (reservationDraft.email || '').trim(),
        }),
      });
      const data = await res.json();
      if (!data?.success) {
        alert(data?.error || 'No se pudo actualizar la reservación');
        return;
      }
      if (data.reservation) {
        setSelected(data.reservation);
      } else {
        setSelected((prev) => (prev ? { ...prev, ...reservationDraft } : prev));
      }
      await loadReservations();
      await loadOccupiedTables();
      await loadFloorState();
      setEditingReservation(false);
      alert('Reservación actualizada.');
    } catch {
      alert('Error de conexión al guardar cambios.');
    } finally {
      setSavingReservationEdit(false);
    }
  };

  const venueBusyForReservationToday = (reservation, rawTableCode) => {
    const resDate = reservation?.reservation_date ? String(reservation.reservation_date).slice(0, 10) : '';
    if (resDate !== dateYmdHermosillo()) return false;
    const canon = canonicalVenueTableCode(rawTableCode) || String(rawTableCode || '').toUpperCase().trim();
    if (!canon || /^WEB-/i.test(canon)) return false;
    const pos = floorPosByCode[canon];
    if (pos === 'open_ticket' || pos === 'printed_unpaid') return true;
    if (floorTicketByCode[canon]?.sale) return true;
    return false;
  };

  const assignTable = async (id, tableNumber, prefix) => {
    try {
      // Validar disponibilidad
      const reservation = reservations.find(r => r.id === id);
      const tableCode = `${prefix}-${tableNumber}`;
      if (venueBusyForReservationToday(reservation, tableCode)) {
        alert(
          'La mesa está ocupada en POS o tiene cuenta/ticket abierto hoy; no puedes asignar otra reserva a esa mesa hasta que se libere o cobre.',
        );
        return;
      }

      // Verificar si la mesa está ocupada en la misma hora
      const hm = String(reservation?.reservation_time || '').slice(0, 5);
      const rd = reservation?.reservation_date;
      const isOccupied = occupiedTables.some((occupied) =>
        reservationsSlotClaimsVenueTable(occupied, tableCode, rd, hm, id),
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
        body: JSON.stringify({ id, table_code: tableCode, secondary_table_code: '' }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((prev) =>
          prev && prev.id === id ? { ...prev, table_code: tableCode, secondary_table_code: null } : prev,
        );
        loadReservations();
        loadOccupiedTables();
        loadFloorState();
        setAssigningTable(false);
        setNewTableNumber('');
      } else {
        alert(data.error || 'No se pudo asignar la mesa');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const assignTableByCode = async (id, tableCode) => {
    const code = String(tableCode).toUpperCase().trim();
    if (!code) return;
    try {
      const reservation = reservations.find((r) => r.id === id);
      if (venueBusyForReservationToday(reservation, code)) {
        alert(
          'La mesa está ocupada en POS (rojo/amarillo en el mapa) o cuenta abierta en BD; no se puede asignar para hoy hasta liberar.',
        );
        return;
      }
      const hm = String(reservation?.reservation_time || '').slice(0, 5);
      const rd = reservation?.reservation_date;
      const isOccupied = occupiedTables.some((occupied) => reservationsSlotClaimsVenueTable(occupied, code, rd, hm, id));
      if (isOccupied) {
        alert(`La mesa ${code} ya está ocupada a esa hora. Elige otra.`);
        return;
      }
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/assign-table.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id, table_code: code, secondary_table_code: '' }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((prev) =>
          prev && prev.id === id ? { ...prev, table_code: code, secondary_table_code: null } : prev,
        );
        loadReservations();
        loadOccupiedTables();
        loadFloorState();
        setAssigningTable(false);
        setNewTableNumber('');
        setMapSelectionOverride(code);
      } else {
        alert(data.error || 'No se pudo asignar la mesa');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const persistReservationMergedTables = async (id, secondaryRaw) => {
    const reservation = reservations.find((r) => r.id === id);
    const primaryCanon =
      canonicalVenueTableCode(String(reservation?.table_code || '').toUpperCase().trim())
      ?? String(reservation?.table_code || '').toUpperCase().trim();
    if (!reservation?.table_code || !primaryCanon) {
      alert('Primero asigna la mesa principal a la reserva.');
      return;
    }
    const secUpper = secondaryRaw ? String(secondaryRaw).toUpperCase().trim() : '';
    const secondaryCanon =
      secUpper !== ''
        ? canonicalVenueTableCode(secUpper) ?? secUpper
        : '';

    const primaryMeta = VENUE_TABLES.find((t) => t.code === primaryCanon);

    try {
      if (secondaryCanon !== '') {
        if (secondaryCanon === primaryCanon) {
          alert('La segunda mesa no puede ser igual a la principal.');
          return;
        }
        if (primaryMeta && VENUE_TABLES.find((t) => t.code === secondaryCanon)?.zone !== primaryMeta.zone) {
          alert('Las mesas juntas deben estar en la misma zona del plano (comedor vs terraza).');
          return;
        }

        const blocked = venueBusyForReservationToday(reservation, secondaryCanon);
        if (blocked) {
          alert(
            'La segunda mesa está ocupada en POS o con ticket abierto hoy; no se puede juntar hasta liberar o cobrar.',
          );
          return;
        }
        const hm = String(reservation.reservation_time || '').slice(0, 5);
        const rd = reservation.reservation_date;
        const occ = occupiedTables.some((o) => reservationsSlotClaimsVenueTable(o, secondaryCanon, rd, hm, id));
        if (occ) {
          alert('Esa mesa ya está tomada en la misma hora según el calendario de reservas.');
          return;
        }
      }

      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/assign-table.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id,
          table_code: primaryCanon,
          secondary_table_code: secondaryCanon,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((prev) =>
          prev && prev.id === id
            ? {
                ...prev,
                table_code: data.table_code || primaryCanon,
                secondary_table_code: data.secondary_table_code ?? (secondaryCanon || null),
              }
            : prev,
        );
        loadReservations();
        loadOccupiedTables();
        loadFloorState();
      } else {
        alert(data.error || 'No se pudo guardar la combinación de mesas');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const clearReservationTable = async (id) => {
    if (!id) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/clear-table-assignment.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.success) {
        setSelected((prev) =>
          prev && prev.id === id ? { ...prev, table_code: null, secondary_table_code: null } : prev,
        );
        loadReservations();
        loadOccupiedTables();
        await loadFloorState();
      } else {
        alert(data.error || 'No se pudo liberar la mesa en la reserva');
      }
    } catch {
      alert('Error de conexión');
    }
  };

  const setPosTableState = async (tableCode, state) => {
    const code = String(tableCode || '').toUpperCase().trim();
    if (!code) {
      alert('Selecciona una mesa en el mapa o asigna una mesa a la reserva.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/pos-table-state.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ table_code: code, state }),
      });
      const data = await res.json();
      if (data.success) await loadFloorState();
      else alert(data.error || 'No se pudo actualizar el estado POS');
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
        loadFloorState();
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

  const clearHomepageEvent = async () => {
    try {
      setHomeEventSaving(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/reservations/event-types.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ action: 'clear_home_cta' }),
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

  const floorVisualStateByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const { code } = tbl;
      const pos = floorPosByCode[code];
      const ticket = floorTicketByCode[code];
      const ticketPrinted =
        Boolean(ticket?.sale) &&
        (Number(ticket.sale.receipt_printed) === 1 || ticket.sale.receipt_printed === true);
      // Impreso pendiente cobro (ámbar) sobre cuenta abierta (rojo), alineado con SR / floor-state PHP.
      if (pos === 'printed_unpaid' || ticketPrinted) {
        out[code] = 'printed_unpaid';
        return;
      }
      if (pos === 'open_ticket') {
        out[code] = 'open_ticket';
        return;
      }
      // Venta abierta en sr_sales (floor-state) implica cuenta abierta aunque pos_table_live_state siga en free (sync POS rezagado).
      if (ticket?.sale) {
        out[code] = 'open_ticket';
        return;
      }
      const res = floorReservationByCode[code];
      if (!res) {
        out[code] = 'free';
        return;
      }
      const cap = mergedVenueCoverCapacity(res, tbl.capacity ?? 99);
      const g = Number(res.guests || 0);
      out[code] = g > cap ? 'unsuitable' : 'reserved';
    });
    return out;
  }, [floorReservationByCode, floorPosByCode, floorTicketByCode]);

  const floorTitleByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const { code } = tbl;
      const pos = floorPosByCode[code];
      const res = floorReservationByCode[code];
      const ticket = floorTicketByCode[code];
      const ticketPrinted =
        Boolean(ticket?.sale) &&
        (Number(ticket.sale.receipt_printed) === 1 || ticket.sale.receipt_printed === true);
      const parts = [tbl.label];
      if (res) {
        const cat = reservationOccasionLabel(res);
        parts.push(
          `Reserva: ${res.customer_name || ''} (#${res.id}) · ${String(res.reservation_time || '').slice(0, 5)} · ${cat}`,
        );
        if (res.secondary_table_code) {
          parts.push(`Mesa junta: +${formatTableCode(res.secondary_table_code)} (~${mergedVenueCoverCapacity(res, tbl.capacity ?? 99)} cubiertos)`);
        }
        if (res.phone) parts.push(`Tel: ${res.phone}`);
        if (res.email) parts.push(`Email: ${res.email}`);
        const noteClean = String(res.notes || '')
          .replace(/\nComprobante:[\s\S]*$/i, '')
          .trim();
        if (noteClean) parts.push(`Notas: ${truncateText(noteClean, 200)}`);
      }
      if (pos === 'open_ticket') parts.push('SR: cuenta abierta');
      else if (pos === 'printed_unpaid') parts.push('SR: impreso, pendiente de cobro');
      else if (ticketPrinted) parts.push('SR: cuenta impresa (ticket en BD); pendiente de cobro');
      else if (ticket?.sale) parts.push('SR: cuenta abierta (ticket en BD; POS puede ir rezagado)');
      if (ticket?.sale) {
        parts.push(...buildTicketTooltipLines(ticket));
      }
      out[code] = parts.join('\n');
    });
    return out;
  }, [floorReservationByCode, floorPosByCode, floorTicketByCode]);

  const floorIndicatorByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const { code } = tbl;
      const pos = floorPosByCode[code];
      const res = floorReservationByCode[code];
      const ticket = floorTicketByCode[code];
      const ticketPrinted =
        Boolean(ticket?.sale) &&
        (Number(ticket.sale.receipt_printed) === 1 || ticket.sale.receipt_printed === true);
      const bits = [];
      if (ticket?.sale) {
        const s = ticket.sale;
        bits.push(
          `SR ${s.folio || s.sr_ticket_id} · ${formatMoneyMx(s.total)} · ${(ticket.items || []).length} ítems`,
        );
      }
      if (pos === 'printed_unpaid' || ticketPrinted) bits.push('Impreso/sin cobrar');
      else if (pos === 'open_ticket') bits.push('Cuenta abierta');
      else if (ticket?.sale) bits.push('Cuenta abierta');
      if (res) {
        const t = String(res.reservation_time || '').slice(0, 5);
        const name = (res.customer_name || '').trim() || 'Cliente';
        const shortName = name.length > 12 ? `${name.slice(0, 10)}…` : name;
        const g = res.guests != null && res.guests !== '' ? String(res.guests) : '?';
        const capNote = mergedVenueCoverCapacity(res, tbl.capacity ?? 99);
        bits.push(`Reserva ${t} · ${shortName} · ${g}p (~${capNote}c)`);
        if (res.secondary_table_code) {
          bits.push(`Junta ${formatTableCode(res.secondary_table_code)}`);
        }
      }
      if (bits.length) {
        out[code] = bits.join(' · ');
        return;
      }
      out[code] = 'Sin reserva ni ticket (filtro actual)';
    });
    return out;
  }, [floorReservationByCode, floorPosByCode, floorTicketByCode]);

  /** Sólo reservas para el mapa (azul / verde / no apto), sin POS. */
  const reservationsOnlyFloorVisualByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const res = floorReservationByCode[tbl.code];
      if (!res) {
        out[tbl.code] = 'free';
        return;
      }
      const cap = mergedVenueCoverCapacity(res, tbl.capacity ?? 99);
      const g = Number(res.guests || 0);
      out[tbl.code] = g > cap ? 'unsuitable' : 'reserved';
    });
    return out;
  }, [floorReservationByCode]);

  const reservationsOnlyFloorTitleByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const { code } = tbl;
      const res = floorReservationByCode[code];
      const parts = [tbl.label];
      parts.push(res ? `— Ver reservación (${String(res.reservation_time || '').slice(0, 5)}) · filtro actual` : 'Sin reserva en este filtro');
      if (res) {
        const cat = reservationOccasionLabel(res);
        parts.push(
          `Reserva #${res.id}: ${res.customer_name || ''} · ${String(res.reservation_time || '').slice(0, 5)} · ${cat}`,
        );
        if (res.secondary_table_code) {
          parts.push(`Junta ${formatTableCode(res.secondary_table_code)} · ~${mergedVenueCoverCapacity(res, tbl.capacity ?? 99)} cubiertos`);
        }
        if (res.phone) parts.push(`Tel: ${res.phone}`);
        const noteClean = String(res.notes || '')
          .replace(/\nComprobante:[\s\S]*$/i, '')
          .trim();
        if (noteClean) parts.push(`Notas: ${truncateText(noteClean, 220)}`);
      }
      out[code] = parts.join('\n');
    });
    return out;
  }, [floorReservationByCode]);

  const reservationsOnlyFloorIndicatorByCode = useMemo(() => {
    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const res = floorReservationByCode[tbl.code];
      if (!res) {
        out[tbl.code] = 'Sin reserva (filtro)';
        return;
      }
      const t = String(res.reservation_time || '').slice(0, 5);
      const name = (res.customer_name || '').trim() || 'Cliente';
      const shortName = name.length > 14 ? `${name.slice(0, 12)}…` : name;
      const g = res.guests != null && res.guests !== '' ? String(res.guests) : '?';
      const jc = res.secondary_table_code ? ` junta ${formatTableCode(res.secondary_table_code)}` : '';
      out[tbl.code] = `Ver reserva hoy · ${t} · ${shortName} · ${g}p · #${res.id}${jc}`;
    });
    return out;
  }, [floorReservationByCode]);

  /** Colores del plano desde el slot actual del timeline (Play o barra), como fotogramas de vídeo por franja */
  const timelineSlotFloorVisualByCode = useMemo(() => {
    const slotMode = floorViewUseSlot || timelineReplayPlaying;
    if (!slotMode || !timelineSlots.length) return null;
    const idx = Math.min(Math.max(0, timelineReplayIndex), timelineSlots.length - 1);
    const slot = timelineSlots[idx];
    if (!slot) return null;
    const vrRaw = slot.venue_reserved ?? slot.reserved_venue_codes;
    const vpRaw = slot.venue_pos_open ?? slot.pos_venue_codes;
    if (!Array.isArray(vrRaw) && !Array.isArray(vpRaw)) return null;

    const toCanonSet = (arr) => {
      const next = new Set();
      (Array.isArray(arr) ? arr : []).forEach((c) => {
        const raw = String(c || '').toUpperCase().trim();
        if (!raw) return;
        const code = canonicalVenueTableCode(raw) ?? raw;
        next.add(code);
      });
      return next;
    };
    const reserved = toCanonSet(vrRaw);
    const pos = toCanonSet(vpRaw);

    const out = {};
    VENUE_TABLES.forEach((tbl) => {
      const code = tbl.code;
      const inPos = floorMapColorMode !== 'reservations_only' && pos.has(code);
      const inRes = reserved.has(code);
      if (inPos) {
        out[code] = 'open_ticket';
        return;
      }
      if (!inRes) {
        out[code] = 'free';
        return;
      }
      const res = floorReservationByCode[code];
      if (res) {
        const cap = mergedVenueCoverCapacity(res, tbl.capacity ?? 99);
        const g = Number(res.guests || 0);
        out[code] = g > cap ? 'unsuitable' : 'reserved';
      } else {
        out[code] = 'reserved';
      }
    });
    return out;
  }, [
    floorViewUseSlot,
    timelineReplayPlaying,
    timelineSlots,
    timelineReplayIndex,
    floorMapColorMode,
    floorReservationByCode,
  ]);

  const floorMapEffectiveVisual = timelineSlotFloorVisualByCode
    ?? (floorMapColorMode === 'reservations_only' ? reservationsOnlyFloorVisualByCode : floorVisualStateByCode);
  const floorMapEffectiveTitle =
    floorMapColorMode === 'reservations_only' ? reservationsOnlyFloorTitleByCode : floorTitleByCode;
  const floorMapEffectiveIndicator =
    floorMapColorMode === 'reservations_only' ? reservationsOnlyFloorIndicatorByCode : floorIndicatorByCode;

  const floorMapViewSummary = useMemo(() => {
    const qs = buildMapOccupiedQueryParams({
      floorIndependentView,
      floorViewDate,
      floorViewScope,
      floorViewEventTypeId,
      eventFilter,
      eventTypeFilter,
      dateFilter,
      eventTypes,
    });
    const d = qs.get('date') || '—';
    let scope = '';
    if (floorIndependentView) {
      if (floorViewScope === 'all') scope = 'Todas las categorías';
      else if (floorViewScope === 'general') scope = 'Solo reservas generales';
      else if (floorViewScope === 'normal') scope = 'Diarias (excl. Día de las Madres)';
      else if (floorViewScope === 'mothers_day') scope = 'Día de las Madres';
      else if (floorViewScope === 'event_type') {
        const et = eventTypes.find((e) => String(e.id) === String(floorViewEventTypeId));
        scope = et ? `Tipo: ${et.name}` : 'Tipo de evento (elige categoría)';
      }
    } else {
      scope = 'Sigue filtros de lista (arriba)';
      if (eventFilter === 'general') scope += ' · reserva general = hoy';
    }
    let slot = '';
    if (floorIndependentView && floorViewUseSlot) {
      slot = ` · Franja ${String(floorViewSlotTime).slice(0, 5)}`;
    } else if (!floorIndependentView && selected?.reservation_time) {
      slot = ` · Mapa por hora de reserva seleccionada (${String(selected.reservation_time).slice(0, 5)})`;
    }
    return { line: `${d} — ${scope}${slot}`, date: d };
  }, [
    floorIndependentView,
    floorViewDate,
    floorViewScope,
    floorViewEventTypeId,
    floorViewUseSlot,
    floorViewSlotTime,
    eventFilter,
    eventTypeFilter,
    dateFilter,
    eventTypes,
    selected?.reservation_time,
  ]);

  /** Reservas del mismo día efectivo del mapa sin `table_code`; no aparecen pintadas en el plano. */
  const unassignedReservationsForFloorDay = useMemo(() => {
    const d = floorMapViewSummary.date;
    if (!d || d === '—' || !/^\d{4}-\d{2}-\d{2}$/.test(String(d))) return [];
    return reservations.filter((r) => {
      const rd = String(r.reservation_date || '').slice(0, 10);
      if (rd !== d) return false;
      const st = String(r.status || '')
      if (['cancelled', 'completed'].includes(st)) return false
      if (!['pending', 'confirmed'].includes(st) && !reservationHasComprobante(r)) return false
      return String(r.table_code || '').trim() === '';
    });
  }, [reservations, floorMapViewSummary.date]);

  const posTargetCode = effectiveMapPinCode;
  useEffect(() => {
    if (!tableDetailModalOpen) return;
    if (!posTargetCode) setTableDetailModalOpen(false);
  }, [tableDetailModalOpen, posTargetCode]);
  const canAssignFromMap =
    selected &&
    !['cancelled', 'completed'].includes(String(selected.status || '')) &&
    (['pending', 'confirmed'].includes(String(selected.status || '')) || reservationHasComprobante(selected));

  const mergeSecondaryOptionsForSelected = useMemo(() => {
    if (!selected?.table_code) return [];
    const canon =
      canonicalVenueTableCode(String(selected.table_code).toUpperCase().trim()) ??
      String(selected.table_code).toUpperCase().trim();
    const zm = VENUE_TABLES.find((t) => t.code === canon);
    if (!zm) return [];
    return VENUE_TABLES.filter((t) => t.zone === zm.zone && t.code !== canon);
  }, [selected?.table_code]);

  const loadTableActivity = useCallback(async () => {
    if (!posTargetCode) {
      setTableActivity(null);
      return;
    }
    setTableActivityLoading(true);
    try {
      const token = localStorage.getItem('token');
      const qs = buildMapOccupiedQueryParams({
        floorIndependentView,
        floorViewDate,
        floorViewScope,
        floorViewEventTypeId,
        eventFilter,
        eventTypeFilter,
        dateFilter,
        eventTypes,
      });
      qs.set('table_code', posTargetCode);
      qs.set('mode', timelineMode);
      const res = await fetch(`${API_BASE}/reservations/table-activity.php?${qs.toString()}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (data.success) setTableActivity(data);
      else setTableActivity(null);
    } catch {
      setTableActivity(null);
    } finally {
      setTableActivityLoading(false);
    }
  }, [
    posTargetCode,
    dateFilter,
    eventFilter,
    eventTypeFilter,
    eventTypes,
    floorIndependentView,
    floorViewDate,
    floorViewScope,
    floorViewEventTypeId,
    timelineMode,
  ]);

  useEffect(() => {
    void loadTableActivity();
  }, [loadTableActivity]);

  const focusedFloorTicket = useMemo(() => {
    if (!posTargetCode) return null;
    return floorTicketByCode[posTargetCode] || null;
  }, [posTargetCode, floorTicketByCode]);

  const focusedFloorReservation = useMemo(() => {
    if (!posTargetCode) return null;
    return floorReservationByCode[posTargetCode] || null;
  }, [posTargetCode, floorReservationByCode]);

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
            className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-4 py-2.5 sm:py-2 text-sm text-emerald-300 hover:bg-emerald-500/20 active:scale-95 transition-all whitespace-nowrap touch-manipulation min-h-[44px]"
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
              className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-500/40 focus:bg-slate-800/70 min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              <option value="">Todas</option>
              <option value="general">Reserva general</option>
              <option value="mothers_day">Día de las Madres</option>
              <option value="normal">Diarias (excl. madres)</option>
            </select>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="rounded-lg border border-slate-600/40 bg-slate-800/50 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-200 focus:border-cyan-500/40 focus:bg-slate-800/70 min-h-[44px] sm:min-h-0 touch-manipulation"
            >
              <option value="">Categoria evento</option>
              {eventTypes.map((evt) => (
                <option key={evt.id} value={evt.id}>{evt.name}</option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-200 min-h-[44px] sm:min-h-0 touch-manipulation"
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
              className="rounded-lg border border-slate-700/60 bg-[#030b18] px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-slate-200 min-h-[44px] sm:min-h-0"
            />
            <button onClick={loadReservations} className="rounded-lg border border-cyan-500/25 bg-cyan-500/10 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-cyan-300 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-0 active:bg-cyan-500/20">
              Actualizar
            </button>
            <button onClick={loadOccupiedTables} className="rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-2 sm:px-3 py-2.5 sm:py-2 text-xs sm:text-sm text-emerald-300 whitespace-nowrap touch-manipulation min-h-[44px] sm:min-h-0 active:bg-emerald-500/20">
              Mesas
            </button>
          </div>

          {(eventFilter === 'general' || eventFilter === 'mothers_day' || eventTypeFilter) && (
            <p className="mb-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-[11px] leading-snug text-slate-400">
              {eventFilter === 'general' &&
                `Reserva general: la lista y «Mesas ocupadas» usan siempre el día en curso (${dateYmdHermosillo()}, America/Hermosillo). El selector de fecha no aplica en este modo.`}
              {eventFilter === 'mothers_day' && (() => {
                const d = effectiveReservationQueryDate('mothers_day', '', dateFilter, eventTypes);
                return `Día de las Madres: la consulta usa la fecha del tipo de evento en catálogo (${d}).`;
              })()}
              {eventFilter !== 'general' &&
                eventFilter !== 'mothers_day' &&
                eventTypeFilter &&
                (() => {
                  const et = eventTypes.find((e) => String(e.id) === String(eventTypeFilter));
                  const ed = et && normalizeEventDate(et.event_date);
                  const eff = effectiveReservationQueryDate(eventFilter, eventTypeFilter, dateFilter, eventTypes);
                  if (ed) return `Tipo «${et.name}»: fecha asignada (${eff}). Lista y mesas filtran ese día.`;
                  if (dateFilter) return `Tipo «${et?.name || 'evento'}»: sin fecha en catálogo; usando fecha manual (${dateFilter}).`;
                  return `Tipo «${et?.name || 'evento'}»: sin fecha en catálogo. Elige una fecha arriba para filtrar por día.`;
                })()}
            </p>
          )}

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
                              {reservationOccasionLabel(item) && (
                                <p
                                  className={`text-xs mt-1 ${
                                    isGeneralCategoryReservation(item) ? 'text-emerald-400/75' : 'text-amber-400/60'
                                  }`}
                                >
                                  {reservationOccasionLabel(item)}
                                  {isWebGeneralReservation(item) ? (
                                    <span className="ml-2 text-cyan-400/90">· Web</span>
                                  ) : null}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1">
                              <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${statusStyles[reservationStatusUiKey(item)] || statusStyles.pending}`}>
                                {reservationStatusLabel(item)}
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
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base text-white">Detalle de Reservacion #{selected.id}</h2>
                  {!editingReservation ? (
                    <button
                      type="button"
                      onClick={() => setEditingReservation(true)}
                      className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 sm:px-2 sm:py-1 text-xs text-cyan-300 touch-manipulation min-h-[36px] active:scale-95"
                    >
                      Editar datos
                    </button>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingReservation(false)}
                        className="rounded-xl border border-slate-600/40 bg-slate-700/30 px-3 py-2 sm:px-2 sm:py-1 text-xs text-slate-200 touch-manipulation min-h-[36px] active:scale-95"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={savingReservationEdit}
                        onClick={saveReservationEdit}
                        className="rounded-xl border border-emerald-500/35 bg-emerald-500/15 px-3 py-2 sm:px-2 sm:py-1 text-xs text-emerald-300 disabled:opacity-50 touch-manipulation min-h-[36px] active:scale-95"
                      >
                        {savingReservationEdit ? 'Guardando...' : 'Guardar'}
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-3 space-y-2 text-sm text-slate-300">
                  {editingReservation ? (
                    <>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <label className="text-xs text-slate-400">
                          Nombre
                          <input
                            type="text"
                            value={reservationDraft.customer_name}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, customer_name: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Teléfono
                          <input
                            type="text"
                            value={reservationDraft.phone}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, phone: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Correo (opcional)
                          <input
                            type="email"
                            value={reservationDraft.email}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, email: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Personas
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={reservationDraft.guests}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, guests: Number(e.target.value || 1) }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Fecha
                          <input
                            type="date"
                            value={reservationDraft.reservation_date}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, reservation_date: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Hora
                          <input
                            type="time"
                            value={reservationDraft.reservation_time}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, reservation_time: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          />
                        </label>
                        <label className="text-xs text-slate-400">
                          Tipo de evento
                          <select
                            value={reservationDraft.event_type_id}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, event_type_id: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          >
                            <option value="">Sin categoría</option>
                            {eventTypes.map((evt) => (
                              <option key={evt.id} value={evt.id}>
                                {evt.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs text-slate-400">
                          Estado
                          <select
                            value={reservationDraft.status}
                            onChange={(e) => setReservationDraft((p) => ({ ...p, status: e.target.value }))}
                            className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                          >
                            <option value="pending">Pendiente</option>
                            <option value="confirmed">Confirmada</option>
                            <option value="cancelled">Cancelada</option>
                            <option value="completed">Completada</option>
                          </select>
                        </label>
                      </div>
                      <label className="text-xs text-slate-400">
                        Ocasión / categoría libre
                        <input
                          type="text"
                          value={reservationDraft.occasion}
                          onChange={(e) => setReservationDraft((p) => ({ ...p, occasion: e.target.value }))}
                          className="mt-1 w-full rounded-lg border border-slate-600/50 bg-[#030b18] px-2 py-1.5 text-sm text-slate-100"
                        />
                      </label>
                      <label className="text-xs text-slate-400">
                        Notas
                        <textarea
                          rows={4}
                          value={reservationDraft.notes}
                          onChange={(e) => setReservationDraft((p) => ({ ...p, notes: e.target.value }))}
                          className="mt-1 w-full rounded-xl border border-cyan-500/20 bg-black/40 p-3 text-[12px] text-slate-200 outline-none focus:border-cyan-500/40"
                        />
                      </label>
                    </>
                  ) : (
                    <>
                      <p><span className="text-slate-500">Nombre:</span> {selected.customer_name}</p>
                      <p><span className="text-slate-500">Telefono:</span> {selected.phone}</p>
                      <p><span className="text-slate-500">Correo:</span> {selected.email || 'No proporcionado'}</p>
                      <p><span className="text-slate-500">Fecha:</span> {selected.reservation_date}</p>
                      <p><span className="text-slate-500">Hora:</span> {String(selected.reservation_time || '').slice(0, 5)}</p>
                      <p><span className="text-slate-500">Personas:</span> {selected.guests}</p>
                      <p>
                        <span className="text-slate-500">Mesa:</span> {formatTableCode(selected.table_code)}
                        {selected.secondary_table_code ? (
                          <>
                            {' '}
                            <span className="text-slate-500">+ junta</span>{' '}
                            <span className="font-mono text-cyan-300/90">{formatTableCode(selected.secondary_table_code)}</span>
                          </>
                        ) : null}
                      </p>
                      <div className="mt-3">
                        <p className="text-xs text-slate-500 mb-2">Notas:</p>
                        <div className="relative">
                          <textarea
                            value={(() => {
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
                    </>
                  )}
                  
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
                  <button onClick={() => updateStatus(selected.id, 'confirmed')} className="rounded-full border border-emerald-500/35 bg-emerald-500/15 px-3.5 py-2 sm:px-3 sm:py-1 text-xs text-emerald-300 touch-manipulation min-h-[36px] active:scale-95">Confirmar</button>
                  <button onClick={() => updateStatus(selected.id, 'completed')} className="rounded-full border border-cyan-500/35 bg-cyan-500/15 px-3.5 py-2 sm:px-3 sm:py-1 text-xs text-cyan-300 touch-manipulation min-h-[36px] active:scale-95">Completar</button>
                  <button onClick={() => updateStatus(selected.id, 'cancelled')} className="rounded-full border border-rose-500/35 bg-rose-500/15 px-3.5 py-2 sm:px-3 sm:py-1 text-xs text-rose-300 touch-manipulation min-h-[36px] active:scale-95">Cancelar</button>
                  <button onClick={() => updateStatus(selected.id, 'pending')} className="rounded-full border border-amber-500/35 bg-amber-500/15 px-3.5 py-2 sm:px-3 sm:py-1 text-xs text-amber-300 touch-manipulation min-h-[36px] active:scale-95">Pendiente</button>
                </div>
                
                <div className="border-t border-slate-700/50 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-400">Asignar Mesa:</span>
                    <button 
                      onClick={() => setAssigningTable(!assigningTable)}
                      className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2 sm:px-2 sm:py-1 text-xs text-cyan-300 touch-manipulation min-h-[36px] active:scale-95"
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
                        className="w-full rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2 py-2.5 sm:py-1 text-xs text-emerald-300 disabled:opacity-50 touch-manipulation min-h-[44px] sm:min-h-0 active:scale-95"
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

        <section id="bonifacios-admin-floor-map" className="rounded-2xl border border-[#D4AF37]/20 bg-[#040c1a]/85 p-4 lg:col-span-2">
          <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm uppercase tracking-[0.16em] text-[#D4AF37]/80">Mapa de mesas (Soft Restaurant)</h3>
              {floorStateUpdatedAt ? (
                <p className="mt-1 text-[10px] text-emerald-400/80">
                  Mapa / POS actualizado:{' '}
                  <span className="font-mono text-emerald-200/90">{formatFloorStateUpdatedClock(floorStateUpdatedAt)}</span>
                  <span className="text-slate-500"> (America/Hermosillo)</span>
                </p>
              ) : null}
            </div>
            <button
              type="button"
              disabled={floorMapBusy}
              onClick={() => {
                void loadFloorState();
                void loadOccupiedTables();
                void loadOccupancyTimeline();
              }}
              className="rounded-xl border border-cyan-500/25 bg-cyan-500/10 px-3 py-2.5 sm:py-2 text-xs text-cyan-300 disabled:opacity-50 touch-manipulation min-h-[44px] sm:min-h-0 active:bg-cyan-500/20"
            >
              Actualizar mapa
            </button>
          </div>

          <div className="mb-4 space-y-3 rounded-xl border border-[#D4AF37]/20 bg-[#030b18]/70 p-3">
            <label className="flex cursor-pointer items-start gap-2 text-[12px] text-[#F4E4C1]/90">
              <input
                type="checkbox"
                checked={floorIndependentView}
                onChange={(e) => {
                  const on = e.target.checked;
                  setFloorIndependentView(on);
                  if (on) {
                    const seed =
                      normalizeEventDate(dateFilter) ||
                      effectiveReservationQueryDate(eventFilter, eventTypeFilter, dateFilter, eventTypes) ||
                      dateYmdHermosillo();
                    setFloorViewDate(seed);
                  }
                }}
                className="mt-0.5 rounded border-slate-500"
              />
              <span>
                <span className="font-medium text-[#F4E4C1]">Vista independiente</span> — Misma fecha y categoría para{' '}
                <strong className="text-cyan-200/90">mapa</strong> y <strong className="text-cyan-200/90">mesas por hora</strong>{' '}
                (útil para ver reservas generales de otro día).
              </span>
            </label>

            {floorIndependentView && (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                  Fecha
                  <input
                    type="date"
                    value={floorViewDate}
                    onChange={(e) => setFloorViewDate(e.target.value)}
                    className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-[11px] text-slate-400">
                  Categoría / evento
                  <select
                    value={floorViewScope}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFloorViewScope(v);
                      if (v === 'event_type' && !floorViewEventTypeId && eventTypes.length) {
                        const first = eventTypes.find((x) => String(x.slug || '').toLowerCase() !== 'general');
                        if (first) setFloorViewEventTypeId(String(first.id));
                      }
                    }}
                    className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100"
                  >
                    <option value="all">Todas (activas del día)</option>
                    <option value="general">Solo reservas generales</option>
                    <option value="normal">Diarias (excl. Día de las Madres)</option>
                    <option value="mothers_day">Día de las Madres</option>
                    <option value="event_type">Tipo en catálogo…</option>
                  </select>
                </label>
                {floorViewScope === 'event_type' && (
                  <label className="flex flex-col gap-1 text-[11px] text-slate-400 sm:col-span-2 lg:col-span-2">
                    Tipo de reserva
                    <select
                      value={floorViewEventTypeId}
                      onChange={(e) => setFloorViewEventTypeId(e.target.value)}
                      className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1.5 text-xs text-slate-100"
                    >
                      <option value="">Elige tipo</option>
                      {eventTypes.map((evt) => (
                        <option key={evt.id} value={evt.id}>
                          {evt.name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <div className="flex flex-col gap-1 sm:col-span-2 lg:col-span-2">
                  <span className="text-[11px] text-slate-400">Franja horaria (opcional)</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-2 text-[11px] text-slate-300">
                      <input
                        type="checkbox"
                        checked={floorViewUseSlot}
                        onChange={(e) => setFloorViewUseSlot(e.target.checked)}
                        className="rounded border-slate-500"
                      />
                      Solo esta hora
                    </label>
                    <input
                      type="time"
                      value={floorViewSlotTime}
                      onChange={(e) => setFloorViewSlotTime(e.target.value)}
                      disabled={!floorViewUseSlot}
                      className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1 text-xs text-slate-100 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>
            )}

            <p className="rounded-lg border border-slate-600/40 bg-slate-900/50 px-2 py-1.5 font-mono text-[10px] leading-relaxed text-cyan-200/90 sm:text-[11px]">
              {floorMapViewSummary.line}
            </p>

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
              <div className="inline-flex rounded-lg border border-slate-600/50 bg-slate-900/80 p-0.5">
                <button
                  type="button"
                  onClick={() => setFloorMapColorMode('operations')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    floorMapColorMode === 'operations'
                      ? 'bg-rose-950/60 text-rose-100 shadow-sm border border-rose-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Operación · POS
                </button>
                <button
                  type="button"
                  onClick={() => setFloorMapColorMode('reservations_only')}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-medium transition-colors ${
                    floorMapColorMode === 'reservations_only'
                      ? 'bg-sky-950/70 text-sky-100 shadow-sm border border-sky-500/35'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Solo reservas
                </button>
              </div>
              {floorMapColorMode === 'reservations_only' &&
              unassignedReservationsForFloorDay.length > 0 ? (
                <span className="rounded-full border border-amber-500/35 bg-amber-950/40 px-2.5 py-1 text-[10px] text-amber-100/95">
                  Sin mesa en mapa ({unassignedReservationsForFloorDay.length}) — sólo en la lista del día (
                  <span className="font-mono">{floorMapViewSummary.date}</span>)
                </span>
              ) : null}
              {floorMapColorMode === 'operations' &&
              unassignedReservationsForFloorDay.length > 0 ? (
                <span className="rounded-full border border-slate-600/45 bg-slate-900/50 px-2.5 py-1 text-[10px] text-slate-400">
                  {unassignedReservationsForFloorDay.length} reserva
                  {unassignedReservationsForFloorDay.length === 1 ? '' : 's'} sin mesa (lista)
                </span>
              ) : null}
            </div>
          </div>

          <ReservationFloorPlan
            tables={VENUE_TABLES}
            occupiedCodes={[]}
            selectedCode={effectiveMapPinCode}
            onSelect={(code, opts) => {
              const u = String(code || '').toUpperCase().trim();
              setMapSelectionOverride(u === '' ? '' : u);
              if (
                u &&
                !(opts && opts.shiftKey) &&
                !(opts && opts.layoutEditTap)
              ) {
                setTableDetailModalOpen(true);
              }
            }}
            guests={0}
            occupiedLookup={{}}
            readonly={false}
            visualStateByCode={floorMapEffectiveVisual}
            titleByCode={floorMapEffectiveTitle}
            indicatorByCode={floorMapEffectiveIndicator}
            allowLayoutEdit
            layoutStorageKey="bonifacios_admin_floor_layout_v1"
            layoutPersistence="db_global"
            layoutApiBase={API_BASE}
            mapRefreshing={floorMapBusy && !timelineSlotFloorVisualByCode}
            mapColorMode={floorMapColorMode}
          />

          <div className="mt-4 space-y-3 rounded-xl border border-cyan-900/35 bg-[#030b18]/55 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300/90">
                  Timeline de ocupación
                </p>
                <p className="mt-1 text-[10px] text-slate-500">
                  Elige la fecha del día y usa Play o la barra: el mapa de arriba avanza como un vídeo — los colores de cada
                  mesa siguen esa franja horaria según reservas (y cuenta POS abierta solo para el día de hoy en el servidor).{' '}
                  Día efectivo <span className="font-mono text-slate-400">{floorMapViewSummary.date}</span>
                  {timelineMeta?.notes ? <span className="block pt-1 text-slate-600">{timelineMeta.notes}</span> : null}
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[10px] text-slate-400">
                  Fecha
                  <input
                    type="date"
                    value={floorViewDate}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (!v) return;
                      setFloorIndependentView(true);
                      setFloorViewDate(v);
                      setTimelineReplayPlaying(false);
                    }}
                    className="rounded-lg border border-slate-600/50 bg-slate-900/80 px-2 py-1 text-xs text-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 text-[11px] text-slate-300">
                  Modo tiempo
                  <select
                    value={timelineMode}
                    onChange={(e) => setTimelineMode(e.target.value)}
                    className="rounded border border-slate-600/50 bg-slate-900/90 px-2 py-1 text-xs text-slate-100"
                  >
                    <option value="calendar_day">Día calendario (desde 11:00)</option>
                    <option value="sr_shift">Turno SR (desde 08:00)</option>
                  </select>
                </label>
              </div>
            </div>
            <p className="text-[10px] text-slate-600">
              Cambiar la fecha activa la <span className="text-slate-500">vista independiente</span> y carga ese día en el mapa y
              en el timeline.
            </p>
            {timelineLoading ? (
              <p className="text-[11px] text-slate-500">Cargando timeline del día…</p>
            ) : timelineSlots.length === 0 ? (
              <p className="text-[11px] text-slate-500">Sin datos para el timeline de este día.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-500/10 pb-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      aria-label="Franja anterior"
                      disabled={timelineReplayIndex <= 0}
                      onClick={() => {
                        const i = Math.max(0, timelineReplayIndex - 1);
                        setTimelineReplayIndex(i);
                        setTimelineReplayPlaying(false);
                        const s = timelineSlots[i];
                        if (s?.clock) {
                          setFloorViewUseSlot(true);
                          setFloorViewSlotTime(String(s.clock).slice(0, 5));
                        }
                      }}
                      className="rounded-lg border border-slate-600/45 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-200 disabled:opacity-35"
                    >
                      ◀
                    </button>
                    <button
                      type="button"
                      onClick={() => setTimelineReplayPlaying((p) => !p)}
                      disabled={
                        !timelineSlots.length ||
                        (typeof window !== 'undefined' &&
                          window.matchMedia('(prefers-reduced-motion: reduce)').matches)
                      }
                      className="rounded-lg border border-violet-500/30 bg-violet-500/10 px-3 py-1.5 text-[11px] font-medium text-violet-100 disabled:opacity-40"
                    >
                      {timelineReplayPlaying ? 'Pausar' : 'Play'}
                    </button>
                    <button
                      type="button"
                      aria-label="Franja siguiente"
                      disabled={timelineReplayIndex >= timelineSlots.length - 1}
                      onClick={() => {
                        const i = Math.min(timelineSlots.length - 1, timelineReplayIndex + 1);
                        setTimelineReplayIndex(i);
                        setTimelineReplayPlaying(false);
                        const s = timelineSlots[i];
                        if (s?.clock) {
                          setFloorViewUseSlot(true);
                          setFloorViewSlotTime(String(s.clock).slice(0, 5));
                        }
                      }}
                      className="rounded-lg border border-slate-600/45 bg-slate-900/60 px-2 py-1.5 text-[11px] text-slate-200 disabled:opacity-35"
                    >
                      ▶
                    </button>
                    <span className="text-[10px] text-slate-500">
                      {typeof window !== 'undefined' &&
                      window.matchMedia('(prefers-reduced-motion: reduce)').matches
                        ? 'Play desactivado: “reducir movimiento”.'
                        : null}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-medium tabular-nums text-cyan-100/95">
                      {timelineSlots[timelineReplayIndex]?.clock ?? '—'}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Franja {timelineReplayIndex + 1} / {timelineSlots.length}
                      {timelineSlots[timelineReplayIndex]
                        ? ` · ocup. ∪ ${timelineSlots[timelineReplayIndex].occupied_distinct ?? 0}`
                        : null}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wider text-slate-500" htmlFor="timeline-replay-scrub">
                    Tiempo del día (línea de tiempo)
                  </label>
                  <input
                    id="timeline-replay-scrub"
                    type="range"
                    min={0}
                    max={Math.max(0, timelineSlots.length - 1)}
                    step={1}
                    value={Math.min(timelineReplayIndex, Math.max(0, timelineSlots.length - 1))}
                    aria-valuemin={0}
                    aria-valuemax={Math.max(0, timelineSlots.length - 1)}
                    aria-valuenow={Math.min(timelineReplayIndex, Math.max(0, timelineSlots.length - 1))}
                    aria-valuetext={`Franja ${timelineSlots[timelineReplayIndex]?.clock ?? ''}`}
                    onChange={(e) => {
                      const i = Number(e.target.value);
                      const clamped = Number.isFinite(i)
                        ? Math.max(0, Math.min(timelineSlots.length - 1, Math.floor(i)))
                        : 0;
                      setTimelineReplayIndex(clamped);
                      setTimelineReplayPlaying(false);
                      const s = timelineSlots[clamped];
                      if (s?.clock) {
                        setFloorViewUseSlot(true);
                        setFloorViewSlotTime(String(s.clock).slice(0, 5));
                      }
                    }}
                    className="h-2 w-full cursor-pointer accent-cyan-500"
                  />
                  <div
                    className="flex h-2 w-full gap-px overflow-hidden rounded-md opacity-95"
                    title="Intensidad aproximada de mesas ocupadas por franja (reservas ∪ POS ese día cuando aplica)"
                  >
                    {timelineSlots.map((s, i) => (
                      <div
                        key={`strip-${s.clock}-${i}`}
                        className={`min-w-[3px] flex-1 rounded-[1px] ${timelineSlotTone(s.level)} ${
                          i === timelineReplayIndex ? 'ring-1 ring-inset ring-cyan-300/70' : ''
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {timelineSlotFloorVisualByCode ? (
                  <p className="pt-1 text-[10px] text-cyan-500/65">
                    El plano muestra la franja {timelineSlots[timelineReplayIndex]?.clock ?? '—'} (usa Play o mueve la barra para
                    recorrer el día).
                  </p>
                ) : (
                  <p className="pt-1 text-[10px] text-slate-600">
                    Mueve el control o usa Play para fijar una hora: el mapa tomará los colores de esa franja.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-700/40 bg-[#030b14]/55 px-3 py-2.5">
            <p className="max-w-xl text-[11px] text-slate-500">
              <span className="font-medium text-cyan-200/90">Detalle de mesa:</span> clic en una mesa del plano (sin Shift) para
              abrir un modal con{' '}
              <span className="text-slate-400">
                reserva en el filtro actual, ticket SR, actividad del día, mesa junta y acciones POS.
              </span>{' '}
              Con modo <span className="text-slate-400">«Editar posiciones»</span> activo no se usa este modal desde un solo toque sobre la mesa.
            </p>
            {effectiveMapPinCode ? (
              <button
                type="button"
                onClick={() => setTableDetailModalOpen(true)}
                className="shrink-0 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-medium text-cyan-100 hover:border-cyan-400/50"
              >
                Abrir modal ·{' '}
                <span className="font-mono">{effectiveMapPinCode}</span>
              </button>
            ) : null}
          </div>
        </section>

        {/* Mesas Ocupadas por Hora */}
        <section className="rounded-2xl border border-cyan-500/15 bg-[#040c1a]/85 p-4 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
            <div>
              <h3 className="text-sm uppercase tracking-[0.16em] text-cyan-300/80">
                Mesas Ocupadas por Hora
              </h3>
              {floorIndependentView && (
                <p className="mt-1 text-[10px] text-slate-500 sm:text-[11px]">
                  Datos alineados con el mapa: {floorMapViewSummary.line}
                </p>
              )}
            </div>
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
                    window.occupiedTablesDebug.all_reservations.forEach((res) => {
                      const st = String(res.status || '')
                      const active =
                        !['cancelled', 'completed'].includes(st) &&
                        (['pending', 'confirmed'].includes(st) || reservationHasComprobante(res))
                      if (!active) {
                        console.log(
                          `  ❌ ${res.customer_name} - Status: ${res.status} · deposit_status: ${res.deposit_status ?? '—'} - Hora: ${res.reservation_time}`,
                        )
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
              <p className="text-sm text-slate-500">
                {floorIndependentView
                  ? `Sin reservas activas para la vista del mapa (${floorMapViewSummary.date}).`
                  : eventFilter === 'mothers_day'
                    ? 'No hay reservaciones para el Día de las Madres (10 de mayo).'
                    : eventFilter === 'general'
                      ? 'No hay reservaciones generales activas para la fecha seleccionada.'
                      : 'No hay reservaciones activas para la fecha seleccionada.'}
              </p>
            ) : (
              occupiedTables.map((occupied, index) => {
                const occTableRaw = occupied.table_code ? String(occupied.table_code).toUpperCase().trim() : '';
                const occVenue = occTableRaw ? legacyTableCodeToVenueCode(occTableRaw) || occTableRaw : '';
                const occTicket = occVenue ? floorTicketByCode[occVenue] : null;
                const occTicketSummary =
                  occTicket?.sale &&
                  `Folio ${occTicket.sale.folio || occTicket.sale.sr_ticket_id || '—'} · ${formatMoneyMx(occTicket.sale.total)} · ${(occTicket.items || []).length} ítems`;
                return (
                <div key={`${occupied.id}-${occupied.reservation_date}-${occupied.reservation_time}-${index}`} className="flex flex-col gap-2 rounded-lg border border-slate-700/60 bg-[#030b18]/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-cyan-300 font-medium text-sm">
                        {occupied.table_code ? formatTableCode(occupied.table_code) : 'Sin mesa asignada'}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-300">{occupied.customer_name}</span>
                      {isGeneralCategoryReservation(occupied) && (
                        <span className="text-xs text-emerald-300/90 bg-emerald-500/10 px-1 py-0.5 rounded border border-emerald-500/20">General</span>
                      )}
                      {isWebGeneralReservation(occupied) && (
                        <span className="text-xs text-cyan-300/90 bg-cyan-500/10 px-1 py-0.5 rounded border border-cyan-500/20">Web</span>
                      )}
                      {isMothersDayOccasion(occupied) && (
                        <span className="text-xs text-amber-400 bg-amber-400/10 px-1 py-0.5 rounded">Día de las Madres</span>
                      )}
                      <span className={`text-xs px-1 py-0.5 rounded ${
                        occupied.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-300' :
                        reservationHasComprobante(occupied) ? 'bg-blue-500/10 text-blue-300' :
                        'bg-amber-500/10 text-amber-300'
                      }`}>
                        {occupied.status === 'confirmed' ? 'Confirmada' :
                         reservationHasComprobante(occupied) ? 'Con Comprobante' : 'Pendiente'}
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
                  {occTicketSummary ? (
                    <div className="shrink-0 border-t border-slate-600/50 pt-2 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
                      <p className="mb-1 text-[9px] uppercase tracking-wider text-slate-500">Ticket SR (misma mesa)</p>
                      <button
                        type="button"
                        onClick={() => {
                          if (occVenue) setMapSelectionOverride(occVenue);
                          setTableDetailModalOpen(true);
                          requestAnimationFrame(() => {
                            document.getElementById('bonifacios-admin-floor-map')?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'nearest',
                            });
                          });
                        }}
                        className="max-w-[220px] rounded-lg border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-left text-[10px] leading-snug text-amber-100/95 hover:border-amber-400/50 hover:bg-amber-500/15 sm:max-w-xs"
                      >
                        {occTicketSummary}
                        <span className="mt-1 block text-[9px] text-slate-400">Ir a mesa en foco</span>
                      </button>
                    </div>
                  ) : null}
                </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* Modal · detalle mesa seleccionada en el plano */}
      {tableDetailModalOpen && posTargetCode ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="table-detail-modal-title"
          className="fixed inset-0 z-[110] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-6"
          onClick={() => setTableDetailModalOpen(false)}
        >
          <div
            className="flex max-h-[min(92vh,960px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-500/25 bg-[#030b14] shadow-[0_28px_100px_-20px_rgba(0,0,0,0.9)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-cyan-500/15 bg-[#040c1a]/95 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <p id="table-detail-modal-title" className="text-sm font-semibold text-cyan-50">
                  Mesa <span className="font-mono text-cyan-200">{posTargetCode}</span>
                </p>
                {selected ? (
                  <p className="mt-1 text-[11px] text-slate-500">
                    Reserva en lista seleccionada: #{selected.id} ·{' '}
                    <span className="font-mono">{String(selected.reservation_time || '').slice(0, 5)}</span>
                  </p>
                ) : (
                  <p className="mt-1 text-[11px] text-slate-500">Selecciona una fila en la lista si vas a asignar mesa a una reserva.</p>
                )}
              </div>
              <button
                type="button"
                aria-label="Cerrar detalle de mesa"
                onClick={() => setTableDetailModalOpen(false)}
                className="shrink-0 rounded-lg border border-slate-600/50 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500 hover:bg-white/5 hover:text-white"
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5 sm:pb-5">
              <div className="flex flex-wrap gap-1 border-b border-slate-700/40 pb-2">
                <button
                  type="button"
                  onClick={() => setFocusDetailTab('live')}
                  className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider ${
                    focusDetailTab === 'live'
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  En vivo
                </button>
                <button
                  type="button"
                  onClick={() => setFocusDetailTab('day')}
                  className={`rounded px-2 py-1 text-[10px] uppercase tracking-wider ${
                    focusDetailTab === 'day'
                      ? 'bg-cyan-500/20 text-cyan-100'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Actividad día
                </button>
              </div>

              {focusDetailTab === 'day' && (
                <div className="rounded-lg border border-slate-600/40 bg-slate-950/40 p-3 text-[11px] text-slate-200">
                  {!posTargetCode ? (
                    <p className="text-slate-500">Selecciona una mesa en el plano para ver historial del día.</p>
                  ) : tableActivityLoading ? (
                    <p className="text-slate-500">Cargando actividad…</p>
                  ) : Array.isArray(tableActivity?.reservations) && tableActivity.reservations.length === 0 ? (
                    <p className="text-slate-500">Sin filas para esta mesa con la fecha y categoría actual.</p>
                  ) : Array.isArray(tableActivity?.reservations) ? (
                    <ul className="space-y-2">
                      {tableActivity.reservations.map((r) => (
                        <li key={r.id} className="rounded border border-slate-700/50 bg-slate-900/50 p-2">
                          <span className="font-medium text-slate-100">{r.customer_name || '—'}</span>
                          <span className="ml-2 font-mono text-[10px] text-slate-500">
                            #{r.id} · {String(r.reservation_time || '').slice(0, 5)} · {r.status}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-slate-500">Sin datos.</p>
                  )}
                  {posTargetCode ? (
                    <p className="mt-2 text-[10px] uppercase tracking-wider text-slate-500">
                      POS (BD): {(tableActivity && tableActivity.pos_state) || '—'}
                    </p>
                  ) : null}
                </div>
              )}

              {focusDetailTab === 'live' && !posTargetCode ? (
                <p className="text-[11px] text-slate-500">Selecciona una mesa para ver detalle.</p>
              ) : null}

              {focusDetailTab === 'live' && posTargetCode ? (
                <div className="rounded-lg border border-slate-600/45 bg-slate-950/50 p-3 text-[11px] text-slate-200">
                  {focusedFloorReservation && (
                    <div className="mb-3 border-b border-slate-700/60 pb-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-300/90">
                        Reserva en esta mesa (filtro actual)
                      </p>
                      <p className="mt-1 text-slate-100">
                        {focusedFloorReservation.customer_name || '—'}{' '}
                        <span className="text-slate-500">
                          #{focusedFloorReservation.id} · {String(focusedFloorReservation.reservation_time || '').slice(0, 5)}
                        </span>
                      </p>
                      <div className="mt-1 grid gap-0.5 text-slate-400">
                        {focusedFloorReservation.phone ? <span>Tel: {focusedFloorReservation.phone}</span> : null}
                        {focusedFloorReservation.email ? <span>Email: {focusedFloorReservation.email}</span> : null}
                        <span>Categoría: {reservationOccasionLabel(focusedFloorReservation)}</span>
                        {String(focusedFloorReservation.notes || '')
                          .replace(/\nComprobante:[\s\S]*$/i, '')
                          .trim() ? (
                          <span className="whitespace-pre-wrap text-slate-500">
                            Notas:{' '}
                            {truncateText(
                              String(focusedFloorReservation.notes || '').replace(/\nComprobante:[\s\S]*$/i, ''),
                              400,
                            )}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {focusedFloorTicket?.sale ? (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-300/90">
                        Ticket SR abierto (conceptos)
                      </p>
                      <div className="mt-1 grid gap-0.5 font-mono text-[10px] text-slate-400">
                        <span>
                          Folio {focusedFloorTicket.sale.folio || focusedFloorTicket.sale.sr_ticket_id} · Cheque{' '}
                          {focusedFloorTicket.sale.ticket_number || '—'}
                        </span>
                        <span>Mesa SR raw: {focusedFloorTicket.sale.table_number_raw || '—'}</span>
                        <span>
                          Mesero: {focusedFloorTicket.sale.waiter_name || '—'} · Cubiertos:{' '}
                          {focusedFloorTicket.sale.covers ?? '—'}
                        </span>
                        <span>Abierto: {focusedFloorTicket.sale.opened_at || focusedFloorTicket.sale.sale_datetime || '—'}</span>
                        <span className="text-slate-200">
                          Subtotal {formatMoneyMx(focusedFloorTicket.sale.subtotal)} · IVA{' '}
                          {formatMoneyMx(focusedFloorTicket.sale.tax)} · Desc {formatMoneyMx(focusedFloorTicket.sale.discount)} · Propina{' '}
                          {formatMoneyMx(focusedFloorTicket.sale.tip)}
                        </span>
                        <span className="text-[#F4E4C1]">
                          TOTAL {formatMoneyMx(focusedFloorTicket.sale.total)} · {focusedFloorTicket.sale.payment_type || '—'}
                        </span>
                      </div>
                      {Array.isArray(focusedFloorTicket.items) && focusedFloorTicket.items.length > 0 ? (
                        <>
                          <details className="mt-2 rounded-lg border border-slate-700/50 bg-slate-950/40 md:hidden">
                            <summary className="cursor-pointer list-none px-3 py-2 text-[11px] font-medium text-amber-200/95 marker:content-none [&::-webkit-details-marker]:hidden">
                              Conceptos ({focusedFloorTicket.items.length}) — tocar para expandir
                            </summary>
                            <div className="max-h-72 space-y-2 overflow-auto border-t border-slate-700/50 p-2 text-[10px]">
                              {focusedFloorTicket.items.map((it, idx) => (
                                <div
                                  key={`modal-${it.product_name}-${idx}`}
                                  className="rounded border border-slate-800/80 bg-slate-900/50 p-2 text-slate-200"
                                >
                                  <p className="font-medium text-slate-100">{it.product_name}</p>
                                  {it.notes ? <p className="mt-0.5 text-slate-500">({it.notes})</p> : null}
                                  <p className="mt-1 text-slate-400">
                                    Cant {it.quantity} · P.u. {formatMoneyMx(it.unit_price)}
                                    {Number(it.discount) > 0 ? ` · Desc ${formatMoneyMx(it.discount)}` : ''} · Subt.{' '}
                                    {formatMoneyMx(it.subtotal)}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </details>
                          <div className="mt-2 hidden max-h-72 overflow-auto rounded border border-slate-700/50 md:block">
                            <table className="w-full border-collapse text-left text-[10px]">
                              <thead className="sticky top-0 bg-slate-900/95 text-slate-500">
                                <tr>
                                  <th className="p-1.5 font-normal">Producto</th>
                                  <th className="p-1.5 font-normal">Cant</th>
                                  <th className="p-1.5 font-normal">P.u.</th>
                                  <th className="p-1.5 font-normal">Desc.</th>
                                  <th className="p-1.5 font-normal">Subt.</th>
                                </tr>
                              </thead>
                              <tbody>
                                {focusedFloorTicket.items.map((it, idx) => (
                                  <tr key={`modal-desktop-${it.product_name}-${idx}`} className="border-t border-slate-800/80">
                                    <td className="p-1.5 text-slate-200">
                                      {it.product_name}
                                      {it.notes ? <span className="block text-slate-500">({it.notes})</span> : null}
                                    </td>
                                    <td className="p-1.5 text-slate-400">{it.quantity}</td>
                                    <td className="p-1.5 text-slate-400">{formatMoneyMx(it.unit_price)}</td>
                                    <td className="p-1.5 text-slate-400">
                                      {Number(it.discount) > 0 ? formatMoneyMx(it.discount) : '—'}
                                    </td>
                                    <td className="p-1.5 text-slate-300">{formatMoneyMx(it.subtotal)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      ) : (
                        <p className="mt-2 text-slate-500">
                          Ticket sin líneas en sr_sale_items (revisa sincronización o sale_id / sr_ticket_id).
                        </p>
                      )}
                    </div>
                  ) : null}

                  {!focusedFloorTicket?.sale && !focusedFloorReservation ? (
                    <p className="text-slate-500">
                      Sin reserva en el filtro actual ni ticket abierto enlazado a esta mesa en la base de datos.
                    </p>
                  ) : null}

                  {!focusedFloorTicket?.sale && (floorPosByCode[posTargetCode] || '') !== 'free' ? (
                    <p className="mt-2 text-[10px] text-amber-200/80">
                      POS indica mesa ocupada pero no hay fila en sr_sales (status abierto) cuya mesa coincida con {posTargetCode}
                      (raw en ticket distinto, o sync pendiente).
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={
                    floorMapBusy ||
                    !canAssignFromMap ||
                    !posTargetCode ||
                    venueBusyForReservationToday(selected, posTargetCode)
                  }
                  title={
                    venueBusyForReservationToday(selected, posTargetCode)
                      ? 'Mesa ocupada en servicio hoy (POS rojo/ámbar o ticket abierto). Libera en SR o espera cobro.'
                      : undefined
                  }
                  onClick={() => assignTableByCode(selected.id, posTargetCode)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/15 px-3 py-1.5 text-xs text-emerald-200 disabled:opacity-40"
                >
                  Asignar esta mesa a la reserva seleccionada en lista
                </button>
                <button
                  type="button"
                  disabled={floorMapBusy || !selected?.table_code}
                  onClick={() => clearReservationTable(selected.id)}
                  className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-200 disabled:opacity-40"
                >
                  Quitar mesa de la reserva (solo dashboard)
                </button>
              </div>
              {canAssignFromMap && selected?.table_code ? (
                <div className="space-y-2 rounded-lg border border-indigo-500/25 bg-indigo-950/25 px-3 py-2 text-[11px] text-slate-200">
                  <p className="text-[10px] uppercase tracking-wider text-indigo-200/70">Mesa junta (operación)</p>
                  <p className="text-[10px] leading-snug text-slate-500">
                    Una reserva en dos códigos del plano (misma zona). El mapa pinta ambas mesas; en SR sigues abriendo/cobrando
                    cuentas por mesa real.
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-500">Segunda mesa</span>
                      <select
                        className="min-w-[160px] rounded border border-slate-600/50 bg-slate-950/80 px-2 py-1.5 text-xs text-slate-100"
                        value={secondaryMergeDraft}
                        disabled={floorMapBusy}
                        onChange={(e) => setSecondaryMergeDraft(String(e.target.value || '').toUpperCase())}
                      >
                        <option value="">Ninguna</option>
                        {mergeSecondaryOptionsForSelected.map((t) => (
                          <option key={t.code} value={t.code}>
                            {t.label} · ~{t.capacity} pax
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="button"
                      disabled={floorMapBusy}
                      onClick={() => void persistReservationMergedTables(selected.id, secondaryMergeDraft)}
                      className="rounded-lg border border-indigo-500/40 bg-indigo-500/15 px-3 py-1.5 text-xs text-indigo-100 disabled:opacity-40"
                    >
                      Guardar combinación
                    </button>
                    <button
                      type="button"
                      disabled={floorMapBusy || !selected.secondary_table_code}
                      onClick={() => void persistReservationMergedTables(selected.id, '')}
                      className="rounded-lg border border-slate-500/40 bg-slate-800/40 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40"
                    >
                      Quitar junta
                    </button>
                  </div>
                </div>
              ) : null}
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Estado POS (esta mesa)</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={floorMapBusy || !posTargetCode}
                  onClick={() => setPosTableState(posTargetCode, 'open_ticket')}
                  className="rounded-lg border border-rose-500/35 bg-rose-500/15 px-3 py-1.5 text-xs text-rose-100 disabled:opacity-40"
                >
                  SR · Cuenta abierta
                </button>
                <button
                  type="button"
                  disabled={floorMapBusy || !posTargetCode}
                  onClick={() => setPosTableState(posTargetCode, 'printed_unpaid')}
                  className="rounded-lg border border-amber-400/40 bg-amber-500/15 px-3 py-1.5 text-xs text-amber-100 disabled:opacity-40"
                >
                  SR · Impreso sin cobrar
                </button>
                <button
                  type="button"
                  disabled={floorMapBusy || !posTargetCode}
                  onClick={() => setPosTableState(posTargetCode, 'free')}
                  className="rounded-lg border border-slate-500/40 bg-slate-700/30 px-3 py-1.5 text-xs text-slate-200 disabled:opacity-40"
                >
                  Liberar POS (verde)
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

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
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.18em] text-cyan-300/70">Boton visible en homepage (solo uno activo)</p>
            <button
              onClick={clearHomepageEvent}
              disabled={homeEventSaving}
              className="rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-300 transition-colors hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Sin boton especial en homepage
            </button>
          </div>
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
