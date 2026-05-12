import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
const API_BASE = import.meta.env.VITE_API_URL || '/api';

const ZONES = [
  { key: 'comedor', label: 'Comedor' },
  { key: 'terraza_alta', label: 'Terraza Alta' },
  { key: 'terraza_baja', label: 'Terraza Baja' },
];

const LANDMARKS = {
  comedor: [
    { id: 'entrance', label: 'Entrada', x: 4, y: 46, w: 14, h: 16, tone: 'cyan' },
    { id: 'windows', label: 'Ventanales', x: 52, y: 2, w: 44, h: 11, tone: 'cyan' },
    { id: 'cellar', label: 'Cava', x: 21, y: 2, w: 22, h: 12, tone: 'amber' },
    { id: 'bar', label: 'Bar', x: 58, y: 78, w: 18, h: 17, tone: 'amber' },
    { id: 'stage', label: 'Escenario', x: 82, y: 50, w: 15, h: 23, tone: 'purple' },
  ],
  terraza_alta: [
    { id: 'access', label: 'Acceso', x: 4, y: 82, w: 16, h: 14, tone: 'cyan' },
    { id: 'green-view', label: 'Vista jardin', x: 44, y: 6, w: 28, h: 14, tone: 'emerald' },
    { id: 'walkway', label: 'Pasillo', x: 42, y: 24, w: 8, h: 66, tone: 'amber' },
  ],
  terraza_baja: [
    { id: 'access-low', label: 'Acceso', x: 4, y: 82, w: 16, h: 14, tone: 'cyan' },
    { id: 'lounge', label: 'Lounge', x: 42, y: 12, w: 24, h: 14, tone: 'purple' },
    { id: 'stage-low', label: 'Escenario', x: 80, y: 48, w: 16, h: 22, tone: 'amber' },
  ],
};

const FLOOR_MAP_TOOLBAR_COLLAPSED_KEY = 'bonifacios_floor_map_toolbar_collapsed_v1';

const LAYOUT_VERSION = 3;
/** @deprecated keep for migration */
const LAYOUT_VERSION_LEGACY = 1;
/** @deprecated migrate to v3 */
const LAYOUT_VERSION_2 = 2;

const DRAG_THRESHOLD_PX = 8;

function landmarkStorageKey(zone, id) {
  return `${zone}:${id}`;
}

function baseLandmarkCode(zone, id) {
  return `LM-${String(zone || '').toUpperCase()}-${String(id || '').toUpperCase()}`;
}

function parseBaseLandmarkCode(code) {
  const c = String(code || '').toUpperCase().trim();
  const m = c.match(/^LM-(COMEDOR|TERRAZA_ALTA|TERRAZA_BAJA)-([A-Z0-9_-]+)$/);
  if (!m) return null;
  return {
    zone: m[1].toLowerCase(),
    id: m[2].toLowerCase(),
  };
}

function clampPct(v) {
  return Math.min(95, Math.max(5, v));
}

function emptyHiddenZones() {
  return { comedor: [], terraza_alta: [], terraza_baja: [] };
}

function clampScale(s) {
  const n = Number(s);
  if (!Number.isFinite(n)) return 1;
  return Math.min(2, Math.max(0.5, n));
}

/** Doble flecha arriba — ocultar panel (estilo Google Maps). */
function IconChevronsCollapseUp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 15l5-5 5 5M7 10l5-5 5 5" />
    </svg>
  );
}

/** Doble flecha abajo — mostrar panel. */
function IconChevronsExpandDown({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9l-5 5-5-5M17 14l-5 5-5-5" />
    </svg>
  );
}

function IconMapHelp({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <path strokeLinecap="round" d="M12 17h.01" />
    </svg>
  );
}

function clampLandmarkXY(x, y, w, h) {
  const width = Number(w) || 10;
  const height = Number(h) || 8;
  const maxX = Math.max(0, 100 - width);
  const maxY = Math.max(0, 100 - height);
  return {
    x: Math.min(maxX, Math.max(0, x)),
    y: Math.min(maxY, Math.max(0, y)),
    w: Math.min(100, Math.max(4, width)),
    h: Math.min(100, Math.max(3, height)),
  };
}

function effectiveGroupId(code, groupIdByCode) {
  const g = groupIdByCode[code];
  return g && String(g).trim() !== '' ? String(g) : code;
}

function defaultLayoutPayload() {
  return {
    positions: {},
    groupIdByCode: {},
    landmarkLayouts: {},
    hiddenCodesByZone: emptyHiddenZones(),
  };
}

function normalizeHiddenFromStorage(raw) {
  const base = emptyHiddenZones();
  if (!raw || typeof raw !== 'object') return base;
  ['comedor', 'terraza_alta', 'terraza_baja'].forEach((zk) => {
    const arr = raw[zk];
    if (Array.isArray(arr)) {
      base[zk] = arr.filter((c) => typeof c === 'string' && c.trim() !== '');
    }
  });
  return base;
}

/** Normaliza escalas dentro de positions al cargar. */
function sanitizePositions(raw) {
  const positionsIn =
    typeof raw === 'object' && raw !== null ? { ...raw } : {};
  Object.keys(positionsIn).forEach((ck) => {
    const p = positionsIn[ck];
    if (!p || typeof p !== 'object') return;
    const next = {};
    if (typeof p.px === 'number') next.px = p.px;
    if (typeof p.py === 'number') next.py = p.py;
    if (typeof p.scale === 'number') next.scale = clampScale(p.scale);
    positionsIn[ck] = next;
  });
  return positionsIn;
}

function loadLayoutFromStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultLayoutPayload();
    const o = JSON.parse(raw);
    if (!o || typeof o !== 'object') return defaultLayoutPayload();
    if (o.version === LAYOUT_VERSION) {
      return {
        positions: sanitizePositions(o.positions),
        groupIdByCode: typeof o.groupIdByCode === 'object' && o.groupIdByCode !== null ? o.groupIdByCode : {},
        landmarkLayouts:
          typeof o.landmarkLayouts === 'object' && o.landmarkLayouts !== null ? o.landmarkLayouts : {},
        hiddenCodesByZone: normalizeHiddenFromStorage(o.hiddenCodesByZone),
      };
    }
    if (o.version === LAYOUT_VERSION_2) {
      const payload = {
        version: LAYOUT_VERSION,
        positions: sanitizePositions(o.positions),
        groupIdByCode: typeof o.groupIdByCode === 'object' && o.groupIdByCode !== null ? o.groupIdByCode : {},
        landmarkLayouts:
          typeof o.landmarkLayouts === 'object' && o.landmarkLayouts !== null ? o.landmarkLayouts : {},
        hiddenCodesByZone: emptyHiddenZones(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      return {
        positions: payload.positions,
        groupIdByCode: payload.groupIdByCode,
        landmarkLayouts: payload.landmarkLayouts,
        hiddenCodesByZone: emptyHiddenZones(),
      };
    }
    if (o.version === LAYOUT_VERSION_LEGACY) {
      const payload = {
        version: LAYOUT_VERSION,
        positions: sanitizePositions(o.positions),
        groupIdByCode:
          typeof o.groupIdByCode === 'object' && o.groupIdByCode !== null ? o.groupIdByCode : {},
        landmarkLayouts: {},
        hiddenCodesByZone: emptyHiddenZones(),
      };
      try {
        localStorage.setItem(key, JSON.stringify(payload));
      } catch {
        /* ignore */
      }
      return {
        positions: payload.positions,
        groupIdByCode: payload.groupIdByCode,
        landmarkLayouts: {},
        hiddenCodesByZone: emptyHiddenZones(),
      };
    }
    return defaultLayoutPayload();
  } catch {
    return defaultLayoutPayload();
  }
}

function saveLayoutToStorage(key, positions, groupIdByCode, landmarkLayouts, hiddenCodesByZone) {
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        version: LAYOUT_VERSION,
        positions,
        groupIdByCode,
        landmarkLayouts: landmarkLayouts && typeof landmarkLayouts === 'object' ? landmarkLayouts : {},
        hiddenCodesByZone: normalizeHiddenFromStorage(hiddenCodesByZone),
      }),
    );
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {object} props
 * @param {Array<{code:string,zone:string,label:string,px:number,py:number,capacity:number,shape?:string}>} props.tables
 * @param {string[]} props.occupiedCodes
 * @param {string} props.selectedCode
 * @param {(code:string, opts?: { shiftKey?: boolean, layoutEditTap?: boolean })=>void} [props.onSelect]
 * @param {number} props.guests
 * @param {Record<string,{customer_name?:string}>} props.occupiedLookup
 * @param {boolean} props.readonly
 * @param {Record<string,'free'|'reserved'|'open_ticket'|'printed_unpaid'|'unsuitable'>} [props.visualStateByCode] — modo dashboard / SR
 * @param {Record<string,string>} [props.titleByCode] — tooltips por código
 * @param {Record<string,string>} [props.indicatorByCode] — una línea corta bajo la etiqueta (modo admin + visual)
 * @param {boolean} [props.allowLayoutEdit] — admin: drag, agrupar, guardar en localStorage
 * @param {string} [props.layoutStorageKey] — clave localStorage (solo este navegador)
 * @param {boolean} [props.mapRefreshing] — sondeo en curso (feedback visual suave)
 * @param {'operations'|'reservations_only'} [props.mapColorMode] — Leyenda / estilos: operación POS vs sólo reservas
 */
