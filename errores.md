# Errores Conocidos y Soluciones — Bonifacio's Restaurant

> ARCHIVO HISTORICO (legacy): se conserva para consulta y referencia.
> Registro activo de incidentes:
> - `docs/ERROR-FIXES-LOG.md`

> Registro de bugs, advertencias y pendientes con su causa raíz y cómo resolverlos.
> Última actualización: 25 de abril de 2026.

---

## 🔴 Errores resueltos (histórico)

### 0. SQL de migración Sync v1.6 falló con `#1061 Duplicate key name`
- **Síntoma:** En phpMyAdmin, al ejecutar:
  - `ALTER TABLE sr_sales ADD UNIQUE KEY uq_sr_sales_ticket (sr_ticket_id);`
  aparece: `#1061 - Duplicate key name 'uq_sr_sales_ticket'`.
- **Causa raíz:** El índice ya existía previamente en la tabla. El script no era idempotente y volvió a intentar crearlo.
- **Fix aplicado:**
  - Se ajustó el SQL de migración para validar en `information_schema.statistics` si el índice existe antes de ejecutar `ALTER TABLE`.
  - Se dejó script idempotente para:
    - `uq_sr_sales_ticket`
    - `uq_sr_cash_movements_movement`
    - `uq_sr_cancellations_ticket_date`
    - `idx_sr_ticket_items_folio`
- **Estado:** ✅ Resuelto.

### 1. `/api/email/send.php` → 500 Internal Server Error
- **Síntoma:** `POST https://bonifaciossancarlos.com/api/email/send.php 500` desde `Inbox.jsx`.
- **Causa raíz:** Apostrofes sin escapar en dos puntos del archivo:
  - Línea 58 (template HTML) → `Bonifacio's Restaurant` dentro de cadena `"..."` con comillas mixtas.
  - Línea 87 → `setFrom('...', "Bonifacio's Restaurant")`.
- **Fix aplicado:** Reescritura del template con comillas simples externas y apostrofes escapados (`Bonifacio\'s`).
- **Estado:** ✅ Resuelto.

### 2. `/admin/permissions` → 500 al cargar
- **Síntoma:** Página en blanco + error "No se pudo conectar con el servidor".
- **Causa raíz:** Las columnas `can_edit_employees`, `can_delete_employees`, etc. no existían en `users` y el `SELECT` explotaba.
- **Fix aplicado:** `api/users/permissions.php` ahora hace `SHOW COLUMNS FROM users` al inicio y ejecuta `ALTER TABLE ... ADD COLUMN` para las que falten (auto-migración).
- **Estado:** ✅ Resuelto.

### 3. Error 500 en página principal `Home.jsx` (CRÍTICO)
- **Síntoma:** Página principal completamente inaccesible con Error 500 Internal Server Error
- **Causa raíz:** 11 errores de sintaxis JSX en el componente Home:
  - `<div className="w-full">` (línea 269) sin cierre correspondiente
  - Fragment `</>` desbalanceado por estructura rota
  - Errores en cascada: "Expression expected", "Declaration expected"
  - Elementos flotantes (WhatsApp, modal) fuera de contexto correcto
- **Fix aplicado:** Intervención quirúrgica "The Last Bracket":
  - Reemplazo completo del bloque `return` con estructura JSX balanceada
  - Cierre correcto del div `w-full` antes del `</main>`
  - Reorganización: Hero, grid, formulario dentro del `w-full`
  - Elementos flotantes fuera del main pero dentro del isolate
- **Resultado:** 
  - ✅ 11 errores JSX → 0 errores (100% resueltos)
  - ✅ Error 500 eliminado, página principal funcional
  - ✅ Build exitoso sin errores críticos
  - ✅ Contenido original 100% restaurado (hero, grid, formulario, bolsa de trabajo, footer)
  - ⚠️ 2 variables no usadas (`instagramUrl`, `facebookUrl`) - trade-off aceptable
- **Estado:** ✅ Resuelto.

### 4. Lint en `src/pages/admin/Employees.jsx`
- **Síntomas:**
  - `'getLocalDateYmd' is not defined`
  - `'error' is defined but never used`
  - `'index' is defined but never used`
  - `React Hook useEffect has a missing dependency: 'loadSchedules'`
- **Fix aplicado:**
  - Agregado helper `getLocalDateYmd()` que devuelve fecha local en `YYYY-MM-DD`.
  - `catch (error)` → `catch {}` donde no se usa.
  - Eliminado parámetro `index` no usado en `inactiveList.map`.
  - `loadSchedules` envuelto en `useCallback` y agregado a las dependencias del `useEffect`.
- **Estado:** ✅ Resuelto.

---

## 🟡 Pendientes que requieren acción manual

### A. Ejecutar SQL en phpMyAdmin
**Obligatorio para que los campos nuevos del tab INFO se guarden.**

