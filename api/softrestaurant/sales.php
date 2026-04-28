<?php
/**
 * API para obtener datos de ventas de SoftRestaurant en tiempo real
 */

require_once __DIR__ . '/../config/database.php';

$pdo = getPDO();

// Obtener parámetros
$range = $_GET['range'] ?? 'today';
$startDate = $_GET['start'] ?? '';
$endDate = $_GET['end'] ?? '';
$statusFilter = $_GET['status'] ?? 'all'; // 'closed' | 'open' | 'all' — default ALL para mostrar todo
$selectedMonth = isset($_GET['month']) ? (int)$_GET['month'] : null;
$selectedYear = isset($_GET['year']) ? (int)$_GET['year'] : null;

// Límites de turno SoftRestaurant: turno empieza a las 08:00 y termina 07:59:59 del día siguiente
$shiftHour = 8;
$currentHour = (int)date('H');

// Si es antes de las 8am, el turno actual comenzó ayer
$shiftTodayDate = ($currentHour < $shiftHour)
    ? date('Y-m-d', strtotime('-1 day'))
    : date('Y-m-d');
$shiftYesterdayDate = date('Y-m-d', strtotime($shiftTodayDate . ' -1 day'));

// Límites de cada período (datetime completo con turno)
$todayStart     = $shiftTodayDate . ' 08:00:00';
$todayEnd       = date('Y-m-d', strtotime($shiftTodayDate . ' +1 day')) . ' 07:59:59';
$yesterdayStart = $shiftYesterdayDate . ' 08:00:00';
$yesterdayEnd   = $shiftTodayDate . ' 07:59:59';
$weekDayOfWeek    = (int)date('N', strtotime($shiftTodayDate)); // 1=Lun ... 7=Dom
$weekMondayDate   = date('Y-m-d', strtotime($shiftTodayDate . ' -' . ($weekDayOfWeek - 1) . ' days'));
$weekStart        = $weekMondayDate . ' 08:00:00';
$weekEnd          = date('Y-m-d H:i:s'); // hasta ahora — suma de turnos transcurridos
$monthStart     = date('Y-m-01', strtotime($shiftTodayDate)) . ' 08:00:00';
$monthEnd       = date('Y-m-d', strtotime(date('Y-m-t', strtotime($shiftTodayDate)) . ' +1 day')) . ' 07:59:59';

