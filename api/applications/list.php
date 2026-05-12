<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$statusRaw = isset($_GET['status']) ? trim((string)$_GET['status']) : null;
$positionRaw = isset($_GET['position']) ? trim((string)$_GET['position']) : null;
$limit = isset($_GET['limit']) ? max(1, min(200, intval($_GET['limit']))) : 50;
$offset = isset($_GET['offset']) ? max(0, intval($_GET['offset'])) : 0;

// Normalizacion estricta al enum real de BD: pending/reviewing/accepted/rejected
$statusMap = [
    'pending' => 'pending',
    'pendiente' => 'pending',
    'reviewing' => 'reviewing',
    'en_revision' => 'reviewing',
    'en revisión' => 'reviewing',
    'accepted' => 'accepted',
    'aceptada' => 'accepted',
    'aceptado' => 'accepted',
    'rejected' => 'rejected',
    'rechazada' => 'rejected',
    'rechazado' => 'rejected',
];

$status = null;
if ($statusRaw !== null && $statusRaw !== '') {
    $statusKey = strtolower($statusRaw);
    if (!array_key_exists($statusKey, $statusMap)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => 'Invalid status filter',
            'allowed' => ['pending', 'reviewing', 'accepted', 'rejected'],
        ]);
        $conn->close();
        exit();
    }
    $status = $statusMap[$statusKey];
}

$position = ($positionRaw !== null && $positionRaw !== '') ? $positionRaw : null;

$sql = "SELECT a.*, u.full_name as reviewed_by_name 
        FROM job_applications a 
        LEFT JOIN users u ON a.reviewed_by = u.id 
        WHERE 1=1";

$params = [];
$types = '';

if ($status) {
    $sql .= " AND a.status = ?";
    $params[] = $status;
    $types .= 's';
}

if ($position) {
    $sql .= " AND a.position = ?";
    $params[] = $position;
    $types .= 's';
}

$sql .= " ORDER BY a.created_at DESC LIMIT ? OFFSET ?";
$params[] = $limit;
$params[] = $offset;
$types .= 'ii';

$stmt = $conn->prepare($sql);
if (!$stmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to prepare applications query']);
    $conn->close();
    exit();
}
$stmt->bind_param($types, ...$params);
$stmt->execute();
$result = $stmt->get_result();
$applications = [];

while ($row = $result->fetch_assoc()) {
    $applications[] = $row;
}

// Contar total
$countSql = "SELECT COUNT(*) as total FROM job_applications WHERE 1=1";
$countParams = [];
$countTypes = '';
if ($status) {
    $countSql .= " AND status = ?";
    $countParams[] = $status;
    $countTypes .= 's';
}
if ($position) {
    $countSql .= " AND position = ?";
    $countParams[] = $position;
    $countTypes .= 's';
}
$countStmt = $conn->prepare($countSql);
if (!$countStmt) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => 'Failed to prepare count query']);
    $conn->close();
    exit();
}
if ($countTypes !== '') {
    $countStmt->bind_param($countTypes, ...$countParams);
}
$countStmt->execute();
$countResult = $countStmt->get_result();
$total = $countResult->fetch_assoc()['total'];

echo json_encode([
    'success' => true,
    'applications' => $applications,
    'total' => $total,
    'limit' => $limit,
    'offset' => $offset
]);

$conn->close();
?>
