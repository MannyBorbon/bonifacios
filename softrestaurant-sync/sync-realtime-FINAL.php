<?php
/**
 * ============================================================
 * BONIFACIOS - Sincronización Completa con Tickets Abiertos
 * ============================================================
 * Sincroniza TODOS los tickets (abiertos + cerrados) desde 2024
 * Incluye tickets de hoy en tiempo real desde tempcheques
 * ============================================================
 */

define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

define('SR_SERVER', '100.84.227.35\NATIONALSOFT');
define('SR_DATABASE', 'softrestaurant8pro');
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

define('SYNC_INTERVAL', 10); 
define('STATE_FILE', __DIR__ . '/sync-state.json');
define('START_DATE', '2024-01-01 00:00:00'); // Fecha desde donde cargar datos

class CompleteSyncSR {
    private $conn;
    private $lastSync = [];
    private $isInitialLoad = true;
    
    public function __construct() {
        $this->loadState();
        $this->log("=== Sincronización Completa Bonifacio's (desde 2024) ===");
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
                $this->syncCashMovements();
                $this->syncCancellations();
                $this->saveState();
                $this->conn = null;
            }
            
            $elapsed = microtime(true) - $startTime;
            
            // Durante carga inicial, no esperar - cargar continuamente
            if ($this->isInitialLoad) {
                continue; 
            }