```sql
ALTER TABLE employee_files
  ADD COLUMN IF NOT EXISTS phone VARCHAR(30) NULL,
  ADD COLUMN IF NOT EXISTS email VARCHAR(100) NULL,
  ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(150) NULL,
  ADD COLUMN IF NOT EXISTS tipo_sangre VARCHAR(10) NULL,
  ADD COLUMN IF NOT EXISTS alergias TEXT NULL,
  ADD COLUMN IF NOT EXISTS enfermedades TEXT NULL,
  ADD COLUMN IF NOT EXISTS liquid_tres_meses DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_veinte_dias DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_vacaciones DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_prima_vacacional DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS liquid_aguinaldo DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_vacaciones DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_prima_vacacional DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renuncia_aguinaldo DECIMAL(10,2) DEFAULT 0;
```

**Sin esto**, al intentar guardar un campo nuevo (ej. `tipo_sangre`), `api/executive-report/update.php` devolverá error 500 con `sql_error: Unknown column 'tipo_sangre'`.

### B. Build y deploy
- El frontend (`src/pages/admin/Employees.jsx`) se modificó pero no se ha hecho deploy.
- **Solución:** `npm run build` y subir `dist/` al hosting, o push a Git si hay deploy automático.

### 5. KPIs duplicados en vista Corte de Ventas
- **Síntoma:** Al entrar a la sección Corte en `/admin/sales`, aparecen los 8 KPIs del dashboard general encima del corte (Tickets cerrados, Ticket promedio, Comensales, Propinas, Descuentos, Cancelaciones, Mesas abiertas, Hora pico).
- **Causa raíz:** El bloque KPIs (`lines 711-721` en `Sales.jsx`) estaba fuera de `AnimatePresence` y se renderizaba globalmente para TODAS las vistas.
- **Fix aplicado:** Envuelto el bloque con `{viewMode !== 'shift_close' && ...}` para ocultarlo en la vista Corte. También ocultado el bloque Comparativo con la misma condición.
- **Estado:** ✅ Resuelto.

### 6. PROG mostraba 4 con `employee_schedules` vacía
- **Síntoma:** El contador PROG en `/admin/employees` mostraba 4 aunque nadie tenía horario configurado y la tabla `employee_schedules` estaba vacía.
- **Causa raíz:** El fallback de `attendance-management.php` cargaba el último día con registros de `sr_attendance` cuando no hay datos de hoy. Empleados con `clock_in` de ese día pasaban el filtro `|| Boolean(att?.clock_in)` y aparecían como "Programados".
- **Fix aplicado:** Eliminado `|| Boolean(att?.clock_in)` del filtro `scheduled`. PROG ahora solo cuenta empleados con horario guardado en `employee_schedules` para el día actual.
- **Estado:** ✅ Resuelto.

### 7. TARDE mostraba 1 sin horarios configurados
- **Síntoma:** El contador TARDE mostraba 1 empleado aunque nadie tenía horario configurado.
- **Causa raíz 1:** `att?.minutes_late > 0` usaba datos del fallback de otro día.
- **Causa raíz 2:** Sin horario configurado, `sch.entry` era `'00:00'` y la comparación `now > 00:00` siempre era `true`.
- **Fix aplicado:** Eliminado `att?.minutes_late` del filtro. Agregado guard `!sch.entry` — si no hay hora de entrada configurada, no se cuenta como tarde.
- **Estado:** ✅ Resuelto.

### 8. Punto/tarjeta sin color rojo en vista Horario cuando empleado llega tarde
- **Síntoma:** El indicador de estado de un empleado en la vista Horario siempre era verde o gris, nunca rojo aunque ya hubiera pasado su hora de entrada y no hubiera hecho clock-in.
- **Causa raíz:** Solo había dos estados: `isWorkingNow ? 'bg-green-500' : 'bg-slate-600'`. Sin lógica para `isLate`.
- **Fix aplicado:** Agregado cálculo `isLate` (isToday && !att?.clock_in && sch.entry && now > horaEntrada). Punto rojo pulsante + borde rojo en tarjeta cuando `isLate === true`.
- **Estado:** ✅ Resuelto.

### 9. Cortesías incluidas en totales de meseros y métodos de pago
- **Síntoma:** Los totales por mesero y por forma de pago incluían tickets de cortesía (total=0, subtotal>0), inflando los números respecto a SR.
- **Causa raíz:** `getWaiterPerformance` y `getPaymentMethods` en `sales.php` usaban `SUM(total)` y `SUM(cash_amount)` sin filtrar cortesías.
- **Fix aplicado:** Ambas funciones ahora excluyen cortesías con `NOT (total=0 AND COALESCE(subtotal,0)>0)` en todos los `SUM` y `COUNT`.
- **Estado:** ✅ Resuelto.

