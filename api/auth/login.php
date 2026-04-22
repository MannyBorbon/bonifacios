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
    ]
]);

$conn->close();
?>
