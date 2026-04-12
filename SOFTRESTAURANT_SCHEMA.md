# 📊 SoftRestaurant 8.0 - Esquema de Base de Datos

## 🔐 Credenciales de Conexión

**Red:** Tailscale VPN  
**Host/IP:** `100.84.227.35`  
**Instancia:** `NATIONALSOFT` (instancia nombrada)  
**Puerto:** `1433` (por defecto)  
**Base de Datos:** `softrestaurant8pro`  
**Usuario:** `usuario_web` (solo lectura)  
**Contraseña:** `Filipenses4:8@`  

### Configuración de Conexión PHP (PDO):
```php
$server = "100.84.227.35\NATIONALSOFT";
$database = "softrestaurant8pro";
$user = "usuario_web";
$pass = "Filipenses4:8@";

$dsn = "sqlsrv:Server=$server;Database=$database;Encrypt=false;TrustServerCertificate=true";
$conn = new PDO($dsn, $user, $pass);
```

**IMPORTANTE:** Desactivar cifrado SSL (`Encrypt=false`) y confiar en certificado (`TrustServerCertificate=true`) porque SoftRestaurant 8.0 es versión clásica.

---

## 📋 Tablas Principales

### 💰 VENTAS

#### `cheques` - Totales de Ventas
Contiene el resumen de cada venta/cheque.

**Campos principales:**
- `idcheque` - ID único del cheque
- `folio` - Número de folio
- `fecha` - Fecha del cheque
- `hora` - Hora del cheque
- `total` - Total de la venta
- `subtotal` - Subtotal antes de impuestos
- `impuesto` - Impuesto aplicado
- `propina` - Propina
- `descuento` - Descuento aplicado
- `idmesero` - ID del mesero que atendió
- `idmesa` - ID de la mesa
- `numpersonas` - Número de personas
- `estatus` - Estado del cheque (0=abierto, 1=cerrado, etc.)
- `formapago` - Forma de pago

#### `cheqdet` - Detalle de Productos Vendidos
Contiene cada producto vendido en un cheque.

**Campos principales:**
- `idcheque` - Relación con tabla cheques
- `idproducto` - ID del producto
- `cantidad` - Cantidad vendida
- `precio` - Precio unitario
- `importe` - Total del producto (cantidad × precio)
- `descuento` - Descuento aplicado al producto
- `modificadores` - Modificadores del producto

---

### 👥 PERSONAL

#### `usuarios` - Usuarios del Sistema
Todos los empleados con acceso al sistema.

**Campos principales:**
- `idusuario` - ID único del usuario
- `nombre` - Nombre completo
- `login` - Usuario de acceso
- `password` - Contraseña
- `perfil` - **Puesto/Rol del empleado**
- `activo` - Si está activo (1) o inactivo (0)
- `email` - Correo electrónico
- `telefono` - Teléfono

#### `meseros` - Meseros Específicos
Información específica de meseros.

**Campos principales:**
- `idmesero` - ID único del mesero
- `nombre` - Nombre del mesero
- `comision` - Porcentaje de comisión
- `activo` - Si está activo
- `idusuario` - Relación con tabla usuarios

---

### ⏰ ASISTENCIAS

#### `registroasistencias` - Control de Entradas/Salidas
Registros de clock in/clock out del personal.

**Campos principales:**
- `idempleado` - ID del empleado (relación con usuarios)
- `entrada` - Fecha y hora de entrada (DATETIME)
- `salida` - Fecha y hora de salida (DATETIME)
- `fecha` - Fecha del registro
- `turno` - Turno asignado
- `observaciones` - Notas adicionales

---

### 🍽️ MENÚ

#### `productos` - Productos del Menú
Todos los productos/platillos disponibles.

**Campos principales:**
- `idproducto` - ID único del producto
- `descripcion` - Nombre del producto
- `precio1` - Precio principal
- `precio2` - Precio alternativo (si aplica)
- `precio3` - Precio alternativo (si aplica)
- `idgrupo` - ID del grupo/categoría
- `activo` - Si está activo
- `costo` - Costo del producto
- `tiempo_preparacion` - Tiempo estimado de preparación
- `impresora` - Estación de impresión

#### `grupos` - Categorías de Productos
Categorías del menú (Entradas, Platos Fuertes, Bebidas, etc.)

**Campos principales:**
- `idgrupo` - ID único del grupo
- `descripcion` - Nombre de la categoría
- `orden` - Orden de visualización

---

### 🪑 MESAS

#### `mesas` - Control de Mesas
Estado y configuración de mesas.

**Campos principales:**
- `idmesa` - ID único de la mesa
- `numero` - Número de mesa
- `nombre` - Nombre de la mesa
- `capacidad` - Capacidad de personas
- `estatus_ocupacion` - **0 = Libre, 1 = Ocupada**
- `area` - Área/sección del restaurante
- `posicion_x` - Posición X en mapa
- `posicion_y` - Posición Y en mapa

---

## 🔗 Relaciones Importantes

### Ventas Completas:
```sql
SELECT 
    c.folio,
    c.fecha,
    c.total,
    m.nombre as mesero,
    ms.numero as mesa,
    cd.cantidad,
    p.descripcion as producto,
    cd.precio
FROM cheques c
LEFT JOIN meseros m ON c.idmesero = m.idmesero
LEFT JOIN mesas ms ON c.idmesa = ms.idmesa
LEFT JOIN cheqdet cd ON c.idcheque = cd.idcheque
LEFT JOIN productos p ON cd.idproducto = p.idproducto
WHERE c.estatus = 1  -- Solo cheques cerrados
```

