    <?php
    /**
     * ============================================================
     * BONIFACIOS - Sincronización Histórica + Tiempo Real
     * ============================================================
     * v3.0 - Basado en sync-realtime-FINAL.php (versión funcional)
     * 
     * FIXES aplicados:
     * - SIN CONVERT(DATETIME,?,120) — causa SQLSTATE[22007]
     * - Fecha interpolada directamente en SQL (sanear con regex)
     * - Carga desde 2000-01-01 en orden ASC
     * - Avanza lastSync solo con tickets CERRADOS
     * - Tickets abiertos solo en modo tiempo real
     * - Nombre de mesero desde JOIN con tabla meseros
     * - Pagos desde chequespagos como fallback
     * ============================================================
     */

    define('API_URL',  'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
    define('API_KEY',  'bonifacios-sr-sync-2024-secret-key');
    define('SR_SERVER',   '100.84.227.35\NATIONALSOFT');
    define('SR_DATABASE', 'softrestaurant8pro');
    define('SR_USER',     'usuario_web');
    define('SR_PASS',     'Filipenses4:8@');
    define('SYNC_INTERVAL', 10);
    define('STATE_FILE', __DIR__ . '/sync-state.json');
    define('HISTORY_START', '2000-01-01 00:00:00');

    class HistoricSync {
        private $conn;
        private $lastSync   = [];
        private $isInitialLoad = true;

        public function __construct() {
            $this->loadState();
            $this->log("=== Bonifacio's Sync v3.0 (historial desde 2000) ===");
        }

        public function connect() {
            try {
                $this->conn = new PDO(
                    "sqlsrv:server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=no;TrustServerCertificate=yes",
                    SR_USER, SR_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                $this->log("Conexión a SQL Server OK.");
                return true;
            } catch (Exception $e) {
                $this->log("✗ Conexión fallida: " . $e->getMessage());
                return false;
            }
        }

        public function run() {
            while (true) {
                $start = microtime(true);
                if ($this->connect()) {
                    $this->syncSales();
                    $this->syncCashMovements();
                    $this->syncCancellations();
                    $this->syncShifts();
                    $this->syncAttendance();
                    $this->saveState();
                    $this->conn = null;
                }
                $elapsed = microtime(true) - $start;
                if ($this->isInitialLoad) {
                    continue; // sin pausa durante carga histórica
                }
                $sleep = SYNC_INTERVAL - $elapsed;
                if ($sleep > 0) sleep((int)$sleep);
            }
        }

        // ── Sanitizar fecha para interpolación segura en SQL Server ──────────────
        private function safeDatetime($dt) {
            // Asegura formato 'YYYY-MM-DD HH:MM:SS' y solo caracteres seguros
            $clean = preg_replace('/[^0-9\-: ]/', '', (string)$dt);
            $ts = strtotime($clean);
            return $ts ? date('Y-m-d H:i:s', $ts) : '2000-01-01 00:00:00';
        }

        // ── VENTAS ────────────────────────────────────────────────────────────────
        private function syncSales() {
            try {
                $lastSync = $this->lastSync['sales'] ?? HISTORY_START;
                $ls = $this->safeDatetime($lastSync); // safe para interpolar en SQL

                if ($this->isInitialLoad) {
                    $this->log("[VENTAS] 📦 CARGA INICIAL desde: $ls");
                } else {
                    $this->log("[VENTAS] 🔄 TIEMPO REAL desde: $ls");
                }

                // ── CARGA INICIAL: solo cerrados, lotes de 1000, SIN CONVERT ─────
                if ($this->isInitialLoad) {
                    $sql = "SELECT TOP 1000
                                c.folio, c.numcheque, c.fecha,
                                c.total, c.subtotal, c.totalimpuesto1 AS impuesto,
                                c.propina, c.descuentoimporte AS descuento,
                                c.idmesero, m.nombre AS nombre_mesero,
                                c.mesa, c.nopersonas, c.pagado,
                                COALESCE(p.pago_efectivo, c.efectivo, 0)  AS efectivo,

                $sales = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                $openSales = [];

            } else {
                // ── TIEMPO REAL: cerrados nuevos + abiertos + tempcheques ─────
                $sql = "SELECT TOP 1000
                            c.folio, c.numcheque, c.fecha,
                            c.total, c.subtotal, c.totalimpuesto1 AS impuesto,
                            c.propina, c.descuentoimporte AS descuento,
                            c.idmesero, m.nombre AS nombre_mesero,
                            c.mesa, c.nopersonas, c.pagado,
                            COALESCE(p.pago_efectivo, c.efectivo, 0)  AS efectivo,
                            COALESCE(p.pago_tarjeta,  c.tarjeta,  0)  AS tarjeta,
                            COALESCE(p.pago_vales,    c.vales,    0)  AS vales,
                            COALESCE(p.pago_otros,    c.otros,    0)  AS otros
                        FROM cheques c
                        LEFT JOIN meseros m ON c.idmesero = m.idmesero
                        LEFT JOIN (
                            SELECT folio,
                                SUM(CASE WHEN ISNUMERIC(idformadepago)=1 AND CAST(idformadepago AS float)=1 THEN importe ELSE 0 END) AS pago_efectivo,
                                SUM(CASE WHEN ISNUMERIC(idformadepago)=1 AND CAST(idformadepago AS float)=2 THEN importe ELSE 0 END) AS pago_tarjeta,
                                SUM(CASE WHEN ISNUMERIC(idformadepago)=1 AND CAST(idformadepago AS float)=3 THEN importe ELSE 0 END) AS pago_vales,
                                SUM(CASE WHEN ISNUMERIC(idformadepago)=0 OR CAST(idformadepago AS float) NOT IN (1,2,3) THEN importe ELSE 0 END) AS pago_otros
                            FROM chequespagos GROUP BY folio
                        ) p ON p.folio = c.folio
                        WHERE c.fecha > CAST('$ls' AS DATETIME)
                        ORDER BY c.fecha ASC";

                $sales = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                // Tickets actualmente abiertos en tempcheques
                $sqlOpen = "SELECT
                            t.folio, t.folio AS numcheque, t.fecha,
                            t.total, t.subtotal, t.totalimpuesto1 AS impuesto,
                            t.propina, t.descuentoimporte AS descuento,
                            t.idmesero, m.nombre AS nombre_mesero,
                            t.mesa, t.nopersonas,
                            0 AS pagado,
                            0 AS efectivo, 0 AS tarjeta, 0 AS vales, 0 AS otros
                        FROM tempcheques t
                        LEFT JOIN meseros m ON t.idmesero = m.idmesero
                        WHERE NOT EXISTS (
                            SELECT 1 FROM cheques c WHERE c.folio = t.folio
                        )";
                $openSales = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                $sales = array_merge($sales, $openSales);
            }
                                    t.folio, t.folio AS numcheque, t.fecha,
                                    t.total, t.subtotal, t.totalimpuesto1 AS impuesto,
                                    t.propina, t.descuentoimporte AS descuento,
                                    t.idmesero, m.nombre AS nombre_mesero,
                                    t.mesa, t.nopersonas,
                                    0 AS pagado,
                                    0 AS efectivo, 0 AS tarjeta, 0 AS vales, 0 AS otros
                                FROM tempcheques t
                                LEFT JOIN meseros m ON t.idmesero = m.idmesero
                                WHERE NOT EXISTS (
                                    SELECT 1 FROM cheques c WHERE c.folio = t.folio
                                )";
                    $openSales = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                    $sales = array_merge($sales, $openSales);
                }

                $this->log("[VENTAS] Encontrados: " . count($sales) . " tickets.");

                if (count($sales) === 0) {
                    if ($this->isInitialLoad) {
                        $this->log("[VENTAS] ✅ Historial completo cargado. Cambiando a tiempo real.");
                        $this->isInitialLoad = false;
                    }
                    return;
                }

                // ── Procesar tickets ──────────────────────────────────────────────
                $data = [];
                $lastClosedDate = $lastSync;

                foreach ($sales as $s) {
                    // Convertir fecha (puede venir como objeto DateTime de sqlsrv)
                    if ($s['fecha'] instanceof DateTime) {
                        $fechaObj = $s['fecha'];
                    } else {
                        try { $fechaObj = new DateTime((string)$s['fecha']); }
                        catch (Exception $e) { continue; }
                    }

                    // Saltar fechas inválidas (1900-01-01 = valor NULL en SR)
                    if ($fechaObj->format('Y') < 2000) continue;

                    $saleDate     = $fechaObj->format('Y-m-d');
                    $saleDatetime = $fechaObj->format('Y-m-d H:i:s');

                    $efectivo = floatval($s['efectivo'] ?? 0);
                    $tarjeta  = floatval($s['tarjeta']  ?? 0);
                    $vales    = floatval($s['vales']    ?? 0);
                    $otros    = floatval($s['otros']    ?? 0);
                    $isPaid   = intval($s['pagado']) === 1;

                    // Método de pago principal
                    if (!$isPaid) {
                        $paymentType = 'pending';
                    } else {
                        $methods = 0;
                        if ($efectivo > 0) $methods++;
                        if ($tarjeta  > 0) $methods++;
                        if ($vales    > 0) $methods++;
                        if ($otros    > 0) $methods++;

                        if ($methods > 1)       $paymentType = 'mixed';
                        elseif ($tarjeta  > 0)  $paymentType = 'card';
                        elseif ($vales    > 0)  $paymentType = 'voucher';
                        elseif ($otros    > 0)  $paymentType = 'transfer';
                        else                    $paymentType = 'cash';
                    }

                    $srTicketId = trim(str_replace(["\r","\n","\t"], '', (string)$s['folio']));

                    $data[] = [
                        'sr_ticket_id'   => $srTicketId,
                        'ticket_number'  => (string)($s['numcheque'] ?? $s['folio']),
                        'folio'          => (string)($s['numcheque'] ?? $s['folio']),
                        'sale_date'      => $saleDate,
                        'sale_time'      => $fechaObj->format('H:i:s'),
                        'sale_datetime'  => $saleDatetime,
                        'total'          => floatval($s['total']    ?? 0),
                        'subtotal'       => floatval($s['subtotal'] ?? 0),
                        'tax'            => floatval($s['impuesto'] ?? 0),
                        'tip'            => floatval($s['propina']  ?? 0),
                        'discount'       => floatval($s['descuento']?? 0),
                        'waiter_id'      => (string)($s['idmesero'] ?? ''),
                        'waiter_name'    => trim((string)($s['nombre_mesero'] ?? '')),
                        'table_id'       => '',
                        'table_number'   => (string)($s['mesa'] ?? ''),
                        'covers'         => intval($s['nopersonas'] ?? 0),
                        'status'         => $isPaid ? 'closed' : 'open',
                        'payment_type'   => $paymentType,
                        'cash_amount'    => $efectivo,
                        'card_amount'    => $tarjeta,
                        'voucher_amount' => $vales,
                        'other_amount'   => $otros,
                        'opened_at'      => $saleDatetime,
                        'closed_at'      => $isPaid ? $saleDatetime : null,
                        'items'          => []
                    ];

                    // Avanzar lastSync SOLO con tickets cerrados
                    if ($isPaid && $saleDatetime > $lastClosedDate) {
                        $lastClosedDate = $saleDatetime;
                    }
                }

                if (count($data) > 0) {
                    $this->sendToAPI('sales', $data);
                    $open   = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                    $closed = count($data) - $open;
                    $this->log("[VENTAS] ✅ $closed cerrados + $open abiertos enviados. Último: $lastClosedDate");
                }

                // Guardar progreso
                $this->lastSync['sales'] = $lastClosedDate;

                // ¿Terminó la carga inicial?
                if ($this->isInitialLoad && count($sales) < 1000) {
                    $this->isInitialLoad = false;
                    $this->log("[VENTAS] ✅ Historial completo. Iniciando tiempo real.");
                }

            } catch (Exception $e) {
                $this->log("[VENTAS] Error: " . $e->getMessage());
            }
        }

        // ── MOVIMIENTOS DE CAJA ───────────────────────────────────────────────────
        private function syncCashMovements() {
            try {
                $lastSync = $this->lastSync['cash_movements'] ?? HISTORY_START;
                $ls = $this->safeDatetime($lastSync);

                $sql = "SELECT TOP 5000
                            folio, foliomovto, tipo, idturno, concepto, referencia,
                            importe, fecha, usuariocancelo, pagodepropina, idempresa
                        FROM movtoscaja
                        WHERE cancelado = 0
                        AND fecha > '$ls'
                        ORDER BY fecha ASC";

                $movements = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                if (count($movements) === 0) return;

                $data = [];
                $lastDate = $lastSync;

                foreach ($movements as $m) {
                    if ($m['fecha'] instanceof DateTime) {
                        $fObj = $m['fecha'];
                    } else {
                        try { $fObj = new DateTime((string)$m['fecha']); }
                        catch (Exception $e) { continue; }
                    }

                    $importe      = floatval($m['importe']);
                    $tipo         = intval($m['tipo']);
                    $isTip        = intval($m['pagodepropina'] ?? 0) === 1;

                    if ($isTip)          $mType = 'tip_payment';
                    elseif ($tipo === 1) $mType = 'withdrawal';
                    elseif ($tipo === 2) $mType = 'deposit';
                    else                 $mType = 'other';

                    $signed = ($mType === 'withdrawal' || $mType === 'tip_payment')
                        ? -abs($importe) : abs($importe);

                    $dt = $fObj->format('Y-m-d H:i:s');
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
                        'shift_id'          => (string)($m['idturno'] ?? ''),
                        'concept'           => (string)($m['concepto']  ?? ''),
                        'reference'         => (string)($m['referencia'] ?? ''),
                        'user_cancel'       => (string)($m['usuariocancelo'] ?? ''),
                        'is_tip_payment'    => $isTip,
                        'company_id'        => (string)($m['idempresa'] ?? '1')
                    ];

                    if ($dt > $lastDate) $lastDate = $dt;
                }

                $this->sendToAPI('cash_movements', $data);
                $this->log("[CAJA] " . count($data) . " movimientos enviados.");
                $this->lastSync['cash_movements'] = $lastDate;

            } catch (Exception $e) {
                $this->log("[CAJA] Error: " . $e->getMessage());
            }
        }

        // ── CANCELACIONES ─────────────────────────────────────────────────────────
        private function syncCancellations() {
            try {
                $lastSync = $this->lastSync['cancellations'] ?? HISTORY_START;
                $ls = $this->safeDatetime($lastSync);
                $sql = "SELECT folio, fecha, total, usuario, motivo
                        FROM cancelaciones
                        WHERE fecha > '$ls'
                        ORDER BY fecha ASC";
                $cancels = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                if (count($cancels) === 0) return;

                $data = [];
                foreach ($cancels as $c) {
                    if ($c['fecha'] instanceof DateTime) $fObj = $c['fecha'];
                    else { try { $fObj = new DateTime((string)$c['fecha']); } catch (Exception $e) { continue; } }
                    $data[] = [
                        'ticket_number' => (string)$c['folio'],
                        'amount'        => floatval($c['total']),
                        'user_name'     => (string)($c['usuario'] ?? ''),
                        'reason'        => (string)($c['motivo']  ?? ''),
                        'status'        => 'cancelled',
                        'cancel_date'   => $fObj->format('Y-m-d H:i:s')
                    ];
                }
                $lastCancelDate = $lastSync;
                foreach ($data as $d) {
                    if ($d['cancel_date'] > $lastCancelDate) $lastCancelDate = $d['cancel_date'];
                }
                $this->sendToAPI('cancellations', $data);
                $this->lastSync['cancellations'] = $lastCancelDate;
                $this->log("[CANCELACIONES] " . count($data) . " enviadas.");
            } catch (Exception $e) {
                // Tabla puede no existir en esta versión de SR
            }
        }

        // ── TURNOS / CORTES DE CAJA ────────────────────────────────────────
        private function syncShifts() {
            try {
                $lastSync = $this->lastSync['shifts'] ?? HISTORY_START;
                $ls = $this->safeDatetime($lastSync);

                $sql = "SELECT TOP 1000
                            idturnointerno, idturno, cajero, idestacion,
                            apertura, cierre,
                            ISNULL(fondo, 0) AS fondo,
                            ISNULL(efectivo, 0) AS efectivo,
                            ISNULL(tarjeta, 0) AS tarjeta,
                            ISNULL(vales, 0) AS vales,
                            ISNULL(credito, 0) AS credito,
                            idempresa
                        FROM turnos
                        WHERE cierre > '$ls'
                        ORDER BY cierre ASC";

                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                if (count($rows) === 0) return;

                $data = [];
                $lastDate = $lastSync;

                foreach ($rows as $r) {
                    // Convertir fechas
                    $apertura = $cierre = null;
                    try {
                        $aObj = ($r['apertura'] instanceof DateTime) ? $r['apertura'] : new DateTime((string)$r['apertura']);
                        $apertura = $aObj->format('Y-m-d H:i:s');
                    } catch (Exception $e) {}
                    try {
                        $cObj = ($r['cierre'] instanceof DateTime) ? $r['cierre'] : new DateTime((string)$r['cierre']);
                        $cierre = $cObj->format('Y-m-d H:i:s');
                        if ($cierre > $lastDate) $lastDate = $cierre;
                    } catch (Exception $e) { continue; }

                    $data[] = [
                        'sr_shift_id'         => (string)($r['idturnointerno'] ?? ''),
                        'sr_turno_id'         => (string)($r['idturno'] ?? ''),
                        'cajero'              => trim((string)($r['cajero'] ?? '')),
                        'estacion'            => trim((string)($r['idestacion'] ?? '')),
                        'apertura'            => $apertura,
                        'cierre'              => $cierre,
                        'fondo'               => floatval($r['fondo'] ?? 0),
                        'declarado_efectivo'  => floatval($r['efectivo'] ?? 0),
                        'declarado_tarjeta'   => floatval($r['tarjeta'] ?? 0),
                        'declarado_vales'     => floatval($r['vales'] ?? 0),
                        'declarado_credito'   => floatval($r['credito'] ?? 0),
                        'company_id'          => (string)($r['idempresa'] ?? ''),
                    ];
                }

                if (count($data) > 0) {
                    $this->sendToAPI('shifts', $data);
                    $this->lastSync['shifts'] = $lastDate;
                    $this->log("[TURNOS] " . count($data) . " cortes enviados. Último cierre: $lastDate");
                }

            } catch (Exception $e) {
                $this->log("[TURNOS] Error: " . $e->getMessage());
            }
        }

        // ── ASISTENCIAS ───────────────────────────────────────────────────────────
        private function syncAttendance() {
            if ($this->isInitialLoad) return;
            try {
                $sql = "SELECT r.idempleado, r.entrada, r.salida
                        FROM registroasistencias r
                        WHERE CAST(r.entrada AS DATE) = CAST(GETDATE() AS DATE)";
                $records = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                if (count($records) === 0) return;

                $data = [];
                foreach ($records as $a) {
                    $clockIn = $clockOut = null;
                    $date = date('Y-m-d');
                    $minutes = 0;

                    if (!empty($a['entrada'])) {
                        try {
                            $inDT  = ($a['entrada'] instanceof DateTime) ? $a['entrada'] : new DateTime((string)$a['entrada']);
                            $clockIn = $inDT->format('Y-m-d H:i:s');
                            $date    = $inDT->format('Y-m-d');
                        } catch (Exception $e) {}
                    }
                    if (!empty($a['salida'])) {
                        try {
                            $outDT = ($a['salida'] instanceof DateTime) ? $a['salida'] : new DateTime((string)$a['salida']);
                            if ($outDT->format('Y') > 1900) {
                                $clockOut = $outDT->format('Y-m-d H:i:s');
                            }
                        } catch (Exception $e) {}
                    }
                    if ($clockIn && $clockOut) {
                        $minutes = max(0, (int)((strtotime($clockOut) - strtotime($clockIn)) / 60));
                    }

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
                        'notes'          => ''
                    ];
                }
                $this->sendToAPI('attendance', $data);
                $this->log("[ASISTENCIAS] " . count($data) . " enviados.");
            } catch (Exception $e) {}
        }

        // ── API ───────────────────────────────────────────────────────────────────
        private function sendToAPI($module, $data) {
            $payload = json_encode([
                'module'        => $module,
                'data'          => $data,
                'sync_datetime' => date('Y-m-d H:i:s')
            ]);
            $ch = curl_init(API_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST           => true,
                CURLOPT_POSTFIELDS     => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER     => [
                    'Content-Type: application/json',
                    'X-API-Key: ' . API_KEY
                ],
                CURLOPT_TIMEOUT        => 60,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false
            ]);
            $res       = curl_exec($ch);
            $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            curl_close($ch);

            if ($curlError) { $this->log("✗ cURL: $curlError"); return null; }
            if ($httpCode !== 200) { $this->log("✗ HTTP $httpCode: $res"); return null; }

            $result = json_decode($res, true);
            if (!$result || !isset($result['success'])) {
                $this->log("✗ Respuesta inválida: $res");
                return null;
            }
            if (isset($result['inserted'])) {
                $this->log("   ↳ inserted={$result['inserted']}, updated={$result['updated']}, failed={$result['failed']}");
            }
            return $res;
        }

        // ── Estado ────────────────────────────────────────────────────────────────
        private function loadState() {
            if (file_exists(STATE_FILE)) {
                $this->lastSync = json_decode(file_get_contents(STATE_FILE), true) ?? [];
            }
            // Si ya terminó la carga inicial anteriormente, retomar en tiempo real
            if (!empty($this->lastSync['sales']) && $this->lastSync['sales'] !== HISTORY_START) {
                $this->isInitialLoad = ($this->lastSync['initial_load_done'] ?? false) === false;
            }
        }

        private function saveState() {
            if (!$this->isInitialLoad) {
                $this->lastSync['initial_load_done'] = true;
            }
            file_put_contents(STATE_FILE, json_encode($this->lastSync));
        }

        private function log($m) {
            $line = "[" . date('H:i:s') . "] $m\n";
            echo $line;
        }
    }

    $sync = new HistoricSync();
    $sync->run();
