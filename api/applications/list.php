<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$status = isset($_GET['status']) ? $conn->real_escape_string($_GET['status']) : null;
$position = isset($_GET['position']) ? $conn->real_escape_string($_GET['position']) : null;
$limit = isset($_GET['limit']) ? intval($_GET['limit']) : 50;
$offset = isset($_GET['offset']) ? intval($_GET['offset']) : 0;

$sql = "SELECT a.*, u.full_name as reviewed_by_name 
        FROM job_applications a 
        LEFT JOIN users u ON a.reviewed_by = u.id 
        WHERE 1=1";

if ($status) {
    $sql .= " AND a.status = '$status'";
}

if ($position) {
    $sql .= " AND a.position = '$position'";
}

$sql .= " ORDER BY a.created_at DESC LIMIT $limit OFFSET $offset";

$result = $conn->query($sql);
$applications = [];

while ($row = $result->fetch_assoc()) {
    $applications[] = $row;
}

// Contar total
$countSql = "SELECT COUNT(*) as total FROM job_applications WHERE 1=1";
if ($status) $countSql .= " AND status = '$status'";
if ($position) $countSql .= " AND position = '$position'";

$countResult = $conn->query($countSql);
$total = $countResult->fetch_assoc()['total'];

echo json_encode([
    'applications' => $applications,
    'total' => $total,
    'limit' => $limit,
    'offset' => $offset
]);

$conn->close();
?>
