<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$userId = $_SESSION['user_id'];
$conn = getConnection();

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

if (!isset($data['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Employee ID required']);
    exit();
}

$id = intval($data['id']);
$updates = [];
$types = "";
$values = [];

// Build dynamic update query
$allowedFields = ['name', 'age', 'gender', 'studies', 'email', 'phone', 'address', 'position', 'experience', 'current_job', 'status', 'notes', 'hire_date', 'emergency_contact'];

foreach ($allowedFields as $field) {
    if (isset($data[$field])) {
        $updates[] = "$field = ?";
        if ($field === 'age' || $field === 'experience') {
            $types .= "i";
            $values[] = intval($data[$field]);
        } else {
            $types .= "s";
            $values[] = $data[$field];
        }
    }
}

if (empty($updates)) {
    http_response_code(400);
    echo json_encode(['error' => 'No fields to update']);
    exit();
}

$sql = "UPDATE employee_files SET " . implode(", ", $updates) . " WHERE id = ?";
$types .= "i";
$values[] = $id;

$stmt = $conn->prepare($sql);
$stmt->bind_param($types, ...$values);

if ($stmt->execute()) {
    echo json_encode([
        'success' => true,
        'message' => 'Expediente actualizado exitosamente'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to update employee file']);
}

$conn->close();
?>
