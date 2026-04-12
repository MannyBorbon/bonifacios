<?php
// Test script to diagnose submit.php errors
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

echo json_encode([
    'step' => 'Starting test',
    'php_version' => phpversion(),
    'time' => date('Y-m-d H:i:s')
]) . "\n\n";

try {
    echo "Loading database config...\n";
    require_once '../config/database.php';
    echo "Database config loaded\n";
    
    echo "Getting connection...\n";
    $conn = getConnection();
    echo "Connection established\n";
    
    echo "Testing table structure...\n";
    $result = $conn->query("SHOW COLUMNS FROM job_applications");
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row['Field'];
    }
    echo "Columns: " . implode(', ', $columns) . "\n";
    
    echo "Testing INSERT with minimal data...\n";
    $sql = "INSERT INTO job_applications 
            (name, phone, position, experience, status, created_at) 
            VALUES (?, ?, ?, ?, ?, NOW())";
    
    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $testName = "Test User";
    $testPhone = "1234567890";
    $testPosition = "Test Position";
    $testExp = 1;
    $testStatus = "Pendiente";
    
    $stmt->bind_param("sssis", $testName, $testPhone, $testPosition, $testExp, $testStatus);
    
    if ($stmt->execute()) {
        $id = $stmt->insert_id;
        echo "SUCCESS! Insert ID: $id\n";
        
        // Clean up test data
        $conn->query("DELETE FROM job_applications WHERE id = $id");
        echo "Test data cleaned up\n";
    } else {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    echo "\n✅ All tests passed!\n";
    
} catch (Exception $e) {
    echo "\n❌ ERROR: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}
?>
