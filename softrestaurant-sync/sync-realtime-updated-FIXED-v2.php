<?php
/**
 * ============================================================
 * BONIFACIOS - Sincronización PROFUNDA UNIVERSAL (SR 8.0)
 * ============================================================
 * FIXED v2: Incluye tickets de hoy desde tempcheques
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

class SmartSyncSR {
    private $conn;
    private $lastSync = [];
    private $isInitialLoad = true;
    
    public function __construct() {
        $this->loadState();
        $this->log("=== Iniciando Sincronización Universal Bonifacio's v2 ===");
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
                $this->saveState();
                $this->conn = null;
            }
            
            $elapsed = microtime(true) - $startTime;
            
            if ($this->isInitialLoad) {
                continue; 
            }

            $sleepTime = SYNC_INTERVAL - $elapsed;
            if ($sleepTime > 0) sleep((int)$sleepTime);
        }
    }

    private function syncSales() {
        try {
            $lastSync = $this->lastSync['sales'] ?? '20100101 00:00:00';
            $this->log("[VENTAS] Buscando tickets desde: $lastSync...");

            // Durante carga inicial: solo tickets cerrados en lotes de 1000
            if ($this->isInitialLoad) {
                $sql = "SELECT TOP 1000 
                            folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE pagado = 1
                          AND fecha > CONVERT(DATETIME, ?, 120)
                        ORDER BY fecha ASC";
                
                $stmt = $this->conn->prepare($sql);
                $stmt->execute([$lastSync]);
                $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            } else {
                // Modo tiempo real: tickets de cheques + tickets de tempcheques (hoy)
                
                // 1. Tickets de cheques (abiertos históricos + nuevos cerrados)
                $sql1 = "SELECT folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE pagado = 0
                           OR fecha > CONVERT(DATETIME, ?, 120)
                        ORDER BY fecha ASC";
                
                $stmt1 = $this->conn->prepare($sql1);
                $stmt1->execute([$lastSync]);
                $salesCheques = $stmt1->fetchAll(PDO::FETCH_ASSOC);
                
                // 2. Tickets de tempcheques (cuentas vivas de hoy) - excluir los que ya están en cheques
                $sql2 = "SELECT t.folio, t.fecha,
                            t.total, t.subtotal, t.totalimpuesto1 as impuesto, t.propina, 
                            t.descuentoimporte as descuento, 
                            t.idmesero, t.mesa, t.nopersonas, 0 as pagado,
                            0 as efectivo, 0 as tarjeta, 0 as vales, 0 as otros
                        FROM tempcheques t
                        WHERE CAST(t.fecha AS DATE) = CAST(GETDATE() AS DATE)
                          AND NOT EXISTS (
                              SELECT 1 FROM cheques c 
                              WHERE c.folio = t.folio 
                                AND c.pagado = 0
                          )";
                
                $stmt2 = $this->conn->query($sql2);
                $salesTemp = $stmt2->fetchAll(PDO::FETCH_ASSOC);
                
                // Combinar ambos resultados
                $sales = array_merge($salesCheques, $salesTemp);
                
                $this->log("[VENTAS] Encontrados: " . count($salesCheques) . " de cheques + " . count($salesTemp) . " de tempcheques (hoy)");
            }
            
            $this->log("[VENTAS] Query encontró " . count($sales) . " tickets.");
            
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
                        'opened_at' => $saleDatetime,
                        'closed_at' => $isPaid ? $saleDatetime : null,
                        'items' => []
                    ];
                    
                    if ($isPaid && $s['fecha'] > $lastClosedDate) {
                        $lastClosedDate = $s['fecha'];
                    }
                }
                
                $this->sendToAPI('sales', $data);
                
                $openCount = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                $closedCount = count($data) - $openCount;
                $this->log("[VENTAS] ¡ÉXITO! " . count($data) . " tickets enviados ($closedCount cerrados, $openCount abiertos).");
                
                $this->lastSync['sales'] = $lastClosedDate;
                
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
        } catch (Exception $e) { 
            $this->log("[VENTAS] Error: " . $e->getMessage()); 
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
            $this->log("API Response: inserted={$result['inserted']}, updated={$result['updated']}, failed={$result['failed']}");
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
