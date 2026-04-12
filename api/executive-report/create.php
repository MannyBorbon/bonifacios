<?php
require_once '../config/database.php';
$userId = requireAuth();

// Check if user is admin
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

$name = $data['name'] ?? '';
$position = $data['position'] ?? '';
$mainAmount = $data['main_amount'] ?? 0;
$secondaryAmount = $data['secondary_amount'] ?? 0;
$applicationDate = $data['application_date'] ?? null;
$startDate = $data['start_date'] ?? null;

if (empty($name)) {
    http_response_code(400);
    echo json_encode(['error' => 'Name is required']);
    exit();
}

try {
    $sql = "INSERT INTO executive_report (name, position, main_amount, secondary_amount, application_date, start_date) VALUES (?, ?, ?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    $stmt->bind_param("ssddss", $name, $position, $mainAmount, $secondaryAmount, $applicationDate, $startDate);
    $stmt->execute();

    echo json_encode([
        'success' => true,
        'message' => 'Persona agregada exitosamente',
        'id' => $stmt->insert_id
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create entry: ' . $e->getMessage()]);
}

$conn->close();
?>
