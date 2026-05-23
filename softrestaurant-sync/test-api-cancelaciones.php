<?php
/**
 * test-api-cancelaciones.php
 * Ejecutar en el restaurante: php test-api-cancelaciones.php
 * 
 * Envía 2 cancelaciones reales al API y muestra la respuesta exacta.
 * Permite diagnosticar si el API acepta el módulo y hace el INSERT.
 */

define('API_URL', 'https://bonifaciossancarlos.com/api/softrestaurant/sync.php');
define('API_KEY', 'bonifacios-sr-sync-2024-secret-key');

function line(string $s = ''): void { echo $s . "\n"; }
function sep(): void { line(str_repeat('─', 60)); }

// ── Datos de prueba (2 cancelaciones reales del diagnóstico anterior) ──
$testData = [
    [
        'ticket_number' => '15753',
        'amount'        => 0.00,
        'user_name'     => '',
        'reason'        => 'FOLIO REABIERTO USADO PARA JUNTAR MESAS',
        'status'        => 'cancelled',
        'cancel_date'   => '2026-05-16 21:30:48',
    ],
    [
        'ticket_number' => '15723',
        'amount'        => 1320.00,
        'user_name'     => '',
        'reason'        => 'test',
        'status'        => 'cancelled',
        'cancel_date'   => '2026-05-15 17:05:37',
    ],
];

$payload = json_encode([
    'module'        => 'cancellations',
    'data'          => $testData,
    'sync_datetime' => date('Y-m-d H:i:s'),
], JSON_UNESCAPED_UNICODE);

line("=== TEST API CANCELACIONES ===");
line(date('Y-m-d H:i:s'));
line("Enviando " . count($testData) . " cancelaciones a:");
line("  " . API_URL);
sep();

$ch = curl_init(API_URL);
curl_setopt_array($ch, [
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => $payload,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER     => [
        'Content-Type: application/json',
        'Content-Length: ' . strlen($payload),
        'X-API-Key: ' . API_KEY,
    ],
    CURLOPT_TIMEOUT        => 30,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_SSL_VERIFYHOST => false,
]);

$res      = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curlErr  = curl_error($ch);
curl_close($ch);

if ($curlErr) {
    line("✗ CURL ERROR: $curlErr");
    exit(1);
}

line("HTTP Status: $httpCode");
line("Response body:");
line($res);
sep();

$decoded = json_decode($res, true);
if (is_array($decoded)) {
    line("success  : " . ($decoded['success'] ? 'true ✓' : 'false ✗'));
    line("inserted : " . ($decoded['inserted'] ?? 'N/A'));
    line("updated  : " . ($decoded['updated']  ?? 'N/A'));
    line("failed   : " . ($decoded['failed']   ?? 'N/A'));
    if (!empty($decoded['error'])) {
        line("ERROR    : " . $decoded['error']);
    }
    
    if (($decoded['success'] ?? false) === true && ($decoded['inserted'] ?? 0) > 0) {
        line("");
        line("✓ API funciona. Las cancelaciones se insertaron.");
        line("  Revisa la tabla sr_cancellations en phpMyAdmin.");
        line("  Ahora reinicia el sync — enviará los 58 tickets cancelados.");
    } elseif (($decoded['success'] ?? false) === true && ($decoded['inserted'] ?? 0) === 0 && ($decoded['updated'] ?? 0) === 0) {
        line("");
        line("⚠ API dice success pero inserted=0, updated=0");
        line("  Posible causa: los datos ya existían (updated) o hay un error silencioso.");
        line("  Revisa sr_cancellations en phpMyAdmin.");
    } else {
        line("");
        line("✗ API retornó error. El archivo api/softrestaurant/sync.php");
        line("  en Hostinger puede ser una versión vieja.");
        line("  Solución: sube manualmente api/softrestaurant/sync.php a Hostinger via FTP.");
    }
} else {
    line("⚠ Respuesta no es JSON válido");
}
sep();
