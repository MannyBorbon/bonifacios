<?php
/**
 * ============================================================
 * BONIFACIOS - Sync v4.0
 * ============================================================
 * CAMBIOS vs v3:
 * - Encrypt=false, TrustServerCertificate=true (según schema doc)
 * - SIN JOIN con chequespagos en carga inicial (causa SQLSTATE[22007])
 * - Usa campos directos de cheques: efectivo, tarjeta, vales, otros
 * - Fecha filtro con DATEADD para evitar conversión problemática
 * - TRY_CONVERT eliminado completamente
 * ============================================================
 */

define('API_URL',        'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY',        'bonifacios-sr-sync-2024-secret-key');
define('SR_DSN',         "sqlsrv:Server=100.84.227.35\\NATIONALSOFT;Database=softrestaurant8pro;Encrypt=false;TrustServerCertificate=true");
define('SR_USER',        'usuario_web');
define('SR_PASS',        'Filipenses4:8@');
define('SYNC_INTERVAL',  10);
define('STATE_FILE',     __DIR__ . '/sync-state.json');
define('HISTORY_START',  '2000-01-01 00:00:00');

class SyncV4 {
    private $conn        = null;
    private $state       = [];
    private $initialLoad = true;

    public function __construct() {
        $this->loadState();
        $this->log("=== Bonifacio's Sync v4.0 ===");
        if ($this->initialLoad) {
            $this->log("Modo: CARGA HISTORICA desde " . ($this->state['sales'] ?? HISTORY_START));
        } else {
            $this->log("Modo: TIEMPO REAL desde " . ($this->state['sales'] ?? HISTORY_START));
        }
    }

    private function connect(): bool {
        try {
            $this->conn = new PDO(SR_DSN, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
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

    // Convierte fecha a string seguro YYYY-MM-DD HH:MM:SS
    private function safeDate(string $dt): string {
        $clean = preg_replace('/[^0-9\- :]/', '', $dt);
        $ts    = strtotime($clean);
        return $ts ? date('Y-m-d H:i:s', $ts) : HISTORY_START;
    }

    // Convierte valor de fecha de sqlsrv (puede ser DateTime o string)
    private function toDatetime($val): ?DateTime {
        if ($val instanceof DateTime) return $val;
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
            $ls       = $this->safeDate($lastSync);

            $this->log("[VENTAS] desde: $ls  initialLoad=" . ($this->initialLoad ? 'SI' : 'NO'));

            if ($this->initialLoad) {
                // ── Carga inicial: solo cerrados, SIN join chequespagos ──────
                // Usamos parámetro PDO bind con tipo string para evitar SQLSTATE[22007]
                $sql = "
                    SELECT TOP 1000
                        c.folio,
                        c.numcheque,
                        c.fecha,
                        c.total,
                        c.subtotal,
                        c.totalimpuesto1 AS impuesto,
                        c.propina,
                        c.descuentoimporte AS descuento,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.mesa,
                        c.nopersonas,
                        c.pagado,
                        c.efectivo,
                        c.tarjeta,
                        c.vales,
                        c.otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    WHERE c.pagado = 1
                      AND c.fecha > CAST(:ls AS DATETIME)
                    ORDER BY c.fecha ASC
                ";
                $stmt = $this->conn->prepare($sql);
                $stmt->bindValue(':ls', $ls, PDO::PARAM_STR);
                $stmt->execute();
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $open = [];

            } else {
                // ── Tiempo real: cerrados nuevos ─────────────────────────────
                $sql = "
                    SELECT TOP 500
                        c.folio,
                        c.numcheque,
                        c.fecha,
                        c.total,
                        c.subtotal,
                        c.totalimpuesto1 AS impuesto,
                        c.propina,
                        c.descuentoimporte AS descuento,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.mesa,
                        c.nopersonas,
                        c.pagado,
                        c.efectivo,
                        c.tarjeta,
                        c.vales,
                        c.otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    WHERE c.fecha > '$ls'
                    ORDER BY c.fecha ASC
                ";
                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                // Tickets abiertos actuales (tempcheques)
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
                        t.mesa,
                        t.nopersonas,
                        0 AS pagado,
                        0 AS efectivo,
                        0 AS tarjeta,
                        0 AS vales,
                        0 AS otros
                    FROM tempcheques t
                    LEFT JOIN meseros m ON t.idmesero = m.idmesero
                    WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
                ";
                $open = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                $rows = array_merge($rows, $open);
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

                $dt       = $fechaObj->format('Y-m-d H:i:s');
                $date     = $fechaObj->format('Y-m-d');
                $time     = $fechaObj->format('H:i:s');
                $isPaid   = intval($r['pagado']) === 1;

                $ef = floatval($r['efectivo'] ?? 0);
                $ta = floatval($r['tarjeta']  ?? 0);
                $va = floatval($r['vales']    ?? 0);
                $ot = floatval($r['otros']    ?? 0);

                if (!$isPaid) {
                    $pType = 'pending';
                } else {
                    $n = ($ef > 0 ? 1 : 0) + ($ta > 0 ? 1 : 0) + ($va > 0 ? 1 : 0) + ($ot > 0 ? 1 : 0);
                    if ($n > 1)     $pType = 'mixed';
                    elseif ($ta>0)  $pType = 'card';
                    elseif ($va>0)  $pType = 'voucher';
                    elseif ($ot>0)  $pType = 'transfer';
                    else            $pType = 'cash';
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
                    'table_number'   => (string)($r['mesa']      ?? ''),
                    'covers'         => intval($r['nopersonas']  ?? 0),
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
            $ls       = $this->safeDate($lastSync);

            $sql = "
                SELECT TOP 2000
                    folio, foliomovto, tipo, idturno,
                    concepto, referencia, importe, fecha,
                    usuariocancelo, pagodepropina, idempresa
                FROM movtoscaja
                WHERE cancelado = 0
                  AND fecha > '$ls'
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
                    'folio_movto'       => (string)($m['foliomovto'] ?? ''),
                    'movement_type'     => $mType,
                    'tipo_original'     => $tipo,
                    'amount'            => abs($importe),
                    'amount_signed'     => $signed,
                    'movement_date'     => $fObj->format('Y-m-d'),
                    'movement_time'     => $fObj->format('H:i:s'),
                    'movement_datetime' => $dt,
                    'shift_id'          => (string)($m['idturno']      ?? ''),
                    'concept'           => (string)($m['concepto']     ?? ''),
                    'reference'         => (string)($m['referencia']   ?? ''),
                    'user_cancel'       => (string)($m['usuariocancelo']?? ''),
                    'is_tip_payment'    => $isTip,
                    'company_id'        => (string)($m['idempresa']    ?? '1'),
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
        } catch (Throwable $e) {
            // tabla puede no existir
        }
    }

    // =========================================================
    // ASISTENCIAS
    // =========================================================
    private function syncAttendance(): void {
        if ($this->initialLoad) return;
        try {
            $sql  = "SELECT idempleado, entrada, salida
                     FROM registroasistencias
                     WHERE CAST(entrada AS DATE) = CAST(GETDATE() AS DATE)";
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
                    ? max(0, (int)((strtotime($clockOut) - strtotime($clockIn)) / 60))
                    : 0;
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
        } catch (Throwable $e) {}
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
        $res      = curl_exec($ch);
        $code     = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $err      = curl_error($ch);
        curl_close($ch);

        if ($err)       { $this->log("  cURL error: $err"); return; }
        if ($code!=200) { $this->log("  HTTP $code: $res"); return; }

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
        // Reanudar en tiempo real si ya se completó la carga inicial
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

$sync = new SyncV4();
$sync->run();
