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
$statusFilter = $_GET['status'] ?? 'closed'; // 'closed' | 'open' | 'all'

// Límites de turno SoftRestaurant: turno empieza a las 06:00 y termina 07:59:59 del día siguiente
$shiftHour = 6;
$currentHour = (int)date('H');

// Si es antes de las 6am, el turno actual comenzó ayer
$shiftTodayDate = ($currentHour < $shiftHour)
    ? date('Y-m-d', strtotime('-1 day'))
    : date('Y-m-d');
$shiftYesterdayDate = date('Y-m-d', strtotime($shiftTodayDate . ' -1 day'));

// Límites de cada período (datetime completo con turno)
$todayStart     = $shiftTodayDate . ' 06:00:00';
$todayEnd       = date('Y-m-d', strtotime($shiftTodayDate . ' +1 day')) . ' 07:59:59';
$yesterdayStart = $shiftYesterdayDate . ' 06:00:00';
$yesterdayEnd   = $shiftTodayDate . ' 07:59:59';
$weekStart      = date('Y-m-d', strtotime($shiftTodayDate . ' -6 days')) . ' 06:00:00';
$weekEnd        = $todayEnd;
$monthStart     = date('Y-m-01', strtotime($shiftTodayDate)) . ' 06:00:00';
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
        $start = $monthStart;
        $end   = $monthEnd;
        break;
    case 'week1':
        $start = date('Y-m-01', strtotime($shiftTodayDate)) . ' 06:00:00';
        $end   = date('Y-m-08', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week2':
        $start = date('Y-m-08', strtotime($shiftTodayDate)) . ' 06:00:00';
        $end   = date('Y-m-15', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week3':
        $start = date('Y-m-15', strtotime($shiftTodayDate)) . ' 06:00:00';
        $end   = date('Y-m-22', strtotime($shiftTodayDate)) . ' 07:59:59';
        break;
    case 'week4':
        $start = date('Y-m-22', strtotime($shiftTodayDate)) . ' 06:00:00';
        $end   = date('Y-m-d', strtotime(date('Y-m-t', strtotime($shiftTodayDate)) . ' +1 day')) . ' 07:59:59';
        break;
    case 'custom':
        $customStart = $startDate ?: $shiftTodayDate;
        $customEnd   = $endDate ?: $shiftTodayDate;
        $start = $customStart . ' 06:00:00';
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

    // Tickets abiertos de hoy
    $openStats = getOpenStats($pdo, $todayStart, $todayEnd);
    
    // Tickets abiertos históricos (de turnos anteriores)
    $historicalOpenStats = getHistoricalOpenStats($pdo, $todayStart);

    // Cancelaciones recientes
    $cancellations = getCancellations($pdo);

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

    echo json_encode([
        'success' => true,
        'stats' => $stats,
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
        'analytics' => $analytics
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

// ── FUNCIONES AUXILIARES ──────────────────────────────────

function getStatusCondition($statusFilter) {
    if ($statusFilter === 'open') return "AND status = 'open'";
    if ($statusFilter === 'all') return "AND status IN ('open', 'closed')";
    return "AND status = 'closed'";
}

function getCancellations($pdo, $limit = 30) {
    try {
        $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                FROM sr_cancellations
                ORDER BY cancel_date DESC
                LIMIT ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$limit]);
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
    // Tickets abiertos del turno de hoy (sin propinas)
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(total - COALESCE(tip, 0)), 0) as total_sales,
                   COALESCE(SUM(COALESCE(tip, 0)), 0) as total_tips,
                   COALESCE(AVG(total - COALESCE(tip, 0)), 0) as average_ticket, 
                   COALESCE(SUM(covers), 0) as total_covers
            FROM sr_sales 
            WHERE status = 'open' 
              AND sale_datetime BETWEEN ? AND ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$todayStart, $todayEnd]);
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
    // Tickets abiertos históricos (de turnos anteriores, sin propinas)
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(total - COALESCE(tip, 0)), 0) as total_sales,
                   COALESCE(SUM(COALESCE(tip, 0)), 0) as total_tips,
                   COALESCE(AVG(total - COALESCE(tip, 0)), 0) as average_ticket, 
                   COALESCE(SUM(covers), 0) as total_covers
            FROM sr_sales 
            WHERE status = 'open' 
              AND sale_datetime < ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$todayStart]);
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
    // Usar suma de métodos de pago (que incluyen propinas) y restar propinas
    // Esto coincide con el corte de caja de SoftRestaurant
    $sql = "SELECT 
                COUNT(*) as total_checks,
                COALESCE(SUM(
                    COALESCE(cash_amount, 0) + 
                    COALESCE(card_amount, 0) + 
                    COALESCE(voucher_amount, 0) + 
                    COALESCE(other_amount, 0)
                ), 0) as total_sales,
                COALESCE(SUM(COALESCE(tip, 0)), 0) as total_tips,
                COALESCE(AVG(
                    COALESCE(cash_amount, 0) + 
                    COALESCE(card_amount, 0) + 
                    COALESCE(voucher_amount, 0) + 
                    COALESCE(other_amount, 0)
                ), 0) as average_ticket,
                COALESCE(SUM(covers), 0) as total_covers
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              AND status IN ('open', 'closed')";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    
    return [
        'total' => floatval($result['total_sales']),
        'tips' => floatval($result['total_tips']),
        'checks' => intval($result['total_checks']),
        'average' => floatval($result['average_ticket']),
        'covers' => intval($result['total_covers'])
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
                DATE(DATE_SUB(sale_datetime, INTERVAL 6 HOUR)) as date,
                COUNT(*) as checks,
                SUM(total) as total,
                AVG(total) as average
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
            GROUP BY DATE(DATE_SUB(sale_datetime, INTERVAL 6 HOUR))
            ORDER BY DATE(DATE_SUB(sale_datetime, INTERVAL 6 HOUR))";
    
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
    $sql = "SELECT 
                si.product_name as name,
                SUM(si.quantity) as quantity,
                SUM(si.subtotal) as total
            FROM sr_sale_items si
            INNER JOIN sr_sales s ON si.sale_id = s.id
            WHERE s.sale_datetime BETWEEN ? AND ?
              $statusCond
            GROUP BY si.product_name
            ORDER BY total DESC
            LIMIT 10";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular porcentaje
    $totalSales = array_sum(array_column($results, 'total'));
    
    return array_map(function($r) use ($totalSales) {
        return [
            'name' => $r['name'],
            'quantity' => floatval($r['quantity']),
            'total' => floatval($r['total']),
            'percentage' => $totalSales > 0 ? round(($r['total'] / $totalSales) * 100, 1) : 0
        ];
    }, $results);
}