### Asistencias del Día:
```sql
SELECT 
    u.nombre,
    u.perfil as puesto,
    ra.entrada,
    ra.salida,
    DATEDIFF(MINUTE, ra.entrada, ra.salida) as minutos_trabajados
FROM registroasistencias ra
INNER JOIN usuarios u ON ra.idempleado = u.idusuario
WHERE CAST(ra.fecha AS DATE) = CAST(GETDATE() AS DATE)
```

### Mesas Ocupadas:
```sql
SELECT 
    m.numero,
    m.nombre,
    c.folio,
    c.total,
    ms.nombre as mesero,
    c.numpersonas
FROM mesas m
INNER JOIN cheques c ON m.idmesa = c.idmesa
INNER JOIN meseros ms ON c.idmesero = ms.idmesero
WHERE m.estatus_ocupacion = 1
  AND c.estatus = 0  -- Cheque abierto
```

---

## 📊 Queries Útiles para Dashboard

### Ventas del Día:
```sql
SELECT 
    COUNT(*) as total_cheques,
    SUM(total) as venta_total,
    AVG(total) as ticket_promedio,
    SUM(numpersonas) as total_comensales
FROM cheques
WHERE CAST(fecha AS DATE) = CAST(GETDATE() AS DATE)
  AND estatus = 1
```

### Top Productos Vendidos:
```sql
SELECT TOP 10
    p.descripcion,
    SUM(cd.cantidad) as cantidad_vendida,
    SUM(cd.importe) as total_vendido
FROM cheqdet cd
INNER JOIN productos p ON cd.idproducto = p.idproducto
INNER JOIN cheques c ON cd.idcheque = c.idcheque
WHERE CAST(c.fecha AS DATE) = CAST(GETDATE() AS DATE)
  AND c.estatus = 1
GROUP BY p.descripcion
ORDER BY total_vendido DESC
```

### Rendimiento de Meseros:
```sql
SELECT 
    m.nombre,
    COUNT(c.idcheque) as num_cheques,
    SUM(c.total) as venta_total,
    AVG(c.total) as ticket_promedio,
    SUM(c.propina) as propinas
FROM meseros m
INNER JOIN cheques c ON m.idmesero = c.idmesero
WHERE CAST(c.fecha AS DATE) = CAST(GETDATE() AS DATE)
  AND c.estatus = 1
GROUP BY m.nombre
ORDER BY venta_total DESC
```

### Empleados Presentes:
```sql
SELECT 
    u.nombre,
    u.perfil,
    ra.entrada,
    ra.salida,
    CASE 
        WHEN ra.salida IS NULL THEN 'Presente'
        ELSE 'Salió'
    END as estado
FROM registroasistencias ra
INNER JOIN usuarios u ON ra.idempleado = u.idusuario
WHERE CAST(ra.fecha AS DATE) = CAST(GETDATE() AS DATE)
ORDER BY ra.entrada DESC
```

---

## 🎯 Casos de Uso para Dashboard

### 1. Ventas en Tiempo Real
- Consultar `cheques` cada 30 segundos
- Mostrar total del día actualizado
- Comparar con mismo día semana/mes anterior

### 2. Estado de Mesas
- Consultar `mesas` con `estatus_ocupacion`
- Mostrar mapa visual de ocupación
- Tiempo promedio de ocupación

### 3. Control de Asistencia
- Consultar `registroasistencias` del día
- Detectar empleados que faltan
- Alertas de llegadas tarde
- Empleados que se fueron temprano

### 4. Análisis de Productos
- Top productos del día/semana/mes
- Productos con bajo movimiento
- Análisis de rentabilidad

### 5. Rendimiento de Personal
- Ventas por mesero
- Propinas generadas
- Ticket promedio por mesero
- Comensales atendidos

---

## ⚠️ Notas Importantes

1. **Instancia Nombrada:** Siempre usar `100.84.227.35\NATIONALSOFT`, no solo la IP
2. **Cifrado SSL:** Desactivar con `Encrypt=false` y `TrustServerCertificate=true`
3. **Usuario de Solo Lectura:** `usuario_web` solo tiene permisos SELECT
4. **Zona Horaria:** Verificar zona horaria del servidor SQL Server
5. **Estatus de Cheques:** 0=Abierto, 1=Cerrado, verificar otros valores posibles
6. **Formas de Pago:** Mapear códigos de `formapago` a nombres legibles

---

## 🔄 Sincronización Recomendada

**Tiempo Real (cada 30 segundos):**
- Ventas del día (`cheques` WHERE fecha = HOY)
- Estado de mesas (`mesas.estatus_ocupacion`)
- Asistencias activas (`registroasistencias` WHERE salida IS NULL)

**Cada 5 minutos:**
- Detalle de productos vendidos (`cheqdet`)
- Rendimiento de meseros

**Cada hora:**
- Productos completos (`productos`)
- Usuarios/empleados (`usuarios`, `meseros`)

**Una vez al día:**
- Grupos/categorías (`grupos`)
- Configuración de mesas (`mesas` - estructura)

---

Última actualización: 2026-04-08
