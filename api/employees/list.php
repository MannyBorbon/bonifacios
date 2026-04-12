<?php
require_once '../config/database.php';
session_start();

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}

$conn = getConnection();

$sql = "SELECT * FROM employee_files ORDER BY created_at DESC";
$result = $conn->query($sql);

$employees = [];
while ($row = $result->fetch_assoc()) {
    $employees[] = $row;
}

echo json_encode([
    'success' => true,
    'data' => $employees
]);

$conn->close();
?>
