# Sistema de Tracking - Bonifacio's Admin Dashboard

## 🎯 Qué se está Trackeando

### 1. **Login y Logout**
**Archivo:** `api/auth/login.php` y `api/auth/logout.php`
**Tabla:** `activity_log`

**Qué registra:**
- ✅ Timestamp de login
- ✅ Usuario que hizo login
- ✅ Timestamp de logout
- ✅ Usuario que hizo logout
- ✅ Descripción de la acción

**Ejemplo de datos:**
```
user_id: 1
action: "login"
description: "User misael logged in"
created_at: 2026-03-10 14:30:00
```

---

### 2. **Sesiones de Usuario**
**Archivo:** `api/tracking/session/start.php` y `api/tracking/session/end.php`
**Tabla:** `user_sessions`

**Qué registra:**
- ✅ Inicio de sesión (timestamp exacto)
- ✅ Fin de sesión (timestamp exacto)
- ✅ **Duración total en segundos**
- ✅ IP del usuario
- ✅ Navegador usado
- ✅ Sistema operativo
- ✅ Tipo de dispositivo (desktop/mobile/tablet)
- ✅ Token de sesión único

**Ejemplo de datos:**
```
id: 1
user_id: 1
started_at: 2026-03-10 14:30:00
ended_at: 2026-03-10 15:45:00
duration_seconds: 4500 (1 hora 15 minutos)
device_type: "desktop"
browser: "Chrome"
os: "Windows"
is_active: false
```

---

### 3. **Clicks del Usuario**
**Archivo:** `api/tracking/click.php`
**Tabla:** `user_clicks`

**Qué registra:**
- ✅ **Dónde hizo click** (elemento ID, clase, texto)
- ✅ **Coordenadas X,Y** del click
- ✅ Página donde ocurrió el click
- ✅ Timestamp exacto
- ✅ Tipo de evento (click, double-click, etc.)
- ✅ Metadata adicional

**Ejemplo de datos:**
```
id: 1
session_id: 1
user_id: 1
event_type: "click"
page_url: "/admin/applications"
element_id: "btn-view-application"
element_text: "Ver Solicitud"
click_x: 450
click_y: 320
timestamp: 2026-03-10 14:35:22
```

---

### 4. **Páginas Visitadas**
**Archivo:** `api/tracking/page-view.php`
**Tabla:** `page_views`

**Qué registra:**
- ✅ URL de la página
- ✅ Título de la página
- ✅ Tiempo en la página (segundos)
- ✅ Profundidad de scroll (%)
- ✅ Página de referencia
- ✅ Timestamp de entrada y salida

**Ejemplo de datos:**
```
id: 1
session_id: 1
user_id: 1
page_url: "/admin/dashboard"
page_title: "Dashboard - Bonifacio's"
time_on_page: 120 (2 minutos)
scroll_depth: 75%
viewed_at: 2026-03-10 14:30:00
```

---

### 5. **Actividad Reciente (General)**
**Tabla:** `activity_log`

**Qué registra:**
- ✅ Login/Logout
- ✅ Cambios de estado en solicitudes
- ✅ Mensajes enviados
- ✅ Cualquier acción importante

---

## 👥 Quién Puede Ver el Tracking

**Solo Misael y Manuel** tienen acceso a:
- Página de Tracking (`/admin/tracking`)
- Visualización de actividad de todos los usuarios
- Sesiones, clicks, y tiempo de uso

**Francisco y Santiago:**
- NO pueden ver el tracking
- Son redirigidos automáticamente si intentan acceder
- Su actividad SÍ es trackeada

---

## 📊 Dashboard de Tracking

**Ubicación:** `https://bonifaciossancarlos.com/admin/tracking`

**Muestra:**
1. **Total de Sesiones** - Cuántas veces han iniciado sesión todos
2. **Duración Promedio** - Tiempo promedio de sesión
3. **Total de Clicks** - Clicks totales registrados
4. **Usuarios Activos** - Cuántos tienen sesiones activas
5. **Actividad Reciente** - Últimas 20 acciones de todos los usuarios
6. **Actividad por Usuario** - Lista de usuarios con su count de sesiones

Al hacer click en un usuario, se pueden ver:
- Todas sus sesiones
- Páginas visitadas por sesión
- Clicks realizados
- Duración de cada sesión

---

## 🔄 Cómo Funciona el Tracking Automático

### Al hacer Login:
1. Se registra en `activity_log` (login)
2. Se inicia una sesión de tracking en `user_sessions`
3. Se guarda IP, navegador, OS, dispositivo

### Durante la Sesión:
1. Cada página visitada se registra en `page_views`
2. Cada click se registra en `user_clicks`
3. Se actualiza `last_activity` en la sesión

### Al hacer Logout:
1. Se registra en `activity_log` (logout)
2. Se calcula duración total de la sesión
3. Se marca la sesión como inactiva
4. Se guarda `ended_at` y `duration_seconds`

---

## 📁 Archivos PHP del Sistema

```
api/
├── auth/
│   ├── login.php          ← Registra login en activity_log
│   └── logout.php         ← Registra logout en activity_log
├── tracking/
│   ├── session/
│   │   ├── start.php      ← Inicia sesión de tracking
│   │   └── end.php        ← Termina sesión y calcula duración
│   ├── click.php          ← Registra clicks del usuario
│   ├── page-view.php      ← Registra páginas visitadas
│   └── analytics-summary.php  ← Resumen para dashboard
```

---

## 🗄️ Tablas de Base de Datos

### `user_sessions`
- Sesiones de tracking con inicio, fin, y duración

### `user_clicks`
- Clicks registrados con coordenadas y elemento

### `page_views`
- Páginas visitadas con tiempo y scroll

### `activity_log`
- Log general de actividades (login, logout, acciones)

---

## ✅ Estado del Sistema

- ✅ Login tracking - IMPLEMENTADO
- ✅ Logout tracking - IMPLEMENTADO
- ✅ Tiempo de sesión - IMPLEMENTADO (calcula automáticamente)
- ✅ Clicks del usuario - IMPLEMENTADO (coordenadas X,Y + elemento)
- ✅ Páginas visitadas - IMPLEMENTADO
- ✅ Dashboard solo para Misael y Manuel - IMPLEMENTADO
- ✅ Actividad en tiempo real - IMPLEMENTADO

**El sistema está 100% funcional y listo para producción.**
