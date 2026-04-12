<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$days = isset($_GET['days']) ? intval($_GET['days']) : 7;

// Applications - Real data from job_applications table
$appsSql = "SELECT DATE(created_at) as date, COUNT(*) as value 
            FROM job_applications 
            WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
            GROUP BY DATE(created_at)
            ORDER BY date ASC";
$stmt = $conn->prepare($appsSql);
$stmt->bind_param("i", $days);
$stmt->execute();
$appsResult = $stmt->get_result();
$applications = [];
while ($row = $appsResult->fetch_assoc()) {
    $applications[] = $row;
}

// If no data in last X days, return empty array instead of fake data
$pageViews = [];

// Stats
$totalAppsSql = "SELECT COUNT(*) as total FROM job_applications";
$totalApps = $conn->query($totalAppsSql)->fetch_assoc()['total'];

$pendingAppsSql = "SELECT COUNT(*) as total FROM job_applications WHERE status = 'Pendiente'";
$pendingApps = $conn->query($pendingAppsSql)->fetch_assoc()['total'];

$totalUsersSql = "SELECT COUNT(*) as total FROM users WHERE is_active = TRUE";
$totalUsers = $conn->query($totalUsersSql)->fetch_assoc()['total'];

$unreadMessages = 0;
try {
    $unreadMsgSql = "SELECT COUNT(*) as total FROM messages WHERE recipient_id = ? AND is_read = FALSE";
    $stmt = $conn->prepare($unreadMsgSql);
    if ($stmt) {
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $unreadMessages = $stmt->get_result()->fetch_assoc()['total'];
    }
} catch (Exception $e) {}

// Recent activity
$recentActivity = [];
try {
    $activitySql = "SELECT a.*, u.full_name as user_name 
                    FROM activity_log a 
                    LEFT JOIN users u ON a.user_id = u.id 
                    ORDER BY a.created_at DESC 
                    LIMIT 10";
    $activityResult = $conn->query($activitySql);
    if ($activityResult) {
        while ($row = $activityResult->fetch_assoc()) {
            $recentActivity[] = $row;
        }
    }
} catch (Exception $e) {}

// Top positions
$positionsSql = "SELECT position, COUNT(*) as count 
                 FROM job_applications 
                 GROUP BY position 
                 ORDER BY count DESC 
                 LIMIT 5";
$positionsResult = $conn->query($positionsSql);
$topPositions = [];
while ($row = $positionsResult->fetch_assoc()) {
    $topPositions[] = $row;
}

echo json_encode([
    'charts' => [
        'pageViews' => $pageViews,
        'applications' => $applications
    ],
    'stats' => [
        'totalApplications' => $totalApps,
        'pendingApplications' => $pendingApps,
        'totalUsers' => $totalUsers,
        'unreadMessages' => $unreadMessages
    ],
    'recentActivity' => $recentActivity,
    'topPositions' => $topPositions,
    'dailyStats'    => array_map(fn($r) => ['date' => $r['date'], 'applications' => (int)$r['value'], 'messages' => 0], $applications)
]);

$conn->close();
?>
