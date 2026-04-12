<?php
require_once '../config/database.php';
header('Content-Type: application/json');

try {
    $userId = requireAuth();
    $conn   = getConnection();
    $method = $_SERVER['REQUEST_METHOD'];

    if ($method === 'GET') {
        $employeeId = intval($_GET['employee_id'] ?? 0);
        if (!$employeeId) { http_response_code(400); echo json_encode(['error' => 'employee_id required']); exit; }

        $stmt = $conn->prepare("SELECT * FROM employee_notes WHERE employee_id = ? ORDER BY updated_at DESC");
        $stmt->bind_param("i", $employeeId);
        $stmt->execute();
        $notes = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'notes' => $notes]);

    } elseif ($method === 'POST') {
        $data   = json_decode(file_get_contents('php://input'), true);
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $employeeId     = intval($data['employee_id'] ?? 0);
            $title          = trim($data['title'] ?? 'Nota sin título');
            $content        = $data['content'] ?? '';
            $color          = $data['color'] ?? 'default';
            $createdByName  = trim($data['created_by_name'] ?? '');
            if (!$employeeId) { http_response_code(400); echo json_encode(['error' => 'employee_id required']); exit; }

            $stmt = $conn->prepare("INSERT INTO employee_notes (employee_id, title, content, color, created_by, created_by_name) VALUES (?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("isssis", $employeeId, $title, $content, $color, $userId, $createdByName);
            $stmt->execute();
            $newId = $stmt->insert_id;

            $fetch = $conn->prepare("SELECT * FROM employee_notes WHERE id = ?");
            $fetch->bind_param("i", $newId);
            $fetch->execute();
            $note = $fetch->get_result()->fetch_assoc();
            echo json_encode(['success' => true, 'note' => $note]);

        } elseif ($action === 'update') {
            $id      = intval($data['id'] ?? 0);
            $title   = trim($data['title'] ?? 'Nota sin título');
            $content = $data['content'] ?? '';
            $color   = $data['color'] ?? 'default';
            if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

            $stmt = $conn->prepare("UPDATE employee_notes SET title = ?, content = ?, color = ?, updated_at = NOW() WHERE id = ?");
            $stmt->bind_param("sssi", $title, $content, $color, $id);
            $stmt->execute();
            echo json_encode(['success' => true]);

        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }

            $stmt = $conn->prepare("DELETE FROM employee_notes WHERE id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            echo json_encode(['success' => true]);
        }
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
$conn->close();
?>
