<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: text/plain');

echo "=== PHP Environment Test ===\n\n";
echo "PHP Version: " . phpversion() . "\n";
echo "Current Time: " . date('Y-m-d H:i:s') . "\n";
echo "Script Path: " . __FILE__ . "\n\n";

echo "=== Testing Database Connection ===\n";
try {
    require_once __DIR__ . '/config/database.php';
    echo "✓ Database config loaded\n";
    
    $conn = getConnection();
    echo "✓ Connection established\n";
    
    $result = $conn->query("SELECT COUNT(*) as cnt FROM job_applications");
    $count = $result->fetch_assoc()['cnt'];
    echo "✓ job_applications table accessible\n";
    echo "  Total applications: $count\n\n";
    
    echo "=== Testing Table Structure ===\n";
    $result = $conn->query("SHOW COLUMNS FROM job_applications");
    $columns = [];
    while ($row = $result->fetch_assoc()) {
        $columns[] = $row['Field'];
    }
    echo "Columns (" . count($columns) . "): " . implode(', ', $columns) . "\n\n";
    
    echo "=== ALL TESTS PASSED ===\n";
    
} catch (Exception $e) {
    echo "✗ ERROR: " . $e->getMessage() . "\n";
    echo "File: " . $e->getFile() . "\n";
    echo "Line: " . $e->getLine() . "\n";
}
?>
