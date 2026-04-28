<?php
// Habilitar reporte de errores para debugging
error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

require_once '../config/database.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

try {
    $conn = getConnection();
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit();
}

// Obtener datos del POST
$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['username']) || !isset($data['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password required']);
    exit();
}

$username = $conn->real_escape_string($data['username']);
$password = $data['password'];

// Buscar usuario
$sql = "SELECT * FROM users WHERE username = ? AND is_active = TRUE";
$stmt = $conn->prepare($sql);
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit();
}

$user = $result->fetch_assoc();

// Verificar contraseña
if (!password_verify($password, $user['password'])) {
    http_response_code(401);
    echo json_encode(['error' => 'Invalid credentials']);
    exit();
}

// Actualizar último login
$updateSql = "UPDATE users SET last_login = NOW() WHERE id = ?";
$updateStmt = $conn->prepare($updateSql);
$updateStmt->bind_param("i", $user['id']);
$updateStmt->execute();

// Registrar actividad (silencioso si tabla no existe)
try {
    $logSql = "INSERT INTO activity_log (user_id, action, description) VALUES (?, 'login', ?)";
    $logStmt = $conn->prepare($logSql);
    if ($logStmt) {
        $description = "User {$user['username']} logged in";
        $logStmt->bind_param("is", $user['id'], $description);
        $logStmt->execute();
    }
} catch (Exception $e) {}

// Generar token simple (en producción usa JWT)
$token = base64_encode($user['id'] . ':' . time() . ':' . bin2hex(random_bytes(16)));

// Guardar token en sesión o base de datos si es necesario
$_SESSION['user_id'] = $user['id'];
$_SESSION['token'] = $token;

echo json_encode([
    'token' => $token,
    'user' => [
        'id'       => $user['id'],
        'username' => $user['username'],
        'full_name'=> $user['full_name'],
        'email'    => $user['email'],
        'role'     => $user['role'],
        'avatar'   => $user['avatar'],
        'can_edit' => (bool)($user['can_edit'] ?? false),
        'can_view_employees'      => array_key_exists('can_view_employees', $user) ? (bool)$user['can_view_employees'] : true,
        'can_edit_employees'      => (bool)($user['can_edit_employees'] ?? false),
        'can_delete_employees'    => (bool)($user['can_delete_employees'] ?? false),
        'can_view_quotes'         => array_key_exists('can_view_quotes', $user) ? (bool)$user['can_view_quotes'] : true,
        'can_edit_quotes'         => (bool)($user['can_edit_quotes'] ?? false),
        'can_delete_quotes'       => (bool)($user['can_delete_quotes'] ?? false),
        'can_view_applications'   => array_key_exists('can_view_applications', $user) ? (bool)$user['can_view_applications'] : true,
        'can_edit_applications'   => (bool)($user['can_edit_applications'] ?? false),
        'can_delete_applications' => (bool)($user['can_delete_applications'] ?? false),
        'can_view_sales'          => (bool)($user['can_view_sales'] ?? true),
        'can_edit_sales'          => (bool)($user['can_edit_sales'] ?? false),
    ]
]);

$conn->close();
?>
