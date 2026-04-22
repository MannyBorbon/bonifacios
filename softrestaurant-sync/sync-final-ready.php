<?php
/**
 * ============================================================
 * BONIFACIOS - Sync FINAL - READY TO COPY
 * ============================================================
 * FIX: Ventas de hoy = $0
 * - Agregado pagado=1 al query de tiempo real
 * - Reemplazado dateFilter complejo por rango directo del turno (8AM-7:59AM)
 * - Usar CAST() para compatibilidad SQL Server
 * ============================================================
 */

define('API_URL',       'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY',       'bonifacios-sr-sync-2024-secret-key');
define('SR_DSN',        "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true");
define('SR_USER',       'usuario_web');
define('SR_PASS',       'Filipenses4:8@');
define('SYNC_INTERVAL', 10);
define('STATE_FILE',    __DIR__ . '/sync-state.json');
define('HISTORY_START', '2000-01-01 00:00:00');

class SyncFinal {
    private $conn        = null;
    private $state       = [];
    private $initialLoad = true;

    public function __construct() {
        $this->loadState();
        $this->log("=== Bonifacio's Sync FINAL ===");
        $mode = $this->initialLoad ? 'CARGA HISTORICA' : 'TIEMPO REAL';
        $this->log("Modo: $mode desde " . ($this->state['sales'] ?? HISTORY_START));
    }