switch ($range) {
    case 'today':
        $start = $todayStart;
        $end   = $todayEnd;
        break;
    case 'yesterday':
        $start = $yesterdayStart;
        $end   = $yesterdayEnd;
        break;
    case 'week':
        $start = $weekStart;
        $end   = $weekEnd;
        break;
    case 'month':
        // Si se especifica mes y año, calcular rango para ese mes específico
        if ($selectedMonth && $selectedYear) {
            $monthDate = sprintf('%04d-%02d-01', $selectedYear, $selectedMonth);
            $start = $monthDate . ' 08:00:00';
            $lastDayOfMonth = date('Y-m-t', strtotime($monthDate));
            $end = date('Y-m-d', strtotime($lastDayOfMonth . ' +1 day')) . ' 07:59:59';
        } else {
            // Por defecto: mes actual
            $start = $monthStart;
            $end   = $monthEnd;
        }
        break;
    case 'week1':
        $start = date('Y-m-01', strtotime($shiftTodayDate)) . ' 08:00:00';
        $end   = date('Y-m-08', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week2':
        $start = date('Y-m-08', strtotime($shiftTodayDate)) . ' 08:00:00';
        $end   = date('Y-m-15', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week3':
        $start = date('Y-m-15', strtotime($shiftTodayDate)) . ' 08:00:00';
        $end   = date('Y-m-22', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week4':
        $start = date('Y-m-22', strtotime($shiftTodayDate)) . ' 08:00:00';
        $end   = date('Y-m-d', strtotime(date('Y-m-t', strtotime($shiftTodayDate)) . ' +1 day')) . ' 07:59:59';
        break;
    case 'custom':
        $customStart = $startDate ?: $shiftTodayDate;
        $customEnd   = $endDate ?: $shiftTodayDate;
        $start = $customStart . ' 08:00:00';
        $end   = date('Y-m-d', strtotime($customEnd . ' +1 day')) . ' 07:59:59';
        break;
    default:
        $start = $todayStart;
        $end   = $todayEnd;
}

try {
    // Estadísticas según el filtro seleccionado
    $stats = [
        'today'     => getSalesStats($pdo, $todayStart, $todayEnd),
        'yesterday' => getSalesStats($pdo, $yesterdayStart, $yesterdayEnd),
        'week'      => getSalesStats($pdo, $weekStart, $weekEnd),
        'month'     => getSalesStats($pdo, $monthStart, $monthEnd)
    ];

    // Estadísticas del período actualmente seleccionado (incluye custom)
    $currentStats = getSalesStats($pdo, $start, $end);
    if ($range === 'custom') {
        $stats['custom'] = $currentStats;
    }

    // Comparación contra período anterior equivalente (misma duración)
    $comparison = getPeriodComparison($pdo, $start, $end);

    // Tickets abiertos del período seleccionado
    $openStats = getOpenStats($pdo, $start, $end);
    
    // Tickets abiertos históricos (de turnos anteriores)
    $historicalOpenStats = getHistoricalOpenStats($pdo, $todayStart);

    // Cancelaciones del rango seleccionado
    $cancellations = getCancellations($pdo, $start, $end);

    // Ventas del rango con filtro de status
    $sales = getSales($pdo, $start, $end, $statusFilter);

    // Datos por hora
    $hourly = [];
    if ($range === 'today' || $range === 'yesterday') {
        $hourly = getHourlySales($pdo, $start, $end, $statusFilter);
    }

    // Datos diarios
    $daily = [];
    if ($range === 'week' || $range === 'month' || $range === 'custom') {
        $daily = getDailySales($pdo, $start, $end, $statusFilter);
    }

    // Top productos
    $topProducts = getTopProducts($pdo, $start, $end, $statusFilter);

    // Rendimiento de meseros
    $waiters = getWaiterPerformance($pdo, $start, $end, $statusFilter);

    // Métodos de pago
    $paymentMethods = getPaymentMethods($pdo, $start, $end, $statusFilter);

    // Análisis detallado del período seleccionado
    $analytics = getDetailedAnalytics($pdo, $start, $end, $statusFilter);

    // Propinas por mesero
    $tipsByWaiter = getTipsByWaiter($pdo, $start, $end);

    // Formatear rango legible en español
    $rangeLabels = [
        'today' => 'Hoy',
        'yesterday' => 'Ayer',
        'week' => 'Esta semana',
        'month' => 'Este mes',
        'custom' => 'Personalizado'
    ];
    
    $startFormatted = date('d/m/Y H:i', strtotime($start));
    $endFormatted = date('d/m/Y H:i', strtotime($end));
    $rangeLabel = $rangeLabels[$range] ?? 'Personalizado';
    
    echo json_encode([
        'success' => true,
        'stats' => $stats,
        'current_stats' => $currentStats,
        'selected_period' => [
            'range' => $range,
            'label' => $rangeLabel,
            'start' => $start,
            'end' => $end,
            'start_formatted' => $startFormatted,
            'end_formatted' => $endFormatted,
            'description' => "$rangeLabel: del $startFormatted al $endFormatted"
        ],
        'comparison' => $comparison,
        'open_stats' => $openStats,
        'historical_open_stats' => $historicalOpenStats,
        'status_filter' => $statusFilter,
        'cancellations' => $cancellations,
        'sales' => $sales,
        'hourly' => $hourly,
        'daily' => $daily,
        'top_products' => $topProducts,
        'waiters' => $waiters,
        'payment_methods' => $paymentMethods,
        'analytics' => $analytics,
        'tips_by_waiter' => $tipsByWaiter
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// ── FUNCIONES AUXILIARES ──────────────────────────────────

function getTipsByWaiter($pdo, $start, $end) {
    // Resumen por mesero
    $sqlSummary = "SELECT
        waiter_name,
        COUNT(CASE WHEN COALESCE(tip,0) > 0 THEN 1 END) as tip_count,
        COALESCE(SUM(tip),0) as total_tips,
        COALESCE(AVG(CASE WHEN COALESCE(tip,0) > 0 THEN tip END),0) as avg_tip
    FROM sr_sales
    WHERE sale_datetime BETWEEN ? AND ?
      AND status = 'closed'
      AND NOT (total=0 AND COALESCE(subtotal,0)>0)
    GROUP BY waiter_name
    HAVING total_tips > 0
    ORDER BY total_tips DESC";
    $stmt = $pdo->prepare($sqlSummary);
    $stmt->execute([$start, $end]);
    $summary = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Detalle ticket a ticket con propina > 0
    // tip_paid: si existe algún movimiento is_tip_payment=1 en el mismo turno/fecha
    $sqlDetail = "SELECT
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
        CASE WHEN EXISTS (
            SELECT 1 FROM sr_cash_movements m
            WHERE m.is_tip_payment = 1
              AND DATE(m.movement_datetime) = DATE(s.sale_datetime)
        ) THEN 1 ELSE 0 END as tip_paid
    FROM sr_sales s
    WHERE s.sale_datetime BETWEEN ? AND ?
      AND s.status = 'closed'
      AND COALESCE(s.tip,0) > 0
      AND NOT (s.total=0 AND COALESCE(s.subtotal,0)>0)
    ORDER BY s.sale_datetime DESC";
    $stmtD = $pdo->prepare($sqlDetail);
    $stmtD->execute([$start, $end]);
    $detail = $stmtD->fetchAll(PDO::FETCH_ASSOC);

    $totalTips = array_sum(array_column($summary, 'total_tips'));

    return [
        'total' => round($totalTips, 2),
        'summary' => $summary,
        'detail'  => $detail
    ];
}

function getStatusCondition($statusFilter) {
    // Normalizar variantes reales que llegan desde sincronización
    // open: open, abierto, pending
    // closed: closed, cerrado, cobrado, pagado, paid
    // cancelled: cancelled, canceled, cancelado
    if ($statusFilter === 'open') {
        return "AND LOWER(COALESCE(status,'')) IN ('open','abierto','pending')";
    }
    if ($statusFilter === 'closed') {
        return "AND LOWER(COALESCE(status,'')) IN ('closed','cerrado','cobrado','pagado','paid')";
    }
    // 'all' = abiertos + cerrados (excluye cancelados)
    return "AND LOWER(COALESCE(status,'')) NOT IN ('cancelled','canceled','cancelado')";
}

function getCancellations($pdo, $start = null, $end = null, $limit = 50) {
    try {
        if ($start && $end) {
            $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                    FROM sr_cancellations
                    WHERE cancel_date BETWEEN ? AND ?
                    ORDER BY cancel_date DESC
                    LIMIT ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end, $limit]);
        } else {
            $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                    FROM sr_cancellations
                    ORDER BY cancel_date DESC
                    LIMIT ?";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$limit]);
        }
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        return array_map(function($r) {
            return [
                'ticket_number' => $r['ticket_number'],
                'amount'        => floatval($r['amount']),
                'user_name'     => $r['user_name'] ?? '',
                'reason'        => $r['reason'] ?? '',
                'cancel_date'   => $r['cancel_date']
            ];
        }, $results);
    } catch (Exception $e) {
        return []; // Tabla puede no existir aún
    }
}

function getOpenStats($pdo, $todayStart, $todayEnd) {
    $ticketKeyExpr = "COALESCE(
        NULLIF(TRIM(REPLACE(CAST(sr_ticket_id AS CHAR), '#', '')), ''),
        NULLIF(TRIM(REPLACE(CAST(folio AS CHAR), '#', '')), ''),
        NULLIF(TRIM(REPLACE(CAST(ticket_number AS CHAR), '#', '')), '')
    )";
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(o.total), 0) as total_sales,
                   COALESCE(SUM(COALESCE(o.tip, 0)), 0) as total_tips,
                   COALESCE(AVG(o.total), 0) as average_ticket, 
                   COALESCE(SUM(o.covers), 0) as total_covers
            FROM sr_sales o
            WHERE LOWER(COALESCE(o.status,'')) IN ('open','abierto','pending')
              AND o.sale_datetime BETWEEN ? AND ?
              AND (
                ($ticketKeyExpr) IS NULL
                OR NOT EXISTS (
                  SELECT 1
                  FROM sr_sales c
                  WHERE LOWER(COALESCE(c.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                    AND c.sale_datetime BETWEEN ? AND ?
                    AND COALESCE(
                      NULLIF(TRIM(REPLACE(CAST(c.sr_ticket_id AS CHAR), '#', '')), ''),
                      NULLIF(TRIM(REPLACE(CAST(c.folio AS CHAR), '#', '')), ''),
                      NULLIF(TRIM(REPLACE(CAST(c.ticket_number AS CHAR), '#', '')), '')
                    ) = ($ticketKeyExpr)
                )
              )";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$todayStart, $todayEnd, $todayStart, $todayEnd]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return [
        'total' => floatval($result['total_sales']),
        'tips' => floatval($result['total_tips']),
        'checks' => intval($result['total_checks']),
        'average' => floatval($result['average_ticket']),
        'covers' => intval($result['total_covers'])
    ];
}

function getHistoricalOpenStats($pdo, $todayStart) {
    $ticketKeyExpr = "COALESCE(
        NULLIF(TRIM(REPLACE(CAST(sr_ticket_id AS CHAR), '#', '')), ''),
        NULLIF(TRIM(REPLACE(CAST(folio AS CHAR), '#', '')), ''),
        NULLIF(TRIM(REPLACE(CAST(ticket_number AS CHAR), '#', '')), '')
    )";
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(o.total), 0) as total_sales,
                   COALESCE(SUM(COALESCE(o.tip, 0)), 0) as total_tips,
                   COALESCE(AVG(o.total), 0) as average_ticket, 
                   COALESCE(SUM(o.covers), 0) as total_covers
            FROM sr_sales o
            WHERE LOWER(COALESCE(o.status,'')) IN ('open','abierto','pending')
              AND o.sale_datetime < ?
              AND (
                ($ticketKeyExpr) IS NULL
                OR NOT EXISTS (
                  SELECT 1
                  FROM sr_sales c
                  WHERE LOWER(COALESCE(c.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                    AND c.sale_datetime < ?
                    AND COALESCE(
                      NULLIF(TRIM(REPLACE(CAST(c.sr_ticket_id AS CHAR), '#', '')), ''),
                      NULLIF(TRIM(REPLACE(CAST(c.folio AS CHAR), '#', '')), ''),
                      NULLIF(TRIM(REPLACE(CAST(c.ticket_number AS CHAR), '#', '')), '')
                    ) = ($ticketKeyExpr)
                )
              )";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$todayStart, $todayStart]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return [
        'total' => floatval($result['total_sales']),
        'tips' => floatval($result['total_tips']),
        'checks' => intval($result['total_checks']),
        'average' => floatval($result['average_ticket']),
        'covers' => intval($result['total_covers'])
    ];
}

function getSalesStats($pdo, $start, $end) {
    // Replica exacta del reporte SoftRestaurant "Ventas por día sin impuestos":
    // - TOTAL CON IMPUESTOS = SUM(total) donde pagado=1, cancelado=0, NO cortesía
    // - Cortesía = ticket donde discount >= (subtotal + tax) → total cobrado = 0 o casi 0
    // - VENTA BRUTA = SUM(total - tax)  es decir subtotal real
    // - IMPUESTOS = SUM(tax)
    // - DESCUENTOS = SUM(discount) solo tickets con descuento parcial (no cortesía)
    // - CORTESÍAS = SUM(discount) de tickets con descuento total
    // Cortesía SR: total=0 con subtotal>0 (ticket gratis, no cobrado aunque pagado=1)
    // Descuento parcial: discount>0 y total>0 (cobro reducido)
    $sql = "SELECT 
                -- Conteos
                COUNT(*) as total_checks,
                COUNT(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN 1 END) as paid_checks,
                COUNT(CASE WHEN total = 0 AND COALESCE(subtotal,0) > 0 THEN 1 END) as courtesy_checks,

                -- TOTAL CON IMPUESTOS (excluye cortesías, igual que SR)
                COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total ELSE 0 END), 0) as net_sales,

                -- VENTA BRUTA sin impuestos (total - tax de tickets no cortesía)
                COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total - COALESCE(tax,0) ELSE 0 END), 0) as gross_sales,

                -- IMPUESTOS
                COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN COALESCE(tax,0) ELSE 0 END), 0) as total_tax,

                -- PROPINAS (siempre separadas)
                COALESCE(SUM(COALESCE(tip, 0)), 0) as total_tips,

                -- DESCUENTOS reales (solo tickets con discount>0 y que sí se cobraron)
                COALESCE(SUM(CASE WHEN COALESCE(discount,0) > 0 AND NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN discount ELSE 0 END), 0) as total_discounts,

                -- CORTESÍAS: valor del subtotal+tax de tickets con total=0
                COALESCE(SUM(CASE WHEN total = 0 AND COALESCE(subtotal,0) > 0 THEN COALESCE(subtotal,0)+COALESCE(tax,0) ELSE 0 END), 0) as total_courtesies,

                COALESCE(AVG(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total END), 0) as average_ticket,
                COALESCE(SUM(covers), 0) as total_covers,
                COALESCE(SUM(COALESCE(cash_amount,0)+COALESCE(card_amount,0)+COALESCE(voucher_amount,0)+COALESCE(other_amount,0)), 0) as total_collected
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              AND status = 'closed'";

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Cancelados
    $stmtC = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(total),0) as amt, COALESCE(SUM(tip),0) as tips
                             FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status='cancelled'");
    $stmtC->execute([$start, $end]);
    $cancelled = $stmtC->fetch(PDO::FETCH_ASSOC);

    // Abiertos
    $stmtO = $pdo->prepare("SELECT COUNT(*) as n, COALESCE(SUM(total),0) as amt
                             FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status='open'");
    $stmtO->execute([$start, $end]);
    $open = $stmtO->fetch(PDO::FETCH_ASSOC);

    return [
        'total'           => floatval($result['net_sales']),      // TOTAL CON IMPUESTOS (igual que SR)
        'gross_sales'     => floatval($result['gross_sales']),     // VENTA BRUTA sin IVA
        'total_tax'       => floatval($result['total_tax']),       // IMPUESTOS
        'tips'            => floatval($result['total_tips']),      // PROPINAS (separadas)
        'discounts'       => floatval($result['total_discounts']), // DESCUENTOS parciales
        'courtesies'      => floatval($result['total_courtesies']),// CORTESÍAS
        'courtesy_checks' => intval($result['courtesy_checks']),
        'checks'          => intval($result['paid_checks']),       // Solo tickets cobrados (sin cortesías)
        'all_checks'      => intval($result['total_checks']),
        'average'         => floatval($result['average_ticket']),
        'covers'          => intval($result['total_covers']),
        'collected'       => floatval($result['total_collected']),
        'cancelled'       => [
            'checks' => intval($cancelled['n']   ?? 0),
            'amount' => floatval($cancelled['amt'] ?? 0),
            'tips'   => floatval($cancelled['tips']?? 0),
        ],
        'open'            => [
            'checks' => intval($open['n']   ?? 0),
            'amount' => floatval($open['amt'] ?? 0),
        ],
    ];
}

