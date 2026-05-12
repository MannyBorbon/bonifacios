<?php
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';
require_once __DIR__ . '/../lib/reservation_floor_event_sql.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

/**
 * @return list<array{product_name:string,quantity:float,unit_price:float,discount:float,subtotal:float,notes:string}>
 */
function bonifacios_load_sale_items($conn, int $saleId, string $srTicketId): array
{
    $items = [];
    if ($saleId > 0) {
        $q = $conn->prepare('SELECT product_name, quantity, unit_price, discount, subtotal, notes FROM sr_sale_items WHERE sale_id = ? ORDER BY id ASC LIMIT 150');
        if ($q) {
            $q->bind_param('i', $saleId);
            $q->execute();
            if ($r = $q->get_result()) {
                while ($row = $r->fetch_assoc()) {
                    $items[] = [
                        'product_name' => (string) ($row['product_name'] ?? ''),
                        'quantity' => (float) ($row['quantity'] ?? 0),
                        'unit_price' => (float) ($row['unit_price'] ?? 0),
                        'discount' => (float) ($row['discount'] ?? 0),
                        'subtotal' => (float) ($row['subtotal'] ?? 0),
                        'notes' => (string) ($row['notes'] ?? ''),
                    ];
                }
            }
        }
    }
    if ($items === [] && $srTicketId !== '') {
        $q2 = $conn->prepare('SELECT product_name, quantity, unit_price, discount, subtotal, notes FROM sr_sale_items WHERE sr_ticket_id = ? ORDER BY id ASC LIMIT 150');
        if ($q2) {
            $q2->bind_param('s', $srTicketId);
            $q2->execute();
            if ($r2 = $q2->get_result()) {
                while ($row = $r2->fetch_assoc()) {
                    $items[] = [
                        'product_name' => (string) ($row['product_name'] ?? ''),
                        'quantity' => (float) ($row['quantity'] ?? 0),
                        'unit_price' => (float) ($row['unit_price'] ?? 0),
                        'discount' => (float) ($row['discount'] ?? 0),
                        'subtotal' => (float) ($row['subtotal'] ?? 0),
                        'notes' => (string) ($row['notes'] ?? ''),
                    ];
                }
            }
        }
    }

    return $items;
}