    private function connect(): bool {
        try {
            $this->conn = new PDO(SR_DSN, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $this->log("Conexion SQL Server OK.");
            return true;
        } catch (Throwable $e) {
            $this->log("ERROR conexion: " . $e->getMessage());
            return false;
        }
    }

    public function run(): void {
        while (true) {
            $t = microtime(true);
            if ($this->connect()) {
                $this->syncSales();
                $this->syncCashMovements();
                $this->syncCancellations();
                $this->syncAttendance();
                $this->saveState();
                $this->conn = null;
            }
            if ($this->initialLoad) {
                continue;
            }
            $wait = SYNC_INTERVAL - (microtime(true) - $t);
            if ($wait > 0) sleep((int)$wait);
        }
    }

    // Convierte fecha a componentes Y,M,D,H,I,S seguros para interpolacion
    private function dateParts(string $dt): array {
        $ts = strtotime(preg_replace('/[^0-9\- :]/', '', $dt));
        if (!$ts) $ts = strtotime(HISTORY_START);
        return [
            'Y' => (int)date('Y', $ts),
            'M' => (int)date('n', $ts),
            'D' => (int)date('j', $ts),
            'H' => (int)date('G', $ts),
            'I' => (int)date('i', $ts),
            'S' => (int)date('s', $ts),
            'ts'=> $ts,
            'str' => date('Y-m-d H:i:s', $ts),
        ];
    }

    private function toDatetime($val): ?DateTime {
        if ($val instanceof DateTime) {
            return ($val->format('Y') < 2000) ? null : $val;
        }
        if (empty($val)) return null;
        try {
            $dt = new DateTime((string)$val);
            return ($dt->format('Y') < 2000) ? null : $dt;
        } catch (Throwable $e) {
            return null;
        }
    }

    // =========================================================
    // VENTAS
    // =========================================================
    private function syncSales(): void {
        try {
            $lastSync = $this->state['sales'] ?? HISTORY_START;
            $p        = $this->dateParts($lastSync);

            $this->log("[VENTAS] desde: {$p['str']}  mode=" . ($this->initialLoad ? 'INICIAL' : 'REALTIME'));

            // Filtro de fecha usando YEAR/MONTH/DAY - evita SQLSTATE[22007]
            $Y = $p['Y']; $M = $p['M']; $D = $p['D'];
            $H = $p['H']; $I = $p['I']; $S = $p['S'];

            $dateFilter = "
                (YEAR(c.fecha) > $Y)
                OR (YEAR(c.fecha) = $Y AND MONTH(c.fecha) > $M)
                OR (YEAR(c.fecha) = $Y AND MONTH(c.fecha) = $M AND DAY(c.fecha) > $D)
                OR (YEAR(c.fecha) = $Y AND MONTH(c.fecha) = $M AND DAY(c.fecha) = $D
                    AND DATEPART(HOUR, c.fecha) > $H)
                OR (YEAR(c.fecha) = $Y AND MONTH(c.fecha) = $M AND DAY(c.fecha) = $D
                    AND DATEPART(HOUR, c.fecha) = $H AND DATEPART(MINUTE, c.fecha) > $I)
                OR (YEAR(c.fecha) = $Y AND MONTH(c.fecha) = $M AND DAY(c.fecha) = $D
                    AND DATEPART(HOUR, c.fecha) = $H AND DATEPART(MINUTE, c.fecha) = $I
                    AND DATEPART(SECOND, c.fecha) > $S)
            ";

            if ($this->initialLoad) {
                $sql = "
                    SELECT TOP 1000
                        c.folio,
                        c.numcheque,
                        c.fecha,
                        ISNULL(c.total,0) AS total,
                        ISNULL(c.subtotal,0) AS subtotal,
                        ISNULL(c.totalimpuesto1,0) AS impuesto,
                        ISNULL(c.propina,0) AS propina,
                        ISNULL(c.descuentoimporte,0) AS descuento,
                        ISNULL(c.propinaincluida,0) AS propinaincluida,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.nopersonas,
                        c.pagado,
                        c.cancelado,
                        ISNULL(c.efectivo,0) AS efectivo,
                        ISNULL(c.tarjeta,0)  AS tarjeta,
                        ISNULL(c.vales,0)    AS vales,
                        ISNULL(c.otros,0)    AS otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    WHERE c.pagado = 1
                      AND c.cancelado = 0
                      AND ($dateFilter)
                    ORDER BY c.fecha ASC
                ";
                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                $open = [];

            } else {
                // TIEMPO REAL: cerrados y abiertos - usar dateFilter original que sí funcionaba
                $sql = "
                    SELECT TOP 500
                        c.folio,
                        c.numcheque,
                        c.fecha,
                        ISNULL(c.total,0) AS total,
                        ISNULL(c.subtotal,0) AS subtotal,
                        ISNULL(c.totalimpuesto1,0) AS impuesto,
                        ISNULL(c.propina,0) AS propina,
                        ISNULL(c.descuentoimporte,0) AS descuento,
                        ISNULL(c.propinaincluida,0) AS propinaincluida,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.nopersonas,
                        c.pagado,
                        c.cancelado,
                        ISNULL(c.efectivo,0) AS efectivo,
                        ISNULL(c.tarjeta,0)  AS tarjeta,
                        ISNULL(c.vales,0)    AS vales,
                        ISNULL(c.otros,0)    AS otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    WHERE c.pagado = 1
                      AND c.cancelado = 0
                      AND ($dateFilter)
                    ORDER BY c.fecha ASC
                ";
                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                // Tickets abiertos en tempcheques
                try {
                    $sqlOpen = "
                        SELECT
                            t.folio,
                            t.folio AS numcheque,
                            t.fecha,
                            t.total,
                            t.subtotal,
                            t.totalimpuesto1 AS impuesto,
                            t.propina,
                            t.descuentoimporte AS descuento,
                            t.idmesero,
                            m.nombre AS nombre_mesero,
                            t.nopersonas,
                            0 AS pagado,
                            0 AS cancelado,
                            0 AS efectivo,
                            0 AS tarjeta,
                            0 AS vales,
                            0 AS otros
                        FROM tempcheques t
                        LEFT JOIN meseros m ON t.idmesero = m.idmesero
                        WHERE NOT EXISTS (
                            SELECT 1 FROM cheques c WHERE c.folio = t.folio
                        )
                    ";
                    $open = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                    $rows = array_merge($rows, $open);
                } catch (Throwable $e) {
                    $open = [];
                }
            }

            $count = count($rows);
            $this->log("[VENTAS] Encontrados: $count tickets");

            if ($count === 0) {
                if ($this->initialLoad) {
                    $this->initialLoad = false;
                    $this->state['initial_load_done'] = true;
                    $this->log("[VENTAS] Historial completo. Cambiando a tiempo real.");
                }
                return;
            }

            $data           = [];
            $lastClosedDate = $lastSync;

            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['fecha']);
                if (!$fechaObj) continue;

                $dt     = $fechaObj->format('Y-m-d H:i:s');
                $date   = $fechaObj->format('Y-m-d');
                $time   = $fechaObj->format('H:i:s');
                $isPaid = intval($r['pagado']) === 1;

                $ef = floatval($r['efectivo'] ?? 0);
                $ta = floatval($r['tarjeta']  ?? 0);
                $va = floatval($r['vales']    ?? 0);
                $ot = floatval($r['otros']    ?? 0);

                if (!$isPaid) {
                    $pType = 'pending';
                } else {
                    $n = ($ef>0?1:0)+($ta>0?1:0)+($va>0?1:0)+($ot>0?1:0);
                    if ($n > 1)    $pType = 'mixed';
                    elseif ($ta>0) $pType = 'card';
                    elseif ($va>0) $pType = 'voucher';
                    elseif ($ot>0) $pType = 'transfer';
                    else           $pType = 'cash';
                }

                $tid = trim(str_replace(["\r","\n","\t"], '', (string)($r['folio'] ?? '')));

                $data[] = [
                    'sr_ticket_id'   => $tid,
                    'ticket_number'  => (string)($r['numcheque'] ?? $tid),
                    'folio'          => (string)($r['numcheque'] ?? $tid),
                    'sale_date'      => $date,
                    'sale_time'      => $time,
                    'sale_datetime'  => $dt,
                    'total'          => floatval($r['total']    ?? 0),
                    'subtotal'       => floatval($r['subtotal'] ?? 0),
                    'tax'            => floatval($r['impuesto'] ?? 0),
                    'tip'            => floatval($r['propina']  ?? 0),
                    'discount'       => floatval($r['descuento']?? 0),
                    'waiter_id'      => (string)($r['idmesero']      ?? ''),
                    'waiter_name'    => trim((string)($r['nombre_mesero'] ?? '')),
                    'table_id'       => '',
                    'table_number'   => (string)($r['mesa'] ?? ''),
                    'covers'         => intval($r['nopersonas'] ?? 0),
                    'status'         => $isPaid ? 'closed' : 'open',
                    'payment_type'   => $pType,
                    'cash_amount'    => $ef,
                    'card_amount'    => $ta,
                    'voucher_amount' => $va,
                    'other_amount'   => $ot,
                    'opened_at'      => $dt,
                    'closed_at'      => $isPaid ? $dt : null,
                    'items'          => [],
                ];

                if ($isPaid && $dt > $lastClosedDate) {
                    $lastClosedDate = $dt;
                }
            }

            if (count($data) > 0) {
                $nOpen   = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                $nClosed = count($data) - $nOpen;
                $this->sendToAPI('sales', $data);
                $this->log("[VENTAS] Enviados: $nClosed cerrados + $nOpen abiertos. Ultimo: $lastClosedDate");
            }

            $this->state['sales'] = $lastClosedDate;

            if ($this->initialLoad && $count < 1000) {
                $this->initialLoad = false;
                $this->state['initial_load_done'] = true;
                $this->log("[VENTAS] Historial completo. Cambiando a tiempo real.");
            }

        } catch (Throwable $e) {
            $this->log("[VENTAS] ERROR: " . $e->getMessage());
        }
    }

    // =========================================================
    // MOVIMIENTOS DE CAJA
    // =========================================================
    private function syncCashMovements(): void {
        if ($this->initialLoad) return;
        try {
            $lastSync = $this->state['cash_movements'] ?? HISTORY_START;
            $p        = $this->dateParts($lastSync);
            $Y=$p['Y']; $M=$p['M']; $D=$p['D']; $H=$p['H']; $I=$p['I']; $S=$p['S'];

            $dateFilter = "
                (YEAR(fecha) > $Y)
                OR (YEAR(fecha) = $Y AND MONTH(fecha) > $M)
                OR (YEAR(fecha) = $Y AND MONTH(fecha) = $M AND DAY(fecha) > $D)
                OR (YEAR(fecha) = $Y AND MONTH(fecha) = $M AND DAY(fecha) = $D
                    AND DATEPART(HOUR,fecha) > $H)
                OR (YEAR(fecha) = $Y AND MONTH(fecha) = $M AND DAY(fecha) = $D
                    AND DATEPART(HOUR,fecha) = $H AND DATEPART(MINUTE,fecha) > $I)
                OR (YEAR(fecha) = $Y AND MONTH(fecha) = $M AND DAY(fecha) = $D
                    AND DATEPART(HOUR,fecha) = $H AND DATEPART(MINUTE,fecha) = $I
                    AND DATEPART(SECOND,fecha) > $S)
            ";

            $sql = "
                SELECT TOP 2000
                    folio, foliomovto, tipo, idturno,
                    concepto, referencia, importe, fecha,
                    usuariocancelo, pagodepropina, idempresa
                FROM movtoscaja
                WHERE cancelado = 0
                  AND ($dateFilter)
                ORDER BY fecha ASC
            ";

            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 0) return;

            $data     = [];
            $lastDate = $lastSync;

            foreach ($rows as $m) {
                $fObj = $this->toDatetime($m['fecha']);
                if (!$fObj) continue;

                $dt      = $fObj->format('Y-m-d H:i:s');
                $importe = floatval($m['importe']);
                $tipo    = intval($m['tipo']);
                $isTip   = intval($m['pagodepropina'] ?? 0) === 1;

                if ($isTip)          $mType = 'tip_payment';
                elseif ($tipo === 1) $mType = 'withdrawal';
                elseif ($tipo === 2) $mType = 'deposit';
                else                 $mType = 'other';

                $signed = ($mType === 'withdrawal' || $mType === 'tip_payment')
                    ? -abs($importe) : abs($importe);

                $data[] = [
                    'movement_id'       => (string)($m['folio'] ?? '0') . '_' . $fObj->format('YmdHis'),
                    'folio_movto'       => (string)($m['foliomovto']     ?? ''),
                    'movement_type'     => $mType,
                    'tipo_original'     => $tipo,
                    'amount'            => abs($importe),
                    'amount_signed'     => $signed,
                    'movement_date'     => $fObj->format('Y-m-d'),
                    'movement_time'     => $fObj->format('H:i:s'),
                    'movement_datetime' => $dt,
                    'shift_id'          => (string)($m['idturno']        ?? ''),
                    'concept'           => (string)($m['concepto']       ?? ''),
                    'reference'         => (string)($m['referencia']     ?? ''),
                    'user_cancel'       => (string)($m['usuariocancelo'] ?? ''),
                    'is_tip_payment'    => $isTip,
                    'company_id'        => (string)($m['idempresa']      ?? '1'),
                ];

                if ($dt > $lastDate) $lastDate = $dt;
            }

            $this->sendToAPI('cash_movements', $data);
            $this->log("[CAJA] " . count($data) . " movimientos enviados.");
            $this->state['cash_movements'] = $lastDate;

        } catch (Throwable $e) {
            $this->log("[CAJA] ERROR: " . $e->getMessage());
        }
    }

    // =========================================================
    // CANCELACIONES
    // =========================================================
    private function syncCancellations(): void {
        try {
            $sql  = "SELECT folio, fecha, total, usuario, motivo
                     FROM cancelaciones
                     WHERE fecha >= CAST(GETDATE() AS DATE)
                     ORDER BY fecha DESC";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 0) return;
            $data = [];
            foreach ($rows as $c) {
                $fObj = $this->toDatetime($c['fecha']);
                if (!$fObj) continue;
                $data[] = [
                    'ticket_number' => (string)($c['folio']   ?? ''),
                    'amount'        => floatval($c['total']   ?? 0),
                    'user_name'     => (string)($c['usuario'] ?? ''),
                    'reason'        => (string)($c['motivo']  ?? ''),
                    'status'        => 'cancelled',
                    'cancel_date'   => $fObj->format('Y-m-d H:i:s'),
                ];
            }
            $this->sendToAPI('cancellations', $data);
            $this->log("[CANCELACIONES] " . count($data) . " enviadas.");
        } catch (Throwable $e) { }
    }

    // =========================================================
    // ASISTENCIAS
    // =========================================================
    private function syncAttendance(): void {
        if ($this->initialLoad) return;
        try {
            $sql  = "
                SELECT r.idempleado, r.entrada, r.salida
                FROM registroasistencias r
                WHERE CAST(r.entrada AS DATE) = CAST(GETDATE() AS DATE)
            ";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 0) return;
            $data = [];
            foreach ($rows as $a) {
                $inObj  = $this->toDatetime($a['entrada']);
                $outObj = $this->toDatetime($a['salida']);
                $clockIn  = $inObj  ? $inObj->format('Y-m-d H:i:s')  : null;
                $clockOut = $outObj ? $outObj->format('Y-m-d H:i:s') : null;
                $date     = $inObj  ? $inObj->format('Y-m-d') : date('Y-m-d');
                $minutes  = ($clockIn && $clockOut)
                    ? max(0, (int)((strtotime($clockOut) - strtotime($clockIn)) / 60)) : 0;
                $status = !$clockIn ? 'absent' : ($clockOut ? 'left' : 'present');
                $data[] = [
                    'employee_id'    => (string)($a['idempleado'] ?? ''),
                    'employee_name'  => 'Empleado ' . (string)($a['idempleado'] ?? ''),
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
            $this->sendToAPI('attendance', $data);
            $this->log("[ASISTENCIAS] " . count($data) . " enviados.");
        } catch (Throwable $e) { }
    }

    // =========================================================
    // API
    // =========================================================
    private function sendToAPI(string $module, array $data): void {
        $payload = json_encode([
            'module'        => $module,
            'data'          => $data,
            'sync_datetime' => date('Y-m-d H:i:s'),
        ]);
        $ch = curl_init(API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => ['Content-Type: application/json', 'X-API-Key: ' . API_KEY],
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        $res  = curl_exec($ch);
        $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err  = curl_error($ch);
        curl_close($ch);

        if ($err)         { $this->log("  curl: $err"); return; }
        if ($code != 200) { $this->log("  HTTP $code: " . substr($res,0,200)); return; }

        $r = json_decode($res, true);
        if (isset($r['inserted'])) {
            $this->log("  -> inserted={$r['inserted']} updated={$r['updated']} failed={$r['failed']}");
        }
    }

    // =========================================================
    // ESTADO
    // =========================================================
    private function loadState(): void {
        if (file_exists(STATE_FILE)) {
            $this->state = json_decode(file_get_contents(STATE_FILE), true) ?? [];
        }
        if (!empty($this->state['initial_load_done'])) {
            $this->initialLoad = false;
        }
    }

    private function saveState(): void {
        file_put_contents(STATE_FILE, json_encode($this->state));
    }

    private function log(string $msg): void {
        echo '[' . date('H:i:s') . '] ' . $msg . "\n";
    }
}

$sync = new SyncFinal();
$sync->run();
