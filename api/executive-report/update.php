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

if (!$data) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON data']);
    exit();
}

if (!isset($data['id']) || !isset($data['field']) || !isset($data['value'])) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Missing required parameters',
        'received' => $data
    ]);
    exit();
}

$id = intval($data['id']);
$field = $data['field'];
$value = $data['value'];

// Map frontend field names to employee_files column names
$fieldMapping = [
    'start_date' => 'hire_date',
    'estudios' => 'studies'
];

// Apply mapping if exists
$dbField = isset($fieldMapping[$field]) ? $fieldMapping[$field] : $field;

$allowedFields = [
    'main_amount', 'secondary_amount', 'start_date', 'application_date',
    'name', 'position', 'email', 'phone', 'age', 'gender', 
    'address', 'studies', 'estudios', 'experience', 'current_job', 'status', 'hire_date', 'emergency_contact',
    'employee_number', 'estado_civil', 'idiomas', 'accesos', 'sueldo', 'prestaciones', 'tipo_sangre', 'alergias', 'enfermedades'
];

if (!in_array($field, $allowedFields)) {
    http_response_code(400);
    echo json_encode([
        'error' => 'Invalid field',
        'field' => $field,
        'allowed' => $allowedFields
    ]);
    exit();
}

// Update employee_files for most fields, executive_report for amounts
if ($field === 'main_amount' || $field === 'secondary_amount') {
    // Get employee name first
    $nameSql = "SELECT name FROM employee_files WHERE id = ?";
    $nameStmt = $conn->prepare($nameSql);
    $nameStmt->bind_param("i", $id);
    $nameStmt->execute();
    $nameResult = $nameStmt->get_result();
    $employee = $nameResult->fetch_assoc();
    
    if ($employee) {
        // Update or insert into executive_report
        $updateSql = "INSERT INTO executive_report (name, {$field}) 
                      VALUES (?, ?) 
                      ON DUPLICATE KEY UPDATE {$field} = ?";
        $updateStmt = $conn->prepare($updateSql);
        $updateStmt->bind_param("sss", $employee['name'], $value, $value);
        $updateStmt->execute();
    }
} else {
    // Update employee_files
    $sql = "UPDATE employee_files SET {$dbField} = ? WHERE id = ?";
    $stmt = $conn->prepare($sql);
    
    // Determine type based on field
    $intFields = ['age', 'experience'];
    $dateFields = ['hire_date', 'start_date', 'application_date'];
    
    // Handle dates specially
    if (in_array($field, $dateFields)) {
        if (empty($value) || $value === '' || $value === 'null') {
            $value = null;
        } else {
            $date = DateTime::createFromFormat('Y-m-d', $value);
            if (!$date || $date->format('Y-m-d') !== $value) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Invalid date format. Use YYYY-MM-DD',
                    'field' => $field,
                    'value' => $value
                ]);
                exit();
            }
        }
        $stmt->bind_param("si", $value, $id);
    } elseif (in_array($field, $intFields)) {
        $value = intval($value);
        $stmt->bind_param("ii", $value, $id);
    } else {
        $stmt->bind_param("si", $value, $id);
    }
    
    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode([
            'error' => 'Failed to update employee',
            'sql_error' => $stmt->error,
            'field' => $field,
            'value' => $value
        ]);
        exit();
    }

    // Also sync to executive_report if employee exists there
    // These are the REAL columns in executive_report table (verified from documentacion.md)
    $execFields = ['name', 'email', 'phone', 'age', 'gender', 'address', 'estudios', 'experience', 'current_job', 'photo', 'status', 'hire_date', 'notes', 'start_date', 'application_date'];
    // Map employee_files column names to executive_report column names
    $execFieldMap = [
        'studies' => 'estudios'
    ];
    $execColumn = isset($execFieldMap[$dbField]) ? $execFieldMap[$dbField] : $field;
    
    if (in_array($field, $execFields) || in_array($dbField, $execFields)) {
        $nameSql = "SELECT name FROM employee_files WHERE id = ?";
        $nameStmt = $conn->prepare($nameSql);
        $nameStmt->bind_param("i", $id);
        $nameStmt->execute();
        $nameResult = $nameStmt->get_result();
        $emp = $nameResult->fetch_assoc();
        
        if ($emp) {
            $checkSql = "SELECT id FROM executive_report WHERE name = ?";
            $checkStmt = $conn->prepare($checkSql);
            $checkStmt->bind_param("s", $emp['name']);
            $checkStmt->execute();
            $checkResult = $checkStmt->get_result();
            
            if ($checkResult->num_rows > 0) {
                $syncSql = "UPDATE executive_report SET {$execColumn} = ? WHERE name = ?";
                $syncStmt = $conn->prepare($syncSql);
                $syncStmt->bind_param("ss", $value, $emp['name']);
                $syncStmt->execute();
            }
        }
    }
}

echo json_encode([
    'success' => true,
    'message' => 'Empleado actualizado exitosamente'
]);

$conn->close();
?>
