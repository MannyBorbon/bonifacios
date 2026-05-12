<?php
/**
 * API para obtener datos de ventas de SoftRestaurant en tiempo real
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

requireAuth();

$pdo = getPDO();
$SR_HAS_CHEQUE_PAYMENTS_TABLE = sr_cheque_payments_table_exists($pdo);
$SR_USE_CHEQUE_PAYMENT_EVIDENCE = true;

// Obtener parámetros (validados)
$allowedRanges = ['today', 'yesterday', 'week', 'month', 'week1', 'week2', 'week3', 'week4', 'custom'];
$range = strtolower(trim((string)($_GET['range'] ?? 'today')));
if (!in_array($range, $allowedRanges, true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'range inválido']);
    exit;
}

$startDate = trim((string)($_GET['start'] ?? ''));
$endDate = trim((string)($_GET['end'] ?? ''));

$statusFilter = strtolower(trim((string)($_GET['status'] ?? 'all')));
if (!in_array($statusFilter, ['all', 'open', 'closed'], true)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'status inválido']);
    exit;
}

$selectedMonth = isset($_GET['month']) ? (int)$_GET['month'] : null;
$selectedYear = isset($_GET['year']) ? (int)$_GET['year'] : null;
if ($selectedMonth !== null && ($selectedMonth < 1 || $selectedMonth > 12)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'month inválido']);
    exit;
}
if ($selectedYear !== null && ($selectedYear < 2000 || $selectedYear > 2100)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'year inválido']);
    exit;
}

if ($range === 'custom') {
    if ($startDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $startDate)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'start debe ser YYYY-MM-DD']);
        exit;
    }
    if ($endDate !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $endDate)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'end debe ser YYYY-MM-DD']);
        exit;
    }
    if ($startDate !== '' && $endDate !== '' && strtotime($endDate . ' 00:00:00') < strtotime($startDate . ' 00:00:00')) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'end debe ser >= start']);
        exit;
    }
}
// sections: omitido = respuesta completa (compat). core = sin analytics/top/waiters/tips_by_waiter. heavy = solo ese bloque (JSON parcial para fusionar en el front).
$sectionsRaw = strtolower(trim((string)($_GET['sections'] ?? '')));
$sectionsMode = in_array($sectionsRaw, ['core', 'heavy'], true) ? $sectionsRaw : 'all';
// include_compare=1: calcular bloque de comparación (consulta extra). En core se omite por defecto para acelerar cambio de rango.
$includeCompare = in_array(strtolower(trim((string)($_GET['include_compare'] ?? '0'))), ['1', 'true', 'yes', 'on'], true);
// include_sales=0: omite listado detallado de tickets para acelerar vistas donde no se muestra esa tabla.
$includeSales = !in_array(strtolower(trim((string)($_GET['include_sales'] ?? '1'))), ['0', 'false', 'no', 'off'], true);
// include_open_stats=0: omite cálculos de abiertos (queries con NOT EXISTS costosas) en rangos históricos.
$includeOpenStats = !in_array(strtolower(trim((string)($_GET['include_open_stats'] ?? '1'))), ['0', 'false', 'no', 'off'], true);
// include_historical_open=0: omite histórico de abiertos cuando no se usa en la UI actual.
$includeHistoricalOpen = !in_array(strtolower(trim((string)($_GET['include_historical_open'] ?? '1'))), ['0', 'false', 'no', 'off'], true);
// Para evitar falsos 0 en rangos históricos, mantener activas ambas señales de cobro.
$includePaymentLines = true;
$includeChequeEvidence = true;
$SR_USE_CHEQUE_PAYMENT_EVIDENCE = $includeChequeEvidence;

// Listado de tickets: tope de filas para evitar timeouts y JSON enormes (100–5000, default 2500)
$salesListMax = 2500;
if (isset($_GET['sales_limit'])) {
    $salesListMax = max(100, min(5000, (int)$_GET['sales_limit']));
}

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
    // sections=heavy: solo bloque pesado (el front lo fusiona con un core previo).
    if ($sectionsMode === 'heavy') {
        $topProducts = getTopProducts($pdo, $start, $end, $statusFilter);
        $waiters = getWaiterPerformance($pdo, $start, $end, $statusFilter);
        $analytics = getDetailedAnalytics($pdo, $start, $end, $statusFilter);
        $tipsByWaiter = getTipsByWaiter($pdo, $start, $end);
        sales_emit_json([
            'success' => true,
            'partial' => true,
            'sections' => 'heavy',
            'top_products' => $topProducts,
            'waiters' => $waiters,
            'analytics' => $analytics,
            'tips_by_waiter' => $tipsByWaiter,
        ]);
        return;
    }

    $includeHeavy = ($sectionsMode !== 'core');

    // Respuesta única; core omite consultas pesadas (analytics, top_products, waiters, tips_by_waiter).
    // Además, en core solo se calcula la estadística del rango seleccionado para acelerar cambios Hoy/Ayer/Semana/Mes.
    if ($sectionsMode === 'core') {
        $currentStats = getSalesStats($pdo, $start, $end, $includeOpenStats);
        $stats = [
            $range => $currentStats,
        ];
    } else {
        $stats = [
            'today'     => getSalesStats($pdo, $todayStart, $todayEnd, $includeOpenStats),
            'yesterday' => getSalesStats($pdo, $yesterdayStart, $yesterdayEnd, $includeOpenStats),
            'week'      => getSalesStats($pdo, $weekStart, $weekEnd, $includeOpenStats),
            'month'     => getSalesStats($pdo, $monthStart, $monthEnd, $includeOpenStats),
        ];
        $currentStats = getSalesStats($pdo, $start, $end, $includeOpenStats);
        if ($range === 'custom') {
            $stats['custom'] = $currentStats;
        }
    }

    $comparison = $includeCompare ? getPeriodComparison($pdo, $start, $end, false) : null;

    $openStats = $includeOpenStats
        ? getOpenStats($pdo, $start, $end)
        : ['total' => 0.0, 'tips' => 0.0, 'checks' => 0, 'average' => 0.0, 'covers' => 0];
    $historicalOpenStats = $includeHistoricalOpen
        ? getHistoricalOpenStats($pdo, $todayStart)
        : ['total' => 0.0, 'tips' => 0.0, 'checks' => 0, 'average' => 0.0, 'covers' => 0];

    $cancellations = getCancellations($pdo, $start, $end);

    $paymentMethods = getPaymentMethods($pdo, $start, $end, 'closed', $includePaymentLines);
    $paymentMethodsCard = getCardPaymentBreakdown($pdo, $start, $end);

    $sales = $includeSales ? getSales($pdo, $start, $end, $statusFilter, $salesListMax) : [];

    $hourly = [];
    if ($range === 'today' || $range === 'yesterday') {
        $hourly = getHourlySales($pdo, $start, $end, $statusFilter);
    }

    $daily = [];
    $dailyCategories = [];
    if ($range === 'week' || $range === 'month' || $range === 'custom') {
        $daily = getDailySales($pdo, $start, $end, $statusFilter);
        $dailyCategories = getDailySalesWithCategories($pdo, $start, $end, $statusFilter);
    }

    // Year-over-year comparison: front sends compare_years=2026,2025,2024
    $yearOverYear = [];
    $compareYearsRaw = trim((string)($_GET['compare_years'] ?? ''));
    if ($compareYearsRaw !== '' && $range === 'custom' && $startDate !== '' && $endDate !== '') {
        $compareYears = array_filter(array_map('intval', explode(',', $compareYearsRaw)), fn($y) => $y >= 2000 && $y <= 2100);
        if (!empty($compareYears)) {
            $startMD = substr($startDate, 5); // MM-DD
            $endMD = substr($endDate, 5);
            $yearOverYear = getYearOverYearDaily($pdo, $startMD, $endMD, $compareYears, $statusFilter);
        }
    }

    if ($includeHeavy) {
        $topProducts = getTopProducts($pdo, $start, $end, $statusFilter);
        $waiters = getWaiterPerformance($pdo, $start, $end, $statusFilter);
        $analytics = getDetailedAnalytics($pdo, $start, $end, $statusFilter);
        $tipsByWaiter = getTipsByWaiter($pdo, $start, $end);
    } else {
        $topProducts = [];
        $waiters = [];
        $analytics = [];
        $tipsByWaiter = [];
    }

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

    // KPI principal del dashboard (front): solo venta cobrada/cerrada. «En curso» va aparte en open_stats.
    // Antes se sumaban pendientes al total si el rango contenía «ahora»; eso contradecía «el grande = sólo cerradas».
    $includePendingInDashboardTotal = false;

    $payload = [
        'success' => true,
        'stats' => $stats,
        'current_stats' => $currentStats,
        'dashboard' => [
            'include_pending_in_total' => $includePendingInDashboardTotal,
        ],
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
        'daily_categories' => $dailyCategories,
        'year_over_year' => $yearOverYear,
        'top_products' => $topProducts,
        'waiters' => $waiters,
        'payment_methods' => $paymentMethods,
        'payment_methods_card' => $paymentMethodsCard,
        'analytics' => $analytics,
        'tips_by_waiter' => $tipsByWaiter,
    ];
    if ($sectionsMode === 'core') {
        $payload['partial'] = false;
        $payload['sections'] = 'core';
        $payload['heavy_pending'] = true;
    }

    if ($includeSales) {
        $payload['sales_row_limit'] = $salesListMax;
    }

    sales_emit_json($payload);

} catch (Exception $e) {
    http_response_code(500);
    sales_emit_json([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}

// ── FUNCIONES AUXILIARES ──────────────────────────────────

/**
 * Emite JSON con sustitutos UTF-8 inválidos; evita respuesta vacía si json_encode falla.
 */
