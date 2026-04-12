# Documentación de Base de Datos - Bonifacio's Restaurant

## 📋 **Estado Actual de Tablas en phpMyAdmin (18 tablas)**

### **Tablas Existentes:**

#### 1. **activity_log**
- Registra la actividad y acciones de los usuarios dentro del sistema
- Campos: id (PK), user_id, action, entity_type, entity_id, description, ip_address, user_agent, created_at

#### 2. **analytics**
- Almacena métricas y valores analíticos del sistema
- Campos: id (PK), metric_type, metric_value, date, metadata, created_at

#### 3. **chat_conversations**
- Gestiona las salas o hilos de conversación de chat entre usuarios
- Campos: id (PK), user1_id, user2_id, last_message_at, created_at

#### 4. **chat_messages**
- Almacena los mensajes individuales enviados dentro de las conversaciones de chat
- Campos: id (PK), conversation_id, sender_id, message_type, content, file_url, file_name, file_size, is_read, created_at

#### 5. **employee_files**
- Directorio extenso y expediente de los empleados registrados
- Campos: id (PK), application_id, name, age, gender, studies, email, phone, address, position, experience, current_job, photo, id_photo, emergency_contact, employee_number, estado_civil, idiomas, accesos, sueldo, prestaciones, tipo_sangre, alergias, enfermedades, status, hire_date, notes, created_at, updated_at, sort_order

#### 6. **employee_reports**
- Reportes o archivos adjuntos vinculados al expediente de un empleado
- Campos: id (PK), employee_id, report_name, report_type, file_path, content, photo_path, created_by, created_at

#### 7. **executive_report**
- Reportes ejecutivos o métricas principales de desempeño/candidatos
- Campos: id (PK), name, main_amount, secondary_amount, created_at, updated_at, application_date, start_date, email, phone, age, gender, address, estudios, experience, current_job, photo, status, hire_date, notes

#### 8. **job_applications**
- Registros de postulaciones o solicitudes de empleo
- Campos: id (PK), name, studies, email, phone, current_job, position, experience, address, no_studies, no_email, no_current_job, status, notes, reviewed_by, reviewed_at, created_at, updated_at, age, gender, estudios, photo_url
- 📸 **Fotos almacenadas en:** `/public_html/uploads/applications/` (URL relativa guardada en `photo_url`)
- Al aceptar una solicitud (`status = 'Aceptada'`), se copia `photo_url` automáticamente al campo `photo` de `executive_report`

#### 9. **menu_categories** ✅ **(YA EXISTE)**
- Clasificación o agrupación para el sistema de menús
- Campos: id (PK), slug, icon, label, description, type, sort_order, is_active, created_at

#### 10. **menu_items** ✅ **(YA EXISTE)**
- Detalle de los elementos o platillos que componen las categorías del menú
- Campos: id (PK), category_id, name, description, price, unit, image_url, sort_order, is_active, created_at, updated_at

#### 11. **messages**
- Sistema de mensajería interna directa entre usuarios
- Campos: id (PK), sender_id, recipient_id, subject, message, is_read, read_at, parent_message_id, created_at

#### 12. **onsite_status** ✅ **(YA EXISTE)**
- Registro del estado de presencia (en sitio o fuera) de los usuarios/empleados
- Campos: id (PK), user_id, is_onsite, updated_at

#### 13. **page_views**
- Métricas de navegación registrando las vistas a las páginas del sistema
- Campos: id (PK), session_id, user_id, page_url, page_title, referrer, time_on_page, scroll_depth, viewed_at, left_at

#### 14. **site_visitors**
- Información detallada sobre los visitantes del sitio y su dispositivo/ubicación
- Campos: id (PK), visitor_id, ip_address, user_agent, device_type, browser, os, screen_width, screen_height, language, country, city, region, page_url, page_title, referrer, utm_source, utm_medium, utm_campaign, is_new_visitor, visited_at

