<?php
require_once '../config/database.php';

$callerId = requireAuth();
$conn = getConnection();

$callerStmt = $conn->prepare("SELECT username FROM users WHERE id = ?");
$callerStmt->bind_param("i", $callerId);
$callerStmt->execute();
$caller = $callerStmt->get_result()->fetch_assoc();
$callerName = strtolower($caller['username'] ?? '');

$VALID_TARGETS = ['francisco', 'santiago'];
$VALID_PERMS   = [
    'can_view_employees',
    'can_edit_employees',
    'can_view_quotes',
    'can_edit_quotes',
    'can_view_applications',
    'can_edit_applications',
    'can_view_sales',
    'can_edit_sales',
];

// Auto-migración: crear columnas faltantes para que la UI nunca falle con 500
try {
    $colsResult = $conn->query("SHOW COLUMNS FROM users");
    $existing = [];
    while ($colsResult && $row = $colsResult->fetch_assoc()) {
        $existing[strtolower($row['Field'])] = true;
    }
    foreach ($VALID_PERMS as $perm) {
        if (!isset($existing[strtolower($perm)])) {
            $default = (strpos($perm, 'can_view_') === 0) ? 1 : 0;
            $conn->query("ALTER TABLE users ADD COLUMN `$perm` TINYINT(1) NOT NULL DEFAULT $default");
        }
    }
} catch (Throwable $e) {
    error_log('permissions.php auto-migrate error: ' . $e->getMessage());
}

// GET: obtener todos los permisos de francisco y santiago
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $res = $conn->query("SELECT id, username, full_name, " . implode(', ', $VALID_PERMS) . " FROM users WHERE LOWER(username) IN ('francisco','santiago') ORDER BY username");
    $users = [];
    while ($row = $res->fetch_assoc()) {
        $perms = [];
        foreach ($VALID_PERMS as $p) {
            $perms[$p] = (bool)($row[$p] ?? false);
        }
        $users[] = [
            'id'        => (int)$row['id'],
            'username'  => $row['username'],
            'full_name' => $row['full_name'],
            'perms'     => $perms,
        ];
    }
    echo json_encode(['success' => true, 'users' => $users]);
    $conn->close();
    exit();
}

// POST: actualizar un permiso (solo manuel o misael)
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!in_array($callerName, ['manuel', 'misael'])) {
        http_response_code(403);
        echo json_encode(['success' => false, 'error' => 'No autorizado']);
        $conn->close();
        exit();
    }

    $data   = json_decode(file_get_contents('php://input'), true);
    $target = strtolower(trim($data['username'] ?? ''));
    $perm   = $data['permission'] ?? '';
    $value  = isset($data['value']) ? (bool)$data['value'] : false;

    if (!in_array($target, $VALID_TARGETS)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Usuario no válido']);
        $conn->close();
        exit();
    }
    if (!in_array($perm, $VALID_PERMS)) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Permiso no válido']);
        $conn->close();
        exit();
    }

    $val  = $value ? 1 : 0;
    $stmt = $conn->prepare("UPDATE users SET `$perm` = ? WHERE LOWER(username) = ?");
    $stmt->bind_param("is", $val, $target);
    $stmt->execute();

    // Reglas de dependencia:
    // 1) Si activa "editar", activa automáticamente "ver" del mismo módulo.
    // 2) Si desactiva "ver", desactiva automáticamente "editar" del mismo módulo.
    if (strpos($perm, 'can_edit_') === 0 && $value) {
        $viewPerm = 'can_view_' . substr($perm, strlen('can_edit_'));
        if (in_array($viewPerm, $VALID_PERMS, true)) {
            $stmt2 = $conn->prepare("UPDATE users SET `$viewPerm` = 1 WHERE LOWER(username) = ?");
            $stmt2->bind_param("s", $target);
            $stmt2->execute();
        }
    }
    if (strpos($perm, 'can_view_') === 0 && !$value) {
        $editPerm = 'can_edit_' . substr($perm, strlen('can_view_'));
        if (in_array($editPerm, $VALID_PERMS, true)) {
            $stmt3 = $conn->prepare("UPDATE users SET `$editPerm` = 0 WHERE LOWER(username) = ?");
            $stmt3->bind_param("s", $target);
            $stmt3->execute();
        }
    }

    echo json_encode(['success' => true, 'username' => $target, 'permission' => $perm, 'value' => $value]);
    $conn->close();
    exit();
}

http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
$conn->close();
?>
