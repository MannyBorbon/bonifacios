export const RESERVATION_TABLES = [
  { code: 'M1', label: 'Mesa 1', area: 'Comedor', zone: 'comedor', capacity: 6, x: 1, y: 1, px: 11, py: 16, shape: 'square' },
  { code: 'M2', label: 'Mesa 2', area: 'Comedor', zone: 'comedor', capacity: 4, x: 2, y: 1, px: 28, py: 31, shape: 'square' },
  { code: 'M3', label: 'Mesa 3', area: 'Comedor', zone: 'comedor', capacity: 4, x: 3, y: 1, px: 44, py: 31, shape: 'square' },
  { code: 'M4', label: 'Mesa 4', area: 'Comedor', zone: 'comedor', capacity: 2, x: 4, y: 1, px: 54, py: 15, shape: 'square' },
  { code: 'M5', label: 'Mesa 5', area: 'Comedor', zone: 'comedor', capacity: 8, x: 3, y: 2, px: 42, py: 54, shape: 'square' },
  { code: 'M6', label: 'Mesa 6', area: 'Comedor', zone: 'comedor', capacity: 4, x: 5, y: 2, px: 64, py: 26, shape: 'square' },
  { code: 'M7', label: 'Mesa 7', area: 'Comedor', zone: 'comedor', capacity: 6, x: 5, y: 3, px: 64, py: 52, shape: 'square' },
  { code: 'M8', label: 'Mesa 8', area: 'Comedor', zone: 'comedor', capacity: 6, x: 6, y: 1, px: 82, py: 17, shape: 'square' },
  { code: 'M9', label: 'Mesa 9', area: 'Comedor', zone: 'comedor', capacity: 4, x: 1, y: 4, px: 12, py: 84, shape: 'square' },
  { code: 'M10', label: 'Mesa 10', area: 'Comedor', zone: 'comedor', capacity: 4, x: 2, y: 4, px: 28, py: 84, shape: 'square' },
  { code: 'M11', label: 'Mesa 11', area: 'Comedor', zone: 'comedor', capacity: 4, x: 3, y: 4, px: 44, py: 84, shape: 'square' },

  { code: 'T15', label: 'Mesa 15', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 5, px: 20, py: 84, shape: 'round' },
  { code: 'T16', label: 'Mesa 16', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 4, px: 20, py: 70, shape: 'round' },
  { code: 'T17', label: 'Mesa 17', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 3, px: 20, py: 56, shape: 'round' },
  { code: 'T18', label: 'Mesa 18', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 2, px: 20, py: 42, shape: 'round' },
  { code: 'T19', label: 'Mesa 19', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 1, px: 20, py: 28, shape: 'round' },
  { code: 'T20', label: 'Mesa 20', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: 0, px: 20, py: 14, shape: 'round' },
  { code: 'T21', label: 'Mesa 21', area: 'Terraza Alta', zone: 'terraza_alta', capacity: 4, x: 1, y: -1, px: 20, py: 4, shape: 'round' },

  { code: 'TB1', label: 'Mesa TB1', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 4, x: 1, y: 1, px: 68, py: 74, shape: 'round' },
  { code: 'TB2', label: 'Mesa TB2', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 4, x: 2, y: 1, px: 48, py: 74, shape: 'round' },
  { code: 'TB3', label: 'Mesa TB3', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 4, x: 3, y: 2, px: 68, py: 56, shape: 'round' },
  { code: 'TB4', label: 'Mesa TB4', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 4, x: 2, y: 2, px: 48, py: 56, shape: 'round' },
  { code: 'TB5', label: 'Mesa TB5', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 6, x: 3, y: 3, px: 68, py: 38, shape: 'round' },
  { code: 'TB6', label: 'Mesa TB6', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 6, x: 2, y: 3, px: 48, py: 38, shape: 'round' },
  { code: 'TB7', label: 'Mesa TB7', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 6, x: 3, y: 4, px: 68, py: 20, shape: 'round' },
  { code: 'TB8', label: 'Mesa TB8', area: 'Terraza Baja', zone: 'terraza_baja', capacity: 6, x: 2, y: 4, px: 48, py: 20, shape: 'round' },
];

export const getTableByCode = (code) =>
  RESERVATION_TABLES.find((t) => t.code === code) || null;
