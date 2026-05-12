<?php
/**
 * API Endpoint para movimientos de caja
 * Retorna retiros, ingresos, pagos de propina y resumen de caja
 */

require_once '../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    requireAuth();

    $pdo = getPDO();

    $srPaySplit = '(COALESCE(cash_amount,0)+COALESCE(card_amount,0)+COALESCE(voucher_amount,0)+COALESCE(other_amount,0)) > 0.005';
    $srPaySplitS = '(COALESCE(s.cash_amount,0)+COALESCE(s.card_amount,0)+COALESCE(s.voucher_amount,0)+COALESCE(s.other_amount,0)) > 0.005';
    $srClosedWhere = "(LOWER(COALESCE(status,'')) IN ('closed','cerrado','cobrado','pagado','paid') OR {$srPaySplit})";
    $srClosedWhereS = "(LOWER(COALESCE(s.status,'')) IN ('closed','cerrado','cobrado','pagado','paid') OR {$srPaySplitS})";
    $srCancelledWhere = "LOWER(COALESCE(status,'')) IN ('cancelled','canceled','cancelado')";

    $period = strtolower(trim((string)($_GET['period'] ?? 'today')));
    $allowedPeriods = ['today', 'yesterday', 'week', 'month', 'custom'];
    if (!in_array($period, $allowedPeriods, true)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'period inválido']);
        exit;
    }

    $shiftDateRaw = $_GET['shift_date'] ?? null;
    $shiftDate = is_string($shiftDateRaw) ? trim($shiftDateRaw) : null;
    if ($shiftDate !== null && $shiftDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $shiftDate)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'shift_date debe ser YYYY-MM-DD']);
        exit;
    }
    if ($shiftDate === '') {
        $shiftDate = null;
    }

    $now = new DateTime('now', new DateTimeZone('America/Hermosillo'));
    $currentHour = (int)$now->format('H');

    if ($shiftDate !== null && $shiftDate !== '') {
        $start = new DateTime($shiftDate . ' 08:00:00', new DateTimeZone('America/Hermosillo'));
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'today') {
        $base = ($currentHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $start = $base->setTime(8, 0, 0);
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'yesterday') {
        $base = ($currentHour < 8) ? (clone $now)->modify('-2 days') : (clone $now)->modify('-1 day');
        $start = $base->setTime(8, 0, 0);
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'week') {
        $base = ($currentHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $dayOfWeek = (int)$base->format('N');
        $daysBack = $dayOfWeek - 1;
        $monday = (clone $base)->modify("-{$daysBack} days")->setTime(8, 0, 0);
        $start = $monday;
        $end = (clone $now)->setTime(23, 59, 59);
    } elseif ($period === 'month') {
        $month = max(1, min(12, (int)($_GET['month'] ?? $now->format('n'))));
        $year = max(2000, min(2100, (int)($_GET['year'] ?? $now->format('Y'))));
        $start = new DateTime(sprintf('%04d-%02d-01 08:00:00', $year, $month), new DateTimeZone('America/Hermosillo'));
        $end = (clone $start)->modify('last day of this month')->setTime(23, 59, 59);
    } elseif ($period === 'custom') {
        $sd = trim((string)($_GET['start'] ?? $_GET['start_date'] ?? $now->format('Y-m-d')));
        $ed = trim((string)($_GET['end'] ?? $_GET['end_date'] ?? $now->format('Y-m-d')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $sd) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $ed)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'start/end deben ser YYYY-MM-DD']);
            exit;
        }
        if (strtotime($ed . ' 00:00:00') < strtotime($sd . ' 00:00:00')) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'end debe ser >= start']);
            exit;
        }
        $start = new DateTime($sd . ' 08:00:00', new DateTimeZone('America/Hermosillo'));
        $end = (new DateTime($ed . ' 07:59:59', new DateTimeZone('America/Hermosillo')))->modify('+1 day');
    }

    $startStr = $start->format('Y-m-d H:i:s');
    $endStr = $end->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare('SELECT * FROM sr_cash_movements
                           WHERE movement_datetime BETWEEN ? AND ?
                           ORDER BY movement_datetime ASC');
    $stmt->execute([$startStr, $endStr]);
    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalWithdrawals = 0;
    $withdrawalCount = 0;
    $totalDeposits = 0;
    $depositCount = 0;
    $totalTipPayments = 0;
    $tipPaymentCount = 0;

    foreach ($movements as $m) {
        $amount = floatval($m['amount'] ?? 0);
        $isTip = !empty($m['is_tip_payment']);
        $tipoOrig = (int)($m['tipo_original'] ?? 0);
        $type = $m['movement_type'] ?? 'other';
        if (!$isTip && $tipoOrig === 1) {
            $type = 'withdrawal';
        } elseif (!$isTip && $tipoOrig === 2) {
            $type = 'deposit';
        }
        if ($type === 'withdrawal') {
            $totalWithdrawals += $amount;
            $withdrawalCount++;
        } elseif ($type === 'deposit') {
            $totalDeposits += $amount;
            $depositCount++;
        } elseif ($type === 'tip_payment' || $isTip) {
            $totalTipPayments += $amount;
            $tipPaymentCount++;
        }
    }

    $stmtS = $pdo->prepare("SELECT
        COUNT(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN 1 END) as total_checks,
        COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total ELSE 0 END),0)         as total_sales,
        COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total - COALESCE(tax,0) ELSE 0 END),0) as subtotal,
        COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN COALESCE(tax,0) ELSE 0 END),0)         as total_tax,
        COALESCE(SUM(CASE WHEN COALESCE(discount,0) > 0 AND NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN discount ELSE 0 END),0) as total_discounts,
        COALESCE(SUM(tip),0)           as total_tips,
        COALESCE(SUM(cash_amount),0)   as cash_sales,
        COALESCE(SUM(card_amount),0)   as card_sales,
        COALESCE(SUM(voucher_amount),0) as voucher_sales,
        COALESCE(SUM(other_amount),0)  as other_sales,
        COALESCE(SUM(covers),0)        as total_covers,
        MIN(folio)                     as folio_inicial,
        MAX(folio)                     as folio_final
        FROM sr_sales
        WHERE sale_datetime BETWEEN ? AND ?
          AND {$srClosedWhere}");
    $stmtS->execute([$startStr, $endStr]);
    $sales = $stmtS->fetch(PDO::FETCH_ASSOC);

    $stmtC = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(total),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND {$srCancelledWhere}");
    $stmtC->execute([$startStr, $endStr]);
    $cancelled = $stmtC->fetch(PDO::FETCH_ASSOC);

    $stmtD = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(discount),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND {$srClosedWhere} AND discount > 0");
    $stmtD->execute([$startStr, $endStr]);
    $withDiscount = $stmtD->fetch(PDO::FETCH_ASSOC);

    $stmtCourt = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(subtotal),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND {$srClosedWhere} AND total = 0 AND subtotal > 0");
    $stmtCourt->execute([$startStr, $endStr]);
    $courtesy = $stmtCourt->fetch(PDO::FETCH_ASSOC);

    $stmtCourtCat = $pdo->prepare("SELECT
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as cortesia_bebidas,
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) NOT REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as cortesia_alimentos
        FROM sr_sale_items si
        JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
        WHERE s.sale_datetime BETWEEN ? AND ? AND {$srClosedWhereS} AND s.total = 0 AND s.subtotal > 0");
    $stmtCourtCat->execute([$startStr, $endStr]);
    $courtesyByCategory = $stmtCourtCat->fetch(PDO::FETCH_ASSOC);

    $stmtProd = $pdo->prepare("SELECT
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as bebidas,
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) NOT REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as alimentos,
        COUNT(DISTINCT si.sr_ticket_id) as tickets_con_items
        FROM sr_sale_items si
        JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
        WHERE s.sale_datetime BETWEEN ? AND ? AND {$srClosedWhereS}");
    $stmtProd->execute([$startStr, $endStr]);
    $byProduct = $stmtProd->fetch(PDO::FETCH_ASSOC);

    $totalChecks = (int)$sales['total_checks'];
    $totalSales = floatval($sales['total_sales']);
    $subtotalNet = floatval($sales['subtotal']);
    $totalTax = floatval($sales['total_tax']);
    $totalDisc = floatval($sales['total_discounts']);
    $totalTips = floatval($sales['total_tips']);
    $cashS = floatval($sales['cash_sales']);
    $cardS = floatval($sales['card_sales']);
    $voucherS = floatval($sales['voucher_sales']);
    $otherS = floatval($sales['other_sales']);
    $covers = (int)$sales['total_covers'];
    $folioInicial = $sales['folio_inicial'] ?? '-';
    $folioFinal = $sales['folio_final'] ?? '-';
    $avgCheck = $totalChecks > 0 ? round($totalSales / $totalChecks, 2) : 0;
    $avgCover = $covers > 0 ? round($totalSales / $covers, 2) : 0;

    $finalBalance = $cashS + $totalDeposits - $totalWithdrawals - $totalTipPayments;

    $stmtDays = $pdo->prepare("SELECT DISTINCT DATE(sale_datetime) as dia
        FROM sr_sales WHERE {$srClosedWhere} ORDER BY dia DESC LIMIT 90");
    $stmtDays->execute();
    $availableDays = array_column($stmtDays->fetchAll(PDO::FETCH_ASSOC), 'dia');

    echo json_encode([
        'success' => true,
        'period' => $period,
        'shift_date' => $shiftDate ?? $start->format('Y-m-d'),
        'start' => $startStr,
        'end' => $endStr,
        'available_days' => $availableDays,
        'summary' => [
            'cash_sales' => $cashS,
            'card_sales' => $cardS,
            'voucher_sales' => $voucherS,
            'other_sales' => $otherS,
            'total_deposits' => $totalDeposits,
            'deposit_count' => $depositCount,
            'total_withdrawals' => $totalWithdrawals,
            'withdrawal_count' => $withdrawalCount,
            'total_tip_payments' => $totalTipPayments,
            'tip_payment_count' => $tipPaymentCount,
            'final_balance' => $finalBalance,
            'total_sales' => $totalSales,
            'subtotal' => $subtotalNet,
            'total_tax' => $totalTax,
            'total_discounts' => $totalDisc,
            'total_tips' => $totalTips,
            'total_checks' => $totalChecks,
            'cancelled_checks' => (int)$cancelled['n'],
            'cancelled_amount' => floatval($cancelled['amt']),
            'discount_checks' => (int)$withDiscount['n'],
            'courtesy_checks' => (int)$courtesy['n'],
            'courtesy_amount' => floatval($courtesy['amt']),
            'avg_check' => $avgCheck,
            'avg_cover' => $avgCover,
            'total_covers' => $covers,
            'folio_inicial' => $folioInicial,
            'folio_final' => $folioFinal,
            'sales_alimentos' => floatval($byProduct['alimentos'] ?? 0),
            'sales_bebidas' => floatval($byProduct['bebidas'] ?? 0),
            'sales_otros' => 0,
            'cortesia_alimentos' => floatval($courtesyByCategory['cortesia_alimentos'] ?? 0),
            'cortesia_bebidas' => floatval($courtesyByCategory['cortesia_bebidas'] ?? 0),
        ],
        'movements' => array_map(static function ($m) {
            return [
                'id' => $m['movement_id'] ?? $m['id'] ?? '',
                'folio_movto' => $m['folio_movto'] ?? '',
                'type' => $m['movement_type'] ?? 'other',
                'tipo_original' => (int)($m['tipo_original'] ?? 0),
                'amount' => floatval($m['amount'] ?? 0),
                'amount_signed' => floatval($m['amount_signed'] ?? $m['amount'] ?? 0),
                'datetime' => $m['movement_datetime'] ?? '',
                'concept' => $m['concept'] ?? '',
                'reference' => $m['reference'] ?? '',
                'user_cancel' => $m['user_cancel'] ?? '',
                'is_tip_payment' => !empty($m['is_tip_payment']),
                'shift_id' => $m['shift_id'] ?? '',
            ];
        }, $movements),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
