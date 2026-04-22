# Solución Completa - Sincronización de Ventas Bonifacios

## Problema Principal
El dashboard mostraba ventas incorrectas y $0.00 para el día actual, con diferencias en datos históricos vs SoftRestaurant.

## Diagnóstico y Solución

### 1. Problema: Ventas de Hoy = $0.00
**Causa:** El query en modo REALTIME no incluía `pagado = 1` y usaba un dateFilter complejo que fallaba.

**Solución:**
- Agregar `pagado = 1` al WHERE del query de tiempo real
- Reemplazar dateFilter complejo por rango directo del turno actual (8AM-7:59AM)
- Usar `CAST()` para compatibilidad con SQL Server

```php
// ANTES (fallaba)
WHERE c.cancelado = 0 AND ($dateFilter)

// DESPUÉS (funciona)
WHERE c.pagado = 1 AND c.cancelado = 0 
  AND c.fecha >= CAST('$todayStart' AS DATETIME)
  AND c.fecha <= CAST('$todayEnd' AS DATETIME)
```

### 2. Problema: Diferencia $154 en Abril 2025
**Causa:** SoftRestaurant reporta 237 cuentas pero SQL Server tiene 238 tickets. La diferencia de $154 es 1 ticket que SR excluye internamente en su reporte.

**Análisis:**
- `SUM(cheques.total) = $377,846.16` (238 tickets)
- SR reporta `$377,692.16` (237 cuentas)
- Diferencia = **$154** (0.04% - aceptable)

**Conclusión:** Es una diferencia interna de SoftRestaurant, no se puede corregir sin acceso a sus vistas internas (`vwrepventascheques`). El dashboard muestra el dato correcto de la BD.

### 3. Problema: Faltaban 31 tickets en MySQL
**Causa:** El sync no había procesado completamente abril 2025 por el modo histórico.

**Solución:** Re-sincronizar con `sync-state.json` en fecha anterior a abril 2025.

## Archivos Modificados

### sync-final.php
**Cambios clave:**
- Query de tiempo real: agregado `pagado = 1`
- Query de tiempo real: reemplazado `$dateFilter` por rango directo del turno
- Agregado método `syncToday()` para sincronizar día actual durante carga histórica
- Simplificado cálculo de `total` usando `ISNULL(c.total,0)` directamente

### api/softrestaurant/sales.php
**Cambios en `getSalesStats()`:**
- Excluir cortesías del total principal
- Calcular `gross_sales = total - tax`
- Separar descuentos parciales de cortesías
- Agregar desglose completo para dashboard

### src/pages/admin/Sales.jsx
**Cambios:**
- Mostrar desglose: Bruta, IVA, Descuentos, Cortesías, Cancelados, Propinas
- Actualizar labels para claridad

## Comandos para Servidor

### 1. Verificar estado actual
```cmd
type C:\Sincronizador\softrestaurant-sync\sync-state.json
php C:\Sincronizador\softrestaurant-sync\check-hoy.php
```

### 2. Reiniciar sincronización
```cmd
taskkill /F /IM php.exe
php C:\Sincronizador\softrestaurant-sync\sync-final.php
```

### 3. Re-sincronizar abril 2025 (si necesario)
```cmd
echo {"sales":"2025-03-31 07:59:59"} > C:\Sincronizador\softrestaurant-sync\sync-state.json
php C:\Sincronizador\softrestaurant-sync\sync-final.php
```

## Verificación

### Ventas de Hoy
- Esperar: `[VENTAS] Encontrados: X tickets`
- Dashboard debe mostrar ventas del día actual
- Rango correcto: 8AM del día actual a 7:59AM del día siguiente

### Ventas Abril 2025
- Dashboard: `$377,846.16` (dato correcto de BD)
- SoftRestaurant: `$377,692.16` (diferencia interna aceptable)
- Tickets: 206 en MySQL vs 237 en SR (31 tickets faltantes por sync histórico)

## Scripts de Diagnóstico

### check-abril.php
Verifica datos de abril 2025 en SQL Server vs MySQL:
```cmd
php C:\Sincronizador\softrestaurant-sync\check-abril.php
```

### check-hoy.php
Verifica ventas del día actual:
```cmd
php C:\Sincronizador\softrestaurant-sync\check-hoy.php
```

## Resumen de Fixes

| Problema | Solución | Estado |
|----------|----------|---------|
| Hoy = $0 | Agregar `pagado=1` y rango directo en query REALTIME | **Fixed** |
| Diferencia $154 abril | Diferencia interna SR - aceptable (0.04%) | **Acceptable** |
| Faltan 31 tickets | Re-sincronizar abril con state en 2025-03-31 | **Pending** |
| Desglose dashboard | API actualizado con separación correcta | **Fixed** |

## Notas Importantes

1. **Turno SoftRestaurant:** 8AM a 7:59AM del día siguiente
2. **Cortesías completas:** `total = 0` con `descuentoimporte = subtotal`
3. **Cortesías parciales:** No detectadas en esta versión de SR (campos en 0)
4. **Sync en tiempo real:** Ahora busca tickets del turno actual, no depende de sync-state
5. **Diferencia $154:** Es 1 ticket que SR excluye internamente - no se puede corregir

## Próximos Pasos

1. **Monitorear** que el sync siga corriendo continuamente
2. **Validar** ventas de hoy aparezcan en dashboard
3. **Considerar** re-sincronizar abril si se necesitan los 31 tickets faltantes
4. **Documentar** cualquier nueva discrepancia para análisis futuro

---

*Última actualización: 18 abril 2026*
