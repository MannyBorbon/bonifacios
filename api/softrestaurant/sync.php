<?php
/**
 * API Endpoint para recibir sincronización de SoftRestaurant 8.0
 * Recibe datos de todos los módulos y los almacena en la BD
 */

require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';
header('Content-Type: application/json; charset=utf-8');

$srSyncAllowedModules = [
    'products',
    'employees',
    'tables',
    'reservations',
    'sales',
    'cheque_payments',
    'cash_movements',
    'inventory',
    'attendance',
    'cancellations',
    'ticket_items',
    'shifts',
    'pos_table_states',
];

$method = $_SERVER['REQUEST_METHOD'] ?? '';
if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

$expectedKey = trim((string) envOrDefault('SR_SYNC_API_KEY', ''));
if ($expectedKey === '') {
    // Fallback de compatibilidad para hosting compartido donde .env no se carga.
    // Debe coincidir con API_KEY del cliente (softrestaurant-sync/sync-v3.php).
    $expectedKey = 'bonifacios-sr-sync-2024-secret-key';
}

$apiKey = '';
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    if (is_array($headers)) {
        foreach ($headers as $k => $v) {
            if (strcasecmp((string) $k, 'X-API-Key') === 0) {
                $apiKey = (string) $v;
                break;
            }
        }
    }
}
if ($apiKey === '') {
    $apiKey = (string) ($_SERVER['HTTP_X_API_KEY'] ?? '');
}

if (!hash_equals($expectedKey, $apiKey)) {
    http_response_code(401);
    echo json_encode(['success' => false, 'error' => 'No autorizado']);
    exit;
}

$rawBody = file_get_contents('php://input');
$input = json_decode($rawBody !== false && $rawBody !== '' ? $rawBody : 'null', true);
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'JSON inválido o vacío']);
    exit;
}

$module = trim((string) ($input['module'] ?? ''));
$data = $input['data'] ?? null;
if (!is_array($data)) {
    $data = [];
}

if ($module === '' || $data === []) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Módulo y datos requeridos']);
    exit;
}

