<?php
/**
 * ============================================================
 * BONIFACIOS — Sync v3.0  (sync-v3.php)
 * ============================================================
 * Script completo y funcional. Sincroniza desde SQL Server
 * (SoftRestaurant 8 Pro) → API del sitio (MySQL).
 *
 * MÓDULOS:
 *  - sales        → cheques (cerrados) + tempcheques (abiertos)
 *  - cheque_payments → chequespagos (desglose por forma de pago)
 *  - ticket_items → cheqdet (productos por ticket del turno)
 *  - cash_movements  → movtoscaja (entradas/salidas/propinas)
 *  - shifts       → turnos (cortes de caja)
 *  - cancellations→ cancelaciones (tickets anulados)
 *  - attendance   → registroasistencias (reloj checador)
 *  - products/tables/reservations/inventory → catálogos auxiliares
 *  - pos_table_states → estado vivo de mesas para mapa
 *
 * DISEÑO:
 *  - Contraseña hard-codeada (igual que la versión que funcionaba)
 *  - Turno calculado con GETDATE() del SQL Server (no reloj del PC)
 *  - Modo histórico: carga desde 2000 en batches de 50
 *  - Modo tiempo real: cada 10 s solo el turno actual
 *  - Estado guardado en sync-state-v3.json
 * ============================================================
 */

error_reporting(E_ALL & ~E_DEPRECATED & ~E_NOTICE);
date_default_timezone_set('America/Hermosillo');

// ── CONFIGURACIÓN ─────────────────────────────────────────────
define('API_URL',       'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY',       'bonifacios-sr-sync-2024-secret-key');
define('SR_DSN',        "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true;LoginTimeout=30");
define('SR_USER',       'usuario_web');
define('SR_PASS',       'Filipenses4:8@');
define('SYNC_INTERVAL', 10);
define('BATCH_SIZE',    50);
define('STATE_FILE',    __DIR__ . '/sync-state-v3.json');
define('HISTORY_START', '2000-01-01 00:00:00');

