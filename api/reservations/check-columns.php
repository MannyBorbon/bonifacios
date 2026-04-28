<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    $conn = getConnection();
    
    // Obtener estructura de la tabla
    $result = $conn->query("DESCRIBE special_reservations");
    $columns = [];
    
    while ($row = $result->fetch_assoc()) {
        $columns[] = [
            'field' => $row['Field'],
            'type' => $row['Type'],
            'null' => $row['Null'],
            'key' => $row['Key']
        ];
    }
    
    echo json_encode([
        'success' => true,
        'columns' => $columns,
        'total' => count($columns)
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
