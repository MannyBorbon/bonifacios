<?php
/**
 * ============================================================
 *  BONIFACIOS - Sincronización EN TIEMPO REAL SoftRestaurant
 * ============================================================
 *  Se ejecuta continuamente cada 30 segundos
 *  Solo sincroniza datos NUEVOS o MODIFICADOS
 *  Optimizado para mínimo uso de recursos
 * 
 *  EJECUTAR: php sync-realtime.php
 *  Se mantiene corriendo indefinidamente
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
define('STATE_FILE', __DIR__ . '/sync-state.json'); // Guarda último timestamp sincronizado
// ────────────────────────────────────────────────────────────

class RealtimeSync {
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
            $dsn = "sqlsrv:Server=" . SR_SERVER . ";Database=" . SR_DATABASE;
            $this->conn = new PDO($dsn, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => 5 // Timeout corto para respuesta rápida
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
                // Sincronizar solo datos modificados recientemente
                $this->syncRecentSales();
                $this->syncRecentReservations();
                $this->syncRecentCashMovements();
                $this->syncTableStatus(); // Estado de mesas en tiempo real
                
                $this->saveState();
            }
            
            $elapsed = microtime(true) - $startTime;
            $this->log(sprintf("Ciclo completado en %.2f segundos\n", $elapsed));
            
            // Esperar hasta completar el intervalo
            $sleepTime = max(0, SYNC_INTERVAL - $elapsed);
            if ($sleepTime > 0) {
                sleep($sleepTime);
            }
        }
    }
    
    // ── VENTAS RECIENTES (últimos 5 minutos) ──────────────────
    private function syncRecentSales() {
        try {
            $lastSync = $this->lastSync['sales'] ?? date('Y-m-d H:i:s', strtotime('-5 minutes'));
            
            $sql = "SELECT 
                        c.Folio,
                        c.NumCheque,
                        c.FechaCierre,
                        c.NumMesa,
                        c.Mesero,
                        c.NumPersonas,
                        c.SubTotal,
                        c.Impuesto,
                        c.Descuento,
                        c.Propina,
                        c.Total,
                        c.Status,
                        c.FechaApertura,
                        c.FechaModificacion
                    FROM Cheques c
                    WHERE c.Status = 2
                      AND c.FechaModificacion > ?
                    ORDER BY c.FechaModificacion DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($sales) > 0) {
                $data = [];
                foreach ($sales as $s) {
                    $paymentType = $this->getPaymentType($s['Folio']);
                    $items = $this->getSaleItems($s['Folio']);
                    
                    $data[] = [
                        'sr_ticket_id' => (string)$s['Folio'],
                        'ticket_number' => (string)$s['NumCheque'],
                        'sale_date' => date('Y-m-d', strtotime($s['FechaCierre'])),
                        'sale_datetime' => date('Y-m-d H:i:s', strtotime($s['FechaCierre'])),
                        'table_id' => $s['NumMesa'],
                        'waiter_id' => $s['Mesero'],
                        'covers' => intval($s['NumPersonas'] ?? 1),
                        'subtotal' => floatval($s['SubTotal']),
                        'tax' => floatval($s['Impuesto']),
                        'discount' => floatval($s['Descuento']),
                        'tip' => floatval($s['Propina']),
                        'total' => floatval($s['Total']),
                        'status' => 'closed',
                        'payment_type' => $paymentType,
                        'opened_at' => $s['FechaApertura'],
                        'closed_at' => $s['FechaCierre'],
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
    
    // ── RESERVACIONES RECIENTES ───────────────────────────────
    private function syncRecentReservations() {
        try {
            $lastSync = $this->lastSync['reservations'] ?? date('Y-m-d H:i:s', strtotime('-5 minutes'));
            
            $sql = "SELECT 
                        r.IdReservacion,
                        r.NombreCliente,
                        r.Telefono,
                        r.Email,
                        r.FechaReservacion,
                        r.HoraReservacion,
                        r.NumPersonas,
                        r.IdMesa,
                        r.Estado,
                        r.Notas,
                        r.FechaModificacion
                    FROM Reservaciones r
                    WHERE r.FechaModificacion > ?
                       OR (r.FechaReservacion >= CAST(GETDATE() AS DATE) 
                           AND r.FechaModificacion IS NULL)
                    ORDER BY r.FechaModificacion DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($reservations) > 0) {
                $data = [];
                foreach ($reservations as $r) {
                    $status = match($r['Estado'] ?? 0) {
                        0 => 'pending',
                        1 => 'confirmed',
                        2 => 'seated',
                        3 => 'completed',
                        4 => 'cancelled',
                        5 => 'no_show',
                        default => 'pending'
                    };
                    
                    $data[] = [
                        'sr_reservation_id' => (string)$r['IdReservacion'],
                        'customer_name' => $r['NombreCliente'],
                        'customer_phone' => $r['Telefono'],
                        'customer_email' => $r['Email'],
                        'reservation_date' => date('Y-m-d', strtotime($r['FechaReservacion'])),
                        'reservation_time' => date('H:i:s', strtotime($r['HoraReservacion'])),
                        'party_size' => intval($r['NumPersonas']),
                        'table_id' => $r['IdMesa'],
                        'status' => $status,
                        'notes' => $r['Notas']
                    ];
                }
                
                $result = $this->sendToAPI('reservations', $data);
                $this->log("[RESERVACIONES] " . count($data) . " actualizadas");
                $this->lastSync['reservations'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[RESERVACIONES] Error: " . $e->getMessage());
        }
    }
    
    // ── MOVIMIENTOS DE CAJA RECIENTES ─────────────────────────
    private function syncRecentCashMovements() {
        try {
            $lastSync = $this->lastSync['cash'] ?? date('Y-m-d H:i:s', strtotime('-5 minutes'));
            
            $sql = "SELECT 
                        m.IdMovimiento,
                        m.Fecha,
                        m.TipoMovimiento,
                        m.Monto,
                        m.Descripcion,
                        m.IdUsuario,
                        m.Referencia
                    FROM MovimientosCaja m
                    WHERE m.Fecha > ?
                    ORDER BY m.Fecha DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$lastSync]);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            if (count($movements) > 0) {
                $data = [];
                foreach ($movements as $m) {
                    $type = match(intval($m['TipoMovimiento'])) {
                        1 => 'opening',
                        2 => 'closing',
                        3 => 'deposit',
                        4 => 'withdrawal',
                        5 => 'expense',
                        default => 'adjustment'
                    };
                    
                    $data[] = [
                        'sr_movement_id' => (string)$m['IdMovimiento'],
                        'movement_date' => date('Y-m-d', strtotime($m['Fecha'])),
                        'movement_datetime' => date('Y-m-d H:i:s', strtotime($m['Fecha'])),
                        'movement_type' => $type,
                        'amount' => floatval($m['Monto']),
                        'description' => $m['Descripcion'],
                        'user_id' => $m['IdUsuario'],
                        'reference' => $m['Referencia']
                    ];
                }
                
                $result = $this->sendToAPI('cash_movements', $data);
                $this->log("[CAJA] " . count($data) . " movimientos nuevos");
                $this->lastSync['cash'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[CAJA] Error: " . $e->getMessage());
        }
    }
    
    // ── ESTADO DE MESAS EN TIEMPO REAL ────────────────────────
    private function syncTableStatus() {
        try {
            $sql = "SELECT 
                        m.IdMesa,
                        m.NumMesa,
                        m.Nombre,
                        m.Area,
                        m.Capacidad,
                        m.Estado,
                        c.Folio as ChequeActivo,
                        c.NumPersonas as PersonasActuales,
                        c.FechaApertura as HoraApertura
                    FROM Mesas m
                    LEFT JOIN Cheques c ON m.NumMesa = c.NumMesa AND c.Status = 1
                    WHERE m.Activa = 1";
            
            $stmt = $this->conn->query($sql);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($tables as $t) {
                // Determinar estado real de la mesa
                $status = 'available';
                if ($t['ChequeActivo']) {
                    $status = 'occupied';
                } elseif ($t['Estado'] == 2) {
                    $status = 'reserved';
                }
                
                $data[] = [
                    'sr_table_id' => (string)$t['IdMesa'],
                    'table_number' => (string)$t['NumMesa'],
                    'table_name' => $t['Nombre'],
                    'area' => $t['Area'],
                    'capacity' => intval($t['Capacidad'] ?? 4),
                    'status' => $status,
                    'current_check' => $t['ChequeActivo'],
                    'current_covers' => intval($t['PersonasActuales'] ?? 0),
                    'occupied_since' => $t['HoraApertura']
                ];
            }
            
            // Solo enviar si hay cambios
            if ($this->hasChanges('tables', $data)) {
                $result = $this->sendToAPI('tables', $data);
                $this->log("[MESAS] Estado actualizado");
                $this->lastSync['tables'] = date('Y-m-d H:i:s');
            }
            
        } catch (Exception $e) {
            $this->log("[MESAS] Error: " . $e->getMessage());
        }
    }
    
    // ── FUNCIONES AUXILIARES ──────────────────────────────────
    
    private function getPaymentType($folio) {
        try {
            $sql = "SELECT TipoFormaPago FROM ChequeFormasPago WHERE Folio = ? LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$folio]);
            $result = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$result) return 'cash';
            
            return match(intval($result['TipoFormaPago'])) {
                1 => 'cash',
                2 => 'card',
                3 => 'transfer',
                default => 'other'
            };
        } catch (Exception $e) {
            return 'cash';
        }
    }
    
    private function getSaleItems($folio) {
        try {
            $sql = "SELECT 
                        IdProducto,
                        Nombre,
                        Cantidad,
                        Precio,
                        Descuento,
                        Importe
                    FROM ChequeConceptos
                    WHERE Folio = ?";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$folio]);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $result = [];
            foreach ($items as $item) {
                $result[] = [
                    'product_id' => $item['IdProducto'],
                    'product_name' => $item['Nombre'],
                    'quantity' => floatval($item['Cantidad']),
                    'unit_price' => floatval($item['Precio']),
                    'discount' => floatval($item['Descuento'] ?? 0),
                    'subtotal' => floatval($item['Importe'])
                ];
            }
            
            return $result;
        } catch (Exception $e) {
            return [];
        }
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
            CURLOPT_SSL_VERIFYPEER => true
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
declare(ticks = 1);
pcntl_signal(SIGINT, function() {
    echo "\n\n[" . date('Y-m-d H:i:s') . "] Deteniendo sincronización...\n";
    exit(0);
});

// ── EJECUTAR ───────────────────────────────────────────────
$sync = new RealtimeSync();
$sync->runContinuously();
