<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$targetUserId = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
$date = isset($_GET['date']) ? $_GET['date'] : null;

if (!$targetUserId) {
    http_response_code(400);
    echo json_encode(['error' => 'user_id required']);
    exit();
}

// Validate date format if provided
if ($date && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid date format. Use YYYY-MM-DD']);
    exit();
}

// Build query — filter by date if provided
$whereClauses = ["us.user_id = ?"];
$params = [$targetUserId];
$types = "i";

if ($date) {
    $whereClauses[] = "DATE(us.started_at) = ?";
    $params[] = $date;
    $types .= "s";
}

$where = implode(" AND ", $whereClauses);

$sql = "
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
        us.last_activity,
        (SELECT COUNT(*) FROM user_clicks uc WHERE uc.session_id = us.id AND uc.event_type NOT IN ('window_focus','window_blur','visibility_change')) as click_count,
        (SELECT COUNT(*) FROM page_views pv WHERE pv.session_id = us.id) as page_count
    FROM user_sessions us
    WHERE {$where}
    ORDER BY us.started_at DESC
    LIMIT 50
";

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();

$sessions = [];
while ($row = $result->fetch_assoc()) {
    // Recalculate duration for active sessions
    if ($row['is_active'] && !$row['duration_seconds']) {
        $row['duration_seconds'] = time() - strtotime($row['started_at']);
    }
    $sessions[] = $row;
}

// Get distinct dates where user had sessions (for calendar highlights)
$datesSql = "
    SELECT DISTINCT DATE(started_at) as session_date
    FROM user_sessions
    WHERE user_id = ?
    ORDER BY session_date DESC
    LIMIT 90
";
$datesStmt = $conn->prepare($datesSql);
$datesStmt->bind_param("i", $targetUserId);
$datesStmt->execute();
$datesResult = $datesStmt->get_result();
$activeDates = [];
while ($d = $datesResult->fetch_assoc()) {
    $activeDates[] = $d['session_date'];
}

echo json_encode([
    'success'      => true,
    'sessions'     => $sessions,
    'active_dates' => $activeDates
]);

$conn->close();
?>
