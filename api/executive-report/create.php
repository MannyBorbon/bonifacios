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
    $conn->begin_transaction();

    // employee_files es la fuente principal del dashboard de empleados
    $status = 'active';
    $hireDate = (!empty($startDate) && $startDate !== 'null') ? $startDate : null;

    $sql = "INSERT INTO employee_files (name, position, status, hire_date) VALUES (?, ?, ?, ?)";
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception('Prepare employee_files failed: ' . $conn->error);
    }
    $stmt->bind_param("ssss", $name, $position, $status, $hireDate);
    if (!$stmt->execute()) {
        throw new Exception('Insert employee_files failed: ' . $stmt->error);
    }

    $newId = $stmt->insert_id;

    // Mantener métricas opcionales en executive_report (si existe fila, la actualiza)
    $execSql = "INSERT INTO executive_report (name, main_amount, secondary_amount, application_date, start_date, status, hire_date)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    main_amount = VALUES(main_amount),
                    secondary_amount = VALUES(secondary_amount),
                    application_date = VALUES(application_date),
                    start_date = VALUES(start_date),
                    status = VALUES(status),
                    hire_date = VALUES(hire_date)";
    $execStmt = $conn->prepare($execSql);
    if ($execStmt) {
        $appDate = (!empty($applicationDate) && $applicationDate !== 'null') ? $applicationDate : null;
        $startDateSafe = (!empty($startDate) && $startDate !== 'null') ? $startDate : null;
        $execStmt->bind_param("sddssss", $name, $mainAmount, $secondaryAmount, $appDate, $startDateSafe, $status, $hireDate);
        if (!$execStmt->execute()) {
            throw new Exception('Upsert executive_report failed: ' . $execStmt->error);
        }
    }

    $conn->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Persona agregada exitosamente',
        'id' => $newId
    ]);
} catch (Exception $e) {
    if ($conn->errno || method_exists($conn, 'rollback')) {
        try { $conn->rollback(); } catch (Throwable $t) {}
    }
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create entry: ' . $e->getMessage()]);
}

$conn->close();
?>
