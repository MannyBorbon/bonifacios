#!/usr/bin/env python3
"""
Regenera docs/database/schema-current.md desde un volcado .sql (phpMyAdmin o mysqldump).

Uso:
  python scripts/update-database-schema-doc.py [ruta/al/volcado.sql]
  python scripts/update-database-schema-doc.py --no-archive
  python scripts/update-database-schema-doc.py --note "agregada tabla X"

Por defecto usa en la raíz del proyecto: u979547041_bonifacios (2).sql

Antes de sobrescribir schema-current.md, copia la versión anterior a
docs/database/versions/schema-YYYYMMDD-HHMMSS.md (salvo --no-archive).
"""

from __future__ import annotations

import argparse
import hashlib
import re
import shutil
import sys
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS_DB = ROOT / "docs" / "database"
VERSIONS = DOCS_DB / "versions"
CURRENT = DOCS_DB / "schema-current.md"
HISTORY = DOCS_DB / "schema-history.md"
DEFAULT_SQL = ROOT / "u979547041_bonifacios (2).sql"


def parse_creates(text: str) -> dict[str, str]:
    by_name: dict[str, str] = {}
    pat = re.compile(r"CREATE TABLE `([^`]+)` \(")
    pos = 0
    while True:
        m = pat.search(text, pos)
        if not m:
            break
        j = m.end()
        depth = 1
        while j < len(text) and depth > 0:
            if text[j] == "(":
                depth += 1
            elif text[j] == ")":
                depth -= 1
            j += 1
        stmt_end = text.find(";", j)
        if stmt_end == -1:
            break
        ddl = text[m.start() : stmt_end + 1].strip()
        by_name[m.group(1)] = ddl
        pos = stmt_end + 1
    return by_name


def parse_alters(text: str) -> dict[str, list[str]]:
    alters: dict[str, list[str]] = defaultdict(list)

    def parse_chunk(src: str) -> None:
        i = 0
        while True:
            m = re.search(r"\nALTER TABLE `([^`]+)`", src[i:])
            if not m:
                return
            start = i + m.start() + 1
            rest = src[start:]
            semi = 0
            while semi < len(rest) and rest[semi] != ";":
                semi += 1
            if semi >= len(rest):
                return
            block = rest[: semi + 1].strip()
            alters[m.group(1)].append(block)
            i = start + semi + 1

    comm = "\nCOMMIT;"
    i0 = text.find("-- Indexes for dumped tables")
    i1 = text.find("-- AUTO_INCREMENT for dumped tables")
    if i0 != -1:
        chunk = text[i0 : i1 if i1 != -1 else text.find(comm, i0)]
        parse_chunk(chunk)
    if i1 != -1:
        i2 = text.find(comm, i1)
        parse_chunk(text[i1 : i2 if i2 != -1 else len(text)])
    return alters


def parse_views(text: str) -> dict[str, str]:
    """CREATE ... VIEW `name` AS ... — definición real del final del volcado phpMyAdmin."""
    views: dict[str, str] = {}
    pat = re.compile(
        r"CREATE\s+ALGORITHM=\S+\s+DEFINER=`[^`]+`@`[^`]+`\s+"
        r"SQL\s+SECURITY\s+DEFINER\s+VIEW\s+`([^`]+)`\s+AS\s+([\s\S]+?);",
        re.MULTILINE,
    )
    for m in pat.finditer(text):
        name = m.group(1)
        body = m.group(0).strip()
        views[name] = body
    return views


def sha256_short(path: Path, n: int = 12) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:n]


def build_markdown(
    sql_path: Path,
    tables: dict[str, str],
    alters: dict[str, list[str]],
    views: dict[str, str],
    generated_iso: str,
    file_hash: str,
) -> str:
    lines: list[str] = [
        "# Esquema actual de base de datos\n\n",
        "> **Fuente de verdad para APIs y capa de datos.**\n"
        "> Regenerar con `python scripts/update-database-schema-doc.py` tras exportar la BD.\n\n",
        "| Campo | Valor |\n| --- | --- |\n",
        f"| Archivo SQL origen | `{sql_path.name}` |\n",
        f"| Generado (UTC) | `{generated_iso}` |\n",
        f"| SHA256 (parcial) volcado | `{file_hash}` |\n",
        f"| Tablas | {len(tables)} |\n",
        f"| Vistas (definición `CREATE VIEW`) | {len(views)} |\n\n",
        "---\n\n",
        "## Tablas\n\n",
        "Cada tabla incluye `CREATE TABLE` y los `ALTER TABLE` del volcado (índices, `AUTO_INCREMENT`, `FOREIGN KEY`).\n\n",
    ]
    for name in sorted(tables.keys(), key=str.lower):
        lines.append(f"### `{name}`\n\n#### Columnas\n\n```sql\n")
        lines.append(tables[name])
        lines.append("\n```\n")
        alts = alters.get(name, [])
        if alts:
            lines.append("\n#### Índices, AUTO_INCREMENT, FK\n\n")
            for alt in alts:
                lines.append("```sql\n")
                lines.append(alt)
                lines.append("\n```\n\n")
    lines.append("\n---\n\n## Vistas\n\n")
    if views:
        lines.append(
            "Definición tal como en el volcado (no uses solo la tabla «stand-in» si existe).\n\n"
        )
        for name in sorted(views.keys(), key=str.lower):
            lines.append(f"### `{name}`\n\n```sql\n")
            lines.append(views[name])
            lines.append("\n```\n\n")
    else:
        lines.append("*No se encontraron `CREATE VIEW` en este archivo.*\n\n")
    return "".join(lines)


