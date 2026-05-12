/**
 * Catálogo de mesas / posiciones alineado con nombres Soft Restaurant (mapas).
 * Códigos en `special_reservations.table_code` deben coincidir (M1, T17, TB3, BARR-I1, BARR-E1…).
 *
 * Comedor: M1–M11 (etiquetas tipo M1 en SR; capacidades aprox. del plano).
 * Terraza alta: T16–T22 (columna vertical tipo SR).
 * Terraza baja: TB1–TB8.
 * Bar: 5 taburetes interior + 5 exterior (BARR-I1..5, BARR-E1..5) como “mesas” lógicas.
 */

const round = (code, zone, label, px, py, capacity) => ({
  code,
  zone,
  label,
  px,
  py,
  capacity,
  shape: 'round',
});

const rect = (code, zone, label, px, py, capacity) => ({
  code,
  zone,
  label,
  px,
  py,
  capacity,
  shape: 'rect',
});

/** Comedor — posiciones aproximadas (%) sobre el lienzo */
const COMEDOR_M = [
  round('M1', 'comedor', 'M1', 12, 16, 6),
  round('M2', 'comedor', 'M2', 22, 22, 4),
  round('M3', 'comedor', 'M3', 32, 22, 4),
  round('M4', 'comedor', 'M4', 42, 12, 2),
  round('M5', 'comedor', 'M5', 52, 28, 8),
  round('M6', 'comedor', 'M6', 68, 18, 4),
  round('M7', 'comedor', 'M7', 78, 28, 6),
  round('M8', 'comedor', 'M8', 88, 16, 6),
  round('M9', 'comedor', 'M9', 18, 42, 4),
  round('M10', 'comedor', 'M10', 28, 48, 4),
  round('M11', 'comedor', 'M11', 38, 48, 4),
];

const COMEDOR_BAR_IN = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  return rect(`BARR-I${n}`, 'comedor', `B-I${n}`, 62 + i * 5, 82, 1);
});

const TERRAZA_ALTA = Array.from({ length: 7 }, (_, i) => {
  const num = 16 + i;
  return round(`T${num}`, 'terraza_alta', `T${num}`, 52, 18 + i * 10, 4);
});

const TERRAZA_BAJA_TB = Array.from({ length: 8 }, (_, i) => {
  const n = i + 1;
  const col = i < 4 ? 0 : 1;
  const row = i < 4 ? i : i - 4;
  return round(`TB${n}`, 'terraza_baja', `TB${n}`, 44 + col * 14, 22 + row * 14, 4);
});

const TERRAZA_BAJA_BAR_EXT = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  return rect(`BARR-E${n}`, 'terraza_baja', `B-E${n}`, 78, 70 + i * 6, 1);
});

export const VENUE_TABLES = [...COMEDOR_M, ...COMEDOR_BAR_IN, ...TERRAZA_ALTA, ...TERRAZA_BAJA_TB, ...TERRAZA_BAJA_BAR_EXT];

export const VENUE_TABLE_CODES = new Set(VENUE_TABLES.map((t) => t.code));
