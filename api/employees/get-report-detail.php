<?php
require_once '../config/database.php';
session_start();

header('Content-Type: application/json');

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$userId = $_SESSION['user_id'];
$conn = getConnection();

// Check if user is admin
$userSql = "SELECT role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$userResult = $stmt->get_result();
$user = $userResult->fetch_assoc();

if ($user['role'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin only']);
    exit();
}

if (!isset($_GET['report_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'report_id is required']);
    exit();
}

$reportId = intval($_GET['report_id']);

// Get report with creator name and additional photos
$sql = "SELECT 
    er.*,
    u.username as created_by_name,
    (SELECT JSON_ARRAYAGG(photo_path) FROM report_photos WHERE report_id = er.id) as additional_photos
FROM employee_reports er
LEFT JOIN users u ON er.created_by = u.id
WHERE er.id = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $reportId);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Report not found']);
    exit();
}

$report = $result->fetch_assoc();

// Parse additional photos
$report['additional_photos'] = $report['additional_photos'] ? json_decode($report['additional_photos'], true) : [];

echo json_encode([
    'success' => true,
    'report' => $report
]);

$conn->close();
?>