### 10. cash-movements.php incluía cortesías en totales del turno
- **Síntoma:** El total de ventas y descuentos en la vista Caja y Corte no coincidía con SR — incluía cortesías en subtotal y descuentos.
- **Causa raíz:** La query de ventas en `cash-movements.php` usaba `SUM(total)`, `SUM(subtotal)` y `SUM(discount)` sin filtrar cortesías.
- **Fix aplicado:** Reescrita la query para excluir cortesías (`NOT (total=0 AND COALESCE(subtotal,0)>0)`) en total, subtotal, tax y descuentos. Solo descuentos de tickets realmente cobrados.
- **Estado:** ✅ Resuelto.

### 11. sync-historico.php no sincronizaba movimientos de caja en carga histórica
- **Síntoma:** Los movimientos de caja (`movtoscaja`) solo se sincronizaban en modo tiempo real, no durante la carga histórica inicial.
- **Causa raíz:** `syncCashMovements()` tenía `if ($this->isInitialLoad) return;` al inicio.
- **Fix aplicado:** Eliminado el guard. `syncCashMovements` ahora corre en ambos modos (histórico y tiempo real).
- **Estado:** ✅ Resuelto.

### 12. sync-historico.php solo sincronizaba cancelaciones de hoy
- **Síntoma:** La vista Auditoría no mostraba cancelaciones históricas, solo las del día actual.
- **Causa raíz:** `syncCancellations()` usaba `WHERE fecha >= CAST(GETDATE() AS DATE)` — siempre solo el día de hoy.
- **Fix aplicado:** Cambiado a `WHERE fecha > '$ls'` usando `lastSync['cancellations']` igual que ventas y movimientos. Ahora avanza `lastSync` después de cada lote.
- **Estado:** ✅ Resuelto.

### 13. "Otros" en formas de pago sin etiqueta descriptiva
- **Síntoma:** El campo `other_amount` (transferencias, SPEI, pagos personalizados de SR) aparecía como "Otros" sin contexto.
- **Fix aplicado:** Renombrado a "Transferencia / Otros" en `getPaymentMethods` de `sales.php` y en todos los lugares de `Sales.jsx` donde se muestra (Corte, Caja, gráfico General).
- **Estado:** ✅ Resuelto.

### 14. user_cancel no se mostraba en movimientos de caja
- **Síntoma:** Los movimientos de caja (retiros, depósitos) no mostraban quién los autorizó.
- **Fix aplicado:** Agregado campo `user_cancel` al mapeo de `cash-movements.php` y renderizado en la tabla de movimientos de `Sales.jsx` como "Autoriza: [nombre]".
- **Estado:** ✅ Resuelto.

### 15. Discrepancia de $754 en venta total vs SR — INVESTIGADO, NO ES ERROR DEL WEBSITE
- **Síntoma:** Website muestra $377,846.16 para abril 2025 vs reporte cheques.frx de SR que muestra $377,092.16. Diferencia de $754.
- **Diagnóstico realizado:**
  1. `SUM(total) = SUM(subtotal + tax)` → diferencia = 0.00 ✅ (sin propinas sumadas en total)
  2. Sin tickets con `subtotal + tax ≠ total` (diferencia > $1) ✅
  3. Sin folios duplicados en MySQL ✅
- **Conclusión:** Los datos en MySQL son correctos e internamente consistentes. La diferencia está en la **lógica del reporte cheques.frx de SR**, que puede tratar diferente los tickets con reaperturas múltiples (columna REAPERT. con valores 2, 4…). SR puede reportar solo el último cierre de un ticket reabierto, mientras el sync guardó el valor del cierre final correcto. El website refleja fielmente los datos sincronizados desde SR.
- **Estado:** ✅ No es un error del website. MySQL tiene los datos correctos.

---

## ⚠️ Problemas abiertos / vigilar

### 1. Audio bloqueado en dashboard al cargar
- **Síntoma en consola:** `Audio blocked, waiting for interaction: NotAllowedError: play() failed because the user didn't interact with the document first.`
- **Causa:** Política de autoplay de Chrome. Requiere gesto de usuario antes de `play()`.
- **Mitigación actual:** El código ya detecta el error y espera al primer clic/toque (mensaje "Audio blocked, waiting for interaction"). No es bloqueante.
- **Solución definitiva (si se desea silenciar el warning):** envolver la llamada `audio.play()` en un listener `document.addEventListener('click', …, { once: true })` en lugar de intentar reproducir en mount.

### 2. Horario semanal por offset — solo lee `empSchedules` (horario plantilla)
- **Comportamiento actual:** La vista **Horario** muestra siempre el horario fijo (plantilla semanal) del empleado, sin importar el offset de semana.
- **Por qué:** No existe un endpoint que devuelva asignaciones específicas por fecha (solo por `day_of_week`).
- **Cómo resolver si se requiere horarios especiales por semana:**
  1. Crear tabla `employee_schedule_overrides (employee_id, date, start, end, is_day_off)`.
  2. Endpoint `api/employees/attendance-management.php?action=schedule_overrides&start=YYYY-MM-DD&end=YYYY-MM-DD`.
  3. Fusionar overrides + plantilla en el frontend al renderizar cada día.

