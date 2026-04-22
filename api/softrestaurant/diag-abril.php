<?php
/**
 * Diagnostico: compara totales MySQL vs lo que debe dar SR para abril 2025
 * Uso: https://bonifaciossancarlos.com/api/softrestaurant/diag-abril.php?key=bonifacios-sr-sync-2024-secret-key
 */
$key = $_GET['key'] ?? '';
if ($key !== 'bonifacios-sr-sync-2024-secret-key') { http_response_code(403); die('Forbidden'); }

require_once '../config/database.php';
$pdo = getPDO();
header('Content-Type: application/json');

$start = '2025-04-01 08:00:00';
$end   = '2025-05-01 07:59:59';

// 1. Conteo por status
$stmt = $pdo->prepare("SELECT status, COUNT(*) as n, SUM(total) as suma, SUM(subtotal) as bruta, SUM(tax) as iva FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? GROUP BY status ORDER BY status");
$stmt->execute([$start, $end]);
$byStatus = $stmt->fetchAll(PDO::FETCH_ASSOC);

// 2. Tickets con total=0 o null
$stmt2 = $pdo->prepare("SELECT COUNT(*) as n FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND (total IS NULL OR total = 0) AND status = 'closed'");
$stmt2->execute([$start, $end]);
$zeroTotal = $stmt2->fetch(PDO::FETCH_ASSOC);

// 3. Total exacto cerrados
$stmt3 = $pdo->prepare("SELECT COUNT(*) as tickets, SUM(total) as total_con_iva, SUM(subtotal) as venta_bruta, SUM(tax) as iva, SUM(tip) as propinas, SUM(discount) as descuentos FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status = 'closed'");
$stmt3->execute([$start, $end]);
$totals = $stmt3->fetch(PDO::FETCH_ASSOC);

// 4. Muestra top 5 tickets con total mas alto para verificar
$stmt4 = $pdo->prepare("SELECT sr_ticket_id, folio, sale_datetime, total, subtotal, tax, tip, discount, status, payment_type FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND status='closed' ORDER BY total DESC LIMIT 10");
$stmt4->execute([$start, $end]);
$top10 = $stmt4->fetchAll(PDO::FETCH_ASSOC);

// 5. Tickets con total NULL o 0 (muestra primeros 5)
$stmt5 = $pdo->prepare("SELECT sr_ticket_id, folio, sale_datetime, total, subtotal, status FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? AND (total IS NULL OR total = 0) LIMIT 5");
$stmt5->execute([$start, $end]);
$zeroList = $stmt5->fetchAll(PDO::FETCH_ASSOC);

echo json_encode([
    'periodo'           => "$start  a  $end",
    'sr_esperado'       => ['total_con_iva' => 377692.16, 'venta_bruta' => 361778.06, 'iva' => 15914.10, 'propinas' => 34267.95, 'tickets' => 237],
    'por_status'        => $byStatus,
    'totales_cerrados'  => $totals,
    'tickets_total_0'   => $zeroTotal,
    'top10_por_monto'   => $top10,
    'muestra_total_0'   => $zeroList,
], JSON_PRETTY_PRINT);
