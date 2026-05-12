<?php
// Zona horaria: San Carlos, Sonora, México (UTC-7, sin horario de verano)
date_default_timezone_set('America/Hermosillo');

require_once __DIR__ . '/env.php';

function envOrDefault($key, $defaultValue = '') {
    $value = getenv($key);
    if ($value === false || $value === '') {
        return $defaultValue;
    }
    return $value;
}

// Configuración de base de datos
define('DB_HOST', envOrDefault('DB_HOST', 'localhost'));
define('DB_USER', envOrDefault('DB_USER', ''));
define('DB_PASS', envOrDefault('DB_PASS', ''));
define('DB_NAME', envOrDefault('DB_NAME', ''));

define('APP_ENV', strtolower(envOrDefault('APP_ENV', 'production')));
define('APP_PRIMARY_DOMAIN', envOrDefault('APP_PRIMARY_DOMAIN', 'https://bonifaciossancarlos.com'));
define('CORS_ALLOWED_ORIGINS', envOrDefault('CORS_ALLOWED_ORIGINS', APP_PRIMARY_DOMAIN));
define('COOKIE_SECURE', filter_var(envOrDefault('COOKIE_SECURE', '1'), FILTER_VALIDATE_BOOLEAN));
define('COOKIE_SAMESITE', envOrDefault('COOKIE_SAMESITE', 'None'));

// Crear conexión MySQLi
function getConnection() {
    try {
        $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
        
        if ($conn->connect_error) {
            throw new Exception('Connection failed: ' . $conn->connect_error);
        }
        
        $conn->set_charset("utf8mb4");
        return $conn;
    } catch (Exception $e) {
        http_response_code(500);
        die(json_encode([
            'error' => 'Database connection error',
            'message' => $e->getMessage(),
            'host' => DB_HOST,
            'user' => DB_USER,
            'database' => DB_NAME
        ]));
    }
}

// Crear conexión PDO (lazy — solo se crea cuando se llama getPDO())
$pdo = null;
function getPDO() {
    global $pdo;
    if ($pdo === null) {
        try {
            $pdo = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
                DB_USER,
                DB_PASS,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            http_response_code(500);
            die(json_encode([
                'error' => 'Database connection error',
                'message' => $e->getMessage()
            ]));
        }
    }
    return $pdo;
}

// Session cookie settings for tablet/mobile compatibility
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 86400,
        'path' => '/',
        'domain' => '',
        'secure' => COOKIE_SECURE,
        'httponly' => true,
        'samesite' => COOKIE_SAMESITE
    ]);
}

// Headers CORS
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : APP_PRIMARY_DOMAIN;
$allowedOrigins = array_filter(array_map('trim', explode(',', CORS_ALLOWED_ORIGINS)));

if (!in_array($origin, $allowedOrigins, true)) {
    $origin = APP_PRIMARY_DOMAIN;
}

header("Access-Control-Allow-Origin: $origin");
header('Vary: Origin');
header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Manejar preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

/**
 * Require authentication via session OR Bearer token.
 * Returns the user_id if authenticated, or exits with 401.
 */
function requireAuth() {
    // 1. Try session first
    if (session_status() === PHP_SESSION_NONE) {
        session_start();
    }
    if (isset($_SESSION['user_id'])) {
        return (int)$_SESSION['user_id'];
    }

    // 2. Try Bearer token from Authorization header
    $authHeader = '';
    if (isset($_SERVER['HTTP_AUTHORIZATION'])) {
        $authHeader = $_SERVER['HTTP_AUTHORIZATION'];
    } elseif (function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $authHeader = $headers['Authorization'] ?? '';
    }

    if (preg_match('/Bearer\s+(.+)/i', $authHeader, $matches)) {
        $token = $matches[1];
        $decoded = base64_decode($token);
        if ($decoded) {
            $parts = explode(':', $decoded);
            $userId = isset($parts[0]) ? (int)$parts[0] : 0;
            if ($userId > 0) {
                // Validate user exists and is active
                try {
                    $conn = getConnection();
                    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND is_active = TRUE");
                    $stmt->bind_param("i", $userId);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    if ($result->num_rows > 0) {
                        $_SESSION['user_id'] = $userId;
                        $conn->close();
                        return $userId;
                    }
                    $conn->close();
                } catch (Exception $e) {
                    // Fall through to 401
                }
            }
        }
    }

    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit();
}
?>
