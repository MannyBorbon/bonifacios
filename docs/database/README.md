# Documentación del esquema de base de datos

**Política del proyecto:** en **cada** tarea que involucre datos (API, sync, SQL, frontend que muestre o envíe campos de BD), revisar **siempre al 100%** **`../repositorio-esquemas-datos.md`** antes de codificar — no usar suposiciones ni nombres no documentados. Regla: `.cursor/rules/schema-before-backend.mdc`, `AGENTS.md`. Los archivos sueltos (`schema-current.md`, `softrestaurant-schema.md`) son fuentes para regenerar ese documento, no sustitutos para evitar leer el repositorio unificado.

## Qué usar

| Archivo | Propósito |
| --- | --- |
| **[../repositorio-esquemas-datos.md](../repositorio-esquemas-datos.md)** | **Repositorio único** en el repo: ensambla `schema-current.md` + `softrestaurant-schema.md`. Regenerar con `python scripts/build-data-model-repository.py`. |
| **[schema-current.md](schema-current.md)** | Esquema **vigente** solo MariaDB: tablas, columnas, índices, FK, vistas. |
| **[schema-history.md](schema-history.md)** | Registro con fecha de cada regeneración MySQL y snapshot anterior. |
| **versions/** | Copias `schema-YYYYMMDD-HHMMSS.md` del `schema-current` previo. |

El archivo `phpmyadmin.md` en la raíz solo redirige a `docs/database/`; **no lo edites a mano**.

## Flujo cuando cambias la BD

1. En phpMyAdmin (o tu herramienta), exporta la base: **Solo estructura + datos** o al menos estructura; el script necesita el SQL con `CREATE TABLE`, `ALTER` y `CREATE VIEW`.
2. Guarda el `.sql` en el proyecto (puedes **sustituir** el volcado existente o guardar con otro nombre).
3. Desde la raíz del proyecto ejecuta:

```bash
python scripts/update-database-schema-doc.py
```

O indicando el archivo:

```bash
python scripts/update-database-schema-doc.py "ruta/al/nuevo_volcado.sql"
```

Opcional: `--note "descripción del cambio"` para que quede en `schema-history.md`.

4. Haz **commit** de `docs/database/schema-current.md`, `schema-history.md` y los archivos nuevos en `versions/`.

**`schema-current.md` no se mantiene a mano**: si solo editas Markdown sin volver a exportar la BD, el documento y el servidor se desincronizan.

## Regenerar sin archivar la versión anterior

```bash
python scripts/update-database-schema-doc.py --no-archive
```

Útil para pruebas; en el historial quedará marcado que no hubo snapshot.