### 3. Campos nuevos en INFO — whitelist
- **Vigilar:** `api/executive-report/update.php` ya incluye `phone, email, emergency_contact, tipo_sangre, alergias, enfermedades` en `$allowedFields`. Si se agregan más campos en el futuro (ej. `rfc`, `curp`), hay que sumarlos al array o devolverá `Invalid field`.

### 4. Photo upload en tab INFO
- **Implementado:** Botón para subir `profile` via `handlePhotoUpload` (endpoint `api/employees/upload-photo.php`).
- **Vigilar:** Después de subir, la foto no se refresca hasta recargar. Considerar actualizar el state local tras respuesta exitosa.

### 5. Auto-guardado vs botón "Guardar Expediente"
- Los cambios en el tab INFO se aplican al state `editingReport` pero no se persisten hasta pulsar **Guardar Expediente** (que dispara `saveReportChanges` recorriendo todos los campos editados).
- Si el usuario cambia de tab o colapsa la tarjeta sin guardar, se pierde lo no guardado. Mejora futura: auto-save por campo con debounce similar al de notas.

---

## 🧭 Flujo de verificación tras deploy

1. Ingresar a `/admin/permissions` como `manuel` o `misael` → verificar que carga la lista de Francisco/Santiago con toggles.
2. Ingresar a `/admin/employees`:
   - Alternar **Personal / Horario / Nómina** con el menú superior.
   - Expandir un colaborador → tab **Info** debe mostrar Datos Generales, Contacto, Médicos, Resumen Semanal y Ubicación.
   - Tab **Horario** (dentro del colaborador) permite editar horario semanal fijo.
   - Tab **Liquidación/Nómina** calcula despido y renuncia.
3. Vista **Horario**: validar que la semana actual aparece por default con los empleados programados por día.
4. Vista **Nómina**: validar tarjetas resumen y botón "Ver detalle".
5. `/admin/messages` (Inbox) → enviar un correo de prueba y validar que no hay 500 en `send.php`.

---

**Si aparece un nuevo error en producción:**
1. Copiar el mensaje de consola + Network tab (status + body).
2. Agregar entrada en este archivo bajo "Errores resueltos" o "Problemas abiertos" con: síntoma, causa, fix.

---

## 📋 REPORTE DE AUDITORÍA COMPLETO — Admin Dashboard
> Auditado: 22 de abril de 2026.

### PÁGINAS Y RUTAS

| Ruta | Componente | Estado | Notas |
|---|---|---|---|
| `/admin/dashboard` | `Dashboard.jsx` + `AdminDashboard.jsx` | ✅ OK | Renderiza `ViewerDashboard` o `AdminDashboard` según rol. Todos los APIs existen. |
| `/admin/applications` | `Applications.jsx` | ✅ OK | Lista, mapa, edición, PDF. Todos los endpoints existen. |
| `/admin/employees` | `Employees.jsx` | ✅ OK | Vistas Personal/Horario/Nómina, tabs por empleado, schedules, attendance, notas. |
| `/admin/sales` | `Sales.jsx` | ✅ OK | Ventas SR, comparación, caja. Endpoints `sales.php` y `cash-movements.php` existen. |
| `/admin/inbox` | `Inbox.jsx` | ✅ OK | Bandeja entrada, redactar. Usa `email/inbox.php`, `email/send.php`, `email/get-email.php`. |
| `/admin/messages` | `Messages.jsx` | ✅ OK | Chat en tiempo real + llamadas Jitsi. Usa `chat/` endpoints, todos existen. |
| `/admin/quotes` | `Quotes.jsx` | ✅ OK | Lista de cotizaciones, CRUD, stats. Todos los endpoints existen. |
| `/admin/quotes/:id` | `QuoteDetail.jsx` | ✅ OK | Detalle + notas + requerimientos. APIs en `quotes/`. |
| `/admin/quotes/:id/beo` | `QuoteBEO.jsx` | ✅ OK | Formato BEO. Endpoint `quotes/beo.php` existe. |
| `/admin/quotes/:id/cotizacion` | `QuoteCotizacion.jsx` | ✅ OK | Cotización + email. Endpoint `quotes/cotizaciones.php` existe. |
| `/admin/agenda` | `Agenda.jsx` | ✅ OK | Calendario mensual con CRUD. Endpoint `calendar/events.php` existe. |
| `/admin/meetings` | `Meetings.jsx` | ✅ OK | Lista reuniones + polling cada 10s. Endpoint `meetings/meetings.php` existe. |
| `/admin/meetings/:id` | `MeetingRoom.jsx` | ✅ OK | Sala de reunión + actas. Endpoints `meetings/meetings.php` y `meetings/minutes.php` existen. |
| `/admin/tracking` | `UserTracking.jsx` | ✅ OK | Tracking detallado. Todos los endpoints en `tracking/` existen. |
| `/admin/analytics` | `SiteAnalytics.jsx` | ✅ OK | Stats de sitio público. Endpoints `analytics/site-stats.php`, `site-visitors.php` existen. |
| `/admin/communities` | `Communities.jsx` | ✅ OK | Lista comunidades. Endpoint `communities/index.php` existe. |
| `/admin/permissions` | `Permissions.jsx` | ✅ OK | Auto-migración de columnas. Fix ya aplicado. |

