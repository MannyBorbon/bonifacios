<?php
/**
 * ============================================================
 *  BONIFACIOS - Sincronización EN TIEMPO REAL SoftRestaurant
 * ============================================================
 *  Actualizado con tablas REALES de SoftRestaurant 8.0
 *  Tablas: cheques, cheqdet, productos, mesas, usuarios, 
 *          meseros, registroasistencias
 * ============================================================
 */

// ── CONFIGURACIÓN ──────────────────────────────────────────
define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

// Conexión a SQL Server de SoftRestaurant 8.0
define('SR_SERVER', '100.84.227.35\NATIONALSOFT');
define('SR_DATABASE', 'softrestaurant8pro');
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

// Configuración de tiempo real
define('SYNC_INTERVAL', 30); // Segundos entre sincronizaciones
define('LOG_FILE', __DIR__ . '/sync-realtime.log');
define('STATE_FILE', __DIR__ . '/sync-state.json');
// ────────────────────────────────────────────────────────────

class RealtimeSyncSR {
    private $conn;
    private $apiUrl;
    private $apiKey;
    private $lastSync = [];
    
    public function __construct() {
        $this->apiUrl = API_URL;
        $this->apiKey = API_KEY;
        $this->loadState();
        $this->log("=== Sincronización en tiempo real iniciada ===");
    }
    
