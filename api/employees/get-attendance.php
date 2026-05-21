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

    $empId = trim((string) ($_GET['id'] ?? ''));
    $srId = trim((string) ($_GET['sr_id'] ?? ''));
    $name = isset($_GET['name']) ? trim((string) $_GET['name']) : '';
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

    if ($empId === '' && $srId === '' && $name === '') {
        echo json_encode([
            'success' => false,
            'error'   => 'Se requiere id, sr_id o name del empleado',
        ]);
        exit;
    }

    $conditions = ['a.attendance_date BETWEEN ? AND ?'];
    $params = [$startDate, $endDate];

    if ($srId !== '') {
        $conditions[] = '(a.employee_id = ? OR a.sr_employee_id = ?)';
        $params[] = $srId;
        $params[] = $srId;
    } elseif ($empId !== '') {
        $conditions[] = '(a.employee_id = ? OR a.sr_employee_id = ?)';
        $params[] = $empId;
        $params[] = $empId;
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

    $pdo->exec("CREATE TABLE IF NOT EXISTS employee_schedule_overrides (
        id INT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(50) NOT NULL,
        employee_name VARCHAR(255) NULL,
        schedule_date DATE NOT NULL,
        week_start_date DATE NULL,
        day_of_week TINYINT NOT NULL,
        scheduled_start TIME NOT NULL DEFAULT '00:00:00',
        scheduled_end TIME NOT NULL DEFAULT '00:00:00',
        is_day_off TINYINT(1) NOT NULL DEFAULT 0,
        day_type ENUM('laboral','descanso','enfermedad','vacaciones','falta','incapacidad','permiso') DEFAULT 'laboral',
        source ENUM('weekly_template','manual_override') DEFAULT 'weekly_template',
        created_by VARCHAR(100) NULL,
        created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_employee_date (employee_id, schedule_date),
        KEY idx_schedule_date (schedule_date),
        KEY idx_employee_day (employee_id, day_of_week)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $candidateIds = [];
    $candidateNames = [];

    if ($srId !== '') {
        $candidateIds[] = $srId;
    }
    if ($empId !== '') {
        $candidateIds[] = $empId;
    }
    if ($name !== '') {
        $candidateNames[] = $name;
    }

    foreach ($records as $record) {
        $recordEmployeeId = trim((string) ($record['employee_id'] ?? ''));
        $recordSrEmployeeId = trim((string) ($record['sr_employee_id'] ?? ''));
        $recordEmployeeName = trim((string) ($record['employee_name'] ?? ''));

        if ($recordEmployeeId !== '') {
            $candidateIds[] = $recordEmployeeId;
        }
        if ($recordSrEmployeeId !== '') {
            $candidateIds[] = $recordSrEmployeeId;
        }
        if ($recordEmployeeName !== '') {
            $candidateNames[] = $recordEmployeeName;
        }
    }

    $candidateIds = array_values(array_unique(array_filter($candidateIds, static function ($value) {
        return $value !== '';
    })));

    $normalizedNames = [];
    foreach ($candidateNames as $candidateName) {
        $normalized = trim((string) $candidateName);
        if (function_exists('mb_strtoupper')) {
            $normalized = mb_strtoupper($normalized, 'UTF-8');
        } else {
            $normalized = strtoupper($normalized);
        }
        if ($normalized === '') {
            continue;
        }
        $normalizedNames[$normalized] = trim((string) $candidateName);
    }
    $candidateNames = array_values($normalizedNames);

    $scheduleFilters = [];
    $scheduleParams = [];

    if (count($candidateIds) > 0) {
        $scheduleFilters[] = 'employee_id IN (' . implode(',', array_fill(0, count($candidateIds), '?')) . ')';
        $scheduleParams = array_merge($scheduleParams, $candidateIds);
    }
    if (count($candidateNames) > 0) {
        $nameFilters = [];
        foreach ($candidateNames as $candidateName) {
            $nameFilters[] = 'UPPER(TRIM(employee_name)) = UPPER(TRIM(?))';
            $scheduleParams[] = $candidateName;
        }
        $scheduleFilters[] = '(' . implode(' OR ', $nameFilters) . ')';
    }

    $scheduledMinutes = 0;
    $scheduledDays = 0;

    if (count($scheduleFilters) > 0) {
        $scheduleWhere = '(' . implode(' OR ', $scheduleFilters) . ')';

        $overrideSql = "SELECT employee_id, employee_name, schedule_date, day_of_week, scheduled_start, scheduled_end, is_day_off, COALESCE(day_type, 'laboral') AS day_type
            FROM employee_schedule_overrides
            WHERE schedule_date BETWEEN ? AND ?
              AND {$scheduleWhere}
            ORDER BY schedule_date ASC, employee_id ASC";
        $overrideStmt = $pdo->prepare($overrideSql);
        $overrideStmt->execute(array_merge([$startDate, $endDate], $scheduleParams));
        $overrideRows = $overrideStmt->fetchAll(PDO::FETCH_ASSOC);

        $templateSql = "SELECT employee_id, employee_name, day_of_week, scheduled_start, scheduled_end, is_day_off, COALESCE(day_type, 'laboral') AS day_type
            FROM employee_schedules
            WHERE {$scheduleWhere}
            ORDER BY employee_id ASC, day_of_week ASC";
        $templateStmt = $pdo->prepare($templateSql);
        $templateStmt->execute($scheduleParams);
        $templateRows = $templateStmt->fetchAll(PDO::FETCH_ASSOC);

        $overrideMap = [];
        foreach ($overrideRows as $row) {
            $dateKey = (string) ($row['schedule_date'] ?? '');
            if ($dateKey === '' || isset($overrideMap[$dateKey])) {
                continue;
            }
            $overrideMap[$dateKey] = $row;
        }

        $templateMap = [];
        foreach ($templateRows as $row) {
            $dayIndex = (int) ($row['day_of_week'] ?? -1);
            if ($dayIndex < 0 || $dayIndex > 6 || isset($templateMap[$dayIndex])) {
                continue;
            }
            $templateMap[$dayIndex] = $row;
        }

        $payrollDayMap = [2, 3, 4, 5, 6, 0, 1];

        for ($cursor = strtotime($startDate); $cursor <= strtotime($endDate); $cursor += 86400) {
            $dateKey = date('Y-m-d', $cursor);
            $jsDay = (int) date('w', $cursor);
            $payrollDayIndex = $payrollDayMap[$jsDay] ?? 0;
            $schedule = $overrideMap[$dateKey] ?? ($templateMap[$payrollDayIndex] ?? null);

            if (!$schedule) {
                continue;
            }

            $dayType = strtolower(trim((string) ($schedule['day_type'] ?? 'laboral')));
            $isDayOff = (int) ($schedule['is_day_off'] ?? 0) === 1;
            $scheduledStart = substr((string) ($schedule['scheduled_start'] ?? ''), 0, 8);
            $scheduledEnd = substr((string) ($schedule['scheduled_end'] ?? ''), 0, 8);
            $hasWindow = $scheduledStart !== '' && $scheduledStart !== '00:00:00' && $scheduledEnd !== '' && $scheduledEnd !== '00:00:00';

            if ($dayType !== 'laboral' || $isDayOff || !$hasWindow) {
                continue;
            }

            $startTs = strtotime($dateKey . ' ' . $scheduledStart);
            $endTs = strtotime($dateKey . ' ' . $scheduledEnd);
            if ($startTs === false || $endTs === false) {
                continue;
            }
            if ($endTs <= $startTs) {
                $endTs = strtotime($dateKey . ' ' . $scheduledEnd . ' +1 day');
            }
            if ($endTs === false || $endTs <= $startTs) {
                continue;
            }

            $scheduledMinutes += (int) round(($endTs - $startTs) / 60);
            $scheduledDays++;
        }
    }

    $workedHours = round($totalMinutes / 60, 2);
    $scheduledHours = round($scheduledMinutes / 60, 2);

    echo json_encode([
        'success' => true,
        'data'    => $records,
        'summary' => [
            'total_records' => count($records),
            'days_present'  => $daysPresent,
            'days_late'     => $daysLate,
            'days_absent'   => $daysAbsent,
            'total_hours'   => $workedHours,
            'worked_hours'  => $workedHours,
            'scheduled_hours' => $scheduledHours,
            'scheduled_days' => $scheduledDays,
            'hours_balance' => round($workedHours - $scheduledHours, 2),
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
