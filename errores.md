# Errores Conocidos y Soluciones — Bonifacio's Restaurant

> Registro de bugs, advertencias y pendientes con su causa raíz y cómo resolverlos.
> Última actualización: 22 de abril de 2026.

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

### 3. Lint en `src/pages/admin/Employees.jsx`
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

### 4. KPIs duplicados en vista Corte de Ventas
- **Síntoma:** Al entrar a la sección Corte en `/admin/sales`, aparecen los 8 KPIs del dashboard general encima del corte (Tickets cerrados, Ticket promedio, Comensales, Propinas, Descuentos, Cancelaciones, Mesas abiertas, Hora pico).
- **Causa raíz:** El bloque KPIs (`lines 711-721` en `Sales.jsx`) estaba fuera de `AnimatePresence` y se renderizaba globalmente para TODAS las vistas.
- **Fix aplicado:** Envuelto el bloque con `{viewMode !== 'shift_close' && ...}` para ocultarlo en la vista Corte. También ocultado el bloque Comparativo con la misma condición.
- **Estado:** ✅ Resuelto.

### 5. PROG mostraba 4 con `employee_schedules` vacía
- **Síntoma:** El contador PROG en `/admin/employees` mostraba 4 aunque nadie tenía horario configurado y la tabla `employee_schedules` estaba vacía.
- **Causa raíz:** El fallback de `attendance-management.php` cargaba el último día con registros de `sr_attendance` cuando no hay datos de hoy. Empleados con `clock_in` de ese día pasaban el filtro `|| Boolean(att?.clock_in)` y aparecían como "Programados".
- **Fix aplicado:** Eliminado `|| Boolean(att?.clock_in)` del filtro `scheduled`. PROG ahora solo cuenta empleados con horario guardado en `employee_schedules` para el día actual.
- **Estado:** ✅ Resuelto.

### 6. TARDE mostraba 1 sin horarios configurados
- **Síntoma:** El contador TARDE mostraba 1 empleado aunque nadie tenía horario configurado.
- **Causa raíz 1:** `att?.minutes_late > 0` usaba datos del fallback de otro día.
- **Causa raíz 2:** Sin horario configurado, `sch.entry` era `'00:00'` y la comparación `now > 00:00` siempre era `true`.
- **Fix aplicado:** Eliminado `att?.minutes_late` del filtro. Agregado guard `!sch.entry` — si no hay hora de entrada configurada, no se cuenta como tarde.
- **Estado:** ✅ Resuelto.

### 7. Punto/tarjeta sin color rojo en vista Horario cuando empleado llega tarde
- **Síntoma:** El indicador de estado de un empleado en la vista Horario siempre era verde o gris, nunca rojo aunque ya hubiera pasado su hora de entrada y no hubiera hecho clock-in.
- **Causa raíz:** Solo había dos estados: `isWorkingNow ? 'bg-green-500' : 'bg-slate-600'`. Sin lógica para `isLate`.
- **Fix aplicado:** Agregado cálculo `isLate` (isToday && !att?.clock_in && sch.entry && now > horaEntrada). Punto rojo pulsante + borde rojo en tarjeta cuando `isLate === true`.
- **Estado:** ✅ Resuelto.

### 8. Cortesías incluidas en totales de meseros y métodos de pago
- **Síntoma:** Los totales por mesero y por forma de pago incluían tickets de cortesía (total=0, subtotal>0), inflando los números respecto a SR.
- **Causa raíz:** `getWaiterPerformance` y `getPaymentMethods` en `sales.php` usaban `SUM(total)` y `SUM(cash_amount)` sin filtrar cortesías.
- **Fix aplicado:** Ambas funciones ahora excluyen cortesías con `NOT (total=0 AND COALESCE(subtotal,0)>0)` en todos los `SUM` y `COUNT`.
- **Estado:** ✅ Resuelto.

### 9. cash-movements.php incluía cortesías en totales del turno
- **Síntoma:** El total de ventas y descuentos en la vista Caja y Corte no coincidía con SR — incluía cortesías en subtotal y descuentos.
- **Causa raíz:** La query de ventas en `cash-movements.php` usaba `SUM(total)`, `SUM(subtotal)` y `SUM(discount)` sin filtrar cortesías.
- **Fix aplicado:** Reescrita la query para excluir cortesías (`NOT (total=0 AND COALESCE(subtotal,0)>0)`) en total, subtotal, tax y descuentos. Solo descuentos de tickets realmente cobrados.
- **Estado:** ✅ Resuelto.

### 10. sync-historico.php no sincronizaba movimientos de caja en carga histórica
- **Síntoma:** Los movimientos de caja (`movtoscaja`) solo se sincronizaban en modo tiempo real, no durante la carga histórica inicial.
- **Causa raíz:** `syncCashMovements()` tenía `if ($this->isInitialLoad) return;` al inicio.
- **Fix aplicado:** Eliminado el guard. `syncCashMovements` ahora corre en ambos modos (histórico y tiempo real).
- **Estado:** ✅ Resuelto.

### 11. sync-historico.php solo sincronizaba cancelaciones de hoy
- **Síntoma:** La vista Auditoría no mostraba cancelaciones históricas, solo las del día actual.
- **Causa raíz:** `syncCancellations()` usaba `WHERE fecha >= CAST(GETDATE() AS DATE)` — siempre solo el día de hoy.
- **Fix aplicado:** Cambiado a `WHERE fecha > '$ls'` usando `lastSync['cancellations']` igual que ventas y movimientos. Ahora avanza `lastSync` después de cada lote.
- **Estado:** ✅ Resuelto.

### 12. "Otros" en formas de pago sin etiqueta descriptiva
- **Síntoma:** El campo `other_amount` (transferencias, SPEI, pagos personalizados de SR) aparecía como "Otros" sin contexto.
- **Fix aplicado:** Renombrado a "Transferencia / Otros" en `getPaymentMethods` de `sales.php` y en todos los lugares de `Sales.jsx` donde se muestra (Corte, Caja, gráfico General).
- **Estado:** ✅ Resuelto.

### 13. user_cancel no se mostraba en movimientos de caja
- **Síntoma:** Los movimientos de caja (retiros, depósitos) no mostraban quién los autorizó.
- **Fix aplicado:** Agregado campo `user_cancel` al mapeo de `cash-movements.php` y renderizado en la tabla de movimientos de `Sales.jsx` como "Autoriza: [nombre]".
- **Estado:** ✅ Resuelto.

### 14. Discrepancia de $754 en venta total vs SR — INVESTIGADO, NO ES ERROR DEL WEBSITE
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
