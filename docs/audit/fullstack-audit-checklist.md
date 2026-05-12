# Fullstack Audit Checklist

Estado global: `listo` (auditoría T1–T13 + smoke tests documentados; seguimiento operativo según backlog del producto)

## Inventario

- API PHP (`api/`): 179 archivos `.php`
- Backend Node (`server/`): 8 archivos (`.js/.ts`)
- Frontend (`src/`): 56 archivos (`.js/.jsx/.ts/.tsx`)
- Sync y utilidades (`softrestaurant-sync/`): 35 archivos
- Legacy/debug/test detectados: 29 archivos

## Reglas de validacion por item

- Esquema verificado contra `docs/repositorio-esquemas-datos.md`
- Contratos API consistentes (`success`, payload, errores)
- Sin SQL con concatenacion de input
- Estados/enums alineados con BD real
- Riesgos de seguridad corregidos o documentados

## Checklist por fases

### Fase 0 - Baseline
- [x] Inventario completo generado
- [x] Matriz/checklist creada
- [x] Criterios de validacion definidos

### Fase 1 - API PHP
- [x] Bloque `applications/*`
- [x] Bloque `analytics/*`
- [x] Bloque `dashboard/*`
- [x] Bloque `users/*` (micro-tareas T1–T3: permisos, onsite/skills, upload perfil)
- [x] Bloque `email/*`
- [x] Bloque `chat/*` (T4: notificaciones, mark-seen, send/messages/conversations/users-online, audio-proxy; `upload.php` ya antes)
- [x] Bloque `reservations/*` (revision profunda segunda pasada: deposit vs status, filtros lista/mapa/asistente)
- [x] Bloque `quotes/*` (T5: create/update NULL bind, delete/admin, get/list GET-only, notes DELETE autor/admin, beo/audit/methods, cotizaciones sin prepares muertos, submit POST + escape HTML correo, submit_debug bloqueado en prod, requirements 405/JSON)
- [x] Bloque `softrestaurant/*` (T6–T11; riesgo residual `syncSales` dinámico documentado en T10)
- [x] Bloque restante de `api/*` (T12 + revisiones previas por carpetas)

### Fase 2 - Server Node
- [x] `server/routes/applications.js`
- [x] `server/routes/analytics.js`
- [x] `server/routes/messages.js`
- [x] `server/routes/tracking.js`
- [x] `server/routes/auth.js` + middleware/config

### Fase 3 - Frontend
- [x] `src/services/api.js` contratos
- [x] `src/pages/admin/*` consumo de APIs
- [x] `src/pages/public/*` consumo de APIs
- [x] `src/components/*` acoplamientos a datos

### Fase 4 - Sync y scripts
- [x] `softrestaurant-sync/*.php`
- [x] Scripts `.bat` y helpers

### Fase 5 - Legacy/debug/test
- [x] Endpoints test/debug con riesgos
- [x] Archivos backup/corrupt con impacto

### Fase 6 - Verificacion final
- [x] Lints/checks
- [x] Smoke test APIs criticas (ver `docs/audit/smoke-tests.md`)
- [x] Smoke test dashboard (checklist manual en el mismo documento)
- [x] Cierre con evidencia (T13 + enlaces curl y regresiones de seguridad documentadas)

## Hallazgos iniciales (confirmados)

1. `job_applications.status` usa enum ingles (`pending/reviewing/accepted/rejected`) pero habia endpoints usando valores en espanol.
2. `api/applications/list.php` no devolvia `success`, rompiendo carga en dashboard.
3. `api/applications/list.php` usaba concatenacion de filtros (`status`, `position`) en SQL.
4. `api/analytics/dashboard.php` contaba pendientes con `status='Pendiente'` (inconsistente con enum).
5. `api/dashboard/operational-checklist.php` filtraba `sr_sales.status` con estados fuera de enum real.
6. `api/email/inbox.php` contenia credenciales hardcodeadas (alto riesgo) — corregido en iteracion anterior.
7. **Iteracion segunda revision:** Scripts `softrestaurant-sync/check-today.php`, `check-open.php`, `test-pagado.php` tenian `SR_PASS` en claro — alineados a `getenv('SR_PASS')` (si ya estaban corregidos en disco, checklist queda como trazabilidad).
8. **Iteracion segunda revision:** Varias rutas usaban `special_reservations.status = 'uploaded'`, pero en `docs/repositorio-esquemas-datos.md` el comprobante vive en `deposit_status`; se corrigio escritura (`client-upload-deposit.php`), filtros SQL PHP, `list.php` (filtro `status=uploaded` → deposit), `update-reservation.php`, frontend `Reservations.jsx` / `ReservationClientDetail.jsx`.
9. **`api/reservations/list.php`:** filtros `status` acotados a enum real + filtro virtual comprobantes; SELECT expone `deposit_status`/`deposit_screenshot`.
10. **`api/applications/test-submit.php`:** `DELETE` con id interpolado sustituido por prepared statement.