function getPeriodComparison($pdo, $start, $end) {
    $startTs = strtotime($start);
    $endTs = strtotime($end);

    if (!$startTs || !$endTs || $endTs < $startTs) {
        return null;
    }

    $durationSeconds = ($endTs - $startTs) + 1;
    $prevEndTs = $startTs - 1;
    $prevStartTs = $prevEndTs - ($durationSeconds - 1);

    $current = getSalesStats($pdo, date('Y-m-d H:i:s', $startTs), date('Y-m-d H:i:s', $endTs));
    $previous = getSalesStats($pdo, date('Y-m-d H:i:s', $prevStartTs), date('Y-m-d H:i:s', $prevEndTs));

    $currentTotal = floatval($current['total'] ?? 0);
    $previousTotal = floatval($previous['total'] ?? 0);

    $deltaAmount = $currentTotal - $previousTotal;
    $deltaPercent = $previousTotal > 0 ? round(($deltaAmount / $previousTotal) * 100, 2) : null;

    return [
        'current' => $current,
        'previous' => $previous,
        'previous_period' => [
            'start' => date('Y-m-d H:i:s', $prevStartTs),
            'end' => date('Y-m-d H:i:s', $prevEndTs)
        ],
        'delta' => [
            'amount' => round($deltaAmount, 2),
            'percent' => $deltaPercent
        ]
    ];
}

