# 🚀 Instrucciones para Desplegar en Hostinger

## 📋 Pasos para Configuración Completa

### **1. Base de Datos en Hostinger**

1. **Accede a phpMyAdmin en Hostinger**
   - Panel de Hostinger → Bases de datos → phpMyAdmin

2. **Crea la base de datos** (si no existe)
   - Nombre: `u979547041_bonifacios` (o el que te asignó Hostinger)
   - Cotejamiento: `utf8mb4_unicode_ci`

3. **Importa el archivo SQL**
   - Selecciona la base de datos
   - Pestaña "Importar"
   - Sube: `database/bonifacios_db_sin_create.sql`
   - Click "Continuar"

### **2. Subir Archivos al Servidor**

#### **Frontend (Archivos compilados)**
1. Ejecuta en tu computadora:
   ```bash
   npm run build
   ```

2. Sube la carpeta `dist/` completa a:
   - Hostinger: `public_html/` (raíz del dominio)
   - O a una subcarpeta si prefieres

#### **Backend (Servidor Node.js)**
1. Sube toda la carpeta `server/` a Hostinger
2. Ubicación recomendada: fuera de `public_html/` por seguridad
   - Ejemplo: `/home/u979547041/server/`

### **3. Configurar Variables de Entorno en Hostinger**

#### **Para el Backend:**
Crea el archivo `.env` en la carpeta `server/` con:

```env
# Database Configuration
DB_HOST=localhost
DB_USER=u979547041_bonifacios
DB_PASSWORD=TU_CONTRASEÑA_DE_MYSQL
DB_NAME=u979547041_bonifacios
DB_PORT=3306

# JWT Secret
JWT_SECRET=filipenses-4-8-super-secret-key-production-2024

# Server Configuration
PORT=3001
NODE_ENV=production

# Frontend URL (tu dominio real)
FRONTEND_URL=https://tudominio.com
```

**⚠️ IMPORTANTE:** Reemplaza:
- `TU_CONTRASEÑA_DE_MYSQL` con tu contraseña real de MySQL
- `https://tudominio.com` con tu dominio real

### **4. Instalar Node.js en Hostinger**

1. **Accede por SSH** a tu servidor Hostinger
2. **Instala las dependencias:**
   ```bash
   cd /home/u979547041/server
   npm install --production
   ```

3. **Inicia el servidor:**
   ```bash
   npm start
   ```

### **5. Configurar PM2 (Mantener servidor corriendo)**

Para que el servidor backend no se detenga:

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar el servidor con PM2
cd /home/u979547041/server
pm2 start server.js --name bonifacios-api

# Guardar configuración
pm2 save

# Auto-inicio al reiniciar servidor
pm2 startup
```

### **6. Configurar Proxy Reverso (Opcional pero Recomendado)**

En Hostinger, configura un proxy reverso para que:
- `tudominio.com/api/*` → `localhost:3001/api/*`

Esto se hace en el panel de Hostinger → Node.js → Configuración de aplicación

### **7. Actualizar URL del API en Frontend**

Si NO usas proxy reverso, actualiza el archivo `.env` en la raíz del proyecto:

```env
VITE_API_URL=https://tudominio.com:3001/api
```

Luego reconstruye:
```bash
npm run build
```

Y vuelve a subir la carpeta `dist/`

---

## ✅ Verificación

### **Probar Backend:**
Visita: `https://tudominio.com:3001/api/health`
Deberías ver: `{"status":"ok","timestamp":"..."}`

### **Probar Frontend:**
1. Visita: `https://tudominio.com`
2. Click en "Admin" en el footer
3. Login con:
   - Usuario: `misael`, `francisco`, `santiago` o `manuel`
   - Contraseña: `Filipenses4:8@`

---

## 🔐 Credenciales de Acceso

| Usuario   | Contraseña       | Email                              |
|-----------|------------------|------------------------------------|
| misael    | Filipenses4:8@   | misael@bonifaciossancarlos.com    |
| francisco | Filipenses4:8@   | francisco@bonifaciossancarlos.com |
| santiago  | Filipenses4:8@   | santiago@bonifaciossancarlos.com  |
| manuel    | Filipenses4:8@   | manuel@bonifaciossancarlos.com    |

---

## 🐛 Solución de Problemas

### **Error de conexión a base de datos:**
- Verifica credenciales en `server/.env`
- Asegúrate que MySQL esté corriendo
- Verifica que la base de datos existe

### **Error 404 en API:**
- Verifica que el servidor backend esté corriendo: `pm2 status`
- Revisa logs: `pm2 logs bonifacios-api`
- Reinicia: `pm2 restart bonifacios-api`

### **CORS Error:**
- Actualiza `FRONTEND_URL` en `server/.env` con tu dominio real
- Reinicia el servidor backend

### **No se ven las solicitudes:**
- Verifica que las tablas se crearon correctamente en phpMyAdmin
- Revisa que el formulario público esté enviando a la URL correcta del API

---

## 📞 Comandos Útiles

```bash
# Ver estado del servidor
pm2 status

# Ver logs en tiempo real
pm2 logs bonifacios-api

# Reiniciar servidor
pm2 restart bonifacios-api

# Detener servidor
pm2 stop bonifacios-api

# Ver uso de recursos
pm2 monit
```

---

## 🎉 ¡Listo!

Tu dashboard administrativo está completamente funcional en Hostinger con:
- ✅ Base de datos configurada
- ✅ Backend API corriendo
- ✅ Frontend desplegado
- ✅ Sistema de autenticación
- ✅ Gestión de solicitudes de empleo
- ✅ Sistema de mensajería interno
- ✅ Estadísticas y analytics
