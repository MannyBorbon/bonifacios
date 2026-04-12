<?php
/**
 * Entrada manual de ventas diarias (efectivo + tarjeta)
 * GET  /api/sales/manual.php          → lista entradas
 * POST /api/sales/manual.php          → crear o actualizar día
 * DELETE /api/sales/manual.php?date=  → eliminar día
 */
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$user   = json_decode($_COOKIE['user'] ?? '{}', true) ?? [];
$method = $_SERVER['REQUEST_METHOD'];

// ── GET: list daily sales ──────────────────────────────────────────────────
if ($method === 'GET') {
    $days  = intval($_GET['days'] ?? 30);
    $from  = $_GET['from'] ?? null;
    $to    = $_GET['to']   ?? null;

    if ($from && $to) {
        $stmt = $conn->prepare(
            "SELECT * FROM sales_daily WHERE sale_date BETWEEN ? AND ? ORDER BY sale_date DESC"
        );
        $stmt->bind_param('ss', $from, $to);
    } else {
        $stmt = $conn->prepare(
            "SELECT * FROM sales_daily WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) ORDER BY sale_date DESC"
        );
        $stmt->bind_param('i', $days);
    }
    $stmt->execute();
    $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
    $stmt->close();

    // Totals for the period
    $totals = [
        'cash'    => array_sum(array_column($rows, 'cash_amount')),
        'card'    => array_sum(array_column($rows, 'card_amount')),
        'other'   => array_sum(array_column($rows, 'other_amount')),
        'total'   => array_sum(array_column($rows, 'total_amount')),
        'covers'  => array_sum(array_column($rows, 'covers')),
        'tickets' => array_sum(array_column($rows, 'tickets')),
        'days'    => count($rows),
    ];

    // Last sync info
    $syncRow = $conn->query("SELECT synced_at, status FROM sales_sync_log ORDER BY id DESC LIMIT 1")->fetch_assoc();

    echo json_encode([
        'success'   => true,
        'sales'     => $rows,
        'totals'    => $totals,
        'last_sync' => $syncRow,
    ]);
    exit;
}

// ── POST: create / update a day ────────────────────────────────────────────
if ($method === 'POST') {
    $body = json_decode(file_get_contents('php://input'), true);
    if (!$body) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'Invalid JSON']); exit; }

    $date   = $body['date']   ?? date('Y-m-d');
    $cash   = floatval($body['cash']   ?? 0);
    $card   = floatval($body['card']   ?? 0);
    $other  = floatval($body['other']  ?? 0);
    $covers = intval($body['covers']   ?? 0);
    $tickets = intval($body['tickets'] ?? 0);
    $notes  = trim($body['notes']      ?? '');
    $createdBy = $user['username'] ?? 'admin';

    $stmt = $conn->prepare(
        "INSERT INTO sales_daily (sale_date, cash_amount, card_amount, other_amount, covers, tickets, notes, source, created_by)
         VALUES (?,?,?,?,?,?,?,'manual',?)
         ON DUPLICATE KEY UPDATE
            cash_amount  = IF(source='softrestaurant', cash_amount,  VALUES(cash_amount)),
            card_amount  = IF(source='softrestaurant', card_amount,  VALUES(card_amount)),
            other_amount = IF(source='softrestaurant', other_amount, VALUES(other_amount)),
            covers       = VALUES(covers),
            tickets      = VALUES(tickets),
            notes        = VALUES(notes),
            source       = IF(source='softrestaurant','both','manual'),
            created_by   = VALUES(created_by)"
    );
    $stmt->bind_param('sddiiiss', $date, $cash, $card, $other, $covers, $tickets, $notes, $createdBy);

    if ($stmt->execute()) {
        echo json_encode(['success' => true, 'date' => $date, 'message' => 'Ventas guardadas correctamente']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => $stmt->error]);
    }
    $stmt->close();
    exit;
}

// ── DELETE ─────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $date = $_GET['date'] ?? '';
    if (!$date) { http_response_code(400); echo json_encode(['success' => false, 'error' => 'date required']); exit; }

    $stmt = $conn->prepare("DELETE FROM sales_daily WHERE sale_date = ? AND source = 'manual'");
    $stmt->bind_param('s', $date);
    $stmt->execute();
    echo json_encode(['success' => true, 'deleted' => $stmt->affected_rows > 0]);
    $stmt->close();
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'error' => 'Method not allowed']);
