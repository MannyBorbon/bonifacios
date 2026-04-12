<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    if ($method === 'GET') {
        $action = $_GET['action'] ?? 'list';

        if ($action === 'list') {
            $rows = $conn->query("
                SELECT m.*, u.full_name as creator_name,
                    (SELECT COUNT(*) FROM meeting_participants mp WHERE mp.meeting_id = m.id AND mp.left_at IS NULL) as active_count,
                    (SELECT COUNT(*) FROM meeting_participants mp2 WHERE mp2.meeting_id = m.id AND mp2.user_id = $userId AND mp2.left_at IS NULL) as i_am_in
                FROM meetings m
                LEFT JOIN users u ON m.created_by = u.id
                ORDER BY
                    CASE m.status WHEN 'active' THEN 0 WHEN 'scheduled' THEN 1 ELSE 2 END,
                    m.scheduled_at DESC
                LIMIT 50
            ")->fetch_all(MYSQLI_ASSOC);
            echo json_encode(['success' => true, 'meetings' => $rows]);

        } elseif ($action === 'room') {
            $meetingId = intval($_GET['id'] ?? 0);
            if (!$meetingId) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

            $stmt = $conn->prepare("
                SELECT m.*, u.full_name as creator_name
                FROM meetings m LEFT JOIN users u ON m.created_by = u.id
                WHERE m.id = ?
            ");
            $stmt->bind_param("i", $meetingId);
            $stmt->execute();
            $meeting = $stmt->get_result()->fetch_assoc();
            if (!$meeting) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }

            // Active participants
            $pStmt = $conn->prepare("
                SELECT mp.*, u.full_name, u.username, u.profile_photo, u.role
                FROM meeting_participants mp
                JOIN users u ON mp.user_id = u.id
                WHERE mp.meeting_id = ? AND mp.left_at IS NULL
                ORDER BY mp.joined_at ASC
            ");
            $pStmt->bind_param("i", $meetingId);
            $pStmt->execute();
            $participants = $pStmt->get_result()->fetch_all(MYSQLI_ASSOC);

            echo json_encode(['success' => true, 'meeting' => $meeting, 'participants' => $participants]);
        }

    } elseif ($method === 'POST') {
        $data   = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $title        = trim($data['title'] ?? '');
            $description  = trim($data['description'] ?? '');
            $scheduledAt  = $data['scheduled_at'] ?? null;
            $status       = $scheduledAt ? 'scheduled' : 'active';

            if (!$title) { http_response_code(400); echo json_encode(['error' => 'title required']); exit; }

            $stmt = $conn->prepare("INSERT INTO meetings (title, description, scheduled_at, status, created_by) VALUES (?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssi", $title, $description, $scheduledAt, $status, $userId);
            $stmt->execute();
            $newId = $stmt->insert_id;

            // If starting now, auto-join creator
            if ($status === 'active') {
                $jStmt = $conn->prepare("INSERT INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)");
                $jStmt->bind_param("ii", $newId, $userId);
                $jStmt->execute();
            }

            echo json_encode(['success' => true, 'id' => $newId, 'status' => $status]);

        } elseif ($action === 'start') {
            $id = intval($data['id'] ?? 0);
            $conn->prepare("UPDATE meetings SET status='active', started_at=NOW() WHERE id=?")->bind_param("i", $id) && $conn->prepare("UPDATE meetings SET status='active', started_at=NOW() WHERE id=?")->execute();
            $stmt = $conn->prepare("UPDATE meetings SET status='active', started_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'end') {
            $id = intval($data['id'] ?? 0);
            $stmt = $conn->prepare("UPDATE meetings SET status='ended', ended_at=NOW() WHERE id=?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            // Remove all participants
            $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND left_at IS NULL")->bind_param("i", $id) && $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND left_at IS NULL")->execute();
            $d = $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND left_at IS NULL");
            $d->bind_param("i", $id);
            $d->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'join') {
            $id = intval($data['id'] ?? 0);
            // Activate if scheduled
            $conn->prepare("UPDATE meetings SET status='active', started_at=COALESCE(started_at, NOW()) WHERE id=? AND status='scheduled'")->bind_param("i", $id);
            $act = $conn->prepare("UPDATE meetings SET status='active', started_at=COALESCE(started_at, NOW()) WHERE id=? AND status='scheduled'");
            $act->bind_param("i", $id);
            $act->execute();
            // Upsert participant
            $check = $conn->prepare("SELECT id FROM meeting_participants WHERE meeting_id=? AND user_id=? AND left_at IS NULL");
            $check->bind_param("ii", $id, $userId);
            $check->execute();
            if ($check->get_result()->num_rows === 0) {
                $j = $conn->prepare("INSERT INTO meeting_participants (meeting_id, user_id) VALUES (?, ?)");
                $j->bind_param("ii", $id, $userId);
                $j->execute();
            }
            echo json_encode(['success' => true]);

        } elseif ($action === 'leave') {
            $id = intval($data['id'] ?? 0);
            $l = $conn->prepare("UPDATE meeting_participants SET left_at=NOW() WHERE meeting_id=? AND user_id=? AND left_at IS NULL");
            $l->bind_param("ii", $id, $userId);
            $l->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            $conn->prepare("DELETE FROM meetings WHERE id=? AND created_by=?")->bind_param("ii", $id, $userId);
            $del = $conn->prepare("DELETE FROM meetings WHERE id=?");
            $del->bind_param("i", $id);
            $del->execute();
            echo json_encode(['success' => true]);
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => basename($e->getFile()) . ':' . $e->getLine()]);
}
$conn->close();
?>
