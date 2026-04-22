<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

try {
    $conn = getConnection();

    $result = $conn->query("
        SELECT 
            COUNT(*) as total,
            SUM(status = 'pending')   as pending,
            SUM(status = 'reviewing') as reviewing,
            SUM(status = 'accepted')  as accepted,
            SUM(status = 'rejected')  as rejected
        FROM job_applications
    ");
    $stats = $result->fetch_assoc();

    // Solicitudes por posición
    $byPos = $conn->query("SELECT position, COUNT(*) as count FROM job_applications GROUP BY position ORDER BY count DESC LIMIT 10");
    $positions = [];
    while ($row = $byPos->fetch_assoc()) $positions[] = $row;

    // Últimas 7 solicitudes por día
    $trend = $conn->query("
        SELECT DATE(created_at) as day, COUNT(*) as count
        FROM job_applications
        WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY DATE(created_at)
        ORDER BY day ASC
    ");
    $trendData = [];
    while ($row = $trend->fetch_assoc()) $trendData[] = $row;

    echo json_encode([
        'success'   => true,
        'stats'     => array_map('intval', $stats),
        'positions' => $positions,
        'trend'     => $trendData,
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
