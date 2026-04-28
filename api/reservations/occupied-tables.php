<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();
    
    $date = trim((string)($_GET['date'] ?? ''));
    $eventTypeId = trim((string)($_GET['event_type_id'] ?? ''));
    $event = trim((string)($_GET['event'] ?? ''));

    try {
        $conn->query("ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion");
    } catch (Throwable $e) { /* ignore */ }
    
    $sql = "SELECT sr.id, sr.customer_name, sr.phone, sr.email, sr.guests, sr.reservation_date, sr.reservation_time, sr.table_code, sr.notes, sr.occasion, sr.event_type_id, sr.status, sr.created_at, sr.updated_at,
                   ret.name AS event_type_name, ret.slug AS event_type_slug
            FROM special_reservations sr
            LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
            WHERE sr.status IN ('pending', 'confirmed', 'uploaded')";

    $allSql = "SELECT sr.id, sr.customer_name, sr.phone, sr.email, sr.guests, sr.reservation_date, sr.reservation_time, sr.table_code, sr.notes, sr.occasion, sr.event_type_id, sr.status, sr.created_at, sr.updated_at,
                      ret.name AS event_type_name, ret.slug AS event_type_slug
               FROM special_reservations sr
               LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
               WHERE 1=1";

    $types = '';
    $params = [];
    if ($date !== '') {
        $sql .= " AND sr.reservation_date = ?";
        $allSql .= " AND sr.reservation_date = ?";
        $types .= 's';
        $params[] = $date;
    }
    if ($eventTypeId !== '') {
        $sql .= " AND sr.event_type_id = ?";
        $allSql .= " AND sr.event_type_id = ?";
        $types .= 'i';
        $params[] = intval($eventTypeId);
    } elseif ($event === 'mothers_day') {
        $sql .= " AND (sr.occasion = 'Dia de las Madres' OR ret.slug = 'dia-madres')";
        $allSql .= " AND (sr.occasion = 'Dia de las Madres' OR ret.slug = 'dia-madres')";
    }

    $sql .= " ORDER BY sr.reservation_date ASC, sr.reservation_time ASC";
    $allSql .= " ORDER BY sr.reservation_date ASC, sr.reservation_time ASC";
    
    $stmt = $conn->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();
    $occupiedTables = [];
    
    if ($result) {
        while ($row = $result->fetch_assoc()) {
            $occupiedTables[] = $row;
        }
    }

    // Ejecutar consulta adicional para ver todas las reservaciones
    $allStmt = $conn->prepare($allSql);
    if ($types !== '') {
        $allStmt->bind_param($types, ...$params);
    }
    $allStmt->execute();
    $allResult = $allStmt->get_result();
    $allReservations = [];
    
    if ($allResult) {
        while ($row = $allResult->fetch_assoc()) {
            $allReservations[] = $row;
        }
    }
    
    // Debug: Agregar información adicional
    $debugInfo = [
        'query_date' => $date,
        'query_event_type_id' => $eventTypeId,
        'sql_query' => $sql,
        'filtered_results_count' => count($occupiedTables),
        'filtered_results' => $occupiedTables,
        'all_reservations_count' => count($allReservations),
        'all_reservations' => $allReservations,
        'status_breakdown' => array_count_values(array_column($allReservations, 'status'))
    ];

    // Calcular conteos por status
    $activeCount = count($occupiedTables);
    $cancelledCount = count(array_filter($allReservations, fn($r) => $r['status'] === 'cancelled'));
    $completedCount = count(array_filter($allReservations, fn($r) => $r['status'] === 'completed'));
    $totalCount = count($allReservations);

    echo json_encode([
        'success' => true,
        'occupied' => $occupiedTables,
        'total' => $totalCount,
        'active' => $activeCount,
        'cancelled' => $cancelledCount,
        'completed' => $completedCount,
        'debug' => $debugInfo
    ]);
    
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
