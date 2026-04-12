<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$sql = "
    SELECT 
        us.id,
        us.user_id,
        u.full_name,
        u.username,
        u.role,
        us.started_at,
        us.ended_at,
        us.duration_seconds,
        us.ip_address,
        us.country,
        us.city,
        us.browser,
        us.os,
        us.device_type,
        us.is_active,
        (SELECT COUNT(*) FROM user_clicks uc WHERE uc.session_id = us.id AND uc.event_type NOT IN ('window_focus','window_blur','visibility_change')) as click_count,
        (SELECT COUNT(*) FROM page_views pv WHERE pv.session_id = us.id) as page_count
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    ORDER BY us.started_at DESC
    LIMIT 100
";

$result = $conn->query($sql);
$sessions = [];

if ($result) {
    while ($row = $result->fetch_assoc()) {
        // Calculate duration if session is still active
        if ($row['is_active'] && !$row['duration_seconds']) {
            $row['duration_seconds'] = time() - strtotime($row['started_at']);
        }
        $sessions[] = $row;
    }
}

// Get currently online users (active sessions in last 5 minutes)
$onlineSql = "
    SELECT DISTINCT u.id, u.full_name, u.username
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.is_active = TRUE
      AND (us.last_activity IS NULL OR us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE))
";
$onlineResult = $conn->query($onlineSql);
$onlineUsers = [];
while ($row = $onlineResult->fetch_assoc()) {
    $onlineUsers[] = $row;
}

echo json_encode([
    'success' => true,
    'sessions' => $sessions,
    'online_users' => $onlineUsers,
    'online_count' => count($onlineUsers)
]);

$conn->close();
?>
