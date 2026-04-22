<?php
/**
 * Todas las propinas (vista general) con filtro de fechas propio
 * GET ?start=YYYY-MM-DD&end=YYYY-MM-DD&waiter=NOMBRE (opcional)
 */
require_once '../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

try {
    $pdo   = getPDO();
    $start = $_GET['start'] ?? date('Y-m-01');
    $end   = $_GET['end']   ?? date('Y-m-d');
    $waiterFilter = trim($_GET['waiter'] ?? '');

    // Query de tickets — tip_paid viene directo del campo sincronizado de cheques.propinapagada
    $whereParts = [
        "s.sale_datetime BETWEEN ? AND ?",
        "s.status = 'closed'",
        "COALESCE(s.tip, 0) > 0",
        "NOT (s.total = 0 AND COALESCE(s.subtotal, 0) > 0)"
    ];
    $params = ["{$start} 00:00:00", "{$end} 23:59:59"];
    if ($waiterFilter !== '') {
        $whereParts[] = "s.waiter_name = ?";
        $params[] = $waiterFilter;
    }
    $where = implode(' AND ', $whereParts);

    $stmt = $pdo->prepare("
        SELECT s.sr_ticket_id, s.folio, s.sale_datetime, s.waiter_name,
               s.tip, s.total, s.table_number, s.status, s.covers, s.payment_type,
               COALESCE(s.tip_paid, 0) AS tip_paid
        FROM sr_sales s
        WHERE {$where}
        ORDER BY s.sale_datetime DESC
        LIMIT 2000
    ");
    $stmt->execute($params);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Enriquecer y calcular stats
    $totalTips    = 0;
    $totalPaid    = 0;
    $totalPending = 0;
    $byWaiter     = [];
    $paid_list    = [];
    $pending_list = [];
    $tipAmounts   = [];

    foreach ($rows as &$r) {
        $tipAmt = floatval($r['tip']);
        $isPaid = intval($r['tip_paid']) === 1;
        $wName  = $r['waiter_name'] ?: 'Sin nombre';

        $totalTips += $tipAmt;
        $tipAmounts[] = $tipAmt;

        if ($isPaid) { $totalPaid += $tipAmt; $paid_list[] = $r; }
        else         { $totalPending += $tipAmt; $pending_list[] = $r; }

        if (!isset($byWaiter[$wName])) $byWaiter[$wName] = ['waiter' => $wName, 'count' => 0, 'total' => 0, 'paid' => 0, 'pending' => 0];
        $byWaiter[$wName]['count']++;
        $byWaiter[$wName]['total'] += $tipAmt;
        if ($isPaid) $byWaiter[$wName]['paid']    += $tipAmt;
        else         $byWaiter[$wName]['pending'] += $tipAmt;
    }
    unset($r);

    // Ordenar por total DESC
    usort($byWaiter, fn($a, $b) => $b['total'] <=> $a['total']);

    $count = count($rows);
    $avgTip = $count > 0 ? $totalTips / $count : 0;
    sort($tipAmounts);
    $median = 0;
    if ($count > 0) {
        $mid = intdiv($count, 2);
        $median = $count % 2 === 0 ? ($tipAmounts[$mid-1] + $tipAmounts[$mid]) / 2 : $tipAmounts[$mid];
    }

    echo json_encode([
        'success'        => true,
        'period'         => ['start' => $start, 'end' => $end],
        'count'          => $count,
        'count_paid'     => count($paid_list),
        'count_pending'  => count($pending_list),
        'total_tips'     => round($totalTips, 2),
        'total_paid'     => round($totalPaid, 2),
        'total_pending'  => round($totalPending, 2),
        'avg_tip'        => round($avgTip, 2),
        'median_tip'     => round($median, 2),
        'max_tip'        => count($tipAmounts) > 0 ? round(max($tipAmounts), 2) : 0,
        'by_waiter'      => array_values($byWaiter),
        'paid'           => $paid_list,
        'pending'        => $pending_list,
        'all'            => $rows,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