try {
    requireAuth();
    $conn = getConnection();

    $date = trim((string) ($_GET['date'] ?? ''));
    $time = trim((string) ($_GET['time'] ?? ''));
    $event = trim((string) ($_GET['event'] ?? ''));
    $eventTypeId = trim((string) ($_GET['event_type_id'] ?? ''));

    if ($date === '') {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Parametro date requerido (YYYY-MM-DD)']);
        exit;
    }

    try {
        $conn->query("CREATE TABLE IF NOT EXISTS pos_table_live_state (
            table_code VARCHAR(32) NOT NULL,
            state ENUM('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (table_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) { /* ignore */ }

    try {
        $conn->query('ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion');
    } catch (Throwable $e) { /* ignore */ }

    try {
        $conn->query(
            'ALTER TABLE special_reservations ADD COLUMN secondary_table_code VARCHAR(32) NULL DEFAULT NULL AFTER table_code',
        );
    } catch (Throwable $e) { /* ignore */
    }

    [$eventSql, $eventTypes, $eventParams] = bonifacios_floor_event_sql($event, $eventTypeId);

    $types = 's';
    $params = [$date];
    $sql = "SELECT sr.id, sr.customer_name, sr.phone, sr.email, sr.table_code, sr.secondary_table_code,
                   sr.reservation_time, sr.reservation_date, sr.status, sr.deposit_status, sr.guests,
                   sr.notes, sr.occasion, sr.event_type_id, ret.name AS event_type_name, ret.slug AS event_type_slug
            FROM special_reservations sr
            LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
            WHERE sr.reservation_date = ?
              AND sr.table_code IS NOT NULL AND TRIM(sr.table_code) <> ''
              AND sr.status NOT IN ('cancelled','completed')
              AND (sr.status IN ('pending','confirmed') OR sr.deposit_status IN ('uploaded','confirmed'))";
    $sql .= $eventSql;
    $types .= $eventTypes;
    $params = array_merge($params, $eventParams);

    if ($time !== '') {
        $hm = strlen($time) >= 5 ? substr($time, 0, 5) : $time;
        $sql .= " AND DATE_FORMAT(sr.reservation_time, '%H:%i') = ?";
        $types .= 's';
        $params[] = $hm;
    }

    $stmt = $conn->prepare($sql);
    if ($params !== []) {
        if (PHP_VERSION_ID >= 80100) {
            $stmt->bind_param($types, ...$params);
        } else {
            $refs = [];
            foreach ($params as $k => $v) {
                $refs[$k] = &$params[$k];
            }
            array_unshift($refs, $types);
            call_user_func_array([$stmt, 'bind_param'], $refs);
        }
    }
    $stmt->execute();
    $res = $stmt->get_result();

    $byCode = [];
    while ($row = $res->fetch_assoc()) {
        $raw = strtoupper(trim((string) ($row['table_code'] ?? '')));
        if ($raw === '') {
            continue;
        }
        $vn = bonifacios_table_canonical_venue_code($raw) ?? $raw;
        if ($vn !== '' && !isset($byCode[$vn])) {
            $byCode[$vn] = $row;
        }
        $raw2 = strtoupper(trim((string) ($row['secondary_table_code'] ?? '')));
        if ($raw2 !== '') {
            $vn2 = bonifacios_table_canonical_venue_code($raw2) ?? $raw2;
            if ($vn2 !== '' && !isset($byCode[$vn2])) {
                $byCode[$vn2] = $row;
            }
        }
    }

    // Impreso sin cobrar gana sobre cuenta abierta (misma mesa, estados mezclados en filas legacy).
    $prio = ['free' => 0, 'open_ticket' => 1, 'printed_unpaid' => 2];
    $pos = [];
    $posRowsRead = 0;
    $pr = $conn->query('SELECT table_code, state FROM pos_table_live_state');
    if ($pr) {
        while ($row = $pr->fetch_assoc()) {
            ++$posRowsRead;
            $raw = strtoupper(trim((string) ($row['table_code'] ?? '')));
            $st = (string) ($row['state'] ?? 'free');
            $vn = bonifacios_table_canonical_venue_code($raw);
            if ($vn === null || $vn === '') {
                continue;
            }
            if (!isset($pos[$vn]) || ($prio[$st] ?? 0) > ($prio[$pos[$vn]] ?? 0)) {
                $pos[$vn] = $st;
            }
        }
    }

    $ticketByCode = [];
    $ticketBlockOk = true;
    try {
        $chk = $conn->query("SHOW TABLES LIKE 'sr_sales'");
        if ($chk && $chk->num_rows > 0) {
            // Idempotente: si la columna ya existe, mysqli devuelve error y se ignora.
            @$conn->query('ALTER TABLE sr_sales ADD COLUMN receipt_printed TINYINT(1) NOT NULL DEFAULT 0');
            $saleSql = "SELECT id, sr_ticket_id, ticket_number, folio, sale_date, sale_time, sale_datetime,
                table_number, waiter_name, covers, subtotal, tax, discount, tip, total, status, payment_type,
                cash_amount, card_amount, voucher_amount, other_amount,
                IFNULL(receipt_printed, 0) AS receipt_printed,
                opened_at
                FROM sr_sales WHERE status = 'open'
                ORDER BY sale_datetime DESC LIMIT 120";
            if ($sr = $conn->query($saleSql)) {
                $seenVenue = [];
                while ($row = $sr->fetch_assoc()) {
                    if (!bonifacios_sr_sale_row_matches_business_day($date, $row)) {
                        continue;
                    }
                    $vn = bonifacios_table_canonical_venue_code((string) ($row['table_number'] ?? ''));
                    if ($vn === null || $vn === '') {
                        continue;
                    }
                    $vnU = strtoupper($vn);
                    if (isset($seenVenue[$vnU])) {
                        continue;
                    }
                    $seenVenue[$vnU] = true;
                    $sid = (int) ($row['id'] ?? 0);
                    $tid = (string) ($row['sr_ticket_id'] ?? '');
                    $items = bonifacios_load_sale_items($conn, $sid, $tid);
                    $ticketByCode[$vnU] = [
                        'sale' => [
                            'sr_ticket_id' => $tid,
                            'ticket_number' => (string) ($row['ticket_number'] ?? ''),
                            'folio' => (string) ($row['folio'] ?? ''),
                            'sale_date' => (string) ($row['sale_date'] ?? ''),
                            'sale_time' => (string) ($row['sale_time'] ?? ''),
                            'sale_datetime' => (string) ($row['sale_datetime'] ?? ''),
                            'table_number_raw' => (string) ($row['table_number'] ?? ''),
                            'waiter_name' => (string) ($row['waiter_name'] ?? ''),
                            'covers' => (int) ($row['covers'] ?? 0),
                            'subtotal' => (float) ($row['subtotal'] ?? 0),
                            'tax' => (float) ($row['tax'] ?? 0),
                            'discount' => (float) ($row['discount'] ?? 0),
                            'tip' => (float) ($row['tip'] ?? 0),
                            'total' => (float) ($row['total'] ?? 0),
                            'payment_type' => (string) ($row['payment_type'] ?? ''),
                            'cash_amount' => (float) ($row['cash_amount'] ?? 0),
                            'card_amount' => (float) ($row['card_amount'] ?? 0),
                            'voucher_amount' => (float) ($row['voucher_amount'] ?? 0),
                            'other_amount' => (float) ($row['other_amount'] ?? 0),
                            'receipt_printed' => ((int) ($row['receipt_printed'] ?? 0)) === 1 ? 1 : 0,
                            'opened_at' => (string) ($row['opened_at'] ?? ''),
                        ],
                        'items' => $items,
                    ];
                }
            }
        }
    } catch (Throwable $e) {
        $ticketByCode = [];
        $ticketBlockOk = false;
    }

    $reservationCodesCount = count($byCode);
    $posVenueCodesCount = count($pos);
    $ticketCodesCount = count($ticketByCode);
    $generatedAt = date('c');

    echo json_encode([
        'success' => true,
        'date' => $date,
        'time_filter' => $time,
        'event' => $event,
        'event_type_id' => $eventTypeId,
        'reservation_by_code' => $byCode,
        'pos_by_code' => $pos,
        'ticket_by_code' => $ticketByCode,
        'meta' => [
            'generated_at' => $generatedAt,
            'reservation_codes_count' => $reservationCodesCount,
            'pos_venue_codes_count' => $posVenueCodesCount,
            'pos_rows_read' => $posRowsRead,
            'ticket_codes_count' => $ticketCodesCount,
            'ticket_block_ok' => $ticketBlockOk,
            'ticket_business_day' => $date,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
