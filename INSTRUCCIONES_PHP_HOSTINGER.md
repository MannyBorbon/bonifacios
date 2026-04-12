# 🚀 Instrucciones para Desplegar Dashboard con PHP en Hostinger

## ✅ Tu configuración actual:
- **Hosting:** Hostinger (compartido)
- **Backend:** PHP + MySQL
- **Frontend:** React (compilado a HTML/CSS/JS)

---

## 📋 Pasos de Instalación

### **1. Base de Datos en phpMyAdmin**

1. **Accede a phpMyAdmin** en Hostinger
2. **Selecciona tu base de datos:** `u979547041_bonifacios`
3. **Importa el archivo SQL:**
   ```
   database/bonifacios_db_sin_create.sql
   ```

### **2. Configurar Backend PHP**

1. **Edita el archivo de configuración:**
   ```
   api/config/database.php
   ```

2. **Credenciales ya configuradas:**
   ```php
   define('DB_HOST', 'localhost');
   define('DB_USER', 'bonifacios1');
   define('DB_PASS', 'Filipenses4:8@');
   define('DB_NAME', 'u979547041_bonifacios');
   ```
   ✅ Ya están configuradas en el archivo

### **3. Subir Archivos a Hostinger**

#### **A) Subir Backend PHP:**
```
Sube la carpeta api/ completa a:
public_html/api/

Estructura final:
public_html/
├── api/
│   ├── config/
│   │   └── database.php
│   ├── auth/
│   │   └── login.php
│   ├── applications/
│   │   ├── submit.php
│   │   ├── list.php
│   │   └── update-status.php
│   ├── messages/
│   │   ├── inbox.php
│   │   ├── send.php
│   │   ├── unread-count.php
│   │   └── users.php
│   └── analytics/
│       └── dashboard.php
```

#### **B) Subir Frontend:**
```
1. En tu computadora, ejecuta:
   npm run build

2. Sube el contenido de la carpeta dist/ a:
   public_html/

Estructura final:
public_html/
├── index.html
├── assets/
│   ├── index-[hash].css
│   └── index-[hash].js
├── .htaccess
└── api/ (del paso anterior)
```

### **4. Verificar Funcionamiento**

1. **Prueba el API:**
   ```
   https://bonifaciossancarlos.com/api/analytics/dashboard.php
   ```
   Debería dar error 401 (Unauthorized) - eso es correcto

2. **Prueba el sitio:**
   ```
   https://bonifaciossancarlos.com
   ```

3. **Prueba el login:**
   ```
   https://bonifaciossancarlos.com/admin/login
   
   Usuario: misael
   Contraseña: Filipenses4:8@
   ```

---

## 🔐 Usuarios del Dashboard

| Usuario   | Contraseña       | Email                              | Rol     |
|-----------|------------------|------------------------------------|---------|
| misael    | Filipenses4:8@   | misael@bonifaciossancarlos.com    | Admin   |
| francisco | Filipenses4:8@   | francisco@bonifaciossancarlos.com | Admin   |
| santiago  | Filipenses4:8@   | santiago@bonifaciossancarlos.com  | Manager |
| manuel    | Filipenses4:8@   | manuel@bonifaciossancarlos.com    | Admin   |

---

## 📁 Estructura de Archivos PHP

### **Endpoints Disponibles:**

#### **Autenticación:**
- `POST /api/auth/login.php` - Iniciar sesión

#### **Solicitudes de Empleo:**
- `POST /api/applications/submit.php` - Enviar solicitud (público)
- `GET /api/applications/list.php` - Listar solicitudes (requiere login)
- `POST /api/applications/update-status.php` - Actualizar estado (requiere login)

#### **Mensajes:**
- `GET /api/messages/inbox.php` - Bandeja de entrada
- `POST /api/messages/send.php` - Enviar mensaje
- `GET /api/messages/unread-count.php` - Contador de no leídos
- `GET /api/messages/users.php` - Lista de usuarios

#### **Analytics:**
- `GET /api/analytics/dashboard.php` - Datos del dashboard

---

## 🔧 Solución de Problemas

### **Error: "Database connection failed"**
- Verifica las credenciales en `api/config/database.php`
- Asegúrate que el usuario MySQL tenga permisos

### **Error: "Unauthorized" en todas las páginas admin**
- Las sesiones PHP deben estar habilitadas en Hostinger
- Verifica que `session_start()` funcione

### **Error 404 en rutas del admin**
- Verifica que `.htaccess` esté en `public_html/`
- Asegúrate que `mod_rewrite` esté habilitado

### **CORS Error**
- Ya está configurado en `api/config/database.php`
- Si persiste, contacta soporte de Hostinger

---

## ✨ Funcionalidades del Dashboard

✅ **Dashboard Principal:**
- Estadísticas en tiempo real
- Gráficos de solicitudes
- Actividad reciente

✅ **Gestión de Solicitudes:**
- Ver todas las solicitudes
- Filtrar por estado
- Actualizar estado (pendiente, en revisión, aceptado, rechazado)
- Agregar notas

✅ **Sistema de Mensajería:**
- Enviar mensajes entre usuarios admin
- Bandeja de entrada/enviados
- Contador de no leídos

✅ **Formulario Público:**
- Formulario de empleo en `/bolsa-de-trabajo`
- Se guarda en base de datos
- Envía notificación por WhatsApp

---

## 🎉 ¡Todo Listo!

Tu dashboard está completamente funcional con:
- ✅ Backend PHP (funciona en hosting compartido)
- ✅ Base de datos MySQL
- ✅ Frontend React compilado
- ✅ Sistema de autenticación
- ✅ Gestión completa de solicitudes
- ✅ Mensajería interna

**No necesitas Node.js ni nada adicional. Todo funciona con PHP + MySQL que ya tienes en Hostinger.**
