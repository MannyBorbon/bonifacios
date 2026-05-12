<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['success' => false, 'error' => 'Método no permitido']);
        exit;
    }

    requireAuth();
    $conn = getConnection();

    $quotesSql = 'SELECT q.*,
                        u.full_name AS assigned_name,
                        DATEDIFF(q.event_date, CURDATE()) AS days_until_event
                 FROM event_quotes q
                 LEFT JOIN users u ON q.assigned_to = u.id
                 ORDER BY q.created_at DESC';

    $quotesStmt = $conn->prepare($quotesSql);
    $quotesStmt->execute();
    $quotesResult = $quotesStmt->get_result();
    $quotes = [];

    while ($row = $quotesResult->fetch_assoc()) {
        $quotes[] = $row;
    }

    $statsSql = 'SELECT 
                    COUNT(*) AS total_quotes,
                    SUM(CASE WHEN status = \'pending\' THEN 1 ELSE 0 END) AS pending_quotes,
                    SUM(CASE WHEN status = \'confirmed\' THEN 1 ELSE 0 END) AS confirmed_quotes,
                    SUM(CASE WHEN status = \'quoted\' THEN 1 ELSE 0 END) AS quoted_quotes,
                    SUM(CASE WHEN status = \'cancelled\' THEN 1 ELSE 0 END) AS cancelled_quotes,
                    ROUND(
                        (SUM(CASE WHEN status = \'confirmed\' THEN 1 ELSE 0 END) /
                         NULLIF(COUNT(*), 0)) * 100, 2
                    ) AS conversion_rate,
                    AVG(guests) AS avg_guests,
                    MAX(guests) AS max_guests,
                    MIN(guests) AS min_guests
                FROM event_quotes';

    $statsStmt = $conn->prepare($statsSql);
    $statsStmt->execute();
    $stats = $statsStmt->get_result()->fetch_assoc();

    $eventTypesSql = 'SELECT event_type, COUNT(*) AS count
                      FROM event_quotes
                      GROUP BY event_type
                      ORDER BY count DESC';

    $eventTypesStmt = $conn->prepare($eventTypesSql);
    $eventTypesStmt->execute();
    $eventTypesResult = $eventTypesStmt->get_result();
    $eventTypes = [];

    while ($row = $eventTypesResult->fetch_assoc()) {
        $eventTypes[] = $row;
    }

    $monthlySql = 'SELECT 
                      DATE_FORMAT(created_at, \'%Y-%m\') AS month,
                      COUNT(*) AS quotes_count,
                      SUM(CASE WHEN status = \'confirmed\' THEN 1 ELSE 0 END) AS confirmed_count,
                      SUM(CASE WHEN quote_amount IS NOT NULL THEN quote_amount ELSE 0 END) AS total_revenue
                   FROM event_quotes
                   WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                   GROUP BY DATE_FORMAT(created_at, \'%Y-%m\')
                   ORDER BY month DESC';

    $monthlyStmt = $conn->prepare($monthlySql);
    $monthlyStmt->execute();
    $monthlyResult = $monthlyStmt->get_result();
    $monthlyStats = [];

    while ($row = $monthlyResult->fetch_assoc()) {
        $monthlyStats[] = $row;
    }

    echo json_encode([
        'success' => true,
        'quotes' => $quotes,
        'stats' => array_merge($stats, [
            'event_types' => $eventTypes,
            'monthly_stats' => $monthlyStats,
        ]),
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}
