<?php
require_once '../config/database.php';
$userId = requireAuth();

header('Content-Type: application/json');

// Check if user is admin
$conn = getConnection();
$userSql = "SELECT role FROM users WHERE id = ?";
$stmt = $conn->prepare($userSql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$userResult = $stmt->get_result()->fetch_assoc();

if (!$userResult || $userResult['role'] !== 'administrador') {
    http_response_code(403);
    echo json_encode(['error' => 'No autorizado']);
    exit();
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data || !isset($data['id']) || !isset($data['field']) || !isset($data['value'])) {
    http_response_code(400);
    echo json_encode(['error' => 'id, field and value are required']);
    exit();
}

$id = intval($data['id']);
$field = $data['field'];
$value = $data['value'];

$allowedFields = ['name', 'email', 'phone', 'age', 'gender', 'position', 'experience', 'current_job', 'address', 'estudios', 'notes'];

if (!in_array($field, $allowedFields)) {
    http_response_code(400);
    echo json_encode(['error' => 'Campo no permitido: ' . $field]);
    exit();
}

$sql = "UPDATE job_applications SET `$field` = ? WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("si", $value, $id);

if ($stmt->execute()) {
    echo json_encode(['success' => true]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error al actualizar: ' . $conn->error]);
}

$conn->close();
?>
