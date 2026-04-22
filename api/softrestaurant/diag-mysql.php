<?php
/**
 * Diagnostico MySQL - abril 2025
 * Correr en CMD: php diag-mysql.php
 * O via web: /api/softrestaurant/diag-mysql.php?key=bonifacios-sr-sync-2024-secret-key
 */

// Permitir correr desde CLI o web
if (php_sapi_name() === 'cli') {
    // CLI: incluir config manualmente
    define('RUNNING_CLI', true);
} else {
    $key = $_GET['key'] ?? '';
    if ($key !== 'bonifacios-sr-sync-2024-secret-key') { http_response_code(403); die('Forbidden'); }
}

require_once __DIR__ . '/../config/database.php';
$pdo = getPDO();

$start = '2025-04-01 08:00:00';
$end   = '2025-05-01 07:59:59';

// 1. Conteo y suma por status
$r1 = $pdo->prepare("SELECT status, COUNT(*) as tickets, SUM(total) as suma_total, SUM(subtotal) as suma_subtotal, SUM(tax) as suma_tax, SUM(discount) as suma_discount, SUM(tip) as suma_tip FROM sr_sales WHERE sale_datetime BETWEEN ? AND ? GROUP BY status ORDER BY status");
$r1->execute([$start, $end]);
$byStatus = $r1->fetchAll(PDO::FETCH_ASSOC);

// 2. Solo cerrados - desglose detallado
$r2 = $pdo->prepare("
    SELECT 
        COUNT(*) as total_tickets,
        SUM(total) as suma_total,
        SUM(subtotal) as suma_subtotal,
        SUM(tax) as suma_tax,
        SUM(discount) as suma_discount,
        SUM(tip) as suma_tip,
        SUM(CASE WHEN total = 0 THEN 1 ELSE 0 END) as tickets_total_cero,
        SUM(CASE WHEN total IS NULL THEN 1 ELSE 0 END) as tickets_total_null,
        SUM(CASE WHEN discount >= subtotal+tax AND subtotal+tax > 0 THEN 1 ELSE 0 END) as cortesias,
        SUM(CASE WHEN discount >= subtotal+tax AND subtotal+tax > 0 THEN subtotal+tax ELSE 0 END) as suma_cortesias,
        SUM(CASE WHEN discount > 0 AND discount < subtotal+tax THEN 1 ELSE 0 END) as con_descuento_parcial,
        SUM(CASE WHEN discount > 0 AND discount < subtotal+tax THEN discount ELSE 0 END) as suma_descuentos_parciales
    FROM sr_sales 
    WHERE sale_datetime BETWEEN ? AND ? AND status = 'closed'
");
$r2->execute([$start, $end]);
$cerrados = $r2->fetch(PDO::FETCH_ASSOC);

// 3. Comparacion directa con SR
$net_sales = floatval($cerrados['suma_total']) - floatval($cerrados['suma_cortesias'] ?? 0);
$sr_esperado = 377692.16;
$diferencia = round($net_sales - $sr_esperado, 2);

$output = [
    'periodo'    => "$start  ->  $end",
    'por_status' => $byStatus,
    'cerrados_detalle' => $cerrados,
    'calculo_net_sales' => [
        'suma_total'      => floatval($cerrados['suma_total']),
        'menos_cortesias' => floatval($cerrados['suma_cortesias']),
        'net_sales'       => round($net_sales, 2),
        'sr_esperado'     => $sr_esperado,
        'diferencia'      => $diferencia,
        'estado'          => abs($diferencia) < 1 ? '✅ COINCIDE' : "❌ DIFERENCIA: $diferencia",
    ],
];

if (php_sapi_name() === 'cli') {
    echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . "\n";
} else {
    header('Content-Type: application/json');
    echo json_encode($output, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
}
