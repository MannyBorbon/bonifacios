# Error and Fixes Log (Activo)

## Formato canonico

Cada incidente nuevo se registra con este formato:

- ID: `ERR-YYYYMMDD-###`
- Modulo:
- Sintoma:
- Evidencia:
- Causa raiz:
- Fix aplicado:
- Verificacion:
- Prevencion:
- Estado: `abierto | mitigado | resuelto`

---

## ERR-20260425-001

- Modulo: Home (`src/pages/Home.jsx`)
- Sintoma: Error 500 en pagina principal.
- Evidencia: errores JSX en compilacion y pagina inaccesible.
- Causa raiz: estructura JSX desbalanceada en `return`.
- Fix aplicado: reestructuracion completa del bloque `return` con cierres correctos.
- Verificacion: build exitoso y home funcional.
- Prevencion: validacion de lint/build antes de deploy.
- Estado: resuelto.

## ERR-20260423-002

- Modulo: Geocoding solicitudes.
- Sintoma: CORS/429 al usar Nominatim desde navegador.
- Evidencia: errores `blocked by CORS policy` y `429 Too Many Requests`.
- Causa raiz: llamada directa frontend a proveedor publico.
- Fix aplicado: proxy backend `api/applications/geocode.php` con cache y reintentos controlados.
- Verificacion: endpoint interno responde `success:true` con coordenadas.
- Prevencion: no consumir geocoders publicos directamente desde cliente.
- Estado: resuelto.

## ERR-20260423-003

- Modulo: Ventas SR.
- Sintoma: top productos vacio / inconsistencias.
- Evidencia: secciones sin datos pese a tickets con items.
- Causa raiz: consultas inconsistentes entre tablas de items y joins por identificadores distintos.
- Fix aplicado: unificacion de fuentes (`sr_sale_items`/`sr_ticket_items`) + joins normalizados.
- Verificacion: top productos y detalle por ticket visibles.
- Prevencion: contratos de identificadores unificados en sync y API.
- Estado: resuelto.

## ERR-20260428-004

- Modulo: Notificaciones admin (`api/chat/notifications.php`, `api/chat/mark-notifications-seen.php`).
- Sintoma: contador de campana reaparecia tras recargar.
- Evidencia: usuarios marcaban visto pero en refresh volvia a contar elementos previos.
- Causa raiz: ausencia de estado persistente por usuario para "seen at" en chat/correo/cotizaciones/solicitudes.
- Fix aplicado: tabla `user_notification_state` + filtros por timestamp de visto.
- Verificacion: abrir campana, marcar visto y recargar mantiene contador consistente.
- Prevencion: mantener estado de notificaciones por usuario y no solo por flags globales.
- Estado: mitigado.

## ERR-20260428-005

- Modulo: Correo saliente (`api/email/send.php`).
- Sintoma: riesgo critico por credenciales SMTP hardcodeadas.
- Evidencia: usuario/password SMTP en texto plano dentro del endpoint.
- Causa raiz: configuracion temporal no migrada a variables de entorno.
- Fix aplicado: lectura de `SMTP_*` y `MAIL_FROM` desde entorno, eliminando secretos embebidos.
- Verificacion: endpoint opera con variables configuradas y sin secretos en repositorio.
- Prevencion: politica obligatoria de secretos via `.env` y revision previa a deploy.
- Estado: resuelto.

## ERR-20260503-006

- Modulo: Consultas SQL en phpMyAdmin (ventas / turno negocio).
- Sintoma: `#1298 - Unknown or incorrect time zone: 'America/Hermosillo'` al ejecutar `SET SESSION time_zone = 'America/Hermosillo';`.
- Evidencia: phpMyAdmin en Hostinger; servidor MySQL sin tablas de zona horaria cargadas (`mysql.time_zone_name` vacio o incompleto).
- Causa raiz: Los nombres IANA (`America/Hermosillo`) requieren datos de zona en MySQL; en hosting compartido muchas veces no estan poblados.
- Fix aplicado: En SQL ad-hoc **no** usar `SET time_zone = 'America/...'`. Usar `CONVERT_TZ(..., '+00:00', '-07:00')` con `COALESCE(..., DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR))` si `CONVERT_TZ` devuelve NULL; o literales `BETWEEN` del panel. En phpMyAdmin, no ejecutar solo el `SELECT` con `@vars` sin el mismo lote de `SET`; preferir una sola query (ver `documentacion.md` §4b). En `api/softrestaurant/sync.php`, si `sale_datetime` viene vacio del cliente, derivar de `sale_date` + `sale_time`. En `softrestaurant-sync/sync-historico.php`, forzar `date_default_timezone_set('America/Hermosillo')` en el PC del sync para alinear `syncToday()` y `sale_datetime` con `sales.php`.
- Verificacion: la consulta corre sin #1298 y el rango coincide con `sales.php` (turno 08:00 a 07:59 siguiente).
- Prevencion: documentar en consultas SQL solo offsets o fechas literales; PHP sigue usando `date_default_timezone_set('America/Hermosillo')` en `api/config/database.php` (eso no depende de tablas MySQL).
- Estado: mitigado.

