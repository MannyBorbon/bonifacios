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

---

## Referencia historica

El historial completo previo se conserva en:

- `../errores.md`
- `../documentacion.md`