function sales_emit_json(array $payload): void
{
    $json = json_encode($payload, JSON_INVALID_UTF8_SUBSTITUTE | JSON_UNESCAPED_UNICODE);
    if ($json === false) {
        http_response_code(500);
        echo '{"success":false,"error":"Error al serializar la respuesta"}';
        return;
    }
    echo $json;
}

function getTipsByWaiter($pdo, $start, $end) {
    // Resumen por mesero
    $sqlSummary = "SELECT
        waiter_name,
        COUNT(CASE WHEN COALESCE(tip,0) > 0 THEN 1 END) as tip_count,
        COALESCE(SUM(tip),0) as total_tips,
        COALESCE(AVG(CASE WHEN COALESCE(tip,0) > 0 THEN tip END),0) as avg_tip
    FROM sr_sales
    WHERE sale_datetime BETWEEN ? AND ?
      AND " . getCollectedSaleSql() . "
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
      AND " . getCollectedSaleSql('s') . "
      AND COALESCE(s.tip,0) > 0
      AND NOT (s.total=0 AND COALESCE(s.subtotal,0)>0)
    ORDER BY s.sale_datetime DESC
    LIMIT 500";
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

function sqlSaleColumnPrefix(?string $alias): string {
    if ($alias === null || $alias === '') {
        return '';
    }
    return $alias . '.';
}

function getClosedStatusSql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    return "LOWER(COALESCE({$p}status,'')) IN ('closed','cerrado','cobrado','pagado','paid')";
}

function getOpenStatusSql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    return "LOWER(COALESCE({$p}status,'')) IN ('open','abierto','pending')";
}

function getCancelledStatusSql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    return "LOWER(COALESCE({$p}status,'')) IN ('cancelled','canceled','cancelado')";
}

/** Ticket con cobro registrado: status cerrado o importes de medio de pago en sr_sales. */
function getPaymentSplitPositiveSql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    return '('
        . "COALESCE({$p}cash_amount,0)+COALESCE({$p}card_amount,0)"
        . "+COALESCE({$p}voucher_amount,0)+COALESCE({$p}other_amount,0)"
        . ') > 0.005';
}

function getPaymentSplitZeroOrEmptySql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    return '('
        . "COALESCE({$p}cash_amount,0)+COALESCE({$p}card_amount,0)"
        . "+COALESCE({$p}voucher_amount,0)+COALESCE({$p}other_amount,0)"
        . ' <= 0.005)';
}

/**
 * Ticket con evidencia de cobro en líneas de chequespagos sincronizadas.
 * Se protege contra entornos sin la tabla sr_cheque_payments.
 */
