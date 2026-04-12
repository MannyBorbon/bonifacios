<?php
// Crear usuarios con contraseña correcta
require_once 'config/database.php';

$conn = getConnection();

// Eliminar usuarios existentes
$conn->query("DELETE FROM users");

// Insertar usuarios
// Diferentes contraseñas para cada usuario
$users = [
    ['misael', 'Misael', 'misael@bonifaciossancarlos.com', 'administrador', 'Filipenses4:8@'],
    ['francisco', 'Francisco', 'francisco@bonifaciossancarlos.com', 'viewer', 'Filipenses4:8'],
    ['santiago', 'Santiago', 'santiago@bonifaciossancarlos.com', 'viewer', 'Filipenses4:8'],
    ['manuel', 'Manuel', 'manuel@bonifaciossancarlos.com', 'administrador', 'Filipenses4:8@']
];

$sql = "INSERT INTO users (username, password, full_name, email, role, is_active) VALUES (?, ?, ?, ?, ?, 1)";
$stmt = $conn->prepare($sql);

if (!$stmt) {
    die("Error preparando statement: " . $conn->error);
}

$result = [];

foreach ($users as $userData) {
    // Generar hash para cada usuario con su contraseña específica
    $userPasswordHash = password_hash($userData[4], PASSWORD_BCRYPT);
    
    // username, password_hash, full_name, email, role
    $stmt->bind_param("sssss", $userData[0], $userPasswordHash, $userData[1], $userData[2], $userData[3]);
    
    if ($stmt->execute()) {
        echo "✅ Usuario creado: <strong>{$userData[0]}</strong> | Rol: <strong>{$userData[3]}</strong> | Contraseña: <strong>{$userData[4]}</strong><br>";
        $result[] = [
            'username' => $userData[0],
            'role' => $userData[3],
            'password' => $userData[4],
            'status' => 'success'
        ];
    } else {
        echo "❌ Error creando usuario {$userData[0]}: " . $stmt->error . "<br>";
        $result[] = [
            'username' => $userData[0],
            'error' => $stmt->error,
            'status' => 'error'
        ];
    }
}

$stmt->close();
$conn->close();

echo "<br><hr><br>";
echo "<h3>📊 Resumen de Usuarios Creados:</h3>";
echo "<ul>";
echo "<li><strong>Administradores:</strong> misael, manuel (Contraseña: Filipenses4:8@)</li>";
echo "<li><strong>Viewers:</strong> francisco, santiago (Contraseña: Filipenses4:8)</li>";
echo "</ul>";

echo "<br><h4>JSON Response:</h4>";
echo "<pre>";
echo json_encode([
    'success' => true,
    'message' => 'Usuarios actualizados con roles correctos',
    'users' => $result
], JSON_PRETTY_PRINT);
echo "</pre>";
?>