if (!in_array($module, $srSyncAllowedModules, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Módulo no reconocido']);
    exit;
}

$logId = null;
$conn = null;

try {
    $conn = getConnection();

    // Asegurar que sr_sync_log existe antes de usarla
    $conn->query("CREATE TABLE IF NOT EXISTS sr_sync_log (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        module_name VARCHAR(64) NOT NULL,
        sync_started_at DATETIME NOT NULL,
        sync_finished_at DATETIME NULL,
        records_processed INT NOT NULL DEFAULT 0,
        records_inserted INT NOT NULL DEFAULT 0,
        records_updated INT NOT NULL DEFAULT 0,
        records_failed INT NOT NULL DEFAULT 0,
        status ENUM('running','completed','failed') NOT NULL DEFAULT 'running',
        error_details TEXT NULL,
        PRIMARY KEY (id),
        KEY idx_module (module_name),
        KEY idx_started (sync_started_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Asegurar que sr_sync_config existe
    $conn->query("CREATE TABLE IF NOT EXISTS sr_sync_config (
        module_name VARCHAR(64) NOT NULL,
        last_sync_at DATETIME NULL,
        sync_status VARCHAR(32) NULL DEFAULT 'idle',
        records_synced INT NOT NULL DEFAULT 0,
        PRIMARY KEY (module_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");

    // Iniciar log de sincronización
    $logStmt = $conn->prepare("
        INSERT INTO sr_sync_log (module_name, sync_started_at, status)
        VALUES (?, NOW(), 'running')
    ");
    if ($logStmt === false) {
        throw new RuntimeException('prepare sr_sync_log failed: ' . $conn->error);
    }
    $logStmt->bind_param("s", $module);
    $logStmt->execute();
    $logId = (int) $logStmt->insert_id;
    
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    $lastSyncError = null;

    // Procesar según el módulo
    switch ($module) {
        case 'products':
            list($inserted, $updated, $failed) = syncProducts($conn, $data);
            break;
            
        case 'employees':
            list($inserted, $updated, $failed) = syncEmployees($conn, $data);
            break;
            
        case 'tables':
            list($inserted, $updated, $failed) = syncTables($conn, $data);
            break;
            
        case 'reservations':
            list($inserted, $updated, $failed) = syncReservations($conn, $data);
            break;
            
        case 'sales':
            list($inserted, $updated, $failed, $lastSyncError) = syncSales($conn, $data);
            break;

        case 'cheque_payments':
            list($inserted, $updated, $failed) = syncChequePayments($conn, $data);
            break;
            
        case 'cash_movements':
            list($inserted, $updated, $failed) = syncCashMovements($conn, $data);
            break;
            
        case 'inventory':
            list($inserted, $updated, $failed) = syncInventory($conn, $data);
            break;
            
        case 'attendance':
            list($inserted, $updated, $failed) = syncAttendance($conn, $data);
            break;

        case 'cancellations':
            list($inserted, $updated, $failed) = syncCancellationsData($conn, $data);
            break;

        case 'ticket_items':
            list($inserted, $updated, $failed) = syncTicketItems($conn, $data);
            break;

        case 'shifts':
            list($inserted, $updated, $failed) = syncShifts($conn, $data);
            break;

        case 'pos_table_states':
            list($inserted, $updated, $failed) = syncPosTableLiveStates($conn, $data);
            break;

        default:
            throw new RuntimeException('Módulo no implementado en el servidor');
    }
    
    // Actualizar log de sincronización
    $status = $failed > 0 ? 'failed' : 'completed';
    $totalProcessed = $inserted + $updated + $failed;
    if ($logId > 0) {
        $updateLogStmt = $conn->prepare("
            UPDATE sr_sync_log
            SET sync_finished_at = NOW(),
                records_processed = ?,
                records_inserted = ?,
                records_updated = ?,
                records_failed = ?,
                status = ?
            WHERE id = ?
        ");
        if ($updateLogStmt !== false) {
            $updateLogStmt->bind_param("iiiisi", $totalProcessed, $inserted, $updated, $failed, $status, $logId);
            $updateLogStmt->execute();
        }
    }

    // Upsert configuración del módulo
    $upsertConfigStmt = $conn->prepare("
        INSERT INTO sr_sync_config (module_name, last_sync_at, sync_status, records_synced)
        VALUES (?, NOW(), 'success', ?)
        ON DUPLICATE KEY UPDATE last_sync_at = NOW(), sync_status = 'success', records_synced = ?
    ");
    if ($upsertConfigStmt !== false) {
        $upsertConfigStmt->bind_param("sii", $module, $totalProcessed, $totalProcessed);
        $upsertConfigStmt->execute();
    }
    
    $resp = [
        'success'  => true,
        'module'   => $module,
        'inserted' => $inserted,
        'updated'  => $updated,
        'failed'   => $failed,
        'total'    => $totalProcessed,
    ];
    if (!empty($lastSyncError)) {
        $resp['last_error'] = $lastSyncError;
    }
    echo json_encode($resp);
} catch (Throwable $e) {
    $errMsg = $e->getMessage();
    error_log('[sr_sync] ' . $errMsg . ' in ' . $e->getFile() . ':' . $e->getLine());
    http_response_code(500);
    if ($conn instanceof mysqli && $logId > 0) {
        $failStmt = $conn->prepare(
            "UPDATE sr_sync_log SET sync_finished_at = NOW(), status = 'failed', error_details = ? WHERE id = ? AND status = 'running'"
        );
        if ($failStmt) {
            $failStmt->bind_param('si', $errMsg, $logId);
            $failStmt->execute();
        }
    }
    echo json_encode(['success' => false, 'error' => $errMsg]);
} finally {
    if ($conn instanceof mysqli) {
        $conn->close();
    }
}

// ── FUNCIONES DE SINCRONIZACIÓN ────────────────────────────

function syncProducts($conn, $products) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_products (
            sr_product_id, product_code, product_name, category, subcategory,
            description, price, cost, unit, is_active, preparation_time, printer_station
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            product_code = VALUES(product_code),
            product_name = VALUES(product_name),
            category = VALUES(category),
            subcategory = VALUES(subcategory),
            description = VALUES(description),
            price = VALUES(price),
            cost = VALUES(cost),
            unit = VALUES(unit),
            is_active = VALUES(is_active),
            preparation_time = VALUES(preparation_time),
            printer_station = VALUES(printer_station)
    ");
    
    foreach ($products as $p) {
        try {
            $stmt->bind_param("ssssssddsiis",
                $p['sr_product_id'],
                $p['product_code'],
                $p['product_name'],
                $p['category'],
                $p['subcategory'],
                $p['description'],
                $p['price'],
                $p['cost'],
                $p['unit'],
                $p['is_active'],
                $p['preparation_time'],
                $p['printer_station']
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

function syncEmployees($conn, $employees) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_employees (
            sr_employee_id, employee_code, full_name, position, department,
            is_waiter, is_active, hire_date, phone, email, commission_rate
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            employee_code = VALUES(employee_code),
            full_name = VALUES(full_name),
            position = VALUES(position),
            department = VALUES(department),
            is_waiter = VALUES(is_waiter),
            is_active = VALUES(is_active),
            hire_date = VALUES(hire_date),
            phone = VALUES(phone),
            email = VALUES(email),
            commission_rate = VALUES(commission_rate)
    ");
    
    foreach ($employees as $e) {
        try {
            $srEmployeeId = (string)($e['sr_employee_id'] ?? $e['employee_id'] ?? '');
            $employeeCode = (string)($e['employee_code'] ?? $e['internal_id'] ?? $srEmployeeId);
            $fullName = (string)($e['full_name'] ?? $e['name'] ?? $e['employee_name'] ?? '');
            $position = isset($e['position']) ? (string)$e['position'] : ((((string)($e['type'] ?? '')) === '1') ? 'Mesero' : '');
            $department = (string)($e['department'] ?? 'Servicio');
            $isWaiter = (string)(((int)($e['is_waiter'] ?? 1)) === 1 ? '1' : '0');
            $isActive = ((int)($e['is_active'] ?? $e['visible'] ?? 1)) === 1 ? 1 : 0;
            $hireDate = (string)($e['hire_date'] ?? date('Y-m-d'));
            $phone = (string)($e['phone'] ?? '');
            $email = (string)($e['email'] ?? '');
            $commissionRate = floatval($e['commission_rate'] ?? 0);
            if ($srEmployeeId === '' || $fullName === '') {
                continue;
            }
            $stmt->bind_param("ssssssisssd",
                $srEmployeeId,
                $employeeCode,
                $fullName,
                $position,
                $department,
                $isWaiter,
                $isActive,
                $hireDate,
                $phone,
                $email,
                $commissionRate
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

function syncTables($conn, $tables) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_tables (
            sr_table_id, table_number, table_name, area, capacity,
            position_x, position_y, is_active, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            table_number = VALUES(table_number),
            table_name = VALUES(table_name),
            area = VALUES(area),
            capacity = VALUES(capacity),
            position_x = VALUES(position_x),
            position_y = VALUES(position_y),
            is_active = VALUES(is_active),
            status = VALUES(status)
    ");
    
    foreach ($tables as $t) {
        try {
            $stmt->bind_param("ssssiiiis",
                $t['sr_table_id'],
                $t['table_number'],
                $t['table_name'],
                $t['area'],
                $t['capacity'],
                $t['position_x'],
                $t['position_y'],
                $t['is_active'],
                $t['status']
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

function syncReservations($conn, $reservations) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_reservations (
            sr_reservation_id, customer_name, customer_phone, customer_email,
            reservation_date, reservation_time, party_size, table_id, status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            customer_name = VALUES(customer_name),
            customer_phone = VALUES(customer_phone),
            customer_email = VALUES(customer_email),
            reservation_date = VALUES(reservation_date),
            reservation_time = VALUES(reservation_time),
            party_size = VALUES(party_size),
            table_id = VALUES(table_id),
            status = VALUES(status),
            notes = VALUES(notes)
    ");
    
    foreach ($reservations as $r) {
        try {
            // Buscar table_id local si existe
            $tableId = null;
            if (!empty($r['table_id'])) {
                $tableStmt = $conn->prepare("SELECT id FROM sr_tables WHERE sr_table_id = ?");
                $tableStmt->bind_param("s", $r['table_id']);
                $tableStmt->execute();
                $tableResult = $tableStmt->get_result();
                if ($row = $tableResult->fetch_assoc()) {
                    $tableId = $row['id'];
                }
            }
            
            $stmt->bind_param("ssssssisss",
                $r['sr_reservation_id'],
                $r['customer_name'],
                $r['customer_phone'],
                $r['customer_email'],
                $r['reservation_date'],
                $r['reservation_time'],
                $r['party_size'],
                $tableId,
                $r['status'],
                $r['notes']
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

/**
 * Normaliza status enviado por scripts de sync (evita forzar 'open' si llega Pagado/paid/1).
 */
function normalize_sr_sale_status($status) {
    if ($status === true) {
        return 'closed';
    }
    if ($status === false || $status === null) {
        return 'open';
    }
    if (is_int($status) || is_float($status)) {
        return ((int) $status) === 1 ? 'closed' : 'open';
    }
    $s = strtolower(trim((string) $status));
    if ($s === '1' || in_array($s, ['closed', 'cerrado', 'cerrada', 'cobrado', 'pagado', 'paid'], true)) {
        return 'closed';
    }
    if (in_array($s, ['cancelled', 'canceled', 'cancelado'], true)) {
        return 'cancelled';
    }
    if (in_array($s, ['open', 'abierto', 'pending', '0'], true)) {
        return 'open';
    }
    return 'open';
}

function syncSales($conn, $sales) {
    $inserted  = 0;
    $updated   = 0;
    $failed    = 0;
    $lastError = null;

    // receipt_printed ya existe en el schema; no ejecutar INFORMATION_SCHEMA por cada llamada

    foreach ($sales as $sale) {
        try {
            $status = normalize_sr_sale_status($sale['status'] ?? 'open');

            $rawSrId     = trim((string)($sale['sr_ticket_id'] ?? $sale['folio'] ?? $sale['ticket_number'] ?? ''));
            if ($rawSrId === '') {
                throw new Exception('sr_ticket_id vacío');
            }
            $srId        = $conn->escape_string($rawSrId);
            $ticketNum   = $conn->escape_string($sale['ticket_number']  ?? '');
            $folio       = $conn->escape_string($sale['folio']          ?? $sale['ticket_number'] ?? '');
            $saleDate    = $conn->escape_string($sale['sale_date']      ?? '');
            $saleTime    = $conn->escape_string($sale['sale_time']      ?? '');
            // sale_datetime vacío rompe filtros BETWEEN en sales.php / phpMyAdmin; derivar de fecha+hora SR.
            $saleDtRaw = trim((string) ($sale['sale_datetime'] ?? ''));
            if ($saleDtRaw === '') {
                $sd = trim((string) ($sale['sale_date'] ?? ''));
                $stRaw = trim((string) ($sale['sale_time'] ?? ''));
                if ($sd !== '') {
                    $saleDtRaw = $stRaw !== '' ? ($sd . ' ' . $stRaw) : ($sd . ' 00:00:00');
                }
            }
            $saleDt      = $conn->escape_string($saleDtRaw);
            $tableNum    = $conn->escape_string($sale['table_number']   ?? '');
            $waiterName  = $conn->escape_string($sale['waiter_name']    ?? '');
            $payType     = $conn->escape_string($sale['payment_type']   ?? 'pending');
            $openedAt    = $conn->escape_string($sale['opened_at']      ?? '');
            $closedAtVal = $sale['closed_at']
                ? "'" . $conn->escape_string($sale['closed_at']) . "'"
                : "NULL";

            $covers  = intval($sale['covers']         ?? 0);
            $sub     = floatval($sale['subtotal']      ?? 0);
            $tax     = floatval($sale['tax']           ?? 0);
            $disc    = floatval($sale['discount']      ?? 0);
            $tip     = floatval($sale['tip']           ?? 0);
            $total   = floatval($sale['total']         ?? 0);
            $cash    = floatval($sale['cash_amount']   ?? 0);
            $card    = floatval($sale['card_amount']   ?? 0);
            $voucher = floatval($sale['voucher_amount']?? 0);
            $other   = floatval($sale['other_amount']  ?? 0);

            $tipPaid = intval($sale['tip_paid'] ?? 0);
            $receiptPrinted = intval($sale['receipt_printed'] ?? 0);
            $receiptPrinted = $receiptPrinted === 1 ? 1 : 0;

            $sql = "INSERT INTO sr_sales (
                        sr_ticket_id, ticket_number, folio,
                        sale_date, sale_time, sale_datetime,
                        table_id, table_number, waiter_id, waiter_name, covers,
                        subtotal, tax, discount, tip, tip_paid, total,
                        status, payment_type,
                        cash_amount, card_amount, voucher_amount, other_amount,
                        receipt_printed,
                        opened_at, closed_at
                    ) VALUES (
                        '$srId', '$ticketNum', '$folio',
                        '$saleDate', '$saleTime', '$saleDt',
                        NULL, '$tableNum', NULL, '$waiterName', $covers,
                        $sub, $tax, $disc, $tip, $tipPaid, $total,
                        '$status', '$payType',
                        $cash, $card, $voucher, $other,
                        $receiptPrinted,
                        '$openedAt', $closedAtVal
                    )
                    ON DUPLICATE KEY UPDATE
                        ticket_number   = VALUES(ticket_number),
                        folio           = VALUES(folio),
                        sale_date       = VALUES(sale_date),
                        sale_time       = VALUES(sale_time),
                        sale_datetime   = VALUES(sale_datetime),
                        table_number    = VALUES(table_number),
                        waiter_name     = VALUES(waiter_name),
                        covers          = VALUES(covers),
                        subtotal        = VALUES(subtotal),
                        tax             = VALUES(tax),
                        discount        = VALUES(discount),
                        tip             = VALUES(tip),
                        tip_paid        = VALUES(tip_paid),
                        total           = VALUES(total),
                        status          = CASE
                            -- 🛡️ PROTECCIÓN: ticket ya cancelado → inmutable, nada lo sobreescribe
                            WHEN LOWER(COALESCE(sr_sales.status,'')) IN ('cancelled','canceled','cancelado')
                                THEN sr_sales.status
                            -- Protección existente: no degradar closed → open
                            WHEN (
                                (
                                    LOWER(COALESCE(sr_sales.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                                    OR COALESCE(sr_sales.cash_amount,0)+COALESCE(sr_sales.card_amount,0)+COALESCE(sr_sales.voucher_amount,0)+COALESCE(sr_sales.other_amount,0) > 0.005
                                    OR sr_sales.closed_at IS NOT NULL
                                    OR LOWER(TRIM(COALESCE(sr_sales.payment_type,''))) NOT IN ('','pending','open','abierto')
                                )
                                AND (
                                    LOWER(COALESCE(VALUES(status),'')) IN ('open','abierto','pending')
                                    AND COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) <= 0.005
                                    AND (VALUES(closed_at) IS NULL OR VALUES(closed_at) = '0000-00-00 00:00:00')
                                    AND LOWER(TRIM(COALESCE(VALUES(payment_type),''))) IN ('','pending','open','abierto')
                                )
                            ) THEN sr_sales.status
                            ELSE VALUES(status)
                        END,
                        payment_type    = CASE
                            WHEN (
                                (
                                    LOWER(COALESCE(sr_sales.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                                    OR COALESCE(sr_sales.cash_amount,0)+COALESCE(sr_sales.card_amount,0)+COALESCE(sr_sales.voucher_amount,0)+COALESCE(sr_sales.other_amount,0) > 0.005
                                    OR sr_sales.closed_at IS NOT NULL
                                    OR LOWER(TRIM(COALESCE(sr_sales.payment_type,''))) NOT IN ('','pending','open','abierto')
                                )
                                AND (
                                    LOWER(COALESCE(VALUES(status),'')) IN ('open','abierto','pending')
                                    AND COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) <= 0.005
                                    AND (VALUES(closed_at) IS NULL OR VALUES(closed_at) = '0000-00-00 00:00:00')
                                    AND LOWER(TRIM(COALESCE(VALUES(payment_type),''))) IN ('','pending','open','abierto')
                                )
                            ) THEN sr_sales.payment_type
                            ELSE VALUES(payment_type)
                        END,
                        cash_amount     = CASE WHEN COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) > 0.005 THEN VALUES(cash_amount) ELSE COALESCE(sr_sales.cash_amount,0) END,
                        card_amount     = CASE WHEN COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) > 0.005 THEN VALUES(card_amount) ELSE COALESCE(sr_sales.card_amount,0) END,
                        voucher_amount  = CASE WHEN COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) > 0.005 THEN VALUES(voucher_amount) ELSE COALESCE(sr_sales.voucher_amount,0) END,
                        other_amount    = CASE WHEN COALESCE(VALUES(cash_amount),0)+COALESCE(VALUES(card_amount),0)+COALESCE(VALUES(voucher_amount),0)+COALESCE(VALUES(other_amount),0) > 0.005 THEN VALUES(other_amount) ELSE COALESCE(sr_sales.other_amount,0) END,
                        receipt_printed = VALUES(receipt_printed),
                        opened_at       = VALUES(opened_at),
                        closed_at       = CASE
                            WHEN sr_sales.closed_at IS NOT NULL AND (VALUES(closed_at) IS NULL OR VALUES(closed_at) = '0000-00-00 00:00:00')
                                THEN sr_sales.closed_at
                            ELSE VALUES(closed_at)
                        END";

            if ($conn->query($sql) === false) {
                throw new Exception($conn->error);
            }

            // Limpiar pos_table_live_state cuando la cuenta se cierra
            if ($status === 'closed') {
                $venueCode = bonifacios_table_canonical_venue_code($tableNum);
                if ($venueCode !== null && $venueCode !== '') {
                    $clearPos = $conn->prepare('DELETE FROM pos_table_live_state WHERE table_code = ?');
                    if ($clearPos) {
                        $clearPos->bind_param('s', $venueCode);
                        $clearPos->execute();
                        $clearPos->close();
                    }
                }
            }

            $affectedRows = $conn->affected_rows;
            $insertId     = $conn->insert_id;

            if (!empty($sale['items'])) {
                $saleId = $insertId > 0 ? $insertId : getLocalSaleId($conn, $rawSrId);
                syncSaleItems($conn, $saleId, $sale['items'], $rawSrId);
            }

            // MySQL: affected_rows 1=insert, 2=update, 0=sin cambios
            if ($affectedRows === 1 && $insertId > 0) {
                $inserted++;
            } elseif ($affectedRows >= 0) {
                $updated++;
            }

        } catch (Exception $e) {
            $failed++;
            $lastError = $e->getMessage() . " | Ticket: " . ($sale['sr_ticket_id'] ?? 'unknown');
            error_log("syncSales ERROR: " . $lastError);
        }
    }

    return [$inserted, $updated, $failed, $lastError];
}

/**
 * Líneas de chequespagos (SR) → sr_cheque_payments para desglose real en dashboard.
 * @return array{0:int,1:int,2:int}
 */
function syncChequePayments($conn, $rows) {
    $inserted = 0;
    $updated  = 0;
    $failed   = 0;
    $folioAgg = [];

    try {
        $conn->query(
            'CREATE TABLE IF NOT EXISTS sr_cheque_payments (
              id INT UNSIGNED NOT NULL AUTO_INCREMENT,
              folio VARCHAR(64) NOT NULL,
              line_id VARCHAR(96) NOT NULL,
              id_forma_pago VARCHAR(32) NOT NULL DEFAULT \'\',
              amount DECIMAL(14,4) NOT NULL DEFAULT 0.0000,
              reference VARCHAR(255) NULL,
              payment_datetime DATETIME NULL,
              created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
              updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
              PRIMARY KEY (id),
              UNIQUE KEY uq_sr_cheque_payments_line (line_id),
              KEY idx_sr_cheque_payments_folio (folio),
              KEY idx_sr_cheque_payments_dt (payment_datetime)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci'
        );
    } catch (Throwable $e) {
        // DDL idempotente
    }

    $stmt = $conn->prepare(
        'INSERT INTO sr_cheque_payments (folio, line_id, id_forma_pago, amount, reference, payment_datetime)
         VALUES (?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
            id_forma_pago = VALUES(id_forma_pago),
            amount = VALUES(amount),
            reference = VALUES(reference),
            payment_datetime = VALUES(payment_datetime)'
    );
    if (!$stmt) {
        return [0, 0, count($rows)];
    }

    foreach ($rows as $r) {
        try {
            $folio = trim((string)($r['folio'] ?? ''));
            $lineId = trim((string)($r['line_id'] ?? ''));
            $idForma = trim((string)($r['id_forma_pago'] ?? $r['idformadepago'] ?? ''));
            $amount  = floatval($r['amount'] ?? $r['importe'] ?? 0);
            $ref     = trim((string)($r['reference'] ?? $r['referencia'] ?? ''));
            $payDt   = trim((string)($r['payment_datetime'] ?? ''));

            if ($lineId === '' && $folio !== '') {
                $lineId = $folio . '|' . $idForma . '|' . number_format($amount, 4, '.', '') . '|' . ($payDt !== '' ? $payDt : date('Y-m-d H:i:s'));
            }

            if ($folio === '' || $lineId === '' || abs($amount) < 0.00001) {
                continue;
            }
            if ($payDt === '') {
                $payDt = date('Y-m-d H:i:s');
            }

            $stmt->bind_param(
                'sssdss',
                $folio,
                $lineId,
                $idForma,
                $amount,
                $ref,
                $payDt
            );
            if (!$stmt->execute()) {
                throw new Exception($stmt->error);
            }
            $folioKey = trim(str_replace('#', '', $folio));
            if ($folioKey !== '') {
                if (!isset($folioAgg[$folioKey])) {
                    $folioAgg[$folioKey] = [
                        'cash' => 0.0,
                        'card' => 0.0,
                        'voucher' => 0.0,
                        'other' => 0.0,
                        'max_dt' => $payDt,
                    ];
                }
                $bucket = mapChequePaymentBucket($idForma, $ref);
                if (!isset($folioAgg[$folioKey][$bucket])) {
                    $bucket = 'other';
                }
                $folioAgg[$folioKey][$bucket] += $amount;
                if ($payDt > $folioAgg[$folioKey]['max_dt']) {
                    $folioAgg[$folioKey]['max_dt'] = $payDt;
                }
            }
            $ar = $stmt->affected_rows;
            if ($ar === 1) {
                $inserted++;
            } elseif ($ar === 2 || $ar === 0) {
                $updated++;
            }
        } catch (Throwable $e) {
            $failed++;
            error_log('syncChequePayments: ' . $e->getMessage());
        }
    }

    $stmt->close();
    // applyChequePaymentAggregatesToSales eliminado: chequespagos puede tener filas
    // acumulativas que inflan los importes. Los pagos se sincronizan desde cheques.tarjeta
    // /efectivo/vales/otros directamente en el módulo 'sales'.
    return [$inserted, $updated, $failed];
}

function mapChequePaymentBucket($rawId, $reference = '') {
    $txt = strtolower(trim((string)$rawId . ' ' . (string)$reference));
    $idf = strtolower(trim((string)$rawId));
    if ($idf === 'efectivo' || $idf === 'cash' || $idf === 'contado') {
        return 'cash';
    }
    if (str_contains($txt, 'tarjeta') || str_contains($txt, 'card') || $idf === 'tc' || $idf === 'td'
        || str_contains($txt, 'visa') || str_contains($txt, 'master') || str_contains($txt, 'amex')
        || str_contains($txt, 'credito') || str_contains($txt, 'debito')) {
        return 'card';
    }
    if (str_contains($txt, 'vale') || $idf === 'voucher') {
        return 'voucher';
    }
    $v = (float)preg_replace('/[^\d.\-]/', '', (string)$rawId);
    if (abs($v - 1) < 0.05) return 'cash';
    if (abs($v - 2) < 0.05) return 'card';
    if (abs($v - 3) < 0.05) return 'voucher';
    return 'other';
}

function paymentTypeFromAggregates($cash, $card, $voucher, $other) {
    $parts = 0;
    if ($cash > 0.005) $parts++;
    if ($card > 0.005) $parts++;
    if ($voucher > 0.005) $parts++;
    if ($other > 0.005) $parts++;
    if ($parts <= 0) return 'pending';
    if ($parts > 1) return 'mixed';
    if ($card > 0.005) return 'card';
    if ($voucher > 0.005) return 'voucher';
    if ($other > 0.005) return 'transfer';
    return 'cash';
}

function applyChequePaymentAggregatesToSales($conn, $folioAgg) {
    $sql = "UPDATE sr_sales
            SET cash_amount = ?,
                card_amount = ?,
                voucher_amount = ?,
                other_amount = ?,
                status = 'closed',
                payment_type = ?,
                closed_at = CASE
                    WHEN closed_at IS NULL OR closed_at < ? THEN ?
                    ELSE closed_at
                END
            WHERE REPLACE(TRIM(COALESCE(sr_ticket_id,'')), '#', '') = ?
               OR REPLACE(TRIM(COALESCE(folio,'')), '#', '') = ?
               OR REPLACE(TRIM(COALESCE(ticket_number,'')), '#', '') = ?";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        return;
    }
    foreach ($folioAgg as $folioKey => $a) {
        $cash = (float)($a['cash'] ?? 0);
        $card = (float)($a['card'] ?? 0);
        $voucher = (float)($a['voucher'] ?? 0);
        $other = (float)($a['other'] ?? 0);
        $ptype = paymentTypeFromAggregates($cash, $card, $voucher, $other);
        $closedAt = trim((string)($a['max_dt'] ?? ''));
        if ($closedAt === '') {
            $closedAt = date('Y-m-d H:i:s');
        }
        $match = (string)$folioKey;
        // 10 placeholders: 4×decimal, payment_type, closed_at×2, match×3
        $stmt->bind_param(
            'ddddssssss',
            $cash,
            $card,
            $voucher,
            $other,
            $ptype,
            $closedAt,
            $closedAt,
            $match,
            $match,
            $match
        );
        $stmt->execute();
    }
    $stmt->close();
}

function syncSaleItems($conn, $saleId, $items, $srTicketId = null) {
    // Eliminar items anteriores por sale_id o sr_ticket_id
    if ($srTicketId) {
        $deleteStmt = $conn->prepare("DELETE FROM sr_sale_items WHERE sr_ticket_id = ?");
        $deleteStmt->bind_param("s", $srTicketId);
    } else {
        $deleteStmt = $conn->prepare("DELETE FROM sr_sale_items WHERE sale_id = ?");
        $deleteStmt->bind_param("i", $saleId);
    }
    $deleteStmt->execute();
    
    // Insertar nuevos items con sr_ticket_id
    $stmt = $conn->prepare("
        INSERT INTO sr_sale_items (
            sale_id, sr_ticket_id, product_id, product_name, quantity, unit_price, discount, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    
    foreach ($items as $item) {
        $productId = $item['product_id'] ?? '';
        $productName = $item['product_name'] ?? '';
        $quantity = floatval($item['quantity'] ?? 0);
        $unitPrice = floatval($item['unit_price'] ?? 0);
        $discount = floatval($item['discount'] ?? 0);
        $subtotal = floatval($item['subtotal'] ?? ($quantity * $unitPrice - $discount));
        $ticketId = $srTicketId ?? '';
        
        $stmt->bind_param("isssdddd",
            $saleId,
            $ticketId,
            $productId,
            $productName,
            $quantity,
            $unitPrice,
            $discount,
            $subtotal
        );
        $stmt->execute();
    }
}

function syncCashMovements($conn, $movements) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_cash_movements (
            movement_id, folio_movto, movement_type, tipo_original,
            amount, amount_signed, movement_date, movement_time, movement_datetime,
            shift_id, concept, reference, user_cancel, is_tip_payment, company_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            folio_movto = VALUES(folio_movto),
            movement_type = VALUES(movement_type),
            tipo_original = VALUES(tipo_original),
            amount = VALUES(amount),
            amount_signed = VALUES(amount_signed),
            movement_date = VALUES(movement_date),
            movement_time = VALUES(movement_time),
            movement_datetime = VALUES(movement_datetime),
            shift_id = VALUES(shift_id),
            concept = VALUES(concept),
            reference = VALUES(reference),
            user_cancel = VALUES(user_cancel),
            is_tip_payment = VALUES(is_tip_payment),
            company_id = VALUES(company_id)
    ");
    
    foreach ($movements as $m) {
        try {
            // Normalizar campos (compatible con v1 y v2 del sender)
            $movementId    = trim((string)($m['movement_id'] ?? $m['sr_movement_id'] ?? ''));
            if ($movementId === '') {
                // Evitar IDs no determinísticos que generan duplicación.
                $movementId = md5(json_encode([
                    $m['movement_datetime'] ?? '',
                    $m['folio_movto'] ?? '',
                    $m['amount'] ?? 0,
                    $m['concept'] ?? '',
                    $m['shift_id'] ?? '',
                ]));
            }
            $folioMovto    = $m['folio_movto'] ?? $m['sr_movement_id'] ?? '';
            $movementType  = $m['movement_type'] ?? 'other';
            $tipoOriginal  = intval($m['tipo_original'] ?? 0);
            $amount        = floatval($m['amount'] ?? 0);
            $amountSigned  = floatval($m['amount_signed'] ?? $amount);
            $movementDate  = $m['movement_date'] ?? date('Y-m-d');
            $movementTime  = $m['movement_time'] ?? '';
            $movementDT    = $m['movement_datetime'] ?? ($movementDate . ' ' . $movementTime);
            $shiftId       = $m['shift_id'] ?? '';
            $concept       = $m['concept'] ?? $m['description'] ?? '';
            $reference     = $m['reference'] ?? '';
            $userCancel    = $m['user_cancel'] ?? '';
            $isTipPayment  = !empty($m['is_tip_payment']) ? 1 : 0;
            $companyId     = $m['company_id'] ?? '1';
            
            $stmt->bind_param("sssiddsssssssis",
                $movementId,
                $folioMovto,
                $movementType,
                $tipoOriginal,
                $amount,
                $amountSigned,
                $movementDate,
                $movementTime,
                $movementDT,
                $shiftId,
                $concept,
                $reference,
                $userCancel,
                $isTipPayment,
                $companyId
            );
            $stmt->execute();
            
            if ($stmt->affected_rows === 1 && $stmt->insert_id > 0) $inserted++;
            else $updated++;
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

function syncInventory($conn, $inventory) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_inventory (
            product_id, current_stock, min_stock, max_stock,
            last_purchase_price, last_purchase_date, last_count_date
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            current_stock = VALUES(current_stock),
            min_stock = VALUES(min_stock),
            max_stock = VALUES(max_stock),
            last_purchase_price = VALUES(last_purchase_price),
            last_purchase_date = VALUES(last_purchase_date),
            last_count_date = VALUES(last_count_date)
    ");
    
    foreach ($inventory as $i) {
        try {
            $productId = getLocalProductId($conn, $i['product_id']);
            
            if (!$productId) {
                $failed++;
                continue;
            }
            
            $stmt->bind_param("iddddss",
                $productId,
                $i['current_stock'],
                $i['min_stock'],
                $i['max_stock'],
                $i['last_purchase_price'],
                $i['last_purchase_date'],
                $i['last_count_date']
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

function syncAttendance($conn, $attendance) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
    $stmt = $conn->prepare("
        INSERT INTO sr_attendance (
            employee_id, employee_name, position, attendance_date,
            clock_in, clock_out, shift, status, minutes_worked, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            employee_name = VALUES(employee_name),
            position = VALUES(position),
            clock_out = VALUES(clock_out),
            status = VALUES(status),
            minutes_worked = VALUES(minutes_worked),
            notes = VALUES(notes)
    ");
    
    foreach ($attendance as $a) {
        try {
            $stmt->bind_param("ssssssssds",
                $a['employee_id'],
                $a['employee_name'],
                $a['position'],
                $a['date'],
                $a['clock_in'],
                $a['clock_out'],
                $a['shift'],
                $a['status'],
                $a['minutes_worked'],
                $a['notes']
            );
            $stmt->execute();
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
        } catch (Exception $e) {
            $failed++;
        }
    }
    
    return [$inserted, $updated, $failed];
}

// ── FUNCIONES AUXILIARES ───────────────────────────────────

function getLocalTableId($conn, $srTableId) {
    if (empty($srTableId)) return null;
    $stmt = $conn->prepare("SELECT id FROM sr_tables WHERE sr_table_id = ?");
    $stmt->bind_param("s", $srTableId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc()['id'] : null;
}

function getLocalEmployeeId($conn, $srEmployeeId) {
    if (empty($srEmployeeId)) return null;
    $stmt = $conn->prepare("SELECT id FROM sr_employees WHERE sr_employee_id = ?");
    $stmt->bind_param("s", $srEmployeeId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc()['id'] : null;
}

function getLocalProductId($conn, $srProductId) {
    if (empty($srProductId)) return null;
    $stmt = $conn->prepare("SELECT id FROM sr_products WHERE sr_product_id = ?");
    $stmt->bind_param("s", $srProductId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc()['id'] : null;
}

function syncTicketItems($conn, $tickets) {
    $inserted = 0; $updated = 0; $failed = 0;

    $stmtDel = $conn->prepare("DELETE FROM sr_ticket_items WHERE folio = ?");
    $stmtIns = $conn->prepare("
        INSERT INTO sr_ticket_items (folio, product_id, product_name, category, qty, unit_price, subtotal, discount, notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ");

    // Compatible con ambos formatos:
    // A) [{folio:'', items:[...]}]
    // B) [{sr_ticket_id:'', product_name:'', quantity:...}, ...]
    $normalizedTickets = [];
    foreach ($tickets as $t) {
        $isFlatRow = isset($t['sr_ticket_id']) && !isset($t['items']);
        if ($isFlatRow) {
            $folio = trim((string)($t['folio'] ?? $t['sr_ticket_id'] ?? $t['ticket_number'] ?? ''));
            if ($folio === '') continue;
            if (!isset($normalizedTickets[$folio])) {
                $normalizedTickets[$folio] = ['folio' => $folio, 'items' => []];
            }
            $normalizedTickets[$folio]['items'][] = [
                'product_id'   => $t['product_id']   ?? '',
                'product_name' => $t['product_name'] ?? '',
                'category'     => $t['category']     ?? '',
                'qty'          => $t['qty']          ?? $t['quantity'] ?? 1,
                'unit_price'   => $t['unit_price']   ?? 0,
                'subtotal'     => $t['subtotal']     ?? 0,
                'discount'     => $t['discount']     ?? 0,
                'notes'        => $t['notes']        ?? '',
            ];
            continue;
        }

        $folio = trim((string)($t['folio'] ?? ''));
        if ($folio === '') continue;
        $normalizedTickets[$folio] = $t;
    }

    foreach ($normalizedTickets as $t) {
        $folio = trim((string)($t['folio'] ?? ''));
        if ($folio === '') continue;
        try {
            $stmtDel->bind_param('s', $folio);
            $stmtDel->execute();
            foreach (($t['items'] ?? []) as $item) {
                $pid   = $item['product_id']   ?? '';
                $pname = $item['product_name'] ?? '';
                $cat   = $item['category']     ?? '';
                $qty   = floatval($item['qty']        ?? 1);
                $uprice= floatval($item['unit_price']  ?? 0);
                $sub   = floatval($item['subtotal']    ?? 0);
                $disc  = floatval($item['discount']    ?? 0);
                $notes = $item['notes']        ?? '';
                $stmtIns->bind_param('ssssdddds', $folio, $pid, $pname, $cat, $qty, $uprice, $sub, $disc, $notes);
                $stmtIns->execute();
                $inserted++;
            }
            $updated++;
        } catch (Exception $e) { $failed++; }
    }
    return [$inserted, $updated, $failed];
}

function getLocalSaleId($conn, $srTicketId) {
    $stmt = $conn->prepare("SELECT id FROM sr_sales WHERE sr_ticket_id = ?");
    $stmt->bind_param("s", $srTicketId);
    $stmt->execute();
    $result = $stmt->get_result();
    return $result->num_rows > 0 ? $result->fetch_assoc()['id'] : null;
}

function syncShifts($conn, $shifts) {
    $inserted = 0;
    $updated  = 0;
    $failed   = 0;

    $stmt = $conn->prepare("
        INSERT INTO sr_shifts (
            sr_shift_id, sr_turno_id, cajero, estacion,
            apertura, cierre, fondo,
            declarado_efectivo, declarado_tarjeta,
            declarado_vales, declarado_credito, company_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            sr_turno_id         = VALUES(sr_turno_id),
            cajero              = VALUES(cajero),
            estacion            = VALUES(estacion),
            apertura            = VALUES(apertura),
            cierre              = VALUES(cierre),
            fondo               = VALUES(fondo),
            declarado_efectivo  = VALUES(declarado_efectivo),
            declarado_tarjeta   = VALUES(declarado_tarjeta),
            declarado_vales     = VALUES(declarado_vales),
            declarado_credito   = VALUES(declarado_credito),
            company_id          = VALUES(company_id)
    ");

    foreach ($shifts as $s) {
        try {
            $shiftId   = $s['sr_shift_id']        ?? '';
            $turnoId   = $s['sr_turno_id']         ?? '';
            $cajero    = $s['cajero']              ?? '';
            $estacion  = $s['estacion']            ?? '';
            $apertura  = $s['apertura']            ?? null;
            $cierre    = $s['cierre']              ?? null;
            $fondo     = floatval($s['fondo']              ?? 0);
            $efectivo  = floatval($s['declarado_efectivo'] ?? 0);
            $tarjeta   = floatval($s['declarado_tarjeta']  ?? 0);
            $vales     = floatval($s['declarado_vales']    ?? 0);
            $credito   = floatval($s['declarado_credito']  ?? 0);
            $company   = $s['company_id']          ?? '';

            $stmt->bind_param('ssssssddddds',
                $shiftId, $turnoId, $cajero, $estacion,
                $apertura, $cierre, $fondo,
                $efectivo, $tarjeta, $vales, $credito, $company
            );
            $stmt->execute();
            if ($stmt->affected_rows === 1 && $stmt->insert_id > 0) $inserted++;
            else $updated++;
        } catch (Exception $e) {
            $failed++;
        }
    }
    return [$inserted, $updated, $failed];
}

/**
 * Folio/canón SR normalizado para cruzar cancelaciones.cancelaciones ↔ sr_sales.{sr_ticket_id,folio,ticket_number}.
 */
function bonifacios_normalize_sr_sale_identity(?string $raw): string {
    $t = strtolower(trim(str_replace(['#'], '', trim((string) $raw))));
    return $t;
}

function syncCancellationsData($conn, $cancellations) {
    $inserted = 0;
    $updated  = 0;
    $failed   = 0;

    // Crear tabla si no existe (es posible que no haya sido creada aún en esta instalación).
    // La tabla NO tiene clave única compuesta ticket_number+cancel_date intencionalmente:
    // se gestiona por DELETE+INSERT para evitar filas duplicadas cuando fechacancelado
    // cambia de NULL→valor real en un ciclo posterior del sync.
    $conn->query("CREATE TABLE IF NOT EXISTS sr_cancellations (
        id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
        ticket_number VARCHAR(64)     NOT NULL,
        amount        DECIMAL(14,4)   NOT NULL DEFAULT 0.0000,
        user_name     VARCHAR(120)    NOT NULL DEFAULT '',
        reason        VARCHAR(255)    NOT NULL DEFAULT '',
        cancel_date   DATETIME        NOT NULL,
        created_at    TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at    TIMESTAMP       NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_sr_cancellations_ticket (ticket_number),
        KEY idx_sr_cancellations_date (cancel_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    // Deduplicar por ticket_number (no por la clave compuesta ticket_number+cancel_date).
    // Razón: SR frecuentemente no llena fechacancelado → el sync usa fecha como fallback.
    // Si en un ciclo posterior SR puebla fechacancelado, la clave compuesta generaría
    // una segunda fila para el mismo ticket. Con DELETE+INSERT garantizamos 1 fila por ticket.
    $stmtDel = $conn->prepare("DELETE FROM sr_cancellations WHERE ticket_number = ?");

    $stmtInsert = $conn->prepare("
        INSERT INTO sr_cancellations (ticket_number, amount, user_name, reason, cancel_date)
        VALUES (?, ?, ?, ?, ?)
    ");

    // Marcar sr_sales como cancelado para que los KPIs no lo cuenten como venta cobrada.
    // Cruza sr_ticket_id (= folio SR) y las variantes folio/ticket_number (= numcheque).
    $stmtMarkCancelled = $conn->prepare("
        UPDATE sr_sales
        SET status = 'cancelled',
            closed_at = CASE
                WHEN closed_at IS NULL OR closed_at IN ('','0000-00-00 00:00:00') THEN NOW()
                ELSE closed_at END
        WHERE LOWER(TRIM(COALESCE(status,''))) NOT IN ('cancelled','canceled','cancelado')
          AND (
            LOWER(TRIM(REPLACE(CAST(sr_ticket_id AS CHAR), '#', ''))) = ?
            OR LOWER(TRIM(REPLACE(CAST(folio AS CHAR), '#', ''))) = ?
            OR LOWER(TRIM(REPLACE(CAST(ticket_number AS CHAR), '#', ''))) = ?
          )
    ");

    foreach ($cancellations as $c) {
        try {
            $ticketNumber = trim((string) ($c['ticket_number'] ?? ''));
            $amount       = floatval($c['amount'] ?? 0);
            $userName     = (string) ($c['user_name'] ?? '');
            $reason       = (string) ($c['reason'] ?? '');
            $cancelDate   = $c['cancel_date'] ?? date('Y-m-d H:i:s');

            if ($ticketNumber === '') {
                $failed++;
                continue;
            }

            // DELETE existente (puede no existir → affected_rows = 0)
            $stmtDel->bind_param('s', $ticketNumber);
            $stmtDel->execute();
            $wasExisting = $stmtDel->affected_rows > 0;

            // INSERT fresco
            $stmtInsert->bind_param('sdsss', $ticketNumber, $amount, $userName, $reason, $cancelDate);
            $stmtInsert->execute();

            if ($wasExisting) $updated++;
            else $inserted++;

            // Marcar todas las variantes coincidentes en sr_sales.
            $k = bonifacios_normalize_sr_sale_identity($ticketNumber);
            if ($k !== '') {
                $stmtMarkCancelled->bind_param('sss', $k, $k, $k);
                $stmtMarkCancelled->execute();
            }

        } catch (Exception $e) {
            $failed++;
        }
    }

    return [$inserted, $updated, $failed];
}

/**
 * Sincroniza estado POS por mesa (mapa de reservaciones / dashboard).
 * Payload: array de { table_code: 'M1'|'T17'|..., state: 'free'|'open_ticket'|'printed_unpaid' }
 * Alineado con api/reservations/pos-table-state.php y assign-table.php (códigos SR).
 */
function bonifacios_sr_pos_table_code_valid(string $c): bool
{
    $c = strtoupper(trim($c));
    if ($c === '') {
        return false;
    }
    if (preg_match('/^(CD|TA|TB)-\d+$/', $c)) {
        return true;
    }
    if (preg_match('/^M([1-9]|1[0-1])$/', $c)) {
        return true;
    }
    if (preg_match('/^T(1[6-9]|2[0-2])$/', $c)) {
        return true;
    }
    if (preg_match('/^TB[1-8]$/', $c)) {
        return true;
    }
    if (preg_match('/^BARR-I[1-5]$/', $c) || preg_match('/^BARR-E[1-5]$/', $c)) {
        return true;
    }

    return false;
}

function syncPosTableLiveStates($conn, $data)
{
    require_once __DIR__ . '/../lib/table_venue_codes.php';

    $inserted = 0;
    $updated = 0;
    $failed = 0;

    try {
        $conn->query("CREATE TABLE IF NOT EXISTS pos_table_live_state (
            table_code VARCHAR(32) NOT NULL,
            state ENUM('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (table_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Exception $e) {
        // ignorar si no hay permiso; el resto fallará de forma visible
    }

    $stmtDel = $conn->prepare('DELETE FROM pos_table_live_state WHERE table_code = ?');
    $stmtUp = $conn->prepare(
        'INSERT INTO pos_table_live_state (table_code, state) VALUES (?, ?)
         ON DUPLICATE KEY UPDATE state = VALUES(state), updated_at = CURRENT_TIMESTAMP'
    );

    foreach ($data as $row) {
        if (!is_array($row)) {
            $failed++;
            continue;
        }
        $rawCode = strtoupper(trim((string) ($row['table_code'] ?? '')));
        $code = bonifacios_table_canonical_venue_code($rawCode) ?? $rawCode;
        $state = trim((string) ($row['state'] ?? ''));
        if (!bonifacios_sr_pos_table_code_valid($code) || !in_array($state, ['free', 'open_ticket', 'printed_unpaid'], true)) {
            $failed++;
            continue;
        }
        try {
            if ($state === 'free') {
                $stmtDel->bind_param('s', $code);
                $stmtDel->execute();
                if ($stmtDel->affected_rows > 0) {
                    $updated++;
                }
            } else {
                $stmtUp->bind_param('ss', $code, $state);
                $stmtUp->execute();
                $ar = $stmtUp->affected_rows;
                if ($ar === 1) {
                    $inserted++;
                } elseif ($ar === 2) {
                    $updated++;
                } else {
                    $inserted++;
                }
            }
        } catch (Exception $e) {
            $failed++;
        }
    }

    return [$inserted, $updated, $failed];
}
?>