    public function connect() {
        try {
            $dsn = "sqlsrv:Server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=false;TrustServerCertificate=true";
            $this->conn = new PDO($dsn, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5
            ]);
            return true;
        } catch (Exception $e) {
            $this->log("✗ Error de conexión: " . $e->getMessage());
            return false;
        }
    }
    
    public function runContinuously() {
        $this->log("Modo continuo activado. Sincronizando cada " . SYNC_INTERVAL . " segundos");
        $this->log("Presiona Ctrl+C para detener\n");
        
        while (true) {
            $startTime = microtime(true);
            
            if ($this->connect()) {
                // Sincronizar datos en tiempo real
                $this->syncRecentSales();
                $this->syncTableStatus();
                $this->syncActiveAttendance();
                
                $this->saveState();
            }
            
            $elapsed = microtime(true) - $startTime;
            $this->log(sprintf("Ciclo completado en %.2f segundos\n", $elapsed));
            
            $sleepTime = max(0, SYNC_INTERVAL - $elapsed);
            if ($sleepTime > 0) {
                sleep($sleepTime);
            }
        }
    }
    
    // ── VENTAS RECIENTES (tabla: cheques) ─────────────────────
    private function syncRecentSales() {
        try {
            $lastSync = $this->lastSync['sales'] ?? date('Y-m-d H:i:s', strtotime('-5 minutes'));
            
            $sql = "SELECT 
                        c.idcheque,
                        c.folio,
                        c.fecha,
                        c.hora,
                        c.total,
                        c.subtotal,
                        c.impuesto,
                        c.propina,
                        c.descuento,
                        c.idmesero,
                        c.idmesa,
                        c.numpersonas,
                        c.estatus,
                        c.formapago,
                        m.nombre as mesero_nombre,
                        ms.numero as mesa_numero
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    LEFT JOIN mesas ms ON c.idmesa = ms.idmesa
                    WHERE c.estatus = 1
                      AND CONVERT(DATETIME, CONVERT(VARCHAR, c.fecha, 120) + ' ' + CONVERT(VARCHAR, c.hora, 108)) > ?
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($sales) > 0) {
                $data = [];
                foreach ($sales as $s) {
                    $fechaObj = new DateTime($s['fecha']);
                    $data[] = [
                        'sr_ticket_id' => (string)$s['idcheque'],
                        'ticket_number' => (string)$s['folio'],
                        'folio' => (string)$s['folio'],
                        'sale_date' => $fechaObj->format('Y-m-d'),
                        'sale_time' => $s['hora'] ?? '00:00:00',
                        'sale_datetime' => $fechaObj->format('Y-m-d H:i:s'),
                        'total' => floatval($s['total']),
                        'subtotal' => floatval($s['subtotal']),
                        'tax' => floatval($s['impuesto']),
                        'tip' => floatval($s['propina']),
                        'discount' => floatval($s['descuento']),
                        'waiter_id' => (string)$s['idmesero'],
                        'waiter_name' => '',
                        'table_id' => (string)$s['idmesa'],
                        'table_number' => (string)$s['mesa'],
                        'covers' => intval($s['nopersonas']),
                        'status' => 'closed',
                        'payment_type' => 'cash',
                        'opened_at' => null,
                        'closed_at' => $fechaObj->format('Y-m-d H:i:s'),
                        'items' => []
                        'items' => $items
                    ];
                }
                
                $result = $this->sendToAPI('sales', $data);
                $this->log("[VENTAS] " . count($data) . " nuevas ventas sincronizadas");
                $this->lastSync['sales'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[VENTAS] Error: " . $e->getMessage());
        }
    }
    
    // ── DETALLE DE PRODUCTOS (tabla: cheqdet) ─────────────────
    private function getSaleItems($idcheque) {
        try {
            $sql = "SELECT 
                        cd.idproducto,
                        cd.cantidad,
                        cd.precio,
                        cd.importe,
                        cd.descuento,
                        cd.modificadores,
                        p.descripcion as producto_nombre
                    FROM cheqdet cd
                    LEFT JOIN productos p ON cd.idproducto = p.idproducto
                    WHERE cd.idcheque = ?";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$idcheque]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($items as $item) {
                $result[] = [
                    'product_id' => $item['idproducto'],
                    'product_name' => $item['producto_nombre'],
                    'quantity' => floatval($item['cantidad']),
                    'unit_price' => floatval($item['precio']),
                    'subtotal' => floatval($item['importe']),
                    'discount' => floatval($item['descuento'] ?? 0),
                    'modifiers' => $item['modificadores']
                ];
            }
            
            return $result;
        } catch (Exception $e) {
            return [];
        }
    }
    
    // ── ESTADO DE MESAS EN TIEMPO REAL (tabla: mesas) ─────────
    private function syncTableStatus() {
        try {
            $sql = "SELECT 
                        m.idmesa,
                        m.numero,
                        m.nombre,
                        m.capacidad,
                        m.estatus_ocupacion,
                        m.area,
                        m.posicion_x,
                        m.posicion_y,
                        c.idcheque,
                        c.folio,
                        c.total,
                        c.numpersonas,
                        c.hora as hora_apertura,
                        ms.nombre as mesero_nombre
                    FROM mesas m
                    LEFT JOIN cheques c ON m.idmesa = c.idmesa AND c.estatus = 0
                    LEFT JOIN meseros ms ON c.idmesero = ms.idmesero";
            
            $stmt = $this->conn->query($sql);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($tables as $t) {
                $status = $t['estatus_ocupacion'] == 1 ? 'occupied' : 'available';
                
                $data[] = [
                    'sr_table_id' => (string)$t['idmesa'],
                    'table_number' => (string)$t['numero'],
                    'table_name' => $t['nombre'],
                    'capacity' => intval($t['capacidad'] ?? 4),
                    'status' => $status,
                    'area' => $t['area'],
                    'position_x' => $t['posicion_x'],
                    'position_y' => $t['posicion_y'],
                    'current_check' => $t['idcheque'],
                    'current_folio' => $t['folio'],
                    'current_total' => floatval($t['total'] ?? 0),
                    'current_covers' => intval($t['numpersonas'] ?? 0),
                    'occupied_since' => $t['hora_apertura'],
                    'waiter_name' => $t['mesero_nombre']
                ];
            }
            
            if ($this->hasChanges('tables', $data)) {
                $result = $this->sendToAPI('tables', $data);
                $this->log("[MESAS] Estado actualizado");
                $this->lastSync['tables'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[MESAS] Error: " . $e->getMessage());
        }
    }
    
    // ── ASISTENCIAS ACTIVAS (tabla: registroasistencias) ──────
    private function syncActiveAttendance() {
        try {
            $sql = "SELECT 
                        ra.idempleado,
                        ra.entrada,
                        ra.salida,
                        ra.fecha,
                        ra.turno,
                        ra.observaciones,
                        u.nombre,
                        u.perfil as puesto
                    FROM registroasistencias ra
                    INNER JOIN usuarios u ON ra.idempleado = u.idusuario
                    WHERE CAST(ra.fecha AS DATE) = CAST(GETDATE() AS DATE)
                    ORDER BY ra.entrada DESC";
            
            $stmt = $this->conn->query($sql);
            $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($attendance as $a) {
                $status = is_null($a['salida']) ? 'present' : 'left';
                $minutes_worked = null;
                
                if (!is_null($a['salida'])) {
                    $entrada = new DateTime($a['entrada']);
                    $salida = new DateTime($a['salida']);
                    $minutes_worked = $salida->diff($entrada)->i + ($salida->diff($entrada)->h * 60);
                }
                
                $data[] = [
                    'employee_id' => (string)$a['idempleado'],
                    'employee_name' => $a['nombre'],
                    'position' => $a['puesto'],
                    'date' => date('Y-m-d', strtotime($a['fecha'])),
                    'clock_in' => $a['entrada'],
                    'clock_out' => $a['salida'],
                    'shift' => $a['turno'],
                    'status' => $status,
                    'minutes_worked' => $minutes_worked,
                    'notes' => $a['observaciones']
                ];
            }
            
            if ($this->hasChanges('attendance', $data)) {
                $result = $this->sendToAPI('attendance', $data);
                $this->log("[ASISTENCIAS] " . count($data) . " registros actualizados");
                $this->lastSync['attendance'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[ASISTENCIAS] Error: " . $e->getMessage());
        }
    }
    
    // ── FUNCIONES AUXILIARES ──────────────────────────────────
    
    private function mapPaymentType($formapago) {
        // Mapear códigos de forma de pago a nombres legibles
        $map = [
            '1' => 'cash',
            '2' => 'card',
            '3' => 'transfer',
            '4' => 'check',
            '5' => 'credit'
        ];
        return $map[$formapago] ?? 'other';
    }
    
    private function hasChanges($module, $data) {
        $hash = md5(json_encode($data));
        $lastHash = $this->lastSync[$module . '_hash'] ?? '';
        
        if ($hash !== $lastHash) {
            $this->lastSync[$module . '_hash'] = $hash;
            return true;
        }
        
        return false;
    }
    
    private function sendToAPI($module, $data) {
        $payload = json_encode([
            'module' => $module,
            'data' => $data,
            'sync_datetime' => date('Y-m-d H:i:s'),
            'realtime' => true
        ]);
        
        $ch = curl_init($this->apiUrl);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'X-API-Key: ' . $this->apiKey
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_SSL_VERIFYHOST => false
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return $httpCode === 200 ? json_decode($response, true) : null;
    }
    
    private function loadState() {
        if (file_exists(STATE_FILE)) {
            $this->lastSync = json_decode(file_get_contents(STATE_FILE), true) ?? [];
        }
    }
    
    private function saveState() {
        file_put_contents(STATE_FILE, json_encode($this->lastSync));
    }
    
    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        echo $logMessage;
        file_put_contents(LOG_FILE, $logMessage, FILE_APPEND);
    }
}

// ── MANEJO DE SEÑALES (Ctrl+C) ────────────────────────────
if (function_exists('pcntl_signal')) {
    declare(ticks = 1);
    pcntl_signal(SIGINT, function() {
        echo "\n\n[" . date('Y-m-d H:i:s') . "] Deteniendo sincronización...\n";
        exit(0);
    });
}

// ── EJECUTAR ───────────────────────────────────────────────
$sync = new RealtimeSyncSR();
$sync->runContinuously();
