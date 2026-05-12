<?php
require_once '../config/database.php';

date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

try {
    requireAuth();
    $conn = getConnection();

    $statusRaw = trim((string)($_GET['status'] ?? ''));
    $filterDepositComprobante = (strcasecmp($statusRaw, 'uploaded') === 0);
    $status = $filterDepositComprobante ? '' : $statusRaw;
    $date = trim((string)($_GET['date'] ?? ''));
    $search = trim((string)($_GET['search'] ?? ''));
    $event = trim((string)($_GET['event'] ?? ''));
    $eventTypeId = trim((string)($_GET['event_type_id'] ?? ''));

    try {
        $conn->query("ALTER TABLE special_reservations ADD COLUMN event_type_id INT NULL AFTER occasion");
    } catch (Throwable $e) { /* ignore if already exists */ }

    try {
        $conn->query(
            'ALTER TABLE special_reservations ADD COLUMN secondary_table_code VARCHAR(32) NULL DEFAULT NULL AFTER table_code',
        );
    } catch (Throwable $e) { /* ignore */
    }

    $sql = "SELECT sr.id, sr.customer_name, sr.phone, sr.email, sr.guests, sr.reservation_date, sr.reservation_time, sr.table_code,
                   sr.secondary_table_code, sr.notes, sr.occasion, sr.event_type_id, sr.status, sr.deposit_status, sr.deposit_screenshot,
                   sr.created_at, sr.updated_at,
                   ret.name AS event_type_name, ret.slug AS event_type_slug
            FROM special_reservations sr
            LEFT JOIN reservation_event_types ret ON ret.id = sr.event_type_id
            WHERE 1=1";

    $types = '';
    $params = [];

    // Filtro por evento
    if ($event === 'mothers_day') {
        $sql .= " AND (sr.occasion = 'Dia de las Madres' OR sr.occasion = 'Día de las Madres' OR ret.slug = 'dia-madres')";
    } elseif ($event === 'normal') {
        $sql .= " AND ((sr.occasion IS NULL OR (sr.occasion != 'Dia de las Madres' AND sr.occasion != 'Día de las Madres')) AND (ret.slug IS NULL OR ret.slug != 'dia-madres'))";
    } elseif ($event === 'general') {
        // Categoría general: tipo explícito `general`, o legado sin tipo / sin ocasión especial (no Día de las Madres).
        $sql .= " AND (
            ret.slug = 'general'
            OR (
                sr.event_type_id IS NULL
                AND (ret.slug IS NULL OR ret.slug = '' OR ret.slug NOT IN ('dia-madres'))
                AND (sr.occasion IS NULL OR (sr.occasion != 'Dia de las Madres' AND sr.occasion != 'Día de las Madres'))
            )
        )";
    }

    if ($eventTypeId !== '') {
        $sql .= " AND sr.event_type_id = ?";
        $types .= 'i';
        $params[] = intval($eventTypeId);
    }

    if ($filterDepositComprobante) {
        $sql .= " AND sr.deposit_status IN ('uploaded','confirmed')";
    } elseif ($status !== '') {
        $allowedReservationStatus = ['pending', 'confirmed', 'cancelled', 'completed'];
        if (!in_array($status, $allowedReservationStatus, true)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Filtro de estado no válido']);
            exit;
        }
        $sql .= " AND sr.status = ?";
        $types .= 's';
        $params[] = $status;
    }
    if ($date !== '') {
        $sql .= " AND sr.reservation_date = ?";
        $types .= 's';
        $params[] = $date;
    }
    if ($search !== '') {
        $sql .= " AND (sr.customer_name LIKE ? OR sr.phone LIKE ? OR sr.table_code LIKE ? OR IFNULL(sr.secondary_table_code,'') LIKE ?)";
        $types .= 'ssss';
        $like = '%' . $search . '%';
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
        $params[] = $like;
    }

    $sql .= " ORDER BY sr.reservation_date DESC, sr.reservation_time DESC, sr.created_at DESC";

    $stmt = $conn->prepare($sql);
    if ($types !== '') {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $reservations = [];
    while ($row = $result->fetch_assoc()) {
        $reservations[] = $row;
    }

    $statsSql = "SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) AS confirmed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed
      FROM special_reservations";
    $statsResult = $conn->query($statsSql);
    $stats = $statsResult ? $statsResult->fetch_assoc() : ['total' => 0, 'pending' => 0, 'confirmed' => 0, 'cancelled' => 0, 'completed' => 0];

    echo json_encode([
        'success' => true,
        'reservations' => $reservations,
        'stats' => $stats
    ]);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}

