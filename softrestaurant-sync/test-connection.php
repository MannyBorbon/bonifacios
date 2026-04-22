<?php
/**
 * Diagnostico SQL Server - campos reales de cheques
 */

echo "=== DIAGNOSTICO SQL SERVER ===\n\n";

// Datos de prueba mínimos
$payload = json_encode([
    'module' => 'sales',
    'data' => [
        [
            'sr_ticket_id' => 'TEST-CONNECTION-001',
            'ticket_number' => 'T-001',
            'folio' => 'T-001',
            'sale_date' => '2026-04-08',
            'sale_time' => '12:00:00',
            'sale_datetime' => '2026-04-08 12:00:00',
            'table_id' => '1',
            'table_number' => '5',
            'waiter_id' => '1',
            'waiter_name' => 'Test',
            'covers' => 2,
            'subtotal' => 100.00,
            'tax' => 16.00,
            'discount' => 0.00,
            'tip' => 10.00,
            'total' => 116.00,
            'status' => 'closed',
            'payment_type' => 'cash',
            'opened_at' => null,
            'closed_at' => '2026-04-08 12:30:00',
            'items' => []
        ]
    ],
    'sync_datetime' => date('Y-m-d H:i:s')
]);

echo "Payload size: " . strlen($payload) . " bytes\n\n";

$ch = curl_init($apiUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Content-Type: application/json',
        'X-API-Key: ' . $apiKey
    ],
    CURLOPT_TIMEOUT => 30,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_VERBOSE => true
]);

echo "Enviando request...\n";
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "\n=== RESULTADO ===\n";
echo "HTTP Code: $httpCode\n";

if ($curlError) {
    echo "cURL Error: $curlError\n";
} else {
    echo "Response: $response\n";
}

if ($httpCode === 200) {
    echo "\n✓ CONEXIÓN EXITOSA!\n";
    $result = json_decode($response, true);
    if ($result && isset($result['success']) && $result['success']) {
        echo "✓ Datos recibidos correctamente por Hostinger\n";
        echo "  - Insertados: " . ($result['inserted'] ?? 0) . "\n";
        echo "  - Actualizados: " . ($result['updated'] ?? 0) . "\n";
        echo "  - Fallidos: " . ($result['failed'] ?? 0) . "\n";
    }
} else {
    echo "\n✗ ERROR DE CONEXIÓN\n";
}