## Evidencia de correcciones aplicadas (iteracion actual)

- `api/applications/list.php`
  - filtros `status/position` migrados a prepared statements (sin concatenacion)
  - normalizacion de estados al enum real (`pending/reviewing/accepted/rejected`)
  - respuesta JSON ahora incluye `success: true`
- `api/applications/submit.php`, `api/applications/submit-minimal.php`, `api/applications/submit-debug.php`, `api/applications/test-submit.php`
  - estados de alta corregidos a enum real (`pending` / `accepted`)
- `api/applications/update-status.php`
  - normalizacion y validacion estricta de estado
  - bloque de aceptacion unificado a `accepted`
- `api/employees/accept-application.php`
  - status de aplicación corregido a `accepted`
- `api/analytics/dashboard.php`
  - conteo de pendientes corregido a `status='pending'`
- `api/dashboard/operational-checklist.php`
  - filtro de ventas ajustado a enum real de `sr_sales.status` (`closed`)
- `api/email/inbox.php` y `api/email/get-email.php`
  - credenciales IMAP removidas del codigo; ahora usa env (`IMAP_USER`, `IMAP_PASS`)
- `api/config/smtp.php`
  - credenciales SMTP removidas del codigo; ahora usa env (`SMTP_USER`, `SMTP_PASS`)
- `api/.env.example`
  - agregadas variables IMAP documentadas
- hardcoded secrets sanitizados en scripts auxiliares/documentacion sensible (`softrestaurant-sync/*.php`, `api/create-users.php`, guias `.md`)
- `server/routes/applications.js` y `server/routes/analytics.js`
  - normalizacion de estados en Node para evitar divergencia con API PHP
  - respuestas con `success` en rutas principales de analitica/aplicaciones
- `database/generate_password.js` y `api/generate-hash.php`
  - utilidades endurecidas para no exponer contrasenas por defecto en codigo

### Evidencia segunda pasada profunda (esta iteracion)

