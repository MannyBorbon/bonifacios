<?php
/**
 * API Endpoint para movimientos de caja
 * Retorna retiros, ingresos, pagos de propina y resumen de caja
 */

require_once '../config/database.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

try {
    $pdo = getPDO();

    // Parámetros
    $period    = $_GET['period']     ?? 'today';
    $shiftDate = $_GET['shift_date'] ?? null; // YYYY-MM-DD - para corte de fecha específica

    $now         = new DateTime('now', new DateTimeZone('America/Hermosillo'));
    $currentHour = (int)$now->format('H');

    // Calcular rango shift-based (8AM - 7:59AM siguiente día)
    if ($shiftDate) {
        $start = new DateTime($shiftDate . ' 08:00:00', new DateTimeZone('America/Hermosillo'));
        $end   = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'today') {
        $base  = ($currentHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $start = $base->setTime(8, 0, 0);
        $end   = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'yesterday') {
        $base  = ($currentHour < 8) ? (clone $now)->modify('-2 days') : (clone $now)->modify('-1 day');
        $start = $base->setTime(8, 0, 0);
        $end   = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'week') {
        // Semana de turno: lunes 8:00 → lunes siguiente 7:59
        $base      = ($currentHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $dayOfWeek = (int)$base->format('N'); // 1=Lun ... 7=Dom
        $daysBack  = $dayOfWeek - 1;          // días desde el lunes
        $monday    = (clone $base)->modify("-{$daysBack} days")->setTime(8, 0, 0);
        $start     = $monday;
        $end       = (clone $now)->setTime(23, 59, 59);
    } elseif ($period === 'month') {
        $month = intval($_GET['month'] ?? $now->format('n'));
        $year  = intval($_GET['year']  ?? $now->format('Y'));
        $start = new DateTime("$year-$month-01 08:00:00", new DateTimeZone('America/Hermosillo'));
        $end   = (clone $start)->modify('last day of this month')->setTime(23, 59, 59);
    } elseif ($period === 'custom') {
        $sd    = $_GET['start'] ?? $_GET['start_date'] ?? $now->format('Y-m-d');
        $ed    = $_GET['end']   ?? $_GET['end_date']   ?? $now->format('Y-m-d');
        $start = new DateTime($sd . ' 08:00:00', new DateTimeZone('America/Hermosillo'));
        $end   = (new DateTime($ed . ' 07:59:59', new DateTimeZone('America/Hermosillo')))->modify('+1 day');
    } else {
        $base  = ($currentHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $start = $base->setTime(8, 0, 0);
        $end   = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    }

    $startStr = $start->format('Y-m-d H:i:s');
    $endStr   = $end->format('Y-m-d H:i:s');

    // ── MOVIMIENTOS DE CAJA ──────────────────────────────────────
    $stmt = $pdo->prepare("SELECT * FROM sr_cash_movements
                           WHERE movement_datetime BETWEEN ? AND ?
                           ORDER BY movement_datetime ASC");
    $stmt->execute([$startStr, $endStr]);
    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalWithdrawals  = 0; $withdrawalCount  = 0;
    $totalDeposits     = 0; $depositCount     = 0;
    $totalTipPayments  = 0; $tipPaymentCount  = 0;

    foreach ($movements as $m) {
        $amount      = floatval($m['amount'] ?? 0);
        $isTip       = !empty($m['is_tip_payment']);
        $tipoOrig    = intval($m['tipo_original'] ?? 0);
        $type        = $m['movement_type'] ?? 'other';
        if (!$isTip && $tipoOrig === 1) $type = 'withdrawal';
        elseif (!$isTip && $tipoOrig === 2) $type = 'deposit';
        if ($type === 'withdrawal')               { $totalWithdrawals += $amount; $withdrawalCount++; }
        elseif ($type === 'deposit')              { $totalDeposits    += $amount; $depositCount++;    }
        elseif ($type === 'tip_payment' || $isTip){ $totalTipPayments += $amount; $tipPaymentCount++; }
    }

    // ── VENTAS DEL TURNO ─────────────────────────────────────────
    // Cortesía SR: total=0 con subtotal>0 — excluir de ventas pero contar aparte
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
          AND status = 'closed'");
    $stmtS->execute([$startStr, $endStr]);
    $sales = $stmtS->fetch(PDO::FETCH_ASSOC);

    // Canceladas
    $stmtC = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(total),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status = 'cancelled'");
    $stmtC->execute([$startStr, $endStr]);
    $cancelled = $stmtC->fetch(PDO::FETCH_ASSOC);

    // Con descuento
    $stmtD = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(discount),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status='closed' AND discount > 0");
    $stmtD->execute([$startStr, $endStr]);
    $withDiscount = $stmtD->fetch(PDO::FETCH_ASSOC);

    // Con cortesía (total = 0 y es closed)
    $stmtCourt = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(subtotal),0) as amt
        FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status='closed' AND total = 0 AND subtotal > 0");
    $stmtCourt->execute([$startStr, $endStr]);
    $courtesy = $stmtCourt->fetch(PDO::FETCH_ASSOC);

    // Cortesías por categoría (alimentos/bebidas) — aproximado desde sale_items
    $stmtCourtCat = $pdo->prepare("SELECT
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as cortesia_bebidas,
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) NOT REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as cortesia_alimentos
        FROM sr_sale_items si
        JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
        WHERE s.sale_datetime BETWEEN ? AND ? AND s.status='closed' AND s.total = 0 AND s.subtotal > 0");
    $stmtCourtCat->execute([$startStr, $endStr]);
    $courtesyByCategory = $stmtCourtCat->fetch(PDO::FETCH_ASSOC);

    // Ventas sin impuestos por tipo de producto (approximado)
    $stmtProd = $pdo->prepare("SELECT
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as bebidas,
        COALESCE(SUM(CASE WHEN LOWER(si.product_name) NOT REGEXP 'bebid|aguas|refres|jugo|caf|cerve|vino|licor|coctail|cocktail|margarita|tequila|whisky|ron|vodka' THEN si.subtotal ELSE 0 END),0) as alimentos,
        COUNT(DISTINCT si.sr_ticket_id) as tickets_con_items
        FROM sr_sale_items si
        JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
        WHERE s.sale_datetime BETWEEN ? AND ? AND s.status = 'closed'");
    $stmtProd->execute([$startStr, $endStr]);
    $byProduct = $stmtProd->fetch(PDO::FETCH_ASSOC);

    $totalChecks  = intval($sales['total_checks']);
    $totalSales   = floatval($sales['total_sales']);
    $subtotalNet  = floatval($sales['subtotal']);
    $totalTax     = floatval($sales['total_tax']);
    $totalDisc    = floatval($sales['total_discounts']);
    $totalTips    = floatval($sales['total_tips']);
    $cashS        = floatval($sales['cash_sales']);
    $cardS        = floatval($sales['card_sales']);
    $voucherS     = floatval($sales['voucher_sales']);
    $otherS       = floatval($sales['other_sales']);
    $covers       = intval($sales['total_covers']);
    $folioInicial = $sales['folio_inicial'] ?? '-';
    $folioFinal   = $sales['folio_final']   ?? '-';
    $avgCheck     = $totalChecks > 0 ? round($totalSales / $totalChecks, 2) : 0;
    $avgCover     = $covers > 0 ? round($totalSales / $covers, 2) : 0;

    // Saldo final caja
    $finalBalance = $cashS + $totalDeposits - $totalWithdrawals - $totalTipPayments;

    // Días disponibles con datos (para selector de corte)
    $stmtDays = $pdo->prepare("SELECT DISTINCT DATE(sale_datetime) as dia
        FROM sr_sales WHERE status='closed' ORDER BY dia DESC LIMIT 90");
    $stmtDays->execute();
    $availableDays = array_column($stmtDays->fetchAll(PDO::FETCH_ASSOC), 'dia');

    echo json_encode([
        'success'        => true,
        'period'         => $period,
        'shift_date'     => $shiftDate ?? $start->format('Y-m-d'),
        'start'          => $startStr,
        'end'            => $endStr,
        'available_days' => $availableDays,
        'summary' => [
            // Caja
            'cash_sales'          => $cashS,
            'card_sales'          => $cardS,
            'voucher_sales'       => $voucherS,
            'other_sales'         => $otherS,
            'total_deposits'      => $totalDeposits,
            'deposit_count'       => $depositCount,
            'total_withdrawals'   => $totalWithdrawals,
            'withdrawal_count'    => $withdrawalCount,
            'total_tip_payments'  => $totalTipPayments,
            'tip_payment_count'   => $tipPaymentCount,
            'final_balance'       => $finalBalance,
            // Ventas
            'total_sales'         => $totalSales,
            'subtotal'            => $subtotalNet,
            'total_tax'           => $totalTax,
            'total_discounts'     => $totalDisc,
            'total_tips'          => $totalTips,
            // Cuentas
            'total_checks'        => $totalChecks,
            'cancelled_checks'    => intval($cancelled['n']),
            'cancelled_amount'    => floatval($cancelled['amt']),
            'discount_checks'     => intval($withDiscount['n']),
            'courtesy_checks'     => intval($courtesy['n']),
            'courtesy_amount'     => floatval($courtesy['amt']),
            // Promedios
            'avg_check'           => $avgCheck,
            'avg_cover'           => $avgCover,
            'total_covers'        => $covers,
            // Folios
            'folio_inicial'       => $folioInicial,
            'folio_final'         => $folioFinal,
            // Por producto
            'sales_alimentos'     => floatval($byProduct['alimentos'] ?? 0),
            'sales_bebidas'       => floatval($byProduct['bebidas'] ?? 0),
            'sales_otros'         => 0,
            // Cortesías por categoría
            'cortesia_alimentos'  => floatval($courtesyByCategory['cortesia_alimentos'] ?? 0),
            'cortesia_bebidas'    => floatval($courtesyByCategory['cortesia_bebidas'] ?? 0),
        ],
        'movements' => array_map(function($m) {
            return [
                'id'            => $m['movement_id'] ?? $m['id'] ?? '',
                'folio_movto'   => $m['folio_movto']  ?? '',
                'type'          => $m['movement_type'] ?? 'other',
                'tipo_original' => intval($m['tipo_original'] ?? 0),
                'amount'        => floatval($m['amount'] ?? 0),
                'amount_signed' => floatval($m['amount_signed'] ?? $m['amount'] ?? 0),
                'datetime'      => $m['movement_datetime'] ?? '',
                'concept'       => $m['concept']      ?? '',
                'reference'     => $m['reference']    ?? '',
                'user_cancel'   => $m['user_cancel']  ?? '',
                'is_tip_payment'=> !empty($m['is_tip_payment']),
                'shift_id'      => $m['shift_id']     ?? '',
            ];
        }, $movements),
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
