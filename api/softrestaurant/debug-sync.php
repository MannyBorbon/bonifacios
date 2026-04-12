<?php
/**
 * Script de diagnóstico para ver qué datos llegan de la sincronización
 */

require_once '../config/database.php';
header('Content-Type: application/json');

// Verificar API Key
$headers = getallheaders();
$apiKey = $headers['X-API-Key'] ?? '';

if ($apiKey !== 'bonifacios-sr-sync-2024-secret-key') {
    http_response_code(401);
    echo json_encode(['error' => 'API Key inválida']);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Método no permitido']);
    exit;
}

// Capturar los datos sin procesarlos
$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true);

// Guardar en archivo de log
$logFile = __DIR__ . '/debug-received-data.json';
file_put_contents($logFile, json_encode([
    'timestamp' => date('Y-m-d H:i:s'),
    'module' => $input['module'] ?? 'unknown',
    'data_count' => count($input['data'] ?? []),
    'first_record' => $input['data'][0] ?? null,
    'raw_input' => $rawInput
], JSON_PRETTY_PRINT) . "\n\n", FILE_APPEND);

echo json_encode([
    'success' => true,
    'message' => 'Datos recibidos y guardados en debug-received-data.json',
    'module' => $input['module'] ?? 'unknown',
    'records_received' => count($input['data'] ?? [])
]);
