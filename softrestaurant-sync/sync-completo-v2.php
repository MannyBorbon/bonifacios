<?php
/**
 * BONIFACIOS - Sincronización SoftRestaurant → Website v2.0
 * 
 * NOMBRES DE TABLAS/COLUMNAS VERIFICADOS contra documentacion.md:
 * - cheqdet / tempcheqdet (NO detallescheques)
 * - registroasistencias (NO asistenc)
 * - productosdetalle (para precios, NO productos.precio1)
 * - movtoscaja.idturno (NO turno)
 * - movtoscaja.pagodepropina (flag de propina)
 * - movtoscaja.foliomovto (ID único)
 * - productos: solo idproducto, descripcion, idgrupo (NO precio, NO existencias, NO baja)
 */

// Suprimir deprecation warnings de curl_close en PHP 8.5+
error_reporting(E_ALL & ~E_DEPRECATED);

define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

define('SR_SERVER', '100.84.227.35\\NATIONALSOFT');
define('SR_DATABASE', 'softrestaurant8pro');
define('SR_USER', 'usuario_web');
define('SR_PASS', 'Filipenses4:8@');

define('SYNC_INTERVAL', 15);
define('DAYS_BACK', 3);
define('BATCH_SIZE', 200);

class BonifaciosSyncV2 {
    private $conn;
    private $dateFilterSql;
    private $dateFilterDisplay;

    public function __construct() {
        $this->dateFilterSql = date('Y-m-d 00:00:00', strtotime('-' . DAYS_BACK . ' days'));
        $this->dateFilterDisplay = date('Y-m-d', strtotime('-' . DAYS_BACK . ' days'));
        $this->log("════════════════════════════════════════════════");
        $this->log("  BONIFACIO'S SYNC v2.0 — Iniciando");
        $this->log("  Filtro: datos desde {$this->dateFilterDisplay}");
        $this->log("════════════════════════════════════════════════");
    }

    public function connect() {
        try {
            $this->conn = new PDO(
                "sqlsrv:server=" . SR_SERVER . ";Database=" . SR_DATABASE . ";Encrypt=no;TrustServerCertificate=yes",
                SR_USER, SR_PASS,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
            );
            return true;
        } catch (Exception $e) {
            $this->log("✗ Error de conexión SQL Server: " . $e->getMessage());
            return false;
        }
    }

    public function run() {
        while (true) {
            $cycleStart = microtime(true);
            $this->log("\n── Ciclo " . date('H:i:s') . " ──────────────────────");

            if ($this->connect()) {
                $this->syncEmployees();
                $this->syncProducts();
                $this->syncSalesWithItems();
                $this->syncCancellations();
                $this->syncCashMovements();
                $this->syncAttendance();
                $this->syncInventory();
                $this->conn = null;

                $elapsed = round(microtime(true) - $cycleStart, 1);
                $this->log("✓ Ciclo completado en {$elapsed}s");
            }

            $this->log("   Esperando " . SYNC_INTERVAL . "s...\n");
            sleep(SYNC_INTERVAL);
        }
    }

