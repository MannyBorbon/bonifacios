<?php
require_once '../config/database.php';
date_default_timezone_set('America/Hermosillo');
header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    if ($method === 'GET') {
        $meetingId = intval($_GET['meeting_id'] ?? 0);
        if (!$meetingId) { http_response_code(400); echo json_encode(['error' => 'meeting_id required']); exit; }

        $stmt = $conn->prepare("
            SELECT mm.*, u.full_name as editor_name
            FROM meeting_minutes mm
            LEFT JOIN users u ON mm.updated_by = u.id
            WHERE mm.meeting_id = ?
        ");
        $stmt->bind_param("i", $meetingId);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();
        echo json_encode(['success' => true, 'minutes' => $row]);

    } elseif ($method === 'POST') {
        $data      = json_decode(file_get_contents('php://input'), true);
        $meetingId = intval($data['meeting_id'] ?? 0);
        $content   = $data['content'] ?? '';

        if (!$meetingId) { http_response_code(400); echo json_encode(['error' => 'meeting_id required']); exit; }

        $check = $conn->prepare("SELECT id FROM meeting_minutes WHERE meeting_id = ?");
        $check->bind_param("i", $meetingId);
        $check->execute();
        $exists = $check->get_result()->num_rows > 0;

        if ($exists) {
            $stmt = $conn->prepare("UPDATE meeting_minutes SET content=?, updated_by=?, updated_at=NOW() WHERE meeting_id=?");
            $stmt->bind_param("sii", $content, $userId, $meetingId);
        } else {
            $stmt = $conn->prepare("INSERT INTO meeting_minutes (meeting_id, content, updated_by) VALUES (?, ?, ?)");
            $stmt->bind_param("isi", $meetingId, $content, $userId);
        }
        $stmt->execute();

        // Return updated_at and editor
        $fetch = $conn->prepare("SELECT mm.updated_at, u.full_name as editor_name FROM meeting_minutes mm LEFT JOIN users u ON mm.updated_by = u.id WHERE mm.meeting_id = ?");
        $fetch->bind_param("i", $meetingId);
        $fetch->execute();
        $row = $fetch->get_result()->fetch_assoc();

        echo json_encode(['success' => true, 'updated_at' => $row['updated_at'] ?? null, 'editor_name' => $row['editor_name'] ?? null]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
$conn->close();
?>
