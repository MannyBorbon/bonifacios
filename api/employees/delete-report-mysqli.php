<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

$conn = getConnection();

// Check admin
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

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['report_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Report ID required']);
    exit();
}

$reportId = intval($data['report_id']);

// Get report info to delete files
$getSql = "SELECT file_path, photo_path FROM employee_reports WHERE id = ?";
$stmt = $conn->prepare($getSql);
$stmt->bind_param("i", $reportId);
$stmt->execute();
$result = $stmt->get_result();
$report = $result->fetch_assoc();

if (!$report) {
    http_response_code(404);
    echo json_encode(['error' => 'Report not found']);
    exit();
}

// Delete physical files
if ($report['file_path']) {
    $fullPath = __DIR__ . '/../../' . ltrim($report['file_path'], '/');
    if (file_exists($fullPath)) {
        unlink($fullPath);
    }
}
if ($report['photo_path']) {
    $fullPath = __DIR__ . '/../../' . ltrim($report['photo_path'], '/');
    if (file_exists($fullPath)) {
        unlink($fullPath);
    }
}

// Delete from DB
$deleteSql = "DELETE FROM employee_reports WHERE id = ?";
$stmt = $conn->prepare($deleteSql);
$stmt->bind_param("i", $reportId);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Reporte eliminado']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al eliminar reporte']);
}

$conn->close();
?>
