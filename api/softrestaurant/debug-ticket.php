<?php
/**
 * Script de diagnóstico para verificar datos del ticket 14255
 */
header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/../config/database.php';

$token = $_GET['token'] ?? '';
if ($token !== 'boni2026debug') {
    http_response_code(403);
    echo 'Forbidden: agrega ?token=boni2026debug a la URL';
    exit;
}

$pdo = getPDO();

// Buscar el ticket 14255
$sql = "SELECT 
    folio,
    sr_ticket_id,
    ticket_number,
    sale_datetime,
    total,
    subtotal,
    tax,
    tip,
    discount,
    cash_amount,
    card_amount,
    voucher_amount,
    other_amount,
    payment_type,
    status,
    closed_at,
    waiter_name,
    table_number,
    covers
FROM sr_sales
WHERE folio = '14255' OR folio = 14255
ORDER BY sale_datetime DESC
LIMIT 5";

$stmt = $pdo->prepare($sql);
$stmt->execute();
$results = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "=== DIAGNÓSTICO TICKET 14255 ===\n\n";
echo "Registros encontrados: " . count($results) . "\n\n";

foreach ($results as $i => $row) {
    echo "--- Registro " . ($i + 1) . " ---\n";
    foreach ($row as $key => $value) {
        echo sprintf("%-20s: %s\n", $key, $value ?? 'NULL');
    }
    echo "\n";
}

// Verificar si hay líneas en sr_cheque_payments
$sqlPayments = "SELECT 
    folio,
    amount,
    payment_type,
    payment_datetime,
    created_at
FROM sr_cheque_payments
WHERE folio = '14255' OR folio = 14255
ORDER BY payment_datetime DESC
LIMIT 5";

try {
    $stmtPayments = $pdo->prepare($sqlPayments);
    $stmtPayments->execute();
    $payments = $stmtPayments->fetchAll(PDO::FETCH_ASSOC);
    
    echo "=== LÍNEAS DE PAGO (sr_cheque_payments) ===\n\n";
    echo "Registros encontrados: " . count($payments) . "\n\n";
    
    foreach ($payments as $i => $payment) {
        echo "--- Pago " . ($i + 1) . " ---\n";
        foreach ($payment as $key => $value) {
            echo sprintf("%-20s: %s\n", $key, $value ?? 'NULL');
        }
        echo "\n";
    }
} catch (Exception $e) {
    echo "Tabla sr_cheque_payments no existe o error: " . $e->getMessage() . "\n";
}

// Verificar cálculo de métodos de pago para hoy
$today = date('Y-m-d') . ' 08:00:00';
$tomorrow = date('Y-m-d', strtotime('+1 day')) . ' 07:59:59';

echo "=== MÉTODOS DE PAGO HOY ($today - $tomorrow) ===\n\n";

$sqlMethods = "SELECT 
    COALESCE(SUM(CASE WHEN COALESCE(cash_amount,0) > 0 THEN cash_amount ELSE 0 END), 0) as cash_total,
    COALESCE(SUM(CASE WHEN COALESCE(card_amount,0) > 0 THEN card_amount ELSE 0 END), 0) as card_total,
    COUNT(CASE WHEN COALESCE(cash_amount,0) > 0 THEN 1 END) as cash_count,
    COUNT(CASE WHEN COALESCE(card_amount,0) > 0 THEN 1 END) as card_count,
    COUNT(*) as total_tickets
FROM sr_sales
WHERE sale_datetime BETWEEN ? AND ?
  AND LOWER(COALESCE(status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
  AND NOT (total=0 AND COALESCE(subtotal,0)>0)";

$stmtMethods = $pdo->prepare($sqlMethods);
$stmtMethods->execute([$today, $tomorrow]);
$methods = $stmtMethods->fetch(PDO::FETCH_ASSOC);

foreach ($methods as $key => $value) {
    echo sprintf("%-20s: %s\n", $key, $value);
}

echo "\n=== TICKETS CON PAYMENT_TYPE HOY ===\n\n";

$sqlPt = "SELECT 
    folio,
    total,
    cash_amount,
    card_amount,
    payment_type,
    status,
    sale_datetime
FROM sr_sales
WHERE sale_datetime BETWEEN ? AND ?
  AND LOWER(COALESCE(status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
  AND NOT (total=0 AND COALESCE(subtotal,0)>0)
ORDER BY sale_datetime DESC
LIMIT 10";

$stmtPt = $pdo->prepare($sqlPt);
$stmtPt->execute([$today, $tomorrow]);
$tickets = $stmtPt->fetchAll(PDO::FETCH_ASSOC);

foreach ($tickets as $ticket) {
    echo sprintf("Folio: %-8s | Total: %8.2f | Cash: %8.2f | Card: %8.2f | Type: %-15s | Status: %-10s | Date: %s\n",
        $ticket['folio'],
        $ticket['total'],
        $ticket['cash_amount'] ?? 0,
        $ticket['card_amount'] ?? 0,
        $ticket['payment_type'] ?? 'NULL',
        $ticket['status'],
        $ticket['sale_datetime']
    );
}
