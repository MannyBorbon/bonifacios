<?php
// Test file to debug what parameters sales.php is receiving
header('Content-Type: application/json');

$range = $_GET['range'] ?? 'NOT SET';
$start = $_GET['start'] ?? 'NOT SET';
$end = $_GET['end'] ?? 'NOT SET';
$status = $_GET['status'] ?? 'NOT SET';

echo json_encode([
    'received_params' => [
        'range' => $range,
        'start' => $start,
        'end' => $end,
        'status' => $status
    ],
    'calculated_dates' => [
        'start_would_be' => ($range === 'custom' && $start !== 'NOT SET') ? $start : 'Using default logic',
        'end_would_be' => ($range === 'custom' && $end !== 'NOT SET') ? $end : 'Using default logic'
    ],
    'query_string' => $_SERVER['QUERY_STRING'] ?? 'NONE'
], JSON_PRETTY_PRINT);
