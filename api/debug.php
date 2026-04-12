<?php
// Archivo de debug para verificar configuración
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

echo json_encode([
    'php_version' => phpversion(),
    'mysqli_available' => extension_loaded('mysqli'),
    'json_available' => extension_loaded('json'),
    'config_file_exists' => file_exists(__DIR__ . '/config/database.php'),
    'current_dir' => __DIR__,
    'server_info' => [
        'software' => $_SERVER['SERVER_SOFTWARE'] ?? 'unknown',
        'php_self' => $_SERVER['PHP_SELF'] ?? 'unknown'
    ]
]);
?>
