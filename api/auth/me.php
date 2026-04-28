<?php
require_once '../config/database.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . ($_SERVER['HTTP_ORIGIN'] ?? '*'));
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

if (empty($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Not authenticated']);
    exit();
}

try {
    $conn = getConnection();
    $id = intval($_SESSION['user_id']);
    try {
        $requiredCols = [
            'can_view_employees' => 1,
            'can_edit_employees' => 0,
            'can_view_quotes' => 1,
            'can_edit_quotes' => 0,
            'can_view_applications' => 1,
            'can_edit_applications' => 0,
            'can_view_sales' => 1,
            'can_edit_sales' => 0,
        ];
        $colsResult = $conn->query("SHOW COLUMNS FROM users");
        $existing = [];
        while ($colsResult && $row = $colsResult->fetch_assoc()) {
            $existing[strtolower($row['Field'])] = true;
        }
        foreach ($requiredCols as $col => $default) {
            if (!isset($existing[strtolower($col)])) {
                $conn->query("ALTER TABLE users ADD COLUMN `$col` TINYINT(1) NOT NULL DEFAULT $default");
            }
        }
    } catch (Throwable $e) {
        error_log('auth/me auto-migrate error: ' . $e->getMessage());
    }

    $stmt = $conn->prepare("SELECT id, username, full_name, email, role, is_active, can_edit, can_view_employees, can_edit_employees, can_delete_employees, can_view_quotes, can_edit_quotes, can_delete_quotes, can_view_applications, can_edit_applications, can_delete_applications, can_view_sales, can_edit_sales FROM users WHERE id = ? AND is_active = 1");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if (!$user) {
        http_response_code(401);
        echo json_encode(['error' => 'User not found or inactive']);
        exit();
    }

    $user['can_edit'] = (bool)($user['can_edit'] ?? false);
    $user['can_view_employees'] = array_key_exists('can_view_employees', $user) ? (bool)$user['can_view_employees'] : true;
    $user['can_edit_employees'] = (bool)($user['can_edit_employees'] ?? false);
    $user['can_delete_employees'] = (bool)($user['can_delete_employees'] ?? false);
    $user['can_view_quotes'] = array_key_exists('can_view_quotes', $user) ? (bool)$user['can_view_quotes'] : true;
    $user['can_edit_quotes'] = (bool)($user['can_edit_quotes'] ?? false);
    $user['can_delete_quotes'] = (bool)($user['can_delete_quotes'] ?? false);
    $user['can_view_applications'] = array_key_exists('can_view_applications', $user) ? (bool)$user['can_view_applications'] : true;
    $user['can_edit_applications'] = (bool)($user['can_edit_applications'] ?? false);
    $user['can_delete_applications'] = (bool)($user['can_delete_applications'] ?? false);
    $user['can_view_sales'] = array_key_exists('can_view_sales', $user) ? (bool)$user['can_view_sales'] : true;
    $user['can_edit_sales'] = (bool)($user['can_edit_sales'] ?? false);

    echo json_encode(['success' => true, 'user' => $user]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
}
