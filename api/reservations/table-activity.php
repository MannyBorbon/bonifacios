<?php
/**
 * Actividad de una mesa canónica: reservas del día (filtro dashboard) + POS + ticket SR abierto.
 *
 * GET: table_code, date (Y-m-d), event, event_type_id
 */
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';
require_once __DIR__ . '/../lib/reservation_floor_event_sql.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

/**
 * @return list<array{product_name:string,quantity:float,unit_price:float,discount:float,subtotal:float,notes:string}>
 */
function bonifacios_table_activity_load_sale_items($conn, int $saleId, string $srTicketId): array
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

    $venueIn = trim((string) ($_GET['table_code'] ?? ''));
    $date = trim((string) ($_GET['date'] ?? ''));
    if ($venueIn === '' || $date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'table_code y date (YYYY-MM-DD) son requeridos']);
        exit;
    }

    $want = strtoupper($venueIn);

    try {
        $conn->query('ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion');
    } catch (Throwable $e) { /* ignore */
    }

    try {
        $conn->query(
            'ALTER TABLE special_reservations ADD COLUMN secondary_table_code VARCHAR(32) NULL DEFAULT NULL AFTER table_code',
        );
    } catch (Throwable $e) { /* ignore */
    }

    try {
        $conn->query("CREATE TABLE IF NOT EXISTS pos_table_live_state (
            table_code VARCHAR(32) NOT NULL,
            state ENUM('free','open_ticket','printed_unpaid') NOT NULL DEFAULT 'free',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (table_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");
    } catch (Throwable $e) { /* ignore */
    }

    $event = trim((string) ($_GET['event'] ?? ''));
    $eventTypeId = trim((string) ($_GET['event_type_id'] ?? ''));
    $mode = strtolower(trim((string) ($_GET['mode'] ?? 'calendar_day')));
    if ($mode !== 'sr_shift' && $mode !== 'calendar_day') {
        $mode = 'calendar_day';
    }

    [$eventSql, $eventTypes, $eventParams] = bonifacios_floor_event_sql($event, $eventTypeId);

    $types = 's';
    $params = [$date];
    $sql = "SELECT sr.id, sr.customer_name, sr.phone, sr.email, sr.guests, sr.table_code, sr.secondary_table_code,
                   sr.reservation_date, sr.reservation_time, sr.status, sr.deposit_status, sr.notes, sr.occasion, sr.event_type_id,
                   ret.name AS event_type_name, ret.slug AS event_type_slug
            FROM special_reservations sr
            LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
            WHERE sr.reservation_date = ?
              AND sr.table_code IS NOT NULL AND TRIM(sr.table_code) <> ''
              AND sr.status <> 'cancelled'
              AND (sr.status IN ('pending','confirmed','completed') OR sr.deposit_status IN ('uploaded','confirmed'))";
    $sql .= $eventSql;
    $types .= $eventTypes;
    $params = array_merge($params, $eventParams);

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Prepare falló');
    }
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
    $rs = $stmt->get_result();

    $reservationsMatching = [];
    if ($rs) {
        while ($row = $rs->fetch_assoc()) {
            $vn = bonifacios_table_canonical_venue_code((string) ($row['table_code'] ?? ''));
            $vnSec = bonifacios_table_canonical_venue_code((string) ($row['secondary_table_code'] ?? ''));
            $hitPrimary = $vn !== null && strtoupper(trim((string) $vn)) === $want;
            $hitSecondary = $vnSec !== null && strtoupper(trim((string) $vnSec)) === $want;
            if (!$hitPrimary && !$hitSecondary) {
                continue;
            }
            unset($row['password']);
            $reservationsMatching[] = $row;
        }
    }

    $posState = bonifacios_pos_effective_state_for_venue($conn, $want);

    $ticketBlockOk = true;
    $ticket = null;
    try {
        $chk = $conn->query("SHOW TABLES LIKE 'sr_sales'");
        if ($chk && $chk->num_rows > 0) {
            $saleSql = "SELECT id, sr_ticket_id, ticket_number, folio, sale_date, sale_time, sale_datetime,
                table_number, waiter_name, covers, subtotal, tax, discount, tip, total, status, payment_type,
                cash_amount, card_amount, voucher_amount, other_amount, opened_at
                FROM sr_sales WHERE status = 'open'
                ORDER BY sale_datetime DESC LIMIT 220";
            if ($sr = $conn->query($saleSql)) {
                while ($row = $sr->fetch_assoc()) {
                    if (!bonifacios_sr_sale_row_matches_business_day($date, $row)) {
                        continue;
                    }
                    $vn = bonifacios_table_canonical_venue_code((string) ($row['table_number'] ?? ''));
                    if ($vn === null || strtoupper(trim($vn)) !== $want) {
                        continue;
                    }
                    $sid = (int) ($row['id'] ?? 0);
                    $tid = (string) ($row['sr_ticket_id'] ?? '');
                    $items = bonifacios_table_activity_load_sale_items($conn, $sid, $tid);
                    $ticket = [
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
                            'opened_at' => (string) ($row['opened_at'] ?? ''),
                        ],
                        'items' => $items,
                    ];
                    break;
                }
            }
        }
    } catch (Throwable $e) {
        $ticketBlockOk = false;
        $ticket = null;
    }

    echo json_encode([
        'success' => true,
        'mode' => $mode,
        'venue_code' => $want,
        'date' => $date,
        'event' => $event,
        'event_type_id' => $eventTypeId,
        'reservations' => $reservationsMatching,
        'pos_state' => $posState,
        'sr_open_ticket' => $ticket,
        'meta' => [
            'generated_at' => date('c'),
            'ticket_block_ok' => $ticketBlockOk,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
