<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

// Get recent user activity (sessions, clicks, page views)
$sql = "
    SELECT 
        u.username,
        us.started_at,
        us.ended_at,
        us.ip_address,
        us.country,
        us.city,
        us.browser,
        us.os,
        'session' as activity_type
    FROM user_sessions us
    JOIN users u ON us.user_id = u.id
    WHERE us.started_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ORDER BY us.started_at DESC
    LIMIT 20
";

$result = $conn->query($sql);
$activities = [];

while ($row = $result->fetch_assoc()) {
    $action = '';
    $time = $row['started_at'];
    
    if ($row['ended_at']) {
        $duration = strtotime($row['ended_at']) - strtotime($row['started_at']);
        $minutes = floor($duration / 60);
        $action = "Sesión finalizada (duración: {$minutes} min)";
        $time = $row['ended_at'];
    } else {
        $action = "Inició sesión";
    }
    
    $location = '';
    if ($row['city'] && $row['country']) {
        $location = $row['city'] . ', ' . $row['country'];
    } elseif ($row['country']) {
        $location = $row['country'];
    }
    
    $timeAgo = getTimeAgo($time);
    
    $activities[] = [
        'username' => $row['username'],
        'action' => $action,
        'browser' => $row['browser'],
        'os' => $row['os'],
        'location' => $location,
        'time' => $time,
        'time_ago' => $timeAgo
    ];
}

// Get recent clicks
$clicksSql = "
    SELECT 
        u.username,
        uc.element_text,
        uc.timestamp
    FROM user_clicks uc
    JOIN users u ON uc.user_id = u.id
    WHERE uc.timestamp > DATE_SUB(NOW(), INTERVAL 24 HOUR)
    ORDER BY uc.timestamp DESC
    LIMIT 10
";

$clicksResult = $conn->query($clicksSql);
if ($clicksResult) {
    while ($row = $clicksResult->fetch_assoc()) {
        $activities[] = [
            'username' => $row['username'],
            'action' => "Click en: " . ($row['element_text'] ?: 'elemento'),
            'time' => $row['timestamp'],
            'time_ago' => getTimeAgo($row['timestamp']),
            'location' => null
        ];
    }
}

// Sort by time
usort($activities, function($a, $b) {
    return strtotime($b['time']) - strtotime($a['time']);
});

// Limit to 15 most recent
$activities = array_slice($activities, 0, 15);

echo json_encode([
    'success' => true,
    'data' => $activities
]);

$conn->close();

function getTimeAgo($datetime) {
    $time = strtotime($datetime);
    $diff = time() - $time;
    
    if ($diff < 60) {
        return 'hace un momento';
    } elseif ($diff < 3600) {
        $minutes = floor($diff / 60);
        return "hace {$minutes} min";
    } elseif ($diff < 86400) {
        $hours = floor($diff / 3600);
        return "hace {$hours} hora" . ($hours > 1 ? 's' : '');
    } else {
        $days = floor($diff / 86400);
        return "hace {$days} día" . ($days > 1 ? 's' : '');
    }
}
?>
