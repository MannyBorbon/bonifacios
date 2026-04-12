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
            // Usamos formato YYYYMMDD para evitar errores de idioma en SQL Server
            $lastSync = $this->lastSync['sales'] ?? '20100101 00:00:00';
            
            $this->log("[VENTAS] Buscando tickets desde: $lastSync...");

            // Durante carga inicial: solo tickets cerrados en lotes de 1000
            // Después: tickets abiertos + nuevos cerrados desde última sync
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
            } else {
                $sql = "SELECT TOP 1000 
                            folio, fecha,
                            total, subtotal, totalimpuesto1 as impuesto, propina, 
                            descuentoimporte as descuento, 
                            idmesero, mesa, nopersonas, pagado,
                            efectivo, tarjeta, vales, otros
                        FROM cheques 
                        WHERE pagado = 0
                           OR fecha > CONVERT(DATETIME, ?, 120)
                        ORDER BY fecha ASC";
            }
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
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
                    
                    $paymentType = 'cash'; // Por defecto
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
                    
                    // Determinar estado del ticket
                    $isPaid = intval($s['pagado']) === 1;
                    $status = $isPaid ? 'closed' : 'open';
                    
                    $data[] = [
                        // CAMPOS REQUERIDOS POR sync.php
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
                    
                    // Solo avanzar lastSync para tickets CERRADOS
                    if ($isPaid && $s['fecha'] > $lastClosedDate) {
                        $lastClosedDate = $s['fecha'];
                    }
                }
                
                $this->sendToAPI('sales', $data);
                
                $openCount = count(array_filter($data, fn($d) => $d['status'] === 'open'));
                $closedCount = count($data) - $openCount;
                $this->log("[VENTAS] ¡ÉXITO! " . count($data) . " tickets enviados ($closedCount cerrados, $openCount abiertos).");
                
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

    private function syncAttendance() {
        if ($this->isInitialLoad) return;
        try {
            $sql = "SELECT idempleado, entrada, salida FROM registroasistencias WHERE CAST(entrada AS DATE) = CAST(GETDATE() AS DATE)";
            $stmt = $this->conn->query($sql);
            $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $data = [];
            foreach ($attendance as $a) {
                $data[] = ['employee_id' => $a['idempleado'], 'clock_in' => $a['entrada'], 'status' => is_null($a['salida']) ? 'present' : 'left'];
            }
            if ($this->hasChanges('attendance', $data)) {
                $this->sendToAPI('attendance', $data);
                $this->log("[ASISTENCIAS] Personal actualizado");
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
