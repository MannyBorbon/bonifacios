<?php
/**
 * Franjas horarias del día con conteo y listado de mesas por franja (reservas + tickets SR abiertos en la fecha solicitada).
 * El front puede animar el plano usando venue_reserved / venue_pos_open por slot.
 *
 * GET: date (Y-m-d), event, event_type_id, mode=calendar_day|sr_shift, slot_minutes (15–60, default 30)
 */
require_once '../config/database.php';
require_once __DIR__ . '/../lib/table_venue_codes.php';
require_once __DIR__ . '/../lib/reservation_floor_event_sql.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

/**
 * @return int minutos desde medianoche [0, 1439]
 */
function bonifacios_time_to_minutes(?string $sqlTime): int
{
    if ($sqlTime === null || $sqlTime === '') {
        return 0;
    }
    $s = trim($sqlTime);
    if (strlen($s) >= 8) {
        $s = substr($s, 0, 8);
    }
    $ts = strtotime('2000-01-01 ' . $s);
    if ($ts === false) {
        return 0;
    }

    return ((int) date('H', $ts)) * 60 + ((int) date('i', $ts));
}

try {
    requireAuth();
    $conn = getConnection();

    $date = trim((string) ($_GET['date'] ?? ''));
    if ($date === '' || !preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Parametro date requerido (YYYY-MM-DD)']);
        exit;
    }

    $event = trim((string) ($_GET['event'] ?? ''));
    $eventTypeId = trim((string) ($_GET['event_type_id'] ?? ''));
    $mode = strtolower(trim((string) ($_GET['mode'] ?? 'calendar_day')));
    if ($mode !== 'sr_shift') {
        $mode = 'calendar_day';
    }
    $slotMin = (int) ($_GET['slot_minutes'] ?? 30);
    $allowedSlots = [15, 20, 30, 45, 60];
    if (!in_array($slotMin, $allowedSlots, true)) {
        $slotMin = 30;
    }

    try {
        $conn->query('ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion');
    } catch (Throwable $e) { /* ignore */
    }

    [$eventSql, $eventTypes, $eventParams] = bonifacios_floor_event_sql($event, $eventTypeId);

    $types = 's';
    $params = [$date];
    $sql = "SELECT sr.table_code, sr.reservation_time
            FROM special_reservations sr
            LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
            WHERE sr.reservation_date = ?
              AND sr.table_code IS NOT NULL AND TRIM(sr.table_code) <> ''
              AND sr.status NOT IN ('cancelled','completed')
              AND (sr.status IN ('pending','confirmed') OR sr.deposit_status IN ('uploaded','confirmed'))";
    $sql .= $eventSql;
    $types .= $eventTypes;
    $params = array_merge($params, $eventParams);

    $stmt = $conn->prepare($sql);
    if (!$stmt) {
        throw new RuntimeException('Prepare falló');
    }
    if ($params !== []) {
        if (PHP_VERSION_ID >= 80100) {
            $stmt->bind_param($types, ...$params);
        } else {
            $refs = [];
            foreach ($params as $k => $v) {
                $refs[$k] = &$params[$k];
            }
            array_unshift($refs, $types);
            call_user_func_array([$stmt, 'bind_param'], $refs);
        }
    }
    $stmt->execute();
    $rs = $stmt->get_result();

    $startMin = ($mode === 'sr_shift') ? (8 * 60) : (11 * 60);
    $endMin = 23 * 60 + 45;
    $slotLabels = [];
    for ($m = $startMin; $m <= $endMin; $m += $slotMin) {
        $slotLabels[] = sprintf('%02d:%02d', intdiv($m, 60), $m % 60);
    }
    $slotCount = count($slotLabels);
    if ($slotCount === 0) {
        echo json_encode(['success' => true, 'date' => $date, 'mode' => $mode, 'slots' => [], 'meta' => ['generated_at' => date('c')]]);
        exit;
    }

    /** @var array<int, array<string, true>> */
    $reservedBySlot = [];
    /** @var array<int, array<string, true>> */
    $posBySlot = [];
    for ($i = 0; $i < $slotCount; ++$i) {
        $reservedBySlot[$i] = [];
        $posBySlot[$i] = [];
    }

    if ($rs) {
        while ($row = $rs->fetch_assoc()) {
            $raw = (string) ($row['table_code'] ?? '');
            $vn = bonifacios_table_canonical_venue_code($raw);
            if ($vn === null || $vn === '') {
                continue;
            }
            $vnU = strtoupper(trim($vn));
            $rm = bonifacios_time_to_minutes((string) ($row['reservation_time'] ?? ''));
            $bStart = (int) (floor($rm / $slotMin) * $slotMin);
            $idx = (int) (($bStart - $startMin) / $slotMin);
            if ($idx < 0 || $idx >= $slotCount) {
                continue;
            }
            $reservedBySlot[$idx][$vnU] = true;
        }
    }

    $todayYmd = date('Y-m-d');
    $posNote = '';
    if ($date === $todayYmd) {
        $posNote = 'POS: tickets abiertos hoy hasta el cierre inferido solo por hora de apertura (sin historia de cobro entre franjas).';
        try {
            $chk = $conn->query("SHOW TABLES LIKE 'sr_sales'");
            if ($chk && $chk->num_rows > 0) {
                $sr = $conn->query(
                    "SELECT table_number, sale_datetime, opened_at, sale_date, sale_time
                     FROM sr_sales WHERE status = 'open'
                     ORDER BY sale_datetime DESC LIMIT 220",
                );
                if ($sr) {
                    while ($row = $sr->fetch_assoc()) {
                        $vn = bonifacios_table_canonical_venue_code((string) ($row['table_number'] ?? ''));
                        if ($vn === null || $vn === '') {
                            continue;
                        }
                        $vnU = strtoupper(trim($vn));
                        $opened = trim((string) ($row['sale_datetime'] ?? ''));
                        if ($opened === '') {
                            $opened = trim((string) ($row['sale_date'] ?? '')) . ' ' . trim((string) ($row['sale_time'] ?? ''));
                        }
                        $openTs = strtotime($opened);
                        if ($openTs === false) {
                            continue;
                        }
                        if (date('Y-m-d', $openTs) !== $date) {
                            continue;
                        }
                        $openMin = ((int) date('H', $openTs)) * 60 + ((int) date('i', $openTs));

                        for ($idx = 0; $idx < $slotCount; ++$idx) {
                            $slotStart = $startMin + $idx * $slotMin;
                            $slotEnd = $slotStart + $slotMin;
                            if ($openMin < $slotEnd) {
                                $posBySlot[$idx][$vnU] = true;
                            }
                        }
                    }
                }
            }
        } catch (Throwable $e) {
            $posNote = 'POS: sin lectura de sr_sales.';
        }
    } else {
        $posNote = 'POS: no proyectado para días históricos.';
    }

    $slotsOut = [];
    $maxMerged = 0;
    for ($i = 0; $i < $slotCount; ++$i) {
        $reservedCount = count($reservedBySlot[$i]);
        $posCount = count($posBySlot[$i]);
        $mergedKeys = [];
        foreach (array_keys($reservedBySlot[$i]) as $k) {
            $mergedKeys[$k] = true;
        }
        foreach (array_keys($posBySlot[$i]) as $k) {
            $mergedKeys[$k] = true;
        }
        $merged = count($mergedKeys);
        if ($merged > $maxMerged) {
            $maxMerged = $merged;
        }
        $reservedKeys = array_keys($reservedBySlot[$i]);
        $posKeys = array_keys($posBySlot[$i]);
        sort($reservedKeys, SORT_STRING);
        sort($posKeys, SORT_STRING);
        $slotsOut[] = [
            'clock' => $slotLabels[$i],
            'reserved_tables' => $reservedCount,
            'pos_open_tables' => $posCount,
            'occupied_distinct' => $merged,
            'venue_reserved' => array_map(static fn ($k) => strtoupper(trim((string) $k)), $reservedKeys),
            'venue_pos_open' => array_map(static fn ($k) => strtoupper(trim((string) $k)), $posKeys),
        ];
    }

    $maxMerged = max(1, $maxMerged);
    $lowTh = max(1, (int) floor($maxMerged * 0.33));
    $highTh = max($lowTh + 1, (int) ceil($maxMerged * 0.66));

    foreach ($slotsOut as &$s) {
        $m = (int) $s['occupied_distinct'];
        if ($m <= 0) {
            $s['level'] = 'none';
        } elseif ($m <= $lowTh) {
            $s['level'] = 'low';
        } elseif ($m <= $highTh) {
            $s['level'] = 'medium';
        } else {
            $s['level'] = 'high';
        }
    }
    unset($s);

    echo json_encode([
        'success' => true,
        'date' => $date,
        'mode' => $mode,
        'slot_minutes' => $slotMin,
        'event' => $event,
        'event_type_id' => $eventTypeId,
        'slots' => $slotsOut,
        'meta' => [
            'generated_at' => date('c'),
            'slot_count' => $slotCount,
            'notes' => $posNote,
        ],
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
