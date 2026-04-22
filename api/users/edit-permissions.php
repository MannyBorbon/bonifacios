<?php
require_once '../config/database.php';

$userId = requireAuth();
$conn = getConnection();

// Verificar que el usuario que hace la request sea manuel o misael
$stmt = $conn->prepare("SELECT username, role FROM users WHERE id = ?");
$stmt->bind_param("i", $userId);
$stmt->execute();
$caller = $stmt->get_result()->fetch_assoc();

$callerName = strtolower($caller['username'] ?? '');

// GET: obtener permisos de edición de francisco y santiago
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res = $conn->query("SELECT id, username, full_name, can_edit FROM users WHERE LOWER(username) IN ('francisco','santiago')");
    $users = [];
    while ($row = $res->fetch_assoc()) {
        $users[] = [
            'id'        => (int)$row['id'],
            'username'  => $row['username'],
            'full_name' => $row['full_name'],
            'can_edit'  => (bool)$row['can_edit'],
        ];
    }
    echo json_encode(['success' => true, 'users' => $users]);
    $conn->close();
    exit();
}

// POST: cambiar permiso (solo manuel o misael)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!in_array($callerName, ['manuel', 'misael'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No autorizado']);
        $conn->close();
        exit();
    }

    $data       = json_decode(file_get_contents('php://input'), true);
    $targetUser = strtolower($conn->real_escape_string($data['username'] ?? ''));
    $canEdit    = isset($data['can_edit']) ? (bool)$data['can_edit'] : false;

    if (!in_array($targetUser, ['francisco', 'santiago'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Usuario no válido']);
        $conn->close();
        exit();
    }

    $val  = $canEdit ? 1 : 0;
    $stmt = $conn->prepare("UPDATE users SET can_edit = ? WHERE LOWER(username) = ?");
    $stmt->bind_param("is", $val, $targetUser);
    $stmt->execute();

    echo json_encode(['success' => true, 'username' => $targetUser, 'can_edit' => $canEdit]);
    $conn->close();
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
$conn->close();
?>