- Reservas (`deposit_status` vs `status`): `api/reservations/client-upload-deposit.php`, `list.php`, `occupied-tables.php`, `floor-state.php`, `occupancy-day-timeline.php`, `table-activity.php`, `softrestaurant-table-paid.php`, `update-reservation.php`, `api/workspace/assistant.php`; frontend `src/pages/admin/Reservations.jsx`, `src/pages/ReservationClientDetail.jsx`.
- SQL mas defensivo / consistencia: `api/quotes/requirements.php` (DELETE con prepare), `api/chat/upload.php` (UPDATE conversacion con prepare), `api/analytics/site-stats.php` (tope de dias 1–366), `api/applications/test-submit.php` (DELETE con prepare).
- **T5 `api/quotes/*`:** `create.php`/`update.php` enlazan `quote_amount` y `assigned_to` con NULL vía tipos string; `get.php`/`list.php` solo GET + `success: false` en errores; `notes.php` DELETE solo autor o admin; `audit.php` POST solo administradores; `cotizaciones.php` eliminados `prepare()->bind_param` huérfanos; `submit.php` POST + `htmlspecialchars` en cuerpos de correo; `submit_debug.php` 404 en `APP_ENV=production` sin traza en cliente; resto endurecimiento 405/JSON/cierre mysqli.
- **T6 `api/softrestaurant/ticket-items.php`, `tips-history.php`, `tips-all.php`:** solo GET (y OPTIONS); `requireAuth()` en los tres; errores con `success: false` y códigos HTTP; `ticket-items` sin `debug_info`; `tips-history` límite entero acotado en SQL; `tips-all` validación `YYYY-MM-DD` y orden de fechas; cabecera `Authorization` en CORS para Bearer.
- **T7 `shifts.php` + `cash-movements.php`:** solo GET/OPTIONS; `requireAuth()`; `period` acotado a lista permitida; `shift_date` y rango `custom` validados `YYYY-MM-DD`; mes/año acotados; **405** si no GET; `cash-movements` ya no declara POST en CORS (no había handler POST).
- **T8 `sales.php` (entrada):** solo **GET** (OPTIONS ya sale en `database.php`); `requireAuth()` antes de `getPDO()`; `range` en lista blanca; `status` en `all|open|closed`; `month`/`year` acotados; rango `custom` con fechas `YYYY-MM-DD` y orden; errores **400/405** con `success: false`.
- **T9 `sales.php` (pesado/JSON):** `sales_emit_json()` con `JSON_INVALID_UTF8_SUBSTITUTE`; listado tickets con `LIMIT` acotado y query param `sales_limit` (100–5000); top productos / analytics / propinas detalle / cancelaciones / meseros con límites SQL; eliminado objeto `debug` con SQL interno de `getDetailedAnalytics`; respuesta incluye `sales_row_limit` cuando aplica listado de ventas.
- **T10 `api/softrestaurant/sync.php`:** clave vía `SR_SYNC_API_KEY` (sin hardcode); 401/405/400/503 con `success: false` y sin filtrar cabecera recibida; JSON y `module` validados antes de abrir BD; lista blanca de módulos; `hash_equals` para API key; `catch` marca `sr_sync_log` en `failed` con `error_details` y respuesta genérica al cliente; `finally` cierra `mysqli`. Pendiente de alcance mayor: `syncSales()` sigue usando SQL dinámico con `escape_string` (riesgo documentado en auditoría previa).
- **T11 Diagnósticos / tests SR y relacionados:** `softrestaurant/diag-mysql.php`, `diag-abril.php`: web bloqueada en `APP_ENV=production` (404); fuera de prod clave `SR_SYNC_API_KEY` con `hash_equals` (503 si falta env). `test-params.php`: solo no prod. `test-insert.php`: deshabilitado en producción (web 404, CLI exit 1). `debug-sync.php`: no prod + misma clave que sync + sin hardcode. `diag-full-system.php`: deshabilitado en prod (web 404, CLI exit 1); fuera de prod clave desde env + `hash_equals`. `employees/diag-photo.php`: 404 en prod; fuera de prod exige `requireAuth()`.
- **T12 Otros `api/*`:** Revisión `finances/*`, `meetings/*`, `support/*` ya con `requireAuth`. Endurecidos `api/test-db.php`, `test-connection.php`, `test.php`, `debug.php` (404 prod; fuera de prod `requireAuth` donde expone datos/rutas; `test-db` sin credenciales hardcodeadas). `applications/test-email.php`, `test-db.php`, `test-submit.php`: 404 prod + `requireAuth` fuera de prod; sin trazas al cliente en errores. `employees/get-attendance.php`: `requireAuth()`, solo GET, validación `YYYY-MM-DD`, sin `Access-Control-Allow-Origin: *`, errores 500 sin stack al cliente (compatible con `Employees.jsx` + `credentials: 'include'`).
- **T13 Cierre verificación:** `docs/audit/smoke-tests.md` con curls (OPTIONS, `sales`, ticket-items, tips, shifts, cash-movements, `get-attendance`, `sync` con `X-API-Key`), checklist manual del panel y tabla de 404 esperados en prod; Fase 6 del checklist marcada; estado global `listo` para tramo auditoría T1–T13.

## Nota de validacion ejecutable

- `ReadLints` sin errores en archivos modificados.
- No fue posible correr `php -l` localmente porque el binario `php` no esta disponible en el entorno actual.
- **T13:** Guía de smoke tests: `docs/audit/smoke-tests.md` (curl/OPTIONS, SR sync, panel manual, tablas 404 en prod).
