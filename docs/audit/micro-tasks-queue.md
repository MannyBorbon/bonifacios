# Cola de micro-tareas (auditoría API / cierre)

Regla: completar **una** tarea por iteración; pedir confirmación antes de la siguiente.

| ID | Tarea | Estado |
|----|--------|--------|
| T1 | `api/users/permissions.php` + `edit-permissions.php`: auth en GET, respuestas JSON coherentes | `LISTO` |
| T2 | `api/users/onsite-status.php` + `skills.php` | `LISTO` |
| T3 | `api/users/upload-profile-photo.php` | `LISTO` |
| T4 | `api/chat/*` resto (excepto `upload.php` ya tocado) | `LISTO` |
| T5 | `api/quotes/*` resto (excepto `requirements.php` partial) | `LISTO` |
| T6 | `api/softrestaurant/ticket-items.php` + `tips-history.php` + `tips-all.php` | `LISTO` |
| T7 | `api/softrestaurant/shifts.php` + `cash-movements.php` | `LISTO` |
| T8 | `api/softrestaurant/sales.php` (primera mitad: entrada, auth, filtros) | `LISTO` |
| T9 | `api/softrestaurant/sales.php` (segunda mitad: queries pesadas, contrato JSON) | `LISTO` |
| T10 | `api/softrestaurant/sync.php` | `LISTO` |
| T11 | Diagnósticos SR (`diag-*.php`, `test-*.php`): auth o bloqueo prod | `LISTO` |
| T12 | Otros `api/*` (finances, meetings, support, employees masivo…) por carpetas | `LISTO` |
| T13 | Documento smoke tests (comandos/curls) + actualizar `fullstack-audit-checklist.md` Fase 6 | `LISTO` |
