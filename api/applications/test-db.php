<?php
header('Content-Type: application/json');
$result = ['php_version' => PHP_VERSION, 'time' => date('Y-m-d H:i:s')];

try {
    require_once '../config/database.php';
    $result['db_loaded'] = true;

    $conn = getConnection();
    $result['connected'] = true;

    $check = $conn->query("SHOW COLUMNS FROM job_applications");
    $cols = [];
    while ($row = $check->fetch_assoc()) {
        $cols[] = $row['Field'];
    }
    $result['columns'] = $cols;

    $conn->close();
} catch (Throwable $e) {
    $result['error'] = $e->getMessage();
    $result['error_file'] = $e->getFile();
    $result['error_line'] = $e->getLine();
}

echo json_encode($result, JSON_PRETTY_PRINT);
