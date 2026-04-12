<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

if (!isset($_GET['employee_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Employee ID required']);
    exit();
}

$employeeId = intval($_GET['employee_id']);
$conn = getConnection();

// Check if table exists
$tableCheck = $conn->query("SHOW TABLES LIKE 'employee_reports'");
if ($tableCheck->num_rows === 0) {
    echo json_encode(['success' => true, 'reports' => []]);
    $conn->close();
    exit();
}

// Check if photo_path column exists
$hasPhotoPath = false;
$colCheck = $conn->query("SHOW COLUMNS FROM employee_reports LIKE 'photo_path'");
if ($colCheck && $colCheck->num_rows > 0) {
    $hasPhotoPath = true;
}

if ($hasPhotoPath) {
    $sql = "SELECT r.id, r.employee_id, r.report_name, r.report_type, r.file_path, r.content, r.photo_path, r.created_at, u.username as created_by_name
            FROM employee_reports r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.employee_id = ?
            ORDER BY r.created_at DESC";
} else {
    $sql = "SELECT r.id, r.employee_id, r.report_name, r.report_type, r.file_path, r.content, NULL as photo_path, r.created_at, u.username as created_by_name
            FROM employee_reports r
            LEFT JOIN users u ON r.created_by = u.id
            WHERE r.employee_id = ?
            ORDER BY r.created_at DESC";
}

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $employeeId);
$stmt->execute();
$result = $stmt->get_result();

$reports = [];
while ($row = $result->fetch_assoc()) {
    $reports[] = $row;
}

echo json_encode([
    'success' => true,
    'reports' => $reports
]);

$conn->close();
?>