function getSales($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $sql = "SELECT 
                sr_ticket_id,
                folio,
                sale_date,
                sale_time,
                sale_datetime,
                total,
                subtotal,
                tax,
                tip,
                discount,
                waiter_name,
                table_number,
                covers,
                payment_type,
                status
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
            ORDER BY sale_datetime DESC
            LIMIT 100";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

function getHourlySales($pdo, $startDT, $endDT, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $sql = "SELECT 
                HOUR(sale_datetime) as hour,
                COUNT(*) as checks,
                SUM(total) as total
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
            GROUP BY HOUR(sale_datetime)
            ORDER BY hour";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$startDT, $endDT]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Llenar horas faltantes con 0
    $hourly = [];
    for ($h = 0; $h < 24; $h++) {
        $found = false;
        foreach ($results as $r) {
            if (intval($r['hour']) === $h) {
                $hourly[] = [
                    'hour' => sprintf('%02d:00', $h),
                    'checks' => intval($r['checks']),
                    'total' => floatval($r['total'])
                ];
                $found = true;
                break;
            }
        }
        if (!$found) {
            $hourly[] = [
                'hour' => sprintf('%02d:00', $h),
                'checks' => 0,
                'total' => 0
            ];
        }
    }
    
    return $hourly;
}

function getDailySales($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $sql = "SELECT 
                DATE(DATE_SUB(sale_datetime, INTERVAL 8 HOUR)) as date,
                COUNT(*) as checks,
                SUM(total) as total,
                AVG(total) as average
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
            GROUP BY DATE(DATE_SUB(sale_datetime, INTERVAL 8 HOUR))
            ORDER BY DATE(DATE_SUB(sale_datetime, INTERVAL 8 HOUR))";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return array_map(function($r) {
        return [
            'date' => date('d/m', strtotime($r['date'])),
            'checks' => intval($r['checks']),
            'total' => floatval($r['total']),
            'average' => floatval($r['average'])
        ];
    }, $results);
}

