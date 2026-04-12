<?php
require_once '../config/database.php';

// Set timezone to Sonora (Hermosillo)
date_default_timezone_set('America/Hermosillo');

header('Content-Type: application/json');

try {
    $userId = requireAuth();
    $conn = getConnection();
    
    // Get user role for permissions
    $userStmt = $conn->prepare("SELECT role FROM users WHERE id = ?");
    $userStmt->bind_param("i", $userId);
    $userStmt->execute();
    $userResult = $userStmt->get_result();
    $user = $userResult->fetch_assoc();
    $userRole = $user['role'] ?? 'viewer';
    
    // Get quotes with statistics
    $quotesSql = "SELECT q.*, 
                        u.full_name as assigned_name,
                        DATEDIFF(q.event_date, CURDATE()) as days_until_event
                 FROM event_quotes q 
                 LEFT JOIN users u ON q.assigned_to = u.id 
                 ORDER BY q.created_at DESC";
    
    $quotesStmt = $conn->prepare($quotesSql);
    $quotesStmt->execute();
    $quotesResult = $quotesStmt->get_result();
    $quotes = [];
    
    while ($row = $quotesResult->fetch_assoc()) {
        $quotes[] = $row;
    }
    
    // Calculate statistics
    $statsSql = "SELECT 
                    COUNT(*) as total_quotes,
                    SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_quotes,
                    SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_quotes,
                    SUM(CASE WHEN status = 'quoted' THEN 1 ELSE 0 END) as quoted_quotes,
                    SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_quotes,
                    ROUND(
                        (SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) / 
                         NULLIF(COUNT(*), 0)) * 100, 2
                    ) as conversion_rate,
                    AVG(guests) as avg_guests,
                    MAX(guests) as max_guests,
                    MIN(guests) as min_guests
                FROM event_quotes";
    
    $statsStmt = $conn->prepare($statsSql);
    $statsStmt->execute();
    $stats = $statsStmt->get_result()->fetch_assoc();
    
    // Get event types statistics
    $eventTypesSql = "SELECT event_type, COUNT(*) as count 
                      FROM event_quotes 
                      GROUP BY event_type 
                      ORDER BY count DESC";
    
    $eventTypesStmt = $conn->prepare($eventTypesSql);
    $eventTypesStmt->execute();
    $eventTypesResult = $eventTypesStmt->get_result();
    $eventTypes = [];
    
    while ($row = $eventTypesResult->fetch_assoc()) {
        $eventTypes[] = $row;
    }
    
    // Get monthly statistics
    $monthlySql = "SELECT 
                      DATE_FORMAT(created_at, '%Y-%m') as month,
                      COUNT(*) as quotes_count,
                      SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_count,
                      SUM(CASE WHEN quote_amount IS NOT NULL THEN quote_amount ELSE 0 END) as total_revenue
                   FROM event_quotes 
                   WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
                   GROUP BY DATE_FORMAT(created_at, '%Y-%m')
                   ORDER BY month DESC";
    
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
            'monthly_stats' => $monthlyStats
        ])
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}

$conn->close();
?>
