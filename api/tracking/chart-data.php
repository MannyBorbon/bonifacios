<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$days = isset($_GET['days']) ? intval($_GET['days']) : 30;
if ($days < 7) $days = 7;
if ($days > 90) $days = 90;

// Get all active users
$usersSql = "SELECT id, username, full_name FROM users WHERE is_active = TRUE ORDER BY full_name";
$usersResult = $conn->query($usersSql);
$users = [];
while ($row = $usersResult->fetch_assoc()) {
    $users[] = $row;
}

// Get daily session totals per user for the last N days
$chartSql = "
    SELECT 
        u.id as user_id,
        u.full_name,
        DATE(us.started_at) as session_date,
        SUM(COALESCE(us.duration_seconds, 0)) as total_seconds,
        COUNT(us.id) as session_count
    FROM users u
    JOIN user_sessions us ON us.user_id = u.id
    WHERE us.started_at >= DATE_SUB(CURDATE(), INTERVAL ? DAY)
      AND u.is_active = TRUE
    GROUP BY u.id, u.full_name, DATE(us.started_at)
    ORDER BY session_date ASC
";

$stmt = $conn->prepare($chartSql);
$stmt->bind_param("i", $days);
$stmt->execute();
$result = $stmt->get_result();

// Build date range
$dateRange = [];
for ($i = $days - 1; $i >= 0; $i--) {
    $dateRange[] = date('Y-m-d', strtotime("-{$i} days"));
}

// Index data by date + user
$dataByDate = [];
while ($row = $result->fetch_assoc()) {
    $dataByDate[$row['session_date']][$row['user_id']] = [
        'seconds' => (int)$row['total_seconds'],
        'minutes' => round($row['total_seconds'] / 60, 1),
        'sessions' => (int)$row['session_count']
    ];
}

// Build chart-ready array: [{date, UserA: minutes, UserB: minutes, ...}]
$chartData = [];
foreach ($dateRange as $date) {
    $entry = ['date' => $date];
    foreach ($users as $u) {
        $entry[$u['full_name']] = isset($dataByDate[$date][$u['id']])
            ? $dataByDate[$date][$u['id']]['minutes']
            : 0;
    }
    $chartData[] = $entry;
}

// Only return dates that have at least one non-zero value to keep chart clean
$chartData = array_values(array_filter($chartData, function($entry) {
    foreach ($entry as $key => $val) {
        if ($key !== 'date' && $val > 0) return true;
    }
    return false;
}));

// Assign colors per user
$colors = ['#D4AF37', '#34D399', '#F87171', '#60A5FA', '#A78BFA', '#FB923C'];
$userColors = [];
foreach ($users as $i => $u) {
    $userColors[$u['full_name']] = $colors[$i % count($colors)];
}

echo json_encode([
    'success'    => true,
    'chart_data' => $chartData,
    'users'      => array_values(array_map(fn($u) => [
        'id'        => $u['id'],
        'full_name' => $u['full_name'],
        'username'  => $u['username'],
        'color'     => $userColors[$u['full_name']]
    ], $users))
]);

$conn->close();
?>
