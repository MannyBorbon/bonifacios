<?php
/**
 * TEST DIRECTO DE API - Corre esto en el servidor para ver qué devuelve Hostinger
 * php C:\Sincronizador\softrestaurant-sync\test-api.php
 */
error_reporting(E_ALL);
date_default_timezone_set('America/Hermosillo');

define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

echo "=== TEST API HOSTINGER ===\n\n";

// 1. Prueba con 1 ticket de prueba
$testData = [
    'module' => 'sales',
    'sync_datetime' => date('Y-m-d H:i:s'),
    'data' => [
        [
            'sr_ticket_id'   => 'TEST-' . time(),
            'ticket_number'  => '9999',
            'folio'          => '9999',
            'sale_date'      => date('Y-m-d'),
            'sale_time'      => date('H:i:s'),
            'sale_datetime'  => date('Y-m-d H:i:s'),
            'total'          => 100.00,
            'subtotal'       => 86.21,
            'tax'            => 13.79,
            'tip'            => 0.0,
            'discount'       => 0.0,
            'waiter_id'      => '1',
            'waiter_name'    => 'TEST',
            'table_id'       => '',
            'table_number'   => '1',
            'covers'         => 2,
            'status'         => 'closed',
            'payment_type'   => 'cash',
            'cash_amount'    => 100.00,
            'card_amount'    => 0.0,
            'voucher_amount' => 0.0,
            'other_amount'   => 0.0,
            'opened_at'      => date('Y-m-d H:i:s'),
            'closed_at'      => date('Y-m-d H:i:s'),
            'items'          => [],
        ]
    ]
];

$payload = json_encode($testData);
echo "Payload enviado:\n";
echo $payload . "\n\n";

$ch = curl_init(API_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'X-API-Key: ' . API_KEY,
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_VERBOSE        => true,
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlError = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
if ($curlError) echo "CURL Error: $curlError\n";
echo "Respuesta RAW:\n";
echo $response . "\n\n";

$decoded = json_decode($response, true);
if ($decoded) {
    echo "Respuesta decodificada:\n";
    print_r($decoded);
    
    if (isset($decoded['failed']) && $decoded['failed'] > 0) {
        echo "\n!!! FALLO: failed=" . $decoded['failed'] . "\n";
        echo "Revisa los logs de error en Hostinger (error_log de PHP)\n";
    } elseif (isset($decoded['inserted']) || isset($decoded['updated'])) {
        echo "\n=== EXITO: inserted=" . ($decoded['inserted']??0) . " updated=" . ($decoded['updated']??0) . "\n";
    }
} else {
    echo "ERROR: La respuesta no es JSON valido\n";
    echo "Respuesta texto: " . substr($response, 0, 500) . "\n";
}
