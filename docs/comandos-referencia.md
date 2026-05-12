# Comandos de referencia — Bonifacio's

Hoja de referencia rápida. No reemplaza los runbooks en `docs/OPERATIONS-RUNBOOK.md` y `docs/SANDBOX-DEPLOY.md`.

---

## 1. Build y desarrollo local

```bash
# Dev local (producción)
npm run dev

# Dev local (sandbox)
npm run dev:sandbox

# Build producción  →  genera dist/
npm run build:prod

# Build sandbox  →  genera dist/
npm run build:sandbox

# Preview del build
npm run preview
```

---

## 2. Deploy a Hostinger

### Frontend
Subir todo el contenido de `dist/` a `public_html/` (reemplaza `index.html`, `assets/`, `sw.js`, `workbox-*.js`).

### PHP — archivos que siempre van con cada deploy
```
api/config/database.php
api/config/env.php
```

### PHP — módulo WebRTC (nuevo, subir una vez)
```
api/config/turn.php
api/meetings/webrtc.php
api/meetings/ice-servers.php
api/meetings/meetings.php
```

### PHP — sync ventas (cuando hay cambios)
```
api/softrestaurant/sync.php
api/softrestaurant/sales.php
api/softrestaurant/cash-movements.php
```

---

## 3. Regenerar documentación de schemas

```bash
# Regenerar schema MariaDB (tras export phpMyAdmin) + ensamblar repositorio
python scripts/update-database-schema-doc.py

# Solo re-ensamblar repositorio (tras editar softrestaurant-schema.md)
python scripts/build-data-model-repository.py
```

---

## 4. phpMyAdmin — Ventas (sr_*)

### ⚠️ Borrar TODOS los datos de ventas (reset completo del sync)
> Usar solo cuando se va a re-sincronizar desde cero desde el servidor del restaurante.

```sql
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE sr_sale_items;
TRUNCATE TABLE sr_sales;
TRUNCATE TABLE sr_cash_movements;
TRUNCATE TABLE sr_cancellations;
TRUNCATE TABLE sr_cheque_payments;
TRUNCATE TABLE sr_payments;
TRUNCATE TABLE sr_ticket_items;
TRUNCATE TABLE sr_shifts;
TRUNCATE TABLE sr_daily_summary;
TRUNCATE TABLE sr_today_sales;
TRUNCATE TABLE sr_sync_log;
SET FOREIGN_KEY_CHECKS = 1;
```

### Verificar rango de fechas en sr_sales
```sql
SELECT
  COUNT(*)             AS total_tickets,
  MIN(sale_datetime)   AS primera_venta,
  MAX(sale_datetime)   AS ultima_venta,
  SUM(status='closed') AS cerrados,
  SUM(status='open')   AS abiertos
FROM sr_sales;
```

### Ver últimos tickets sincronizados
```sql
SELECT ticket_number, sale_datetime, total, status, waiter_name
FROM sr_sales
ORDER BY sale_datetime DESC
LIMIT 20;
```

### Ver últimas entradas del log de sync
```sql
SELECT * FROM sr_sync_log
ORDER BY synced_at DESC
LIMIT 10;
```

### Ventas del turno actual (08:00 → 07:59, zona Hermosillo)
```sql
SELECT s.*
FROM sr_sales s
JOIN (
  SELECT
    CONCAT(DATE_FORMAT(DATE_SUB(st, INTERVAL 1 DAY), '%Y-%m-%d'), ' 08:00:00') AS di,
    CONCAT(DATE_FORMAT(st, '%Y-%m-%d'), ' 07:59:59') AS df
  FROM (
    SELECT IF(HOUR(mx) < 8, DATE_SUB(dt, INTERVAL 1 DAY), dt) AS st
    FROM (
      SELECT
        COALESCE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-07:00'),
                 DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR)) AS mx,
        DATE(COALESCE(CONVERT_TZ(UTC_TIMESTAMP(),'+00:00','-07:00'),
                      DATE_SUB(UTC_TIMESTAMP(), INTERVAL 7 HOUR))) AS dt
    ) q
  ) r
) w ON 1=1
WHERE s.sale_datetime BETWEEN w.di AND w.df
ORDER BY s.sale_datetime DESC;
```

### Resumen de ventas por mes
```sql
SELECT
  DATE_FORMAT(sale_datetime, '%Y-%m')                                            AS mes,
  COUNT(*)                                                                        AS tickets,
  SUM(status='closed')                                                            AS cerrados,
  ROUND(SUM(CASE WHEN status='closed' THEN total ELSE 0 END), 2)                 AS total_cobrado
FROM sr_sales
WHERE sale_datetime >= '2025-01-01'
GROUP BY DATE_FORMAT(sale_datetime, '%Y-%m')
ORDER BY mes DESC;
```

---

## 5. phpMyAdmin — Usuarios y permisos

### Ver todos los usuarios
```sql
SELECT id, username, full_name, role, is_active, last_login
FROM users
ORDER BY role, username;
```

### Activar / desactivar usuario
```sql
UPDATE users SET is_active = 1 WHERE username = 'nombre';
UPDATE users SET is_active = 0 WHERE username = 'nombre';
```

### Ver permisos granulares
```sql
SELECT u.username, p.*
FROM user_permissions p
JOIN users u ON u.id = p.user_id
ORDER BY u.username;
```

---

## 6. phpMyAdmin — WebRTC (señales acumuladas)

```sql
-- Limpiar señales ya consumidas o con más de 1 hora
DELETE FROM meeting_webrtc_signals
WHERE is_consumed = 1
   OR created_at < NOW() - INTERVAL 1 HOUR;

-- Ver señales pendientes por reunión
SELECT meeting_id, COUNT(*) AS pendientes
FROM meeting_webrtc_signals
WHERE is_consumed = 0
GROUP BY meeting_id;
```

---

## 7. Servidor del restaurante — Sync SoftRestaurant

```bat
REM Ver si el script está corriendo
tasklist | findstr php.exe

REM Detener sync actual
taskkill /F /IM php.exe

REM Reiniciar sync
cd C:\Sincronizador\softrestaurant-sync
php sync-final.php

REM Reset completo (borra estado guardado y re-sincroniza desde cero)
del sync-state.json
php sync-final.php
```

---

## 8. Git — Flujo de trabajo

```bash
# Checkpoint antes de refactor o cambio grande
git add -A && git commit -m "chore: checkpoint antes de [descripcion]"

# Commit en progreso
git commit -m "wip(scope): descripcion pendiente"

# Convención de commits
# feat|fix|style|refactor|docs|chore|hotfix(scope): descripcion corta

# Estado y últimos commits
git status
git log --oneline -10
```

---

## 9. Referencias rápidas

| Qué | Archivo |
|---|---|
| Schema MySQL + SR | `docs/repositorio-esquemas-datos.md` |
| Backlog de tareas | `docs/backlog.md` |
| Registro de errores/fixes | `docs/ERROR-FIXES-LOG.md` |
| Reglas del proyecto | `AGENTS.md` |
| Troubleshooting ventas/sync | `docs/sales-dashboard-troubleshooting.md` |
| Runbook de deploy | `docs/OPERATIONS-RUNBOOK.md` |
| Sandbox config | `docs/SANDBOX-DEPLOY.md` |