function getTopProducts($pdo, $start, $end, $statusFilter = 'closed') {
    $cond = getStatusCondition($statusFilter);
    $statusCond = $cond ? str_replace('AND status', 'AND s.status', $cond) : '';
    $results = [];

    // Estrategia 1: fuente unificada (sr_sale_items + sr_ticket_items)
    try {
        $itemsSource = "
            SELECT
                sr_ticket_id AS ticket_ref,
                product_name,
                quantity AS qty,
                subtotal AS sub
            FROM sr_sale_items
            WHERE product_name IS NOT NULL AND product_name != ''
            UNION ALL
            SELECT
                t.folio AS ticket_ref,
                t.product_name,
                t.qty AS qty,
                t.subtotal AS sub
            FROM sr_ticket_items t
            LEFT JOIN sr_sale_items s2
                ON s2.sr_ticket_id = t.folio
               AND s2.product_name = t.product_name
               AND ABS(COALESCE(s2.subtotal, 0) - COALESCE(t.subtotal, 0)) < 0.01
            WHERE s2.id IS NULL
              AND t.product_name IS NOT NULL
              AND t.product_name != ''
        ";
        $ticketJoinCond = "(
            REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '')
            OR REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.folio AS CHAR)), '#', '')
            OR REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.ticket_number AS CHAR)), '#', '')
        )";
        $sql = "SELECT 
                    si.product_name,
                    SUM(si.qty) as total_qty,
                    COUNT(DISTINCT s.sr_ticket_id) as tickets,
                    SUM(si.sub) as total_sales
                FROM ($itemsSource) si
                INNER JOIN sr_sales s ON $ticketJoinCond
                WHERE s.sale_datetime BETWEEN ? AND ?
                  $statusCond
                  AND si.product_name IS NOT NULL
                  AND si.product_name != ''
                GROUP BY si.product_name
                ORDER BY total_qty DESC, total_sales DESC
                LIMIT 10";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $results = [];
    }

    // Estrategia 2 (fallback): solo sr_sale_items
    if (empty($results)) {
        try {
            $sql = "SELECT 
                        si.product_name,
                        SUM(si.quantity) as total_qty,
                        COUNT(DISTINCT si.sr_ticket_id) as tickets,
                        SUM(si.subtotal) as total_sales
                    FROM sr_sale_items si
                    INNER JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
                    WHERE s.sale_datetime BETWEEN ? AND ?
                      $statusCond
                      AND si.product_name IS NOT NULL
                      AND si.product_name != ''
                    GROUP BY si.product_name
                    ORDER BY total_qty DESC, total_sales DESC
                    LIMIT 10";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $results = [];
        }
    }

    // Estrategia 3 (fallback final): solo sr_ticket_items
    if (empty($results)) {
        try {
            $sql = "SELECT
                        ti.product_name,
                        SUM(ti.qty) as total_qty,
                        COUNT(DISTINCT s.sr_ticket_id) as tickets,
                        SUM(ti.subtotal) as total_sales
                    FROM sr_ticket_items ti
                    INNER JOIN sr_sales s
                        ON (
                            REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.folio AS CHAR)), '#', '')
                            OR REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.ticket_number AS CHAR)), '#', '')
                            OR REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '')
                        )
                    WHERE s.sale_datetime BETWEEN ? AND ?
                      $statusCond
                      AND ti.product_name IS NOT NULL
                      AND ti.product_name != ''
                    GROUP BY ti.product_name
                    ORDER BY total_qty DESC, total_sales DESC
                    LIMIT 10";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $results = [];
        }
    }
    
    // Calcular porcentaje sobre venta de top productos
    $totalSales = array_sum(array_map(fn($r) => floatval($r['total_sales'] ?? 0), $results));
    
    return array_map(function($r) use ($totalSales) {
        return [
            'product_name' => (string)($r['product_name'] ?? ''),
            'total_qty' => floatval($r['total_qty'] ?? 0),
            'tickets' => intval($r['tickets'] ?? 0),
            'total_sales' => floatval($r['total_sales'] ?? 0),
            'percentage' => $totalSales > 0 ? round((floatval($r['total_sales'] ?? 0) / $totalSales) * 100, 1) : 0
        ];
    }, $results);
}

