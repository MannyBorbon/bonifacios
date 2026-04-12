<?php
/**
 * ============================================================
 *  BONIFACIOS - Sincronización COMPLETA SoftRestaurant 8.0
 * ============================================================
 *  Sincroniza TODOS los módulos de SoftRestaurant:
 *  - Productos y platillos
 *  - Empleados y meseros
 *  - Mesas y áreas
 *  - Reservaciones
 *  - Ventas (cheques)
 *  - Movimientos de caja
 *  - Inventario
 * 
 *  EJECUTAR: php sync-complete.php
 *  O programar en Tareas de Windows cada 15 minutos
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

// Configuración de sincronización
define('SYNC_DAYS', 7); // Días hacia atrás para sincronizar
define('LOG_FILE', __DIR__ . '/sync.log');
// ────────────────────────────────────────────────────────────

class SoftRestaurantSync {
    private $conn;
    private $apiUrl;
    private $apiKey;
    
    public function __construct() {
        $this->apiUrl = API_URL;
        $this->apiKey = API_KEY;
        $this->log("=== Iniciando sincronización completa ===");
    }
    
    public function connect() {
        try {
            $dsn = "sqlsrv:Server=" . SR_SERVER . ";Database=" . SR_DATABASE;
            $this->conn = new PDO($dsn, SR_USER, SR_PASS, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
            ]);
            $this->log("✓ Conectado a SoftRestaurant DB");
            return true;
        } catch (Exception $e) {
            $this->log("✗ Error de conexión: " . $e->getMessage());
            return false;
        }
    }
    
    public function syncAll() {
        if (!$this->connect()) {
            return false;
        }
        
        // Sincronizar en orden de dependencias
        $this->syncProducts();
        $this->syncEmployees();
        $this->syncTables();
        $this->syncReservations();
        $this->syncSales();
        $this->syncCashMovements();
        $this->syncInventory();
        
        $this->log("=== Sincronización completada ===\n");
    }
    
    // ── PRODUCTOS Y PLATILLOS ──────────────────────────────
    private function syncProducts() {
        $this->log("\n[PRODUCTOS] Sincronizando...");
        
        try {
            $sql = "SELECT 
                        p.IdProducto,
                        p.Codigo,
                        p.Nombre,
                        p.Categoria,
                        p.SubCategoria,
                        p.Descripcion,
                        p.Precio,
                        p.Costo,
                        p.Unidad,
                        p.Activo,
                        p.TiempoPreparacion,
                        p.Impresora
                    FROM Productos p
                    WHERE p.Activo = 1
                    ORDER BY p.Categoria, p.Nombre";
            
            $stmt = $this->conn->query($sql);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($products as $p) {
                $data[] = [
                    'sr_product_id' => (string)$p['IdProducto'],
                    'product_code' => $p['Codigo'],
                    'product_name' => $p['Nombre'],
                    'category' => $p['Categoria'],
                    'subcategory' => $p['SubCategoria'],
                    'description' => $p['Descripcion'],
                    'price' => floatval($p['Precio']),
                    'cost' => floatval($p['Costo'] ?? 0),
                    'unit' => $p['Unidad'] ?? 'pieza',
                    'is_active' => $p['Activo'] == 1,
                    'preparation_time' => intval($p['TiempoPreparacion'] ?? 0),
                    'printer_station' => $p['Impresora']
                ];
            }
            
            $result = $this->sendToAPI('products', $data);
            $this->log("[PRODUCTOS] " . count($data) . " productos sincronizados");
            
        } catch (Exception $e) {
            $this->log("[PRODUCTOS] Error: " . $e->getMessage());
        }
    }
    
    // ── EMPLEADOS Y MESEROS ────────────────────────────────
    private function syncEmployees() {
        $this->log("\n[EMPLEADOS] Sincronizando...");
        
        try {
            $sql = "SELECT 
                        e.IdEmpleado,
                        e.Codigo,
                        e.Nombre,
                        e.Puesto,
                        e.Departamento,
                        e.EsMesero,
                        e.Activo,
                        e.FechaIngreso,
                        e.Telefono,
                        e.Email,
                        e.PorcentajeComision
                    FROM Empleados e
                    ORDER BY e.Nombre";
            
            $stmt = $this->conn->query($sql);
            $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($employees as $e) {
                $data[] = [
                    'sr_employee_id' => (string)$e['IdEmpleado'],
                    'employee_code' => $e['Codigo'],
                    'full_name' => $e['Nombre'],
                    'position' => $e['Puesto'],
                    'department' => $e['Departamento'],
                    'is_waiter' => $e['EsMesero'] == 1,
                    'is_active' => $e['Activo'] == 1,
                    'hire_date' => $e['FechaIngreso'],
                    'phone' => $e['Telefono'],
                    'email' => $e['Email'],
                    'commission_rate' => floatval($e['PorcentajeComision'] ?? 0)
                ];
            }
            
            $result = $this->sendToAPI('employees', $data);
            $this->log("[EMPLEADOS] " . count($data) . " empleados sincronizados");
            
        } catch (Exception $e) {
            $this->log("[EMPLEADOS] Error: " . $e->getMessage());
        }
    }
    
    // ── MESAS Y ÁREAS ──────────────────────────────────────
    private function syncTables() {
        $this->log("\n[MESAS] Sincronizando...");
        
        try {
            $sql = "SELECT 
                        m.IdMesa,
                        m.NumMesa,
                        m.Nombre,
                        m.Area,
                        m.Capacidad,
                        m.PosX,
                        m.PosY,
                        m.Activa,
                        m.Estado
                    FROM Mesas m
                    ORDER BY m.Area, m.NumMesa";
            
            $stmt = $this->conn->query($sql);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($tables as $t) {
                $status = match($t['Estado'] ?? 0) {
                    0 => 'available',
                    1 => 'occupied',
                    2 => 'reserved',
                    default => 'available'
                };
                
                $data[] = [
                    'sr_table_id' => (string)$t['IdMesa'],
                    'table_number' => (string)$t['NumMesa'],
                    'table_name' => $t['Nombre'],
                    'area' => $t['Area'],
                    'capacity' => intval($t['Capacidad'] ?? 4),
                    'position_x' => intval($t['PosX'] ?? 0),
                    'position_y' => intval($t['PosY'] ?? 0),
                    'is_active' => $t['Activa'] == 1,
                    'status' => $status
                ];
            }
            
            $result = $this->sendToAPI('tables', $data);
            $this->log("[MESAS] " . count($data) . " mesas sincronizadas");
            
        } catch (Exception $e) {
            $this->log("[MESAS] Error: " . $e->getMessage());
        }
    }
    
    // ── RESERVACIONES ──────────────────────────────────────
    private function syncReservations() {
        $this->log("\n[RESERVACIONES] Sincronizando...");
        
        try {
            $cutoffDate = date('Y-m-d', strtotime('-' . SYNC_DAYS . ' days'));
            
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
                        r.Notas
                    FROM Reservaciones r
                    WHERE CAST(r.FechaReservacion AS DATE) >= :cutoff
                    ORDER BY r.FechaReservacion DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':cutoff' => $cutoffDate]);
            $reservations = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
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
            $this->log("[RESERVACIONES] " . count($data) . " reservaciones sincronizadas");
            
        } catch (Exception $e) {
            $this->log("[RESERVACIONES] Error: " . $e->getMessage());
        }
    }
    
    // ── VENTAS (CHEQUES) ───────────────────────────────────
    private function syncSales() {
        $this->log("\n[VENTAS] Sincronizando...");
        
        try {
            $cutoffDate = date('Y-m-d', strtotime('-' . SYNC_DAYS . ' days'));
            
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
                        c.FechaApertura
                    FROM Cheques c
                    WHERE c.Status = 2
                      AND CAST(c.FechaCierre AS DATE) >= :cutoff
                    ORDER BY c.FechaCierre DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':cutoff' => $cutoffDate]);
            $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($sales as $s) {
                // Obtener forma de pago
                $paymentType = $this->getPaymentType($s['Folio']);
                
                // Obtener items del cheque
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
            $this->log("[VENTAS] " . count($data) . " ventas sincronizadas");
            
        } catch (Exception $e) {
            $this->log("[VENTAS] Error: " . $e->getMessage());
        }
    }
    
    private function getPaymentType($folio) {
        try {
            $sql = "SELECT TipoFormaPago FROM ChequeFormasPago WHERE Folio = :folio LIMIT 1";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':folio' => $folio]);
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
                    WHERE Folio = :folio";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':folio' => $folio]);
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
    
    // ── MOVIMIENTOS DE CAJA ────────────────────────────────
    private function syncCashMovements() {
        $this->log("\n[CAJA] Sincronizando...");
        
        try {
            $cutoffDate = date('Y-m-d', strtotime('-' . SYNC_DAYS . ' days'));
            
            $sql = "SELECT 
                        m.IdMovimiento,
                        m.Fecha,
                        m.TipoMovimiento,
                        m.Monto,
                        m.Descripcion,
                        m.IdUsuario,
                        m.Referencia
                    FROM MovimientosCaja m
                    WHERE CAST(m.Fecha AS DATE) >= :cutoff
                    ORDER BY m.Fecha DESC";
            
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([':cutoff' => $cutoffDate]);
            $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
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
            $this->log("[CAJA] " . count($data) . " movimientos sincronizados");
            
        } catch (Exception $e) {
            $this->log("[CAJA] Error: " . $e->getMessage());
        }
    }
    
    // ── INVENTARIO ─────────────────────────────────────────
    private function syncInventory() {
        $this->log("\n[INVENTARIO] Sincronizando...");
        
        try {
            $sql = "SELECT 
                        i.IdProducto,
                        i.Existencia,
                        i.ExistenciaMinima,
                        i.ExistenciaMaxima,
                        i.UltimoPrecioCompra,
                        i.FechaUltimaCompra,
                        i.FechaUltimoConteo
                    FROM Inventario i";
            
            $stmt = $this->conn->query($sql);
            $inventory = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $data = [];
            foreach ($inventory as $i) {
                $data[] = [
                    'product_id' => (string)$i['IdProducto'],
                    'current_stock' => floatval($i['Existencia']),
                    'min_stock' => floatval($i['ExistenciaMinima'] ?? 0),
                    'max_stock' => floatval($i['ExistenciaMaxima'] ?? 0),
                    'last_purchase_price' => floatval($i['UltimoPrecioCompra'] ?? 0),
                    'last_purchase_date' => $i['FechaUltimaCompra'],
                    'last_count_date' => $i['FechaUltimoConteo']
                ];
            }
            
            $result = $this->sendToAPI('inventory', $data);
            $this->log("[INVENTARIO] " . count($data) . " productos sincronizados");
            
        } catch (Exception $e) {
            $this->log("[INVENTARIO] Error: " . $e->getMessage());
        }
    }
    
    // ── ENVIAR A API ───────────────────────────────────────
    private function sendToAPI($module, $data) {
        $payload = json_encode([
            'module' => $module,
            'data' => $data,
            'sync_datetime' => date('Y-m-d H:i:s')
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
            CURLOPT_TIMEOUT => 60,
            CURLOPT_SSL_VERIFYPEER => true
        ]);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode === 200) {
            return json_decode($response, true);
        } else {
            $this->log("Error API ($module): HTTP $httpCode - $response");
            return null;
        }
    }
    
    // ── LOGGING ────────────────────────────────────────────
    private function log($message) {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[$timestamp] $message\n";
        echo $logMessage;
        file_put_contents(LOG_FILE, $logMessage, FILE_APPEND);
    }
}

// ── EJECUTAR ───────────────────────────────────────────────
$sync = new SoftRestaurantSync();
$sync->syncAll();
