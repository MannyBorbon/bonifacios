# Smoke tests — API PHP y panel (Bonifacio's)

Documento operativo para verificación manual tras deploy o cambios en `api/`, `server/` o `src/`. Sustituir placeholders antes de ejecutar.

## Variables

| Variable | Ejemplo | Uso |
|----------|---------|-----|
| `API_BASE` | `https://bonifaciossancarlos.com/api` | Base sin barra final; alinear con `VITE_API_URL` del build del panel. |
| `ORIGIN` | `https://bonifaciossancarlos.com` | Origen permitido en `CORS_ALLOWED_ORIGINS` (debe coincidir con el host del front). |
| `SR_SYNC_API_KEY` | (valor de `api/.env`) | Cabecera `X-API-Key` en `softrestaurant/sync.php`. |

## Cotizador público de eventos (sin sesión)

`POST` con JSON (`contact`, `items`, `total` coherente con ítems). Respuesta **200** con `success`, `folio`, `quote_id` si OK.

```bash
curl -sS -X POST "API_BASE/quotes/public-submit.php" \
  -H "Content-Type: application/json" \
  -H "Origin: ORIGIN" \
  -d "{\"contact\":{\"name\":\"Smoke\",\"phone\":\"6220000000\",\"email\":\"\",\"type\":\"Boda\",\"date\":\"2026-12-01\",\"guests\":50,\"notes\":\"\"},\"items\":[{\"id\":1,\"name\":\"Paquete prueba\",\"price\":100,\"qty\":2}],\"total\":200}"
```

## Comprobaciones sin sesión (contrato y CORS)

Preflight (debe responder **200** vacío o mínimo):

En **PowerShell** sustituir `-o /dev/null` por `-o NUL`. En bash:

```bash
curl -sS -D - -o /dev/null -X OPTIONS \
  -H "Origin: ORIGIN" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: authorization,content-type" \
  "API_BASE/softrestaurant/sales.php"
```

Respuesta pública esperada (ajustar si el endpoint exige auth):

```bash
curl -sS "API_BASE/applications/submit-minimal.php" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke\",\"phone\":\"0000000000\",\"position\":\"test\",\"experience\":0}"
```

Esperado: **200** o **400** con cuerpo JSON; no HTML de error del hosting.

## APIs críticas SoftRestaurant (requieren sesión o Bearer)

Tras iniciar sesión en el panel, copiar la cookie `PHPSESSID` del navegador o usar token Bearer si el cliente lo envía así.

**Ventas (GET, auth):**

```bash
curl -sS "API_BASE/softrestaurant/sales.php?range=today&status=all&sections=core" \
  -H "Cookie: PHPSESSID=TU_SESSION" \
  -H "Origin: ORIGIN"
```

Esperado: **200**, JSON con `success: true` (o estructura acordada en `sales.php`).

**Ticket items / propinas (GET, auth):**

```bash
curl -sS "API_BASE/softrestaurant/ticket-items.php" -H "Cookie: PHPSESSID=TU_SESSION" -H "Origin: ORIGIN"
curl -sS "API_BASE/softrestaurant/tips-history.php?limit=50" -H "Cookie: PHPSESSID=TU_SESSION" -H "Origin: ORIGIN"
```

**Turnos y caja (GET, auth):**

```bash
curl -sS "API_BASE/softrestaurant/shifts.php?period=today" -H "Cookie: PHPSESSID=TU_SESSION" -H "Origin: ORIGIN"
curl -sS "API_BASE/softrestaurant/cash-movements.php?period=today" -H "Cookie: PHPSESSID=TU_SESSION" -H "Origin: ORIGIN"
```

**Asistencia empleados (GET, auth, fechas válidas):**

```bash
curl -sS "API_BASE/employees/get-attendance.php?id=1&start=2025-04-01&end=2025-04-30" \
  -H "Cookie: PHPSESSID=TU_SESSION" -H "Origin: ORIGIN"
```

Esperado: **400** si faltan `id`/`sr_id`/`name`; **200** con `success` cuando los parámetros son correctos.

## Sync SoftRestaurant → servidor (POST, API key)

Solo en entorno controlado; el cuerpo real lo genera `softrestaurant-sync/`.

```bash
curl -sS -X POST "API_BASE/softrestaurant/sync.php" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: SR_SYNC_API_KEY" \
  -d "{\"module\":\"products\",\"data\":[{\"sr_product_id\":999999,\"product_code\":\"SMOKE\",\"product_name\":\"Smoke\",\"category\":\"\",\"subcategory\":\"\",\"description\":\"\",\"price\":0,\"cost\":0,\"unit\":\"pz\",\"is_active\":1,\"preparation_time\":0,\"printer_station\":\"\"}]}"
```

Esperado: **200** con `success: true` o errores de negocio con `success: false`; **503** si `SR_SYNC_API_KEY` no está definida en el servidor; **401** si la clave no coincide.

## Panel (smoke manual en navegador)

Con el mismo `API_BASE` configurado en `.env` del front (`VITE_API_URL`):

1. **Login** — acceso al área admin.
2. **Dashboard** — carga sin errores en consola; widgets que llamen `chat/notifications.php` o `email/inbox.php` responden JSON.
3. **Reservas** — lista y detalle; subida de comprobante si aplica.
4. **Ventas (`Sales`)** — rango “Hoy” o mes actual; sin mensaje de “se esperaba JSON”.
5. **Empleados** — lista y ficha; pestaña asistencia dispara `get-attendance.php` con sesión.

## Regresiones de seguridad esperadas

| Ruta | Producción (`APP_ENV=production`) |
|------|-----------------------------------|
| `api/test.php`, `api/test-db.php`, `api/debug.php`, `api/test-connection.php` | **404** sin cuerpo útil para reconocimiento. |
| `api/applications/test-*.php` | **404**. |
| `api/softrestaurant/diag-*.php` (web), `debug-sync.php`, `test-params.php` | **404** o clave env según T11. |
| `api/diag-full-system.php` | **404** (web). |

Comprobar una sola URL de la tabla; no es necesario enumerar todas en cada corrida.

## Node (`server/`)

Si el panel usa proxy hacia Node (puerto distinto), verificar health o ruta mínima acordada en el proyecto, por ejemplo:

```bash
curl -sS "http://localhost:3001/api/health"
```

(Ajustar host/puerto según `server/` y documentación del repo.)

## Evidencia

Guardar salida relevante (códigos HTTP y primeras líneas del JSON) en el ticket o PR; no pegar cookies ni `SR_SYNC_API_KEY` en repositorios públicos.
