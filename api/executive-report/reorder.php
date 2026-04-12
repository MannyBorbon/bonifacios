<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();
$data = json_decode(file_get_contents('php://input'), true);

$order = $data['order'] ?? [];

if (empty($order) || !is_array($order)) {
    http_response_code(400);
    echo json_encode(['error' => 'order array required']);
    exit();
}

// Ensure sort_order column exists
$conn->query("ALTER TABLE employee_files ADD COLUMN IF NOT EXISTS sort_order INT DEFAULT 0");

// Update each employee's sort_order
$stmt = $conn->prepare("UPDATE employee_files SET sort_order = ? WHERE id = ?");
foreach ($order as $index => $employeeId) {
    $pos = (int)$index;
    $id = (int)$employeeId;
    $stmt->bind_param("ii", $pos, $id);
    $stmt->execute();
}

echo json_encode(['success' => true]);
$conn->close();
?>