function getChequePaymentEvidenceSql(?string $alias = null): string {
    global $SR_HAS_CHEQUE_PAYMENTS_TABLE, $SR_USE_CHEQUE_PAYMENT_EVIDENCE;
    if (!$SR_HAS_CHEQUE_PAYMENTS_TABLE || !$SR_USE_CHEQUE_PAYMENT_EVIDENCE) {
        return '(0=1)';
    }
    $p = sqlSaleColumnPrefix($alias);
    $saleSrId = "REPLACE(TRIM(CAST(COALESCE({$p}sr_ticket_id,'') AS CHAR)), '#', '')";
    $saleFolio = "REPLACE(TRIM(CAST(COALESCE({$p}folio,'') AS CHAR)), '#', '')";
    $saleTicket = "REPLACE(TRIM(CAST(COALESCE({$p}ticket_number,'') AS CHAR)), '#', '')";
    $cpFolio = "REPLACE(TRIM(CAST(COALESCE(cp.folio,'') AS CHAR)), '#', '')";
    $sumPaidSql = "(SELECT COALESCE(SUM(cp.amount), 0)
        FROM sr_cheque_payments cp
        WHERE cp.amount > 0.0001
          AND (
            $saleSrId = $cpFolio
            OR $saleFolio = $cpFolio
            OR $saleTicket = $cpFolio
          )
          AND ABS(TIMESTAMPDIFF(HOUR, COALESCE(cp.payment_datetime, cp.created_at), {$p}sale_datetime)) <= 18)";
    // Evita falsos positivos por una sola línea antigua o parcial:
    // exige al menos 90% del total del ticket (o >0 si total casi cero).
    return "($sumPaidSql >= CASE
        WHEN COALESCE({$p}total,0) > 0.01 THEN COALESCE({$p}total,0) * 0.90
        ELSE 0.01
    END)";
}

/**
 * Ticket considerado cobrado para KPIs y totales.
 * Incluye señal por closed_at: el sync a veces deja status "open" o medios de pago en 0
 * pero SoftRestaurant ya cerró la cuenta (closed_at informado).
 */
function getCollectedSaleSql(?string $alias = null): string {
    $p = sqlSaleColumnPrefix($alias);
    $closedAtEvidence = '('
        . "{$p}closed_at IS NOT NULL"
        . ' AND COALESCE(' . $p . 'total,0) > 0.005'
        . ' AND NOT ' . getCancelledStatusSql($alias)
        . ')';
    // Sync a veces deja status "open" y medios de pago en 0, pero ya envió forma de pago distinta de "pending".
    $paymentTypeHint = '('
        . 'COALESCE(' . $p . 'total,0) > 0.005'
        . ' AND NOT ' . getCancelledStatusSql($alias)
        . " AND LOWER(TRIM(COALESCE({$p}payment_type,''))) NOT IN ('','pending','abierto','open')"
        . ')';
    return '('
        . getClosedStatusSql($alias)
        . ' OR '
        . getPaymentSplitPositiveSql($alias)
        . ' OR '
        . getChequePaymentEvidenceSql($alias)
        . ' OR '
        . $closedAtEvidence
        . ' OR '
        . $paymentTypeHint
        . ')';
}

/** Actividad aún no cobrada (no cancelada y sin señal de cobro). */
function getUncollectedPendingSql(?string $alias = null): string {
    return '(NOT ' . getCancelledStatusSql($alias) . ' AND NOT ' . getCollectedSaleSql($alias) . ')';
}

/** Estado "efectivo" para UI/tabla, no solo el status crudo sincronizado. */
function getEffectiveStatusSql(?string $alias = null): string {
    return '(CASE '
        . 'WHEN ' . getCancelledStatusSql($alias) . " THEN 'canceled' "
        . 'WHEN ' . getCollectedSaleSql($alias) . " THEN 'closed' "
        . "ELSE 'open' END)";
}

/**
 * Cruza folio / numcheque / sr_ticket_id entre dos filas sr_sales (trim + #).
 */
function getSrSaleTicketIdentityMatchSql(string $oAlias = 'o', string $cAlias = 'c'): string {
    $o = $oAlias;
    $c = $cAlias;
    $openSrId = "NULLIF(TRIM(REPLACE(CAST({$o}.sr_ticket_id AS CHAR), '#', '')), '')";
    $openFolio = "NULLIF(TRIM(REPLACE(CAST({$o}.folio AS CHAR), '#', '')), '')";
    $openTicket = "NULLIF(TRIM(REPLACE(CAST({$o}.ticket_number AS CHAR), '#', '')), '')";
    $closedSrId = "NULLIF(TRIM(REPLACE(CAST({$c}.sr_ticket_id AS CHAR), '#', '')), '')";
    $closedFolio = "NULLIF(TRIM(REPLACE(CAST({$c}.folio AS CHAR), '#', '')), '')";
    $closedTicket = "NULLIF(TRIM(REPLACE(CAST({$c}.ticket_number AS CHAR), '#', '')), '')";
    return "(
        ($openSrId IS NOT NULL AND ($openSrId = $closedSrId OR $openSrId = $closedFolio OR $openSrId = $closedTicket))
        OR
        ($openFolio IS NOT NULL AND ($openFolio = $closedSrId OR $openFolio = $closedFolio OR $openFolio = $closedTicket))
        OR
        ($openTicket IS NOT NULL AND ($openTicket = $closedSrId OR $openTicket = $closedFolio OR $openTicket = $closedTicket))
    )";
}

/**
 * Un pendiente (o) ya está cubierto por un cobro (c) aunque SR haya generado otro sr_ticket_id
 * (p. ej. tempcheques vs cheques): identidad cruzada O huella mesa+total+comensales+mismo día operativo.
 */