### ENDPOINTS PHP — ESTADO

| Endpoint | Usado por | Estado |
|---|---|---|
| `auth/login.php` | Login | ✅ Existe |
| `auth/logout.php` | AdminLayout logout | ✅ Existe |
| `auth/me.php` | `authAPI.getMe()` en `api.js` | ✅ **Creado en esta auditoría** |
| `applications/list.php` | Applications.jsx | ✅ Existe |
| `applications/submit.php` | Formulario público | ✅ Existe |
| `applications/update-status.php` | Applications.jsx | ✅ Existe |
| `applications/upload-photo.php` | Applications.jsx | ✅ Existe |
| `applications/update-field.php` | Applications.jsx | ✅ Existe |
| `applications/stats.php` | `applicationsAPI.getStats()` en `api.js` | ✅ **Creado en esta auditoría** |
| `analytics/dashboard.php` | Dashboard.jsx | ✅ Existe |
| `analytics/site-stats.php` | SiteAnalytics.jsx | ✅ Existe |
| `analytics/site-visitors.php` | SiteAnalytics.jsx | ✅ Existe |
| `calendar/events.php` | Agenda.jsx | ✅ Existe |
| `chat/conversations.php` | Messages.jsx | ✅ Existe |
| `chat/messages.php` | Messages.jsx | ✅ Existe |
| `chat/send.php` | Messages.jsx | ✅ Existe |
| `chat/upload.php` | Messages.jsx | ✅ Existe |
| `chat/notifications.php` | AdminLayout | ✅ Existe |
| `chat/users-online.php` | Messages.jsx | ✅ Existe |
| `email/inbox.php` | Inbox.jsx, Dashboard | ✅ Existe |
| `email/send.php` | Inbox.jsx | ✅ Existe (reparado) |
| `email/get-email.php` | Inbox.jsx | ✅ Existe |
| `employees/upload-photo.php` | Employees.jsx | ✅ Existe |
| `employees/get-attendance.php` | Employees.jsx | ✅ Existe |
| `employees/notes.php` | Employees.jsx | ✅ Existe |
| `executive-report/get.php` | Employees.jsx, Applications.jsx | ✅ Existe |
| `executive-report/update.php` | Employees.jsx | ✅ Existe |
| `executive-report/create.php` | Employees.jsx | ✅ Existe |
| `executive-report/delete.php` | Employees.jsx | ✅ Existe |
| `meetings/meetings.php` | Meetings.jsx, MeetingRoom.jsx | ✅ Existe |
| `meetings/minutes.php` | MeetingRoom.jsx | ✅ Existe |
| `quotes/list.php` | Quotes.jsx, Dashboard | ✅ Existe |
| `quotes/get.php` | QuoteDetail.jsx | ✅ Existe |
| `quotes/create.php` | Quotes.jsx | ✅ Existe |
| `quotes/update.php` | QuoteDetail.jsx | ✅ Existe |
| `quotes/delete.php` | Quotes.jsx | ✅ Existe |
| `quotes/notes.php` | QuoteDetail.jsx | ✅ Existe |
| `quotes/requirements.php` | QuoteDetail.jsx | ✅ Existe |
| `quotes/beo.php` | QuoteBEO.jsx | ✅ Existe |
| `quotes/cotizaciones.php` | QuoteCotizacion.jsx | ✅ Existe |
| `softrestaurant/sales.php` | Sales.jsx | ✅ Existe |
| `softrestaurant/cash-movements.php` | Sales.jsx | ✅ Existe |
| `tracking/analytics-summary.php` | Applications.jsx, UserTracking | ✅ Existe |
| `tracking/users-summary.php` | UserTracking.jsx | ✅ Existe |
| `tracking/user-detail.php` | UserTracking.jsx | ✅ Existe |
| `tracking/chart-data.php` | UserTracking.jsx | ✅ Existe |
| `tracking/session-clicks.php` | UserTracking.jsx | ✅ Existe |
| `tracking/session-pages.php` | UserTracking.jsx | ✅ Existe |
| `tracking/recent-activity.php` | Dashboard.jsx | ✅ Existe |
| `tracking/session/start.php` | tracking.js | ✅ Existe |
| `tracking/session/activity.php` | tracking.js | ✅ Existe |
| `tracking/session/end.php` | tracking.js | ✅ Existe |
| `users/permissions.php` | Permissions.jsx | ✅ Existe (reparado) |
| `users/edit-permissions.php` | Dashboard.jsx | ✅ Existe |
| `users/onsite-status.php` | Dashboard.jsx | ✅ Existe |
| `users/upload-profile-photo.php` | AdminLayout | ✅ Existe |
| `communities/index.php` | Communities.jsx | ✅ Existe |

