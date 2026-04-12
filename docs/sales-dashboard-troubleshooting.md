# Sales Dashboard - Troubleshooting & Maintenance

## Estructura de la Base de Datos

### Tabla `sr_sales`
Columnas principales:
- `id` - Auto increment
- `sr_ticket_id` - ID único del ticket
- `ticket_number` (folio) - Número de folio
- `sale_date` - Fecha (date)
- `sale_time` - Hora (time)
- `sale_datetime` - Fecha y hora completa (datetime)
- `table_id`, `table_number` - Mesa
- `waiter_id`, `waiter_name` - Mesero
- `covers` - Número de personas
- `subtotal`, `tax`, `discount`, `tip`, `total` - Montos
- `status` - Estado: 'open', 'closed', 'cancelled'
- `payment_type` - Tipo de pago: 'cash', 'card', 'voucher', 'other', 'mixed'
- `opened_at`, `closed_at` - Timestamps de apertura/cierre
- `created_at`, `updated_at` - Timestamps de sincronización

### Tabla `sr_cancellations`
- `id` - Auto increment
- `ticket_number` - Folio del ticket cancelado
- `amount` - Monto del ticket
- `user_name` - Usuario que canceló
- `reason` - Motivo de cancelación
- `cancel_date` - Fecha y hora de cancelación
- `synced_at` - Timestamp de sincronización

## Problemas Comunes

### 1. Dashboard no muestra datos de meses anteriores

**Síntoma:** Solo aparecen datos del mes actual (ej: abril 2026)

**Causa:** El script de sincronización no cargó el historial completo

**Solución:**

1. **En el servidor del restaurante:**
   ```bash
   cd C:\Sincronizador\softrestaurant-sync
   # Detener el script (Ctrl+C)
   del sync-state.json
   php sync-realtime-updated-FIXED.php
   ```

2. **Verificar que carga el historial:**
   ```
   [VENTAS] Buscando tickets desde: 20100101 00:00:00...
   [VENTAS] Query encontró 1000 tickets.
   [VENTAS] ¡ÉXITO! 1000 tickets enviados (1000 cerrados, 0 abiertos).
   [VENTAS] Buscando tickets desde: 2024-03-15 14:23:45.000...
   [VENTAS] Query encontró 1000 tickets.
   ...
   [VENTAS] --- Historial completo cargado. Iniciando modo tiempo real ---
   ```

3. **Si sigue sin funcionar, limpiar la base de datos:**
   ```sql
   SET FOREIGN_KEY_CHECKS = 0;
   TRUNCATE TABLE sr_sale_items;
   TRUNCATE TABLE sr_sales;
   TRUNCATE TABLE sr_sync_log;
   SET FOREIGN_KEY_CHECKS = 1;
   ```
   Luego repetir paso 1.

### 2. Filtros de status no funcionan

**Síntoma:** Al cambiar entre "Cerrados", "Abiertos", "Todos", las estadísticas no cambian

**Causa:** Archivos PHP desactualizados en Hostinger

**Solución:**
1. Subir `api/softrestaurant/sales.php` actualizado
2. Subir `api/softrestaurant/sync.php` actualizado
3. Limpiar caché del navegador (Ctrl+Shift+R)

### 3. Email no aparece en solicitudes de empleo

**Síntoma:** phpMyAdmin muestra el email pero el dashboard dice "No tiene correo"

**Causa:** Lógica de display incorrecta en `Applications.jsx`

**Solución:**
1. Hacer `npm run build`
2. Subir carpeta `dist/` completa a Hostinger
3. Limpiar caché del navegador

### 4. Error "tabla cancelaciones no existe"

**Síntoma:** El script muestra error de tabla `cancelaciones` en SoftRestaurant

**Causa:** SoftRestaurant 8.0 puede no tener esta tabla

