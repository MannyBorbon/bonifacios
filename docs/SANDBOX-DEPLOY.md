# Sandbox privado (recomendado)

Este proyecto ya soporta modo sandbox por variables de entorno para experimentar sin tocar produccion.

## 1) Subdominio privado (no obvio)

Usa un subdominio largo y dificil de adivinar. Ejemplo de patron:

`bfx-int-<token-largo>.bonifaciossancarlos.com`

Recomendado:
- token aleatorio de 16-24 caracteres (`a-z0-9`)
- no usar palabras como `sandbox`, `test`, `staging`
- no publicarlo en menu ni footer

## 2) Variables para sandbox

Copiar `.env.sandbox.example` a `.env` en el entorno sandbox y ajustar:

- `VITE_APP_MODE=sandbox`
- `VITE_SANDBOX_HOSTS=<subdominio-privado>`
- `VITE_API_URL=https://<subdominio-privado>/api`

### Flujo recomendado sin editar `.env` cada vez

1. Crear archivo local `.env.sandbox` (basado en `.env.sandbox.example`).
2. Crear archivo local `.env.production` (basado en `.env.production.example`).
3. Usar scripts:
   - `npm run build:sandbox`
   - `npm run build:prod`

Para backend PHP, copiar `api/.env.example` a `api/.env` y ajustar:

- `APP_ENV=sandbox`
- `APP_PRIMARY_DOMAIN=https://bonifaciossancarlos.com`
- `CORS_ALLOWED_ORIGINS=https://bonifaciossancarlos.com,https://<subdominio-privado>`
- `DB_NAME=<base_sandbox>`
- `DB_USER/<DB_PASS>` del usuario de la base sandbox

## 3) Proteccion minima

Cuando `VITE_APP_MODE=sandbox` o el host coincide con `VITE_SANDBOX_HOSTS`:

- la app muestra un badge visual (evita confundir entorno)
- se inyecta meta `robots=noindex,nofollow` para no indexar

## 4) Aislamiento recomendado

- Base de datos separada (`bonifacios_sandbox`)
- credenciales SMTP separadas
- cuentas de prueba (no usar cuentas reales del staff)

### Copia de BD por phpMyAdmin (recomendado)

1. Exportar BD de produccion (SQL).
2. Crear BD nueva sandbox.
3. Importar SQL en la BD sandbox.
4. Cambiar `api/.env` para apuntar a la BD sandbox.

## 5) Flujo de promotion a produccion

1. Implementar y validar en sandbox.
2. Ejecutar smoke tests (reservaciones, mensajes, empleados, ventas).
3. Merge de cambios aprobados a rama de produccion.
4. Tag de release y deploy al dominio principal.