#### 15. **users**
- Tabla principal de usuarios del sistema y sus credenciales de acceso
- Campos: id (PK), username, password, full_name, email, role, avatar, is_active, last_login, created_at, updated_at, profile_photo

#### 16. **user_clicks**
- Analíticas granulares de interacciones registrando clics específicos en elementos de la UI
- Campos: id (PK), session_id, user_id, event_type, page_url, element_id, element_class, element_text, click_x, click_y, timestamp, metadata

#### 17. **user_sessions**
- Registro y control de las sesiones activas e históricas de los usuarios
- Campos: id (PK), user_id, session_token, ip_address, user_agent, device_type, browser, os, country, city, started_at, last_activity, ended_at, duration_seconds, is_active

#### 18. **user_skills** ✅ **(YA EXISTE)**
- Almacena las habilidades, destrezas o competencias asociadas a los perfiles de los usuarios o empleados
- Campos: id (PK), user_id, icon, skill, description, sort_order, is_active, created_at

---

## 🆕 **Única Tabla Faltante por Crear**

### **event_quotes** - Solicitudes de Cotización (NUEVO)
```sql
CREATE TABLE IF NOT EXISTS event_quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_date DATE NOT NULL,
    guests INT NOT NULL,
    notes TEXT,
    location VARCHAR(255),
    status ENUM('pending', 'contacted', 'quoted', 'confirmed', 'cancelled') DEFAULT 'pending',
    quote_amount DECIMAL(10,2),
    assigned_to INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## **Configuración Requerida**

### **1. Crear Tabla event_quotes**
Solo necesitas ejecutar el SQL de arriba para crear la tabla `event_quotes`.

### **2. Configurar Roles de Usuario:**
```sql
-- Administradores (pueden crear, editar, eliminar)
UPDATE users SET role = 'admin' WHERE LOWER(username) IN ('manuel', 'misael');

-- Viewers (solo pueden ver y cambiar estado)
UPDATE users SET role = 'viewer' WHERE LOWER(username) IN ('francisco', 'santiago');

-- Actualizar email de Misael
UPDATE users SET email = 'Misaelmevi@gmail.com' WHERE LOWER(username) = 'misael';

-- Verificar configuración
SELECT id, username, email, role, is_active FROM users WHERE username IN ('manuel', 'misael', 'francisco', 'santiago');
```

### **3. Verificar Roles de Usuario**
```sql
SELECT id, username, email, role, is_active FROM users;
```

### **4. Configurar Zona Horaria en PHP**
Los archivos PHP ya tienen configurada la zona horaria:
```php
date_default_timezone_set('America/Hermosillo');
```

---

## 📊 **Relaciones entre Tablas**

### **Diagrama de Relaciones:**
```
users (1) ←→ (N) messages
users (1) ←→ (N) applications
users (1) ←→ (N) chat_messages
users (1) ←→ (1) onsite_status
users (1) ←→ (N) user_skills
users (1) ←→ (N) activity_log

menu_categories (1) ←→ (N) menu_items