function getSrSalePendingSupersededByCollectedMatchSql(string $oAlias = 'o', string $cAlias = 'c'): string {
    $o = $oAlias;
    $c = $cAlias;
    $ident = getSrSaleTicketIdentityMatchSql($o, $c);
    $sameOpDay = "DATE(DATE_SUB({$c}.sale_datetime, INTERVAL 8 HOUR)) = DATE(DATE_SUB({$o}.sale_datetime, INTERVAL 8 HOUR))";
    $sameTable = "(TRIM(COALESCE({$o}.table_number,'')) <> '' AND TRIM(COALESCE({$o}.table_number,'')) = TRIM(COALESCE({$c}.table_number,'')))";
    $sameWaiter = "(TRIM(COALESCE({$o}.waiter_name,'')) <> '' AND TRIM(COALESCE({$o}.waiter_name,'')) = TRIM(COALESCE({$c}.waiter_name,'')))";
    $weak = "(
        {$sameOpDay}
        AND ABS(COALESCE({$o}.total,0) - COALESCE({$c}.total,0)) <= 0.02
        AND COALESCE({$o}.total,0) > 0.005
        AND ({$sameTable} OR {$sameWaiter})
        AND TIMESTAMPDIFF(MINUTE, {$o}.sale_datetime, {$c}.sale_datetime) BETWEEN -180 AND 4320
    )";
    return "((( {$ident} ) AND ({$c}.sale_datetime >= {$o}.sale_datetime)) OR ({$weak}))";
}

function getStatusCondition($statusFilter) {
    // Normalizar variantes reales que llegan desde sincronización
    // open: open, abierto, pending
    // closed: closed, cerrado, cobrado, pagado, paid
    // cancelled: cancelled, canceled, cancelado
    if ($statusFilter === 'open') {
        return 'AND ' . getUncollectedPendingSql();
    }
    if ($statusFilter === 'closed') {
        return 'AND ' . getCollectedSaleSql();
    }
    // 'all' = abiertos + cerrados (excluye cancelados)
    return 'AND NOT (' . getCancelledStatusSql() . ')';
}

