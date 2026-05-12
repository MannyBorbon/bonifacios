<?php
require_once '../config/database.php';
header('Content-Type: application/json');

date_default_timezone_set('America/Hermosillo');
$method = $_SERVER['REQUEST_METHOD'];

try {
    $userId = requireAuth();
    $conn   = getConnection();

    // Ensure base table exists (idempotent when called first time)
    $conn->query("CREATE TABLE IF NOT EXISTS workspace_calendars (
        id INT AUTO_INCREMENT PRIMARY KEY,
        calendar_type ENUM('personal','team') NOT NULL DEFAULT 'personal',
        name VARCHAR(100) NOT NULL,
        owner_user_id INT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY owner_user (owner_user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

    if ($method === 'GET') {
        // List calendars visible to current user: team calendars + own personal calendar
        $stmt = $conn->prepare("SELECT * FROM workspace_calendars WHERE calendar_type='team' OR owner_user_id = ? ORDER BY calendar_type, name");
        $stmt->bind_param("i", $userId);
        $stmt->execute();
        $rows = $stmt->get_result()->fetch_all(MYSQLI_ASSOC);
        echo json_encode(['success' => true, 'calendars' => $rows]);
        exit;
    }

    if ($method === 'POST') {
        $data = json_decode(file_get_contents('php://input'), true) ?: [];
        $action = $data['action'] ?? 'create';

        if ($action === 'create') {
            $calendarType = in_array($data['calendar_type'] ?? 'personal', ['personal','team'], true) ? $data['calendar_type'] : 'personal';
            $name = trim($data['name'] ?? '');
            if ($name === '') { http_response_code(400); echo json_encode(['error' => 'name required']); exit; }
            if ($calendarType === 'personal') {
                // Only allow creating own personal calendar
                $ownerId = $userId;
            } else {
                // Team calendar – only admins can create (simple check role field if exists)
                $ownerId = null;
                // Basic role check (assume users.role column exists)
                $roleRow = $conn->query("SELECT role FROM users WHERE id = " . intval($userId) . " LIMIT 1")->fetch_assoc();
                $role = strtolower((string)($roleRow['role'] ?? ''));
                if (!in_array($role, ['administrador','admin','owner'], true)) {
                    http_response_code(403); echo json_encode(['error' => 'Solo administradores pueden crear calendarios de equipo']); exit;
                }
            }
            $stmt = $conn->prepare("INSERT INTO workspace_calendars (calendar_type,name,owner_user_id) VALUES (?,?,?)");
            $stmt->bind_param("ssi", $calendarType, $name, $ownerId);
            $stmt->execute();
            echo json_encode(['success' => true, 'id' => intval($stmt->insert_id)]);
            exit;
        } elseif ($action === 'delete') {
            $id = intval($data['id'] ?? 0);
            if ($id <= 0) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
            // Verify ownership or admin
            $stmt = $conn->prepare("SELECT calendar_type, owner_user_id FROM workspace_calendars WHERE id=? LIMIT 1");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $info = $stmt->get_result()->fetch_assoc();
            if (!$info) { http_response_code(404); echo json_encode(['error' => 'Not found']); exit; }
            $canDelete = false;
            if ($info['calendar_type'] === 'personal' && intval($info['owner_user_id']) === intval($userId)) $canDelete = true;
            if (!$canDelete) {
                // Admin check same as above
                $roleRow = $conn->query("SELECT role FROM users WHERE id = " . intval($userId) . " LIMIT 1")->fetch_assoc();
                $role = strtolower((string)($roleRow['role'] ?? ''));
                if (in_array($role, ['administrador','admin','owner'], true)) $canDelete = true;
            }
            if (!$canDelete) { http_response_code(403); echo json_encode(['error' => 'No autorizado']); exit; }
            $del = $conn->prepare("DELETE FROM workspace_calendars WHERE id=?");
            $del->bind_param("i", $id);
            $del->execute();
            echo json_encode(['success' => true]);
            exit;
        }
    }

    http_response_code(400);
    echo json_encode(['error' => 'Método o acción no soportados']);

} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage(), 'trace' => basename($e->getFile()) . ':' . $e->getLine()]);
}
$conn->close();
?>
