<?php
/**
 * API simplificada para obtener asistencia de un empleado específico
 * Parámetros: id, sr_id, name, start, end
 */

require_once __DIR__ . '/../config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Access-Control-Allow-Credentials: true');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { 
    http_response_code(200);
    exit(0); 
}

try {
    $pdo = getPDO();
    
    $empId = $_GET['id'] ?? null;
    $srId = $_GET['sr_id'] ?? null;
    $name = $_GET['name'] ?? null;
    $startDate = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
    $endDate = $_GET['end'] ?? date('Y-m-d');

    if (!$empId && !$srId && !$name) {
        echo json_encode([
            'success' => false,
            'error' => 'Se requiere id, sr_id o name del empleado'
        ]);
        exit;
    }

    // Construir query dinámicamente
    $conditions = ["a.attendance_date BETWEEN ? AND ?"];
    $params = [$startDate, $endDate];

    if ($empId) {
        $conditions[] = "a.employee_id = ?";
        $params[] = $empId;
    } elseif ($srId) {
        $conditions[] = "a.sr_employee_id = ?";
        $params[] = $srId;
    } elseif ($name) {
        $conditions[] = "a.employee_name LIKE ?";
        $params[] = "%$name%";
    }

    $whereClause = implode(' AND ', $conditions);

    $sql = "SELECT 
                a.id,
                a.employee_id,
                a.sr_employee_id,
                a.employee_name,
                a.position,
                a.attendance_date as date,
                a.clock_in,
                a.clock_out,
                a.shift,
                a.status,
                a.minutes_worked,
                a.notes,
                a.created_at
            FROM sr_attendance a
            WHERE $whereClause
            ORDER BY a.attendance_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Calcular estadísticas
    $totalMinutes = 0;
    $daysPresent = 0;
    $daysLate = 0;
    $daysAbsent = 0;

    foreach ($records as $record) {
        if ($record['minutes_worked']) {
            $totalMinutes += $record['minutes_worked'];
        }
        if ($record['status'] === 'present') $daysPresent++;
        if ($record['status'] === 'late') $daysLate++;
        if ($record['status'] === 'absent') $daysAbsent++;
    }

    echo json_encode([
        'success' => true,
        'data' => $records,
        'summary' => [
            'total_records' => count($records),
            'days_present' => $daysPresent,
            'days_late' => $daysLate,
            'days_absent' => $daysAbsent,
            'total_hours' => round($totalMinutes / 60, 2),
            'start_date' => $startDate,
            'end_date' => $endDate
        ]
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ]);
}