function getCancellations($pdo, $start = null, $end = null, $limit = null) {
    try {
        if ($start && $end) {
            $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                    FROM sr_cancellations
                    WHERE cancel_date BETWEEN ? AND ?
                    ORDER BY cancel_date DESC";
            $params = [$start, $end];
            if ($limit !== null && (int)$limit > 0) {
                $sql .= ' LIMIT ?';
                $params[] = (int)$limit;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
        } else {
            $sql = "SELECT ticket_number, amount, user_name, reason, cancel_date
                    FROM sr_cancellations
                    ORDER BY cancel_date DESC";
            $params = [];
            if ($limit !== null && (int)$limit > 0) {
                $sql .= ' LIMIT ?';
                $params[] = (int)$limit;
            }
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
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
    $openSrId = "NULLIF(TRIM(REPLACE(CAST(o.sr_ticket_id AS CHAR), '#', '')), '')";
    $openFolio = "NULLIF(TRIM(REPLACE(CAST(o.folio AS CHAR), '#', '')), '')";
    $openTicket = "NULLIF(TRIM(REPLACE(CAST(o.ticket_number AS CHAR), '#', '')), '')";
    $supersedes = getSrSalePendingSupersededByCollectedMatchSql('o', 'c');
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(o.total), 0) as total_sales,
                   COALESCE(SUM(COALESCE(o.tip, 0)), 0) as total_tips,
                   COALESCE(AVG(o.total), 0) as average_ticket, 
                   COALESCE(SUM(o.covers), 0) as total_covers
            FROM sr_sales o
            WHERE " . getUncollectedPendingSql('o') . "
              AND o.sale_datetime BETWEEN ? AND ?
              AND (
                ($openSrId IS NULL AND $openFolio IS NULL AND $openTicket IS NULL)
                OR NOT EXISTS (
                  SELECT 1
                  FROM sr_sales c
                  WHERE " . getCollectedSaleSql('c') . "
                    AND ($supersedes)
                )
              )";
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
    $openSrId = "NULLIF(TRIM(REPLACE(CAST(o.sr_ticket_id AS CHAR), '#', '')), '')";
    $openFolio = "NULLIF(TRIM(REPLACE(CAST(o.folio AS CHAR), '#', '')), '')";
    $openTicket = "NULLIF(TRIM(REPLACE(CAST(o.ticket_number AS CHAR), '#', '')), '')";
    $supersedes = getSrSalePendingSupersededByCollectedMatchSql('o', 'c');
    $sql = "SELECT COUNT(*) as total_checks, 
                   COALESCE(SUM(o.total), 0) as total_sales,
                   COALESCE(SUM(COALESCE(o.tip, 0)), 0) as total_tips,
                   COALESCE(AVG(o.total), 0) as average_ticket, 
                   COALESCE(SUM(o.covers), 0) as total_covers
            FROM sr_sales o
            WHERE " . getUncollectedPendingSql('o') . "
              AND o.sale_datetime < ?
              AND (
                ($openSrId IS NULL AND $openFolio IS NULL AND $openTicket IS NULL)
                OR NOT EXISTS (
                  SELECT 1
                  FROM sr_sales c
                  WHERE " . getCollectedSaleSql('c') . "
                    AND ($supersedes)
                )
              )";
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

function getSalesStats($pdo, $start, $end, bool $includeOpen = true) {
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
              AND NOT (" . getCancelledStatusSql() . ")
              AND " . getCollectedSaleSql();

    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);

    // Cancelados (misma familia de valores que el resto de la API)
    $stmtC = $pdo->prepare(
        'SELECT COUNT(*) as n, COALESCE(SUM(total),0) as amt, COALESCE(SUM(tip),0) as tips
         FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND ' . getCancelledStatusSql(),
    );
    $stmtC->execute([$start, $end]);
    $cancelled = $stmtC->fetch(PDO::FETCH_ASSOC);

    $open = ['n' => 0, 'amt' => 0];
    if ($includeOpen) {
        // Abiertos / en curso: excluir tickets que ya tienen contraparte cobrada.
        $openSrId = "NULLIF(TRIM(REPLACE(CAST(o.sr_ticket_id AS CHAR), '#', '')), '')";
        $openFolio = "NULLIF(TRIM(REPLACE(CAST(o.folio AS CHAR), '#', '')), '')";
        $openTicket = "NULLIF(TRIM(REPLACE(CAST(o.ticket_number AS CHAR), '#', '')), '')";
        $supersedes = getSrSalePendingSupersededByCollectedMatchSql('o', 'c');
        $stmtO = $pdo->prepare(
            'SELECT COUNT(*) as n, COALESCE(SUM(o.total),0) as amt
             FROM sr_sales o
             WHERE o.sale_datetime BETWEEN ? AND ?
               AND ' . getUncollectedPendingSql('o') . '
               AND (
                 (' . $openSrId . ' IS NULL AND ' . $openFolio . ' IS NULL AND ' . $openTicket . ' IS NULL)
                 OR NOT EXISTS (
                    SELECT 1
                    FROM sr_sales c
                    WHERE ' . getCollectedSaleSql('c') . '
                      AND (' . $supersedes . ')
                 )
               )',
        );
        $stmtO->execute([$start, $end]);
        $open = $stmtO->fetch(PDO::FETCH_ASSOC);
    }

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

function getPeriodComparison($pdo, $start, $end, bool $includeOpen = false) {
    $startTs = strtotime($start);
    $endTs = strtotime($end);

    if (!$startTs || !$endTs || $endTs < $startTs) {
        return null;
    }

    $durationSeconds = ($endTs - $startTs) + 1;
    $prevEndTs = $startTs - 1;
    $prevStartTs = $prevEndTs - ($durationSeconds - 1);

    $current = getSalesStats($pdo, date('Y-m-d H:i:s', $startTs), date('Y-m-d H:i:s', $endTs), $includeOpen);
    $previous = getSalesStats($pdo, date('Y-m-d H:i:s', $prevStartTs), date('Y-m-d H:i:s', $prevEndTs), $includeOpen);

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

function getSales($pdo, $start, $end, $statusFilter = 'closed', int $rowLimit = 2500) {
    $statusCond = getStatusCondition($statusFilter);
    $lim = max(100, min(5000, $rowLimit));
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
                " . getEffectiveStatusSql() . " AS status
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              $statusCond
            ORDER BY sale_datetime DESC
            LIMIT " . (int)$lim;
    
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

/**
 * Desglose diario con split Comida / Bebida.
 * Intenta categorizar por: sr_ticket_items.category, sr_products.category o sr_sale_items + sr_products JOIN.
 * Categorías de bebida: contiene "bebida", "drink", "refresco", "cerveza", "cocktail", "coctel", "vino", "licor", "copa", "shot", "café", "te ", "agua", "juice", "jugo", "smoothie", "bar".
 */
function getDailySalesWithCategories($pdo, $start, $end, $statusFilter = 'closed') {
    $statusCond = getStatusCondition($statusFilter);
    $statusCondS = $statusCond ? str_replace('AND status', 'AND s.status', $statusCond) : '';

    // Bebida keywords (case-insensitive match)
    $bebidaKeywords = "'bebida','drink','refresco','cerveza','cocktail','coctel','vino','licor','copa','shot','café','cafe','te','agua','juice','jugo','smoothie','bar','mezcal','tequila','whisky','ron','brandy','vodka','gin','margarita','michelada','carajillo','limonada','horchata','soda','sprite','coca'";

    $bebidaRegex = 'bebida|drink|refresco|cerveza|cocktail|coctel|vino|licor|copa|shot|caf[eé]|agua|juice|jugo|smoothie|bar|mezcal|tequila|whisky|ron|brandy|vodka|gin|margarita|michelada|carajillo|limonada|horchata|soda|sprite|coca';

    $results = [];
    try {
        // Strategy: sr_ticket_items has category directly; join to sr_sales for date/status
        $sql = "
            SELECT
                DATE(DATE_SUB(s.sale_datetime, INTERVAL 8 HOUR)) AS sale_date,
                CASE
                    WHEN LOWER(COALESCE(ti.category, '')) REGEXP '$bebidaRegex'
                      OR LOWER(COALESCE(ti.product_name, '')) REGEXP '$bebidaRegex'
                    THEN 'bebida'
                    ELSE 'comida'
                END AS tipo,
                SUM(ti.subtotal) AS total,
                SUM(ti.qty) AS qty
            FROM sr_ticket_items ti
            INNER JOIN sr_sales s ON (
                REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.folio AS CHAR)), '#', '')
                OR REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.ticket_number AS CHAR)), '#', '')
                OR REPLACE(TRIM(CAST(ti.folio AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '')
            )
            WHERE s.sale_datetime BETWEEN ? AND ?
              $statusCondS
              AND ti.product_name IS NOT NULL AND ti.product_name != ''
            GROUP BY sale_date, tipo
            ORDER BY sale_date, tipo
        ";
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Exception $e) {
        $results = [];
    }

    // If sr_ticket_items is empty, try sr_sale_items + sr_products
    if (empty($results)) {
        try {
            $sql = "
                SELECT
                    DATE(DATE_SUB(s.sale_datetime, INTERVAL 8 HOUR)) AS sale_date,
                    CASE
                        WHEN LOWER(COALESCE(p.category, '')) REGEXP 'bebida|drink|refresco|cerveza|cocktail|coctel|vino|licor|copa|shot|caf[eé]|agua|juice|jugo|smoothie|bar|mezcal|tequila|whisky|ron|brandy|vodka|gin|margarita|michelada|carajillo|limonada|horchata|soda|sprite|coca'
                        THEN 'bebida'
                        ELSE 'comida'
                    END AS tipo,
                    SUM(si.subtotal) AS total,
                    SUM(si.quantity) AS qty
                FROM sr_sale_items si
                INNER JOIN sr_sales s ON si.sr_ticket_id = s.sr_ticket_id
                LEFT JOIN sr_products p ON si.product_name = p.product_name
                WHERE s.sale_datetime BETWEEN ? AND ?
                  $statusCondS
                  AND si.product_name IS NOT NULL AND si.product_name != ''
                GROUP BY sale_date, tipo
                ORDER BY sale_date, tipo
            ";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$start, $end]);
            $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            $results = [];
        }
    }

    // Pivot: group by date, split comida/bebida
    $daily = [];
    foreach ($results as $r) {
        $d = $r['sale_date'];
        if (!isset($daily[$d])) $daily[$d] = ['date' => $d, 'comida' => 0, 'bebida' => 0, 'total' => 0];
        $tipo = $r['tipo'] ?? 'comida';
        $daily[$d][$tipo] += floatval($r['total']);
        $daily[$d]['total'] += floatval($r['total']);
    }
    return array_values($daily);
}

/**
 * Obtiene ventas diarias para el mismo rango (mes/día) en múltiples años.
 * $years = [2026, 2025, 2024, ...], $monthDay format: 'MM-DD' to 'MM-DD'.
 */
function getYearOverYearDaily($pdo, $startMD, $endMD, $years, $statusFilter = 'closed') {
    $shiftHour = 8;
    $statusCond = getStatusCondition($statusFilter);
    $result = [];

    foreach ($years as $yr) {
        $yr = (int)$yr;
        $s = "$yr-$startMD 0" . $shiftHour . ":00:00";
        $e = "$yr-$endMD " . sprintf('%02d', $shiftHour) . ":00:00";
        // end is next day at shift hour
        $endDate = date('Y-m-d', strtotime("$yr-$endMD") + 86400);
        $e = "$endDate " . sprintf('%02d', $shiftHour) . ":00:00";

        try {
            $sql = "SELECT
                        DATE(DATE_SUB(sale_datetime, INTERVAL $shiftHour HOUR)) AS sale_date,
                        COUNT(*) AS checks,
                        SUM(total) AS total
                    FROM sr_sales
                    WHERE sale_datetime BETWEEN ? AND ?
                      $statusCond
                    GROUP BY sale_date
                    ORDER BY sale_date";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([$s, $e]);
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $yearData = [];
            foreach ($rows as $r) {
                $yearData[] = [
                    'date' => $r['sale_date'],
                    'day' => date('d', strtotime($r['sale_date'])),
                    'checks' => intval($r['checks']),
                    'total' => floatval($r['total']),
                ];
            }
            $result[$yr] = $yearData;
        } catch (Exception $ex) {
            $result[$yr] = [];
        }
    }
    return $result;
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
                LIMIT 150";
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
                    LIMIT 150";
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
                    LIMIT 150";
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
            ORDER BY total DESC
            LIMIT 200";
    
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

function sr_cheque_payments_table_exists(PDO $pdo): bool {
    try {
        $r = $pdo->query(
            "SELECT 1 FROM information_schema.tables
             WHERE table_schema = DATABASE() AND table_name = 'sr_cheque_payments' LIMIT 1"
        );
        return $r && (bool)$r->fetchColumn();
    } catch (Throwable $e) {
        return false;
    }
}

/**
 * idformadepago SR estándar: 1 efectivo, 2 tarjeta, 3 vales, resto → otros.
 * En instalaciones personalizadas SR suele usar otros IDs; si todo cae en "otros"
 * pero sr_sales tiene cash_amount/card_amount, getPaymentMethods hace fallback.
 */
function map_sr_forma_pago_bucket(string $rawId): string {
    $t = strtolower(trim($rawId));
    if ($t === 'efectivo' || $t === 'cash' || $t === 'contado') {
        return 'cash';
    }
    if (str_contains($t, 'tarjeta') || str_contains($t, 'card') || $t === 'tc' || $t === 'td') {
        return 'card';
    }
    if (str_contains($t, 'vale') || $t === 'voucher') {
        return 'voucher';
    }
    $v = (float)preg_replace('/[^\d.-]/', '', $rawId);
    if (abs($v - 1) < 0.05) {
        return 'cash';
    }
    if (abs($v - 2) < 0.05) {
        return 'card';
    }
    if (abs($v - 3) < 0.05) {
        return 'voucher';
    }

    return 'other';
}

function map_payment_line_bucket(string $rawId, string $reference = ''): string {
    $bucket = map_sr_forma_pago_bucket($rawId);
    if ($bucket !== 'other') {
        return $bucket;
    }
    $txt = strtolower(trim($rawId . ' ' . $reference));
    if ($txt === '') {
        return 'other';
    }
    if (str_contains($txt, 'visa') || str_contains($txt, 'master') || str_contains($txt, 'mastercard')
        || str_contains($txt, 'amex') || str_contains($txt, 'american') || str_contains($txt, 'tarjeta')
        || str_contains($txt, 'credito') || str_contains($txt, 'debito') || str_contains($txt, 'card')) {
        return 'card';
    }
    if (str_contains($txt, 'efectivo') || str_contains($txt, 'cash') || str_contains($txt, 'contado')) {
        return 'cash';
    }
    if (str_contains($txt, 'vale') || str_contains($txt, 'voucher')) {
        return 'voucher';
    }
    return 'other';
}

function detect_card_brand(string $rawId, string $reference = ''): ?string {
    $txt = strtolower(trim($rawId . ' ' . $reference));
    if ($txt === '') {
        return null;
    }
    if (str_contains($txt, 'master') || str_contains($txt, 'mastercard')) {
        return 'Mastercard';
    }
    if (str_contains($txt, 'visa')) {
        return 'Visa';
    }
    if (str_contains($txt, 'amex') || str_contains($txt, 'american express')) {
        return 'Amex';
    }
    return null;
}

function aggregate_payment_lines_rows(array $rows): ?array {
    if (!$rows || count($rows) === 0) {
        return null;
    }
    $agg = [
        'cash'    => ['v' => 0.0, 'c' => 0],
        'card'    => ['v' => 0.0, 'c' => 0],
        'voucher' => ['v' => 0.0, 'c' => 0],
        'other'   => ['v' => 0.0, 'c' => 0],
    ];
    $cardBrands = [];
    foreach ($rows as $row) {
        $idf = (string)($row['idf'] ?? '');
        $ref = (string)($row['ref'] ?? '');
        $amt = floatval($row['amt'] ?? 0);
        $cnt = intval($row['cnt'] ?? 0);
        if ($amt < 0.000001) {
            continue;
        }
        $bucket = map_payment_line_bucket($idf, $ref);
        $agg[$bucket]['v'] += $amt;
        $agg[$bucket]['c'] += max($cnt, 1);
        if ($bucket === 'card') {
            $brand = detect_card_brand($idf, $ref);
            if ($brand !== null) {
                if (!isset($cardBrands[$brand])) {
                    $cardBrands[$brand] = 0.0;
                }
                $cardBrands[$brand] += $amt;
            }
        }
    }
    $totalAgg = $agg['cash']['v'] + $agg['card']['v'] + $agg['voucher']['v'] + $agg['other']['v'];
    if ($totalAgg < 0.01) {
        return null;
    }
    arsort($cardBrands);
    $brands = array_keys($cardBrands);
    $cardLabel = 'Tarjeta';
    if (count($brands) > 0) {
        $top = array_slice($brands, 0, 2);
        $cardLabel = 'Tarjeta (' . implode(', ', $top) . (count($brands) > 2 ? ' +' . (count($brands) - 2) : '') . ')';
    }
    $order = [
        'cash'    => 'Efectivo',
        'card'    => $cardLabel,
        'voucher' => 'Vales',
        'other'   => 'Transferencia / Otros',
    ];
    $methods = [];
    foreach ($order as $key => $label) {
        $v = $agg[$key]['v'];
        $c = $agg[$key]['c'];
        if ($v > 0.005) {
            $methods[] = ['name' => $label, 'count' => $c, 'value' => $v];
        }
    }
    return count($methods) > 0 ? $methods : null;
}

/**
 * Desglose por líneas chequespagos persistidas (sync). null = no hay tabla o sin datos útiles.
 */
function try_payment_methods_from_sr_cheque_payments(PDO $pdo, string $start, string $end, string $statusFilter = 'closed'): ?array {
    if (!sr_cheque_payments_table_exists($pdo)) {
        return null;
    }
    $statusCond = getStatusCondition($statusFilter);
    $join = "REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '') = REPLACE(TRIM(CAST(p.folio AS CHAR)), '#', '')
        OR REPLACE(TRIM(CAST(IFNULL(s.folio,'') AS CHAR)), '#', '') = REPLACE(TRIM(CAST(p.folio AS CHAR)), '#', '')
        OR REPLACE(TRIM(CAST(IFNULL(s.ticket_number,'') AS CHAR)), '#', '') = REPLACE(TRIM(CAST(p.folio AS CHAR)), '#', '')";
    $sql = "SELECT TRIM(CAST(p.id_forma_pago AS CHAR(64))) AS idf,
                   TRIM(COALESCE(CAST(p.reference AS CHAR(255)), '')) AS ref,
                   SUM(p.amount) AS amt,
                   COUNT(*) AS cnt
            FROM sr_cheque_payments p
            INNER JOIN sr_sales s ON ($join)
            WHERE s.sale_datetime BETWEEN ? AND ?
              $statusCond
            GROUP BY TRIM(CAST(p.id_forma_pago AS CHAR(64))), TRIM(COALESCE(CAST(p.reference AS CHAR(255)), ''))";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return null;
    }
    return aggregate_payment_lines_rows($rows);
}

/**
 * Fallback por datetime de pago cuando el join por folio no encuentra coincidencias.
 * Útil en ambientes donde folio/sr_ticket_id no empatan 1:1 pero sí hay líneas de cobro con fecha correcta.
 */
function try_payment_methods_from_sr_cheque_payments_by_datetime(PDO $pdo, string $start, string $end): ?array {
    if (!sr_cheque_payments_table_exists($pdo)) {
        return null;
    }
    $sql = "SELECT TRIM(CAST(p.id_forma_pago AS CHAR(64))) AS idf,
                   TRIM(COALESCE(CAST(p.reference AS CHAR(255)), '')) AS ref,
                   SUM(p.amount) AS amt,
                   COUNT(*) AS cnt
            FROM sr_cheque_payments p
            WHERE p.payment_datetime BETWEEN ? AND ?
              AND COALESCE(p.amount,0) > 0.0001
            GROUP BY TRIM(CAST(p.id_forma_pago AS CHAR(64))), TRIM(COALESCE(CAST(p.reference AS CHAR(255)), ''))";
    try {
        $stmt = $pdo->prepare($sql);
        $stmt->execute([$start, $end]);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    } catch (Throwable $e) {
        return null;
    }
    return aggregate_payment_lines_rows($rows);
}

/** Desglose por columnas de sr_sales (sync) + imputación por payment_type. */
function getPaymentMethodsFromSrSalesColumns(PDO $pdo, string $start, string $end, string $statusFilter = 'closed'): array
{
    $statusCond = getStatusCondition($statusFilter);
    $nc = 'NOT (total=0 AND COALESCE(subtotal,0)>0)';
    $pt = 'LOWER(TRIM(COALESCE(payment_type,\'\')))';
    // SR / BD locales usan enum español (efectivo, tarjeta, transferencia, otro) además de inglés.
    $ptCash = "({$pt} IN ('cash','efectivo','contado'))";
    $ptCard = "({$pt} IN ('card','tarjeta','tc','td','credito','debito'))";
    $ptVoucher = "({$pt} IN ('voucher','vale','vales'))";
    $ptTransfer = "({$pt} IN ('transfer','otros','transferencia','otro'))";
    // Sin columnas de pago: imputar desde total si status cerrado O si SR ya dejó forma de pago distinta de pending
    // Paréntesis: ( split AND ( status OR ( total AND ( ptCash OR … ) ) ) ) — 4 cierres tras el grupo de pt*.
    $imputeWhen = '(' . getPaymentSplitZeroOrEmptySql() . ' AND ('
        . getClosedStatusSql()
        . " OR (COALESCE(total,0) > 0.005 AND ({$ptCash} OR {$ptCard} OR {$ptVoucher} OR {$ptTransfer}))))";
    $imCash = "(($nc) AND (COALESCE(cash_amount,0) > 0.005 OR ($imputeWhen AND {$ptCash})))";
    $imCard = "(($nc) AND (COALESCE(card_amount,0) > 0.005 OR ($imputeWhen AND {$ptCard})))";
    $imVoucher = "(($nc) AND (COALESCE(voucher_amount,0) > 0.005 OR ($imputeWhen AND {$ptVoucher})))";
    // No contar other_amount como "otros" si el ticket es efectivo/tarjeta/vale (evita doble conteo con columnas en 0).
    $imOther = "(($nc) AND (
        (COALESCE(other_amount,0) > 0.005 AND NOT ({$ptCash}) AND NOT ({$ptCard}) AND NOT ({$ptVoucher}))
        OR ($imputeWhen AND {$ptTransfer})
    ))";

    $sql = "SELECT 
                COALESCE(SUM(CASE WHEN $nc THEN GREATEST(COALESCE(cash_amount,0), CASE WHEN $imputeWhen AND {$ptCash} THEN COALESCE(total,0) ELSE 0 END) ELSE 0 END), 0) as cash_total,
                COALESCE(SUM(CASE WHEN $nc THEN GREATEST(COALESCE(card_amount,0), CASE WHEN $imputeWhen AND {$ptCard} THEN COALESCE(total,0) ELSE 0 END) ELSE 0 END), 0) as card_total,
                COALESCE(SUM(CASE WHEN $nc THEN GREATEST(COALESCE(voucher_amount,0), CASE WHEN $imputeWhen AND {$ptVoucher} THEN COALESCE(total,0) ELSE 0 END) ELSE 0 END), 0) as voucher_total,
                COALESCE(SUM(CASE WHEN $nc THEN GREATEST(COALESCE(other_amount,0), CASE WHEN $imputeWhen AND {$ptTransfer} THEN COALESCE(total,0) ELSE 0 END) ELSE 0 END), 0) as other_total,
                COUNT(CASE WHEN $imCash THEN 1 END) as cash_count,
                COUNT(CASE WHEN $imCard THEN 1 END) as card_count,
                COUNT(CASE WHEN $imVoucher THEN 1 END) as voucher_count,
                COUNT(CASE WHEN $imOther THEN 1 END) as other_count
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
            'value' => floatval($result['cash_total']),
        ];
    }

    if ($result['card_total'] > 0) {
        $methods[] = [
            'name' => 'Tarjeta',
            'count' => intval($result['card_count']),
            'value' => floatval($result['card_total']),
        ];
    }

    if ($result['voucher_total'] > 0) {
        $methods[] = [
            'name' => 'Vales',
            'count' => intval($result['voucher_count']),
            'value' => floatval($result['voucher_total']),
        ];
    }

    if ($result['other_total'] > 0) {
        $methods[] = [
            'name' => 'Transferencia / Otros',
            'count' => intval($result['other_count']),
            'value' => floatval($result['other_total']),
        ];
    }

    if (count($methods) === 0) {
        $stmtFb = $pdo->prepare(
            'SELECT COUNT(*) AS n, COALESCE(SUM(total), 0) AS v FROM sr_sales
             WHERE sale_datetime BETWEEN ? AND ?
               AND ' . getCollectedSaleSql() . '
               AND NOT (total = 0 AND COALESCE(subtotal, 0) > 0)'
        );
        $stmtFb->execute([$start, $end]);
        $fb = $stmtFb->fetch(PDO::FETCH_ASSOC);
        $v = floatval($fb['v'] ?? 0);
        if ($v > 0.005) {
            $methods[] = [
                'name' => 'Sin desglose en POS (cobros sin detalle)',
                'count' => intval($fb['n'] ?? 0),
                'value' => $v,
            ];
        }
    }

    return $methods;
}