def archive_current(note_ts: str) -> Path | None:
    if not CURRENT.exists():
        return None
    VERSIONS.mkdir(parents=True, exist_ok=True)
    dest = VERSIONS / f"schema-{note_ts}.md"
    shutil.copy2(CURRENT, dest)
    return dest


def append_history(
    archive_path: Path | None,
    sql_name: str,
    n_tables: int,
    n_views: int,
    generated_iso: str,
    note: str,
    skipped_archive: bool,
) -> None:
    if archive_path:
        ver_link = f"[{archive_path.name}](versions/{archive_path.name})"
    elif skipped_archive:
        ver_link = "— (`--no-archive`)"
    else:
        ver_link = "— (primera generación)"
    row = (
        f"| {generated_iso[:19]} | `{sql_name}` | "
        f"{n_tables} tablas, {n_views} vistas | {ver_link} | {note or '—'} |\n"
    )
    if not HISTORY.exists():
        HISTORY.parent.mkdir(parents=True, exist_ok=True)
        HISTORY.write_text(
            "# Historial de versiones del esquema\n\n"
            "Cada vez que ejecutas `scripts/update-database-schema-doc.py` **con archivo previo**,\n"
            "la copia anterior queda en `versions/` y aquí queda el registro.\n\n"
            "| Generado (UTC) | SQL origen | Conteo | Snapshot anterior | Notas |\n"
            "| --- | --- | --- | --- | --- |\n",
            encoding="utf-8",
        )
    with HISTORY.open("a", encoding="utf-8") as f:
        f.write(row)


def main() -> int:
    ap = argparse.ArgumentParser(description="Generar docs/database/schema-current.md desde volcado SQL")
    ap.add_argument("sql_file", nargs="?", type=Path, default=None, help="Ruta al .sql")
    ap.add_argument("--no-archive", action="store_true", help="No archivar schema-current.md previo")
    ap.add_argument("--note", default="", help="Nota libre para la fila del historial")
    args = ap.parse_args()
    sql_path = args.sql_file or DEFAULT_SQL
    if not sql_path.is_absolute():
        sql_path = ROOT / sql_path
    if not sql_path.is_file():
        print(f"ERROR: No existe el archivo: {sql_path}", file=sys.stderr)
        return 1

    text = sql_path.read_text(encoding="utf-8", errors="replace")
    tables = parse_creates(text)
    alters = parse_alters(text)
    views = parse_views(text)

    now = datetime.now(timezone.utc)
    ts_file = now.strftime("%Y%m%d-%H%M%S")
    iso = now.strftime("%Y-%m-%dT%H:%M:%SZ")
    digest = sha256_short(sql_path)

    DOCS_DB.mkdir(parents=True, exist_ok=True)
    archived: Path | None = None
    if not args.no_archive:
        archived = archive_current(ts_file)

    md = build_markdown(sql_path, tables, alters, views, iso, digest)
    CURRENT.write_text(md, encoding="utf-8")

    append_history(
        archived,
        sql_path.name,
        len(tables),
        len(views),
        iso,
        args.note.strip(),
        skipped_archive=args.no_archive,
    )

    print(f"OK: {CURRENT.relative_to(ROOT)}")
    print(f"     Tablas: {len(tables)}, Vistas: {len(views)}, ALTERs: {sum(len(v) for v in alters.values())}")
    if archived:
        print(f"     Archivo anterior: {archived.relative_to(ROOT)}")

    try:
        from importlib.util import spec_from_file_location, module_from_spec

        merge = ROOT / "scripts" / "build-data-model-repository.py"
        spec = spec_from_file_location("build_data_model_repository", merge)
        if spec and spec.loader:
            mod = module_from_spec(spec)
            spec.loader.exec_module(mod)
            _, merge_msg = mod.build_repository()
            print(f"     {merge_msg}")
    except Exception as e:
        print(f"     (repositorio unificado no actualizado: {e})", file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
