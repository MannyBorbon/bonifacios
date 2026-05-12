<?php
/**
 * ============================================================
 * BONIFACIOS - Sync FINAL
 * ============================================================
 * Campos verificados en documentacion.md linea 913:
 * - cheques.pagado       (principal; si queda 0 pero hay cobro en efectivo/tarjeta/vales/otros → cerrado vía srChequeIsPaid)
 * - cheques.folio        (PK, usada para JOINs)
 * - cheques.nopersonas   (no 'numpersonas')
 * - cheques.cancelado    (campo separado)
 * - cheqdet.foliodet     (FK a cheques.folio)
 * - efectivo,tarjeta,vales,otros existen directamente
 * - totalimpuesto1 existe
 * - descuentoimporte existe
 *
 * FIX SQLSTATE[22007]:
 * - Filtro de fecha usando YEAR()/MONTH()/DAY() en vez de > 'datetime'
 * - El driver ODBC 18 falla al comparar string con DATETIME directamente
 * - Con funciones YEAR/MONTH/DAY no hay conversion implicita
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

    /**
     * Cuenta cobrada en SR: pagado=1, o estatus=1 en esquemas alternos, o desglose de medios de pago > 0.
     * tempcheques se envía con efectivo/tarjeta en 0 → permanece abierto.
     */
    private function srChequeIsPaid(array $r): bool {
        if (intval($r['cancelado'] ?? 0) !== 0) {
            return false;
        }
        if (intval($r['pagado'] ?? 0) === 1) {
            return true;
        }
        if (isset($r['estatus']) && intval($r['estatus']) === 1) {
            return true;
        }
        $ef = floatval($r['efectivo'] ?? 0);
        $ta = floatval($r['tarjeta'] ?? 0);
        $va = floatval($r['vales'] ?? 0);
        $ot = floatval($r['otros'] ?? 0);
        return ($ef + $ta + $va + $ot) > 0.0001;
    }

    /**
     * Misma lógica que sync-historico: agregación chequespagos + fallback a columnas del cheque.
     */
    private function sqlChequespagosAggJoin(): string {
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
                        ) p ON p.folio = c.folio";
    }

    private function sqlMisclassifiedChequespagosCondition(): string {
        return '(ISNULL(p.pago_efectivo,0)+ISNULL(p.pago_tarjeta,0)+ISNULL(p.pago_vales,0)) < 0.01 AND ISNULL(p.pago_otros,0) > 0.01 AND (ISNULL(c.efectivo,0)+ISNULL(c.tarjeta,0)+ISNULL(c.vales,0)+ISNULL(c.otros,0)) > 0.01';
    }

    private function sqlEffectiveEfectivoExpr(): string {
        $c = $this->sqlMisclassifiedChequespagosCondition();

        return "CASE WHEN {$c} THEN ISNULL(c.efectivo,0) ELSE COALESCE(p.pago_efectivo, c.efectivo, 0) END";
    }

    private function sqlEffectiveTarjetaExpr(): string {
        $c = $this->sqlMisclassifiedChequespagosCondition();

        return "CASE WHEN {$c} THEN ISNULL(c.tarjeta,0) ELSE COALESCE(p.pago_tarjeta, c.tarjeta, 0) END";
    }

    private function sqlEffectiveValesExpr(): string {
        $c = $this->sqlMisclassifiedChequespagosCondition();

        return "CASE WHEN {$c} THEN ISNULL(c.vales,0) ELSE COALESCE(p.pago_vales, c.vales, 0) END";
    }

    private function sqlEffectiveOtrosExpr(): string {
        $c = $this->sqlMisclassifiedChequespagosCondition();

        return "CASE WHEN {$c} THEN ISNULL(c.otros,0) ELSE COALESCE(p.pago_otros, c.otros, 0) END";
    }

    public function run(): void {
        while (true) {
            $t = microtime(true);
            if ($this->connect()) {
                $this->syncSales();
                // En modo historico: ademas sincronizar el dia de hoy en tiempo real
                if ($this->initialLoad) {
                    $this->syncToday();
                }
                $this->syncCashMovements();
                $this->syncCancellations();
                $this->syncShifts();
                $this->syncAttendance();
                $this->syncTicketItems();
                if (method_exists($this, 'syncPosTableLiveFromSr')) {
                    try {
                        $this->syncPosTableLiveFromSr();
                    } catch (Throwable $e) {
                        $this->log("[MAPAS] ERROR no bloqueante: " . $e->getMessage());
                    }
                } else {
                    $this->log("[MAPAS] SKIP: método syncPosTableLiveFromSr no definido.");
                }
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

    // Helper para obtener items de un ticket
    private function getTicketItems(string $folio): array {
        try {
            $sql = "
                SELECT
                    CAST(d.idproducto AS VARCHAR(50)) AS product_id,
                    ISNULL(CAST(p.nombre AS VARCHAR(255)), CAST(d.idproducto AS VARCHAR(50))) AS product_name,
                    ISNULL(CAST(d.cantidad AS DECIMAL(10,3)), 1) AS quantity,
                    ISNULL(CAST(d.precio AS DECIMAL(10,2)), 0) AS unit_price,
                    ISNULL(CAST(d.descuento AS DECIMAL(10,2)), 0) AS discount
                FROM cheqdet d
                LEFT JOIN productos p ON p.idproducto = d.idproducto
                WHERE d.foliodet = ?
            ";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$folio]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $items = [];
            foreach ($rows as $r) {
                $qty = floatval($r['quantity']);
                $prc = floatval($r['unit_price']);
                $dsc = floatval($r['discount']);
                $items[] = [
                    'product_id'   => $r['product_id'],
                    'product_name' => trim($r['product_name']),
                    'quantity'     => $qty,
                    'unit_price'   => $prc,
                    'discount'     => $dsc,
                    'subtotal'     => ($qty * $prc) - $dsc
                ];
            }
            return $items;
        } catch (Throwable $e) {
            return [];
        }
    }

    // Sincroniza solo el dia actual (turno 8AM-7:59AM) para tener ventas en vivo
    // Se ejecuta incluso durante la carga historica
    private function syncToday(): void {
        try {
            // Turno actual (08:00–07:59) calculado con GETDATE() del SQL Server para evitar
            // desfases de zona horaria entre el PC del sync y el servidor SQL.
            $dateFilterToday = "
                (
                    c.fecha >= DATEADD(HOUR, 8, CAST(
                        CASE
                            WHEN DATEPART(HOUR, GETDATE()) < 8 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                            ELSE CONVERT(date, GETDATE())
                        END
                    AS datetime))
                    AND
                    c.fecha < DATEADD(HOUR, 8, CAST(
                        CASE
                            WHEN DATEPART(HOUR, GETDATE()) < 8 THEN CONVERT(date, GETDATE())
                            ELSE DATEADD(DAY,1, CONVERT(date, GETDATE()))
                        END
                    AS datetime))
                )
            ";

            $pJoin = $this->sqlChequespagosAggJoin();
            $eEf = $this->sqlEffectiveEfectivoExpr();
            $eTa = $this->sqlEffectiveTarjetaExpr();
            $eVa = $this->sqlEffectiveValesExpr();
            $eOt = $this->sqlEffectiveOtrosExpr();

            $sql = "
                SELECT
                    c.folio, c.numcheque, c.fecha,
                    CASE WHEN ISNULL(c.total,0) > 0
                         THEN c.total - CASE WHEN ISNULL(c.propinaincluida,0)=1 THEN ISNULL(c.propina,0) ELSE 0 END
                         ELSE ISNULL(c.subtotal,0) + ISNULL(c.totalimpuesto1,0) - ISNULL(c.descuentoimporte,0)
                    END AS total,
                    ISNULL(c.subtotal,0) AS subtotal,
                    ISNULL(c.totalimpuesto1,0) AS impuesto,
                    ISNULL(c.propina,0) AS propina,
                    ISNULL(c.descuentoimporte,0) AS descuento,
                    ISNULL(c.propinaincluida,0) AS propinaincluida,
                    c.idmesero, m.nombre AS nombre_mesero,
                    c.nopersonas, c.pagado, c.cancelado,
                    {$eEf} AS efectivo,
                    {$eTa} AS tarjeta,
                    {$eVa} AS vales,
                    {$eOt} AS otros
                FROM cheques c
                LEFT JOIN meseros m ON c.idmesero = m.idmesero
                {$pJoin}
                WHERE c.cancelado = 0
                  AND ($dateFilterToday)
                ORDER BY c.fecha ASC
            ";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // Tickets abiertos hoy
            try {
                $sqlOpen = "
                    SELECT t.folio, t.folio AS numcheque, t.fecha,
                        ISNULL(t.total,0) AS total, ISNULL(t.subtotal,0) AS subtotal,
                        ISNULL(t.totalimpuesto1,0) AS impuesto, ISNULL(t.propina,0) AS propina,
                        ISNULL(t.descuentoimporte,0) AS descuento, 0 AS propinaincluida, 0 AS propinapagada,
                        t.idmesero, m.nombre AS nombre_mesero, t.nopersonas,
                        0 AS pagado, 0 AS cancelado,
                        0 AS efectivo, 0 AS tarjeta, 0 AS vales, 0 AS otros
                    FROM tempcheques t
                    LEFT JOIN meseros m ON t.idmesero = m.idmesero
                    WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)
                ";
                $open = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                $rows = array_merge($rows, $open);
            } catch (Throwable $e) {}

            if (count($rows) === 0) return;

            $data = [];
            foreach ($rows as $r) {
                $fechaObj = $this->toDatetime($r['fecha']);
                if (!$fechaObj) continue;
                $dt     = $fechaObj->format('Y-m-d H:i:s');
                $isPaid = $this->srChequeIsPaid($r);
                $ef = floatval($r['efectivo']); $ta = floatval($r['tarjeta']);
                $va = floatval($r['vales']);     $ot = floatval($r['otros']);
                if (!$isPaid) { $pType = 'pending'; }
                else {
                    $n = ($ef>0?1:0)+($ta>0?1:0)+($va>0?1:0)+($ot>0?1:0);
                    if ($n>1) $pType='mixed'; elseif($ta>0) $pType='card';
                    elseif($va>0) $pType='voucher'; elseif($ot>0) $pType='transfer';
                    else $pType='cash';
                }
                $tid = trim(str_replace(["\r","\n","\t"],'', (string)($r['folio']??'')));
                $data[] = [
                    'sr_ticket_id'=>$tid, 'ticket_number'=>(string)($r['numcheque']??$tid),
                    'folio'=>(string)($r['numcheque']??$tid),
                    'sale_date'=>$fechaObj->format('Y-m-d'), 'sale_time'=>$fechaObj->format('H:i:s'),
                    'sale_datetime'=>$dt, 'total'=>floatval($r['total']??0),
                    'subtotal'=>floatval($r['subtotal']??0), 'tax'=>floatval($r['impuesto']??0),
                    'tip'=>floatval($r['propina']??0), 'tip_paid'=>intval($r['propinapagada']??0), 'discount'=>floatval($r['descuento']??0),
                    'waiter_id'=>(string)($r['idmesero']??''),
                    'waiter_name'=>trim((string)($r['nombre_mesero']??'')),
                    'table_id'=>'', 'table_number'=>(string)($r['mesa']??''),
                    'covers'=>intval($r['nopersonas']??0),
                    'status'=>$isPaid?'closed':'open', 'payment_type'=>$pType,
                    'cash_amount'=>$ef, 'card_amount'=>$ta,
                    'voucher_amount'=>$va, 'other_amount'=>$ot,
                    'opened_at'=>$dt, 'closed_at'=>$isPaid?$dt:null,
                    'items' => $this->getTicketItems($tid),
                ];
            }

            if (count($data) > 0) {
                $this->sendToAPI('sales', $data);
                $this->log("[HOY] " . count($data) . " tickets del turno actual sincronizados.");
            }
            $this->syncChequePaymentLinesForCheques($dateFilterToday);
        } catch (Throwable $e) {
            $this->log("[HOY] ERROR: " . $e->getMessage());
        }
    }

    /**
     * Envía líneas de chequespagos al API (sr_cheque_payments) para desglose Efectivo/Tarjeta en dashboard.
     * @param string $sqlFilterOnChequeC Condición SQL sobre c (incluye prefijo c.) ya entre paréntesis o expresión completa.
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
                $fo    = $this->toDatetime($r['cheque_fecha'] ?? null);
                $dtStr = $fo ? $fo->format('Y-m-d H:i:s') : date('Y-m-d H:i:s');
                $payload[] = [
                    'folio'              => $folio,
                    'line_id'            => $folio . ':' . $rn,
                    'id_forma_pago'      => trim((string)($r['idformadepago'] ?? '')),
                    'amount'             => floatval($r['importe'] ?? 0),
                    'reference'          => trim((string)($r['referencia'] ?? '')),
                    'payment_datetime'   => $dtStr,
                ];
            }
            if (count($payload) === 0) {
                return;
            }
            foreach (array_chunk($payload, 400) as $chunk) {
                $this->sendToAPI('cheque_payments', $chunk);
            }
            $this->log('[PAGOS-LINEAS] ' . count($payload) . ' líneas chequespagos → API.');
        } catch (Throwable $e) {
            $this->log('[PAGOS-LINEAS] ERROR: ' . $e->getMessage());
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
            // Logica: fecha > lastSync equivale a:
            // YEAR > Y  OR  (YEAR=Y AND MONTH > M)  OR  (YEAR=Y AND MONTH=M AND DAY > D)
            // OR (YEAR=Y AND MONTH=M AND DAY=D AND HOUR > H) ...
            // Simplificado para evitar complejidad: comparar solo hasta el dia
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

            $pJoin = $this->sqlChequespagosAggJoin();
            $eEf = $this->sqlEffectiveEfectivoExpr();
            $eTa = $this->sqlEffectiveTarjetaExpr();
            $eVa = $this->sqlEffectiveValesExpr();
            $eOt = $this->sqlEffectiveOtrosExpr();

            if ($this->initialLoad) {
                $sql = "
                    SELECT TOP 50
                        c.folio,
                        c.numcheque,
                        c.fecha,
                        -- cheques.total ya es el valor neto que SR calcula
                        -- si total=0 es cortesia completa (descuento=100%)
                        ISNULL(c.total,0) AS total,
                        ISNULL(c.subtotal,0) AS subtotal,
                        ISNULL(c.totalimpuesto1,0) AS impuesto,
                        ISNULL(c.propina,0) AS propina,
                        ISNULL(c.descuentoimporte,0) AS descuento,
                        ISNULL(c.propinaincluida,0) AS propinaincluida,
                        ISNULL(c.propinapagada,0) AS propinapagada,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.nopersonas,
                        c.pagado,
                        c.cancelado,
                        {$eEf} AS efectivo,
                        {$eTa} AS tarjeta,
                        {$eVa} AS vales,
                        {$eOt} AS otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    {$pJoin}
                    WHERE c.cancelado = 0
                      AND (
                          ISNULL(c.pagado, 0) = 1
                          OR ( {$eEf} + {$eTa} + {$eVa} + {$eOt} ) > 0.0001
                      )
                      AND ($dateFilter)
                    ORDER BY c.fecha ASC
                ";
                $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                $open = [];

            } else {
                // Tiempo real: turno actual (08:00–07:59) con GETDATE() del SQL Server.
                $dateFilterToday = "
                    (
                        c.fecha >= DATEADD(HOUR, 8, CAST(
                            CASE
                                WHEN DATEPART(HOUR, GETDATE()) < 8 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                                ELSE CONVERT(date, GETDATE())
                            END
                        AS datetime))
                        AND
                        c.fecha < DATEADD(HOUR, 8, CAST(
                            CASE
                                WHEN DATEPART(HOUR, GETDATE()) < 8 THEN CONVERT(date, GETDATE())
                                ELSE DATEADD(DAY,1, CONVERT(date, GETDATE()))
                            END
                        AS datetime))
                    )
                ";
                
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
                        ISNULL(c.propinapagada,0) AS propinapagada,
                        c.idmesero,
                        m.nombre AS nombre_mesero,
                        c.nopersonas,
                        c.pagado,
                        c.cancelado,
                        {$eEf} AS efectivo,
                        {$eTa} AS tarjeta,
                        {$eVa} AS vales,
                        {$eOt} AS otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    {$pJoin}
                    WHERE c.cancelado = 0
                      AND (
                          ISNULL(c.pagado, 0) = 1
                          OR ( {$eEf} + {$eTa} + {$eVa} + {$eOt} ) > 0.0001
                      )
                      AND ($dateFilterToday)
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
                $isPaid = $this->srChequeIsPaid($r);

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
                    'tip_paid'       => intval($r['propinapagada'] ?? 0),
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
                if ($this->initialLoad) {
                    $this->syncChequePaymentLinesForCheques($dateFilter);
                } else {
                    $this->syncChequePaymentLinesForCheques($dateFilterToday);
                }
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
    // ITEMS DE TICKETS (cheqdet)
    // =========================================================
    private function syncTicketItems(): void {
        try {
            // Detectar nombre de columna de nombre en productos
            $nameCol   = 'nombre';
            $familyCol = 'familia';
            try {
                $chk = $this->conn->query("SELECT TOP 1 COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='productos' AND COLUMN_NAME IN ('nombre','name','nombreproducto','nombremostrar','descripcion') ORDER BY ORDINAL_POSITION")->fetchColumn();
                if ($chk) $nameCol = $chk;
                $chk2 = $this->conn->query("SELECT TOP 1 COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='productos' AND COLUMN_NAME IN ('familia','category','categoria','subcategoria','clasificacion','grupoproducto') ORDER BY ORDINAL_POSITION")->fetchColumn();
                if ($chk2) $familyCol = $chk2; else $familyCol = null;
            } catch (Throwable $e) {}
            $this->log("[ITEMS] Columnas productos: name=$nameCol family=$familyCol");

            // Obtener folios del turno actual con GETDATE() del SQL Server.
            $itemsDateFilter = "
                (
                    c.fecha >= DATEADD(HOUR, 8, CAST(
                        CASE
                            WHEN DATEPART(HOUR, GETDATE()) < 8 THEN DATEADD(DAY,-1, CONVERT(date, GETDATE()))
                            ELSE CONVERT(date, GETDATE())
                        END
                    AS datetime))
                    AND
                    c.fecha < DATEADD(HOUR, 8, CAST(
                        CASE
                            WHEN DATEPART(HOUR, GETDATE()) < 8 THEN CONVERT(date, GETDATE())
                            ELSE DATEADD(DAY,1, CONVERT(date, GETDATE()))
                        END
                    AS datetime))
                )
            ";

            $categorySelect = $familyCol
                ? "ISNULL(CAST(p.$familyCol AS VARCHAR(100)), '') AS category,"
                : "'' AS category,";

            $sql = "
                SELECT
                    d.foliodet AS folio,
                    CAST(d.idproducto AS VARCHAR(50)) AS product_id,
                    ISNULL(CAST(p.$nameCol AS VARCHAR(255)), CAST(d.idproducto AS VARCHAR(50))) AS product_name,
                    $categorySelect
                    ISNULL(CAST(d.cantidad AS DECIMAL(10,3)), 1) AS qty,
                    ISNULL(CAST(d.precio AS DECIMAL(10,2)), 0) AS unit_price,
                    ISNULL(CAST(d.cantidad * d.precio AS DECIMAL(10,2)), 0) AS subtotal,
                    ISNULL(CAST(d.descuento AS DECIMAL(10,2)), 0) AS discount
                FROM cheqdet d
                LEFT JOIN productos p ON p.idproducto = d.idproducto
                INNER JOIN cheques c ON c.folio = d.foliodet
                WHERE ($itemsDateFilter)
                AND d.idproducto IS NOT NULL
                ORDER BY d.foliodet
            ";

            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // Agrupar por folio
            $byFolio = [];
            foreach ($rows as $r) {
                $folio = (string)$r['folio'];
                $byFolio[$folio][] = [
                    'product_id'   => (string)($r['product_id'] ?? ''),
                    'product_name' => trim((string)($r['product_name'] ?? '')),
                    'category'     => '',
                    'qty'          => floatval($r['qty']),
                    'unit_price'   => floatval($r['unit_price']),
                    'subtotal'     => floatval($r['subtotal']),
                    'discount'     => floatval($r['discount']),
                    'notes'        => '',
                ];
            }

            if (count($byFolio) === 0) return;

            $data = [];
            foreach ($byFolio as $folio => $items) {
                $data[] = ['folio' => $folio, 'items' => $items];
            }

            $this->sendToAPI('ticket_items', $data);
            $this->log("[ITEMS] " . count($byFolio) . " tickets con productos sincronizados.");

        } catch (Throwable $e) {
            $this->log("[ITEMS] ERROR: " . $e->getMessage());
        }
    }

    // =========================================================
    // TURNOS / CORTES DE CAJA
    // =========================================================
    private function syncShifts(): void {
        try {
            $lastSync = $this->state['shifts'] ?? HISTORY_START;
            $p        = $this->dateParts($lastSync);
            $Y=$p['Y']; $M=$p['M']; $D=$p['D']; $H=$p['H']; $I=$p['I']; $S=$p['S'];

            $dateFilter = "
                (YEAR(cierre) > $Y)
                OR (YEAR(cierre) = $Y AND MONTH(cierre) > $M)
                OR (YEAR(cierre) = $Y AND MONTH(cierre) = $M AND DAY(cierre) > $D)
                OR (YEAR(cierre) = $Y AND MONTH(cierre) = $M AND DAY(cierre) = $D
                    AND DATEPART(HOUR,cierre) > $H)
                OR (YEAR(cierre) = $Y AND MONTH(cierre) = $M AND DAY(cierre) = $D
                    AND DATEPART(HOUR,cierre) = $H AND DATEPART(MINUTE,cierre) > $I)
                OR (YEAR(cierre) = $Y AND MONTH(cierre) = $M AND DAY(cierre) = $D
                    AND DATEPART(HOUR,cierre) = $H AND DATEPART(MINUTE,cierre) = $I
                    AND DATEPART(SECOND,cierre) > $S)
            ";

            $sql = "
                SELECT TOP 1000
                    idturnointerno, idturno, cajero, idestacion,
                    apertura, cierre,
                    ISNULL(fondo, 0)    AS fondo,
                    ISNULL(efectivo, 0) AS efectivo,
                    ISNULL(tarjeta, 0)  AS tarjeta,
                    ISNULL(vales, 0)    AS vales,
                    ISNULL(credito, 0)  AS credito,
                    idempresa
                FROM turnos
                WHERE cierre IS NOT NULL
                  AND ($dateFilter)
                ORDER BY cierre ASC
            ";

            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            if (count($rows) === 0) return;

            $data     = [];
            $lastDate = $lastSync;

            foreach ($rows as $r) {
                $cObj = $this->toDatetime($r['cierre']);
                if (!$cObj) continue;
                $aObj     = $this->toDatetime($r['apertura']);
                $cierre   = $cObj->format('Y-m-d H:i:s');
                $apertura = $aObj ? $aObj->format('Y-m-d H:i:s') : null;
                if ($cierre > $lastDate) $lastDate = $cierre;

                $data[] = [
                    'sr_shift_id'        => (string)($r['idturnointerno'] ?? ''),
                    'sr_turno_id'        => (string)($r['idturno']        ?? ''),
                    'cajero'             => trim((string)($r['cajero']    ?? '')),
                    'estacion'           => trim((string)($r['idestacion']?? '')),
                    'apertura'           => $apertura,
                    'cierre'             => $cierre,
                    'fondo'              => floatval($r['fondo']    ?? 0),
                    'declarado_efectivo' => floatval($r['efectivo'] ?? 0),
                    'declarado_tarjeta'  => floatval($r['tarjeta']  ?? 0),
                    'declarado_vales'    => floatval($r['vales']    ?? 0),
                    'declarado_credito'  => floatval($r['credito']  ?? 0),
                    'company_id'         => (string)($r['idempresa']?? ''),
                ];
            }

            if (count($data) > 0) {
                $this->sendToAPI('shifts', $data);
                $this->state['shifts'] = $lastDate;
                $this->log("[TURNOS] " . count($data) . " cortes enviados. Ultimo: $lastDate");
            }

        } catch (Throwable $e) {
            $this->log("[TURNOS] ERROR: " . $e->getMessage());
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
                SELECT r.idempleado,
                       r.entrada,
                       r.salida,
                       ISNULL(m.nombre, '') AS nombre
                FROM registroasistencias r
                LEFT JOIN meseros m ON m.idmesero = r.idempleado
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
                $nombre = trim((string)($a['nombre'] ?? ''));
                if (!$nombre) $nombre = 'Empleado ' . (string)($a['idempleado'] ?? '');
                $data[] = [
                    'employee_id'    => (string)($a['idempleado'] ?? ''),
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
            $this->sendToAPI('attendance', $data);
            $this->log("[ASISTENCIAS] " . count($data) . " enviados.");
        } catch (Throwable $e) {
            $this->log("[ASISTENCIAS ERROR] " . $e->getMessage());
        }
    }

    // =========================================================
    // MESAS (POS / RESERVACIONES)
    // =========================================================
    private function allDashboardTableCodes(): array
    {
        $codes = [];
        for ($i = 1; $i <= 11; $i++) $codes[] = 'M' . $i;
        for ($i = 16; $i <= 22; $i++) $codes[] = 'T' . $i;
        for ($i = 1; $i <= 8; $i++) $codes[] = 'TB' . $i;
        for ($i = 1; $i <= 5; $i++) {
            $codes[] = 'BARR-I' . $i;
            $codes[] = 'BARR-E' . $i;
        }
        return $codes;
    }

    private function canonicalVenueTableCode(string $raw): ?string
    {
        $s = strtoupper(trim(preg_replace('/\s+/', '', $raw)));
        if ($s === '') return null;
        if (preg_match('/^WEB-/i', $s)) return $s;
        $s = preg_replace('/P\d+$/i', '', $s); // M2P4 -> M2

        if (preg_match('/^M0*(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            return ($n >= 1 && $n <= 11) ? ('M' . $n) : null;
        }
        if (preg_match('/^T0*(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            return ($n >= 16 && $n <= 22) ? ('T' . $n) : null;
        }
        if (preg_match('/^TB0*(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            return ($n >= 1 && $n <= 8) ? ('TB' . $n) : null;
        }
        if (preg_match('/^BARR-I[1-5]$/', $s) || preg_match('/^BARR-E[1-5]$/', $s)) {
            return $s;
        }
        if (preg_match('/^B-(\d+)$/', $s, $m)) {
            $tb = (int)$m[1] - 10; // B-11..B-18 -> TB1..TB8
            return ($tb >= 1 && $tb <= 8) ? ('TB' . $tb) : null;
        }
        if (preg_match('/^CD-(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            return ($n >= 1 && $n <= 11) ? ('M' . $n) : null;
        }
        if (preg_match('/^TA-(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            if ($n >= 16 && $n <= 22) return 'T' . $n;
            return ($n === 15) ? 'T16' : null;
        }
        if (preg_match('/^TB-(\d+)$/', $s, $m)) {
            $n = (int)$m[1];
            return ($n >= 1 && $n <= 8) ? ('TB' . $n) : null;
        }
        if (preg_match('/^(\d{1,2})$/', $s, $m)) {
            $n = (int)$m[1];
            if ($n >= 1 && $n <= 11) return 'M' . $n;
            if ($n >= 16 && $n <= 22) return 'T' . $n;
            if ($n === 15) return 'T16';
        }
        return null;
    }

    private function buildMesaSistemaLookup(): array
    {
        $map = [];
        try {
            $sql = "
                SELECT LTRIM(RTRIM(CAST(idmesa AS NVARCHAR(100)))) AS idm,
                       LTRIM(RTRIM(CAST(ISNULL(idmesasistema, N'') AS NVARCHAR(100)))) AS sis
                FROM mesas
            ";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
            foreach ($rows as $row) {
                $idm = strtoupper(preg_replace('/\s+/', '', (string)($row['idm'] ?? '')));
                $sis = strtoupper(preg_replace('/\s+/', '', (string)($row['sis'] ?? '')));
                $target = $sis !== '' ? $sis : $idm;
                if ($target === '') continue;
                if ($idm !== '') $map[$idm] = $target;
                if ($sis !== '') $map[$sis] = $target;
            }
        } catch (Throwable $e) {
            $this->log("[MAPAS] sin catálogo mesas: " . $e->getMessage());
        }
        return $map;
    }

    private function resolveMesaForPosMap(array $lookup, string $mesaRaw): string
    {
        $k = strtoupper(preg_replace('/\s+/', '', trim($mesaRaw)));
        if ($k === '') return '';
        return $lookup[$k] ?? $k;
    }

    private function syncPosTableLiveFromSr(): void
    {
        $codes = $this->allDashboardTableCodes();
        $states = array_fill_keys($codes, 'free');
        $prio = ['free' => 0, 'open_ticket' => 1, 'printed_unpaid' => 2];
        $lookup = $this->buildMesaSistemaLookup();

        $sql = "
            SELECT src, folio, mesa_raw, impreso, impresiones, pagado, cancelado
            FROM (
                SELECT
                    'temp' AS src,
                    LTRIM(RTRIM(CAST(t.folio AS NVARCHAR(50)))) AS folio,
                    LTRIM(RTRIM(CAST(t.mesa AS NVARCHAR(100)))) AS mesa_raw,
                    ISNULL(t.impreso, 0) AS impreso,
                    ISNULL(t.impresiones, 0) AS impresiones,
                    ISNULL(t.pagado, 0) AS pagado,
                    ISNULL(t.cancelado, 0) AS cancelado
                FROM tempcheques t
                WHERE ISNULL(t.cancelado, 0) = 0
                  AND ISNULL(t.pagado, 0) = 0

                UNION ALL

                SELECT
                    'cheques' AS src,
                    LTRIM(RTRIM(CAST(c.folio AS NVARCHAR(50)))) AS folio,
                    LTRIM(RTRIM(CAST(c.mesa AS NVARCHAR(100)))) AS mesa_raw,
                    ISNULL(c.impreso, 0) AS impreso,
                    ISNULL(c.impresiones, 0) AS impresiones,
                    ISNULL(c.pagado, 0) AS pagado,
                    ISNULL(c.cancelado, 0) AS cancelado
                FROM cheques c
                WHERE ISNULL(c.cancelado, 0) = 0
                  AND ISNULL(c.pagado, 0) = 0
                  AND c.fecha >= DATEADD(DAY, -21, CAST(GETDATE() AS DATETIME))
            ) x
            WHERE NULLIF(LTRIM(RTRIM(mesa_raw)), '') IS NOT NULL
        ";

        $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
        $byFolio = [];
        foreach ($rows as $r) {
            $folio = preg_replace('/\s+/', '', strtoupper(trim((string)($r['folio'] ?? ''))));
            if ($folio === '') continue;
            $src = (string)($r['src'] ?? 'cheques');
            if ($src === 'temp' || !isset($byFolio[$folio])) {
                $byFolio[$folio] = $r;
            }
        }

        $skipNoCanon = [];
        foreach (array_values($byFolio) as $r) {
            if ((int)($r['cancelado'] ?? 0) !== 0 || (int)($r['pagado'] ?? 0) === 1) continue;
            $resolved = $this->resolveMesaForPosMap($lookup, (string)($r['mesa_raw'] ?? ''));
            $canon = $this->canonicalVenueTableCode($resolved);
            if ($canon === null || !array_key_exists($canon, $states)) {
                if ($resolved !== '') $skipNoCanon[] = $resolved;
                continue;
            }
            $printed = ((int)($r['impreso'] ?? 0) >= 1) || ((int)($r['impresiones'] ?? 0) >= 1);
            $state = $printed ? 'printed_unpaid' : 'open_ticket';
            if ($prio[$state] > $prio[$states[$canon]]) $states[$canon] = $state;
        }

        $payload = [];
        $busy = 0;
        foreach ($states as $code => $st) {
            $payload[] = ['table_code' => $code, 'state' => $st];
            if ($st !== 'free') $busy++;
        }
        if (!empty($skipNoCanon)) {
            $this->log("[MAPAS] sin mapeo plano: " . implode(' | ', array_slice(array_values(array_unique($skipNoCanon)), 0, 10)));
        }
        $this->sendToAPI('pos_table_states', $payload);
        $this->log("[MAPAS] cheques abiertos detectados: " . count($byFolio));
        $this->log("[MAPAS] pos_table_states: {$busy} ocupadas, " . count($payload) . " codigos.");
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

    private function sendToAPI(string $module, array $data): array {
        $payload = json_encode([
            'module'        => $module,
            'data'          => $data,
            'sync_datetime' => date('Y-m-d H:i:s'),
        ]);
        if ($payload === false || $payload === null) {
            $this->log("  [JSON ERROR] json_encode falló: " . json_last_error_msg());
            return [];
        }
        $ch = curl_init(API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-API-Key: ' . API_KEY,
                'Content-Length: ' . strlen($payload),
            ],
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false,
        ]);
        $res      = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr  = curl_error($ch);
        @curl_close($ch);

        if ($curlErr) {
            $this->log("  [CURL ERROR] $curlErr");
            return [];
        }
        $bodyLen = strlen((string)$res);
        $decoded = json_decode((string)$res, true);
        if (is_array($decoded)) {
            $ins  = $decoded['inserted'] ?? '?';
            $upd  = $decoded['updated']  ?? '?';
            $fail = $decoded['failed']   ?? '?';
            $this->log("  [API $httpCode] inserted=$ins updated=$upd failed=$fail");
            if (!empty($decoded['error']))      $this->log("  [API ERR] " . $decoded['error']);
            if (!empty($decoded['last_error'])) $this->log("  [API ERR] " . $decoded['last_error']);
        } else {
            $this->log("  [API $httpCode] body={$bodyLen}B RAW: " . substr((string)$res, 0, 300));
        }
        return $decoded ?? [];
    }

    private function log(string $msg): void {
        echo '[' . date('H:i:s') . '] ' . $msg . "\n";
    }
}

$sync = new SyncFinal();
$sync->run();
