<?php
/**
 * API Endpoint para cortes de turno de SoftRestaurant
 * Retorna turnos con lo declarado vs lo real calculado desde tickets
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
    $curHour = (int)$now->format('H');

    if ($shiftDate !== null && $shiftDate !== '') {
        $start = new DateTime($shiftDate . ' 00:00:00', new DateTimeZone('America/Hermosillo'));
        $end = (clone $start)->setTime(23, 59, 59);
    } elseif ($period === 'today') {
        $base = ($curHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $start = (clone $base)->setTime(0, 0, 0);
        $end = (clone $base)->setTime(23, 59, 59);
    } elseif ($period === 'yesterday') {
        $base = ($curHour < 8) ? (clone $now)->modify('-2 days') : (clone $now)->modify('-1 day');
        $start = (clone $base)->setTime(0, 0, 0);
        $end = (clone $base)->setTime(23, 59, 59);
    } elseif ($period === 'week') {
        $base = ($curHour < 8) ? (clone $now)->modify('-1 day') : clone $now;
        $dayOfWeek = (int)$base->format('N');
        $monday = (clone $base)->modify('-' . ($dayOfWeek - 1) . ' days')->setTime(0, 0, 0);
        $start = $monday;
        $end = (clone $now)->setTime(23, 59, 59);
    } elseif ($period === 'month') {
        $month = max(1, min(12, (int)($_GET['month'] ?? $now->format('n'))));
        $year = max(2000, min(2100, (int)($_GET['year'] ?? $now->format('Y'))));
        $start = new DateTime(sprintf('%04d-%02d-01 00:00:00', $year, $month), new DateTimeZone('America/Hermosillo'));
        $end = (clone $start)->modify('last day of this month')->setTime(23, 59, 59);
    } elseif ($period === 'custom') {
        $sd = trim((string)($_GET['start'] ?? $now->format('Y-m-d')));
        $ed = trim((string)($_GET['end'] ?? $now->format('Y-m-d')));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $sd) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $ed)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'start y end deben ser YYYY-MM-DD']);
            exit;
        }
        if (strtotime($ed . ' 00:00:00') < strtotime($sd . ' 00:00:00')) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'end debe ser >= start']);
            exit;
        }
        $start = new DateTime($sd . ' 00:00:00', new DateTimeZone('America/Hermosillo'));
        $end = new DateTime($ed . ' 23:59:59', new DateTimeZone('America/Hermosillo'));
    }

    $startStr = $start->format('Y-m-d H:i:s');
    $endStr = $end->format('Y-m-d H:i:s');

    $stmt = $pdo->prepare('
        SELECT sr_shift_id, sr_turno_id, cajero, estacion,
               apertura, cierre, fondo,
               declarado_efectivo, declarado_tarjeta,
               declarado_vales, declarado_credito
        FROM sr_shifts
        WHERE cierre BETWEEN ? AND ?
        ORDER BY cierre ASC
    ');
    $stmt->execute([$startStr, $endStr]);
    $shifts = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $result = [];
    foreach ($shifts as $sh) {
        $apertura = $sh['apertura'];
        $cierre = $sh['cierre'];

        $stmtV = $pdo->prepare('
            SELECT
                COUNT(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN 1 END) as total_checks,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN total ELSE 0 END),0) as total_sales,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN total - COALESCE(tax,0) ELSE 0 END),0) as subtotal,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN COALESCE(tax,0) ELSE 0 END),0) as total_tax,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN cash_amount ELSE 0 END),0) as real_efectivo,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN card_amount ELSE 0 END),0) as real_tarjeta,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN voucher_amount ELSE 0 END),0) as real_vales,
                COALESCE(SUM(CASE WHEN NOT (total=0 AND COALESCE(subtotal,0)>0) THEN other_amount ELSE 0 END),0) as real_otros,
                COALESCE(SUM(COALESCE(tip,0)),0) as real_propinas,
                COALESCE(SUM(covers),0) as total_covers,
                COUNT(CASE WHEN total=0 AND COALESCE(subtotal,0)>0 THEN 1 END) as courtesy_checks,
                COALESCE(SUM(CASE WHEN total=0 AND COALESCE(subtotal,0)>0 THEN COALESCE(subtotal,0)+COALESCE(tax,0) ELSE 0 END),0) as courtesy_amount
            FROM sr_sales
            WHERE sale_datetime BETWEEN ? AND ?
              AND status = \'closed\'
        ');
        $stmtV->execute([$apertura, $cierre]);
        $real = $stmtV->fetch(PDO::FETCH_ASSOC);

        $stmtM = $pdo->prepare('
            SELECT
                COALESCE(SUM(CASE WHEN movement_type=\'deposit\' THEN amount ELSE 0 END),0) as depositos,
                COALESCE(SUM(CASE WHEN movement_type=\'withdrawal\' THEN amount ELSE 0 END),0) as retiros,
                COALESCE(SUM(CASE WHEN movement_type=\'tip_payment\' OR is_tip_payment=1 THEN amount ELSE 0 END),0) as propinas_pagadas,
                COUNT(CASE WHEN movement_type=\'deposit\' THEN 1 END) as n_depositos,
                COUNT(CASE WHEN movement_type=\'withdrawal\' THEN 1 END) as n_retiros
            FROM sr_cash_movements
            WHERE movement_datetime BETWEEN ? AND ?
        ');
        $stmtM->execute([$apertura, $cierre]);
        $movs = $stmtM->fetch(PDO::FETCH_ASSOC);

        $decEfectivo = floatval($sh['declarado_efectivo']);
        $decTarjeta = floatval($sh['declarado_tarjeta']);
        $decVales = floatval($sh['declarado_vales']);
        $decCredito = floatval($sh['declarado_credito']);
        $decTotal = $decEfectivo + $decTarjeta + $decVales + $decCredito;

        $realEfectivo = floatval($real['real_efectivo']);
        $realTarjeta = floatval($real['real_tarjeta']);
        $realVales = floatval($real['real_vales']);
        $realOtros = floatval($real['real_otros']);
        $realTotal = floatval($real['total_sales']);

        $depositos = floatval($movs['depositos']);
        $retiros = floatval($movs['retiros']);
        $propinasPagadas = floatval($movs['propinas_pagadas']);
        $saldoEsperado = $realEfectivo + floatval($sh['fondo']) + $depositos - $retiros - $propinasPagadas;

        $difEfectivo = $decEfectivo - ($realEfectivo + $depositos - $retiros - $propinasPagadas);
        $difTarjeta = $decTarjeta - $realTarjeta;
        $difVales = $decVales - $realVales;
        $difTotal = $decTotal - $realTotal;

        $result[] = [
            'sr_shift_id' => $sh['sr_shift_id'],
            'sr_turno_id' => $sh['sr_turno_id'],
            'cajero' => $sh['cajero'],
            'estacion' => $sh['estacion'],
            'apertura' => $apertura,
            'cierre' => $cierre,
            'fondo' => floatval($sh['fondo']),
            'declarado' => [
                'efectivo' => $decEfectivo,
                'tarjeta' => $decTarjeta,
                'vales' => $decVales,
                'credito' => $decCredito,
                'total' => $decTotal,
            ],
            'real' => [
                'efectivo' => $realEfectivo,
                'tarjeta' => $realTarjeta,
                'vales' => $realVales,
                'otros' => $realOtros,
                'total_sales' => $realTotal,
                'subtotal' => floatval($real['subtotal']),
                'total_tax' => floatval($real['total_tax']),
                'total_checks' => (int)$real['total_checks'],
                'total_covers' => (int)$real['total_covers'],
                'propinas' => floatval($real['real_propinas']),
                'courtesy_checks' => (int)$real['courtesy_checks'],
                'courtesy_amount' => floatval($real['courtesy_amount']),
            ],
            'movimientos' => [
                'depositos' => $depositos,
                'retiros' => $retiros,
                'propinas_pagadas' => $propinasPagadas,
                'n_depositos' => (int)$movs['n_depositos'],
                'n_retiros' => (int)$movs['n_retiros'],
            ],
            'saldo_esperado' => $saldoEsperado,
            'diferencias' => [
                'efectivo' => round($difEfectivo, 2),
                'tarjeta' => round($difTarjeta, 2),
                'vales' => round($difVales, 2),
                'total' => round($difTotal, 2),
            ],
        ];
    }

    $stmtDays = $pdo->prepare('
        SELECT DISTINCT DATE(cierre) as dia
        FROM sr_shifts
        WHERE cierre IS NOT NULL
        ORDER BY dia DESC
        LIMIT 90
    ');
    $stmtDays->execute();
    $availableDays = array_column($stmtDays->fetchAll(PDO::FETCH_ASSOC), 'dia');

    echo json_encode([
        'success' => true,
        'period' => $period,
        'start' => $startStr,
        'end' => $endStr,
        'shifts' => $result,
        'available_days' => $availableDays,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
