    <?php
    /**
     * ============================================================
     * BONIFACIOS - Sincronización PROFUNDA UNIVERSAL (SR 8.0)
     * ============================================================
     * Corregido: Error de conversión Datetime SQL Server
     * Optimizado: Carga masiva por bloques sin avisos Deprecated
     * FIXED: Agregados campos requeridos por sync.php
     * ============================================================
     */

    define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
    define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

    define('SR_SERVER', '100.84.227.35\NATIONALSOFT');
    define('SR_DATABASE', 'softrestaurant8pro');
    define('SR_USER', 'usuario_web');
    define('SR_PASS', 'Filipenses4:8@');

    define('SYNC_INTERVAL', 30); 
    define('LOG_FILE', __DIR__ . '/sync-realtime.log');
    define('STATE_FILE', __DIR__ . '/sync-state.json');

    class SmartSyncSR {
        private $conn;
        private $lastSync = [];
        private $isInitialLoad = true;
        
        public function __construct() {
            $this->loadState();
            $this->log("=== Iniciando Sincronización Universal Bonifacio's ===");
        }
        
        public function connect() {
            try {
                $this->conn = new PDO(
                    "sqlsrv:server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=no;TrustServerCertificate=yes",
                    SR_USER,
                    SR_PASS,
                    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
                );
                $this->log("Conexión a SQL Server establecida.");
                return true;
            } catch (Exception $e) {
                $this->log("✗ Error de conexión: " . $e->getMessage());
                return false;
            }
        }
        
        public function run() {
            while (true) {
                $startTime = microtime(true);
                if ($this->connect()) {
                    $this->syncSales();
                    $this->syncCancellations();
                    $this->syncCashMovements();
                    $this->syncTables();
                    $this->syncAttendance();
                    $this->saveState();
                    $this->conn = null;
                }
                
                $elapsed = microtime(true) - $startTime;
                
                if ($this->isInitialLoad) {
                    // Si mandamos datos pesados, seguimos de inmediato sin esperar
                    continue; 
                }

                $sleepTime = SYNC_INTERVAL - $elapsed;
                if ($sleepTime > 0) sleep((int)$sleepTime);
            }
        }

    private function syncSales() {
        try {
            $defaultSalesSync = '2000-01-01 00:00:00';
            $lastSync = $this->lastSync['sales'] ?? $defaultSalesSync;
            
            if ($this->isInitialLoad) {
                $this->log("[VENTAS] 📦 CARGA INICIAL - Buscando tickets desde: $lastSync...");
            } else {
                $this->log("[VENTAS] 🔄 TIEMPO REAL - Buscando tickets desde: $lastSync...");
            }

            // Normalizar fecha para usarla en filtros SQL Server
            $lastSyncSafe = date('Y-m-d H:i:s', strtotime($lastSync));

            // Durante carga inicial: solo tickets cerrados
            // En tiempo real: tickets cerrados + abiertos
            if ($this->isInitialLoad) {
                $sql = "SELECT TOP 1000 
                            c.folio, c.numcheque, c.fecha,
                            c.total, c.subtotal, c.totalimpuesto1 as impuesto, c.propina,
                            c.descuentoimporte as descuento,
                            c.idmesero, m.nombre as nombre_mesero,
                            c.mesa, c.nopersonas, c.pagado,
                            c.efectivo, c.tarjeta, c.vales, c.otros,
                            COALESCE(p.pago_efectivo, 0) as pago_efectivo,
                            COALESCE(p.pago_tarjeta, 0) as pago_tarjeta,
                            COALESCE(p.pago_vales, 0) as pago_vales,
                            COALESCE(p.pago_otros, 0) as pago_otros,
                            COALESCE(p.pago_total, 0) as pago_total
                        FROM cheques c
                        LEFT JOIN meseros m ON c.idmesero = m.idmesero
                        LEFT JOIN (
                            SELECT 
                                folio,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 1 THEN importe ELSE 0 END) as pago_efectivo,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 2 THEN importe ELSE 0 END) as pago_tarjeta,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 3 THEN importe ELSE 0 END) as pago_vales,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) NOT IN (1,2,3) THEN importe ELSE 0 END) as pago_otros,
                                SUM(importe) as pago_total
                            FROM chequespagos
                            GROUP BY folio
                        ) p ON p.folio = c.folio
                        WHERE c.pagado = 1
                          AND c.fecha > '{$lastSyncSafe}'
                        ORDER BY c.fecha ASC";
            } else {
                // Modo tiempo real: usar fecha dinámica desde lastSync

                $sql = "SELECT TOP 1000 
                            c.folio, c.numcheque, c.fecha,
                            c.total, c.subtotal, c.totalimpuesto1 as impuesto, c.propina, 
                            c.descuentoimporte as descuento, 
                            c.idmesero, m.nombre as nombre_mesero,
                            c.mesa, c.nopersonas, c.pagado,
                            c.efectivo, c.tarjeta, c.vales, c.otros,
                            COALESCE(p.pago_efectivo, 0) as pago_efectivo,
                            COALESCE(p.pago_tarjeta, 0) as pago_tarjeta,
                            COALESCE(p.pago_vales, 0) as pago_vales,
                            COALESCE(p.pago_otros, 0) as pago_otros,
                            COALESCE(p.pago_total, 0) as pago_total
                        FROM cheques c
                        LEFT JOIN meseros m ON c.idmesero = m.idmesero
                        LEFT JOIN (
                            SELECT 
                                folio,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 1 THEN importe ELSE 0 END) as pago_efectivo,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 2 THEN importe ELSE 0 END) as pago_tarjeta,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) = 3 THEN importe ELSE 0 END) as pago_vales,
                                SUM(CASE WHEN TRY_CONVERT(int, idformadepago) NOT IN (1,2,3) THEN importe ELSE 0 END) as pago_otros,
                                SUM(importe) as pago_total
                            FROM chequespagos
                            GROUP BY folio
                        ) p ON p.folio = c.folio
                        WHERE c.fecha > '{$lastSyncSafe}'
                        ORDER BY c.fecha ASC";
            }
            
            $sales = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            // Tickets abiertos SOLO en modo tiempo real (no durante carga inicial)
            $openSales = [];
            if (!$this->isInitialLoad) {
                $sqlOpen = "SELECT
                                t.folio, t.numcheque, t.fecha,
                                t.total, t.subtotal, t.totalimpuesto1 as impuesto, t.propina,
                                t.descuentoimporte as descuento,
                                t.idmesero, m.nombre as nombre_mesero,
                                t.mesa, t.nopersonas,
                                0 as pagado, 0 as efectivo, 0 as tarjeta, 0 as vales, 0 as otros,
                                0 as pago_efectivo, 0 as pago_tarjeta, 0 as pago_vales, 0 as pago_otros, 0 as pago_total
                            FROM tempcheques t
                            LEFT JOIN meseros m ON t.idmesero = m.idmesero
                            WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)";
                $openSales = $this->conn->query($sqlOpen)->fetchAll(PDO::FETCH_ASSOC);
                $sales = array_merge($sales, $openSales);
            }

            // Items de tickets cerrados (cheqdet)
            if ($this->isInitialLoad) {
                $sqlItemsClosed = "SELECT TOP 10000
                                        d.foliodet as folio,
                                        d.idproducto,
                                        p.descripcion,
                                        d.cantidad,
                                        d.precio,
                                        d.descuento,
                                        (d.cantidad * d.precio) as subtotal
                                    FROM cheqdet d
                                    LEFT JOIN productos p ON d.idproducto = p.idproducto
                                    INNER JOIN cheques c ON d.foliodet = c.folio
                                    WHERE c.pagado = 1
                                      AND c.fecha > '{$lastSyncSafe}'";
                } else {
                    $sqlItemsClosed = "SELECT
                                        d.foliodet as folio,
                                        d.idproducto,
                                        p.descripcion,
                                        d.cantidad,
                                        d.precio,
                                        d.descuento,
                                        (d.cantidad * d.precio) as subtotal
                                    FROM cheqdet d
                                    LEFT JOIN productos p ON d.idproducto = p.idproducto
                                    INNER JOIN cheques c ON d.foliodet = c.folio
                                    WHERE c.fecha > '{$lastSyncSafe}'";
                }
                $closedItems = $this->conn->query($sqlItemsClosed)->fetchAll(PDO::FETCH_ASSOC);

                // Items de tickets abiertos (tempcheqdet)
                $sqlItemsOpen = "SELECT
                                    d.foliodet as folio,
                                    d.idproducto,
                                    p.descripcion,
                                    d.cantidad,
                                    d.precio,
                                    d.descuento,
                                    (d.cantidad * d.precio) as subtotal
                                FROM tempcheqdet d
                                LEFT JOIN productos p ON d.idproducto = p.idproducto";
                $openItems = $this->conn->query($sqlItemsOpen)->fetchAll(PDO::FETCH_ASSOC);

                // Agrupar items por folio para enviarlos dentro de cada venta
                $itemsByFolio = [];
                foreach (array_merge($closedItems, $openItems) as $item) {
                    $folio = (string)($item['folio'] ?? '');
                    if ($folio === '') continue;
                    if (!isset($itemsByFolio[$folio])) $itemsByFolio[$folio] = [];

                    $itemsByFolio[$folio][] = [
                        'product_id'   => (string)($item['idproducto'] ?? ''),
                        'product_name' => trim((string)($item['descripcion'] ?? 'Producto')),
                        'quantity'     => floatval($item['cantidad'] ?? 0),
                        'unit_price'   => floatval($item['precio'] ?? 0),
                        'discount'     => floatval($item['descuento'] ?? 0),
                        'subtotal'     => floatval($item['subtotal'] ?? 0)
                    ];
                }
                
                $this->log("[VENTAS] Query encontró " . count($sales) . " tickets.");
                
                if (count($sales) > 0) {
                    $data = [];
                    $lastClosedDate = $lastSync; // Solo avanzar con tickets cerrados
                    foreach ($sales as $s) {
                        // Convertir fecha SQL Server a formato MySQL
                        $fechaObj = new DateTime($s['fecha']);
                        $saleDate = $fechaObj->format('Y-m-d');
                        $saleDatetime = $fechaObj->format('Y-m-d H:i:s');
                        
                        // Determinar método de pago principal basado en montos
                        $efectivo = floatval($s['efectivo'] ?? 0);
                        $tarjeta = floatval($s['tarjeta'] ?? 0);
                        $vales = floatval($s['vales'] ?? 0);
                        $otros = floatval($s['otros'] ?? 0);

                        // Fallback: si cheques.* viene en cero, usar chequespagos agrupado por folio
                        $sumMontos = $efectivo + $tarjeta + $vales + $otros;
                        if ($sumMontos <= 0) {
                            $pagoEfectivo = floatval($s['pago_efectivo'] ?? 0);
                            $pagoTarjeta = floatval($s['pago_tarjeta'] ?? 0);
                            $pagoVales = floatval($s['pago_vales'] ?? 0);
                            $pagoOtros = floatval($s['pago_otros'] ?? 0);
                            $pagoTotal = floatval($s['pago_total'] ?? 0);

                            if ($pagoTotal > 0) {
                                $efectivo = $pagoEfectivo;
                                $tarjeta = $pagoTarjeta;
                                $vales = $pagoVales;
                                $otros = $pagoOtros;
                            }
                        }

                        $isPaid = intval($s['pagado']) === 1;
                        
                        $paymentType = 'pending';
                        if ($isPaid) {
                            $activeMethods = 0;
                            if ($efectivo > 0) $activeMethods++;
                            if ($tarjeta > 0) $activeMethods++;
                            if ($vales > 0) $activeMethods++;
                            if ($otros > 0) $activeMethods++;

                            if ($activeMethods > 1) {
                                $paymentType = 'mixed';
                            } elseif ($tarjeta > 0) {
                                $paymentType = 'card';
                            } elseif ($vales > 0) {
                                $paymentType = 'voucher';
                            } elseif ($otros > 0) {
                                $paymentType = 'transfer';
                            } elseif ($efectivo > 0) {
                                $paymentType = 'cash';
                            }
                        }
                        
                        // Determinar estado del ticket
                        $status = $isPaid ? 'closed' : 'open';
                        
                        $numCheque = (string)($s['numcheque'] ?? $s['folio']);
                        
                        // Normalizar sr_ticket_id para evitar duplicados por espacios/caracteres ocultos
                        $srTicketId = trim(str_replace(["\r", "\n", "\t"], '', (string)$s['folio']));

                        $data[] = [
                            'sr_ticket_id'   => $srTicketId,
                            'ticket_number'  => $numCheque,
                            'folio'          => $numCheque,
                            'sale_date'      => $saleDate,
                            'sale_time'      => $fechaObj->format('H:i:s'),
                            'sale_datetime'  => $saleDatetime,
                            'total'          => floatval($s['total']),
                            'subtotal'       => floatval($s['subtotal']),
                            'tax'            => floatval($s['impuesto']),
                            'tip'            => floatval($s['propina']),
                            'discount'       => floatval($s['descuento']),
                            'waiter_id'      => (string)$s['idmesero'],
                            'waiter_name'    => trim((string)($s['nombre_mesero'] ?? '')),
                            'table_id'       => '',
                            'table_number'   => (string)$s['mesa'],
                            'covers'         => intval($s['nopersonas']),
                            'status'         => $status,
                            'payment_type'   => $isPaid ? $paymentType : 'pending',
                            'cash_amount'    => $efectivo,
                            'card_amount'    => $tarjeta,
                            'voucher_amount' => $vales,
                            'other_amount'   => $otros,
                            'opened_at'      => $saleDatetime,
                            'closed_at'      => $isPaid ? $saleDatetime : null,
                            'items'          => $itemsByFolio[(string)$s['folio']] ?? []
                        ];
                        
                        // Solo avanzar lastSync para tickets CERRADOS
                        if ($isPaid && $s['fecha'] > $lastClosedDate) {
                            $lastClosedDate = $s['fecha'];
                        }
                    }
                    
                    $this->sendToAPI('sales', $data);
                    
                    $openCount = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                    $closedCount = count($data) - $openCount;
                    $totalItems = array_sum(array_map(fn($d) => count($d['items'] ?? []), $data));
                    $this->log("[VENTAS] ¡ÉXITO! " . count($data) . " tickets enviados ($closedCount cerrados, $openCount abiertos, $totalItems items).");
                    
                    $this->lastSync['sales'] = $lastClosedDate;
                    // Continúa carga inicial si encontró 1000 registros cerrados
                    if ($this->isInitialLoad && count($sales) < 1000) {
                        $this->isInitialLoad = false;
                        $this->log("[VENTAS] --- Historial completo cargado. Iniciando modo tiempo real ---");
                    }
                } else {
                    if ($this->isInitialLoad) {
                        $this->log("[VENTAS] --- Historial completo cargado ---");
                    }
                    $this->isInitialLoad = false;
                }
            } catch (Exception $e) { $this->log("[VENTAS] Error: " . $e->getMessage()); }
        }

        private function syncCancellations() {
            try {
                $sql = "SELECT folio, fecha, total, usuario, motivo
                        FROM cancelaciones
                        WHERE fecha >= CAST(GETDATE() AS DATE)
                        ORDER BY fecha DESC";
                $stmt = $this->conn->query($sql);
                $cancels = $stmt->fetchAll(PDO::FETCH_ASSOC);

                if (count($cancels) > 0) {
                    $data = [];
                    foreach ($cancels as $c) {
                        $fechaObj = new DateTime($c['fecha']);
                        $data[] = [
                            'ticket_number' => (string)$c['folio'],
                            'amount'        => floatval($c['total']),
                            'user_name'     => $c['usuario'] ?? '',
                            'reason'        => $c['motivo'] ?? '',
                            'status'        => 'cancelled',
                            'cancel_date'   => $fechaObj->format('Y-m-d H:i:s')
                        ];
                    }
                    $this->sendToAPI('cancellations', $data);
                    $this->log("[AUDITORÍA] " . count($data) . " cancelaciones enviadas.");
                }
            } catch (Exception $e) {
                // Tabla cancelaciones puede no existir en esta versión de SoftRestaurant
            }
        }

        private function syncTables() {
            if ($this->isInitialLoad) return;
            try {
                $sql = "SELECT idmesa, personas, estatus_ocupacion FROM mesas";
                $stmt = $this->conn->query($sql);
                $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = [];
                foreach ($tables as $t) {
                    $data[] = ['sr_table_id' => (string)$t['idmesa'], 'status' => $t['estatus_ocupacion'] == 1 ? 'occupied' : 'available'];
                }
                if ($this->hasChanges('tables', $data)) {
                    $this->sendToAPI('tables', $data);
                    $this->log("[MESAS] Estado actualizado");
                }
            } catch (Exception $e) { }
        }

        private function syncCashMovements() {
            try {
                $lastSync = $this->lastSync['cash_movements'] ?? '2000-01-01 00:00:00';

                // Query simple sin conversiones - SQL Server maneja tipos nativamente
                // Cargar TODO el historial desde el año 2000
                $sql = "SELECT TOP 10000
                            folio, foliomovto, tipo, idturno, concepto, referencia,
                            importe, fecha, usuariocancelo, pagodepropina, idempresa
                        FROM movtoscaja 
                        WHERE cancelado = 0
                        ORDER BY fecha ASC";
                
                $movements = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);
                
                if (count($movements) > 0) {
                    $data = [];
                    $lastMovementDate = $lastSync;
                    
                    foreach ($movements as $m) {
                        try {
                            $fechaObj = new DateTime($m['fecha']);
                        } catch (Exception $e) {
                            continue;
                        }
                        $importe = floatval($m['importe']);
                        $tipo = intval($m['tipo']);
                        $isTipPayment = intval($m['pagodepropina'] ?? 0) === 1;
                        
                        // Clasificación correcta usando campo 'tipo' de SoftRestaurant:
                        // tipo=1 → RETIRO (dinero sale de caja, incluye "CAJA PAGA")
                        // tipo=2 → DEPOSITO (dinero entra a caja)
                        if ($isTipPayment) {
                            $movementType = 'tip_payment';
                        } elseif ($tipo === 1) {
                            $movementType = 'withdrawal';
                        } elseif ($tipo === 2) {
                            $movementType = 'deposit';
                        } else {
                            $movementType = 'other';
                        }

                        // amount_signed debe ser negativo para salidas
                        $amountSigned = ($movementType === 'withdrawal' || $movementType === 'tip_payment')
                            ? -abs($importe)
                            : abs($importe);
                        
                        $data[] = [
                            'movement_id'       => (string)($m['folio'] ?? '0') . '_' . $fechaObj->format('YmdHis'),
                            'folio_movto'       => (string)($m['foliomovto'] ?? ''),
                            'movement_type'     => $movementType,
                            'tipo_original'     => $tipo,
                            'amount'            => abs($importe),
                            'amount_signed'     => $amountSigned,
                            'movement_date'     => $fechaObj->format('Y-m-d'),
                            'movement_time'     => $fechaObj->format('H:i:s'),
                            'movement_datetime' => $fechaObj->format('Y-m-d H:i:s'),
                            'shift_id'          => (string)($m['idturno'] ?? ''),
                            'concept'           => (string)($m['concepto'] ?? ''),
                            'reference'         => (string)($m['referencia'] ?? ''),
                            'user_cancel'       => (string)($m['usuariocancelo'] ?? ''),
                            'is_tip_payment'    => $isTipPayment,
                            'company_id'        => (string)($m['idempresa'] ?? '1')
                        ];
                        
                        if ($m['fecha'] > $lastMovementDate) {
                            $lastMovementDate = $m['fecha'];
                        }
                    }
                    
                    $this->sendToAPI('cash_movements', $data);
                    $this->log("[CAJA] " . count($data) . " movimientos enviados.");
                    $this->lastSync['cash_movements'] = $lastMovementDate;
                }
            } catch (Exception $e) { 
                $this->log("[CAJA] Error: " . $e->getMessage()); 
            }
        }

        private function syncAttendance() {
            if ($this->isInitialLoad) return;
            try {
                $sql = "SELECT r.idempleado, r.entrada, r.salida
                        FROM registroasistencias r
                        WHERE CAST(r.entrada AS DATE) = CAST(GETDATE() AS DATE)";
                $stmt = $this->conn->query($sql);
                $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $data = [];

                foreach ($attendance as $a) {
                    $clockIn = null;
                    $clockOut = null;
                    $date = date('Y-m-d');
                    $minutesWorked = 0;

                    if (!empty($a['entrada'])) {
                        try {
                            $inDT = new DateTime($a['entrada']);
                            $clockIn = $inDT->format('Y-m-d H:i:s');
                            $date = $inDT->format('Y-m-d');
                        } catch (Exception $e) {
                            $clockIn = null;
                        }
                    }

                    if (!empty($a['salida'])) {
                        try {
                            $outDT = new DateTime($a['salida']);
                            if ($outDT->format('Y') !== '1900') {
                                $clockOut = $outDT->format('Y-m-d H:i:s');
                            }
                        } catch (Exception $e) {
                            $clockOut = null;
                        }
                    }

                    if ($clockIn && $clockOut) {
                        try {
                            $diff = (new DateTime($clockOut))->getTimestamp() - (new DateTime($clockIn))->getTimestamp();
                            $minutesWorked = max(0, intval($diff / 60));
                        } catch (Exception $e) {
                            $minutesWorked = 0;
                        }
                    }

                    $status = 'present';
                    if (!$clockIn) $status = 'absent';
                    elseif ($clockOut) $status = 'left';

                    $data[] = [
                        'employee_id'    => (string)($a['idempleado'] ?? ''),
                        'employee_name'  => 'Empleado ' . (string)($a['idempleado'] ?? ''),
                        'position'       => '',
                        'date'           => $date,
                        'clock_in'       => $clockIn,
                        'clock_out'      => $clockOut,
                        'shift'          => 'regular',
                        'status'         => $status,
                        'minutes_worked' => $minutesWorked,
                        'notes'          => ''
                    ];
                }

                if ($this->hasChanges('attendance', $data)) {
                    $this->sendToAPI('attendance', $data);
                    $this->log("[ASISTENCIAS] " . count($data) . " registros enviados");
                }
            } catch (Exception $e) { }
        }

        private function hasChanges($module, $data) {
            $hash = md5(json_encode($data));
            if (($this->lastSync[$module . '_hash'] ?? '') !== $hash) {
                $this->lastSync[$module . '_hash'] = $hash;
                return true;
            }
            return false;
        }

        private function sendToAPI($module, $data) {
            $payload = json_encode(['module' => $module, 'data' => $data, 'sync_datetime' => date('Y-m-d H:i:s')]);
            $ch = curl_init(API_URL);
            curl_setopt_array($ch, [
                CURLOPT_POST => true,
                CURLOPT_POSTFIELDS => $payload,
                CURLOPT_RETURNTRANSFER => true,
                CURLOPT_HTTPHEADER => ['Content-Type: application/json', 'X-API-Key: ' . API_KEY],
                CURLOPT_TIMEOUT => 60,
                CURLOPT_SSL_VERIFYPEER => false,
                CURLOPT_SSL_VERIFYHOST => false
            ]);
            
            $res = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            $curlError = curl_error($ch);
            
            if ($curlError) {
                $this->log("✗ Error cURL: $curlError");
                return null;
            }
            
            if ($httpCode !== 200) {
                $this->log("✗ HTTP Error $httpCode: $res");
                return null;
            }
            
            $result = json_decode($res, true);
            if (!$result || !isset($result['success'])) {
                $this->log("✗ Respuesta inválida de API: $res");
                return null;
            }
            
            return $res;
        }

        private function loadState() {
            if (file_exists(STATE_FILE)) $this->lastSync = json_decode(file_get_contents(STATE_FILE), true) ?? [];
        }
        private function saveState() {
            file_put_contents(STATE_FILE, json_encode($this->lastSync));
        }
        private function log($m) {
            echo "[" . date('H:i:s') . "] $m\n";
        }
    }

    $sync = new SmartSyncSR();
    $sync->run();
