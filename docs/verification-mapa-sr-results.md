# Verificación objetiva — mapa SR + admin reservas

**Fecha de revisión (repo / build):** 2026-04-30  
**Alcance:** comprobar en código + build local lo que el plan de verificación exige; las pruebas contra MySQL/SR en producción quedan como **pendiente manual** con filas en la tabla inferior.

---

## 1. Preparación de entorno (manual en tu hosting)

| # | Acción | Estado | Evidencia |
|---|--------|--------|-----------|
| P1 | Usuario admin logueado; token en `localStorage` | Pendiente operador | Network: requests con `Authorization: Bearer …` |
| P2 | Fecha con reservas activas (`pending`/`confirmed`/`uploaded`) | Pendiente operador | Datos en `special_reservations` |
| P3 | Opcional: `sync-final` / POS reciente para `pos_table_live_state` | Pendiente operador | SQL + SR |

---

## 2. API `GET …/reservations/floor-state.php`

| Criterio | Resultado revisión estática | Evidencia |
|----------|----------------------------|-----------|
| `success === true` con cuerpo completo | OK | Respuesta armada en `api/reservations/floor-state.php` (json_encode con `success => true` tras lógica principal). |
| `reservation_by_code`, `pos_by_code`, `ticket_by_code` | OK | Mismas claves en el `json_encode` (~L254–L262). |
| `meta.generated_at` y contadores | OK | `meta` con `generated_at`, `reservation_codes_count`, `pos_venue_codes_count`, `pos_rows_read`, `ticket_codes_count`, `ticket_block_ok` (~L263–L270). |
| Fallo parcial del bloque ticket no tumba la respuesta | OK | Bloque `sr_sales` / ítems envuelto en `try/catch`; en catch: `ticketByCode = []`, `ticketBlockOk = false`; el `echo json_encode` con `success => true` sigue fuera de ese catch (~L191–L271). |

**Prueba manual sugerida:** repetir GET con token y comparar `meta.ticket_block_ok` con presencia de filas en `ticket_by_code`.

---

## 3. Claves canónicas POS y paridad CD / M

| Criterio | Resultado revisión estática | Evidencia |
|----------|----------------------------|-----------|
| Lectura POS normaliza con `bonifacios_table_canonical_venue_code` | OK | Bucle `pos_table_live_state` (~L175–L188). |
| Reservas indexadas por venue canónico | OK | Bucle `$byCode` con `bonifacios_table_canonical_venue_code` (~L154–L164 en el mismo archivo). |
| Front: mismo criterio de alias | OK | `canonicalVenueTableCode` + `normalizeFloorCodesMap` en `src/pages/admin/Reservations.jsx`. |

**SQL manual (operador):** `SELECT table_code, state FROM pos_table_live_state ORDER BY table_code;` — script de limpieza candidatos: `scripts/cleanup-non-canonical-pos-table-live-state.sql` (solo `SELECT` hasta sign-off).

---

## 4. UI: timestamp, busy, pestaña en background

| Criterio | Resultado | Evidencia |
|----------|------------|-----------|
| Texto “Mapa / POS actualizado” tras éxito | OK | `floorStateUpdatedAt` + `formatFloorStateUpdatedClock` en `Reservations.jsx` (~L1477–L1481). |
| `floorMapBusy` durante fetch de floor-state | OK | `setFloorMapBusy(true)` / `finally` false en `loadFloorState` (~L500–L532). |
| Botón actualizar deshabilitado mientras busy | OK | `disabled={floorMapBusy}` (~L1464). |
| Overlay mapa “Actualizando…” | OK | `mapRefreshing={floorMapBusy}` → `ReservationFloorPlan.jsx` `mapRefreshing`. |
| No sondear con pestaña oculta | OK | `if (document.hidden) return` en el tick del intervalo (~L562–L565). |
| Refresh al volver a la pestaña | OK | `visibilitychange` + `if (!document.hidden) { loadFloorState(); loadOccupiedTables(); }` (~L568–L572). |

---

## 5. Paridad lista “Mesas ocupadas por hora” vs mapa

| Criterio | Resultado | Evidencia |
|----------|------------|-----------|
| Misma función de query string | OK | `buildMapOccupiedQueryParams` documentada como compartida entre `occupied-tables.php` y `floor-state.php` (~L283–L319 `Reservations.jsx`). |
| Filtros evento / tipo / hora alineados en PHP | OK (patrón equivalente) | `occupied-tables.php` aplica los mismos criterios `event` / `event_type_id` / `time` (~L34–L76). `floor-state.php` usa `bonifacios_floor_event_sql` en cabecera del archivo (comentario plan: misma lógica que occupied-tables). |

**Prueba manual:** vista independiente ON, misma fecha y categoría; comparar códigos de mesa en lista vs `reservation_by_code` en Network para `floor-state`.

---

## 6. Panel mesa en foco, acordeón móvil, columna ticket

| Criterio | Resultado | Evidencia |
|----------|------------|-----------|
| Contenedor scroll foco | OK | `id="admin-map-focus-panel"` (~L1616). |
| Acordeón conceptos móvil; tabla desktop | OK | `<details className="… md:hidden">` + tabla `hidden md:block` (~L1683+). |
| Bloque “Ticket SR (misma mesa)” + scroll al foco | OK | Botón con `setMapFocusCode` + `scrollIntoView` hacia `#admin-map-focus-panel` (~L1948–L1956). |

---

## 7. Build front (regresión)

| Comando | Resultado | Notas |
|---------|-----------|--------|
| `npm run build` | **OK** (exit 0) | Vite 7.3.1; aviso de chunks >500 kB (preexistente). |

Salida relevante:

```
vite v7.3.1 building client environment for production...
✓ built in 1m 25s
```

---

## 8. Resumen OK / pendiente

| Bloque | Estático (código) | Manual (prod/staging) |
|--------|-------------------|------------------------|
| floor-state JSON + meta | OK | Confirmar con token real |
| Claves POS canónicas | OK lógica | Confirmar con SQL |
| Polling / visibility | OK | Confirmar en DevTools Network |
| Lista vs mapa | OK params compartidos | Confirmar conteos/códigos |
| Foco / ticket / móvil | OK | Probar viewport &lt; 640px |
| Build | OK | — |

**Pendiente explícito:** ejecutar filas P1–P3 y las pruebas manuales de las secciones 2–6 en entorno con datos reales; adjuntar capturas de Network o resultados SQL en este documento o en el ticket asociado.
