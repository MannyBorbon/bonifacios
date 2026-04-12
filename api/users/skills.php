<?php
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../config/database.php';

$userId = requireAuth();
$conn = getConnection();

// Get skills for the logged-in user
$stmt = $conn->prepare("SELECT icon, skill, description FROM user_skills WHERE user_id = ? AND is_active = 1 ORDER BY sort_order ASC");
$stmt->bind_param("i", $userId);
$stmt->execute();
$result = $stmt->get_result();

$skills = [];
while ($row = $result->fetch_assoc()) {
    $skills[] = $row;
}

echo json_encode([
    'success' => true,
    'skills' => $skills
]);

$conn->close();
?>
