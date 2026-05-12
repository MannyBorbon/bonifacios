# SoftRestaurant Sync Recovery Runbook

## 1) Pre-deploy snapshot (required)

Run in MySQL/phpMyAdmin before uploading files:

```sql
SELECT COUNT(*) AS sales_rows, MIN(sale_datetime) AS min_dt, MAX(sale_datetime) AS max_dt
FROM sr_sales;

SELECT module_name, status, records_processed, records_failed, sync_started_at, sync_finished_at
FROM sr_sync_log
ORDER BY id DESC
LIMIT 50;

SELECT module_name, last_sync_at, sync_status, records_synced
FROM sr_sync_config
ORDER BY module_name;
```

Backup files currently in production:

- `api/softrestaurant/sync.php`
- `api/softrestaurant/sales.php`
- `softrestaurant-sync/sync-v3.php`

## 2) Deploy order

Deploy in this exact sequence:

1. Upload `api/softrestaurant/sync.php` to hosting.
2. Upload `softrestaurant-sync/sync-v3.php` to sync server.
3. Upload frontend build (contains `Sales.jsx` change for payment evidence flags).
4. Restart sync loop (`run_bonifacios.bat`).

## 3) Smoke tests (15-30 min)

### API ingestion

```sql
SELECT module_name, status, records_processed, records_inserted, records_updated, records_failed, error_details
FROM sr_sync_log
ORDER BY id DESC
LIMIT 30;
```

Expect:

- `sales` with processed > 0 and failed = 0
- no repeated errors in `cheque_payments`, `employees`, `ticket_items`

### Sales visibility

Open `/admin/sales` and verify:

- `Hoy` > 0 when monitor has paid checks
- `Ayer` and `Esta semana` no longer stuck at 0
- tabs `Meseros`, `Productos`, `Caja`, `Corte` populate gradually after first sync cycles

## 4) Data gap recovery (if historical rows were skipped)

If `sync-state-v3.json` advanced while API failed in previous versions:

1. Stop sync process.
2. Edit `sync-state-v3.json`:
   - set `initial_load_done` to `false`
   - set `sales` to a safe rewind point (e.g. `2026-05-01 00:00:00`)
3. Start sync process again and monitor `sr_sync_log`.
4. After backfill completes, `initial_load_done` should become `true`.

## 5) Rollback plan

If new deployment causes regressions:

1. Restore previous `api/softrestaurant/sync.php`.
2. Restore previous `softrestaurant-sync/sync-v3.php` (or stable `sync-final.php` if required).
3. Keep `sync-state-v3.json` snapshot to avoid permanent cursor drift.
4. Re-run smoke SQL queries and confirm `sales` ingestion resumed.