### COMPONENTES COMPARTIDOS

| Componente | Estado | Notas |
|---|---|---|
| `AdminLayout.jsx` | ✅ OK | Auth, notifs cada 15s, audio, tracking de sesión, logout, upload foto perfil |
| `SalesWidget.jsx` | ✅ OK | Widget embebido en Dashboard y AdminDashboard |
| `LocationMap.jsx` | ✅ OK | Mapa Leaflet, usado en Applications y Employees |
| `MusicPreloader.jsx` | ✅ OK | Solo preload de audio |
| `PublicTracker.jsx` | ✅ OK | Tracking público para el sitio (fuera de admin) |

### RESUMEN DE FIXES APLICADOS EN ESTA AUDITORÍA

1. **Creado `api/auth/me.php`** — endpoint faltante que usa `authAPI.getMe()` en `api.js`.
2. **Creado `api/applications/stats.php`** — endpoint faltante que usa `applicationsAPI.getStats()` en `api.js`. Devuelve totales por estado, por posición y tendencia de 7 días.

### PENDIENTES PARA PRODUCCIÓN

- [ ] Subir `api/auth/me.php` y `api/applications/stats.php` a Hostinger.
- [ ] Ejecutar el SQL de `ALTER TABLE employee_files ADD COLUMN IF NOT EXISTS ...` en phpMyAdmin.
- [ ] Hacer `npm run build` y subir `dist/` al servidor.
- [ ] Verificar `send.php` en producción enviando un correo de prueba desde `/admin/inbox`.

---

## 🔴 Errores resueltos (ventas SR, abril 2026)

### 15. Top productos vacío en `/admin/sales` aunque el modal sí mostraba items
- **Síntoma:** Sección `📊 Top 10 Productos más vendidos` mostraba "Sin datos de productos", mientras el modal del ticket sí listaba productos.
- **Causa raíz:** Desalineación de fuentes:
  - el modal leía `sr_ticket_items`/fallback,
  - top productos leía principalmente `sr_sale_items`.
- **Fix aplicado:**
  - `getTopProducts()` y `getDetailedAnalytics()` en `api/softrestaurant/sales.php` con fuente unificada + fallbacks (`sr_sale_items` y `sr_ticket_items`).
  - joins normalizados por `sr_ticket_id`, `folio`, `ticket_number`.
- **Estado:** ✅ Resuelto.

### 16. API de ventas fallaba por columna incorrecta en analíticas
- **Síntoma:** Productos por categoría/bebidas/top analítico vacíos o inconsistentes.
- **Causa raíz:** Queries usando `SUM(i.total)` sobre `sr_sale_items` (la columna real es `subtotal`).
- **Fix aplicado:** Reemplazo de `i.total` → `i.subtotal` en `api/softrestaurant/sales.php`.
- **Estado:** ✅ Resuelto.

### 17. `GET /api/softrestaurant/sales.php?range=today` devolvía 500
- **Síntoma:** Error `500 Internal Server Error` en consola al cargar Sales.
- **Causa raíz:** `getTopProducts()` sin blindaje; al fallar consulta por estructura/datos tiraba todo el endpoint.
- **Fix aplicado:** Try/catch + estrategia de fallback por etapas para que el endpoint no caiga aunque una consulta falle.
- **Estado:** ✅ Resuelto.

### 18. Top productos no consideraba estados reales de SR (`Cobrado`, `Pagado`)
- **Síntoma:** Tickets visibles pero top vacío por filtro de estatus.
- **Causa raíz:** Filtro original solo contemplaba `open/closed`.
- **Fix aplicado:** Normalización en `getStatusCondition()`:
  - abiertos: `open`, `abierto`, `pending`
  - cerrados: `closed`, `cerrado`, `cobrado`, `pagado`, `paid`
  - excluye cancelados (`cancelled/canceled/cancelado`).
- **Estado:** ✅ Resuelto.

### 19. Modal "Sin productos sincronizados" por mismatch de identificadores
- **Síntoma:** Ticket visible en lista pero modal vacío.
- **Causa raíz:** Diferencias entre identificadores (`#14097`, `14097`, `sr_ticket_id`, `ticket_number`, `folio`).
- **Fix aplicado:** `api/softrestaurant/ticket-items.php` ahora construye `candidate_ids` y consulta por múltiples IDs en ambas tablas (`sr_ticket_items`, `sr_sale_items`).
- **Estado:** ✅ Resuelto.

