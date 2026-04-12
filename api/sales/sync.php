<?php
/**
 * SoftRestaurant 8.0 → Bonifacios API Sync Endpoint
 * Recibe transacciones del script local y las guarda en BD.
 * POST /api/sales/sync.php
 */
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, X-API-Key');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); echo json_encode(['success' => false, 'error' => 'Method not allowed']); exit;
}

require_once __DIR__ . '/../config/database.php';

// ── Auth: API Key ──────────────────────────────────────────────────────────
$apiKey = $_SERVER['HTTP_X_API_KEY'] ?? ($_GET['api_key'] ?? '');
if (empty($apiKey)) {
    http_response_code(401); echo json_encode(['success' => false, 'error' => 'API key required']); exit;
}

$conn = getConnection();
$stmt = $conn->prepare("SELECT id FROM sales_api_keys WHERE api_key = ? AND active = 1 LIMIT 1");
$stmt->bind_param('s', $apiKey);
$stmt->execute();
if ($stmt->get_result()->num_rows === 0) {
    http_response_code(403); echo json_encode(['success' => false, 'error' => 'Invalid API key']); exit;
}
$stmt->close();
$conn->query("UPDATE sales_api_keys SET last_used = NOW() WHERE api_key = '" . $conn->real_escape_string($apiKey) . "'");

// ── Parse payload ──────────────────────────────────────────────────────────
$raw = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!$body) {
    http_response_code(400); echo json_encode(['success' => false, 'error' => 'Invalid JSON']); exit;
}

$syncDate      = $body['sync_date']     ?? date('Y-m-d');
$transactions  = $body['transactions']  ?? [];
$dailySummary  = $body['daily_summary'] ?? null;

$inserted = 0; $updated = 0; $errors = [];

// ── Save individual transactions ───────────────────────────────────────────
foreach ($transactions as $tx) {
    $ticketId    = $tx['ticket_id']    ?? null;
    $txDate      = $tx['date']         ?? $syncDate;
    $txDatetime  = $tx['datetime']     ?? null;
    $amount      = floatval($tx['amount']     ?? 0);
    $tip         = floatval($tx['tip']        ?? 0);
    $payType     = $tx['payment_type'] ?? 'efectivo';
    $table       = $tx['table']        ?? null;
    $covers      = intval($tx['covers']  ?? 1);
    $waiter      = $tx['waiter']       ?? null;
    $items       = intval($tx['items']   ?? 0);
    $status      = $tx['status']       ?? 'closed';

    if (!$ticketId) continue;

    $stmt = $conn->prepare(
        "INSERT INTO sales_transactions
            (sr_ticket_id, sale_date, sale_datetime, amount, tip_amount, payment_type, table_number, covers, waiter, items_count, status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)
         ON DUPLICATE KEY UPDATE
            sale_datetime=VALUES(sale_datetime), amount=VALUES(amount),
            tip_amount=VALUES(tip_amount), payment_type=VALUES(payment_type),
            covers=VALUES(covers), waiter=VALUES(waiter), items_count=VALUES(items_count), status=VALUES(status)"
    );
    $stmt->bind_param('sssddssisis', $ticketId, $txDate, $txDatetime, $amount, $tip, $payType, $table, $covers, $waiter, $items, $status);
    if ($stmt->execute()) {
        $stmt->affected_rows === 1 ? $inserted++ : $updated++;
    } else {
        $errors[] = $stmt->error;
    }
    $stmt->close();
}

// ── Auto-aggregate daily totals from transactions ──────────────────────────
$aggStmt = $conn->prepare(
    "INSERT INTO sales_daily (sale_date, cash_amount, card_amount, other_amount, covers, tickets, source)
     SELECT
        sale_date,
        IFNULL(SUM(CASE WHEN payment_type='efectivo' THEN amount ELSE 0 END), 0),
        IFNULL(SUM(CASE WHEN payment_type='tarjeta' THEN amount ELSE 0 END), 0),
        IFNULL(SUM(CASE WHEN payment_type NOT IN ('efectivo','tarjeta') THEN amount ELSE 0 END), 0),
        IFNULL(SUM(covers), 0),
        COUNT(*),
        'softrestaurant'
     FROM sales_transactions
     WHERE sale_date = ? AND status != 'cancelled'
     GROUP BY sale_date
     ON DUPLICATE KEY UPDATE
        cash_amount  = VALUES(cash_amount),
        card_amount  = VALUES(card_amount),
        other_amount = VALUES(other_amount),
        covers       = VALUES(covers),
        tickets      = VALUES(tickets),
        source       = IF(source='manual','both','softrestaurant')"
);
$aggStmt->bind_param('s', $syncDate);
$aggStmt->execute();
$aggStmt->close();

// ── Allow direct daily_summary override (for simple totals-only sync) ──────
if ($dailySummary) {
    $cash   = floatval($dailySummary['cash']   ?? 0);
    $card   = floatval($dailySummary['card']   ?? 0);
    $other  = floatval($dailySummary['other']  ?? 0);
    $cov    = intval($dailySummary['covers']   ?? 0);
    $tix    = intval($dailySummary['tickets']  ?? 0);
    $stmt2  = $conn->prepare(
        "INSERT INTO sales_daily (sale_date, cash_amount, card_amount, other_amount, covers, tickets, source)
         VALUES (?,?,?,?,?,?,'softrestaurant')
         ON DUPLICATE KEY UPDATE
            cash_amount=VALUES(cash_amount), card_amount=VALUES(card_amount),
            other_amount=VALUES(other_amount), covers=VALUES(covers),
            tickets=VALUES(tickets),
            source=IF(source='manual','both','softrestaurant')"
    );
    $stmt2->bind_param('sddiii', $syncDate, $cash, $card, $other, $cov, $tix);
    $stmt2->execute();
    $stmt2->close();
}

// ── Log ────────────────────────────────────────────────────────────────────
$received = count($transactions);
$logStatus = empty($errors) ? 'success' : ($inserted + $updated > 0 ? 'partial' : 'error');
$logMsg    = empty($errors) ? 'OK' : implode('; ', array_slice($errors, 0, 3));
$keyHint   = substr($apiKey, 0, 8) . '...';
$logStmt   = $conn->prepare("INSERT INTO sales_sync_log (sync_date, records_received, records_inserted, records_updated, status, message, api_key_hint) VALUES (?,?,?,?,?,?,?)");
$logStmt->bind_param('siiisss', $syncDate, $received, $inserted, $updated, $logStatus, $logMsg, $keyHint);
$logStmt->execute();
$logStmt->close();

echo json_encode([
    'success'  => true,
    'date'     => $syncDate,
    'received' => $received,
    'inserted' => $inserted,
    'updated'  => $updated,
    'errors'   => count($errors),
]);