    // ═══════════════════════════════════════════════════════════
    // EMPLEADOS/MESEROS — Sincronizar meseros de SR a sr_employees
    // Documentación: meseros(idmeserointerno, idmesero, nombre, contraseña, tipo, fotografia, visible, idempresa, tipoacceso, capturarestringidamesas, perfil)
    // ═══════════════════════════════════════════════════════════
    private function syncEmployees() {
        try {
            $sql = "SELECT idmesero, nombre, tipo, visible
                    FROM meseros
                    WHERE nombre IS NOT NULL AND nombre <> ''";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            if (count($rows) === 0) {
                $this->log("[EMPLEADOS] Sin datos");
                return;
            }

            $data = [];
            foreach ($rows as $e) {
                $data[] = [
                    'sr_employee_id' => (string)$e['idmesero'],
                    'employee_code'  => (string)$e['idmesero'],
                    'full_name'      => trim((string)$e['nombre']),
                    'position'       => 'Mesero',
                    'department'     => 'Servicio',
                    'is_waiter'      => 1,
                    'is_active'      => intval($e['visible'] ?? 1) === 1 ? 1 : 0,
                    'hire_date'      => null,
                    'phone'          => '',
                    'email'          => '',
                    'commission_rate' => 0
                ];
            }

            $this->sendBatched('employees', $data);
            $this->log("[EMPLEADOS] {$this->count($data)} meseros sincronizados");
        } catch (Exception $e) {
            $this->log("[EMPLEADOS] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // PRODUCTOS — productos + productosdetalle (precio) + grupos (categoría)
    // Documentación: productos(idproducto, descripcion, idgrupo, ...)
    //                productosdetalle(idproducto, idempresa, precio, ...)
    //                grupos(idgrupo, descripcion, ...)
    // ═══════════════════════════════════════════════════════════
    private function syncProducts() {
        try {
            $sql = "SELECT p.idproducto, p.descripcion, g.descripcion as grupo, pd.precio
                    FROM productos p
                    LEFT JOIN grupos g ON p.idgrupo = g.idgrupo
                    LEFT JOIN productosdetalle pd ON p.idproducto = pd.idproducto
                    WHERE p.descripcion IS NOT NULL AND p.descripcion <> ''";
            $rows = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            if (count($rows) === 0) {
                $this->log("[PRODUCTOS] Sin datos");
                return;
            }

            $data = [];
            foreach ($rows as $p) {
                $data[] = [
                    'sr_product_id'    => (string)$p['idproducto'],
                    'product_code'     => (string)$p['idproducto'],
                    'product_name'     => trim((string)$p['descripcion']),
                    'category'         => trim((string)($p['grupo'] ?? 'Sin Grupo')),
                    'subcategory'      => '',
                    'description'      => trim((string)$p['descripcion']),
                    'price'            => floatval($p['precio'] ?? 0),
                    'cost'             => 0,
                    'unit'             => 'PZA',
                    'is_active'        => 1,
                    'preparation_time' => 0,
                    'printer_station'  => ''
                ];
            }

            $this->sendBatched('products', $data);
            $this->log("[PRODUCTOS] {$this->count($data)} productos sincronizados");
        } catch (Exception $e) {
            $this->log("[PRODUCTOS] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // VENTAS + ITEMS — El corazón del dashboard
    // ═══════════════════════════════════════════════════════════
    private function syncSalesWithItems() {
        try {
            $this->log("[VENTAS] Escaneando desde {$this->dateFilter}...");

            // ── Tickets cerrados ──
            $sql = "SELECT c.folio, c.numcheque, c.fecha, c.total, c.subtotal,
                           c.totalimpuesto1 as impuesto, c.propina,
                           c.descuentoimporte as descuento,
                           c.idmesero, m.nombre as nombre_mesero,
                           c.mesa, c.nopersonas, c.pagado, c.cancelado,
                           c.efectivo, c.tarjeta, c.vales, c.otros
                    FROM cheques c
                    LEFT JOIN meseros m ON c.idmesero = m.idmesero
                    WHERE c.fecha >= ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$this->dateFilter]);
            $closed = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // ── Tickets abiertos (tempcheques) ──
            $sql2 = "SELECT t.folio, t.numcheque, t.fecha, t.total, t.subtotal,
                            t.totalimpuesto1 as impuesto, t.propina,
                            t.descuentoimporte as descuento,
                            t.idmesero, m.nombre as nombre_mesero,
                            t.mesa, t.nopersonas,
                            0 as pagado, 0 as efectivo, 0 as tarjeta, 0 as vales, 0 as otros,
                            0 as cancelado
                     FROM tempcheques t
                     LEFT JOIN meseros m ON t.idmesero = m.idmesero
                     WHERE NOT EXISTS (SELECT 1 FROM cheques c WHERE c.folio = t.folio)";
            $live = $this->conn->query($sql2)->fetchAll(PDO::FETCH_ASSOC);

            // ── Items de tickets cerrados ──
            // Documentación: cheqdet(foliodet, movimiento, comanda, cantidad, idproducto, descuento, precio, ...)
            // foliodet = folio del cheque
            $sqlItems = "SELECT d.foliodet as folio, d.idproducto, 
                                p.descripcion,
                                d.cantidad, d.precio, d.descuento,
                                (d.cantidad * d.precio) as subtotal
                         FROM cheqdet d
                         LEFT JOIN productos p ON d.idproducto = p.idproducto
                         INNER JOIN cheques c ON d.foliodet = c.folio
                         WHERE c.fecha >= ?";
            $stmtItems = $this->conn->prepare($sqlItems);
            $stmtItems->execute([$this->dateFilter]);
            $closedItems = $stmtItems->fetchAll(PDO::FETCH_ASSOC);

            // ── Items de tickets abiertos ──
            // Documentación: tempcheqdet(foliodet, movimiento, comanda, cantidad, idproducto, descuento, precio, ...)
            $sqlItemsOpen = "SELECT d.foliodet as folio, d.idproducto,
                                    p.descripcion,
                                    d.cantidad, d.precio, d.descuento,
                                    (d.cantidad * d.precio) as subtotal
                             FROM tempcheqdet d
                             LEFT JOIN productos p ON d.idproducto = p.idproducto";
            $openItems = $this->conn->query($sqlItemsOpen)->fetchAll(PDO::FETCH_ASSOC);

            // Agrupar items por folio
            $itemsByFolio = [];
            foreach (array_merge($closedItems, $openItems) as $item) {
                $folio = (string)$item['folio'];
                if (!isset($itemsByFolio[$folio])) $itemsByFolio[$folio] = [];
                $itemsByFolio[$folio][] = [
                    'product_id'   => (string)$item['idproducto'],
                    'product_name' => trim((string)($item['descripcion'] ?? 'Producto')),
                    'quantity'     => floatval($item['cantidad'] ?? 0),
                    'unit_price'   => floatval($item['precio'] ?? 0),
                    'discount'     => floatval($item['descuento'] ?? 0),
                    'subtotal'     => floatval($item['subtotal'] ?? 0)
                ];
            }

            // Marcar origen: cheques = cerrado, tempcheques = abierto
            foreach ($closed as &$c) { $c['_source'] = 'cheques'; }
            foreach ($live as &$l) { $l['_source'] = 'tempcheques'; }
            unset($c, $l);

            // Construir datos de ventas con items
            $allTickets = array_merge($closed, $live);
            $data = [];
            foreach ($allTickets as $s) {
                $folio = (string)$s['folio'];
                $isCanceled = intval($s['cancelado'] ?? 0) === 1;
                $fromCheques = ($s['_source'] ?? '') === 'cheques';
                $cash = floatval($s['efectivo'] ?? 0);
                $card = floatval($s['tarjeta'] ?? 0);
                $voucher = floatval($s['vales'] ?? 0);
                $other = floatval($s['otros'] ?? 0);
                $totalPaid = $cash + $card + $voucher + $other;

                // Detectar status: cheques = closed, tempcheques = open
                $status = 'open';
                if ($isCanceled) $status = 'cancelled';
                elseif ($fromCheques) $status = 'closed';

                // Detectar tipo de pago real
                $paymentType = 'pending';
                if ($status === 'closed') {
                    if ($cash > 0 && $card > 0) $paymentType = 'mixed';
                    elseif ($card > 0) $paymentType = 'card';
                    elseif ($voucher > 0) $paymentType = 'voucher';
                    elseif ($other > 0) $paymentType = 'other';
                    else $paymentType = 'cash';
                }

                $fechaDT = new DateTime($s['fecha']);

                $numCheque = (string)($s['numcheque'] ?? $folio);

                $sale = [
                    'sr_ticket_id'   => $folio,
                    'folio'          => $numCheque,
                    'ticket_number'  => $numCheque,
                    'sale_date'      => $fechaDT->format('Y-m-d'),
                    'sale_time'      => $fechaDT->format('H:i:s'),
                    'sale_datetime'  => $fechaDT->format('Y-m-d H:i:s'),
                    'table_number'   => (string)$s['mesa'],
                    'waiter_id'      => (string)$s['idmesero'],
                    'waiter_name'    => (string)($s['nombre_mesero'] ?? 'Sin Asignar'),
                    'covers'         => intval($s['nopersonas']),
                    'subtotal'       => floatval($s['subtotal']),
                    'tax'            => floatval($s['impuesto']),
                    'discount'       => floatval($s['descuento']),
                    'tip'            => floatval($s['propina']),
                    'total'          => floatval($s['total']),
                    'status'         => $status,
                    'payment_type'   => $paymentType,
                    'cash_amount'    => $cash,
                    'card_amount'    => $card,
                    'voucher_amount' => $voucher,
                    'other_amount'   => $other,
                    'opened_at'      => $fechaDT->format('Y-m-d H:i:s'),
                    'closed_at'      => ($status === 'closed') ? $fechaDT->format('Y-m-d H:i:s') : null,
                    'items'          => $itemsByFolio[$folio] ?? []
                ];

                $data[] = $sale;
            }

            $totalItems = array_sum(array_map(fn($s) => count($s['items']), $data));
            $this->sendBatched('sales', $data);
            $this->log("[VENTAS] {$this->count($data)} tickets + {$totalItems} items sincronizados");
        } catch (Exception $e) {
            $this->log("[VENTAS] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // CANCELACIONES
    // ═══════════════════════════════════════════════════════════
    private function syncCancellations() {
        try {
            $sql = "SELECT CAST(folio AS VARCHAR) as f, fecha, importe, concepto
                    FROM movtoscaja
                    WHERE cancelado = 1
                      AND folio IS NOT NULL
                      AND CAST(folio AS VARCHAR) <> '0'
                      AND concepto LIKE '%FOLIO%'
                      AND fecha >= ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$this->dateFilter]);
            $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($res as $c) {
                $data[] = [
                    'ticket_number' => (string)$c['f'],
                    'amount'        => abs(floatval($c['importe'])),
                    'user_name'     => 'Gerente',
                    'reason'        => (string)$c['concepto'],
                    'cancel_date'   => (new DateTime($c['fecha']))->format('Y-m-d H:i:s')
                ];
            }

            if (count($data) > 0) {
                $this->sendToAPI('cancellations', $data);
                $this->log("[CANCELACIONES] {$this->count($data)} registros");
            } else {
                $this->log("[CANCELACIONES] Sin cancelaciones recientes");
            }
        } catch (Exception $e) {
            $this->log("[CANCELACIONES] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // MOVIMIENTOS DE CAJA — Con detección de propinas
    // ═══════════════════════════════════════════════════════════
    // Documentación: movtoscaja(folio, foliomovto, tipo, idturno, concepto, referencia, importe, fecha, cancelado, usuariocancelo, pagodepropina, idempresa)
    private function syncCashMovements() {
        try {
            // Query SIN ISNULL para evitar errores de conversión de tipos
            $sql = "SELECT folio, tipo, idturno, concepto, referencia,
                           importe, fecha, usuariocancelo, pagodepropina, idempresa
                    FROM movtoscaja 
                    WHERE cancelado = 0 AND fecha >= ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$this->dateFilter]);
            $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($res as $m) {
                $tipo = intval($m['tipo'] ?? 0);
                $importe = floatval($m['importe'] ?? 0);
                $fechaDT = new DateTime($m['fecha']);
                $isTipPayment = intval($m['pagodepropina'] ?? 0) === 1;

                // Clasificación correcta usando campo 'tipo' de SoftRestaurant:
                // Clasificar tipo de movimiento
                // tipo=1 → RETIRO, tipo=2 → DEPOSITO (según datos reales de SoftRestaurant)
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

                $movementId = (string)($m['folio'] ?? '0') . '_' . $fechaDT->format('YmdHis');

                $data[] = [
                    'movement_id'       => $movementId,
                    'folio_movto'       => (string)($m['folio'] ?? ''),
                    'movement_type'     => $movementType,
                    'tipo_original'     => $tipo,
                    'amount'            => abs($importe),
                    'amount_signed'     => $amountSigned,
                    'movement_date'     => $fechaDT->format('Y-m-d'),
                    'movement_time'     => $fechaDT->format('H:i:s'),
                    'movement_datetime' => $fechaDT->format('Y-m-d H:i:s'),
                    'shift_id'          => (string)($m['idturno'] ?? ''),
                    'concept'           => (string)($m['concepto'] ?? ''),
                    'reference'         => (string)($m['referencia'] ?? ''),
                    'user_cancel'       => (string)($m['usuariocancelo'] ?? ''),
                    'is_tip_payment'    => $isTipPayment,
                    'company_id'        => (string)($m['idempresa'] ?? '1')
                ];
            }

            if (count($data) > 0) {
                $this->sendBatched('cash_movements', $data);
                $tips = count(array_filter($data, fn($d) => $d['is_tip_payment']));
                $this->log("[CAJA] {$this->count($data)} movimientos ({$tips} propinas)");
            } else {
                $this->log("[CAJA] Sin movimientos recientes");
            }
        } catch (Exception $e) {
            $this->log("[CAJA] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // ASISTENCIA
    // Documentación: registroasistencias(idmovto, idempleado, entrada, salida, tipo)
    // meseros(idmeserointerno, idmesero, nombre, contraseña, tipo, ...)
    // Nota: registroasistencias NO tiene nombre ni fecha, se extrae de entrada
    // ═══════════════════════════════════════════════════════════
    private function syncAttendance() {
        try {
            $sql = "SELECT r.idmovto, r.idempleado, r.entrada, r.salida, r.tipo
                    FROM registroasistencias r
                    WHERE r.entrada >= ?";
            $stmt = $this->conn->prepare($sql);
            $stmt->execute([$this->dateFilter]);
            $res = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($res as $a) {
                $clockIn = null;
                $clockOut = null;
                $minutesWorked = 0;
                $fechaStr = date('Y-m-d'); // default

                // Parsear entrada (contiene datetime completo)
                if (!empty($a['entrada'])) {
                    try {
                        $entradaDT = new DateTime($a['entrada']);
                        $clockIn = $entradaDT->format('Y-m-d H:i:s');
                        $fechaStr = $entradaDT->format('Y-m-d');
                    } catch (Exception $e) {}
                }

                // Parsear salida
                if (!empty($a['salida'])) {
                    try {
                        $salidaDT = new DateTime($a['salida']);
                        if ($salidaDT->format('Y') !== '1900') {
                            $clockOut = $salidaDT->format('Y-m-d H:i:s');
                        }
                    } catch (Exception $e) {}
                }

                // Calcular minutos trabajados
                if ($clockIn && $clockOut) {
                    try {
                        $diff = (new DateTime($clockOut))->getTimestamp() - (new DateTime($clockIn))->getTimestamp();
                        $minutesWorked = max(0, intval($diff / 60));
                    } catch (Exception $e) {
                        $minutesWorked = 0;
                    }
                }

                // Determinar estado (ENUM: present, left, absent, late, early_leave)
                $status = 'present';
                if (!$clockIn) $status = 'absent';
                elseif ($clockOut && $minutesWorked < 240) $status = 'early_leave';
                elseif ($clockOut) $status = 'left';

                $data[] = [
                    'employee_id'    => (string)$a['idempleado'],
                    'employee_name'  => 'Empleado ' . $a['idempleado'],
                    'position'       => '',
                    'date'           => $fechaStr,
                    'clock_in'       => $clockIn,
                    'clock_out'      => $clockOut,
                    'shift'          => 'regular',
                    'status'         => $status,
                    'minutes_worked' => $minutesWorked,
                    'notes'          => ''
                ];
            }

            if (count($data) > 0) {
                $this->sendBatched('attendance', $data);
                $this->log("[ASISTENCIA] {$this->count($data)} registros");
            } else {
                $this->log("[ASISTENCIA] Sin registros recientes");
            }
        } catch (Exception $e) {
            $this->log("[ASISTENCIA] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // INVENTARIO
    // Documentación: productos NO tiene existencias ni preciocosto
    // Solo sincronizamos precio de productosdetalle como referencia
    // ═══════════════════════════════════════════════════════════
    private function syncInventory() {
        try {
            $sql = "SELECT p.idproducto, pd.precio
                    FROM productos p
                    LEFT JOIN productosdetalle pd ON p.idproducto = pd.idproducto
                    WHERE p.descripcion IS NOT NULL AND p.descripcion <> ''";
            $res = $this->conn->query($sql)->fetchAll(PDO::FETCH_ASSOC);

            $data = [];
            foreach ($res as $i) {
                $data[] = [
                    'product_id'          => (string)$i['idproducto'],
                    'current_stock'       => 0,
                    'min_stock'           => 0,
                    'max_stock'           => 0,
                    'last_purchase_price' => floatval($i['precio'] ?? 0),
                    'last_purchase_date'  => null,
                    'last_count_date'     => null
                ];
            }

            if (count($data) > 0) {
                $this->sendBatched('inventory', $data);
                $this->log("[INVENTARIO] {$this->count($data)} productos");
            }
        } catch (Exception $e) {
            $this->log("[INVENTARIO] Error: " . $e->getMessage());
        }
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════
    
    private function sendBatched($module, $data) {
        $chunks = array_chunk($data, BATCH_SIZE);
        foreach ($chunks as $chunk) {
            $this->sendToAPI($module, $chunk);
        }
    }

    private function sendToAPI($module, $data) {
        $ch = curl_init(API_URL);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => json_encode([
                'module'         => $module,
                'data'           => $data,
                'sync_datetime'  => date('Y-m-d H:i:s')
            ]),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER     => [
                'Content-Type: application/json',
                'X-API-Key: ' . API_KEY
            ],
            CURLOPT_SSL_VERIFYPEER => false,
            CURLOPT_TIMEOUT        => 60,
            CURLOPT_CONNECTTIMEOUT => 10
        ]);

        $res = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_error($ch);
        // No llamar curl_close() — PHP 8.5+ lo hace automáticamente

        if ($curlErr) {
            $this->log("   ✗ CURL Error ($module): $curlErr");
            return null;
        }

        $result = json_decode($res, true);
        if ($httpCode !== 200 || !isset($result['success'])) {
            $this->log("   ✗ API Error ($module): HTTP $httpCode — " . substr($res ?? '', 0, 300));
            return null;
        }

        // Mostrar resultado del sync
        $i = $result['inserted'] ?? 0;
        $u = $result['updated'] ?? 0;
        $f = $result['failed'] ?? 0;
        $this->log("   ↳ $module: +$i nuevos, ~$u actualizados" . ($f > 0 ? ", ✗$f fallidos" : ''));

        return $result;
    }

    private function count($arr) { return number_format(count($arr)); }
    private function log($m) { echo "[" . date('H:i:s') . "] $m\n"; }
}

// ═══ INICIO ═══
$sync = new BonifaciosSyncV2();
$sync->run();