event_quotes (N) ←→ (1) users (assigned_to)
```

---

## 🚀 **Sistema de Cotizaciones - Flujo Completo**

### **1. Frontend (Homepage)**
- Formulario envía a `/api/quotes/submit.php`
- Validación en React
- Mensajes de estado

### **2. Backend (PHP)**
- `submit.php` - Recibe y guarda cotización
- Envía emails a admins/viewers
- Email de confirmación al cliente

### **3. Administración**
- `/admin/quotes` - Vista completa
- CRUD completo para admins
- Solo lectura para viewers
- Estadísticas avanzadas

### **4. Notificaciones**
- Email automático con enlace directo
- Contador en dashboard
- Botón en navbar

---

## 📝 **Datos de Ejemplo**

### **Categorías de Menú:**
```sql
INSERT INTO menu_categories (slug, icon, label, description, type, sort_order) VALUES
('entradas', '🥗', 'Entradas', 'Sabores frescos para comenzar', 'menu', 1),
('platos-fuertes', '🍽️', 'Platos Fuertes', 'Nuestras especialidades', 'menu', 2),
('postres', '🍰', 'Postres', 'Dulces finales', 'menu', 3),
('bebidas', '🍸', 'Bebidas', 'Barra y coctelería', 'event', 1);
```

### **Platillos de Ejemplo:**
```sql
INSERT INTO menu_items (category_id, name, description, price, unit, sort_order) VALUES
(1, 'Ensalada César', 'Lechuga romana, parmesano, crutones, aderezo César', 180.00, 'porción', 1),
(2, 'Filete de Res', 'Filete de 200g con guarniciones', 380.00, 'plato', 1);
```

---

## ✅ **Checklist de Implementación**

- [ ] Crear tabla `event_quotes` en phpMyAdmin
- [ ] Actualizar email de Misael
- [ ] Probar formulario de cotización
- [ ] Verificar emails de notificación
- [ ] Probar panel de administración
- [ ] Verificar permisos por rol
- [ ] Probar estadísticas

---

## 📧 **Configuración de Emails**

### **Headers Usados:**
```php
$headers = "From: no-reply@bonifaciossancarlos.com\r\n";
$headers .= "Reply-To: no-reply@bonifaciossancarlos.com\r\n";
$headers .= "X-Mailer: PHP/" . phpversion();
```

### **Destinatarios:**
- **Admins y Viewers**: Notificación de nueva cotización
- **Cliente**: Confirmación de solicitud recibida

---

## 🔐 **Seguridad**

### **Autenticación:**
- `requireAuth()` en todos los endpoints
- Validación de roles en CRUD
- Session management

### **Validación:**
- Sanitización de inputs
- Validación de campos requeridos
- Escapado de SQL injection

---

## 📈 **Estadísticas Implementadas**

### **Cotizaciones:**
- Total de solicitudes
- Pendientes/Confirmadas/Canceladas
- Tasa de conversión
- Tipos de evento más populares
- Estadísticas mensuales
- Ingresos proyectados

### **Usuarios:**
- Total de usuarios
- Sesiones activas
- Tracking de páginas

---

## 🌐 **Endpoints API**

### **Cotizaciones:**
- `POST /api/quotes/submit.php` - Crear cotización
- `GET /api/quotes/list.php` - Listar con estadísticas
- `POST /api/quotes/create.php` - Crear (admin)
- `POST /api/quotes/update.php?id=X` - Actualizar (admin)
- `POST /api/quotes/delete.php?id=X` - Eliminar (admin)

### **Otros:**
- `GET/POST /api/users/onsite-status.php` - Estado Manuel
- `POST /api/messages/send.php` - Enviar mensaje
- `GET /api/chat/notifications.php` - Notificaciones

---

## 📅 **Última Actualización**

**Fecha:** 18 de marzo de 2026  
**Versión:** 1.0  
**Estado:** ✅ **Casi completo - Solo falta crear 1 tabla**

---

## 🎯 **Resumen Final**

### **Base de Datos Actual:**
- ✅ **18 tablas existentes** (todas funcionales)
- ✅ **4 tablas clave ya creadas**: menu_categories, menu_items, onsite_status, user_skills
- ⚠️ **1 tabla faltante**: event_quotes (para cotizaciones)

### **Para Completar el Sistema:**
1. **Ejecutar SQL de `event_quotes`** en phpMyAdmin
2. **Actualizar email de Misael**
3. **¡Listo!** Sistema completo y funcional

### **Sistema de Cotizaciones:**
- ✅ Formulario en homepage (email en lugar de WhatsApp)
- ✅ Panel de administración completo
- ✅ Botón en navbar y tarjeta en dashboard
- ✅ Estadísticas avanzadas
- ✅ Permisos por rol
- ✅ Notificaciones por email