function payment_methods_list_has_cash_or_card(array $methods): bool
{
    foreach ($methods as $m) {
        $n = $m['name'] ?? '';
        if (($n === 'Efectivo' || $n === 'Tarjeta') && floatval($m['value'] ?? 0) > 0.005) {
            return true;
        }
    }

    return false;
}

function getPaymentMethods($pdo, $start, $end, $statusFilter = 'closed', bool $includePaymentLines = true) {
    $fromCols = getPaymentMethodsFromSrSalesColumns($pdo, $start, $end, $statusFilter);
    // Fuente principal: columnas ya normalizadas en sr_sales.
    // Las líneas de sr_cheque_payments pueden venir incompletas en algunos entornos.
    if (!$includePaymentLines || count($fromCols) > 0) {
        return $fromCols;
    }
    $fromLines = try_payment_methods_from_sr_cheque_payments($pdo, $start, $end, $statusFilter);
    if ($fromLines === null) {
        $fromLinesByDt = try_payment_methods_from_sr_cheque_payments_by_datetime($pdo, $start, $end);
        return $fromLinesByDt ?? $fromCols;
    }

    return $fromLines;
}

function getCardPaymentBreakdown(PDO $pdo, string $start, string $end): array
{
    $sumSplit = '(COALESCE(cash_amount,0)+COALESCE(card_amount,0)+COALESCE(voucher_amount,0)+COALESCE(other_amount,0))';
    $pt = 'LOWER(TRIM(COALESCE(payment_type,\'\')))';
    $sql = "SELECT
                COALESCE(SUM(CASE WHEN x.card_ratio > 0.0001 THEN x.card_amount ELSE 0 END), 0) AS card_total,
                COALESCE(SUM(CASE WHEN x.card_ratio > 0.0001 THEN x.tip * x.card_ratio ELSE 0 END), 0) AS card_tip,
                COUNT(CASE WHEN x.card_ratio > 0.0001 THEN 1 END) AS card_checks
            FROM (
                SELECT
                    COALESCE(card_amount,0) AS card_amount,
                    COALESCE(tip,0) AS tip,
                    CASE
                        WHEN $sumSplit > 0.005 THEN COALESCE(card_amount,0) / $sumSplit
                        WHEN ($pt IN ('card','tarjeta','tc','td','credito','debito') AND COALESCE(total,0) > 0.005) THEN 1
                        ELSE 0
                    END AS card_ratio
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  AND NOT (" . getCancelledStatusSql() . ")
                  AND " . getCollectedSaleSql() . "
                  AND NOT (total = 0 AND COALESCE(subtotal,0) > 0)
            ) x";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$start, $end]);
    $r = $stmt->fetch(PDO::FETCH_ASSOC) ?: [];
    $cardTotal = floatval($r['card_total'] ?? 0);
    $cardTip = floatval($r['card_tip'] ?? 0);
    $cardSales = max(0.0, $cardTotal - $cardTip);
    return [
        'card_total' => round($cardTotal, 2),
        'card_sales' => round($cardSales, 2),
        'card_tip' => round($cardTip, 2),
        'card_checks' => intval($r['card_checks'] ?? 0),
    ];
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
                LIMIT 80";
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
                 LIMIT 80";
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
                LIMIT 50";
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
                 LIMIT 50";
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
                    COALESCE(SUM(CASE WHEN " . getCollectedSaleSql() . " THEN tip ELSE 0 END), 0) as paid_tips,
                    COALESCE(SUM(CASE WHEN " . getUncollectedPendingSql() . " THEN tip ELSE 0 END), 0) as unpaid_tips,
                    COUNT(CASE WHEN " . getCollectedSaleSql() . " AND tip > 0 THEN 1 END) as paid_count,
                    COUNT(CASE WHEN " . getUncollectedPendingSql() . " AND tip > 0 THEN 1 END) as unpaid_count
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
                ORDER BY sales DESC, tickets DESC
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
                LIMIT 300";
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
    ];
}
