<?php
/**
 * Resumen de ventas para el dashboard
 * GET /api/sales/summary.php?period=today|week|month|year|custom&from=&to=
 */
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../config/database.php';
requireAuth();

$conn   = getConnection();
$period = $_GET['period'] ?? 'month';

// ── Date range ──────────────────────────────────────────────────────────────
switch ($period) {
    case 'today':
        $from = date('Y-m-d'); $to = date('Y-m-d'); break;
    case 'yesterday':
        $from = date('Y-m-d', strtotime('-1 day')); $to = $from; break;
    case 'week':
        $from = date('Y-m-d', strtotime('monday this week')); $to = date('Y-m-d'); break;
    case 'month':
        $from = date('Y-m-01'); $to = date('Y-m-d'); break;
    case 'year':
        $from = date('Y-01-01'); $to = date('Y-m-d'); break;
    case 'custom':
        $from = $_GET['from'] ?? date('Y-m-01'); $to = $_GET['to'] ?? date('Y-m-d'); break;
    default:
        $from = date('Y-m-01'); $to = date('Y-m-d');
}

// ── Main totals ─────────────────────────────────────────────────────────────
$stmt = $conn->prepare(
    "SELECT
        COALESCE(SUM(cash_amount),  0) AS total_cash,
        COALESCE(SUM(card_amount),  0) AS total_card,
        COALESCE(SUM(other_amount), 0) AS total_other,
        COALESCE(SUM(total_amount), 0) AS grand_total,
        COALESCE(SUM(covers),  0)      AS total_covers,
        COALESCE(SUM(tickets), 0)      AS total_tickets,
        COUNT(*)                        AS days_with_sales,
        COALESCE(AVG(total_amount), 0)  AS avg_daily
     FROM sales_daily
     WHERE sale_date BETWEEN ? AND ?"
);
$stmt->bind_param('ss', $from, $to);
$stmt->execute();
$totals = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Average ticket value
$totals['avg_ticket'] = $totals['total_tickets'] > 0
    ? round($totals['grand_total'] / $totals['total_tickets'], 2)
    : 0;

// ── Daily breakdown ─────────────────────────────────────────────────────────
$stmt2 = $conn->prepare(
    "SELECT sale_date, cash_amount, card_amount, other_amount, total_amount, covers, tickets, source, notes
     FROM sales_daily
     WHERE sale_date BETWEEN ? AND ?
     ORDER BY sale_date ASC"
);
$stmt2->bind_param('ss', $from, $to);
$stmt2->execute();
$daily = $stmt2->get_result()->fetch_all(MYSQLI_ASSOC);
$stmt2->close();

// ── Today's real-time (from transactions table if available) ─────────────────
$today = date('Y-m-d');
$txStmt = $conn->prepare(
    "SELECT
        COALESCE(SUM(CASE WHEN payment_type='efectivo' THEN amount ELSE 0 END), 0) AS cash,
        COALESCE(SUM(CASE WHEN payment_type='tarjeta'  THEN amount ELSE 0 END), 0) AS card,
        COALESCE(SUM(amount), 0) AS total,
        COUNT(*) AS ticket_count,
        COALESCE(SUM(covers), 0) AS covers,
        MAX(sale_datetime) AS last_transaction
     FROM sales_transactions
     WHERE sale_date = ? AND status = 'closed'"
);
$txStmt->bind_param('s', $today);
$txStmt->execute();
$todayRT = $txStmt->get_result()->fetch_assoc();
$txStmt->close();

// ── Comparison: same period last month ──────────────────────────────────────
$prevFrom = date('Y-m-d', strtotime($from . ' -1 month'));
$prevTo   = date('Y-m-d', strtotime($to   . ' -1 month'));
$prevStmt = $conn->prepare(
    "SELECT COALESCE(SUM(total_amount),0) AS prev_total
     FROM sales_daily WHERE sale_date BETWEEN ? AND ?"
);
$prevStmt->bind_param('ss', $prevFrom, $prevTo);
$prevStmt->execute();
$prevTotal = $prevStmt->get_result()->fetch_assoc()['prev_total'] ?? 0;
$prevStmt->close();

$growth = $prevTotal > 0
    ? round((($totals['grand_total'] - $prevTotal) / $prevTotal) * 100, 1)
    : null;

// ── Last sync status ────────────────────────────────────────────────────────
$syncLog = $conn->query(
    "SELECT synced_at, status, records_received FROM sales_sync_log ORDER BY id DESC LIMIT 1"
)->fetch_assoc();

echo json_encode([
    'success'     => true,
    'period'      => ['from' => $from, 'to' => $to, 'label' => $period],
    'totals'      => $totals,
    'daily'       => $daily,
    'today_rt'    => $todayRT,
    'growth'      => $growth,
    'prev_total'  => $prevTotal,
    'last_sync'   => $syncLog,
]);
