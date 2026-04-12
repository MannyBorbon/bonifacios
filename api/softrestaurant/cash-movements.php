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
    $pdo = getConnection();
    
    // Parámetros de fecha (shift-based)
    $period = $_GET['period'] ?? 'today';
    $startDate = $_GET['start_date'] ?? null;
    $endDate = $_GET['end_date'] ?? null;
    
    // Calcular rangos de fecha shift-based (06:00 a 07:59:59 del día siguiente)
    $now = new DateTime();
    $currentHour = (int)$now->format('H');
    
    if ($period === 'today') {
        if ($currentHour < 6) {
            $start = (clone $now)->modify('-1 day')->setTime(6, 0, 0);
        } else {
            $start = (clone $now)->setTime(6, 0, 0);
        }
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'yesterday') {
        if ($currentHour < 6) {
            $start = (clone $now)->modify('-2 days')->setTime(6, 0, 0);
        } else {
            $start = (clone $now)->modify('-1 day')->setTime(6, 0, 0);
        }
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    } elseif ($period === 'week') {
        if ($currentHour < 6) {
            $start = (clone $now)->modify('-1 day')->modify('monday this week')->setTime(6, 0, 0);
        } else {
            $start = (clone $now)->modify('monday this week')->setTime(6, 0, 0);
        }
        $end = (clone $now)->setTime(23, 59, 59);
    } elseif ($period === 'month') {
        if ($currentHour < 6) {
            $start = (clone $now)->modify('-1 day')->modify('first day of this month')->setTime(6, 0, 0);
        } else {
            $start = (clone $now)->modify('first day of this month')->setTime(6, 0, 0);
        }
        $end = (clone $now)->setTime(23, 59, 59);
    } elseif ($period === 'custom' && $startDate && $endDate) {
        $start = new DateTime($startDate . ' 06:00:00');
        $end = (new DateTime($endDate))->modify('+1 day')->setTime(7, 59, 59);
    } else {
        $start = (clone $now)->setTime(6, 0, 0);
        $end = (clone $start)->modify('+1 day')->setTime(7, 59, 59);
    }
    
    $startStr = $start->format('Y-m-d H:i:s');
    $endStr = $end->format('Y-m-d H:i:s');
    
    // Obtener movimientos del período
    $sql = "SELECT 
                movement_id,
                folio_movto,
                movement_type,
                amount,
                amount_signed,
                movement_datetime,
                concept,
                reference,
                is_tip_payment,
                shift_id
            FROM sr_cash_movements
            WHERE movement_datetime BETWEEN ? AND ?
            ORDER BY movement_datetime DESC";
    
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$startStr, $endStr]);
    $movements = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    // Calcular resumen
    $totalWithdrawals = 0;
    $totalDeposits = 0;
    $totalTipPayments = 0;
    $withdrawalCount = 0;
    $depositCount = 0;
    $tipPaymentCount = 0;
    
    foreach ($movements as $m) {
        $amount = floatval($m['amount']);
        
        if ($m['movement_type'] === 'withdrawal') {
            $totalWithdrawals += $amount;
            $withdrawalCount++;
        } elseif ($m['movement_type'] === 'deposit') {
            $totalDeposits += $amount;
            $depositCount++;
        } elseif ($m['movement_type'] === 'tip_payment' || $m['is_tip_payment']) {
            $totalTipPayments += $amount;
            $tipPaymentCount++;
        }
    }
    
    // Calcular ventas en efectivo del período para determinar saldo final
    $sqlCash = "SELECT COALESCE(SUM(cash_amount), 0) as cash_sales
                FROM sr_sales
                WHERE sale_datetime BETWEEN ? AND ?
                  AND status = 'closed'";
    $stmtCash = $pdo->prepare($sqlCash);
    $stmtCash->execute([$startStr, $endStr]);
    $cashSales = floatval($stmtCash->fetch(PDO::FETCH_ASSOC)['cash_sales']);
    
    // Saldo final = Ventas en efectivo + Depósitos - Retiros - Pagos de propina
    $finalBalance = $cashSales + $totalDeposits - $totalWithdrawals - $totalTipPayments;
    
    echo json_encode([
        'success' => true,
        'period' => $period,
        'start' => $startStr,
        'end' => $endStr,
        'summary' => [
            'cash_sales' => $cashSales,
            'total_deposits' => $totalDeposits,
            'deposit_count' => $depositCount,
            'total_withdrawals' => $totalWithdrawals,
            'withdrawal_count' => $withdrawalCount,
            'total_tip_payments' => $totalTipPayments,
            'tip_payment_count' => $tipPaymentCount,
            'final_balance' => $finalBalance
        ],
        'movements' => array_map(function($m) {
            return [
                'id' => $m['movement_id'],
                'folio_movto' => $m['folio_movto'],
                'type' => $m['movement_type'],
                'amount' => floatval($m['amount']),
                'amount_signed' => floatval($m['amount_signed']),
                'datetime' => $m['movement_datetime'],
                'concept' => $m['concept'],
                'reference' => $m['reference'],
                'is_tip_payment' => (bool)$m['is_tip_payment'],
                'shift_id' => $m['shift_id']
            ];
        }, $movements)
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