// ── FILTRO DE TURNO (GETDATE del SQL Server) ──────────────────
// Turno 08:00 → 07:59 del día siguiente. Se calcula en SQL
// para evitar desfases de zona horaria con el reloj del PC.
define('SHIFT_FILTER_C', "
    (
        c.fecha >= DATEADD(HOUR, 8, CAST(
            CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                 ELSE CONVERT(date, GETDATE()) END
        AS datetime))
        AND c.fecha < DATEADD(HOUR, 8, CAST(
            CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                 THEN CONVERT(date, GETDATE())
                 ELSE DATEADD(DAY,1, CONVERT(date, GETDATE())) END
        AS datetime))
    )
");

// ── CLASE PRINCIPAL ────────────────────────────────────────────
class BonifaciosSync {

    private ?\PDO $conn  = null;
    private array  $state = [];
    private bool   $initialLoad = true;

    public function __construct() {
        $this->loadState();
        $this->log("=== Bonifacio's Sync v3.0 ===");
        $mode = $this->initialLoad ? 'HISTÓRICO' : 'TIEMPO REAL';
        $this->log("Modo: $mode | Desde ventas: " . ($this->state['sales'] ?? HISTORY_START));
    }

    // ─────────────────────────────────────────────────────────────
    // CONEXIÓN
    // ─────────────────────────────────────────────────────────────
    private function connect(): bool {
        try {
            $this->conn = new \PDO(SR_DSN, SR_USER, SR_PASS, [
                \PDO::ATTR_ERRMODE            => \PDO::ERRMODE_EXCEPTION,
                \PDO::ATTR_DEFAULT_FETCH_MODE => \PDO::FETCH_ASSOC,
            ]);
            $this->log("SQL Server OK.");
            return true;
        } catch (\Throwable $e) {
            $this->log("✗ Conexión fallida: " . $e->getMessage());
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // LOOP PRINCIPAL
    // ─────────────────────────────────────────────────────────────
    public function run(): void {
        while (true) {
            $start = microtime(true);

            if ($this->connect()) {
                $this->syncSales();

                // En histórico también sincronizamos el turno actual
                // para tener datos en vivo mientras se carga el pasado
                $this->syncTodayOpen();
                if ($this->initialLoad) {
                    $this->syncTodayClosedSnapshot();
                }

                // Siempre sincronizar items y pagos del turno actual,
                // incluso en modo histórico, para tener productos en vivo
                $this->syncTodayChequePayments();
                $this->syncTodayTicketItems();

                $this->syncCashMovements();
                $this->syncShifts();
                $this->syncCancellations();
                $this->syncAttendance();

                if (!$this->initialLoad) {
                    $this->syncWaiters();
                    $this->syncCatalogModules();
                    $this->syncPosTableStates();
                }

                $this->saveState();
                $this->conn = null;
            }

            // En modo histórico no esperamos: iterar lo antes posible
            if ($this->initialLoad) {
                continue;
            }

            $elapsed = microtime(true) - $start;
            $wait    = SYNC_INTERVAL - $elapsed;
            if ($wait > 0) {
                sleep((int)ceil($wait));
            }
        }
    }

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES PARA CORRECCIÓN DE PAGOS (chequespagos)
    // ─────────────────────────────────────────────────────────────
    private function sqlChequespagosAggJoin(): string {
        // cheques.tarjeta/efectivo/vales/otros son los valores autoritativos de SR.
        // No se usa chequespagos para evitar inflación por filas duplicadas/correctivas.
        return '';
    }

    private function sqlEffectiveEfectivoExpr(): string {
        // efectivo incluye propina pagada en efectivo (comportamiento nativo de SR)
        return 'ISNULL(c.efectivo, 0)';
    }

    private function sqlEffectiveTarjetaExpr(): string {
        // tarjeta incluye propina de tarjeta — el API separa venta y propina en el desglose
        return 'ISNULL(c.tarjeta, 0)';
    }

    private function sqlEffectiveValesExpr(): string {
        return 'ISNULL(c.vales, 0)';
    }

    private function sqlEffectiveOtrosExpr(): string {
        return 'ISNULL(c.otros, 0)';
    }

    // ─────────────────────────────────────────────────────────────
    // VENTAS CERRADAS (cheques) — histórico + tiempo real
    // ─────────────────────────────────────────────────────────────
    private function syncSales(): void {
        try {
            $lastSync = $this->state['sales'] ?? HISTORY_START;
            $dp       = $this->dateParts($lastSync);
            $Y=$dp['Y']; $M=$dp['M']; $D=$dp['D'];
            $H=$dp['H']; $I=$dp['I']; $S=$dp['S'];

            $this->log("[VENTAS] desde: {$dp['str']}");

            // Definir expresiones de corrección para ambos modos
            $pJoin = $this->sqlChequespagosAggJoin();
            $eEf = $this->sqlEffectiveEfectivoExpr();
            $eTa = $this->sqlEffectiveTarjetaExpr();
            $eVa = $this->sqlEffectiveValesExpr();
            $eOt = $this->sqlEffectiveOtrosExpr();

            if ($this->initialLoad) {
                // ── HISTÓRICO: cerrados, en lotes de BATCH_SIZE ──
                $dateFilter = "
                    (YEAR(c.fecha) > $Y)
                    OR (YEAR(c.fecha)=$Y AND MONTH(c.fecha) > $M)
                    OR (YEAR(c.fecha)=$Y AND MONTH(c.fecha)=$M AND DAY(c.fecha) > $D)
                    OR (YEAR(c.fecha)=$Y AND MONTH(c.fecha)=$M AND DAY(c.fecha)=$D AND DATEPART(HOUR,c.fecha) > $H)
                    OR (YEAR(c.fecha)=$Y AND MONTH(c.fecha)=$M AND DAY(c.fecha)=$D AND DATEPART(HOUR,c.fecha)=$H AND DATEPART(MINUTE,c.fecha) > $I)
                    OR (YEAR(c.fecha)=$Y AND MONTH(c.fecha)=$M AND DAY(c.fecha)=$D AND DATEPART(HOUR,c.fecha)=$H AND DATEPART(MINUTE,c.fecha)=$I AND DATEPART(SECOND,c.fecha) > $S)
                ";

                $sql = "SELECT TOP " . BATCH_SIZE . "
                    c.folio, c.numcheque, c.fecha,
                    c.mesa,  c.nopersonas, c.idmesero, c.idturno,
                    m.nombre AS nombre_mesero,
                    c.pagado, c.cancelado,
                    -- Total neto sin propina (cuando propinaincluida>0, el total de SR la incluye)
                    -- si total=0 es cortesia completa (descuento=100%)
                    ISNULL(c.total,0) AS total,
                    ISNULL(c.subtotal,0) AS subtotal,
                    ISNULL(c.totalimpuesto1,0) AS impuesto,
                    ISNULL(c.propina,0) AS propina,
                    ISNULL(c.descuentoimporte,0) AS descuento,
                    ISNULL(c.propinaincluida,0) AS propinaincluida,
                    ISNULL(c.propinapagada,0) AS propinapagada,
                    {$eEf} AS efectivo,
                    {$eTa} AS tarjeta,
                    {$eVa} AS vales,
                    {$eOt} AS otros
                FROM cheques c
                LEFT JOIN meseros m ON m.idmesero = c.idmesero
                {$pJoin}
                WHERE c.cancelado = 0
                  AND (
                      ISNULL(c.pagado, 0) = 1
                      OR ( {$eEf} + {$eTa} + {$eVa} + {$eOt} ) > 0.0001
                  )
                  AND ($dateFilter)
                ORDER BY c.fecha ASC";

                $rows = $this->conn->query($sql)->fetchAll();

                if (count($rows) === 0) {
                    $this->initialLoad = false;
                    $this->state['initial_load_done'] = true;
                    $this->log("[VENTAS] ✓ Histórico completo. Cambiando a tiempo real.");
                    return;
                }
            } else {
                // ── TIEMPO REAL: TURNO ACTUAL + ÚLTIMAS 48H ──
                // Re-sincroniza tickets del turno actual Y de las últimas 48h para
                // actualizar cash_amount de tickets cobrados en turnos recientes ya cerrados
                // Re-usar las mismas expresiones de corrección para tiempo real
            $sql = "SELECT
                c.folio, c.numcheque, c.fecha,
                c.mesa,  c.nopersonas, c.idmesero, c.idturno,
                m.nombre AS nombre_mesero,
                c.pagado, c.cancelado,
                CASE WHEN ISNULL(c.total,0) > 0
                     THEN c.total - CASE WHEN ISNULL(c.propinaincluida,0) > 0
                                         THEN ISNULL(c.propina,0) ELSE 0 END
                     ELSE ISNULL(c.subtotal,0) + ISNULL(c.totalimpuesto1,0)
                          - ISNULL(c.descuentoimporte,0)
                END                              AS total,
                ISNULL(c.subtotal,0)             AS subtotal,
                ISNULL(c.totalimpuesto1,0)       AS impuesto,
                ISNULL(c.propina,0)              AS propina,
                ISNULL(c.propinaincluida,0)      AS propinaincluida,
                ISNULL(c.propinapagada,0)        AS propinapagada,
                ISNULL(c.descuentoimporte,0)     AS descuento,
                {$eEf} AS efectivo,
                {$eTa} AS tarjeta,
                {$eVa} AS vales,
                {$eOt} AS otros
            FROM cheques c
            LEFT JOIN meseros m ON m.idmesero = c.idmesero
            {$pJoin}
            WHERE c.cancelado = 0
              AND (
                  ISNULL(c.pagado, 0) = 1
                  OR ( {$eEf} + {$eTa} + {$eVa} + {$eOt} ) > 0.0001
              )
              AND c.fecha >= DATEADD(HOUR, -48, GETDATE())
            ORDER BY c.fecha ASC";

                $rows = $this->conn->query($sql)->fetchAll();
            }

            if (count($rows) === 0) {
                return;
            }

            $data           = [];
            $lastClosedDate = $this->state['sales'] ?? HISTORY_START;
            $ticketFolios   = [];

            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['fecha']);
                if (!$fechaObj) {
                    continue;
                }
                $dt  = $fechaObj->format('Y-m-d H:i:s');
                $ef  = floatval($r['efectivo']);
                $ta  = floatval($r['tarjeta']);
                $va  = floatval($r['vales']);
                $ot  = floatval($r['otros']);
                $n   = ($ef>0?1:0)+($ta>0?1:0)+($va>0?1:0)+($ot>0?1:0);
                if ($n > 1)    $pType = 'mixed';
                elseif ($ta>0) $pType = 'card';
                elseif ($va>0) $pType = 'voucher';
                elseif ($ot>0) $pType = 'transfer';
                else           $pType = 'cash';

                $tid   = trim((string)($r['folio'] ?? ''));
                $data[] = [
                    'sr_ticket_id'   => $tid,
                    'ticket_number'  => (string)($r['numcheque'] ?? $tid),
                    'folio'          => (string)($r['numcheque'] ?? $tid),
                    'sale_date'      => $fechaObj->format('Y-m-d'),
                    'sale_time'      => $fechaObj->format('H:i:s'),
                    'sale_datetime'  => $dt,
                    'table_number'   => trim((string)($r['mesa']          ?? '')),
                    'waiter_id'      => trim((string)($r['idmesero']      ?? '')),
                    'waiter_name'    => trim((string)($r['nombre_mesero'] ?? '')),
                    'covers'         => intval($r['nopersonas'] ?? 0),
                    'shift_id'       => (string)($r['idturno'] ?? ''),
                    'subtotal'       => floatval($r['subtotal']),
                    'tax'            => floatval($r['impuesto']),
                    'discount'       => floatval($r['descuento']),
                    'tip'            => floatval($r['propina']),
                    'tip_included'   => floatval($r['propinaincluida']),
                    'tip_paid'       => intval($r['propinapagada']),
                    'total'          => floatval($r['total']),
                    'status'         => 'closed',
                    'payment_type'   => $pType,
                    'cash_amount'    => $ef,
                    'card_amount'    => $ta,
                    'voucher_amount' => $va,
                    'other_amount'   => $ot,
                    'opened_at'      => $dt,
                    'closed_at'      => $dt,
                    'items'          => [],
                ];
                $ticketFolios[] = $tid;

                if ($dt > $lastClosedDate) {
                    $lastClosedDate = $dt;
                }
            }

            if (!empty($data) && !empty($ticketFolios)) {
                $this->attachItemsToSalesPayload($data, $this->fetchTicketItemsByFolios('cheqdet', $ticketFolios));
            }

            $apiOk = false;
            if (!empty($data)) {
                $r = $this->sendToAPI('sales', $data);
                $apiOk = is_array($r) && (($r['success'] ?? false) === true);
                $this->log("[VENTAS] " . count($data) . " tickets → API | ins=" . ($r['inserted']??'?') . " upd=" . ($r['updated']??'?') . " fail=" . ($r['failed']??'?'));
            }

            if (!$apiOk) {
                $this->log("[VENTAS] API no confirmó éxito; no avanzo cursor para evitar pérdida de historial.");
                return;
            }

            // Solo avanzar cursor en modo histórico, no en tiempo real
            if ($this->initialLoad) {
                $this->state['sales'] = $lastClosedDate;
            }

            if ($this->initialLoad && $apiOk && count($rows) < BATCH_SIZE) {
                $this->initialLoad = false;
                $this->state['initial_load_done'] = true;
                $this->log("[VENTAS] ✓ Histórico completo. Cambiando a tiempo real.");
            }

        } catch (\Throwable $e) {
            $this->log("[VENTAS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CERRADAS DEL TURNO ACTUAL (durante carga histórica)
    // ─────────────────────────────────────────────────────────────
    private function syncTodayClosedSnapshot(): void {
        try {
            if (!$this->tableExists('cheques')) {
                return;
            }
            $shiftFilter = SHIFT_FILTER_C;
            // Misma fórmula de "total" que syncSales: si la propina va incluida en c.total, restarla para no inflar la venta neta.
            $sql = "SELECT TOP 400
                c.folio, c.numcheque, c.fecha,
                c.mesa,  c.nopersonas, c.idmesero, c.idturno,
                m.nombre AS nombre_mesero,
                CASE WHEN ISNULL(c.total,0) > 0
                     THEN c.total - CASE WHEN ISNULL(c.propinaincluida,0) > 0
                                         THEN ISNULL(c.propina,0) ELSE 0 END
                     ELSE ISNULL(c.subtotal,0) + ISNULL(c.totalimpuesto1,0)
                          - ISNULL(c.descuentoimporte,0)
                END                          AS total,
                ISNULL(c.subtotal,0)         AS subtotal,
                ISNULL(c.totalimpuesto1,0)   AS impuesto,
                ISNULL(c.propina,0)          AS propina,
                ISNULL(c.propinaincluida,0)  AS propinaincluida,
                ISNULL(c.propinapagada,0)    AS propinapagada,
                ISNULL(c.descuentoimporte,0) AS descuento,
                ISNULL(c.efectivo,0)         AS efectivo,
                ISNULL(c.tarjeta,0)          AS tarjeta,
                ISNULL(c.vales,0)            AS vales,
                ISNULL(c.otros,0)            AS otros
            FROM cheques c
            LEFT JOIN meseros m ON m.idmesero = c.idmesero
            WHERE c.cancelado = 0
              AND c.pagado = 1
              AND ($shiftFilter)
            ORDER BY c.fecha DESC";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data = [];
            $ticketFolios = [];
            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['fecha']);
                if (!$fechaObj) {
                    continue;
                }
                $dt  = $fechaObj->format('Y-m-d H:i:s');
                $ef  = floatval($r['efectivo']);
                $ta  = floatval($r['tarjeta']);
                $va  = floatval($r['vales']);
                $ot  = floatval($r['otros']);
                $n   = ($ef>0?1:0)+($ta>0?1:0)+($va>0?1:0)+($ot>0?1:0);
                if ($n > 1)    $pType = 'mixed';
                elseif ($ta>0) $pType = 'card';
                elseif ($va>0) $pType = 'voucher';
                elseif ($ot>0) $pType = 'transfer';
                else           $pType = 'cash';

                $tid = trim((string)($r['folio'] ?? ''));
                $data[] = [
                    'sr_ticket_id'   => $tid,
                    'ticket_number'  => (string)($r['numcheque'] ?? $tid),
                    'folio'          => (string)($r['numcheque'] ?? $tid),
                    'sale_date'      => $fechaObj->format('Y-m-d'),
                    'sale_time'      => $fechaObj->format('H:i:s'),
                    'sale_datetime'  => $dt,
                    'table_number'   => trim((string)($r['mesa']          ?? '')),
                    'waiter_id'      => trim((string)($r['idmesero']      ?? '')),
                    'waiter_name'    => trim((string)($r['nombre_mesero'] ?? '')),
                    'covers'         => intval($r['nopersonas'] ?? 0),
                    'shift_id'       => (string)($r['idturno'] ?? ''),
                    'subtotal'       => floatval($r['subtotal']),
                    'tax'            => floatval($r['impuesto']),
                    'discount'       => floatval($r['descuento']),
                    'tip'            => floatval($r['propina']),
                    'tip_included'   => floatval($r['propinaincluida']),
                    'tip_paid'       => intval($r['propinapagada']),
                    'total'          => floatval($r['total']),
                    'status'         => 'closed',
                    'payment_type'   => $pType,
                    'cash_amount'    => $ef,
                    'card_amount'    => $ta,
                    'voucher_amount' => $va,
                    'other_amount'   => $ot,
                    'opened_at'      => $dt,
                    'closed_at'      => $dt,
                    'items'          => [],
                ];
                $ticketFolios[] = $tid;
            }

            if (!empty($data) && !empty($ticketFolios)) {
                $this->attachItemsToSalesPayload($data, $this->fetchTicketItemsByFolios('cheqdet', $ticketFolios));
            }

            if (!empty($data)) {
                $r = $this->sendToAPI('sales', $data);
                $this->log("[HOY-CERRADAS] " . count($data) . " tickets enviados durante histórico | ins=" . ($r['inserted'] ?? '?') . " upd=" . ($r['updated'] ?? '?'));
            }
        } catch (\Throwable $e) {
            $this->log("[HOY-CERRADAS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // TICKETS ABIERTOS (tempcheques) — siempre el turno actual
    // ─────────────────────────────────────────────────────────────
    private function syncTodayOpen(): void {
        try {
            // Filtro de turno actual para tempcheques (igual que SHIFT_FILTER_C pero para tempcheques)
            $shiftFilterT = "
                (
                    t.fecha >= DATEADD(HOUR, 8, CAST(
                        CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                             THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                             ELSE CONVERT(date, GETDATE()) END
                    AS datetime))
                    AND t.fecha < DATEADD(HOUR, 8, CAST(
                        CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                             THEN CONVERT(date, GETDATE())
                             ELSE DATEADD(DAY,1, CONVERT(date, GETDATE())) END
                    AS datetime))
                )
            ";

            $sql = "SELECT
                t.folio, t.numcheque, t.fecha, t.mesa, t.nopersonas,
                t.idmesero, m.nombre AS nombre_mesero,
                CASE WHEN ISNULL(t.total,0) > 0
                     THEN t.total - CASE WHEN ISNULL(t.propinaincluida,0) > 0
                                         THEN ISNULL(t.propina,0) ELSE 0 END
                     ELSE ISNULL(t.subtotal,0) + ISNULL(t.totalimpuesto1,0)
                          - ISNULL(t.descuentoimporte,0)
                END                              AS total,
                ISNULL(t.subtotal,0)             AS subtotal,
                ISNULL(t.totalimpuesto1,0)       AS impuesto,
                ISNULL(t.propina,0)              AS propina,
                ISNULL(t.propinaincluida,0)      AS propinaincluida,
                ISNULL(t.descuentoimporte,0)     AS descuento
            FROM tempcheques t
            LEFT JOIN meseros m ON m.idmesero = t.idmesero
            WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
              AND ($shiftFilterT)";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data = [];
            $ticketFolios = [];
            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['fecha']);
                if (!$fechaObj) {
                    continue;
                }
                $dt    = $fechaObj->format('Y-m-d H:i:s');
                $tid   = trim((string)($r['folio'] ?? ''));
                $data[] = [
                    'sr_ticket_id'   => $tid,
                    'ticket_number'  => (string)($r['numcheque'] ?? $tid),
                    'folio'          => (string)($r['numcheque'] ?? $tid),
                    'sale_date'      => $fechaObj->format('Y-m-d'),
                    'sale_time'      => $fechaObj->format('H:i:s'),
                    'sale_datetime'  => $dt,
                    'table_number'   => trim((string)($r['mesa']          ?? '')),
                    'waiter_id'      => trim((string)($r['idmesero']      ?? '')),
                    'waiter_name'    => trim((string)($r['nombre_mesero'] ?? '')),
                    'covers'         => intval($r['nopersonas'] ?? 0),
                    'shift_id'       => '',
                    'subtotal'       => floatval($r['subtotal']),
                    'tax'            => floatval($r['impuesto']),
                    'discount'       => floatval($r['descuento']),
                    'tip'            => floatval($r['propina']),
                    'tip_included'   => floatval($r['propinaincluida']),
                    'tip_paid'       => 0,
                    'total'          => floatval($r['total']),
                    'status'         => 'open',
                    'payment_type'   => 'pending',
                    'cash_amount'    => 0.0,
                    'card_amount'    => 0.0,
                    'voucher_amount' => 0.0,
                    'other_amount'   => 0.0,
                    'opened_at'      => $dt,
                    'closed_at'      => null,
                    'items'          => [],
                ];
                $ticketFolios[] = $tid;
            }

            if (!empty($data) && !empty($ticketFolios)) {
                $this->attachItemsToSalesPayload($data, $this->fetchTicketItemsByFolios('tempcheqdet', $ticketFolios));
            }

            if (!empty($data)) {
                $this->sendToAPI('sales', $data);
                $this->log("[ABIERTOS] " . count($data) . " mesas abiertas enviadas.");
            }
        } catch (\Throwable $e) {
            $this->log("[ABIERTOS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // FORMAS DE PAGO (chequespagos) — solo turno actual
    // ─────────────────────────────────────────────────────────────
    private function syncTodayChequePayments(): void {
        try {
            if (!$this->tableExists('chequespagos') || !$this->tableExists('cheques')) {
                return;
            }
            $shiftFilter = str_replace('c.fecha', 'ch.fecha', SHIFT_FILTER_C);
            $sql = "SELECT
                cp.folio,
                cp.idformadepago,
                ISNULL(cp.importe, 0) AS importe,
                cp.referencia,
                ch.fecha AS cheque_fecha
            FROM chequespagos cp
            INNER JOIN cheques ch ON ch.folio = cp.folio
            WHERE ch.cancelado = 0
              AND ($shiftFilter)";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data = [];
            $i = 0;
            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['cheque_fecha']);
                $folio = (string)($r['folio'] ?? '');
                $idForma = (string)($r['idformadepago'] ?? '');
                $amount = floatval($r['importe']);
                $lineId = trim($folio) . '|' . trim($idForma) . '|' . number_format($amount, 4, '.', '') . '|' . ($fechaObj ? $fechaObj->format('Y-m-d H:i:s') : 'nodt') . '|' . $i;
                $data[] = [
                    'folio'           => $folio,
                    'line_id'         => $lineId,
                    'id_forma_pago'   => $idForma,
                    'amount'          => $amount,
                    'reference'       => (string)($r['referencia'] ?? ''),
                    'payment_datetime'=> $fechaObj ? $fechaObj->format('Y-m-d H:i:s') : null,
                ];
                $i++;
            }

            if (!empty($data)) {
                $this->sendToAPI('cheque_payments', $data);
                $this->log("[PAGOS] " . count($data) . " líneas de pago enviadas.");
            }
        } catch (\Throwable $e) {
            $this->log("[PAGOS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // PRODUCTOS POR TICKET (cheqdet) — solo turno actual
    // ─────────────────────────────────────────────────────────────
    private function syncTodayTicketItems(): void {
        try {
            if (!$this->tableExists('cheques') && !$this->tableExists('tempcheques')) {
                return;
            }
            $nameCol = null;
            if ($this->tableExists('productos')) {
                $nameCol = $this->firstExistingColumn('productos', ['descripcion', 'nombre', 'nombremostrar', 'name']);
            }

            $buildSelect = function (string $detailTable, string $headerTable, string $headerAlias, string $headerFilter) use ($nameCol): ?string {
                if (!$this->tableExists($detailTable) || !$this->tableExists($headerTable)) {
                    return null;
                }

                $folioCol = $this->firstExistingColumn($detailTable, ['foliodet', 'folio', 'idcheque', 'numcheque']) ?? 'foliodet';
                $qtyCol = $this->firstExistingColumn($detailTable, ['cantidad', 'qty']) ?? 'cantidad';
                $priceCol = $this->firstExistingColumn($detailTable, ['precio', 'unit_price']) ?? 'precio';
                $discountCol = $this->firstExistingColumn($detailTable, ['descuento', 'discount']);
                $notesCol = $this->firstExistingColumn($detailTable, ['comentario', 'observaciones', 'notes']);

                $productNameExpr = $nameCol
                    ? "ISNULL(CAST(p.$nameCol AS VARCHAR(255)), CAST(d.idproducto AS VARCHAR(50)))"
                    : "CAST(d.idproducto AS VARCHAR(50))";
                $discountExpr = $discountCol ? "ISNULL(CAST(d.$discountCol AS DECIMAL(10,2)),0)" : "CAST(0 AS DECIMAL(10,2))";
                $notesExpr = $notesCol ? "ISNULL(CAST(d.$notesCol AS VARCHAR(255)), '')" : "CAST('' AS VARCHAR(255))";
                $joinProductos = $this->tableExists('productos')
                    ? "LEFT JOIN productos p ON p.idproducto = d.idproducto"
                    : "";

                return "SELECT
                    CAST(d.$folioCol AS VARCHAR(50)) AS folio,
                    CAST(d.idproducto AS VARCHAR(50)) AS product_id,
                    $productNameExpr AS product_name,
                    ISNULL(CAST(d.$qtyCol AS DECIMAL(10,3)),1) AS qty,
                    ISNULL(CAST(d.$priceCol AS DECIMAL(10,2)),0) AS unit_price,
                    $discountExpr AS discount,
                    $notesExpr AS notes
                FROM $detailTable d
                $joinProductos
                INNER JOIN $headerTable $headerAlias ON $headerAlias.folio = d.$folioCol
                WHERE $headerFilter
                  AND d.idproducto IS NOT NULL";
            };

            $shiftFilterT = "
                (
                    th.fecha >= DATEADD(HOUR, 8, CAST(
                        CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                             THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                             ELSE CONVERT(date, GETDATE()) END
                    AS datetime))
                    AND th.fecha < DATEADD(HOUR, 8, CAST(
                        CASE WHEN DATEPART(HOUR, GETDATE()) < 8
                             THEN CONVERT(date, GETDATE())
                             ELSE DATEADD(DAY,1, CONVERT(date, GETDATE())) END
                    AS datetime))
                )
            ";

            $selects = [];

            $closedSelect = $buildSelect(
                'cheqdet',
                'cheques',
                'ch',
                'ch.fecha >= DATEADD(HOUR, -48, GETDATE()) AND ch.pagado = 1 AND ch.cancelado = 0 AND ISNULL(d.modificador,0) = 0'
            );
            if ($closedSelect !== null) {
                $selects[] = $closedSelect;
            }

            $openSelect = $buildSelect(
                'tempcheqdet',
                'tempcheques',
                'th',
                "NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = th.folio) AND ($shiftFilterT)"
            );
            if ($openSelect !== null) {
                $selects[] = $openSelect;
            }

            if ($selects === []) {
                return;
            }

            $sql = implode("\nUNION ALL\n", $selects) . "\nORDER BY folio";
            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            // Agrupar por folio
            $byFolio = [];
            foreach ($rows as $r) {
                $folio = (string)$r['folio'];
                $qty   = floatval($r['qty']);
                $price = floatval($r['unit_price']);
                $disc  = floatval($r['discount']);
                $byFolio[$folio][] = [
                    'product_id'   => (string)($r['product_id'] ?? ''),
                    'product_name' => trim((string)($r['product_name'] ?? '')),
                    'qty'          => $qty,
                    'unit_price'   => $price,
                    'subtotal'     => round($qty * $price - $disc, 2),
                    'discount'     => $disc,
                    'notes'        => trim((string)($r['notes'] ?? '')),
                ];
            }

            $data = [];
            foreach ($byFolio as $folio => $items) {
                $data[] = ['folio' => $folio, 'items' => $items];
            }

            $this->sendToAPI('ticket_items', $data);
            $this->log("[ITEMS] " . count($byFolio) . " tickets con productos enviados.");
        } catch (\Throwable $e) {
            $this->log("[ITEMS] ERROR: " . $e->getMessage());
        }
    }

    private function fetchTicketItemsByFolios(string $detailTable, array $folios): array {
        $folios = array_values(array_unique(array_filter(array_map(static fn ($v) => trim((string)$v), $folios), static fn ($v) => $v !== '')));
        if ($folios === [] || !$this->tableExists($detailTable)) {
            return [];
        }

        $folioCol = $this->firstExistingColumn($detailTable, ['foliodet', 'folio', 'idcheque', 'numcheque']) ?? 'foliodet';
        $qtyCol = $this->firstExistingColumn($detailTable, ['cantidad', 'qty']) ?? 'cantidad';
        $priceCol = $this->firstExistingColumn($detailTable, ['precio', 'unit_price']) ?? 'precio';
        $discountCol = $this->firstExistingColumn($detailTable, ['descuento', 'discount']);
        $notesCol = $this->firstExistingColumn($detailTable, ['comentario', 'observaciones', 'notes']);
        $nameCol = $this->tableExists('productos')
            ? $this->firstExistingColumn('productos', ['descripcion', 'nombre', 'nombremostrar', 'name'])
            : null;

        $productNameExpr = $nameCol
            ? "ISNULL(CAST(p.$nameCol AS VARCHAR(255)), CAST(d.idproducto AS VARCHAR(50)))"
            : "CAST(d.idproducto AS VARCHAR(50))";
        $discountExpr = $discountCol ? "ISNULL(CAST(d.$discountCol AS DECIMAL(10,2)),0)" : "CAST(0 AS DECIMAL(10,2))";
        $notesExpr = $notesCol ? "ISNULL(CAST(d.$notesCol AS VARCHAR(255)), '')" : "CAST('' AS VARCHAR(255))";
        $joinProductos = $this->tableExists('productos')
            ? "LEFT JOIN productos p ON p.idproducto = d.idproducto"
            : "";
        $placeholders = implode(',', array_fill(0, count($folios), '?'));

        $sql = "SELECT
            CAST(d.$folioCol AS VARCHAR(50)) AS folio,
            CAST(d.idproducto AS VARCHAR(50)) AS product_id,
            $productNameExpr AS product_name,
            ISNULL(CAST(d.$qtyCol AS DECIMAL(10,3)),1) AS qty,
            ISNULL(CAST(d.$priceCol AS DECIMAL(10,2)),0) AS unit_price,
            $discountExpr AS discount,
            $notesExpr AS notes
        FROM $detailTable d
        $joinProductos
        WHERE CAST(d.$folioCol AS VARCHAR(50)) IN ($placeholders)
          AND d.idproducto IS NOT NULL
          AND ISNULL(d.modificador, 0) = 0
        ORDER BY d.$folioCol";

        $stmt = $this->conn->prepare($sql);
        $stmt->execute($folios);
        $rows = $stmt->fetchAll();
        if (!$rows) {
            return [];
        }

        $byFolio = [];
        foreach ($rows as $r) {
            $folio = trim((string)($r['folio'] ?? ''));
            if ($folio === '') {
                continue;
            }
            $qty = floatval($r['qty'] ?? 0);
            $price = floatval($r['unit_price'] ?? 0);
            $disc = floatval($r['discount'] ?? 0);
            $byFolio[$folio][] = [
                'product_id'   => (string)($r['product_id'] ?? ''),
                'product_name' => trim((string)($r['product_name'] ?? '')),
                'qty'          => $qty,
                'unit_price'   => $price,
                'subtotal'     => round($qty * $price - $disc, 2),
                'discount'     => $disc,
                'notes'        => trim((string)($r['notes'] ?? '')),
            ];
        }

        return $byFolio;
    }

    private function attachItemsToSalesPayload(array &$salesPayload, array $itemsByFolio): void {
        if ($salesPayload === [] || $itemsByFolio === []) {
            return;
        }

        foreach ($salesPayload as &$sale) {
            $srTicketId = trim((string)($sale['sr_ticket_id'] ?? ''));
            if ($srTicketId !== '' && isset($itemsByFolio[$srTicketId])) {
                $sale['items'] = $itemsByFolio[$srTicketId];
            }
        }
        unset($sale);
    }

    private function mergeCancellationRow(array &$byTicket, array $row): void {
        $ticketNumber = trim((string)($row['ticket_number'] ?? $row['folio'] ?? ''));
        if ($ticketNumber === '') {
            return;
        }

        $fObj = $this->toDatetime($row['cancel_date'] ?? $row['fecha'] ?? null);
        if (!$fObj) {
            return;
        }

        $key = strtolower(trim(str_replace('#', '', $ticketNumber)));
        $candidate = [
            'ticket_number' => $ticketNumber,
            'amount'        => floatval($row['amount'] ?? $row['total'] ?? 0),
            'user_name'     => trim((string)($row['user_name'] ?? $row['usuario'] ?? '')),
            'reason'        => trim((string)($row['reason'] ?? $row['motivo'] ?? '')),
            'status'        => 'cancelled',
            'cancel_date'   => $fObj->format('Y-m-d H:i:s'),
        ];

        if (!isset($byTicket[$key])) {
            $byTicket[$key] = $candidate;
            return;
        }

        $current = $byTicket[$key];
        if ($candidate['cancel_date'] > $current['cancel_date']) {
            $current['cancel_date'] = $candidate['cancel_date'];
            $current['amount'] = $candidate['amount'];
        }
        if ($current['user_name'] === '' && $candidate['user_name'] !== '') {
            $current['user_name'] = $candidate['user_name'];
        }
        if ($current['reason'] === '' && $candidate['reason'] !== '') {
            $current['reason'] = $candidate['reason'];
        }
        $byTicket[$key] = $current;
    }

    private function sortCancellationRows(array $rows): array {
        usort($rows, static function (array $a, array $b): int {
            $cmp = strcmp((string)($a['cancel_date'] ?? ''), (string)($b['cancel_date'] ?? ''));
            if ($cmp !== 0) {
                return $cmp;
            }
            return strcmp((string)($a['ticket_number'] ?? ''), (string)($b['ticket_number'] ?? ''));
        });
        return $rows;
    }

    private function sqlSafeDatetimeExpr(string $columnExpr, ?string $fallbackExpr = null): string {
        $primary = "CASE
            WHEN ISDATE(CAST($columnExpr AS NVARCHAR(50))) = 1
                THEN CONVERT(DATETIME, CAST($columnExpr AS NVARCHAR(50)))
            ELSE NULL
        END";

        if ($fallbackExpr === null) {
            return $primary;
        }

        $fallback = "CASE
            WHEN ISDATE(CAST($fallbackExpr AS NVARCHAR(50))) = 1
                THEN CONVERT(DATETIME, CAST($fallbackExpr AS NVARCHAR(50)))
            ELSE NULL
        END";

        return "COALESCE($primary, $fallback)";
    }

    private function fetchCancellationRowsAfter(string $after, int $limit): array {
        $limit = max(1, $limit);
        $sampleLimit = max($limit * 4, 200);
        $byTicket = [];

        // Fuente 1: tabla cancelaciones (existe solo en algunas versiones de SR).
        // Aislada en try/catch propio para que un error de columnas no impida leer cheques.
        if ($this->tableExists('cancelaciones')) {
            try {
                $sql = "SELECT TOP $sampleLimit
                    folio AS ticket_number,
                    fecha AS cancel_date,
                    ISNULL(total,0) AS amount,
                    usuario AS user_name,
                    motivo AS reason
                FROM cancelaciones
                WHERE fecha > ?
                ORDER BY fecha ASC";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$after]);
                foreach ($stmt->fetchAll() as $row) {
                    $this->mergeCancellationRow($byTicket, $row);
                }
            } catch (\Throwable $e) {
                // Columnas distintas u otro error en esta tabla: continuar con la fuente de cheques
                $this->log("[CANCELACIONES] cancelaciones table query error (se continúa con cheques): " . $e->getMessage());
            }
        }

        // Fuente 2: cheques con cancelado=1.
        // COALESCE(fechacancelado, fecha): SR frecuentemente NO llena fechacancelado aunque sí pone cancelado=1.
        // Si fechacancelado es NULL se usa fecha (fecha de apertura del ticket) como fecha de cancelación.
        if ($this->tableExists('cheques')) {
            try {
                $sql = "SELECT TOP $sampleLimit
                    CAST(folio AS VARCHAR(50)) AS ticket_number,
                    COALESCE(fechacancelado, fecha) AS cancel_date,
                    ISNULL(total,0) AS amount,
                    ISNULL(CAST(usuariocancelo AS VARCHAR(120)),'') AS user_name,
                    ISNULL(CAST(razoncancelado AS VARCHAR(255)),'') AS reason
                FROM cheques
                WHERE ISNULL(cancelado,0) = 1
                  AND COALESCE(fechacancelado, fecha) > CONVERT(DATETIME, ?, 120)
                ORDER BY COALESCE(fechacancelado, fecha) ASC";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$after]);
                foreach ($stmt->fetchAll() as $row) {
                    $this->mergeCancellationRow($byTicket, $row);
                }
            } catch (\Throwable $e) {
                $this->log("[CANCELACIONES] cheques cancelled query error: " . $e->getMessage());
            }
        }

        $rows = $this->sortCancellationRows(array_values($byTicket));
        if (count($rows) > $limit) {
            $rows = array_slice($rows, 0, $limit);
        }
        return $rows;
    }

    private function fetchRecentCancellationRows(int $hours = 96): array {
        $byTicket = [];

        // Fuente 1: tabla cancelaciones (aislada para no bloquear la fuente principal)
        if ($this->tableExists('cancelaciones')) {
            try {
                $sql = "SELECT
                    folio AS ticket_number,
                    fecha AS cancel_date,
                    ISNULL(total,0) AS amount,
                    usuario AS user_name,
                    motivo AS reason
                FROM cancelaciones
                WHERE fecha >= DATEADD(HOUR, -$hours, GETDATE())
                ORDER BY fecha DESC";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute();
                foreach ($stmt->fetchAll() as $row) {
                    $this->mergeCancellationRow($byTicket, $row);
                }
            } catch (\Throwable $e) {
                $this->log("[CANCELACIONES] cancelaciones recent query error (se continúa con cheques): " . $e->getMessage());
            }
        }

        // Fuente 2: cheques con cancelado=1 en las últimas $hours horas.
        // COALESCE(fechacancelado, fecha): SR frecuentemente NO llena fechacancelado.
        if ($this->tableExists('cheques')) {
            try {
                $sql = "SELECT
                    CAST(folio AS VARCHAR(50)) AS ticket_number,
                    COALESCE(fechacancelado, fecha) AS cancel_date,
                    ISNULL(total,0) AS amount,
                    ISNULL(CAST(usuariocancelo AS VARCHAR(120)),'') AS user_name,
                    ISNULL(CAST(razoncancelado AS VARCHAR(255)),'') AS reason
                FROM cheques
                WHERE ISNULL(cancelado,0) = 1
                  AND COALESCE(fechacancelado, fecha) >= DATEADD(HOUR, -$hours, GETDATE())
                ORDER BY COALESCE(fechacancelado, fecha) DESC";
                $stmt = $this->conn->prepare($sql);
                $stmt->execute();
                foreach ($stmt->fetchAll() as $row) {
                    $this->mergeCancellationRow($byTicket, $row);
                }
            } catch (\Throwable $e) {
                $this->log("[CANCELACIONES] cheques recent cancelled query error: " . $e->getMessage());
            }
        }

        return $this->sortCancellationRows(array_values($byTicket));
    }

    // ─────────────────────────────────────────────────────────────
    // MOVIMIENTOS DE CAJA + PROPINAS (movtoscaja)
    // ─────────────────────────────────────────────────────────────
    private function syncCashMovements(): void {
        if ($this->initialLoad) {
            return;
        }
        try {
            $lastSync = $this->state['cash_movements'] ?? HISTORY_START;
            $dp       = $this->dateParts($lastSync);
            $Y=$dp['Y']; $M=$dp['M']; $D=$dp['D'];
            $H=$dp['H']; $I=$dp['I']; $S=$dp['S'];

            $dateFilter = "
                (YEAR(fecha) > $Y)
                OR (YEAR(fecha)=$Y AND MONTH(fecha) > $M)
                OR (YEAR(fecha)=$Y AND MONTH(fecha)=$M AND DAY(fecha) > $D)
                OR (YEAR(fecha)=$Y AND MONTH(fecha)=$M AND DAY(fecha)=$D AND DATEPART(HOUR,fecha) > $H)
                OR (YEAR(fecha)=$Y AND MONTH(fecha)=$M AND DAY(fecha)=$D AND DATEPART(HOUR,fecha)=$H AND DATEPART(MINUTE,fecha) > $I)
                OR (YEAR(fecha)=$Y AND MONTH(fecha)=$M AND DAY(fecha)=$D AND DATEPART(HOUR,fecha)=$H AND DATEPART(MINUTE,fecha)=$I AND DATEPART(SECOND,fecha) > $S)
            ";

            $sql = "SELECT TOP 100
                folio, foliomovto, tipo, idturno, concepto, referencia,
                importe, fecha, cancelado, usuariocancelo, pagodepropina, idempresa
            FROM movtoscaja
            WHERE cancelado = 0
              AND ($dateFilter)
            ORDER BY fecha ASC";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data     = [];
            $lastDate = $lastSync;

            foreach ($rows as $r) {
                $fObj = $this->toDatetime($r['fecha']);
                if (!$fObj) {
                    continue;
                }
                $dt      = $fObj->format('Y-m-d H:i:s');
                $importe = floatval($r['importe']);
                $tipo    = intval($r['tipo']);
                $isTip   = intval($r['pagodepropina'] ?? 0) === 1;

                if ($isTip)          $mType = 'tip_payment';
                elseif ($tipo === 1) $mType = 'withdrawal';
                elseif ($tipo === 2) $mType = 'deposit';
                else                 $mType = 'other';

                $signed = ($mType === 'withdrawal' || $mType === 'tip_payment')
                    ? -abs($importe) : abs($importe);

                $data[] = [
                    'movement_id'       => (string)($r['folio'] ?? '0') . '_' . $fObj->format('YmdHis'),
                    'folio_movto'       => (string)($r['foliomovto']     ?? ''),
                    'movement_type'     => $mType,
                    'tipo_original'     => $tipo,
                    'amount'            => abs($importe),
                    'amount_signed'     => $signed,
                    'movement_date'     => $fObj->format('Y-m-d'),
                    'movement_time'     => $fObj->format('H:i:s'),
                    'movement_datetime' => $dt,
                    'shift_id'          => (string)($r['idturno']        ?? ''),
                    'concept'           => (string)($r['concepto']       ?? ''),
                    'reference'         => (string)($r['referencia']     ?? ''),
                    'user_cancel'       => (string)($r['usuariocancelo'] ?? ''),
                    'is_tip_payment'    => $isTip,
                    'company_id'        => (string)($r['idempresa']      ?? '1'),
                ];

                if ($dt > $lastDate) {
                    $lastDate = $dt;
                }
            }

            if (!empty($data)) {
                $this->sendToAPI('cash_movements', $data);
                $this->log("[CAJA] " . count($data) . " movimientos enviados.");
            }
            $this->state['cash_movements'] = $lastDate;

        } catch (\Throwable $e) {
            $this->log("[CAJA] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CORTES DE CAJA (turnos)
    // ─────────────────────────────────────────────────────────────
    private function syncShifts(): void {
        try {
            $lastSync = $this->state['shifts'] ?? HISTORY_START;
            $dp       = $this->dateParts($lastSync);
            $Y=$dp['Y']; $M=$dp['M']; $D=$dp['D'];
            $H=$dp['H']; $I=$dp['I']; $S=$dp['S'];

            $dateFilter = "
                (YEAR(cierre) > $Y)
                OR (YEAR(cierre)=$Y AND MONTH(cierre) > $M)
                OR (YEAR(cierre)=$Y AND MONTH(cierre)=$M AND DAY(cierre) > $D)
                OR (YEAR(cierre)=$Y AND MONTH(cierre)=$M AND DAY(cierre)=$D AND DATEPART(HOUR,cierre) > $H)
                OR (YEAR(cierre)=$Y AND MONTH(cierre)=$M AND DAY(cierre)=$D AND DATEPART(HOUR,cierre)=$H AND DATEPART(MINUTE,cierre) > $I)
                OR (YEAR(cierre)=$Y AND MONTH(cierre)=$M AND DAY(cierre)=$D AND DATEPART(HOUR,cierre)=$H AND DATEPART(MINUTE,cierre)=$I AND DATEPART(SECOND,cierre) > $S)
            ";

            $sql = "SELECT TOP 200
                idturnointerno, idturno, cajero, idestacion,
                apertura, cierre,
                ISNULL(fondo,0)    AS fondo,
                ISNULL(efectivo,0) AS efectivo,
                ISNULL(tarjeta,0)  AS tarjeta,
                ISNULL(vales,0)    AS vales,
                ISNULL(credito,0)  AS credito,
                idempresa
            FROM turnos
            WHERE cierre IS NOT NULL
              AND ($dateFilter)
            ORDER BY cierre ASC";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data     = [];
            $lastDate = $lastSync;

            foreach ($rows as $r) {
                $cObj = $this->toDatetime($r['cierre']);
                if (!$cObj) {
                    continue;
                }
                $aObj     = $this->toDatetime($r['apertura']);
                $cierre   = $cObj->format('Y-m-d H:i:s');
                $apertura = $aObj ? $aObj->format('Y-m-d H:i:s') : null;
                if ($cierre > $lastDate) {
                    $lastDate = $cierre;
                }

                $data[] = [
                    'sr_shift_id'        => (string)($r['idturnointerno'] ?? ''),
                    'sr_turno_id'        => (string)($r['idturno']        ?? ''),
                    'cajero'             => trim((string)($r['cajero']    ?? '')),
                    'estacion'           => trim((string)($r['idestacion']?? '')),
                    'apertura'           => $apertura,
                    'cierre'             => $cierre,
                    'fondo'              => floatval($r['fondo']),
                    'declarado_efectivo' => floatval($r['efectivo']),
                    'declarado_tarjeta'  => floatval($r['tarjeta']),
                    'declarado_vales'    => floatval($r['vales']),
                    'declarado_credito'  => floatval($r['credito']),
                    'company_id'         => (string)($r['idempresa'] ?? ''),
                ];
            }

            if (!empty($data)) {
                $this->sendToAPI('shifts', $data);
                $this->state['shifts'] = $lastDate;
                $this->log("[TURNOS] " . count($data) . " cortes enviados.");
            }

        } catch (\Throwable $e) {
            $this->log("[TURNOS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // CANCELACIONES
    // ─────────────────────────────────────────────────────────────
    private function syncCancellations(): void {
        try {
            $cursor     = (string)($this->state['cancellations'] ?? HISTORY_START);
            $batchLimit = $this->initialLoad ? max(BATCH_SIZE * 4, 200) : max(BATCH_SIZE * 2, 100);

            // Batch histórico: solo sirve para avanzar cursor y cubrir el pasado
            $batchData = $this->fetchCancellationRowsAfter($cursor, $batchLimit);
            $data      = $batchData;

            // En tiempo real: SIEMPRE incluir también las últimas 96h como complemento.
            // Garantiza que las cancelaciones de HOY aparecen inmediatamente aunque
            // el cursor histórico aún esté avanzando por tickets cancelados del pasado.
            // Una sola consulta extra; sin llamadas dobles a fetchCancellationRowsAfter.
            if (!$this->initialLoad) {
                $recent = $this->fetchRecentCancellationRows(96);
                if (!empty($recent)) {
                    // Merge sin duplicados: batch histórico tiene prioridad (ya indexado)
                    $byKey = [];
                    foreach ($data as $row) {
                        $k = strtolower(trim(str_replace('#', '', (string)($row['ticket_number'] ?? ''))));
                        if ($k !== '') {
                            $byKey[$k] = $row;
                        }
                    }
                    foreach ($recent as $row) {
                        $k = strtolower(trim(str_replace('#', '', (string)($row['ticket_number'] ?? ''))));
                        if ($k !== '' && !isset($byKey[$k])) {
                            $byKey[$k] = $row;
                        }
                    }
                    $data = array_values($byKey);
                }
            }

            if (!empty($data)) {
                $r     = $this->sendToAPI('cancellations', $data);
                $apiOk = is_array($r) && (($r['success'] ?? false) === true);
                if ($apiOk) {
                    // Avanzar cursor solo con los datos del batch histórico (no de "recientes")
                    if (!empty($batchData)) {
                        $last           = end($batchData);
                        $lastCancelDate = (string)($last['cancel_date'] ?? $cursor);
                        if ($lastCancelDate > $cursor) {
                            $this->state['cancellations'] = $lastCancelDate;
                        }
                    }
                    $this->log("[CANCELACIONES] " . count($data) . " enviadas.");
                } else {
                    $this->log("[CANCELACIONES] API no confirmó éxito; mantengo cursor en $cursor.");
                }
            }
        } catch (\Throwable $e) {
            $this->log("[CANCELACIONES] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // ASISTENCIAS (registroasistencias)
    // ─────────────────────────────────────────────────────────────
    private function syncAttendance(): void {
        if ($this->initialLoad) {
            return;
        }
        try {
            if (!$this->tableExists('registroasistencias')) {
                return;
            }
            $sql = "SELECT
                r.idempleado, r.entrada, r.salida
            FROM registroasistencias r
            WHERE CAST(r.entrada AS DATE) = CAST(GETDATE() AS DATE)";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $inObj    = $this->toDatetime($r['entrada']);
                $outObj   = $this->toDatetime($r['salida']);
                $clockIn  = $inObj  ? $inObj->format('Y-m-d H:i:s')  : null;
                $clockOut = $outObj ? $outObj->format('Y-m-d H:i:s') : null;
                $date     = $inObj  ? $inObj->format('Y-m-d') : date('Y-m-d');
                $minutes  = ($clockIn && $clockOut)
                    ? max(0, (int)((strtotime($clockOut) - strtotime($clockIn)) / 60))
                    : 0;
                $status = !$clockIn ? 'absent' : ($clockOut ? 'left' : 'present');
                $nombre = 'Empleado ' . (string)($r['idempleado'] ?? '');

                $data[] = [
                    'employee_id'    => (string)($r['idempleado'] ?? ''),
                    'employee_name'  => $nombre,
                    'position'       => '',
                    'date'           => $date,
                    'clock_in'       => $clockIn,
                    'clock_out'      => $clockOut,
                    'shift'          => 'regular',
                    'status'         => $status,
                    'minutes_worked' => $minutes,
                    'notes'          => '',
                ];
            }

            if (!empty($data)) {
                $this->sendToAPI('attendance', $data);
                $this->log("[ASISTENCIAS] " . count($data) . " registros enviados.");
            }
        } catch (\Throwable $e) {
            $this->log("[ASISTENCIAS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MESEROS (una sola vez, en tiempo real)
    // ─────────────────────────────────────────────────────────────
    private function syncWaiters(): void {
        // Solo una vez por hora
        $lastSync = $this->state['waiters_synced_at'] ?? 0;
        if ((time() - $lastSync) < 3600) {
            return;
        }
        try {
            if (!$this->tableExists('meseros')) {
                return;
            }
            $sql = "SELECT
                idmesero, idmeserointerno, nombre, tipo,
                ISNULL(visible,1) AS visible, idempresa
            FROM meseros
            WHERE ISNULL(visible,1) = 1
            ORDER BY nombre";

            $rows = $this->conn->query($sql)->fetchAll();
            if (count($rows) === 0) {
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $data[] = [
                    'sr_employee_id'  => trim((string)($r['idmesero'] ?? '')),
                    'employee_code'   => (string)($r['idmeserointerno'] ?? $r['idmesero'] ?? ''),
                    'full_name'       => trim((string)($r['nombre'] ?? '')),
                    'position'        => 'Mesero',
                    'department'      => 'Servicio',
                    'is_waiter'       => 1,
                    'is_active'       => intval($r['visible'] ?? 1),
                    'hire_date'       => date('Y-m-d'),
                    'phone'           => '',
                    'email'           => '',
                    'commission_rate' => 0.0,
                ];
            }

            if (!empty($data)) {
                $res = $this->sendToAPI('employees', $data);
                $this->state['waiters_synced_at'] = time();
                $this->log("[MESEROS] " . count($data) . " meseros sincronizados | ins=" . ($res['inserted'] ?? '?') . " upd=" . ($res['updated'] ?? '?'));
            }
        } catch (\Throwable $e) {
            $this->log("[MESEROS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // MÓDULOS DE CATÁLOGO (products/tables/reservations/inventory)
    // ─────────────────────────────────────────────────────────────
    private function syncCatalogModules(): void {
        $lastSync = intval($this->state['catalog_synced_at'] ?? 0);
        if ((time() - $lastSync) < 900) { // cada 15 min
            return;
        }
        $this->syncProducts();
        $this->syncTables();
        $this->syncReservations();
        $this->syncInventory();
        $this->state['catalog_synced_at'] = time();
    }

    private function syncProducts(): void {
        try {
            if (!$this->tableExists('productos') || !$this->tableExists('productosdetalle')) {
                $this->log("[PRODUCTOS] SKIP: tabla productos o productosdetalle no existe");
                return;
            }
            
            // SoftRestaurant 8: precios en tabla separada productosdetalle
            $sql = "SELECT TOP 1000
                CAST(p.idproducto AS VARCHAR(50)) AS idproducto,
                CAST(p.idproducto AS VARCHAR(50)) AS codigo,
                CAST(ISNULL(p.descripcion, p.nombrecorto) AS VARCHAR(255)) AS nombre,
                CAST(ISNULL(p.idgrupo, 'GENERAL') AS VARCHAR(120)) AS categoria,
                CAST('' AS VARCHAR(120)) AS subcategoria,
                CAST(ISNULL(p.descripcion, '') AS VARCHAR(255)) AS descripcion,
                ISNULL(CAST(pd.precio AS DECIMAL(10,2)), 0) AS precio,
                CAST(0 AS DECIMAL(10,2)) AS costo,
                CAST('pieza' AS VARCHAR(30)) AS unidad,
                CASE WHEN ISNULL(pd.bloqueado, 0) = 0 THEN 1 ELSE 0 END AS activo
            FROM productos p
            LEFT JOIN productosdetalle pd ON pd.idproducto = p.idproducto
            WHERE ISNULL(p.descripcion, '') <> ''
            ORDER BY p.descripcion";

            $rows = $this->conn->query($sql)->fetchAll();
            if (!$rows) {
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $data[] = [
                    'sr_product_id'    => (string)$r['idproducto'],
                    'product_code'     => (string)$r['codigo'],
                    'product_name'     => (string)$r['nombre'],
                    'category'         => (string)$r['categoria'],
                    'subcategory'      => (string)$r['subcategoria'],
                    'description'      => (string)$r['descripcion'],
                    'price'            => floatval($r['precio']),
                    'cost'             => floatval($r['costo']),
                    'unit'             => (string)$r['unidad'],
                    'is_active'        => intval($r['activo']) === 1,
                    'preparation_time' => 0,
                    'printer_station'  => '',
                ];
            }
            $r = $this->sendToAPI('products', $data);
            $this->log("[PRODUCTOS] " . count($data) . " enviados | ins=" . ($r['inserted'] ?? '?') . " upd=" . ($r['updated'] ?? '?'));
        } catch (\Throwable $e) {
            $this->log("[PRODUCTOS] ERROR: " . $e->getMessage());
        }
    }

    private function syncTables(): void {
        try {
            if (!$this->tableExists('mesas')) {
                return;
            }
            $idCol = $this->firstExistingColumn('mesas', ['idmesa', 'mesa']);
            $numCol = $this->firstExistingColumn('mesas', ['nummesa', 'num_mesa', 'idmesa']);
            $nameCol = $this->firstExistingColumn('mesas', ['nombre', 'descripcion', 'idmesa']);
            $areaCol = $this->firstExistingColumn('mesas', ['area', 'zona']);
            $capCol = $this->firstExistingColumn('mesas', ['personas', 'capacidad']);
            $activeCol = $this->firstExistingColumn('mesas', ['activa', 'visible', 'status']);

            if (!$idCol) {
                return;
            }

            $sql = "SELECT TOP 500
                CAST($idCol AS VARCHAR(50)) AS idmesa,
                " . ($numCol ? "CAST($numCol AS VARCHAR(20))" : "CAST($idCol AS VARCHAR(20))") . " AS nummesa,
                " . ($nameCol ? "CAST($nameCol AS VARCHAR(100))" : "CAST($idCol AS VARCHAR(100))") . " AS nombre,
                " . ($areaCol ? "CAST($areaCol AS VARCHAR(100))" : "CAST('General' AS VARCHAR(100))") . " AS area,
                " . ($capCol ? "ISNULL(CAST($capCol AS INT),4)" : "4") . " AS capacidad,
                " . ($activeCol ? "ISNULL(CAST($activeCol AS INT),1)" : "1") . " AS activa
            FROM mesas
            ORDER BY " . ($numCol ?: $idCol);

            $rows = $this->conn->query($sql)->fetchAll();
            if (!$rows) {
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $data[] = [
                    'sr_table_id'  => (string)$r['idmesa'],
                    'table_number' => (string)$r['nummesa'],
                    'table_name'   => (string)$r['nombre'],
                    'area'         => (string)$r['area'],
                    'capacity'     => intval($r['capacidad']),
                    'position_x'   => 0,
                    'position_y'   => 0,
                    'is_active'    => intval($r['activa']) === 1,
                    'status'       => 'available',
                ];
            }
            $r = $this->sendToAPI('tables', $data);
            $this->log("[MESAS] " . count($data) . " enviadas | ins=" . ($r['inserted'] ?? '?') . " upd=" . ($r['updated'] ?? '?'));
        } catch (\Throwable $e) {
            $this->log("[MESAS] ERROR: " . $e->getMessage());
        }
    }

    private function syncReservations(): void {
        try {
            if (!$this->tableExists('reservaciones')) {
                return;
            }
            $idCol = $this->firstExistingColumn('reservaciones', ['idreservacion', 'folio']);
            $nameCol = $this->firstExistingColumn('reservaciones', ['nombrecliente', 'cliente']);
            $phoneCol = $this->firstExistingColumn('reservaciones', ['telefono', 'tel']);
            $emailCol = $this->firstExistingColumn('reservaciones', ['email', 'correo']);
            $dateCol = $this->firstExistingColumn('reservaciones', ['fechareservacion', 'fecha']);
            $timeCol = $this->firstExistingColumn('reservaciones', ['horareservacion', 'hora']);
            $partyCol = $this->firstExistingColumn('reservaciones', ['numpersonas', 'personas']);
            $tableCol = $this->firstExistingColumn('reservaciones', ['idmesa', 'mesa']);
            $statusCol = $this->firstExistingColumn('reservaciones', ['estado', 'status']);
            $notesCol = $this->firstExistingColumn('reservaciones', ['notas', 'comentario']);

            if (!$idCol || !$dateCol) {
                return;
            }

            $sql = "SELECT TOP 400
                CAST($idCol AS VARCHAR(50)) AS rid,
                " . ($nameCol ? "CAST($nameCol AS VARCHAR(120))" : "CAST('' AS VARCHAR(120))") . " AS cliente,
                " . ($phoneCol ? "CAST($phoneCol AS VARCHAR(60))" : "CAST('' AS VARCHAR(60))") . " AS telefono,
                " . ($emailCol ? "CAST($emailCol AS VARCHAR(120))" : "CAST('' AS VARCHAR(120))") . " AS email,
                CASE WHEN ISDATE(CAST($dateCol AS NVARCHAR(50)))=1 THEN CONVERT(DATETIME,CAST($dateCol AS NVARCHAR(50))) ELSE NULL END AS fecha_res,
                " . ($timeCol ? "CAST($timeCol AS VARCHAR(20))" : "CAST('00:00:00' AS VARCHAR(20))") . " AS hora_res,
                " . ($partyCol ? "ISNULL(CAST($partyCol AS INT),2)" : "2") . " AS personas,
                " . ($tableCol ? "CAST($tableCol AS VARCHAR(50))" : "CAST('' AS VARCHAR(50))") . " AS mesa,
                " . ($statusCol ? "CAST($statusCol AS VARCHAR(20))" : "CAST('1' AS VARCHAR(20))") . " AS estatus,
                " . ($notesCol ? "CAST($notesCol AS VARCHAR(255))" : "CAST('' AS VARCHAR(255))") . " AS notas
            FROM reservaciones
            WHERE CAST(CONVERT(DATE, CAST($dateCol AS NVARCHAR(50)), 121) AS DATE) >= DATEADD(DAY, -30, CAST(GETDATE() AS DATE))
            ORDER BY CASE WHEN ISDATE(CAST($dateCol AS NVARCHAR(50)))=1 THEN CONVERT(DATETIME,CAST($dateCol AS NVARCHAR(50))) ELSE NULL END DESC";

            $rows = $this->conn->query($sql)->fetchAll();
            if (!$rows) {
                return;
            }

            $mapStatus = function (string $raw): string {
                $k = strtolower(trim($raw));
                if ($k === '2' || $k === 'confirmed' || $k === 'confirmada') return 'confirmed';
                if ($k === '3' || $k === 'seated') return 'seated';
                if ($k === '4' || $k === 'cancelled' || $k === 'cancelada') return 'cancelled';
                if ($k === '5' || $k === 'no_show') return 'no_show';
                return 'pending';
            };

            $data = [];
            foreach ($rows as $r) {
                $dt = $this->toDatetime($r['fecha_res']);
                $data[] = [
                    'sr_reservation_id' => (string)$r['rid'],
                    'customer_name'     => (string)$r['cliente'],
                    'customer_phone'    => (string)$r['telefono'],
                    'customer_email'    => (string)$r['email'],
                    'reservation_date'  => $dt ? $dt->format('Y-m-d') : date('Y-m-d'),
                    'reservation_time'  => strlen((string)$r['hora_res']) >= 5 ? (string)$r['hora_res'] : '00:00:00',
                    'party_size'        => intval($r['personas']),
                    'table_id'          => (string)$r['mesa'],
                    'status'            => $mapStatus((string)$r['estatus']),
                    'notes'             => (string)$r['notas'],
                ];
            }
            $r = $this->sendToAPI('reservations', $data);
            $this->log("[RESERVACIONES] " . count($data) . " enviadas | ins=" . ($r['inserted'] ?? '?') . " upd=" . ($r['updated'] ?? '?'));
        } catch (\Throwable $e) {
            $this->log("[RESERVACIONES] ERROR: " . $e->getMessage());
        }
    }

    private function syncInventory(): void {
        try {
            if (!$this->tableExists('inventario')) {
                return;
            }
            $productCol = $this->firstExistingColumn('inventario', ['idproducto', 'producto']);
            $stockCol = $this->firstExistingColumn('inventario', ['existencia', 'stock']);
            $minCol = $this->firstExistingColumn('inventario', ['existenciaminima', 'minimo']);
            $maxCol = $this->firstExistingColumn('inventario', ['existenciamaxima', 'maximo']);
            $priceCol = $this->firstExistingColumn('inventario', ['ultimopreciocompra', 'preciocompra']);
            $lastPurchaseCol = $this->firstExistingColumn('inventario', ['fechaultimacompra']);
            $lastCountCol = $this->firstExistingColumn('inventario', ['fechaultimoconteo']);

            if (!$productCol || !$stockCol) {
                return;
            }

            $sql = "SELECT TOP 1000
                CAST($productCol AS VARCHAR(50)) AS product_id,
                ISNULL(CAST($stockCol AS DECIMAL(10,3)),0) AS stock,
                " . ($minCol ? "ISNULL(CAST($minCol AS DECIMAL(10,3)),0)" : "CAST(0 AS DECIMAL(10,3))") . " AS min_stock,
                " . ($maxCol ? "ISNULL(CAST($maxCol AS DECIMAL(10,3)),0)" : "CAST(0 AS DECIMAL(10,3))") . " AS max_stock,
                " . ($priceCol ? "ISNULL(CAST($priceCol AS DECIMAL(10,2)),0)" : "CAST(0 AS DECIMAL(10,2))") . " AS last_price,
                " . ($lastPurchaseCol ? "CASE WHEN ISDATE(CAST($lastPurchaseCol AS NVARCHAR(50)))=1 THEN CONVERT(DATETIME,CAST($lastPurchaseCol AS NVARCHAR(50))) ELSE NULL END" : "NULL") . " AS last_purchase_date,
                " . ($lastCountCol ? "CASE WHEN ISDATE(CAST($lastCountCol AS NVARCHAR(50)))=1 THEN CONVERT(DATETIME,CAST($lastCountCol AS NVARCHAR(50))) ELSE NULL END" : "NULL") . " AS last_count_date
            FROM inventario";

            $rows = $this->conn->query($sql)->fetchAll();
            if (!$rows) {
                return;
            }

            $data = [];
            foreach ($rows as $r) {
                $lp = $this->toDatetime($r['last_purchase_date']);
                $lc = $this->toDatetime($r['last_count_date']);
                $data[] = [
                    'product_id'          => (string)$r['product_id'],
                    'current_stock'       => floatval($r['stock']),
                    'min_stock'           => floatval($r['min_stock']),
                    'max_stock'           => floatval($r['max_stock']),
                    'last_purchase_price' => floatval($r['last_price']),
                    'last_purchase_date'  => $lp ? $lp->format('Y-m-d H:i:s') : null,
                    'last_count_date'     => $lc ? $lc->format('Y-m-d H:i:s') : null,
                ];
            }
            $r = $this->sendToAPI('inventory', $data);
            $this->log("[INVENTARIO] " . count($data) . " enviados | ins=" . ($r['inserted'] ?? '?') . " upd=" . ($r['updated'] ?? '?'));
        } catch (\Throwable $e) {
            $this->log("[INVENTARIO] ERROR: " . $e->getMessage());
        }
    }

    private function syncPosTableStates(): void {
        try {
            if (!$this->tableExists('tempcheques')) {
                return;
            }
            $rows = $this->conn->query(
                "SELECT DISTINCT CAST(mesa AS VARCHAR(30)) AS mesa
                 FROM tempcheques
                 WHERE CAST(fecha AS DATE) >= DATEADD(DAY, -1, CAST(GETDATE() AS DATE))"
            )->fetchAll();
            if (!$rows) {
                return;
            }
            $payload = [];
            foreach ($rows as $r) {
                $code = trim((string)($r['mesa'] ?? ''));
                if ($code === '') {
                    continue;
                }
                $payload[] = [
                    'table_code' => $code,
                    'state'      => 'open_ticket',
                ];
            }
            if ($payload) {
                $res = $this->sendToAPI('pos_table_states', $payload);
                $this->log("[MAPAS] pos_table_states: " . count($payload) . " mesas activas | ins=" . ($res['inserted'] ?? '?') . " upd=" . ($res['updated'] ?? '?'));
            }
        } catch (\Throwable $e) {
            $this->log("[MAPAS] ERROR: " . $e->getMessage());
        }
    }

    // ─────────────────────────────────────────────────────────────
    // UTILIDADES
    // ─────────────────────────────────────────────────────────────
    private function tableExists(string $table): bool {
        try {
            $stmt = $this->conn->prepare("SELECT OBJECT_ID(:table, 'U') AS oid");
            $stmt->execute([':table' => $table]);
            return (bool)$stmt->fetchColumn();
        } catch (\Throwable $e) {
            return false;
        }
    }

    private function firstExistingColumn(string $table, array $candidates): ?string {
        foreach ($candidates as $column) {
            try {
                $stmt = $this->conn->prepare("
                    SELECT 1 
                    FROM INFORMATION_SCHEMA.COLUMNS 
                    WHERE TABLE_NAME = :table AND COLUMN_NAME = :column
                ");
                $stmt->execute([':table' => $table, ':column' => $column]);
                if ($stmt->fetchColumn()) {
                    return $column;
                }
            } catch (\Throwable $e) {
                // try next
            }
        }
        return null;
    }

    private function dateParts(string $dt): array {
        // Limpiar caracteres extraños antes de parsear
        $clean = preg_replace('/[^0-9\- :]/', '', $dt);
        $ts    = strtotime($clean ?: HISTORY_START) ?: strtotime(HISTORY_START);
        return [
            'Y'  => (int)date('Y', $ts),
            'M'  => (int)date('n', $ts),
            'D'  => (int)date('j', $ts),
            'H'  => (int)date('G', $ts),
            'I'  => (int)date('i', $ts),
            'S'  => (int)date('s', $ts),
            'str'=> date('Y-m-d H:i:s', $ts),
        ];
    }

    private function toDatetime($val): ?\DateTime {
        if ($val instanceof \DateTime) {
            return ($val->format('Y') < '2000') ? null : $val;
        }
        if (empty($val)) {
            return null;
        }
        try {
            $dt = new \DateTime((string)$val);
            return ($dt->format('Y') < '2000') ? null : $dt;
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function sendToAPI(string $module, array $data): array {
        $payload = json_encode([
            'module'        => $module,
            'data'          => $data,
            'sync_datetime' => date('Y-m-d H:i:s'),
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

        if ($payload === false) {
            $this->log("  [JSON ERROR] " . json_last_error_msg());
            return [];
        }

        $ch = curl_init(API_URL);
        curl_setopt_array($ch, [
            \CURLOPT_POST           => true,
            \CURLOPT_POSTFIELDS     => $payload,
            \CURLOPT_RETURNTRANSFER => true,
            \CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'Content-Length: ' . strlen($payload),
                'X-API-Key: ' . API_KEY,
            ],
            \CURLOPT_TIMEOUT        => 60,
            \CURLOPT_SSL_VERIFYPEER => false,
            \CURLOPT_SSL_VERIFYHOST => false,
        ]);

        $res      = curl_exec($ch);
        $httpCode = curl_getinfo($ch, \CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        @curl_close($ch);

        if ($curlErr) {
            $this->log("  [CURL ERROR] $curlErr");
            return [];
        }

        $decoded = json_decode((string)$res, true);
        if (is_array($decoded)) {
            if (!empty($decoded['error'])) {
                $this->log("  [API $httpCode] ERROR: " . $decoded['error']);
            }
            if (!isset($decoded['success'])) {
                $decoded['success'] = ($httpCode >= 200 && $httpCode < 300);
            }
        } else {
            $this->log("  [API $httpCode] RAW(" . strlen((string)$res) . "B): " . substr((string)$res, 0, 250));
            $decoded = ['success' => false, 'http_code' => $httpCode];
        }

        return $decoded ?? [];
    }

    private function loadState(): void {
        if (file_exists(STATE_FILE)) {
            $decoded = json_decode(file_get_contents(STATE_FILE), true);
            $this->state = is_array($decoded) ? $decoded : [];
        }
        if (!empty($this->state['initial_load_done'])) {
            $this->initialLoad = false;
        }
    }

    private function saveState(): void {
        file_put_contents(STATE_FILE, json_encode($this->state, JSON_PRETTY_PRINT));
    }

    private function log(string $msg): void {
        $line = '[' . date('H:i:s') . '] ' . $msg;
        echo $line . "\n";
        flush();
    }
}

// ── ARRANQUE ──────────────────────────────────────────────────
$sync = new BonifaciosSync();
$sync->run();