function getWaiterPerformance($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $sql = "SELECT 
                waiter_name as name,
                COUNT(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN 1 END) as checks,
                COALESCE(SUM(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total ELSE 0 END),0) as total,
                COALESCE(AVG(CASE WHEN NOT (total = 0 AND COALESCE(subtotal,0) > 0) THEN total END),0) as average,
                COALESCE(SUM(tip),0) as tips,
                COALESCE(SUM(covers),0) as covers
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
              AND waiter_name IS NOT NULL
            GROUP BY waiter_name
            ORDER BY total DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    return array_map(function($r) {
        return [
            'name' => $r['name'],
            'checks' => intval($r['checks']),
            'total' => floatval($r['total']),
            'average' => floatval($r['average']),
            'tips' => floatval($r['tips']),
            'covers' => intval($r['covers'])
        ];
    }, $results);
}

function getPaymentMethods($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    
    // Sumar montos reales de pago — excluir cortesías (total=0, subtotal>0)
    $sql = "SELECT 
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN cash_amount ELSE 0 END), 0) as cash_total,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN card_amount ELSE 0 END), 0) as card_total,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN voucher_amount ELSE 0 END), 0) as voucher_total,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN other_amount ELSE 0 END), 0) as other_total,
                COUNT(CASE WHEN cash_amount > 0 AND NOT (total=0 AND COALESCE(subtotal,0)>0) THEN 1 END) as cash_count,
                COUNT(CASE WHEN card_amount > 0 AND NOT (total=0 AND COALESCE(subtotal,0)>0) THEN 1 END) as card_count,
                COUNT(CASE WHEN voucher_amount > 0 AND NOT (total=0 AND COALESCE(subtotal,0)>0) THEN 1 END) as voucher_count,
                COUNT(CASE WHEN other_amount > 0 AND NOT (total=0 AND COALESCE(subtotal,0)>0) THEN 1 END) as other_count
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $methods = [];
    
    if ($result['cash_total'] > 0) {
        $methods[] = [
            'name' => 'Efectivo',
            'count' => intval($result['cash_count']),
            'value' => floatval($result['cash_total'])
        ];
    }
    
    if ($result['card_total'] > 0) {
        $methods[] = [
            'name' => 'Tarjeta',
            'count' => intval($result['card_count']),
            'value' => floatval($result['card_total'])
        ];
    }
    
    if ($result['voucher_total'] > 0) {
        $methods[] = [
            'name' => 'Vales',
            'count' => intval($result['voucher_count']),
            'value' => floatval($result['voucher_total'])
        ];
    }
    
    if ($result['other_total'] > 0) {
        $methods[] = [
            'name' => 'Transferencia / Otros',
            'count' => intval($result['other_count']),
            'value' => floatval($result['other_total'])
        ];
    }
    
    return $methods;
}

