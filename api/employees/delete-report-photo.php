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

if (!isset($data['photo_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'photo_id is required']);
    exit();
}

$photoId = intval($data['photo_id']);

// Get photo info before deleting
$getSql = "SELECT photo_path FROM report_photos WHERE id = ?";
$getStmt = $conn->prepare($getSql);
$getStmt->bind_param("i", $photoId);
$getStmt->execute();
$result = $getStmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    echo json_encode(['error' => 'Photo not found']);
    exit();
}

$photo = $result->fetch_assoc();
$photoPath = $photo['photo_path'];

// Delete from database
$sql = "DELETE FROM report_photos WHERE id = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $photoId);

if ($stmt->execute()) {
    // Delete physical file
    if ($photoPath) {
        $filePath = __DIR__ . '/../..' . $photoPath;
        if (file_exists($filePath)) {
            unlink($filePath);
        }
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Photo deleted successfully'
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Error deleting photo', 'sql_error' => $stmt->error]);
}

$conn->close();
?>
