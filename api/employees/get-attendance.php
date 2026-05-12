<?php
/**
 * API para obtener asistencia de un empleado (requiere autenticación).
 * Parámetros: id, sr_id, name, start, end (fechas YYYY-MM-DD).
 */

require_once __DIR__ . '/../config/database.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método no permitido']);
    exit;
}

requireAuth();

$isYmd = static function ($s) {
    return is_string($s) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) === 1;
};

try {
    $pdo = getPDO();

    $empId = $_GET['id'] ?? null;
    $srId = $_GET['sr_id'] ?? null;
    $name = isset($_GET['name']) ? trim((string) $_GET['name']) : null;
    $startDate = $_GET['start'] ?? date('Y-m-d', strtotime('-7 days'));
    $endDate = $_GET['end'] ?? date('Y-m-d');

    if (!$isYmd($startDate) || !$isYmd($endDate)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error'   => 'Las fechas start y end deben ser YYYY-MM-DD',
        ]);
        exit;
    }

    if (!$empId && !$srId && ($name === null || $name === '')) {
        echo json_encode([
            'success' => false,
            'error'   => 'Se requiere id, sr_id o name del empleado',
        ]);
        exit;
    }

    $conditions = ['a.attendance_date BETWEEN ? AND ?'];
    $params = [$startDate, $endDate];

    if ($empId) {
        $conditions[] = 'a.employee_id = ?';
        $params[] = $empId;
    } elseif ($srId) {
        $conditions[] = 'a.sr_employee_id = ?';
        $params[] = $srId;
    } else {
        $conditions[] = 'a.employee_name LIKE ?';
        $params[] = '%' . $name . '%';
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
            WHERE {$whereClause}
            ORDER BY a.attendance_date DESC";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $records = $stmt->fetchAll(PDO::FETCH_ASSOC);

    $totalMinutes = 0;
    $daysPresent = 0;
    $daysLate = 0;
    $daysAbsent = 0;

    foreach ($records as $record) {
        if ($record['minutes_worked']) {
            $totalMinutes += (int) $record['minutes_worked'];
        }
        if ($record['status'] === 'present') {
            $daysPresent++;
        }
        if ($record['status'] === 'late') {
            $daysLate++;
        }
        if ($record['status'] === 'absent') {
            $daysAbsent++;
        }
    }

    echo json_encode([
        'success' => true,
        'data'    => $records,
        'summary' => [
            'total_records' => count($records),
            'days_present'  => $daysPresent,
            'days_late'     => $daysLate,
            'days_absent'   => $daysAbsent,
            'total_hours'   => round($totalMinutes / 60, 2),
            'start_date'    => $startDate,
            'end_date'      => $endDate,
        ],
    ]);
} catch (Throwable $e) {
    error_log('get-attendance.php: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error'   => 'Error interno',
    ]);
}
