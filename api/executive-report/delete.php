<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

$conn = getConnection();

$userSql = "SELECT role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();

if ($user['role'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden - Admin only']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);
$employeeId = isset($data['id']) ? intval($data['id']) : 0;

if (!$employeeId) {
    http_response_code(400);
    echo json_encode(['error' => 'Employee ID required']);
    exit();
}

// Get employee name to also remove from executive_report
$nameSql = "SELECT name FROM employee_files WHERE id = ?";
$nameStmt = $conn->prepare($nameSql);
$nameStmt->bind_param("i", $employeeId);
$nameStmt->execute();
$emp = $nameStmt->get_result()->fetch_assoc();

if ($emp) {
    $delExecSql = "DELETE FROM executive_report WHERE name = ?";
    $delExecStmt = $conn->prepare($delExecSql);
    $delExecStmt->bind_param("s", $emp['name']);
    $delExecStmt->execute();
}

$deleteSql = "DELETE FROM employee_files WHERE id = ?";
$deleteStmt = $conn->prepare($deleteSql);
$deleteStmt->bind_param("i", $employeeId);

if ($deleteStmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Empleado eliminado']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al eliminar empleado']);
}

$conn->close();
?>
