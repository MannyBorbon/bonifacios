<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// A session is "online" only if is_active=TRUE, ended_at IS NULL, and started within last 15 minutes
$sql = "
    SELECT 
        u.id,
        u.username,
        u.full_name,
        u.role,
        COUNT(us.id) as total_sessions,
        COALESCE(SUM(us.duration_seconds), 0) as total_seconds,
        COALESCE(AVG(NULLIF(us.duration_seconds, 0)), 0) as avg_seconds,
        MAX(us.started_at) as last_seen,
        -- Is currently online: active session started in last 15 min
        MAX(CASE 
            WHEN us.is_active = TRUE 
            AND us.ended_at IS NULL 
            AND (us.last_activity IS NULL OR us.last_activity > DATE_SUB(NOW(), INTERVAL 5 MINUTE))
            THEN 1 ELSE 0 
        END) as is_online
    FROM users u
    LEFT JOIN user_sessions us ON us.user_id = u.id
    WHERE u.is_active = TRUE
    GROUP BY u.id, u.username, u.full_name, u.role
    ORDER BY is_online DESC, last_seen DESC
";

$result = $conn->query($sql);
$users = [];

while ($row = $result->fetch_assoc()) {
    // Get latest session details
    $latestSql = "
        SELECT 
            us.id,
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
        WHERE us.user_id = ?
        ORDER BY us.started_at DESC
        LIMIT 1
    ";
    $latestStmt = $conn->prepare($latestSql);
    $latestStmt->bind_param("i", $row['id']);
    $latestStmt->execute();
    $latest = $latestStmt->get_result()->fetch_assoc();

    // Recalculate duration for active sessions
    if ($latest && $latest['is_active'] && !$latest['duration_seconds']) {
        $latest['duration_seconds'] = time() - strtotime($latest['started_at']);
    }

    $users[] = [
        'id'             => (int)$row['id'],
        'username'       => $row['username'],
        'full_name'      => $row['full_name'],
        'role'           => $row['role'],
        'total_sessions' => (int)$row['total_sessions'],
        'total_seconds'  => (int)$row['total_seconds'],
        'avg_seconds'    => (int)$row['avg_seconds'],
        'last_seen'      => $row['last_seen'],
        'is_online'      => (bool)$row['is_online'],
        'latest_session' => $latest
    ];
}

echo json_encode(['success' => true, 'users' => $users]);
$conn->close();
?>
