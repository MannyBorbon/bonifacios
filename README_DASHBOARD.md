# Dashboard Administrativo - Bonifacio's Restaurant

## 🚀 Sistema Completo Implementado

### **Características del Dashboard**

✅ **Autenticación Segura**
- Login con JWT tokens
- Protección de rutas administrativas
- 4 usuarios predefinidos: Misael, Francisco, Santiago, Manuel

✅ **Dashboard de Estadísticas**
- Gráficos de solicitudes de empleo (últimos 7 días)
- Gráficos de puestos más solicitados
- Estadísticas en tiempo real
- Actividad reciente del sistema

✅ **Gestión de Solicitudes de Empleo**
- Ver todas las solicitudes
- Filtrar por estado (pendiente, en revisión, aceptado, rechazado)
- Descargar solicitudes en PDF
- Click en teléfono para llamar directamente
- Actualizar estado de solicitudes
- Agregar notas

✅ **Sistema de Mensajería Interno**
- Bandeja de entrada y enviados
- Enviar mensajes entre usuarios
- Contador de mensajes no leídos
- Notificaciones en tiempo real

✅ **Botón Admin en Footer**
- Acceso discreto desde la página principal

---

## 📋 Instrucciones de Instalación

### **1. Base de Datos (phpMyAdmin)**

1. Abre phpMyAdmin
2. Importa el archivo: `database/bonifacios_db.sql`
3. Esto creará:
   - Base de datos: `bonifacios_restaurant`
   - Tablas: users, job_applications, messages, analytics, activity_log
   - 4 usuarios admin predefinidos

### **2. Backend (Servidor Node.js)**

```bash
# Navega a la carpeta del servidor
cd server

# Instala dependencias
npm install

# Copia el archivo de configuración
copy .env.example .env

# Edita .env y configura tu base de datos:
# DB_HOST=localhost
# DB_USER=root
# DB_PASSWORD=tu_contraseña
# DB_NAME=bonifacios_restaurant
# JWT_SECRET=cambia-esto-por-algo-seguro

# Inicia el servidor
npm start

# O en modo desarrollo con auto-reload:
npm run dev
```

El servidor estará corriendo en: `http://localhost:3001`

### **3. Frontend (React)**

```bash
# En la raíz del proyecto
# Copia el archivo de configuración
copy .env.example .env

# Las dependencias ya están instaladas, pero si necesitas:
npm install

# Inicia el servidor de desarrollo
npm run dev
```

El frontend estará corriendo en: `http://localhost:5173`

---

## 👥 Usuarios Predefinidos

| Usuario   | Contraseña      | Rol     |
|-----------|-----------------|---------|
| misael    | bonifacios2024  | Admin   |
| francisco | bonifacios2024  | Admin   |
| santiago  | bonifacios2024  | Manager |
| manuel    | bonifacios2024  | Admin   |

---

## 🗄️ Estructura de la Base de Datos

### **Tabla: users**
- Usuarios del sistema administrativo
- Roles: admin, manager, staff
- Autenticación con bcrypt

### **Tabla: job_applications**
- Solicitudes de empleo del formulario público
- Estados: pending, reviewing, accepted, rejected
- Campos opcionales con flags (no_studies, no_email, no_current_job)

### **Tabla: messages**
- Sistema de mensajería interno
- Soporte para hilos de conversación
- Marcado de leído/no leído

### **Tabla: analytics**
- Métricas del sistema
- Vistas de página
- Solicitudes por día

### **Tabla: activity_log**
- Registro de todas las acciones
- Auditoría completa del sistema

---

## 🔌 API Endpoints

### **Autenticación**
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual
- `POST /api/auth/logout` - Cerrar sesión

### **Solicitudes de Empleo**
- `POST /api/applications/submit` - Enviar solicitud (público)
- `GET /api/applications/list` - Listar solicitudes (admin)
- `GET /api/applications/:id` - Ver solicitud (admin)
- `PUT /api/applications/:id/status` - Actualizar estado (admin)
- `GET /api/applications/:id/pdf` - Descargar PDF (admin)
- `GET /api/applications/stats/summary` - Estadísticas (admin)

### **Mensajes**
- `GET /api/messages/inbox` - Bandeja de entrada
- `GET /api/messages/sent` - Mensajes enviados
- `POST /api/messages/send` - Enviar mensaje
- `GET /api/messages/:id` - Ver mensaje
- `DELETE /api/messages/:id` - Eliminar mensaje
- `GET /api/messages/unread-count` - Contador de no leídos
- `GET /api/messages/users/list` - Lista de usuarios

### **Analytics**
- `GET /api/analytics/dashboard` - Datos del dashboard
- `POST /api/analytics/track` - Registrar métrica

---

## 🎨 Rutas del Frontend

### **Públicas**
- `/` - Página principal
- `/bolsa-de-trabajo` - Formulario de empleo

### **Administrativas (requieren login)**
- `/admin/login` - Login
- `/admin/dashboard` - Dashboard principal
- `/admin/applications` - Gestión de solicitudes
- `/admin/messages` - Sistema de mensajería

---

## 📱 Funcionalidades Especiales

### **Descarga de PDF**
- Genera PDFs profesionales de las solicitudes
- Incluye toda la información del aplicante
- Descarga directa desde el navegador

### **Click to Call**
- Los números de teléfono son clickeables
- Abre automáticamente la aplicación de teléfono
- Formato: `tel:+526221738884`

### **Formulario Inteligente**
- Checkboxes para campos opcionales
- Limpia automáticamente los campos deshabilitados
- Validación en frontend y backend
- Envío a base de datos + notificación WhatsApp

### **Seguridad**
- Tokens JWT con expiración de 24 horas
- Contraseñas hasheadas con bcrypt
- Rutas protegidas en frontend y backend
- Validación de permisos por rol

---

## 🔧 Configuración Adicional

### **Cambiar Puerto del Backend**
Edita `server/.env`:
```
PORT=3001
```

### **Cambiar Puerto del Frontend**
Edita `vite.config.js`:
```javascript
export default defineConfig({
  server: {
    port: 5173
  }
})
```

### **Producción**
Para producción, necesitarás:
1. Configurar variables de entorno en tu servidor
2. Construir el frontend: `npm run build`
3. Servir la carpeta `dist` con nginx o similar
4. Configurar CORS en el backend para tu dominio
5. Usar HTTPS (certificado SSL)

---

## 📊 Notas Importantes

- El sistema está completamente funcional
- Las contraseñas en la base de datos están hasheadas
- Los datos de ejemplo en `analytics` son para demostración
- El sistema de mensajería es interno (no emails)
- Las solicitudes se guardan en la base de datos Y envían notificación WhatsApp

---

## 🐛 Troubleshooting

### **Error de conexión a la base de datos**
- Verifica que MySQL/MariaDB esté corriendo
- Revisa las credenciales en `server/.env`
- Asegúrate de haber importado el SQL

### **Error 401 Unauthorized**
- El token expiró, vuelve a iniciar sesión
- Verifica que el JWT_SECRET sea el mismo en desarrollo

### **No se ven las gráficas**
- Verifica que haya datos en la tabla `analytics`
- El SQL incluye datos de ejemplo

### **Error al enviar formulario**
- Verifica que el backend esté corriendo
- Revisa la URL en `.env` (VITE_API_URL)
- Abre la consola del navegador para ver errores

---

## 📞 Soporte

Para cualquier duda o problema, revisa:
1. Los logs del servidor backend
2. La consola del navegador (F12)
3. Los logs de MySQL/phpMyAdmin

¡El sistema está listo para usar! 🎉
