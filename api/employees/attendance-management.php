<?php
/**
 * API para Gestión de Asistencia de Empleados
 * - GET: Obtener asistencia con horarios, nómina, notas
 * - POST: Editar horarios, nómina, notas, horas de entrada/salida
 */

require_once __DIR__ . '/../config/database.php';
session_start();

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { exit(0); }

$pdo = getPDO();
$method = $_SERVER['REQUEST_METHOD'];

// ─── GET: Obtener datos de asistencia ───
if ($method === 'GET') {
    $action = $_GET['action'] ?? 'attendance';
    $date = $_GET['date'] ?? date('Y-m-d');
    $range = $_GET['range'] ?? 'today';
    $employeeId = $_GET['employee_id'] ?? null;
    $allowFallback = ($_GET['fallback'] ?? '0') === '1';

    // Calcular rango de fechas
    switch ($range) {
        case 'today':
            $startDate = $date;
            $endDate = $date;
            break;
        case 'yesterday':
            $startDate = date('Y-m-d', strtotime($date . ' -1 day'));
            $endDate = $startDate;
            break;
        case 'week':
            $startDate = date('Y-m-d', strtotime($date . ' -6 days'));
            $endDate = $date;
            break;
        case 'month':
            $startDate = date('Y-m-01', strtotime($date));
            $endDate = date('Y-m-t', strtotime($date));
            break;
        default:
            $startDate = $date;
            $endDate = $date;
    }

    try {
        switch ($action) {
            case 'expected_absences':
                $targetDate = $_GET['date'] ?? date('Y-m-d');
                $dayOfWeek = (int)date('N', strtotime($targetDate)) - 1; // 0=Lunes ... 6=Domingo
                if ($dayOfWeek < 0 || $dayOfWeek > 6) {
                    $dayOfWeek = 0;
                }

                // Ensure overrides table exists for date-level scheduling.
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

                // Prefer date override; fallback to weekly template.
                $sql = "SELECT
                            base.employee_id,
                            base.employee_name,
                            base.day_type,
                            base.is_day_off,
                            base.scheduled_start,
                            base.scheduled_end,
                            a.clock_in,
                            a.clock_out,
                            a.status,
                            ef.id AS website_employee_id,
                            ef.name AS website_employee_name
                        FROM (
                            SELECT
                                s.employee_id,
                                s.employee_name,
                                s.day_type,
                                s.is_day_off,
                                s.scheduled_start,
                                s.scheduled_end
                            FROM employee_schedules s
                            WHERE s.day_of_week = :dayOfWeek

                            UNION ALL

                            SELECT
                                o.employee_id,
                                o.employee_name,
                                o.day_type,
                                o.is_day_off,
                                o.scheduled_start,
                                o.scheduled_end
                            FROM employee_schedule_overrides o
                            WHERE o.schedule_date = :targetDate
                        ) base
                        LEFT JOIN sr_attendance a
                            ON a.employee_id = base.employee_id
                            AND a.attendance_date = :targetDate
                        LEFT JOIN employee_files ef
                            ON (
                                (
                                    ef.employee_number REGEXP '^[0-9]+$'
                                    AND base.employee_id REGEXP '^[0-9]+$'
                                    AND CAST(ef.employee_number AS UNSIGNED) = CAST(base.employee_id AS UNSIGNED)
                                )
                                OR UPPER(TRIM(ef.employee_number)) = UPPER(TRIM(base.employee_id))
                                OR UPPER(TRIM(ef.name)) = UPPER(TRIM(base.employee_name))
                            )
                        GROUP BY base.employee_id, base.employee_name";

                $stmt = $pdo->prepare($sql);
                $stmt->execute([
                    ':dayOfWeek' => $dayOfWeek,
                    ':targetDate' => $targetDate,
                ]);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $missing = [];
                foreach ($rows as $row) {
                    $isLaboral = ($row['day_type'] ?? 'laboral') === 'laboral';
                    $isDayOff = (int)($row['is_day_off'] ?? 0) === 1;
                    $hasSchedule = !empty($row['scheduled_start']) && $row['scheduled_start'] !== '00:00:00';
                    $clockedIn = !empty($row['clock_in']);
                    if ($isLaboral && !$isDayOff && $hasSchedule && !$clockedIn) {
                        $missing[] = [
                            'employee_id' => $row['employee_id'],
                            'employee_name' => $row['website_employee_name'] ?: $row['employee_name'],
                            'scheduled_start' => $row['scheduled_start'],
                            'scheduled_end' => $row['scheduled_end'],
                            'day_type' => $row['day_type'] ?? 'laboral',
                        ];
                    }
                }

                echo json_encode([
                    'success' => true,
                    'date' => $targetDate,
                    'scheduled_count' => count($rows),
                    'missing_count' => count($missing),
                    'missing' => $missing,
                ]);
                break;

            case 'schedule_report':
                $weekStart = $_GET['week_start'] ?? date('Y-m-d');
                $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));

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

                $sql = "SELECT
                            o.schedule_date,
                            o.employee_id,
                            o.employee_name,
                            o.day_of_week,
                            o.day_type,
                            o.is_day_off,
                            o.scheduled_start,
                            o.scheduled_end,
                            a.clock_in,
                            a.clock_out
                        FROM employee_schedule_overrides o
                        LEFT JOIN sr_attendance a
                            ON a.employee_id = o.employee_id
                            AND a.attendance_date = o.schedule_date
                        WHERE o.schedule_date BETWEEN ? AND ?
                        ORDER BY o.schedule_date ASC, o.employee_name ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$weekStart, $weekEnd]);
                $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $summary = [
                    'total_rows' => count($rows),
                    'laboral' => 0,
                    'descanso' => 0,
                    'enfermedad' => 0,
                    'scheduled_missing_clock_in' => 0,
                ];
                foreach ($rows as $r) {
                    $dayType = $r['day_type'] ?? 'laboral';
                    if ($dayType === 'enfermedad') $summary['enfermedad']++;
                    elseif ($dayType === 'descanso') $summary['descanso']++;
                    else $summary['laboral']++;

                    $hasSchedule = !empty($r['scheduled_start']) && $r['scheduled_start'] !== '00:00:00';
                    if ($dayType === 'laboral' && (int)$r['is_day_off'] !== 1 && $hasSchedule && empty($r['clock_in'])) {
                        $summary['scheduled_missing_clock_in']++;
                    }
                }

                echo json_encode([
                    'success' => true,
                    'week_start' => $weekStart,
                    'week_end' => $weekEnd,
                    'summary' => $summary,
                    'rows' => $rows,
                ]);
                break;

            case 'employee_period_report':
                $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-6 days'));
                $endDate = $_GET['end_date'] ?? date('Y-m-d');
                $employeeIdsRaw = trim($_GET['employee_ids'] ?? '');
                $employeeIds = array_values(array_filter(array_map('trim', explode(',', $employeeIdsRaw))));

                if (strtotime($startDate) === false || strtotime($endDate) === false) {
                    echo json_encode(['success' => false, 'error' => 'Rango de fechas inválido']);
                    break;
                }
                if ($startDate > $endDate) {
                    [$startDate, $endDate] = [$endDate, $startDate];
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

                $params = [];
                $employeeFilterSql = '';
                if (count($employeeIds) > 0) {
                    $placeholders = implode(',', array_fill(0, count($employeeIds), '?'));
                    $employeeFilterSql = " WHERE (ef.employee_number IN ($placeholders) OR CAST(ef.id AS CHAR) IN ($placeholders)) ";
                    $params = array_merge($params, $employeeIds, $employeeIds);
                }

                $empSql = "SELECT
                            ef.id,
                            ef.name,
                            ef.employee_number,
                            ef.position,
                            ef.status,
                            COALESCE(ef.daily_salary, 0) AS daily_salary
                        FROM employee_files ef
                        $employeeFilterSql
                        ORDER BY ef.name ASC";
                $empStmt = $pdo->prepare($empSql);
                $empStmt->execute($params);
                $employees = $empStmt->fetchAll(PDO::FETCH_ASSOC);

                $attendanceStmt = $pdo->prepare("SELECT employee_id, employee_name, attendance_date, clock_in, clock_out, minutes_worked, status
                    FROM sr_attendance
                    WHERE attendance_date BETWEEN ? AND ?");
                $attendanceStmt->execute([$startDate, $endDate]);
                $attendanceRows = $attendanceStmt->fetchAll(PDO::FETCH_ASSOC);
                $attendanceByEmpDate = [];
                foreach ($attendanceRows as $row) {
                    $empKey = strtoupper(trim((string)($row['employee_id'] ?? '')));
                    $dateKey = (string)($row['attendance_date'] ?? '');
                    if ($empKey === '' || $dateKey === '') continue;
                    $attendanceByEmpDate[$empKey . '|' . $dateKey] = $row;
                }

                $tplStmt = $pdo->query("SELECT employee_id, day_of_week, scheduled_start, scheduled_end, is_day_off, COALESCE(day_type, 'laboral') AS day_type
                    FROM employee_schedules");
                $templates = $tplStmt->fetchAll(PDO::FETCH_ASSOC);
                $templateMap = [];
                foreach ($templates as $t) {
                    $empKey = strtoupper(trim((string)($t['employee_id'] ?? '')));
                    $dayIdx = (int)($t['day_of_week'] ?? 0);
                    $templateMap[$empKey . '|' . $dayIdx] = $t;
                }

                $ovStmt = $pdo->prepare("SELECT employee_id, schedule_date, day_of_week, scheduled_start, scheduled_end, is_day_off, COALESCE(day_type, 'laboral') AS day_type
                    FROM employee_schedule_overrides
                    WHERE schedule_date BETWEEN ? AND ?");
                $ovStmt->execute([$startDate, $endDate]);
                $overrides = $ovStmt->fetchAll(PDO::FETCH_ASSOC);
                $overrideMap = [];
                foreach ($overrides as $o) {
                    $empKey = strtoupper(trim((string)($o['employee_id'] ?? '')));
                    $dateKey = (string)($o['schedule_date'] ?? '');
                    $overrideMap[$empKey . '|' . $dateKey] = $o;
                }

                $periodDays = max(1, (int)floor((strtotime($endDate) - strtotime($startDate)) / 86400) + 1);
                $periodWeeks = max(1, $periodDays / 7);
                $reportRows = [];

                foreach ($employees as $emp) {
                    $empIdRaw = (string)($emp['employee_number'] ?: $emp['id']);
                    $empKey = strtoupper(trim($empIdRaw));
                    $dailySalary = (float)($emp['daily_salary'] ?? 0);
                    $status = strtolower(trim((string)($emp['status'] ?? 'active')));

                    $faltas = 0;
                    $ausencias = 0;
                    $enfermedades = 0;
                    $vacaciones = 0;
                    $scheduledDays = 0;
                    $hoursScheduled = 0.0;
                    $hoursWorked = 0.0;
                    $unexpectedPresent = 0;

                    for ($dateTs = strtotime($startDate); $dateTs <= strtotime($endDate); $dateTs += 86400) {
                        $dateKey = date('Y-m-d', $dateTs);
                        $dayIdx = ((int)date('N', $dateTs)) - 1; // 0=lunes

                        $schedule = $overrideMap[$empKey . '|' . $dateKey] ?? $templateMap[$empKey . '|' . $dayIdx] ?? null;
                        $dayType = $schedule['day_type'] ?? 'descanso';
                        $isDayOff = (int)($schedule['is_day_off'] ?? 1) === 1;
                        $start = (string)($schedule['scheduled_start'] ?? '00:00:00');
                        $end = (string)($schedule['scheduled_end'] ?? '00:00:00');
                        $hasScheduleWindow = $start !== '00:00:00' && $end !== '00:00:00';

                        if ($dayType === 'enfermedad') {
                            $enfermedades++;
                        }
                        if ($status === 'vacations') {
                            $vacaciones++;
                        }

                        if ($dayType === 'laboral' && !$isDayOff && $hasScheduleWindow) {
                            $scheduledDays++;
                            $startTs = strtotime($dateKey . ' ' . $start);
                            $endTs = strtotime($dateKey . ' ' . $end);
                            if ($endTs > $startTs) {
                                $hoursScheduled += ($endTs - $startTs) / 3600;
                            }
                        }

                        $att = $attendanceByEmpDate[$empKey . '|' . $dateKey] ?? null;
                        if ($att && !empty($att['minutes_worked'])) {
                            $hoursWorked += ((float)$att['minutes_worked']) / 60;
                        }

                        if ($dayType === 'laboral' && !$isDayOff && $hasScheduleWindow) {
                            $clockedIn = !empty($att['clock_in']);
                            $statusAbsent = strtolower((string)($att['status'] ?? '')) === 'absent';
                            if (!$clockedIn || $statusAbsent) {
                                $faltas++;
                                $ausencias++;
                            }
                        } else {
                            if ($att && !empty($att['clock_in'])) {
                                $unexpectedPresent++;
                            }
                        }
                    }

                    $payrollPeriod = round($dailySalary * $scheduledDays, 2);
                    $payrollWeekly = round($payrollPeriod / $periodWeeks, 2);

                    $reportRows[] = [
                        'employee_id' => $empIdRaw,
                        'employee_name' => $emp['name'],
                        'position' => $emp['position'],
                        'status' => $emp['status'],
                        'period_start' => $startDate,
                        'period_end' => $endDate,
                        'faltas' => $faltas,
                        'ausencias' => $ausencias,
                        'enfermedades' => $enfermedades,
                        'vacaciones' => $vacaciones,
                        'scheduled_days' => $scheduledDays,
                        'hours_scheduled' => round($hoursScheduled, 2),
                        'hours_worked' => round($hoursWorked, 2),
                        'hours_balance' => round($hoursWorked - $hoursScheduled, 2),
                        'unexpected_present' => $unexpectedPresent,
                        'daily_salary' => round($dailySalary, 2),
                        'payroll_period' => $payrollPeriod,
                        'payroll_weekly' => $payrollWeekly,
                    ];
                }

                $summary = [
                    'employees' => count($reportRows),
                    'total_faltas' => array_sum(array_column($reportRows, 'faltas')),
                    'total_ausencias' => array_sum(array_column($reportRows, 'ausencias')),
                    'total_enfermedades' => array_sum(array_column($reportRows, 'enfermedades')),
                    'total_vacaciones' => array_sum(array_column($reportRows, 'vacaciones')),
                    'total_unexpected_present' => array_sum(array_column($reportRows, 'unexpected_present')),
                    'total_hours_scheduled' => round(array_sum(array_column($reportRows, 'hours_scheduled')), 2),
                    'total_hours_worked' => round(array_sum(array_column($reportRows, 'hours_worked')), 2),
                    'total_payroll_period' => round(array_sum(array_column($reportRows, 'payroll_period')), 2),
                    'total_payroll_weekly' => round(array_sum(array_column($reportRows, 'payroll_weekly')), 2),
                ];

                echo json_encode([
                    'success' => true,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'summary' => $summary,
                    'rows' => $reportRows,
                ]);
                break;

            case 'employee_performance_report':
                $startDate = $_GET['start_date'] ?? date('Y-m-d', strtotime('-30 days'));
                $endDate = $_GET['end_date'] ?? date('Y-m-d');
                if (strtotime($startDate) === false || strtotime($endDate) === false) {
                    echo json_encode(['success' => false, 'error' => 'Rango de fechas inválido']);
                    break;
                }
                if ($startDate > $endDate) {
                    [$startDate, $endDate] = [$endDate, $startDate];
                }
                $startDateTime = $startDate . ' 00:00:00';
                $endDateTime = $endDate . ' 23:59:59';
                $employeeIdsRaw = trim($_GET['employee_ids'] ?? '');
                $employeeIds = array_values(array_filter(array_map('trim', explode(',', $employeeIdsRaw))));

                $idFilterSql = '';
                $idParams = [];
                if (count($employeeIds) > 0) {
                    $idPlaceholders = implode(',', array_fill(0, count($employeeIds), '?'));
                    $idFilterSql = " AND (ef.employee_number IN ($idPlaceholders) OR CAST(ef.id AS CHAR) IN ($idPlaceholders)) ";
                    $idParams = array_merge($employeeIds, $employeeIds);
                }

                $staffSql = "SELECT
                                s.waiter_name,
                                COALESCE(ef.name, s.waiter_name) AS employee_name,
                                COALESCE(ef.position, 'Sin puesto') AS position,
                                COUNT(*) AS checks,
                                COALESCE(SUM(s.total), 0) AS total_sales,
                                COALESCE(AVG(s.total), 0) AS avg_ticket,
                                COALESCE(SUM(s.tip), 0) AS tips,
                                COALESCE(SUM(s.covers), 0) AS covers
                            FROM sr_sales s
                            LEFT JOIN employee_files ef ON UPPER(TRIM(ef.name)) = UPPER(TRIM(s.waiter_name))
                            WHERE s.sale_datetime BETWEEN ? AND ?
                              AND LOWER(COALESCE(s.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                              AND s.waiter_name IS NOT NULL
                              AND TRIM(s.waiter_name) != ''
                              $idFilterSql
                            GROUP BY s.waiter_name, employee_name, position
                            ORDER BY total_sales DESC";
                $staffStmt = $pdo->prepare($staffSql);
                $staffStmt->execute(array_merge([$startDateTime, $endDateTime], $idParams));
                $staffRows = $staffStmt->fetchAll(PDO::FETCH_ASSOC);

                $normalizedStaff = array_map(function($r) {
                    return [
                        'waiter_name' => $r['waiter_name'],
                        'employee_name' => $r['employee_name'],
                        'position' => $r['position'],
                        'role_group' => preg_match('/bartender|bar/i', (string)$r['position']) ? 'bartender' : 'mesero',
                        'checks' => (int)$r['checks'],
                        'total_sales' => round((float)$r['total_sales'], 2),
                        'avg_ticket' => round((float)$r['avg_ticket'], 2),
                        'tips' => round((float)$r['tips'], 2),
                        'covers' => (int)$r['covers'],
                    ];
                }, $staffRows);

                $roleSummary = [
                    'mesero' => ['people' => 0, 'total_sales' => 0, 'checks' => 0],
                    'bartender' => ['people' => 0, 'total_sales' => 0, 'checks' => 0],
                ];
                foreach ($normalizedStaff as $s) {
                    $group = $s['role_group'];
                    if (!isset($roleSummary[$group])) continue;
                    $roleSummary[$group]['people']++;
                    $roleSummary[$group]['total_sales'] += (float)$s['total_sales'];
                    $roleSummary[$group]['checks'] += (int)$s['checks'];
                }
                $roleSummary['mesero']['total_sales'] = round($roleSummary['mesero']['total_sales'], 2);
                $roleSummary['bartender']['total_sales'] = round($roleSummary['bartender']['total_sales'], 2);

                $ticketJoinCond = "(
                    REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.sr_ticket_id AS CHAR)), '#', '')
                    OR REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.folio AS CHAR)), '#', '')
                    OR REPLACE(TRIM(CAST(si.ticket_ref AS CHAR)), '#', '') = REPLACE(TRIM(CAST(s.ticket_number AS CHAR)), '#', '')
                )";
                $itemsSource = "
                    SELECT sr_ticket_id AS ticket_ref, product_name, quantity AS qty, subtotal AS sub
                    FROM sr_sale_items
                    WHERE product_name IS NOT NULL AND product_name != ''
                    UNION ALL
                    SELECT t.folio AS ticket_ref, t.product_name, t.qty AS qty, t.subtotal AS sub
                    FROM sr_ticket_items t
                    LEFT JOIN sr_sale_items s2
                        ON s2.sr_ticket_id = t.folio
                        AND s2.product_name = t.product_name
                        AND ABS(COALESCE(s2.subtotal,0) - COALESCE(t.subtotal,0)) < 0.01
                    WHERE s2.id IS NULL
                        AND t.product_name IS NOT NULL
                        AND t.product_name != ''
                ";
                $productSql = "SELECT
                                si.product_name,
                                SUM(si.qty) AS total_qty,
                                SUM(si.sub) AS total_sales
                            FROM ($itemsSource) si
                            INNER JOIN sr_sales s ON $ticketJoinCond
                            WHERE s.sale_datetime BETWEEN ? AND ?
                              AND LOWER(COALESCE(s.status,'')) IN ('closed','cerrado','cobrado','pagado','paid')
                            GROUP BY si.product_name
                            HAVING total_qty > 0
                            ORDER BY total_qty DESC, total_sales DESC";
                $productStmt = $pdo->prepare($productSql);
                $productStmt->execute([$startDateTime, $endDateTime]);
                $products = $productStmt->fetchAll(PDO::FETCH_ASSOC);
                $topProducts = array_slice(array_map(function($r) {
                    return [
                        'product_name' => $r['product_name'],
                        'total_qty' => (float)$r['total_qty'],
                        'total_sales' => round((float)$r['total_sales'], 2),
                    ];
                }, $products), 0, 10);
                $bottomProducts = array_slice(array_reverse(array_filter(array_map(function($r) {
                    return [
                        'product_name' => $r['product_name'],
                        'total_qty' => (float)$r['total_qty'],
                        'total_sales' => round((float)$r['total_sales'], 2),
                    ];
                }, $products), function($p) {
                    return (float)$p['total_qty'] > 0;
                })), 0, 10);

                echo json_encode([
                    'success' => true,
                    'start_date' => $startDate,
                    'end_date' => $endDate,
                    'staff_performance' => $normalizedStaff,
                    'role_summary' => $roleSummary,
                    'top_products' => $topProducts,
                    'bottom_products' => $bottomProducts,
                ]);
                break;

            case 'attendance':
                // Obtener asistencia con horario programado y nómina
                $sql = "SELECT 
                            a.id, a.employee_id, a.employee_name, a.position,
                            a.attendance_date, a.clock_in, a.clock_out, 
                            a.shift, a.status, a.minutes_worked, a.notes as sr_notes,
                            p.pay_type, p.pay_rate,
                            s.scheduled_start, s.scheduled_end, s.is_day_off,
                            ef.id as website_employee_id,
                            ef.name as website_employee_name,
                            ef.position as website_position
                        FROM sr_attendance a
                        LEFT JOIN employee_payroll p ON a.employee_id = p.employee_id
                        LEFT JOIN employee_schedules s ON a.employee_id = s.employee_id 
                            AND s.day_of_week = DAYOFWEEK(a.attendance_date) - 1
                        LEFT JOIN employee_files ef ON (
                            (
                                ef.employee_number REGEXP '^[0-9]+$'
                                AND a.employee_id REGEXP '^[0-9]+$'
                                AND CAST(ef.employee_number AS UNSIGNED) = CAST(a.employee_id AS UNSIGNED)
                            )
                            OR UPPER(TRIM(ef.employee_number)) = UPPER(TRIM(a.employee_id))
                            OR UPPER(TRIM(ef.name)) = UPPER(TRIM(a.employee_name))
                            OR (
                                LENGTH(TRIM(ef.name)) > 0
                                AND UPPER(TRIM(a.employee_name)) LIKE CONCAT(UPPER(TRIM(ef.name)), '%')
                            )
                        )
                        WHERE a.attendance_date BETWEEN ? AND ?
                        ORDER BY a.attendance_date DESC, a.employee_name ASC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$startDate, $endDate]);
                $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);

                // Fallback opcional: solo si fallback=1.
                // Por defecto NO se usa para evitar mostrar "en turno" con datos de días pasados.
                if ($range === 'today' && count($attendance) === 0 && $allowFallback) {
                    $lastDateStmt = $pdo->query("SELECT MAX(attendance_date) as last_date FROM sr_attendance");
                    $lastDateRow = $lastDateStmt ? $lastDateStmt->fetch(PDO::FETCH_ASSOC) : null;
                    $lastDate = $lastDateRow['last_date'] ?? null;

                    if (!empty($lastDate)) {
                        $startDate = $lastDate;
                        $endDate = $lastDate;

                        $stmt = $pdo->prepare($sql);
                        $stmt->execute([$startDate, $endDate]);
                        $attendance = $stmt->fetchAll(PDO::FETCH_ASSOC);
                    }
                }

                // Calcular puntualidad
                foreach ($attendance as &$a) {
                    $a['display_name'] = $a['website_employee_name'] ?: $a['employee_name'];
                    $a['display_position'] = $a['website_position'] ?: $a['position'];
                    $a['on_time'] = null;
                    $a['minutes_late'] = 0;
                    if ($a['clock_in'] && $a['scheduled_start']) {
                        $clockIn = new DateTime($a['clock_in']);
                        $scheduled = new DateTime($a['attendance_date'] . ' ' . $a['scheduled_start']);
                        $diff = $clockIn->getTimestamp() - $scheduled->getTimestamp();
                        $minutesDiff = round($diff / 60);
                        $a['on_time'] = $minutesDiff <= 5; // 5 min de gracia
                        $a['minutes_late'] = max(0, $minutesDiff);
                    }
                    // Calcular pago del día
                    $a['day_pay'] = 0;
                    if ($a['pay_rate'] > 0) {
                        if ($a['pay_type'] === 'hourly' && $a['minutes_worked']) {
                            $a['day_pay'] = round(($a['minutes_worked'] / 60) * $a['pay_rate'], 2);
                        } elseif ($a['pay_type'] === 'daily') {
                            $a['day_pay'] = $a['pay_rate'];
                        } elseif ($a['pay_type'] === 'weekly') {
                            $a['day_pay'] = round($a['pay_rate'] / 6, 2); // 6 días
                        } elseif ($a['pay_type'] === 'biweekly') {
                            $a['day_pay'] = round($a['pay_rate'] / 12, 2);
                        } elseif ($a['pay_type'] === 'monthly') {
                            $a['day_pay'] = round($a['pay_rate'] / 26, 2);
                        }
                    }
                }
                unset($a);

                // Obtener notas del rango
                $notesSql = "SELECT * FROM employee_day_notes 
                             WHERE note_date BETWEEN ? AND ?
                             ORDER BY created_at DESC";
                $notesStmt = $pdo->prepare($notesSql);
                $notesStmt->execute([$startDate, $endDate]);
                $notes = $notesStmt->fetchAll(PDO::FETCH_ASSOC);

                // Agrupar notas por employee_id + date
                $notesByKey = [];
                foreach ($notes as $n) {
                    $key = $n['employee_id'] . '_' . $n['note_date'];
                    if (!isset($notesByKey[$key])) $notesByKey[$key] = [];
                    $notesByKey[$key][] = $n;
                }

                // Agregar notas a cada registro de asistencia
                foreach ($attendance as &$a) {
                    $key = $a['employee_id'] . '_' . $a['attendance_date'];
                    $a['day_notes'] = $notesByKey[$key] ?? [];
                }
                unset($a);

                // Resumen de nómina del período
                $totalPayroll = array_sum(array_column($attendance, 'day_pay'));
                $onTimeCount = count(array_filter($attendance, fn($a) => $a['on_time'] === true));
                $lateCount = count(array_filter($attendance, fn($a) => $a['on_time'] === false));

                echo json_encode([
                    'success' => true,
                    'attendance' => $attendance,
                    'summary' => [
                        'total_records' => count($attendance),
                        'on_time' => $onTimeCount,
                        'late' => $lateCount,
                        'total_payroll' => $totalPayroll
                    ],
                    'start_date' => $startDate,
                    'end_date' => $endDate
                ]);
                break;

            case 'schedules':
                $weekStart = $_GET['week_start'] ?? null;

                // Ensure day_type support exists
                try {
                    $colStmt = $pdo->query("SHOW COLUMNS FROM employee_schedules LIKE 'day_type'");
                    $hasDayType = (bool)$colStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$hasDayType) {
                        $pdo->exec("ALTER TABLE employee_schedules ADD COLUMN day_type ENUM('laboral','descanso','enfermedad','vacaciones','falta','incapacidad','permiso') DEFAULT 'laboral' AFTER is_day_off");
                    }
                } catch (Exception $e) { /* ignore */ }

                // Ensure date-level overrides table exists
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

                $sql = "SELECT * FROM employee_schedules ORDER BY employee_name, day_of_week";
                $stmt = $pdo->query($sql);
                $schedules = $stmt->fetchAll(PDO::FETCH_ASSOC);

                $overrides = [];
                if (!empty($weekStart)) {
                    $weekEnd = date('Y-m-d', strtotime($weekStart . ' +6 days'));
                    $ovStmt = $pdo->prepare("SELECT * FROM employee_schedule_overrides WHERE schedule_date BETWEEN ? AND ? ORDER BY employee_name, schedule_date");
                    $ovStmt->execute([$weekStart, $weekEnd]);
                    $overrides = $ovStmt->fetchAll(PDO::FETCH_ASSOC);
                }

                echo json_encode([
                    'success' => true,
                    'schedules' => $schedules,
                    'overrides' => $overrides,
                    'week_start' => $weekStart,
                ]);
                break;

            case 'payroll':
                $sql = "SELECT * FROM employee_payroll ORDER BY employee_name";
                $stmt = $pdo->query($sql);
                echo json_encode(['success' => true, 'payroll' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;

            case 'notes':
                $sql = "SELECT * FROM employee_day_notes WHERE employee_id = ? AND note_date = ? ORDER BY created_at DESC";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$employeeId, $date]);
                echo json_encode(['success' => true, 'notes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
                break;
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// ─── POST: Modificar datos ───
if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $action = $input['action'] ?? '';
    $user = $_SESSION['username'] ?? 'admin';

    try {
        switch ($action) {
            // ── Guardar horario de un empleado ──
            case 'save_schedule':
                $empId = $input['employee_id'];
                $empName = $input['employee_name'] ?? '';
                $schedules = $input['schedules'] ?? []; // Array de {day_of_week, start, end, is_day_off}
                $weekStart = $input['week_start'] ?? date('Y-m-d');
                $createdBy = $_SESSION['username'] ?? 'admin';

                // Ensure date-level overrides table exists
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

                // Ensure day_type support exists for richer scheduling states.
                $hasDayType = false;
                try {
                    $colStmt = $pdo->query("SHOW COLUMNS FROM employee_schedules LIKE 'day_type'");
                    $hasDayType = (bool)$colStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$hasDayType) {
                        $pdo->exec("ALTER TABLE employee_schedules ADD COLUMN day_type ENUM('laboral','descanso','enfermedad','vacaciones','falta','incapacidad','permiso') DEFAULT 'laboral' AFTER is_day_off");
                        $hasDayType = true;
                    }
                } catch (Exception $e) {
                    $hasDayType = false;
                }

                if ($hasDayType) {
                    $stmt = $pdo->prepare("INSERT INTO employee_schedules 
                        (employee_id, employee_name, day_of_week, scheduled_start, scheduled_end, is_day_off, day_type)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                            employee_name = VALUES(employee_name),
                            scheduled_start = VALUES(scheduled_start),
                            scheduled_end = VALUES(scheduled_end),
                            is_day_off = VALUES(is_day_off),
                            day_type = VALUES(day_type)");
                } else {
                    $stmt = $pdo->prepare("INSERT INTO employee_schedules 
                        (employee_id, employee_name, day_of_week, scheduled_start, scheduled_end, is_day_off)
                        VALUES (?, ?, ?, ?, ?, ?)
                        ON DUPLICATE KEY UPDATE 
                            employee_name = VALUES(employee_name),
                            scheduled_start = VALUES(scheduled_start),
                            scheduled_end = VALUES(scheduled_end),
                            is_day_off = VALUES(is_day_off)");
                }

                foreach ($schedules as $s) {
                    $dayType = $s['day_type'] ?? (($s['is_day_off'] ?? false) ? 'descanso' : 'laboral');
                    if (!in_array($dayType, ['laboral', 'descanso', 'enfermedad', 'vacaciones', 'falta', 'incapacidad', 'permiso'], true)) {
                        $dayType = 'laboral';
                    }
                    $isDayOff = $dayType !== 'laboral' ? 1 : (int)($s['is_day_off'] ?? false);
                    // employee_schedules has NOT NULL TIME columns in production dumps.
                    $start = $dayType === 'laboral' ? ($s['start'] ?? '00:00:00') : '00:00:00';
                    $end = $dayType === 'laboral' ? ($s['end'] ?? '00:00:00') : '00:00:00';
                    if ($start === null || $start === '') $start = '00:00:00';
                    if ($end === null || $end === '') $end = '00:00:00';
                    $dayOfWeek = (int)($s['day_of_week'] ?? 0);
                    $scheduleDate = date('Y-m-d', strtotime($weekStart . " +{$dayOfWeek} days"));

                    if ($hasDayType) {
                        $stmt->execute([
                            $empId, $empName,
                            $dayOfWeek,
                            $start,
                            $end,
                            $isDayOff,
                            $dayType
                        ]);
                    } else {
                        $stmt->execute([
                            $empId, $empName,
                            $dayOfWeek,
                            $start,
                            $end,
                            $isDayOff
                        ]);
                    }

                    // Save day-level historical schedule (week-aware).
                    $ovStmt = $pdo->prepare("INSERT INTO employee_schedule_overrides
                        (employee_id, employee_name, schedule_date, week_start_date, day_of_week, scheduled_start, scheduled_end, is_day_off, day_type, source, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'weekly_template', ?)
                        ON DUPLICATE KEY UPDATE
                            employee_name = VALUES(employee_name),
                            week_start_date = VALUES(week_start_date),
                            day_of_week = VALUES(day_of_week),
                            scheduled_start = VALUES(scheduled_start),
                            scheduled_end = VALUES(scheduled_end),
                            is_day_off = VALUES(is_day_off),
                            day_type = VALUES(day_type),
                            source = VALUES(source),
                            created_by = VALUES(created_by)");
                    $ovStmt->execute([
                        $empId,
                        $empName,
                        $scheduleDate,
                        $weekStart,
                        $dayOfWeek,
                        $start,
                        $end,
                        $isDayOff,
                        $dayType,
                        $createdBy,
                    ]);
                }
                echo json_encode(['success' => true, 'message' => 'Horario guardado', 'week_start' => $weekStart]);
                break;

            // ── Guardar nómina de un empleado ──
            case 'save_payroll':
                $stmt = $pdo->prepare("INSERT INTO employee_payroll 
                    (employee_id, employee_name, pay_type, pay_rate, position)
                    VALUES (?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                        employee_name = VALUES(employee_name),
                        pay_type = VALUES(pay_type),
                        pay_rate = VALUES(pay_rate),
                        position = VALUES(position)");
                $stmt->execute([
                    $input['employee_id'],
                    $input['employee_name'] ?? '',
                    $input['pay_type'] ?? 'daily',
                    $input['pay_rate'] ?? 0,
                    $input['position'] ?? ''
                ]);
                echo json_encode(['success' => true, 'message' => 'Nómina guardada']);
                break;

            // ── Agregar nota a un día de un empleado ──
            case 'add_note':
                $stmt = $pdo->prepare("INSERT INTO employee_day_notes 
                    (employee_id, note_date, note, created_by) VALUES (?, ?, ?, ?)");
                $stmt->execute([
                    $input['employee_id'],
                    $input['date'],
                    $input['note'],
                    $user
                ]);
                echo json_encode(['success' => true, 'message' => 'Nota agregada', 'id' => $pdo->lastInsertId()]);
                break;

            // ── Eliminar nota ──
            case 'delete_note':
                $stmt = $pdo->prepare("DELETE FROM employee_day_notes WHERE id = ?");
                $stmt->execute([$input['note_id']]);
                echo json_encode(['success' => true, 'message' => 'Nota eliminada']);
                break;

            // ── Editar hora de entrada o salida ──
            case 'edit_time':
                $attendanceId = $input['attendance_id'];
                $field = $input['field']; // 'clock_in' o 'clock_out'
                $newValue = $input['new_value'];
                $reason = $input['reason'] ?? '';

                if (!in_array($field, ['clock_in', 'clock_out'])) {
                    echo json_encode(['success' => false, 'error' => 'Campo inválido']);
                    break;
                }

                // Obtener valor actual
                $stmt = $pdo->prepare("SELECT employee_id, $field as old_val FROM sr_attendance WHERE id = ?");
                $stmt->execute([$attendanceId]);
                $current = $stmt->fetch(PDO::FETCH_ASSOC);

                if (!$current) {
                    echo json_encode(['success' => false, 'error' => 'Registro no encontrado']);
                    break;
                }

                // Guardar en log de auditoría
                $logStmt = $pdo->prepare("INSERT INTO attendance_time_edits 
                    (attendance_id, employee_id, field_edited, old_value, new_value, reason, edited_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?)");
                $logStmt->execute([
                    $attendanceId, $current['employee_id'], $field,
                    $current['old_val'], $newValue, $reason, $user
                ]);

                // Actualizar el registro
                $updateStmt = $pdo->prepare("UPDATE sr_attendance SET $field = ? WHERE id = ?");
                $updateStmt->execute([$newValue, $attendanceId]);

                // Recalcular minutos trabajados si ambos existen
                $recalc = $pdo->prepare("UPDATE sr_attendance SET minutes_worked = TIMESTAMPDIFF(MINUTE, clock_in, clock_out) WHERE id = ? AND clock_in IS NOT NULL AND clock_out IS NOT NULL");
                $recalc->execute([$attendanceId]);

                echo json_encode(['success' => true, 'message' => 'Hora actualizada']);
                break;

            // ── Cambiar status de empleado ──
            case 'update_employee_status':
                $empId = $input['employee_id'] ?? null;
                $newStatus = $input['status'] ?? '';
                $allowedStatuses = ['active', 'vacations', 'sick', 'inactive', 'eventual', 'suspended'];
                if (!$empId || !in_array($newStatus, $allowedStatuses, true)) {
                    echo json_encode(['success' => false, 'error' => 'ID o status inválido']);
                    break;
                }
                $stmt = $pdo->prepare("UPDATE employee_files SET status = ? WHERE id = ?");
                $stmt->execute([$newStatus, $empId]);
                echo json_encode(['success' => true, 'message' => 'Status actualizado']);
                break;

            // ── Guardar override de un solo día con nota (corrección manual) ──
            case 'save_day_override':
                $empId = $input['employee_id'] ?? '';
                $empName = $input['employee_name'] ?? '';
                $scheduleDate = $input['schedule_date'] ?? '';
                $dayOfWeek = (int)($input['day_of_week'] ?? 0);
                $dayType = $input['day_type'] ?? 'laboral';
                $start = $input['scheduled_start'] ?? '00:00:00';
                $end = $input['scheduled_end'] ?? '00:00:00';
                $note = $input['note'] ?? '';
                $createdBy = $_SESSION['username'] ?? 'admin';

                if (!$empId || !$scheduleDate) {
                    echo json_encode(['success' => false, 'error' => 'Faltan datos']);
                    break;
                }
                if (!in_array($dayType, ['laboral','descanso','enfermedad','vacaciones','falta','incapacidad','permiso'], true)) {
                    $dayType = 'laboral';
                }
                $isDayOff = $dayType !== 'laboral' ? 1 : 0;
                if ($dayType !== 'laboral') { $start = '00:00:00'; $end = '00:00:00'; }
                if (!$start) $start = '00:00:00';
                if (!$end) $end = '00:00:00';

                // Compute week_start (previous Friday or same day if Friday)
                $dateTs = strtotime($scheduleDate);
                $jsDow = (int)date('w', $dateTs); // 0=Sun
                // Fri=5. Days since last Friday: (jsDow - 5 + 7) % 7
                $daysSinceFri = ($jsDow - 5 + 7) % 7;
                $weekStartDate = date('Y-m-d', $dateTs - ($daysSinceFri * 86400));

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

                $ovStmt = $pdo->prepare("INSERT INTO employee_schedule_overrides
                    (employee_id, employee_name, schedule_date, week_start_date, day_of_week, scheduled_start, scheduled_end, is_day_off, day_type, source, created_by)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'manual_override', ?)
                    ON DUPLICATE KEY UPDATE
                        employee_name = VALUES(employee_name),
                        week_start_date = VALUES(week_start_date),
                        scheduled_start = VALUES(scheduled_start),
                        scheduled_end = VALUES(scheduled_end),
                        is_day_off = VALUES(is_day_off),
                        day_type = VALUES(day_type),
                        source = 'manual_override',
                        created_by = VALUES(created_by)");
                $ovStmt->execute([$empId, $empName, $scheduleDate, $weekStartDate, $dayOfWeek, $start, $end, $isDayOff, $dayType, $createdBy]);

                // Save note if provided
                if (trim($note) !== '') {
                    $noteStmt = $pdo->prepare("INSERT INTO employee_day_notes (employee_id, note_date, note, created_by) VALUES (?, ?, ?, ?)");
                    $noteStmt->execute([$empId, $scheduleDate, $note, $createdBy]);
                }

                echo json_encode(['success' => true, 'message' => 'Override guardado']);
                break;

            default:
                echo json_encode(['success' => false, 'error' => 'Acción no válida']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Método no soportado']);