            $sleepTime = SYNC_INTERVAL - $elapsed;
            if ($sleepTime > 0) sleep((int)$sleepTime);
        }
    }

    private function syncSales() {
        try {
            $lastSync = $this->lastSync['sales'] ?? START_DATE;
            $this->log("[VENTAS] Buscando tickets desde: $lastSync...");

            if ($this->isInitialLoad) {
                // CARGA INICIAL: Tickets cerrados + abiertos históricos en lotes de 1000
                $sql = "SELECT TOP 1000 
                            folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE fecha > CONVERT(DATETIME, ?, 120)
                        ORDER BY fecha ASC";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$lastSync]);
                $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                $this->log("[CARGA INICIAL] Encontrados: " . count($sales) . " tickets de cheques");
                
            } else {
                // MODO TIEMPO REAL: Nuevos cerrados + todos los abiertos + tempcheques de hoy
                
                // 1. Tickets de cheques (nuevos cerrados desde última sync)
                $sql1 = "SELECT folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE pagado = 1
                          AND fecha > CONVERT(DATETIME, ?, 120)
                        ORDER BY fecha ASC";
                
                $stmt1 = $this->conn->prepare($sql1);
                $stmt1->execute([$lastSync]);
                $salesClosed = $stmt1->fetchAll(PDO::FETCH_ASSOC);
                
                // 2. Todos los tickets abiertos de cheques (para actualizar totales)
                $sql2 = "SELECT folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE pagado = 0";
                
                $stmt2 = $this->conn->query($sql2);
                $salesOpen = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                
                // 3. Tickets de tempcheques (solo los que NO están en cheques)
                $sql3 = "SELECT t.folio, t.fecha,
                            t.total, t.subtotal, t.totalimpuesto1 as impuesto, t.propina, 
                            t.descuentoimporte as descuento, 
                            t.idmesero, t.mesa, t.nopersonas, 0 as pagado,
                            0 as efectivo, 0 as tarjeta, 0 as vales, 0 as otros
                        FROM tempcheques t
                        WHERE CAST(t.fecha AS DATE) = CAST(GETDATE() AS DATE)
                          AND NOT EXISTS (
                              SELECT 1 FROM cheques c 
                              WHERE c.folio = t.folio
                          )";
                
                $stmt3 = $this->conn->query($sql3);
                $salesTemp = $stmt3->fetchAll(PDO::FETCH_ASSOC);
                
                // Combinar todos los resultados
                $sales = array_merge($salesClosed, $salesOpen, $salesTemp);
                
                $this->log("[TIEMPO REAL] Encontrados: " . count($salesClosed) . " cerrados nuevos + " . 
                          count($salesOpen) . " abiertos + " . count($salesTemp) . " de tempcheques");
            }
            
            if (count($sales) > 0) {
                $data = [];
                $lastClosedDate = $lastSync;
                
                foreach ($sales as $s) {
                    $fechaObj = new DateTime($s['fecha']);
                    $saleDate = $fechaObj->format('Y-m-d');
                    $saleDatetime = $fechaObj->format('Y-m-d H:i:s');
                    
                    $efectivo = floatval($s['efectivo'] ?? 0);
                    $tarjeta = floatval($s['tarjeta'] ?? 0);
                    $vales = floatval($s['vales'] ?? 0);
                    $otros = floatval($s['otros'] ?? 0);
                    
                    // Determinar método de pago principal (para compatibilidad)
                    $paymentType = 'cash';
                    $maxAmount = $efectivo;
                    
                    if ($tarjeta > $maxAmount) {
                        $paymentType = 'card';
                        $maxAmount = $tarjeta;
                    }
                    if ($otros > $maxAmount) {
                        $paymentType = 'transfer';
                        $maxAmount = $otros;
                    }
                    if ($vales > $maxAmount) {
                        $paymentType = 'voucher';
                    }
                    
                    $isPaid = intval($s['pagado']) === 1;
                    $status = $isPaid ? 'closed' : 'open';
                    
                    $data[] = [
                        'sr_ticket_id' => (string)$s['folio'],
                        'ticket_number' => (string)$s['folio'],
                        'folio' => (string)$s['folio'],
                        'sale_date' => $saleDate,
                        'sale_time' => $fechaObj->format('H:i:s'),
                        'sale_datetime' => $saleDatetime,
                        'total' => floatval($s['total']),
                        'subtotal' => floatval($s['subtotal']),
                        'tax' => floatval($s['impuesto']),
                        'tip' => floatval($s['propina']),
                        'discount' => floatval($s['descuento']),
                        'waiter_id' => (string)$s['idmesero'],
                        'waiter_name' => '',
                        'table_id' => '',
                        'table_number' => (string)$s['mesa'],
                        'covers' => intval($s['nopersonas']),
                        'status' => $status,
                        'payment_type' => $isPaid ? $paymentType : 'pending',
                        'cash_amount' => $efectivo,
                        'card_amount' => $tarjeta,
                        'voucher_amount' => $vales,
                        'other_amount' => $otros,
                        'opened_at' => $saleDatetime,
                        'closed_at' => $isPaid ? $saleDatetime : null,
                        'items' => []
                    ];
                    
                    // Solo actualizar lastSync con tickets cerrados
                    if ($isPaid && $s['fecha'] > $lastClosedDate) {
                        $lastClosedDate = $s['fecha'];
                    }
                }
                
                $this->sendToAPI('sales', $data);
                
                $openCount = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                $closedCount = count($data) - $openCount;
                $this->log("[VENTAS] ¡ÉXITO! " . count($data) . " tickets enviados ($closedCount cerrados, $openCount abiertos).");
                
                // Solo actualizar lastSync con la fecha del último ticket cerrado
                $this->lastSync['sales'] = $lastClosedDate;
                
                // Verificar si terminó la carga inicial
                if ($this->isInitialLoad && count($sales) < 1000) {
                    $this->isInitialLoad = false;
                    $this->log("[VENTAS] ✅ Historial completo cargado. Iniciando modo tiempo real.");
                }
            } else {
                if ($this->isInitialLoad) {
                    $this->log("[VENTAS] ✅ Historial completo cargado.");
                }
                $this->isInitialLoad = false;
            }
        } catch (Exception $e) { 
            $this->log("[VENTAS] Error: " . $e->getMessage()); 
        }
    }

    private function syncCashMovements() {
        try {
            $lastSync = $this->lastSync['cash_movements'] ?? '2024-01-01 00:00:00';
            
            $this->log("[MOVIMIENTOS CAJA] Sincronizando desde: $lastSync");
            
            // Obtener movimientos de caja desde la última sync
            $sql = "SELECT folio, foliomovto, tipo, idturno, concepto, referencia, 
                           importe, fecha, cancelado, usuariocancelo, pagodepropina, idempresa
                    FROM movtoscaja 
                    WHERE fecha > CONVERT(DATETIME, ?, 120)
                      AND cancelado = 0
                    ORDER BY fecha ASC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $this->log("[MOVIMIENTOS CAJA] Encontrados: " . count($movements) . " movimientos");
            
            if (count($movements) > 0) {
                $data = [];
                $lastMovementDate = $lastSync;
                
                foreach ($movements as $m) {
                    $fechaObj = new DateTime($m['fecha']);
                    $movementDate = $fechaObj->format('Y-m-d');
                    $movementDatetime = $fechaObj->format('Y-m-d H:i:s');
                    
                    $importe = floatval($m['importe']);
                    $tipo = intval($m['tipo']);
                    $isPropinaPago = intval($m['pagodepropina']) === 1;
                    
                    // Determinar tipo de movimiento usando campo 'tipo' de SoftRestaurant:
                    // tipo=1 = DEPOSITO (dinero entra a caja)
                    // tipo=2 = RETIRO  (dinero sale de caja, incluye "CAJA PAGA")
                    $movementType = 'other';
                    if ($isPropinaPago) {
                        $movementType = 'tip_payment';
                    } elseif ($tipo === 1) {
                        $movementType = 'withdrawal'; // Retiro/salida de caja
                    } elseif ($tipo === 2) {
                        $movementType = 'deposit'; // Deposito/entrada a caja
                    }

                    // amount_signed: negativo para salidas, positivo para entradas
                    $amountSigned = ($movementType === 'withdrawal' || $movementType === 'tip_payment')
                        ? -abs($importe)
                        : abs($importe);
                    
                    $data[] = [
                        'movement_id' => (string)$m['folio'],
                        'folio_movto' => (string)($m['foliomovto'] ?? ''),
                        'movement_type' => $movementType,
                        'tipo_original' => $tipo,
                        'amount' => abs($importe),
                        'amount_signed' => $amountSigned,
                        'movement_date' => $movementDate,
                        'movement_time' => $fechaObj->format('H:i:s'),
                        'movement_datetime' => $movementDatetime,
                        'shift_id' => (string)($m['idturno'] ?? ''),
                        'concept' => $m['concepto'] ?? '',
                        'reference' => $m['referencia'] ?? '',
                        'user_cancel' => $m['usuariocancelo'] ?? '',
                        'is_tip_payment' => $isPropinaPago,
                        'company_id' => (string)($m['idempresa'] ?? '')
                    ];
                    
                    if ($m['fecha'] > $lastMovementDate) {
                        $lastMovementDate = $m['fecha'];
                    }
                }
                
                $this->sendToAPI('cash_movements', $data);
                
                $this->log("[MOVIMIENTOS CAJA] ¡ÉXITO! " . count($data) . " movimientos enviados.");
                
                $this->lastSync['cash_movements'] = $lastMovementDate;
            }
            
        } catch (Exception $e) {
            $this->log("[MOVIMIENTOS CAJA] ERROR: " . $e->getMessage());
        }
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
            // Tabla puede no existir
        }
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
        curl_close($ch);
        
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
        
        // Log API response details
        if (isset($result['inserted']) || isset($result['updated']) || isset($result['failed'])) {
            $this->log("   ↳ API: inserted={$result['inserted']}, updated={$result['updated']}, failed={$result['failed']}");
        }
        
        return $res;
    }

    private function loadState() {
        if (file_exists(STATE_FILE)) {
            $this->lastSync = json_decode(file_get_contents(STATE_FILE), true) ?? [];
        }
    }
    
    private function saveState() {
        file_put_contents(STATE_FILE, json_encode($this->lastSync));
    }
    
    private function log($m) {
        echo "[" . date('H:i:s') . "] $m\n";
    }
}

$sync = new CompleteSyncSR();
$sync->run();
