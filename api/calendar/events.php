<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    if ($method === 'GET') {
        $month = isset($_GET['month']) ? intval($_GET['month']) : intval(date('m'));
        $year  = isset($_GET['year'])  ? intval($_GET['year'])  : intval(date('Y'));

        $start = "$year-" . str_pad($month, 2, '0', STR_PAD_LEFT) . "-01";
        $end   = date('Y-m-t', strtotime($start));

        $stmt = $conn->prepare("
            SELECT ce.*, u.full_name as creator_name,
                   eq.name as quote_client, eq.event_type as quote_type
            FROM calendar_events ce
            LEFT JOIN users u ON ce.created_by = u.id
            LEFT JOIN event_quotes eq ON ce.quote_id = eq.id
            WHERE ce.event_date BETWEEN ? AND ?
            ORDER BY ce.event_date ASC, ce.start_time ASC
        ");
        $stmt->bind_param("ss", $start, $end);
        $stmt->execute();
        $events = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'events' => $events]);

    } elseif ($method === 'POST') {
        $data  = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $title       = trim($data['title'] ?? '');
            $description = trim($data['description'] ?? '');
            $event_date  = $data['event_date'] ?? '';
            $start_time  = $data['start_time'] ?? null;
            $end_time    = $data['end_time'] ?? null;
            $category    = $data['category'] ?? 'otro';
            $status      = $data['status'] ?? 'pendiente';
            $priority    = $data['priority'] ?? 'media';
            $color       = $data['color'] ?? null;
            $tags        = $data['tags'] ?? null;
            $assigned_to = $data['assigned_to'] ?? null;
            $quote_id    = !empty($data['quote_id']) ? intval($data['quote_id']) : null;

            if (!$title || !$event_date) {
                http_response_code(400);
                echo json_encode(['error' => 'title and event_date required']);
                exit;
            }

            $stmt = $conn->prepare("
                INSERT INTO calendar_events (title, description, event_date, start_time, end_time, category, status, priority, color, tags, assigned_to, quote_id, created_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->bind_param("sssssssssssii", $title, $description, $event_date, $start_time, $end_time, $category, $status, $priority, $color, $tags, $assigned_to, $quote_id, $userId);
            $stmt->execute();
            $newId = $stmt->insert_id;

            $fetch = $conn->prepare("
                SELECT ce.*, u.full_name as creator_name,
                       eq.name as quote_client, eq.event_type as quote_type
                FROM calendar_events ce
                LEFT JOIN users u ON ce.created_by = u.id
                LEFT JOIN event_quotes eq ON ce.quote_id = eq.id
                WHERE ce.id = ?
            ");
            $fetch->bind_param("i", $newId);
            $fetch->execute();
            $event = $fetch->get_result()->fetch_assoc();
            echo json_encode(['success' => true, 'event' => $event]);

        } elseif ($action === 'update') {
            $id          = intval($data['id'] ?? 0);
            $title       = trim($data['title'] ?? '');
            $description = trim($data['description'] ?? '');
            $event_date  = $data['event_date'] ?? '';
            $start_time  = $data['start_time'] ?? null;
            $end_time    = $data['end_time'] ?? null;
            $category    = $data['category'] ?? 'otro';
            $status      = $data['status'] ?? 'pendiente';
            $priority    = $data['priority'] ?? 'media';
            $color       = $data['color'] ?? null;
            $tags        = $data['tags'] ?? null;
            $assigned_to = $data['assigned_to'] ?? null;
            $quote_id    = !empty($data['quote_id']) ? intval($data['quote_id']) : null;

            if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

            $stmt = $conn->prepare("
                UPDATE calendar_events
                SET title=?, description=?, event_date=?, start_time=?, end_time=?, category=?, status=?, priority=?, color=?, tags=?, assigned_to=?, quote_id=?, updated_at=NOW()
                WHERE id=?
            ");
            $stmt->bind_param("sssssssssssii", $title, $description, $event_date, $start_time, $end_time, $category, $status, $priority, $color, $tags, $assigned_to, $quote_id, $id);
            $stmt->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
            $stmt = $conn->prepare("DELETE FROM calendar_events WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
$conn->close();
?>
