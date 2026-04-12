# 📋 Instrucciones de Deploy - Bonifacio's Restaurant

## ✅ Tareas Completadas (Sesión Actual)

### 1. 🎵 Preloader Musical en Login
- **Archivo creado**: `src/components/MusicPreloader.jsx`
- **Audio**: `public/la-otra-realidad.m4a` (ya copiado)
- **Duración**: 10 segundos antes de mostrar pantalla de login
- **Características**: Animación de progreso, logo pulsante, barras musicales

### 2. 🎶 Reproductor de Audio en Login
- **Ubicación**: `src/pages/admin/Login.jsx`
- **Canción**: "La Otra Realidad"
- **Controles**: Play/Pause con botón elegante
- **Modo**: Loop continuo

### 3. 🔐 Contraseñas Individuales por Usuario
**Actualizar**: `api/create-users.php`

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| misael | Misael2026! | admin |
| manuel | Manuel2026! | admin |
| francisco | Francisco2026! | informativo |
| santiago | Santiago2026! | informativo |

**⚠️ IMPORTANTE**: Ejecutar `create-users.php` en el servidor para actualizar contraseñas.

### 4. 👤 Roles de Usuario Actualizados
- **Admin** (Misael, Manuel): Acceso completo a panel, solicitudes, mensajes, tracking
- **Informativo** (Francisco, Santiago): Solo pueden ver Dashboard y Tracking (si son Misael/Manuel)

### 5. 📸 Subida de Fotos en Solicitudes de Empleo
- **Opciones**:
  - Elegir de galería
  - Tomar selfie con cámara
- **Vista previa** de la foto antes de enviar
- **Backend**: `api/applications/upload-photo.php`
- **Almacenamiento**: `public_html/uploads/applications/application_{ID}.jpg`

### 6. ⚠️ PENDIENTE: Reporte Ejecutivo
- Usuario mencionó eliminar títulos de columnas "monto principal" y "monto secundario"
- **Requiere clarificación**: No encontré este reporte en el código actual
- **Acción**: Esperar imagen/ubicación del reporte del usuario

## 📦 Archivos a Subir a Hostinger

### Nuevos Archivos Frontend (dist/)
```
dist/
├── index.html
├── assets/
│   ├── index-CRgTMHIz.css
│   └── index-CfKLTy2Z.js
└── la-otra-realidad.m4a
```

### Nuevos Archivos Backend (api/)
```
api/
├── create-users.php (ACTUALIZADO - ejecutar una vez)
└── applications/
    └── upload-photo.php (NUEVO)
```

### Crear Directorio en Servidor
```bash
mkdir -p public_html/uploads/applications
chmod 755 public_html/uploads/applications
```

## 🚀 Pasos de Deploy

### 1. Subir Frontend
```bash
# Subir todo el contenido de dist/ a public_html/
dist/* → public_html/
```

### 2. Subir Backend
```bash
# Subir archivos PHP actualizados
api/create-users.php → public_html/api/create-users.php
api/applications/upload-photo.php → public_html/api/applications/upload-photo.php
```

### 3. Actualizar Contraseñas de Usuarios
```bash
# Acceder desde navegador (UNA VEZ):
https://tudominio.com/api/create-users.php

# Esto recreará los usuarios con las nuevas contraseñas
# Verificar que muestre:
# "Usuario creado: misael (Contraseña: Misael2026!)"
# "Usuario creado: francisco (Contraseña: Francisco2026!)"
# "Usuario creado: santiago (Contraseña: Santiago2026!)"
# "Usuario creado: manuel (Contraseña: Manuel2026!)"
```

### 4. Verificar Permisos
```bash
# Asegurar que el directorio de uploads tenga permisos correctos
chmod 755 public_html/uploads
chmod 755 public_html/uploads/applications
```

## 🧪 Pruebas Post-Deploy

### Login
- [ ] Preloader musical aparece por 10 segundos
- [ ] Audio "La Otra Realidad" se puede reproducir
- [ ] Nuevas contraseñas funcionan para cada usuario

### Roles de Usuario
- [ ] **Misael/Manuel**: Ven Dashboard, Solicitudes, Mensajes, Tracking
- [ ] **Francisco/Santiago**: Solo ven Dashboard (sin menú de Solicitudes/Mensajes)

### Solicitudes de Empleo
- [ ] Botón "Elegir de galería" abre selector de fotos
- [ ] Botón "Tomar selfie" activa cámara (solo en HTTPS)
- [ ] Vista previa de foto aparece correctamente
- [ ] Foto se sube al servidor al enviar solicitud
- [ ] Foto se guarda en `/uploads/applications/application_{ID}.jpg`

### Campo "Otro" en Puesto
- [ ] Al seleccionar "Otro" aparece input de texto
- [ ] El texto personalizado se envía correctamente

## 🔧 Troubleshooting

### Selfie no funciona
- **Causa**: Navegador requiere HTTPS para acceder a cámara
- **Solución**: Solo funciona en producción con SSL, en localhost usar "Elegir de galería"

### Error al subir foto
- **Verificar**: Permisos del directorio `uploads/applications` (755)
- **Verificar**: Tamaño máximo de archivo en PHP (`upload_max_filesize = 5M`)

### Audio no se reproduce
- **Verificar**: Archivo `la-otra-realidad.m4a` está en `public_html/`
- **Navegadores**: Algunos bloquean autoplay, usuario debe hacer click en play

### Usuarios no pueden hacer login
- **Ejecutar**: `create-users.php` para recrear usuarios
- **Verificar**: Tabla `users` tiene columna `role`

## 📝 Notas Importantes

1. **Seguridad**: El archivo `create-users.php` debe eliminarse o protegerse después de ejecutarlo
2. **SSL**: La función selfie requiere HTTPS para funcionar
3. **Roles**: El sistema ahora diferencia entre roles 'admin' e 'informativo'
4. **Tracking**: Solo Misael y Manuel pueden ver la página de Tracking
5. **Audio**: El preloader solo aparece la primera vez que se carga el login

## 🎯 Estado de Tareas

- ✅ Preloader musical (10s)
- ✅ Audio player en login
- ✅ Contraseñas diferentes por usuario
- ✅ Roles informativo para Santiago/Francisco
- ✅ Subida de fotos en solicitudes
- ✅ Tomar selfie desde formulario
- ⏳ **PENDIENTE**: Reporte ejecutivo (esperando clarificación del usuario)
