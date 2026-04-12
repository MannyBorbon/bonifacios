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

if (!isset($data['application_id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Application ID required']);
    exit();
}

$appId = intval($data['application_id']);

// Get application data
$appSql = "SELECT * FROM job_applications WHERE id = ?";
$stmt = $conn->prepare($appSql);
$stmt->bind_param("i", $appId);
$stmt->execute();
$appResult = $stmt->get_result();
$application = $appResult->fetch_assoc();

if (!$application) {
    http_response_code(404);
    echo json_encode(['error' => 'Application not found']);
    exit();
}

// Create employee file
$sql = "INSERT INTO employee_files (application_id, name, age, gender, studies, email, phone, address, position, experience, current_job, photo, hire_date, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), 'activo')";

$stmt = $conn->prepare($sql);
$stmt->bind_param(
    "isissssssiss",
    $appId,
    $application['name'],
    $application['age'],
    $application['gender'],
    $application['estudios'],
    $application['email'],
    $application['phone'],
    $application['address'],
    $application['position'],
    $application['experience'],
    $application['current_job'],
    $application['photo_url']
);

if ($stmt->execute()) {
    $employeeId = $stmt->insert_id;
    
    // Update application status
    $updateSql = "UPDATE job_applications SET status = 'aceptado' WHERE id = ?";
    $updateStmt = $conn->prepare($updateSql);
    $updateStmt->bind_param("i", $appId);
    $updateStmt->execute();
    
    echo json_encode([
        'success' => true,
        'message' => 'Expediente creado exitosamente',
        'employee_id' => $employeeId
    ]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create employee file: ' . $stmt->error]);
}

$conn->close();
?>
