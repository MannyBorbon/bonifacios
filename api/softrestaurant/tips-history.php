<?php
/**
 * Historial completo de propinas por mesero
 * GET ?waiter=NOMBRE&limit=200
 */
require_once '../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit; }

try {
    $pdo    = getPDO();
    $waiter = trim($_GET['waiter'] ?? '');
    $limit  = max(1, min(500, intval($_GET['limit'] ?? 200)));

    if ($waiter === '') {
        echo json_encode(['success' => false, 'error' => 'waiter requerido']);
        exit;
    }

    $stmt = $pdo->prepare("
        SELECT
            s.sr_ticket_id,
            s.folio,
            s.sale_datetime,
            s.waiter_name,
            s.tip,
            s.total,
            s.table_number,
            s.status,
            s.covers,
            s.payment_type,
            COALESCE(s.tip_paid, 0) AS tip_paid
        FROM sr_sales s
        WHERE s.waiter_name = ?
          AND s.status = 'closed'
          AND COALESCE(s.tip, 0) > 0
          AND NOT (s.total = 0 AND COALESCE(s.subtotal, 0) > 0)
        ORDER BY s.sale_datetime DESC
        LIMIT ?
    ");
    $stmt->execute([$waiter, $limit]);
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalTips    = 0;
    $totalPaid    = 0;
    $totalPending = 0;
    $byYear       = [];

    foreach ($rows as &$r) {
        $year   = substr($r['sale_datetime'], 0, 4);
        $tipAmt = floatval($r['tip']);
        $isPaid = intval($r['tip_paid']) === 1;

        $r['tip_paid'] = $isPaid ? 1 : 0;

        $totalTips += $tipAmt;
        if ($isPaid) $totalPaid    += $tipAmt;
        else         $totalPending += $tipAmt;

        if (!isset($byYear[$year])) $byYear[$year] = ['year' => $year, 'count' => 0, 'total' => 0, 'paid' => 0, 'pending' => 0];
        $byYear[$year]['count']++;
        $byYear[$year]['total']   += $tipAmt;
        if ($isPaid) $byYear[$year]['paid']    += $tipAmt;
        else         $byYear[$year]['pending'] += $tipAmt;
    }
    unset($r);

    // Ordenar años DESC
    krsort($byYear);
    $byYearList = array_values(array_map(function($y) {
        return [
            'year'    => $y['year'],
            'count'   => $y['count'],
            'total'   => round($y['total'], 2),
            'paid'    => round($y['paid'], 2),
            'pending' => round($y['pending'], 2),
        ];
    }, $byYear));

    echo json_encode([
        'success'       => true,
        'waiter'        => $waiter,
        'count'         => count($rows),
        'total_tips'    => round($totalTips, 2),
        'total_paid'    => round($totalPaid, 2),
        'total_pending' => round($totalPending, 2),
        'by_year'       => $byYearList,
        'tips'          => $rows,
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
