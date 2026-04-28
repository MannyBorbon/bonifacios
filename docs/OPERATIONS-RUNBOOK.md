# Operations Runbook

## Objetivo

Checklist operativo para despliegue, sincronizacion, validaciones y recuperacion.

## Pre-deploy (web)

1. Ejecutar `npm run build` local.
2. Validar rutas criticas:
   - `/`
   - `/cotizador`
   - `/admin/dashboard`
   - `/admin/sales`
   - `/admin/employees`
3. Subir `dist/` y endpoints PHP modificados.
4. Prueba de humo:
   - login admin,
   - ventas cargan,
   - asistencia carga,
   - cotizador responde,
   - reservaciones por evento especial filtran por hora/mesa,
   - campana de notificaciones no reaparece despues de marcar visto.

## Validacion de correo (Hostinger)

1. Configurar variables de entorno SMTP:
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `MAIL_FROM`
2. Ejecutar prueba desde `api/email/send.php` con destinatario interno.
3. Verificar:
   - respuesta `success:true`,
   - entrega en bandeja destino,
   - ausencia de credenciales hardcodeadas en codigo.

## Operacion del sync SoftRestaurant

1. Ejecutar scripts en servidor local del restaurante (no en hosting).
2. Confirmar que el sync publica a endpoint correcto.
3. Verificar ultimo sync en logs/tablas de sync.

## Validaciones de datos (minimas)

- Ventas:
  - total del dia > 0 cuando hay operacion.
  - no duplicados obvios en tickets cerrados/abiertos.
- Caja:
  - movimientos cargados y saldo esperado coherente.
- Asistencia:
  - `ACT` no arrastra registros de dias anteriores.

## Recuperacion basica

- Si falla ventas:
  - revisar conectividad sync y API key.
  - revisar endpoint `api/sales/sync.php`.
- Si falla geocode:
  - revisar `api/applications/geocode.php` y cache.
- Si falla modulo admin:
  - revisar permisos y endpoint `api/auth/me.php`.

## Referencias historicas

Para casos complejos revisar:

- `../documentacion.md`
- `../errores.md`