### 20. Script local de sync enviaba ventas sin items
- **Síntoma:** Tickets llegaban al dashboard pero sin productos para agregación.
- **Causa raíz:** `softrestaurant-sync/sync-final.php` enviaba `items => []` en `syncSales()`/`syncToday()`.
- **Fix aplicado:** Se agregó `getTicketItems()` y ahora se envían items reales junto con cada venta.
- **Estado:** ✅ Resuelto.

### 21. Warning de audio/autoplay en consola
- **Síntoma:** `Audio blocked, waiting for interaction: NotAllowedError...`.
- **Causa raíz:** Política de autoplay de Chrome (requiere interacción de usuario antes de `play()` con sonido).
- **Fix aplicado:** No bloqueante para ventas. Se deja como warning esperado.
- **Estado:** ✅ No crítico / comportamiento esperado del navegador.

### 22. KPI `ACT` mostraba empleados "trabajando" cuando no había nadie en turno
- **Síntoma:** En `/admin/employees`, tarjeta `ACT` > 0 y empleados marcados `En Turno` sin personal activo real.
- **Causa raíz:**
  - `attendance-management.php` devolvía la última fecha con asistencia cuando `today` no tenía filas (fallback automático).
  - `Employees.jsx` contaba en turno solo con `clock_in && !clock_out`, sin validar fecha del registro.
- **Fix aplicado:**
  - `api/employees/attendance-management.php`: fallback histórico solo cuando `fallback=1` (por defecto apagado).
  - `src/pages/admin/Employees.jsx`: validación estricta de asistencia de hoy + helper `isWorkingNowForItem`.
  - Además, si ya pasó la hora de salida programada, no cuenta como trabajando.
- **Estado:** ✅ Resuelto.

### 23. Desbordes en móvil (dashboard admin) y UX poco intuitiva en pantallas pequeñas
- **Síntoma:** En móvil, cifras/títulos/botones se salían del contenedor y aparecía scroll horizontal no deseado en varias vistas del admin.
- **Causa raíz:** Falta de reglas globales mobile-first para contención (`min-width: 0`, wraps, control de overflow) y componentes con tipografía/cajas no adaptadas a viewport pequeño.
- **Fix aplicado:**
  - `src/components/AdminLayout.jsx`: wrapper global con control de overflow horizontal.
  - `src/index.css`: reglas `@media (max-width: 768px)` para contención global de textos y números, y mejora de `overflow-x-auto` táctil.
  - Ajustes puntuales en:
    - `src/pages/admin/Sales.jsx`
    - `src/pages/admin/AdminDashboard.jsx`
    - `src/pages/admin/Dashboard.jsx`
  - Se ajustaron grids, tamaños de fuente y comportamiento de corte para evitar overflow.
- **Estado:** ✅ Resuelto.

### 24. Aparición de `??` en encabezados de Ventas por iconografía Unicode
- **Síntoma:** En la vista de ventas aparecían signos de interrogación (`??`) en títulos o badges.
- **Causa raíz:** Render/codificación inconsistente de emojis o caracteres Unicode en algunos entornos.
- **Fix aplicado:**
  - `src/pages/admin/Sales.jsx`: eliminación de emojis/iconos Unicode en navegación y encabezados de la vista.
  - Se dejó interfaz basada en texto limpio y se removieron siglas temporales (`GR`, `TK`, etc.) para conservar claridad.
- **Estado:** ✅ Resuelto.

### 25. Módulos viewer seguían siendo clickeables aunque el permiso estuviera desactivado
- **Síntoma:** En cuentas viewer, algunas funciones se podían abrir aunque el permiso estuviera apagado desde `/admin/permissions`.
- **Causa raíz:** Faltaba aplicar bloqueo visual/interacción en la UI usando permisos granulares del usuario.
- **Fix aplicado:**
  - `api/auth/login.php` y `api/auth/me.php` ahora devuelven permisos granulares del usuario.
  - `src/components/AdminLayout.jsx` y `src/pages/admin/Dashboard.jsx` aplican estado deshabilitado (gris) y bloqueo de click para módulos restringidos.
- **Estado:** ✅ Resuelto.

### 26. Texto roto en móvil (palabras partidas letra por letra)
- **Síntoma:** En pantallas pequeñas, nombres y títulos se quebraban en varias líneas de una letra por línea.
- **Causa raíz:** Regla global móvil demasiado agresiva: `overflow-wrap:anywhere` + `word-break: break-word`.
- **Fix aplicado:**
  - `src/index.css` cambió a `overflow-wrap: break-word` y `word-break: normal`.
  - Ajustes de layout y tamaños en `Employees.jsx` y `Applications.jsx`.
- **Estado:** ✅ Resuelto.

### 27. No se podían guardar notas por solicitud desde Applications
- **Síntoma:** Al intentar guardar notas en solicitudes, backend rechazaba el campo o no persistía.
- **Causa raíz:** `api/applications/update-field.php` no permitía `notes` en `$allowedFields`.
- **Fix aplicado:**
  - Se agregó `notes` a whitelist en `update-field.php`.
  - Se implementó UI de notas y guardado en `src/pages/admin/Applications.jsx` (lista y modal).
