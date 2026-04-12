<?php
require_once '../config/database.php';
$userId = requireAuth();

$conn = getConnection();

$sql = "SELECT id, username, full_name, avatar, role 
        FROM users 
        WHERE id != ? AND is_active = TRUE 
        ORDER BY full_name";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$users = [];
while ($row = $result->fetch_assoc()) {
    $users[] = $row;
}

echo json_encode($users);
$conn->close();
?>