**Solución:** Ya está manejado en el código - el error se suprime automáticamente. Si quieres habilitar cancelaciones:
1. Verificar si existe la tabla en SQL Server
2. Crear tabla `sr_cancellations` en MySQL:
   ```sql
   CREATE TABLE IF NOT EXISTS `sr_cancellations` (
     `id` INT(11) NOT NULL AUTO_INCREMENT,
     `ticket_number` VARCHAR(50) NOT NULL,
     `amount` DECIMAL(10,2) DEFAULT 0.00,
     `user_name` VARCHAR(100) DEFAULT NULL,
     `reason` TEXT DEFAULT NULL,
     `cancel_date` DATETIME DEFAULT NULL,
     `synced_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     PRIMARY KEY (`id`),
     UNIQUE KEY `uq_ticket_cancel` (`ticket_number`, `cancel_date`),
     KEY `idx_cancel_date` (`cancel_date`)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
   ```

## Verificación de Datos

### Verificar si hay datos de un año específico

```sql
SELECT 
    DATE_FORMAT(sale_datetime, '%Y-%m') as mes,
    COUNT(*) as total_tickets,
    SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as abiertos,
    SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END) as cerrados,
    SUM(total) as monto_total
FROM sr_sales
WHERE sale_datetime >= '2025-01-01'
GROUP BY DATE_FORMAT(sale_datetime, '%Y-%m')
ORDER BY mes DESC;
```

### Ver últimos tickets sincronizados

```sql
SELECT folio, sale_datetime, total, status, waiter_name
FROM sr_sales
ORDER BY sale_datetime DESC
LIMIT 20;
```

### Verificar estado de sincronización

```sql
SELECT * FROM sr_sync_log
ORDER BY synced_at DESC
LIMIT 10;
```

## Proceso de Despliegue

### 1. Build del Frontend
```bash
cd d:\Bonifacios\bonifacios website
npm run build
```

### 2. Archivos a subir a Hostinger
- `dist/` (carpeta completa)
- `api/softrestaurant/sales.php`
- `api/softrestaurant/sync.php`

### 3. Actualizar Script en Servidor del Restaurante
```bash
# Copiar sync-realtime-updated-FIXED.php al servidor
# Luego en el servidor:
cd C:\Sincronizador\softrestaurant-sync
# Detener script actual (Ctrl+C)
del sync-state.json
php sync-realtime-updated-FIXED.php
```

## Funcionamiento del Script de Sincronización

### Fase 1: Carga Inicial (Initial Load)
- Busca SOLO tickets cerrados (`pagado = 1`)
- Carga en lotes de 1000 registros
- Sin pausas entre lotes
- Avanza la fecha de sincronización con cada lote
- Termina cuando encuentra menos de 1000 tickets

### Fase 2: Modo Tiempo Real
- Busca tickets abiertos (`pagado = 0`) + nuevos cerrados
- Se ejecuta cada 30 segundos
- Mantiene sincronizados los tickets abiertos
- Detecta nuevos tickets cerrados

### Transición entre fases
El script cambia de fase cuando:
- Encuentra menos de 1000 tickets cerrados en un lote
- Muestra: `[VENTAS] --- Historial completo cargado. Iniciando modo tiempo real ---`

## Logs Importantes

### Carga exitosa del historial
```
[VENTAS] Buscando tickets desde: 20100101 00:00:00...
[VENTAS] Query encontró 1000 tickets.
[VENTAS] ¡ÉXITO! 1000 tickets enviados (1000 cerrados, 0 abiertos).
```

### Modo tiempo real activo
```
[VENTAS] Buscando tickets desde: 2026-04-08 19:34:14.000...
[VENTAS] Query encontró 42 tickets.
[VENTAS] ¡ÉXITO! 42 tickets enviados (0 cerrados, 42 abiertos).
```

### Error de conexión
```
✗ Error de conexión: SQLSTATE[08001]...
```
Verificar:
- Servidor SQL Server está activo
- Credenciales correctas
- Red/firewall permite conexión

## Mantenimiento Regular

### Semanal
- Verificar que el script está corriendo en el servidor del restaurante
- Revisar logs por errores

### Mensual
- Verificar integridad de datos con queries de verificación
- Revisar espacio en disco del servidor MySQL

### Cuando hay cambios
- Después de actualizar código: hacer build y subir archivos
- Después de cambios en SoftRestaurant: verificar sincronización
- Si se agregan nuevas columnas: actualizar script de sync y API