function ReservationFloorPlan({
  tables = [],
  occupiedCodes = [],
  selectedCode = '',
  onSelect = null,
  guests = 0,
  occupiedLookup = {},
  readonly = false,
  activeZone: controlledZone,
  onZoneChange,
  visualStateByCode = null,
  titleByCode = null,
  indicatorByCode = null,
  allowLayoutEdit = false,
  layoutStorageKey = 'bonifacios_admin_floor_layout_v1',
  layoutPersistence = 'local',
  layoutApiBase = API_BASE,
  mapRefreshing = false,
  mapColorMode = 'operations',
}) {
  const useDbLayout = layoutPersistence === 'db_global';
  const adminVisual = visualStateByCode && typeof visualStateByCode === 'object';
  const reservationsOnly = mapColorMode === 'reservations_only';
  const [tableOverridesByCode, setTableOverridesByCode] = useState({});
  const [customTables, setCustomTables] = useState([]);
  const [customLandmarks, setCustomLandmarks] = useState([]);
  const [selectedLandmarkId, setSelectedLandmarkId] = useState('');
  const [layoutSyncBusy, setLayoutSyncBusy] = useState(false);
  const [layoutSyncError, setLayoutSyncError] = useState('');
  const selectedTable = useMemo(
    () => [...tables, ...customTables].find((t) => t.code === selectedCode) || null,
    [tables, customTables, selectedCode],
  );
  const [internalZone, setInternalZone] = useState(selectedTable?.zone || 'comedor');
  const activeZone = controlledZone || internalZone;
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));
  const [mobileZoom, setMobileZoom] = useState(1);

  const [layoutEditMode, setLayoutEditMode] = useState(false);
  const [layoutPositions, setLayoutPositions] = useState({});
  const [groupIdByCode, setGroupIdByCode] = useState({});
  const [landmarkLayouts, setLandmarkLayouts] = useState({});
  const [hiddenCodesByZone, setHiddenCodesByZone] = useState(() => emptyHiddenZones());
  const [multiSelect, setMultiSelect] = useState([]);
  const [mapToolbarCollapsed, setMapToolbarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(FLOOR_MAP_TOOLBAR_COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [mapHelpOpen, setMapHelpOpen] = useState(false);
  const mapHelpPanelRef = useRef(null);
  const canvasRef = useRef(null);
  const mobileViewportRef = useRef(null);
  const dragRef = useRef(null);
  const layoutPositionsRef = useRef(layoutPositions);
  const landmarkLayoutsRef = useRef(landmarkLayouts);
  const hiddenCodesByZoneRef = useRef(emptyHiddenZones());
  const customLandmarksRef = useRef(customLandmarks);
  const customTablesRef = useRef(customTables);
  const tableOverridesRef = useRef(tableOverridesByCode);
  const persistDebounceRef = useRef(null);

  const persistToolbarCollapsed = useCallback((collapsed) => {
    setMapToolbarCollapsed(collapsed);
    try {
      window.localStorage.setItem(FLOOR_MAP_TOOLBAR_COLLAPSED_KEY, collapsed ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!mapHelpOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setMapHelpOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapHelpOpen]);

  useEffect(() => {
    layoutPositionsRef.current = layoutPositions;
  }, [layoutPositions]);

  useEffect(() => {
    landmarkLayoutsRef.current = landmarkLayouts;
  }, [landmarkLayouts]);

  useEffect(() => {
    hiddenCodesByZoneRef.current = hiddenCodesByZone;
  }, [hiddenCodesByZone]);

  useEffect(() => {
    customLandmarksRef.current = customLandmarks;
  }, [customLandmarks]);

  useEffect(() => {
    customTablesRef.current = customTables;
  }, [customTables]);

  useEffect(() => {
    tableOverridesRef.current = tableOverridesByCode;
  }, [tableOverridesByCode]);

  useEffect(() => {
    return () => {
      if (persistDebounceRef.current) {
        clearTimeout(persistDebounceRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!allowLayoutEdit || !adminVisual || useDbLayout) return;
    const { positions, groupIdByCode: g, landmarkLayouts: lm, hiddenCodesByZone: hid } = loadLayoutFromStorage(layoutStorageKey);
    const hiddenNorm = normalizeHiddenFromStorage(hid);
    queueMicrotask(() => {
      setLayoutPositions(positions);
      setGroupIdByCode(g);
      setLandmarkLayouts(lm || {});
      setHiddenCodesByZone(hiddenNorm);
      layoutPositionsRef.current = positions;
      landmarkLayoutsRef.current = lm || {};
      hiddenCodesByZoneRef.current = hiddenNorm;
    });
  }, [allowLayoutEdit, adminVisual, layoutStorageKey, useDbLayout]);

  const queueDbPersist = useCallback(() => {
    if (!useDbLayout || !allowLayoutEdit || !adminVisual) return;
    if (persistDebounceRef.current) {
      clearTimeout(persistDebounceRef.current);
    }
    persistDebounceRef.current = setTimeout(async () => {
      const token = localStorage.getItem('token');
      const rows = [];
      let sort = 1;
      const codesSeenCatalog = new Set();
      tables.forEach((t) => {
        const ck = String(t.code || '').toUpperCase().trim();
        codesSeenCatalog.add(ck);
        const o = layoutPositionsRef.current[t.code] || {};
        const ov = tableOverridesRef.current[t.code] || {};
        const zone = ov.zone || t.zone;
        const hidden = (hiddenCodesByZoneRef.current[zone] || []).includes(t.code);
        rows.push({
          item_type: ov.item_type || 'table',
          code: t.code,
          zone,
          label: ov.label || t.label,
          shape: ov.shape || t.shape || 'round',
          x_pct: typeof o.px === 'number' ? clampPct(o.px) : clampPct(t.px),
          y_pct: typeof o.py === 'number' ? clampPct(o.py) : clampPct(t.py),
          w_pct: ov.w_pct ?? (t.shape === 'round' ? 12 : 14),
          h_pct: ov.h_pct ?? (t.shape === 'round' ? 12 : 8),
          scale: typeof o.scale === 'number' ? clampScale(o.scale) : 1,
          capacity: Number.isFinite(ov.capacity) ? Number(ov.capacity) : Number(t.capacity || 0),
          tone: ov.tone || null,
          is_hidden: hidden ? 1 : 0,
          sort_order: sort++,
        });
      });
      customTablesRef.current.forEach((t) => {
        const ck = String(t.code || '').toUpperCase().trim();
        if (codesSeenCatalog.has(ck)) return;
        codesSeenCatalog.add(ck);
        const o = layoutPositionsRef.current[t.code] || {};
        const hidden = (hiddenCodesByZoneRef.current[t.zone] || []).includes(t.code);
        rows.push({
          item_type: t.item_type || 'table',
          code: t.code,
          zone: t.zone || 'comedor',
          label: t.label || t.code,
          shape: t.shape || 'round',
          x_pct: typeof o.px === 'number' ? clampPct(o.px) : clampPct(t.px ?? 50),
          y_pct: typeof o.py === 'number' ? clampPct(o.py) : clampPct(t.py ?? 50),
          w_pct: t.w_pct ?? (t.shape === 'round' ? 12 : 10),
          h_pct: t.h_pct ?? (t.shape === 'round' ? 12 : 8),
          scale: typeof o.scale === 'number' ? clampScale(o.scale) : clampScale(t.tableScale || 1),
          capacity: Number(t.capacity || 0),
          tone: t.tone || null,
          is_hidden: hidden ? 1 : 0,
          sort_order: sort++,
        });
      });
      Object.keys(LANDMARKS).forEach((zone) => {
        (LANDMARKS[zone] || []).forEach((mark) => {
          const k = landmarkStorageKey(zone, mark.id);
          const l = landmarkLayoutsRef.current[k] || {};
          rows.push({
            item_type: 'landmark',
            code: baseLandmarkCode(zone, mark.id),
            zone,
            label: mark.label,
            shape: 'rect',
            x_pct: typeof l.x === 'number' ? clampPct(l.x) : clampPct(mark.x),
            y_pct: typeof l.y === 'number' ? clampPct(l.y) : clampPct(mark.y),
            w_pct: typeof l.w === 'number' ? Math.max(3, Math.min(100, l.w)) : mark.w,
            h_pct: typeof l.h === 'number' ? Math.max(3, Math.min(100, l.h)) : mark.h,
            scale: 1,
            capacity: 0,
            tone: mark.tone || null,
            is_hidden: 0,
            sort_order: sort++,
          });
        });
      });
      customLandmarksRef.current.forEach((mark) => {
        const k = landmarkStorageKey(mark.zone, mark.id);
        const l = landmarkLayoutsRef.current[k] || {};
        rows.push({
          item_type: mark.item_type || 'decor',
          code: mark.code || `XLM-${mark.id}`,
          zone: mark.zone || 'comedor',
          label: mark.label || 'Elemento',
          shape: 'rect',
          x_pct: typeof l.x === 'number' ? clampPct(l.x) : clampPct(mark.x ?? 50),
          y_pct: typeof l.y === 'number' ? clampPct(l.y) : clampPct(mark.y ?? 50),
          w_pct: typeof l.w === 'number' ? Math.max(3, Math.min(100, l.w)) : Math.max(3, Math.min(100, mark.w ?? 12)),
          h_pct: typeof l.h === 'number' ? Math.max(3, Math.min(100, l.h)) : Math.max(3, Math.min(100, mark.h ?? 7)),
          scale: 1,
          capacity: 0,
          tone: mark.tone || 'cyan',
          is_hidden: 0,
          sort_order: sort++,
        });
      });
      setLayoutSyncBusy(true);
      try {
        const res = await fetch(`${layoutApiBase}/reservations/layout-bulk-save.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ items: rows, replace_all: true }),
        });
        const data = await res.json();
        if (!data?.success) {
          setLayoutSyncError(data?.error || 'No se pudo guardar layout global');
        } else {
          setLayoutSyncError('');
        }
      } catch {
        setLayoutSyncError('Error de conexión guardando layout global');
      } finally {
        setLayoutSyncBusy(false);
      }
    }, 380);
  }, [useDbLayout, allowLayoutEdit, adminVisual, tables, layoutApiBase]);

  const persistFullLayout = useCallback(
    (positions, groups, lm, hiddenArg) => {
      const hiddenNorm = normalizeHiddenFromStorage(hiddenArg ?? hiddenCodesByZoneRef.current);
      setLayoutPositions(positions);
      setGroupIdByCode(groups);
      setLandmarkLayouts(lm);
      setHiddenCodesByZone(hiddenNorm);
      layoutPositionsRef.current = positions;
      landmarkLayoutsRef.current = lm;
      hiddenCodesByZoneRef.current = hiddenNorm;
      if (useDbLayout) {
        queueDbPersist();
      } else {
        saveLayoutToStorage(layoutStorageKey, positions, groups, lm, hiddenNorm);
      }
    },
    [layoutStorageKey, queueDbPersist, useDbLayout],
  );

  useEffect(() => {
    if (!useDbLayout || !allowLayoutEdit || !adminVisual) return;
    let alive = true;
    const token = localStorage.getItem('token');
    (async () => {
      try {
        const res = await fetch(`${layoutApiBase}/reservations/layout-list.php`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!alive || !data?.success || !Array.isArray(data.items)) return;

        const nextPos = {};
        const nextLm = {};
        const nextHidden = emptyHiddenZones();
        const nextOverrides = {};
        const nextCustomTables = [];
        const nextCustomLandmarks = [];
        const baseCodes = new Set(tables.map((t) => String(t.code || '').toUpperCase().trim()).filter(Boolean));

        data.items.forEach((item) => {
          const type = String(item.item_type || '').toLowerCase();
          const zone = String(item.zone || 'comedor').toLowerCase();
          const code = String(item.code || '').toUpperCase();
          if (type === 'table' || type === 'bar_chair') {
            if (code) {
              nextPos[code] = {
                px: clampPct(Number(item.x_pct ?? 50)),
                py: clampPct(Number(item.y_pct ?? 50)),
                scale: clampScale(Number(item.scale ?? 1)),
              };
              if (item.is_hidden) {
                nextHidden[zone] = [...new Set([...(nextHidden[zone] || []), code])];
              }
            }
            if (baseCodes.has(code)) {
              nextOverrides[code] = {
                label: item.label || undefined,
                shape: item.shape || undefined,
                zone,
                capacity: Number(item.capacity || 0),
                tone: item.tone || null,
                item_type: type,
                w_pct: Number(item.w_pct || 0) || undefined,
                h_pct: Number(item.h_pct || 0) || undefined,
              };
            } else if (code) {
              nextCustomTables.push({
                code,
                label: item.label || code,
                zone,
                shape: item.shape || (type === 'bar_chair' ? 'rect' : 'round'),
                capacity: Number(item.capacity || 0),
                px: Number(item.x_pct ?? 50),
                py: Number(item.y_pct ?? 50),
                tableScale: Number(item.scale ?? 1),
                w_pct: Number(item.w_pct ?? 0) || undefined,
                h_pct: Number(item.h_pct ?? 0) || undefined,
                tone: item.tone || null,
                item_type: type,
              });
            }
            return;
          }

          if (type === 'landmark' || type === 'decor') {
            const baseMark = parseBaseLandmarkCode(code);
            if (baseMark) {
              const k = landmarkStorageKey(baseMark.zone, baseMark.id);
              nextLm[k] = {
                x: clampPct(Number(item.x_pct ?? 50)),
                y: clampPct(Number(item.y_pct ?? 50)),
                w: Math.max(3, Math.min(100, Number(item.w_pct ?? 10))),
                h: Math.max(3, Math.min(100, Number(item.h_pct ?? 6))),
              };
              return;
            }
            const id = code ? `c_${code.replace(/[^A-Z0-9_-]/g, '')}` : `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const k = landmarkStorageKey(zone, id);
            nextLm[k] = {
              x: clampPct(Number(item.x_pct ?? 50)),
              y: clampPct(Number(item.y_pct ?? 50)),
              w: Math.max(3, Math.min(100, Number(item.w_pct ?? 10))),
              h: Math.max(3, Math.min(100, Number(item.h_pct ?? 6))),
            };
            nextCustomLandmarks.push({
              id,
              code: code || `XLM-${id.toUpperCase()}`,
              item_type: type,
              zone,
              label: item.label || 'Elemento',
              tone: item.tone || 'cyan',
            });
          }
        });

        setLayoutPositions(nextPos);
        setLandmarkLayouts(nextLm);
        setHiddenCodesByZone(nextHidden);
        setTableOverridesByCode(nextOverrides);
        setCustomTables(nextCustomTables);
        setCustomLandmarks(nextCustomLandmarks);
        layoutPositionsRef.current = nextPos;
        landmarkLayoutsRef.current = nextLm;
        hiddenCodesByZoneRef.current = nextHidden;
        customTablesRef.current = nextCustomTables;
        customLandmarksRef.current = nextCustomLandmarks;
        tableOverridesRef.current = nextOverrides;
      } catch {
        if (alive) {
          setLayoutSyncError('No se pudo cargar layout global');
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [useDbLayout, allowLayoutEdit, adminVisual, layoutApiBase, tables]);

  useEffect(() => {
    if (selectedTable?.zone && !controlledZone) {
      const timer = setTimeout(() => {
        setInternalZone(selectedTable.zone);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedTable, controlledZone]);

  const handleZoneChange = (zone) => {
    if (!controlledZone) setInternalZone(zone);
    if (typeof onZoneChange === 'function') onZoneChange(zone);
  };

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const mobileMapInteractive = isMobile && !layoutEditMode;
  const mobileCanvasBase = useMemo(() => {
    if (!mobileMapInteractive) return { w: 0, h: 0 };
    return activeZone === 'comedor' ? { w: 1220, h: 760 } : { w: 1080, h: 700 };
  }, [mobileMapInteractive, activeZone]);

  useEffect(() => {
    if (!mobileMapInteractive) return;
    const viewport = mobileViewportRef.current;
    if (!viewport) return;
    const rafId = window.requestAnimationFrame(() => {
      // Arranca centrado para que no parezca "cortado" al entrar.
      viewport.scrollLeft = Math.max((viewport.scrollWidth - viewport.clientWidth) / 2, 0);
      viewport.scrollTop = Math.max((viewport.scrollHeight - viewport.clientHeight) / 2.4, 0);
    });
    return () => window.cancelAnimationFrame(rafId);
  }, [mobileMapInteractive, activeZone, mobileZoom]);

  useEffect(() => {
    if (!mobileMapInteractive) {
      setMobileZoom(1);
    }
  }, [mobileMapInteractive]);

  const mergedTables = useMemo(() => {
    const base = tables.map((t) => {
      const o = layoutPositions[t.code];
      const ov = tableOverridesByCode[t.code] || {};
      const px = o && typeof o.px === 'number' ? o.px : t.px;
      const py = o && typeof o.py === 'number' ? o.py : t.py;
      const tableScale = o && typeof o.scale === 'number' ? clampScale(o.scale) : 1;
      return {
        ...t,
        label: ov.label || t.label,
        zone: ov.zone || t.zone,
        shape: ov.shape || t.shape,
        capacity: Number.isFinite(ov.capacity) && ov.capacity > 0 ? ov.capacity : t.capacity,
        item_type: ov.item_type || 'table',
        tableScale,
        px,
        py,
      };
    });
    const extras = customTables.map((t) => {
      const o = layoutPositions[t.code];
      const px = o && typeof o.px === 'number' ? o.px : Number(t.px ?? 50);
      const py = o && typeof o.py === 'number' ? o.py : Number(t.py ?? 50);
      const tableScale = o && typeof o.scale === 'number' ? clampScale(o.scale) : clampScale(t.tableScale ?? 1);
      return {
        ...t,
        tableScale,
        px,
        py,
      };
    });
    return [...base, ...extras];
  }, [tables, layoutPositions, customTables, tableOverridesByCode]);

  /** Mesa(s) objetivo para escala / centrar / ocultar: multiselect o solo la mesa en foco (selectedCode). */
  const effectiveTableToolbarCodes = useMemo(() => {
    if (!layoutEditMode) return [];
    if (multiSelect.length > 0) return multiSelect;
    const sel = String(selectedCode || '').toUpperCase().trim();
    if (!sel) return [];
    if (mergedTables.some((t) => String(t.code || '').toUpperCase().trim() === sel)) return [sel];
    return [];
  }, [layoutEditMode, multiSelect, selectedCode, mergedTables]);

  const hiddenInZoneSet = useMemo(() => new Set(hiddenCodesByZone[activeZone] || []), [hiddenCodesByZone, activeZone]);

  const zoneTables = useMemo(
    () => mergedTables.filter((t) => t.zone === activeZone && !hiddenInZoneSet.has(t.code)),
    [mergedTables, activeZone, hiddenInZoneSet],
  );

  /** Mesas SR de esta zona marcadas ocultas (para volver a mostrar). */
  const hiddenTablesInActiveZone = useMemo(
    () => mergedTables.filter((t) => t.zone === activeZone && hiddenInZoneSet.has(t.code)),
    [activeZone, hiddenInZoneSet, mergedTables],
  );
  const compactZone = activeZone === 'comedor';
  const baseLandmarks = useMemo(() => LANDMARKS[activeZone] || [], [activeZone]);

  const mergedLandmarks = useMemo(() => {
    const defaults = baseLandmarks.map((mark) => {
      const k = landmarkStorageKey(activeZone, mark.id);
      const o = landmarkLayouts[k];
      const x = o && typeof o.x === 'number' ? o.x : mark.x;
      const y = o && typeof o.y === 'number' ? o.y : mark.y;
      const w = o && typeof o.w === 'number' ? o.w : mark.w;
      const h = o && typeof o.h === 'number' ? o.h : mark.h;
      return { ...mark, x, y, w, h };
    });
    const extra = customLandmarks
      .filter((m) => m.zone === activeZone)
      .map((m) => {
        const k = landmarkStorageKey(activeZone, m.id);
        const o = landmarkLayouts[k] || {};
        return {
          id: m.id,
          label: m.label || 'Elemento',
          tone: m.tone || 'cyan',
          x: typeof o.x === 'number' ? o.x : 50,
          y: typeof o.y === 'number' ? o.y : 50,
          w: typeof o.w === 'number' ? o.w : 12,
          h: typeof o.h === 'number' ? o.h : 7,
          custom: true,
          item_type: m.item_type || 'decor',
        };
      });
    return [...defaults, ...extra];
  }, [baseLandmarks, activeZone, landmarkLayouts, customLandmarks]);

  const codesInSameZoneGroup = useCallback(
    (gid) => {
      return mergedTables.filter((t) => t.zone === activeZone && effectiveGroupId(t.code, groupIdByCode) === gid).map((t) => t.code);
    },
    [mergedTables, activeZone, groupIdByCode],
  );

  const finishDragPersist = useCallback(() => {
    persistFullLayout(layoutPositionsRef.current, { ...groupIdByCode }, { ...landmarkLayoutsRef.current });
  }, [groupIdByCode, persistFullLayout]);

  const startDrag = useCallback(
    (e, code) => {
      if (!layoutEditMode || !canvasRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pid = e.pointerId;
      const gid = effectiveGroupId(code, groupIdByCode);
      const codes = codesInSameZoneGroup(gid);
      const rect = canvasRef.current.getBoundingClientRect();
      const startPctX = ((e.clientX - rect.left) / rect.width) * 100;
      const startPctY = ((e.clientY - rect.top) / rect.height) * 100;
      const orig = {};
      codes.forEach((c) => {
        const t = mergedTables.find((x) => x.code === c);
        if (t) orig[c] = { px: t.px, py: t.py };
      });
      const drag = {
        kind: 'table',
        pointerId: pid,
        codes,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPctX,
        startPctY,
        orig,
        moved: false,
      };
      dragRef.current = drag;

      const onMove = (ev) => {
        const d = dragRef.current;
        if (!d || d.kind !== 'table' || ev.pointerId !== d.pointerId) return;
        const dx = ev.clientX - d.startClientX;
        const dy = ev.clientY - d.startClientY;
        if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        d.moved = true;
        const el = canvasRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const curPx = ((ev.clientX - r.left) / r.width) * 100;
        const curPy = ((ev.clientY - r.top) / r.height) * 100;
        const dPx = curPx - d.startPctX;
        const dPy = curPy - d.startPctY;
        setLayoutPositions((prev) => {
          const next = { ...prev };
          d.codes.forEach((c) => {
            const o = d.orig[c];
            if (!o) return;
            const prevEntry = prev[c] || {};
            const sc = typeof prevEntry.scale === 'number' ? clampScale(prevEntry.scale) : 1;
            next[c] = { px: clampPct(o.px + dPx), py: clampPct(o.py + dPy), scale: sc };
          });
          layoutPositionsRef.current = next;
          return next;
        });
      };

      const onUp = (ev) => {
        if (ev.pointerId !== pid) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        const d = dragRef.current;
        dragRef.current = null;
        if (!d || d.kind !== 'table') return;
        if (d.moved) {
          finishDragPersist();
        } else if (!ev.shiftKey && typeof onSelect === 'function') {
          onSelect(code, { shiftKey: !!ev.shiftKey, layoutEditTap: true });
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [layoutEditMode, groupIdByCode, codesInSameZoneGroup, mergedTables, finishDragPersist, onSelect],
  );

  const startLandmarkDrag = useCallback(
    (e, mark) => {
      if (!layoutEditMode || !canvasRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pid = e.pointerId;
      const k = landmarkStorageKey(activeZone, mark.id);
      const rect = canvasRef.current.getBoundingClientRect();
      const startPctX = ((e.clientX - rect.left) / rect.width) * 100;
      const startPctY = ((e.clientY - rect.top) / rect.height) * 100;
      const ox = Number(mark.x);
      const oy = Number(mark.y);
      const ow = Number(mark.w);
      const oh = Number(mark.h);
      const drag = {
        kind: 'landmark',
        pointerId: pid,
        key: k,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPctX,
        startPctY,
        origX: ox,
        origY: oy,
        w: ow,
        h: oh,
        moved: false,
      };
      dragRef.current = drag;

      const onMove = (ev) => {
        const d = dragRef.current;
        if (!d || d.kind !== 'landmark' || ev.pointerId !== d.pointerId) return;
        const dx = ev.clientX - d.startClientX;
        const dy = ev.clientY - d.startClientY;
        if (!d.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
        d.moved = true;
        const el = canvasRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const curPx = ((ev.clientX - r.left) / r.width) * 100;
        const curPy = ((ev.clientY - r.top) / r.height) * 100;
        const dPx = curPx - d.startPctX;
        const dPy = curPy - d.startPctY;
        const c = clampLandmarkXY(d.origX + dPx, d.origY + dPy, d.w, d.h);
        setLandmarkLayouts((prev) => {
          const next = { ...prev, [k]: { x: c.x, y: c.y, w: d.w, h: d.h } };
          landmarkLayoutsRef.current = next;
          return next;
        });
      };

      const onUp = (ev) => {
        if (ev.pointerId !== pid) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        const d = dragRef.current;
        dragRef.current = null;
        if (!d || d.kind !== 'landmark') return;
        if (d.moved) {
          finishDragPersist();
        }
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [layoutEditMode, activeZone, finishDragPersist],
  );

  const startLandmarkResize = useCallback(
    (e, mark) => {
      if (!layoutEditMode || !canvasRef.current) return;
      e.preventDefault();
      e.stopPropagation();
      const pid = e.pointerId;
      const k = landmarkStorageKey(activeZone, mark.id);
      const ox = Number(mark.x);
      const oy = Number(mark.y);
      const ow = Number(mark.w);
      const oh = Number(mark.h);
      const drag = {
        kind: 'landmarkResize',
        pointerId: pid,
        key: k,
        startClientX: e.clientX,
        startClientY: e.clientY,
        origX: ox,
        origY: oy,
        w: ow,
        h: oh,
        moved: false,
      };
      dragRef.current = drag;

      const onMove = (ev) => {
        const d = dragRef.current;
        if (!d || d.kind !== 'landmarkResize' || ev.pointerId !== d.pointerId) return;
        if (!d.moved && Math.hypot(ev.clientX - d.startClientX, ev.clientY - d.startClientY) < DRAG_THRESHOLD_PX) {
          return;
        }
        d.moved = true;
        const el = canvasRef.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const mx = ((ev.clientX - r.left) / r.width) * 100;
        const my = ((ev.clientY - r.top) / r.height) * 100;
        const nw = Math.min(100 - d.origX, Math.max(4, mx - d.origX));
        const nh = Math.min(100 - d.origY, Math.max(3, my - d.origY));
        const c = clampLandmarkXY(d.origX, d.origY, nw, nh);
        setLandmarkLayouts((prev) => {
          const next = { ...prev, [k]: { x: c.x, y: c.y, w: c.w, h: c.h } };
          landmarkLayoutsRef.current = next;
          return next;
        });
      };

      const onUp = (ev) => {
        if (ev.pointerId !== pid) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        const d = dragRef.current;
        dragRef.current = null;
        if (!d || d.kind !== 'landmarkResize') return;
        if (d.moved) finishDragPersist();
      };

      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);
      window.addEventListener('pointercancel', onUp);
    },
    [layoutEditMode, activeZone, finishDragPersist],
  );

  const handleTableClick = useCallback(
    (e, code) => {
      if (layoutEditMode) {
        e.preventDefault();
        return;
      }
      if (typeof onSelect === 'function') onSelect(code, { shiftKey: !!e.shiftKey });
    },
    [layoutEditMode, onSelect],
  );

  const toggleMultiSelect = useCallback((code) => {
    setMultiSelect((prev) => {
      const u = String(code).toUpperCase();
      if (prev.includes(u)) return prev.filter((c) => c !== u);
      return [...prev, u];
    });
  }, []);

  const handleTablePointerDown = useCallback(
    (e, code) => {
      if (!layoutEditMode) return;
      e.stopPropagation();
      setSelectedLandmarkId('');
      if (e.shiftKey) {
        e.preventDefault();
        toggleMultiSelect(code);
        return;
      }
      startDrag(e, code);
    },
    [layoutEditMode, startDrag, toggleMultiSelect],
  );

  const groupSelection = useCallback(() => {
    if (multiSelect.length < 2) return;
    const zoneSet = new Set(mergedTables.filter((t) => multiSelect.includes(t.code)).map((t) => t.zone));
    if (zoneSet.size !== 1) return;
    const newGid = `grp_${Date.now()}`;
    const g = { ...groupIdByCode };
    multiSelect.forEach((c) => {
      g[c] = newGid;
    });
    persistFullLayout(layoutPositions, g, { ...landmarkLayouts });
    setMultiSelect([]);
  }, [multiSelect, groupIdByCode, layoutPositions, persistFullLayout, landmarkLayouts, mergedTables]);

  const ungroupSelection = useCallback(() => {
    if (!effectiveTableToolbarCodes.length) return;
    const g = { ...groupIdByCode };
    effectiveTableToolbarCodes.forEach((c) => {
      const mt = mergedTables.find((x) => String(x.code || '').toUpperCase().trim() === String(c).toUpperCase().trim());
      const k = mt?.code ?? c;
      delete g[k];
    });
    persistFullLayout(layoutPositions, g, { ...landmarkLayouts });
    setMultiSelect([]);
  }, [effectiveTableToolbarCodes, mergedTables, groupIdByCode, layoutPositions, persistFullLayout, landmarkLayouts]);

  const resetZoneLayout = useCallback(() => {
    const next = { ...layoutPositions };
    const g = { ...groupIdByCode };
    tables.forEach((t) => {
      if (t.zone === activeZone) {
        delete next[t.code];
        delete g[t.code];
      }
    });
    const nextLm = { ...landmarkLayouts };
    (LANDMARKS[activeZone] || []).forEach((mark) => {
      delete nextLm[landmarkStorageKey(activeZone, mark.id)];
    });
    customLandmarks
      .filter((m) => m.zone === activeZone)
      .forEach((m) => {
        delete nextLm[landmarkStorageKey(activeZone, m.id)];
      });
    const nextH = { ...hiddenCodesByZone, [activeZone]: [] };
    persistFullLayout(next, g, nextLm, nextH);
    setCustomLandmarks((prev) => prev.filter((m) => m.zone !== activeZone));
    setCustomTables((prev) => prev.filter((t) => t.zone !== activeZone));
    setMultiSelect([]);
  }, [tables, activeZone, layoutPositions, groupIdByCode, persistFullLayout, landmarkLayouts, hiddenCodesByZone, customLandmarks]);

  const resetAllLayout = useCallback(() => {
    persistFullLayout({}, {}, {}, emptyHiddenZones());
    setCustomLandmarks([]);
    setCustomTables([]);
    setTableOverridesByCode({});
    setMultiSelect([]);
  }, [persistFullLayout]);

  const applyTableScaleToSelection = useCallback(
    (nv) => {
      const v = clampScale(nv);
      if (!effectiveTableToolbarCodes.length) return;
      const next = { ...layoutPositionsRef.current };
      effectiveTableToolbarCodes.forEach((c) => {
        const mt = mergedTables.find((x) => String(x.code || '').toUpperCase().trim() === String(c).toUpperCase().trim());
        if (!mt) return;
        const prevEntry = next[mt.code] || {};
        next[mt.code] = {
          px: clampPct(typeof prevEntry.px === 'number' ? prevEntry.px : mt.px),
          py: clampPct(typeof prevEntry.py === 'number' ? prevEntry.py : mt.py),
          scale: v,
        };
      });
      persistFullLayout(next, { ...groupIdByCode }, { ...landmarkLayouts });
    },
    [effectiveTableToolbarCodes, mergedTables, groupIdByCode, landmarkLayouts, persistFullLayout],
  );

  const centerSelectionInZone = useCallback(() => {
    if (!effectiveTableToolbarCodes.length) return;
    const next = { ...layoutPositionsRef.current };
    effectiveTableToolbarCodes.forEach((c) => {
      const mt = mergedTables.find((x) => String(x.code || '').toUpperCase().trim() === String(c).toUpperCase().trim());
      if (!mt) return;
      const prevEntry = next[mt.code] || {};
      next[mt.code] = {
        px: 50,
        py: 50,
        scale:
          typeof prevEntry.scale === 'number' ? clampScale(prevEntry.scale) : clampScale(mt.tableScale ?? 1),
      };
    });
    persistFullLayout(next, { ...groupIdByCode }, { ...landmarkLayouts });
  }, [effectiveTableToolbarCodes, mergedTables, groupIdByCode, landmarkLayouts, persistFullLayout]);

  const hideSelectedTablesFromZone = useCallback(() => {
    if (!effectiveTableToolbarCodes.length) return;
    const nextH = {
      ...hiddenCodesByZoneRef.current,
      [activeZone]: [
        ...new Set([...(hiddenCodesByZoneRef.current[activeZone] || []), ...effectiveTableToolbarCodes]),
      ],
    };
    persistFullLayout(layoutPositionsRef.current, { ...groupIdByCode }, { ...landmarkLayoutsRef.current }, nextH);
    setMultiSelect([]);
  }, [activeZone, groupIdByCode, persistFullLayout, effectiveTableToolbarCodes]);

  const revealHiddenTable = useCallback(
    (code) => {
      const c = String(code || '').toUpperCase().trim();
      if (!c) return;
      const nextH = {
        ...hiddenCodesByZoneRef.current,
        [activeZone]: (hiddenCodesByZoneRef.current[activeZone] || []).filter((x) => x !== c),
      };
      persistFullLayout(layoutPositionsRef.current, { ...groupIdByCode }, { ...landmarkLayoutsRef.current }, nextH);
    },
    [activeZone, groupIdByCode, persistFullLayout],
  );

  const createCustomTable = useCallback(
    (kind) => {
      const prefix = kind === 'bar_chair' ? 'VIS-BAR' : 'VIS-MESA';
      const code = `${prefix}-${Date.now().toString(36).toUpperCase()}`;
      const shape = kind === 'bar_chair' ? 'rect' : 'round';
      const table = {
        code,
        label: kind === 'bar_chair' ? 'Silla bar' : 'Mesa visual',
        zone: activeZone,
        shape,
        capacity: kind === 'bar_chair' ? 1 : 4,
        px: 50,
        py: 50,
        tableScale: 1,
        item_type: kind,
      };
      setCustomTables((prev) => [...prev, table]);
      setLayoutPositions((prev) => {
        const next = { ...prev, [code]: { px: 50, py: 50, scale: 1 } };
        layoutPositionsRef.current = next;
        return next;
      });
      queueMicrotask(() => {
        if (typeof onSelect === 'function') onSelect(code, { shiftKey: false, layoutEditTap: true });
      });
      queueDbPersist();
    },
    [activeZone, onSelect, queueDbPersist],
  );

  const createCustomElement = useCallback(
    (kind) => {
      const id = `x_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
      const item = {
        id,
        code: `XLM-${id.toUpperCase()}`,
        item_type: kind,
        zone: activeZone,
        label: kind === 'landmark' ? 'Landmark' : 'Decor',
        tone: kind === 'landmark' ? 'amber' : 'cyan',
      };
      const key = landmarkStorageKey(activeZone, id);
      setCustomLandmarks((prev) => [...prev, item]);
      setLandmarkLayouts((prev) => {
        const next = { ...prev, [key]: { x: 50, y: 50, w: 12, h: 7 } };
        landmarkLayoutsRef.current = next;
        return next;
      });
      setSelectedLandmarkId(id);
      queueDbPersist();
    },
    [activeZone, queueDbPersist],
  );

  const deleteSelectedCustomTable = useCallback(() => {
    const code = String(selectedCode || '').toUpperCase().trim();
    if (!code) return;
    setCustomTables((prev) => prev.filter((t) => t.code !== code));
    setLayoutPositions((prev) => {
      const next = { ...prev };
      delete next[code];
      layoutPositionsRef.current = next;
      return next;
    });
    const nextH = { ...hiddenCodesByZoneRef.current };
    Object.keys(nextH).forEach((z) => {
      nextH[z] = (nextH[z] || []).filter((c) => c !== code);
    });
    hiddenCodesByZoneRef.current = nextH;
    setHiddenCodesByZone(nextH);
    if (typeof onSelect === 'function') onSelect('');
    queueDbPersist();
  }, [selectedCode, onSelect, queueDbPersist]);

  const deleteSelectedLandmark = useCallback(() => {
    if (!selectedLandmarkId) return;
    const target = customLandmarksRef.current.find((x) => x.id === selectedLandmarkId);
    if (!target) return;
    const k = landmarkStorageKey(target.zone, target.id);
    setCustomLandmarks((prev) => prev.filter((x) => x.id !== selectedLandmarkId));
    setLandmarkLayouts((prev) => {
      const next = { ...prev };
      delete next[k];
      landmarkLayoutsRef.current = next;
      return next;
    });
    setSelectedLandmarkId('');
    queueDbPersist();
  }, [selectedLandmarkId, queueDbPersist]);

  const selectedLandmarkLayout = useMemo(() => {
    if (!selectedLandmarkId) return null;
    const item = customLandmarks.find((x) => x.id === selectedLandmarkId);
    if (!item) return null;
    const key = landmarkStorageKey(item.zone, item.id);
    const layout = landmarkLayouts[key] || null;
    return item && layout ? { item, layout } : null;
  }, [selectedLandmarkId, customLandmarks, landmarkLayouts]);

  const backgroundByZone =
    activeZone === 'comedor'
      ? 'bg-[linear-gradient(to_right,rgba(120,90,50,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,90,50,0.10)_1px,transparent_1px),radial-gradient(circle_at_20%_15%,rgba(245,222,179,0.12),transparent_38%),linear-gradient(160deg,#2a2520,#1b1a18)] bg-[size:38px_38px,38px_38px,auto,auto]'
      : activeZone === 'terraza_alta'
        ? 'bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(160deg,#3f7a31,#2f6b25)] bg-[size:40px_40px,40px_40px,auto]'
        : 'bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(160deg,#274428,#1f3322)] bg-[size:40px_40px,40px_40px,auto]';

  const handleCanvasBackgroundClick = useCallback(
    (e) => {
      if (e.target !== e.currentTarget) return;
      if (layoutEditMode) {
        setMultiSelect([]);
        setSelectedLandmarkId('');
        return;
      }
      if (readonly || typeof onSelect !== 'function') return;
      onSelect('');
    },
    [layoutEditMode, readonly, onSelect],
  );

  const landmarkToneClass = (tone) => {
    if (tone === 'amber') return 'border-amber-300/65 bg-amber-900/45 text-amber-50';
    if (tone === 'purple') return 'border-violet-300/65 bg-violet-900/45 text-violet-50';
    if (tone === 'emerald') return 'border-emerald-300/65 bg-emerald-900/45 text-emerald-50';
    return 'border-cyan-300/65 bg-cyan-900/45 text-cyan-50';
  };

  const visualClass = (v) => {
    if (reservationsOnly) {
      if (v === 'reserved') {
        return 'border-sky-400/70 bg-sky-600/35 text-sky-50 shadow-[0_0_14px_rgba(56,189,248,0.35)]';
      }
      if (v === 'unsuitable') {
        return 'border-amber-500/50 bg-amber-900/25 text-amber-100';
      }
      return 'border-emerald-400/50 bg-emerald-700/25 text-emerald-50 hover:bg-emerald-700/32';
    }
    if (v === 'open_ticket') return 'border-rose-500/70 bg-rose-600/35 text-rose-50 shadow-[0_0_16px_rgba(244,63,94,0.45)]';
    if (v === 'printed_unpaid') return 'border-amber-400/70 bg-amber-500/40 text-amber-950 shadow-[0_0_14px_rgba(251,191,36,0.4)]';
    if (v === 'reserved') return 'border-indigo-400/55 bg-indigo-600/30 text-indigo-50';
    if (v === 'unsuitable') return 'border-slate-500/50 bg-slate-700/25 text-slate-300';
    return 'border-emerald-400/45 bg-emerald-600/20 text-emerald-50 hover:bg-emerald-600/28';
  };

  const showLayoutToolbar = allowLayoutEdit && adminVisual;

  return (
    <div className="space-y-3">
      {adminVisual && (
        <p className="text-[10px] uppercase tracking-wider text-slate-500">
          Mapa:{' '}
          {reservationsOnly ? (
            <span className="text-sky-300/90">Sólo reservas (azul / verde · sin colores POS)</span>
          ) : (
            <span className="text-rose-200/80">Operación / POS (rojo · ámbar · reserva índigo)</span>
          )}
        </p>
      )}
      <div className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#101722] via-[#111827] to-[#0b1524] p-2 sm:p-3 lg:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
        {showLayoutToolbar && !mapToolbarCollapsed && (
          <div className="mb-3 overflow-hidden rounded-xl border border-slate-600/45 bg-slate-900/50 text-[11px] text-slate-300 shadow-[0_12px_40px_rgba(0,0,0,0.35)] ring-1 ring-[#D4AF37]/10">
            <div className="flex items-center justify-between gap-2 border-b border-slate-600/35 bg-slate-950/60 px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#F4E4C1]/95">Herramientas del plano</p>
                <p className="truncate text-[9px] text-slate-500">Edición de mesas, hitos y layout global</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  persistToolbarCollapsed(true);
                  setMapHelpOpen(false);
                }}
                className="group inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-500/50 bg-slate-800/85 px-2.5 py-1.5 text-[10px] font-medium text-slate-100 transition-all hover:border-[#D4AF37]/45 hover:bg-slate-800 hover:text-[#F4E4C1] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/45"
                aria-expanded={true}
                aria-controls="floor-plan-toolbar-body"
                title="Ocultar barra (más espacio para el mapa)"
              >
                <IconChevronsCollapseUp className="h-4 w-4 text-cyan-300/90 transition-transform group-hover:-translate-y-px" />
                <span className="hidden sm:inline">Ocultar</span>
              </button>
            </div>
            <div
              id="floor-plan-toolbar-body"
              className="flex flex-col gap-2 p-2 sm:flex-row sm:flex-wrap sm:items-center"
            >
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={layoutEditMode}
                onChange={(e) => {
                  setLayoutEditMode(e.target.checked);
                  if (!e.target.checked) setMultiSelect([]);
                }}
                className="rounded border-slate-500"
              />
              <span className="text-[#F4E4C1]/90">Editar posiciones (arrastrar mesas y zonas del plano)</span>
            </label>
            <span className="hidden text-slate-500 sm:inline">|</span>
            <span className="text-slate-400">
              {layoutEditMode
                ? 'Hitos: arrastrar y esquina inferior derecha para tamaño · Mesas: arrastrar, Mayús+clic multiselección · Escala/centrar/ocultar: mesa en foco o selección con Mayús'
                : 'Activa edición para mover todo el decorado del mapa'}
            </span>
            {layoutEditMode && effectiveTableToolbarCodes.length > 0 && (
              <span className="font-mono text-cyan-300/90">Objetivo mapa: {effectiveTableToolbarCodes.join(', ')}</span>
            )}
            <div className="flex flex-wrap gap-1.5 sm:ml-auto">
              <button
                type="button"
                disabled={!layoutEditMode || multiSelect.length < 2}
                onClick={groupSelection}
                className="rounded border border-violet-500/35 bg-violet-500/15 px-2 py-1 text-[10px] text-violet-100 disabled:opacity-40"
              >
                Agrupar selección
              </button>
              <button
                type="button"
                disabled={!layoutEditMode || effectiveTableToolbarCodes.length === 0}
                onClick={ungroupSelection}
                className="rounded border border-slate-500/40 bg-slate-700/40 px-2 py-1 text-[10px] text-slate-200 disabled:opacity-40"
              >
                Separar selección
              </button>
              <button
                type="button"
                disabled={!layoutEditMode}
                onClick={resetZoneLayout}
                className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-100 disabled:opacity-40"
              >
                Restaurar zona
              </button>
              <button
                type="button"
                disabled={!layoutEditMode}
                onClick={resetAllLayout}
                className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-1 text-[10px] text-rose-100 disabled:opacity-40"
              >
                Restaurar todo
              </button>
            </div>
            {layoutEditMode && (
              <div className="flex w-full flex-col gap-2 border-t border-slate-600/30 pt-2 sm:flex-row sm:flex-wrap sm:items-center">
                <label className="flex min-w-[200px] flex-1 items-center gap-2 text-[10px] text-slate-400">
                  Escala mesa
                  <input
                    type="range"
                    min={0.5}
                    max={2}
                    step={0.05}
                    disabled={effectiveTableToolbarCodes.length === 0}
                    value={
                      effectiveTableToolbarCodes.length
                        ? mergedTables.find(
                            (t) =>
                              String(t.code || '').toUpperCase().trim() ===
                              String(effectiveTableToolbarCodes[0] || '').toUpperCase().trim(),
                          )?.tableScale ?? 1
                        : 1
                    }
                    onChange={(e) => applyTableScaleToSelection(Number(e.target.value))}
                    className="h-2 min-w-[120px] flex-1 accent-[#D4AF37] disabled:opacity-40"
                  />
                  <span className="w-8 font-mono text-slate-300">
                    {effectiveTableToolbarCodes.length
                      ? Math.round(
                          (mergedTables.find(
                            (t) =>
                              String(t.code || '').toUpperCase().trim() ===
                              String(effectiveTableToolbarCodes[0] || '').toUpperCase().trim(),
                          )?.tableScale ?? 1) * 100,
                        )
                      : 100}
                    %
                  </span>
                </label>
                <button
                  type="button"
                  disabled={effectiveTableToolbarCodes.length === 0}
                  onClick={centerSelectionInZone}
                  className="rounded border border-cyan-500/35 bg-cyan-500/12 px-2 py-1 text-[10px] text-cyan-100 disabled:opacity-40"
                >
                  Centrar en zona
                </button>
                <button
                  type="button"
                  disabled={effectiveTableToolbarCodes.length === 0}
                  onClick={hideSelectedTablesFromZone}
                  className="rounded border border-slate-500/40 bg-slate-800/50 px-2 py-1 text-[10px] text-slate-200 disabled:opacity-40"
                >
                  Ocultar del mapa
                </button>
                {hiddenTablesInActiveZone.length > 0 ? (
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400">
                    <span className="whitespace-nowrap">Mostrar mesa</span>
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v) revealHiddenTable(v);
                        e.target.value = '';
                      }}
                      className="max-w-[140px] rounded border border-slate-600/50 bg-slate-950/80 px-1.5 py-1 text-[10px] text-slate-100"
                    >
                      <option value="">Elegir…</option>
                      {hiddenTablesInActiveZone.map((t) => (
                        <option key={t.code} value={t.code}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : null}
                <span className="mx-1 hidden text-slate-500 sm:inline">|</span>
                <button
                  type="button"
                  onClick={() => createCustomTable('table')}
                  className="rounded border border-emerald-500/35 bg-emerald-500/12 px-2 py-1 text-[10px] text-emerald-100"
                >
                  + Mesa visual
                </button>
                <button
                  type="button"
                  onClick={() => createCustomTable('bar_chair')}
                  className="rounded border border-sky-500/35 bg-sky-500/12 px-2 py-1 text-[10px] text-sky-100"
                >
                  + Silla bar
                </button>
                <button
                  type="button"
                  onClick={() => createCustomElement('decor')}
                  className="rounded border border-violet-500/35 bg-violet-500/12 px-2 py-1 text-[10px] text-violet-100"
                >
                  + Elemento
                </button>
                <button
                  type="button"
                  onClick={() => createCustomElement('landmark')}
                  className="rounded border border-amber-500/35 bg-amber-500/12 px-2 py-1 text-[10px] text-amber-100"
                >
                  + Landmark
                </button>
                <button
                  type="button"
                  disabled={!customTables.some((t) => t.code === selectedCode)}
                  onClick={deleteSelectedCustomTable}
                  className="rounded border border-rose-500/35 bg-rose-500/12 px-2 py-1 text-[10px] text-rose-100 disabled:opacity-40"
                >
                  Eliminar mesa/silla seleccionada
                </button>
                <button
                  type="button"
                  disabled={!selectedLandmarkLayout}
                  onClick={deleteSelectedLandmark}
                  className="rounded border border-rose-500/35 bg-rose-500/12 px-2 py-1 text-[10px] text-rose-100 disabled:opacity-40"
                >
                  Eliminar elemento seleccionado
                </button>
                {selectedLandmarkLayout ? (
                  <label className="flex min-w-[220px] flex-1 items-center gap-2 text-[10px] text-slate-300">
                    Tamaño elemento
                    <input
                      type="range"
                      min={4}
                      max={22}
                      step={1}
                      value={selectedLandmarkLayout.layout.w}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        const k = landmarkStorageKey(selectedLandmarkLayout.item.zone, selectedLandmarkLayout.item.id);
                        setLandmarkLayouts((prev) => {
                          const next = {
                            ...prev,
                            [k]: {
                              ...prev[k],
                              w: Math.max(3, Math.min(100, v)),
                              h: Math.max(3, Math.min(100, v * 0.58)),
                            },
                          };
                          landmarkLayoutsRef.current = next;
                          return next;
                        });
                        queueDbPersist();
                      }}
                      className="h-2 min-w-[120px] flex-1 accent-[#D4AF37]"
                    />
                  </label>
                ) : null}
              </div>
            )}
            {layoutEditMode && (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-slate-600/30 px-1 py-2 text-[10px] text-slate-400">
                {layoutSyncBusy ? <span className="text-cyan-300/90">Guardando layout global…</span> : <span>Layout global activo</span>}
                {layoutSyncError ? <span className="text-rose-300/90">{layoutSyncError}</span> : null}
              </div>
            )}
            </div>
          </div>
        )}
        {showLayoutToolbar && mapToolbarCollapsed && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-600/45 bg-slate-900/55 px-3 py-2.5 shadow-inner ring-1 ring-slate-700/30">
            <button
              type="button"
              onClick={() => persistToolbarCollapsed(false)}
              className="group inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg border border-[#D4AF37]/30 bg-[#D4AF37]/[0.07] px-3 py-2 text-left transition-all hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/12 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40 sm:justify-start sm:py-1.5"
              aria-expanded={false}
              aria-controls="floor-plan-toolbar-body"
            >
              <IconChevronsExpandDown className="h-4 w-4 shrink-0 text-cyan-300/90 transition-transform group-hover:translate-y-px" />
              <span className="text-[11px] font-medium text-[#F4E4C1]/95">Mostrar herramientas del plano</span>
            </button>
            <div className="flex shrink-0 flex-col items-end gap-0.5 text-[10px]">
              {layoutSyncBusy ? (
                <span className="text-cyan-300/90" title="Sincronizando layout">
                  Guardando…
                </span>
              ) : null}
              {layoutSyncError ? (
                <span className="max-w-[min(100%,14rem)] truncate text-rose-300/95" title={layoutSyncError}>
                  Error al guardar
                </span>
              ) : null}
            </div>
          </div>
        )}

        <div className="mb-3 grid grid-cols-3 gap-2 text-[11px] uppercase tracking-[0.16em] text-[#F4E4C1]/80">
          {ZONES.map((zone) => {
            const isActive = zone.key === activeZone;
            return (
              <button
                key={zone.key}
                type="button"
                onClick={() => handleZoneChange(zone.key)}
                className={`rounded-lg border px-2 py-1.5 text-center transition-all ${
                  isActive
                    ? 'border-[#D4AF37]/45 bg-[#D4AF37]/14 text-[#F4E4C1] shadow-[0_8px_25px_rgba(212,175,55,0.18)]'
                    : 'border-slate-600/40 bg-slate-700/20 text-[#F4E4C1]/70 hover:border-slate-500/50'
                }`}
              >
                {zone.label}
              </button>
            );
          })}
        </div>

        <div
          ref={mobileViewportRef}
          className={
            mobileMapInteractive
              ? 'relative max-h-[min(72vh,620px)] min-h-[380px] overflow-auto overscroll-contain rounded-xl touch-pan-x touch-pan-y [-webkit-overflow-scrolling:touch]'
              : 'relative'
          }
        >
          {mobileMapInteractive && (
            <div className="pointer-events-none absolute right-2 top-2 z-20 flex gap-1">
              <button
                type="button"
                className="pointer-events-auto rounded-md border border-cyan-400/45 bg-[#030b14]/88 px-2 py-1 text-[10px] font-bold text-cyan-100"
                onClick={() => setMobileZoom((z) => Math.max(0.8, Number((z - 0.15).toFixed(2))))}
              >
                -
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-md border border-cyan-400/45 bg-[#030b14]/88 px-2 py-1 text-[10px] font-bold text-cyan-100"
                onClick={() => setMobileZoom(1)}
              >
                100%
              </button>
              <button
                type="button"
                className="pointer-events-auto rounded-md border border-cyan-400/45 bg-[#030b14]/88 px-2 py-1 text-[10px] font-bold text-cyan-100"
                onClick={() => setMobileZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
              >
                +
              </button>
            </div>
          )}
          {adminVisual && (
            <>
              {mapHelpOpen && (
                <button
                  type="button"
                  className="fixed inset-0 z-[18] cursor-default bg-black/40 backdrop-blur-[0.5px] transition-opacity"
                  aria-label="Cerrar ayuda del mapa"
                  onClick={() => setMapHelpOpen(false)}
                />
              )}
              <div
                className={`pointer-events-none absolute z-[21] flex flex-col items-end gap-2 ${
                  mobileMapInteractive ? 'bottom-14 right-2' : 'bottom-3 right-2 sm:bottom-auto sm:right-3 sm:top-1/2 sm:-translate-y-1/2'
                }`}
              >
                <div ref={mapHelpPanelRef} className="pointer-events-auto flex flex-col items-end gap-2">
                  {mapHelpOpen && (
                    <div
                      id="floor-plan-map-help"
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="floor-plan-map-help-title"
                      className="max-h-[min(70vh,26rem)] w-[min(19.5rem,calc(100vw-2.5rem))] overflow-y-auto rounded-xl border border-slate-500/50 bg-[#060d16]/[0.97] p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.65)] backdrop-blur-md ring-1 ring-[#D4AF37]/15"
                    >
                      <div className="mb-2 flex items-start justify-between gap-2 border-b border-slate-600/35 pb-2">
                        <h3 id="floor-plan-map-help-title" className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F4E4C1]/95">
                          Qué puedes hacer
                        </h3>
                        <button
                          type="button"
                          onClick={() => setMapHelpOpen(false)}
                          className="rounded-md border border-slate-600/60 px-2 py-0.5 text-[10px] text-slate-400 transition-colors hover:border-slate-500 hover:text-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40"
                        >
                          Cerrar
                        </button>
                      </div>
                      <p className="text-[9px] leading-relaxed text-slate-500">
                        Atajos del mapa · <kbd className="rounded border border-slate-600/50 bg-slate-900/80 px-1 font-mono text-[8px] text-slate-400">Esc</kbd> cierra esta ventana
                      </p>
                      <ul className="mt-3 space-y-2.5 text-[10px] leading-snug text-slate-300">
                        <li className="flex gap-2">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-cyan-500/30 bg-cyan-500/10 text-[9px] font-bold text-cyan-200/90" aria-hidden>
                            1
                          </span>
                          <span>
                            <strong className="text-slate-100">Mesas</strong>
                            {!readonly && layoutEditMode
                              ? ' Arrastra para mover. Mayús+clic para elegir varias. Clic en el fondo verde limpia la multiselección.'
                              : ' Clic en una mesa para ver detalle y acciones.'}
                          </span>
                        </li>
                        <li className="flex gap-2">
                          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-amber-500/30 bg-amber-500/10 text-[9px] font-bold text-amber-100/90" aria-hidden>
                            2
                          </span>
                          <span>
                            <strong className="text-slate-100">Zonas</strong> Usa Comedor / Terraza arriba del mapa para cambiar de planta.
                          </span>
                        </li>
                        {showLayoutToolbar && (
                          <li className="flex gap-2">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-violet-500/30 bg-violet-500/10 text-[9px] font-bold text-violet-100/90" aria-hidden>
                              3
                            </span>
                            <span>
                              <strong className="text-slate-100">Hitos y elementos</strong> Con edición activa: arrastra rectángulos punteados; esquina inferior derecha para redimensionar.
                            </span>
                          </li>
                        )}
                        {showLayoutToolbar && layoutEditMode && (
                          <li className="flex gap-2">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-emerald-500/30 bg-emerald-500/10 text-[9px] font-bold text-emerald-100/90" aria-hidden>
                              4
                            </span>
                            <span>
                              <strong className="text-slate-100">Escala y foco</strong> El deslizador «Escala mesa» aplica a la mesa en foco o a la multiselección (Mayús).
                            </span>
                          </li>
                        )}
                        {mobileMapInteractive && (
                          <li className="flex gap-2">
                            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-sky-500/30 bg-sky-500/10 text-[9px] font-bold text-sky-100/90" aria-hidden>
                              +
                            </span>
                            <span>
                              <strong className="text-slate-100">Zoom del mapa</strong> Botones − / + arriba a la derecha: amplían el lienzo para ver mejor en móvil (no es zoom de cámara).
                            </span>
                          </li>
                        )}
                      </ul>
                      <p className="mt-3 border-t border-slate-600/30 pt-2 text-[9px] leading-relaxed text-slate-500">
                        Los colores de mesa siguen la leyenda debajo del mapa (POS / reservas). Las flechas dobles en la barra de herramientas la ocultan o la muestran.
                      </p>
                    </div>
                  )}
                  <div className="flex flex-col gap-1.5 rounded-xl border border-slate-600/55 bg-[#040c14]/[0.96] p-1 shadow-[0_8px_28px_rgba(0,0,0,0.45)] backdrop-blur-sm ring-1 ring-[#D4AF37]/12">
                    <button
                      type="button"
                      onClick={() => setMapHelpOpen((o) => !o)}
                      aria-expanded={mapHelpOpen}
                      aria-controls="floor-plan-map-help"
                      title="Qué puedes hacer en el mapa"
                      className="flex h-10 w-10 items-center justify-center rounded-lg border border-transparent text-slate-200 transition-all hover:border-cyan-500/35 hover:bg-slate-800/90 hover:text-cyan-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50"
                    >
                      <span className="sr-only">{mapHelpOpen ? 'Cerrar ayuda del mapa' : 'Abrir ayuda del mapa'}</span>
                      <IconMapHelp className="h-[18px] w-[18px] opacity-90" />
                    </button>
                    {showLayoutToolbar && (
                      <button
                        type="button"
                        onClick={() => {
                          persistToolbarCollapsed(!mapToolbarCollapsed);
                          setMapHelpOpen(false);
                        }}
                        aria-expanded={!mapToolbarCollapsed}
                        aria-controls="floor-plan-toolbar-body"
                        title={mapToolbarCollapsed ? 'Mostrar herramientas del plano' : 'Ocultar herramientas del plano'}
                        className="flex h-10 w-10 flex-col items-center justify-center gap-0 rounded-lg border border-transparent text-slate-200 transition-all hover:border-[#D4AF37]/40 hover:bg-slate-800/90 hover:text-[#F4E4C1] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/45"
                      >
                        <span className="sr-only">{mapToolbarCollapsed ? 'Mostrar barra de herramientas' : 'Ocultar barra de herramientas'}</span>
                        {mapToolbarCollapsed ? (
                          <IconChevronsExpandDown className="h-4 w-4 text-cyan-300/90" />
                        ) : (
                          <IconChevronsCollapseUp className="h-4 w-4 text-cyan-300/90" />
                        )}
                        <span className="mt-0.5 text-[6px] font-semibold uppercase tracking-wider text-slate-500">Barra</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          <div
            className="relative"
            style={
              mobileMapInteractive
                ? {
                    width: `${Math.round(mobileCanvasBase.w * mobileZoom)}px`,
                    height: `${Math.round(mobileCanvasBase.h * mobileZoom)}px`,
                  }
                : undefined
            }
          >
          <div
            ref={canvasRef}
            onClick={handleCanvasBackgroundClick}
            className={`relative overflow-hidden rounded-xl border border-white/15 shadow-inner shadow-black/40 ${backgroundByZone} ${layoutEditMode ? 'touch-pan-y ring-1 ring-[#D4AF37]/25' : ''} ${mapRefreshing && !layoutEditMode ? 'opacity-[0.88] transition-opacity duration-200' : ''} ${mobileMapInteractive ? 'h-[640px] min-w-[1080px]' : 'h-[300px] sm:h-[360px] lg:h-[420px] w-full'}`}
            style={
              mobileMapInteractive
                ? {
                    width: `${mobileCanvasBase.w}px`,
                    height: `${mobileCanvasBase.h}px`,
                    transform: `scale(${mobileZoom})`,
                    transformOrigin: 'top left',
                  }
                : undefined
            }
          >
            {mapRefreshing && !layoutEditMode && adminVisual && (
              <div className="pointer-events-none absolute inset-0 z-[5] flex items-start justify-end p-2">
                <span className="rounded-md border border-cyan-500/30 bg-slate-950/80 px-2 py-1 text-[9px] uppercase tracking-wider text-cyan-200/90">
                  Actualizando…
                </span>
              </div>
            )}
            {mergedLandmarks.map((mark) => {
              const editable = !!(showLayoutToolbar && layoutEditMode);
              return (
                <div
                  key={mark.id}
                  role={editable ? 'button' : undefined}
                  tabIndex={editable ? 0 : undefined}
                  onPointerDown={(ev) => {
                    if (!editable) return;
                    ev.stopPropagation();
                    setSelectedLandmarkId(mark.custom ? mark.id : '');
                    startLandmarkDrag(ev, mark);
                  }}
                  className={`absolute z-[2] rounded-lg border border-dashed px-2 py-1 ${landmarkToneClass(mark.tone)} ${editable ? 'cursor-grab active:cursor-grabbing touch-none' : 'pointer-events-none'} ${
                    selectedLandmarkId === mark.id ? 'ring-2 ring-cyan-400/80' : ''
                  }`}
                  style={{
                    left: `${mark.x}%`,
                    top: `${mark.y}%`,
                    width: `${mark.w}%`,
                    height: `${mark.h}%`,
                  }}
                >
                  <span className={`rounded bg-black/35 px-1 py-0.5 uppercase tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] sm:inline ${mobileMapInteractive ? 'whitespace-nowrap text-[10px]' : 'text-[9px] sm:text-[10px]'}`}>
                    {mark.label}
                  </span>
                  {editable ? (
                    <div
                      role="presentation"
                      aria-hidden="true"
                      onPointerDown={(ev) => startLandmarkResize(ev, mark)}
                      className="absolute bottom-0.5 right-0.5 z-[3] h-3 w-3 cursor-se-resize rounded-sm border border-white/30 bg-slate-950/85 touch-none"
                    />
                  ) : null}
                </div>
              );
            })}

            {zoneTables.map((table) => {
              const selected = selectedCode === table.code;
              const inMulti = multiSelect.includes(table.code);
              let stateClass;
              let dotColor = '';
              let title = table.label;
              let canClick = false;

              if (adminVisual) {
                const v = visualStateByCode[table.code] || 'free';
                const posStyle = visualClass(v);
                // En operación/POS la selección no debe tapar rojo/ámbar — anillo cyan encima del color SR.
                const editStyle =
                  table.item_type === 'bar_chair'
                    ? 'border-sky-300/90 bg-slate-900/88 text-sky-100 shadow-[0_0_0_1px_rgba(125,211,252,0.45)]'
                    : 'border-cyan-200/90 bg-slate-900/88 text-cyan-50 shadow-[0_0_0_1px_rgba(34,211,238,0.45)]';
                if (layoutEditMode && inMulti) {
                  stateClass = `${editStyle} ring-2 ring-violet-400/85`;
                } else if (layoutEditMode && selected) {
                  stateClass = `${editStyle} ring-2 ring-cyan-300/90 ring-offset-2 ring-offset-slate-950 shadow-[0_0_18px_rgba(34,211,238,0.32)]`;
                } else if (layoutEditMode) {
                  stateClass = editStyle;
                } else if (selected && !layoutEditMode) {
                  stateClass = `${posStyle} ring-2 ring-cyan-400/85 ring-offset-2 ring-offset-slate-900 shadow-[0_0_22px_rgba(34,211,238,0.35)]`;
                } else {
                  stateClass = posStyle;
                }
                if (!reservationsOnly) {
                  if (v === 'open_ticket') dotColor = 'bg-rose-400';
                  else if (v === 'printed_unpaid') dotColor = 'bg-amber-300';
                  else if (v === 'reserved') dotColor = 'bg-indigo-300';
                  else if (v === 'unsuitable') dotColor = 'bg-slate-400';
                } else {
                  if (v === 'reserved') dotColor = 'bg-sky-300';
                  else if (v === 'unsuitable') dotColor = 'bg-amber-400';
                }
                title = titleByCode?.[table.code] || table.label;
                if (layoutEditMode) {
                  title = `${title} · Arrastra para mover${table.shape === 'round' ? '' : ''}`;
                }
                canClick = typeof onSelect === 'function' && !readonly && !layoutEditMode;
              } else {
                const occupied = occupiedCodes.includes(table.code);
                const fits = guests ? table.capacity >= Number(guests) : true;
                const perfectFit = guests ? table.capacity === Number(guests) : false;
                const blocked = occupied || !fits;
                canClick = typeof onSelect === 'function' && !readonly && !blocked;
                const customer = occupiedLookup[table.code]?.customer_name || '';
                stateClass = selected
                  ? 'ring-2 ring-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/25 text-white shadow-[0_0_25px_rgba(212,175,55,0.35)]'
                  : occupied
                    ? 'border-rose-400/45 bg-rose-500/18 text-rose-50'
                    : !fits
                      ? 'border-amber-400/35 bg-amber-500/10 text-amber-100/85'
                      : perfectFit
                        ? 'border-emerald-300/60 bg-emerald-500/18 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
                        : 'border-cyan-300/35 bg-cyan-500/10 text-slate-50 hover:bg-cyan-500/16';
                title = occupied ? `Ocupada por ${customer || 'reservación'}` : table.label;
                if (occupied) dotColor = 'bg-rose-300';
                if (selected) dotColor = 'bg-[#D4AF37]';
              }

              const shapeClass = table.shape === 'round' ? 'rounded-full' : 'rounded-xl';
              const sizeClass =
                table.shape === 'round'
                  ? mobileMapInteractive
                    ? compactZone
                      ? 'h-[52px] w-[52px]'
                      : 'h-[60px] w-[60px]'
                    : isMobile
                    ? 'h-[36px] w-[36px]'
                    : compactZone
                      ? 'h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]'
                      : 'h-[56px] w-[56px] sm:h-[64px] sm:w-[64px] lg:h-[72px] lg:w-[72px]'
                  : mobileMapInteractive
                    ? compactZone
                      ? 'h-[36px] w-[58px]'
                      : 'h-[42px] w-[70px]'
                    : isMobile
                    ? 'h-[28px] w-[40px]'
                    : compactZone
                      ? 'h-[32px] w-[48px] sm:h-[36px] sm:w-[52px] lg:h-[40px] lg:w-[56px]'
                      : 'h-[48px] w-[64px] sm:h-[56px] sm:w-[76px] lg:h-[64px] lg:w-[88px]';

              const cursorClass =
                layoutEditMode && adminVisual ? 'cursor-grab active:cursor-grabbing' : canClick ? 'cursor-pointer' : 'cursor-default opacity-90';

              const tableScalePx = clampScale(table.tableScale ?? 1);
              const selectedPop = selected && !(layoutEditMode && adminVisual) ? 1.03 : 1;

              return (
                <button
                  key={table.code}
                  type="button"
                  disabled={!layoutEditMode && !canClick}
                  onClick={(e) => handleTableClick(e, table.code)}
                  onPointerDown={(e) => handleTablePointerDown(e, table.code)}
                  title={title}
                  className={`absolute z-10 select-none border backdrop-blur-sm transition-[box-shadow,transform] duration-200 ${shapeClass} ${sizeClass} ${stateClass} ${cursorClass} ${
                    !layoutEditMode && !canClick ? 'opacity-90' : ''
                  }`}
                  style={{
                    left: `${Math.min(Math.max(table.px, 5), 95)}%`,
                    top: `${Math.min(Math.max(table.py, 5), 95)}%`,
                    transform: `translate(-50%, -50%) scale(${tableScalePx * selectedPop})`,
                  }}
                >
                  {dotColor && !selected && (
                    <span
                      className={`absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.35)] ${dotColor}`}
                    />
                  )}
                  {selected && (
                    <span
                      className={`absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full ${adminVisual ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.85)]' : 'bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.9)]'}`}
                    />
                  )}
                  <div className="flex h-full flex-col items-center justify-center gap-0.5 px-0.5 text-center">
                    <span
                      className={`line-clamp-2 font-semibold ${
                        layoutEditMode
                          ? 'text-[9px] sm:text-[10px] lg:text-[11px] leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]'
                          : mobileMapInteractive
                            ? 'text-[9px] leading-none'
                            : 'text-[7px] sm:text-[8px] lg:text-[9px] leading-none'
                      }`}
                    >
                      {layoutEditMode
                        ? table.label || table.code
                        : (table.label || table.code || '').replace('Mesa ', '').replace('Mesa', '')}
                    </span>
                    {layoutEditMode ? (
                      <span className="rounded bg-black/50 px-1 py-0.5 font-mono text-[7px] sm:text-[8px] text-cyan-100/95">
                        {table.code}
                      </span>
                    ) : null}
                    {adminVisual && indicatorByCode?.[table.code] && !layoutEditMode && (
                      <>
                        {isMobile ? (
                          <span className="flex max-w-[110%] flex-wrap items-center justify-center gap-0.5" aria-hidden="true">
                            {!reservationsOnly &&
                              (visualStateByCode[table.code] === 'open_ticket' ||
                                visualStateByCode[table.code] === 'printed_unpaid') && (
                                <span
                                  className={`rounded px-0.5 font-mono text-[6px] font-bold leading-none ${
                                    visualStateByCode[table.code] === 'open_ticket'
                                      ? 'bg-rose-600/50 text-rose-100'
                                      : 'bg-amber-500/45 text-amber-950'
                                  }`}
                                >
                                  SR
                                </span>
                              )}
                            {!reservationsOnly &&
                              (visualStateByCode[table.code] === 'reserved' ||
                                visualStateByCode[table.code] === 'unsuitable') && (
                                <span className="rounded bg-indigo-600/55 px-0.5 font-mono text-[6px] font-bold leading-none text-indigo-50">
                                  R
                                </span>
                              )}
                            {reservationsOnly && visualStateByCode[table.code] === 'reserved' && (
                              <span className="rounded bg-sky-600/60 px-0.5 font-mono text-[6px] font-bold leading-none text-white">
                                RES
                              </span>
                            )}
                            {reservationsOnly && visualStateByCode[table.code] === 'unsuitable' && (
                              <span className="rounded bg-amber-700/55 px-0.5 font-mono text-[6px] font-bold leading-none text-amber-50">
                                !
                              </span>
                            )}
                          </span>
                        ) : (
                          <span className="line-clamp-2 max-w-[110%] text-[5px] font-normal leading-tight text-slate-200/95 sm:text-[6px]">
                            {indicatorByCode[table.code]}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        </div>
      </div>

      {adminVisual ? (
        reservationsOnly ? (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-[11px] text-[#F4E4C1]/75">
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-1">Sin reserva (filtro actual)</span>
              <span className="rounded-full border border-sky-500/40 bg-sky-500/15 px-2 py-1 text-sky-100">Con reserva asignada a mesa</span>
              <span className="rounded-full border border-amber-500/40 bg-amber-900/25 px-2 py-1 text-amber-100">
                No es apto para reserva
              </span>
              <span className="rounded-full border border-cyan-400/45 bg-cyan-500/12 px-2 py-1 text-cyan-100/95">Selección (foco)</span>
              {showLayoutToolbar && (
                <span className="rounded-full border border-violet-500/35 bg-violet-500/12 px-2 py-1">Mayús+clic = multiselección mesas</span>
              )}
            </div>
            <p className="text-[10px] leading-snug text-slate-400">
              Colores sólo por reserva en el dashboard (fecha, categoría y franja si aplica). No reflejan cuenta POS. Reservas
              sin mesa asignada no aparecen aquí; búscalas en la lista del día.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2 text-[11px] text-[#F4E4C1]/75">
              <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-1">Libre (sin reserva en filtro / POS libre)</span>
              <span className="rounded-full border border-rose-500/35 bg-rose-500/12 px-2 py-1">SR · Cuenta abierta</span>
              <span className="rounded-full border border-amber-400/45 bg-amber-500/15 px-2 py-1">SR · Impreso, sin cobrar</span>
              <span className="rounded-full border border-indigo-500/35 bg-indigo-500/12 px-2 py-1">Reservada (dashboard / web)</span>
              <span className="rounded-full border border-slate-500/45 bg-slate-600/20 px-2 py-1 text-slate-200/90">
                No es apto para reserva
              </span>
              <span className="rounded-full border border-cyan-400/45 bg-cyan-500/12 px-2 py-1 text-cyan-100/95">Selección (foco)</span>
              {showLayoutToolbar && (
                <span className="rounded-full border border-violet-500/35 bg-violet-500/12 px-2 py-1">Mayús+clic = multiselección</span>
              )}
            </div>
            <p className="text-[10px] leading-snug text-slate-400">
              Colores alineados con POS / SR (rojo = cuenta abierta, ámbar = impreso sin cobrar). En el Comandero SR el azul
              “Reservada” es otro concepto: aquí el índigo es solo reserva registrada en este dashboard (filtro de fecha/categoría).
              Usa el interruptor «Solo reservas» para ver azul/verde sin mezclar con POS.
            </p>
          </div>
        )
      ) : (
        <div className="flex flex-wrap gap-2 text-[11px] text-[#F4E4C1]/75">
          <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-1">Disponible</span>
          <span className="rounded-full border border-rose-500/35 bg-rose-500/12 px-2 py-1">Ocupada</span>
          <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/15 px-2 py-1">Seleccionada</span>
          <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-1">No es apto para reserva</span>
          <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2 py-1">Ajuste ideal</span>
          <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-1">Zonas de referencia</span>
        </div>
      )}
    </div>
  );
}

export default ReservationFloorPlan;