function getWaiterPerformance($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $sql = "SELECT 
                waiter_name as name,
                COUNT(*) as checks,
                SUM(total) as total,
                AVG(total) as average,
                SUM(tip) as tips,
                SUM(covers) as covers
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
    
    // Sumar los montos reales de cada método de pago
    $sql = "SELECT 
                COALESCE(SUM(cash_amount), 0) as cash_total,
                COALESCE(SUM(card_amount), 0) as card_total,
                COALESCE(SUM(voucher_amount), 0) as voucher_total,
                COALESCE(SUM(other_amount), 0) as other_total,
                COUNT(CASE WHEN cash_amount > 0 THEN 1 END) as cash_count,
                COUNT(CASE WHEN card_amount > 0 THEN 1 END) as card_count,
                COUNT(CASE WHEN voucher_amount > 0 THEN 1 END) as voucher_count,
                COUNT(CASE WHEN other_amount > 0 THEN 1 END) as other_count
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
            'name' => 'Otros',
            'count' => intval($result['other_count']),
            'value' => floatval($result['other_total'])
        ];
    }
    
    return $methods;
}

function getDetailedAnalytics($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    
    // 1. Productos más y menos vendidos
    $topProducts = [];
    $bottomProducts = [];
    try {
        $sql = "SELECT i.product_name, 
                       SUM(i.quantity) as total_qty,
                       SUM(i.total) as total_sales,
                       COUNT(DISTINCT i.sr_ticket_id) as tickets
                FROM sr_sale_items i
                INNER JOIN sr_sales s ON i.sr_ticket_id = s.sr_ticket_id
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
                        SUM(i.quantity) as total_qty,
                        SUM(i.total) as total_sales,
                        COUNT(DISTINCT i.sr_ticket_id) as tickets
                 FROM sr_sale_items i
                 INNER JOIN sr_sales s ON i.sr_ticket_id = s.sr_ticket_id
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
                       SUM(i.quantity) as total_qty,
                       SUM(i.total) as total_sales
                FROM sr_sale_items i
                INNER JOIN sr_sales s ON i.sr_ticket_id = s.sr_ticket_id
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
                        SUM(i.quantity) as total_qty,
                        SUM(i.total) as total_sales
                 FROM sr_sale_items i
                 INNER JOIN sr_sales s ON i.sr_ticket_id = s.sr_ticket_id
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
    
    return [
        'top_products' => $topProducts,
        'bottom_products' => $bottomProducts,
        'top_beverages' => $topBeverages,
        'bottom_beverages' => $bottomBeverages,
        'tips_breakdown' => $tipsBreakdown,
        'peak_hour' => $peakHour,
        'cancellations' => $periodCancellations,
        'payment_breakdown' => $paymentBreakdown
    ];
}
