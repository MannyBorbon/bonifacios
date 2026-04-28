import { useEffect, useMemo, useState } from 'react';

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
}) {
  const selectedTable = useMemo(() => tables.find((t) => t.code === selectedCode) || null, [tables, selectedCode]);
  const [internalZone, setInternalZone] = useState(selectedTable?.zone || 'comedor');
  const activeZone = controlledZone || internalZone;
  const [isMobile, setIsMobile] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 640 : false));

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

  const zoneTables = useMemo(() => tables.filter((t) => t.zone === activeZone), [tables, activeZone]);
  const compactZone = activeZone === 'comedor';
  const activeLandmarks = LANDMARKS[activeZone] || [];

  const backgroundByZone =
    activeZone === 'comedor'
      ? 'bg-[linear-gradient(to_right,rgba(120,90,50,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(120,90,50,0.10)_1px,transparent_1px),radial-gradient(circle_at_20%_15%,rgba(245,222,179,0.12),transparent_38%),linear-gradient(160deg,#2a2520,#1b1a18)] bg-[size:38px_38px,38px_38px,auto,auto]'
      : activeZone === 'terraza_alta'
      ? 'bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(160deg,#3f7a31,#2f6b25)] bg-[size:40px_40px,40px_40px,auto]'
      : 'bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(160deg,#274428,#1f3322)] bg-[size:40px_40px,40px_40px,auto]';

  const landmarkToneClass = (tone) => {
    if (tone === 'amber') return 'border-amber-400/30 bg-amber-500/10 text-amber-100/80';
    if (tone === 'purple') return 'border-violet-400/30 bg-violet-500/10 text-violet-100/80';
    if (tone === 'emerald') return 'border-emerald-400/30 bg-emerald-500/10 text-emerald-100/80';
    return 'border-cyan-400/30 bg-cyan-500/10 text-cyan-100/80';
  };

  return (
    <div className="space-y-3">
      <div className="rounded-2xl border border-[#D4AF37]/25 bg-gradient-to-br from-[#101722] via-[#111827] to-[#0b1524] p-2 sm:p-3 lg:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.35)] overflow-hidden">
        <div className="mb-3 grid grid-cols-3 gap-2 text-[10px] uppercase tracking-[0.16em] text-[#F4E4C1]/55">
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

        <div className={`relative h-[300px] sm:h-[360px] lg:h-[420px] w-full overflow-hidden rounded-xl border border-white/15 shadow-inner shadow-black/40 ${backgroundByZone}`}>
          {activeLandmarks.map((mark) => (
            <div
              key={mark.id}
              className={`pointer-events-none absolute rounded-lg border border-dashed px-2 py-1 ${landmarkToneClass(mark.tone)}`}
              style={{ left: `${mark.x}%`, top: `${mark.y}%`, width: `${mark.w}%`, height: `${mark.h}%` }}
            >
              <span className="text-[8px] sm:text-[9px] uppercase tracking-wider hidden sm:inline">{mark.label}</span>
            </div>
          ))}

          {zoneTables.map((table) => {
            const occupied = occupiedCodes.includes(table.code);
            const selected = selectedCode === table.code;
            const fits = guests ? table.capacity >= Number(guests) : true;
            const perfectFit = guests ? table.capacity === Number(guests) : false;
            const blocked = occupied || !fits;
            const canClick = typeof onSelect === 'function' && !readonly && !blocked;
            const customer = occupiedLookup[table.code]?.customer_name || '';
            const shapeClass = table.shape === 'round' ? 'rounded-full' : 'rounded-xl';
            const sizeClass =
              table.shape === 'round'
                ? isMobile
                  ? 'h-[36px] w-[36px]'
                  : compactZone
                  ? 'h-[48px] w-[48px] sm:h-[52px] sm:w-[52px] lg:h-[56px] lg:w-[56px]'
                  : 'h-[56px] w-[56px] sm:h-[64px] sm:w-[64px] lg:h-[72px] lg:w-[72px]'
                : isMobile
                ? 'h-[28px] w-[40px]'
                : compactZone
                ? 'h-[32px] w-[48px] sm:h-[36px] sm:w-[52px] lg:h-[40px] lg:w-[56px]'
                : 'h-[48px] w-[64px] sm:h-[56px] sm:w-[76px] lg:h-[64px] lg:w-[88px]';

            const stateClass = selected
              ? 'ring-2 ring-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/25 text-white shadow-[0_0_25px_rgba(212,175,55,0.35)] scale-[1.03]'
              : occupied
              ? 'border-rose-400/45 bg-rose-500/18 text-rose-50'
              : !fits
              ? 'border-amber-400/35 bg-amber-500/10 text-amber-100/85'
              : perfectFit
              ? 'border-emerald-300/60 bg-emerald-500/18 text-emerald-50 shadow-[0_0_18px_rgba(16,185,129,0.25)]'
              : 'border-cyan-300/35 bg-cyan-500/10 text-slate-50 hover:bg-cyan-500/16';

            return (
              <button
                key={table.code}
                type="button"
                disabled={!canClick}
                onClick={() => canClick && onSelect(table.code)}
                title={occupied ? `Ocupada por ${customer || 'reservacion activa'}` : table.label}
                className={`absolute -translate-x-1/2 -translate-y-1/2 border backdrop-blur-sm transition-all duration-300 ${shapeClass} ${sizeClass} ${stateClass} ${
                  canClick ? 'cursor-pointer' : 'cursor-default'
                }`}
                style={{
                  left: `${Math.min(Math.max(table.px, 5), 95)}%`,
                  top: `${Math.min(Math.max(table.py, 5), 95)}%`,
                }}
              >
                {occupied && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-rose-300 shadow-[0_0_10px_rgba(251,113,133,0.9)]" />}
                {selected && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-[#D4AF37] shadow-[0_0_10px_rgba(212,175,55,0.9)]" />}
                <div className="flex h-full items-center justify-center px-0.5 text-center">
                  <span className="line-clamp-1 text-[7px] sm:text-[8px] lg:text-[9px] font-semibold leading-none">{table.label.replace('Mesa ', '').replace('Mesa', '')}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px] text-[#F4E4C1]/75">
        <span className="rounded-full border border-emerald-500/35 bg-emerald-500/12 px-2 py-1">Disponible</span>
        <span className="rounded-full border border-rose-500/35 bg-rose-500/12 px-2 py-1">Ocupada</span>
        <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/15 px-2 py-1">Seleccionada</span>
        <span className="rounded-full border border-amber-500/35 bg-amber-500/12 px-2 py-1">No apta por capacidad</span>
        <span className="rounded-full border border-emerald-300/35 bg-emerald-300/10 px-2 py-1">Ajuste ideal</span>
        <span className="rounded-full border border-cyan-300/30 bg-cyan-500/10 px-2 py-1">Zonas de referencia</span>
      </div>
    </div>
  );
}

export default ReservationFloorPlan;