function getDetailedAnalytics($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $itemsSource = "
        SELECT
            sr_ticket_id AS ticket_ref,
            product_name,
            quantity AS qty,
            subtotal AS sub
        FROM sr_sale_items
        WHERE product_name IS NOT NULL AND product_name != ''
        UNION ALL
        SELECT
            t.folio AS ticket_ref,
            t.product_name,
            t.qty AS qty,
            t.subtotal AS sub
        FROM sr_ticket_items t
        LEFT JOIN sr_sale_items s
            ON s.sr_ticket_id = t.folio
           AND s.product_name = t.product_name
           AND ABS(COALESCE(s.subtotal, 0) - COALESCE(t.subtotal, 0)) < 0.01
        WHERE s.id IS NULL
          AND t.product_name IS NOT NULL
          AND t.product_name != ''
    ";
    $ticketJoinCond = "(
        REPLACE(TRIM(CAST(i.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '')
        OR REPLACE(TRIM(CAST(i.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.folio AS CHAR)), '#', '')
        OR REPLACE(TRIM(CAST(i.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.ticket_number AS CHAR)), '#', '')
    )";
    
    // 1. Productos más y menos vendidos
    $topProducts = [];
    $bottomProducts = [];
    try {
        $sql = "SELECT i.product_name, 
                       SUM(i.qty) as total_qty,
                       SUM(i.sub) as total_sales,
                       COUNT(DISTINCT s.sr_ticket_id) as tickets
                FROM ($itemsSource) i
                INNER JOIN sr_sales s ON $ticketJoinCond
                WHERE s.sale_datetime BETWEEN ? AND ?
                  $statusCond
                  AND i.product_name IS NOT NULL
                  AND i.product_name != ''
                GROUP BY i.product_name
                ORDER BY total_qty DESC
                LIMIT 5";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $topProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $sql2 = "SELECT i.product_name, 
                        SUM(i.qty) as total_qty,
                        SUM(i.sub) as total_sales,
                        COUNT(DISTINCT s.sr_ticket_id) as tickets
                 FROM ($itemsSource) i
                 INNER JOIN sr_sales s ON $ticketJoinCond
                 WHERE s.sale_datetime BETWEEN ? AND ?
                   $statusCond
                   AND i.product_name IS NOT NULL
                   AND i.product_name != ''
                 GROUP BY i.product_name
                 ORDER BY total_qty ASC
                 LIMIT 5";
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->execute([$start, $end]);
        $bottomProducts = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Tabla items puede no existir
    }
    
    // 2. Bebidas más y menos vendidas (asumiendo categoría o nombre)
    $topBeverages = [];
    $bottomBeverages = [];
    try {
        $sql = "SELECT i.product_name, 
                       SUM(i.qty) as total_qty,
                       SUM(i.sub) as total_sales
                FROM ($itemsSource) i
                INNER JOIN sr_sales s ON $ticketJoinCond
                WHERE s.sale_datetime BETWEEN ? AND ?
                  $statusCond
                  AND (i.product_name LIKE '%BEBIDA%' 
                       OR i.product_name LIKE '%REFRESCO%'
                       OR i.product_name LIKE '%AGUA%'
                       OR i.product_name LIKE '%CERVEZA%'
                       OR i.product_name LIKE '%VINO%'
                       OR i.product_name LIKE '%JUGO%')
                GROUP BY i.product_name
                ORDER BY total_qty DESC
                LIMIT 5";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $topBeverages = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        $sql2 = "SELECT i.product_name, 
                        SUM(i.qty) as total_qty,
                        SUM(i.sub) as total_sales
                 FROM ($itemsSource) i
                 INNER JOIN sr_sales s ON $ticketJoinCond
                 WHERE s.sale_datetime BETWEEN ? AND ?
                   $statusCond
                   AND (i.product_name LIKE '%BEBIDA%' 
                        OR i.product_name LIKE '%REFRESCO%'
                        OR i.product_name LIKE '%AGUA%'
                        OR i.product_name LIKE '%CERVEZA%'
                        OR i.product_name LIKE '%VINO%'
                        OR i.product_name LIKE '%JUGO%')
                 GROUP BY i.product_name
                 ORDER BY total_qty ASC
                 LIMIT 5";
        $stmt2 = $pdo->prepare($sql2);
        $stmt2->execute([$start, $end]);
        $bottomBeverages = $stmt2->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Tabla items puede no existir
    }
    
    // 3. Propinas (pagadas vs no pagadas)
    $tipsBreakdown = [
        'total_tips' => 0,
        'paid_tips' => 0,
        'unpaid_tips' => 0,
        'paid_count' => 0,
        'unpaid_count' => 0
    ];
    try {
        $sql = "SELECT 
                    COALESCE(SUM(tip), 0) as total_tips,
                    COALESCE(SUM(CASE WHEN status = 'closed' THEN tip ELSE 0 END), 0) as paid_tips,
                    COALESCE(SUM(CASE WHEN status = 'open' THEN tip ELSE 0 END), 0) as unpaid_tips,
                    COUNT(CASE WHEN status = 'closed' AND tip > 0 THEN 1 END) as paid_count,
                    COUNT(CASE WHEN status = 'open' AND tip > 0 THEN 1 END) as unpaid_count
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  AND tip > 0";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            $tipsBreakdown = [
                'total_tips' => floatval($result['total_tips']),
                'paid_tips' => floatval($result['paid_tips']),
                'unpaid_tips' => floatval($result['unpaid_tips']),
                'paid_count' => intval($result['paid_count']),
                'unpaid_count' => intval($result['unpaid_count'])
            ];
        }
    } catch (Exception $e) {
        // Error en consulta
    }
    
    // 4. Hora de más actividad
    $peakHour = null;
    try {
        $sql = "SELECT 
                    HOUR(sale_datetime) as hour,
                    COUNT(*) as tickets,
                    SUM(total) as sales
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  $statusCond
                GROUP BY HOUR(sale_datetime)
                ORDER BY tickets DESC
                LIMIT 1";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($result) {
            $peakHour = [
                'hour' => intval($result['hour']),
                'tickets' => intval($result['tickets']),
                'sales' => floatval($result['sales'])
            ];
        }
    } catch (Exception $e) {
        // Error en consulta
    }
    
    // 5. Cancelaciones del período
    $periodCancellations = [];
    try {
        $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                FROM sr_cancellations
                WHERE cancel_date BETWEEN ? AND ?
                ORDER BY cancel_date DESC
                LIMIT 20";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $periodCancellations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        // Tabla puede no existir
    }
    
    // 6. Desglose por método de pago (usando montos reales)
    $paymentBreakdown = [];
    try {
        $sql = "SELECT 
                    COALESCE(SUM(cash_amount), 0) as cash_sales,
                    COALESCE(SUM(card_amount), 0) as card_sales,
                    COALESCE(SUM(voucher_amount), 0) as voucher_sales,
                    COALESCE(SUM(other_amount), 0) as other_sales,
                    COUNT(CASE WHEN cash_amount > 0 THEN 1 END) as cash_count,
                    COUNT(CASE WHEN card_amount > 0 THEN 1 END) as card_count,
                    COUNT(CASE WHEN voucher_amount > 0 THEN 1 END) as voucher_count,
                    COUNT(CASE WHEN other_amount > 0 THEN 1 END) as other_count,
                    COALESCE(SUM(CASE WHEN cash_amount > 0 THEN tip ELSE 0 END), 0) as cash_tips,
                    COALESCE(SUM(CASE WHEN card_amount > 0 THEN tip ELSE 0 END), 0) as card_tips
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  $statusCond";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['cash_sales'] > 0) {
            $paymentBreakdown[] = [
                'payment_type' => 'cash',
                'count' => intval($result['cash_count']),
                'sales' => floatval($result['cash_sales']),
                'tips' => floatval($result['cash_tips'])
            ];
        }
        if ($result['card_sales'] > 0) {
            $paymentBreakdown[] = [
                'payment_type' => 'card',
                'count' => intval($result['card_count']),
                'sales' => floatval($result['card_sales']),
                'tips' => floatval($result['card_tips'])
            ];
        }
        if ($result['voucher_sales'] > 0) {
            $paymentBreakdown[] = [
                'payment_type' => 'voucher',
                'count' => intval($result['voucher_count']),
                'sales' => floatval($result['voucher_sales']),
                'tips' => 0
            ];
        }
        if ($result['other_sales'] > 0) {
            $paymentBreakdown[] = [
                'payment_type' => 'other',
                'count' => intval($result['other_count']),
                'sales' => floatval($result['other_sales']),
                'tips' => 0
            ];
        }
    } catch (Exception $e) {
        // Error en consulta
    }
    
    // Producto #1 por categoría: Alimentos, Bebidas, Otros
    $topByCategory = ['food' => null, 'beverage' => null, 'other' => null];
    try {
        // Bebidas
        $sqlBev = "SELECT i.product_name, SUM(i.qty) as total_qty, SUM(i.sub) as total_sales
                   FROM ($itemsSource) i
                   INNER JOIN sr_sales s ON $ticketJoinCond
                   WHERE s.sale_datetime BETWEEN ? AND ? $statusCond
                     AND (i.product_name LIKE '%CERVEZA%' OR i.product_name LIKE '%REFRESCO%'
                          OR i.product_name LIKE '%AGUA%' OR i.product_name LIKE '%VINO%'
                          OR i.product_name LIKE '%JUGO%' OR i.product_name LIKE '%BEBIDA%'
                          OR i.product_name LIKE '%COCA%' OR i.product_name LIKE '%LIMONADA%'
                          OR i.product_name LIKE '%CAFE%' OR i.product_name LIKE '%TÉ%'
                          OR i.product_name LIKE '%MICHELADA%' OR i.product_name LIKE '%MARGARITA%'
                          OR i.product_name LIKE '%COPA%' OR i.product_name LIKE '%SHOT%'
                          OR i.product_name LIKE '%COCKTAIL%' OR i.product_name LIKE '%COCTEL%')
                   GROUP BY i.product_name ORDER BY total_qty DESC LIMIT 1";
        $stmtBev = $pdo->prepare($sqlBev);
        $stmtBev->execute([$start, $end]);
        $topByCategory['beverage'] = $stmtBev->fetch(PDO::FETCH_ASSOC) ?: null;

        // Alimentos (excluir bebidas)
        $sqlFood = "SELECT i.product_name, SUM(i.qty) as total_qty, SUM(i.sub) as total_sales
                    FROM ($itemsSource) i
                    INNER JOIN sr_sales s ON $ticketJoinCond
                    WHERE s.sale_datetime BETWEEN ? AND ? $statusCond
                      AND i.product_name IS NOT NULL AND i.product_name != ''
                      AND i.product_name NOT LIKE '%CERVEZA%' AND i.product_name NOT LIKE '%REFRESCO%'
                      AND i.product_name NOT LIKE '%AGUA%' AND i.product_name NOT LIKE '%VINO%'
                      AND i.product_name NOT LIKE '%JUGO%' AND i.product_name NOT LIKE '%BEBIDA%'
                      AND i.product_name NOT LIKE '%COCA%' AND i.product_name NOT LIKE '%LIMONADA%'
                      AND i.product_name NOT LIKE '%CAFE%' AND i.product_name NOT LIKE '%TÉ%'
                      AND i.product_name NOT LIKE '%MICHELADA%' AND i.product_name NOT LIKE '%MARGARITA%'
                      AND i.product_name NOT LIKE '%COPA%' AND i.product_name NOT LIKE '%SHOT%'
                      AND i.product_name NOT LIKE '%COCKTAIL%' AND i.product_name NOT LIKE '%COCTEL%'
                      AND i.product_name NOT LIKE '%PROPINA%' AND i.product_name NOT LIKE '%SERVICIO%'
                      AND i.product_name NOT LIKE '%CARGO%' AND i.product_name NOT LIKE '%DESCUENTO%'
                    GROUP BY i.product_name ORDER BY total_qty DESC LIMIT 1";
        $stmtFood = $pdo->prepare($sqlFood);
        $stmtFood->execute([$start, $end]);
        $topByCategory['food'] = $stmtFood->fetch(PDO::FETCH_ASSOC) ?: null;

        // Top general (sin categoría) = el #1 absoluto
        if (!empty($topProducts)) {
            $topByCategory['overall'] = $topProducts[0];
        }
    } catch (Exception $e) {
        // Error en consulta de categorías
    }

    return [
        'top_products' => $topProducts,
        'bottom_products' => $bottomProducts,
        'top_beverages' => $topBeverages,
        'bottom_beverages' => $bottomBeverages,
        'top_by_category' => $topByCategory,
        'tips_breakdown' => $tipsBreakdown,
        'peak_hour' => $peakHour,
        'cancellations' => $periodCancellations,
        'payment_breakdown' => $paymentBreakdown,
        'debug' => [
            'sql_top' => $sql,
            'params' => [$start, $end],
            'status_cond' => $statusCond
        ]
    ];
}
