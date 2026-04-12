<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Total sesiones
$totalSessionsSql = "SELECT COUNT(*) as total FROM user_sessions";
$totalSessions = $conn->query($totalSessionsSql)->fetch_assoc()['total'];

// Duración promedio
$avgDurationSql = "SELECT AVG(duration_seconds) as avg FROM user_sessions WHERE duration_seconds > 0";
$avgDuration = $conn->query($avgDurationSql)->fetch_assoc()['avg'] ?? 0;

// Total clicks
$totalClicksSql = "SELECT COUNT(*) as total FROM user_clicks";
$totalClicks = $conn->query($totalClicksSql)->fetch_assoc()['total'];

// Usuarios activos (sesiones activas)
$activeUsersSql = "SELECT COUNT(DISTINCT user_id) as total FROM user_sessions WHERE is_active = TRUE";
$activeUsers = $conn->query($activeUsersSql)->fetch_assoc()['total'];

// Actividad reciente
$activitySql = "SELECT a.*, u.full_name as user_name 
                FROM activity_log a 
                LEFT JOIN users u ON a.user_id = u.id 
                ORDER BY a.created_at DESC 
                LIMIT 20";
$activityResult = $conn->query($activitySql);
$recentActivity = [];
while ($row = $activityResult->fetch_assoc()) {
    $recentActivity[] = $row;
}

// Páginas más visitadas
$topPagesSql = "SELECT page_url, COUNT(*) as count 
                FROM page_views 
                GROUP BY page_url 
                ORDER BY count DESC 
                LIMIT 5";
$topPagesResult = $conn->query($topPagesSql);
$topPages = [];
while ($row = $topPagesResult->fetch_assoc()) {
    $topPages[] = $row;
}

// Actividad por usuario
$userActivitySql = "SELECT u.id, u.username, u.full_name, COUNT(s.id) as session_count 
                    FROM users u 
                    LEFT JOIN user_sessions s ON u.id = s.user_id 
                    WHERE u.is_active = TRUE
                    GROUP BY u.id, u.username, u.full_name
                    ORDER BY session_count DESC";
$userActivityResult = $conn->query($userActivitySql);
$userActivity = [];
while ($row = $userActivityResult->fetch_assoc()) {
    $userActivity[] = [
        'id' => $row['id'],
        'username' => $row['username'],
        'full_name' => $row['full_name'],
        'session_count' => (int)$row['session_count']
    ];
}

echo json_encode([
    'totalSessions' => (int)$totalSessions,
    'avgDuration' => round($avgDuration),
    'totalClicks' => (int)$totalClicks,
    'activeUsers' => (int)$activeUsers,
    'recentActivity' => $recentActivity,
    'topPages' => $topPages,
    'userActivity' => $userActivity
], JSON_PRETTY_PRINT);

$conn->close();
?>