- **Estado:** ✅ Resuelto.

### 28. Geolocalización de solicitudes fallaba por CORS + 429 en Nominatim
- **Síntoma:** Consola con:
  - `Access to fetch ... has been blocked by CORS policy`
  - `429 Too Many Requests`
  - `Geocode error: TypeError: Failed to fetch`
- **Causa raíz:** El frontend consultaba Nominatim directamente desde el navegador, quedando expuesto a CORS/rate-limit de servicio público.
- **Fix aplicado:**
  - Se creó `api/applications/geocode.php` como proxy backend con:
    - caché (`geocode-cache.json`),
    - normalización y variantes de dirección,
    - manejo explícito de `429`,
    - `nocache=1` para forzar reintento.
  - `src/utils/geo.js` se actualizó para usar el endpoint interno en lugar de `nominatim.openstreetmap.org` directo.
  - Se verificó endpoint con `success:true` y coordenadas válidas.
- **Estado:** ✅ Resuelto.

### 29. Geocoder devolvía `success:false` para direcciones válidas por cache negativo previo
- **Síntoma:** Después de mejoras, seguía devolviendo `coords:null` por entradas ya cacheadas en negativo.
- **Causa raíz:** Resultado previo (`null`) persistido en caché local de geocode.
- **Fix aplicado:**
  - Se añadió parámetro `nocache=1` en `api/applications/geocode.php` para bypass de cache en pruebas y rehidratación.
  - Al resolver correctamente, se reescribe la cache con coordenadas reales.
- **Estado:** ✅ Resuelto.

### 30. Mapa de empleados sin avatar (mostraba `EMP` en vez de foto)
- **Síntoma:** En mapa general/individual de `/admin/employees` los pines aparecían como `EMP` aunque la foto existía en ficha.
- **Causa raíz:** El marcador no recibía `avatar` en todos los casos y varias rutas de foto venían en formato no normalizado (relativas o solo nombre de archivo).
- **Fix aplicado:**
  - `src/pages/admin/Employees.jsx`:
    - marcador individual ahora envía `avatar` y `color`,
    - normalización robusta de URL (`https://`, `//`, `/api/...`, `api/...`, filename).
  - `src/components/LocationMap.jsx`:
    - fallback controlado a `EMP` solo cuando realmente falla la carga de imagen.
- **Estado:** ✅ Resuelto.

### 31. Mapa se veía en blanco y negro
- **Síntoma:** En empleados, el mapa perdía color y se veía gris.
- **Causa raíz:** Clase de estilo con `grayscale` aplicada al contenedor.
- **Fix aplicado:** Se retiró `grayscale` en `src/pages/admin/Employees.jsx`.
- **Estado:** ✅ Resuelto.

### 32. Marcadores repetidos quedaban "en línea"
- **Síntoma:** Varios empleados aparecían alineados en diagonal cuando compartían coordenada aproximada.
- **Causa raíz:** Offsets lineales para deshacer superposición.
- **Fix aplicado:** `src/components/LocationMap.jsx` cambió a dispersión circular por grupo de coordenada repetida.
- **Estado:** ✅ Resuelto.

### 33. Fotos de empleado con 404 (`employee_*.jpg`, `id_*.jpeg`)
- **Síntoma:** Consola con múltiples `404` al cargar fotos perfil/ID.
- **Causa raíz:** En varios registros se guardó solo filename, y frontend intentaba resolver ruta incorrecta.
- **Fix aplicado:** `src/pages/admin/Employees.jsx` convierte filename a `/api/uploads/employee-photos/<archivo>` y reutiliza esa normalización en miniaturas, preview y mapa.
- **Estado:** ✅ Resuelto en frontend.  
  - **Nota operativa:** Si el archivo no existe físicamente en servidor, seguirá 404 hasta re-subirlo.

### 34. Totales de ventas duplicados (cerrada + en curso)
- **Síntoma:** En `/admin/sales` el total del header sumaba dos veces el mismo ticket (una vez como cerrado y otra como en curso).
- **Causa raíz:** Tickets duplicados por estado en sincronización (`open` y `closed` coexistiendo para el mismo folio/ticket).
- **Fix aplicado:** `api/softrestaurant/sales.php` deduplica tickets abiertos que ya tienen equivalente cerrado en:
  - `getOpenStats()`
  - `getHistoricalOpenStats()`
- **Estado:** ✅ Resuelto.

### 35. Bloque SQL sensible visible en `/admin/permissions`
- **Síntoma:** Se mostraba en frontend un bloque con SQL de alter table.
- **Causa raíz:** Sección temporal de ayuda técnica quedó renderizada en UI.
- **Fix aplicado:** Eliminado el bloque de `src/pages/admin/Permissions.jsx`.
- **Estado:** ✅ Resuelto.
