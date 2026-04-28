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
                $sql = "SELECT * FROM employee_schedules ORDER BY employee_name, day_of_week";
                $stmt = $pdo->query($sql);
                echo json_encode(['success' => true, 'schedules' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
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

                // Ensure day_type support exists for richer scheduling states.
                $hasDayType = false;
                try {
                    $colStmt = $pdo->query("SHOW COLUMNS FROM employee_schedules LIKE 'day_type'");
                    $hasDayType = (bool)$colStmt->fetch(PDO::FETCH_ASSOC);
                    if (!$hasDayType) {
                        $pdo->exec("ALTER TABLE employee_schedules ADD COLUMN day_type ENUM('laboral','descanso','enfermedad') DEFAULT 'laboral' AFTER is_day_off");
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
                    if (!in_array($dayType, ['laboral', 'descanso', 'enfermedad'], true)) {
                        $dayType = 'laboral';
                    }
                    $isDayOff = $dayType !== 'laboral' ? 1 : (int)($s['is_day_off'] ?? false);
                    $start = $dayType === 'laboral' ? ($s['start'] ?? null) : null;
                    $end = $dayType === 'laboral' ? ($s['end'] ?? null) : null;

                    if ($hasDayType) {
                        $stmt->execute([
                            $empId, $empName,
                            $s['day_of_week'],
                            $start,
                            $end,
                            $isDayOff,
                            $dayType
                        ]);
                    } else {
                        $stmt->execute([
                            $empId, $empName,
                            $s['day_of_week'],
                            $start,
                            $end,
                            $isDayOff
                        ]);
                    }
                }
                echo json_encode(['success' => true, 'message' => 'Horario guardado']);
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

            default:
                echo json_encode(['success' => false, 'error' => 'Acción no válida']);
        }
    } catch (Exception $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

echo json_encode(['success' => false, 'error' => 'Método no soportado']);
