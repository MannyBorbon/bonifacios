#!/usr/bin/env python3
"""
Genera docs/repositorio-esquemas-datos.md uniendo:
  - docs/database/schema-current.md  (MariaDB / sitio web)
  - softrestaurant-schema.md        (SQL Server / POS SoftRestaurant)

Ejecutar tras actualizar cualquiera de los dos orígenes.
También se invoca al final de update-database-schema-doc.py si existe.
"""

from __future__ import annotations

import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "docs" / "repositorio-esquemas-datos.md"
MYSQL_DOC = ROOT / "docs" / "database" / "schema-current.md"
SR_DOC = ROOT / "softrestaurant-schema.md"


def build_repository() -> tuple[bool, str]:
    """Escribe el markdown unificado. Devuelve (ok, mensaje)."""
    parts: list[str] = []

    iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    parts.append("# Repositorio unificado de datos — Bonifacios\n\n")
    parts.append(
        "Este archivo **documenta los esquemas reales** usados en backend, sync y frontend. "
        "**No edites este archivo a mano:** se regenera con el script indicado abajo.\n\n"
    )
    parts.append(f"*Ensamblado (UTC): `{iso}`*\n\n")

    parts.append("## Cómo usar este documento\n\n")
    parts.append(
        "| Sistema | Motor | Rol | Dónde se refleja en código |\n"
        "| --- | --- | --- | --- |\n"
        "| **Sitio + admin + APIs** | MariaDB / MySQL (Hostinger) | Persistencia web, tablas `sr_*` sincronizadas, usuarios, ventas agregadas, etc. | `api/`, `src/` |\n"
        "| **SoftRestaurant (POS)** | SQL Server | Origen de ventas, tickets, productos, cajas en el restaurante; el sync lee de aquí. | `softrestaurant-sync/`, lecturas vía PHP_ODBC o export |\n"
    )
    parts.append(
        "\nAntes de **APIs, sync o pantallas que lean/escriban datos**, revisa la sección que corresponda "
        "y confirma **nombre de tabla, columna, tipo y nullability**.\n\n"
    )

    parts.append("## Regenerar este repositorio\n\n")
    parts.append(
        "```bash\n"
        "python scripts/build-data-model-repository.py\n"
        "```\n\n"
        "**Orígenes** (actualízalos antes de volver a ensamblar):\n\n"
        "| Parte | Cómo actualizar |\n"
        "| --- | --- |\n"
        "| MariaDB | Export phpMyAdmin → `python scripts/update-database-schema-doc.py` (actualiza `schema-current.md`) |\n"
        "| SoftRestaurant | En `softrestaurant-sync/`, flujo `generar-schema-softrestaurant.bat` / `export-softrestaurant-schema.php` → `softrestaurant-schema.md` |\n\n"
    )

    parts.append("---\n\n")

    mysql_ok = MYSQL_DOC.is_file()
    sr_ok = SR_DOC.is_file()

    if not mysql_ok:
        parts.append(
            "## Parte A — Base web (MariaDB)\n\n"
            f"**Falta** `{MYSQL_DOC.relative_to(ROOT)}`. "
            "Genera con `python scripts/update-database-schema-doc.py`.\n\n"
        )
    else:
        body = MYSQL_DOC.read_text(encoding="utf-8", errors="replace")
        parts.append("## Parte A — Base web (MariaDB / phpMyAdmin)\n\n")
        rel = MYSQL_DOC.relative_to(ROOT).as_posix()
        parts.append(f"*(Incrustado desde [`{rel}`]({rel}).)*\n\n")
        parts.append(body)
        parts.append("\n\n---\n\n")

    if not sr_ok:
        parts.append(
            "## Parte B — SoftRestaurant (SQL Server)\n\n"
            f"**Falta** `{SR_DOC.relative_to(ROOT)}`. "
            "Genera desde `softrestaurant-sync/` (ver tabla arriba).\n\n"
        )
    else:
        body = SR_DOC.read_text(encoding="utf-8", errors="replace")
        parts.append("## Parte B — SoftRestaurant (SQL Server)\n\n")
        rel = SR_DOC.relative_to(ROOT).as_posix()
        parts.append(f"*(Incrustado desde [`{rel}`]({rel}).)*\n\n")
        parts.append(body)
        parts.append("\n")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("".join(parts), encoding="utf-8")

    kb = OUT.stat().st_size // 1024
    if mysql_ok and sr_ok:
        return True, f"OK: {OUT.relative_to(ROOT)} (~{kb} KB)"
    miss = []
    if not mysql_ok:
        miss.append("MySQL")
    if not sr_ok:
        miss.append("SoftRestaurant")
    return True, f"OK: {OUT.relative_to(ROOT)} (~{kb} KB) — falta: {', '.join(miss)}"


def main() -> int:
    _ok, msg = build_repository()
    print(msg)
    return 0


if __name__ == "__main__":
    sys.exit(main())
