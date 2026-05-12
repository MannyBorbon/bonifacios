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
     * - Zona horaria PHP = Hermosillo (igual que api/config/database.php y sales.php).
     *   Si el PC del sync está en UTC, sin esto syncToday() y las fechas enviadas no coinciden con el turno 08:00 del negocio.
     * ============================================================
     */

    if (function_exists('date_default_timezone_set')) {
        date_default_timezone_set('America/Hermosillo');
    }

    define('API_URL',  'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
    define('API_KEY',  'bonifacios-sr-sync-2024-secret-key');
    define('SR_SERVER',   '100.84.227.35\NATIONALSOFT');
    define('SR_DATABASE', 'softrestaurant8pro');
    define('SR_USER',     'usuario_web');
    define('SR_PASS',     getenv('SR_PASS') ?: '');
    define('SYNC_INTERVAL', 10);
    define('STATE_FILE', __DIR__ . '/sync-state.json');
    define('HISTORY_START', '2000-01-01 00:00:00');

    foreach (
        [
            __DIR__ . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'table_venue_codes_sync.php',
            dirname(__DIR__) . DIRECTORY_SEPARATOR . 'api' . DIRECTORY_SEPARATOR . 'lib' . DIRECTORY_SEPARATOR . 'table_venue_codes.php',
        ]
        as $_bnfVenueCodes
    ) {
        if (is_readable($_bnfVenueCodes)) {
            require_once $_bnfVenueCodes;
            break;
        }
    }
    unset($_bnfVenueCodes);

    if (!function_exists('bonifacios_table_canonical_venue_code')) {
        function bonifacios_table_canonical_venue_code(?string $raw): ?string {
            if ($raw === null || $raw === '') {
                return null;
            }
            $s = strtoupper(trim(preg_replace('/\s+/', '', $raw)));
            if ($s === '') {
                return null;
            }
            if (preg_match('/^WEB-/i', $s)) {
                return $s;
            }
            $s = preg_replace('/P\d+$/i', '', $s);
            if (preg_match('/^M0*(\d+)$/i', $s, $m)) {
                $n = (int) $m[1];
                return ($n >= 1 && $n <= 11) ? ('M' . $n) : null;
            }
            if (preg_match('/^T0*(\d+)$/i', $s, $m)) {
                $n = (int) $m[1];
                return ($n >= 16 && $n <= 22) ? ('T' . $n) : null;
            }
            if (preg_match('/^TB0*(\d+)$/i', $s, $m)) {
                $n = (int) $m[1];
                return ($n >= 1 && $n <= 8) ? ('TB' . $n) : null;
            }
            if (preg_match('/^BARR-I[1-5]$/', $s) || preg_match('/^BARR-E[1-5]$/', $s)) {
                return $s;
            }
            if (preg_match('/^B-(\d+)$/', $s, $m)) {
                $tb = (int) $m[1] - 10; // B-11..B-18 -> TB1..TB8
                return ($tb >= 1 && $tb <= 8) ? ('TB' . $tb) : null;
            }
            if (preg_match('/^CD-(\d+)$/', $s, $m)) {
                $n = (int) $m[1];
                return ($n >= 1 && $n <= 11) ? ('M' . $n) : null;
            }
            if (preg_match('/^TA-(\d+)$/', $s, $m)) {
                $n = (int) $m[1];
                if ($n >= 16 && $n <= 22) {
                    return 'T' . $n;
                }
                return ($n === 15) ? 'T16' : null;
            }
            if (preg_match('/^TB-(\d+)$/', $s, $m)) {
                $n = (int) $m[1];
                return ($n >= 1 && $n <= 8) ? ('TB' . $n) : null;
            }
            if (preg_match('/^(\d{1,2})$/', $s, $m)) {
                $n = (int) $m[1];
                if ($n >= 1 && $n <= 11) {
                    return 'M' . $n;
                }
                if ($n >= 16 && $n <= 22) {
                    return 'T' . $n;
                }
                return ($n === 15) ? 'T16' : null;
            }
            return null;
        }
    }

    class HistoricSync {
        private $conn;
        private $lastSync   = [];
        private $isInitialLoad = true;
        private $srSchemaCache = [];

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
                    // Mantener SIEMPRE el turno actual sincronizado (ventas + líneas de pago).
                    // Evita quedarnos con abiertos viejos cuando la carga histórica ya terminó.
                    $this->syncToday();
                    $this->syncCashMovements();
                    $this->syncCancellations();
                    $this->syncShifts();
                    $this->syncAttendance();
                    if (method_exists($this, 'syncPosTableLiveFromSr')) {
                        try {
                            $this->syncPosTableLiveFromSr();
                        } catch (Throwable $e) {
                            $this->log('[MAPAS] ERROR no bloqueante: ' . $e->getMessage());
                        }
                    } else {
                        $this->log('[MAPAS] SKIP: método syncPosTableLiveFromSr no definido.');
                    }
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

        private function normalizeTicketKeyPart($raw): string {
            $v = strtoupper(trim((string)$raw));
            $v = str_replace(["\r", "\n", "\t", '#', ' '], '', $v);
            return $v;
        }

        private function buildTicketMergeKey(array $row): string {
            $folio = $this->normalizeTicketKeyPart($row['folio'] ?? '');
            $num = $this->normalizeTicketKeyPart($row['numcheque'] ?? '');
            if ($folio !== '') return $folio;
            if ($num !== '') return $num;
            return '';
        }

        private function choosePreferredTicketRow(array $a, array $b): array {
            $rankA = intval($a['source_rank'] ?? 9);
            $rankB = intval($b['source_rank'] ?? 9);
            if ($rankA !== $rankB) {
                return ($rankA < $rankB) ? $a : $b; // cheques (1) sobre tempcheques (2)
            }
            $paidA = $this->srChequeRowIsPaid($a);
            $paidB = $this->srChequeRowIsPaid($b);
            if ($paidA !== $paidB) {
                return $paidA ? $a : $b;
            }
            $fa = strtotime((string)($a['fecha'] ?? '')) ?: 0;
            $fb = strtotime((string)($b['fecha'] ?? '')) ?: 0;
            return ($fa >= $fb) ? $a : $b;
        }

        private function collapseTicketsPreferCheques(array $rows): array {
            $byKey = [];
            foreach ($rows as $r) {
                $k = $this->buildTicketMergeKey($r);
                if ($k === '') {
                    $byKey['__row_' . count($byKey)] = $r;
                    continue;
                }
                if (!isset($byKey[$k])) {
                    $byKey[$k] = $r;
                } else {
                    $byKey[$k] = $this->choosePreferredTicketRow($byKey[$k], $r);
                }
            }
            return array_values($byKey);
        }

        /**
         * Sincroniza turno actual (8:00 -> 07:59 siguiente día) aunque siga la carga histórica.
         * Evita que el dashboard quede en 0 mientras recorre años anteriores.
         */
        private function syncToday() {
            try {
                // Calcular el turno (08:00 -> 07:59) usando GETDATE() del SQL Server (no el reloj del PC).
                // Esto evita desfases de zona horaria/fecha que dejan el dashboard en 0.
                // Usamos un rango semiabierto: start <= c.fecha < endExclusive (endExclusive = turno siguiente 08:00).
                $dateFilterToday = "
                    (
                        c.fecha >= DATEADD(
                            HOUR,
                            8,
                            CAST(
                                CASE
                                    WHEN DATEPART(HOUR, GETDATE()) < 8 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                                    ELSE CONVERT(date, GETDATE())
                                END
                            AS datetime)
                        )
                        AND
                        c.fecha < DATEADD(
                            HOUR,
                            8,
                            CAST(
                                CASE
                                    WHEN DATEPART(HOUR, GETDATE()) < 8 THEN CONVERT(date, GETDATE())
                                    ELSE DATEADD(DAY,1, CONVERT(date, GETDATE()))
                                END
                            AS datetime)
                        )
                    )
                ";

                $pJoin = $this->sqlChequespagosAggJoin();
                $eEf = $this->sqlEffectiveEfectivoExpr();
                $eTa = $this->sqlEffectiveTarjetaExpr();
                $eVa = $this->sqlEffectiveValesExpr();
                $eOt = $this->sqlEffectiveOtrosExpr();
                $sql = "
                    SELECT TOP 700
                        c.folio, c.numcheque, c.fecha,
                        ISNULL(c.total,0) AS total,
                        ISNULL(c.subtotal,0) AS subtotal,
                        ISNULL(c.totalimpuesto1,0) AS impuesto,
                        ISNULL(c.propina,0) AS propina,
                        ISNULL(c.descuentoimporte,0) AS descuento,
                        c.idmesero, m.nombre AS nombre_mesero,
                        c.mesa, c.nopersonas, c.pagado, c.cancelado,
                        {$eEf} AS efectivo,
                        {$eTa} AS tarjeta,
                        {$eVa} AS vales,
                        {$eOt} AS otros,
                        1 AS source_rank
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    {$pJoin}
                    WHERE c.cancelado = 0
                      AND ($dateFilterToday)
                    ORDER BY c.fecha ASC
                ";
                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                try {
                    $pJoinT = $this->sqlChequespagosAggJoin('t');
                    $eEfT = $this->sqlEffectiveEfectivoExpr('t');
                    $eTaT = $this->sqlEffectiveTarjetaExpr('t');
                    $eVaT = $this->sqlEffectiveValesExpr('t');
                    $eOtT = $this->sqlEffectiveOtrosExpr('t');
                    $sqlOpen = "
                        SELECT
                            t.folio, t.folio AS numcheque, t.fecha,
                            ISNULL(t.total,0) AS total, ISNULL(t.subtotal,0) AS subtotal,
                            ISNULL(t.totalimpuesto1,0) AS impuesto, ISNULL(t.propina,0) AS propina,
                            ISNULL(t.descuentoimporte,0) AS descuento,
                            t.idmesero, m.nombre AS nombre_mesero,
                            t.mesa, t.nopersonas,
                            ISNULL(t.pagado,0) AS pagado, 0 AS cancelado,
                            {$eEfT} AS efectivo,
                            {$eTaT} AS tarjeta,
                            {$eVaT} AS vales,
                            {$eOtT} AS otros,
                            2 AS source_rank
                        FROM tempcheques t
                        LEFT JOIN meseros m ON t.idmesero = m.idmesero
                        {$pJoinT}
                        WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
                          AND NOT EXISTS (
                              SELECT 1
                              FROM cheques c
                              WHERE c.cancelado = 0
                                AND LTRIM(RTRIM(CAST(c.mesa AS NVARCHAR(50)))) = LTRIM(RTRIM(CAST(t.mesa AS NVARCHAR(50))))
                                AND ABS(ISNULL(c.total,0) - ISNULL(t.total,0)) <= 0.01
                                AND ABS(DATEDIFF(MINUTE, c.fecha, t.fecha)) <= 360
                          )
                    ";
                    $openRows = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                    $rows = $this->collapseTicketsPreferCheques(array_merge($rows, $openRows));
                } catch (Exception $e) {
                    // tempcheques no bloquea
                }

                if (count($rows) === 0) {
                    return;
                }

                $payload = [];
                foreach ($rows as $s) {
                    if ($s['fecha'] instanceof DateTime) {
                        $fechaObj = $s['fecha'];
                    } else {
                        try {
                            $fechaObj = new DateTime((string)$s['fecha']);
                        } catch (Exception $e) {
                            continue;
                        }
                    }
                    if ($fechaObj->format('Y') < 2000) continue;

                    $saleDatetime = $fechaObj->format('Y-m-d H:i:s');
                    $efectivo = floatval($s['efectivo'] ?? 0);
                    $tarjeta  = floatval($s['tarjeta'] ?? 0);
                    $vales    = floatval($s['vales'] ?? 0);
                    $otros    = floatval($s['otros'] ?? 0);
                    $isPaid   = $this->srChequeRowIsPaid($s);

                    if (!$isPaid) {
                        $paymentType = 'pending';
                    } else {
                        $methods = 0;
                        if ($efectivo > 0) $methods++;
                        if ($tarjeta > 0) $methods++;
                        if ($vales > 0) $methods++;
                        if ($otros > 0) $methods++;
                        if ($methods > 1) $paymentType = 'mixed';
                        elseif ($tarjeta > 0) $paymentType = 'card';
                        elseif ($vales > 0) $paymentType = 'voucher';
                        elseif ($otros > 0) $paymentType = 'transfer';
                        else $paymentType = 'cash';
                    }

                    $folioNorm = trim(str_replace(["\r", "\n", "\t"], '', (string)($s['folio'] ?? '')));
                    $numNorm   = trim(str_replace(["\r", "\n", "\t"], '', (string)($s['numcheque'] ?? '')));
                    $srTicketId = ($numNorm !== '') ? $numNorm : $folioNorm;
                    if ($srTicketId === '') {
                        continue;
                    }
                    $itemsFolio = ($folioNorm !== '') ? $folioNorm : $srTicketId;
                    $ticketNumber = ($numNorm !== '') ? $numNorm : $folioNorm;
                    $folioForApi = ($folioNorm !== '') ? $folioNorm : $ticketNumber;
                    $payload[] = [
                        'sr_ticket_id'   => $srTicketId,
                        'ticket_number'  => $ticketNumber,
                        'folio'          => $folioForApi,
                        'sale_date'      => $fechaObj->format('Y-m-d'),
                        'sale_time'      => $fechaObj->format('H:i:s'),
                        'sale_datetime'  => $saleDatetime,
                        'total'          => floatval($s['total'] ?? 0),
                        'subtotal'       => floatval($s['subtotal'] ?? 0),
                        'tax'            => floatval($s['impuesto'] ?? 0),
                        'tip'            => floatval($s['propina'] ?? 0),
                        'discount'       => floatval($s['descuento'] ?? 0),
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
                        'items'          => $this->getTicketItems($itemsFolio)
                    ];
                }

                if (count($payload) > 0) {
                    $this->sendToAPI('sales', $payload);
                    $this->syncChequePaymentLinesForCheques($dateFilterToday);
                    $this->log('[VENTAS-HOY] ' . count($payload) . ' tickets del turno actual enviados.');
                }
            } catch (Exception $e) {
                $this->log('[VENTAS-HOY] Error: ' . $e->getMessage());
            }
        }

        // ── Sanitizar fecha para interpolación segura en SQL Server ──────────────
        private function safeDatetime($dt) {
            // Asegura formato 'YYYY-MM-DD HH:MM:SS' y solo caracteres seguros
            $clean = preg_replace('/[^0-9\-: ]/', '', (string)$dt);
            $ts = strtotime($clean);
            return $ts ? date('Y-m-d H:i:s', $ts) : '2000-01-01 00:00:00';
        }

        /**
         * Cobrado:
         * - Para cheques (source_rank=1): pagado=1 / estatus=1 / importes de pago > 0.
         * - Para tempcheques (source_rank=2): NO confiar en pagado/estatus; solo importes de pago > 0.
         *   Esto evita contar como cobradas cuentas "impresas" pero aún no pagadas.
         */
        private function srChequeRowIsPaid(array $s): bool {
            if (intval($s['cancelado'] ?? 0) !== 0) {
                return false;
            }
            $sourceRank = intval($s['source_rank'] ?? 1);
            $ef = floatval($s['efectivo'] ?? 0);
            $ta = floatval($s['tarjeta'] ?? 0);
            $va = floatval($s['vales'] ?? 0);
            $ot = floatval($s['otros'] ?? 0);
            $hasPaymentAmounts = ($ef + $ta + $va + $ot) > 0.0001;

            if ($sourceRank === 2) {
                return $hasPaymentAmounts;
            }
            if (intval($s['pagado'] ?? 0) === 1) {
                return true;
            }
            if (isset($s['estatus']) && intval($s['estatus']) === 1) {
                return true;
            }
            return $hasPaymentAmounts;
        }

        /**
         * Líneas chequespagos → API (sr_cheque_payments) para desglose de medios de pago.
         * @param string $sqlFilterOnChequeC Condición SQL sobre alias c (incluye c.fecha, etc.)
         */
        private function syncChequePaymentLinesForCheques(string $sqlFilterOnChequeC): void {
            try {
                if (!$this->conn) {
                    return;
                }
                $sql = "
                    SELECT
                        p.folio,
                        CAST(p.idformadepago AS VARCHAR(20)) AS idformadepago,
                        ISNULL(p.importe, 0) AS importe,
                        CAST(ISNULL(p.referencia, '') AS VARCHAR(250)) AS referencia,
                        c.fecha AS cheque_fecha,
                        ROW_NUMBER() OVER (PARTITION BY p.folio ORDER BY p.idformadepago, p.importe) AS line_rn
                    FROM chequespagos p
                    INNER JOIN cheques c ON c.folio = p.folio AND c.cancelado = 0
                    WHERE ABS(ISNULL(p.importe, 0)) > 0.00001
                      AND ($sqlFilterOnChequeC)
                ";
                $stmt = $this->conn->query($sql);
                if (!$stmt) {
                    return;
                }
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $payload = [];
                foreach ($rows as $r) {
                    $folio = trim(str_replace(["\r", "\n", "\t"], '', (string)($r['folio'] ?? '')));
                    $rn    = (int)($r['line_rn'] ?? 0);
                    if ($folio === '' || $rn < 1) {
                        continue;
                    }
                    $fechaRaw = $r['cheque_fecha'] ?? null;
                    if ($fechaRaw instanceof DateTime) {
                        $dtStr = $fechaRaw->format('Y-m-d H:i:s');
                    } else {
                        try {
                            $dtStr = (new DateTime((string)$fechaRaw))->format('Y-m-d H:i:s');
                        } catch (Exception $e) {
                            $dtStr = date('Y-m-d H:i:s');
                        }
                    }
                    $payload[] = [
                        'folio'            => $folio,
                        // Evita colisión de line_id cuando SR reutiliza folio/renglón en días distintos.
                        // Mantiene idempotencia dentro del mismo ticket (folio+fecha+renglón).
                        'line_id'          => $folio . ':' . str_replace(['-', ' ', ':'], '', $dtStr) . ':' . $rn,
                        'id_forma_pago'    => trim((string)($r['idformadepago'] ?? '')),
                        'amount'           => floatval($r['importe'] ?? 0),
                        'reference'        => trim((string)($r['referencia'] ?? '')),
                        'payment_datetime' => $dtStr,
                    ];
                }
                if (count($payload) === 0) {
                    return;
                }
                foreach (array_chunk($payload, 400) as $chunk) {
                    $this->sendToAPI('cheque_payments', $chunk);
                }
                $this->log('[PAGOS-LINEAS] ' . count($payload) . ' líneas chequespagos → API.');
            } catch (Exception $e) {
                $this->log('[PAGOS-LINEAS] ERROR: ' . $e->getMessage());
            }
        }

        private function dateParts($dt) {
            $safe = $this->safeDatetime($dt);
            $ts = strtotime($safe);
            if (!$ts) $ts = strtotime(HISTORY_START);
            return [
                'Y' => (int)date('Y', $ts),
                'M' => (int)date('n', $ts),
                'D' => (int)date('j', $ts),
                'H' => (int)date('G', $ts),
                'I' => (int)date('i', $ts),
                'S' => (int)date('s', $ts),
                'str' => date('Y-m-d H:i:s', $ts),
            ];
        }

        private function sqlDateGreaterFilter(string $col, array $p): string {
            $Y = (int)$p['Y']; $M = (int)$p['M']; $D = (int)$p['D'];
            $H = (int)$p['H']; $I = (int)$p['I']; $S = (int)$p['S'];
            return "
                (YEAR($col) > $Y)
                OR (YEAR($col) = $Y AND MONTH($col) > $M)
                OR (YEAR($col) = $Y AND MONTH($col) = $M AND DAY($col) > $D)
                OR (YEAR($col) = $Y AND MONTH($col) = $M AND DAY($col) = $D AND DATEPART(HOUR, $col) > $H)
                OR (YEAR($col) = $Y AND MONTH($col) = $M AND DAY($col) = $D AND DATEPART(HOUR, $col) = $H AND DATEPART(MINUTE, $col) > $I)
                OR (YEAR($col) = $Y AND MONTH($col) = $M AND DAY($col) = $D AND DATEPART(HOUR, $col) = $H AND DATEPART(MINUTE, $col) = $I AND DATEPART(SECOND, $col) > $S)
            ";
        }

        /** Evita CAST(varchar→datetime) en SQL Server (SQLSTATE 22007 con formatos locales). */
        private function sqlChequeFechaAfterLastSync(string $ls): string {
            $parts = $this->dateParts($ls);
            return '(' . trim($this->sqlDateGreaterFilter('c.fecha', $parts)) . ')';
        }

        /**
         * Agrega chequespagos por folio. Incluye idformadepago como texto (SR a veces no usa solo 1/2/3).
         * pago_otros solo suma líneas que no casaron efectivo/tarjeta/vales (evita doble conteo).
         */
        private function sqlChequespagosAggJoin(string $saleAlias = 'c'): string {
            $id = 'LOWER(LTRIM(RTRIM(CAST(idformadepago AS NVARCHAR(120)))))';
            $tryf = 'TRY_CAST(LTRIM(RTRIM(CAST(idformadepago AS NVARCHAR(120)))) AS float)';

            return "LEFT JOIN (
                            SELECT folio,
                                SUM(CASE
                                    WHEN ISNUMERIC(idformadepago) = 1 AND {$tryf} = 1 THEN importe
                                    WHEN {$id} IN (N'efectivo', N'cash', N'contado') THEN importe
                                    ELSE 0 END) AS pago_efectivo,
                                SUM(CASE
                                    WHEN ISNUMERIC(idformadepago) = 1 AND {$tryf} = 2 THEN importe
                                    WHEN {$id} IN (N'card', N'tarjeta', N'tc', N'td', N'credito', N'debito')
                                         OR {$id} LIKE N'%tarjeta%' THEN importe
                                    ELSE 0 END) AS pago_tarjeta,
                                SUM(CASE
                                    WHEN ISNUMERIC(idformadepago) = 1 AND {$tryf} = 3 THEN importe
                                    WHEN {$id} IN (N'vale', N'vales', N'voucher')
                                         OR ({$id} LIKE N'%vale%' AND {$id} NOT LIKE N'%tarjeta%') THEN importe
                                    ELSE 0 END) AS pago_vales,
                                SUM(CASE
                                    WHEN (ISNUMERIC(idformadepago) = 1 AND {$tryf} IN (1, 2, 3))
                                         OR {$id} IN (N'efectivo', N'cash', N'contado', N'card', N'tarjeta', N'tc', N'td', N'credito', N'debito', N'vale', N'vales', N'voucher')
                                         OR {$id} LIKE N'%tarjeta%'
                                         OR ({$id} LIKE N'%vale%' AND {$id} NOT LIKE N'%tarjeta%')
                                    THEN 0
                                    ELSE importe
                                END) AS pago_otros
                            FROM chequespagos
                            GROUP BY folio
                        ) p ON p.folio = {$saleAlias}.folio";
        }

        /** COALESCE(p.x, c.x, 0) devuelve 0 si p.x=0 aunque c.x tenga monto; esto corrige “todo en otros” por idformadepago no numérico. */
        private function sqlMisclassifiedChequespagosCondition(string $saleAlias = 'c'): string {
            return '(ISNULL(p.pago_efectivo,0)+ISNULL(p.pago_tarjeta,0)+ISNULL(p.pago_vales,0)) < 0.01 AND ISNULL(p.pago_otros,0) > 0.01 AND (ISNULL(' . $saleAlias . '.efectivo,0)+ISNULL(' . $saleAlias . '.tarjeta,0)+ISNULL(' . $saleAlias . '.vales,0)+ISNULL(' . $saleAlias . '.otros,0)) > 0.01';
        }

        private function sqlEffectiveEfectivoExpr(string $saleAlias = 'c'): string {
            $c = $this->sqlMisclassifiedChequespagosCondition($saleAlias);

            return "CASE WHEN {$c} THEN ISNULL({$saleAlias}.efectivo,0) ELSE COALESCE(p.pago_efectivo, {$saleAlias}.efectivo, 0) END";
        }

        private function sqlEffectiveTarjetaExpr(string $saleAlias = 'c'): string {
            $c = $this->sqlMisclassifiedChequespagosCondition($saleAlias);

            return "CASE WHEN {$c} THEN ISNULL({$saleAlias}.tarjeta,0) ELSE COALESCE(p.pago_tarjeta, {$saleAlias}.tarjeta, 0) END";
        }

        private function sqlEffectiveValesExpr(string $saleAlias = 'c'): string {
            $c = $this->sqlMisclassifiedChequespagosCondition($saleAlias);

            return "CASE WHEN {$c} THEN ISNULL({$saleAlias}.vales,0) ELSE COALESCE(p.pago_vales, {$saleAlias}.vales, 0) END";
        }

        private function sqlEffectiveOtrosExpr(string $saleAlias = 'c'): string {
            $c = $this->sqlMisclassifiedChequespagosCondition($saleAlias);

            return "CASE WHEN {$c} THEN ISNULL({$saleAlias}.otros,0) ELSE COALESCE(p.pago_otros, {$saleAlias}.otros, 0) END";
        }

        private function srFirstExistingColumn(string $table, array $candidates): ?string {
            $cacheKey = strtoupper($table) . '|' . implode(',', $candidates);
            if (array_key_exists($cacheKey, $this->srSchemaCache)) {
                return $this->srSchemaCache[$cacheKey];
            }

            foreach ($candidates as $col) {
                try {
                    $stmt = $this->conn->prepare("
                        SELECT TOP 1 COLUMN_NAME
                        FROM INFORMATION_SCHEMA.COLUMNS
                        WHERE TABLE_NAME = ? AND COLUMN_NAME = ?
                    ");
                    $stmt->execute([$table, $col]);
                    $hit = $stmt->fetchColumn();
                    if ($hit) {
                        $this->srSchemaCache[$cacheKey] = $col;
                        return $col;
                    }
                } catch (Exception $e) {
                    // continuar al siguiente candidato
                }
            }

            $this->srSchemaCache[$cacheKey] = null;
            return null;
        }

        private function getTicketItems(string $folio): array {
            $folio = trim((string)$folio);
            if ($folio === '') return [];

            foreach (['cheqdet', 'tempcheqdet'] as $detailTable) {
                try {
                    $folioCol    = $this->srFirstExistingColumn($detailTable, ['foliodet', 'folio', 'numcheque']);
                    $qtyCol      = $this->srFirstExistingColumn($detailTable, ['cantidad', 'qty']);
                    $priceCol    = $this->srFirstExistingColumn($detailTable, ['precio', 'unit_price']);
                    $discountCol = $this->srFirstExistingColumn($detailTable, ['descuento', 'discount']);
                    $subtotalCol = $this->srFirstExistingColumn($detailTable, ['importe', 'subtotal']);
                    $nameCol     = $this->srFirstExistingColumn('productos', ['descripcion', 'nombre', 'name', 'nombremostrar']);

                    if (!$folioCol || !$qtyCol || !$priceCol) {
                        continue;
                    }

                    $discountExpr = $discountCol
                        ? "ISNULL(CAST(d.$discountCol AS DECIMAL(10,2)), 0)"
                        : "CAST(0 AS DECIMAL(10,2))";

                    $subtotalExpr = $subtotalCol
                        ? "ISNULL(CAST(d.$subtotalCol AS DECIMAL(10,2)), 0)"
                        : "(ISNULL(CAST(d.$qtyCol AS DECIMAL(10,3)), 0) * ISNULL(CAST(d.$priceCol AS DECIMAL(10,2)), 0) - $discountExpr)";

                    $productNameExpr = $nameCol
                        ? "ISNULL(CAST(p.$nameCol AS VARCHAR(255)), CAST(d.idproducto AS VARCHAR(50)))"
                        : "CAST(d.idproducto AS VARCHAR(50))";

                    $sql = "
                        SELECT
                            CAST(d.idproducto AS VARCHAR(50)) AS product_id,
                            $productNameExpr AS product_name,
                            ISNULL(CAST(d.$qtyCol AS DECIMAL(10,3)), 1) AS quantity,
                            ISNULL(CAST(d.$priceCol AS DECIMAL(10,2)), 0) AS unit_price,
                            $discountExpr AS discount,
                            $subtotalExpr AS subtotal
                        FROM $detailTable d
                        LEFT JOIN productos p ON p.idproducto = d.idproducto
                        WHERE d.$folioCol = ?
                    ";

                    $stmt = $this->conn->prepare($sql);
                    $stmt->execute([$folio]);
                    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    if (!$rows) {
                        continue;
                    }

                    $items = [];
                    foreach ($rows as $r) {
                        $items[] = [
                            'product_id'   => (string)($r['product_id'] ?? ''),
                            'product_name' => trim((string)($r['product_name'] ?? 'Producto')),
                            'quantity'     => floatval($r['quantity'] ?? 0),
                            'unit_price'   => floatval($r['unit_price'] ?? 0),
                            'discount'     => floatval($r['discount'] ?? 0),
                            'subtotal'     => floatval($r['subtotal'] ?? 0),
                        ];
                    }
                    return $items;
                } catch (Exception $e) {
                    // intenta con la siguiente tabla de detalle
                }
            }

            return [];
        }

        // ── VENTAS ────────────────────────────────────────────────────────────────
        private function syncSales() {
            try {
                $lastSync = $this->lastSync['sales'] ?? HISTORY_START;
                $ls = $this->safeDatetime($lastSync); // saneado en PHP; filtro SQL vía DATEPART abajo

                $fechaGtSql = $this->sqlChequeFechaAfterLastSync($ls);
                // Para no dejar "abiertas eternas": en tiempo real re-sync de todo el turno actual
                // además de las filas > lastSync (si una nota se creó antes pero se cobró después).
                $hNow = (int)date('G');
                $shiftDateRt = ($hNow < 8) ? date('Y-m-d', strtotime('-1 day')) : date('Y-m-d');
                $todayShiftStart = $shiftDateRt . ' 08:00:00';
                $fechaTurnoSql = $this->sqlChequeFechaAfterLastSync($todayShiftStart);
                $fechaRealtimeSql = '((' . $fechaGtSql . ') OR (' . $fechaTurnoSql . '))';

                $pJoin = $this->sqlChequespagosAggJoin();
                $eEf = $this->sqlEffectiveEfectivoExpr();
                $eTa = $this->sqlEffectiveTarjetaExpr();
                $eVa = $this->sqlEffectiveValesExpr();
                $eOt = $this->sqlEffectiveOtrosExpr();

                if ($this->isInitialLoad) {
                    $this->log("[VENTAS] 📦 CARGA INICIAL desde: $ls");
                } else {
                    $this->log("[VENTAS] 🔄 TIEMPO REAL desde: $ls");
                }

                $sqlTempOpen = "
                    SELECT
                        t.folio, t.folio AS numcheque, t.fecha,
                        t.total, t.subtotal, t.totalimpuesto1 AS impuesto,
                        t.propina, t.descuentoimporte AS descuento,
                        t.idmesero, m.nombre AS nombre_mesero,
                        t.mesa, t.nopersonas,
                        ISNULL(t.pagado,0) AS pagado,
                        {$eEf} AS efectivo, {$eTa} AS tarjeta, {$eVa} AS vales, {$eOt} AS otros,
                        2 AS source_rank
                    FROM tempcheques t
                    LEFT JOIN meseros m ON t.idmesero = m.idmesero
                    {$pJoin}
                    WHERE NOT EXISTS (SELECT 1 FROM cheques c2 WHERE c2.folio = t.folio)
                      AND NOT EXISTS (
                          SELECT 1
                          FROM cheques c2
                          WHERE c2.cancelado = 0
                            AND LTRIM(RTRIM(CAST(c2.mesa AS NVARCHAR(50)))) = LTRIM(RTRIM(CAST(t.mesa AS NVARCHAR(50))))
                            AND ABS(ISNULL(c2.total,0) - ISNULL(t.total,0)) <= 0.01
                            AND ABS(DATEDIFF(MINUTE, c2.fecha, t.fecha)) <= 360
                      )
                ";

                // ── CARGA INICIAL: cerrados desde cursor + mesas abiertas (tempcheques) ──
                if ($this->isInitialLoad) {
                    $sql = "SELECT TOP 1000
                            c.folio, c.numcheque, c.fecha,
                            c.total, c.subtotal, c.totalimpuesto1 AS impuesto,
                            c.propina, c.descuentoimporte AS descuento,
                            c.idmesero, m.nombre AS nombre_mesero,
                            c.mesa, c.nopersonas, c.pagado, c.cancelado,
                            {$eEf} AS efectivo,
                            {$eTa} AS tarjeta,
                            {$eVa} AS vales,
                            {$eOt} AS otros,
                            1 AS source_rank
                        FROM cheques c
                        LEFT JOIN meseros m ON c.idmesero = m.idmesero
                        {$pJoin}
                        WHERE c.cancelado = 0
                          AND $fechaGtSql
                          AND (
                              ISNULL(c.pagado, 0) = 1
                              OR ( {$eEf} + {$eTa} + {$eVa} + {$eOt} ) > 0.0001
                          )
                        ORDER BY c.fecha ASC";
                    $sales = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                    // Carga inicial: solo cheques cerrados (cursor). Los abiertos van en syncToday / tiempo real.

                } else {
                // ── TIEMPO REAL: cerrados nuevos + abiertos + tempcheques ─────
                $sql = "SELECT TOP 1000
                            c.folio, c.numcheque, c.fecha,
                            c.total, c.subtotal, c.totalimpuesto1 AS impuesto,
                            c.propina, c.descuentoimporte AS descuento,
                            c.idmesero, m.nombre AS nombre_mesero,
                            c.mesa, c.nopersonas, c.pagado, c.cancelado,
                            {$eEf} AS efectivo,
                            {$eTa} AS tarjeta,
                            {$eVa} AS vales,
                            {$eOt} AS otros
                        FROM cheques c
                        LEFT JOIN meseros m ON c.idmesero = m.idmesero
                        {$pJoin}
                        WHERE c.cancelado = 0
                          AND $fechaRealtimeSql
                        ORDER BY c.fecha ASC";

                $sales = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

                try {
                    $openSales = $this->conn->query($sqlTempOpen)->fetchAll(PDO::FETCH_ASSOC);
                    $sales = $this->collapseTicketsPreferCheques(array_merge($sales, $openSales));
                } catch (Exception $e) {
                    // ignorar si tempcheques no disponible
                }
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
                    $isPaid   = $this->srChequeRowIsPaid($s);

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

                    $folioNorm = trim(str_replace(["\r","\n","\t"], '', (string)($s['folio'] ?? '')));
                    $numNorm   = trim(str_replace(["\r","\n","\t"], '', (string)($s['numcheque'] ?? '')));
                    $srTicketId = ($numNorm !== '') ? $numNorm : $folioNorm;
                    if ($srTicketId === '') {
                        continue;
                    }
                    $itemsFolio = ($folioNorm !== '') ? $folioNorm : $srTicketId;
                    $ticketItems = $this->getTicketItems($itemsFolio);
                    $ticketNumber = ($numNorm !== '') ? $numNorm : $folioNorm;
                    $folioForApi = ($folioNorm !== '') ? $folioNorm : $ticketNumber;

                    $data[] = [
                        'sr_ticket_id'   => $srTicketId,
                        'ticket_number'  => $ticketNumber,
                        'folio'          => $folioForApi,
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
                        'items'          => $ticketItems
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
                    $this->syncChequePaymentLinesForCheques($fechaRealtimeSql);
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
                $parts = $this->dateParts($lastSync);
                $dateFilter = $this->sqlDateGreaterFilter('fecha', $parts);

                $sql = "SELECT TOP 5000
                            folio, foliomovto, tipo, idturno, concepto, referencia,
                            importe, fecha, usuariocancelo, pagodepropina, idempresa
                        FROM movtoscaja
                        WHERE cancelado = 0
                        AND ($dateFilter)
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
                $parts = $this->dateParts($lastSync);
                $dateFilter = $this->sqlDateGreaterFilter('fecha', $parts);
                $sql = "SELECT folio, fecha, total, usuario, motivo
                        FROM cancelaciones
                        WHERE ($dateFilter)
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
                $parts = $this->dateParts($lastSync);
                $dateFilter = $this->sqlDateGreaterFilter('cierre', $parts);

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
                        WHERE ($dateFilter)
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

        /** Códigos de mesa iguales al mapa web (ReservationFloorPlan). */
        private function allDashboardTableCodes(): array
        {
            $codes = [];
            for ($i = 1; $i <= 11; $i++) {
                $codes[] = 'M' . $i;
            }
            for ($i = 16; $i <= 22; $i++) {
                $codes[] = 'T' . $i;
            }
            for ($i = 1; $i <= 8; $i++) {
                $codes[] = 'TB' . $i;
            }
            for ($i = 1; $i <= 5; $i++) {
                $codes[] = 'BARR-I' . $i;
                $codes[] = 'BARR-E' . $i;
            }
            return $codes;
        }

        private function normalizeSrTableCode(string $raw): ?string
        {
            return bonifacios_table_canonical_venue_code($raw);
        }

        private function buildMesaSistemaLookup(): array
        {
            $map = [];
            try {
                $sql = '
                    SELECT LTRIM(RTRIM(CAST(idmesa AS NVARCHAR(100)))) AS idm,
                           LTRIM(RTRIM(CAST(ISNULL(idmesasistema, N\'\') AS NVARCHAR(100)))) AS sis
                    FROM mesas
                ';
                $stmt = $this->conn->query($sql);
                if (!$stmt) {
                    return $map;
                }
                while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                    $idm = strtoupper(preg_replace('/\s+/', '', (string) ($row['idm'] ?? '')));
                    $sis = strtoupper(preg_replace('/\s+/', '', (string) ($row['sis'] ?? '')));
                    // Preferir siempre el valor que sí mapea al plano (M2/T16/TB1/BARR-*).
                    $canonIdm = $this->normalizeSrTableCode($idm);
                    $canonSis = $this->normalizeSrTableCode($sis);
                    if ($canonSis !== null) {
                        $target = $sis;
                    } elseif ($canonIdm !== null) {
                        $target = $idm;
                    } else {
                        $target = ($sis !== '') ? $sis : $idm;
                    }
                    if ($target === '') {
                        continue;
                    }
                    if ($idm !== '') {
                        $map[$idm] = $target;
                    }
                    if ($sis !== '') {
                        $map[$sis] = $target;
                    }
                }
            } catch (Exception $e) {
                $this->log('[MAPAS] sin catálogo mesas: ' . $e->getMessage());
            }

            return $map;
        }

        private function resolveMesaForPosMap(array $lookup, string $mesaRaw): string
        {
            $k = strtoupper(preg_replace('/\s+/', '', trim($mesaRaw)));
            if ($k === '') {
                return '';
            }

            // Si ya viene como código SR legible (ej. M2P4), no sustituirlo por id interno numérico.
            if ($this->normalizeSrTableCode($k) !== null) {
                return $k;
            }

            return $lookup[$k] ?? $k;
        }

        /**
         * Sincroniza ocupación tipo Comandero (rojo/azul…) → api pos_table_states → pos_table_live_state.
         */
        private function syncPosTableLiveFromSr(): void
        {
            try {
                $codes = $this->allDashboardTableCodes();
                $prio = ['free' => 0, 'open_ticket' => 1, 'printed_unpaid' => 2];
                $states = array_fill_keys($codes, 'free');
                $mesaLookup = $this->buildMesaSistemaLookup();
                $this->log('[MAPAS] catálogo mesas: ' . count($mesaLookup) . ' claves (JOIN en PHP, no en SQL)');
                $sqlTempOpen = '
                    SELECT
                        LTRIM(RTRIM(CAST(t.folio AS NVARCHAR(50)))) AS folio,
                        CONVERT(VARCHAR(19), t.fecha, 120) AS fecha_raw,
                        LTRIM(RTRIM(CAST(t.mesa AS NVARCHAR(100)))) AS mesa_raw,
                        ISNULL(t.impreso, 0) AS impreso,
                        ISNULL(t.impresiones, 0) AS impresiones,
                        ISNULL(t.pagado, 0) AS pagado,
                        ISNULL(t.cancelado, 0) AS cancelado
                    FROM tempcheques t
                    WHERE ISNULL(t.cancelado, 0) = 0
                      AND ISNULL(t.pagado, 0) = 0
                ';
                $sqlCheqOpen = '
                    SELECT
                        LTRIM(RTRIM(CAST(c.folio AS NVARCHAR(50)))) AS folio,
                        CONVERT(VARCHAR(19), c.fecha, 120) AS fecha_raw,
                        LTRIM(RTRIM(CAST(c.mesa AS NVARCHAR(100)))) AS mesa_raw,
                        ISNULL(c.impreso, 0) AS impreso,
                        ISNULL(c.impresiones, 0) AS impresiones,
                        ISNULL(c.pagado, 0) AS pagado,
                        ISNULL(c.cancelado, 0) AS cancelado
                    FROM cheques c
                    WHERE ISNULL(c.cancelado, 0) = 0
                      AND ISNULL(c.pagado, 0) = 0
                      AND c.fecha >= DATEADD(DAY, -21, CAST(GETDATE() AS DATETIME))
                ';
                $byFolio = [];
                $skipNoMesa = [];
                $skipNoCanon = [];
                foreach (array('temp' => $sqlTempOpen, 'cheques' => $sqlCheqOpen) as $label => $sqlPart) {
                    $stmtPart = $this->conn->query($sqlPart);
                    if (!$stmtPart) {
                        continue;
                    }
                    while ($r = $stmtPart->fetch(PDO::FETCH_ASSOC)) {
                        $folio = preg_replace('/\s+/', '', strtoupper(trim((string) ($r['folio'] ?? ''))));
                        if ($folio === '') {
                            continue;
                        }
                        if ($label === 'temp') {
                            $byFolio[$folio] = $r;
                        } elseif (!isset($byFolio[$folio])) {
                            $byFolio[$folio] = $r;
                        }
                    }
                }
                $merged = array_values($byFolio);
                $this->log('[MAPAS] tickets abiertos (folios únicos): ' . count($merged));
                $latestByTable = [];
                foreach ($merged as $r) {
                    $mesaRaw = (string) ($r['mesa_raw'] ?? '');
                    if (trim($mesaRaw) === '') {
                        $skipNoMesa[] = (string) ($r['folio'] ?? '');
                        continue;
                    }
                    $resolved = $this->resolveMesaForPosMap($mesaLookup, $mesaRaw);
                    if ($resolved === '') {
                        continue;
                    }
                    $norm = $this->normalizeSrTableCode($resolved);
                    if ($norm === null || !array_key_exists($norm, $states)) {
                        $skipNoCanon[] = $resolved;
                        continue;
                    }
                    if (intval($r['cancelado'] ?? 0) !== 0 || intval($r['pagado'] ?? 0) === 1) {
                        continue;
                    }
                    // Ámbar solo si el cheque activo de esa mesa está impreso.
                    // (Tomamos la fila más reciente por mesa para evitar "falsos ámbar" por abiertos viejos).
                    $printed = intval($r['impreso'] ?? 0) >= 1;
                    $newState = $printed ? 'printed_unpaid' : 'open_ticket';
                    $dtRaw = (string) ($r['fecha_raw'] ?? '');
                    $ts = strtotime($dtRaw);
                    $ts = $ts !== false ? (int) $ts : 0;
                    if (!isset($latestByTable[$norm]) || $ts >= ($latestByTable[$norm]['ts'] ?? -1)) {
                        $latestByTable[$norm] = ['ts' => $ts, 'state' => $newState];
                    }
                }
                foreach ($latestByTable as $code => $meta) {
                    $st = (string) ($meta['state'] ?? 'free');
                    if (isset($states[$code]) && isset($prio[$st])) {
                        $states[$code] = $st;
                    }
                }
                $uqMesa = array_values(array_unique(array_filter(array_map('strval', $skipNoMesa))));
                $uqCanon = array_values(array_unique(array_filter(array_map('strval', $skipNoCanon))));
                if ($uqMesa !== []) {
                    $this->log('[MAPAS] abiertos sin valor en campo mesa (folios): ' . implode(',', array_slice($uqMesa, 0, 12)));
                }
                if ($uqCanon !== []) {
                    $this->log('[MAPAS] campo mesa sin mapeo al plano: ' . implode(' | ', array_slice($uqCanon, 0, 12)));
                    foreach (array_slice($merged, 0, 30) as $rdbg) {
                        $rawDbg = (string) ($rdbg['mesa_raw'] ?? '');
                        $resDbg = $this->resolveMesaForPosMap($mesaLookup, $rawDbg);
                        $canonDbg = $this->normalizeSrTableCode($resDbg);
                        if ($canonDbg === null) {
                            $this->log('[MAPAS] debug mesa raw=' . $rawDbg . ' resolved=' . $resDbg . ' folio=' . (string)($rdbg['folio'] ?? ''));
                        }
                    }
                }
                $payload = [];
                foreach ($states as $code => $st) {
                    $payload[] = ['table_code' => $code, 'state' => $st];
                }
                $this->sendToAPI('pos_table_states', $payload);
                $busy = 0;
                foreach ($states as $stRow) {
                    if ($stRow !== 'free') {
                        ++$busy;
                    }
                }
                $this->log('[MAPAS] pos_table_states: ' . $busy . ' ocupadas.');
            } catch (Exception $e) {
                $this->log('[MAPAS] ERROR: ' . $e->getMessage());
            }
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