## ERR-20260504-007

- Modulo: Calendario (`src/pages/admin/Calendar.jsx`, `src/services/api.js`).
- Sintoma: Editar un evento del calendario no guardaba los cambios correctamente — actualizaba siempre el registro con `id=1` en lugar del evento seleccionado.
- Evidencia: `calendarAPI.updateEvent` definido como `(id, data)` pero llamado con un solo argumento objeto `{ id: selectedEvent.id, ...form }`. En PHP, `intval()` sobre un array devuelve `1`.
- Causa raiz: Mismatch entre la firma de `updateEvent` en `api.js` y la llamada en `Calendar.jsx:284`. El argumento `id` recibía el objeto completo; `data` quedaba `undefined`.
- Fix aplicado: Corregida la llamada a `calendarAPI.updateEvent(selectedEvent.id, { ...form, quote_id: form.quote_id || null })` para pasar `id` y `data` como argumentos separados.
- Verificacion: El UPDATE de PHP recibe `$data['id']` como entero correcto; editar un evento y guardar actualiza el registro correspondiente.
- Prevencion: Verificar consistencia entre firma de funcion API y sus sitios de llamada al definir o modificar metodos en `api.js`.
- Estado: resuelto.

## ERR-20260504-008

- Modulo: Reuniones — minuta (`api/meetings/minutes.php`, `api/meetings/meetings.php`).
- Sintoma: Guardar o cargar la minuta de una reunion puede devolver error 500 si la tabla `meeting_minutes` no existe en la base de datos.
- Evidencia: `meetings.php` auto-crea con `CREATE TABLE IF NOT EXISTS` las tablas `meetings`, `meeting_participants` y `meeting_messages`, pero omitia `meeting_minutes`. `minutes.php` la usa sin crearla.
- Causa raiz: Tabla omitida en la inicializacion automatica del modulo de reuniones.
- Fix aplicado: Agregado `CREATE TABLE IF NOT EXISTS meeting_minutes (id, meeting_id UNIQUE, content LONGTEXT, updated_by, updated_at)` en `meetings.php` junto a las demas tablas del modulo.
- Verificacion: Al llegar cualquier request a `meetings.php`, la tabla se crea si no existe; `minutes.php` puede operar correctamente.
- Prevencion: Toda tabla usada por un modulo debe crearse en el mismo archivo de inicializacion del modulo.
- Estado: resuelto.

## ERR-20260504-009

- Modulo: Sala de reuniones — rendimiento (`src/pages/admin/MeetingRoom.jsx`).
- Sintoma: Al entrar a una reunion, el UI tardaba varios segundos en mostrar contenido y la videollamada en conectarse.
- Evidencia: Dos causas encadenadas: (1) `loading=true` bloquea toda la UI hasta que resuelven 3 llamadas API en paralelo (`join`, `getRoom`+`getMinutes` via Promise.all); (2) el script externo `meet.jit.si/external_api.js` (~1 MB) se descargaba DESPUES de que resolvian las APIs, sumando otro retraso secuencial.
- Causa raiz: El script de Jitsi solo se cargaba al montar el componente `GroupCall`, que a su vez solo montaba tras `loading=false`. Esto hacía la carga del script secuencial respecto a las APIs en lugar de paralela.
- Fix aplicado: Agregado `useEffect` que inyecta el script de Jitsi en `<head>` inmediatamente al montar `MeetingRoom`, en paralelo con las llamadas API. Si el script ya existe en `window.JitsiMeetExternalAPI`, no hace nada.
- Verificacion: El script descarga mientras las APIs responden; cuando `GroupCall` monta, `window.JitsiMeetExternalAPI` ya esta disponible y la sala conecta sin espera adicional.
- Prevencion: Scripts externos pesados de terceros que se usan con certeza al cargar una pagina deben preloadearse al inicio del componente raiz, no dentro de sub-componentes condicionales.
- Estado: resuelto.

---

## Referencia historica

El historial completo previo se conserva en:

- `../errores.md`
- `../documentacion.md`
