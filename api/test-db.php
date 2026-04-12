<?php
// Test database connection
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

define('DB_HOST', 'localhost');
define('DB_USER', 'bonifacios1');
define('DB_PASS', 'Filipenses4:8@');
define('DB_NAME', 'u979547041_bonifacios');

$result = [
    'attempting_connection' => true,
    'host' => DB_HOST,
    'user' => DB_USER,
    'database' => DB_NAME
];

try {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        $result['success'] = false;
        $result['error'] = $conn->connect_error;
        $result['error_number'] = $conn->connect_errno;
    } else {
        $result['success'] = true;
        $result['message'] = 'Connected successfully';
        
        // Try to query users table
        $query = "SELECT COUNT(*) as count FROM users";
        $queryResult = $conn->query($query);
        
        if ($queryResult) {
            $row = $queryResult->fetch_assoc();
            $result['users_table_exists'] = true;
            $result['user_count'] = $row['count'];
        } else {
            $result['users_table_exists'] = false;
            $result['table_error'] = $conn->error;
        }
        
        $conn->close();
    }
} catch (Exception $e) {
    $result['success'] = false;
    $result['exception'] = $e->getMessage();
}

echo json_encode($result, JSON_PRETTY_PRINT);
?>
