<?php
/**
 * API Endpoint para recibir sincronización de SoftRestaurant 8.0
 * Recibe datos de todos los módulos y los almacena en la BD
 */

require_once '../config/database.php';
header('Content-Type: application/json');

// Verificar API Key (compatible con diferentes configuraciones de servidor)
$apiKey = '';
if (function_exists('getallheaders')) {
    $headers = getallheaders();
    $apiKey = $headers['X-API-Key'] ?? $headers['X-Api-Key'] ?? '';
}
if (empty($apiKey)) {
    $apiKey = $_SERVER['HTTP_X_API_KEY'] ?? '';
}

if ($apiKey !== 'bonifacios-sr-sync-2024-secret-key') {
    http_response_code(401);
    echo json_encode([
        'error' => 'API Key inválida',
        'received' => $apiKey,
        'debug' => 'Check X-API-Key header'
    ]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

try {
    $conn = getConnection();

    $input = json_decode(file_get_contents('php://input'), true);
    
    $module = $input['module'] ?? '';
    $data = $input['data'] ?? [];
    $syncDatetime = $input['sync_datetime'] ?? date('Y-m-d H:i:s');
    
    if (empty($module) || empty($data)) {
        http_response_code(400);
        echo json_encode(['error' => 'Módulo y datos requeridos']);
        exit;
    }
    
    // Iniciar log de sincronización
    $logStmt = $conn->prepare("
        INSERT INTO sr_sync_log (module_name, sync_started_at, status)
        VALUES (?, NOW(), 'running')
    ");
    $logStmt->bind_param("s", $module);
    $logStmt->execute();
    $logId = $logStmt->insert_id;
    
    $inserted = 0;
    $updated = 0;
    $failed = 0;
    
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
            
        default:
            http_response_code(400);
            echo json_encode(['error' => 'Módulo no reconocido']);
            exit;
    }
    
    // Actualizar log de sincronización
    $status = $failed > 0 ? 'failed' : 'completed';
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
    $totalProcessed = $inserted + $updated + $failed;
    $updateLogStmt->bind_param("iiiisi", $totalProcessed, $inserted, $updated, $failed, $status, $logId);
    $updateLogStmt->execute();
    
    // Actualizar configuración del módulo
    $updateConfigStmt = $conn->prepare("
        UPDATE sr_sync_config 
        SET last_sync_at = NOW(),
            sync_status = 'success',
            records_synced = ?
        WHERE module_name = ?
    ");
    $updateConfigStmt->bind_param("is", $totalProcessed, $module);
    $updateConfigStmt->execute();
    
    $resp = [
        'success'  => true,
        'module'   => $module,
        'inserted' => $inserted,
        'updated'  => $updated,
        'failed'   => $failed,
        'total'    => $totalProcessed,
    ];
    if (!empty($lastSyncError)) $resp['last_error'] = $lastSyncError;
    echo json_encode($resp);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();

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
            $stmt->bind_param("ssssssisssd",
                $e['sr_employee_id'],
                $e['employee_code'],
                $e['full_name'],
                $e['position'],
                $e['department'],
                $e['is_waiter'],
                $e['is_active'],
                $e['hire_date'],
                $e['phone'],
                $e['email'],
                $e['commission_rate']
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

function syncSales($conn, $sales) {
    $inserted  = 0;
    $updated   = 0;
    $failed    = 0;
    $lastError = null;

    // Asegurarse de que autocommit esté activo (sin transacciones pendientes)
    $conn->autocommit(true);

    foreach ($sales as $sale) {
        try {
            $status = $sale['status'] ?? 'open';
            if ($status === 'canceled') $status = 'cancelled';
            if (!in_array($status, ['open', 'closed', 'cancelled'])) $status = 'open';

            $srId        = $conn->escape_string($sale['sr_ticket_id']   ?? '');
            $ticketNum   = $conn->escape_string($sale['ticket_number']  ?? '');
            $folio       = $conn->escape_string($sale['folio']          ?? $sale['ticket_number'] ?? '');
            $saleDate    = $conn->escape_string($sale['sale_date']      ?? '');
            $saleTime    = $conn->escape_string($sale['sale_time']      ?? '');
            $saleDt      = $conn->escape_string($sale['sale_datetime']  ?? '');
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

            $sql = "INSERT INTO sr_sales (
                        sr_ticket_id, ticket_number, folio,
                        sale_date, sale_time, sale_datetime,
                        table_id, table_number, waiter_id, waiter_name, covers,
                        subtotal, tax, discount, tip, tip_paid, total,
                        status, payment_type,
                        cash_amount, card_amount, voucher_amount, other_amount,
                        opened_at, closed_at
                    ) VALUES (
                        '$srId', '$ticketNum', '$folio',
                        '$saleDate', '$saleTime', '$saleDt',
                        NULL, '$tableNum', NULL, '$waiterName', $covers,
                        $sub, $tax, $disc, $tip, $tipPaid, $total,
                        '$status', '$payType',
                        $cash, $card, $voucher, $other,
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
                        status          = VALUES(status),
                        payment_type    = VALUES(payment_type),
                        cash_amount     = VALUES(cash_amount),
                        card_amount     = VALUES(card_amount),
                        voucher_amount  = VALUES(voucher_amount),
                        other_amount    = VALUES(other_amount),
                        opened_at       = VALUES(opened_at),
                        closed_at       = VALUES(closed_at)";

            if ($conn->query($sql) === false) {
                throw new Exception($conn->error);
            }

            $affectedRows = $conn->affected_rows;
            $insertId     = $conn->insert_id;

            if (!empty($sale['items'])) {
                $saleId = $insertId > 0 ? $insertId : getLocalSaleId($conn, $sale['sr_ticket_id']);
                syncSaleItems($conn, $saleId, $sale['items'], $sale['sr_ticket_id']);
            }

            if ($affectedRows > 0) {
                $insertId > 0 ? $inserted++ : $updated++;
            } else {
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
            $movementId    = $m['movement_id'] ?? $m['sr_movement_id'] ?? uniqid('mov_');
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
            
            if ($stmt->affected_rows > 0) {
                $stmt->insert_id > 0 ? $inserted++ : $updated++;
            }
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

    foreach ($tickets as $t) {
        $folio = $conn->real_escape_string($t['folio'] ?? '');
        if (!$folio) continue;
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
            $stmt->affected_rows > 0 ? ($stmt->insert_id > 0 ? $inserted++ : $updated++) : null;
        } catch (Exception $e) {
            $failed++;
        }
    }
    return [$inserted, $updated, $failed];
}

function syncCancellationsData($conn, $cancellations) {
    $inserted = 0;
    $updated = 0;
    $failed = 0;

    $stmtInsert = $conn->prepare("
        INSERT INTO sr_cancellations (ticket_number, amount, user_name, reason, cancel_date)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            amount = VALUES(amount),
            user_name = VALUES(user_name),
            reason = VALUES(reason)
    ");

    $stmtMarkCancelled = $conn->prepare("
        UPDATE sr_sales SET status = 'cancelled', closed_at = NOW()
        WHERE folio = ? AND status = 'open'
    ");

    foreach ($cancellations as $c) {
        try {
            $ticketNumber = $c['ticket_number'] ?? '';
            $amount       = floatval($c['amount'] ?? 0);
            $userName     = $c['user_name'] ?? '';
            $reason       = $c['reason'] ?? '';
            $cancelDate   = $c['cancel_date'] ?? date('Y-m-d H:i:s');

            $stmtInsert->bind_param('sdsss', $ticketNumber, $amount, $userName, $reason, $cancelDate);
            $stmtInsert->execute();

            if ($stmtInsert->affected_rows > 0) {
                $stmtInsert->insert_id > 0 ? $inserted++ : $updated++;
            }

            // Marcar como cancelado en sr_sales para que salga de conteos abiertos
            $stmtMarkCancelled->bind_param('s', $ticketNumber);
            $stmtMarkCancelled->execute();

        } catch (Exception $e) {
            $failed++;
        }
    }

    return [$inserted, $updated, $failed];
}
?>
