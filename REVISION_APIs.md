# 🔍 Revisión de APIs PHP vs Documentación BD

**Fecha:** 12 de Marzo, 2026  
**Base de Datos:** `u979547041_bonifacios`

---

## ✅ APIs Correctas

### 1. **api/executive-report/get.php**
- ✅ Usa columnas correctas de `employee_files`
- ✅ JOIN correcto con `executive_report`
- ✅ Mapeo: `hire_date as start_date`, `created_at as application_date`
- ⚠️ **ADVERTENCIA**: Usa `emergency_contact` que NO existe en BD (debe agregarse con SQL)

### 2. **api/executive-report/create.php**
- ✅ Inserta en `executive_report` correctamente
- ✅ Columnas: name, position, main_amount, secondary_amount, application_date, start_date
- ✅ Todas las columnas existen en la tabla según documentación

### 3. **api/executive-report/update.php**
- ✅ Validación de campos correcta
- ✅ Field mapping: `start_date` → `hire_date`
- ✅ Maneja `employee_files` y `executive_report` correctamente
- ✅ Incluye `emergency_contact` en allowedFields

### 4. **api/employees/delete.php**
- ✅ DELETE correcto de `employee_files`
- ✅ Cascade funcionará con employee_reports si existe FK

### 5. **api/employees/upload-photo.php**
- ✅ UPDATE de columna `photo` en `employee_files`
- ✅ Validación de admin
- ✅ Ruta correcta `/api/uploads/employee-photos/`

### 6. **api/employees/accept-application.php**
- ✅ SELECT de `job_applications` correcto
- ✅ INSERT en `employee_files` con columnas correctas
- ✅ UPDATE de `job_applications` status

---

## ⚠️ APIs con Problemas Potenciales

### 1. **api/employees/update.php**
**Problema:** allowedFields limitados
```php
$allowedFields = ['name', 'age', 'gender', 'studies', 'email', 'phone', 
                  'address', 'position', 'experience', 'current_job', 'status', 'notes'];
```

**Falta:**
- `hire_date` (fecha de inicio de labores)
- `emergency_contact` (contacto de emergencia)
- `photo` (foto de perfil)

**Solución:** Agregar estos campos a allowedFields

---

### 2. **api/employees/get-reports.php, upload-report.php, delete-report.php, create-text-report.php**
**Problema:** Usan tabla `employee_reports` con estructura diferente

**En los archivos:**
- Columnas: `person_id`, `folder_path`, `report_name`, `report_type`, `file_path`, `text_content`, `created_by`

**En documentación (employee_reports):**
- Columnas: `employee_id`, `report_name`, `report_type`, `file_path`, `content`, `created_by`, `created_at`

**Diferencias:**
- ❌ `person_id` vs `employee_id`
- ❌ `folder_path` NO existe en documentación
- ❌ `text_content` vs `content`

**Solución:** 
- Decidir si agregar `folder_path` a la tabla
- Unificar nombres: `person_id` → `employee_id`, `text_content` → `content`

---

### 3. **api/employees/create-report.php**
**Estructura correcta según documentación:**
```php
INSERT INTO employee_reports (employee_id, report_name, report_type, file_path, content, created_by, created_at)
```
✅ Este archivo usa la estructura correcta

**Pero otros archivos de reportes (upload-report.php, etc) usan PDO y estructura diferente**

---

## ❌ Problemas Encontrados

### 1. **Inconsistencia en archivos de reportes**
**Problema:** Hay DOS implementaciones diferentes:

**Implementación 1 (PDO):** 
- `get-reports.php`
- `upload-report.php`
- `delete-report.php`
- `create-text-report.php`
- Usa: `person_id`, `folder_path`, `text_content`

**Implementación 2 (MySQLi):**
- `create-report.php`
- Usa: `employee_id`, `file_path`, `content`

**Recomendación:** Estandarizar a MySQLi (como el resto del proyecto)

---

## 📋 Columnas que Faltan en Tablas

### employee_files (según revisión)
- ✅ Todas las columnas base existen
- ⚠️ `emergency_contact` - **DEBE AGREGARSE**

### executive_report (según revisión)
- ✅ Todas las columnas necesarias existen
- ⚠️ Falta UNIQUE KEY en `name` - **DEBE AGREGARSE**

### employee_reports
- ⚠️ **TABLA DEBE CREARSE** con estructura documentada

---

## 🔧 Scripts SQL Necesarios

### ✅ Scripts YA EJECUTADOS (no duplicar)
- ~~Agregar emergency_contact~~ → **YA EXISTE**
- ~~UNIQUE KEY en executive_report~~ → **YA EXISTE**

### 🔧 Scripts PENDIENTES

### 1. Crear tabla employee_reports (si no existe)
```sql
CREATE TABLE IF NOT EXISTS `employee_reports` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `employee_id` int(11) NOT NULL,
  `report_name` varchar(255) NOT NULL,
  `report_type` enum('file','text') NOT NULL,
  `file_path` varchar(500) DEFAULT NULL,
  `content` text DEFAULT NULL,
  `created_by` int(11) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_employee_id` (`employee_id`),
  KEY `idx_created_by` (`created_by`),
  CONSTRAINT `fk_reports_employee` FOREIGN KEY (`employee_id`) REFERENCES `employee_files` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_reports_user` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. Insertar cantidades de empleados especiales
```sql
INSERT INTO executive_report (name, main_amount, secondary_amount) 
VALUES 
    ('Yareli', 95500, 14500),
    ('Jesús', 50900, 7500),
    ('Arnulfo', 43900, 4200),
    ('John', 41850, 5920),
    ('Jessica', 38950, 2950),
    ('David', 1500, 0)
ON DUPLICATE KEY UPDATE 
    main_amount = VALUES(main_amount),
    secondary_amount = VALUES(secondary_amount);
```

---

## 🎯 Recomendaciones de Corrección

### Alta Prioridad
1. ✅ Ejecutar los 4 scripts SQL arriba
2. ⚠️ Actualizar `api/employees/update.php` para incluir `hire_date` y `emergency_contact`
3. ⚠️ Decidir qué hacer con archivos de reportes (get-reports.php, upload-report.php, etc)

### Media Prioridad
4. Estandarizar todos los archivos de reportes a MySQLi
5. Verificar que todas las rutas de archivos usen `/api/uploads/`

### Baja Prioridad
6. Agregar más validaciones de tipos de datos
7. Mejorar mensajes de error para debugging

---

## 📊 Resumen

| Categoría | Cantidad | Estado |
|-----------|----------|--------|
| APIs Correctas | 6 | ✅ |
| APIs con Advertencias | 2 | ⚠️ |
| APIs con Problemas | 2 | ❌ |
| Scripts SQL Pendientes | 4 | 🔧 |

**Conclusión:** La mayoría de las APIs están correctas. Los problemas principales son:
1. Columna `emergency_contact` faltante
2. Inconsistencia en implementación de reportes
3. Scripts SQL pendientes de ejecutar
