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

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['report_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'report_id is required']);
    exit();
}

$reportId = intval($data['report_id']);
$content = isset($data['content']) ? $data['content'] : null;
$reportName = isset($data['report_name']) ? trim($data['report_name']) : null;

// Build update query dynamically
$updates = [];
$types = '';
$values = [];

if ($content !== null) {
    $updates[] = "content = ?";
    $types .= 's';
    $values[] = $content;
}

if ($reportName !== null) {
    $updates[] = "report_name = ?";
    $types .= 's';
    $values[] = $reportName;
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode(['error' => 'Nothing to update']);
    exit();
}

$sql = "UPDATE employee_reports SET " . implode(', ', $updates) . " WHERE id = ?";
$types .= 'i';
$values[] = $reportId;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Reporte actualizado']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar', 'sql_error' => $stmt->error]);
}

$conn->close();
?>
